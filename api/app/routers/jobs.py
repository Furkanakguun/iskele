from fastapi import APIRouter, HTTPException

from app.models.schemas import JobCreate, JobOut
from app.services import jobs as jobs_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobOut)
def create_job(payload: JobCreate) -> JobOut:
    return jobs_service.create_job(payload)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str) -> JobOut:
    job = jobs_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
