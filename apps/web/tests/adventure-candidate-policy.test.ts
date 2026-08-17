import { describe, expect, it } from "vitest";

import { selectAdventureCandidateWindow } from "@/lib/stories/adventure-candidate-policy";
import type { AdventureHookCandidate } from "@/lib/stories/adventure-presentation";

function ctaKeyForFamily(
  sourceFamily: AdventureHookCandidate["sourceFamily"],
): AdventureHookCandidate["ctaKey"] {
  if (sourceFamily === "world_event") return "chooseWorldEvent";
  if (sourceFamily === "rumor") return "investigateRumor";
  if (sourceFamily === "npc_call") return "answerNpcCall";
  return "followItem";
}

function candidate(
  id: string,
  sourceFamily: AdventureHookCandidate["sourceFamily"],
): AdventureHookCandidate {
  return {
    id,
    sourceFamily,
    title: id,
    teaser: id,
    ctaKey: ctaKeyForFamily(sourceFamily),
    image: null,
  };
}

describe("Genesis adventure candidate policy", () => {
  // Regression: family-aware windows prevent large inventories from starving real Genesis sources.
  it("keeps a real world event in the first window even with a large inventory", () => {
    const inventory = Array.from({ length: 100 }, (_, index) =>
      candidate(`inventory:${index}`, "inventory_item"),
    );
    const worldEvent = candidate("world-event:event-1", "world_event");

    const result = selectAdventureCandidateWindow([...inventory, worldEvent], {
      limit: 6,
    });

    expect(result.candidates[0]).toEqual(worldEvent);
    expect(result.candidates).toContainEqual(worldEvent);
  });

  it("interleaves all eligible source families before filling with extras", () => {
    const result = selectAdventureCandidateWindow(
      [
        candidate("inventory:1", "inventory_item"),
        candidate("inventory:2", "inventory_item"),
        candidate("npc:1", "npc_call"),
        candidate("rumor:1", "rumor"),
        candidate("world-event:1", "world_event"),
      ],
      { limit: 4 },
    );

    expect(result.candidates.map((item) => item.sourceFamily)).toEqual([
      "world_event",
      "rumor",
      "npc_call",
      "inventory_item",
    ]);
  });

  it("uses page windows as seen-candidate progression instead of rotating one flat array", () => {
    const candidates = [
      candidate("world-event:1", "world_event"),
      candidate("world-event:2", "world_event"),
      candidate("rumor:1", "rumor"),
      candidate("rumor:2", "rumor"),
      candidate("npc:1", "npc_call"),
      candidate("inventory:1", "inventory_item"),
      candidate("inventory:2", "inventory_item"),
    ];

    const first = selectAdventureCandidateWindow(candidates, {
      page: 0,
      limit: 4,
    });
    const second = selectAdventureCandidateWindow(candidates, {
      page: 1,
      limit: 4,
    });

    expect(first.candidates.map((item) => item.id)).toEqual([
      "world-event:1",
      "rumor:1",
      "npc:1",
      "inventory:1",
    ]);
    expect(second.candidates.map((item) => item.id)).toEqual([
      "world-event:2",
      "rumor:2",
      "inventory:2",
    ]);
    expect(second.hasMoreUnseen).toBe(false);
  });

  it("records an actionable reason when sparse ecology has no NPC call", () => {
    const result = selectAdventureCandidateWindow(
      [candidate("world-event:1", "world_event")],
      {
        unavailableReasons: {
          npc_call:
            "Sparse Genesis ecology has no eligible NPC relationship yet.",
        },
      },
    );

    expect(
      result.diagnostics.find((entry) => entry.sourceFamily === "npc_call"),
    ).toEqual({
      sourceFamily: "npc_call",
      available: false,
      reason: "Sparse Genesis ecology has no eligible NPC relationship yet.",
    });
  });
});
