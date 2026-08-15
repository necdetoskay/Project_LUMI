import { describe, expect, it, vi } from "vitest";
import {
  CanonicalMemoryRetrievalAdapter,
  WorldEventRetrievalAdapter,
  type CanonicalMemoryReader,
  type WorldEventReader,
} from "../../src/adapters";
import type { RetrievalQuery } from "../../src/ports";

const baseQuery: RetrievalQuery = {
  householdId: "house-1",
  childProfileId: "child-1",
  worldId: "world-1",
  generationIntent: "story",
  query: "crystal cave",
  limit: 8,
};

describe("CanonicalMemoryRetrievalAdapter", () => {
  it("uses bounded authority retrieval and preserves provenance", async () => {
    const listRelevant = vi
      .fn<CanonicalMemoryReader["listRelevant"]>()
      .mockResolvedValue([
        {
          id: "m1",
          householdId: "house-1",
          worldId: "world-1",
          childProfileId: "child-1",
          ownerType: "profile",
          ownerId: "child-1",
          summary: "The child discovered the crystal cave.",
          salience: 0.9,
          confidence: 0.8,
          sourceType: "story_outcome",
          sourceId: "outcome-1",
          createdAt: new Date("2026-08-01T10:00:00Z"),
        },
      ]);
    const adapter = new CanonicalMemoryRetrievalAdapter(
      { listRelevant },
      () => new Date("2026-08-15T10:00:00Z"),
    );

    const result = await adapter.retrieve(baseQuery);

    expect(listRelevant).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "house-1",
        worldId: "world-1",
        ownerType: "profile",
        ownerId: "child-1",
        limit: 8,
      }),
    );
    expect(result.candidates[0]).toMatchObject({
      stableId: "memory:m1",
      provenance: {
        sourceKind: "memory",
        sourceId: "outcome-1",
        authority: "npc-intelligence/canonical-memory",
      },
    });
    expect(result.candidates[0]?.relevance).toBeCloseTo(0.72, 10);
  });

  it("defensively rejects cross-scope records returned by an authority", async () => {
    const reader: CanonicalMemoryReader = {
      listRelevant: async () => [
        {
          id: "leak",
          householdId: "other-house",
          worldId: "world-1",
          childProfileId: "child-1",
          ownerType: "profile",
          ownerId: "child-1",
          summary: "must not leak",
          salience: 1,
          confidence: 1,
          sourceType: "system_commit",
          sourceId: "secret",
          createdAt: new Date(),
        },
      ],
    };

    const result = await new CanonicalMemoryRetrievalAdapter(reader).retrieve(
      baseQuery,
    );
    expect(result.candidates).toEqual([]);
  });
});

describe("WorldEventRetrievalAdapter", () => {
  it("returns only world and household-safe events with stable provenance", async () => {
    const reader: WorldEventReader = {
      listRecent: async () => [
        {
          id: "e1",
          worldId: "world-1",
          eventType: "REGION_CHANGED",
          aggregateVersion: 3,
          actorHouseholdId: "house-1",
          payload: { regionId: "crystal-cave" },
          createdAt: new Date("2026-08-14T10:00:00Z"),
        },
        {
          id: "e2",
          worldId: "world-1",
          eventType: "PRIVATE_CHANGE",
          aggregateVersion: 4,
          actorHouseholdId: "other-house",
          payload: {},
          createdAt: new Date("2026-08-14T11:00:00Z"),
        },
      ],
    };

    const result = await new WorldEventRetrievalAdapter(reader).retrieve(
      baseQuery,
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      stableId: "world-event:e1",
      provenance: {
        sourceKind: "world-event",
        sourceId: "e1",
        authority: "world/event-store",
      },
    });
  });

  it("does not query a source excluded by sourceKinds", async () => {
    const listRecent = vi.fn<WorldEventReader["listRecent"]>();
    const adapter = new WorldEventRetrievalAdapter({ listRecent });

    const result = await adapter.retrieve({
      ...baseQuery,
      sourceKinds: ["memory"],
    });

    expect(result).toEqual({ candidates: [], truncated: false });
    expect(listRecent).not.toHaveBeenCalled();
  });
});
