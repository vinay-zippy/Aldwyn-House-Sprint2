from app import models
from app.auth import UserRole, current_user
from app.main import app


class StaffUser:
    def __init__(self, role: UserRole):
        self.role = role


def _room(db_session):
    room = models.Room(room_number="101", floor="1", status=models.RoomStatus.ready, room_type="standard")
    db_session.add(room)
    db_session.commit()
    return room


def test_front_desk_room_change_notifies_housekeeping(client, db_session):
    _room(db_session)
    app.dependency_overrides[current_user] = lambda: StaffUser(UserRole.FRONT_DESK)
    try:
        response = client.patch("/api/v1/rooms/101/status", params={"status": "dirty"})
    finally:
        app.dependency_overrides.pop(current_user, None)

    assert response.status_code == 200
    notification = db_session.query(models.Notification).one()
    assert notification.recipient_role == UserRole.HOUSEKEEPING.value
    assert notification.previous_status == models.RoomStatus.ready
    assert notification.new_status == models.RoomStatus.dirty


def test_housekeeping_room_change_notifies_front_desk_without_duplicates(client, db_session):
    _room(db_session)
    app.dependency_overrides[current_user] = lambda: StaffUser(UserRole.HOUSEKEEPING)
    try:
        response = client.patch("/api/v1/rooms/101/status", params={"status": "maintenance"})
        repeated_response = client.patch("/api/v1/rooms/101/status", params={"status": "maintenance"})
    finally:
        app.dependency_overrides.pop(current_user, None)

    assert response.status_code == 200
    assert repeated_response.status_code == 200
    notification = db_session.query(models.Notification).one()
    assert notification.recipient_role == UserRole.FRONT_DESK.value