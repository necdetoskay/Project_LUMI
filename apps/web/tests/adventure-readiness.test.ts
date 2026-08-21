import { describe, expect, it } from "vitest";

import {
  adventureReadinessForBootstrap,
  shouldRetryAdventureCandidates,
} from "@/lib/stories/adventure-readiness";

describe("adventure readiness", () => {
  it.each(["planned", "running"] as const)(
    "treats %s bootstrap as preparing",
    (status) => {
      expect(adventureReadinessForBootstrap(status)).toBe("preparing");
    },
  );

  it.each(["completed", "failed", null] as const)(
    "does not keep polling for %s bootstrap",
    (status) => {
      expect(adventureReadinessForBootstrap(status)).toBe("ready");
    },
  );

  it("retries only the empty first page while bootstrap is preparing", () => {
    expect(
      shouldRetryAdventureCandidates({
        page: 0,
        candidateCount: 0,
        readiness: "preparing",
        attempt: 0,
        maxAttempts: 45,
      }),
    ).toBe(true);

    expect(
      shouldRetryAdventureCandidates({
        page: 1,
        candidateCount: 0,
        readiness: "preparing",
        attempt: 0,
        maxAttempts: 45,
      }),
    ).toBe(false);
    expect(
      shouldRetryAdventureCandidates({
        page: 0,
        candidateCount: 1,
        readiness: "preparing",
        attempt: 0,
        maxAttempts: 45,
      }),
    ).toBe(false);
    expect(
      shouldRetryAdventureCandidates({
        page: 0,
        candidateCount: 0,
        readiness: "ready",
        attempt: 0,
        maxAttempts: 45,
      }),
    ).toBe(false);
  });

  it("stops retrying at the bounded attempt limit", () => {
    expect(
      shouldRetryAdventureCandidates({
        page: 0,
        candidateCount: 0,
        readiness: "preparing",
        attempt: 44,
        maxAttempts: 45,
      }),
    ).toBe(false);
  });
});
