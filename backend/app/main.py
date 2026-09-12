from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import amenities, availability, folios, guests, reservations
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.testing:
        Base.metadata.create_all(bind=engine)
        if settings.seed_on_startup:
            seed_if_empty()
    yield


app = FastAPI(
    title="The Aldwyn House - Sprint 2: Guest 360 Dashboard & AI-Assisted Preference Matching",
    description=(
        "Backend API for The Aldwyn House Sprint 2 Guest 360 Dashboard and "
        "AI-assisted guest preference matching."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservations.router)
app.include_router(guests.router)
app.include_router(folios.router)
app.include_router(availability.router)
app.include_router(amenities.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
