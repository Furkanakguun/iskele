from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import require_api_token
from app.config import get_settings
from app.models.schemas import BranchOut, ModuleOut, RepoOut
from app.services.git_client import GitClient

router = APIRouter(prefix="/repos", tags=["repos"])


def _git() -> GitClient:
    return GitClient(get_settings())


@router.get("", response_model=List[RepoOut])
def list_repos(_: str = Depends(require_api_token)) -> List[RepoOut]:
    return _git().list_repos()


@router.get("/discover")
def discover(
    project_key: str = Query(..., min_length=1),
    slug: str = Query(..., min_length=1),
    _: str = Depends(require_api_token),
) -> dict:
    try:
        return _git().discover(project_key, slug)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{repo_id}/branches", response_model=List[BranchOut])
def list_branches(repo_id: str, _: str = Depends(require_api_token)) -> List[BranchOut]:
    branches = _git().list_branches(repo_id)
    if not branches:
        raise HTTPException(status_code=404, detail="Repo not found")
    return branches


@router.get("/{repo_id}/modules", response_model=List[ModuleOut])
def list_modules(
    repo_id: str,
    branch: str = Query(..., min_length=1),
    _: str = Depends(require_api_token),
) -> List[ModuleOut]:
    return _git().list_modules(repo_id, branch)
