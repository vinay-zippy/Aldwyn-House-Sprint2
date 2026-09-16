from datetime import date, timedelta

from app import models
from app.ai.concierge_agent import handle_concierge_request
from tests.factories import make_property_guest_plan, make_reservation


def test_creates_concierge_request_for_active_reservation(db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() - timedelta(days=1),
        check_out=date.today() + timedelta(days=1),
        status=models.ReservationStatus.confirmed,
    )
    db_session.commit()

    result = handle_concierge_request(
        db_session,
        guest.id,
        "Can I get some extra pillows?",
    )

    assert result.status == "created"
    assert result.request is not None
    assert result.request.request == "Extra pillows"
    assert result.request.status == "pending"


def test_rejects_without_active_reservation(db_session):
    _property, guest, _rate_plan = make_property_guest_plan(db_session)

    result = handle_concierge_request(
        db_session,
        guest.id,
        "I need extra pillows",
    )

    assert result.status == "rejected"
    assert result.request is None
    assert "No active reservation" in result.message


def test_creates_late_checkout_request_for_checked_in_guest(db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() - timedelta(days=1),
        check_out=date.today() + timedelta(days=1),
        status=models.ReservationStatus.checked_in,
    )
    db_session.commit()

    result = handle_concierge_request(db_session, guest.id, "Can I have a late checkout?")

    assert result.status == "created"
    assert result.request is not None
    assert result.request.request == "Late check-out"
    assert result.request.status == "pending"


def test_rejects_cancelled_reservation(db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    make_reservation(
        db_session,
        guest,
        property_,
        rate_plan,
        check_in=date.today() - timedelta(days=1),
        check_out=date.today() + timedelta(days=1),
        status=models.ReservationStatus.cancelled,
    )
    db_session.commit()

    result = handle_concierge_request(db_session, guest.id, "I need extra pillows")

    assert result.status == "rejected"
    assert result.request is None
