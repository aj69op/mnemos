"""
agent_loop.py — Mnemos Proactive Agent
========================================
APScheduler background job that runs the entropy engine periodically.

#2 FIX: All agent state (alerts, state_changes, last_scan_at) is now
persisted to SQLite via the `alerts`, `state_changes`, and `agent_state`
tables. Server restarts no longer wipe the alert queue, and multi-worker
deployments share a single source of truth.

The in-memory _lock is kept only for the scheduler reference itself,
not for alert data (that's now handled by db_session's WAL locking).
"""

import json
import threading
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from entropy_engine import get_all_alerts, Alert, get_alert_summary
from erp_schema import compute_relationship_state, RelationshipState
from db import db_session
import storage

# ─── Scheduler reference (process-local, not persisted) ───────────────────────
_scheduler_lock = threading.Lock()
_scheduler: Optional[BackgroundScheduler] = None
AGENT_ID = "mnemos_main"


# ─── Silence Gap Detection ────────────────────────────────────────────────────

SILENCE_THRESHOLDS = {
    "PROSPECT": 14,
    "ENGAGED":   7,
    "TRUSTED":  14,
    "AT_RISK":   3,
    "CHURNED":  30,
}


@dataclass
class SilenceAlert:
    entity_id: str
    entity_type: str
    current_state: str
    days_silent: float
    threshold: int
    message: str


def detect_silence_gaps() -> list[SilenceAlert]:
    """Find entities that haven't had any interaction in too long."""
    now = datetime.now(timezone.utc)
    silence_alerts = []
    all_events = storage.get_all_events()

    for entity_id, events in all_events.items():
        if not events:
            continue

        state = compute_relationship_state(events)
        last_event = events[-1]

        try:
            last_date = datetime.fromisoformat(last_event.extracted_at)
            if last_date.tzinfo is None:
                last_date = last_date.replace(tzinfo=timezone.utc)
            days_silent = (now - last_date).total_seconds() / 86400
        except (ValueError, TypeError):
            continue

        threshold = SILENCE_THRESHOLDS.get(state.value, 7)
        if days_silent > threshold:
            silence_alerts.append(SilenceAlert(
                entity_id=entity_id,
                entity_type=last_event.entity_type,
                current_state=state.value,
                days_silent=round(days_silent, 1),
                threshold=threshold,
                message=(
                    f"No interaction with {entity_id} for {round(days_silent, 1)} days "
                    f"(threshold: {threshold} days for {state.value} state)"
                ),
            ))

    return silence_alerts


# ─── Sentiment Drift Detection ────────────────────────────────────────────────

@dataclass
class SentimentDriftAlert:
    entity_id: str
    entity_type: str
    recent_sentiments: list[str]
    negative_count: int
    message: str


def detect_sentiment_drift() -> list[SentimentDriftAlert]:
    """Find entities with 3+ recent negative interactions."""
    drift_alerts = []
    all_events = storage.get_all_events()

    for entity_id, events in all_events.items():
        recent = events[-5:]
        sentiments = [e.sentiment for e in recent]
        neg_count = sum(1 for s in sentiments if s == "negative")

        if neg_count >= 3:
            drift_alerts.append(SentimentDriftAlert(
                entity_id=entity_id,
                entity_type=recent[-1].entity_type,
                recent_sentiments=sentiments,
                negative_count=neg_count,
                message=(
                    f"Sentiment drift detected for {entity_id}: "
                    f"{neg_count}/{len(sentiments)} recent interactions are negative"
                ),
            ))

    return drift_alerts


# ─── The Agent Scan ────────────────────────────────────────────────────────────

def run_agent_scan():
    """
    The main agent job. Called periodically by APScheduler.

    #2 FIX: Writes alerts and state_changes to SQLite instead of
    in-memory lists. last_scan_at is persisted to agent_state table.
    """
    scan_time = datetime.now(timezone.utc).isoformat()
    print(f"[agent] Running scan at {scan_time}")

    # 1. Get promise-based alerts from entropy engine
    promise_alerts = get_all_alerts(min_severity="medium")

    # 2. Detect silence + drift (logged only for now, extend as needed)
    silence = detect_silence_gaps()
    drift = detect_sentiment_drift()

    # 3. Compute relationship states — persist AT_RISK / CHURNED to DB
    all_events = storage.get_all_events()
    at_risk = []
    for entity_id, events in all_events.items():
        state = compute_relationship_state(events)
        if state in (RelationshipState.AT_RISK, RelationshipState.CHURNED):
            at_risk.append({
                "entity_id": entity_id,
                "entity_type": events[-1].entity_type if events else "Customer",
                "state": state.value,
                "event_count": len(events),
            })

    # 4. Persist everything to SQLite
    with db_session() as conn:
        # Clear previous scan's alerts and state_changes, write fresh ones
        conn.execute("DELETE FROM alerts WHERE resolved_at IS NULL")
        conn.execute("DELETE FROM state_changes")

        for alert in promise_alerts:
            conn.execute(
                """
                INSERT INTO alerts (
                    entity_id, entity_type, promise_description, promise_type,
                    entropy_score, days_elapsed, due_date, severity, made_by,
                    event_extracted_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    alert.entity_id, alert.entity_type,
                    alert.promise_description, alert.promise_type,
                    alert.entropy_score, alert.days_elapsed,
                    alert.due_date, alert.severity, alert.made_by,
                    alert.event_extracted_at,
                ),
            )

        for sc in at_risk:
            conn.execute(
                """
                INSERT INTO state_changes (entity_id, entity_type, state, event_count)
                VALUES (?,?,?,?)
                """,
                (sc["entity_id"], sc["entity_type"], sc["state"], sc["event_count"]),
            )

        # Persist last_scan_at to agent_state
        conn.execute(
            """
            INSERT INTO agent_state (agent_id, last_scan_at, updated_at)
            VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            ON CONFLICT(agent_id) DO UPDATE SET
                last_scan_at = excluded.last_scan_at,
                updated_at   = excluded.updated_at
            """,
            (AGENT_ID, scan_time),
        )

    summary = get_alert_summary()
    print(f"[agent] Scan complete. Alerts: {summary}")
    print(f"[agent]   Silence gaps: {len(silence)}")
    print(f"[agent]   Sentiment drift: {len(drift)}")
    print(f"[agent]   At-risk entities: {len(at_risk)}")


# ─── Public API ────────────────────────────────────────────────────────────────

def get_latest_alerts() -> list[Alert]:
    """Read active alerts from SQLite. Survives restarts."""
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT entity_id, entity_type, promise_description, promise_type,
                   entropy_score, days_elapsed, due_date, severity, made_by,
                   event_extracted_at
            FROM alerts
            WHERE resolved_at IS NULL
            ORDER BY entropy_score DESC
            """
        ).fetchall()

    return [
        Alert(
            entity_id=r["entity_id"],
            entity_type=r["entity_type"],
            promise_description=r["promise_description"],
            promise_type=r["promise_type"],
            entropy_score=r["entropy_score"],
            days_elapsed=r["days_elapsed"],
            due_date=r["due_date"],
            severity=r["severity"],
            made_by=r["made_by"],
            event_extracted_at=r["event_extracted_at"],
        )
        for r in rows
    ]


def get_at_risk_entities() -> list[dict]:
    """Get entities currently in AT_RISK or CHURNED state from SQLite."""
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT entity_id, entity_type, state, event_count
            FROM state_changes
            ORDER BY changed_at DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]


def get_agent_status() -> dict:
    """Get the agent's current status from SQLite + scheduler."""
    with db_session() as conn:
        row = conn.execute(
            "SELECT last_scan_at FROM agent_state WHERE agent_id = ?",
            (AGENT_ID,),
        ).fetchone()
        alert_count = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE resolved_at IS NULL"
        ).fetchone()[0]
        at_risk_count = conn.execute(
            "SELECT COUNT(DISTINCT entity_id) FROM state_changes"
        ).fetchone()[0]

    with _scheduler_lock:
        running = _scheduler is not None and _scheduler.running

    return {
        "last_scan": row["last_scan_at"] if row else None,
        "alert_count": alert_count,
        "at_risk_count": at_risk_count,
        "scheduler_running": running,
    }


# ─── Scheduler Management ─────────────────────────────────────────────────────

def start_agent(interval_seconds: int = 60):
    """Start the background agent loop."""
    global _scheduler

    with _scheduler_lock:
        if _scheduler is not None and _scheduler.running:
            print("[agent] Already running, skipping start.")
            return

        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(
            run_agent_scan,
            trigger=IntervalTrigger(seconds=interval_seconds),
            id="mnemos_agent_scan",
            name="Mnemos Agent Scan",
            replace_existing=True,
        )
        _scheduler.start()

    # Run an immediate scan on startup
    run_agent_scan()
    print(f"[agent] Started. Scanning every {interval_seconds}s.")


def stop_agent():
    """Stop the background agent loop."""
    global _scheduler
    with _scheduler_lock:
        if _scheduler and _scheduler.running:
            _scheduler.shutdown(wait=False)
            print("[agent] Stopped.")
        _scheduler = None
