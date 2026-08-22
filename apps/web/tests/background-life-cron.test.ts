import { describe, expect, it } from "vitest";

import { isBackgroundLifeCronAuthorized } from "@/app/api/internal/background-life/route";
import { isBackgroundLifeDue } from "@/lib/background-life/worker";

describe("background life production boundary", () => {
  it("fails closed when the cron secret is missing", () => {
    expect(
      isBackgroundLifeCronAuthorized("Bearer anything", undefined),
    ).toBe(false);
  });

  it("requires an exact bearer secret", () => {
    expect(isBackgroundLifeCronAuthorized("Bearer secret", "secret")).toBe(
      true,
    );
    expect(isBackgroundLifeCronAuthorized("Bearer wrong", "secret")).toBe(
      false,
    );
    expect(isBackgroundLifeCronAuthorized(null, "secret")).toBe(false);
  });

  it("does not immediately rerun a world with a recent simulation run", () => {
    const now = new Date("2026-08-22T18:00:00.000Z");
    expect(
      isBackgroundLifeDue(new Date("2026-08-22T17:30:00.000Z"), now),
    ).toBe(false);
    expect(
      isBackgroundLifeDue(new Date("2026-08-22T16:59:59.000Z"), now),
    ).toBe(true);
    expect(isBackgroundLifeDue(null, now)).toBe(true);
  });
});
