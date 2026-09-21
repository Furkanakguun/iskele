def test_health_public(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["auth"] == "jwt"
    assert body["git_configured"] is False
