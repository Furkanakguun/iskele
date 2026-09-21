from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.auth import require_api_token
from app.config import get_settings
from app.models.schemas import DockerCommandOut, RunningServiceOut
from app.services.docker_host import DockerHost

router = APIRouter(prefix="/docker", tags=["docker"])


def _docker() -> DockerHost:
    return DockerHost(get_settings())


@router.get("/images", response_model=DockerCommandOut)
def docker_images(
    grep: Optional[str] = Query(default=None),
    _: str = Depends(require_api_token),
) -> DockerCommandOut:
    return _docker().images(grep)


@router.get("/ps", response_model=DockerCommandOut)
def docker_ps(
    grep: Optional[str] = Query(default=None),
    _: str = Depends(require_api_token),
) -> DockerCommandOut:
    return _docker().ps(grep)


@router.get("/running", response_model=List[RunningServiceOut])
def docker_running(
    grep: Optional[str] = Query(default=None),
    _: str = Depends(require_api_token),
) -> List[RunningServiceOut]:
    return _docker().running(grep)
