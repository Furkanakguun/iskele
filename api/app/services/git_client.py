from __future__ import annotations

from typing import List, Optional

from app.config import Settings
from app.data import demo
from app.models.schemas import BranchOut, ModuleOut, RepoOut
from app.services import git_local
from app.services import store
from app.services.app_settings import get_git_token


def repo_id_from(project_key: str, slug: str) -> str:
    raw = "repo-{0}-{1}".format(project_key.lower(), slug.lower())
    return "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in raw)


class GitClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def configured(self) -> bool:
        return bool(self.settings.git_base_url.strip())

    def _token(self) -> str:
        return get_git_token(self.settings)

    def list_repos(self) -> List[RepoOut]:
        return store.list_repos()

    def list_branches(self, repo_id: str) -> List[BranchOut]:
        source = store.get_clone_url(repo_id)
        if source:
            try:
                return git_local.list_branches_from_source(source, token=self._token())
            except Exception:
                return list(demo.BRANCHES.get(repo_id, []))
        return list(demo.BRANCHES.get(repo_id, []))

    def list_modules(self, repo_id: str, branch: str) -> List[ModuleOut]:
        source = store.get_clone_url(repo_id)
        if source:
            dest = git_local.ensure_checkout(
                source,
                repo_id,
                branch,
                data_dir=self.settings.data_dir,
                token=self._token(),
            )
            return git_local.scan_modules(dest)
        return list(demo.MODULES.get("{0}:{1}".format(repo_id, branch), []))

    def get_module(
        self, repo_id: str, branch: str, module_id: str
    ) -> Optional[ModuleOut]:
        for mod in self.list_modules(repo_id, branch):
            if mod.id == module_id:
                return mod
        return None

    def discover(
        self, project_key: str, slug: str, clone_url: str = ""
    ) -> dict:
        url = (clone_url or "").strip()
        if url:
            data = git_local.discover_from_source(url, token=self._token())
            key = project_key.strip().upper() or "LOCAL"
            s = slug.strip().lower() or data["name"].lower().replace(" ", "-")
            return {
                "project_key": key,
                "slug": s,
                "name": data["name"],
                "default_branch": data["default_branch"],
                "branches": data["branches"],
                "clone_url": git_local.normalize_source(url),
            }

        if not project_key.strip() or not slug.strip():
            raise ValueError("project_key and slug are required")
        raise ValueError("clone_url is required (local git folder or git URL)")

    def add_repo(
        self,
        project_key: str,
        slug: str,
        name: str,
        default_branch: str,
        description: str,
        branches: List[dict],
        clone_url: str = "",
        created_by: int = 0,
    ) -> RepoOut:
        if not created_by:
            raise ValueError("created_by is required")
        key = project_key.strip().upper()
        s = slug.strip().lower()
        rid = repo_id_from(key, s)
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
        if branch_models:
            demo.BRANCHES[rid] = branch_models
        url = git_local.normalize_source(clone_url) if clone_url.strip() else ""
        return store.insert_repo(repo, created_by=created_by, clone_url=url)

    def remove_repo(self, repo_id: str) -> None:
        store.delete_repo(repo_id)
        demo.BRANCHES.pop(repo_id, None)
        for key in list(demo.MODULES.keys()):
            if key.startswith(repo_id + ":"):
                demo.MODULES.pop(key, None)
