from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.ai.concierge_agent import handle_concierge_request
from app.auth import UserRole, require_roles
from app.database import get_db

router = APIRouter(
    prefix="/api/v1/concierge",
    tags=["concierge"],
    dependencies=[Depends(require_roles(UserRole.FRONT_DESK))],
)


@router.post(
    "/requests",
    response_model=schemas.ConciergeRequestAgentResponse,
    status_code=201,
)
def create_concierge_request(
    payload: schemas.ConciergeRequestCreate,
    db: Session = Depends(get_db),
):
    result = handle_concierge_request(
        db=db,
        guest_id=payload.guest_id,
        message=payload.message,
    )

    if result.status == "rejected":
        raise HTTPException(status_code=400, detail=result.message)

    return {
        "status": result.status,
        "message": result.message,
        "request_id": result.request.id if result.request else None,
    }
