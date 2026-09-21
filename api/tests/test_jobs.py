def test_build_success_has_log(client, auth_headers):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": "repo-nimbus-cart",
            "branch": "development",
            "module_id": "mod-catalog",
            "action": "build",
            "image": "nimbus-catalog",
            "tag": "2.3.1",
        },
    )
    assert res.status_code == 200
    job = res.json()
    assert job["status"] == "success"
    assert job["error"] is None
    assert any("Build OK" in line for line in job["lines"])
    assert job["finished_at"] is not None

    got = client.get("/api/jobs/{0}".format(job["id"]), headers=auth_headers)
    assert got.status_code == 200
    assert got.json()["id"] == job["id"]


def test_build_storefront_fails_with_clear_error(client, auth_headers):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": "repo-nimbus-cart",
            "branch": "development",
            "module_id": "mod-storefront",
            "action": "build",
        },
    )
    assert res.status_code == 200
    job = res.json()
    assert job["status"] == "failed"
    assert "dist/" in (job["error"] or "")
    assert any("ERROR:" in line for line in job["lines"])
    assert any("FAILED:" in line for line in job["lines"])


def test_load_without_artifact_fails(client, auth_headers):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": "repo-nimbus-cart",
            "branch": "development",
            "module_id": "mod-checkout",
            "action": "load",
        },
    )
    assert res.status_code == 200
    job = res.json()
    assert job["status"] == "failed"
    assert "artifact" in (job["error"] or "").lower()


def test_unknown_module_fails(client, auth_headers):
    res = client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": "repo-nimbus-cart",
            "branch": "development",
            "module_id": "mod-missing",
            "action": "build",
        },
    )
    assert res.status_code == 200
    job = res.json()
    assert job["status"] == "failed"
    assert "not found" in (job["error"] or "").lower()


def test_activity_includes_jobs(client, auth_headers):
    client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "repo_id": "repo-nimbus-cart",
            "branch": "development",
            "module_id": "mod-catalog",
            "action": "tar",
            "tag": "1.0.0",
        },
    )
    res = client.get("/api/activity", headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["tone"] in ("ok", "fail", "info")
