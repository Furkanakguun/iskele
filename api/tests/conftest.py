from __future__ import annotations

import os
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def wait_for_job(client: TestClient, headers: dict, job_id: str, timeout: float = 8.0):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        res = client.get("/api/jobs/{0}".format(job_id), headers=headers)
        assert res.status_code == 200
        last = res.json()
        if last["status"] in ("success", "failed"):
            return last
        time.sleep(0.05)
    raise AssertionError("job {0} did not finish: {1}".format(job_id, last))


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test.db"
    data_dir = tmp_path / "iskele-data"
    monkeypatch.setenv("ISKELE_DATABASE_PATH", str(db_path))
    monkeypatch.setenv("ISKELE_DATA_DIR", str(data_dir))
    monkeypatch.setenv("ISKELE_JWT_SECRET", "test-secret")
    monkeypatch.setenv("ISKELE_ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ISKELE_ADMIN_PASSWORD", "admin")
    monkeypatch.setenv("ISKELE_JOBS_AUTORUN", "true")
    monkeypatch.setenv("ISKELE_DOCKER_HOST", "localhost")

    from app.config import clear_settings_cache
    from app.services.jobs import clear_jobs

    clear_settings_cache()

    from app.data import demo

    demo.REPOS[:] = []
    demo.BRANCHES.clear()
    demo.MODULES.clear()
    demo.CLONE_URLS.clear()
    demo.JOBS.clear()

    def fake_probe():
        return True, "ok"

    def fake_stream(args, cwd=None, on_line=None, timeout=None):
        argv = [str(a) for a in args]
        if on_line:
            on_line("$ docker {0}".format(" ".join(argv)))
        if argv and argv[0] == "save" and "-o" in argv:
            Path(argv[argv.index("-o") + 1]).write_bytes(b"fake-tar")
        return 0

    def fake_capture(args, timeout=30):
        argv = [str(a) for a in args]
        if argv[:1] == ["images"]:
            return 0, "REPOSITORY          TAG       IMAGE ID       CREATED        SIZE"
        if argv[:1] == ["ps"]:
            return 0, "CONTAINER ID   IMAGE     STATUS    PORTS     NAMES"
        return 0, ""

    monkeypatch.setattr("app.services.docker_cli.probe", fake_probe)
    monkeypatch.setattr("app.services.docker_cli.stream", fake_stream)
    monkeypatch.setattr("app.services.docker_cli.capture", fake_capture)

    # Import app after env is set
    from app.main import app
    from app.services.users import ensure_seed_users
    from app.config import get_settings

    ensure_seed_users(get_settings())
    clear_jobs()

    with TestClient(app) as test_client:
        yield test_client

    clear_jobs()
    clear_settings_cache()


@pytest.fixture
def sample_module(client: TestClient):
    from app.data import demo
    from app.models.schemas import BranchOut, ModuleOut, RepoOut

    demo.REPOS[:] = [
        RepoOut(
            id="repo-sample",
            project_key="LOCAL",
            slug="sample",
            name="Sample",
            description="Test fixture repo",
            default_branch="main",
        )
    ]
    demo.BRANCHES["repo-sample"] = [
        BranchOut(
            name="main",
            short_sha="abc1234",
            commit_message="init",
            updated_at="2026-09-21T00:00:00Z",
            dockerfile_count=1,
        )
    ]
    demo.MODULES["repo-sample:main"] = [
        ModuleOut(
            id="mod-api",
            name="api",
            path="services/api",
            dockerfile="Dockerfile",
            base_image="alpine:3.20",
            expose="8080",
            image_name="sample-api",
            status="idle",
        )
    ]
    dest = Path(os.environ["ISKELE_DATA_DIR"]) / "repos" / "repo-sample" / "main" / "services" / "api"
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "Dockerfile").write_text(
        'FROM alpine:3.20\nCMD ["true"]\n',
        encoding="utf-8",
    )
    return "repo-sample"


@pytest.fixture
def admin_headers(client: TestClient):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": "Bearer {0}".format(token)}


@pytest.fixture
def auth_headers(client: TestClient, admin_headers):
    created = client.post(
        "/api/users",
        headers=admin_headers,
        json={
            "username": "alice",
            "password": "secret",
            "display_name": "Alice",
            "role": "user",
        },
    )
    assert created.status_code == 201
    res = client.post("/api/auth/login", json={"username": "alice", "password": "secret"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": "Bearer {0}".format(token)}
