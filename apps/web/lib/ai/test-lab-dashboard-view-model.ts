export type TestLabDashboardUsageSource = {
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  latencyMs: number;
};

export type TestLabDashboardRunSource = {
  runId?: string;
  phaseId: string;
  scenarioKey: string;
  status: string;
  modelSlug: string | null;
  usageSnapshot: TestLabDashboardUsageSource | null;
  createdAt: string;
};

export type TestLabDashboardCriterionSource = {
  key: string;
  label: string;
  minScore: number;
  maxScore: number;
};

export type TestLabDashboardFindingSource = {
  criterionKey: string;
  score: number;
};

export type TestLabDashboardEvaluationSource = {
  executionId: string;
  runId: string;
  candidateId: string;
  overallScore: number;
  findings: TestLabDashboardFindingSource[];
  judgeModelSlug: string | null;
  rubricLabel: string;
  criteria: TestLabDashboardCriterionSource[];
  createdAt: string;
};

export type TestLabDashboardCandidateCountSource = {
  runId: string;
  count: number;
};

export type CanonicalTestLabRunView = {
  name: string;
  model: string;
  score: string;
  scoreState: "Bekliyor" | "İyi" | "Orta" | "Zayıf";
  scoreValue: number | null;
  cost: string;
  duration: string;
  status: "Completed" | "Failed";
  createdAtLabel: string;
  scenarioLabel: string;
  phaseLabel: string;
};

export type CanonicalTestLabQualityMetric = {
  key: string;
  label: string;
  score: number;
  pending: boolean;
};

export type CanonicalTestLabTrendPoint = {
  score: number;
  label: string;
};

export type CanonicalTestLabEvaluationView = {
  ready: boolean;
  overallScore: number | null;
  scoreState: "Bekliyor" | "İyi" | "Orta" | "Zayıf";
  judgeModel: string | null;
  rubricLabel: string | null;
  evaluatedCandidates: number;
  totalCandidates: number;
  progressPercent: number;
  qualityMetrics: CanonicalTestLabQualityMetric[];
  trend: CanonicalTestLabTrendPoint[];
  successfulRuns: number;
  evaluatedRuns: number;
};

export type CanonicalTestLabDashboardData = {
  latestRun: CanonicalTestLabRunView | null;
  recentRuns: CanonicalTestLabRunView[];
  evaluation: CanonicalTestLabEvaluationView;
};

const MAX_RECENT_RUNS = 5;
const MAX_TREND_POINTS = 6;
const SUCCESS_SCORE = 70;

const PHASE_LABELS: Record<string, string> = {
  character_first_identity_suggestions: "Karakter Kimliği",
  world_suggestions: "Dünya Önerisi",
  compatibility: "Uyumluluk",
  region_suggestions: "Bölge Önerisi",
  origin_suggestions: "Köken Önerisi",
  core_saga: "Çekirdek Saga",
};

const QUALITY_LABELS: Record<string, string> = {
  continuity: "Bütünlük",
  emotional_resonance: "Duygusal Etki",
  creativity: "Yaratıcılık",
  curiosity: "Merak",
  character_fidelity: "Karakter Tutarlılığı",
  age_suitability: "Yaşa Uygunluk",
  world_consistency: "Dünya Tutarlılığı",
  engagement: "İlgi",
  pacing: "Tempo",
  originality: "Özgünlük",
  ending: "Bitiş",
  future_story_potential: "Gelecek Potansiyeli",
};

const QUALITY_ORDER = [
  "continuity",
  "emotional_resonance",
  "creativity",
  "curiosity",
  "character_fidelity",
  "age_suitability",
] as const;

export function buildCanonicalTestLabDashboardData(
  runs: TestLabDashboardRunSource[],
  evaluations: TestLabDashboardEvaluationSource[] = [],
  candidateCounts: TestLabDashboardCandidateCountSource[] = [],
): CanonicalTestLabDashboardData {
  const latestExecutionByRun = buildLatestExecutionByRun(evaluations);
  const recentSources = runs.slice(0, MAX_RECENT_RUNS);
  const recentRuns = recentSources.map((run) =>
    mapRun(run, run.runId ? latestExecutionByRun.get(run.runId) : undefined),
  );
  const latestSource = recentSources[0] ?? null;
  const latestExecution =
    latestSource?.runId !== undefined
      ? latestExecutionByRun.get(latestSource.runId)
      : undefined;
  const candidateCountByRun = new Map(
    candidateCounts.map((item) => [item.runId, item.count]),
  );

  return {
    latestRun: recentRuns[0] ?? null,
    recentRuns,
    evaluation: buildEvaluationView(
      latestSource?.runId ?? null,
      latestExecution,
      candidateCountByRun,
      latestExecutionByRun,
    ),
  };
}

type ExecutionGroup = {
  executionId: string;
  runId: string;
  judgeModelSlug: string | null;
  rubricLabel: string;
  criteria: TestLabDashboardCriterionSource[];
  createdAt: string;
  evaluations: TestLabDashboardEvaluationSource[];
};

function buildLatestExecutionByRun(
  evaluations: TestLabDashboardEvaluationSource[],
): Map<string, ExecutionGroup> {
  const groups = groupExecutions(evaluations).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  const byRun = new Map<string, ExecutionGroup>();
  for (const group of groups) {
    if (!byRun.has(group.runId)) byRun.set(group.runId, group);
  }
  return byRun;
}

function groupExecutions(
  evaluations: TestLabDashboardEvaluationSource[],
): ExecutionGroup[] {
  const groups = new Map<string, ExecutionGroup>();
  for (const evaluation of evaluations) {
    const current = groups.get(evaluation.executionId);
    if (current) {
      current.evaluations.push(evaluation);
      continue;
    }
    groups.set(evaluation.executionId, {
      executionId: evaluation.executionId,
      runId: evaluation.runId,
      judgeModelSlug: evaluation.judgeModelSlug,
      rubricLabel: evaluation.rubricLabel,
      criteria: evaluation.criteria,
      createdAt: evaluation.createdAt,
      evaluations: [evaluation],
    });
  }
  return [...groups.values()];
}

function mapRun(
  run: TestLabDashboardRunSource,
  execution: ExecutionGroup | undefined,
): CanonicalTestLabRunView {
  const phaseLabel = phaseLabelFor(run.phaseId);
  const createdAtLabel = formatDateTime(run.createdAt);
  const scoreValue = execution ? executionScore(execution) : null;
  return {
    name: `${phaseLabel} · ${createdAtLabel}`,
    model: run.modelSlug ?? "Model kaydı yok",
    score: scoreValue === null ? "— / 100" : `${scoreValue} / 100`,
    scoreState: scoreStateFor(scoreValue),
    scoreValue,
    cost: formatCost(run.usageSnapshot),
    duration: formatDuration(run.usageSnapshot?.latencyMs ?? null),
    status: run.status === "failed" ? "Failed" : "Completed",
    createdAtLabel,
    scenarioLabel: scenarioLabelFor(run.scenarioKey),
    phaseLabel,
  };
}

function buildEvaluationView(
  latestRunId: string | null,
  latestExecution: ExecutionGroup | undefined,
  candidateCountByRun: Map<string, number>,
  latestExecutionByRun: Map<string, ExecutionGroup>,
): CanonicalTestLabEvaluationView {
  const evaluatedRunScores = [...latestExecutionByRun.values()]
    .map(executionScore)
    .filter((score) => Number.isFinite(score));
  const evaluatedRuns = evaluatedRunScores.length;
  const successfulRuns = evaluatedRunScores.filter(
    (score) => score >= SUCCESS_SCORE,
  ).length;

  if (!latestExecution || !latestRunId) {
    return {
      ready: false,
      overallScore: null,
      scoreState: "Bekliyor",
      judgeModel: null,
      rubricLabel: null,
      evaluatedCandidates: 0,
      totalCandidates: latestRunId
        ? (candidateCountByRun.get(latestRunId) ?? 0)
        : 0,
      progressPercent: 0,
      qualityMetrics: pendingQualityMetrics(),
      trend: buildTrend(latestExecutionByRun),
      successfulRuns,
      evaluatedRuns,
    };
  }

  const overallScore = executionScore(latestExecution);
  const evaluatedCandidates = new Set(
    latestExecution.evaluations.map((evaluation) => evaluation.candidateId),
  ).size;
  const totalCandidates = Math.max(
    candidateCountByRun.get(latestRunId) ?? evaluatedCandidates,
    evaluatedCandidates,
  );
  const progressPercent =
    totalCandidates === 0
      ? 0
      : Math.round((evaluatedCandidates / totalCandidates) * 100);

  return {
    ready: true,
    overallScore,
    scoreState: scoreStateFor(overallScore),
    judgeModel: latestExecution.judgeModelSlug,
    rubricLabel: latestExecution.rubricLabel,
    evaluatedCandidates,
    totalCandidates,
    progressPercent,
    qualityMetrics: qualityMetricsFor(latestExecution),
    trend: buildTrend(latestExecutionByRun),
    successfulRuns,
    evaluatedRuns,
  };
}

function executionScore(execution: ExecutionGroup): number {
  if (execution.evaluations.length === 0) return 0;
  const rawMean =
    execution.evaluations.reduce(
      (sum, evaluation) => sum + evaluation.overallScore,
      0,
    ) / execution.evaluations.length;
  const scale = scoreScale(execution.criteria);
  return normalizeTo100(rawMean, scale.min, scale.max);
}

function qualityMetricsFor(
  execution: ExecutionGroup,
): CanonicalTestLabQualityMetric[] {
  const findingScores = new Map<string, number[]>();
  for (const evaluation of execution.evaluations) {
    for (const finding of evaluation.findings) {
      const scores = findingScores.get(finding.criterionKey) ?? [];
      scores.push(finding.score);
      findingScores.set(finding.criterionKey, scores);
    }
  }
  const criteriaByKey = new Map(
    execution.criteria.map((criterion) => [criterion.key, criterion]),
  );
  const orderedKeys = [
    ...QUALITY_ORDER.filter((key) => criteriaByKey.has(key)),
    ...execution.criteria
      .map((criterion) => criterion.key)
      .filter(
        (key) => !QUALITY_ORDER.includes(key as (typeof QUALITY_ORDER)[number]),
      ),
  ].slice(0, 6);

  return orderedKeys.map((key) => {
    const criterion = criteriaByKey.get(key);
    const scores = findingScores.get(key) ?? [];
    const pending = !criterion || scores.length === 0;
    const mean =
      scores.length === 0
        ? 0
        : scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return {
      key,
      label: QUALITY_LABELS[key] ?? criterion?.label ?? key,
      score: criterion
        ? normalizeTo100(mean, criterion.minScore, criterion.maxScore)
        : 0,
      pending,
    };
  });
}

function pendingQualityMetrics(): CanonicalTestLabQualityMetric[] {
  return QUALITY_ORDER.map((key) => ({
    key,
    label: QUALITY_LABELS[key] ?? key,
    score: 0,
    pending: true,
  }));
}

function buildTrend(
  latestExecutionByRun: Map<string, ExecutionGroup>,
): CanonicalTestLabTrendPoint[] {
  return [...latestExecutionByRun.values()]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-MAX_TREND_POINTS)
    .map((execution) => ({
      score: executionScore(execution),
      label: formatTime(execution.createdAt),
    }));
}

function scoreScale(criteria: TestLabDashboardCriterionSource[]): {
  min: number;
  max: number;
} {
  if (criteria.length === 0) return { min: 0, max: 10 };
  return {
    min: Math.min(...criteria.map((criterion) => criterion.minScore)),
    max: Math.max(...criteria.map((criterion) => criterion.maxScore)),
  };
}

function normalizeTo100(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.round(Math.min(100, Math.max(0, normalized)));
}

function scoreStateFor(
  score: number | null,
): CanonicalTestLabRunView["scoreState"] {
  if (score === null) return "Bekliyor";
  if (score >= 80) return "İyi";
  if (score >= 65) return "Orta";
  return "Zayıf";
}

function phaseLabelFor(phaseId: string): string {
  const known = PHASE_LABELS[phaseId];
  if (known) return known;
  const storyMatch = /^story_(\d+)$/.exec(phaseId);
  if (storyMatch?.[1]) return `Hikaye ${Number(storyMatch[1])}`;
  return phaseId.replaceAll("_", " ");
}

function scenarioLabelFor(scenarioKey: string): string {
  if (scenarioKey === "character_onboarding") return "Onboarding";
  if (scenarioKey === "story_generation") return "Hikaye";
  return scenarioKey.replaceAll("_", " ");
}

function formatCost(usage: TestLabDashboardUsageSource | null): string {
  if (!usage) return "—";
  const value = usage.actualCostUsd ?? usage.estimatedCostUsd;
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatDuration(latencyMs: number | null): string {
  if (latencyMs === null || !Number.isFinite(latencyMs) || latencyMs < 0) {
    return "—";
  }
  if (latencyMs < 1_000) return `${Math.round(latencyMs)} ms`;
  if (latencyMs < 60_000) return `${(latencyMs / 1_000).toFixed(1)} sn`;
  const seconds = Math.round(latencyMs / 1_000);
  return `${Math.floor(seconds / 60)} dk ${seconds % 60} sn`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilinmiyor";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(date);
}
