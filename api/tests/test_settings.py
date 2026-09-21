def test_settings_requires_admin(client, auth_headers):
    res = client.get("/api/settings", headers=auth_headers)
    assert res.status_code == 403


def test_settings_get_and_put(client, admin_headers):
    got = client.get("/api/settings", headers=admin_headers)
    assert got.status_code == 200
    body = got.json()
    assert "git_base_url" in body
    assert body["git_token_set"] is False
    assert body["remote_registry"]
    assert body["image_version"]

    updated = client.put(
        "/api/settings",
        headers=admin_headers,
        json={
            "git_base_url": "https://git.corp.local",
            "git_token": "secret-token",
            "remote_registry": "registry.corp/nimbus",
            "image_version": "9.9.9",
            "docker_host": "jenkins",
            "image_prefix": "nimbus-",
        },
    )
    assert updated.status_code == 200
    out = updated.json()
    assert out["git_base_url"] == "https://git.corp.local"
    assert out["git_token_set"] is True
    assert out["remote_registry"] == "registry.corp/nimbus"
    assert out["image_version"] == "9.9.9"
    assert out["docker_host"] == "jenkins"
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
