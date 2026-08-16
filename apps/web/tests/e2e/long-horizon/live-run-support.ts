import { mkdir, rename, writeFile } from "node:fs/promises";
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
  candidateCount: number;
  selectedIndex: number;
  selectedLabel: string;
  selectedTestId?: string;
  availableLabels: string[];
}

export type RecordedStorySource =
  | "world_event"
  | "npc_call"
  | "inventory_item"
  | "rumor";

export interface RecordedStoryEvidence {
  sequence: number;
  sourceFamily: RecordedStorySource;
  sourceLabel: string;
  sourceTitle: string;
  sourceTeaser: string;
  sceneTitle: string;
  narrative: string;
  narrativeLength: number;
  durationMs: number;
  readerPath: string;
}

export interface LongHorizonRunFailure {
  phase: string;
  name: string;
  message: string;
}

export interface LongHorizonRunEvidence {
  formatVersion: 1;
  runId: string;
  childAge: number;
  rngSeed: number;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "failed" | "completed";
  phase: string;
  childDisplayName: string;
  childProfileId?: string;
  characterId?: string;
  characterDetailPath?: string;
  lastPathname?: string;
  selections: RecordedSelection[];
  stories?: RecordedStoryEvidence[];
  finalReview?: string;
  finalWorldState?: string;
  finalCharacterState?: string;
  finalInventoryState?: string;
  finalNpcState?: string;
  finalRelationshipState?: string;
  failure?: LongHorizonRunFailure;
}

export function loadLongHorizonRunConfig(): LongHorizonRunConfig {
  const childAge = Number(process.env.LUMI_LONG_HORIZON_CHILD_AGE ?? "6");
  if (!Number.isInteger(childAge) || childAge < 3 || childAge > 17) {
    throw new Error(
      "LUMI_LONG_HORIZON_CHILD_AGE must be an integer from 3 to 17",
    );
  }

  const parentEmail = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const parentPassword = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!parentEmail || !parentPassword) {
    throw new Error(
      "LUMI_LONG_HORIZON_PARENT_EMAIL and LUMI_LONG_HORIZON_PARENT_PASSWORD are required",
    );
  }

  const suppliedSeed = process.env.LUMI_LONG_HORIZON_RNG_SEED?.trim();
  const rngSeed = suppliedSeed
    ? Number(suppliedSeed)
    : Math.floor(Date.now() % 2_147_483_647);
  if (!Number.isInteger(rngSeed) || rngSeed < 0) {
    throw new Error(
      "LUMI_LONG_HORIZON_RNG_SEED must be a non-negative integer",
    );
  }

  const suppliedRunId = process.env.LUMI_LONG_HORIZON_RUN_ID?.trim();
  const runId =
    suppliedRunId ||
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

export function normalizeEvidenceText(value: string, maxLength = 500): string {
  return value
    .replace(/\u0000/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export function safePathname(value: string): string {
  try {
    return new URL(value, "https://lumi.invalid").pathname;
  } catch {
    return "/";
  }
}

export function sanitizeFailure(
  caught: unknown,
  phase: string,
  config: LongHorizonRunConfig,
): LongHorizonRunFailure {
  const error = caught instanceof Error ? caught : new Error(String(caught));
  return {
    phase,
    name: normalizeEvidenceText(error.name, 80),
    message: redactSensitiveText(error.message, config),
  };
}

export function formatRunSummary(evidence: LongHorizonRunEvidence): string {
  const selectionLines = evidence.selections.length
    ? evidence.selections
        .map(
          (selection) =>
            `- ${selection.step}: ${selection.selectedLabel} (${selection.selectedIndex + 1}/${selection.candidateCount})`,
        )
        .join("\n")
    : "- No onboarding selection was committed before the run stopped.";
  const storyLines = evidence.stories?.length
    ? evidence.stories
        .map(
          (story) =>
            `- Story ${story.sequence}: ${story.sourceFamily} · ${story.sourceTitle} · ${story.narrativeLength} chars · ${story.durationMs} ms`,
        )
        .join("\n")
    : "- No completed generated story was recorded.";

  const failureSection = evidence.failure
    ? `\n## Failure\n\n- Phase: ${evidence.failure.phase}\n- Type: ${evidence.failure.name}\n- Message: ${evidence.failure.message}\n`
    : "";

  return `# LUMI Long-Horizon Run ${evidence.runId}\n\n- Status: ${evidence.status}\n- Current phase: ${evidence.phase}\n- Child age: ${evidence.childAge}\n- Child label: ${evidence.childDisplayName}\n- RNG seed: ${evidence.rngSeed}\n- Child profile id: ${evidence.childProfileId ?? "not-created"}\n- Character id: ${evidence.characterId ?? "not-committed"}\n- Character path: ${evidence.characterDetailPath ?? "not-committed"}\n- Persistent data cleanup: disabled by contract\n\n## Random visible onboarding selections\n\n${selectionLines}\n\n## Generated stories\n\n${storyLines}${failureSection}`;
}

export function formatStoryMarkdown(story: RecordedStoryEvidence): string {
  return `# Story ${story.sequence}\n\n- Source family: ${story.sourceFamily}\n- Visible source label: ${story.sourceLabel}\n- Source title: ${story.sourceTitle}\n- Source teaser: ${story.sourceTeaser}\n- Scene title: ${story.sceneTitle}\n- Narrative characters: ${story.narrativeLength}\n- Generation/start duration: ${story.durationMs} ms\n- Reader path: ${story.readerPath}\n\n## Story text\n\n${story.narrative}`;
}

export async function ensureEvidenceDirectory(
  directory: string,
): Promise<void> {
  await mkdir(directory, { recursive: true });
}

export async function initializeRunJson(
  config: LongHorizonRunConfig,
  evidence: LongHorizonRunEvidence,
): Promise<void> {
  await ensureEvidenceDirectory(config.evidenceDir);
  await writeFile(
    path.join(config.evidenceDir, "run.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

export async function writeRunJson(
  config: LongHorizonRunConfig,
  evidence: LongHorizonRunEvidence,
): Promise<void> {
  await writeEvidenceFile(
    config,
    "run.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
}

export async function writeMarkdown(
  config: LongHorizonRunConfig,
  filename: string,
  content: string,
): Promise<void> {
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error(`Unsafe evidence filename: ${filename}`);
  }
  await writeEvidenceFile(config, filename, `${content.trim()}\n`);
}

async function writeEvidenceFile(
  config: LongHorizonRunConfig,
  filename: string,
  content: string,
): Promise<void> {
  await ensureEvidenceDirectory(config.evidenceDir);
  const targetPath = path.join(config.evidenceDir, filename);
  const tempPath = path.join(
    config.evidenceDir,
    `.${filename}.${process.pid}.${Date.now()}.tmp`,
  );
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, targetPath);
}

function redactSensitiveText(
  value: string,
  config: LongHorizonRunConfig,
): string {
  let redacted = value;
  for (const [secret, replacement] of [
    [config.parentPassword, "[REDACTED_PASSWORD]"],
    [config.parentEmail, "[REDACTED_ACCOUNT]"],
  ] as const) {
    if (secret) redacted = redacted.split(secret).join(replacement);
  }

  redacted = redacted.replace(
    /([?&](?:token|access_token|refresh_token|code|session|password)=)[^&#\s]+/gi,
    "$1[REDACTED]",
  );
  return normalizeEvidenceText(redacted, 1_000);
}
