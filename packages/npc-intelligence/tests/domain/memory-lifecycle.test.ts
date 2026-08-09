import { describe, expect, it } from "vitest";

import type { CanonicalMemory } from "../../src/domain/memory";
import {
  compareMemoriesForRetrieval,
  effectiveMemorySalience,
} from "../../src/domain/memory-lifecycle";

function makeMemory(overrides: Partial<CanonicalMemory> = {}): CanonicalMemory {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    householdId: "00000000-0000-4000-8000-000000000010",
    worldId: "00000000-0000-4000-8000-000000000020",
    childProfileId: "00000000-0000-4000-8000-000000000030",
    ownerType: "npc",
    ownerId: "00000000-0000-4000-8000-000000000040",
    kind: "experience",
    summary: "Bora eski köprüde verdiği sözü hatırlıyor.",
    salience: 0.8,
    confidence: 0.9,
    sourceType: "story_outcome",
    sourceId: "effect-1",
    storySessionId: "00000000-0000-4000-8000-000000000050",
    outcomeId: "outcome-1",
    effectKey: "story-memory:outcome-1:effect-1",
    provenance: ["scene:bridge"],
    lifecycle: "durable",
    supersedesMemoryId: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    lastReinforcedAt: null,
    expiresAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe("memory lifecycle scoring", () => {
  it("does not decay durable memories over time", () => {
    const memory = makeMemory({ lifecycle: "durable", salience: 0.8 });

    expect(
      effectiveMemorySalience(memory, new Date("2027-08-01T00:00:00.000Z")),
    ).toBe(0.8);
  });

  it("halves decaying salience after the default seven-day half-life", () => {
    const memory = makeMemory({ lifecycle: "decaying", salience: 0.8 });

    expect(
      effectiveMemorySalience(memory, new Date("2026-08-08T00:00:00.000Z")),
    ).toBeCloseTo(0.4, 8);
  });

  it("uses reinforcement time as the decay anchor", () => {
    const memory = makeMemory({
      lifecycle: "decaying",
      salience: 0.8,
      lastReinforcedAt: new Date("2026-08-07T00:00:00.000Z"),
    });

    expect(
      effectiveMemorySalience(memory, new Date("2026-08-08T00:00:00.000Z")),
    ).toBeGreaterThan(0.7);
  });

  it("assigns zero effective salience to expired memories", () => {
    const now = new Date("2026-08-08T00:00:00.000Z");
    const memory = makeMemory({
      lifecycle: "decaying",
      expiresAt: new Date("2026-08-07T23:59:59.000Z"),
    });

    expect(effectiveMemorySalience(memory, now)).toBe(0);
  });

  it("ranks reinforced decaying memory above an equally stored but stale memory", () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    const stale = makeMemory({
      id: "00000000-0000-4000-8000-000000000001",
      lifecycle: "decaying",
      salience: 0.8,
    });
    const reinforced = makeMemory({
      id: "00000000-0000-4000-8000-000000000002",
      lifecycle: "decaying",
      salience: 0.8,
      lastReinforcedAt: new Date("2026-08-14T00:00:00.000Z"),
    });

    expect([stale, reinforced].sort((left, right) =>
      compareMemoriesForRetrieval(left, right, now),
    )[0]?.id).toBe(reinforced.id);
  });
});
