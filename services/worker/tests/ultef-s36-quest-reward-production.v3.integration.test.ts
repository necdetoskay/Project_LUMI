import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createLogger } from "@lumi/logger";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { grantStoryRewardAsSystem } from "../../../packages/profiles/src/application/index";
import { OutboxJobRunner } from "../src/outbox-runner";

const ID = "PX-LUMI-S36-QUEST-REWARD-PROD-001";
const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const run =
  process.env.ULTEF_SCENARIO === ID &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  url
    ? describe
    : describe.skip;
let pool: pg.Pool;

async function countReward(h: string, child: string, key: string) {
  const r = await pool.query<{ count: string }>(
    `SELECT count(*)::text count
       FROM profile.inventory_entries e
       JOIN profile.inventory_inventories i ON i.id=e.inventory_id
       JOIN profile.inventory_item_instances x ON x.id=e.item_instance_id
       JOIN profile.inventory_item_definitions d ON d.id=x.item_definition_id
      WHERE i.household_id=$1 AND i.owner_type='child_profile'
        AND i.owner_id=$2 AND d.definition_key=$3 AND e.entry_status='active'`,
    [h, child, key],
  );
  return Number(r.rows[0]?.count ?? 0);
}

async function state(id: string) {
  const r = await pool.query<{
    status: string;
    attempt_count: string;
    last_error: string | null;
  }>(
    `SELECT status,attempt_count,last_error FROM story.story_outbox WHERE id=$1`,
    [id],
  );
  return r.rows[0];
}

run("ULTEF S36 quest reward production", () => {
  beforeAll(() => {
    const db = new URL(url!).pathname.replace(/^\//, "");
    if (!db.includes("test") && !db.includes("review")) {
      throw new Error(`Unsafe DB: ${db}`);
    }
    pool = new pg.Pool({ connectionString: url!, max: 4 });
  });
  afterAll(async () => pool?.end());

  it(ID, async () => {
    const h1 = crypto.randomUUID();
    const h2 = crypto.randomUUID();
    const c1 = crypto.randomUUID();
    const c2 = crypto.randomUUID();
    const world = crypto.randomUUID();
    const q1 = crypto.randomUUID();
    const q2 = crypto.randomUUID();
    const defId = crypto.randomUUID();
    const key = `s36-${defId}`;
    const good = crypto.randomUUID();
    const bad = crypto.randomUUID();
    const scenario = createScenario({
      id: ID,
      title: "Quest reward production wiring",
      level: "L9",
      projectGate: "PX-LUMI-S36",
      seed: "runtime-uuid",
    });

    try {
      await pool.query(
        `INSERT INTO profile.households(id,name,slug)
         VALUES($1,'A',$3),($2,'B',$4)`,
        [h1, h2, `s36-a-${h1}`, `s36-b-${h2}`],
      );
      await pool.query(
        `INSERT INTO profile.child_profiles
          (id,household_id,display_name,age_band,locale)
         VALUES($1,$3,'A','6-8','tr-TR'),($2,$4,'B','6-8','tr-TR')`,
        [c1, c2, h1, h2],
      );
      await pool.query(
        `INSERT INTO profile.inventory_item_definitions
          (id,definition_key,display_name,category,item_type,rarity,stack_mode,max_stack_size,durability_mode,is_transferable,is_equippable,is_consumable,is_story_selectable,allowed_owner_types,lifecycle_status,metadata)
         VALUES($1,$2,'Reward','collectible','story','common','stackable',99,'none',true,false,false,true,'["child_profile"]'::jsonb,'active','{}'::jsonb)`,
        [defId, key],
      );
      await pool.query(
        `INSERT INTO story.story_outbox
          (id,household_id,world_id,commit_id,idempotency_key,intent_type,payload,evidence_ref,status,attempt_count,created_at)
         VALUES
          ($1,$3,$4,$5,$6,'quest_reward_grant',$7::jsonb,'ultef://s36/good','pending','0',now()),
          ($2,$3,$4,$8,$9,'quest_reward_grant',$10::jsonb,'ultef://s36/cross','pending','0',now()+interval '1 ms')`,
        [
          good,
          bad,
          h1,
          world,
          crypto.randomUUID(),
          `quest-reward:${q1}`,
          JSON.stringify({
            questId: q1,
            householdId: h1,
            worldId: world,
            childProfileId: c1,
            reward: { itemDefinitionKey: key, quantity: 2 },
          }),
          crypto.randomUUID(),
          `quest-reward:${q2}`,
          JSON.stringify({
            questId: q2,
            householdId: h1,
            worldId: world,
            childProfileId: c2,
            reward: { itemDefinitionKey: key, quantity: 1 },
          }),
        ],
      );

      const first = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const goodState = await state(good);
      const badState = await state(bad);
      const goodCount = await countReward(h1, c1, key);
      const crossCount = await countReward(h1, c2, key);
      const grantOk =
        first.applied === 1 &&
        goodState?.status === "applied" &&
        goodCount === 1;
      const isolated =
        first.failed === 1 &&
        badState?.status === "pending" &&
        crossCount === 0 &&
        badState.last_error?.includes("Child profile is not active") === true;
      scenario.assert("reward outbox granted inventory", grantOk, true, {
        first,
        goodState,
        goodCount,
      });
      scenario.assert(
        "tenant isolation rejected foreign child",
        isolated,
        true,
        { badState, crossCount },
      );

      await pool.query(
        `UPDATE story.story_outbox
            SET status='pending',applied_at=NULL
          WHERE id=$1`,
        [good],
      );
      await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const replayCount = await countReward(h1, c1, key);
      const replayOk = replayCount === 1;
      scenario.assert("replay created no duplicate", replayOk, 1, replayCount);

      let unauthorized = false;
      try {
        await grantStoryRewardAsSystem({
          authority: "invalid",
          householdId: h1,
          childProfileId: c1,
          itemDefinitionKey: key,
          quantity: 1,
          idempotencyKey: `quest-reward:${crypto.randomUUID()}`,
          sourceQuestId: crypto.randomUUID(),
        });
      } catch (e) {
        unauthorized =
          e instanceof Error && e.message.includes("authority is not allowed");
      }
      scenario.assert(
        "unauthorized service authority rejected",
        unauthorized,
        true,
        unauthorized,
      );

      const pass = grantOk && isolated && replayOk && unauthorized;
      const report = scenario.finish({
        result: pass ? "PASS" : "FAIL",
        reason: pass
          ? "Reward wiring, replay, tenant isolation and authority rejection verified."
          : "S36 invariant failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s36-quest-reward",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM story.story_outbox WHERE household_id=$1`,
        [h1],
      );
      await pool.query(
        `DELETE FROM profile.inventory_idempotency_ledger
          WHERE actor_household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.inventory_domain_events
          WHERE actor_household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.inventory_ownership_history
          WHERE actor_household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.inventory_entries
          WHERE inventory_id IN(
            SELECT id FROM profile.inventory_inventories
             WHERE household_id IN($1,$2)
          )`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.inventory_ownerships
          WHERE item_instance_id IN(
            SELECT id FROM profile.inventory_item_instances
             WHERE household_id IN($1,$2)
          )`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.inventory_item_instances
          WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.inventory_inventories
          WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.child_profiles WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(`DELETE FROM profile.households WHERE id IN($1,$2)`, [
        h1,
        h2,
      ]);
      await pool.query(
        `DELETE FROM profile.inventory_item_definitions WHERE id=$1`,
        [defId],
      );
    }
  });
});
