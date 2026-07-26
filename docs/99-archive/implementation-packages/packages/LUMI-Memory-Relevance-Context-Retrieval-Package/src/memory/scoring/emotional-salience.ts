export function calculateEmotionalSalience(input: {
  emotionIntensity: number;
  relationshipImpact: number;
  surprise: number;
  persistence: number;
}): number {
  const score =
    input.emotionIntensity * 0.4 +
    input.relationshipImpact * 0.25 +
    input.surprise * 0.2 +
    input.persistence * 0.15;

  return Math.max(0, Math.min(1, score));
}
