from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app import crud, models

WELCOME_AMENITY_TASK = "welcome_amenity"
HIGH_PRIORITY_TASK = "high_priority_preferences"


@dataclass
class CheckInWorkflowResult:
    reservation: models.Reservation
    tasks: list[models.HousekeepingTask]
    transitioned: bool


def _high_priority_preferences(preferences_document: dict) -> list[dict]:
    flagged = []
    for category in ("dietary", "room_preferences", "notes"):
        for item in preferences_document.get(category, []):
            if isinstance(item, dict) and item.get("priority") == "high":
                flagged.append({"category": category, "value": item.get("value")})
    return flagged


def _tasks_for_reservation(db: Session, reservation_id: str) -> list[models.HousekeepingTask]:
    return (
        db.query(models.HousekeepingTask)
        .filter(models.HousekeepingTask.reservation_id == reservation_id)
        .order_by(models.HousekeepingTask.created_at)
        .all()
    )


def process_check_in(
    db: Session,
    reservation_id: str,
    preferences_collection,
) -> CheckInWorkflowResult | None:
    reservation = crud.get_reservation(db, reservation_id)
    if reservation is None:
        return None

    if reservation.status == models.ReservationStatus.checked_in:
        return CheckInWorkflowResult(
            reservation=reservation,
            tasks=_tasks_for_reservation(db, reservation.id),
            transitioned=False,
        )

    if reservation.status != models.ReservationStatus.confirmed:
        raise ValueError("Only confirmed reservations can be checked in")

    crud.update_reservation_status(
        db,
        reservation.id,
        models.ReservationStatus.checked_in,
        commit=False,
    )

    preferences_document = preferences_collection.find_one({"guest_id": reservation.guest_id}) or {}
    flagged_preferences = _high_priority_preferences(preferences_document)

    if flagged_preferences:
        db.add(
            models.HousekeepingTask(
                reservation_id=reservation.id,
                guest_id=reservation.guest_id,
                room_number=reservation.room_number,
                task_type=HIGH_PRIORITY_TASK,
                details={"preferences": flagged_preferences},
                status="pending",
                priority="high",
            )
        )

    db.add(
        models.HousekeepingTask(
            reservation_id=reservation.id,
            guest_id=reservation.guest_id,
            room_number=reservation.room_number,
            task_type=WELCOME_AMENITY_TASK,
            details={"message": "Prepare and deliver the welcome amenity."},
            status="pending",
            priority="normal",
        )
    )

    db.commit()
    db.refresh(reservation)
    return CheckInWorkflowResult(
        reservation=reservation,
        tasks=_tasks_for_reservation(db, reservation.id),
        transitioned=True,
    )


def update_task_status(
    db: Session,
    task_id: str,
    status: str,
) -> models.HousekeepingTask | None:
    task = db.query(models.HousekeepingTask).filter(models.HousekeepingTask.id == task_id).first()
    if task is None:
        return None

    task.status = status
    task.completed_at = datetime.now(UTC) if status == "completed" else None
    db.commit()
    db.refresh(task)
    return task