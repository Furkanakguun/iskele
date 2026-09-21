from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    display_name: str
    role: str
    username: str


class RepoOut(BaseModel):
    id: str
    project_key: str
    slug: str
    name: str
    description: str
    default_branch: str


class BranchOut(BaseModel):
    name: str
    short_sha: str
    commit_message: str
    updated_at: str
    dockerfile_count: int


class ModuleOut(BaseModel):
    id: str
    name: str
    path: str
    dockerfile: str
    base_image: str
    expose: str
    image_name: str
    status: str
    last_image_tag: Optional[str] = None
    last_artifact: Optional[str] = None
    last_job_id: Optional[str] = None
    note: Optional[str] = None


class JobCreate(BaseModel):
    repo_id: str
    branch: str
    module_id: str
    action: str = Field(..., pattern="^(build|tar|zip|load|push)$")
    image: Optional[str] = None
    tag: Optional[str] = None
    remote: Optional[str] = None


class JobOut(BaseModel):
    id: str
    status: str
    action: str
    repo_id: str
    branch: str
    module_id: str
    image: Optional[str] = None
    tag: Optional[str] = None
    remote: Optional[str] = None
    lines: List[str] = []
    error: Optional[str] = None
    created_at: str
    finished_at: Optional[str] = None


class DockerCommandOut(BaseModel):
    command: str
    output: str


class RunningServiceOut(BaseModel):
    name: str
    image: str
    host_port: int
    container_port: int
    url: str
    status: str


class ActivityOut(BaseModel):
    id: str
    text: str
    tone: str
    created_at: str
