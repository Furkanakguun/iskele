from __future__ import annotations

import uuid
from typing import Optional

from app.data import demo
from app.models.schemas import JobCreate, JobOut


def create_job(payload: JobCreate) -> JobOut:
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    lines = [
        f"[iskele] module={payload.module_id}",
        f"[iskele] branch={payload.branch}",
        f"[iskele] action={payload.action}",
        "[iskele] queued (stub — docker jobs not wired yet)",
    ]
    job = JobOut(
        id=job_id,
        status="queued",
        action=payload.action,
        repo_id=payload.repo_id,
        branch=payload.branch,
        module_id=payload.module_id,
        lines=lines,
    )
    demo.JOBS[job_id] = job.model_dump()
    return job


def get_job(job_id: str) -> Optional[JobOut]:
    raw = demo.JOBS.get(job_id)
    return JobOut(**raw) if raw else None
