import { describe, expect, it } from "vitest";

import { isBackgroundLifeDue } from "@/lib/background-life/worker";

describe("background life worker scheduling guard", () => {
  it("treats an absent clock timestamp as due", () => {
    expect(isBackgroundLifeDue(null, new Date("2026-08-22T18:00:00.000Z"))).toBe(
      true,
    );
  });

  it("enforces a one-hour minimum interval", () => {
    const now = new Date("2026-08-22T18:00:00.000Z");
    expect(
      isBackgroundLifeDue(new Date("2026-08-22T17:00:01.000Z"), now),
    ).toBe(false);
    expect(
      isBackgroundLifeDue(new Date("2026-08-22T17:00:00.000Z"), now),
    ).toBe(true);
  });
});
