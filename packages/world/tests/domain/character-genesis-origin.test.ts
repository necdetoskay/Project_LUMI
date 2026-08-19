import { describe, expect, it } from "vitest";

import {
  buildCharacterVisibleOriginContext,
  createCharacterGenesisPackage,
  validateCharacterGenesisStructure,
} from "../../src/domain";

function candidateWithOrigin() {
  return createCharacterGenesisPackage({
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    universeSeed: "universe-seed",
    candidateSeed: "candidate-seed",
    provenance: {
      schemaRevision: "character-genesis.v1",
      seed: "candidate-seed",
      generatedAt: "2026-08-19T12:00:00.000Z",
    },
    sections: {
      origin: {
        summary: "Miro grew up near the old mill and learned to repair small tools.",
        narrative:
          "Miro has a rich canonical history. A sealed letter exists, but Miro has never seen it.",
        summaryFactIds: ["fact-home", "fact-skill"],
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
            summary: "Miro learned to repair small tools.",
            visibility: "user_visible",
          },
          {
            id: "fact-letter",
            kind: "secret",
            summary: "A sealed letter was hidden under the mill floor.",
            visibility: "unknown_to_character",
          },
        ],
        unresolvedQuestions: [
          {
            id: "question-letter",
            summary: "Who hid the sealed letter?",
            visibility: "system_only",
            relatedFactIds: ["fact-letter"],
          },
        ],
        storyHooks: [
          {
            id: "hook-mill",
            summary: "A future visit to the mill could reveal a clue.",
            relatedFactIds: ["fact-home", "fact-letter"],
            potential: 0.8,
          },
        ],
      },
    },
  });
}

describe("deep Character Genesis origin", () => {
  it("builds character-visible context without exposing hidden facts or narrative", () => {
    const candidate = candidateWithOrigin();
    const origin = candidate.sections.origin!;

    const visible = buildCharacterVisibleOriginContext(origin);

    expect(visible.summary).toBe(origin.summary);
    expect(visible.facts.map((fact) => fact.id)).toEqual([
      "fact-home",
      "fact-skill",
    ]);
    expect(JSON.stringify(visible)).not.toContain("sealed letter");
    expect(visible).not.toHaveProperty("narrative");
  });

  it("rejects hidden or missing facts used to derive the operational summary", () => {
    const candidate = candidateWithOrigin();
    candidate.sections.origin!.summaryFactIds = ["fact-letter", "fact-missing"];

    const validation = validateCharacterGenesisStructure(candidate);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "GENESIS_ORIGIN_SUMMARY_HIDDEN_FACT",
        "GENESIS_ORIGIN_SUMMARY_FACT_MISSING",
      ]),
    );
  });

  it("validates unresolved-question and future-hook fact references", () => {
    const candidate = candidateWithOrigin();
    candidate.sections.origin!.unresolvedQuestions![0]!.relatedFactIds = [
      "fact-missing",
    ];
    candidate.sections.origin!.storyHooks![0]!.potential = 1.2;

    const validation = validateCharacterGenesisStructure(candidate);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "GENESIS_ORIGIN_QUESTION_FACT_MISSING",
        "GENESIS_ORIGIN_HOOK_POTENTIAL_RANGE",
      ]),
    );
  });
});
