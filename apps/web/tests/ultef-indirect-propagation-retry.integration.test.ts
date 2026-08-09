import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { sql } from "drizzle-orm";

import {
  IndirectEffectPropagator,
  RumorSpreadApplicator,
  __setTestPropagationDb,
} from "@lumi/story/application";
import type { IndirectEffectApplicator } from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import { storyOutbox } from "@lumi/story/db/schema/story";
import {
  BeliefService,
  RumorBeliefWriterService,
} from "@lumi/npc-intelligence/application";
import {
  DrizzleBeliefSourceRepository,
  createDatabase as createNpcDatabase,
} from "@lumi/npc-intelligence/db";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L4-INDIRECT-RETRY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

const HOUSEHOLD_ID = "21000000-0000-4000-8000-000000000091";
const WORLD_ID = "31000000-0000-4000-8000-000000000091";
const COMMIT_ID = "51000000-0000-4000-8000-000000000091";
const SOURCE_NPC = "61000000-0000-4000-8000-000000000091";
const TARGET_NPC = "71000000-0000-4000-8000-000000000091";
const FACT_ID = "retry-bridge-bells-before-rain";
const CLAIM = "Eski koprunun canlari yagmurdan once caliyor.";

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;
let beliefRepository: DrizzleBeliefSourceRepository;

class FailOnceApplicator implements IndirectEffectApplicator {
  private calls = 0;

  constructor(private readonly delegate: IndirectEffectApplicator) {}

  async apply(intent: Parameters<IndirectEffectApplicator["apply"]>[0]) {
    this.calls += 1;
    if (this.calls === 1) {
      throw new Error("ULTEF_TRANSIENT_PROPAGATION_FAILURE");
    }
    return this.delegate.apply(intent);
  }
}

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF indirect retry test requires disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);

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

ultefDescribe("ULTEF Sprint 01 — indirect propagation retry", () => {
  it("L4-INDIRECT-RETRY-001 keeps a transient failure pending and materializes exactly once on retry", async () => {
    const scenario = createScenario({
      id: "L4-INDIRECT-RETRY-001",
      title:
        "Transient indirect-effect failure retries without duplicate materialization",
      level: "L4",
      projectGate: "PX-LUMI-09",
      seed: "indirect-retry-001",
    });
    scenario.setup("Source NPC", { id: SOURCE_NPC, name: "Mira" });
    scenario.setup("Target NPC", { id: TARGET_NPC, name: "Bora" });
    scenario.setup("Rumor", {
      factId: FACT_ID,
      claim: CLAIM,
      confidence: 0.75,
    });

    await storyDb.insert(storyOutbox).values({
      householdId: HOUSEHOLD_ID,
      worldId: WORLD_ID,
      commitId: COMMIT_ID,
      idempotencyKey: `ultef-retry:${SOURCE_NPC}:${TARGET_NPC}:${FACT_ID}`,
      intentType: "npc_rumor_spread",
      payload: {
        sourceNpcId: SOURCE_NPC,
        targetNpcId: TARGET_NPC,
        factId: FACT_ID,
        claim: CLAIM,
        confidence: 0.75,
        provenance: [SOURCE_NPC],
        hops: 1,
      },
      evidenceRef: "scene://ultef/retry#rumor",
      status: "pending",
      attemptCount: "0",
      lastError: null,
      appliedAt: null,
      createdAt: new Date(),
    });

    const beliefService = new BeliefService(beliefRepository);
    const writer = new RumorBeliefWriterService(beliefService);
    const realApplicator = new RumorSpreadApplicator(writer);
    const runtime = new IndirectEffectPropagator(
      new FailOnceApplicator(realApplicator),
      3,
    );

    const first = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const afterFirstRows = await storyDb
      .select()
      .from(storyOutbox)
      .where(sql`${storyOutbox.householdId} = ${HOUSEHOLD_ID}`);
    const afterFirst = afterFirstRows[0];
    const beliefsAfterFailure = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );

    scenario.event(
      "indirect.propagation.first-attempt",
      `Ilk propagation denemesinde kontrollu gecici hata olustu; processed=${first.processed}, failed=${first.failed}.`,
    );
    scenario.assert(
      "Transient failure keeps outbox pending",
      afterFirst?.status === "pending",
      "pending",
      afterFirst?.status ?? null,
    );
    scenario.assert(
      "First failure increments attempt count once",
      afterFirst?.attemptCount === "1",
      "1",
      afterFirst?.attemptCount ?? null,
    );
    scenario.assert(
      "Failure reason is persisted",
      afterFirst?.lastError?.includes("ULTEF_TRANSIENT_PROPAGATION_FAILURE") ===
        true,
      true,
      afterFirst?.lastError ?? null,
    );
    scenario.assert(
      "Failed attempt creates no NPC belief",
      beliefsAfterFailure.length === 0,
      0,
      beliefsAfterFailure.length,
    );

    const second = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const afterSecondRows = await storyDb
      .select()
      .from(storyOutbox)
      .where(sql`${storyOutbox.householdId} = ${HOUSEHOLD_ID}`);
    const afterSecond = afterSecondRows[0];
    const beliefsAfterRetry = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );
    const belief = beliefsAfterRetry.find((item) => item.factId === FACT_ID);

    scenario.event(
      "indirect.propagation.retry",
      `Ikinci denemede gercek rumor applicator calisti; applied=${second.applied}, Bora belief sayisi=${beliefsAfterRetry.length}.`,
    );
    scenario.assert(
      "Retry applies the pending intent",
      second.applied === 1,
      1,
      second.applied,
    );
    scenario.assert(
      "Retry marks outbox applied",
      afterSecond?.status === "applied",
      "applied",
      afterSecond?.status ?? null,
    );
    scenario.assert(
      "Successful retry records second attempt",
      afterSecond?.attemptCount === "2",
      "2",
      afterSecond?.attemptCount ?? null,
    );
    scenario.assert(
      "Successful retry clears last error",
      afterSecond?.lastError === null,
      null,
      afterSecond?.lastError ?? null,
    );
    scenario.assert(
      "Bora receives exactly one belief",
      beliefsAfterRetry.length === 1,
      1,
      beliefsAfterRetry.length,
    );
    scenario.assert(
      "Retry materializes the expected hearsay rumor",
      belief?.source === "hearsay" && belief.claim === CLAIM,
      { source: "hearsay", claim: CLAIM },
      belief ? { source: belief.source, claim: belief.claim } : null,
    );

    const third = await runtime.propagate({ householdId: HOUSEHOLD_ID });
    const beliefsAfterThirdPass = await beliefRepository.getBeliefs(
      TARGET_NPC,
      HOUSEHOLD_ID,
    );
    scenario.assert(
      "Applied intent is not processed again",
      third.processed === 0,
      0,
      third.processed,
    );
    scenario.assert(
      "Later propagation pass does not duplicate belief",
      beliefsAfterThirdPass.length === 1,
      1,
      beliefsAfterThirdPass.length,
    );

    scenario.delta(
      "story.outbox.status",
      "pending",
      afterSecond?.status ?? null,
      "transient failure then successful retry",
    );
    scenario.delta(
      "story.outbox.attemptCount",
      "0",
      afterSecond?.attemptCount ?? null,
      "one failed attempt plus one successful retry",
    );
    scenario.delta(
      "Bora.beliefCount",
      0,
      beliefsAfterRetry.length,
      "successful retry materialized one rumor",
    );

    const passed =
      first.failed === 1 &&
      afterFirst?.status === "pending" &&
      afterFirst.attemptCount === "1" &&
      beliefsAfterFailure.length === 0 &&
      second.applied === 1 &&
      afterSecond?.status === "applied" &&
      afterSecond.attemptCount === "2" &&
      afterSecond.lastError === null &&
      belief?.source === "hearsay" &&
      belief.claim === CLAIM &&
      beliefsAfterRetry.length === 1 &&
      third.processed === 0 &&
      beliefsAfterThirdPass.length === 1;

    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "A transient indirect-effect failure remained retryable, the second pass used the real rumor materialization stack, and subsequent passes stayed duplicate-free."
        : "Indirect-effect retry, persistence, or duplicate-protection assertions failed.",
    });
    await writeScenarioArtifacts(report, {
      environment: "disposable-postgres-integration",
    });
    expect(report.result).toBe("PASS");
  });
});
