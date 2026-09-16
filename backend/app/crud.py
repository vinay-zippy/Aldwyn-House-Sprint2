"""Plain DB access functions, kept separate from routers so they're easy to reuse
(e.g. from the AI agent/RAG code teams build in Sprint 3) and to unit test."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas


def list_reservations(
    db: Session,
    property_id: str | None = None,
    status: models.ReservationStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    query = db.query(models.Reservation).join(models.Guest)
    query = query.filter(models.Guest.is_active.is_(True))
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
    if payload.check_out <= payload.check_in:
        raise ValueError("check_out must be after check_in")
    if payload.room_number and not room_is_available(
        db, payload.room_number, payload.check_in, payload.check_out
    ):
        raise ValueError(f"Room {payload.room_number} is no longer available. Please select another room.")
    reservation = models.Reservation(**payload.model_dump())
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def create_room_notification(
    db: Session,
    recipient_role: str,
    room_number: str,
    previous_status: models.RoomStatus | None,
    new_status: models.RoomStatus,
) -> models.Notification:
    message = f"Room {room_number} status changed from {previous_status.value if previous_status else 'unknown'} to {new_status.value}."
    notification = models.Notification(
        recipient_role=recipient_role,
        room_number=room_number,
        previous_status=previous_status,
        new_status=new_status,
        message=message,
    )
    db.add(notification)
    return notification


def list_notifications(db: Session, recipient_role: str) -> list[models.Notification]:
    return (
        db.query(models.Notification)
        .filter(models.Notification.recipient_role == recipient_role)
        .order_by(models.Notification.created_at.desc())
        .limit(30)
        .all()
    )


def update_reservation_status(
    db: Session, reservation_id: str, status: models.ReservationStatus
) -> models.Reservation | None:
    reservation = get_reservation(db, reservation_id)
    if reservation is None:
        return None
    if reservation.status == status:
        return reservation
    reservation.status = status
    if reservation.room_number and status == models.ReservationStatus.checked_in:
        room = get_room(db, reservation.room_number)
        if room:
            room.status = models.RoomStatus.occupied
    elif reservation.room_number and status in (
        models.ReservationStatus.checked_out,
        models.ReservationStatus.cancelled,
    ):
        room = get_room(db, reservation.room_number)
        if room and room.status == models.RoomStatus.occupied:
            previous_status = room.status
            room.status = models.RoomStatus.dirty
            create_room_notification(
                db,
                "HOUSEKEEPING",
                room.room_number,
                previous_status,
                models.RoomStatus.dirty,
            )
    db.commit()
    db.refresh(reservation)
    return reservation


def get_guest(db: Session, guest_id: str) -> models.Guest | None:
    return db.query(models.Guest).filter(models.Guest.id == guest_id, models.Guest.is_active.is_(True)).first()


def create_guest(db: Session, payload: schemas.GuestCreate) -> models.Guest:
    guest_number = db.query(models.Guest).count() + 1
    while db.query(models.Guest).filter(
        models.Guest.guest_code == f"G-{guest_number:04d}"
    ).first():
        guest_number += 1

    guest = models.Guest(guest_code=f"G-{guest_number:04d}", **payload.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


def find_matching_guest(db: Session, name: str, email: str, phone: str):
    return (
        db.query(models.Guest)
        .filter(
            models.Guest.name.ilike(name.strip()),
            models.Guest.email.ilike(email.strip()),
            models.Guest.phone == phone.strip(),
        )
        .first()
    )


def list_guest_reservations(db: Session, guest_id: str):
    return (
        db.query(models.Reservation)
        .filter(models.Reservation.guest_id == guest_id)
        .order_by(models.Reservation.check_in.desc())
        .all()
    )


def get_room(db: Session, room_number: str):
    return db.query(models.Room).filter(models.Room.room_number == room_number).first()


def room_is_available(db: Session, room_number: str, check_in: date, check_out: date) -> bool:
    room = get_room(db, room_number)
    if room is None or room.status not in (models.RoomStatus.available, models.RoomStatus.ready):
        return False
    conflict = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.room_number == room_number,
            models.Reservation.status != models.ReservationStatus.cancelled,
            models.Reservation.check_in < check_out,
            models.Reservation.check_out > check_in,
        )
        .first()
    )
    return conflict is None


def create_walk_in(
    db: Session,
    payload: schemas.WalkInCreate,
    prefs_collection=None,
) -> tuple[models.Guest, models.Reservation, bool]:
    property_ = db.query(models.Property).first()
    if property_ is None:
        raise ValueError("No hotel property is configured")
    try:
        local_now = datetime.now(ZoneInfo(property_.timezone))
    except (ValueError, TypeError):
        local_now = datetime.now().astimezone()
    current_minute = local_now.replace(second=0, microsecond=0)
    if datetime.combine(payload.check_in, payload.check_in_time).replace(tzinfo=local_now.tzinfo) < current_minute:
        raise ValueError("Check-in date and time cannot be in the past")
    room = get_room(db, payload.room_number)
    if room is None:
        raise ValueError(f"Room {payload.room_number} does not exist")
    if not room_is_available(db, payload.room_number, payload.check_in, payload.check_out):
        raise ValueError(f"Room {payload.room_number} is no longer available. Please select another room.")

    guest = db.query(models.Guest).filter(models.Guest.id == payload.guest_id).first() if payload.guest_id else None
    returning_guest = guest is not None
    if guest is None:
        guest = find_matching_guest(db, payload.name, payload.email, payload.phone)
        returning_guest = guest is not None
    if guest is None:
        guest = create_guest(
            db,
            schemas.GuestCreate(
                name=payload.name,
                email=payload.email,
                phone=payload.phone,
                loyalty_tier=payload.loyalty_tier,
                id_type=payload.id_type,
                id_number=payload.id_number,
            ),
        )
    reservation = models.Reservation(
        guest_id=guest.id,
        property_id=db.query(models.Property.id).first()[0],
        check_in=payload.check_in,
        check_out=payload.check_out,
        check_in_time=payload.check_in_time,
        check_out_time=payload.check_out_time,
        room_number=payload.room_number,
        number_of_guests=payload.number_of_guests,
        status=models.ReservationStatus.confirmed,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    if prefs_collection is not None and any((payload.dietary, payload.room_preferences, payload.notes)):
        prefs_collection.update_one(
            {"guest_id": guest.id},
            {"$set": {
                "guest_id": guest.id,
                "dietary": payload.dietary,
                "room_preferences": payload.room_preferences,
                "notes": payload.notes,
            }},
            upsert=True,
        )
    return guest, reservation, returning_guest


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
    return db.query(models.Guest).filter(models.Guest.is_active.is_(True)).order_by(models.Guest.name).all()


def search_guests(db: Session, query: str) -> list[models.Guest]:
    value = f"%{query.strip()}%"
    return (
        db.query(models.Guest)
        .filter(
            models.Guest.is_active.is_(True),
            (models.Guest.guest_code.ilike(value)
             | models.Guest.name.ilike(value)
             | models.Guest.email.ilike(value)
             | models.Guest.phone.ilike(value)),
        )
        .order_by(models.Guest.name)
        .limit(20)
        .all()
    )


def update_guest(db: Session, guest_id: str, payload: schemas.GuestUpdate) -> models.Guest | None:
    guest = get_guest(db, guest_id)
    if guest is None:
        return None
    for field, value in payload.model_dump().items():
        setattr(guest, field, value)
    db.commit()
    db.refresh(guest)
    return guest


def deactivate_guest(db: Session, guest_id: str) -> bool:
    guest = get_guest(db, guest_id)
    if guest is None:
        return False
    guest.is_active = False
    db.commit()
    return True


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
            or_(
                models.Reservation.check_out == today,
                models.Reservation.status == models.ReservationStatus.checked_out,
            ),
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
