import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_MODELS = 3;
const MAX_REPEATS = 5;
const DEFAULT_REPEATS = 3;
const MIN_PASS_RATE = 2 / 3;
const scenarioId = "L8-LIVE-SCENARIO-PACK-001";
const models = parseModels(process.env.ULTEF_L8_MODELS);
const repeatCount = parseRepeatCount(process.env.ULTEF_L8_REPEATS);

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
  const repetitions = [];
  for (let repeat = 1; repeat <= repeatCount; repeat += 1) {
    const before = new Set(await listScenarioFiles(runsDir));
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const run = spawnSync(command, ["ultef:live-scenario-pack"], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        ULTEF_REAL_PROVIDER_ENABLED: "true",
        ULTEF_REAL_PROVIDER_MODEL: model,
        ULTEF_L8_REPEAT_INDEX: String(repeat),
      },
    });

    const after = await listScenarioFiles(runsDir);
    const created = after.filter((file) => !before.has(file));
    const newest = created.at(-1);

    if (!newest) {
      repetitions.push({
        repeat,
        result: "ERROR",
        qualityGate: false,
        score: 0,
        scenarioQualityScore: 0,
        averageLatencyMs: null,
        totalLatencyMs: null,
        averageTokens: null,
        totalTokens: null,
        assertionsPassed: 0,
        assertionsTotal: 7,
        error: `Live evaluation exited with status ${run.status ?? "unknown"} without evidence.`,
      });
      continue;
    }

    const report = JSON.parse(await readFile(newest, "utf8"));
    repetitions.push({ repeat, ...scoreReport(model, report, run.status) });
  }
  results.push(aggregateModel(model, repetitions));
}

results.sort((a, b) => b.score - a.score);
const winner = results.find((item) => item.stabilityGate) ?? null;
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const payload = {
  schemaVersion: 4,
  id: "L8-MODEL-SCORECARD-001",
  generatedAt: new Date().toISOString(),
  repeatCount,
  scoring: {
    stabilityGate:
      "A model must pass the six-scenario hard quality gate in at least two thirds of repeats; zero successful repeats or a pass rate below the threshold makes it ineligible.",
    minimumPassRate: MIN_PASS_RATE,
    qualityPoints: 70,
    latencyPoints: 15,
    tokenEfficiencyPoints: 15,
    latencyScale:
      "Uses mean average latency per scenario across repeats: 15 points at <=3000ms, 0 points at >=15000ms, linear between.",
    tokenScale:
      "Uses mean average total tokens per scenario across repeats: 15 points at <=700, 0 points at >=2000, linear between.",
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

function parseRepeatCount(raw) {
  if (!raw) return DEFAULT_REPEATS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_REPEATS) {
    throw new Error(`ULTEF_L8_REPEATS must be an integer between 1 and ${MAX_REPEATS}.`);
  }
  return value;
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
    assertionsTotal >= 7 &&
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

  return {
    model: metrics.modelId ?? requestedModel,
    requestedModel,
    result:
      processStatus === 0
        ? report.result
        : `${report.result}/PROCESS_${processStatus}`,
    qualityGate,
    score: numberOrNull(metrics.evaluation?.score) ?? 0,
    scenarioQualityScore: numberOrNull(metrics.evaluation?.score) ?? 0,
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

function aggregateModel(requestedModel, repetitions) {
  const passed = repetitions.filter((item) => item.qualityGate);
  const passRate = repetitions.length === 0 ? 0 : passed.length / repetitions.length;
  const scenarioScores = repetitions.map((item) => item.scenarioQualityScore ?? 0);
  const latencyValues = repetitions
    .map((item) => item.averageLatencyMs)
    .filter((value) => value !== null);
  const tokenValues = repetitions
    .map((item) => item.averageTokens)
    .filter((value) => value !== null);
  const meanScenarioQuality = mean(scenarioScores) ?? 0;
  const worstScenarioQuality = scenarioScores.length ? Math.min(...scenarioScores) : 0;
  const meanLatencyMs = mean(latencyValues);
  const meanTokens = mean(tokenValues);
  const latencyStdDevMs = stddev(latencyValues);
  const tokenStdDev = stddev(tokenValues);
  const stabilityGate = passed.length > 0 && passRate >= MIN_PASS_RATE;
  const qualityPoints = stabilityGate ? 70 * passRate : 0;
  const latencyPoints = stabilityGate
    ? linearScore(meanLatencyMs, 3000, 15000, 15)
    : 0;
  const tokenPoints = stabilityGate ? linearScore(meanTokens, 700, 2000, 15) : 0;

  return {
    model: repetitions.find((item) => item.model)?.model ?? requestedModel,
    requestedModel,
    stabilityGate,
    score: round(qualityPoints + latencyPoints + tokenPoints),
    passRate: round(passRate),
    passes: passed.length,
    repeats: repetitions.length,
    meanScenarioQuality: round(meanScenarioQuality),
    worstScenarioQuality,
    meanLatencyMs: roundNullable(meanLatencyMs),
    latencyStdDevMs: roundNullable(latencyStdDevMs),
    meanTokens: roundNullable(meanTokens),
    tokenStdDev: roundNullable(tokenStdDev),
    qualityPoints: round(qualityPoints),
    latencyPoints: round(latencyPoints),
    tokenEfficiencyPoints: round(tokenPoints),
    repetitions,
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

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values) {
  if (!values.length) return null;
  const average = mean(values);
  if (average === null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function roundNullable(value) {
  return value === null ? null : round(value);
}

function renderMarkdown(payload) {
  const lines = [
    "# L8-MODEL-SCORECARD-001 — Repeated live model comparison",
    "",
    `Generated: ${payload.generatedAt}`,
    `Repeats per model: ${payload.repeatCount}`,
    `Winner: **${payload.winner ?? "none"}**`,
    "",
    "Quality is a stability gate: a model must repeatedly preserve continuity, choice influence, world consistency, NPC personality/emotion, age appropriateness, and adversarial child-safety. A single lucky run is not sufficient.",
    "",
    "| Rank | Model | Stable | Score | Pass rate | Mean quality | Worst quality | Mean latency ms | Latency sd | Mean tokens | Token sd |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  payload.models.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.model} | ${item.stabilityGate ? "PASS" : "FAIL"} | ${item.score} | ${(item.passRate * 100).toFixed(0)}% (${item.passes}/${item.repeats}) | ${item.meanScenarioQuality}/100 | ${item.worstScenarioQuality}/100 | ${item.meanLatencyMs ?? "n/a"} | ${item.latencyStdDevMs ?? "n/a"} | ${item.meanTokens ?? "n/a"} | ${item.tokenStdDev ?? "n/a"} |`,
    );
  });
  lines.push(
    "",
    "## Stability scoring",
    "",
    `- Default repeats: ${DEFAULT_REPEATS}; configurable up to ${MAX_REPEATS}.`,
    `- Eligibility requires pass rate >= ${(MIN_PASS_RATE * 100).toFixed(0)}%.`,
    "- Quality contributes up to 70 points and is multiplied by pass rate.",
    "- Latency contributes up to 15 points using mean per-scenario latency across repeats.",
    "- Token efficiency contributes up to 15 points using mean per-scenario token usage across repeats.",
    "- Worst-run quality, latency standard deviation and token standard deviation remain visible evidence even when the model passes the stability gate.",
    "",
  );
  return `${lines.join("\n")}\n`;
}
