export const L8_SCORECARD_PERFORMANCE_PROFILE = Object.freeze({
  latency: Object.freeze({ best: 1500, worst: 6000, maxPoints: 15 }),
  tokens: Object.freeze({ best: 300, worst: 900, maxPoints: 15 }),
});

export function linearPerformanceScore(value, { best, worst, maxPoints }) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return 0;
  }
  const numeric = Number(value);
  if (numeric <= best) return maxPoints;
  if (numeric >= worst) return 0;
  return maxPoints * (1 - (numeric - best) / (worst - best));
}

export function scorePerformance({ meanLatencyMs, meanTokens }) {
  return {
    latencyPoints: linearPerformanceScore(
      meanLatencyMs,
      L8_SCORECARD_PERFORMANCE_PROFILE.latency,
    ),
    tokenEfficiencyPoints: linearPerformanceScore(
      meanTokens,
      L8_SCORECARD_PERFORMANCE_PROFILE.tokens,
    ),
  };
}
