import { describe, expect, it } from "vitest";
import {
  createMemoryFingerprint,
} from "./memory-fingerprint";

describe("memory fingerprint", () => {
  it("normalizes equivalent summaries", () => {
    const first = createMemoryFingerprint({
      worldId: "world",
      memoryType: "event",
      summary: "Lina, haritayı buldu!",
      sourceEntityType: "story",
      sourceEntityId: "story-1",
    });

    const second = createMemoryFingerprint({
      worldId: "world",
      memoryType: "event",
      summary: "Lina haritayı buldu",
      sourceEntityType: "story",
      sourceEntityId: "story-1",
    });

    expect(first).toBe(second);
  });
});
