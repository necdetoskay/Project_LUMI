import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";

import * as schema from "../../src/db/schema/story";
import type { Database } from "../../src/db/client";
import {
  OutcomeManifest,
  StoryContextSnapshot,
  NarrativeEventExtractor,
  EvidenceValidator,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import {
  WorldCommitService,
  __setTestCommitDb,
} from "../../src/application/world-commit.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";

const ENABLE_DESTRUCTIVE = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const DATABASE_URL = process.env.STORY_TEST_DATABASE_URL;
const SAFE_DENYLIST = ["lumi", "postgres", "template1", "template0"];

function requireSafeTestDb(): string {
  if (!ENABLE_DESTRUCTIVE || !DATABASE_URL) {
    throw new Error(
      "ULTEF BLOCKED: STORY_TEST_ENABLE_DESTRUCTIVE=true and STORY_TEST_DATABASE_URL are required",
    );
  }
  const name = new URL(DATABASE_URL).pathname.replace(/^\//, "").split("?")[0]!;
  if (!name || SAFE_DENYLIST.includes(name) || (!name.includes("test") && !name.includes("review"))) {
    throw new Error(`ULTEF BLOCKED: unsafe destructive database name '${name}'`);
  }
  return DATABASE_URL;
}

let queryClient: ReturnType<typeof postgres>;
let db: Database;
let pool: pg.Pool;

beforeAll(async () => {
  if (!ENABLE_DESTRUCTIVE || !DATABASE_URL) return;
  const url = requireSafeTestDb();
  queryClient = postgres(url, { max: 2 });
  db = drizzle(queryClient, { schema });
  pool = new pg.Pool({ connectionString: url });
  __setTestCommitDb(db);
  await pool.query("CREATE SCHEMA IF NOT EXISTS story;");
  for (const file of ["0003_world_commit_system.sql", "0004_story_outbox.sql"]) {
    const migration = readFileSync(
      resolve(__dirname, "..", "..", "migrations", file),
      "utf-8",
    );
    await pool.query(migration);
  }
});

afterAll(async () => {
  __setTestCommitDb(undefined);
  if (!ENABLE_DESTRUCTIVE || !DATABASE_URL) return;
  await queryClient.end();
  await pool.end();
});

describe.skipIf(!ENABLE_DESTRUCTIVE)("PX-LUMI-09-001 outcome commit narrative", () => {
  it("persists an NPC story outcome, world-version delta, event evidence and idempotency", async () => {
    const householdId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const storySessionId = crypto.randomUUID();
    const npcId = crypto.randomUUID();

    const scenario = createScenario({
      id: "PX-LUMI-09-001",
      title: "Story outcome is committed durably and idempotently",
      level: "L4",
      projectGate: "PX-LUMI-09",
      seed: "world-commit-001",
    });
    scenario.setup("Household", householdId);
    scenario.setup("World", worldId);
    scenario.setup("Story session", storySessionId);
    scenario.setup("NPC", { id: npcId, name: "Mira" });
    scenario.setup("Observed state before story outcome", { "need.hunger": 40 });

    const manifest = OutcomeManifest.create({
      storySessionId,
      householdId,
      worldId,
      source: "story_session",
      sourceSceneId: "ultef-scene-mira-bridge",
      changes: [
        {
          key: "ultef-mira-hunger",
          outcomeType: "npc_state_update",
          entityId: npcId,
          operation: "set",
          field: "need.hunger",
          value: 80,
          evidenceRef: "scene://ultef/mira-bridge#outcome-1",
        },
      ],
    });
    const snapshot = StoryContextSnapshot.create({
      storySessionId,
      householdId,
      worldId,
      worldStateHash: "ultef-before",
      entities: [
        {
          entityId: npcId,
          entityKind: "npc",
          state: { need: { hunger: 40 } },
          stateHash: "ultef-mira-before",
        },
      ],
    });

    scenario.event(
      "story.outcome.proposed",
      "Hikâye sonucu Mira için need.hunger değerini 40'tan 80'e ayarlamayı önerdi.",
      { evidenceRef: "scene://ultef/mira-bridge#outcome-1" },
    );

    const service = new WorldCommitService();
    const input = {
      manifest,
      snapshot,
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    };
    const first = await service.commitManifest(input);
    scenario.event(
      "world.commit.applied",
      `Outcome commit edildi; world version ${first.worldVersionBefore} -> ${first.worldVersionAfter}.`,
      { commitId: first.commitId, worldStateHash: first.worldStateHash },
    );
    scenario.delta("world.version", first.worldVersionBefore, first.worldVersionAfter, "story outcome commit");
    scenario.delta("proposedChange.Mira.need.hunger", 40, 80, "validated world change recorded by commit pipeline");

    const persistedCommits = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(eq(schema.storyCommitRecords.id, first.commitId));
    const persistedVersion = await db
      .select()
      .from(schema.storyWorldVersions)
      .where(
        and(
          eq(schema.storyWorldVersions.householdId, householdId),
          eq(schema.storyWorldVersions.worldId, worldId),
        ),
      );
    const persistedEvents = await db
      .select()
      .from(schema.storyEventStore)
      .where(eq(schema.storyEventStore.storySessionId, storySessionId));
    const persistedOutbox = await db
      .select()
      .from(schema.storyOutbox)
      .where(eq(schema.storyOutbox.commitId, first.commitId));

    scenario.event("world.commit.reloaded", "Commit, world version, event ve indirect-effect outbox kayıtları veritabanından yeniden okundu.");

    const second = await service.commitManifest(input);
    const commitsAfterRetry = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(eq(schema.storyCommitRecords.manifestId, manifest.id));
    scenario.event("world.commit.retried", "Aynı manifest ikinci kez uygulandı; idempotency guard mevcut commit'i yeniden kullandı.", {
      firstCommitId: first.commitId,
      retryCommitId: second.commitId,
    });

    scenario.assert("Commit record persisted", persistedCommits.length === 1, 1, persistedCommits.length);
    scenario.assert("World version persisted", persistedVersion.length === 1, String(first.worldVersionAfter), persistedVersion[0]?.currentVersion);
    scenario.assert("World commit event persisted", persistedEvents.some((event) => event.eventType === "STORY_WORLD_COMMIT_APPLIED"), true, persistedEvents.map((event) => event.eventType));
    scenario.assert("Indirect NPC rumor intent persisted", persistedOutbox.some((row) => row.intentType === "npc_rumor_spread"), true, persistedOutbox.map((row) => row.intentType));
    scenario.assert("Retry reused same commit", second.commitId === first.commitId, first.commitId, second.commitId);
    scenario.assert("Retry did not duplicate commit", commitsAfterRetry.length === 1, 1, commitsAfterRetry.length);

    const passed = persistedCommits.length === 1 &&
      persistedVersion.length === 1 &&
      persistedEvents.some((event) => event.eventType === "STORY_WORLD_COMMIT_APPLIED") &&
      persistedOutbox.some((row) => row.intentType === "npc_rumor_spread") &&
      second.commitId === first.commitId && commitsAfterRetry.length === 1;

    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Validated story outcome was durably committed and remained idempotent after DB reload/retry."
        : "One or more durable commit/idempotency assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });

    expect(report.result).toBe("PASS");
  });
});
