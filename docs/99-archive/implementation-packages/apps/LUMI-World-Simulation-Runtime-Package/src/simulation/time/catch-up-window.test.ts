import { describe, expect, it } from "vitest";
import { calculateCatchUpWindow } from "./catch-up-window";

describe("catch-up window", () => {
  it("simulates elapsed time when below limit", () => {
    const from = new Date(
      "2026-07-20T00:00:00.000Z",
    );
    const now = new Date(
      "2026-07-23T00:00:00.000Z",
    );

    const result =
      calculateCatchUpWindow({
        lastSimulatedAt: from,
        now,
        maxCatchUpDays: 10,
        freezeAfterLimit: true,
      });

    expect(result.simulatedDays).toBe(3);
    expect(result.frozen).toBe(false);
  });

  it("caps simulation at ten days and freezes", () => {
    const from = new Date(
      "2026-07-01T00:00:00.000Z",
    );
    const now = new Date(
      "2026-07-25T00:00:00.000Z",
    );

    const result =
      calculateCatchUpWindow({
        lastSimulatedAt: from,
        now,
        maxCatchUpDays: 10,
        freezeAfterLimit: true,
      });

    expect(result.simulatedDays).toBe(10);
    expect(result.frozen).toBe(true);
  });
});
