import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_MODELS = 3;
const scenarioId = "L8-LIVE-SCENARIO-PACK-001";
const models = parseModels(process.env.ULTEF_L8_MODELS);

if (models.length === 0) {
  throw new Error(
    "ULTEF_L8_MODELS must contain at least one OpenRouter model id.",
  );
}
if (models.length > MAX_MODELS) {
  throw new Error(`ULTEF L8 allows at most ${MAX_MODELS} models per paid run.`);
}
if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required for ULTEF L8.");
}

const root = process.cwd();
const runsDir = path.join(root, "artifacts", "ultef", "runs");
const scorecardDir = path.join(root, "artifacts", "ultef", "scorecards");
await mkdir(runsDir, { recursive: true });
await mkdir(scorecardDir, { recursive: true });

const results = [];
for (const model of models) {
  const before = new Set(await listScenarioFiles(runsDir));
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const run = spawnSync(command, ["ultef:live-scenario-pack"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ULTEF_REAL_PROVIDER_ENABLED: "true",
      ULTEF_REAL_PROVIDER_MODEL: model,
    },
  });

  const after = await listScenarioFiles(runsDir);
  const created = after.filter((file) => !before.has(file));
  const newest = created.at(-1);

  if (!newest) {
    results.push({
      model,
      result: "ERROR",
      qualityGate: false,
      score: 0,
      scenarioQualityScore: 0,
      averageLatencyMs: null,
      totalLatencyMs: null,
      averageTokens: null,
      totalTokens: null,
      assertionsPassed: 0,
      assertionsTotal: 4,
      error: `Live evaluation exited with status ${run.status ?? "unknown"} without evidence.`,
    });
    continue;
  }

  const report = JSON.parse(await readFile(newest, "utf8"));
  results.push(scoreReport(model, report, run.status));
}

results.sort((a, b) => b.score - a.score);
const winner = results.find((item) => item.qualityGate) ?? null;
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const payload = {
  schemaVersion: 2,
  id: "L8-MODEL-SCORECARD-001",
  generatedAt: new Date().toISOString(),
  scoring: {
    qualityGate:
      "All three core L8 scenarios and the overall pack assertion must pass before a model is eligible to win.",
    qualityPoints: 70,
    latencyPoints: 15,
    tokenEfficiencyPoints: 15,
    latencyScale:
      "Uses average latency per scenario: 15 points at <=3000ms, 0 points at >=15000ms, linear between.",
    tokenScale:
      "Uses average total tokens per scenario: 15 points at <=700, 0 points at >=2000, linear between.",
  },
  models: results,
  winner: winner?.model ?? null,
};

const jsonPath = path.join(
  scorecardDir,
  `${timestamp}-L8-MODEL-SCORECARD-001.json`,
);
const mdPath = path.join(
  scorecardDir,
  `${timestamp}-L8-MODEL-SCORECARD-001.md`,
);
await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(mdPath, renderMarkdown(payload), "utf8");

console.log(renderMarkdown(payload));
if (!winner) process.exitCode = 1;

function parseModels(raw) {
  return [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

async function listScenarioFiles(base) {
  const output = [];
  let entries = [];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(base, entry.name, `${scenarioId}.json`);
    try {
      await readFile(candidate, "utf8");
      output.push(candidate);
    } catch {
      // Ignore unrelated run directories.
    }
  }
  output.sort();
  return output;
}

function scoreReport(requestedModel, report, processStatus) {
  const metrics =
    report.timeline?.find(
      (event) => event.type === "live.scenario-pack.metrics",
    )?.data ?? {};
  const storyEvents =
    report.timeline?.filter(
      (event) => event.type === "live.scenario.generated",
    ) ?? [];
  const assertions = report.assertions ?? [];
  const assertionsPassed = assertions.filter((item) => item.passed).length;
  const assertionsTotal = assertions.length;
  const qualityGate =
    report.result === "PASS" &&
    assertionsTotal >= 4 &&
    assertionsPassed === assertionsTotal;
  const scenarioCount = Math.max(
    1,
    metrics.metrics?.length ?? storyEvents.length ?? 1,
  );
  const totalLatencyMs = numberOrNull(metrics.totalLatencyMs);
  const totalTokens = numberOrNull(metrics.totalTokens);
  const averageLatencyMs =
    totalLatencyMs === null ? null : totalLatencyMs / scenarioCount;
  const averageTokens =
    totalTokens === null ? null : totalTokens / scenarioCount;
  const latencyPoints = qualityGate
    ? linearScore(averageLatencyMs, 3000, 15000, 15)
    : 0;
  const tokenPoints = qualityGate
    ? linearScore(averageTokens, 700, 2000, 15)
    : 0;
  const qualityPoints = qualityGate ? 70 : 0;

  return {
    model: metrics.modelId ?? requestedModel,
    requestedModel,
    result:
      processStatus === 0
        ? report.result
        : `${report.result}/PROCESS_${processStatus}`,
    qualityGate,
    score: round(qualityPoints + latencyPoints + tokenPoints),
    scenarioQualityScore: numberOrNull(metrics.evaluation?.score) ?? 0,
    qualityPoints,
    latencyPoints: round(latencyPoints),
    tokenEfficiencyPoints: round(tokenPoints),
    averageLatencyMs: roundNullable(averageLatencyMs),
    totalLatencyMs,
    averageTokens: roundNullable(averageTokens),
    totalTokens,
    assertionsPassed,
    assertionsTotal,
    scenarios: metrics.evaluation?.scenarios ?? null,
    narratives: storyEvents.map((event) => ({
      scenarioId: event.data?.scenarioId ?? null,
      narrative: event.data?.narrative ?? event.summary ?? null,
    })),
  };
}

function linearScore(value, best, worst, maxPoints) {
  if (value === null) return 0;
  if (value <= best) return maxPoints;
  if (value >= worst) return 0;
  return maxPoints * (1 - (value - best) / (worst - best));
}

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function roundNullable(value) {
  return value === null ? null : round(value);
}

function renderMarkdown(payload) {
  const lines = [
    "# L8-MODEL-SCORECARD-001 — Live model comparison",
    "",
    `Generated: ${payload.generatedAt}`,
    `Winner: **${payload.winner ?? "none"}**`,
    "",
    "Quality is a hard gate: a model must pass continuity recall, prior-choice influence and world-consistency/hallucination control before latency or token efficiency can contribute to its score.",
    "",
    "| Rank | Model | Gate | Score | Scenario quality | Avg latency ms | Avg tokens | Assertions |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  payload.models.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.model} | ${item.qualityGate ? "PASS" : "FAIL"} | ${item.score} | ${item.scenarioQualityScore}/100 | ${item.averageLatencyMs ?? "n/a"} | ${item.averageTokens ?? "n/a"} | ${item.assertionsPassed}/${item.assertionsTotal} |`,
    );
  });
  lines.push(
    "",
    "## Scoring",
    "",
    "- Hard quality gate: all three live story scenarios must pass; a failed quality gate makes the model ineligible to win.",
    "- Quality: 70 points after the hard gate passes.",
    "- Latency: up to 15 points using average latency across the three scenarios.",
    "- Token efficiency: up to 15 points using average total tokens across the three scenarios.",
    "- This scorecard intentionally does not persist monetary price estimates because provider/model prices are mutable; durable token counts remain in evidence.",
    "",
  );
  return `${lines.join("\n")}\n`;
}
