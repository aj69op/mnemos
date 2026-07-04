# conflict_detector.py
from datetime import datetime, timezone
import storage

WATCHED_ATTRS = ["delivery_date", "payment_amount", "payment_status", "commitment_date"]

def check_for_conflict(entity_id: str, attribute_type: str, new_value: str,
                        new_source: str, new_event_id: int):
    """Check if a new attribute value conflicts with an existing one."""
    if attribute_type not in WATCHED_ATTRS:
        return None

    existing = storage.get_latest_attribute_value(entity_id, attribute_type, exclude_event_id=new_event_id)
    if existing is None:
        return None

    if str(existing["value"]).strip() != str(new_value).strip():
        conflict = {
            "entity_id": entity_id,
            "attribute_type": attribute_type,
            "source_a": existing["source"],
            "value_a": existing["value"],
            "event_id_a": existing["event_id"],
            "source_b": new_source,
            "value_b": new_value,
            "event_id_b": new_event_id,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        }
        storage.insert_conflict(conflict)
        return conflict
    return None
