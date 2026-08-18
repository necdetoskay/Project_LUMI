export type TestLabDashboardUsageSource = {
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  latencyMs: number;
};

export type TestLabDashboardRunSource = {
  phaseId: string;
  scenarioKey: string;
  status: string;
  modelSlug: string | null;
  usageSnapshot: TestLabDashboardUsageSource | null;
  createdAt: string;
};

export type CanonicalTestLabRunView = {
  name: string;
  model: string;
  score: string;
  scoreState: "UI-3";
  cost: string;
  duration: string;
  status: "Completed" | "Failed";
  createdAtLabel: string;
  scenarioLabel: string;
  phaseLabel: string;
};

export type CanonicalTestLabDashboardData = {
  latestRun: CanonicalTestLabRunView | null;
  recentRuns: CanonicalTestLabRunView[];
};

const MAX_RECENT_RUNS = 5;

const PHASE_LABELS: Record<string, string> = {
  character_first_identity_suggestions: "Karakter Kimliği",
  world_suggestions: "Dünya Önerisi",
  compatibility: "Uyumluluk",
  region_suggestions: "Bölge Önerisi",
  origin_suggestions: "Köken Önerisi",
  core_saga: "Çekirdek Saga",
};

export function buildCanonicalTestLabDashboardData(
  runs: TestLabDashboardRunSource[],
): CanonicalTestLabDashboardData {
  const recentRuns = runs.slice(0, MAX_RECENT_RUNS).map(mapRun);
  return {
    latestRun: recentRuns[0] ?? null,
    recentRuns,
  };
}

function mapRun(run: TestLabDashboardRunSource): CanonicalTestLabRunView {
  const phaseLabel = phaseLabelFor(run.phaseId);
  const createdAtLabel = formatDateTime(run.createdAt);
  return {
    name: `${phaseLabel} · ${createdAtLabel}`,
    model: run.modelSlug ?? "Model kaydı yok",
    score: "— / 100",
    scoreState: "UI-3",
    cost: formatCost(run.usageSnapshot),
    duration: formatDuration(run.usageSnapshot?.latencyMs ?? null),
    status: run.status === "failed" ? "Failed" : "Completed",
    createdAtLabel,
    scenarioLabel: scenarioLabelFor(run.scenarioKey),
    phaseLabel,
  };
}

function phaseLabelFor(phaseId: string): string {
  const known = PHASE_LABELS[phaseId];
  if (known) return known;
  const storyMatch = /^story_(\d+)$/.exec(phaseId);
  if (storyMatch?.[1]) {
    return `Hikaye ${Number(storyMatch[1])}`;
  }
  return phaseId.replaceAll("_", " ");
}

function scenarioLabelFor(scenarioKey: string): string {
  if (scenarioKey === "character_onboarding") return "Karakter Onboarding";
  if (scenarioKey === "story_generation") return "Hikaye Üretimi";
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
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} dk ${remainder} sn`;
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
