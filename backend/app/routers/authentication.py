from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import UserRole, create_access_token, verify_password
from app.database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    role = getattr(user.role, "value", user.role)
    return schemas.LoginResponse(
        access_token=create_access_token(user.id, UserRole(role)),
        role=role,
        username=user.username,
    )