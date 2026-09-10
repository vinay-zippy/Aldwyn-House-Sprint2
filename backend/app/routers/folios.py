from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/v1/folios", tags=["folios"])


@router.get("/{folio_id}", response_model=schemas.FolioOut)
def get_folio(folio_id: str, db: Session = Depends(get_db)):
    folio = crud.get_folio(db, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio not found")
    return folio
