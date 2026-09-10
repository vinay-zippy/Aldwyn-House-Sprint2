from datetime import date, timedelta

from app import models
from tests.factories import make_concierge_request, make_property_guest_plan, make_reservation


def test_create_and_fetch_reservation(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)

    payload = {
        "guest_id": guest.id,
        "property_id": property_.id,
        "rate_plan_id": rate_plan.id,
        "check_in": str(date.today() + timedelta(days=1)),
        "check_out": str(date.today() + timedelta(days=3)),
    }
    create_resp = client.post("/api/v1/reservations", json=payload)
    assert create_resp.status_code == 201
    reservation_id = create_resp.json()["id"]

    list_resp = client.get("/api/v1/reservations", params={"property_id": property_.id})
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    detail_resp = client.get(f"/api/v1/reservations/{reservation_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["guest"]["email"] == "test@example.com"


def test_create_reservation_unknown_guest_returns_400(client, db_session):
    property_, _guest, rate_plan = make_property_guest_plan(db_session)
    payload = {
        "guest_id": "does-not-exist",
        "property_id": property_.id,
        "rate_plan_id": rate_plan.id,
        "check_in": str(date.today() + timedelta(days=1)),
        "check_out": str(date.today() + timedelta(days=3)),
    }
    resp = client.post("/api/v1/reservations", json=payload)
    assert resp.status_code == 400


def test_get_reservation_not_found_returns_404(client, db_session):
    resp = client.get("/api/v1/reservations/does-not-exist")
    assert resp.status_code == 404


def test_reservation_guest_preferences_use_reservation_guest(client, db_session, preferences_store):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    reservation = make_reservation(db_session, guest, property_, rate_plan)
    make_concierge_request(db_session, guest)
    db_session.commit()
    preferences_store[guest.id] = {"guest_id": guest.id, "dietary": ["vegetarian"]}

    response = client.get(f"/api/v1/reservations/{reservation.id}/guest-preferences")

    assert response.status_code == 200
    assert response.json()["dietary_preferences"] == ["vegetarian"]
    assert response.json()["past_requests"] == [
        {"request": "Extra pillows", "status": "completed"}
    ]


def test_list_reservations_filters_by_status(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    make_reservation(
        db_session, guest, property_, rate_plan, status=models.ReservationStatus.confirmed
    )
    make_reservation(
        db_session, guest, property_, rate_plan, status=models.ReservationStatus.cancelled
    )
    db_session.commit()

    resp = client.get(
        "/api/v1/reservations",
        params={"property_id": property_.id, "status": "cancelled"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["status"] == "cancelled"


def test_list_reservations_filters_by_date_range(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    near = make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
    )
    make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() + timedelta(days=30),
        check_out=date.today() + timedelta(days=33),
    )
    db_session.commit()

    resp = client.get(
        "/api/v1/reservations",
        params={
            "property_id": property_.id,
            "date_from": str(date.today()),
            "date_to": str(date.today() + timedelta(days=5)),
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert [r["id"] for r in body] == [near.id]
