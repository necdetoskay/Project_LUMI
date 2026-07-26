import { describe, expect, it } from "vitest";
import { resolveDateRange } from "./date-range";

describe("date range", () => {
  it("resolves a seven day range", () => {
    const now = new Date(
      "2026-07-25T00:00:00.000Z",
    );

    const result = resolveDateRange({
      preset: "7d",
      now,
    });

    expect(
      result.to.getTime() -
        result.from.getTime(),
    ).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });
});
