export function calculateConsequenceWeight(input: {
  worldStateImpact: number;
  characterStateImpact: number;
  relationshipImpact: number;
  futureStoryPotential: number;
}): number {
  const score =
    input.worldStateImpact * 0.25 +
    input.characterStateImpact * 0.25 +
    input.relationshipImpact * 0.2 +
    input.futureStoryPotential * 0.3;

  return Math.max(0, Math.min(1, score));
}
