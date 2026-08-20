import { describe, expect, it } from "vitest";

import {
  normalizeSemanticCharacterTraitEvidence,
  validateCharacterTraitEvidenceReferences,
} from "../../src/domain";

describe("Character Genesis semantic trait evidence", () => {
  it("maps semantic strength bands to canonical numeric weights", () => {
    expect(
      normalizeSemanticCharacterTraitEvidence({
        axis: "empathy",
        direction: "high",
        strength: "strong",
        sourceFactIds: ["fact-helped"],
        rationale: "Repeatedly helped a younger friend.",
      }),
    ).toEqual({
      axis: "empathy",
      direction: "high",
      strength: 0.85,
      sourceFactIds: ["fact-helped"],
      rationale: "Repeatedly helped a younger friend.",
    });
  });

  it("rejects evidence and contextual references missing from canonical origin", () => {
    const issues = validateCharacterTraitEvidenceReferences({
      originFactIds: ["fact-known"],
      evidence: [
        {
          axis: "curiosity",
          direction: "high",
          strength: 0.85,
          sourceFactIds: ["fact-missing"],
          rationale: "Investigated an unknown trail.",
        },
      ],
      contextual: [
        {
          id: "fear-cave",
          kind: "fear",
          context: "dark caves",
          intensity: 0.8,
          sourceFactIds: ["fact-cave-missing"],
        },
      ],
    });

    expect(issues.map((issue) => issue.code)).toEqual([
      "CHARACTER_TRAIT_EVIDENCE_FACT_MISSING",
      "CHARACTER_CONTEXTUAL_TRAIT_FACT_MISSING",
    ]);
  });
});
