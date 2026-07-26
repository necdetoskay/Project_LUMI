import { describe, expect, it } from "vitest";
import { evaluateParentApproval } from "./evaluate-parent-approval";

describe("parent approval", () => {
  const policy = {
    householdId: "household",
    approvalMode: "high_risk_only" as const,
    allowChildToAcceptOpportunities: false,
    allowGiftAcceptance: true,
    allowWarningsWithoutApproval: true,
    maxDailyOpportunities: 5,
    mutedInteractionTypes: [],
    allowedAgeBands: ["6-8"],
  };

  it("allows warnings without approval", () => {
    const result =
      evaluateParentApproval({
        policy,
        interactionType: "warning",
        safetyScore: 1,
        urgency: 0.9,
        childAgeBand: "6-8",
      });

    expect(result.requiresApproval).toBe(false);
    expect(result.childVisible).toBe(true);
  });

  it("blocks muted interaction types", () => {
    const result =
      evaluateParentApproval({
        policy: {
          ...policy,
          mutedInteractionTypes: ["gift"],
        },
        interactionType: "gift",
        safetyScore: 1,
        urgency: 0.2,
        childAgeBand: "6-8",
      });

    expect(result.blocked).toBe(true);
  });
});
