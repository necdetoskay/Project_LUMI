import { describe, expect, it } from "vitest";

import {
  isRetrievableMemory,
  type CanonicalMemory,
  validateCanonicalMemory,
} from "../../src/domain/memory";

function makeMemory(overrides: Partial<CanonicalMemory> = {}): CanonicalMemory {
  return {
    id: "mem-1",
    householdId: "household-1",
    worldId: "world-1",
    childProfileId: "profile-1",
    ownerType: "character",
    ownerId: "character-1",
    kind: "experience",
    summary: "Arin eski koprunun kapisinin kilitli oldugunu gordu.",
    salience: 0.8,
    confidence: 0.95,
    sourceType: "story_outcome",
    sourceId: "effect-1",
    storySessionId: "session-1",
    outcomeId: "outcome-1",
    effectKey: "memory:outcome-1:effect-1:character-1",
    provenance: ["story_outcome:outcome-1", "effect:effect-1"],
    lifecycle: "durable",
    supersedesMemoryId: null,
    createdAt: new Date("2026-08-09T12:00:00.000Z"),
    lastReinforcedAt: null,
    expiresAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe("canonical memory", () => {
  it("accepts a fully scoped committed-outcome memory", () => {
    expect(() => validateCanonicalMemory(makeMemory())).not.toThrow();
  });

  it("rejects salience outside the confidence range", () => {
    expect(() =>
      validateCanonicalMemory(makeMemory({ salience: 1.1 })),
    ).toThrow();
  });

  it("requires supersession provenance for superseded memories", () => {
    expect(() =>
      validateCanonicalMemory(
        makeMemory({ lifecycle: "superseded", supersedesMemoryId: null }),
      ),
    ).toThrow(/supersedesMemoryId/);
  });

  it("requires an archive timestamp for archived memories", () => {
    expect(() =>
      validateCanonicalMemory(
        makeMemory({ lifecycle: "archived", archivedAt: null }),
      ),
    ).toThrow(/archivedAt/);
  });

  it("does not retrieve archived, superseded or expired memories", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");

    expect(isRetrievableMemory(makeMemory(), now)).toBe(true);
    expect(
      isRetrievableMemory(
        makeMemory({
          lifecycle: "superseded",
          supersedesMemoryId: "mem-0",
        }),
        now,
      ),
    ).toBe(false);
    expect(
      isRetrievableMemory(
        makeMemory({
          lifecycle: "archived",
          archivedAt: new Date("2026-08-09T18:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(false);
    expect(
      isRetrievableMemory(
        makeMemory({ expiresAt: new Date("2026-08-10T11:59:59.000Z") }),
        now,
      ),
    ).toBe(false);
  });
});
