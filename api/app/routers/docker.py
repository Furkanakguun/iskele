from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import require_api_token
from app.config import get_settings
from app.models.schemas import (
    DockerCommandOut,
    DockerImageRow,
    DockerRmiOut,
    RunningServiceOut,
)
from app.services import docker_cli
from app.services.docker_host import DockerHost
from app.services.storage import list_docker_images

router = APIRouter(prefix="/docker", tags=["docker"])


class ImageRefIn(BaseModel):
    ref: str = Field(..., min_length=2)


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


@router.get("/catalog", response_model=List[DockerImageRow])
def docker_catalog(_: str = Depends(require_api_token)) -> List[DockerImageRow]:
    rows, _demo = list_docker_images()
    out: List[DockerImageRow] = []
    for row in rows:
        repo = str(row.get("repository") or "")
        tag = str(row.get("tag") or "latest")
        ref = "{0}:{1}".format(repo, tag) if repo else str(row.get("id") or "")
        out.append(
            DockerImageRow(
                repository=repo,
                tag=tag,
                id=str(row.get("id") or ""),
                size_bytes=int(row.get("size_bytes") or 0),
                ref=ref,
            )
        )
    return out


@router.post("/rmi", response_model=DockerRmiOut)
def docker_rmi(
    body: ImageRefIn,
    _: str = Depends(require_api_token),
) -> DockerRmiOut:
    ref = body.ref.strip()
    if not ref or any(ch.isspace() for ch in ref):
        raise HTTPException(status_code=400, detail="invalid image ref")
    code, text = docker_cli.capture(["rmi", ref], timeout=120)
    return DockerRmiOut(
        ok=code == 0,
        command="docker rmi {0}".format(ref),
        output=text,
    )
