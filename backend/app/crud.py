"""Plain DB access functions, kept separate from routers so they're easy to reuse
(e.g. from the AI agent/RAG code teams build in Sprint 3) and to unit test."""

from datetime import date, datetime, timezone

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

def list_upcoming_arrivals(
    db: Session,
    date_from: date,
    date_to: date,
    property_id: str | None = None,
):
    query = (
        db.query(models.Reservation)
        .join(models.Guest)
        .filter(
            models.Reservation.check_in >= date_from,
            models.Reservation.check_in <= date_to,
            models.Reservation.status != models.ReservationStatus.cancelled,
        )
    )

    if property_id:
        query = query.filter(models.Reservation.property_id == property_id)

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


def list_amenities(db: Session, property_id: str | None = None) -> list[models.Amenity]:
    """Active amenity catalogue, optionally scoped to one property (Story 4)."""
    query = db.query(models.Amenity).filter(models.Amenity.is_active.is_(True))
    if property_id:
        query = query.filter(models.Amenity.property_id == property_id)
    return query.all()


def get_recommendation_review(
    db: Session, guest_id: str, amenity_id: str
) -> models.RecommendationReview | None:
    return (
        db.query(models.RecommendationReview)
        .filter(
            models.RecommendationReview.guest_id == guest_id,
            models.RecommendationReview.amenity_id == amenity_id,
        )
        .first()
    )


def list_recommendation_reviews(db: Session, guest_id: str) -> list[models.RecommendationReview]:
    return (
        db.query(models.RecommendationReview)
        .filter(models.RecommendationReview.guest_id == guest_id)
        .all()
    )


def save_recommendation_review(
    db: Session,
    guest_id: str,
    amenity_id: str,
    status: models.RecommendationReviewStatus,
) -> models.RecommendationReview:
    review = get_recommendation_review(db, guest_id, amenity_id)
    if review is None:
        review = models.RecommendationReview(guest_id=guest_id, amenity_id=amenity_id)
        db.add(review)
    review.status = status
    review.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(review)
    return review


def list_guests(db: Session) -> list[models.Guest]:
    return db.query(models.Guest).order_by(models.Guest.name).all()


def list_rooms(db: Session, floor: str | None = None) -> list[models.Room]:
    query = db.query(models.Room)
    if floor:
        query = query.filter(models.Room.floor == floor)
    return query.order_by(models.Room.floor, models.Room.room_number).all()


def get_dashboard_summary(db: Session, prefs_collection=None) -> dict:
    today = date.today()
    upcoming_count = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.check_in >= today,
            models.Reservation.status != models.ReservationStatus.cancelled,
        )
        .count()
    )
    in_house_count = (
        db.query(models.Reservation)
        .filter(models.Reservation.status == models.ReservationStatus.checked_in)
        .count()
    )
    departures_count = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.check_out == today,
            models.Reservation.status != models.ReservationStatus.cancelled,
        )
        .count()
    )

    upcoming_res = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.check_in >= today,
            models.Reservation.status != models.ReservationStatus.cancelled,
        )
        .all()
    )

    high_priority_count = 0
    if prefs_collection is not None:
        guest_ids = {r.guest_id for r in upcoming_res}
        for gid in guest_ids:
            try:
                prefs_doc = prefs_collection.find_one({"guest_id": gid}) or {}
            except Exception:
                prefs_doc = {}
            has_hp = False
            for category in ("dietary", "room_preferences", "notes"):
                items = prefs_doc.get(category, [])
                if any(
                    isinstance(i, dict)
                    and (i.get("priority") == "high" or i.get("is_high_priority") is True)
                    for i in items
                ):
                    has_hp = True
                    break
            if has_hp:
                high_priority_count += 1

    rooms = db.query(models.Room).all()
    room_summary = {
        "available": 0,
        "occupied": 0,
        "cleaning": 0,
        "maintenance": 0,
    }
    for room in rooms:
        st = room.status.value if hasattr(room.status, "value") else str(room.status)
        if st in room_summary:
            room_summary[st] += 1
        elif st in ("ready", "available"):
            room_summary["available"] += 1
        elif st in ("dirty", "cleaning", "inspection_pending"):
            room_summary["cleaning"] += 1
        elif st in ("maintenance", "out_of_service"):
            room_summary["maintenance"] += 1

    return {
        "upcoming_arrivals": upcoming_count,
        "in_house_guests": in_house_count,
        "departures": departures_count,
        "high_priority_guests": high_priority_count,
        "room_summary": room_summary,
    }
