import os

# Must be set before `app.main` is imported, so app.config.settings.testing is True
# and the app's lifespan skips touching the real Postgres/Mongo services.
os.environ.setdefault("TESTING", "true")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.mongo import get_preferences_collection

TEST_DATABASE_URL = "sqlite:///:memory:"

# StaticPool makes every checkout share one connection, so the in-memory SQLite
# DB (otherwise per-connection) is visible across the app's request handling.
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class FakePreferencesCollection:
    """In-memory stand-in for the Mongo guest_preferences collection, so the test
    suite never needs a live MongoDB. Backed by a plain dict (keyed by guest_id)
    that tests can pre-seed via the `preferences_store` fixture below."""

    def __init__(self, documents: dict):
        self._documents = documents

    def find_one(self, query):
        return self._documents.get(query.get("guest_id"))

    def update_one(self, query, update, upsert=False):
        """Minimal $set-only stand-in for pymongo's update_one(..., upsert=True),
        enough to support app/seed.py's usage."""
        guest_id = query.get("guest_id")
        if guest_id is None:
            raise NotImplementedError("FakePreferencesCollection only supports guest_id queries")
        if not upsert and guest_id not in self._documents:
            return
        self._documents.setdefault(guest_id, {}).update(update.get("$set", {}))


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def preferences_store():
    """Mutable dict backing FakePreferencesCollection — seed a guest's preference
    document into this before calling the API to exercise the non-empty case."""
    return {}


@pytest.fixture()
def client(db_session, preferences_store):
    def override_get_db():
        yield db_session

    def override_get_preferences_collection():
        return FakePreferencesCollection(preferences_store)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_preferences_collection] = override_get_preferences_collection
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
