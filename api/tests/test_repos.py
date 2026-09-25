def test_list_repos_starts_empty(client, auth_headers):
    res = client.get("/api/repos", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_discover_requires_clone_url(client, auth_headers):
    res = client.get(
        "/api/repos/discover",
        params={"project_key": "LOCAL", "slug": "x"},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_discover_local_git(client, auth_headers, tmp_path):
    from app.services import git_local

    src = tmp_path / "src"
    git_local._run_git(["init", str(src)])
    git_local._run_git(["config", "user.email", "dev@example.com"], cwd=src)
    git_local._run_git(["config", "user.name", "Dev"], cwd=src)
    (src / "Dockerfile").write_text("FROM alpine\n", encoding="utf-8")
    git_local._run_git(["add", "."], cwd=src)
    git_local._run_git(["commit", "-m", "init"], cwd=src)

    res = client.get(
        "/api/repos/discover",
        params={
            "project_key": "LOCAL",
            "slug": "src",
            "clone_url": str(src),
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "src"
    assert len(body["branches"]) >= 1


def test_add_repo_persists_with_owner(client, admin_headers, tmp_path):
    from app.services import git_local

    src = tmp_path / "src"
    git_local._run_git(["init", str(src)])
    git_local._run_git(["config", "user.email", "dev@example.com"], cwd=src)
    git_local._run_git(["config", "user.name", "Dev"], cwd=src)
    (src / "README").write_text("x", encoding="utf-8")
    git_local._run_git(["add", "."], cwd=src)
    git_local._run_git(["commit", "-m", "init"], cwd=src)

    created = client.post(
        "/api/repos",
        headers=admin_headers,
        json={
            "project_key": "LOCAL",
            "slug": "kept",
            "name": "Kept",
            "default_branch": "master",
            "clone_url": str(src),
            "branches": [],
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["created_by_username"] == "admin"
    assert body["clone_url"]

    listed = client.get("/api/repos", headers=admin_headers)
    assert listed.status_code == 200
    ids = {r["id"] for r in listed.json()}
    assert body["id"] in ids
