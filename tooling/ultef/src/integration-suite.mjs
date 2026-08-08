import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const scenarios = ["L4-SCENE-SESSION-001", "PX-LUMI-09-001", "PX-LUMI-09-002"];

const startedAt = new Date();
const root = path.resolve("artifacts/ultef");
const runRoot = path.join(root, "runs");
const latest = path.join(root, "latest");
const results = [];

for (const id of scenarios) {
  console.log(`\n=== ULTEF integration scenario: ${id} ===`);
  const before = Date.now();
  const child = spawnSync("node", ["tooling/ultef/src/cli.mjs", id], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ULTEF_SUITE_CHILD: "true" },
  });

  const report = await findNewestScenarioReport(runRoot, id, before);
  if (report) {
    results.push({
      id,
      result: report.result,
      reason: report.reason ?? null,
      blockedBy: report.blockedBy ?? null,
      artifact: report.__artifact,
      durationMs: report.run?.durationMs ?? null,
    });
    continue;
  }

  results.push({
    id,
    result: child.status === 0 ? "BLOCKED" : "FAIL",
    reason:
      child.status === 0
        ? "Scenario process exited without producing runtime evidence. The most likely cause is an unmet guarded integration prerequisite (for example disposable database configuration)."
        : `Scenario process exited with status ${child.status ?? "unknown"} before producing runtime evidence.`,
    blockedBy: child.status === 0 ? "NO_RUNTIME_EVIDENCE" : null,
    artifact: null,
    durationMs: Date.now() - before,
  });
}

const counts = Object.fromEntries(
  ["PASS", "WARN", "FAIL", "BLOCKED"].map((key) => [
    key,
    results.filter((r) => r.result === key).length,
  ]),
);
const overall =
  counts.FAIL > 0
    ? "FAIL"
    : counts.BLOCKED > 0
      ? "BLOCKED"
      : counts.WARN > 0
        ? "WARN"
        : "PASS";
const finishedAt = new Date();
const suite = {
  schemaVersion: 1,
  suiteId: "ULTEF-DB-INTEGRATION",
  title: "ULTEF DB-backed integration profile",
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  result: overall,
  counts,
  scenarios: results,
};

await mkdir(latest, { recursive: true });
await writeFile(
  path.join(latest, "integration-summary.json"),
  `${JSON.stringify(suite, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(latest, "integration-summary.md"),
  renderSuite(suite),
  "utf8",
);
await writeFile(
  path.join(latest, "integration-failures.json"),
  `${JSON.stringify({ failures: results.filter((r) => r.result === "FAIL" || r.result === "BLOCKED") }, null, 2)}\n`,
  "utf8",
);

console.log(`\n${renderSuite(suite)}`);
process.exit(overall === "PASS" || overall === "WARN" ? 0 : 1);

async function findNewestScenarioReport(rootDir, scenarioId, notBeforeMs) {
  try {
    const dirs = await readdir(rootDir, { withFileTypes: true });
    const candidates = [];
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const file = path.join(rootDir, dir.name, `${scenarioId}.json`);
      try {
        const info = await stat(file);
        if (info.mtimeMs + 1000 < notBeforeMs) continue;
        candidates.push({ file, mtimeMs: info.mtimeMs });
      } catch {}
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    if (!candidates[0]) return null;
    const parsed = JSON.parse(await readFile(candidates[0].file, "utf8"));
    parsed.__artifact = path.relative(process.cwd(), candidates[0].file);
    return parsed;
  } catch {
    return null;
  }
}

function renderSuite(suite) {
  const lines = [
    `# ${suite.suiteId} — ${suite.title}`,
    "",
    `Overall result: **${suite.result}**`,
    `PASS: ${suite.counts.PASS} | WARN: ${suite.counts.WARN} | FAIL: ${suite.counts.FAIL} | BLOCKED: ${suite.counts.BLOCKED}`,
    "",
    "## Scenarios",
  ];
  for (const item of suite.scenarios) {
    lines.push(`- **${item.id} — ${item.result}**`);
    if (item.reason) lines.push(`  - ${item.reason}`);
    if (item.artifact) lines.push(`  - Evidence: \`${item.artifact}\``);
  }
  lines.push(
    "",
    "A scenario without runtime evidence is never counted as PASS.",
  );
  return `${lines.join("\n")}\n`;
}
