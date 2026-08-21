export type AdventureReadiness = "preparing" | "ready";
export type AdventureBootstrapStatus =
  | "planned"
  | "running"
  | "completed"
  | "failed"
  | null;

export function adventureReadinessForBootstrap(
  status: AdventureBootstrapStatus,
): AdventureReadiness {
  return status === "planned" || status === "running" ? "preparing" : "ready";
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
