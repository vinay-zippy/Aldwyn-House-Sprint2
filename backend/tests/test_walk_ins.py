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
        "check_in": str(date.today()),
        "check_out": str(date.today() + timedelta(days=2)),
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
        check_in=date.today(),
        check_out=date.today() + timedelta(days=2),
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
