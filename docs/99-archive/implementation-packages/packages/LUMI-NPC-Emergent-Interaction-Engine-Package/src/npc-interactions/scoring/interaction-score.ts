import type { NpcInteractionCandidate } from "../types";

export function calculateInteractionScore(
  candidate: NpcInteractionCandidate,
): number {
  const score =
    candidate.utility * 0.3 +
    candidate.urgency * 0.2 +
    candidate.relationshipScore * 0.2 +
    candidate.noveltyScore * 0.15 +
    candidate.safetyScore * 0.15;

  return Math.max(0, Math.min(1, score));
}

export function rankInteractionCandidates(
  candidates: NpcInteractionCandidate[],
): NpcInteractionCandidate[] {
  return [...candidates].sort(
    (a, b) =>
      calculateInteractionScore(b) -
      calculateInteractionScore(a),
  );
}
