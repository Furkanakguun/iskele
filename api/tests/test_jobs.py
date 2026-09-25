import time


def wait_for_job(client, headers, job_id, timeout=8.0):
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


def test_build_success_has_log(client, auth_headers, sample_module):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": sample_module,
            "branch": "main",
            "module_id": "mod-api",
            "action": "build",
            "image": "sample-api",
            "tag": "1.0.0",
        },
    )
    assert res.status_code == 200
    created = res.json()
    job = wait_for_job(client, auth_headers, created["id"])
    assert job["status"] == "success"
    assert job["error"] is None
    assert any("docker build" in line for line in job["lines"])
    assert job["finished_at"] is not None

    got = client.get("/api/jobs/{0}".format(job["id"]), headers=auth_headers)
    assert got.status_code == 200
    assert got.json()["id"] == job["id"]


def test_load_archive_missing_file(client, auth_headers):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "action": "load",
            "archive_path": "D:/missing/base-image.tar.gz",
        },
    )
    assert res.status_code == 200
    job = wait_for_job(client, auth_headers, res.json()["id"])
    assert job["status"] == "failed"
    assert "not found" in (job["error"] or "").lower()


def test_load_archive_ok(client, auth_headers, tmp_path):
    archive = tmp_path / "base-image.tar.gz"
    archive.write_bytes(b"fake-image")
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "action": "load",
            "archive_path": str(archive),
        },
    )
    assert res.status_code == 200
    job = wait_for_job(client, auth_headers, res.json()["id"])
    assert job["status"] == "success"
    assert any("docker load" in line for line in job["lines"])
    assert job["archive_path"] == str(archive)


def test_save_image_writes_archive(client, auth_headers, tmp_path):
    dest = tmp_path / "out.tar.gz"
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "action": "save",
            "image": "alpine",
            "tag": "3.20",
            "archive_path": str(dest),
        },
    )
    assert res.status_code == 200
    job = wait_for_job(client, auth_headers, res.json()["id"])
    assert job["status"] == "success"
    assert dest.is_file()
    assert any("docker save" in line for line in job["lines"])


def test_prune_dangling_ok(client, auth_headers):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={"action": "prune-dangling"},
    )
    assert res.status_code == 200
    job = wait_for_job(client, auth_headers, res.json()["id"])
    assert job["status"] == "success"
    assert any("image prune" in line for line in job["lines"])


def test_load_without_artifact_fails(client, auth_headers, sample_module):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": sample_module,
            "branch": "main",
            "module_id": "mod-api",
            "action": "load",
        },
    )
    assert res.status_code == 200
    job = wait_for_job(client, auth_headers, res.json()["id"])
    assert job["status"] == "failed"
    assert "artifact" in (job["error"] or "").lower()


def test_unknown_module_fails(client, auth_headers, sample_module):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": sample_module,
            "branch": "main",
            "module_id": "mod-missing",
            "action": "build",
        },
    )
    assert res.status_code == 200
    job = wait_for_job(client, auth_headers, res.json()["id"])
    assert job["status"] == "failed"
    assert "not found" in (job["error"] or "").lower()


def test_activity_includes_jobs(client, auth_headers, sample_module):
    created = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": sample_module,
            "branch": "main",
            "module_id": "mod-api",
            "action": "tar",
            "tag": "1.0.0",
        },
    )
    wait_for_job(client, auth_headers, created.json()["id"])
    res = client.get("/api/activity", headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["tone"] in ("ok", "fail", "info")
