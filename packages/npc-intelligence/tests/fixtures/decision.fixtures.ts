import type {
  CandidateAction,
  DecisionTrace,
  NpcDecisionEvent,
  TraceStep,
  UtilityScore,
  UtilityWeightPolicy,
} from "../../src/domain";

export function makeCandidate(
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

export function makeTraceStep(overrides: Partial<TraceStep> = {}): TraceStep {
  return {
    step: "need_evaluation",
    message: "evaluated needs",
    data: { dominantNeed: "hunger", topPressures: ["hunger"], urgency: 0.84 },
    ...overrides,
  };
}

export function makeUtilityScore(
  overrides: Partial<UtilityScore> = {},
): UtilityScore {
  return {
    candidateId: "seek_food:self",
    total: 0.6,
    components: {
      needSatisfaction: 0.8,
      emotionalComfort: 0.5,
      safety: 1,
      goalAlignment: 0.4,
      relationshipImpact: 0,
      socialApproval: 0.4,
      curiosity: 0.5,
      personalityFit: 0.7,
      timeSensitivity: 0.2,
      resourceCost: 0,
      timeCost: 0,
    },
    policyVersion: "v1",
    reasons: ["needSatisfaction=0.8", "kind=seek_food"],
    ...overrides,
  };
}

export function makeDecisionTrace(
  overrides: Partial<DecisionTrace> = {},
): DecisionTrace {
  const base: DecisionTrace = {
    traceId: "0f9f2c5b-5f5e-4b1d-8f9f-2c5b5f5e4b1d",
    npcId: "5b7d2c1e-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    householdId: "c1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
    decidedAt: new Date("2026-01-01T10:00:00Z"),
    seed: "seed-1",
    steps: [makeTraceStep()],
    candidates: [makeCandidate()],
    eliminations: [],
    scores: [makeUtilityScore()],
    selectedCandidateId: "seek_food:self",
    selectionReason: "selected seek_food with top utility 0.6",
    contentHash: "abc".repeat(21) + "a",
  };
  return { ...base, ...overrides };
}

export function makeDecisionEvent(
  overrides: Partial<NpcDecisionEvent> = {},
): NpcDecisionEvent {
  const base: NpcDecisionEvent = {
    id: "3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a",
    npcId: "5b7d2c1e-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    householdId: "c1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
    eventType: "NPC_DECISION_MADE",
    eventVersion: 1,
    aggregateVersion: 1,
    traceId: "0f9f2c5b-5f5e-4b1d-8f9f-2c5b5f5e4b1d",
    selectedCandidateId: "seek_food:self",
    createdAt: new Date("2026-01-01T10:00:00Z"),
  };
  return { ...base, ...overrides };
}

export function makeDefaultWeightPolicy(): UtilityWeightPolicy {
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
