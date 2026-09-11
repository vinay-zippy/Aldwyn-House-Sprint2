"""Unit tests for the Story 4 guest-preference-to-amenity matching engine.

Amenity catalogue entries are plain `models.Amenity` instances (not persisted) -
the matching engine only reads `category`/`tags`/`name`, so no DB is needed here.
"""

from unittest.mock import Mock

import pytest

from app.matching import (
    SanitizationError,
    build_llm_prompt,
    generate_recommendations,
    match_preferences_to_amenities,
    sanitize_guest_preferences,
)
from app.models import Amenity, AmenityCategory


def _amenity(**overrides):
    defaults = dict(name="Amenity", category=AmenityCategory.dining, tags=[], is_active=True)
    defaults.update(overrides)
    return Amenity(**defaults)


# UT-01: wellness preference matches a wellness spa amenity
def test_wellness_preference_matches_spa_amenity():
    spa = _amenity(name="Serenity Spa", category=AmenityCategory.spa, tags=["wellness", "massage"])
    sanitized = sanitize_guest_preferences({"notes": ["wellness"]})

    matches = match_preferences_to_amenities(sanitized, [spa])

    assert [m.amenity for m in matches] == [spa]


# UT-02: dining preference matches a dining amenity
def test_dining_preference_matches_dining_amenity():
    restaurant = _amenity(name="Sunset Grill", category=AmenityCategory.dining, tags=["vegetarian"])
    sanitized = sanitize_guest_preferences({"dietary": ["vegetarian"]})

    matches = match_preferences_to_amenities(sanitized, [restaurant])

    assert [m.amenity for m in matches] == [restaurant]


def test_matching_accepts_api_style_category_strings():
    local_experience = _amenity(
        name="Historic Walking Tour",
        category="local experiences",
        tags=["history"],
    )
    sanitized = sanitize_guest_preferences({"interests": ["culture"]})

    matches = match_preferences_to_amenities(sanitized, [local_experience])

    assert [m.amenity for m in matches] == [local_experience]


# UT-03: no matching preference returns no recommendation
def test_no_matching_preference_returns_no_recommendation():
    spa = _amenity(name="Serenity Spa", category=AmenityCategory.spa, tags=["wellness"])
    # "opera" shares no keyword/tag with any configured rule for any category.
    sanitized = sanitize_guest_preferences({"notes": ["opera"]})

    matches = match_preferences_to_amenities(sanitized, [spa])

    assert matches == []


# UT-04/05/06/07: PII fields are stripped before reaching sanitized output/LLM prompt
@pytest.mark.parametrize(
    "raw_field,value",
    [
        ("name", "Jamie Rivera"),
        ("email", "jamie.rivera@example.com"),
        ("phone", "+1-555-0100"),
        ("reservation_id", "res-123"),
    ],
)
def test_pii_field_is_removed_before_llm_processing(raw_field, value):
    raw_input = {raw_field: value, "dietary": ["vegetarian"]}

    sanitized = sanitize_guest_preferences(raw_input)

    assert raw_field not in sanitized
    prompt = build_llm_prompt(sanitized, [])
    assert value not in prompt


# UT-08: PII sanitization failure blocks the LLM request
def test_sanitization_failure_blocks_llm_request():
    llm_client = Mock()
    raw_input = {"dietary": "not-a-list"}  # malformed -> sanitization fails

    with pytest.raises(SanitizationError):
        generate_recommendations(raw_input, [], use_llm=True, llm_client=llm_client)

    llm_client.assert_not_called()


# UT-09: multiple preferences match multiple amenities
def test_multiple_preferences_match_multiple_amenities():
    restaurant = _amenity(name="Sunset Grill", category=AmenityCategory.dining, tags=["vegetarian"])
    spa = _amenity(name="Serenity Spa", category=AmenityCategory.spa, tags=["wellness"])
    sanitized = sanitize_guest_preferences({"dietary": ["vegetarian"], "notes": ["wellness"]})

    matches = match_preferences_to_amenities(sanitized, [restaurant, spa])

    assert {m.amenity for m in matches} == {restaurant, spa}


# UT-10: generated recommendations are marked for staff review
def test_recommendations_are_marked_for_staff_review():
    from app.schemas import AmenityOut, AmenityRecommendation

    restaurant = _amenity(
        id="amenity-1", name="Sunset Grill", category=AmenityCategory.dining, tags=["vegetarian"]
    )
    raw_input = {"dietary": ["vegetarian"]}

    matches = generate_recommendations(raw_input, [restaurant])
    recommendation = AmenityRecommendation(
        amenity=AmenityOut.model_validate(matches[0].amenity),
        matched_terms=matches[0].matched_terms,
    )

    assert len(matches) == 1
    assert recommendation.status == "pending_staff_review"
