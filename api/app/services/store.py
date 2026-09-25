from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db import get_connection, init_db
from app.models.schemas import JobOut, RepoOut


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _repo_from_row(row: Any) -> RepoOut:
    return RepoOut(
        id=row["id"],
        project_key=row["project_key"],
        slug=row["slug"],
        name=row["name"],
        description=row["description"],
        default_branch=row["default_branch"],
        clone_url=row["clone_url"] or "",
        created_by=int(row["created_by"]) if row["created_by"] is not None else None,
        created_by_username=row["created_by_username"],
        created_at=row["created_at"],
    )


def list_repos() -> List[RepoOut]:
    init_db()
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT r.*, u.username AS created_by_username
            FROM repos r
            LEFT JOIN users u ON u.id = r.created_by
            ORDER BY r.created_at DESC
            """
        ).fetchall()
    return [_repo_from_row(r) for r in rows]


def get_repo(repo_id: str) -> Optional[RepoOut]:
    init_db()
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT r.*, u.username AS created_by_username
            FROM repos r
            LEFT JOIN users u ON u.id = r.created_by
            WHERE r.id = ?
            """,
            (repo_id,),
        ).fetchone()
    return _repo_from_row(row) if row else None


def get_clone_url(repo_id: str) -> str:
    repo = get_repo(repo_id)
    return (repo.clone_url if repo else "") or ""


def insert_repo(
    repo: RepoOut,
    created_by: int,
    clone_url: str = "",
) -> RepoOut:
    init_db()
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM repos WHERE id = ? OR (project_key = ? AND slug = ?)",
            (repo.id, repo.project_key, repo.slug),
        ).fetchone()
        if exists:
            raise ValueError("repo already exists")
        conn.execute(
            """
            INSERT INTO repos (
                id, project_key, slug, name, description, default_branch,
                clone_url, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                repo.id,
                repo.project_key,
                repo.slug,
                repo.name,
                repo.description,
                repo.default_branch,
                clone_url,
                created_by,
                _now(),
            ),
        )
    saved = get_repo(repo.id)
    if not saved:
        raise RuntimeError("failed to save repo")
    return saved


def delete_repo(repo_id: str) -> None:
    init_db()
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM repos WHERE id = ?", (repo_id,))
        if cur.rowcount == 0:
            raise LookupError("repo not found")
        conn.execute("DELETE FROM jobs WHERE repo_id = ?", (repo_id,))


def _job_from_row(row: Any) -> JobOut:
    try:
        lines = json.loads(row["lines"] or "[]")
    except ValueError:
        lines = []
    if not isinstance(lines, list):
        lines = []
    return JobOut(
        id=row["id"],
        status=row["status"],
        action=row["action"],
        repo_id=row["repo_id"],
        branch=row["branch"],
        module_id=row["module_id"],
        image=row["image"],
        tag=row["tag"],
        remote=row["remote"],
        archive_path=row["archive_path"] if "archive_path" in row.keys() else None,
        lines=lines,
        error=row["error"],
        created_at=row["created_at"],
        finished_at=row["finished_at"],
    )


def save_job(job: JobOut, created_by: Optional[int] = None) -> JobOut:
    init_db()
    lines = json.dumps(job.lines or [])
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT created_by FROM jobs WHERE id = ?", (job.id,)
        ).fetchone()
        owner = created_by
        if existing is not None:
            owner = existing["created_by"] if created_by is None else created_by
        conn.execute(
            """
            INSERT INTO jobs (
                id, status, action, repo_id, branch, module_id, image, tag,
                remote, archive_path, lines, error, created_by, created_at, finished_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                action = excluded.action,
                repo_id = excluded.repo_id,
                branch = excluded.branch,
                module_id = excluded.module_id,
                image = excluded.image,
                tag = excluded.tag,
                remote = excluded.remote,
                archive_path = excluded.archive_path,
                lines = excluded.lines,
                error = excluded.error,
                finished_at = excluded.finished_at
            """,
            (
                job.id,
                job.status,
                job.action,
                job.repo_id,
                job.branch,
                job.module_id,
                job.image,
                job.tag,
                job.remote,
                job.archive_path,
                lines,
                job.error,
                owner,
                job.created_at,
                job.finished_at,
            ),
        )
    return job


def get_job(job_id: str) -> Optional[JobOut]:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return _job_from_row(row) if row else None


def list_jobs(limit: int = 20) -> List[JobOut]:
    init_db()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [_job_from_row(r) for r in rows]


def clear_jobs() -> None:
    init_db()
    with get_connection() as conn:
        conn.execute("DELETE FROM jobs")
