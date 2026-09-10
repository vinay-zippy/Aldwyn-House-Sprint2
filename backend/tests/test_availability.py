from datetime import date, timedelta

from tests.factories import make_property, make_property_guest_plan, make_reservation


def test_availability_reports_capacity_and_booked_count(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
    )
    db_session.commit()

    resp = client.get(
        "/api/v1/availability",
        params={
            "property_id": property_.id,
            "check_in": str(date.today() + timedelta(days=1)),
            "check_out": str(date.today() + timedelta(days=3)),
        },
    )
    assert resp.status_code == 200
    slot = resp.json()[0]
    assert slot["rate_plan_id"] == rate_plan.id
    assert slot["booked"] == 1
    assert slot["available"] is True


def test_availability_rejects_inverted_date_range(client, db_session):
    property_, _guest, _rate_plan = make_property_guest_plan(db_session)
    resp = client.get(
        "/api/v1/availability",
        params={
            "property_id": property_.id,
            "check_in": str(date.today() + timedelta(days=3)),
            "check_out": str(date.today() + timedelta(days=1)),
        },
    )
    assert resp.status_code == 400


def test_availability_returns_404_when_property_has_no_rate_plans(client, db_session):
    property_ = make_property(db_session)
    db_session.commit()

    resp = client.get(
        "/api/v1/availability",
        params={
            "property_id": property_.id,
            "check_in": str(date.today() + timedelta(days=1)),
            "check_out": str(date.today() + timedelta(days=3)),
        },
    )
    assert resp.status_code == 404
