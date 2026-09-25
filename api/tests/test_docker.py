def test_docker_images_and_ps_empty(client, auth_headers):
    images = client.get("/api/docker/images", headers=auth_headers)
    assert images.status_code == 200
    assert "docker images" in images.json()["command"]

    ps = client.get("/api/docker/ps", headers=auth_headers)
    assert ps.status_code == 200
    assert "docker ps" in ps.json()["command"]


def test_docker_catalog_lists(client, auth_headers):
    res = client.get("/api/docker/catalog", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_docker_running_lists(client, auth_headers):
    res = client.get("/api/docker/running", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_parse_published_ports():
    from app.services.docker_host import parse_published_ports

    assert parse_published_ports("0.0.0.0:31080->8080/tcp") == (31080, 8080)
    assert parse_published_ports("no ports") is None
