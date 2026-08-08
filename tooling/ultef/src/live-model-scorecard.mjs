import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_MODELS = 3;
const scenarioId = "L7-LIVE-CONTINUITY-001";
const models = parseModels(process.env.ULTEF_L8_MODELS);

if (models.length === 0) {
  throw new Error("ULTEF_L8_MODELS must contain at least one OpenRouter model id.");
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
  const run = spawnSync(command, ["ultef:live-provider-continuity"], {
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
      latencyMs: null,
      promptTokens: null,
      completionTokens: null,
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
  schemaVersion: 1,
  id: "L8-MODEL-SCORECARD-001",
  generatedAt: new Date().toISOString(),
  scoring: {
    qualityGate: "All four L7 assertions must pass before a model is eligible to win.",
    qualityPoints: 70,
    latencyPoints: 15,
    tokenEfficiencyPoints: 15,
    latencyScale: "15 points at <=3000ms, 0 points at >=15000ms, linear between.",
    tokenScale: "15 points at <=700 total tokens, 0 points at >=2000, linear between.",
  },
  models: results,
  winner: winner?.model ?? null,
};

const jsonPath = path.join(scorecardDir, `${timestamp}-L8-MODEL-SCORECARD-001.json`);
const mdPath = path.join(scorecardDir, `${timestamp}-L8-MODEL-SCORECARD-001.md`);
await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(mdPath, renderMarkdown(payload), "utf8");

console.log(renderMarkdown(payload));
if (!winner) process.exitCode = 1;

function parseModels(raw) {
  return [...new Set((raw ?? "").split(",").map((value) => value.trim()).filter(Boolean))];
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
  const metrics = report.timeline?.find((event) => event.type === "live.provider.metrics")?.data ?? {};
  const liveStory = report.timeline?.find((event) => event.type === "live.story.generated")?.data ?? {};
  const assertions = report.assertions ?? [];
  const assertionsPassed = assertions.filter((item) => item.passed).length;
  const assertionsTotal = assertions.length;
  const qualityGate = report.result === "PASS" && assertionsTotal >= 4 && assertionsPassed === assertionsTotal;
  const latencyMs = numberOrNull(metrics.latencyMs);
  const usage = metrics.usage ?? null;
  const totalTokens = numberOrNull(usage?.totalTokens);
  const latencyPoints = qualityGate ? linearScore(latencyMs, 3000, 15000, 15) : 0;
  const tokenPoints = qualityGate ? linearScore(totalTokens, 700, 2000, 15) : 0;
  const qualityPoints = qualityGate ? 70 : 0;

  return {
    model: liveStory.modelId ?? metrics.modelId ?? requestedModel,
    requestedModel,
    result: processStatus === 0 ? report.result : `${report.result}/PROCESS_${processStatus}`,
    qualityGate,
    score: round(qualityPoints + latencyPoints + tokenPoints),
    qualityPoints,
    latencyPoints: round(latencyPoints),
    tokenEfficiencyPoints: round(tokenPoints),
    latencyMs,
    promptTokens: numberOrNull(usage?.promptTokens),
    completionTokens: numberOrNull(usage?.completionTokens),
    totalTokens,
    assertionsPassed,
    assertionsTotal,
    narrative: liveStory.narrative ?? null,
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

function renderMarkdown(payload) {
  const lines = [
    "# L8-MODEL-SCORECARD-001 — Live model comparison",
    "",
    `Generated: ${payload.generatedAt}`,
    `Winner: **${payload.winner ?? "none"}**`,
    "",
    "Quality is a hard gate: a model that fails continuity, character consistency, child-safety, or schema validity cannot win even if it is faster or cheaper in tokens.",
    "",
    "| Rank | Model | Gate | Score | Latency ms | Tokens | Assertions |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: |",
  ];
  payload.models.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.model} | ${item.qualityGate ? "PASS" : "FAIL"} | ${item.score} | ${item.latencyMs ?? "n/a"} | ${item.totalTokens ?? "n/a"} | ${item.assertionsPassed}/${item.assertionsTotal} |`,
    );
  });
  lines.push("", "## Scoring", "", "- Quality gate: 70 points, only when all required L7 assertions pass.", "- Latency: up to 15 points; full points at <=3s, zero at >=15s.", "- Token efficiency: up to 15 points; full points at <=700 total tokens, zero at >=2000.", "- This v1 scorecard intentionally does not estimate monetary cost because provider/model prices are mutable; token counts remain durable evidence.", "");
  return `${lines.join("\n")}\n`;
}
