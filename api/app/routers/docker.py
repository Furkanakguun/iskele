from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Query

from app.config import get_settings
from app.models.schemas import DockerCommandOut
from app.services.docker_host import DockerHost

router = APIRouter(prefix="/docker", tags=["docker"])


def _docker() -> DockerHost:
    return DockerHost(get_settings())


@router.get("/images", response_model=DockerCommandOut)
def docker_images(grep: Optional[str] = Query(default=None)) -> DockerCommandOut:
    return _docker().images(grep)


@router.get("/ps", response_model=DockerCommandOut)
def docker_ps(grep: Optional[str] = Query(default=None)) -> DockerCommandOut:
    return _docker().ps(grep)
