from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.auth import require_api_token
from app.models.schemas import ActivityOut
from app.services import jobs as jobs_service

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=List[ActivityOut])
def list_activity(
    limit: int = Query(20, ge=1, le=100),
    _: str = Depends(require_api_token),
) -> List[ActivityOut]:
    items: List[ActivityOut] = []
    for job in jobs_service.list_jobs(limit=limit):
        tone = "ok" if job.status == "success" else "fail" if job.status == "failed" else "info"
        text = "{0} {1} ({2})".format(job.module_id, job.action, job.status)
        if job.error:
            text = "{0} — {1}".format(text, job.error)
        items.append(
            ActivityOut(
                id=job.id,
                text=text,
                tone=tone,
                created_at=job.created_at,
            )
        )
    return items
