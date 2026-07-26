import { describe, expect, it } from "vitest";
import { isCooldownActive } from "./interaction-cooldown";

describe("interaction cooldown", () => {
  it("blocks interaction inside pair cooldown", () => {
    const now = new Date(
      "2026-07-25T12:00:00.000Z",
    );

    expect(
      isCooldownActive({
        now,
        lastPairInteractionAt:
          new Date(
            "2026-07-25T10:00:00.000Z",
          ),
        policy: {
          interactionType: "rumor",
          sourceCooldownHours: 1,
          targetCooldownHours: 1,
          pairCooldownHours: 6,
        },
      }),
    ).toBe(true);
  });
});
