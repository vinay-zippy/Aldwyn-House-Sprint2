"""
app/seed.py opens its own SessionLocal/Mongo collection rather than taking them via
FastAPI's Depends() (it runs at startup, outside a request), so — unlike the router
tests — we point its module-level references at the test doubles with monkeypatch
instead of using dependency_overrides.
"""

from app import models
from app.seed import seed_if_empty
from tests.conftest import FakePreferencesCollection, TestingSessionLocal


def _patch_seed_targets(monkeypatch, preferences_store):
    import app.seed as seed_module

    monkeypatch.setattr(seed_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(
        seed_module,
        "get_preferences_collection",
        lambda: FakePreferencesCollection(preferences_store),
    )


def test_seed_if_empty_populates_demo_data(db_session, preferences_store, monkeypatch):
    _patch_seed_targets(monkeypatch, preferences_store)

    seed_if_empty()

    guests = db_session.query(models.Guest).all()
    assert len(guests) == 4
    first_guest = next(guest for guest in guests if guest.email == "jamie.rivera@example.com")

    properties = db_session.query(models.Property).all()
    assert len(properties) == 1

    reservations = db_session.query(models.Reservation).all()
    assert len(reservations) == 4
    first_reservation = next(
        reservation for reservation in reservations if reservation.guest_id == first_guest.id
    )
    assert first_reservation.room_number == "101"

    folios = db_session.query(models.Folio).all()
    assert len(folios) == 4
    first_folio = next(folio for folio in folios if folio.reservation_id == first_reservation.id)
    assert first_folio.balance == 792

    assert preferences_store[first_guest.id] == {
        "guest_id": first_guest.id,
        "dietary": [{"value": "vegetarian", "priority": "high"}],
        "room_preferences": [
            {"value": "high floor", "priority": "normal"},
            {"value": "away from elevator", "priority": "high"},
        ],
        "notes": [
            {
                "value": "Celebrating anniversary - welcome note requested",
                "priority": "normal",
            }
        ],
        "updated_at": preferences_store[first_guest.id]["updated_at"],
    }


def test_seed_if_empty_is_idempotent(db_session, preferences_store, monkeypatch):
    _patch_seed_targets(monkeypatch, preferences_store)

    seed_if_empty()
    seed_if_empty()  # a second call (e.g. container restart) must not duplicate data

    assert db_session.query(models.Guest).count() == 4
    assert db_session.query(models.Reservation).count() == 4
