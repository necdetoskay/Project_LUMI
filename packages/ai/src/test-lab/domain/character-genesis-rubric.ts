import type { EvaluationRubric } from "./evaluation";

function criterion(
  key: string,
  label: string,
  description: string,
  weight = 1,
) {
  return {
    key,
    label,
    description,
    weight,
    minScore: 1,
    maxScore: 10,
  };
}

/**
 * Cross-stage Character Genesis qualification rubric.
 *
 * Judges compare candidates only within the same phase/run. Criteria that are
 * not evidenced by a phase should be scored neutrally rather than inventing
 * missing facts. Future-story yield is intentionally weighted higher because
 * Genesis exists to create a durable pre-first-story life, not merely polished
 * prose.
 */
export const CHARACTER_GENESIS_QUALITY_RUBRIC_V1: EvaluationRubric = {
  key: "character_genesis_quality",
  revision: 1,
  targetType: "character",
  label: "LUMI Character Genesis Quality v1",
  createdAt: "2026-08-20T00:00:00.000Z",
  criteria: [
    criterion(
      "coherence",
      "Coherence",
      "Facts, traits, relationships, items, memories and world state fit together without internal conflict.",
    ),
    criterion(
      "age_suitability",
      "Age suitability",
      "Language, themes, fears, conflicts and implied story material fit the child profile and age band.",
    ),
    criterion(
      "character_specificity",
      "Character specificity",
      "The candidate feels specific to this character instead of generic or interchangeable.",
    ),
    criterion(
      "world_consistency",
      "World consistency",
      "The candidate respects canonical world, region, home, climate, season and lore constraints.",
    ),
    criterion(
      "past_life_believability",
      "Past-life believability",
      "The pre-first-story life has plausible causes, relationships and lived detail rather than exposition-only history.",
    ),
    criterion(
      "trait_evidence",
      "Trait evidence",
      "Character traits and DNA are supported by concrete origin/social evidence instead of arbitrary labels.",
    ),
    criterion(
      "relationship_depth",
      "Relationship depth",
      "Relationships have distinct roles, directionality and believable emotional texture without unnecessary population.",
    ),
    criterion(
      "item_integration",
      "Item integration",
      "Starting items are grounded, provenance-aware and connected to the character without excessive magical importance.",
    ),
    criterion(
      "memory_quality",
      "Memory quality",
      "Memory seeds are specific, character-visible, emotionally useful and grounded in canonical origin facts.",
    ),
    criterion(
      "open_thread_quality",
      "Open-thread quality",
      "Unresolved threads are meaningful optional opportunities rather than forced quests or artificial cliffhangers.",
    ),
    criterion(
      "future_story_yield",
      "Future-story yield",
      "The candidate creates multiple distinct, reusable future story opportunities across relationships, places, items, memories or mysteries without prescribing one mandatory plot.",
      1.5,
    ),
    criterion(
      "redundancy",
      "Low redundancy",
      "Information is non-repetitive; facts and hooks add distinct value rather than restating the same idea.",
    ),
    criterion(
      "contradiction_rate",
      "Low contradiction rate",
      "The candidate avoids contradictions with selected upstream state and within its own structured fields.",
      1.25,
    ),
  ],
};
