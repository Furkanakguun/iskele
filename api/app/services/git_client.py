from __future__ import annotations

from typing import List, Optional

from app.config import Settings
from app.data import demo
from app.models.schemas import BranchOut, ModuleOut, RepoOut


def repo_id_from(project_key: str, slug: str) -> str:
    raw = "repo-{0}-{1}".format(project_key.lower(), slug.lower())
    return "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in raw)


class GitClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def configured(self) -> bool:
        return bool(self.settings.git_base_url.strip())

    def list_repos(self) -> List[RepoOut]:
        return list(demo.REPOS)

    def list_branches(self, repo_id: str) -> List[BranchOut]:
        return list(demo.BRANCHES.get(repo_id, []))

    def list_modules(self, repo_id: str, branch: str) -> List[ModuleOut]:
        return list(demo.MODULES.get("{0}:{1}".format(repo_id, branch), []))

    def get_module(
        self, repo_id: str, branch: str, module_id: str
    ) -> Optional[ModuleOut]:
        for mod in self.list_modules(repo_id, branch):
            if mod.id == module_id:
                return mod
        return None

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

    def add_repo(
        self,
        project_key: str,
        slug: str,
        name: str,
        default_branch: str,
        description: str,
        branches: List[dict],
    ) -> RepoOut:
        key = project_key.strip().upper()
        s = slug.strip().lower()
        rid = repo_id_from(key, s)
        if any(r.id == rid or (r.project_key == key and r.slug == s) for r in demo.REPOS):
            raise ValueError("repo already exists")

        repo = RepoOut(
            id=rid,
            project_key=key,
            slug=s,
            name=name.strip() or s,
            description=description.strip() or "Git {0}/{1}".format(key, s),
            default_branch=default_branch.strip() or "main",
        )
        branch_models = [
            BranchOut(
                name=b["name"],
                short_sha=b.get("short_sha", "pending"),
                commit_message=b.get("commit_message", ""),
                updated_at=b.get("updated_at", "2026-09-21T00:00:00Z"),
                dockerfile_count=int(b.get("dockerfile_count", 0)),
            )
            for b in branches
        ]
        if not branch_models:
            branch_models = [
                BranchOut(
                    name=repo.default_branch,
                    short_sha="pending",
                    commit_message="Not scanned yet",
                    updated_at="2026-09-21T00:00:00Z",
                    dockerfile_count=0,
                )
            ]

        demo.REPOS.append(repo)
        demo.BRANCHES[rid] = branch_models
        return repo

    def remove_repo(self, repo_id: str) -> None:
        if len(demo.REPOS) <= 1:
            raise ValueError("cannot remove the last repo")
        before = len(demo.REPOS)
        demo.REPOS[:] = [r for r in demo.REPOS if r.id != repo_id]
        if len(demo.REPOS) == before:
            raise LookupError("repo not found")
        demo.BRANCHES.pop(repo_id, None)
        for key in list(demo.MODULES.keys()):
            if key.startswith(repo_id + ":"):
                demo.MODULES.pop(key, None)
