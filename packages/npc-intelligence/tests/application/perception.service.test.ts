import { describe, expect, it } from "vitest";
import { PerceptionService } from "../../src/application/perception.service";
import {
  CrossFamilyAccessError,
  type Belief,
  type PerceptionBuildInput,
  type RawWorldFact,
} from "../../src/domain";

function makeFact(overrides: Partial<RawWorldFact> = {}): RawWorldFact {
  return {
    factId: "fact-1",
    householdId: "household-1",
    category: "location",
    claim: "the garden gate is open",
    locationId: "location-1",
    originNpcId: null,
    observedAt: new Date("2026-01-01T10:00:00Z"),
    confidence: 0.9,
    sensitivity: "safe",
    reach: "current_location",
    ...overrides,
  };
}

function makeBelief(overrides: Partial<Belief> = {}): Belief {
  return {
    id: "belief-1",
    npcId: "npc-1",
    householdId: "household-1",
    factId: "fact-1",
    claim: "the gate may be open",
    confidence: 0.6,
    source: "hearsay",
    provenance: ["npc-2"],
    createdAt: new Date("2026-01-01T09:00:00Z"),
    lastVerifiedAt: null,
    expiresAt: null,
    status: "active",
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<PerceptionBuildInput> = {},
): PerceptionBuildInput {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    atLocationId: "location-1",
    facts: [makeFact()],
    nearbyCharacterIds: ["npc-2"],
    spatialProximity: { "npc-2": 0.8 },
    timeSensitivity: 0.3,
    reachedAt: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

describe("PerceptionService", () => {
  it("passes directly observable facts with their own confidence", () => {
    const service = new PerceptionService();
    const window = service.buildWindow(buildInput(), [], new Date());

    expect(window.perceivedFacts).toHaveLength(1);
    expect(window.perceivedFacts[0]).toMatchObject({
      factId: "fact-1",
      source: "observation",
      confidence: 0.9,
    });
  });

  it("keeps distant facts only when an active belief exists, capped by belief confidence", () => {
    const service = new PerceptionService();
    const input = buildInput({
      facts: [makeFact({ reach: "unreachable", confidence: 0.9 })],
    });
    const belief = makeBelief({ confidence: 0.5 });

    const window = service.buildWindow(input, [belief], new Date());

    expect(window.perceivedFacts).toHaveLength(1);
    expect(window.perceivedFacts[0]).toMatchObject({
      source: "belief",
      confidence: 0.5,
    });
  });

  it("drops distant facts with no active belief", () => {
    const service = new PerceptionService();
    const input = buildInput({
      facts: [makeFact({ reach: "unreachable" })],
    });

    const window = service.buildWindow(input, [], new Date());

    expect(window.perceivedFacts).toHaveLength(0);
  });

  it("never includes personal-sensitivity facts in the decision window", () => {
    const service = new PerceptionService();
    const input = buildInput({
      facts: [makeFact({ sensitivity: "personal" })],
    });

    const window = service.buildWindow(input, [], new Date());

    expect(window.perceivedFacts).toHaveLength(0);
  });

  it("throws CrossFamilyAccessError when a raw fact belongs to another household", () => {
    const service = new PerceptionService();
    const input = buildInput({
      facts: [makeFact({ householdId: "household-2" })],
    });

    expect(() => service.buildWindow(input, [], new Date())).toThrow(
      CrossFamilyAccessError,
    );
  });

  it("throws CrossFamilyAccessError when a belief belongs to another household", () => {
    const service = new PerceptionService();
    const belief = makeBelief({ householdId: "household-2" });

    expect(() =>
      service.buildWindow(buildInput(), [belief], new Date()),
    ).toThrow(CrossFamilyAccessError);
  });

  it("ignores expired or stale beliefs", () => {
    const service = new PerceptionService();
    const input = buildInput({
      facts: [makeFact({ reach: "unreachable" })],
    });
    const now = new Date("2026-01-01T12:00:00Z");
    const expired = makeBelief({
      status: "active",
      expiresAt: new Date("2026-01-01T08:00:00Z"),
    });

    const window = service.buildWindow(input, [expired], now);

    expect(window.perceivedFacts).toHaveLength(0);
  });
});
