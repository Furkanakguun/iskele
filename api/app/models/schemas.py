from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


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
    lines: List[str] = []


class DockerCommandOut(BaseModel):
    command: str
    output: str
