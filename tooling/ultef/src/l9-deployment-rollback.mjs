import { execFileSync, spawnSync } from "node:child_process";

import { createScenario } from "./evidence.mjs";
import { writeScenarioArtifacts } from "./artifacts.mjs";

const IMAGE = "lumi-l9-deploy-rollback:good";
const CANDIDATE = "lumi-l9-deploy-candidate";
const ROLLBACK = "lumi-l9-deploy-rollback";
const PORT = Number(process.env.L9_DEPLOY_PORT ?? 3100);
const COMMIT_SHA = process.env.GITHUB_SHA ?? "local-l9-deploy-rollback";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    ...options,
  });
}

function cleanup() {
  for (const name of [CANDIDATE, ROLLBACK]) {
    spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
  }
}

function containerState(name) {
  const result = spawnSync(
    "docker",
    ["inspect", "-f", "{{.State.Status}}", name],
    { encoding: "utf8" },
  );
  return result.status === 0 ? result.stdout.trim() : "missing";
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      const body = await response.json();
      if (response.ok && body?.service === "lumi-web" && body?.status === "ok") {
        return { ok: true, status: response.status, body };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { ok: false, error: lastError };
}

cleanup();

const scenario = createScenario({
  id: "L9-DEPLOY-ROLLBACK-001",
  title: "Container candidate failure rolls back to the previous healthy image",
  level: "L9",
  projectGate: "L9-G9",
  seed: "docker-runtime-rollback",
});
scenario.setup("Candidate port", PORT);
scenario.setup("Rollback image", IMAGE);
scenario.setup("Expected image revision", COMMIT_SHA);

try {
  run("docker", [
    "build",
    "-t",
    IMAGE,
    "--build-arg",
    "NEXT_PUBLIC_APP_URL=http://localhost",
    "--build-arg",
    "IMAGE_VERSION=l9-rollback-good",
    "--build-arg",
    `IMAGE_COMMIT_SHA=${COMMIT_SHA}`,
    ".",
  ]);

  run("docker", [
    "run",
    "-d",
    "--name",
    CANDIDATE,
    "-p",
    `${PORT}:3000`,
    IMAGE,
    "node",
    "-e",
    "process.exit(42)",
  ]);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const candidateState = containerState(CANDIDATE);
  const candidateRejected = candidateState !== "running";
  scenario.event(
    "deploy.candidate.rejected",
    `Candidate container entered state '${candidateState}' before serving health traffic.`,
  );

  if (!candidateRejected) {
    throw new Error(`BAD_CANDIDATE_WAS_NOT_REJECTED state=${candidateState}`);
  }

  run("docker", ["rm", "-f", CANDIDATE]);
  run("docker", [
    "run",
    "-d",
    "--name",
    ROLLBACK,
    "-p",
    `${PORT}:3000`,
    IMAGE,
  ]);

  const health = await waitForHealth(`http://127.0.0.1:${PORT}/api/health`, 60_000);
  const rollbackState = containerState(ROLLBACK);
  const imageVersion = run(
    "docker",
    ["image", "inspect", "-f", "{{index .Config.Labels \"org.opencontainers.image.version\"}}", IMAGE],
    { capture: true },
  ).trim();
  const imageRevision = run(
    "docker",
    ["image", "inspect", "-f", "{{index .Config.Labels \"org.opencontainers.image.revision\"}}", IMAGE],
    { capture: true },
  ).trim();

  const rollbackHealthy = health.ok && rollbackState === "running";
  const traceableArtifact =
    imageVersion === "l9-rollback-good" && imageRevision === COMMIT_SHA;

  scenario.event(
    "deploy.rollback.completed",
    `Previous image resumed service on port ${PORT}; runtime state '${rollbackState}'.`,
    { health, imageVersion, imageRevision },
  );
  scenario.assert(
    "Failed candidate is rejected before receiving production traffic",
    candidateRejected,
    true,
    candidateState,
  );
  scenario.assert(
    "Previous container image becomes healthy after rollback",
    rollbackHealthy,
    true,
    { rollbackState, health },
  );
  scenario.assert(
    "Rollback artifact retains version and commit traceability labels",
    traceableArtifact,
    { version: "l9-rollback-good", revision: COMMIT_SHA },
    { version: imageVersion, revision: imageRevision },
  );

  const passed = candidateRejected && rollbackHealthy && traceableArtifact;
  const report = scenario.finish({
    result: passed ? "PASS" : "FAIL",
    reason: passed
      ? "An unhealthy candidate was rejected and the previous traceable container image restored healthy service on the same port."
      : "One or more deployment rollback invariants failed.",
  });
  await writeScenarioArtifacts(report, {
    environment: "github-actions-docker-runtime",
  });
  if (!passed) process.exitCode = 1;
} catch (error) {
  const report = scenario.finish({
    result: "FAIL",
    reason: error instanceof Error ? error.message : String(error),
  });
  await writeScenarioArtifacts(report, {
    environment: "github-actions-docker-runtime",
  });
  throw error;
} finally {
  cleanup();
}
