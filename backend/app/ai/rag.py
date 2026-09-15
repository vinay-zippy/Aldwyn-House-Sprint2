import re

from sqlalchemy.orm import Session

from app import crud, models
from app.ai.llm import get_llm
from app.ai.retriever import get_retriever

SYSTEM_PROMPT = """You are the Aldwyn House AI Concierge.

Answer the user's question using only the hotel information provided in the
hotel knowledge context and the conversation history.

Rules:
- Answer only what the user is asking.
- Do not add unrelated hotel information or timings.
- Use conversation history to understand follow-up questions.
- Do not invent hotel policies, timings, prices, contact details, or services.
- Do not claim that you can book, connect, call, message, or pass information
  to hotel staff unless the context explicitly says you can.
- If the requested information is not available in the hotel knowledge,
  say exactly:
  "I don't have that information in the hotel knowledge base."
- Keep answers clear, short, and helpful.
"""


def _room_status_value(room: models.Room) -> str:
    return getattr(room.status, "value", room.status)


def _live_room_answer(question: str, db: Session) -> str | None:
    normalized_question = question.lower()
    room_match = re.search(r"\broom\s+(\d+)\b", normalized_question)
    if room_match is None:
        room_match = re.search(
            r"\b(?:status|availability|type|floor)\s+(?:of\s+)?(\d+)\b",
            normalized_question,
        )
    has_room_reference = room_match is not None or re.search(
        r"\brooms?\b", normalized_question
    )
    is_room_question = bool(
        has_room_reference
        and re.search(
            r"\b(?:status|availability|clean|dirty|maintenance|available|occupied|"
            r"type|floor|cleaning|inspection|reserved)\b|"
            r"\b(?:out of service|under maintenance)\b",
            normalized_question,
        )
    )
    if not is_room_question:
        return None

    if room_match:
        room_number = room_match.group(1)
        room = crud.get_room(db, room_number)
        if room is None:
            return f"Room {room_number} could not be found."

        status = _room_status_value(room)
        if "type" in normalized_question:
            return f"Room {room_number} is a {room.room_type} room."
        if "floor" in normalized_question:
            return f"Room {room_number} is on floor {room.floor}."
        if "clean" in normalized_question and "dirty" not in normalized_question:
            if status == "ready":
                return f"Yes, room {room_number} is currently ready and clean."
            if status == "dirty":
                return f"No, room {room_number} is currently marked as dirty."
        if "available" in normalized_question:
            if status == "available":
                return f"Yes, room {room_number} is currently available."
            return f"No, room {room_number} is currently {status.replace('_', ' ')}."
        if "maintenance" in normalized_question:
            if status == "maintenance":
                return f"Room {room_number} is currently under maintenance."
            return f"No, room {room_number} is currently {status.replace('_', ' ')}."
        return f"Room {room_number} is currently {status.replace('_', ' ')}."

    status_terms = (
        ("maintenance", "maintenance"),
        ("dirty", "dirty"),
        ("clean", "ready"),
        ("available", "available"),
        ("occupied", "occupied"),
        ("reserved", "reserved"),
        ("cleaning", "cleaning"),
        ("inspection", "inspection_pending"),
        ("out of service", "out_of_service"),
    )
    requested_status = next(
        (status for term, status in status_terms if term in normalized_question),
        None,
    )
    if requested_status is None:
        return "Please specify a room number or room status."

    rooms = [
        room
        for room in crud.list_rooms(db)
        if _room_status_value(room) == requested_status
    ]
    room_numbers = [room.room_number for room in rooms]
    if not room_numbers:
        return f"There are currently no rooms marked as {requested_status.replace('_', ' ')}."
    return f"Rooms marked as {requested_status.replace('_', ' ')}: {', '.join(room_numbers)}."


def ask_assistant(
    question: str,
    history: list[dict[str, str]] | None = None,
    db: Session | None = None,
) -> str:
    if db is not None:
        live_answer = _live_room_answer(question, db)
        if live_answer is not None:
            return live_answer

    retriever = get_retriever()

    history = history or []

    # Retrieve using only the current question so unrelated conversation
    # history doesn't pull in irrelevant hotel knowledge chunks.
    documents = retriever.invoke(question)

    context = "\n\n".join(
        document.page_content for document in documents
    )

    conversation = "\n".join(
        f"{item['role']}: {item['content']}"
        for item in history[-6:]
    )

    prompt = f"""{SYSTEM_PROMPT}

Hotel knowledge:
{context}

Conversation history:
{conversation if conversation else "No previous conversation."}

Current user question:
{question}

Answer:"""

    llm = get_llm()
    response = llm.invoke(prompt)

    return response.content
