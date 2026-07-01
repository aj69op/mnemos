"""
migrate_json_to_sqlite.py — Mnemos One-Shot Migration
=======================================================
Migrates all existing JSON event files to the new SQLite store.

Run ONCE before deploying the new code:
    python migrate_json_to_sqlite.py

Safe to re-run: uses INSERT OR IGNORE on a unique constraint so rows
aren't duplicated if you run it twice.

After migration:
  1. Verify row counts match file counts (printed at the end)
  2. Start the new server — JSON files are NOT deleted automatically
     (kept as backup until you're confident everything is working)
  3. Delete data/events/*.json once satisfied
"""

import json
import sys
from pathlib import Path

# ─── Locate project root ──────────────────────────────────────────────────────
ROOT = Path(__file__).parent
DATA_DIR   = ROOT / "data"
EVENTS_DIR = DATA_DIR / "events"

if not EVENTS_DIR.exists():
    print(f"[migrate] No events directory found at {EVENTS_DIR}")
    print("[migrate] Nothing to migrate — starting fresh with SQLite.")
    # Still init the DB so the schema exists
    sys.path.insert(0, str(ROOT))
    from db import init_db
    init_db()
    sys.exit(0)

sys.path.insert(0, str(ROOT))
from db import init_db, db_session

# ─── Init schema ──────────────────────────────────────────────────────────────
print("[migrate] Initializing SQLite schema...")
init_db()

# ─── Migrate events ───────────────────────────────────────────────────────────
json_files = list(EVENTS_DIR.glob("*.json"))
print(f"[migrate] Found {len(json_files)} entity JSON files to migrate.")

total_events  = 0
total_skipped = 0
failed_files  = []

for json_file in json_files:
    entity_id = json_file.stem

    try:
        with open(json_file, "r", encoding="utf-8") as f:
            raw_events = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"[migrate] ERROR reading {json_file.name}: {e}")
        failed_files.append(json_file.name)
        continue

    file_inserted = 0
    file_skipped  = 0

    for event_dict in raw_events:
        occurred_at = event_dict.get("extracted_at", "")
        entity_type = event_dict.get("entity_type", "Customer")
        payload     = json.dumps(event_dict, default=str)

        if not occurred_at:
            print(
                f"[migrate] WARNING: event in {json_file.name} has no extracted_at — "
                "skipping (would poison entropy scores)"
            )
            file_skipped += 1
            total_skipped += 1
            continue

        try:
            with db_session() as conn:
                # Use occurred_at + payload hash to avoid duplicates on re-run
                existing = conn.execute(
                    "SELECT id FROM events WHERE entity_id = ? AND occurred_at = ? AND payload = ?",
                    (entity_id, occurred_at, payload),
                ).fetchone()

                if existing:
                    file_skipped += 1
                    total_skipped += 1
                    continue

                conn.execute(
                    """
                    INSERT INTO events (entity_id, entity_type, payload, occurred_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (entity_id, entity_type, payload, occurred_at),
                )
                file_inserted += 1
                total_events += 1

        except Exception as e:
            print(f"[migrate] ERROR inserting event for {entity_id}: {e}")
            file_skipped += 1
            total_skipped += 1

    print(
        f"[migrate]   {json_file.name}: "
        f"{file_inserted} inserted, {file_skipped} skipped"
    )

# ─── Summary ──────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print(f"[migrate] Migration complete.")
print(f"  JSON files processed : {len(json_files)}")
print(f"  Events inserted      : {total_events}")
print(f"  Events skipped       : {total_skipped}")
if failed_files:
    print(f"  Files with errors    : {', '.join(failed_files)}")
print()

# Verify with a count query
with db_session() as conn:
    db_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    entity_count = conn.execute("SELECT COUNT(DISTINCT entity_id) FROM events").fetchone()[0]

print(f"[migrate] SQLite now contains {db_count} events across {entity_count} entities.")
print()
print("[migrate] Next steps:")
print("  1. Start the new server and verify /entities and /alerts work correctly.")
print("  2. Once satisfied, delete data/events/*.json (JSON files kept as backup).")
print("  3. Do NOT delete data/mnemos.db — that is your new source of truth.")
