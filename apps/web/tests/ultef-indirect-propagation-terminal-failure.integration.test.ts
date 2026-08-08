import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { sql } from "drizzle-orm";

import {
  IndirectEffectPropagator,
  __setTestPropagationDb,
} from "@lumi/story/application";
import type { IndirectEffectApplicator } from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import { storyOutbox } from "@lumi/story/db/schema/story";
import {
  DrizzleBeliefSourceRepository,
  createDatabase as createNpcDatabase,
} from "@lumi/npc-intelligence/db";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L4-INDIRECT-FAILURE-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

const HOUSEHOLD_ID = "22000000-0000-4000-8000-000000000091";
const WORLD_ID = "32000000-0000-4000-8000-000000000091";
const COMMIT_ID = "52000000-0000-4000-8000-000000000091";
const SOURCE_NPC = "62000000-0000-4000-8000-000000000091";
const TARGET_NPC = "72000000-0000-4000-8000-000000000091";
const FACT_ID = "terminal-failure-rumor";

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;
let beliefRepository: DrizzleBeliefSourceRepository;

class AlwaysFailApplicator implements IndirectEffectApplicator {
  async apply(): Promise<{ writes: number }> {
    throw new Error("ULTEF_PERMANENT_PROPAGATION_FAILURE");
  }
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  const name =
    new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF terminal-failure test requires disposable DB name containing test/review; got '${name}'.`,
    );
  }

  pool = new pg.Pool({ connectionString: databaseUrl });
  storyDb = createStoryDatabase(databaseUrl);
  const npcDb = createNpcDatabase(databaseUrl);
  beliefRepository = new DrizzleBeliefSourceRepository(npcDb);
  __setTestPropagationDb(storyDb);

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

ultefDescribe("ULTEF Sprint 01 — indirect propagation terminal failure", () => {
  it("L4-INDIRECT-FAILURE-001 becomes terminally failed after max attempts and never materializes NPC state", async () => {
    const scenario = createScenario({
      id: "L4-INDIRECT-FAILURE-001",
      title:
        "Permanent indirect-effect failure becomes terminal without NPC-state leakage",
      level: "L4",
      projectGate: "PX-LUMI-09",
      seed: "indirect-terminal-failure-001",
    });
    scenario.setup("Source NPC", { id: SOURCE_NPC, name: "Mira" });
    scenario.setup("Target NPC", { id: TARGET_NPC, name: "Bora" });
    scenario.setup("Max attempts", 3);

    await storyDb.insert(storyOutbox).values({
      householdId: HOUSEHOLD_ID,
      worldId: WORLD_ID,
      commitId: COMMIT_ID,
      idempotencyKey: `ultef-terminal:${SOURCE_NPC}:${TARGET_NPC}:${FACT_ID}`,
      intentType: "npc_rumor_spread",
      payload: {
        sourceNpcId: SOURCE_NPC,
        targetNpcId: TARGET_NPC,
        factId: FACT_ID,
        claim: "Bu soylenti kalici hata nedeniyle asla materialize edilmemeli.",
        confidence: 0.7,
        provenance: [SOURCE_NPC],
        hops: 1,
      },
      evidenceRef: "scene://ultef/terminal-failure#rumor",
      status: "pending",
      attemptCount: "0",
      lastError: null,
      appliedAt: null,
      createdAt: new Date(),
    });

    const runtime = new IndirectEffectPropagator(new AlwaysFailApplicator(), 3);

    const first = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const second = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const third = await runtime.propagate({ householdId: HOUSEHOLD_ID });

    const rowsAfterThird = await storyDb
      .select()
      .from(storyOutbox)
      .where(sql`${storyOutbox.householdId} = ${HOUSEHOLD_ID}`);
    const terminal = rowsAfterThird[0];
    const beliefsAfterThird = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );

    const fourth = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const rowsAfterFourth = await storyDb
      .select()
      .from(storyOutbox)
      .where(sql`${storyOutbox.householdId} = ${HOUSEHOLD_ID}`);
    const afterFourth = rowsAfterFourth[0];
    const beliefsAfterFourth = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );

    scenario.event(
      "indirect.propagation.attempts",
      `Uc ardışık deneme kalici hata ile sonlandi: failed=${first.failed + second.failed + third.failed}.`,
    );
    scenario.event(
      "indirect.propagation.terminal",
      `Ucuncu denemeden sonra outbox status=${terminal?.status}, attemptCount=${terminal?.attemptCount}.`,
    );
    scenario.event(
      "indirect.propagation.after-terminal",
      `Dorduncu propagation pass processed=${fourth.processed}; terminal kayit yeniden islenmedi.`,
    );

    const assertions = {
      firstFailed: first.failed === 1,
      secondFailed: second.failed === 1,
      thirdFailed: third.failed === 1,
      terminalStatus: terminal?.status === "failed",
      maxAttemptsRecorded: terminal?.attemptCount === "3",
      errorPersisted:
        terminal?.lastError?.includes("ULTEF_PERMANENT_PROPAGATION_FAILURE") ===
        true,
      noBeliefAfterFailure: beliefsAfterThird.length === 0,
      noFourthProcessing: fourth.processed === 0,
      terminalStateStable:
        afterFourth?.status === "failed" && afterFourth.attemptCount === "3",
      noBeliefAfterTerminalPass: beliefsAfterFourth.length === 0,
    };

    scenario.assert("First attempt fails", assertions.firstFailed, true, first);
    scenario.assert(
      "Second attempt fails",
      assertions.secondFailed,
      true,
      second,
    );
    scenario.assert("Third attempt fails", assertions.thirdFailed, true, third);
    scenario.assert(
      "Outbox becomes terminally failed",
      assertions.terminalStatus,
      "failed",
      terminal?.status ?? null,
    );
    scenario.assert(
      "Attempt count stops at maxAttempts",
      assertions.maxAttemptsRecorded,
      "3",
      terminal?.attemptCount ?? null,
    );
    scenario.assert(
      "Permanent failure reason is persisted",
      assertions.errorPersisted,
      true,
      terminal?.lastError ?? null,
    );
    scenario.assert(
      "Permanent failure creates no NPC belief",
      assertions.noBeliefAfterFailure,
      0,
      beliefsAfterThird.length,
    );
    scenario.assert(
      "Terminal outbox is not processed again",
      assertions.noFourthProcessing,
      0,
      fourth.processed,
    );
    scenario.assert(
      "Terminal state remains stable",
      assertions.terminalStateStable,
      { status: "failed", attemptCount: "3" },
      afterFourth
        ? { status: afterFourth.status, attemptCount: afterFourth.attemptCount }
        : null,
    );
    scenario.assert(
      "Later passes still create no NPC belief",
      assertions.noBeliefAfterTerminalPass,
      0,
      beliefsAfterFourth.length,
    );

    scenario.delta(
      "story.outbox.status",
      "pending",
      terminal?.status ?? null,
      "permanent failure exhausted retry budget",
    );
    scenario.delta(
      "story.outbox.attemptCount",
      "0",
      terminal?.attemptCount ?? null,
      "three failed propagation attempts",
    );
    scenario.delta(
      "Bora.beliefCount",
      0,
      beliefsAfterFourth.length,
      "terminal failure must not leak NPC state",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "A permanent indirect-effect failure exhausted exactly three attempts, became terminally failed, was not reprocessed, and never leaked an NPC belief."
        : "Terminal failure, retry-budget, or no-leak assertions failed.",
    });
    await writeScenarioArtifacts(report, {
      environment: "disposable-postgres-integration",
    });
    expect(report.result).toBe("PASS");
  });
});
