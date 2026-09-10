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
    assert len(guests) == 1
    assert guests[0].email == "jamie.rivera@example.com"

    properties = db_session.query(models.Property).all()
    assert len(properties) == 1

    reservations = db_session.query(models.Reservation).all()
    assert len(reservations) == 1
    assert reservations[0].guest_id == guests[0].id

    folios = db_session.query(models.Folio).all()
    assert len(folios) == 1
    assert folios[0].reservation_id == reservations[0].id
    assert folios[0].balance == 792

    assert preferences_store[guests[0].id] == {
        "guest_id": guests[0].id,
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
        "updated_at": preferences_store[guests[0].id]["updated_at"],
    }


def test_seed_if_empty_is_idempotent(db_session, preferences_store, monkeypatch):
    _patch_seed_targets(monkeypatch, preferences_store)

    seed_if_empty()
    seed_if_empty()  # a second call (e.g. container restart) must not duplicate data

    assert db_session.query(models.Guest).count() == 1
    assert db_session.query(models.Reservation).count() == 1
