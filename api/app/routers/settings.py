from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import require_admin
from app.config import Settings, get_settings
from app.services import app_settings as settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsOut(BaseModel):
    git_base_url: str
    git_token_set: bool
    docker_host: str
    remote_registry: str
    image_version: str
    image_prefix: str


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


@router.get("", response_model=SettingsOut)
def get_settings_endpoint(
    _: dict = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> SettingsOut:
    return SettingsOut(**settings_service.get_app_settings(settings))


@router.put("", response_model=SettingsOut)
def put_settings(
    body: SettingsUpdate,
    _: dict = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> SettingsOut:
    patch = body.model_dump(exclude_unset=True)
    return SettingsOut(**settings_service.update_app_settings(patch, settings))
