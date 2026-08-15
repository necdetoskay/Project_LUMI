import { describe, expect, it } from "vitest";

import { worldToContextItems } from "../../src/application/world-context-mapper";
import { testWorld } from "../fixtures/contexts";

describe("worldToContextItems", () => {
  it("decomposes world state into ordered semantic context items", () => {
    const items = worldToContextItems(testWorld);
    expect(items.map((item) => item.id)).toEqual(["world:location", "world:hazards", "world:visible-changes", "world:facts", "world:environment", "world:inaccessible"]);
    expect(items.map((item) => item.priority)).toEqual([0, 1, 1, 2, 3, 3]);
    expect(items[0]?.text).toContain("Old Mill surroundings");
  });

  it("preserves source provenance supplied by production adapters", () => {
    const items = worldToContextItems(testWorld, { sourceEngine: "world-event-retrieval", authority: 0.91, confidence: 0.88, relevance: 0.84 });
    expect(items.every((item) => item.sourceEngine === "world-event-retrieval")).toBe(true);
    expect(items.every((item) => item.authority === 0.91)).toBe(true);
    expect(items.every((item) => item.confidence === 0.88)).toBe(true);
  });
});
