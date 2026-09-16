from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app import models


@dataclass
class ConciergeResult:
    status: str
    message: str
    request: models.ConciergeRequest | None = None


def _interpret_request(message: str) -> str:
    """Normalize common routine concierge requests."""
    text = message.strip().lower()

    if "late check" in text:
        return "Late check-out"

    if "extra pillow" in text or "extra pillows" in text:
        return "Extra pillows"

    if "early check" in text:
        return "Early check-in"

    return message.strip()


def _find_active_reservation(
    db: Session,
    guest_id: str,
    today: date,
) -> models.Reservation | None:
    return (
        db.query(models.Reservation)
        .filter(
            models.Reservation.guest_id == guest_id,
            models.Reservation.status.in_(
                [
                    models.ReservationStatus.confirmed,
                    models.ReservationStatus.checked_in,
                ]
            ),
            models.Reservation.check_in <= today,
            models.Reservation.check_out >= today,
        )
        .order_by(models.Reservation.check_in.desc())
        .first()
    )


def handle_concierge_request(
    db: Session,
    guest_id: str,
    message: str,
) -> ConciergeResult:
    """Process one routine concierge request and stop after creating it."""

    if not message or not message.strip():
        return ConciergeResult(
            status="rejected",
            message="Please provide a concierge request.",
        )

    reservation = _find_active_reservation(db, guest_id, date.today())

    if reservation is None:
        return ConciergeResult(
            status="rejected",
            message="No active reservation was found for this guest.",
        )

    interpreted_request = _interpret_request(message)

    concierge_request = models.ConciergeRequest(
        guest_id=guest_id,
        request=interpreted_request,
        status="pending",
    )

    db.add(concierge_request)
    db.commit()
    db.refresh(concierge_request)

    return ConciergeResult(
        status="created",
        message=f"Concierge request created: {interpreted_request}.",
        request=concierge_request,
    )
