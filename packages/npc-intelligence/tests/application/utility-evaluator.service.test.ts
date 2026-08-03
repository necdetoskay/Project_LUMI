import { describe, expect, it } from "vitest";
import { UtilityEvaluator } from "../../src/application/utility-evaluator.service";
import type {
  CandidateAction,
  DecisionContextVector,
  UtilityWeightPolicy,
} from "../../src/domain";

function makeCandidate(
  overrides: Partial<CandidateAction> = {},
): CandidateAction {
  return {
    id: "seek_food:self",
    kind: "seek_food",
    description: "Look for food nearby",
    requiredFactIds: [],
    targetCharacterId: null,
    needTypes: ["hunger"],
    personalityFit: 0.7,
    safety: "safe",
    ...overrides,
  };
}

function makeContext(): DecisionContextVector {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    traits: { curiosity: 0.8 },
    emotions: { joy: 0.7, trust: 0.6 },
    influence: {
      emotional: 0.5,
      social: 0.4,
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
        current: 0.8,
        decay: 0.2,
        urgency: 0.84,
        source: "need_state",
      },
    ],
    goals: [
      {
        goalId: "g1",
        needType: "hunger",
        description: "eat",
        priority: 0.6,
        status: "active",
        pull: 0.6,
      },
    ],
    timeSensitivity: 0.2,
    urgency: 0.84,
    contentHash: "hash",
  };
}

function makePolicy(): UtilityWeightPolicy {
  return {
    version: "v1",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    weights: {
      needSatisfaction: 0.25,
      emotionalComfort: 0.1,
      safety: 0.2,
      goalAlignment: 0.15,
      relationshipImpact: 0.1,
      socialApproval: 0.05,
      curiosity: 0.05,
      personalityFit: 0.05,
      timeSensitivity: 0.05,
      resourceCost: 0,
      timeCost: 0,
    },
  };
}

describe("UtilityEvaluator", () => {
  it("produces a weighted total for each candidate", () => {
    const evaluator = new UtilityEvaluator();
    const scores = evaluator.evaluate(
      [makeCandidate()],
      makeContext(),
      makePolicy(),
    );

    expect(scores).toHaveLength(1);
    const score = scores[0]!;
    expect(score.candidateId).toBe("seek_food:self");
    expect(score.policyVersion).toBe("v1");
    expect(score.total).toBeGreaterThan(0);
    expect(score.reasons.length).toBeGreaterThan(0);
  });

  it("higher need pressure produces a higher needSatisfaction component", () => {
    const evaluator = new UtilityEvaluator();
    const context = makeContext();
    const low = evaluator.evaluate(
      [makeCandidate()],
      {
        ...context,
        needs: [
          {
            needType: "hunger",
            current: 0.3,
            decay: 0.1,
            urgency: 0.32,
            source: "need_state",
          },
        ],
      },
      makePolicy(),
    );
    const high = evaluator.evaluate([makeCandidate()], context, makePolicy());

    expect(high[0]!.components.needSatisfaction).toBeGreaterThan(
      low[0]!.components.needSatisfaction,
    );
  });

  it("blocked candidates score zero on the safety component", () => {
    const evaluator = new UtilityEvaluator();
    const scores = evaluator.evaluate(
      [makeCandidate({ safety: "blocked" })],
      makeContext(),
      makePolicy(),
    );

    expect(scores[0]!.components.safety).toBe(0);
  });

  it("reflects relationship quality in relationshipImpact for targeted candidates", () => {
    const evaluator = new UtilityEvaluator();
    const context = makeContext();
    const targeted = makeCandidate({
      id: "ask_adult_for_food:npc-2",
      kind: "ask_for_help",
      needTypes: ["hunger"],
      targetCharacterId: "npc-2",
    });
    const withRel = evaluator.evaluate(
      [targeted],
      {
        ...context,
        relationships: [
          {
            targetCharacterId: "npc-2",
            trust: 0.9,
            affinity: 0.9,
            familiarity: 0.9,
            relationshipType: "friend",
          },
        ],
      },
      makePolicy(),
    );
    const noRel = evaluator.evaluate([targeted], context, makePolicy());

    expect(withRel[0]!.components.relationshipImpact).toBeGreaterThan(
      noRel[0]!.components.relationshipImpact,
    );
  });

  it("is deterministic for the same inputs", () => {
    const evaluator = new UtilityEvaluator();
    const a = evaluator.evaluate(
      [makeCandidate()],
      makeContext(),
      makePolicy(),
    );
    const b = evaluator.evaluate(
      [makeCandidate()],
      makeContext(),
      makePolicy(),
    );

    expect(a).toEqual(b);
  });
});
