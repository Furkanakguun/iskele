"""In-memory workspace — starts empty. Repos are added via the API."""

from __future__ import annotations

from typing import Dict, List

from app.models.schemas import BranchOut, ModuleOut, RepoOut

CLONE_URLS: Dict[str, str] = {}
REPOS: List[RepoOut] = []
BRANCHES: Dict[str, List[BranchOut]] = {}
MODULES: Dict[str, List[ModuleOut]] = {}
JOBS: Dict[str, dict] = {}
