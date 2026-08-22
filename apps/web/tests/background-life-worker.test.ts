import { describe, expect, it } from "vitest";

import { isBackgroundLifeDue } from "@/lib/background-life/worker";

describe("background life worker scheduling guard", () => {
  it("treats an absent prior run as due", () => {
    const now = new Date("2026-08-22T18:00:00.000Z");
    expect(isBackgroundLifeDue(null, now)).toBe(true);
  });

  it("enforces a one-hour minimum interval", () => {
    const now = new Date("2026-08-22T18:00:00.000Z");
    const justUnderOneHour = new Date("2026-08-22T17:00:01.000Z");
    const exactlyOneHour = new Date("2026-08-22T17:00:00.000Z");

    expect(isBackgroundLifeDue(justUnderOneHour, now)).toBe(false);
    expect(isBackgroundLifeDue(exactlyOneHour, now)).toBe(true);
  });
});
