from datetime import date, timedelta

from app import models
from app.auth import UserRole, create_access_token
from app.config import settings
from tests.factories import make_property_guest_plan, make_reservation


def _reservation(db_session, room_number=None, status=models.ReservationStatus.confirmed):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    if room_number:
        db_session.add(
            models.Room(
                room_number=room_number,
                floor="1",
                status=models.RoomStatus.ready,
                room_type="standard",
            )
        )
        db_session.flush()
    reservation = make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today(),
        check_out=date.today() + timedelta(days=2),
        room_number=room_number,
        status=status,
    )
    db_session.commit()
    return reservation, guest


def test_check_in_creates_welcome_amenity_task(client, db_session, preferences_store):
    reservation, _guest = _reservation(db_session, room_number="101")

    response = client.patch(
        f"/api/v1/reservations/{reservation.id}/status",
        json={"status": "checked_in"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "checked_in"
    assert body["workflow"]["transitioned"] is True
    assert [task["task_type"] for task in body["workflow"]["tasks"]] == ["welcome_amenity"]
    room = db_session.query(models.Room).filter_by(room_number="101").one()
    assert room.status == models.RoomStatus.occupied


def test_high_priority_preferences_create_one_housekeeping_task(
    client, db_session, preferences_store
):
    reservation, guest = _reservation(db_session)
    preferences_store[guest.id] = {
        "dietary": [{"value": "vegetarian", "priority": "high"}],
        "room_preferences": [{"value": "high floor", "priority": "normal"}],
        "notes": [{"value": "Anniversary", "priority": "high"}],
    }

    response = client.patch(
        f"/api/v1/reservations/{reservation.id}/status",
        json={"status": "checked_in"},
    )

    assert response.status_code == 200
    tasks = response.json()["workflow"]["tasks"]
    preference_tasks = [task for task in tasks if task["task_type"] == "high_priority_preferences"]
    assert len(preference_tasks) == 1
    assert preference_tasks[0]["priority"] == "high"
    assert preference_tasks[0]["details"] == {
        "preferences": [
            {"category": "dietary", "value": "vegetarian"},
            {"category": "notes", "value": "Anniversary"},
        ]
    }


def test_no_high_priority_preferences_create_no_preference_task(
    client, db_session, preferences_store
):
    reservation, guest = _reservation(db_session)
    preferences_store[guest.id] = {
        "dietary": [{"value": "vegetarian", "priority": "normal"}],
        "notes": [{"value": "No shellfish"}],
    }

    response = client.patch(
        f"/api/v1/reservations/{reservation.id}/status",
        json={"status": "checked_in"},
    )

    assert response.status_code == 200
    assert [task["task_type"] for task in response.json()["workflow"]["tasks"]] == [
        "welcome_amenity"
    ]


def test_repeated_check_in_does_not_duplicate_tasks(client, db_session, preferences_store):
    reservation, guest = _reservation(db_session)
    preferences_store[guest.id] = {
        "room_preferences": [{"value": "quiet floor", "priority": "high"}]
    }

    endpoint = f"/api/v1/reservations/{reservation.id}/status"
    first_response = client.patch(endpoint, json={"status": "checked_in"})
    second_response = client.patch(endpoint, json={"status": "checked_in"})

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert second_response.json()["workflow"]["transitioned"] is False
    assert db_session.query(models.HousekeepingTask).count() == 2


def test_cancelled_reservation_cannot_be_checked_in(client, db_session, preferences_store):
    reservation, _guest = _reservation(db_session, status=models.ReservationStatus.cancelled)

    response = client.patch(
        f"/api/v1/reservations/{reservation.id}/status",
        json={"status": "checked_in"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only confirmed reservations can be checked in"
    assert db_session.query(models.HousekeepingTask).count() == 0


def test_housekeeping_task_status_can_be_updated(client, db_session, preferences_store):
    reservation, _guest = _reservation(db_session)
    check_in_response = client.patch(
        f"/api/v1/reservations/{reservation.id}/status",
        json={"status": "checked_in"},
    )
    task_id = check_in_response.json()["workflow"]["tasks"][0]["id"]

    response = client.patch(
        f"/api/v1/housekeeping/tasks/{task_id}/status",
        json={"status": "completed"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["completed_at"] is not None
    assert client.get("/api/v1/housekeeping/tasks").json() == []


def test_housekeeping_tasks_require_authentication(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "testing", False)

    unauthorized = client.get("/api/v1/housekeeping/tasks")
    assert unauthorized.status_code == 401

    user = models.User(
        username="housekeeping-test",
        password_hash="unused",
        role=UserRole.HOUSEKEEPING.value,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(user.id, UserRole.HOUSEKEEPING)

    authorized = client.get(
        "/api/v1/housekeeping/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert authorized.status_code == 200