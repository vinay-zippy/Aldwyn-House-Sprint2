"""
Seeds a small set of demo data so the API is immediately testable after
`docker compose up`.

Run standalone with:
docker compose exec backend python -m app.seed
"""

from datetime import date, timedelta

from app import models
from app.database import SessionLocal
from app.models import utcnow
from app.mongo import get_preferences_collection


def seed_rooms() -> None:
    db = SessionLocal()
    try:
        for floor in range(1, 8):
            for room_index in range(1, 16):
                room_number = f'{floor}{room_index:02d}'
                existing = (
                    db.query(models.Room)
                    .filter(models.Room.room_number == room_number)
                    .first()
                )
                if existing is None:
                    db.add(
                        models.Room(
                            room_number=room_number,
                            floor=str(floor),
                            status=models.RoomStatus.available,
                            room_type='standard',
                        )
                    )
        db.commit()
    finally:
        db.close()

def seed_if_empty() -> None:
    seed_rooms()

    db = SessionLocal()

    try:
        if db.query(models.Guest).count() > 0:
            return

        # Property
        property_ = models.Property(
            name="Demo Property",
            brand="Meridian Demo Brand",
            address="1 Harbor View Rd",
            timezone="America/New_York",
        )
        db.add(property_)
        db.flush()

        # Rate plan
        rate_plan = models.RatePlan(
            property_id=property_.id,
            name="Standard Rate",
            nightly_rate=249.00,
            cancellation_policy="Free cancellation up to 48h before check-in",
        )
        db.add(rate_plan)
        db.flush()

        # Guests
        guest_data = [
            {
                "name": "Jamie Rivera",
                "email": "jamie.rivera@example.com",
                "phone": "+1-555-0100",
                "loyalty_tier": "gold",
                "preferences": {
                    "dietary": [
                        {"value": "vegetarian", "priority": "high"}
                    ],
                    "room_preferences": [
                        {"value": "high floor", "priority": "normal"},
                        {"value": "away from elevator", "priority": "high"},
                    ],
                    "notes": [
                        {
                            "value": "Celebrating anniversary - welcome note requested",
                            "priority": "normal",
                        }
                    ],
                },
            },
            {
                "name": "Emma Wilson",
                "email": "emma.wilson@example.com",
                "phone": "+1-555-0101",
                "loyalty_tier": "silver",
                "preferences": {
                    "dietary": [
                        {"value": "gluten free", "priority": "high"}
                    ],
                    "room_preferences": [
                        {"value": "near elevator", "priority": "normal"}
                    ],
                    "notes": [],
                },
            },
            {
                "name": "Daniel Smith",
                "email": "daniel.smith@example.com",
                "phone": "+1-555-0102",
                "loyalty_tier": "platinum",
                "preferences": {
                    "dietary": [
                        {"value": "no preference", "priority": "normal"}
                    ],
                    "room_preferences": [
                        {"value": "king bed", "priority": "normal"}
                    ],
                    "notes": [
                        {
                            "value": "Late checkout requested",
                            "priority": "normal",
                        }
                    ],
                },
            },
            {
                "name": "Sophia Brown",
                "email": "sophia.brown@example.com",
                "phone": "+1-555-0103",
                "loyalty_tier": "gold",
                "preferences": {
                    "dietary": [],
                    "room_preferences": [],
                    "notes": [],
                },
            },
        ]

        for index, data in enumerate(guest_data):

            guest = models.Guest(
                name=data["name"],
                email=data["email"],
                phone=data["phone"],
                loyalty_tier=data["loyalty_tier"],
            )

            db.add(guest)
            db.flush()

            # Reservation
            reservation = models.Reservation(
                guest_id=guest.id,
                property_id=property_.id,
                rate_plan_id=rate_plan.id,
                check_in=date.today() + timedelta(days=3 + index),
                check_out=date.today() + timedelta(days=6 + index),
                room_number=f"{index + 1}01",
                status=models.ReservationStatus.confirmed,
            )

            db.add(reservation)
            db.flush()

            if index == 0:
                db.add(
                    models.ConciergeRequest(
                        guest_id=guest.id,
                        request="Extra pillows",
                        status="completed",
                    )
                )

            # Folio
            folio = models.Folio(
                reservation_id=reservation.id,
                line_items=[
                    {
                        "description": "3 nights - Standard Rate",
                        "amount": 747.00,
                    },
                    {
                        "description": "Resort fee",
                        "amount": 45.00,
                    },
                ],
                balance=792.00,
                status=models.FolioStatus.open,
            )

            db.add(folio)

            # Mongo preferences
            get_preferences_collection().update_one(
                {"guest_id": guest.id},
                {
                    "$set": {
                        "guest_id": guest.id,
                        **data["preferences"],
                        "updated_at": utcnow().isoformat(),
                    }
                },
                upsert=True,
            )

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

    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
    print("Seed complete (or already seeded).")