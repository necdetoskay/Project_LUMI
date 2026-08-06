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
    expect(OPPORTUNITY_RISK.gift).toBe("conditional");
    expect(OPPORTUNITY_RISK.warning).toBe("conditional");
    expect(OPPORTUNITY_RISK.quest_seed).toBe("safe");
    expect(OPPORTUNITY_RISK.social_visit).toBe("conditional");
    expect(OPPORTUNITY_RISK.information_share).toBe("safe");
  });

  it("assertOpportunityType accepts all known types", () => {
    expect(() => assertOpportunityType("gift")).not.toThrow();
    expect(() => assertOpportunityType("warning")).not.toThrow();
    expect(() => assertOpportunityType("quest_seed")).not.toThrow();
    expect(() => assertOpportunityType("social_visit")).not.toThrow();
    expect(() => assertOpportunityType("information_share")).not.toThrow();
  });

  it("assertOpportunityType rejects unknown types", () => {
    expect(() => assertOpportunityType("bogus")).toThrowError(
      NpcIntelligenceError,
    );
  });

  it("flags every conditional type for parent approval (gift/warning/social_visit)", () => {
    for (const type of ["gift", "warning", "social_visit"] as const) {
      const decision = filter.filter(type, BASE_SAFETY);
      expect(decision.verdict).toBe("conditional");
      expect(decision.reason).toContain("requires parent approval");
    }
  });

  it("allows safe types without approval (quest_seed/information_share)", () => {
    for (const type of ["quest_seed", "information_share"] as const) {
      const decision = filter.filter(type, BASE_SAFETY);
      expect(decision.verdict).toBe("safe");
    }
  });

  it("blocks any type forbidden by parent policy before scoring", () => {
    for (const type of [
      "gift",
      "warning",
      "quest_seed",
      "social_visit",
      "information_share",
    ] as const) {
      const decision = filter.filter(type, {
        ...BASE_SAFETY,
        forbiddenOpportunityTypes: [type],
      });
      expect(decision.verdict).toBe("blocked");
    }
  });
});
