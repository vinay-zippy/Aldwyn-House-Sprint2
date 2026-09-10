from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/v1/availability", tags=["availability"])


@router.get("", response_model=list[schemas.AvailabilitySlot])
def check_availability(
    property_id: str,
    check_in: date,
    check_out: date,
    db: Session = Depends(get_db),
):
    """
    Baseline availability stub: reports booked-vs-capacity per rate plan for the
    given property/date range, using a flat DEFAULT_PROPERTY_CAPACITY.

    The Core Data Model has no inventory/capacity entity by design — that's
    vertical-specific (e.g. Team 2's MultiPropertyInventory, Team 4's UnitListing
    calendars). Replace the capacity source below with your brief's real inventory
    model once you build it.
    """
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    rate_plans = crud.get_rate_plans_for_property(db, property_id)
    if not rate_plans:
        raise HTTPException(status_code=404, detail="No rate plans found for property")

    slots = []
    for plan in rate_plans:
        booked = crud.count_overlapping_reservations(db, plan.id, check_in, check_out)
        capacity = settings.default_property_capacity
        slots.append(
            schemas.AvailabilitySlot(
                rate_plan_id=plan.id,
                rate_plan_name=plan.name,
                nightly_rate=plan.nightly_rate,
                capacity=capacity,
                booked=booked,
                available=booked < capacity,
            )
        )
    return slots
