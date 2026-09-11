from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.config import settings
from app.database import get_db

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

@router.get("/upcoming-arrivals", response_model=list[schemas.UpcomingArrivalOut])
def upcoming_arrivals(
    property_id: str | None = None,
    db: Session = Depends(get_db),
):
    today = date.today()
    end_date = today + timedelta(days=settings.upcoming_arrivals_days)

    reservations = crud.list_upcoming_arrivals(
        db,
        date_from=today,
        date_to=end_date,
        property_id=property_id,
    )

    return [
        {
            "id": reservation.id,
            "guest_id": reservation.guest_id,
            "guest_name": reservation.guest.name,
            "check_in": reservation.check_in,
            "check_out": reservation.check_out,
            "room_number": reservation.room_number,
            "status": reservation.status,
        }
        for reservation in reservations
    ]

@router.get("/{reservation_id}", response_model=schemas.ReservationDetail)
def get_reservation(reservation_id: str, db: Session = Depends(get_db)):
    reservation = crud.get_reservation(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.post("", response_model=schemas.ReservationOut, status_code=201)
def create_reservation(payload: schemas.ReservationCreate, db: Session = Depends(get_db)):
    guest = crud.get_guest(db, payload.guest_id)
    if not guest:
        raise HTTPException(status_code=400, detail="guest_id does not reference an existing guest")
    return crud.create_reservation(db, payload)
