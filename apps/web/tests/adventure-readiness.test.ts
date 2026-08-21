import { describe, expect, it } from "vitest";

import {
  adventureReadinessForBootstrap,
  adventureReadinessForCandidateWindow,
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
    "does not keep polling for %s bootstrap without candidate-window evidence",
    (status) => {
      expect(adventureReadinessForBootstrap(status)).toBe("ready");
    },
  );

  it("keeps a recently completed empty first source window preparing", () => {
    const completedAt = new Date("2026-08-21T11:59:36.573Z");
    expect(
      adventureReadinessForCandidateWindow({
        bootstrapStatus: "completed",
        candidateCount: 0,
        bootstrapUpdatedAt: completedAt,
        now: new Date("2026-08-21T11:59:45.000Z"),
      }),
    ).toBe("preparing");
  });

  it("becomes ready immediately when a real candidate is visible", () => {
    expect(
      adventureReadinessForCandidateWindow({
        bootstrapStatus: "completed",
        candidateCount: 1,
        bootstrapUpdatedAt: new Date("2026-08-21T11:59:36.573Z"),
        now: new Date("2026-08-21T11:59:45.000Z"),
      }),
    ).toBe("ready");
  });

  it("does not poll forever for an old completed bootstrap with no candidates", () => {
    expect(
      adventureReadinessForCandidateWindow({
        bootstrapStatus: "completed",
        candidateCount: 0,
        bootstrapUpdatedAt: new Date("2026-08-21T11:59:36.573Z"),
        now: new Date("2026-08-21T12:01:36.573Z"),
      }),
    ).toBe("ready");
  });

  it.each(["failed", null] as const)(
    "does not hide stable empty state for %s bootstrap",
    (bootstrapStatus) => {
      expect(
        adventureReadinessForCandidateWindow({
          bootstrapStatus,
          candidateCount: 0,
          bootstrapUpdatedAt: null,
          now: new Date("2026-08-21T12:00:00.000Z"),
        }),
      ).toBe("ready");
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
