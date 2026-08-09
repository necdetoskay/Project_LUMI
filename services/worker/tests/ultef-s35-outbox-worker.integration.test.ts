import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createLogger } from "@lumi/logger";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { OutboxJobRunner } from "../src/outbox-runner";

const enabled = process.env.ULTEF_SCENARIO === "PX-LUMI-S35-OUTBOX-WORKER-001";
const databaseUrl =
  process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const describeDb =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool | null = null;

function assertSafeDisposableDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `S35 worker ULTEF requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

async function outboxState(householdId: string) {
  if (!pool) throw new Error("DB_NOT_CONNECTED");
  const result = await pool.query<{
    id: string;
    status: string;
    attempt_count: string;
    last_error: string | null;
  }>(
    `SELECT id, status, attempt_count, last_error
       FROM story.story_outbox
      WHERE household_id = $1
      ORDER BY created_at, id`,
    [householdId],
  );
  return result.rows;
}

async function questCount(householdId: string): Promise<number> {
  if (!pool) throw new Error("DB_NOT_CONNECTED");
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM profile.quests WHERE household_id = $1`,
    [householdId],
  );
  return Number(result.rows[0]?.count ?? "0");
}

describeDb("ULTEF S35 — production outbox worker", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  });

  afterAll(async () => {
    if (pool) await pool.end();
    pool = null;
  });

  it("PX-LUMI-S35-OUTBOX-WORKER-001 dispatches, retries, isolates and replays safely", async () => {
    if (!pool || !databaseUrl)
      throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const householdId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const storySessionId = crypto.randomUUID();
    const hookId = crypto.randomUUID();
    const validOutboxId = crypto.randomUUID();
    const invalidOutboxId = crypto.randomUUID();

    const scenario = createScenario({
      id: "PX-LUMI-S35-OUTBOX-WORKER-001",
      title: "Production worker consumes story outbox safely",
      level: "L9",
      projectGate: "PX-LUMI-S35",
      seed: "runtime-uuid",
    });
    scenario.setup("Household", householdId);
    scenario.setup("World", worldId);
    scenario.setup("Hook", hookId);

    try {
      await pool.query(
        `INSERT INTO story.story_outbox
          (id, household_id, world_id, story_session_id, commit_id,
           idempotency_key, intent_type, payload, evidence_ref, status,
           attempt_count, created_at)
         VALUES
          ($1, $3, $4, NULL, $5, $6, 'quest_seed_automation', $7::jsonb,
           'ultef://s35/valid', 'pending', '0', now()),
          ($2, $3, $4, NULL, $8, $9, 'ultef_unknown_intent', '{}'::jsonb,
           'ultef://s35/unknown', 'pending', '0', now() + interval '1 millisecond')`,
        [
          validOutboxId,
          invalidOutboxId,
          householdId,
          worldId,
          crypto.randomUUID(),
          `s35-valid-${hookId}`,
          JSON.stringify({
            householdId,
            worldId,
            storySessionId,
            factId: "lost-letter",
            hookId,
          }),
          crypto.randomUUID(),
          `s35-unknown-${hookId}`,
        ],
      );

      const firstRunner = new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      );
      const first = await firstRunner.run();
      const firstRows = await outboxState(householdId);
      const firstQuestCount = await questCount(householdId);
      const validFirst = firstRows.find((row) => row.id === validOutboxId);
      const invalidFirst = firstRows.find((row) => row.id === invalidOutboxId);

      const validApplied =
        first.applied === 1 &&
        validFirst?.status === "applied" &&
        firstQuestCount === 1;
      const failureIsolated =
        first.failed === 1 &&
        invalidFirst?.status === "pending" &&
        invalidFirst.attempt_count === "1" &&
        invalidFirst.last_error?.includes("OUTBOX_INTENT_NOT_CONFIGURED") ===
          true;

      scenario.assert(
        "Persisted quest seed was dispatched into exactly one quest",
        validApplied,
        { outboxStatus: "pending", questCount: 0 },
        { outboxStatus: validFirst?.status, questCount: firstQuestCount },
      );
      scenario.assert(
        "Unknown intent failed closed without blocking valid work",
        failureIsolated,
        "unknown intent remains retryable and valid intent applies",
        { summary: first, unknown: invalidFirst },
      );

      // Simulate at-least-once delivery after a worker/process restart. The
      // downstream quest-seed ledger must make this replay idempotent.
      await pool.query(
        `UPDATE story.story_outbox
            SET status = 'pending', applied_at = NULL
          WHERE id = $1`,
        [validOutboxId],
      );
      const restartedRunner = new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      );
      const replay = await restartedRunner.run();
      const replayQuestCount = await questCount(householdId);
      const replaySafe = replay.applied === 1 && replayQuestCount === 1;
      scenario.assert(
        "Restart/replay reused quest-seed idempotency and created no duplicate",
        replaySafe,
        1,
        replayQuestCount,
      );

      // Third attempt makes the unknown intent terminal. The next runner pass
      // must discover no retryable household work from that failed row.
      await restartedRunner.run();
      const terminalRows = await outboxState(householdId);
      const invalidTerminal = terminalRows.find(
        (row) => row.id === invalidOutboxId,
      );
      const afterTerminal = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const terminalImmutable =
        invalidTerminal?.status === "failed" &&
        invalidTerminal.attempt_count === "3" &&
        afterTerminal.processed === 0;
      scenario.assert(
        "Terminal unknown intent is excluded from normal worker discovery",
        terminalImmutable,
        { status: "failed", attempts: "3", processedNextPass: 0 },
        {
          status: invalidTerminal?.status,
          attempts: invalidTerminal?.attempt_count,
          processedNextPass: afterTerminal.processed,
        },
      );

      const passed =
        validApplied && failureIsolated && replaySafe && terminalImmutable;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "DB-backed worker dispatch created one quest, isolated an unknown intent, preserved idempotency across replay, and stopped rediscovering terminal work."
          : "One or more S35 production outbox worker invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s35-outbox-worker",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM profile.quest_objectives
          WHERE quest_id IN (SELECT id FROM profile.quests WHERE household_id = $1)`,
        [householdId],
      );
      await pool.query(`DELETE FROM profile.quests WHERE household_id = $1`, [
        householdId,
      ]);
      await pool.query(
        `DELETE FROM profile.world_idempotency_ledger WHERE household_id = $1`,
        [householdId],
      );
      await pool.query(
        `DELETE FROM story.story_outbox WHERE household_id = $1`,
        [householdId],
      );
    }
  });
});
