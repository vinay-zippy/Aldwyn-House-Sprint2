from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.rag import ask_assistant


router = APIRouter(
    prefix="/api/v1/assistant",
    tags=["assistant"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    answer = ask_assistant(request.message)

    return ChatResponse(answer=answer)
