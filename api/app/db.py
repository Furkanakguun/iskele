from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from app.config import get_settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    project_key TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    default_branch TEXT NOT NULL,
    clone_url TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(project_key, slug)
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    action TEXT NOT NULL,
    repo_id TEXT NOT NULL,
    branch TEXT NOT NULL,
    module_id TEXT NOT NULL,
    image TEXT,
    tag TEXT,
    remote TEXT,
    lines TEXT NOT NULL DEFAULT '[]',
    error TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    finished_at TEXT
);
"""



def _connect(db_path: str) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def get_connection(db_path: Optional[str] = None) -> Iterator[sqlite3.Connection]:
    settings = get_settings()
    conn = _connect(db_path or settings.database_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[str] = None) -> None:
    with get_connection(db_path) as conn:
        conn.executescript(_SCHEMA)
        _migrate_tester_role(conn)
        _migrate_job_archive_path(conn)


def _migrate_job_archive_path(conn: sqlite3.Connection) -> None:
    cols = [
        row[1]
        for row in conn.execute("PRAGMA table_info(jobs)").fetchall()
    ]
    if "archive_path" not in cols:
        conn.execute("ALTER TABLE jobs ADD COLUMN archive_path TEXT")


def _migrate_tester_role(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).fetchone()
    sql = (row["sql"] if row else "") or ""
    if "tester" not in sql:
        return
    conn.executescript(
        """
        CREATE TABLE users_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        INSERT INTO users_v2 (
            id, username, password_hash, display_name, role, is_active, created_at
        )
        SELECT
            id, username, password_hash, display_name,
            CASE WHEN role = 'tester' THEN 'user' ELSE role END,
            is_active, created_at
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_v2 RENAME TO users;
        """
    )
