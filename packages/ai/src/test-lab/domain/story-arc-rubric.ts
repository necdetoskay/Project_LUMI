import type { EvaluationRubric } from "./evaluation";

export const STORY_ARC_RUBRIC_V1: EvaluationRubric = {
  key: "story_arc_quality",
  revision: 1,
  targetType: "story_arc",
  label: "LUMI Story Arc Quality v1",
  createdAt: "2026-08-18T00:00:00.000Z",
  criteria: [
    {
      key: "long_term_continuity",
      label: "Long-term continuity",
      description:
        "Selected events, inventory, relationships and unresolved threads remain coherent across the arc.",
      weight: 1,
      minScore: 1,
      maxScore: 10,
    },
    {
      key: "character_development",
      label: "Character development",
      description:
        "The character changes meaningfully without contradicting established identity and traits.",
      weight: 1,
      minScore: 1,
      maxScore: 10,
    },
    {
      key: "world_evolution",
      label: "World evolution",
      description:
        "World changes accumulate coherently and prior world facts remain respected.",
      weight: 1,
      minScore: 1,
      maxScore: 10,
    },
    {
      key: "npc_consistency",
      label: "NPC consistency",
      description:
        "Recurring NPC identity, knowledge, relationships, goals and behavior remain coherent.",
      weight: 1,
      minScore: 1,
      maxScore: 10,
    },
    {
      key: "repetition_avoidance",
      label: "Repetition avoidance",
      description:
        "The arc avoids recycling the same conflict, scene structure, language and resolution pattern.",
      weight: 1,
      minScore: 1,
      maxScore: 10,
    },
    {
      key: "arc_progression",
      label: "Arc progression",
      description:
        "Stories form a meaningful progression rather than isolated episodes with no accumulated consequence.",
      weight: 1,
      minScore: 1,
      maxScore: 10,
    },
  ],
};
