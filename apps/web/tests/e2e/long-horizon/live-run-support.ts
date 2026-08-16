import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface LongHorizonRunConfig {
  runId: string;
  childAge: number;
  rngSeed: number;
  parentEmail: string;
  parentPassword: string;
  evidenceDir: string;
}

export interface RecordedSelection {
  step: string;
  index: number;
  visibleText: string;
}

export interface LongHorizonRunEvidence {
  formatVersion: 1;
  runId: string;
  childAge: number;
  rngSeed: number;
  startedAt: string;
  childDisplayName: string;
  selections: RecordedSelection[];
  characterDetailUrl?: string;
  finalReview?: string;
}

export function loadLongHorizonRunConfig(): LongHorizonRunConfig {
  const childAge = Number(process.env.LUMI_LONG_HORIZON_CHILD_AGE ?? "6");
  if (!Number.isInteger(childAge) || childAge < 3 || childAge > 17) {
    throw new Error("LUMI_LONG_HORIZON_CHILD_AGE must be an integer from 3 to 17");
  }

  const parentEmail = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const parentPassword = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!parentEmail || !parentPassword) {
    throw new Error(
      "LUMI_LONG_HORIZON_PARENT_EMAIL and LUMI_LONG_HORIZON_PARENT_PASSWORD are required",
    );
  }

  const suppliedSeed = process.env.LUMI_LONG_HORIZON_RNG_SEED;
  const rngSeed = suppliedSeed
    ? Number(suppliedSeed)
    : Math.floor(Date.now() % 2_147_483_647);
  if (!Number.isInteger(rngSeed) || rngSeed < 0) {
    throw new Error("LUMI_LONG_HORIZON_RNG_SEED must be a non-negative integer");
  }

  const runId =
    process.env.LUMI_LONG_HORIZON_RUN_ID ??
    `age-${childAge}-seed-${rngSeed}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) {
    throw new Error(
      "LUMI_LONG_HORIZON_RUN_ID may contain only letters, numbers, underscore and hyphen",
    );
  }

  return {
    runId,
    childAge,
    rngSeed,
    parentEmail,
    parentPassword,
    evidenceDir: path.resolve(
      process.cwd(),
      "tests/e2e/long-horizon/evidence",
      runId,
    ),
  };
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export async function ensureEvidenceDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

export async function writeRunJson(
  config: LongHorizonRunConfig,
  evidence: LongHorizonRunEvidence,
): Promise<void> {
  await ensureEvidenceDirectory(config.evidenceDir);
  await writeFile(
    path.join(config.evidenceDir, "run.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

export async function writeMarkdown(
  config: LongHorizonRunConfig,
  filename: string,
  content: string,
): Promise<void> {
  await ensureEvidenceDirectory(config.evidenceDir);
  await writeFile(path.join(config.evidenceDir, filename), `${content.trim()}\n`, "utf8");
}
