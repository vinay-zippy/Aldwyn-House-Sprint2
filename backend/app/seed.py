"""
Seeds a small set of demo data so the API is immediately testable after
`docker compose up`. Safe to re-run: only seeds when the guests table is empty.

Run standalone with:  docker compose exec backend python -m app.seed
"""

from datetime import date, timedelta

from app import models
from app.database import SessionLocal
from app.models import utcnow
from app.mongo import get_preferences_collection


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(models.Guest).count() > 0:
            return

        property_ = models.Property(
            name="Demo Property",
            brand="Meridian Demo Brand",
            address="1 Harbor View Rd",
            timezone="America/New_York",
        )
        db.add(property_)
        db.flush()

        rate_plan = models.RatePlan(
            property_id=property_.id,
            name="Standard Rate",
            nightly_rate=249.00,
            cancellation_policy="Free cancellation up to 48h before check-in",
        )
        db.add(rate_plan)
        db.flush()

        guest = models.Guest(
            name="Jamie Rivera",
            email="jamie.rivera@example.com",
            phone="+1-555-0100",
            loyalty_tier="gold",
        )
        db.add(guest)
        db.flush()

        reservation = models.Reservation(
            guest_id=guest.id,
            property_id=property_.id,
            rate_plan_id=rate_plan.id,
            check_in=date.today() + timedelta(days=3),
            check_out=date.today() + timedelta(days=6),
            status=models.ReservationStatus.confirmed,
        )
        db.add(reservation)
        db.flush()

        folio = models.Folio(
            reservation_id=reservation.id,
            line_items=[
                {"description": "3 nights - Standard Rate", "amount": 747.00},
                {"description": "Resort fee", "amount": 45.00},
            ],
            balance=792.00,
            status=models.FolioStatus.open,
        )
        db.add(folio)

        db.add_all(
            [
                models.Amenity(
                    property_id=property_.id,
                    name="Sunset Grill",
                    category=models.AmenityCategory.dining,
                    description="On-site restaurant with vegetarian and vegan menus",
                    tags=["vegetarian", "vegan", "dining"],
                ),
                models.Amenity(
                    property_id=property_.id,
                    name="Serenity Spa",
                    category=models.AmenityCategory.spa,
                    description="Full-service spa offering massage and wellness treatments",
                    tags=["wellness", "massage", "spa"],
                ),
                models.Amenity(
                    property_id=property_.id,
                    name="Harbor Walking Tour",
                    category=models.AmenityCategory.local_experience,
                    description="Guided local sightseeing tour of the harbor district",
                    tags=["local", "tour", "sightseeing"],
                ),
            ]
        )

        db.commit()

        get_preferences_collection().update_one(
            {"guest_id": guest.id},
            {
                "$set": {
                    "guest_id": guest.id,
                    "dietary": ["vegetarian"],
                    "room_preferences": ["high floor", "away from elevator"],
                    "high_priority": ["away from elevator"],
                    "notes": ["Celebrating anniversary - welcome note requested"],
                    "updated_at": utcnow().isoformat(),
                }
            },
            upsert=True,
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
    print("Seed complete (or already seeded).")
