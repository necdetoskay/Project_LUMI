import { describe, expect, it, vi } from "vitest";

import {
  RetrievalLongTermMemorySource,
  RetrievalWorldEventSource,
} from "../../src/adapters";
import type { ContextRequest, ContextRetrievalSource } from "../../src/ports";

const request: ContextRequest = {
  householdId: "house-1",
  childProfileId: "child-1",
  worldId: "world-1",
  storySessionId: "story-1",
  focalCharacterId: "character-1",
  generationIntent: "story_generation",
  sceneFocus: "crystal cave",
};

describe("RetrievalLongTermMemorySource", () => {
  it("preserves story scope and converts memory candidates", async () => {
    const retrieve = vi
      .fn<ContextRetrievalSource["retrieve"]>()
      .mockResolvedValue({
        candidates: [
          {
            stableId: "memory:m1",
            relevance: 0.84,
            summary: "The character promised to protect the crystal cave.",
            payload: {},
            provenance: {
              sourceKind: "memory",
              sourceId: "outcome-1",
              authority: "npc-intelligence/canonical-memory",
            },
          },
        ],
        truncated: false,
      });

    const result = await new RetrievalLongTermMemorySource({ retrieve }).fetch(
      request,
    );

    expect(retrieve).toHaveBeenCalledWith({
      householdId: "house-1",
      childProfileId: "child-1",
      worldId: "world-1",
      storySessionId: "story-1",
      focalCharacterId: "character-1",
      generationIntent: "story_generation",
      query: "crystal cave",
      limit: 12,
      sourceKinds: ["memory"],
    });
    expect(result.sourceRelevance).toBe(0.84);
    expect(result.items[0]).toMatchObject({
      id: "memory:m1",
      type: "long-term-memory",
      sourceEngine: "npc-intelligence/canonical-memory",
      relevance: 0.84,
      content: {
        memoryId: "memory:m1",
        summary: "The character promised to protect the crystal cave.",
        emotionalWeight: 0.84,
      },
    });
  });

  it("returns an empty context source result when retrieval is empty", async () => {
    const retrieval: ContextRetrievalSource = {
      retrieve: async () => ({ candidates: [], truncated: false }),
    };

    await expect(
      new RetrievalLongTermMemorySource(retrieval).fetch(request),
    ).resolves.toEqual({ items: [], sourceRelevance: 0 });
  });
});

describe("RetrievalWorldEventSource", () => {
  it("requests only world events and exposes them as visible changes", async () => {
    const retrieve = vi
      .fn<ContextRetrievalSource["retrieve"]>()
      .mockResolvedValue({
        candidates: [
          {
            stableId: "world-event:e1",
            relevance: 0.9,
            summary: "A new crystal bridge appeared over the ravine.",
            payload: {},
            provenance: {
              sourceKind: "world-event",
              sourceId: "e1",
              authority: "world/event-store",
            },
          },
          {
            stableId: "world-event:e2",
            relevance: 0.7,
            summary: "The cave entrance now glows softly.",
            payload: {},
            provenance: {
              sourceKind: "world-event",
              sourceId: "e2",
              authority: "world/event-store",
            },
          },
        ],
        truncated: false,
      });

    const result = await new RetrievalWorldEventSource({ retrieve }).fetch(
      request,
    );

    expect(retrieve).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "house-1",
        childProfileId: "child-1",
        worldId: "world-1",
        sourceKinds: ["world-event"],
      }),
    );
    expect(result.sourceRelevance).toBe(0.9);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.content).toMatchObject({
      worldFacts: [],
      location: "crystal cave",
      timeOfDay: "unknown",
      activeHazards: [],
      visibleChanges: [
        "A new crystal bridge appeared over the ravine.",
        "The cave entrance now glows softly.",
      ],
      inaccessibleAreas: [],
    });
  });

  it("does not invent a world item when no world event exists", async () => {
    const retrieval: ContextRetrievalSource = {
      retrieve: async () => ({ candidates: [], truncated: false }),
    };

    await expect(
      new RetrievalWorldEventSource(retrieval).fetch(request),
    ).resolves.toEqual({ items: [], sourceRelevance: 0 });
  });
});
