import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { renderNarrative } from "./evidence.mjs";

export async function writeScenarioArtifacts(report, options = {}) {
  const rootDir =
    options.rootDir ?? path.join(readRepoRoot(), "artifacts", "ultef");
  const runId = options.runId ?? makeRunId(report.startedAt);
  const runDir = path.join(rootDir, "runs", runId);
  const latestDir = path.join(rootDir, "latest");
  const metadata = buildRunMetadata(report, options);
  const payload = { ...report, run: metadata };
  const narrative = renderNarrative(payload);

  await mkdir(runDir, { recursive: true });
  await writeFile(
    path.join(runDir, `${safeName(report.id)}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(runDir, `${safeName(report.id)}.md`),
    narrative,
    "utf8",
  );

  await rm(latestDir, { recursive: true, force: true });
  await mkdir(latestDir, { recursive: true });
  await writeFile(
    path.join(latestDir, "summary.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(latestDir, "summary.md"), narrative, "utf8");
  if (report.result === "FAIL" || report.result === "BLOCKED") {
    await writeFile(
      path.join(latestDir, "failures.json"),
      `${JSON.stringify({ id: report.id, result: report.result, reason: report.reason, blockedBy: report.blockedBy }, null, 2)}\n`,
      "utf8",
    );
  } else {
    await writeFile(
      path.join(latestDir, "failures.json"),
      `${JSON.stringify({ failures: [] }, null, 2)}\n`,
      "utf8",
    );
  }

  return { runId, runDir, latestDir, payload };
}

function buildRunMetadata(report, options) {
  return {
    runId: options.runId ?? makeRunId(report.startedAt),
    gitSha: options.gitSha ?? readGitSha(),
    environment: options.environment ?? process.env.NODE_ENV ?? "development",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    generatedAt: new Date().toISOString(),
    durationMs: Math.max(
      0,
      Date.parse(report.finishedAt) - Date.parse(report.startedAt),
    ),
  };
}

function readRepoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return process.cwd();
  }
}

function readGitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function makeRunId(iso) {
  return `${iso.replace(/[:.]/g, "-")}-${process.pid}`;
}

function safeName(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}
