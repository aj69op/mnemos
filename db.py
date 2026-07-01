"""
db.py — Mnemos SQLite Connection Layer
========================================
Single source of truth for all database access.
WAL mode + busy_timeout = safe multi-worker reads, serialized writes.

Schema (auto-created on first import via init_db()):
  events        — all ingested ERP events (JSON payload)
  agent_state   — persistent agent state per agent_id
  alerts        — persisted alert queue with entropy scores
  state_changes — entity relationship state transition log
  cognee_retry  — retry queue for failed Cognee Cloud uploads (#4 fix)
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "data" / "mnemos.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- All ingested ERP events, one row per event
CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id       TEXT NOT NULL,
    entity_type     TEXT NOT NULL DEFAULT 'Customer',
    payload         TEXT NOT NULL,          -- full ExtractedERPEvent as JSON
    occurred_at     TEXT NOT NULL,          -- source timestamp (extracted_at field)
    ingested_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_events_entity    ON events(entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_ingested  ON events(ingested_at);

-- Persistent agent state (survives restarts)
CREATE TABLE IF NOT EXISTS agent_state (
    agent_id        TEXT PRIMARY KEY,
    state           TEXT NOT NULL DEFAULT '{}',   -- JSON blob
    last_scan_at    TEXT,
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Persisted alert queue — frozen at scan time so entropy scores don't drift
CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id       TEXT NOT NULL,
    entity_type     TEXT NOT NULL DEFAULT 'Customer',
    promise_description TEXT NOT NULL,
    promise_type    TEXT NOT NULL,
    entropy_score   REAL NOT NULL,          -- frozen at alert-creation time
    days_elapsed    REAL NOT NULL DEFAULT 0,
    due_date        TEXT,
    severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    made_by         TEXT NOT NULL DEFAULT 'unknown',
    event_extracted_at TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    resolved_at     TEXT                    -- NULL = still active
);
CREATE INDEX IF NOT EXISTS idx_alerts_entity     ON alerts(entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_severity   ON alerts(severity, resolved_at);

-- Entity relationship state transitions
CREATE TABLE IF NOT EXISTS state_changes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id       TEXT NOT NULL,
    entity_type     TEXT NOT NULL DEFAULT 'Customer',
    state           TEXT NOT NULL,
    event_count     INTEGER NOT NULL DEFAULT 0,
    changed_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_state_entity ON state_changes(entity_id, changed_at);

-- Retry queue for failed Cognee Cloud uploads (#4 fix)
CREATE TABLE IF NOT EXISTS cognee_retry (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id       TEXT NOT NULL,
    text_payload    TEXT NOT NULL,
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    last_attempted  TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    completed_at    TEXT                    -- NULL = pending
);
CREATE INDEX IF NOT EXISTS idx_retry_pending ON cognee_retry(completed_at) WHERE completed_at IS NULL;
"""


# ─── Connection factory ────────────────────────────────────────────────────────

def get_connection() -> sqlite3.Connection:
    """
    Open a new SQLite connection with WAL mode + row factory.
    Always call within a db_session() context — don't use raw.
    """
    conn = sqlite3.connect(
        DB_PATH,
        timeout=30,
        isolation_level=None,   # autocommit off; we manage txns explicitly
        check_same_thread=False,
    )
    # WAL must be set per-connection, not just in schema
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    # Wait up to 5s on write contention instead of immediately failing
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_session():
    """
    Context manager that yields a connection in an explicit transaction.
    Commits on clean exit, rolls back on exception.

    Usage:
        with db_session() as conn:
            conn.execute(...)
    """
    conn = get_connection()
    conn.execute("BEGIN")
    try:
        yield conn
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    finally:
        conn.close()


# ─── Schema init ──────────────────────────────────────────────────────────────

def init_db() -> None:
    """Create all tables if they don't exist. Safe to call multiple times."""
    
    # ── Seed production volume with local initial DB ──
    import shutil
    initial_db = Path(__file__).parent / "mnemos_initial.db"
    if not DB_PATH.exists() and initial_db.exists():
        print(f"[db] Seeding empty volume database from {initial_db}...")
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(initial_db, DB_PATH)

    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
    finally:
        conn.close()
    print(f"[db] Initialized at {DB_PATH}")


# ─── FastAPI dependency ────────────────────────────────────────────────────────

def get_db():
    """
    FastAPI dependency — yields a db_session connection.

    Usage in route:
        @app.get("/foo")
        def foo(db = Depends(get_db)):
            rows = db.execute("SELECT ...").fetchall()
    """
    with db_session() as conn:
        yield conn
