from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "git_configured": bool(settings.git_base_url.strip()),
        "docker_host": settings.docker_host,
    }
