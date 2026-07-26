import { describe, expect, it } from "vitest";
import { calculateFeedPriority } from "./calculate-feed-priority";

describe("feed priority", () => {
  it("marks parent-pinned items urgent", () => {
    expect(
      calculateFeedPriority({
        urgency: 0,
        parentPinned: true,
      }),
    ).toBe("urgent");
  });

  it("raises priority near expiry", () => {
    expect(
      calculateFeedPriority({
        urgency: 0.8,
        expiryHours: 4,
        relationshipScore: 0.8,
        noveltyScore: 0.8,
      }),
    ).toBe("urgent");
  });
});
