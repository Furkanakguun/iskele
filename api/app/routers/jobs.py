from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import require_api_token
from app.config import Settings, get_settings
from app.models.schemas import JobCreate, JobOut
from app.services import jobs as jobs_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=List[JobOut])
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    _: str = Depends(require_api_token),
) -> List[JobOut]:
    return jobs_service.list_jobs(limit=limit)


@router.post("", response_model=JobOut)
def create_job(
    payload: JobCreate,
    settings: Settings = Depends(get_settings),
    _: str = Depends(require_api_token),
) -> JobOut:
    return jobs_service.create_job(payload, settings=settings)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, _: str = Depends(require_api_token)) -> JobOut:
    job = jobs_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/run", response_model=JobOut)
def run_job(job_id: str, _: str = Depends(require_api_token)) -> JobOut:
    if not jobs_service.get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    try:
        return jobs_service.run_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")
