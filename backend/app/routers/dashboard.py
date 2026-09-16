from fastapi import APIRouter, Depends
from pymongo.collection import Collection
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.mongo import get_preferences_collection
from app.auth import UserRole, require_roles

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"], dependencies=[Depends(require_roles(UserRole.FRONT_DESK))])


@router.get("/summary", response_model=schemas.DashboardSummaryOut)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    prefs_collection: Collection = Depends(get_preferences_collection),
):
    return crud.get_dashboard_summary(db, prefs_collection)
