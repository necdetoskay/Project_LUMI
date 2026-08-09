import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";

import * as schema from "../../src/db/schema/story";
import type { Database } from "../../src/db/client";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import {
  WorldCommitService,
  __setTestCommitDb,
} from "../../src/application/world-commit.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L9-BACKUP-RESTORE-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const describeDb =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let sourcePool: pg.Pool | null = null;
let sourceQueryClient: ReturnType<typeof postgres> | null = null;
let sourceDb: Database | null = null;
let restorePool: pg.Pool | null = null;
let restoreQueryClient: ReturnType<typeof postgres> | null = null;
let restoreDb: Database | null = null;
let restoreDatabaseName: string | null = null;
let backupDir: string | null = null;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 backup restore requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

function withDatabase(url: string, databaseName: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function dockerPostgres(args: string[], mountDir?: string) {
  const dockerArgs = ["run", "--rm", "--network", "host"];
  if (mountDir) dockerArgs.push("-v", `${mountDir}:/backup`);
  dockerArgs.push("postgres:17", ...args);
  execFileSync("docker", dockerArgs, { stdio: "inherit" });
}

async function connectSource(url: string) {
  sourceQueryClient = postgres(url, { max: 2 });
  sourceDb = drizzle(sourceQueryClient, { schema });
  __setTestCommitDb(sourceDb);
}

async function connectRestore(url: string) {
  restoreQueryClient = postgres(url, { max: 2 });
  restoreDb = drizzle(restoreQueryClient, { schema });
  restorePool = new pg.Pool({ connectionString: url });
  __setTestCommitDb(restoreDb);
}

async function disconnectStoryClients() {
  __setTestCommitDb(undefined);
  if (sourceQueryClient) await sourceQueryClient.end();
  if (restoreQueryClient) await restoreQueryClient.end();
  sourceQueryClient = null;
  restoreQueryClient = null;
  sourceDb = null;
  restoreDb = null;
}

async function readState(
  database: Database,
  fixture: { householdId: string; worldId: string; storySessionId: string },
) {
  const commits = await database
    .select()
    .from(schema.storyCommitRecords)
    .where(eq(schema.storyCommitRecords.householdId, fixture.householdId));
  const versions = await database
    .select()
    .from(schema.storyWorldVersions)
    .where(
      and(
        eq(schema.storyWorldVersions.householdId, fixture.householdId),
        eq(schema.storyWorldVersions.worldId, fixture.worldId),
      ),
    );
  const events = await database
    .select()
    .from(schema.storyEventStore)
    .where(eq(schema.storyEventStore.storySessionId, fixture.storySessionId));
  const outbox = await database
    .select()
    .from(schema.storyOutbox)
    .where(eq(schema.storyOutbox.householdId, fixture.householdId));
  const sessions = await database
    .select()
    .from(schema.storySessions)
    .where(eq(schema.storySessions.id, fixture.storySessionId));

  return {
    commitIds: commits.map((row) => row.id).sort(),
    commitCount: commits.length,
    worldVersion: versions[0]?.currentVersion ?? null,
    eventCount: events.length,
    outboxCount: outbox.length,
    pendingOutboxCount: outbox.filter((row) => row.status === "pending").length,
    sessionStatus: sessions[0]?.sessionStatus ?? null,
    sessionVersion: sessions[0]?.version ?? null,
  };
}

describeDb("ULTEF L9 — PostgreSQL backup/restore recovery", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    sourcePool = new pg.Pool({ connectionString: databaseUrl });
    await connectSource(databaseUrl);
  });

  afterAll(async () => {
    await disconnectStoryClients();
    if (sourcePool) await sourcePool.end();
    if (restorePool) await restorePool.end();

    if (databaseUrl && restoreDatabaseName) {
      const adminPool = new pg.Pool({
        connectionString: withDatabase(databaseUrl, "postgres"),
      });
      try {
        await adminPool.query(
          `DROP DATABASE IF EXISTS "${restoreDatabaseName}" WITH (FORCE)`,
        );
      } finally {
        await adminPool.end();
      }
    }
    if (backupDir) rmSync(backupDir, { recursive: true, force: true });
  });

  it("L9-BACKUP-RESTORE-001 restores durable story state and preserved idempotency from a real PostgreSQL dump", async () => {
    if (!databaseUrl || !sourceDb || !sourcePool) {
      throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");
    }

    const fixture = {
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      worldId: crypto.randomUUID(),
      storyDefinitionId: crypto.randomUUID(),
      storyVersionId: crypto.randomUUID(),
      entrySceneId: crypto.randomUUID(),
      storySessionId: crypto.randomUUID(),
    };
    const npcId = crypto.randomUUID();
    await seedStoryFixture(sourcePool, fixture);

    const scenario = createScenario({
      id: "L9-BACKUP-RESTORE-001",
      title:
        "PostgreSQL backup survives source corruption and restores idempotent story state",
      level: "L9",
      projectGate: "L9-G8",
      seed: "runtime-uuid",
    });

    try {
      const extractor = new NarrativeEventExtractor();
      const validator = new EvidenceValidator();
      const ruleEngine = new WorldCommitRuleEngine({
        rules: defaultOutcomeRules(),
      });
      const snapshot = StoryContextSnapshot.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        worldStateHash: "l9-backup-before",
        entities: [
          {
            entityId: npcId,
            entityKind: "npc",
            state: { memory: { restoreMarker: 0 } },
            stateHash: "l9-backup-npc-before",
          },
        ],
      });
      const manifest = OutcomeManifest.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        source: "story_session",
        sourceSceneId: "l9-backup-scene",
        changes: [
          {
            key: "l9-backup-npc-state",
            outcomeType: "npc_state_update",
            entityId: npcId,
            operation: "set",
            field: "memory.restoreMarker",
            value: 1,
            evidenceRef: "scene://l9/backup#npc-state",
          },
        ],
      });
      const input = { manifest, snapshot, extractor, validator, ruleEngine };
      const committed = await new WorldCommitService().commitManifest(input);
      const stateBeforeBackup = await readState(sourceDb, fixture);

      backupDir = mkdtempSync(join(tmpdir(), "lumi-l9-backup-"));
      const backupPath = "/backup/l9-backup.dump";
      dockerPostgres(
        ["pg_dump", "--format=custom", `--file=${backupPath}`, databaseUrl],
        backupDir,
      );

      await sourcePool.query(
        "DELETE FROM story.story_outbox WHERE household_id = $1",
        [fixture.householdId],
      );
      await sourcePool.query(
        "DELETE FROM story.story_commit_records WHERE household_id = $1",
        [fixture.householdId],
      );
      await sourcePool.query(
        "DELETE FROM story.story_world_versions WHERE household_id = $1",
        [fixture.householdId],
      );
      const corruptedState = await readState(sourceDb, fixture);

      restoreDatabaseName = `lumi_ultef_restore_test_${crypto
        .randomUUID()
        .replaceAll("-", "")}`;
      const adminPool = new pg.Pool({
        connectionString: withDatabase(databaseUrl, "postgres"),
      });
      try {
        await adminPool.query(`CREATE DATABASE "${restoreDatabaseName}"`);
      } finally {
        await adminPool.end();
      }

      const restoreUrl = withDatabase(databaseUrl, restoreDatabaseName);
      dockerPostgres(
        [
          "pg_restore",
          "--no-owner",
          "--no-privileges",
          `--dbname=${restoreUrl}`,
          backupPath,
        ],
        backupDir,
      );
      await connectRestore(restoreUrl);
      if (!restoreDb) throw new Error("RESTORE_DB_CONNECT_FAILED");

      const restoredState = await readState(restoreDb, fixture);
      const replayed = await new WorldCommitService().commitManifest(input);
      const afterReplayState = await readState(restoreDb, fixture);

      const corruptionWasReal =
        corruptedState.commitCount === 0 &&
        corruptedState.worldVersion === null &&
        corruptedState.outboxCount === 0;
      const restoredExactly =
        JSON.stringify(restoredState) === JSON.stringify(stateBeforeBackup);
      const replayStayedIdempotent =
        replayed.commitId === committed.commitId &&
        JSON.stringify(afterReplayState) === JSON.stringify(restoredState);

      scenario.event(
        "backup.restore.completed",
        `Restored commit ${committed.commitId} into independent database ${restoreDatabaseName}.`,
        { stateBeforeBackup, corruptedState, restoredState, afterReplayState },
      );
      scenario.assert(
        "Source corruption removed durable commit state after backup",
        corruptionWasReal,
        true,
        corruptedState,
      );
      scenario.assert(
        "Restored database exactly recovered story commit, world version, session, events and pending outbox state",
        restoredExactly,
        stateBeforeBackup,
        restoredState,
      );
      scenario.assert(
        "Replaying the restored manifest reused the original commit without duplicate mutation",
        replayStayedIdempotent,
        committed.commitId,
        replayed.commitId,
      );

      const passed =
        corruptionWasReal && restoredExactly && replayStayedIdempotent;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "A real PostgreSQL 17 dump restored durable story state into an independent database and preserved replay idempotency after source corruption."
          : "One or more L9 backup/restore invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres17-backup-restore",
      });
      expect(report.result).toBe("PASS");
    } finally {
      __setTestCommitDb(sourceDb ?? undefined);
      await sourcePool.query(
        "DELETE FROM story.story_outbox WHERE household_id = $1",
        [fixture.householdId],
      );
      await sourcePool.query(
        "DELETE FROM story.story_commit_records WHERE household_id = $1",
        [fixture.householdId],
      );
      await sourcePool.query(
        "DELETE FROM story.story_world_versions WHERE household_id = $1",
        [fixture.householdId],
      );
      await cleanupStoryFixture(sourcePool, fixture);
    }
  }, 90_000);
});
