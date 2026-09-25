from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.models.schemas import BranchOut, ModuleOut
from app.services.storage import branch_dir_name, checkout_path, ensure_data_dirs

_SKIP_DIR = {
    "node_modules",
    ".git",
    "dist",
    "target",
    "vendor",
    ".venv",
    "venv",
    "coverage",
    "build",
    "__pycache__",
}

_DF_RE = re.compile(r"^Dockerfile(\..+)?$", re.IGNORECASE)


def _run_git(
    args: List[str],
    cwd: Optional[Path] = None,
    timeout: int = 120,
    token: str = "",
) -> str:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    cmd = ["git"]
    if token.strip():
        cmd.extend(
            [
                "-c",
                "http.extraHeader=Authorization: Bearer {0}".format(token.strip()),
            ]
        )
    cmd.extend(args)
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        timeout=timeout,
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "git failed").strip()
        raise RuntimeError(err[:800])
    return proc.stdout or ""


def is_local_git_dir(source: str) -> bool:
    path = Path((source or "").strip().strip('"'))
    return path.exists() and (
        (path / ".git").exists() or (path.is_dir() and (path / "HEAD").exists())
    )



def is_git_source(url: str) -> bool:
    raw = (url or "").strip().strip('"')
    if not raw:
        return False
    if raw.startswith("file:"):
        return True
    path = Path(raw)
    if path.exists() and (path / ".git").exists():
        return True
    if path.exists() and path.is_dir() and (path / "HEAD").exists():
        return True  # bare repo
    if "://" in raw or raw.endswith(".git") or raw.startswith("git@"):
        return True
    return False


def normalize_source(url: str) -> str:
    raw = (url or "").strip().strip('"')
    if raw.startswith("file://"):
        return raw
    path = Path(raw)
    if path.exists():
        return str(path.resolve())
    return raw


def list_branches_from_ls_remote(source: str, token: str = "") -> List[BranchOut]:
    out = _run_git(["ls-remote", "--heads", source], timeout=60, token=token)
    rows: List[BranchOut] = []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        sha, ref = parts[0], parts[1]
        if not ref.startswith("refs/heads/"):
            continue
        name = ref[len("refs/heads/") :]
        rows.append(
            BranchOut(
                name=name,
                short_sha=sha[:7],
                commit_message="",
                updated_at="",
                dockerfile_count=0,
            )
        )
    return rows


def discover_from_source(source: str, token: str = "") -> Dict[str, Any]:
    src = normalize_source(source)
    if is_local_git_dir(src):
        cwd = Path(src)
        name = cwd.name
        try:
            default = _run_git(
                ["symbolic-ref", "--short", "HEAD"], cwd=cwd, timeout=30
            ).strip()
        except RuntimeError:
            default = "main"
        branches = list_branches_from_source(src, token=token)
    else:
        if not is_git_source(src):
            raise LookupError("Not a git repository: {0}".format(src))
        name = src.rstrip("/").split("/")[-1]
        if name.endswith(".git"):
            name = name[:-4]
        branches = list_branches_from_ls_remote(src, token=token)
        default = "development"
        if not any(b.name == default for b in branches):
            default = "main" if any(b.name == "main" for b in branches) else (
                branches[0].name if branches else "main"
            )

    if default and not any(b.name == default for b in branches) and branches:
        default = branches[0].name

    return {
        "name": name,
        "default_branch": default or "main",
        "branches": [
            {
                "name": b.name,
                "short_sha": b.short_sha,
                "commit_message": b.commit_message,
                "updated_at": b.updated_at,
                "dockerfile_count": b.dockerfile_count,
            }
            for b in branches
        ],
    }


def list_branches_from_source(source: str, token: str = "") -> List[BranchOut]:
    src = normalize_source(source)
    if not is_local_git_dir(src):
        return list_branches_from_ls_remote(src, token=token)
    cwd = Path(src)
    out = _run_git(
        [
            "for-each-ref",
            "--format=%(refname:short)|%(objectname:short)|%(contents:subject)|%(committerdate:iso-strict)",
            "refs/heads",
        ],
        cwd=cwd,
        timeout=60,
    )
    rows: List[BranchOut] = []
    for line in out.splitlines():
        parts = line.split("|", 3)
        if len(parts) < 4:
            continue
        name, sha, subject, date = parts[0], parts[1], parts[2], parts[3]
        rows.append(
            BranchOut(
                name=name,
                short_sha=sha,
                commit_message=subject,
                updated_at=date,
                dockerfile_count=0,
            )
        )
    return rows


def ensure_checkout(
    source: str,
    repo_id: str,
    branch: str,
    data_dir: Optional[str] = None,
    token: str = "",
) -> Path:
    ensure_data_dirs(data_dir=data_dir)
    dest = checkout_path(repo_id, branch, data_dir=data_dir)
    dest.parent.mkdir(parents=True, exist_ok=True)
    src = normalize_source(source)

    if dest.exists() and (dest / ".git").exists():
        _run_git(["fetch", "--all", "--prune"], cwd=dest, timeout=300, token=token)
        _run_git(["checkout", "-f", branch], cwd=dest, timeout=120, token=token)
    else:
        if dest.exists():
            raise RuntimeError("Checkout path exists but is not a git repo: {0}".format(dest))
        _run_git(
            ["clone", "--branch", branch, "--single-branch", src, str(dest)],
            timeout=600,
            token=token,
        )

    meta = dest / ".iskele-branch"
    meta.write_text(branch, encoding="utf-8")
    return dest


def _parse_dockerfile(path: Path) -> Tuple[str, str]:
    base = ""
    expose = ""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return base, expose
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.upper().startswith("FROM ") and not base:
            base = stripped[5:].strip().split(" ")[0]
        if stripped.upper().startswith("EXPOSE ") and not expose:
            expose = stripped[7:].strip().split(" ")[0]
    return base, expose


def scan_modules(root: Path) -> List[ModuleOut]:
    modules: List[ModuleOut] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIR]
        for name in filenames:
            if not _DF_RE.match(name):
                continue
            full = Path(dirpath) / name
            rel_dir = full.parent.relative_to(root).as_posix()
            if rel_dir == ".":
                rel_dir = "."
            slug = re.sub(r"[^a-z0-9]+", "-", (rel_dir + "-" + name).lower()).strip("-")
            mod_id = "mod-" + (slug[:40] or "root")
            folder = full.parent.name if rel_dir != "." else root.name
            base, expose = _parse_dockerfile(full)
            image = re.sub(r"[^a-z0-9]+", "-", folder.lower()).strip("-") or "module"
            modules.append(
                ModuleOut(
                    id=mod_id,
                    name=folder,
                    path=rel_dir,
                    dockerfile=name,
                    base_image=base or "unknown",
                    expose=expose or "—",
                    image_name=image,
                    status="idle",
                    note="from local git checkout",
                )
            )
    modules.sort(key=lambda m: m.path)
    return modules
