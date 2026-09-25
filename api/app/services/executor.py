"""Run build / tar / zip / load / push against the local Docker CLI."""

from __future__ import annotations

import gzip
import os
import shutil
import zipfile
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from app.config import get_settings
from app.models.schemas import JobCreate, ModuleOut
from app.services import docker_cli
from app.services import git_local
from app.services import store
from app.services.app_settings import get_git_token
from app.services.git_client import GitClient
from app.services.storage import artifacts_root, checkout_path, ensure_data_dirs

OnLine = Callable[[str], None]


def _find_module(repo_id: str, branch: str, module_id: str) -> Optional[ModuleOut]:
    return GitClient(get_settings()).get_module(repo_id, branch, module_id)


def _emit_factory(bucket: List[str], on_line: Optional[OnLine]) -> OnLine:
    def emit(msg: str) -> None:
        bucket.append(msg)
        if on_line:
            on_line(msg)

    return emit


def _resolve_context(repo_id: str, branch: str, mod: ModuleOut) -> Tuple[Path, Path]:
    settings = get_settings()
    dest = checkout_path(repo_id, branch, settings=settings)
    rel = Path(mod.path) if mod.path not in (".", "", "/") else Path(".")
    dockerfile = (dest / rel / mod.dockerfile) if str(rel) != "." else dest / mod.dockerfile
    if not dockerfile.is_file():
        source = store.get_clone_url(repo_id)
        if source:
            dest = git_local.ensure_checkout(
                source,
                repo_id,
                branch,
                data_dir=settings.data_dir,
                token=get_git_token(settings),
            )
            dockerfile = (
                (dest / rel / mod.dockerfile) if str(rel) != "." else dest / mod.dockerfile
            )
    if not dockerfile.is_file():
        raise RuntimeError(
            "Dockerfile not found at {0}. Open the branch on the dashboard first.".format(
                dockerfile
            )
        )
    context = dockerfile.parent
    return context, dockerfile


def _artifact_stem(mod: ModuleOut, tag: str) -> str:
    slug = mod.id.replace("mod-", "") or mod.name
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in slug)
    return "{0}-{1}".format(safe, tag)


def _find_artifact(mod: ModuleOut, tag: str) -> Optional[Path]:
    root = artifacts_root()
    if not root.exists():
        return None
    stem = _artifact_stem(mod, tag)
    for name in ("{0}.tar.gz".format(stem), "{0}.tar".format(stem), "{0}.zip".format(stem)):
        path = root / name
        if path.is_file():
            return path
    matches = sorted(root.glob("{0}*".format(stem)), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def _resolve_archive(raw: str) -> Path:
    path = Path((raw or "").strip().strip('"')).expanduser()
    name = path.name.lower()
    if not (
        name.endswith(".tar")
        or name.endswith(".tar.gz")
        or name.endswith(".tgz")
    ):
        raise RuntimeError("Archive must be .tar, .tar.gz, or .tgz")
    if not path.is_file():
        raise RuntimeError("Archive not found: {0}".format(path))
    return path.resolve()


def execute_action(
    payload: JobCreate,
    on_line: Optional[OnLine] = None,
) -> Tuple[str, List[str], Optional[str]]:
    lines: List[str] = []
    emit = _emit_factory(lines, on_line)

    emit("[iskele] starting action={0}".format(payload.action))
    archive_raw = (payload.archive_path or "").strip()
    if payload.action == "load" and archive_raw:
        return _run_load_archive(emit, lines, archive_raw)
    if payload.action == "save":
        return _run_save_image(emit, lines, payload)
    if payload.action in (
        "prune-dangling",
        "prune-builder",
        "prune-containers",
    ):
        return _run_prune(emit, lines, payload.action)

    emit("[iskele] resolving module / checkout")
    mod = _find_module(payload.repo_id, payload.branch, payload.module_id)
    image = (payload.image or (mod.image_name if mod else payload.module_id)).strip()
    tag = (payload.tag or "latest").strip()
    remote = (payload.remote or "").strip()
    full = "{0}:{1}".format(image, tag)
    emit("[iskele] image={0}".format(full))

    if mod is None:
        err = "Module not found: {0}".format(payload.module_id)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err

    try:
        context, dockerfile = _resolve_context(payload.repo_id, payload.branch, mod)
    except RuntimeError as exc:
        emit("[iskele] ERROR: {0}".format(exc))
        return "failed", lines, str(exc)

    emit("[iskele] context: {0}".format(context))
    emit("[iskele] dockerfile: {0}".format(dockerfile.name))

    ok, detail = docker_cli.probe()
    if payload.action in ("build", "tar", "load", "push") and not ok:
        err = detail
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err

    if payload.action == "build":
        return _run_build(emit, lines, context, dockerfile, full)
    if payload.action == "tar":
        return _run_tar(emit, lines, mod, tag, full)
    if payload.action == "zip":
        return _run_zip(emit, lines, mod, tag, context)
    if payload.action == "load":
        return _run_load(emit, lines, mod, tag)
    if payload.action == "push":
        return _run_push(emit, lines, image, tag, full, remote)

    err = "Unsupported action: {0}".format(payload.action)
    emit("[iskele] ERROR: {0}".format(err))
    return "failed", lines, err


def _run_build(
    emit: OnLine,
    lines: List[str],
    context: Path,
    dockerfile: Path,
    full: str,
) -> Tuple[str, List[str], Optional[str]]:
    args = ["build", "-f", dockerfile.name, "-t", full, "."]
    emit("$ docker {0}".format(" ".join(args)))
    code = docker_cli.stream(args, cwd=str(context), on_line=emit, timeout=3600)
    if code != 0:
        err = "docker build exited {0}".format(code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    emit("[iskele] build finished")
    return "success", lines, None


def _run_tar(
    emit: OnLine,
    lines: List[str],
    mod: ModuleOut,
    tag: str,
    full: str,
) -> Tuple[str, List[str], Optional[str]]:
    ensure_data_dirs()
    root = artifacts_root()
    root.mkdir(parents=True, exist_ok=True)
    stem = _artifact_stem(mod, tag)
    tar_path = root / "{0}.tar".format(stem)
    gz_path = root / "{0}.tar.gz".format(stem)
    args = ["save", "-o", str(tar_path), full]
    emit("$ docker {0}".format(" ".join(args)))
    code = docker_cli.stream(args, on_line=emit, timeout=1800)
    if code != 0:
        err = "docker save exited {0}".format(code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    if not tar_path.is_file():
        err = "docker save produced no file"
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    emit("[iskele] gzip {0}".format(gz_path.name))
    with tar_path.open("rb") as src, gzip.open(str(gz_path), "wb") as dst:
        shutil.copyfileobj(src, dst)
    try:
        tar_path.unlink()
    except OSError:
        pass
    emit("[iskele] → artifacts/{0}".format(gz_path.name))
    emit("[iskele] tar finished")
    return "success", lines, None


def _run_zip(
    emit: OnLine,
    lines: List[str],
    mod: ModuleOut,
    tag: str,
    context: Path,
) -> Tuple[str, List[str], Optional[str]]:
    ensure_data_dirs()
    root = artifacts_root()
    root.mkdir(parents=True, exist_ok=True)
    gz_name = "{0}.zip".format(_artifact_stem(mod, tag))
    zip_path = root / gz_name
    emit("[iskele] packing {0}".format(context))
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(context):
            dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules", "__pycache__"}]
            for name in filenames:
                full_path = Path(dirpath) / name
                arc = full_path.relative_to(context).as_posix()
                zf.write(str(full_path), arcname=arc)
    emit("[iskele] → artifacts/{0}".format(zip_path.name))
    emit("[iskele] zip finished")
    return "success", lines, None


_PRUNE_CMDS = {
    "prune-dangling": (["image", "prune", "-f"], "dangling images (<none>)"),
    "prune-builder": (["builder", "prune", "-f"], "unused build cache"),
    "prune-containers": (["container", "prune", "-f"], "stopped containers"),
}


def _run_prune(
    emit: OnLine,
    lines: List[str],
    action: str,
) -> Tuple[str, List[str], Optional[str]]:
    spec = _PRUNE_CMDS.get(action)
    if spec is None:
        err = "Unknown prune: {0}".format(action)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    args, label = spec
    ok, detail = docker_cli.probe()
    if not ok:
        emit("[iskele] ERROR: {0}".format(detail))
        return "failed", lines, detail
    emit("[iskele] prune: {0}".format(label))
    emit("$ docker {0}".format(" ".join(args)))
    code = docker_cli.stream(args, on_line=emit, timeout=600)
    if code != 0:
        err = "docker {0} exited {1}".format(" ".join(args), code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    emit("[iskele] prune finished")
    return "success", lines, None


def _image_ref(payload: JobCreate) -> str:
    raw = (payload.image or "").strip()
    if not raw:
        raise RuntimeError("image is required")
    last = raw.split("/")[-1]
    tag = (payload.tag or "").strip()
    if tag and ":" not in last:
        raw = "{0}:{1}".format(raw, tag)
    return raw


def _run_save_image(
    emit: OnLine,
    lines: List[str],
    payload: JobCreate,
) -> Tuple[str, List[str], Optional[str]]:
    try:
        ref = _image_ref(payload)
    except RuntimeError as exc:
        emit("[iskele] ERROR: {0}".format(exc))
        return "failed", lines, str(exc)

    ok, detail = docker_cli.probe()
    if not ok:
        emit("[iskele] ERROR: {0}".format(detail))
        return "failed", lines, detail

    raw_out = (payload.archive_path or "").strip()
    if not raw_out:
        ensure_data_dirs()
        safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in ref)
        raw_out = str(artifacts_root() / "{0}.tar.gz".format(safe.strip("-") or "image"))

    dest = Path(raw_out.strip().strip('"')).expanduser()
    name = dest.name.lower()
    if not (
        name.endswith(".tar")
        or name.endswith(".tar.gz")
        or name.endswith(".tgz")
    ):
        dest = dest.with_name(dest.name + ".tar.gz")
        name = dest.name.lower()
    dest.parent.mkdir(parents=True, exist_ok=True)
    want_gz = name.endswith(".tar.gz") or name.endswith(".tgz")
    if name.endswith(".tar.gz"):
        tar_path = dest.with_name(dest.name[:-7] + ".tar")
    elif name.endswith(".tgz"):
        tar_path = dest.with_name(dest.name[:-4] + ".tar")
    else:
        tar_path = dest

    emit("[iskele] image={0}".format(ref))
    emit("[iskele] archive: {0}".format(dest))
    args = ["save", "-o", str(tar_path), ref]
    emit("$ docker {0}".format(" ".join(args)))
    code = docker_cli.stream(args, on_line=emit, timeout=1800)
    if code != 0:
        err = "docker save exited {0}".format(code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    if not tar_path.is_file():
        err = "docker save produced no file"
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    if want_gz:
        emit("[iskele] gzip {0}".format(dest.name))
        with tar_path.open("rb") as src, gzip.open(str(dest), "wb") as dst:
            shutil.copyfileobj(src, dst)
        if tar_path != dest:
            try:
                tar_path.unlink()
            except OSError:
                pass
    emit("[iskele] save finished")
    return "success", lines, None


def _docker_load_file(
    emit: OnLine,
    lines: List[str],
    artifact: Path,
) -> Tuple[str, List[str], Optional[str]]:
    ok, detail = docker_cli.probe()
    if not ok:
        emit("[iskele] ERROR: {0}".format(detail))
        return "failed", lines, detail
    args = ["load", "-i", str(artifact)]
    emit("$ docker {0}".format(" ".join(args)))
    code = docker_cli.stream(args, on_line=emit, timeout=1800)
    if code != 0:
        err = "docker load exited {0}".format(code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    emit("[iskele] load finished")
    return "success", lines, None


def _run_load_archive(
    emit: OnLine,
    lines: List[str],
    raw_path: str,
) -> Tuple[str, List[str], Optional[str]]:
    try:
        artifact = _resolve_archive(raw_path)
    except RuntimeError as exc:
        emit("[iskele] ERROR: {0}".format(exc))
        return "failed", lines, str(exc)
    emit("[iskele] archive: {0}".format(artifact))
    return _docker_load_file(emit, lines, artifact)


def _run_load(
    emit: OnLine,
    lines: List[str],
    mod: ModuleOut,
    tag: str,
) -> Tuple[str, List[str], Optional[str]]:
    artifact = _find_artifact(mod, tag)
    if artifact is None:
        err = "No artifact to load for this module"
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    emit("[iskele] archive: {0}".format(artifact))
    return _docker_load_file(emit, lines, artifact)


def _run_push(
    emit: OnLine,
    lines: List[str],
    image: str,
    tag: str,
    full: str,
    remote: str,
) -> Tuple[str, List[str], Optional[str]]:
    if not remote:
        err = "No remote registry configured"
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    remote_full = "{0}/{1}:{2}".format(remote.rstrip("/"), image, tag)
    tag_args = ["tag", full, remote_full]
    emit("$ docker {0}".format(" ".join(tag_args)))
    code = docker_cli.stream(tag_args, on_line=emit, timeout=120)
    if code != 0:
        err = "docker tag exited {0}".format(code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    push_args = ["push", remote_full]
    emit("$ docker {0}".format(" ".join(push_args)))
    code = docker_cli.stream(push_args, on_line=emit, timeout=1800)
    if code != 0:
        err = "docker push exited {0}".format(code)
        emit("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err
    emit("[iskele] push finished")
    return "success", lines, None
