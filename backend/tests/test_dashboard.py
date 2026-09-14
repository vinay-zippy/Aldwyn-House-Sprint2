from datetime import date, timedelta

from app import models
from tests.factories import make_property_guest_plan, make_reservation


def test_dashboard_departures_updates_for_checked_out_reservation(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    reservation = make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() + timedelta(days=3),
        check_out=date.today() + timedelta(days=5),
        status=models.ReservationStatus.confirmed,
    )
    db_session.commit()

    before = client.get("/api/v1/dashboard/summary")
    assert before.status_code == 200
    assert before.json()["departures"] == 0

    update = client.patch(
        f"/api/v1/reservations/{reservation.id}/status",
        json={"status": "checked_out"},
    )
    assert update.status_code == 200

    after = client.get("/api/v1/dashboard/summary")
    assert after.status_code == 200
    assert after.json()["departures"] == 1
