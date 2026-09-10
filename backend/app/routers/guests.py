from fastapi import APIRouter, Depends, HTTPException
from pymongo.collection import Collection
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.mongo import get_preferences_collection

router = APIRouter(prefix="/api/v1/guests", tags=["guests"])


@router.get("/{guest_id}", response_model=schemas.GuestDetail)
def get_guest(
    guest_id: str,
    db: Session = Depends(get_db),
    prefs_collection: Collection = Depends(get_preferences_collection),
):
    """Guest profile (Postgres) merged with the guest's preference document (Mongo).

    Mongo access goes through a Depends() (like get_db) rather than a direct call,
    so tests can override it with a fake collection instead of needing a live Mongo.
    """
    guest = crud.get_guest(db, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    prefs_doc = prefs_collection.find_one({"guest_id": guest_id}) or {}
    preferences = schemas.GuestPreferences(
        dietary=prefs_doc.get("dietary", []),
        room_preferences=prefs_doc.get("room_preferences", []),
        notes=prefs_doc.get("notes", []),
    )

    return schemas.GuestDetail(
        id=guest.id,
        name=guest.name,
        email=guest.email,
        phone=guest.phone,
        loyalty_tier=guest.loyalty_tier,
        created_at=guest.created_at,
        preferences=preferences,
    )
