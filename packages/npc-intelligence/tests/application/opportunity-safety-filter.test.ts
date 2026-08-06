import { describe, expect, it } from "vitest";
import {
  OpportunitySafetyFilter,
  OPPORTUNITY_RISK,
  assertOpportunityType,
} from "../../src/application/opportunity-safety-filter.service";
import type { OpportunitySafetySnapshot } from "../../src/application/opportunity-safety-filter.service";
import { NpcIntelligenceError } from "../../src/domain/errors";

const BASE_SAFETY: OpportunitySafetySnapshot = {
  forbiddenOpportunityTypes: [],
  requireParentApprovalForConditional: true,
  childAgeBand: "5-7",
};

describe("OpportunitySafetyFilter", () => {
  const filter = new OpportunitySafetyFilter();

  it("marks a forbidden type as blocked before scoring", () => {
    const decision = filter.filter("rumor", {
      ...BASE_SAFETY,
      forbiddenOpportunityTypes: ["rumor"],
    });
    expect(decision.verdict).toBe("blocked");
    expect(decision.reason).toContain("forbidden by parent policy");
  });

  it("marks a safe type as safe", () => {
    const decision = filter.filter("rumor", BASE_SAFETY);
    expect(decision.verdict).toBe("safe");
  });

  it("flags a conditional type for parent approval", () => {
    const decision = filter.filter("invitation", BASE_SAFETY);
    expect(decision.verdict).toBe("conditional");
    expect(decision.reason).toContain("requires parent approval");
  });

  it("allows a conditional type without approval when policy permits", () => {
    const decision = filter.filter("invitation", {
      ...BASE_SAFETY,
      requireParentApprovalForConditional: false,
    });
    expect(decision.verdict).toBe("safe");
  });

  it("classifies risk levels per type", () => {
    expect(OPPORTUNITY_RISK.rumor).toBe("safe");
    expect(OPPORTUNITY_RISK.invitation).toBe("conditional");
  });

  it("assertOpportunityType rejects unknown types", () => {
    expect(() => assertOpportunityType("gift" as never)).toThrowError(
      NpcIntelligenceError,
    );
  });
});
