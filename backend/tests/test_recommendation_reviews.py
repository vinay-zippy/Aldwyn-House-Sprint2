from tests.factories import make_amenity, make_property_guest_plan


def test_staff_can_persist_recommendation_review(client, db_session):
    property_, guest, _ = make_property_guest_plan(db_session)
    amenity = make_amenity(db_session, property_id=property_.id)
    db_session.commit()

    response = client.post(
        f"/api/v1/guests/{guest.id}/amenity-recommendations/{amenity.id}/review",
        json={"status": "approved"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["guest_id"] == guest.id


def test_staff_review_rejects_unknown_amenity(client, db_session):
    _, guest, _ = make_property_guest_plan(db_session)

    response = client.post(
        f"/api/v1/guests/{guest.id}/amenity-recommendations/missing/review",
        json={"status": "rejected"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Amenity not found"
