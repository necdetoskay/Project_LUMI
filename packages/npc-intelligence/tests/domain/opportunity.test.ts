import { describe, expect, it } from "vitest";
import { InteractionOpportunity } from "../../src/domain/opportunity";
import { NpcIntelligenceError } from "../../src/domain/errors";

const BASE = {
  householdId: "hh-1",
  sourceNpcId: "npc-1",
  childProfileId: "child-1",
  opportunityType: "rumor" as const,
  message: "The bridge by the mill is damaged.",
  evidence: { beliefId: "b-1", eventId: "e-1" },
  score: 0.8,
  cooldownKeys: ["npc-1:child-1:rumor"],
  expiresAt: new Date(Date.now() + 60_000),
  reason: "rumor about world event",
};

describe("InteractionOpportunity", () => {
  it("creates a proposed opportunity with defaults", () => {
    const o = InteractionOpportunity.create(BASE);
    expect(o.status).toBe("proposed");
    expect(o.opportunityType).toBe("rumor");
    expect(o.schemaVersion).toBe(1);
    expect(o.cooldownKeys).toHaveLength(1);
  });

  it("accepts an opportunity and records response time", () => {
    const o = InteractionOpportunity.create({ ...BASE, status: "proposed" });
    const now = new Date();
    o.accept(now);
    expect(o.status).toBe("accepted");
    expect(o.getState().respondedAt).toEqual(now);
  });

  it("declines without punishment", () => {
    const o = InteractionOpportunity.create(BASE);
    o.decline();
    expect(o.status).toBe("declined");
  });

  it("defers for later review", () => {
    const o = InteractionOpportunity.create(BASE);
    o.defer();
    expect(o.status).toBe("deferred");
  });

  it("expires a proposed opportunity silently", () => {
    const o = InteractionOpportunity.create(BASE);
    o.expire();
    expect(o.status).toBe("expired");
    expect(o.getState().respondedAt).toBeNull();
  });

  it("never lets an expired opportunity be responded to", () => {
    const o = InteractionOpportunity.create({
      ...BASE,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(o.isExpired()).toBe(true);
    expect(() => o.accept()).toThrowError(
      "Opportunity has expired and cannot be responded to",
    );
  });

  it("rejects responding twice to the same opportunity", () => {
    const o = InteractionOpportunity.create(BASE);
    o.accept();
    expect(() => o.decline()).toThrowError(
      "Opportunity is accepted, only proposed can be responded to",
    );
  });

  it("rejects empty message", () => {
    expect(() =>
      InteractionOpportunity.create({ ...BASE, message: "  " }),
    ).toThrowError(NpcIntelligenceError);
  });

  it("rejects invalid score", () => {
    expect(() =>
      InteractionOpportunity.create({ ...BASE, score: Number.NaN }),
    ).toThrowError("Interaction opportunity score must be finite");
  });

  it("rejects unknown opportunity type", () => {
    expect(() =>
      InteractionOpportunity.create({
        ...BASE,
        opportunityType: "gift" as never,
      }),
    ).toThrowError("Invalid opportunity type: gift");
  });

  it("rejects missing scope", () => {
    expect(() =>
      InteractionOpportunity.create({ ...BASE, householdId: "" }),
    ).toThrowError(
      "Interaction opportunity requires householdId, sourceNpcId and childProfileId",
    );
  });

  it("returns a deep copy of state", () => {
    const o = InteractionOpportunity.create(BASE);
    const state = o.getState();
    state.evidence.beliefId = "changed";
    state.cooldownKeys.push("extra");
    expect(o.getState().evidence.beliefId).toBe("b-1");
    expect(o.getState().cooldownKeys).toHaveLength(1);
  });
});
