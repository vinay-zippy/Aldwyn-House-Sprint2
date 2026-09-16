from datetime import date, timedelta

from app import models
from tests.factories import make_property_guest_plan


def _room(db_session, number="101", status=models.RoomStatus.ready):
    room = models.Room(room_number=number, floor="1", status=status, room_type="standard")
    db_session.add(room)
    db_session.commit()
    return room


def _payload(property_id, **overrides):
    payload = {
        "name": "Walk-in Guest",
        "email": "walkin@example.com",
        "phone": "555-0100",
        "id_type": "passport",
        "id_number": "P-100",
        "check_in": str(date.today() + timedelta(days=1)),
        "check_out": str(date.today() + timedelta(days=3)),
        "number_of_guests": 1,
        "room_number": "101",
    }
    payload.update(overrides)
    return payload


def test_walk_in_creates_guest_and_reservation(client, db_session, preferences_store):
    property_, _guest, _rate_plan = make_property_guest_plan(db_session)
    _room(db_session)

    response = client.post("/api/v1/walk-ins", json=_payload(property_.id))

    assert response.status_code == 201
    body = response.json()
    assert body["guest"]["guest_code"] == "G-0002"
    assert body["reservation"]["room_number"] == "101"
    assert db_session.query(models.Guest).count() == 2
    assert db_session.query(models.Reservation).count() == 1


def test_walk_in_reuses_matching_guest_and_rejects_conflicting_room(
    client, db_session, preferences_store
):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    _room(db_session)
    existing = models.Reservation(
        guest_id=guest.id,
        property_id=property_.id,
        rate_plan_id=rate_plan.id,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
        room_number="101",
        status=models.ReservationStatus.confirmed,
    )
    db_session.add(existing)
    db_session.commit()

    response = client.post(
        "/api/v1/walk-ins",
        json=_payload(
            property_.id,
            name=guest.name,
            email=guest.email,
            phone="555-0100",
            room_number="101",
        ),
    )

    assert response.status_code == 400
    assert "no longer available" in response.json()["detail"]
    assert db_session.query(models.Guest).count() == 1


def test_available_rooms_excludes_non_ready_rooms(client, db_session):
    property_, _guest, _rate_plan = make_property_guest_plan(db_session)
    _room(db_session, "101", models.RoomStatus.ready)
    _room(db_session, "102", models.RoomStatus.occupied)
    _room(db_session, "103", models.RoomStatus.dirty)
    _room(db_session, "104", models.RoomStatus.maintenance)

    response = client.get(
        "/api/v1/walk-ins/available-rooms",
        params={
            "check_in": str(date.today()),
            "check_out": str(date.today() + timedelta(days=2)),
        },
    )

    assert response.status_code == 200
    assert [room["room_number"] for room in response.json()] == ["101"]


def test_walk_in_rejects_past_and_non_increasing_stay_times(client, db_session, preferences_store):
    property_, _guest, _rate_plan = make_property_guest_plan(db_session)
    _room(db_session)

    past_response = client.post(
        "/api/v1/walk-ins",
        json=_payload(property_.id, check_in=str(date.today() - timedelta(days=1))),
    )
    assert past_response.status_code == 400
    assert "cannot be in the past" in past_response.json()["detail"]

    invalid_time_response = client.post(
        "/api/v1/walk-ins",
        json=_payload(
            property_.id,
            check_in=str(date.today() + timedelta(days=1)),
            check_out=str(date.today() + timedelta(days=1)),
            check_in_time="14:00",
            check_out_time="14:00",
        ),
    )
    assert invalid_time_response.status_code == 422
    assert "Check-out date and time must be after check-in date and time" in invalid_time_response.text


def test_cancelled_reservation_does_not_block_available_room(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    _room(db_session)
    db_session.add(models.Reservation(
        guest_id=guest.id,
        property_id=property_.id,
        rate_plan_id=rate_plan.id,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
        room_number="101",
        status=models.ReservationStatus.cancelled,
    ))
    db_session.commit()

    response = client.get(
        "/api/v1/walk-ins/available-rooms",
        params={"check_in": str(date.today() + timedelta(days=1)), "check_out": str(date.today() + timedelta(days=3))},
    )
    assert response.status_code == 200
    assert [room["room_number"] for room in response.json()] == ["101"]


def test_checkout_marks_room_dirty_and_notifies_housekeeping(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    _room(db_session, status=models.RoomStatus.occupied)
    reservation = models.Reservation(
        guest_id=guest.id,
        property_id=property_.id,
        rate_plan_id=rate_plan.id,
        check_in=date.today() - timedelta(days=2),
        check_out=date.today(),
        room_number="101",
        status=models.ReservationStatus.checked_in,
    )
    db_session.add(reservation)
    db_session.commit()

    response = client.patch(f"/api/v1/reservations/{reservation.id}/status", json={"status": "checked_out"})
    assert response.status_code == 200
    assert db_session.query(models.Room).filter_by(room_number="101").one().status == models.RoomStatus.dirty
    notification = db_session.query(models.Notification).one()
    assert notification.recipient_role == "HOUSEKEEPING"
    assert notification.room_number == "101"

    duplicate_response = client.patch(f"/api/v1/reservations/{reservation.id}/status", json={"status": "checked_out"})
    assert duplicate_response.status_code == 200
    assert db_session.query(models.Notification).count() == 1
