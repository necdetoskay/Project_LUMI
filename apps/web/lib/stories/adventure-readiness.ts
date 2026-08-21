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

export function adventureReadinessForCandidateWindow(input: {
  bootstrapStatus: AdventureBootstrapStatus;
  candidateCount: number;
  bootstrapUpdatedAt: AdventureBootstrapTimestamp;
  now: Date;
  visibilityGraceMs?: number;
}): AdventureReadiness {
  if (input.candidateCount > 0) return "ready";
  if (
    input.bootstrapStatus === "planned" ||
    input.bootstrapStatus === "running"
  ) {
    return "preparing";
  }
  if (input.bootstrapStatus !== "completed") return "ready";

  const bootstrapUpdatedAtMs = timestampMilliseconds(input.bootstrapUpdatedAt);
  if (bootstrapUpdatedAtMs === null) return "ready";

  const ageMs = input.now.getTime() - bootstrapUpdatedAtMs;
  const graceMs =
    input.visibilityGraceMs ?? INITIAL_ADVENTURE_VISIBILITY_GRACE_MS;
  return ageMs >= 0 && ageMs < graceMs ? "preparing" : "ready";
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
