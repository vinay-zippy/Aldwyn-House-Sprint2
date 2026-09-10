from tests.factories import make_guest, make_property_guest_plan


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
        "dietary": [{"value": "vegan", "priority": "high"}],
        "room_preferences": [
            {"value": "quiet floor", "priority": "normal"},
            {"value": "extra pillows"},
        ],
        "notes": [{"value": "VIP - anniversary stay", "priority": None}],
    }

    resp = client.get(f"/api/v1/guests/{guest.id}")
    assert resp.status_code == 200
    assert resp.json()["preferences"] == {
        "dietary": [{"value": "vegan", "priority": "high", "is_high_priority": True}],
        "room_preferences": [
            {"value": "quiet floor", "priority": "normal", "is_high_priority": False},
            {"value": "extra pillows", "priority": None, "is_high_priority": False},
        ],
        "notes": [
            {"value": "VIP - anniversary stay", "priority": None, "is_high_priority": False}
        ],
    }


def test_guest_detail_flags_multiple_high_priority_preferences_independently(
    client, db_session, preferences_store
):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    preferences_store[guest.id] = {
        "guest_id": guest.id,
        "notes": [
            {"value": "Late arrival", "priority": "high"},
            {"value": "Extra towels", "priority": "high"},
            {"value": "Near elevator", "priority": "normal"},
        ],
    }

    notes = client.get(f"/api/v1/guests/{guest.id}").json()["preferences"]["notes"]
    assert [item["is_high_priority"] for item in notes] == [True, True, False]


def test_guest_detail_does_not_show_preferences_for_another_guest(
    client, db_session, preferences_store
):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    other_guest = make_guest(db_session, email="other@example.com")
    db_session.commit()
    preferences_store[other_guest.id] = {
        "guest_id": other_guest.id,
        "notes": [{"value": "Other guest note", "priority": "high"}],
    }

    preferences = client.get(f"/api/v1/guests/{guest.id}").json()["preferences"]
    assert preferences == {"dietary": [], "room_preferences": [], "notes": []}


def test_guest_detail_with_no_high_priority_preferences_has_no_flagged_items(
    client, db_session, preferences_store
):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    preferences_store[guest.id] = {
        "guest_id": guest.id,
        "dietary": [
            {"value": "vegetarian", "priority": "normal"},
            {"value": "No peanuts"},
            {"value": "No shellfish", "priority": None},
        ],
    }

    dietary = client.get(f"/api/v1/guests/{guest.id}").json()["preferences"]["dietary"]
    assert all(item["is_high_priority"] is False for item in dietary)


def test_guest_not_found_returns_404(client, db_session):
    resp = client.get("/api/v1/guests/does-not-exist")
    assert resp.status_code == 404
