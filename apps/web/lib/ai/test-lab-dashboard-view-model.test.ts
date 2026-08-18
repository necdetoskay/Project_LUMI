import { describe, expect, it } from "vitest";

import { buildCanonicalTestLabDashboardData } from "./test-lab-dashboard-view-model";

describe("buildCanonicalTestLabDashboardData", () => {
  it("maps persisted run model, cost, latency and status without inventing evaluation scores", () => {
    const data = buildCanonicalTestLabDashboardData([
      {
        phaseId: "world_suggestions",
        scenarioKey: "character_onboarding",
        status: "candidate",
        modelSlug: "openrouter/anthropic/claude-sonnet-4.5",
        usageSnapshot: {
          estimatedCostUsd: 0.0248,
          actualCostUsd: 0.021,
          latencyMs: 13_120,
        },
        createdAt: "2026-08-18T15:35:00.000Z",
      },
    ]);

    expect(data.latestRun).toMatchObject({
      model: "openrouter/anthropic/claude-sonnet-4.5",
      scenarioLabel: "Karakter Onboarding",
      phaseLabel: "Dünya Önerisi",
      score: "— / 100",
      scoreState: "UI-3",
      cost: "$0.02",
      duration: "13.1 sn",
      status: "Completed",
    });
  });

  it("prefers estimated cost when provider actual cost is unavailable", () => {
    const data = buildCanonicalTestLabDashboardData([
      {
        phaseId: "story_003",
        scenarioKey: "story_generation",
        status: "candidate",
        modelSlug: "deepseek/deepseek-chat-v3.1",
        usageSnapshot: {
          estimatedCostUsd: 0.0042,
          actualCostUsd: null,
          latencyMs: 61_000,
        },
        createdAt: "2026-08-18T15:35:00.000Z",
      },
    ]);

    expect(data.latestRun).toMatchObject({
      phaseLabel: "Hikaye 3",
      scenarioLabel: "Hikaye Üretimi",
      cost: "$0.0042",
      duration: "1 dk 1 sn",
    });
  });

  it("keeps only the five most recent supplied runs and maps failures", () => {
    const runs = Array.from({ length: 7 }, (_, index) => ({
      phaseId: "compatibility",
      scenarioKey: "character_onboarding",
      status: index === 0 ? "failed" : "candidate",
      modelSlug: "model/test",
      usageSnapshot: null,
      createdAt: `2026-08-${String(18 - index).padStart(2, "0")}T12:00:00.000Z`,
    }));

    const data = buildCanonicalTestLabDashboardData(runs);

    expect(data.recentRuns).toHaveLength(5);
    expect(data.latestRun?.status).toBe("Failed");
    expect(data.latestRun?.cost).toBe("—");
    expect(data.latestRun?.score).toBe("— / 100");
  });
});
