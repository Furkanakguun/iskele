"""Stub action executor — produces clear success/fail job logs."""

from __future__ import annotations

from typing import List, Optional, Tuple

from app.data import demo
from app.models.schemas import JobCreate, ModuleOut


def _find_module(repo_id: str, branch: str, module_id: str) -> Optional[ModuleOut]:
    for mod in demo.MODULES.get("{0}:{1}".format(repo_id, branch), []):
        if mod.id == module_id:
            return mod
    return None


def execute_action(payload: JobCreate) -> Tuple[str, List[str], Optional[str]]:
    """
    Returns (status, log_lines, error).
    status is 'success' or 'failed'.
    """
    mod = _find_module(payload.repo_id, payload.branch, payload.module_id)
    image = (payload.image or (mod.image_name if mod else payload.module_id)).strip()
    tag = (payload.tag or "latest").strip()
    remote = (payload.remote or "registry.example.com/nimbus").strip()
    full = "{0}:{1}".format(image, tag)
    lines: List[str] = [
        "[iskele] starting action={0}".format(payload.action),
        "[iskele] image={0}".format(full),
    ]

    if mod is None:
        err = "Module not found: {0}".format(payload.module_id)
        lines.append("[iskele] ERROR: {0}".format(err))
        return "failed", lines, err

    lines.append("[iskele] context: {0}".format(mod.path))

    if payload.action == "build":
        # Deterministic fail for storefront — mirrors UI mock
        if mod.id == "mod-storefront":
            lines.extend(
                [
                    "[iskele] docker build -f Dockerfile -t {0} .".format(full),
                    "Step 1/4 : FROM nginx:1.27-alpine",
                    "[iskele] ERROR: dist/ not found — build the storefront first",
                ]
            )
            return "failed", lines, "dist/ not found — build the storefront first"

        lines.extend(
            [
                "[iskele] docker build -f Dockerfile -t {0} .".format(full),
                "Step 1/4 : FROM {0}".format(mod.base_image),
                "Step 2/4 : COPY . /app",
                "Step 3/4 : EXPOSE {0}".format(mod.expose),
                "Step 4/4 : ENTRYPOINT",
                "Successfully tagged {0}".format(full),
                "[iskele] Build OK",
            ]
        )
        return "success", lines, None

    if payload.action == "tar":
        artifact = "{0}-{1}.tar.gz".format(mod.id.replace("mod-", ""), tag)
        lines.extend(
            [
                "[iskele] docker save {0} | gzip".format(full),
                "[iskele] → /data/artifacts/{0}".format(artifact),
                "[iskele] Tar OK",
            ]
        )
        return "success", lines, None

    if payload.action == "zip":
        artifact = "{0}-{1}.zip".format(mod.id.replace("mod-", ""), tag)
        lines.extend(
            [
                "[iskele] packing module context + Dockerfile",
                "[iskele] → /data/artifacts/{0}".format(artifact),
                "[iskele] Zip OK",
            ]
        )
        return "success", lines, None

    if payload.action == "load":
        if not mod.last_artifact:
            err = "No artifact to load for this module"
            lines.append("[iskele] ERROR: {0}".format(err))
            return "failed", lines, err
        lines.extend(
            [
                "[iskele] docker load -i {0}".format(mod.last_artifact),
                "Loaded image: {0}".format(full),
                "[iskele] Load OK",
            ]
        )
        return "success", lines, None

    if payload.action == "push":
        lines.extend(
            [
                "[iskele] remote: {0}".format(remote),
                "[iskele] docker tag {0} {1}/{2}".format(full, remote, image),
                "[iskele] docker push {0}/{1}".format(remote, image),
                "The push refers to repository [{0}/{1}]".format(remote, image),
                "digest: sha256:demo",
                "[iskele] Push OK",
            ]
        )
        return "success", lines, None

    err = "Unsupported action: {0}".format(payload.action)
    lines.append("[iskele] ERROR: {0}".format(err))
    return "failed", lines, err
