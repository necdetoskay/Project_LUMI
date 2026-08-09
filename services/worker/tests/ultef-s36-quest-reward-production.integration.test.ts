import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createLogger } from "@lumi/logger";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  grantStoryRewardAsSystem,
  STORY_REWARD_SYSTEM_AUTHORITY,
} from "../../../packages/profiles/src/application/index.ts";
import { OutboxJobRunner } from "../src/outbox-runner";

const SCENARIO_ID = "PX-LUMI-S36-QUEST-REWARD-PROD-001";
const enabled = process.env.ULTEF_SCENARIO === SCENARIO_ID;
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
      `S36 reward ULTEF requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

async function rewardCount(
  householdId: string,
  childProfileId: string,
  definitionKey: string,
): Promise<number> {
  if (!pool) throw new Error("DB_NOT_CONNECTED");
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM profile.inventory_entries e
       JOIN profile.inventories i ON i.id = e.inventory_id
       JOIN profile.inventory_item_instances ii ON ii.id = e.item_instance_id
       JOIN profile.inventory_item_definitions d ON d.id = ii.item_definition_id
      WHERE i.household_id = $1
        AND i.owner_type = 'child_profile'
        AND i.owner_id = $2
        AND d.definition_key = $3
        AND e.entry_status = 'active'`,
    [householdId, childProfileId, definitionKey],
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function outboxRow(id: string) {
  if (!pool) throw new Error("DB_NOT_CONNECTED");
  const result = await pool.query<{
    status: string;
    attempt_count: string;
    last_error: string | null;
  }>(
    `SELECT status, attempt_count, last_error
       FROM story.story_outbox
      WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

describeDb("ULTEF S36 — quest reward production wiring", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  });

  afterAll(async () => {
    if (pool) await pool.end();
    pool = null;
  });

  it(`${SCENARIO_ID} grants once, isolates tenants and rejects unauthorized authority`, async () => {
    if (!pool || !databaseUrl)
      throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const householdA = crypto.randomUUID();
    const householdB = crypto.randomUUID();
    const childA = crypto.randomUUID();
    const childB = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const questA = crypto.randomUUID();
    const questCrossTenant = crypto.randomUUID();
    const definitionId = crypto.randomUUID();
    const definitionKey = `ultef-s36-reward-${definitionId}`;
    const validOutboxId = crypto.randomUUID();
    const crossTenantOutboxId = crypto.randomUUID();

    const scenario = createScenario({
      id: SCENARIO_ID,
      title: "Quest reward worker grants inventory through system authority",
      level: "L9",
      projectGate: "PX-LUMI-S36",
      seed: "runtime-uuid",
    });
    scenario.setup("Household A", householdA);
    scenario.setup("Household B", householdB);
    scenario.setup("Reward definition", definitionKey);

    try {
      await pool.query(
        `INSERT INTO profile.households (id, name, slug)
         VALUES ($1, 'ULTEF S36 A', $3), ($2, 'ULTEF S36 B', $4)`,
        [
          householdA,
          householdB,
          `ultef-s36-a-${householdA}`,
          `ultef-s36-b-${householdB}`,
        ],
      );
      await pool.query(
        `INSERT INTO profile.child_profiles
          (id, household_id, display_name, age_band, locale)
         VALUES
          ($1, $3, 'Child A', '6-8', 'tr-TR'),
          ($2, $4, 'Child B', '6-8', 'tr-TR')`,
        [childA, childB, householdA, householdB],
      );
      await pool.query(
        `INSERT INTO profile.inventory_item_definitions
          (id, definition_key, display_name, category, item_type, rarity,
           stack_mode, max_stack_size, durability_mode, is_transferable,
           is_equippable, is_consumable, is_story_selectable,
           allowed_owner_types, lifecycle_status, metadata)
         VALUES
          ($1, $2, 'ULTEF Reward', 'story', 'collectible', 'common',
           'stackable', 99, 'none', true, false, false, true,
           '["child_profile"]'::jsonb, 'active', '{}'::jsonb)`,
        [definitionId, definitionKey],
      );

      await pool.query(
        `INSERT INTO story.story_outbox
          (id, household_id, world_id, story_session_id, commit_id,
           idempotency_key, intent_type, payload, evidence_ref, status,
           attempt_count, created_at)
         VALUES
          ($1, $3, $5, NULL, $6, $7, 'quest_reward_grant', $8::jsonb,
           'ultef://s36/valid', 'pending', '0', now()),
          ($2, $3, $5, NULL, $9, $10, 'quest_reward_grant', $11::jsonb,
           'ultef://s36/cross-tenant', 'pending', '0', now() + interval '1 millisecond')`,
        [
          validOutboxId,
          crossTenantOutboxId,
          householdA,
          householdB,
          worldId,
          crypto.randomUUID(),
          `quest-reward:${questA}`,
          JSON.stringify({
            questId: questA,
            householdId: householdA,
            worldId,
            childProfileId: childA,
            reward: { itemDefinitionKey: definitionKey, quantity: 2 },
          }),
          crypto.randomUUID(),
          `quest-reward:${questCrossTenant}`,
          JSON.stringify({
            questId: questCrossTenant,
            householdId: householdA,
            worldId,
            childProfileId: childB,
            reward: { itemDefinitionKey: definitionKey, quantity: 1 },
          }),
        ],
      );

      const runner = new OutboxJobRunner(createLogger({ level: "error" }), 25, 100);
      const first = await runner.run();
      const validState = await outboxRow(validOutboxId);
      const crossTenantState = await outboxRow(crossTenantOutboxId);
      const firstCount = await rewardCount(householdA, childA, definitionKey);
      const crossTenantCount = await rewardCount(
        householdA,
        childB,
        definitionKey,
      );

      const productionGrantWorked =
        first.applied === 1 &&
        first.failed === 1 &&
        validState?.status === "applied" &&
        firstCount === 1;
      scenario.assert(
        "Persisted reward outbox reached the real inventory grant path",
        productionGrantWorked,
        { applied: 1, inventoryRows: 1 },
        { summary: first, outbox: validState, inventoryRows: firstCount },
      );

      const tenantIsolationWorked =
        crossTenantCount === 0 &&
        crossTenantState?.status === "pending" &&
        crossTenantState.last_error?.includes("Child profile is not active") ===
          true;
      scenario.assert(
        "Cross-tenant child target was rejected and not silently applied",
        tenantIsolationWorked,
        { inventoryRows: 0, outboxStatus: "pending" },
        { inventoryRows: crossTenantCount, outbox: crossTenantState },
      );

      await pool.query(
        `UPDATE story.story_outbox
            SET status = 'pending', applied_at = NULL
          WHERE id = $1`,
        [validOutboxId],
      );
      const replay = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const replayCount = await rewardCount(householdA, childA, definitionKey);
      const replaySafe = replayCount === 1;
      scenario.assert(
        "Replay reused inventory idempotency and created no duplicate reward",
        replaySafe,
        1,
        replayCount,
      );

      let unauthorizedRejected = false;
      try {
        await grantStoryRewardAsSystem({
          authority: "not_allowed",
          householdId: householdA,
          childProfileId: childA,
          itemDefinitionKey: definitionKey,
          quantity: 1,
          idempotencyKey: `quest-reward:${crypto.randomUUID()}`,
          sourceQuestId: crypto.randomUUID(),
        });
      } catch (error) {
        unauthorizedRejected =
          error instanceof Error &&
          error.message.includes("system authority is not allowed");
      }
      scenario.assert(
        "Unknown service authority was rejected before inventory mutation",
        unauthorizedRejected,
        true,
        unauthorizedRejected,
      );

      const authorityConstantIsExplicit =
        STORY_REWARD_SYSTEM_AUTHORITY === "story_reward_worker";
      scenario.assert(
        "Production adapter uses the explicit story reward authority",
        authorityConstantIsExplicit,
        "story_reward_worker",
        STORY_REWARD_SYSTEM_AUTHORITY,
      );

      const passed =
        productionGrantWorked &&
        tenantIsolationWorked &&
        replaySafe &&
        unauthorizedRejected &&
        authorityConstantIsExplicit;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "DB-backed reward outbox granted exactly once, rejected cross-tenant targets, rejected unknown service authority, and preserved retry semantics."
          : "One or more S36 reward production invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s36-quest-reward",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM story.story_outbox WHERE household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventory_idempotency_ledger WHERE actor_household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventory_domain_events WHERE actor_household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventory_ownership_history WHERE actor_household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventory_entries
          WHERE inventory_id IN
            (SELECT id FROM profile.inventories WHERE household_id IN ($1, $2))`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventory_ownership
          WHERE item_instance_id IN
            (SELECT id FROM profile.inventory_item_instances WHERE household_id IN ($1, $2))`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventory_item_instances WHERE household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.inventories WHERE household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(
        `DELETE FROM profile.child_profiles WHERE household_id IN ($1, $2)`,
        [householdA, householdB],
      );
      await pool.query(`DELETE FROM profile.households WHERE id IN ($1, $2)`, [
        householdA,
        householdB,
      ]);
      await pool.query(
        `DELETE FROM profile.inventory_item_definitions WHERE id = $1`,
        [definitionId],
      );
    }
  });
});
