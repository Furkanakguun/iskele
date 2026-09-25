"""Talk to the local Docker CLI (Docker Desktop on Windows)."""

from __future__ import annotations

import shutil
import subprocess
from typing import Callable, List, Optional, Sequence, Tuple

OnLine = Callable[[str], None]


class DockerNotFound(RuntimeError):
    pass


def docker_bin() -> str:
    found = shutil.which("docker") or shutil.which("docker.exe")
    if not found:
        raise DockerNotFound("docker CLI not found on PATH")
    return found


def probe() -> Tuple[bool, str]:
    try:
        binary = docker_bin()
    except DockerNotFound as exc:
        return False, str(exc)
    try:
        proc = subprocess.run(
            [binary, "info"],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return False, str(exc)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "docker info failed").strip()
        lower = err.lower()
        if (
            "cannot connect" in lower
            or "npipe" in lower
            or "pipe/docker" in lower
            or "the system cannot find" in lower
            or "error during connect" in lower
        ):
            return False, "Docker Desktop is not running"
        return False, err[:500]
    return True, "ok"


def argv(*args: str) -> List[str]:
    return [docker_bin()] + [str(a) for a in args]


def stream(
    args: Sequence[str],
    cwd: Optional[str] = None,
    on_line: Optional[OnLine] = None,
    timeout: Optional[int] = None,
) -> int:
    """Run `docker <args...>`, streaming combined stdout/stderr. Returns exit code."""
    try:
        cmd = argv(*[str(a) for a in args])
    except DockerNotFound as exc:
        if on_line:
            on_line(str(exc))
        return 127

    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )
    try:
        assert proc.stdout is not None
        for raw in iter(proc.stdout.readline, ""):
            line = raw.rstrip("\r\n")
            if on_line:
                on_line(line)
        return proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        if on_line:
            on_line("[iskele] docker timed out")
        return 124
    finally:
        if proc.stdout:
            proc.stdout.close()


def capture(args: Sequence[str], timeout: int = 30) -> Tuple[int, str]:
    try:
        cmd = argv(*[str(a) for a in args])
    except DockerNotFound as exc:
        return 127, str(exc)
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return 1, str(exc)
    out = (proc.stdout or "").rstrip()
    err = (proc.stderr or "").rstrip()
    text = out if out else err
    return proc.returncode, text
