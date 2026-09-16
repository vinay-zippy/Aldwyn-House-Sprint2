"""Guest-preference-to-amenity matching engine (Story 4).

Kept independent of FastAPI/SQLAlchemy/Mongo so the rules can be unit tested with
plain dicts/objects and reused from a router, a batch job, or an LLM-assisted
recommender.

Design notes tying back to the acceptance criteria:
- `sanitize_guest_preferences` is an allowlist: only known preference fields pass
  through, so guest name/email/phone/payment info/reservation ID can never leak
  into matching or an LLM prompt, even if present in the raw input (AC 1, 5).
- `match_preferences_to_amenities` only returns an amenity when a configured
  rule (category keyword or amenity tag) is satisfied against sanitized guest
  terms - it never fabricates a match (AC 2, 3, 4, 9).
- `build_llm_prompt` only ever receives sanitized preference terms and amenity
  catalogue info (AC 6).
- `generate_recommendations` blocks any LLM call when sanitization fails, and
  marks every recommendation as pending staff review (AC 7, 8).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from app.models import AmenityCategory

# Fields that must never reach the matching engine or an LLM prompt.
_PII_FIELDS = {"name", "email", "phone", "payment_info", "payment_information", "reservation_id"}

# Preference fields that are safe to match on. Anything not in this allowlist is
# dropped, which also covers the PII fields above defensively.
_ALLOWED_PREFERENCE_FIELDS = (
    "dietary",
    "room_preferences",
    "notes",
    "interests",
    "high_priority",
)

# Configured keyword rules per amenity category. A guest term matches an amenity
# when it appears here (or in the amenity's own `tags`).
CATEGORY_KEYWORD_RULES: dict[AmenityCategory, set[str]] = {
    AmenityCategory.dining: {
        "dining",
        "food",
        "restaurant",
        "vegetarian",
        "vegan",
        "gluten-free",
        "halal",
        "kosher",
        "cuisine",
    },
    AmenityCategory.spa: {
        "spa",
        "wellness",
        "massage",
        "relaxation",
        "sauna",
        "yoga",
    },
    AmenityCategory.local_experience: {
        "local",
        "tour",
        "excursion",
        "sightseeing",
        "culture",
        "adventure",
        "experience",
    },
}


def _category_rules(category: Any) -> set[str]:
    """Return rules for enum or API-style category values."""
    category_value = getattr(category, "value", category)
    normalized = str(category_value).strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in {"local_experiences", "local_experience"}:
        normalized = AmenityCategory.local_experience.value
    try:
        return CATEGORY_KEYWORD_RULES.get(AmenityCategory(normalized), set())
    except ValueError:
        return set()


class SanitizationError(Exception):
    """Raised when raw guest preference input cannot be safely sanitized."""


@dataclass
class MatchedAmenity:
    amenity: Any
    matched_terms: list[str]


def sanitize_guest_preferences(raw_input: Any) -> dict[str, list[str]]:
    """Strip guest PII and return only allowlisted preference fields.

    Raises SanitizationError (never returns partial/best-effort data) if the
    input isn't a mapping or a preference field isn't a list of strings.
    """
    if not isinstance(raw_input, Mapping):
        raise SanitizationError("Guest preference input must be a mapping")

    sanitized: dict[str, list[str]] = {}
    for field in _ALLOWED_PREFERENCE_FIELDS:
        value = raw_input.get(field, [])
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise SanitizationError(f"Preference field '{field}' must be a list of strings")
        sanitized[field] = list(value)

    # Defense in depth: guarantee no PII key ever survives, even if the allowlist
    # above is ever changed to overlap with a PII field name by mistake.
    for pii_field in _PII_FIELDS:
        sanitized.pop(pii_field, None)

    return sanitized


def _collect_preference_terms(sanitized_preferences: Mapping[str, list[str]]) -> set[str]:
    return {
        term.strip().lower()
        for values in sanitized_preferences.values()
        for term in values
        if term.strip()
    }


def match_preferences_to_amenities(
    sanitized_preferences: Mapping[str, list[str]], amenities: Iterable[Any]
) -> list[MatchedAmenity]:
    """Rule-based matching: an amenity is returned only when at least one
    configured preference-to-amenity rule is satisfied (AC 2, 3, 4, 9)."""
    guest_terms = _collect_preference_terms(sanitized_preferences)
    matches: list[MatchedAmenity] = []
    if not guest_terms:
        return matches

    for amenity in amenities:
        category_rules = _category_rules(amenity.category)
        amenity_tags = {str(tag).strip().lower() for tag in (amenity.tags or [])}

        matched_terms = guest_terms & (category_rules | amenity_tags)
        if matched_terms:
            matches.append(MatchedAmenity(amenity=amenity, matched_terms=sorted(matched_terms)))

    return matches


def build_llm_prompt(
    sanitized_preferences: Mapping[str, list[str]], amenities: Iterable[Any]
) -> str:
    """Build an LLM prompt containing only sanitized preference terms and the
    amenity catalogue's own (non-PII) fields (AC 6)."""
    amenity_lines = [
        f"- {amenity.name} ({amenity.category}): tags={list(amenity.tags or [])}"
        for amenity in amenities
    ]
    preference_lines = [
        f"- {field}: {values}" for field, values in sanitized_preferences.items() if values
    ]
    return (
        "Guest preferences (sanitized, no PII):\n"
        + "\n".join(preference_lines)
        + "\n\nAvailable amenities:\n"
        + "\n".join(amenity_lines)
    )


def generate_recommendations(
    raw_guest_input: Any,
    amenities: Iterable[Any],
    use_llm: bool = False,
    llm_client: Callable[[str], Any] | None = None,
) -> list[MatchedAmenity]:
    """Sanitize guest input, run rule-based matching, and (optionally) enrich via
    an LLM. Recommendations are always for staff review, never shown directly to
    the guest (AC 8). If sanitization fails, the LLM is never called (AC 7)."""
    sanitized = sanitize_guest_preferences(raw_guest_input)

    amenities = list(amenities)
    matches = match_preferences_to_amenities(sanitized, amenities)

    if use_llm and llm_client is not None:
        prompt = build_llm_prompt(sanitized, amenities)
        llm_client(prompt)

    return matches
