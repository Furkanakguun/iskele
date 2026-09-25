def test_settings_requires_auth(client):
    res = client.get("/api/settings")
    assert res.status_code == 401


def test_user_can_read_settings(client, auth_headers):
    res = client.get("/api/settings", headers=auth_headers)
    assert res.status_code == 200
    assert "remote_registry" in res.json()
    assert "data_dir" in res.json()


def test_user_cannot_put_settings(client, auth_headers):
    res = client.put(
        "/api/settings",
        headers=auth_headers,
        json={"image_version": "0.0.1"},
    )
    assert res.status_code == 403


def test_user_can_read_storage(client, auth_headers):
    res = client.get("/api/settings/storage", headers=auth_headers)
    assert res.status_code == 200
    assert "disk_free_bytes" in res.json()


def test_settings_get_and_put(client, admin_headers):
    got = client.get("/api/settings", headers=admin_headers)
    assert got.status_code == 200
    body = got.json()
    assert "git_base_url" in body
    assert body["git_token_set"] is False
    assert "remote_registry" in body
    assert body["image_version"]
    assert body["data_dir"]

    updated = client.put(
        "/api/settings",
        headers=admin_headers,
        json={
            "git_base_url": "https://git.corp.local",
            "git_token": "secret-token",
            "remote_registry": "registry.example.com/app",
            "image_version": "9.9.9",
            "docker_host": "builder",
            "image_prefix": "app-",
        },
    )
    assert updated.status_code == 200
    out = updated.json()
    assert out["git_base_url"] == "https://git.corp.local"
    assert out["git_token_set"] is True
    assert out["remote_registry"] == "registry.example.com/app"
    assert out["image_version"] == "9.9.9"
    assert out["docker_host"] == "builder"
    assert "git_token" not in out

    # empty token keeps existing
    keep = client.put(
        "/api/settings",
        headers=admin_headers,
        json={"git_token": "", "image_version": "9.9.10"},
    )
    assert keep.status_code == 200
    assert keep.json()["git_token_set"] is True
    assert keep.json()["image_version"] == "9.9.10"


def test_storage_report(client, admin_headers):
    res = client.get("/api/settings/storage", headers=admin_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["disk_total_bytes"] > 0
    assert body["disk_free_bytes"] >= 0
    assert "iskele_bytes" in body
    assert "checkouts" in body
    assert "images" in body
    assert body["images_total_bytes"] >= 0
    assert body["checkouts_demo"] is False

    # Create a real checkout folder and re-query
    data_dir = body["data_dir"]
    from pathlib import Path

    branch = Path(data_dir) / "repos" / "repo-demo" / "development"
    branch.mkdir(parents=True, exist_ok=True)
    (branch / ".iskele-branch").write_text("development", encoding="utf-8")
    (branch / "file.bin").write_bytes(b"x" * 4096)

    again = client.get("/api/settings/storage", headers=admin_headers)
    assert again.status_code == 200
    again_body = again.json()
    assert again_body["checkouts_demo"] is False
    assert again_body["repos_bytes"] >= 4096
    assert any(c["branch"] == "development" for c in again_body["checkouts"])
