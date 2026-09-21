from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import require_api_token
from app.config import get_settings
from app.models.schemas import BranchOut, ModuleOut, RepoOut
from app.services.git_client import GitClient

router = APIRouter(prefix="/repos", tags=["repos"])


class RepoCreate(BaseModel):
    project_key: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1)
    name: str = ""
    default_branch: str = "development"
    description: str = ""
    branches: List[dict] = []


def _git() -> GitClient:
    return GitClient(get_settings())


@router.get("", response_model=List[RepoOut])
def list_repos(_: dict = Depends(require_api_token)) -> List[RepoOut]:
    return _git().list_repos()


@router.post("", response_model=RepoOut, status_code=201)
def create_repo(body: RepoCreate, _: dict = Depends(require_api_token)) -> RepoOut:
    try:
        return _git().add_repo(
            body.project_key,
            body.slug,
            body.name,
            body.default_branch,
            body.description,
            body.branches,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/discover")
def discover(
    project_key: str = Query(..., min_length=1),
    slug: str = Query(..., min_length=1),
    _: dict = Depends(require_api_token),
) -> dict:
    try:
        return _git().discover(project_key, slug)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{repo_id}", status_code=204)
def delete_repo(repo_id: str, _: dict = Depends(require_api_token)) -> None:
    try:
        _git().remove_repo(repo_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{repo_id}/branches", response_model=List[BranchOut])
def list_branches(repo_id: str, _: dict = Depends(require_api_token)) -> List[BranchOut]:
    branches = _git().list_branches(repo_id)
    if not branches:
        raise HTTPException(status_code=404, detail="Repo not found")
    return branches


@router.get("/{repo_id}/modules", response_model=List[ModuleOut])
def list_modules(
    repo_id: str,
    branch: str = Query(..., min_length=1),
    _: dict = Depends(require_api_token),
) -> List[ModuleOut]:
    return _git().list_modules(repo_id, branch)


@router.get("/{repo_id}/modules/{module_id}", response_model=ModuleOut)
def get_module(
    repo_id: str,
    module_id: str,
    branch: str = Query(..., min_length=1),
    _: dict = Depends(require_api_token),
) -> ModuleOut:
    mod = _git().get_module(repo_id, branch, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    return mod
