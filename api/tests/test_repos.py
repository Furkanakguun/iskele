def test_list_branches_and_modules(client, auth_headers):
    branches = client.get("/api/repos/repo-nimbus-cart/branches", headers=auth_headers)
    assert branches.status_code == 200
    assert any(b["name"] == "development" for b in branches.json())

    modules = client.get(
        "/api/repos/repo-nimbus-cart/modules",
        params={"branch": "development"},
        headers=auth_headers,
    )
    assert modules.status_code == 200
    ids = {m["id"] for m in modules.json()}
    assert "mod-catalog" in ids
    assert "mod-storefront" in ids


def test_discover_not_found(client, auth_headers):
    res = client.get(
        "/api/repos/discover",
        params={"project_key": "NIMBUS", "slug": "not-found"},
        headers=auth_headers,
    )
    assert res.status_code == 404


def test_discover_ok(client, auth_headers):
    res = client.get(
        "/api/repos/discover",
        params={"project_key": "demo", "slug": "hello-world"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["project_key"] == "DEMO"
    assert body["slug"] == "hello-world"
    assert body["name"] == "Hello World"
