import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { applyStoryMigration } from "../../scripts/story-migration-runner.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L9-MIGRATION-RECOVERY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const describeDb = enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool | null = null;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 migration recovery requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

describeDb("ULTEF L9 — migration crash recovery", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    pool = new pg.Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query("DROP TABLE IF EXISTS story.ultef_l9_migration_probe");
    await pool.query(
      "DELETE FROM story._story_migration_ledger WHERE filename = 'ultef-l9-migration-recovery.sql'",
    );
    await pool.end();
  });

  it("L9-MIGRATION-RECOVERY-001 rolls back schema changes when the process fails before ledger commit and safely retries", async () => {
    if (!pool) throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L9-MIGRATION-RECOVERY-001",
      title: "Transactional schema migration crash recovery",
      level: "L9",
      projectGate: "L9-G11",
      seed: "l9-migration-recovery-001",
    });
    const filename = "ultef-l9-migration-recovery.sql";
    const sql = `
      CREATE TABLE story.ultef_l9_migration_probe (
        id INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO story.ultef_l9_migration_probe (id, value)
      VALUES (1, 'preserved');
    `;

    await pool.query("DROP TABLE IF EXISTS story.ultef_l9_migration_probe");
    await pool.query(
      "DELETE FROM story._story_migration_ledger WHERE filename = $1",
      [filename],
    );

    let crashRejected = false;
    try {
      await applyStoryMigration(pool, {
        filename,
        sql,
        afterSqlApplied: async () => {
          throw new Error("SIMULATED_PROCESS_CRASH_BEFORE_LEDGER");
        },
      });
    } catch (error) {
      crashRejected =
        error instanceof Error &&
        error.message === "SIMULATED_PROCESS_CRASH_BEFORE_LEDGER";
    }

    const afterCrashTable = await pool.query(
      "SELECT to_regclass('story.ultef_l9_migration_probe') AS relation",
    );
    const afterCrashLedger = await pool.query(
      "SELECT COUNT(*)::int AS count FROM story._story_migration_ledger WHERE filename = $1",
      [filename],
    );
    const rollbackAtomic =
      crashRejected &&
      afterCrashTable.rows[0]?.relation === null &&
      afterCrashLedger.rows[0]?.count === 0;

    const retry = await applyStoryMigration(pool, { filename, sql });
    const afterRetryRow = await pool.query(
      "SELECT value FROM story.ultef_l9_migration_probe WHERE id = 1",
    );
    const afterRetryLedger = await pool.query(
      "SELECT COUNT(*)::int AS count FROM story._story_migration_ledger WHERE filename = $1",
      [filename],
    );
    const retryRecovered =
      retry.status === "applied" &&
      afterRetryRow.rows[0]?.value === "preserved" &&
      afterRetryLedger.rows[0]?.count === 1;

    const replay = await applyStoryMigration(pool, { filename, sql });
    const afterReplayRows = await pool.query(
      "SELECT COUNT(*)::int AS count FROM story.ultef_l9_migration_probe",
    );
    const replaySafe =
      replay.status === "skipped" && afterReplayRows.rows[0]?.count === 1;

    scenario.assert(
      "Crash before ledger commit rolls back schema and ledger atomically",
      rollbackAtomic,
      { table: null, ledgerCount: 0 },
      {
        table: afterCrashTable.rows[0]?.relation ?? null,
        ledgerCount: afterCrashLedger.rows[0]?.count ?? null,
      },
    );
    scenario.assert(
      "Retry applies migration exactly once",
      retryRecovered,
      { status: "applied", value: "preserved", ledgerCount: 1 },
      {
        status: retry.status,
        value: afterRetryRow.rows[0]?.value ?? null,
        ledgerCount: afterRetryLedger.rows[0]?.count ?? null,
      },
    );
    scenario.assert(
      "Replay after successful migration is skipped without duplicate data",
      replaySafe,
      { status: "skipped", rowCount: 1 },
      { status: replay.status, rowCount: afterReplayRows.rows[0]?.count ?? null },
    );

    const passed = rollbackAtomic && retryRecovered && replaySafe;
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Schema mutation and migration ledger are atomic across a simulated crash; retry and replay are safe."
        : "One or more migration recovery invariants failed.",
    });
    await writeScenarioArtifacts(report, {
      environment: "disposable-postgres-l9-migration-recovery",
    });
    expect(report.result).toBe("PASS");
  });
});
