from tests.factories import make_property_guest_plan


def test_guest_detail_with_no_preferences_saved(client, db_session):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    resp = client.get(f"/api/v1/guests/{guest.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "test@example.com"
    assert body["preferences"] == {"dietary": [], "room_preferences": [], "notes": []}


def test_guest_detail_returns_seeded_preferences(client, db_session, preferences_store):
    """Guest endpoint must merge the Postgres profile with the Mongo preference
    document (Section 2.3: 'Retrieve guest profile + preference document (Mongo)')."""
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    preferences_store[guest.id] = {
        "guest_id": guest.id,
        "dietary": ["vegan"],
        "room_preferences": ["quiet floor", "extra pillows"],
        "notes": ["VIP - anniversary stay"],
    }

    resp = client.get(f"/api/v1/guests/{guest.id}")
    assert resp.status_code == 200
    assert resp.json()["preferences"] == {
        "dietary": ["vegan"],
        "room_preferences": ["quiet floor", "extra pillows"],
        "notes": ["VIP - anniversary stay"],
    }


def test_guest_not_found_returns_404(client, db_session):
    resp = client.get("/api/v1/guests/does-not-exist")
    assert resp.status_code == 404
