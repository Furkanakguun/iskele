from __future__ import annotations

import re
from typing import List, Optional

from app.config import Settings
from app.models.schemas import DockerCommandOut, RunningServiceOut

_PS_ROWS = [
    {
        "id": "a1b2c3d4e5f6",
        "image": "nimbus-catalog:2.3.1",
        "status": "Up 2 hours",
        "ports": "0.0.0.0:31080->8080/tcp",
        "name": "nimbus-catalog",
        "host_port": 31080,
        "container_port": 8080,
    },
    {
        "id": "b2c3d4e5f6a7",
        "image": "nimbus-cart:2.3.1",
        "status": "Up 3 hours",
        "ports": "0.0.0.0:31081->8081/tcp",
        "name": "nimbus-cart",
        "host_port": 31081,
        "container_port": 8081,
    },
    {
        "id": "c3d4e5f6a7b8",
        "image": "nimbus-identity:2.3.1",
        "status": "Up 1 day",
        "ports": "0.0.0.0:31085->8085/tcp",
        "name": "nimbus-identity",
        "host_port": 31085,
        "container_port": 8085,
    },
    {
        "id": "d4e5f6a7b8c9",
        "image": "nimbus-storefront:2.3.1",
        "status": "Up 5 hours",
        "ports": "0.0.0.0:31443->443/tcp",
        "name": "nimbus-storefront",
        "host_port": 31443,
        "container_port": 443,
    },
]


class DockerHost:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def images(self, grep: Optional[str] = None) -> DockerCommandOut:
        filt = (grep or "").strip()
        cmd = 'docker images | grep "{0}"'.format(filt) if filt else "docker images"
        header = (
            "REPOSITORY                                          TAG              "
            "IMAGE ID       CREATED        SIZE"
        )
        rows = [
            "nimbus-catalog                                      2.3.1-e7c41a9     "
            "a1b2c3d4e5f6   2 hours ago    412MB",
            "nimbus-cart                                         2.3.1-e7c41a9     "
            "b2c3d4e5f6a7   3 hours ago    398MB",
            "nimbus-identity                                     2.3.1-e7c41a9     "
            "c3d4e5f6a7b8   1 day ago      365MB",
        ]
        if filt:
            rows = [r for r in rows if filt.lower() in r.lower()]
        body = "\n".join([header] + rows) if rows else header + "\n(no matching images)"
        return DockerCommandOut(command=cmd, output=body)

    def ps(self, grep: Optional[str] = None) -> DockerCommandOut:
        filt = (grep or "").strip().lower()
        cmd = 'docker ps | grep "{0}"'.format(grep.strip()) if (grep or "").strip() else "docker ps"
        header = (
            "CONTAINER ID   IMAGE                    STATUS        "
            "PORTS                     NAMES"
        )
        lines = []
        for row in _PS_ROWS:
            line = "{0}   {1}     {2}    {3}   {4}".format(
                row["id"],
                row["image"].ljust(22),
                row["status"].ljust(12),
                row["ports"].ljust(25),
                row["name"],
            )
            if not filt or filt in line.lower():
                lines.append(line)
        body = "\n".join([header] + lines) if lines else header + "\n(no matching containers)"
        return DockerCommandOut(command=cmd, output=body)

    def running(self, grep: Optional[str] = None) -> List[RunningServiceOut]:
        filt = (grep or "").strip().lower()
        host = self.settings.docker_host or "localhost"
        out: List[RunningServiceOut] = []
        for row in _PS_ROWS:
            blob = "{0} {1}".format(row["name"], row["image"]).lower()
            if filt and filt not in blob:
                continue
            scheme = "https" if row["container_port"] in (443, 8443) else "http"
            out.append(
                RunningServiceOut(
                    name=row["name"],
                    image=row["image"],
                    host_port=row["host_port"],
                    container_port=row["container_port"],
                    url="{0}://{1}:{2}".format(scheme, host, row["host_port"]),
                    status=row["status"],
                )
            )
        return out


_PORT_RE = re.compile(r"0\.0\.0\.0:(\d+)->(\d+)/tcp")


def parse_published_ports(ports_field: str):
    match = _PORT_RE.search(ports_field or "")
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))
