from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_API_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="ISKELE_",
        extra="ignore",
    )

    git_base_url: str = ""
    git_token: str = ""
    docker_host: str = "localhost"
    host: str = "127.0.0.1"
    port: int = 8000
    jobs_autorun: bool = True

    # Persistent volume (checkouts, artifacts). DB may live here too.
    data_dir: str = str(_API_DIR / "data")

    # Auth / users
    database_path: str = str(_API_DIR / "data" / "iskele.db")
    jwt_secret: str = "change-me-in-production"
    jwt_expire_hours: int = 12
    admin_username: str = "admin"
    admin_password: str = "admin"
    admin_display_name: str = "Admin"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
