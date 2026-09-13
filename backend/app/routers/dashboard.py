from fastapi import APIRouter, Depends
from pymongo.collection import Collection
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.mongo import get_preferences_collection

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummaryOut)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    prefs_collection: Collection = Depends(get_preferences_collection),
):
    return crud.get_dashboard_summary(db, prefs_collection)
