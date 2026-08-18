import { describe, expect, it } from "vitest";

import { buildCanonicalTestLabDashboardData } from "./test-lab-dashboard-view-model";

const criteria = [
  { key: "continuity", label: "Continuity", minScore: 1, maxScore: 10 },
  { key: "creativity", label: "Creativity", minScore: 1, maxScore: 10 },
  { key: "curiosity", label: "Curiosity", minScore: 1, maxScore: 10 },
];

describe("buildCanonicalTestLabDashboardData", () => {
  it("maps persisted run model, cost, latency and status without inventing scores", () => {
    const data = buildCanonicalTestLabDashboardData([
      {
        runId: "run-1",
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
      scenarioLabel: "Onboarding",
      phaseLabel: "Dünya Önerisi",
      score: "— / 100",
      scoreState: "Bekliyor",
      cost: "$0.02",
      duration: "13.1 sn",
      status: "Completed",
    });
    expect(data.evaluation.ready).toBe(false);
  });

  it("binds the latest judge execution to score, progress and quality dimensions", () => {
    const data = buildCanonicalTestLabDashboardData(
      [
        {
          runId: "run-1",
          phaseId: "story_003",
          scenarioKey: "story_generation",
          status: "candidate",
          modelSlug: "deepseek/deepseek-chat-v3.1",
          usageSnapshot: null,
          createdAt: "2026-08-18T15:35:00.000Z",
        },
      ],
      [
        evaluation("exec-new", "run-1", "candidate-a", 8, "2026-08-18T15:40:00.000Z", [
          { criterionKey: "continuity", score: 9 },
          { criterionKey: "creativity", score: 7 },
          { criterionKey: "curiosity", score: 8 },
        ]),
        evaluation("exec-new", "run-1", "candidate-b", 7, "2026-08-18T15:40:00.000Z", [
          { criterionKey: "continuity", score: 8 },
          { criterionKey: "creativity", score: 6 },
          { criterionKey: "curiosity", score: 7 },
        ]),
        evaluation("exec-old", "run-1", "candidate-a", 4, "2026-08-18T15:38:00.000Z", [
          { criterionKey: "continuity", score: 4 },
        ]),
      ],
      [{ runId: "run-1", count: 3 }],
    );

    expect(data.latestRun).toMatchObject({
      phaseLabel: "Hikaye 3",
      score: "72 / 100",
      scoreState: "Orta",
      scoreValue: 72,
    });
    expect(data.evaluation).toMatchObject({
      ready: true,
      overallScore: 72,
      scoreState: "Orta",
      judgeModel: "judge/model",
      rubricLabel: "Story Quality",
      evaluatedCandidates: 2,
      totalCandidates: 3,
      progressPercent: 67,
      evaluatedRuns: 1,
      successfulRuns: 1,
    });
    expect(data.evaluation.qualityMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Bütünlük", score: 83, pending: false }),
        expect.objectContaining({ label: "Yaratıcılık", score: 61, pending: false }),
        expect.objectContaining({ label: "Merak", score: 72, pending: false }),
      ]),
    );
  });

  it("builds a chronological score trend from each run's latest judge execution", () => {
    const data = buildCanonicalTestLabDashboardData(
      [
        run("run-2", "2026-08-18T15:35:00.000Z"),
        run("run-1", "2026-08-18T15:30:00.000Z"),
      ],
      [
        evaluation("exec-1", "run-1", "a", 6, "2026-08-18T15:31:00.000Z"),
        evaluation("exec-2", "run-2", "b", 9, "2026-08-18T15:36:00.000Z"),
      ],
      [
        { runId: "run-1", count: 1 },
        { runId: "run-2", count: 1 },
      ],
    );

    expect(data.evaluation.trend.map((point) => point.score)).toEqual([56, 89]);
    expect(data.recentRuns.map((item) => item.score)).toEqual([
      "89 / 100",
      "56 / 100",
    ]);
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
      scenarioLabel: "Hikaye",
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

function run(runId: string, createdAt: string) {
  return {
    runId,
    phaseId: "compatibility",
    scenarioKey: "character_onboarding",
    status: "candidate",
    modelSlug: "model/test",
    usageSnapshot: null,
    createdAt,
  };
}

function evaluation(
  executionId: string,
  runId: string,
  candidateId: string,
  overallScore: number,
  createdAt: string,
  findings = [{ criterionKey: "continuity", score: overallScore }],
) {
  return {
    executionId,
    runId,
    candidateId,
    overallScore,
    findings,
    judgeModelSlug: "judge/model",
    rubricLabel: "Story Quality",
    criteria,
    createdAt,
  };
}
