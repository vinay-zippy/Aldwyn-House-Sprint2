# Story 4 Status - September 11, 2026

## Story

**Match Guest Preferences to Hotel Amenities**

As a concierge, the system matches sanitized guest preferences with the hotel's available amenity catalogue so staff can review personalized recommendations efficiently.

## Implemented

### Matching engine

Implemented in `backend/app/matching.py`:

- Accepts sanitized guest preference attributes and an Amenity catalogue.
- Uses configured, deterministic rule-based matching.
- Supports these amenity categories:
  - Dining
  - Spa
  - Local experiences
- Returns an amenity only when a configured preference term or amenity tag matches.
- Returns an empty recommendation list when no rule matches.
- Does not invent or fabricate amenities.

### PII protection

`sanitize_guest_preferences` uses an allowlist of preference fields:

- `dietary`
- `room_preferences`
- `notes`
- `interests`

Guest `name`, `email`, `phone`, payment information, and `reservation_id` are not accepted as matching fields and cannot reach the matching prompt. Invalid preference input raises `SanitizationError` instead of returning partial data.

The optional LLM integration receives only the sanitized preference data and the non-PII Amenity catalogue. If sanitization raises an error, the LLM callable is not invoked.

No third-party LLM or recommendation service is used. The production path is rule-based.

### Amenity data and API

Implemented:

- `AmenityCategory` enum and `Amenity` SQLAlchemy model.
- Active Amenity catalogue lookup in `backend/app/crud.py`.
- Amenity response and staff-review recommendation schemas in `backend/app/schemas.py`.
- Demo Dining, Spa, and Local experience amenities in `backend/app/seed.py`.
- Endpoint:

```text
GET /api/v1/guests/{guest_id}/amenity-recommendations
```

Optional query parameter:

```text
property_id=<property UUID>
```

Each returned recommendation has:

```json
{
  "amenity": {
    "id": "...",
    "name": "Serenity Spa",
    "category": "spa"
  },
  "matched_terms": ["wellness"],
  "status": "pending_staff_review"
}
```

The `pending_staff_review` status ensures recommendations are treated as staff recommendations before being presented to a guest.

## Unit Test Results

All Story 4 cases are implemented in `backend/tests/test_matching.py` and pass:

| Test ID | Scenario | Result |
|---|---|---|
| UT-01 | Wellness preference with a wellness Spa amenity | Passed |
| UT-02 | Dining preference with a matching Dining amenity | Passed |
| UT-03 | No matching preference | Passed |
| UT-04 | Guest name in input | Passed; removed before prompt processing |
| UT-05 | Email address in input | Passed; removed before prompt processing |
| UT-06 | Phone number in input | Passed; removed before prompt processing |
| UT-07 | Reservation ID in input | Passed; excluded from the prompt |
| UT-08 | PII sanitization failure | Passed; LLM request blocked |
| UT-09 | Multiple preferences and multiple amenities | Passed; all rule-based matches returned |
| UT-10 | Generated recommendations | Passed; marked `pending_staff_review` |

Additional endpoint coverage is in `backend/tests/test_amenities.py`.

## Verification

Executed on branch `story-4`:

- Full pytest suite: **29 passed**
- Ruff lint: **passed**
- `git diff --check`: **passed**
- Python compilation: **passed**

The local machine has Python 3.10.12, while the project requires Python 3.12 or newer. Tests were run with a temporary process-only compatibility shim for `datetime.UTC` and `enum.StrEnum`; this shim was not added to the repository.

## Definition of Done Review

| Requirement | Status | Notes |
|---|---|---|
| Guest 360 Dashboard displays upcoming arrival information from REST API | Not implemented in this repository | No frontend exists in the current workspace |
| Reservation and guest preference information can be viewed together | Partially implemented | Existing guest detail API merges guest data and preferences; no dashboard UI exists |
| High-priority preferences are visually identifiable | Not implemented | Requires frontend priority data and presentation rules |
| Guest preferences match the Amenity catalogue | Implemented | Rule-based matching and recommendations endpoint are available |
| Guest PII is removed before LLM processing | Implemented | Allowlist sanitization prevents PII fields from reaching the prompt |
| LLM requests are blocked when PII sanitization fails | Implemented | `SanitizationError` stops processing before the LLM callable |
| Unit tests for the four stories pass | Story 4 verified | Full current suite passes; other story coverage depends on their implementation |
| No unsupported or fabricated recommendations are returned | Implemented | Only configured rule matches are returned |

## Remaining Work

1. Add the React Guest 360 Dashboard in a frontend application.
2. Display upcoming arrivals from the reservations API.
3. Display reservation details and guest preferences together.
4. Add a clear visual treatment for high-priority preferences.
5. Add a staff review workflow that allows staff to accept, reject, or mark recommendations as reviewed.
6. Persist recommendation review state if the review workflow must survive across sessions.
7. Add explicit priority metadata to guest preferences if priority is a required business field.
8. Run the project with Python 3.12+ and `uv` in CI or the development container to remove the local compatibility workaround.
9. Add database migrations before deploying Amenity schema changes to an existing environment; the current baseline uses `create_all`.

## Branch Scope

All Story 4 changes and this status document belong to branch `story-4`. The `main` branch was not changed.
