from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.auth import UserRole, require_roles
from app.database import get_db

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[schemas.NotificationOut])
def list_current_user_notifications(
    db: Session = Depends(get_db),
    user=Depends(require_roles(UserRole.FRONT_DESK, UserRole.HOUSEKEEPING)),
):
    role = getattr(user.role, "value", user.role) if user else UserRole.FRONT_DESK.value
    return crud.list_notifications(db, role)