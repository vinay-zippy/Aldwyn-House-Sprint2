"""
SQLAlchemy models for the Core Data Model (Section 2.2 of the case study).

IDs are UUID4 strings stored as String(36) rather than a Postgres-native UUID
column, so the same models work unmodified against SQLite in tests (see
tests/conftest.py) as well as Postgres in dev/prod.

Extend this module (or add a sibling module) with your team's vertical-specific
entities from Section 4 of your brief — don't redesign what's here.
"""

import enum
import uuid
from datetime import datetime, time, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """datetime.utcnow() is deprecated (naive, silently non-UTC-labeled) — use this
    timezone-aware helper across models and factory defaults instead."""
    return datetime.now(timezone.utc)


class ReservationStatus(str, enum.Enum):
    confirmed = "confirmed"
    checked_in = "checked_in"
    checked_out = "checked_out"
    cancelled = "cancelled"


class FolioStatus(str, enum.Enum):
    open = "open"
    settled = "settled"
    disputed = "disputed"


class Guest(Base):
    __tablename__ = "guests"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    guest_code = Column(String(10), nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    phone = Column(String, nullable=True)
    id_type = Column(String, nullable=True)
    id_number = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    loyalty_tier = Column(String, nullable=False, default="standard")
    created_at = Column(DateTime, default=utcnow, nullable=False)

    reservations = relationship("Reservation", back_populates="guest")
    concierge_requests = relationship("ConciergeRequest", back_populates="guest")


class Property(Base):
    __tablename__ = "properties"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    address = Column(String, nullable=True)
    timezone = Column(String, nullable=False, default="UTC")

    rate_plans = relationship("RatePlan", back_populates="property")
    reservations = relationship("Reservation", back_populates="property")


class RatePlan(Base):
    __tablename__ = "rate_plans"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    name = Column(String, nullable=False)
    nightly_rate = Column(Numeric(10, 2), nullable=False)
    cancellation_policy = Column(String, nullable=True)

    property = relationship("Property", back_populates="rate_plans")
    reservations = relationship("Reservation", back_populates="rate_plan")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=False)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    rate_plan_id = Column(String(36), ForeignKey("rate_plans.id"), nullable=True)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    check_in_time = Column(Time, nullable=True)
    check_out_time = Column(Time, nullable=True)
    room_number = Column(String, nullable=True)
    number_of_guests = Column(Integer, nullable=False, default=1)
    status = Column(Enum(ReservationStatus), nullable=False, default=ReservationStatus.confirmed)

    guest = relationship("Guest", back_populates="reservations")
    property = relationship("Property", back_populates="reservations")
    rate_plan = relationship("RatePlan", back_populates="reservations")
    folio = relationship("Folio", back_populates="reservation", uselist=False)


class ConciergeRequest(Base):
    __tablename__ = "concierge_requests"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=False, index=True)
    request = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    guest = relationship("Guest", back_populates="concierge_requests")


class HousekeepingTask(Base):
    __tablename__ = "housekeeping_tasks"
    __table_args__ = (
        UniqueConstraint(
            "reservation_id",
            "task_type",
            name="uq_housekeeping_task_reservation_type",
        ),
    )

    id = Column(String(36), primary_key=True, default=gen_uuid)
    reservation_id = Column(String(36), ForeignKey("reservations.id"), nullable=False, index=True)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=False, index=True)
    room_number = Column(String, nullable=True)
    task_type = Column(String, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    status = Column(String, nullable=False, default="pending")
    priority = Column(String, nullable=False, default="normal")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    reservation = relationship("Reservation")
    guest = relationship("Guest")


class Folio(Base):
    __tablename__ = "folios"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    reservation_id = Column(String(36), ForeignKey("reservations.id"), nullable=False, unique=True)
    line_items = Column(JSON, nullable=False, default=list)  # [{ "description", "amount" }, ...]
    balance = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(Enum(FolioStatus), nullable=False, default=FolioStatus.open)

    reservation = relationship("Reservation", back_populates="folio")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=True)
    items = Column(JSON, nullable=False, default=list)  # [{ "name", "qty", "price" }, ...]
    total = Column(Numeric(10, 2), nullable=False, default=0)
    placed_at = Column(DateTime, default=utcnow, nullable=False)


class AmenityCategory(str, enum.Enum):
    """Amenity categories supported by the guest-preference matching engine (Story 4)."""

    dining = "dining"
    spa = "spa"
    local_experience = "local_experience"


class Amenity(Base):
    """Hotel amenity/experience catalogue entry used by the preference-matching engine."""

    __tablename__ = "amenities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=True)
    name = Column(String, nullable=False)
    category = Column(Enum(AmenityCategory), nullable=False)
    description = Column(String, nullable=True)
    # Keywords compared (case-insensitively) against sanitized guest preference terms.
    tags = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True)

    property = relationship("Property")


class RecommendationReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class RecommendationReview(Base):
    """Staff review state for a guest/amenity recommendation."""

    __tablename__ = "recommendation_reviews"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=False)
    amenity_id = Column(String(36), ForeignKey("amenities.id"), nullable=False)
    status = Column(
        Enum(RecommendationReviewStatus),
        nullable=False,
        default=RecommendationReviewStatus.pending,
    )
    reviewed_at = Column(DateTime, nullable=True)

    guest = relationship("Guest")
    amenity = relationship("Amenity")


class RoomStatus(str, enum.Enum):
    available = "available"
    ready = "ready"
    occupied = "occupied"
    dirty = "dirty"
    cleaning = "cleaning"
    inspection_pending = "inspection_pending"
    maintenance = "maintenance"
    out_of_service = "out_of_service"
    reserved = "reserved"


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    room_number = Column(String, nullable=False, unique=True, index=True)
    floor = Column(String, nullable=False)
    status = Column(Enum(RoomStatus), nullable=False, default=RoomStatus.available)
    room_type = Column(String, nullable=False, default="standard")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum("FRONT_DESK", "HOUSEKEEPING", name="userrole"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
