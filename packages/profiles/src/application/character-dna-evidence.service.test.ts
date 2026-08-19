import { describe, expect, it } from "vitest";

import {
  validateCharacterDnaEvidenceSuggestion,
  type CharacterDnaEvidenceSuggestion,
} from "./character-dna-evidence.service";

function validSuggestion(): CharacterDnaEvidenceSuggestion {
  return {
    key: "origin-grounded",
    title: "Origin-grounded traits",
    evidence: [
      {
        axis: "curiosity",
        direction: "high",
        strength: "strong",
        sourceFactIds: ["fact-library"],
        rationale: "The character repeatedly explored the old library.",
      },
      {
        axis: "caution",
        direction: "high",
        strength: "moderate",
        sourceFactIds: ["fact-storm"],
        rationale: "Storm experience taught careful preparation.",
      },
    ],
    contextual: [
      {
        id: "fear-cave",
        kind: "fear",
        context: "dark caves",
        intensity: "moderate",
        sourceFactIds: ["fact-cave"],
      },
    ],
  };
}

describe("Character DNA semantic evidence validation", () => {
  it("keeps evidence semantic instead of accepting generated numeric DNA", () => {
    const suggestion = validSuggestion();
    const result = validateCharacterDnaEvidenceSuggestion(suggestion);

    expect(result.valid).toBe(true);
    expect(result.coveredAxes).toEqual(["curiosity", "caution"]);
    expect(suggestion.evidence[0]!.strength).toBe("strong");
    expect(suggestion).not.toHaveProperty("dna");
  });

  it("rejects evidence without canonical origin lineage", () => {
    const suggestion = validSuggestion();
    suggestion.evidence[0]!.sourceFactIds = [];

    const result = validateCharacterDnaEvidenceSuggestion(suggestion);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "CHARACTER_DNA_EVIDENCE_SOURCE_REQUIRED",
    );
  });

  it("rejects duplicate contextual trait ids", () => {
    const suggestion = validSuggestion();
    suggestion.contextual.push({ ...suggestion.contextual[0]! });

    const result = validateCharacterDnaEvidenceSuggestion(suggestion);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "CHARACTER_DNA_CONTEXTUAL_ID_DUPLICATE",
    );
  });
});
