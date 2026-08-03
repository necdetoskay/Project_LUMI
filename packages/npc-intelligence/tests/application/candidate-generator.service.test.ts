import { describe, expect, it } from "vitest";
import { CandidateGenerator } from "../../src/application/candidate-generator.service";
import type { CandidateGenerationInput } from "../../src/application/candidate-generator.service";
import type { DecisionContextVector, PerceptionWindow } from "../../src/domain";

function makeContext(): DecisionContextVector {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    traits: { curiosity: 0.8, sociability: 0.6 },
    emotions: {},
    influence: {
      emotional: 0.5,
      social: 0.6,
      cultural: 0.5,
      educational: 0.5,
      political: 0.5,
      environmental: 0.5,
      familial: 0.5,
      spiritual: 0.5,
      historical: 0.5,
    },
    relationships: [],
    needs: [
      {
        needType: "curiosity",
        current: 0.8,
        decay: 0.2,
        urgency: 0.84,
        source: "need_state",
      },
    ],
    goals: [],
    timeSensitivity: 0.2,
    urgency: 0.84,
    contentHash: "hash",
  };
}

function makeWindow(
  overrides: Partial<PerceptionWindow> = {},
): PerceptionWindow {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    atLocationId: "location-1",
    perceivedFacts: [
      {
        factId: "fact-item",
        category: "item",
        claim: "a shiny shell",
        observedAt: new Date(),
        confidence: 0.9,
        sensitivity: "safe",
        source: "observation",
      },
      {
        factId: "fact-loc",
        category: "location",
        claim: "the beach",
        observedAt: new Date(),
        confidence: 0.9,
        sensitivity: "safe",
        source: "observation",
      },
    ],
    nearbyCharacterIds: ["npc-2"],
    spatialProximity: { "npc-2": 0.8 },
    timeSensitivity: 0.2,
    reachedAt: new Date(),
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<CandidateGenerationInput> = {},
): CandidateGenerationInput {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    vector: makeContext(),
    window: makeWindow(),
    safety: {
      contentBoundary: "strict",
      forbiddenCandidateKinds: [],
      requireParentApprovalForConditional: true,
    },
    seed: "seed-1",
    maxCandidates: 20,
    ...overrides,
  };
}

describe("CandidateGenerator", () => {
  it("generates candidates only for needs with perceived evidence", () => {
    const service = new CandidateGenerator();
    const result = service.generate(buildInput());

    const kinds = result.candidates.map((c) => c.kind);
    expect(kinds).toContain("investigate");
    expect(kinds).toContain("explore");
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it("never generates a candidate that needs an unperceived fact", () => {
    const service = new CandidateGenerator();
    const result = service.generate(
      buildInput({
        window: makeWindow({ perceivedFacts: [] }),
      }),
    );

    expect(result.candidates.every((c) => c.requiredFactIds.length === 0)).toBe(
      true,
    );
    expect(result.candidates.some((c) => c.kind === "investigate")).toBe(false);
  });

  it("targets a nearby character only when one is perceived", () => {
    const service = new CandidateGenerator();
    const result = service.generate(buildInput());

    const social = result.candidates.find((c) => c.kind === "socialize");
    expect(social?.targetCharacterId).toBe("npc-2");

    const noTarget = service.generate(
      buildInput({ window: makeWindow({ nearbyCharacterIds: [] }) }),
    );
    expect(noTarget.candidates.some((c) => c.kind === "socialize")).toBe(false);
  });

  it("marks forbidden kinds as blocked by safety policy", () => {
    const service = new CandidateGenerator();
    const result = service.generate(
      buildInput({
        safety: {
          contentBoundary: "strict",
          forbiddenCandidateKinds: ["investigate"],
          requireParentApprovalForConditional: true,
        },
      }),
    );

    const investigate = result.candidates.find((c) => c.kind === "investigate");
    expect(investigate?.safety).toBe("blocked");
  });

  it("is deterministic for the same input and seed", () => {
    const service = new CandidateGenerator();
    const a = service.generate(buildInput());
    const b = service.generate(buildInput());

    expect(a.candidates).toEqual(b.candidates);
  });

  it("respects the max candidate bound", () => {
    const service = new CandidateGenerator();
    const result = service.generate(buildInput({ maxCandidates: 3 }));

    expect(result.candidates.length).toBeLessThanOrEqual(3);
  });
});
