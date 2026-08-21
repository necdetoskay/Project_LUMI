export type AdventureReadiness = "preparing" | "ready";
export type AdventureBootstrapStatus =
  | "planned"
  | "running"
  | "completed"
  | "failed"
  | null;
export type AdventureBootstrapTimestamp = Date | string | number | null;

export const INITIAL_ADVENTURE_VISIBILITY_GRACE_MS = 120_000;

export function adventureReadinessForBootstrap(
  status: AdventureBootstrapStatus,
): AdventureReadiness {
  return status === "planned" || status === "running" ? "preparing" : "ready";
}

function timestampMilliseconds(
  value: AdventureBootstrapTimestamp,
): number | null {
  if (value === null) return null;
  const milliseconds =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function isWithinVisibilityGrace(
  timestampMs: number | null,
  nowMs: number,
  graceMs: number,
): boolean {
  if (timestampMs === null) return false;
  const ageMs = nowMs - timestampMs;
  return ageMs >= 0 && ageMs < graceMs;
}

export function adventureReadinessForCandidateWindow(input: {
  bootstrapStatus: AdventureBootstrapStatus;
  candidateCount: number;
  bootstrapUpdatedAt: AdventureBootstrapTimestamp;
  characterCreatedAt?: AdventureBootstrapTimestamp;
  transientReadFailure?: boolean;
  now: Date;
  visibilityGraceMs?: number;
}): AdventureReadiness {
  if (input.candidateCount > 0) return "ready";
  if (input.bootstrapStatus === "failed") return "ready";
  if (input.transientReadFailure) return "preparing";
  if (
    input.bootstrapStatus === "planned" ||
    input.bootstrapStatus === "running"
  ) {
    return "preparing";
  }

  const graceMs =
    input.visibilityGraceMs ?? INITIAL_ADVENTURE_VISIBILITY_GRACE_MS;
  const nowMs = input.now.getTime();
  const bootstrapUpdatedAtMs = timestampMilliseconds(input.bootstrapUpdatedAt);
  const characterCreatedAtMs = timestampMilliseconds(
    input.characterCreatedAt ?? null,
  );

  if (
    input.bootstrapStatus === "completed" &&
    isWithinVisibilityGrace(bootstrapUpdatedAtMs, nowMs, graceMs)
  ) {
    return "preparing";
  }

  // A freshly committed character is a bounded fallback freshness signal for
  // the first empty adventure window. This covers transient or stale bootstrap
  // snapshots without forcing old/stably-empty profiles to poll forever.
  if (
    (input.bootstrapStatus === "completed" || input.bootstrapStatus === null) &&
    isWithinVisibilityGrace(characterCreatedAtMs, nowMs, graceMs)
  ) {
    return "preparing";
  }

  return "ready";
}

export function shouldRetryAdventureCandidates(input: {
  page: number;
  candidateCount: number;
  readiness: AdventureReadiness | undefined;
  attempt: number;
  maxAttempts: number;
}): boolean {
  return (
    input.page === 0 &&
    input.candidateCount === 0 &&
    input.readiness === "preparing" &&
    input.attempt + 1 < input.maxAttempts
  );
}
