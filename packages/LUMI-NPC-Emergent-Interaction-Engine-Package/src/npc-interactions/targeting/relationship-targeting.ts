export type TargetCandidate = {
  characterId: string;
  relationshipScore: number;
  proximityScore: number;
  recentInteractionPenalty: number;
  roleCompatibility: number;
};

export function chooseInteractionTarget(
  candidates: TargetCandidate[],
): TargetCandidate | undefined {
  return [...candidates]
    .map((candidate) => ({
      ...candidate,
      finalScore:
        candidate.relationshipScore * 0.4 +
        candidate.proximityScore * 0.25 +
        candidate.roleCompatibility * 0.25 -
        candidate.recentInteractionPenalty * 0.1,
    }))
    .sort(
      (a, b) => b.finalScore - a.finalScore,
    )[0];
}
