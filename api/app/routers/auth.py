from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import create_access_token, require_admin, require_user
from app.config import Settings, get_settings
from app.models.schemas import LoginRequest, LoginResponse
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    is_active: bool
    created_at: str


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2)
    password: str = Field(..., min_length=4)
    display_name: str = ""
    role: str = Field(..., pattern="^(admin|user)$")


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, settings: Settings = Depends(get_settings)) -> LoginResponse:
    user = users_service.authenticate(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user, settings)
    return LoginResponse(
        access_token=token,
        display_name=user["display_name"],
        role=user["role"],
        username=user["username"],
    )


@router.get("/me", response_model=UserOut)
def me(user=Depends(require_user)) -> UserOut:
    return UserOut(**user)


users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("", response_model=List[UserOut])
def list_users(_: dict = Depends(require_admin)) -> List[UserOut]:
    return [UserOut(**u) for u in users_service.list_users()]


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, _: dict = Depends(require_admin)) -> UserOut:
    try:
        created = users_service.create_user(
            body.username,
            body.password,
            body.display_name,
            body.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserOut(**created)


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|user)$")
    password: Optional[str] = Field(default=None, min_length=4)
    is_active: Optional[bool] = None


@users_router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    actor: dict = Depends(require_admin),
) -> UserOut:
    try:
        updated = users_service.update_user(
            user_id,
            actor_id=int(actor["id"]),
            display_name=body.display_name,
            role=body.role,
            password=body.password,
            is_active=body.is_active,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserOut(**updated)


@users_router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, actor: dict = Depends(require_admin)) -> None:
    try:
        users_service.delete_user(user_id, actor_id=int(actor["id"]))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
