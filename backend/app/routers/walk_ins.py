from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pymongo.collection import Collection
from sqlalchemy.orm import Session

from app import crud, schemas
from app.auth import UserRole, require_roles
from app.database import get_db
from app.mongo import get_preferences_collection

router = APIRouter(prefix="/api/v1/walk-ins", tags=["walk-ins"])


@router.get("/guest-match", response_model=schemas.GuestMatch | None)
def guest_match(
    name: str,
    email: str,
    phone: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.FRONT_DESK)),
):
    guest = crud.find_matching_guest(db, name, email, phone)
    if guest is None:
        return None
    return schemas.GuestMatch(guest=guest, previous_stays=crud.list_guest_reservations(db, guest.id))


@router.get("/available-rooms", response_model=list[schemas.RoomOut])
def available_rooms(
    check_in: date,
    check_out: date,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.FRONT_DESK)),
):
    if check_in < date.today():
        raise HTTPException(status_code=400, detail="check_in cannot be in the past")
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    return [
        room
        for room in crud.list_rooms(db)
        if crud.room_is_available(db, room.room_number, check_in, check_out)
    ]


@router.post("", response_model=schemas.WalkInOut, status_code=201)
def create_walk_in(
    payload: schemas.WalkInCreate,
    db: Session = Depends(get_db),
    prefs_collection: Collection = Depends(get_preferences_collection),
    _user=Depends(require_roles(UserRole.FRONT_DESK)),
):
    if payload.number_of_guests < 1:
        raise HTTPException(status_code=400, detail="number_of_guests must be greater than zero")
    try:
        guest, reservation, returning_guest = crud.create_walk_in(db, payload, prefs_collection)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return schemas.WalkInOut(guest=guest, reservation=reservation, returning_guest=returning_guest)