# Aldwyn House Sprint 2 - Technical Documentation

## 1. Project Overview

This repository is the backend starter baseline for **The Aldwyn House** team in
the Meridian Hospitality Group ADM case study. It provides a working,
containerized reservation-management REST API that later sprint work should
extend with Aldwyn House-specific capabilities.

The baseline is intentionally shared among five Meridian teams. The six agreed
API endpoints and the core reservation, guest, and folio data model are fixed;
Aldwyn House functionality belongs in additive models, schemas, and routers.

### Current scope

| Area | Current implementation |
|---|---|
| API | FastAPI application under `backend/app` |
| Relational data | PostgreSQL in local Docker deployments; SQLite in tests |
| Document data | MongoDB guest-preference documents |
| Container runtime | Docker Compose with backend, PostgreSQL, and MongoDB |
| Demo setup | Startup seeding of one property, guest, reservation, folio, and preference document |
| Frontend | Not included; a React client is planned to consume this API |
| Aldwyn House domain extensions | Not implemented in this repository yet; the brief names `GuestPreferenceProfile`, `ConciergeRequest`, and `Amenity` as expected additions |

## 2. Technology Stack

| Concern | Technology | Notes |
|---|---|---|
| Runtime | Python 3.12+ | Declared in `backend/pyproject.toml` |
| Web framework | FastAPI 0.141.1 | Serves REST endpoints and OpenAPI docs |
| ASGI server | Uvicorn 0.52.4 | Runs on port 8000 in Docker |
| ORM | SQLAlchemy 2.0.52 | Maps relational models and manages sessions |
| SQL database | PostgreSQL 16 Alpine | Transactional production/development datastore |
| Document database | MongoDB 7 | Semi-structured guest preference data |
| Validation | Pydantic 2.13.5 and pydantic-settings | API schemas and environment configuration |
| Dependency manager | uv | Lockfile is `backend/uv.lock` |
| Tests | pytest 9.1.1 with FastAPI TestClient | Uses in-memory SQLite and a fake Mongo collection |
| Linting | Ruff 0.16.5 | Checks `app` and `tests` |

## 3. Repository Layout

```text
.
├── README.md                     Shared baseline overview and quickstart
├── PROJECT_DOCUMENTATION.md       This complete technical guide
├── docker-compose.yml            PostgreSQL, MongoDB, and backend services
├── Makefile                      Common local-development commands
└── backend/
    ├── Dockerfile                Python/uv backend image definition
    ├── pyproject.toml            Python dependencies and tool configuration
    ├── uv.lock                   Locked Python dependency graph
    ├── app/
    │   ├── config.py             Environment-backed application settings
    │   ├── database.py           SQLAlchemy engine, base class, and session dependency
    │   ├── mongo.py              MongoDB client and preferences-collection dependency
    │   ├── models.py             SQLAlchemy entities and status enums
    │   ├── schemas.py            Pydantic request and response contracts
    │   ├── crud.py               Reusable relational data access functions
    │   ├── seed.py               Idempotent demo-data seeding
    │   ├── main.py               FastAPI application, CORS, routers, lifespan
    │   └── routers/
    │       ├── reservations.py   Reservation list, detail, and creation endpoints
    │       ├── guests.py         Guest profile and preference retrieval endpoint
    │       ├── folios.py         Folio retrieval endpoint
    │       └── availability.py   Rate-plan availability endpoint
    └── tests/
        ├── conftest.py           SQLite/Mongo test doubles and dependency overrides
        ├── factories.py          Reusable ORM object builders
        ├── test_health.py        Health endpoint coverage
        ├── test_reservations.py  Reservation behavior coverage
        ├── test_guests.py        Guest/preference merge coverage
        ├── test_folios.py        Folio retrieval coverage
        ├── test_availability.py  Availability behavior coverage
        └── test_seed.py          Seed contents and idempotency coverage
```

## 4. System Architecture

```mermaid
flowchart LR
    Client[React frontend or API client] -->|HTTP / JSON| API[FastAPI backend :8000]
    API --> Routers[Resource routers]
    Routers --> CRUD[CRUD functions]
    CRUD --> SQLAlchemy[SQLAlchemy]
    SQLAlchemy --> Postgres[(PostgreSQL)]
    Routers --> MongoDependency[Preferences collection dependency]
    MongoDependency --> Mongo[(MongoDB)]
    API --> OpenAPI[/docs and /openapi.json/]
```

### Request lifecycle

1. A client sends a request to FastAPI.
2. The matched router validates path, query, and body values using Pydantic and
   FastAPI type declarations.
3. Routers obtain a request-scoped SQLAlchemy session through `get_db`.
4. Relational reads and writes go through `crud.py`.
5. The guest-detail route additionally gets the Mongo
   `guest_preferences` collection through dependency injection.
6. The router returns a Pydantic response model, which serializes ORM data to
   JSON.

### Application startup

Outside test mode, the FastAPI lifespan function:

1. Creates all SQLAlchemy tables using `Base.metadata.create_all`.
2. Runs `seed_if_empty()` when `SEED_ON_STARTUP` is true.
3. Never seeds in test mode (`TESTING=true`), allowing tests to control their
   own temporary database.

There is no migration framework in the current codebase. Schema changes are
created by `create_all`, which is suitable for the starter baseline but does not
apply managed migrations to an existing production database.

## 5. Data Model

All relational primary keys are UUID4 strings stored in `String(36)` columns.
This choice keeps the same model definitions compatible with PostgreSQL and the
SQLite test database. `created_at` and `placed_at` use timezone-aware UTC
timestamps.

```mermaid
erDiagram
    GUEST ||--o{ RESERVATION : makes
    PROPERTY ||--o{ RATE_PLAN : offers
    PROPERTY ||--o{ RESERVATION : receives
    RATE_PLAN ||--o{ RESERVATION : prices
    RESERVATION ||--o| FOLIO : has
    PROPERTY ||--o{ ORDER : receives
    GUEST o|--o{ ORDER : may_place

    GUEST {
        string id PK
        string name
        string email UK
        string phone
        string loyalty_tier
        datetime created_at
    }
    PROPERTY {
        string id PK
        string name
        string brand
        string address
        string timezone
    }
    RATE_PLAN {
        string id PK
        string property_id FK
        string name
        decimal nightly_rate
        string cancellation_policy
    }
    RESERVATION {
        string id PK
        string guest_id FK
        string property_id FK
        string rate_plan_id FK
        date check_in
        date check_out
        enum status
    }
    FOLIO {
        string id PK
        string reservation_id FK_UK
        json line_items
        decimal balance
        enum status
    }
    ORDER {
        string id PK
        string property_id FK
        string guest_id FK
        json items
        decimal total
        datetime placed_at
    }
```

### Relational entities

| Entity | Required fields | Optional/defaulted fields | Relationships |
|---|---|---|---|
| `Guest` | `name`, unique `email` | `phone`; `loyalty_tier=standard`; `created_at=UTC now` | Has many reservations |
| `Property` | `name`, `brand` | `address`; `timezone=UTC` | Has many rate plans and reservations |
| `RatePlan` | `property_id`, `name`, `nightly_rate` | `cancellation_policy` | Belongs to a property; has many reservations |
| `Reservation` | `guest_id`, `property_id`, `check_in`, `check_out` | `rate_plan_id`; `status=confirmed` | Belongs to guest/property/rate plan; has at most one folio |
| `Folio` | `reservation_id`, `line_items`, `balance` | `status=open` | One folio per reservation; enforced by unique `reservation_id` |
| `Order` | `property_id`, `items`, `total` | `guest_id`; `placed_at=UTC now` | Model exists but no endpoint currently exposes it |

### Status values

| Enum | Allowed values |
|---|---|
| `ReservationStatus` | `confirmed`, `checked_in`, `checked_out`, `cancelled` |
| `FolioStatus` | `open`, `settled`, `disputed` |

### MongoDB guest preferences

The `guest_preferences` collection uses documents shaped as follows:

```json
{
  "guest_id": "UUID string",
  "dietary": ["vegetarian"],
  "room_preferences": ["high floor", "away from elevator"],
  "notes": ["Celebrating anniversary - welcome note requested"],
  "updated_at": "ISO-8601 UTC timestamp"
}
```

Only `dietary`, `room_preferences`, and `notes` are returned by the existing
guest-detail API. Missing preference documents are valid and return three empty
arrays.

## 6. API Reference

Base URL: `http://localhost:8000`

Interactive API documentation: `GET /docs`

| Method | Path | Purpose | Success response |
|---|---|---|---|
| `GET` | `/health` | Service health check | `200 {"status":"ok"}` |
| `GET` | `/api/v1/reservations` | List reservations with optional filters | `200 ReservationOut[]` |
| `GET` | `/api/v1/reservations/{reservation_id}` | Get a reservation, guest, and optional folio | `200 ReservationDetail` |
| `POST` | `/api/v1/reservations` | Create a reservation | `201 ReservationOut` |
| `GET` | `/api/v1/guests/{guest_id}` | Get a guest merged with Mongo preferences | `200 GuestDetail` |
| `GET` | `/api/v1/folios/{folio_id}` | Get a folio and its line items | `200 FolioOut` |
| `GET` | `/api/v1/availability` | Get per-rate-plan availability for a date range | `200 AvailabilitySlot[]` |

### Reservation list

`GET /api/v1/reservations`

| Query parameter | Type | Behavior |
|---|---|---|
| `property_id` | string | Limits rows to that property |
| `status` | reservation status enum | Limits rows to that status |
| `date_from` | ISO date | Includes reservations where `check_out >= date_from` |
| `date_to` | ISO date | Includes reservations where `check_in <= date_to` |

Results are ordered by `check_in` ascending. Supplying both dates therefore
selects reservations that overlap the inclusive query window.

### Reservation creation

`POST /api/v1/reservations`

```json
{
  "guest_id": "existing guest UUID",
  "property_id": "property UUID",
  "rate_plan_id": "rate plan UUID or null",
  "check_in": "2026-10-01",
  "check_out": "2026-10-04",
  "status": "confirmed"
}
```

`guest_id` is the only relationship verified by this route before creation. An
unknown guest returns `400`. The current baseline does not verify that the
property or rate plan exists, that a rate plan belongs to the property, that
dates form a valid range, or that capacity remains before saving a reservation.

### Reservation detail

`GET /api/v1/reservations/{reservation_id}` returns the reservation plus its
relational guest profile and optional folio. Unknown IDs return `404` with
`{"detail":"Reservation not found"}`.

### Guest detail

`GET /api/v1/guests/{guest_id}` returns the relational profile and an embedded
preference object sourced from MongoDB. Unknown guest IDs return `404` with
`{"detail":"Guest not found"}`.

```json
{
  "id": "guest UUID",
  "name": "Jamie Rivera",
  "email": "jamie.rivera@example.com",
  "phone": "+1-555-0100",
  "loyalty_tier": "gold",
  "created_at": "2026-09-10T00:00:00Z",
  "preferences": {
    "dietary": ["vegetarian"],
    "room_preferences": ["high floor"],
    "notes": ["Welcome note requested"]
  }
}
```

### Folio detail

`GET /api/v1/folios/{folio_id}` returns an invoice-like record. Unknown IDs
return `404` with `{"detail":"Folio not found"}`. Decimal values serialize as
JSON strings, for example `"220.00"`.

### Availability

`GET /api/v1/availability?property_id=...&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD`

Both dates and `property_id` are required. Each result represents one rate plan
at the property:

```json
{
  "rate_plan_id": "rate plan UUID",
  "rate_plan_name": "Standard Rate",
  "nightly_rate": "249.00",
  "capacity": 20,
  "booked": 3,
  "available": true
}
```

Availability uses this overlap rule, excluding cancelled reservations:

$$
\operatorname{overlaps}(r, q) = (r.check\_in < q.check\_out) \land (r.check\_out > q.check\_in)
$$

For each rate plan, `available` is true when `booked < DEFAULT_PROPERTY_CAPACITY`.
It returns `400` when `check_out <= check_in`, and `404` if the property has no
rate plans.

## 7. Demo Data

Seeding runs only when the `guests` table is empty, so it is idempotent. It
creates:

| Record | Seeded value |
|---|---|
| Property | Demo Property, Meridian Demo Brand, 1 Harbor View Rd, America/New_York |
| Rate plan | Standard Rate, 249.00 per night, free cancellation up to 48 hours before check-in |
| Guest | Jamie Rivera, `jamie.rivera@example.com`, gold tier |
| Reservation | Confirmed, from three days after seeding through six days after seeding |
| Folio | Three standard-rate nights (747.00) plus 45.00 resort fee; open balance 792.00 |
| Preferences | Vegetarian; high floor and away from elevator; anniversary welcome-note request |

Run it manually from the repository root with `make seed` after services are
started.

## 8. Configuration

The root `.env` file is consumed by Docker Compose and `pydantic-settings`.
It is not committed in this workspace. Create it from the expected variables
below before starting the Docker stack.

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `meridian` | PostgreSQL service user |
| `POSTGRES_PASSWORD` | `meridian` | PostgreSQL service password |
| `POSTGRES_DB` | `meridian` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | Host port for PostgreSQL |
| `MONGO_PORT` | `27017` | Host port for MongoDB |
| `BACKEND_PORT` | `8000` | Host port for FastAPI |
| `DATABASE_URL` | `postgresql+psycopg2://meridian:meridian@postgres:5432/meridian` in Docker | SQLAlchemy connection URL |
| `MONGO_URL` | `mongodb://mongo:27017` in Docker | MongoDB connection URL |
| `MONGO_DB_NAME` | `meridian` | MongoDB database name |
| `SEED_ON_STARTUP` | `true` | Enables startup demo-data seeding |
| `DEFAULT_PROPERTY_CAPACITY` | `20` | Flat capacity used by the availability stub |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | JSON list of allowed browser origins |
| `TESTING` | `false` | Test-only flag that prevents real service access during app startup |

For direct local execution outside Docker, `config.py` defaults `DATABASE_URL`
to a PostgreSQL service at `localhost:5432` and `MONGO_URL` to
`mongodb://localhost:27017`.

## 9. Local Development and Operations

### Prerequisites

- Docker Engine with Docker Compose v2 for the full stack.
- `uv` for local Python dependency management and tests.
- Python 3.12 or newer when running the backend outside Docker.

### Start the full stack

```bash
cp .env.example .env
docker compose up --build
```

The repository currently does not contain `.env.example`, despite the README
referring to it. Until it is added, create `.env` manually using the variables
in the configuration table above, or rely on Docker Compose defaults where
appropriate. The `backend` service still requires the `.env` file because it is
listed under `env_file` in `docker-compose.yml`.

### Make targets

| Command | Action |
|---|---|
| `make up` | Build and start all Compose services |
| `make down` | Stop Compose services |
| `make logs` | Follow Compose logs |
| `make seed` | Run the backend seed module in its container |
| `make sync` | Install/synchronize backend development dependencies with uv |
| `make test` | Synchronize dependencies, then run pytest |
| `make lint` | Synchronize dependencies, then run Ruff |

### Run checks directly

```bash
cd backend
uv sync --group dev
uv run pytest
uv run ruff check app tests
```

The Docker image runs Uvicorn with `--reload` and mounts `./backend/app` into
the container. This is configured for local development, not a production
deployment.

## 10. Test Strategy and Coverage

Tests are isolated from Docker services:

1. `TESTING=true` is set before importing the FastAPI app.
2. SQLAlchemy uses one shared in-memory SQLite connection via `StaticPool`.
3. FastAPI's database dependency is overridden to use the test session.
4. Mongo's preferences dependency is overridden by a dictionary-backed fake
   collection.
5. Database tables are created before and dropped after each `db_session`
   fixture use.

| Test module | Verified behavior |
|---|---|
| `test_health.py` | `/health` returns `200` and `{"status":"ok"}` |
| `test_reservations.py` | Reservation creation, retrieval, list filtering, unknown-guest `400`, and unknown-ID `404` |
| `test_availability.py` | Booked-count response, inverted-range `400`, and no-rate-plan `404` |
| `test_guests.py` | Empty preferences, Mongo preferences merged into profile, and unknown-guest `404` |
| `test_folios.py` | Folio response shape, decimal serialization, and unknown-ID `404` |
| `test_seed.py` | Demo records/preference creation and idempotent reseeding |

## 11. Aldwyn House Extension Plan

The shared contract should remain available unchanged. Add Aldwyn House work as
new domain slices rather than altering baseline semantics.

### Expected domain additions

| Domain capability | Suggested persistence | Integration point |
|---|---|---|
| `GuestPreferenceProfile` | Mongo document or relational entity, depending on query/reporting requirements | Extend preference schema and add an additive profile endpoint |
| `ConciergeRequest` | Relational entity | New router, request/status schemas, links to guest/reservation/property |
| `Amenity` | Relational entity | New router and a relationship to a property or reservation as required by the brief |

### Implementation sequence

1. Define the entity fields, identifiers, constraints, and lifecycle states.
2. Add SQLAlchemy models in `app/models.py` or a dedicated sibling module.
3. Add Pydantic create, update, and response schemas in `app/schemas.py`.
4. Add focused data-access functions in `app/crud.py` or a new domain CRUD module.
5. Implement a new router under `app/routers/` and register it in `app/main.py`.
6. Add SQLite/fake-Mongo tests that use the existing dependency-override style.
7. Add a frontend separately against the additive endpoint contract.

## 12. Current Constraints and Gaps

These are intentional baseline limitations or observable implementation gaps to
plan around during Sprint 2:

| Area | Current state | Implication |
|---|---|---|
| Inventory | One global capacity value is reused for every rate plan | Cannot model room types, individual units, or per-plan capacity without an extension |
| Reservation integrity | Creation validates only `guest_id` | Add validation for property/rate plan existence, ownership, dates, and capacity when business rules require it |
| CRUD surface | No public creation/listing endpoints for guests, properties, rate plans, folios, orders, or preferences | Seed data or direct database setup is currently required before creating reservations |
| Order domain | `Order` model is present but unused by API/CRUD | Requires a new endpoint slice before it is functional |
| Authentication and authorization | Not implemented | Endpoints are currently open to any caller able to reach the service |
| Database migrations | Not implemented | Evolving deployed schemas needs a migration strategy such as Alembic |
| Production runtime | Uses Uvicorn reload and a host source-code volume | Replace development settings for production hosting |
| Environment template | README references `.env.example`, but it is absent | Add a non-secret template before onboarding developers or deployment |
| API versioning | Only `/api/v1` resource routes are versioned; `/health` is root-level | Preserve this distinction or standardize deliberately in a future version |

## 13. Contributor Rules

- Keep `uv.lock` synchronized with `pyproject.toml`; do not edit the lockfile by hand.
- Preserve the existing six baseline resource endpoints and add new endpoints
  for Aldwyn House features.
- Use request-scoped dependencies for external services so tests can override
  them without real infrastructure.
- Keep decimal currency fields as `Numeric(10, 2)` in relational models.
- Add endpoint behavior tests alongside new router functionality.
- Do not place credentials in version control; use `.env` or deployment secrets.

## 14. Useful URLs

| Service | URL |
|---|---|
| API health | `http://localhost:8000/health` |
| OpenAPI UI | `http://localhost:8000/docs` |
| OpenAPI JSON | `http://localhost:8000/openapi.json` |
| PostgreSQL host port | `localhost:5432` by default |
| MongoDB host port | `localhost:27017` by default |