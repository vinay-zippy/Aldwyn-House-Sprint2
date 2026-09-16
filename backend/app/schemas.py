"""Pydantic request/response schemas mirroring the Core Data Model and API contract."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models import (
    AmenityCategory,
    FolioStatus,
    RecommendationReviewStatus,
    ReservationStatus,
    RoomStatus,
)

# ---- Guest ----


class GuestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    guest_code: str
    name: str
    email: EmailStr
    phone: str | None = None
    id_type: str | None = None
    id_number: str | None = None
    loyalty_tier: str
    created_at: datetime


class PreferenceItem(BaseModel):
    value: str
    priority: Literal["high", "normal"] | None = None
    is_high_priority: bool


class GuestPreferences(BaseModel):
    dietary: list[PreferenceItem] = []
    room_preferences: list[PreferenceItem] = []
    notes: list[PreferenceItem] = []


class PastRequestOut(BaseModel):
    request: str
    status: str


class GuestPreferenceResponse(BaseModel):
    dietary_preferences: list[PreferenceItem] = []
    room_preferences: list[PreferenceItem] = []
    past_requests: list[PastRequestOut] = []


class GuestDetail(GuestOut):
    preferences: GuestPreferences


class GuestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    loyalty_tier: str = "standard"
    id_type: str | None = None
    id_number: str | None = None


class GuestUpdate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    loyalty_tier: str = "standard"
    id_type: str | None = None
    id_number: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class GuestMatch(BaseModel):
    guest: GuestOut
    previous_stays: list["ReservationOut"]


class WalkInCreate(BaseModel):
    guest_id: str | None = None
    name: str
    email: EmailStr
    phone: str
    id_type: str
    id_number: str
    check_in: date
    check_out: date
    check_in_time: time = time(14, 0)
    check_out_time: time = time(11, 0)
    number_of_guests: int = 1
    room_number: str
    loyalty_tier: str = "standard"
    dietary: list[dict] = []
    room_preferences: list[dict] = []
    notes: list[dict] = []


class WalkInOut(BaseModel):
    guest: GuestOut
    reservation: "ReservationOut"
    returning_guest: bool


# ---- Property / RatePlan ----
# Not exposed via their own endpoints yet (not in the Section 2.3 contract) — kept
# here so team briefs that add e.g. a properties list endpoint can reuse them.


class PropertyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    brand: str
    address: str | None = None
    timezone: str


class RatePlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    property_id: str
    name: str
    nightly_rate: Decimal
    cancellation_policy: str | None = None


# ---- Reservation / Folio ----


class ReservationCreate(BaseModel):
    guest_id: str
    property_id: str
    rate_plan_id: str | None = None
    check_in: date
    check_out: date
    room_number: str | None = None
    number_of_guests: int = 1
    check_in_time: time | None = None
    check_out_time: time | None = None
    status: ReservationStatus = ReservationStatus.confirmed


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    guest_id: str
    property_id: str
    rate_plan_id: str | None = None
    check_in: date
    check_out: date
    check_in_time: time | None = None
    check_out_time: time | None = None
    room_number: str | None
    status: ReservationStatus

class UpcomingArrivalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    guest_id: str
    guest_name: str
    check_in: date
    check_out: date
    check_in_time: time | None = None
    check_out_time: time | None = None
    room_number: str | None
    status: ReservationStatus

class FolioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reservation_id: str
    line_items: list[dict]
    balance: Decimal
    status: FolioStatus


class ReservationDetail(ReservationOut):
    guest: GuestOut
    folio: FolioOut | None = None
    workflow: "CheckInWorkflowOut | None" = None


class ReservationStatusUpdate(BaseModel):
    status: ReservationStatus


# ---- Availability ----


class AvailabilitySlot(BaseModel):
    rate_plan_id: str
    rate_plan_name: str
    nightly_rate: Decimal
    capacity: int
    booked: int
    available: bool


# ---- Amenities / preference matching (Story 4) ----


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    property_id: str | None = None
    name: str
    category: AmenityCategory
    description: str | None = None
    tags: list[str] = []
    is_active: bool = True


class AmenityRecommendation(BaseModel):
    amenity: AmenityOut
    matched_terms: list[str] = []
    # Recommendations are always surfaced for staff review before reaching a guest.
    status: str = "pending_staff_review"


class RecommendationReviewUpdate(BaseModel):
    status: RecommendationReviewStatus


class RecommendationReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    guest_id: str
    amenity_id: str
    status: RecommendationReviewStatus
    reviewed_at: datetime | None = None


# ---- Rooms & Dashboard ----


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    room_number: str
    floor: str
    status: RoomStatus
    room_type: str


class DashboardSummaryOut(BaseModel):
    upcoming_arrivals: int
    in_house_guests: int
    departures: int
    high_priority_guests: int
    room_summary: dict[str, int]


class HousekeepingTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reservation_id: str
    guest_id: str
    room_number: str | None
    task_type: str
    details: dict[str, Any]
    status: str
    priority: str
    created_at: datetime
    completed_at: datetime | None = None


class HousekeepingTaskStatusUpdate(BaseModel):
    status: Literal["pending", "in_progress", "completed", "cancelled"]


class CheckInWorkflowOut(BaseModel):
    transitioned: bool
    tasks: list[HousekeepingTaskOut]


class ConciergeRequestCreate(BaseModel):
    guest_id: str
    message: str


class ConciergeRequestAgentResponse(BaseModel):
    status: str
    message: str
    request_id: str | None = None
