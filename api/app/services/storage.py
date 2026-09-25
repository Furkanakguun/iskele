from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import Settings, get_settings


def branch_dir_name(branch: str) -> str:
    """Filesystem-safe branch folder name."""
    safe = re.sub(r"[^\w.\-]+", "__", branch.strip())
    return safe or "unknown"


def ensure_data_dirs(data_dir: Optional[str] = None, settings: Optional[Settings] = None) -> Path:
    settings = settings or get_settings()
    root = Path(data_dir or settings.data_dir)
    root.mkdir(parents=True, exist_ok=True)
    (root / "repos").mkdir(parents=True, exist_ok=True)
    (root / "artifacts").mkdir(parents=True, exist_ok=True)
    return root


def repos_root(data_dir: Optional[str] = None, settings: Optional[Settings] = None) -> Path:
    settings = settings or get_settings()
    return Path(data_dir or settings.data_dir) / "repos"


def artifacts_root(data_dir: Optional[str] = None, settings: Optional[Settings] = None) -> Path:
    settings = settings or get_settings()
    return Path(data_dir or settings.data_dir) / "artifacts"


def checkout_path(
    repo_id: str,
    branch: str,
    settings: Optional[Settings] = None,
    data_dir: Optional[str] = None,
) -> Path:
    return repos_root(data_dir=data_dir, settings=settings) / repo_id / branch_dir_name(branch)


def dir_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += (Path(root) / name).stat().st_size
            except OSError:
                continue
    return total


def _scan_checkouts(data_dir: Path) -> List[Dict[str, Any]]:
    root = data_dir / "repos"
    out: List[Dict[str, Any]] = []
    if not root.exists():
        return out
    for repo_dir in sorted(root.iterdir()):
        if not repo_dir.is_dir():
            continue
        repo_id = repo_dir.name
        for branch_dir in sorted(repo_dir.iterdir()):
            if not branch_dir.is_dir():
                continue
            meta = branch_dir / ".iskele-branch"
            branch = (
                meta.read_text(encoding="utf-8").strip()
                if meta.exists()
                else branch_dir.name.replace("__", "/")
            )
            size = dir_size_bytes(branch_dir)
            rel = str(branch_dir.relative_to(data_dir)).replace("\\", "/")
            out.append(
                {
                    "repo_id": repo_id,
                    "repo_label": repo_id,
                    "branch": branch,
                    "path": rel,
                    "size_bytes": size,
                }
            )
    return out


def _parse_size_to_bytes(text: str) -> int:
    raw = (text or "").strip().upper().replace(",", "")
    if not raw or raw == "0":
        return 0
    match = re.match(r"^([\d.]+)\s*([KMGT]?I?B)?$", raw)
    if not match:
        # docker sometimes "412MB"
        match = re.match(r"^([\d.]+)\s*([KMGT])B?$", raw)
    if not match:
        try:
            return int(float(raw))
        except ValueError:
            return 0
    num = float(match.group(1))
    unit = (match.group(2) or "B").upper()
    mult = {
        "B": 1,
        "KB": 1000,
        "MB": 1000**2,
        "GB": 1000**3,
        "TB": 1000**4,
        "KIB": 1024,
        "MIB": 1024**2,
        "GIB": 1024**3,
        "TIB": 1024**4,
        "K": 1000,
        "M": 1000**2,
        "G": 1000**3,
        "T": 1000**4,
    }.get(unit, 1)
    return int(num * mult)


def _docker_images_real() -> Optional[List[Dict[str, Any]]]:
    try:
        proc = subprocess.run(
            [
                "docker",
                "images",
                "--format",
                "{{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}",
            ],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        return None
    if proc.returncode != 0:
        return None
    rows: List[Dict[str, Any]] = []
    for line in (proc.stdout or "").splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        repo, tag, image_id, size_txt = parts[0], parts[1], parts[2], parts[3]
        if repo == "<none>":
            continue
        rows.append(
            {
                "repository": repo,
                "tag": tag,
                "id": image_id,
                "size_bytes": _parse_size_to_bytes(size_txt),
            }
        )
    return rows


def list_docker_images() -> Tuple[List[Dict[str, Any]], bool]:
    """Returns (images, is_demo). is_demo=True when docker CLI is missing."""
    real = _docker_images_real()
    if real is not None:
        return real, False
    return [], True


def get_storage_report(
    settings: Optional[Settings] = None,
    data_dir: Optional[str] = None,
) -> Dict[str, Any]:
    settings = settings or get_settings()
    root = ensure_data_dirs(data_dir=data_dir or settings.data_dir, settings=settings)

    checkouts = _scan_checkouts(root)
    checkout_total = sum(int(c["size_bytes"]) for c in checkouts)

    images, images_demo = list_docker_images()
    images_total = sum(int(i["size_bytes"]) for i in images)

    repos_bytes = checkout_total
    artifacts_bytes = dir_size_bytes(root / "artifacts")
    db_path = Path(settings.database_path)
    db_bytes = db_path.stat().st_size if db_path.exists() else 0
    data_dir_bytes = dir_size_bytes(root)

    try:
        usage = shutil.disk_usage(str(root))
        disk_total = usage.total
        disk_used = usage.used
        disk_free = usage.free
    except OSError:
        disk_total = disk_used = disk_free = 0

    return {
        "data_dir": str(root.resolve()),
        "iskele_bytes": data_dir_bytes,
        "repos_bytes": repos_bytes,
        "artifacts_bytes": artifacts_bytes,
        "database_bytes": db_bytes,
        "checkouts": checkouts,
        "checkouts_demo": False,
        "checkouts_total_bytes": checkout_total,
        "images": images,
        "images_demo": images_demo,
        "images_total_bytes": images_total,
        "disk_total_bytes": disk_total,
        "disk_used_bytes": disk_used,
        "disk_free_bytes": disk_free,
    }
