import { describe, expect, it } from "vitest";
import {
  OpportunityScorer,
  computeOpportunityScore,
  DEFAULT_OPPORTUNITY_SCORE_POLICY,
  validateOpportunityScorePolicy,
  type OpportunityScoreComponents,
  type OpportunityScorePolicy,
} from "../../src/domain/opportunity-scoring";

const COMPONENTS: OpportunityScoreComponents = {
  relationshipRelevance: 0.8,
  spatialProximity: 0.9,
  goalAlignment: 0.4,
  informationConfidence: 0.9,
  urgency: 0.3,
  emotionalAppropriateness: 0.7,
  novelty: 0.6,
  expectedChildValue: 0.5,
  worldConsequence: 0.2,
  repetitionPenalty: 0,
  safetyRisk: 0,
};

describe("OpportunityScorer", () => {
  const scorer = new OpportunityScorer();

  it("computes a deterministic weighted sum", () => {
    const a = scorer.score("o-1", COMPONENTS, DEFAULT_OPPORTUNITY_SCORE_POLICY);
    const b = scorer.score("o-1", COMPONENTS, DEFAULT_OPPORTUNITY_SCORE_POLICY);
    expect(a.total).toBe(b.total);
    expect(a.policyVersion).toBe(DEFAULT_OPPORTUNITY_SCORE_POLICY.version);
  });

  it("applies penalties for safety risk and repetition", () => {
    const risky: OpportunityScoreComponents = {
      ...COMPONENTS,
      safetyRisk: 1,
      repetitionPenalty: 0.5,
    };
    const safe = scorer.score(
      "o-1",
      COMPONENTS,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    const riskyScore = scorer.score(
      "o-2",
      risky,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    expect(riskyScore.total).toBeLessThan(safe.total);
    expect(riskyScore.reasons).toContain("safetyRisk=1");
  });

  it("a high-scoring opportunity beats a low-scoring one", () => {
    const low: OpportunityScoreComponents = {
      ...COMPONENTS,
      relationshipRelevance: 0.1,
      spatialProximity: 0.1,
      informationConfidence: 0.2,
    };
    const a = scorer.score("o-a", COMPONENTS, DEFAULT_OPPORTUNITY_SCORE_POLICY);
    const b = scorer.score("o-b", low, DEFAULT_OPPORTUNITY_SCORE_POLICY);
    expect(a.total).toBeGreaterThan(b.total);
  });

  it("validate rejects a negative benefit weight", () => {
    const bad: OpportunityScorePolicy = {
      version: "2",
      updatedAt: new Date(),
      weights: { ...DEFAULT_OPPORTUNITY_SCORE_POLICY.weights, novelty: -1 },
    };
    expect(() => validateOpportunityScorePolicy(bad)).toThrowError(
      "weights.novelty must be >= 0",
    );
  });

  it("validate rejects a positive penalty weight", () => {
    const bad: OpportunityScorePolicy = {
      version: "2",
      updatedAt: new Date(),
      weights: { ...DEFAULT_OPPORTUNITY_SCORE_POLICY.weights, safetyRisk: 0.1 },
    };
    expect(() => validateOpportunityScorePolicy(bad)).toThrowError(
      "weights.safetyRisk must be <= 0",
    );
  });

  it("computeOpportunityScore matches the scorer total", () => {
    const direct = computeOpportunityScore(
      COMPONENTS,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    const viaScorer = scorer.score(
      "o-1",
      COMPONENTS,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    expect(direct).toBe(viaScorer.total);
  });

  it("is type-independent (scoring driven purely by components)", () => {
    // A gift with identical components scores identically to a rumor.
    const giftScore = scorer.score(
      "o-gift",
      COMPONENTS,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    const rumorScore = scorer.score(
      "o-rumor",
      COMPONENTS,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    expect(giftScore.total).toBe(rumorScore.total);
  });

  it("penalizes a gift with high safety risk magnitude", () => {
    const risky: OpportunityScoreComponents = {
      ...COMPONENTS,
      safetyRisk: 1,
    };
    const riskyScore = scorer.score(
      "o-gift-risky",
      risky,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    const safeScore = scorer.score(
      "o-gift-safe",
      COMPONENTS,
      DEFAULT_OPPORTUNITY_SCORE_POLICY,
    );
    expect(riskyScore.total).toBeLessThan(safeScore.total);
  });
});
