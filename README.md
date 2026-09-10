# Meridian Hospitality Group — Shared Starter Baseline

This is the shared starter baseline described in **Section 2** of the ADM Training
Case Study: the common foundation all five Meridian Hospitality Group cohort teams
(The Aldwyn House, Meridian Resorts & Spa, Meridian Kitchens Collective, Meridian
Stays, Meridian Residences) build on from Day 10 onward.

It ships the already-agreed data model, REST API contract, and a working Docker /
docker-compose setup, so no team needs to redesign the core reservation / guest /
folio system or write container packaging from scratch — extend it with your
team's vertical-specific entities (Section 4 of your brief) instead.

**Frontend note:** the React frontend is intentionally not scaffolded here — it'll
be built separately against this API.

## What's included

- FastAPI REST API implementing the 6 baseline endpoints (Section 2.3)
- PostgreSQL for transactional data (Guest, Property, RatePlan, Reservation, Folio, Order)
- MongoDB for semi-structured guest preference documents
- docker-compose wiring Postgres + Mongo + the API together, with a seed script for demo data
- A pytest suite (SQLite-backed, no Docker needed) as a pattern for the CI/CD build → lint → test gates in the Final Sprint
- Dependencies managed by [uv](https://docs.astral.sh/uv/) — `pyproject.toml` + a committed `uv.lock`, no `requirements.txt`

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000 (interactive docs at `/docs`)
- Health check: http://localhost:8000/health

On first boot the backend auto-creates tables and seeds one demo property, guest,
reservation, and folio (toggle via `SEED_ON_STARTUP` in `.env`). Re-seed manually
any time with:

```bash
make seed
# or: docker compose exec backend python -m app.seed
```

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI app + startup (create tables, seed)
│   │   ├── config.py        Settings from environment variables
│   │   ├── database.py      SQLAlchemy engine/session (Postgres)
│   │   ├── mongo.py         Mongo client (guest preference docs)
│   │   ├── models.py        SQLAlchemy models — the Core Data Model
│   │   ├── schemas.py       Pydantic request/response schemas
│   │   ├── crud.py          DB access functions
│   │   ├── seed.py          Demo data seeding
│   │   └── routers/         One file per API resource
│   ├── tests/                pytest suite (SQLite, no Docker required)
│   ├── pyproject.toml        Dependencies + dev-dependencies + ruff/pytest config
│   └── uv.lock                Locked dependency versions (committed — don't hand-edit)
├── docker-compose.yml        Postgres + Mongo + backend
└── .env.example               All environment variables, copy to .env
```

## Core data model (Section 2.2)

| Entity | Key fields | Notes |
|---|---|---|
| Guest | id, name, email, phone, loyalty_tier, created_at | Core guest profile |
| Property | id, name, brand, address, timezone | A physical hotel / restaurant / unit / building |
| Reservation | id, guest_id, property_id, check_in, check_out, status, rate_plan_id | Core booking record |
| RatePlan | id, property_id, name, nightly_rate, cancellation_policy | Pricing rules |
| Folio | id, reservation_id, line_items[], balance, status | Guest bill / invoice |
| Order | id, property_id, guest_id (nullable), items[], total, placed_at | F&B order at an outlet |

## API contract (Section 2.3)

| Method & path | Purpose |
|---|---|
| `GET /api/v1/reservations` | List/filter by `property_id`, `status`, `date_from`, `date_to` |
| `GET /api/v1/reservations/{id}` | Reservation + guest + folio detail |
| `POST /api/v1/reservations` | Create a reservation |
| `GET /api/v1/guests/{id}` | Guest profile + preference document (Mongo) |
| `GET /api/v1/folios/{id}` | Folio + line items |
| `GET /api/v1/availability` | Availability by `property_id` + date range |

This is the contract as agreed — treat it as fixed. If your brief needs more (e.g.
listing properties, creating guests), add new endpoints rather than changing these.

## Extending for your team's brief

Each brief (Section 4) adds 2–4 vertical-specific entities on top of this baseline
— e.g. Team 1 (The Aldwyn House) adds `GuestPreferenceProfile`, `ConciergeRequest`,
`Amenity`. To extend:

1. Add SQLAlchemy models to `backend/app/models.py` (or a new module) and Pydantic
   schemas to `schemas.py`.
2. Add a new router under `backend/app/routers/` and register it in `main.py`.
3. Build your React frontend against the resulting endpoints.

Don't redesign the six existing endpoints or the Docker packaging — build on top.

## Availability endpoint — a note

The Core Data Model has no inventory/capacity entity (that's vertical-specific —
e.g. Team 2's `MultiPropertyInventory`, Team 4's `UnitListing` calendars).
`GET /api/v1/availability` therefore ships as a deliberately simple stub: it
compares reservations booked against a flat `DEFAULT_PROPERTY_CAPACITY` per rate
plan. Replace this with your brief's real inventory logic in Sprint 2/3.

## Running tests

Dependencies are managed with [uv](https://docs.astral.sh/uv/) — install it once
([docs](https://docs.astral.sh/uv/getting-started/installation/)), then:

```bash
cd backend
uv sync --group dev   # creates backend/.venv from pyproject.toml + uv.lock
uv run pytest
uv run ruff check app tests
```

(`make test` / `make lint` from the repo root do the same thing.) Tests run
against an in-memory SQLite database and a fake Mongo collection, both swapped in
via FastAPI dependency overrides — no Postgres/Mongo/Docker required.

To add or upgrade a dependency: `uv add <package>` (or `uv add --group dev
<package>` for a dev-only one) from `backend/`, then commit the updated
`pyproject.toml` and `uv.lock` together. Don't hand-edit `uv.lock`.

## Stack (Section 2.4)

- Backend: Python (FastAPI) REST API, dependencies managed by uv
- Databases: PostgreSQL (transactional) + MongoDB (guest preference documents)
- Frontend: React with hooks + Axios (to be added separately)
- Packaging: Docker (installs via `uv sync --frozen` from `uv.lock`) + docker-compose
  (this repo); Sprint 2 adds manual deploys to AWS EC2 and Azure App Service; the
  Final Sprint automates that into a CI/CD pipeline

## Environment variables

See `.env.example` for the full list (Postgres/Mongo credentials, `DATABASE_URL`,
`MONGO_URL`, `SEED_ON_STARTUP`, etc.).
