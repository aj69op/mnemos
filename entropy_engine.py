"""
entropy_engine.py — Mnemos Commitment Decay Engine
====================================================
The killer feature. Scans all open promises, calculates decay scores,
returns ranked alerts.

Core formula:
  entropy(promise) = (days_elapsed / expected_resolution_days) × urgency_weight
  Alert fires when entropy > 0.8

#5 FIX: Date parsing now fails loudly at ingest time (see validate_date_str).
         calculate_entropy() no longer silently substitutes "1 day ago" for
         bad dates — it raises ValueError so the caller knows immediately.
         entropy scores are therefore always trustworthy.
"""

from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional

from erp_schema import ExtractedERPEvent, ExtractedPromise, URGENCY_WEIGHTS
import storage

# ─── Expected Resolution Days ─────────────────────────────────────────────────

EXPECTED_RESOLUTION_DAYS = {
    "payment":   3,
    "delivery":  5,
    "callback":  1,
    "proposal":  4,
    "discount":  7,
    "meeting":   2,
    "document":  3,
    "other":     5,
}

# ─── Alert Thresholds ─────────────────────────────────────────────────────────
CRITICAL_THRESHOLD = 1.2
HIGH_THRESHOLD     = 0.8
MEDIUM_THRESHOLD   = 0.5


# ─── Alert Dataclass ──────────────────────────────────────────────────────────

@dataclass
class Alert:
    entity_id: str
    entity_type: str
    promise_description: str
    promise_type: str
    entropy_score: float
    days_elapsed: float
    due_date: Optional[str]
    severity: str
    made_by: str
    event_extracted_at: str


def _severity_from_entropy(entropy: float) -> str:
    if entropy >= CRITICAL_THRESHOLD:
        return "critical"
    elif entropy >= HIGH_THRESHOLD:
        return "high"
    elif entropy >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


# ─── #5 FIX: Loud date validation ─────────────────────────────────────────────

def validate_date_str(date_str: str, field_name: str = "date") -> datetime:
    """
    Parse an ISO 8601 date string and return a timezone-aware datetime.

    Raises ValueError (not silently substitutes) if the string is malformed.
    Call this at ingest time so bad dates are rejected with a 422 before
    they ever reach the entropy engine.

    Args:
        date_str:   The ISO 8601 string to parse.
        field_name: Label used in the error message for debugging.

    Returns:
        A timezone-aware datetime object.

    Raises:
        ValueError: If date_str is empty, None, or not valid ISO 8601.
    """
    if not date_str:
        raise ValueError(f"{field_name} is empty or None — cannot compute entropy")
    try:
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError) as e:
        raise ValueError(
            f"{field_name} '{date_str}' is not valid ISO 8601: {e}"
        ) from e


# ─── Core Entropy Calculation ─────────────────────────────────────────────────

def calculate_entropy(
    promise: ExtractedPromise,
    event_date_str: str,
    now: Optional[datetime] = None,
) -> float:
    """
    Calculate the entropy (decay) score for a single promise.

    #5 FIX: Raises ValueError on unparseable dates instead of silently
    substituting "1 day ago". Callers in get_all_alerts() skip that promise
    and log the bad row rather than computing a poisoned score.

    Args:
        promise:        The promise to score.
        event_date_str: ISO datetime string of when the event was recorded.
        now:            Current time (defaults to utcnow; injectable for tests).

    Returns:
        Float entropy score. > 0.8 means alert-worthy.

    Raises:
        ValueError: If event_date_str or promise.due_date cannot be parsed.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # Fail loud — no silent fallback
    event_date = validate_date_str(event_date_str, field_name="event_date_str")

    # If promise has a due date, use it as the expected resolution window
    if promise.due_date:
        due = validate_date_str(promise.due_date, field_name="promise.due_date")
        expected_days = max((due - event_date).total_seconds() / 86400, 0.5)
    else:
        expected_days = EXPECTED_RESOLUTION_DAYS.get(promise.promise_type, 5)

    days_elapsed = max((now - event_date).total_seconds() / 86400, 0)
    urgency = URGENCY_WEIGHTS.get(promise.promise_type, 0.6)

    entropy = (days_elapsed / expected_days) * urgency
    return round(entropy, 3)


# ─── Scan All Promises → Alerts ───────────────────────────────────────────────

def get_all_alerts(min_severity: str = "medium") -> list[Alert]:
    """
    Scan all stored events for open promises, calculate entropy,
    return alerts sorted by entropy descending.

    Promises with unparseable dates are skipped with a logged warning
    rather than silently generating poisoned scores.
    """
    severity_rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    min_rank = severity_rank.get(min_severity, 1)

    open_promises = storage.get_open_promises()
    alerts = []
    now = datetime.now(timezone.utc)

    for entity_id, entity_type, promise, extracted_at in open_promises:
        try:
            entropy = calculate_entropy(promise, extracted_at, now=now)
        except ValueError as e:
            # #5 FIX: skip poisoned promises, don't silently corrupt scores
            print(f"[entropy] Skipping promise for {entity_id} — bad date: {e}")
            continue

        severity = _severity_from_entropy(entropy)
        if severity_rank.get(severity, 0) < min_rank:
            continue

        try:
            event_date = validate_date_str(extracted_at)
            days_elapsed = round((now - event_date).total_seconds() / 86400, 1)
        except ValueError:
            days_elapsed = 0.0

        alerts.append(Alert(
            entity_id=entity_id,
            entity_type=entity_type,
            promise_description=promise.description,
            promise_type=promise.promise_type,
            entropy_score=entropy,
            days_elapsed=days_elapsed,
            due_date=promise.due_date,
            severity=severity,
            made_by=promise.made_by,
            event_extracted_at=extracted_at,
        ))

    alerts.sort(key=lambda a: a.entropy_score, reverse=True)
    return alerts


def get_entity_alerts(entity_id: str) -> list[Alert]:
    """Get alerts for a specific entity only."""
    return [a for a in get_all_alerts(min_severity="low") if a.entity_id == entity_id]


def get_alert_summary() -> dict:
    """Get a quick summary of alert counts by severity."""
    alerts = get_all_alerts(min_severity="low")
    return {
        "total": len(alerts),
        "critical": sum(1 for a in alerts if a.severity == "critical"),
        "high":     sum(1 for a in alerts if a.severity == "high"),
        "medium":   sum(1 for a in alerts if a.severity == "medium"),
        "low":      sum(1 for a in alerts if a.severity == "low"),
    }
