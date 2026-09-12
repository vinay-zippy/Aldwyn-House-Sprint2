from tests.factories import make_amenity, make_property_guest_plan


def test_amenity_recommendations_returns_matches(client, db_session, preferences_store):
    property_, guest, _ = make_property_guest_plan(db_session)
    make_amenity(
        db_session,
        property_id=property_.id,
        name="Serenity Spa",
        category="spa",
        tags=["wellness", "massage"],
    )
    db_session.commit()
    preferences_store[guest.id] = {
        "guest_id": guest.id,
        "name": "Private Guest",
        "email": "private@example.com",
        "phone": "+1-555-0100",
        "reservation_id": "reservation-private",
        "notes": [{"value": "wellness", "priority": "high"}],
    }

    response = client.get(f"/api/v1/guests/{guest.id}/amenity-recommendations")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["amenity"]["name"] == "Serenity Spa"
    assert body[0]["status"] == "pending_staff_review"


def test_amenity_recommendations_empty_when_no_match(client, db_session, preferences_store):
    _, guest, _ = make_property_guest_plan(db_session)
    preferences_store[guest.id] = {"guest_id": guest.id, "notes": ["opera"]}

    response = client.get(f"/api/v1/guests/{guest.id}/amenity-recommendations")

    assert response.status_code == 200
    assert response.json() == []


def test_amenity_recommendations_exclude_inactive_catalogue_entries(
    client, db_session, preferences_store
):
    property_, guest, _ = make_property_guest_plan(db_session)
    make_amenity(
        db_session,
        property_id=property_.id,
        name="Closed Spa",
        category="spa",
        tags=["wellness"],
        is_active=False,
    )
    db_session.commit()
    preferences_store[guest.id] = {"guest_id": guest.id, "notes": ["wellness"]}

    response = client.get(f"/api/v1/guests/{guest.id}/amenity-recommendations")

    assert response.status_code == 200
    assert response.json() == []


def test_amenity_recommendations_unknown_guest_returns_404(client):
    response = client.get("/api/v1/guests/does-not-exist/amenity-recommendations")

    assert response.status_code == 404
