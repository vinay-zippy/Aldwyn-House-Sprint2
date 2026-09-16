from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import UserRole, require_roles
from app.database import get_db
from app.services.check_in_workflow import update_task_status

router = APIRouter(
    prefix="/api/v1/housekeeping/tasks",
    tags=["housekeeping"],
    dependencies=[Depends(require_roles(UserRole.FRONT_DESK, UserRole.HOUSEKEEPING))],
)


@router.get("", response_model=list[schemas.HousekeepingTaskOut])
def list_pending_tasks(db: Session = Depends(get_db)):
    return (
        db.query(models.HousekeepingTask)
        .filter(models.HousekeepingTask.status == "pending")
        .order_by(models.HousekeepingTask.created_at)
        .all()
    )


@router.patch("/{task_id}/status", response_model=schemas.HousekeepingTaskOut)
def set_task_status(
    task_id: str,
    payload: schemas.HousekeepingTaskStatusUpdate,
    db: Session = Depends(get_db),
):
    task = update_task_status(db, task_id, payload.status)
    if task is None:
        raise HTTPException(status_code=404, detail="Housekeeping task not found")
    return task