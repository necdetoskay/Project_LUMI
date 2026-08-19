import { describe, expect, it } from "vitest";

import {
  DEEP_ORIGIN_QUALITY_RUBRIC,
  validateDeepCharacterOrigin,
  type DeepCharacterOriginSuggestion,
} from "./deep-character-origin.service";

function validOrigin(): DeepCharacterOriginSuggestion {
  const paragraph =
    "Miro grew up beside the old mill where everyday repairs, neighbor visits, small discoveries, and quiet afternoons taught him to notice how things fit together and how people help one another.";
  return {
    key: "mill-childhood",
    title: "The Mill Path",
    summary:
      "Miro grew up near the old mill, learned careful repairs, and treasures walks with Lina.",
    narrative: Array.from({ length: 18 }, () => paragraph).join(" "),
    facts: [
      {
        id: "fact-home",
        kind: "place",
        summary: "Miro grew up near the old mill.",
        visibility: "known_to_character",
      },
      {
        id: "fact-skill",
        kind: "skill",
        summary: "Miro learned careful small-tool repairs.",
        visibility: "user_visible",
      },
      {
        id: "fact-lina",
        kind: "relationship",
        summary: "Lina often walked the mill path with Miro.",
        visibility: "known_to_character",
      },
      {
        id: "fact-letter",
        kind: "secret",
        summary: "A sealed letter is hidden beneath a loose mill board.",
        visibility: "unknown_to_character",
      },
    ],
    summaryFactIds: ["fact-home", "fact-skill", "fact-lina"],
    narrativeFactIds: [
      "fact-home",
      "fact-skill",
      "fact-lina",
      "fact-letter",
    ],
    unresolvedQuestions: [
      {
        id: "question-letter",
        summary: "Who left the sealed letter beneath the mill?",
        visibility: "system_only",
        relatedFactIds: ["fact-letter"],
      },
    ],
    storyHooks: [
      {
        id: "hook-mill",
        summary: "A future repair at the mill could uncover the loose board.",
        relatedFactIds: ["fact-home", "fact-letter"],
        potential: 0.85,
      },
    ],
  };
}

describe("deep character origin validation", () => {
  it("reports inspectable depth, structure and the required quality rubric", () => {
    const evidence = validateDeepCharacterOrigin(validOrigin());

    expect(evidence.valid).toBe(true);
    expect(evidence.narrativeWordCount).toBeGreaterThanOrEqual(220);
    expect(evidence.factCount).toBe(4);
    expect(evidence.distinctFactKinds).toBe(4);
    expect(evidence.unresolvedQuestionCount).toBe(1);
    expect(evidence.storyHookCount).toBe(1);
    expect(evidence.qualityRubric).toEqual(DEEP_ORIGIN_QUALITY_RUBRIC);
    expect(evidence.qualityRubric).toContain("past_life_believability");
    expect(evidence.qualityRubric).toContain("future_story_yield");
  });

  it("blocks a hidden fact from becoming operational summary evidence", () => {
    const origin = validOrigin();
    origin.summaryFactIds.push("fact-letter");

    const evidence = validateDeepCharacterOrigin(origin);

    expect(evidence.valid).toBe(false);
    expect(evidence.issues.map((issue) => issue.code)).toContain(
      "DEEP_ORIGIN_SUMMARY_HIDDEN_FACT",
    );
  });

  it(
    "requires operational summary facts to belong to the narrative fact set",
    () => {
      const origin = validOrigin();
      origin.narrativeFactIds = ["fact-home", "fact-letter"];

      const evidence = validateDeepCharacterOrigin(origin);

      expect(evidence.valid).toBe(false);
      expect(evidence.issues.map((issue) => issue.code)).toContain(
        "DEEP_ORIGIN_SUMMARY_FACT_NOT_IN_NARRATIVE",
      );
    },
  );

  it(
    "treats narrative depth as evidence rather than an exact word-count gate",
    () => {
      const origin = validOrigin();
      origin.narrative = "A short but coherent childhood summary.";

      const evidence = validateDeepCharacterOrigin(origin);

      expect(evidence.valid).toBe(true);
      expect(evidence.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "DEEP_ORIGIN_NARRATIVE_SHALLOW",
            severity: "warning",
          }),
        ]),
      );
    },
  );
});
