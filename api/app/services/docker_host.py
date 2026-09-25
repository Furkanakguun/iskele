from __future__ import annotations

import re
from typing import List, Optional

from app.config import Settings
from app.models.schemas import DockerCommandOut, RunningServiceOut
from app.services import docker_cli

_PORT_RE = re.compile(r"0\.0\.0\.0:(\d+)->(\d+)/tcp")


class DockerHost:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def images(self, grep: Optional[str] = None) -> DockerCommandOut:
        filt = (grep or "").strip()
        cmd = 'docker images | grep "{0}"'.format(filt) if filt else "docker images"
        code, text = docker_cli.capture(["images"])
        if code != 0:
            return DockerCommandOut(command=cmd, output=text or "docker images failed")
        output = _filter_table(text, filt)
        return DockerCommandOut(command=cmd, output=output or "(no images)")

    def ps(self, grep: Optional[str] = None) -> DockerCommandOut:
        filt = (grep or "").strip()
        cmd = 'docker ps | grep "{0}"'.format(filt) if filt else "docker ps"
        code, text = docker_cli.capture(["ps"])
        if code != 0:
            return DockerCommandOut(command=cmd, output=text or "docker ps failed")
        output = _filter_table(text, filt)
        return DockerCommandOut(command=cmd, output=output or "(no containers)")

    def running(self, grep: Optional[str] = None) -> List[RunningServiceOut]:
        filt = (grep or "").strip().lower()
        code, text = docker_cli.capture(
            ["ps", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"]
        )
        if code != 0 or not text.strip():
            return []
        rows: List[RunningServiceOut] = []
        for line in text.splitlines():
            parts = line.split("\t")
            if len(parts) < 4:
                continue
            name, image, status, ports = parts[0], parts[1], parts[2], parts[3]
            hay = " ".join([name, image, status, ports]).lower()
            if filt and filt not in hay:
                continue
            parsed = parse_published_ports(ports)
            host_port = parsed[0] if parsed else 0
            container_port = parsed[1] if parsed else 0
            url = ""
            if host_port:
                url = "http://{0}:{1}".format(self.settings.docker_host, host_port)
            rows.append(
                RunningServiceOut(
                    name=name,
                    image=image,
                    host_port=host_port,
                    container_port=container_port,
                    url=url,
                    status=status,
                )
            )
        return rows


def parse_published_ports(ports_field: str):
    match = _PORT_RE.search(ports_field or "")
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def _filter_table(text: str, grep: str) -> str:
    lines = [ln for ln in (text or "").splitlines() if ln.strip()]
    if not lines:
        return ""
    if not grep:
        return "\n".join(lines)
    needle = grep.lower()
    header = lines[0]
    body = [ln for ln in lines[1:] if needle in ln.lower()]
    if not body:
        return header + "\n(no matches)"
    return "\n".join([header] + body)
