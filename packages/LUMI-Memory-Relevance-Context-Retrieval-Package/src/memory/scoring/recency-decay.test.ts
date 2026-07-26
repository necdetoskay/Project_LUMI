import { describe, expect, it } from "vitest";
import { calculateRecencyScore } from "./recency-decay";

describe("recency decay", () => {
  it("returns one for a current memory", () => {
    const now = new Date(
      "2026-07-25T00:00:00.000Z",
    );

    expect(
      calculateRecencyScore({
        occurredAt: now,
        now,
        halfLifeDays: 10,
      }),
    ).toBe(1);
  });

  it("returns half after one half-life", () => {
    const now = new Date(
      "2026-07-25T00:00:00.000Z",
    );
    const occurredAt = new Date(
      "2026-07-15T00:00:00.000Z",
    );

    expect(
      calculateRecencyScore({
        occurredAt,
        now,
        halfLifeDays: 10,
      }),
    ).toBeCloseTo(0.5);
  });
});
