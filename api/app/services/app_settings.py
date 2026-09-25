from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from app.config import Settings, get_settings
from app.db import get_connection, init_db

DEFAULT_REMOTE = ""
DEFAULT_IMAGE_VERSION = "latest"
DEFAULT_IMAGE_PREFIX = ""


def _ensure_volume(data_dir: str) -> None:
    root = Path(data_dir)
    root.mkdir(parents=True, exist_ok=True)
    (root / "repos").mkdir(parents=True, exist_ok=True)
    (root / "artifacts").mkdir(parents=True, exist_ok=True)


def _seed_defaults(settings: Settings) -> None:
    init_db(settings.database_path)
    _ensure_volume(settings.data_dir)
    defaults = {
        "git_base_url": settings.git_base_url or "",
        "git_token": settings.git_token or "",
        "docker_host": settings.docker_host or "localhost",
        "remote_registry": DEFAULT_REMOTE,
        "image_version": DEFAULT_IMAGE_VERSION,
        "image_prefix": DEFAULT_IMAGE_PREFIX,
        "data_dir": settings.data_dir,
    }
    with get_connection(settings.database_path) as conn:
        for key, value in defaults.items():
            row = conn.execute(
                "SELECT 1 FROM app_settings WHERE key = ?", (key,)
            ).fetchone()
            if row is None:
                conn.execute(
                    "INSERT INTO app_settings (key, value) VALUES (?, ?)",
                    (key, value),
                )


def _load_map(settings: Optional[Settings] = None) -> Dict[str, str]:
    settings = settings or get_settings()
    _seed_defaults(settings)
    with get_connection(settings.database_path) as conn:
        rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
    return {r["key"]: r["value"] for r in rows}


def get_git_token(settings: Optional[Settings] = None) -> str:
    settings = settings or get_settings()
    data = _load_map(settings)
    return (data.get("git_token") or settings.git_token or "").strip()


def get_app_settings(settings: Optional[Settings] = None) -> Dict[str, Any]:
    settings = settings or get_settings()
    data = _load_map(settings)
    token = data.get("git_token", "")
    data_dir = data.get("data_dir") or settings.data_dir
    return {
        "git_base_url": data.get("git_base_url", ""),
        "git_token_set": bool(token.strip()),
        "docker_host": data.get("docker_host", "localhost"),
        "remote_registry": data.get("remote_registry", DEFAULT_REMOTE),
        "image_version": data.get("image_version", DEFAULT_IMAGE_VERSION),
        "image_prefix": data.get("image_prefix", DEFAULT_IMAGE_PREFIX),
        "data_dir": data_dir,
    }


def update_app_settings(
    patch: Dict[str, Any],
    settings: Optional[Settings] = None,
) -> Dict[str, Any]:
    settings = settings or get_settings()
    _seed_defaults(settings)
    allowed = {
        "git_base_url",
        "docker_host",
        "remote_registry",
        "image_version",
        "image_prefix",
        "git_token",
        "data_dir",
    }
    with get_connection(settings.database_path) as conn:
        for key, value in patch.items():
            if key not in allowed:
                continue
            if key == "git_token":
                if value is None or value == "":
                    continue
            if key == "data_dir" and (value is None or str(value).strip() == ""):
                continue
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, str(value)),
            )
    updated = get_app_settings(settings)
    _ensure_volume(updated["data_dir"])
    return updated
