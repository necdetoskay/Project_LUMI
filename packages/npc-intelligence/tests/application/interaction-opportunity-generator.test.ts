import { describe, expect, it } from "vitest";
import { InteractionOpportunityGenerator } from "../../src/application/interaction-opportunity-generator.service";
import type { OpportunityGenerationInput } from "../../src/application/interaction-opportunity-generator.service";
import type { PerceptionWindow } from "../../src/domain";

const NPC = "npc-1";
const HOUSEHOLD = "hh-1";
const CHILD = "child-1";
const OTHER_NPC = "npc-2";
const NOW = new Date("2026-08-06T12:00:00Z");

function makeWindow(
  overrides: Partial<PerceptionWindow> = {},
): PerceptionWindow {
  return {
    npcId: NPC,
    householdId: HOUSEHOLD,
    atLocationId: "loc-1",
    perceivedFacts: [
      {
        factId: "f-event-1",
        category: "event",
        claim: "the bridge by the mill is damaged",
        observedAt: NOW,
        confidence: 0.9,
        sensitivity: "safe",
        source: "belief",
      },
      {
        factId: "f-loc-1",
        category: "location",
        claim: "the village festival",
        observedAt: NOW,
        confidence: 0.8,
        sensitivity: "safe",
        source: "observation",
      },
    ],
    nearbyCharacterIds: [OTHER_NPC],
    spatialProximity: { [OTHER_NPC]: 0.9 },
    timeSensitivity: 0.5,
    reachedAt: NOW,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<OpportunityGenerationInput> = {},
): OpportunityGenerationInput {
  return {
    npcId: NPC,
    householdId: HOUSEHOLD,
    childProfileId: CHILD,
    window: makeWindow(),
    beliefs: [
      {
        id: "b-1",
        npcId: NPC,
        householdId: HOUSEHOLD,
        factId: "f-event-1",
        claim: "the bridge by the mill is damaged",
        confidence: 0.9,
        source: "world_event",
        provenance: ["e-1"],
        createdAt: NOW,
        lastVerifiedAt: NOW,
        expiresAt: null,
        status: "active",
      },
    ],
    relationshipTrust: { [OTHER_NPC]: 0.7 },
    forbiddenOpportunityTypes: [],
    firedCooldownKeys: new Set(),
    expiresAt: new Date(NOW.getTime() + 60_000),
    seed: "seed-1",
    ...overrides,
  };
}

describe("InteractionOpportunityGenerator", () => {
  const generator = new InteractionOpportunityGenerator();

  it("generates a rumor from an active belief", () => {
    const result = generator.generate(makeInput());
    const rumor = result.opportunities.find(
      (o) => o.opportunityType === "rumor",
    );
    expect(rumor).toBeDefined();
    expect(rumor!.sourceNpcId).toBe(NPC);
    expect(rumor!.evidence.beliefId).toBe("b-1");
  });

  it("generates an invitation to a nearby trusted character", () => {
    const result = generator.generate(makeInput());
    const invitation = result.opportunities.find(
      (o) => o.opportunityType === "invitation",
    );
    expect(invitation).toBeDefined();
    expect(invitation!.evidence.targetNpcId).toBe(OTHER_NPC);
  });

  it("never surfaces a rumor without an active belief (info access)", () => {
    const result = generator.generate(
      makeInput({
        beliefs: [], // NPC holds no belief about the event
      }),
    );
    const rumor = result.opportunities.find(
      (o) => o.opportunityType === "rumor",
    );
    expect(rumor).toBeUndefined();
    expect(
      result.reasons.some((r) => r.includes("no belief-backed rumor source")),
    ).toBe(true);
  });

  it("skips opportunities whose cooldown key already fired", () => {
    const result = generator.generate(
      makeInput({
        firedCooldownKeys: new Set([
          `source:${NPC}:rumor`,
          `pair:${NPC}:${OTHER_NPC}:invitation`,
        ]),
      }),
    );
    expect(result.opportunities).toHaveLength(0);
  });

  it("eliminates parent-forbidden opportunity types", () => {
    const result = generator.generate(
      makeInput({ forbiddenOpportunityTypes: ["rumor"] }),
    );
    const rumor = result.opportunities.find(
      (o) => o.opportunityType === "rumor",
    );
    expect(rumor).toBeUndefined();
    const invitation = result.opportunities.find(
      (o) => o.opportunityType === "invitation",
    );
    expect(invitation).toBeDefined();
  });

  it("respects the max opportunities bound", () => {
    const result = generator.generate(makeInput({ maxOpportunities: 1 }));
    expect(result.opportunities.length).toBeLessThanOrEqual(1);
  });

  it("is deterministic for the same input + seed", () => {
    const a = generator.generate(makeInput({ seed: "same" }));
    const b = generator.generate(makeInput({ seed: "same" }));
    const summarize = (ops: typeof a.opportunities) =>
      ops.map((o) => ({
        type: o.opportunityType,
        reason: o.reason,
        cooldownKeys: [...o.cooldownKeys].sort(),
      }));
    expect(summarize(a.opportunities)).toEqual(summarize(b.opportunities));
    expect(a.reasons).toEqual(b.reasons);
  });
});
