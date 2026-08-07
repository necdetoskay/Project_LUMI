import { describe, expect, it } from "vitest";
import {
  RumorSafetyFilter,
  RUMOR_SAFETY_BOUNDARY,
} from "../../src/application/rumor-safety-filter.service";
import type { Rumor } from "../../src/domain/rumor";
import type { NpcIntelligenceError } from "../../src/domain/errors";
import type { RumorPropagationIntent } from "../../src/application/rumor-propagation.service";

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: "rumor-1",
    householdId: "household-1",
    factId: "fact-1",
    claim: "a rumor claim",
    originNpcId: "npc-a",
    sourceEventId: null,
    confidence: 0.8,
    provenance: [],
    hops: 0,
    createdAt: new Date(),
    expiresAt: null,
    ...overrides,
  };
}

function makeIntent(
  overrides: Partial<RumorPropagationIntent> = {},
): RumorPropagationIntent {
  return {
    targetNpcId: "npc-b",
    confidence: 0.8,
    provenance: [],
    hops: 0,
    belowFloor: false,
    ...overrides,
  };
}

describe("RumorSafetyFilter", () => {
  const filter = new RumorSafetyFilter();

  it("returns safe for a valid hearsay propagation intent", () => {
    const result = filter.check({ rumor: makeRumor(), intent: makeIntent() });
    expect(result.safe).toBe(true);
    expect(result.reason).toBe(
      "propagation intent is safe: hearsay belief only",
    );
  });

  it("returns unsafe when confidence is below 0", () => {
    const result = filter.check({
      rumor: makeRumor(),
      intent: makeIntent({ confidence: -0.1 }),
    });
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("out of range");
  });

  it("returns unsafe when confidence exceeds 1", () => {
    const result = filter.check({
      rumor: makeRumor(),
      intent: makeIntent({ confidence: 1.5 }),
    });
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("out of range");
  });

  it("returns unsafe when below floor is true", () => {
    const result = filter.check({
      rumor: makeRumor(),
      intent: makeIntent({ belowFloor: true }),
    });
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("propagation floor");
  });

  it("allows rumor with a sourceEventId (still hearsay)", () => {
    const rumor = makeRumor({ sourceEventId: "event-1" });
    const result = filter.check({ rumor, intent: makeIntent() });
    expect(result.safe).toBe(true);
  });

  it("returns safe for zero confidence (valid boundary)", () => {
    const result = filter.check({
      rumor: makeRumor(),
      intent: makeIntent({ confidence: 0 }),
    });
    expect(result.safe).toBe(true);
  });

  it("returns safe for max confidence (valid boundary)", () => {
    const result = filter.check({
      rumor: makeRumor(),
      intent: makeIntent({ confidence: 1 }),
    });
    expect(result.safe).toBe(true);
  });
});

describe("RumorSafetyFilter.validateAdoption", () => {
  const filter = new RumorSafetyFilter();

  it("does not throw for hearsay source", () => {
    expect(() => filter.validateAdoption(RUMOR_SAFETY_BOUNDARY)).not.toThrow();
  });

  it("throws for canonical source", () => {
    try {
      filter.validateAdoption("canonical");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as NpcIntelligenceError).code).toBe(
        "SAFETY_BOUNDARY_VIOLATION",
      );
    }
  });

  it("throws for world-state source", () => {
    try {
      filter.validateAdoption("world-state");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as NpcIntelligenceError).code).toBe(
        "SAFETY_BOUNDARY_VIOLATION",
      );
    }
  });
});
