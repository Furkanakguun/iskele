from app.services.executor import execute_action
from app.models.schemas import JobCreate


def test_push_success_lines():
    status, lines, error = execute_action(
        JobCreate(
            repo_id="repo-nimbus-cart",
            branch="development",
            module_id="mod-cart",
            action="push",
            image="nimbus-cart",
            tag="2.3.1",
            remote="registry.example.com/nimbus",
        )
    )
    assert status == "success"
    assert error is None
    assert any("Push OK" in line for line in lines)
