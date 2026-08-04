import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzleSimulationRepository } from "../../src/db/repositories/drizzle/drizzle-simulation.repository";
import {
  makeCommittedEffect,
  makePendingEffect,
  makeScheduledEvent,
  makeSimulationRun,
} from "../fixtures/simulation.fixtures";

const enabled = process.env.SIM_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.SIM_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

describe("DrizzleSimulationRepository integration", () => {
  let pool: pg.Pool | undefined;
  let db: ReturnType<typeof createDatabase>;
  let repo: DrizzleSimulationRepository;
  let connected = false;

  beforeAll(async () => {
    if (!enabled) return;

    pool = new pg.Pool({ connectionString: dbUrl });
    try {
      await pool.query("SELECT 1");
      connected = true;
    } catch {
      return;
    }

    const migrationPath = path.resolve(
      import.meta.dirname,
      "..",
      "..",
      "migrations",
      "0001_simulation_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");

    await pool.query("DROP SCHEMA IF EXISTS simulation CASCADE");
    await pool.query(migrationSql);

    db = createDatabase(dbUrl);
    repo = new DrizzleSimulationRepository(db);
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS simulation CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("persists and retrieves simulation runs", async () => {
    if (!enabled || !connected) return;

    const run = makeSimulationRun();
    await repo.saveRun(run);

    const found = await repo.findRun(run.id);
    expect(found).toBeDefined();
    expect(found!.worldId).toBe(run.worldId);
    expect(found!.householdId).toBe(run.householdId);
    expect(found!.timePhase).toBe("normal");
    expect(found!.childAbsentDays).toBe(3);
  });

  it("persists effects with idempotency", async () => {
    if (!enabled || !connected) return;

    const effect = makeCommittedEffect();
    await repo.saveEffect(effect);

    const dup = { ...effect };
    const savedAgain = await repo.saveEffect(dup);
    expect(savedAgain).toBe(false);
  });

  it("lists committed effects for a world", async () => {
    if (!enabled || !connected) return;

    const committed = makeCommittedEffect();
    const pending = makePendingEffect();
    await repo.saveEffect(committed);
    await repo.saveEffect(pending);

    const committedEffects = await repo.findCommittedEffects(
      committed.worldId,
      committed.householdId,
    );

    expect(committedEffects.length).toBeGreaterThanOrEqual(1);
    expect(committedEffects.every((e) => e.status === "committed")).toBe(true);
  });

  it("updates effect status", async () => {
    if (!enabled || !connected) return;

    const effect = makePendingEffect();
    await repo.saveEffect(effect);

    await repo.updateEffectStatus(effect.id, "committed", new Date());

    const pending = await repo.findPendingEffects(
      effect.worldId,
      effect.householdId,
    );
    expect(pending.find((e) => e.id === effect.id)).toBeUndefined();
  });

  it("persists and queries scheduled events", async () => {
    if (!enabled || !connected) return;

    const event = makeScheduledEvent();
    await repo.saveScheduledEvent(event);

    const events = await repo.findScheduledEvents(
      event.worldId,
      event.householdId,
      true,
    );
    expect(events.length).toBeGreaterThanOrEqual(1);

    await repo.updateScheduledEventResolved(event.id, new Date());
    const unresolved = await repo.findScheduledEvents(
      event.worldId,
      event.householdId,
      true,
    );
    expect(unresolved.find((e) => e.id === event.id)).toBeUndefined();
  });

  it("isolates effects by household", async () => {
    if (!enabled || !connected) return;

    const effect = makeCommittedEffect();
    await repo.saveEffect(effect);

    const otherHouseholdEffects = await repo.findCommittedEffects(
      effect.worldId,
      "99999999-9999-9999-9999-999999999999",
    );
    expect(otherHouseholdEffects.length).toBe(0);
  });
});
