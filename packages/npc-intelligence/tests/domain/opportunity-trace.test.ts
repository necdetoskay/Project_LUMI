import { describe, expect, it } from "vitest";
import {
  buildOpportunityTrace,
  sanitizeOpportunityTrace,
  type OpportunityTraceContext,
} from "../../src/domain/opportunity-trace";
import { InteractionOpportunity } from "../../src/domain/opportunity";

function makeOpportunity() {
  return InteractionOpportunity.create({
    householdId: "hh-1",
    sourceNpcId: "npc-1",
    childProfileId: "child-1",
    opportunityType: "rumor",
    message: "The bridge by the mill is damaged.",
    evidence: { beliefId: "b-1", confidence: 0.9 },
    score: 0.8,
    cooldownKeys: ["npc-1:child-1:rumor"],
    expiresAt: new Date(Date.now() + 60_000),
    reason: "rumor about world event",
  });
}

function makeContext(
  overrides: Partial<OpportunityTraceContext> = {},
): OpportunityTraceContext {
  return {
    householdId: "hh-1",
    sourceNpcId: "npc-1",
    childProfileId: "child-1",
    opportunity: makeOpportunity(),
    gates: ["cooldown-passed", "novelty-passed", "safety-safe"],
    outcome: "delivered",
    outcomeReason: "delivered to inbox",
    npcSelectionReason: "npc is in the child's location",
    seed: "seed-1",
    ...overrides,
  };
}

describe("OpportunityTrace", () => {
  it("builds a trace with content hash", () => {
    const trace = buildOpportunityTrace(makeContext(), [
      { step: "delivery", message: "delivered", data: { result: "delivered" } },
    ]);
    expect(trace.contentHash).toBeTruthy();
    expect(trace.outcome).toBe("delivered");
    expect(trace.gates).toContain("safety-safe");
  });

  it("produces a deterministic content hash for equal inputs", () => {
    const steps = [
      {
        step: "delivery" as const,
        message: "delivered",
        data: { result: "delivered" },
      },
    ];
    const a = buildOpportunityTrace(makeContext(), steps);
    const b = buildOpportunityTrace(makeContext(), steps);
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("sanitizes step data to the safelist", () => {
    const trace = buildOpportunityTrace(makeContext(), [
      {
        step: "scoring",
        message: "scored",
        data: {
          policyVersion: "1.0.0",
          total: 0.8,
          secretChildId: "should-strip",
        },
      },
    ]);
    const sanitized = sanitizeOpportunityTrace(trace);
    const scoringStep = sanitized.steps.find((s) => s.step === "scoring");
    expect(scoringStep!.data).toEqual({ policyVersion: "1.0.0", total: 0.8 });
    expect(scoringStep!.data).not.toHaveProperty("secretChildId");
  });

  it("preserves evidence and gates after sanitization", () => {
    const trace = buildOpportunityTrace(makeContext(), []);
    const sanitized = sanitizeOpportunityTrace(trace);
    expect(sanitized.evidence).toEqual(trace.evidence);
    expect(sanitized.gates).toEqual(trace.gates);
    expect(sanitized.opportunityType).toBe("rumor");
  });

  it("records blocked outcome with reason", () => {
    const trace = buildOpportunityTrace(
      makeContext({
        opportunity: null,
        outcome: "blocked",
        outcomeReason: "forbidden by parent policy",
      }),
      [
        {
          step: "safety_filter",
          message: "blocked",
          data: { verdict: "blocked" },
        },
      ],
    );
    expect(trace.outcome).toBe("blocked");
    expect(trace.outcomeReason).toContain("parent policy");
  });
});
