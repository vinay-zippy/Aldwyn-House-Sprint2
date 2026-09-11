from pymongo.errors import PyMongoError

from app.main import app
from app.mongo import get_preferences_collection
from tests.factories import make_concierge_request, make_guest, make_property_guest_plan


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


def test_guest_preferences_returns_past_requests_without_pii(client, db_session, preferences_store):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    make_concierge_request(db_session, guest)
    preferences_store[guest.id] = {
        "guest_id": guest.id,
        "dietary": ["vegetarian"],
        "room_preferences": ["high floor"],
    }

    response = client.get(f"/api/v1/guests/{guest.id}/preferences")

    assert response.status_code == 200
    assert response.json() == {
        "dietary_preferences": ["vegetarian"],
        "room_preferences": ["high floor"],
        "past_requests": [{"request": "Extra pillows", "status": "completed"}],
    }
    assert "email" not in response.json()
    assert "phone" not in response.json()


def test_guest_preferences_do_not_return_another_guests_profile(
    client, db_session, preferences_store
):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)
    other_guest = make_guest(db_session, email="other@example.com")
    db_session.commit()
    preferences_store[other_guest.id] = {
        "guest_id": other_guest.id,
        "dietary": ["gluten-free"],
    }

    response = client.get(f"/api/v1/guests/{guest.id}/preferences")

    assert response.status_code == 200
    assert response.json() == {
        "dietary_preferences": [],
        "room_preferences": [],
        "past_requests": [],
    }


def test_guest_preferences_without_saved_data_returns_empty_state(client, db_session):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)

    response = client.get(f"/api/v1/guests/{guest.id}/preferences")

    assert response.status_code == 200
    assert response.json() == {
        "dietary_preferences": [],
        "room_preferences": [],
        "past_requests": [],
    }


def test_guest_preferences_returns_503_when_mongo_lookup_fails(client, db_session):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)

    class FailingPreferencesCollection:
        def find_one(self, query):
            raise PyMongoError("MongoDB unavailable")

    app.dependency_overrides[get_preferences_collection] = lambda: FailingPreferencesCollection()

    response = client.get(f"/api/v1/guests/{guest.id}/preferences")

    assert response.status_code == 503
    assert response.json() == {"detail": "Preference store unavailable"}
