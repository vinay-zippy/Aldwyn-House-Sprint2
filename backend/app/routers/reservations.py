from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.mongo import get_preferences_collection
from app.routers.guests import _preference_response

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"])


@router.get("", response_model=list[schemas.ReservationOut])
def list_reservations(
    property_id: str | None = None,
    status: models.ReservationStatus | None = None,
    date_from: date | None = Query(None, description="Filters check_out >= date_from"),
    date_to: date | None = Query(None, description="Filters check_in <= date_to"),
    db: Session = Depends(get_db),
):
    return crud.list_reservations(
        db, property_id=property_id, status=status, date_from=date_from, date_to=date_to
    )


@router.get("/{reservation_id}", response_model=schemas.ReservationDetail)
def get_reservation(reservation_id: str, db: Session = Depends(get_db)):
    reservation = crud.get_reservation(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.get(
    "/{reservation_id}/guest-preferences", response_model=schemas.GuestPreferenceResponse
)
def get_reservation_guest_preferences(
    reservation_id: str,
    db: Session = Depends(get_db),
    prefs_collection=Depends(get_preferences_collection),
):
    reservation = crud.get_reservation(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return _preference_response(reservation.guest_id, db, prefs_collection)


@router.post("", response_model=schemas.ReservationOut, status_code=201)
def create_reservation(payload: schemas.ReservationCreate, db: Session = Depends(get_db)):
    guest = crud.get_guest(db, payload.guest_id)
    if not guest:
        raise HTTPException(status_code=400, detail="guest_id does not reference an existing guest")
    return crud.create_reservation(db, payload)
