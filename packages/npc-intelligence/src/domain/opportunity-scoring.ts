import { assertFiniteNumber } from "./validation";
import { NpcIntelligenceError } from "./errors";

export const OPPORTUNITY_SCORING_POLICY_VERSION = "1.0.0";

export interface OpportunityScoreWeights {
  /** How relevant the NPC/opportunity is to the child's relationships. */
  relationshipRelevance: number;
  /** Physical/social proximity of the source to the child's location. */
  spatialProximity: number;
  /** Alignment with the child's active goals/needs. */
  goalAlignment: number;
  /** Confidence of the underlying belief/fact (rumor reliability). */
  informationConfidence: number;
  /** Time sensitivity of the opportunity (must be acted on soon). */
  urgency: number;
  /** Emotional appropriateness for the current context. */
  emotionalAppropriateness: number;
  /** Novelty / how fresh this opportunity is (repeat penalty is separate). */
  novelty: number;
  /** Expected value for the child. */
  expectedChildValue: number;
  /** Magnitude of the world consequence. */
  worldConsequence: number;
  /** Repetition penalty (<= 0). */
  repetitionPenalty: number;
  /** Safety risk penalty (<= 0). */
  safetyRisk: number;
}

export interface OpportunityScorePolicy {
  version: string;
  weights: OpportunityScoreWeights;
  updatedAt: Date;
}

export interface OpportunityScoreComponents {
  relationshipRelevance: number;
  spatialProximity: number;
  goalAlignment: number;
  informationConfidence: number;
  urgency: number;
  emotionalAppropriateness: number;
  novelty: number;
  expectedChildValue: number;
  worldConsequence: number;
  /** Repetition magnitude 0..1 (weight is negative → penalty). */
  repetitionPenalty: number;
  /** Safety risk magnitude 0..1 (weight is negative → penalty). */
  safetyRisk: number;
}

export interface OpportunityScore {
  opportunityId: string;
  total: number;
  components: OpportunityScoreComponents;
  policyVersion: string;
  reasons: string[];
}

const BENEFIT_KEYS = [
  "relationshipRelevance",
  "spatialProximity",
  "goalAlignment",
  "informationConfidence",
  "urgency",
  "emotionalAppropriateness",
  "novelty",
  "expectedChildValue",
  "worldConsequence",
] as const satisfies readonly (keyof OpportunityScoreWeights)[];

const PENALTY_KEYS = [
  "repetitionPenalty",
  "safetyRisk",
] as const satisfies readonly (keyof OpportunityScoreWeights)[];

/** Default versioned policy (deterministic; not LLM-tuned). */
export const DEFAULT_OPPORTUNITY_SCORE_POLICY: OpportunityScorePolicy = {
  version: OPPORTUNITY_SCORING_POLICY_VERSION,
  updatedAt: new Date("2026-08-06T00:00:00Z"),
  weights: {
    relationshipRelevance: 0.2,
    spatialProximity: 0.15,
    goalAlignment: 0.1,
    informationConfidence: 0.1,
    urgency: 0.05,
    emotionalAppropriateness: 0.1,
    novelty: 0.1,
    expectedChildValue: 0.1,
    worldConsequence: 0.1,
    repetitionPenalty: -0.1,
    safetyRisk: -0.2,
  },
};

export function validateOpportunityScorePolicy(
  policy: OpportunityScorePolicy,
): void {
  if (
    typeof policy.version !== "string" ||
    policy.version.trim().length === 0
  ) {
    throw new NpcIntelligenceError(
      "INVALID_OPPORTUNITY_POLICY",
      "opportunity score policy version must be a non-empty string",
    );
  }
  for (const key of BENEFIT_KEYS) {
    assertFiniteNumber(policy.weights[key], `weights.${key}`);
    if (policy.weights[key] < 0) {
      throw new NpcIntelligenceError(
        "INVALID_OPPORTUNITY_POLICY",
        `weights.${key} must be >= 0`,
      );
    }
  }
  for (const key of PENALTY_KEYS) {
    assertFiniteNumber(policy.weights[key], `weights.${key}`);
    if (policy.weights[key] > 0) {
      throw new NpcIntelligenceError(
        "INVALID_OPPORTUNITY_POLICY",
        `weights.${key} must be <= 0`,
      );
    }
  }
}

export function computeOpportunityScore(
  components: OpportunityScoreComponents,
  policy: OpportunityScorePolicy,
): number {
  const w = policy.weights;
  const total =
    components.relationshipRelevance * w.relationshipRelevance +
    components.spatialProximity * w.spatialProximity +
    components.goalAlignment * w.goalAlignment +
    components.informationConfidence * w.informationConfidence +
    components.urgency * w.urgency +
    components.emotionalAppropriateness * w.emotionalAppropriateness +
    components.novelty * w.novelty +
    components.expectedChildValue * w.expectedChildValue +
    components.worldConsequence * w.worldConsequence +
    components.repetitionPenalty * w.repetitionPenalty +
    components.safetyRisk * w.safetyRisk;
  return Number(total.toFixed(6));
}

/**
 * Scores an opportunity candidate across the multi-dimensional opportunity
 * policy. All benefit components are 0..1; penalties are <= 0. Deterministic
 * weighted sum; no candidate is boosted by an LLM.
 */
export class OpportunityScorer {
  score(
    opportunityId: string,
    components: OpportunityScoreComponents,
    policy: OpportunityScorePolicy,
  ): OpportunityScore {
    validateOpportunityScorePolicy(policy);
    const total = computeOpportunityScore(components, policy);
    return {
      opportunityId,
      total,
      components: { ...components },
      policyVersion: policy.version,
      reasons: this.buildReasons(components),
    };
  }

  private buildReasons(components: OpportunityScoreComponents): string[] {
    const reasons: string[] = [];
    const entries = Object.entries(components) as [
      keyof OpportunityScoreComponents,
      number,
    ][];
    const top = [...entries]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])[0];
    if (top) reasons.push(`${top[0]}=${top[1]}`);
    const risk = entries.find(([k]) => k === "safetyRisk")?.[1] ?? 0;
    if (risk > 0) reasons.push(`safetyRisk=${risk}`);
    return reasons;
  }
}
