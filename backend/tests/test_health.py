def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_openapi_metadata_identifies_aldwyn_house(client):
    resp = client.get("/openapi.json")

    assert resp.status_code == 200
    assert resp.json()["info"] == {
        "title": (
            "The Aldwyn House - Sprint 2: Guest 360 Dashboard & "
            "AI-Assisted Preference Matching"
        ),
        "description": (
            "Backend API for The Aldwyn House Sprint 2 Guest 360 Dashboard and "
            "AI-assisted guest preference matching."
        ),
        "version": "0.1.0",
    }
