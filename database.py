import sqlite3
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "neurolearn.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    text_content TEXT,
    created_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    input_id INTEGER NOT NULL,
    summary_text TEXT NOT NULL,
    reading_level TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (input_id) REFERENCES inputs(id)
);

CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    theme_mode TEXT NOT NULL DEFAULT 'default',
    font_size INTEGER NOT NULL DEFAULT 16,
    line_spacing REAL NOT NULL DEFAULT 1.5,
    reduced_motion INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS consent_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    consent_given INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS micro_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    done_at TEXT,
    FOREIGN KEY (session_id) REFERENCES focus_sessions(id)
);
"""

DEMO_USER_EMAIL = "demo@neurolearn.local"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    conn.commit()

    now = datetime.now(timezone.utc).isoformat()

    # Auto-create the single demo user if not present
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ?", (DEMO_USER_EMAIL,)
    ).fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO users (email, created_at) VALUES (?, ?)",
            (DEMO_USER_EMAIL, now),
        )
        user_id = conn.execute(
            "SELECT id FROM users WHERE email = ?", (DEMO_USER_EMAIL,)
        ).fetchone()["id"]
        conn.execute(
            "INSERT INTO preferences (user_id, theme_mode, font_size, line_spacing, reduced_motion, updated_at) VALUES (?, 'default', 16, 1.5, 0, ?)",
            (user_id, now),
        )
        conn.commit()

    conn.close()


def get_demo_user_id():
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM users WHERE email = ?", (DEMO_USER_EMAIL,)
    ).fetchone()
    conn.close()
    return row["id"] if row else None
