import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";

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

const enabled = process.env.ULTEF_SCENARIO === "L4-CHOICE-WORLD-DIVERGENCE-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const describeDb =
  enabled && destructive && databaseUrl ? describe : describe.skip;

function fixture() {
  return {
    householdId: crypto.randomUUID(),
    childProfileId: crypto.randomUUID(),
    characterId: crypto.randomUUID(),
    worldId: crypto.randomUUID(),
    storyDefinitionId: crypto.randomUUID(),
    storyVersionId: crypto.randomUUID(),
    entrySceneId: crypto.randomUUID(),
    storySessionId: crypto.randomUUID(),
  };
}

const branchA = fixture();
const branchB = fixture();
const npcId = crypto.randomUUID();
let pool: pg.Pool | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;
let db: Database | null = null;

beforeAll(async () => {
  if (!databaseUrl || !destructive || !enabled) return;
  const dbName =
    new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!dbName.includes("test") && !dbName.includes("review")) {
    throw new Error(
      `ULTEF choice-world divergence requires disposable DB; got '${dbName}'.`,
    );
  }
  pool = new pg.Pool({ connectionString: databaseUrl });
  queryClient = postgres(databaseUrl, { max: 2 });
  db = drizzle(queryClient, { schema });
  __setTestCommitDb(db);
  await seedStoryFixture(pool, branchA);
  await seedStoryFixture(pool, branchB);
});

afterAll(async () => {
  __setTestCommitDb(undefined);
  if (!pool) return;
  for (const branch of [branchA, branchB]) {
    await pool.query("DELETE FROM story.story_outbox WHERE household_id = $1", [
      branch.householdId,
    ]);
    await pool.query(
      "DELETE FROM story.story_commit_records WHERE household_id = $1",
      [branch.householdId],
    );
    await pool.query(
      "DELETE FROM story.story_world_versions WHERE household_id = $1",
      [branch.householdId],
    );
    await cleanupStoryFixture(pool, branch);
  }
  await pool.end();
  await queryClient?.end();
});

function commitInput(
  branch: typeof branchA,
  option: "ask-mira" | "follow-lights",
) {
  const isAsk = option === "ask-mira";
  const manifest = OutcomeManifest.create({
    storySessionId: branch.storySessionId,
    householdId: branch.householdId,
    worldId: branch.worldId,
    source: "story_session",
    sourceSceneId: branch.entrySceneId,
    changes: [
      {
        key: `choice-${option}`,
        outcomeType: "npc_state_update",
        entityId: npcId,
        operation: "set",
        field: isAsk ? "relationship.trust" : "knowledge.bridgeLights",
        value: isAsk ? 70 : true,
        evidenceRef: `scene://ultef/bridge#${option}`,
      },
    ],
  });
  const snapshot = StoryContextSnapshot.create({
    storySessionId: branch.storySessionId,
    householdId: branch.householdId,
    worldId: branch.worldId,
    worldStateHash: "equivalent-start-state",
    entities: [
      {
        entityId: npcId,
        entityKind: "npc",
        state: {
          relationship: { trust: 40 },
          knowledge: { bridgeLights: false },
        },
        stateHash: "mira-equivalent-start",
      },
    ],
  });
  return {
    manifest,
    snapshot,
    extractor: new NarrativeEventExtractor(),
    validator: new EvidenceValidator(),
    ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
  };
}

describeDb("ULTEF Sprint 01 — choice-derived world divergence", () => {
  it("L4-CHOICE-WORLD-DIVERGENCE-001 produces distinct durable world outcomes from equivalent starts", async () => {
    if (!db || !pool) throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L4-CHOICE-WORLD-DIVERGENCE-001",
      title: "Different choices produce distinct durable world outcomes",
      level: "L4",
      projectGate: "PX-LUMI-09",
      seed: "equivalent-branch-worlds",
    });
    scenario.setup("Equivalent initial state", {
      npc: "Mira",
      trust: 40,
      knowsBridgeLights: false,
      worldStateHash: "equivalent-start-state",
    });
    scenario.setup("Branch A choice", "Mira'ya isiklari sor");
    scenario.setup("Branch B choice", "Isiklari sessizce takip et");

    const service = new WorldCommitService();
    const resultA = await service.commitManifest(
      commitInput(branchA, "ask-mira"),
    );
    const resultB = await service.commitManifest(
      commitInput(branchB, "follow-lights"),
    );

    const commitsA = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(eq(schema.storyCommitRecords.householdId, branchA.householdId));
    const commitsB = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(eq(schema.storyCommitRecords.householdId, branchB.householdId));
    const outboxA = await db
      .select()
      .from(schema.storyOutbox)
      .where(eq(schema.storyOutbox.householdId, branchA.householdId));
    const outboxB = await db
      .select()
      .from(schema.storyOutbox)
      .where(eq(schema.storyOutbox.householdId, branchB.householdId));
    const versionsA = await db
      .select()
      .from(schema.storyWorldVersions)
      .where(eq(schema.storyWorldVersions.householdId, branchA.householdId));
    const versionsB = await db
      .select()
      .from(schema.storyWorldVersions)
      .where(eq(schema.storyWorldVersions.householdId, branchB.householdId));

    scenario.event(
      "branch-a.world-commit",
      `Mira'ya sorma secimi trust outcome'una donustu; world hash=${resultA.worldStateHash}.`,
    );
    scenario.event(
      "branch-b.world-commit",
      `Isiklari takip etme secimi knowledge outcome'una donustu; world hash=${resultB.worldStateHash}.`,
    );
    scenario.event(
      "branches.db-reload",
      "Her iki branch'in commit, world-version ve outbox kayitlari PostgreSQL'den yeniden okundu.",
    );

    const assertions = {
      eachCommittedOnce: commitsA.length === 1 && commitsB.length === 1,
      eachWorldAdvancedOnce:
        versionsA[0]?.currentVersion === "1" &&
        versionsB[0]?.currentVersion === "1",
      differentWorldHashes: resultA.worldStateHash !== resultB.worldStateHash,
      differentCommitIds: resultA.commitId !== resultB.commitId,
      eachHasOwnOutbox: outboxA.length > 0 && outboxB.length > 0,
      noCrossHouseholdLeak:
        commitsA.every((row) => row.householdId === branchA.householdId) &&
        commitsB.every((row) => row.householdId === branchB.householdId) &&
        outboxA.every((row) => row.householdId === branchA.householdId) &&
        outboxB.every((row) => row.householdId === branchB.householdId),
    };

    scenario.assert(
      "Each choice produced one durable commit",
      assertions.eachCommittedOnce,
      true,
      {
        branchA: commitsA.length,
        branchB: commitsB.length,
      },
    );
    scenario.assert(
      "Each equivalent world advanced exactly once",
      assertions.eachWorldAdvancedOnce,
      true,
      {
        branchA: versionsA[0]?.currentVersion ?? null,
        branchB: versionsB[0]?.currentVersion ?? null,
      },
    );
    scenario.assert(
      "Different choices produced different world hashes",
      assertions.differentWorldHashes,
      true,
      {
        branchA: resultA.worldStateHash,
        branchB: resultB.worldStateHash,
      },
    );
    scenario.assert(
      "Different choices produced different commit identities",
      assertions.differentCommitIds,
      true,
      {
        branchA: resultA.commitId,
        branchB: resultB.commitId,
      },
    );
    scenario.assert(
      "Each branch produced its own indirect-effect outbox",
      assertions.eachHasOwnOutbox,
      true,
      {
        branchA: outboxA.length,
        branchB: outboxB.length,
      },
    );
    scenario.assert(
      "No commit/outbox crossed branch households",
      assertions.noCrossHouseholdLeak,
      true,
      {
        branchACommitHouseholds: commitsA.map((row) => row.householdId),
        branchBCommitHouseholds: commitsB.map((row) => row.householdId),
      },
    );

    scenario.delta(
      "branchA.worldHash",
      "equivalent-start-state",
      resultA.worldStateHash,
      "ask-mira outcome",
    );
    scenario.delta(
      "branchB.worldHash",
      "equivalent-start-state",
      resultB.worldStateHash,
      "follow-lights outcome",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Two equivalent initial snapshots produced choice-specific world hashes, commits and outbox records without cross-branch leakage."
        : "Choice-derived world divergence or isolation assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
