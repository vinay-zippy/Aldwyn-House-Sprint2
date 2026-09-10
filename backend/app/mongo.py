from pymongo import MongoClient
from pymongo.collection import Collection

from app.config import settings

_client = MongoClient(settings.mongo_url)
_db = _client[settings.mongo_db_name]


def get_preferences_collection() -> Collection:
    """
    Guest preference/document data (semi-structured, per Section 2.4 of the case
    study baseline) lives here. Document shape:

        { guest_id, dietary: [...], room_preferences: [...], notes: [...], updated_at }

    Team briefs that need more guest-document types (e.g. lease/policy documents
    for Team 5) can add sibling collections the same way.
    """
    return _db["guest_preferences"]
