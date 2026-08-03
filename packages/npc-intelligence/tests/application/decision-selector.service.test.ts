import { describe, expect, it } from "vitest";
import { DecisionSelector } from "../../src/application/decision-selector.service";
import type {
  CandidateAction,
  DecisionContextVector,
  UtilityScore,
} from "../../src/domain";

function makeCandidate(
  overrides: Partial<CandidateAction> = {},
): CandidateAction {
  return {
    id: "c1",
    kind: "seek_food",
    description: "eat",
    requiredFactIds: [],
    targetCharacterId: null,
    needTypes: ["hunger"],
    personalityFit: 0.7,
    safety: "safe",
    ...overrides,
  };
}

function makeScore(
  candidateId: string,
  total: number,
  overrides: Partial<UtilityScore> = {},
): UtilityScore {
  return {
    candidateId,
    total,
    components: {
      needSatisfaction: 0,
      emotionalComfort: 0,
      safety: 0,
      goalAlignment: 0,
      relationshipImpact: 0,
      socialApproval: 0,
      curiosity: 0,
      personalityFit: 0,
      timeSensitivity: 0,
      resourceCost: 0,
      timeCost: 0,
    },
    policyVersion: "v1",
    reasons: [],
    ...overrides,
  };
}

function makeContext(): DecisionContextVector {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    traits: {},
    emotions: {},
    influence: {
      emotional: 0.5,
      social: 0.5,
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
        needType: "hunger",
        current: 0.5,
        decay: 0.2,
        urgency: 0.54,
        source: "need_state",
      },
    ],
    goals: [],
    timeSensitivity: 0,
    urgency: 0.54,
    contentHash: "hash",
  };
}

describe("DecisionSelector", () => {
  it("selects the highest-scoring candidate", () => {
    const selector = new DecisionSelector();
    const candidates = [
      makeCandidate({ id: "c-low" }),
      makeCandidate({ id: "c-high" }),
    ];
    const scores = [makeScore("c-low", 0.3), makeScore("c-high", 0.9)];

    const result = selector.select(candidates, scores, makeContext(), "seed-1");

    expect(result.selectedCandidateId).toBe("c-high");
    expect(result.eliminations).toHaveLength(0);
  });

  it("eliminates blocked candidates before selection", () => {
    const selector = new DecisionSelector();
    const candidates = [
      makeCandidate({ id: "c-safe" }),
      makeCandidate({ id: "c-blocked", safety: "blocked" }),
    ];
    const scores = [makeScore("c-safe", 0.4), makeScore("c-blocked", 0.99)];

    const result = selector.select(candidates, scores, makeContext(), "seed-1");

    expect(result.selectedCandidateId).toBe("c-safe");
    expect(result.eliminations).toEqual([
      { candidateId: "c-blocked", reason: "blocked by safety policy" },
    ]);
  });

  it("eliminates low-personality-fit candidates without strong need evidence", () => {
    const selector = new DecisionSelector();
    const candidates = [
      makeCandidate({ id: "c-fit-low", personalityFit: 0.1 }),
    ];
    const scores = [makeScore("c-fit-low", 0.8)];

    const result = selector.select(candidates, scores, makeContext(), "seed-1");

    expect(result.selectedCandidateId).toBeNull();
    expect(result.eliminations).toHaveLength(1);
  });

  it("keeps low-fit candidates when a matching strong need pressure exists", () => {
    const selector = new DecisionSelector();
    const context = makeContext();
    const strongContext: DecisionContextVector = {
      ...context,
      needs: [
        {
          needType: "hunger",
          current: 0.8,
          decay: 0.3,
          urgency: 0.9,
          source: "need_state",
        },
      ],
    };
    const candidates = [
      makeCandidate({ id: "c-fit-low", personalityFit: 0.1 }),
    ];
    const scores = [makeScore("c-fit-low", 0.8)];

    const result = selector.select(candidates, scores, strongContext, "seed-1");

    expect(result.selectedCandidateId).toBe("c-fit-low");
  });

  it("uses the seeded RNG to break ties deterministically", () => {
    const selector = new DecisionSelector();
    const candidates = [
      makeCandidate({ id: "c-a" }),
      makeCandidate({ id: "c-b" }),
    ];
    const scores = [makeScore("c-a", 0.5), makeScore("c-b", 0.5)];

    const first = selector.select(candidates, scores, makeContext(), "seed-1");
    const second = selector.select(candidates, scores, makeContext(), "seed-1");

    expect(first.selectedCandidateId).toBe(second.selectedCandidateId);
    expect(["c-a", "c-b"]).toContain(first.selectedCandidateId);
  });

  it("returns no selection when every candidate is eliminated", () => {
    const selector = new DecisionSelector();
    const candidates = [makeCandidate({ id: "c-blocked", safety: "blocked" })];
    const scores = [makeScore("c-blocked", 0.9)];

    const result = selector.select(candidates, scores, makeContext(), "seed-1");

    expect(result.selectedCandidateId).toBeNull();
    expect(result.selectionReason).toBe("no admissible candidate");
  });
});
