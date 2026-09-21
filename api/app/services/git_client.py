from __future__ import annotations

from typing import List

from app.config import Settings
from app.data import demo
from app.models.schemas import BranchOut, ModuleOut, RepoOut


class GitClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def configured(self) -> bool:
        return bool(self.settings.git_base_url.strip())

    def list_repos(self) -> List[RepoOut]:
        # Real implementation will call the Git server API.
        return list(demo.REPOS)

    def list_branches(self, repo_id: str) -> List[BranchOut]:
        return list(demo.BRANCHES.get(repo_id, []))

    def list_modules(self, repo_id: str, branch: str) -> List[ModuleOut]:
        return list(demo.MODULES.get(f"{repo_id}:{branch}", []))

    def discover(self, project_key: str, slug: str) -> dict:
        if not project_key.strip() or not slug.strip():
            raise ValueError("project_key and slug are required")
        if slug.strip().lower() == "not-found":
            raise LookupError("Git server: repo not found")
        key = project_key.strip().upper()
        s = slug.strip().lower()
        return {
            "project_key": key,
            "slug": s,
            "name": " ".join(part.capitalize() for part in s.split("-")),
            "default_branch": "development",
            "branches": [
                {
                    "name": "main",
                    "short_sha": "e1a2b3c",
                    "commit_message": "Initial import",
                    "updated_at": "2026-09-21T00:00:00Z",
                    "dockerfile_count": 2,
                },
                {
                    "name": "development",
                    "short_sha": "a9b8c7d",
                    "commit_message": "Latest work",
                    "updated_at": "2026-09-21T00:00:00Z",
                    "dockerfile_count": 4,
                },
            ],
        }
