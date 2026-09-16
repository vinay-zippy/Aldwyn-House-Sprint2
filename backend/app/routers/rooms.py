from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.auth import UserRole, require_roles
from app import models

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"], dependencies=[Depends(require_roles(UserRole.FRONT_DESK, UserRole.HOUSEKEEPING))])


@router.get("", response_model=list[schemas.RoomOut])
def list_rooms(floor: str | None = None, db: Session = Depends(get_db)):
    return crud.list_rooms(db, floor=floor)


@router.patch("/{room_number}/status", response_model=schemas.RoomOut)
def update_room_status(
    room_number: str,
    status: models.RoomStatus,
    db: Session = Depends(get_db),
    user=Depends(require_roles(UserRole.FRONT_DESK, UserRole.HOUSEKEEPING)),
):
    room = crud.get_room(db, room_number)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    user_role = getattr(user.role, "value", user.role) if user else None
    if user_role == UserRole.HOUSEKEEPING.value and status not in (
        models.RoomStatus.ready,
        models.RoomStatus.dirty,
        models.RoomStatus.maintenance,
    ):
        raise HTTPException(
            status_code=403,
            detail="Housekeeping may only set rooms to ready, dirty, or maintenance",
        )
    room.status = status
    db.commit()
    db.refresh(room)
    return room
