from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import UserRole, require_roles
from app.config import settings
from app.database import get_db
from app.mongo import get_preferences_collection
from app.routers.guests import _preference_response
from app.services.check_in_workflow import process_check_in

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"], dependencies=[Depends(require_roles(UserRole.FRONT_DESK))])


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
            "check_in_time": reservation.check_in_time,
            "check_out_time": reservation.check_out_time,
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
    try:
        return crud.create_reservation(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{reservation_id}/status", response_model=schemas.ReservationDetail)
def update_reservation_status(
    reservation_id: str,
    payload: schemas.ReservationStatusUpdate,
    db: Session = Depends(get_db),
    prefs_collection=Depends(get_preferences_collection),
):
    if payload.status != models.ReservationStatus.checked_in:
        reservation = crud.update_reservation_status(db, reservation_id, payload.status)
        if reservation is None:
            raise HTTPException(status_code=404, detail="Reservation not found")
        return reservation

    try:
        result = process_check_in(db, reservation_id, prefs_collection)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Reservation not found")

    response = schemas.ReservationDetail.model_validate(result.reservation).model_dump()
    response["workflow"] = {
        "transitioned": result.transitioned,
        "tasks": result.tasks,
    }
    return response
