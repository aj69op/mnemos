"""
seed_demo.py — Mnemos Demo Seeder
===================================
Wipes the DB and seeds realistic Indian SME entities with 60+ days of
interaction history so entropy scores are non-trivial on first load.

Data organized into domain files under data/:
  data/customers.py    — buyer entities (7 entities)
  data/suppliers.py    — vendor/supplier entities (6 entities)
  data/interactions.py — cross-entity interaction events

Run locally:
  python seed_demo.py
"""

import sys
import os
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from db import init_db, db_session
import storage
from storage import save_event
from data import SEED_EVENTS, build_event


def main():
    print("=" * 60)
    print("Mnemos Demo Seeder")
    print("=" * 60)

    print("\n[seed] Initializing database schema...")
    init_db()

    print("[seed] Wiping existing data...")
    storage.clear_all()

    with db_session() as conn:
        conn.execute("DELETE FROM agent_state")
        conn.execute("DELETE FROM cognee_retry")
    print("[seed] Database cleared.")

    print(f"\n[seed] Inserting {len(SEED_EVENTS)} events...")
    entity_counts: dict[str, int] = {}

    for event_dict in SEED_EVENTS:
        event = build_event(event_dict)
        save_event(event)
        eid = event.customer_or_vendor_id
        entity_counts[eid] = entity_counts.get(eid, 0) + 1

    print("\n[seed] Events inserted per entity:")
    for entity_id, count in sorted(entity_counts.items()):
        print(f"  {entity_id:<30} {count} events")

    with db_session() as conn:
        total = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        entities = conn.execute("SELECT COUNT(DISTINCT entity_id) FROM events").fetchone()[0]

    print(f"\n[seed] Verification:")
    print(f"  Total events    : {total}")
    print(f"  Entities        : {entities}")

    from datetime import timezone
    import logging
    try:
        with db_session() as conn:
            conn.execute(
                """INSERT INTO conflicts
                   (entity_id, attribute_type, source_a, value_a, event_id_a,
                    source_b, value_b, event_id_b, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("rajesh_textiles", "delivery_date", "WhatsApp", "Tuesday July 7", 1,
                 "Invoice (Tally)", "Friday July 10", 2, datetime.now(timezone.utc).isoformat())
            )
            conn.execute(
                """INSERT INTO conflicts
                   (entity_id, attribute_type, source_a, value_a, event_id_a,
                    source_b, value_b, event_id_b, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("ananya_foods_pvt", "payment_amount", "Purchase Order", "450000 INR", 5,
                 "Invoice", "525000 INR", 8, datetime.now(timezone.utc).isoformat())
            )
        print("  Seeded 2 conflict records")
    except Exception as e:
        print(f"  Could not seed conflicts: {e}")

    print("\n[seed] Done. Start your server and hit /entities and /alerts.")
    print("=" * 60)


if __name__ == "__main__":
    main()
