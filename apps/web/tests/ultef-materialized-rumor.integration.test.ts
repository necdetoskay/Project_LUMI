import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { sql } from "drizzle-orm";

import { __setTestPropagationDb } from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import { storyOutbox } from "@lumi/story/db/schema/story";
import { createDatabase as createNpcDatabase } from "@lumi/npc-intelligence/db/client";
import { DrizzleBeliefSourceRepository } from "@lumi/npc-intelligence/db";

import { createRumorMaterializationRuntime } from "@/lib/rumor-materialization-runtime";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "PX-LUMI-09-002";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

const HOUSEHOLD_ID = "20000000-0000-4000-8000-000000000091";
const WORLD_ID = "30000000-0000-4000-8000-000000000091";
const COMMIT_ID = "50000000-0000-4000-8000-000000000091";
const SOURCE_NPC = "60000000-0000-4000-8000-000000000091";
const TARGET_NPC = "70000000-0000-4000-8000-000000000091";
const FACT_ID = "bridge-lights-before-storm";
const CLAIM = "Eski koprunun isiklari firtinadan once yaniyor.";

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;
let npcDb: ReturnType<typeof createNpcDatabase>;
let beliefRepository: DrizzleBeliefSourceRepository;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF materialized-rumor test requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);

  pool = new pg.Pool({ connectionString: databaseUrl });
  storyDb = createStoryDatabase(databaseUrl);
  npcDb = createNpcDatabase(databaseUrl);
  beliefRepository = new DrizzleBeliefSourceRepository(npcDb);
  __setTestPropagationDb(storyDb);

  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  await pool.query("CREATE SCHEMA IF NOT EXISTS story;");
  await pool.query("CREATE SCHEMA IF NOT EXISTS npc_intelligence;");

  const storyOutboxMigration = readFileSync(
    resolve(
      process.cwd(),
      "..",
      "..",
      "packages",
      "story",
      "migrations",
      "0004_story_outbox.sql",
    ),
    "utf8",
  );
  await pool.query(storyOutboxMigration);

  const beliefMigration = readFileSync(
    resolve(
      process.cwd(),
      "..",
      "..",
      "packages",
      "npc-intelligence",
      "migrations",
      "0003_npc_beliefs.sql",
    ),
    "utf8",
  );
  await pool.query(beliefMigration);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS story.story_event_store (
      id UUID PRIMARY KEY,
      story_session_id UUID NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      event_version INTEGER NOT NULL,
      aggregate_version INTEGER NOT NULL,
      actor_household_id UUID,
      child_profile_id UUID,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    "DELETE FROM story.story_event_store WHERE actor_household_id = $1",
    [HOUSEHOLD_ID],
  );
  await pool.query("DELETE FROM story.story_outbox WHERE household_id = $1", [
    HOUSEHOLD_ID,
  ]);
  await pool.query(
    "DELETE FROM npc_intelligence.beliefs WHERE household_id = $1",
    [HOUSEHOLD_ID],
  );
});

afterAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  __setTestPropagationDb(undefined);
  await pool.end();
});

ultefDescribe("ULTEF PX-LUMI-09-002 — materialized rumor propagation", () => {
  it("materializes Mira's rumor into Bora's persisted hearsay belief and remains idempotent", async () => {
    const scenario = createScenario({
      id: "PX-LUMI-09-002",
      title: "Materialized indirect outcome propagation",
      level: "L4",
      projectGate: "PX-LUMI-09",
      seed: "materialized-rumor-001",
    });

    scenario.setup("Source NPC", { id: SOURCE_NPC, name: "Mira" });
    scenario.setup("Target NPC", { id: TARGET_NPC, name: "Bora" });
    scenario.setup("Rumor", { factId: FACT_ID, claim: CLAIM, confidence: 0.8 });
    scenario.setup(
      "Persistence",
      "real disposable PostgreSQL: story outbox + npc_intelligence beliefs",
    );

    await storyDb.insert(storyOutbox).values({
      householdId: HOUSEHOLD_ID,
      worldId: WORLD_ID,
      commitId: COMMIT_ID,
      idempotencyKey: `ultef-rumor:${SOURCE_NPC}:${TARGET_NPC}:${FACT_ID}`,
      intentType: "npc_rumor_spread",
      payload: {
        sourceNpcId: SOURCE_NPC,
        targetNpcId: TARGET_NPC,
        factId: FACT_ID,
        claim: CLAIM,
        confidence: 0.8,
        provenance: [SOURCE_NPC],
        hops: 1,
      },
      evidenceRef: "scene://ultef/mira-bridge#rumor",
      status: "pending",
      attemptCount: "0",
      lastError: null,
      appliedAt: null,
      createdAt: new Date(),
    });
    scenario.event(
      "outbox.enqueued",
      "Mira's rumor was queued as a pending npc_rumor_spread intent for Bora.",
    );

    const before = await beliefRepository.getBeliefs(TARGET_NPC, HOUSEHOLD_ID);
    scenario.assert(
      "Bora does not know the rumor before propagation",
      before.length === 0,
      0,
      before.length,
    );

    const runtime = createRumorMaterializationRuntime({ beliefRepository });
    const first = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    scenario.event(
      "outbox.propagated",
      `IndirectEffectPropagator processed ${first.processed} intent and applied ${first.applied}.`,
      first,
    );

    const reloaded = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );
    const belief = reloaded.find((item) => item.factId === FACT_ID);
    scenario.event(
      "npc.belief.reloaded",
      belief
        ? `Bora was reloaded from PostgreSQL and still knows Mira's bridge-lights rumor with confidence ${belief.confidence}.`
        : "Bora was reloaded but the expected rumor belief was missing.",
    );

    const outboxRows = await storyDb
      .select()
      .from(storyOutbox)
      .where(sql`${storyOutbox.householdId} = ${HOUSEHOLD_ID}`);
    const outbox = outboxRows[0];

    scenario.assert(
      "One pending intent was applied",
      first.applied === 1,
      1,
      first.applied,
    );
    scenario.assert(
      "Bora has exactly one materialized belief",
      reloaded.length === 1,
      1,
      reloaded.length,
    );
    scenario.assert(
      "Belief source is hearsay",
      belief?.source === "hearsay",
      "hearsay",
      belief?.source ?? null,
    );
    scenario.assert(
      "Rumor claim survived materialization",
      belief?.claim === CLAIM,
      CLAIM,
      belief?.claim ?? null,
    );
    scenario.assert(
      "Confidence survived materialization",
      belief?.confidence === 0.8,
      0.8,
      belief?.confidence ?? null,
    );
    scenario.assert(
      "Provenance identifies Mira",
      belief?.provenance.includes(SOURCE_NPC) === true,
      true,
      belief?.provenance ?? null,
    );
    scenario.assert(
      "Outbox became applied",
      outbox?.status === "applied",
      "applied",
      outbox?.status ?? null,
    );

    scenario.delta(
      "Bora.beliefs.bridge-lights.present",
      false,
      Boolean(belief),
      "story indirect effect materialized into NPC belief storage",
    );
    scenario.delta(
      "Bora.beliefs.bridge-lights.confidence",
      null,
      belief?.confidence ?? null,
      "rumor confidence persisted",
    );
    scenario.delta(
      "story.outbox.status",
      "pending",
      outbox?.status ?? null,
      "propagator acknowledged materialization",
    );

    const second = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const afterRetry = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );
    scenario.event(
      "propagation.retried",
      `A second propagation pass processed ${second.processed} pending intents; Bora still has ${afterRetry.length} belief record.`,
      second,
    );
    scenario.assert(
      "Retry does not create a duplicate belief",
      afterRetry.length === 1,
      1,
      afterRetry.length,
    );
    scenario.assert(
      "Applied outbox is not reprocessed",
      second.processed === 0,
      0,
      second.processed,
    );

    const passed =
      first.applied === 1 &&
      belief?.source === "hearsay" &&
      belief.claim === CLAIM &&
      belief.confidence === 0.8 &&
      outbox?.status === "applied" &&
      afterRetry.length === 1 &&
      second.processed === 0;

    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "The production composition materialized Mira's story outbox rumor into Bora's persisted hearsay belief, survived DB reload, marked the outbox applied, and remained duplicate-free on retry."
        : "The materialized rumor chain did not satisfy persistence, reload, or idempotency expectations.",
    });

    await writeScenarioArtifacts(report, {
      environment: "disposable-postgres-integration",
    });
    expect(report.result).toBe("PASS");
  });
});
