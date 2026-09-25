from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.config import Settings, get_settings
from app.models.schemas import JobCreate, JobOut
from app.services.executor import execute_action
from app.services import store

_run_lock = threading.Lock()
_running = set()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_job(
    payload: JobCreate,
    settings: Optional[Settings] = None,
    created_by: Optional[int] = None,
) -> JobOut:
    settings = settings or get_settings()
    job = JobOut(
        id="job-{0}".format(uuid.uuid4().hex[:8]),
        status="queued",
        action=payload.action,
        repo_id=payload.repo_id,
        branch=payload.branch,
        module_id=payload.module_id,
        image=payload.image,
        tag=payload.tag,
        remote=payload.remote,
        archive_path=payload.archive_path,
        lines=[
            "[iskele] module={0}".format(payload.module_id or "archive"),
            "[iskele] branch={0}".format(payload.branch or "-"),
            "[iskele] action={0}".format(payload.action),
            *(
                ["[iskele] archive={0}".format(payload.archive_path)]
                if payload.archive_path
                else []
            ),
            "[iskele] queued",
        ],
        error=None,
        created_at=_now(),
        finished_at=None,
    )
    store.save_job(job, created_by=created_by)
    if settings.jobs_autorun:
        _start_job(job.id, payload)
    return store.get_job(job.id) or job


def _start_job(job_id: str, payload: JobCreate) -> None:
    thread = threading.Thread(
        target=_run_safe,
        args=(job_id, payload),
        name="iskele-job-{0}".format(job_id),
        daemon=True,
    )
    thread.start()


def _run_safe(job_id: str, payload: JobCreate) -> None:
    try:
        run_job(job_id, payload)
    except Exception as exc:
        job = store.get_job(job_id)
        if not job:
            return
        job.status = "failed"
        job.error = str(exc)
        job.finished_at = _now()
        job.lines = list(job.lines) + ["[iskele] FAILED: {0}".format(exc)]
        store.save_job(job)


def run_job(job_id: str, payload: Optional[JobCreate] = None) -> JobOut:
    job = store.get_job(job_id)
    if not job:
        raise KeyError(job_id)

    with _run_lock:
        if job_id in _running:
            return job
        _running.add(job_id)

    try:
        if payload is None:
            payload = JobCreate(
                repo_id=job.repo_id,
                branch=job.branch,
                module_id=job.module_id,
                action=job.action,
                image=job.image,
                tag=job.tag,
                remote=job.remote,
                archive_path=job.archive_path,
            )

        job.status = "running"
        job.lines = list(job.lines) + ["[iskele] running"]
        store.save_job(job)

        def on_line(line: str) -> None:
            current = store.get_job(job_id)
            if not current:
                return
            current.lines = list(current.lines) + [line]
            store.save_job(current)

        status, _action_lines, error = execute_action(payload, on_line=on_line)
        job = store.get_job(job_id) or job
        job.status = status
        job.error = error
        job.finished_at = _now()

        if status == "failed" and error:
            job.lines = list(job.lines) + ["[iskele] FAILED: {0}".format(error)]
        elif status == "success":
            job.lines = list(job.lines) + ["[iskele] DONE"]

        return store.save_job(job)
    finally:
        with _run_lock:
            _running.discard(job_id)


def get_job(job_id: str) -> Optional[JobOut]:
    return store.get_job(job_id)


def list_jobs(limit: int = 20) -> List[JobOut]:
    return store.list_jobs(limit=limit)


def clear_jobs() -> None:
    store.clear_jobs()
