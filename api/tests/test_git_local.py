from pathlib import Path

from app.services import git_local


def _init_repo(root: Path, branches=None):
    branches = branches or ["main"]
    git_local._run_git(["init", str(root)])
    git_local._run_git(["config", "user.email", "dev@example.com"], cwd=root)
    git_local._run_git(["config", "user.name", "Dev"], cwd=root)
    (root / "services" / "api").mkdir(parents=True)
    (root / "services" / "api" / "Dockerfile").write_text(
        "FROM alpine:3.20\nEXPOSE 8080\n", encoding="utf-8"
    )
    git_local._run_git(["add", "."], cwd=root)
    git_local._run_git(["commit", "-m", "initial"], cwd=root)
    git_local._run_git(["branch", "-m", "main"], cwd=root)
    for name in branches:
        if name == "main":
            continue
        git_local._run_git(["checkout", "-b", name], cwd=root)
    git_local._run_git(["checkout", "main"], cwd=root)
    return root


def test_discover_and_checkout(tmp_path, monkeypatch):
    src = _init_repo(tmp_path / "src", branches=["main", "development"])
    data_dir = tmp_path / "iskele-data"
    data_dir.mkdir()

    info = git_local.discover_from_source(str(src))
    names = {b["name"] for b in info["branches"]}
    assert "main" in names
    assert "development" in names
    assert info["default_branch"] == "main"

    dest = git_local.ensure_checkout(
        str(src), "repo-demo", "development", data_dir=str(data_dir)
    )
    assert (dest / ".git").exists()
    assert (dest / ".iskele-branch").read_text(encoding="utf-8") == "development"

    mods = git_local.scan_modules(dest)
    assert len(mods) == 1
    assert mods[0].path == "services/api"
    assert mods[0].base_image == "alpine:3.20"
    assert mods[0].expose == "8080"
    assert "node_modules" not in mods[0].path


def test_ls_remote_heads(tmp_path):
    src = _init_repo(tmp_path / "src", branches=["main", "development"])
    rows = git_local.list_branches_from_ls_remote(str(src))
    names = {b.name for b in rows}
    assert "main" in names
    assert "development" in names
