"""
storage.py — Mnemos Event & Promise Store (SQLite)
====================================================
Drop-in replacement for the JSON file store.
Public API is identical — no changes needed in main.py, agent_loop.py,
or entropy_engine.py.

All writes go through db_session() which gives:
  - WAL-mode safe concurrent reads
  - Serialized writes with busy_timeout (no corruption under multi-worker)
  - Atomic commit/rollback (no partial writes)

occurred_at = source timestamp from the event (trustworthy after #5 fix)
ingested_at = wall-clock time SQLite saw the row (always trustworthy)
"""

import json
from dataclasses import asdict
from typing import Optional

from db import db_session, init_db
from erp_schema import (
    ExtractedERPEvent,
    ExtractedPromise,
    compute_relationship_state,
    RelationshipState,
)

# Ensure schema exists on first import
init_db()


# ─── Serialization helpers ─────────────────────────────────────────────────────

def _serialize_event(event: ExtractedERPEvent) -> str:
    """Serialize an ExtractedERPEvent to a JSON string for storage."""
    return json.dumps(asdict(event), default=str)


def _deserialize_event(payload: str) -> ExtractedERPEvent:
    """Reconstruct an ExtractedERPEvent from a stored JSON string."""
    d = json.loads(payload)
    promises = [ExtractedPromise(**p) for p in d.get("promises", [])]
    return ExtractedERPEvent(
        raw_text=d["raw_text"],
        customer_or_vendor_id=d["customer_or_vendor_id"],
        entity_type=d["entity_type"],
        event_type=d.get("event_type", "neutral"),
        entities_mentioned=d.get("entities_mentioned", []),
        promises=promises,
        sentiment=d.get("sentiment", "neutral"),
        sentiment_intensity=float(d.get("sentiment_intensity", 0.0)),
        erp_tags=d.get("erp_tags", []),
        relationship_signals=d.get("relationship_signals", []),
        extracted_at=d.get("extracted_at", ""),
    )


# ─── Core CRUD ────────────────────────────────────────────────────────────────

def save_event(event: ExtractedERPEvent) -> int:
    """
    Persist an event to SQLite.
    Returns the new row id.
    """
    with db_session() as conn:
        cur = conn.execute(
            """
            INSERT INTO events (entity_id, entity_type, payload, occurred_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                event.customer_or_vendor_id,
                event.entity_type,
                _serialize_event(event),
                event.extracted_at,
            ),
        )
        return cur.lastrowid


def get_events(entity_id: str) -> list[ExtractedERPEvent]:
    """Load all events for a specific entity, ordered by occurred_at."""
    with db_session() as conn:
        rows = conn.execute(
            "SELECT payload FROM events WHERE entity_id = ? ORDER BY occurred_at ASC",
            (entity_id,),
        ).fetchall()
    return [_deserialize_event(r["payload"]) for r in rows]


def get_all_events() -> dict[str, list[ExtractedERPEvent]]:
    """Load all events across all entities. Returns {entity_id: [events]}."""
    with db_session() as conn:
        rows = conn.execute(
            "SELECT entity_id, payload FROM events ORDER BY entity_id, occurred_at ASC"
        ).fetchall()

    result: dict[str, list[ExtractedERPEvent]] = {}
    for row in rows:
        eid = row["entity_id"]
        if eid not in result:
            result[eid] = []
        result[eid].append(_deserialize_event(row["payload"]))
    return result


def get_all_events_flat() -> list[ExtractedERPEvent]:
    """Load all events as a flat list, ordered by occurred_at."""
    with db_session() as conn:
        rows = conn.execute(
            "SELECT payload FROM events ORDER BY occurred_at ASC"
        ).fetchall()
    return [_deserialize_event(r["payload"]) for r in rows]


def get_open_promises() -> list[tuple[str, str, ExtractedPromise, str]]:
    """
    Scan all events for unresolved promises.
    Returns list of (entity_id, entity_type, promise, extracted_at).
    """
    results = []
    all_events = get_all_events()
    for entity_id, events in all_events.items():
        for event in events:
            for promise in event.promises:
                if not promise.resolved:
                    results.append((
                        entity_id,
                        event.entity_type,
                        promise,
                        event.extracted_at,
                    ))
    return results


def list_entities() -> list[dict]:
    """
    List all known entities with their current relationship state.
    Returns list of dicts for the /entities endpoint.
    """
    entities = []
    all_events = get_all_events()

    for entity_id, events in all_events.items():
        if not events:
            continue

        state = compute_relationship_state(events)
        last_event = events[-1]

        entities.append({
            "entity_id": entity_id,
            "entity_type": last_event.entity_type,
            "event_count": len(events),
            "state": state.value,
            "last_interaction": last_event.extracted_at,
            "open_promises": sum(
                1 for e in events for p in e.promises if not p.resolved
            ),
        })

    return entities


def clear_all() -> None:
    """Delete all stored events. Used for testing/reset."""
    with db_session() as conn:
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM alerts")
        conn.execute("DELETE FROM state_changes")
        conn.execute("DELETE FROM cognee_retry")


# ─── Cognee retry queue (#4 fix) ──────────────────────────────────────────────

def queue_cognee_retry(entity_id: str, text_payload: str) -> None:
    """Add a failed Cognee upload to the retry queue."""
    with db_session() as conn:
        conn.execute(
            """
            INSERT INTO cognee_retry (entity_id, text_payload)
            VALUES (?, ?)
            """,
            (entity_id, text_payload),
        )


def get_pending_cognee_retries(limit: int = 20) -> list[dict]:
    """Fetch pending Cognee retries, oldest first, max `limit` rows."""
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT id, entity_id, text_payload, attempt_count
            FROM cognee_retry
            WHERE completed_at IS NULL
              AND attempt_count < 5
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def mark_cognee_retry_done(retry_id: int) -> None:
    """Mark a retry item as successfully completed."""
    with db_session() as conn:
        conn.execute(
            "UPDATE cognee_retry SET completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
            (retry_id,),
        )


def increment_cognee_retry_attempt(retry_id: int) -> None:
    """Increment attempt count and record last attempt time."""
    with db_session() as conn:
        conn.execute(
            """
            UPDATE cognee_retry
            SET attempt_count = attempt_count + 1,
                last_attempted = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ?
            """,
            (retry_id,),
        )


def get_latest_attribute_value(entity_id: str, attribute_type: str, exclude_event_id: int = None):
    """Get the most recent value for an attribute on an entity."""
    with db_session() as conn:
        query = """SELECT payload, id FROM events 
                   WHERE entity_id = ? AND payload LIKE ?"""
        params = [entity_id, f'%"{attribute_type}"%']
        
        if exclude_event_id is not None:
            query += " AND id != ?"
            params.append(exclude_event_id)
            
        query += " ORDER BY occurred_at DESC, id DESC LIMIT 1"
        
        row = conn.execute(query, tuple(params)).fetchone()
        
        if row:
            import json
            try:
                data = json.loads(row[0])
            except Exception:
                return None
                
            val = data.get("attribute_value")
            source = data.get("attribute_source") or "event"
            
            if val:
                return {"value": str(val), "source": source, "event_id": row[1]}
    return None


def insert_conflict(conflict: dict):
    """Insert a new conflict record."""
    with db_session() as conn:
        conn.execute(
            """INSERT INTO conflicts 
               (entity_id, attribute_type, source_a, value_a, event_id_a, 
                source_b, value_b, event_id_b, detected_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (conflict["entity_id"], conflict["attribute_type"],
             conflict["source_a"], conflict["value_a"], conflict.get("event_id_a"),
             conflict["source_b"], conflict["value_b"], conflict.get("event_id_b"),
             conflict["detected_at"])
        )


def get_active_conflicts():
    """Get all unresolved conflicts."""
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM conflicts WHERE resolved = 0 ORDER BY detected_at DESC"
        ).fetchall()
        columns = ["id", "entity_id", "attribute_type", "source_a", "value_a", 
                   "event_id_a", "source_b", "value_b", "event_id_b", 
                   "detected_at", "resolved"]
        return [dict(zip(columns, row)) for row in rows]


def resolve_conflict(conflict_id: int):
    """Mark a conflict as resolved."""
    with db_session() as conn:
        conn.execute(
            "UPDATE conflicts SET resolved = 1 WHERE id = ?",
            (conflict_id,)
        )
