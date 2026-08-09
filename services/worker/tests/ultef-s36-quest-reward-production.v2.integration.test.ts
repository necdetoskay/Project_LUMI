import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createLogger } from "@lumi/logger";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { grantStoryRewardAsSystem } from "../../../packages/profiles/src/application/index.ts";
import { OutboxJobRunner } from "../src/outbox-runner";

const SCENARIO_ID = "PX-LUMI-S36-QUEST-REWARD-PROD-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const describeDb =
  process.env.ULTEF_SCENARIO === SCENARIO_ID &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  databaseUrl
    ? describe
    : describe.skip;

let pool: pg.Pool | null = null;

async function rewardCount(householdId: string, childId: string, key: string) {
  const result = await pool!.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM profile.inventory_entries e
       JOIN profile.inventory_inventories i ON i.id = e.inventory_id
       JOIN profile.inventory_item_instances ii ON ii.id = e.item_instance_id
       JOIN profile.inventory_item_definitions d ON d.id = ii.item_definition_id
      WHERE i.household_id = $1 AND i.owner_type = 'child_profile'
        AND i.owner_id = $2 AND d.definition_key = $3
        AND e.entry_status = 'active'`,
    [householdId, childId, key],
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function outbox(id: string) {
  const result = await pool!.query<{
    status: string;
    attempt_count: string;
    last_error: string | null;
  }>(
    `SELECT status, attempt_count, last_error FROM story.story_outbox WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

describeDb("ULTEF S36 quest reward production", () => {
  beforeAll(async () => {
    const name = new URL(databaseUrl!).pathname.replace(/^\//, "");
    if (!name.includes("test") && !name.includes("review")) {
      throw new Error(`Unsafe S36 database: ${name}`);
    }
    pool = new pg.Pool({ connectionString: databaseUrl!, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
    pool = null;
  });

  it(SCENARIO_ID, async () => {
    const householdA = crypto.randomUUID();
    const householdB = crypto.randomUUID();
    const childA = crypto.randomUUID();
    const childB = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const questA = crypto.randomUUID();
    const questB = crypto.randomUUID();
    const definitionId = crypto.randomUUID();
    const definitionKey = `ultef-s36-${definitionId}`;
    const validId = crypto.randomUUID();
    const crossId = crypto.randomUUID();

    const scenario = createScenario({
      id: SCENARIO_ID,
      title: "Quest reward production authority and inventory grant",
      level: "L9",
      projectGate: "PX-LUMI-S36",
      seed: "runtime-uuid",
    });

    try {
      await pool!.query(
        `INSERT INTO profile.households (id, name, slug)
         VALUES ($1, 'S36 A', $3), ($2, 'S36 B', $4)`,
        [householdA, householdB, `s36-a-${householdA}`, `s36-b-${householdB}`],
      );
      await pool!.query(
        `INSERT INTO profile.child_profiles
          (id, household_id, display_name, age_band, locale)
         VALUES ($1, $3, 'A', '6-8', 'tr-TR'), ($2, $4, 'B', '6-8', 'tr-TR')`,
        [childA, childB, householdA, householdB],
      );
      await pool!.query(
        `INSERT INTO profile.inventory_item_definitions
          (id, definition_key, display_name, category, item_type, rarity,
           stack_mode, max_stack_size, durability_mode, is_transferable,
           is_equippable, is_consumable, is_story_selectable,
           allowed_owner_types, lifecycle_status, metadata)
         VALUES ($1, $2, 'Reward', 'story', 'collectible', 'common',
          'stackable', 99, 'none', true, false, false, true,
          '["child_profile"]'::jsonb, 'active', '{}'::jsonb)`,
        [definitionId, definitionKey],
      );
      await pool!.query(
        `INSERT INTO story.story_outbox
          (id, household_id, world_id, commit_id, idempotency_key,
           intent_type, payload, evidence_ref, status, attempt_count, created_at)
         VALUES
          ($1, $3, $4, $5, $6, 'quest_reward_grant', $7::jsonb,
           'ultef://s36/valid', 'pending', '0', now()),
          ($2, $3, $4, $8, $9, 'quest_reward_grant', $10::jsonb,
           'ultef://s36/cross', 'pending', '0', now() + interval '1 millisecond')`,
        [
          validId,
          crossId,
          householdA,
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
          `quest-reward:${questB}`,
          JSON.stringify({
            questId: questB,
            householdId: householdA,
            worldId,
            childProfileId: childB,
            reward: { itemDefinitionKey: definitionKey, quantity: 1 },
          }),
        ],
      );

      const first = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const validState = await outbox(validId);
      const crossState = await outbox(crossId);
      const countA = await rewardCount(householdA, childA, definitionKey);
      const countCross = await rewardCount(householdA, childB, definitionKey);

      const validGrant =
        first.applied === 1 && validState?.status === "applied" && countA === 1;
      const isolated =
        first.failed === 1 &&
        crossState?.status === "pending" &&
        countCross === 0 &&
        crossState.last_error?.includes("Child profile is not active") === true;
      scenario.assert("real reward grant applied", validGrant, true, {
        first,
        validState,
        countA,
      });
      scenario.assert("tenant isolation rejected cross-household child", isolated, true, {
        crossState,
        countCross,
      });

      await pool!.query(
        `UPDATE story.story_outbox SET status = 'pending', applied_at = NULL WHERE id = $1`,
        [validId],
      );
      await new OutboxJobRunner(createLogger({ level: "error" }), 25, 100).run();
      const replayCount = await rewardCount(householdA, childA, definitionKey);
      const replaySafe = replayCount === 1;
      scenario.assert("replay created no duplicate", replaySafe, 1, replayCount);

      let unauthorizedRejected = false;
      try {
        await grantStoryRewardAsSystem({
          authority: "invalid",
          householdId: householdA,
          childProfileId: childA,
          itemDefinitionKey: definitionKey,
          quantity: 1,
          idempotencyKey: `quest-reward:${crypto.randomUUID()}`,
          sourceQuestId: crypto.randomUUID(),
        });
      } catch (error) {
        unauthorizedRejected =
          error instanceof Error && error.message.includes("authority is not allowed");
      }
      scenario.assert("unauthorized authority rejected", unauthorizedRejected, true, unauthorizedRejected);

      const pass = validGrant && isolated && replaySafe && unauthorizedRejected;
      const report = scenario.finish({
        result: pass ? "PASS" : "FAIL",
        reason: pass
          ? "Reward outbox reached inventory once; replay, tenant isolation and authority rejection are enforced."
          : "S36 production reward invariant failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s36-quest-reward",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool!.query(`DELETE FROM story.story_outbox WHERE household_id = $1`, [householdA]);
      await pool!.query(`DELETE FROM profile.inventory_idempotency_ledger WHERE actor_household_id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_domain_events WHERE actor_household_id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_ownership_history WHERE actor_household_id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_entries WHERE inventory_id IN (SELECT id FROM profile.inventory_inventories WHERE household_id IN ($1, $2))`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_ownerships WHERE item_instance_id IN (SELECT id FROM profile.inventory_item_instances WHERE household_id IN ($1, $2))`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_item_instances WHERE household_id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_inventories WHERE household_id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.child_profiles WHERE household_id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.households WHERE id IN ($1, $2)`, [householdA, householdB]);
      await pool!.query(`DELETE FROM profile.inventory_item_definitions WHERE id = $1`, [definitionId]);
    }
  });
});
