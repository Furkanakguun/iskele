from fastapi import APIRouter

from app.config import get_settings
from app.services import docker_cli

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    docker_ok, docker_detail = docker_cli.probe()
    return {
        "status": "ok",
        "git_configured": bool(settings.git_base_url.strip()),
        "docker_host": settings.docker_host,
        "docker_ok": docker_ok,
        "docker_detail": docker_detail,
        "auth": "jwt",
    }
