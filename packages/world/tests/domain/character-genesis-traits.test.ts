import { describe, expect, it } from "vitest";

import {
  addLearnedCharacterModifier,
  createCharacterGenesisPackage,
  createInitialCharacterTraitState,
  deriveCharacterDna,
  getEffectiveCharacterDna,
  updateDynamicCharacterState,
  validateCharacterGenesisStructure,
  validateCharacterTraitState,
  type CharacterTraitEvidence,
} from "../../src/domain";

const evidence: CharacterTraitEvidence[] = [
  {
    axis: "curiosity",
    direction: "high",
    strength: 0.9,
    sourceFactIds: ["fact-library"],
    rationale: "Frequently explored the library alone.",
  },
  {
    axis: "caution",
    direction: "high",
    strength: 0.8,
    sourceFactIds: ["fact-storm"],
    rationale: "Learned to prepare carefully before storms.",
  },
];

describe("Character Genesis traits", () => {
  it("derives deterministic bounded DNA from semantic evidence", () => {
    const first = deriveCharacterDna(evidence, "seed-1");
    const second = deriveCharacterDna(evidence, "seed-1");

    expect(first).toEqual(second);
    expect(first.curiosity).toBeGreaterThan(0.65);
    expect(first.caution).toBeGreaterThan(0.65);
    expect(first.empathy).toBe(0.5);
    for (const value of Object.values(first)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("keeps short-term dynamic state separate from base DNA", () => {
    const state = createInitialCharacterTraitState({
      evidence,
      seed: "seed-2",
    });
    const before = structuredClone(state.dna);
    const updated = updateDynamicCharacterState(state, {
      anxiety: 0.95,
      confidence: 0.15,
    });

    expect(updated.dna).toEqual(before);
    expect(updated.dynamic.anxiety).toBe(0.95);
    expect(updated.dynamic.confidence).toBe(0.15);
  });

  it("applies learned modifiers explicitly without rewriting base DNA", () => {
    const state = createInitialCharacterTraitState({
      evidence,
      seed: "seed-3",
    });
    const baseCourage = state.dna.courage;
    const withModifier = addLearnedCharacterModifier(state, {
      id: "lesson-1",
      axis: "courage",
      delta: 0.1,
      reason: "Repeatedly completed difficult journeys.",
      evidenceFactIds: ["fact-journey"],
      createdAt: "2026-08-19T18:00:00.000Z",
    });

    expect(withModifier.dna.courage).toBe(baseCourage);
    expect(getEffectiveCharacterDna(withModifier).courage).toBeCloseTo(
      baseCourage + 0.1,
      4,
    );
    expect(() =>
      addLearnedCharacterModifier(state, {
        id: "invalid",
        axis: "courage",
        delta: 0.5,
        reason: "Too large",
        evidenceFactIds: [],
        createdAt: "2026-08-19T18:00:00.000Z",
      }),
    ).toThrow("CHARACTER_TRAIT_MODIFIER_DELTA_OUT_OF_RANGE");
  });

  it("flags strong contradictory evidence and invalid contextual intensity", () => {
    const state = createInitialCharacterTraitState({
      seed: "seed-4",
      evidence: [
        {
          axis: "sociability",
          direction: "low",
          strength: 0.9,
          sourceFactIds: ["fact-a"],
          rationale: "Avoids crowds.",
        },
        {
          axis: "sociability",
          direction: "high",
          strength: 0.9,
          sourceFactIds: ["fact-b"],
          rationale: "Often leads group games.",
        },
      ],
      contextual: [
        {
          id: "fear-1",
          kind: "fear",
          context: "dark caves",
          intensity: 1.2,
          sourceFactIds: ["fact-cave"],
        },
      ],
    });

    const validation = validateCharacterTraitState(state);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CHARACTER_DNA_CONTRADICTORY_EVIDENCE",
        "CHARACTER_CONTEXTUAL_TRAIT_OUT_OF_RANGE",
      ]),
    );
  });

  it("binds the rich trait state into canonical genesis validation", () => {
    const traits = createInitialCharacterTraitState({
      evidence: [
        {
          axis: "curiosity",
          direction: "high",
          strength: 0.85,
          sourceFactIds: ["fact-missing"],
          rationale: "Explores unfamiliar places.",
        },
      ],
      seed: "seed-5",
    });
    const candidate = createCharacterGenesisPackage({
      householdId: "household-1",
      childProfileId: "child-1",
      characterId: "character-1",
      universeSeed: "universe-seed",
      candidateSeed: "candidate-seed",
      provenance: {
        schemaRevision: "character-genesis.v1",
        seed: "candidate-seed",
        generatedAt: "2026-08-19T18:00:00.000Z",
      },
      sections: {
        origin: {
          summary: "Miro often visits the library.",
          narrative:
            "Miro grew up visiting the library and preparing for storms.",
          facts: [
            {
              id: "fact-library",
              kind: "place",
              summary: "Miro often visits the library.",
              visibility: "known_to_character",
            },
          ],
        },
        traits,
      },
    });

    const validation = validateCharacterGenesisStructure(candidate);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CHARACTER_TRAIT_EVIDENCE_FACT_MISSING",
          path: "sections.traits",
          severity: "error",
        }),
      ]),
    );
  });
});
