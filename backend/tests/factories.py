"""Small ORM factory helpers shared across the test suite.

Each function inserts one row (via flush, so its generated id is available) using
sensible defaults that can be overridden per-test. `make_property_guest_plan` builds
the common trio most endpoint tests need and commits so it's visible through the
API's request-scoped session.
"""

from datetime import date, timedelta

from app import models


def make_property(db_session, **overrides):
    defaults = dict(name="Test Hotel", brand="Test Brand", address="123 Main St", timezone="UTC")
    defaults.update(overrides)
    property_ = models.Property(**defaults)
    db_session.add(property_)
    db_session.flush()
    return property_


def make_rate_plan(db_session, property_, **overrides):
    defaults = dict(
        property_id=property_.id,
        name="Standard",
        nightly_rate=100,
        cancellation_policy="Flexible",
    )
    defaults.update(overrides)
    rate_plan = models.RatePlan(**defaults)
    db_session.add(rate_plan)
    db_session.flush()
    return rate_plan


def make_guest(db_session, **overrides):
    defaults = dict(name="Test Guest", email="test@example.com", loyalty_tier="standard")
    defaults.update(overrides)
    guest = models.Guest(**defaults)
    db_session.add(guest)
    db_session.flush()
    return guest


def make_reservation(db_session, guest, property_, rate_plan, **overrides):
    defaults = dict(
        guest_id=guest.id,
        property_id=property_.id,
        rate_plan_id=rate_plan.id,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
        status=models.ReservationStatus.confirmed,
    )
    defaults.update(overrides)
    reservation = models.Reservation(**defaults)
    db_session.add(reservation)
    db_session.flush()
    return reservation


def make_concierge_request(db_session, guest, **overrides):
    defaults = dict(guest_id=guest.id, request="Extra pillows", status="completed")
    defaults.update(overrides)
    concierge_request = models.ConciergeRequest(**defaults)
    db_session.add(concierge_request)
    db_session.flush()
    return concierge_request


def make_folio(db_session, reservation, **overrides):
    defaults = dict(
        reservation_id=reservation.id,
        line_items=[{"description": "1 night - Standard Rate", "amount": 100.0}],
        balance=100.0,
        status=models.FolioStatus.open,
    )
    defaults.update(overrides)
    folio = models.Folio(**defaults)
    db_session.add(folio)
    db_session.flush()
    return folio


def make_property_guest_plan(db_session):
    """The property + guest + rate plan trio most endpoint tests start from."""
    property_ = make_property(db_session)
    rate_plan = make_rate_plan(db_session, property_)
    guest = make_guest(db_session)
    db_session.commit()
    return property_, guest, rate_plan
