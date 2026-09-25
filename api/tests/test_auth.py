def test_login_ok(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200
    body = res.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"
    assert body["access_token"]


def test_login_bad_password(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401


def test_repos_requires_auth(client):
    res = client.get("/api/repos")
    assert res.status_code == 401


def test_repos_with_token(client, auth_headers):
    res = client.get("/api/repos", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_me(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["role"] == "user"


def test_user_cannot_create_user(client, auth_headers):
    res = client.post(
        "/api/users",
        headers=auth_headers,
        json={
            "username": "hacker",
            "password": "hack",
            "display_name": "Hacker",
            "role": "user",
        },
    )
    assert res.status_code == 403


def test_admin_can_create_and_list_users(client, admin_headers):
    created = client.post(
        "/api/users",
        headers=admin_headers,
        json={
            "username": "builder",
            "password": "secret",
            "display_name": "Builder",
            "role": "user",
        },
    )
    assert created.status_code == 201
    assert created.json()["username"] == "builder"
    assert created.json()["role"] == "user"

    listed = client.get("/api/users", headers=admin_headers)
    assert listed.status_code == 200
    names = {u["username"] for u in listed.json()}
    assert "admin" in names
    assert "builder" in names

    login = client.post(
        "/api/auth/login",
        json={"username": "builder", "password": "secret"},
    )
    assert login.status_code == 200


def test_admin_can_edit_user(client, admin_headers):
    created = client.post(
        "/api/users",
        headers=admin_headers,
        json={
            "username": "editme",
            "password": "secret",
            "display_name": "Edit Me",
            "role": "user",
        },
    )
    assert created.status_code == 201
    uid = created.json()["id"]
    patched = client.patch(
        "/api/users/{0}".format(uid),
        headers=admin_headers,
        json={"display_name": "Edited", "role": "user", "password": "newer"},
    )
    assert patched.status_code == 200
    assert patched.json()["display_name"] == "Edited"
    login = client.post("/api/auth/login", json={"username": "editme", "password": "newer"})
    assert login.status_code == 200


def test_admin_cannot_delete_last_admin(client, admin_headers):
    users = client.get("/api/users", headers=admin_headers).json()
    admin = next(u for u in users if u["username"] == "admin")
    res = client.delete("/api/users/{0}".format(admin["id"]), headers=admin_headers)
    assert res.status_code == 400


def test_no_public_signup(client):
    res = client.post(
        "/api/auth/register",
        json={"username": "x", "password": "y"},
    )
    assert res.status_code in (404, 405, 422)
