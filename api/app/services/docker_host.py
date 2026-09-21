from __future__ import annotations

from typing import Optional

from app.config import Settings
from app.models.schemas import DockerCommandOut


class DockerHost:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def images(self, grep: Optional[str] = None) -> DockerCommandOut:
        filt = (grep or "").strip()
        cmd = f'docker images | grep "{filt}"' if filt else "docker images"
        header = (
            "REPOSITORY                                          TAG              "
            "IMAGE ID       CREATED        SIZE"
        )
        rows = [
            "nimbus-catalog                                      2.3.1-e7c41a9     "
            "a1b2c3d4e5f6   2 hours ago    412MB",
            "nimbus-cart                                         2.3.1-e7c41a9     "
            "b2c3d4e5f6a7   3 hours ago    398MB",
        ]
        if filt:
            rows = [r for r in rows if filt.lower() in r.lower()]
        body = "\n".join([header, *rows]) if rows else f"{header}\n(no matching images)"
        return DockerCommandOut(command=cmd, output=body)

    def ps(self, grep: Optional[str] = None) -> DockerCommandOut:
        filt = (grep or "").strip()
        cmd = f'docker ps | grep "{filt}"' if filt else "docker ps"
        header = (
            "CONTAINER ID   IMAGE                    STATUS        "
            "PORTS                     NAMES"
        )
        rows = [
            "a1b2c3d4e5f6   nimbus-catalog:2.3.1     Up 2 hours    "
            "0.0.0.0:31080->8080/tcp   nimbus-catalog",
            "b2c3d4e5f6a7   nimbus-cart:2.3.1        Up 3 hours    "
            "0.0.0.0:31081->8081/tcp   nimbus-cart",
        ]
        if filt:
            rows = [r for r in rows if filt.lower() in r.lower()]
        body = (
            "\n".join([header, *rows])
            if rows
            else f"{header}\n(no matching containers)"
        )
        return DockerCommandOut(command=cmd, output=body)
