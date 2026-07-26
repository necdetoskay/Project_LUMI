import { describe, expect, it } from "vitest";
import {
  calculateInteractionScore,
} from "./interaction-score";

describe("interaction score", () => {
  it("returns maximum for ideal candidate", () => {
    expect(
      calculateInteractionScore({
        sourceCharacterId: "npc",
        worldId: "world",
        interactionType: "rumor",
        title: "Rumor",
        summary: "Summary",
        payload: {},
        utility: 1,
        urgency: 1,
        relationshipScore: 1,
        noveltyScore: 1,
        safetyScore: 1,
      }),
    ).toBe(1);
  });
});
