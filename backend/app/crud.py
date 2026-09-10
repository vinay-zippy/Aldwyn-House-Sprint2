"""Plain DB access functions, kept separate from routers so they're easy to reuse
(e.g. from the AI agent/RAG code teams build in Sprint 3) and to unit test."""

from datetime import date

from sqlalchemy.orm import Session

from app import models, schemas


def list_reservations(
    db: Session,
    property_id: str | None = None,
    status: models.ReservationStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    query = db.query(models.Reservation)
    if property_id:
        query = query.filter(models.Reservation.property_id == property_id)
    if status:
        query = query.filter(models.Reservation.status == status)
    if date_from:
        query = query.filter(models.Reservation.check_out >= date_from)
    if date_to:
        query = query.filter(models.Reservation.check_in <= date_to)
    return query.order_by(models.Reservation.check_in).all()


def get_reservation(db: Session, reservation_id: str) -> models.Reservation | None:
    return db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()


def create_reservation(db: Session, payload: schemas.ReservationCreate) -> models.Reservation:
    reservation = models.Reservation(**payload.model_dump())
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def get_guest(db: Session, guest_id: str) -> models.Guest | None:
    return db.query(models.Guest).filter(models.Guest.id == guest_id).first()


def get_concierge_requests(db: Session, guest_id: str) -> list[models.ConciergeRequest]:
    return (
        db.query(models.ConciergeRequest)
        .filter(models.ConciergeRequest.guest_id == guest_id)
        .order_by(models.ConciergeRequest.created_at)
        .all()
    )


def get_folio(db: Session, folio_id: str) -> models.Folio | None:
    return db.query(models.Folio).filter(models.Folio.id == folio_id).first()


def get_rate_plans_for_property(db: Session, property_id: str) -> list[models.RatePlan]:
    return db.query(models.RatePlan).filter(models.RatePlan.property_id == property_id).all()


def count_overlapping_reservations(
    db: Session, rate_plan_id: str, check_in: date, check_out: date
) -> int:
    return (
        db.query(models.Reservation)
        .filter(
            models.Reservation.rate_plan_id == rate_plan_id,
            models.Reservation.status != models.ReservationStatus.cancelled,
            models.Reservation.check_in < check_out,
            models.Reservation.check_out > check_in,
        )
        .count()
    )
