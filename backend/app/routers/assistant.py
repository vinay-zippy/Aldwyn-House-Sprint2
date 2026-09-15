from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.rag import ask_assistant
from app.auth import UserRole, require_roles
from app.database import get_db

router = APIRouter(
    prefix="/api/v1/assistant",
    tags=["assistant"],
    dependencies=[Depends(require_roles(UserRole.FRONT_DESK, UserRole.HOUSEKEEPING))],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    history = [
        {
            "role": item.role,
            "content": item.content,
        }
        for item in request.history
    ]

    answer = ask_assistant(
        request.message,
        history,
        db,
    )

    return ChatResponse(answer=answer)
