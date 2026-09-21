from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("ISKELE_DATABASE_PATH", str(db_path))
    monkeypatch.setenv("ISKELE_JWT_SECRET", "test-secret")
    monkeypatch.setenv("ISKELE_ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ISKELE_ADMIN_PASSWORD", "admin")
    monkeypatch.setenv("ISKELE_SEED_TESTER", "true")
    monkeypatch.setenv("ISKELE_SEED_TESTER_USERNAME", "testci")
    monkeypatch.setenv("ISKELE_SEED_TESTER_PASSWORD", "testci")
    monkeypatch.setenv("ISKELE_JOBS_AUTORUN", "true")
    monkeypatch.setenv("ISKELE_DOCKER_HOST", "localhost")

    from app.config import clear_settings_cache
    from app.services.jobs import clear_jobs

    clear_settings_cache()
    clear_jobs()

    # Import app after env is set
    from app.main import app
    from app.services.users import ensure_seed_users
    from app.config import get_settings

    ensure_seed_users(get_settings())

    with TestClient(app) as test_client:
        yield test_client

    clear_jobs()
    clear_settings_cache()


@pytest.fixture
def admin_headers(client: TestClient):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": "Bearer {0}".format(token)}


@pytest.fixture
def auth_headers(client: TestClient):
    res = client.post("/api/auth/login", json={"username": "testci", "password": "testci"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": "Bearer {0}".format(token)}
