import { describe, expect, it } from "vitest";
import { getExpiryLabel } from "./format-expiry";

describe("expiry label", () => {
  it("formats remaining hours", () => {
    const now = new Date(
      "2026-07-25T12:00:00.000Z",
    );

    expect(
      getExpiryLabel(
        new Date(
          "2026-07-25T17:00:00.000Z",
        ),
        now,
      ),
    ).toBe("5 saat kaldı");
  });
});
