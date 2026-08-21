export type AdventureReadiness = "preparing" | "ready";
export type AdventureBootstrapStatus =
  | "planned"
  | "running"
  | "completed"
  | "failed"
  | null;

export const INITIAL_ADVENTURE_VISIBILITY_GRACE_MS = 120_000;

export function adventureReadinessForBootstrap(
  status: AdventureBootstrapStatus,
): AdventureReadiness {
  return status === "planned" || status === "running" ? "preparing" : "ready";
}

export function adventureReadinessForCandidateWindow(input: {
  bootstrapStatus: AdventureBootstrapStatus;
  candidateCount: number;
  bootstrapUpdatedAt: Date | null;
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
  if (input.bootstrapStatus !== "completed" || !input.bootstrapUpdatedAt) {
    return "ready";
  }

  const ageMs = input.now.getTime() - input.bootstrapUpdatedAt.getTime();
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
