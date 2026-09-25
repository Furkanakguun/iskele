from app.models.schemas import JobCreate
from app.services.executor import execute_action


def test_unknown_module_fails_without_seed():
    status, lines, error = execute_action(
        JobCreate(
            repo_id="repo-missing",
            branch="main",
            module_id="mod-x",
            action="push",
            image="x",
            tag="1",
            remote="registry.local",
        )
    )
    assert status == "failed"
    assert error
    assert "not found" in error.lower()
