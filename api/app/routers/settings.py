from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import require_admin, require_user
from app.config import Settings, get_settings
from app.services import app_settings as settings_service
from app.services.storage import get_storage_report

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsOut(BaseModel):
    git_base_url: str
    git_token_set: bool
    docker_host: str
    remote_registry: str
    image_version: str
    image_prefix: str
    data_dir: str


class SettingsUpdate(BaseModel):
    git_base_url: Optional[str] = None
    git_token: Optional[str] = Field(
        default=None,
        description="Omit or empty to keep existing token",
    )
    docker_host: Optional[str] = None
    remote_registry: Optional[str] = None
    image_version: Optional[str] = None
    image_prefix: Optional[str] = None
    data_dir: Optional[str] = None


class CheckoutUsage(BaseModel):
    repo_id: str
    repo_label: str
    branch: str
    path: str
    size_bytes: int


class ImageUsage(BaseModel):
    repository: str
    tag: str
    id: str
    size_bytes: int


class StorageOut(BaseModel):
    data_dir: str
    iskele_bytes: int
    repos_bytes: int
    artifacts_bytes: int
    database_bytes: int
    checkouts: List[CheckoutUsage]
    checkouts_demo: bool
    checkouts_total_bytes: int
    images: List[ImageUsage]
    images_demo: bool
    images_total_bytes: int
    disk_total_bytes: int
    disk_used_bytes: int
    disk_free_bytes: int


@router.get("", response_model=SettingsOut)
def get_settings_endpoint(
    _: dict = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> SettingsOut:
    """Any signed-in user can read non-secret defaults (registry, version, …)."""
    return SettingsOut(**settings_service.get_app_settings(settings))


@router.put("", response_model=SettingsOut)
def put_settings(
    body: SettingsUpdate,
    _: dict = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> SettingsOut:
    patch = body.model_dump(exclude_unset=True)
    return SettingsOut(**settings_service.update_app_settings(patch, settings))


@router.get("/storage", response_model=StorageOut)
def get_storage(
    _: dict = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> StorageOut:
    cfg = settings_service.get_app_settings(settings)
    report: Dict[str, Any] = get_storage_report(
        settings, data_dir=cfg.get("data_dir")
    )
    return StorageOut(
        data_dir=report["data_dir"],
        iskele_bytes=report["iskele_bytes"],
        repos_bytes=report["repos_bytes"],
        artifacts_bytes=report["artifacts_bytes"],
        database_bytes=report["database_bytes"],
        checkouts=[CheckoutUsage(**c) for c in report["checkouts"]],
        checkouts_demo=report["checkouts_demo"],
        checkouts_total_bytes=report["checkouts_total_bytes"],
        images=[ImageUsage(**i) for i in report["images"]],
        images_demo=report["images_demo"],
        images_total_bytes=report["images_total_bytes"],
        disk_total_bytes=report["disk_total_bytes"],
        disk_used_bytes=report["disk_used_bytes"],
        disk_free_bytes=report["disk_free_bytes"],
    )
