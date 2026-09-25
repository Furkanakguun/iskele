from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import Settings, get_settings
from app.db import get_connection, init_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000,
    ).hex()
    return "{0}${1}".format(salt, digest)


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000,
    ).hex()
    return hmac.compare_digest(check, digest)


def _row_to_user(row: Any) -> Dict[str, Any]:
    return {
        "id": int(row["id"]),
        "username": row["username"],
        "display_name": row["display_name"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
            (username.strip(),),
        ).fetchone()
    return _row_to_user(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _row_to_user(row) if row else None


def authenticate(username: str, password: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
            (username.strip(),),
        ).fetchone()
    if not row or not row["is_active"]:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return _row_to_user(row)


def list_users() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM users ORDER BY username COLLATE NOCASE"
        ).fetchall()
    return [_row_to_user(r) for r in rows]


def create_user(
    username: str,
    password: str,
    display_name: str,
    role: str,
) -> Dict[str, Any]:
    username = username.strip()
    display_name = display_name.strip() or username
    role = role.strip().lower()
    if role not in ("admin", "user"):
        raise ValueError("role must be admin or user")
    if len(username) < 2:
        raise ValueError("username too short")
    if len(password) < 4:
        raise ValueError("password too short")
    if get_user_by_username(username):
        raise ValueError("username already exists")

    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO users (username, password_hash, display_name, role, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
            """,
            (username, hash_password(password), display_name, role, _now()),
        )
        user_id = int(cur.lastrowid)
    user = get_user_by_id(user_id)
    if not user:
        raise RuntimeError("failed to create user")
    return user


def update_user(
    user_id: int,
    *,
    actor_id: int,
    display_name: Optional[str] = None,
    role: Optional[str] = None,
    password: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Dict[str, Any]:
    target = get_user_by_id(user_id)
    if not target:
        raise LookupError("user not found")

    new_role = target["role"]
    if role is not None:
        new_role = role.strip().lower()
        if new_role not in ("admin", "user"):
            raise ValueError("role must be admin or user")

    new_active = target["is_active"] if is_active is None else bool(is_active)

    if target["role"] == "admin" and (new_role != "admin" or not new_active):
        admins = [u for u in list_users() if u["role"] == "admin" and u["is_active"]]
        if len(admins) <= 1:
            raise ValueError("cannot demote or disable the last admin")

    if password is not None and password != "":
        if len(password) < 4:
            raise ValueError("password too short")

    fields = []
    values: List[Any] = []
    if display_name is not None:
        name = display_name.strip() or target["username"]
        fields.append("display_name = ?")
        values.append(name)
    if role is not None:
        fields.append("role = ?")
        values.append(new_role)
    if is_active is not None:
        fields.append("is_active = ?")
        values.append(1 if new_active else 0)
    if password:
        fields.append("password_hash = ?")
        values.append(hash_password(password))
    if not fields:
        return target
    values.append(user_id)
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET {0} WHERE id = ?".format(", ".join(fields)),
            tuple(values),
        )
    updated = get_user_by_id(user_id)
    if not updated:
        raise RuntimeError("failed to update user")
    return updated


def delete_user(user_id: int, actor_id: int) -> None:
    target = get_user_by_id(user_id)
    if not target:
        raise LookupError("user not found")
    if target["id"] == actor_id:
        raise ValueError("cannot delete yourself")
    if target["role"] == "admin":
        admins = [u for u in list_users() if u["role"] == "admin" and u["is_active"]]
        if len(admins) <= 1:
            raise ValueError("cannot delete the last admin")
    with get_connection() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


def ensure_seed_users(settings: Optional[Settings] = None) -> None:
    settings = settings or get_settings()
    init_db(settings.database_path)

    if not get_user_by_username(settings.admin_username):
        create_user(
            settings.admin_username,
            settings.admin_password,
            settings.admin_display_name,
            "admin",
        )
