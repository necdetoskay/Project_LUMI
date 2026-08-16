import fs from "node:fs";
import path from "node:path";

const [, , logPath, reportPath] = process.argv;
if (!logPath || !reportPath) {
  console.error("Usage: node extract-onboarding-live-report.mjs <log> <report.json>");
  process.exit(1);
}

const text = fs.readFileSync(logPath, "utf8");
const marker = "LUMI_ONBOARDING_LIVE_RESULT";
const markerIndex = text.indexOf(marker);
if (markerIndex < 0) {
  console.error(`Missing ${marker} marker in live E2E output`);
  process.exit(1);
}

const jsonStart = text.indexOf("{", markerIndex + marker.length);
if (jsonStart < 0) {
  console.error("Live E2E marker did not contain a JSON object");
  process.exit(1);
}

let depth = 0;
let inString = false;
let escaped = false;
let jsonEnd = -1;
for (let i = jsonStart; i < text.length; i += 1) {
  const char = text[i];
  if (inString) {
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === '"') inString = false;
    continue;
  }
  if (char === '"') inString = true;
  else if (char === "{") depth += 1;
  else if (char === "}") {
    depth -= 1;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
}

if (jsonEnd < 0) {
  console.error("Could not find the end of live E2E JSON payload");
  process.exit(1);
}

const live = JSON.parse(text.slice(jsonStart, jsonEnd));
const traces = Array.isArray(live.generationTraces) ? live.generationTraces : [];
const sum = (field) => traces.reduce((total, row) => total + Number(row?.[field] ?? 0), 0);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  stages: live.stages,
  model: live.model,
  totals: {
    promptTokens: sum("promptTokens"),
    completionTokens: sum("completionTokens"),
    totalTokens: sum("totalTokens"),
    latencyMs: sum("latencyMs"),
    estimatedCostUsdMicros: null,
    costStatus: "unavailable_in_current_trace_payload",
  },
  generations: traces.map((row) => ({
    stage: row.taskType,
    promptKey: row.promptKey,
    promptVersion: row.promptVersion,
    model: row.modelId,
    promptTokens: Number(row.promptTokens ?? 0),
    completionTokens: Number(row.completionTokens ?? 0),
    totalTokens: Number(row.totalTokens ?? 0),
    latencyMs: Number(row.latencyMs ?? 0),
    estimatedCostUsdMicros: row.estimatedCostUsdMicros ?? null,
  })),
  persistence: live.persistence,
  character: live.character,
  world: live.world,
  compatibility: live.compatibility,
  region: live.region,
  origin: live.origin,
  coreSaga: live.coreSaga,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const rows = report.generations
    .map(
      (row) =>
        `| ${row.stage} | ${row.model} | ${row.promptTokens} | ${row.completionTokens} | ${row.totalTokens} | ${row.latencyMs} | ${row.estimatedCostUsdMicros ?? "n/a"} |`,
    )
    .join("\n");
  fs.appendFileSync(
    summaryPath,
    `## Character Onboarding Live E2E\n\n` +
      `- Stages: **${report.stages}**\n` +
      `- Model: \`${report.model}\`\n` +
      `- Total tokens: **${report.totals.totalTokens}**\n` +
      `- Aggregate generation latency: **${report.totals.latencyMs} ms**\n` +
      `- Estimated cost (USD micros): **${report.totals.estimatedCostUsdMicros ?? "n/a"}** (${report.totals.costStatus})\n\n` +
      `| Stage/task | Model | Prompt | Completion | Total | Latency ms | Cost µUSD |\n` +
      `|---|---|---:|---:|---:|---:|---:|\n${rows}\n`,
  );
}

console.log(`Onboarding live evidence written to ${reportPath}`);
