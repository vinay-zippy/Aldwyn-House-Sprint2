from fastapi import APIRouter, Depends, HTTPException
from pymongo.collection import Collection
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.matching import generate_recommendations
from app.mongo import get_preferences_collection

router = APIRouter(prefix="/api/v1/guests", tags=["amenities"])


@router.get(
    "/{guest_id}/amenity-recommendations",
    response_model=list[schemas.AmenityRecommendation],
)
def get_amenity_recommendations(
    guest_id: str,
    property_id: str | None = None,
    db: Session = Depends(get_db),
    prefs_collection: Collection = Depends(get_preferences_collection),
):
    """Rule-based amenity recommendations for a guest (Story 4).

    Recommendations are informational for hotel staff only - always marked
    `pending_staff_review` - and are never presented to the guest directly.
    """
    guest = crud.get_guest(db, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    prefs_doc = prefs_collection.find_one({"guest_id": guest_id}) or {}
    amenities = crud.list_amenities(db, property_id=property_id)
    review_statuses = {
        review.amenity_id: review.status.value
        for review in crud.list_recommendation_reviews(db, guest_id)
    }

    matches = generate_recommendations(prefs_doc, amenities)

    return [
        schemas.AmenityRecommendation(
            amenity=schemas.AmenityOut.model_validate(match.amenity),
            matched_terms=match.matched_terms,
            status=review_statuses.get(match.amenity.id, "pending_staff_review"),
        )
        for match in matches
    ]


@router.post(
    "/{guest_id}/amenity-recommendations/{amenity_id}/review",
    response_model=schemas.RecommendationReviewOut,
)
def review_amenity_recommendation(
    guest_id: str,
    amenity_id: str,
    payload: schemas.RecommendationReviewUpdate,
    db: Session = Depends(get_db),
):
    """Persist a staff decision before a recommendation can be presented."""
    if not crud.get_guest(db, guest_id):
        raise HTTPException(status_code=404, detail="Guest not found")
    amenity = db.query(models.Amenity).filter_by(id=amenity_id).first()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")
    return crud.save_recommendation_review(db, guest_id, amenity_id, payload.status)
