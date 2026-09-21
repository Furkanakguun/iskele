from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.config import Settings, get_settings
from app.data import demo
from app.models.schemas import JobCreate, JobOut
from app.services.executor import execute_action


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _save(job: JobOut) -> JobOut:
    demo.JOBS[job.id] = job.model_dump()
    return job


def create_job(payload: JobCreate, settings: Optional[Settings] = None) -> JobOut:
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
        lines=[
            "[iskele] module={0}".format(payload.module_id),
            "[iskele] branch={0}".format(payload.branch),
            "[iskele] action={0}".format(payload.action),
            "[iskele] queued",
        ],
        error=None,
        created_at=_now(),
        finished_at=None,
    )
    _save(job)
    if settings.jobs_autorun:
        return run_job(job.id, payload)
    return job


def run_job(job_id: str, payload: Optional[JobCreate] = None) -> JobOut:
    raw = demo.JOBS.get(job_id)
    if not raw:
        raise KeyError(job_id)

    job = JobOut(**raw)
    if payload is None:
        payload = JobCreate(
            repo_id=job.repo_id,
            branch=job.branch,
            module_id=job.module_id,
            action=job.action,
            image=job.image,
            tag=job.tag,
            remote=job.remote,
        )

    job.status = "running"
    job.lines = list(job.lines) + ["[iskele] running"]
    _save(job)

    status, action_lines, error = execute_action(payload)
    job.lines = list(job.lines) + list(action_lines)
    job.status = status
    job.error = error
    job.finished_at = _now()

    if status == "failed" and error:
        job.lines.append("[iskele] FAILED: {0}".format(error))
    elif status == "success":
        job.lines.append("[iskele] DONE")

    return _save(job)


def get_job(job_id: str) -> Optional[JobOut]:
    raw = demo.JOBS.get(job_id)
    return JobOut(**raw) if raw else None


def list_jobs(limit: int = 20) -> List[JobOut]:
    jobs = [JobOut(**raw) for raw in demo.JOBS.values()]
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    return jobs[:limit]


def clear_jobs() -> None:
    demo.JOBS.clear()
