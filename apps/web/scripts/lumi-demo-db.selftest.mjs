import pg from "pg";

import {
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "../../../scripts/demo/lumi-demo-runner.mjs";
import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";
import { createLumiDemoPostgresAdapter } from "./lumi-demo-db.mjs";
import {
  createLumiDemoStoryPostgresAdapter,
  LUMI_DEMO_ENTRY_SCENE_ID,
} from "./lumi-demo-story-db.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const foreignHouseholdId = "52000000-0000-4000-8000-000000000001";
const foreignSlug = "s51-foreign-household";
const confirmation = LUMI_DEMO_MANIFEST.manifestVersion;
const admin = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const adapter = createLumiDemoPostgresAdapter(databaseUrl);
const storyAdapter = createLumiDemoStoryPostgresAdapter(databaseUrl);

try {
  await admin.query(
    `INSERT INTO profile.households (id, name, slug)
     VALUES ($1,'S51 Foreign Household',$2)
     ON CONFLICT (id) DO NOTHING`,
    [foreignHouseholdId, foreignSlug],
  );

  const first = await runDemoSeed({
    databaseUrl,
    adapter,
    nodeEnv: "test",
    confirmation,
  });
  if (first.outcome !== "seeded") throw new Error("FIRST_SEED_NOT_APPLIED");

  const storyFirst = await storyAdapter.ensure();
  if (storyFirst.outcome !== "seeded") throw new Error("FIRST_STORY_SEED_NOT_APPLIED");

  const status = await runDemoStatus({ adapter });
  if (!status.exists) throw new Error("DEMO_STATUS_MISSING");
  if (status.currentLocationKey !== LUMI_DEMO_MANIFEST.world.startLocationKey) {
    throw new Error("DEMO_START_LOCATION_MISMATCH");
  }
  if (
    status.counts?.profiles !== 1 ||
    status.counts?.characters !== 1 ||
    status.counts?.worlds !== 1
  ) {
    throw new Error("DEMO_BOOTSTRAP_COUNTS_INVALID");
  }
  if (status.counts?.inventoryItems !== LUMI_DEMO_MANIFEST.inventory.length) {
    throw new Error("DEMO_INVENTORY_COUNT_INVALID");
  }
  if (status.counts?.npcs !== LUMI_DEMO_MANIFEST.npcs.length) {
    throw new Error("DEMO_NPC_COUNT_INVALID");
  }
  if (status.counts?.memories !== LUMI_DEMO_MANIFEST.memories.length) {
    throw new Error("DEMO_MEMORY_COUNT_INVALID");
  }
  if (status.counts?.quests !== 1) throw new Error("DEMO_QUEST_COUNT_INVALID");

  const supporting = await admin.query(
    `SELECT
       (SELECT count(*)::int
          FROM profile.inventory_entries ie
          JOIN profile.inventory_inventories ii ON ii.id = ie.inventory_id
         WHERE ii.household_id = $1 AND ii.owner_id = $2 AND ie.entry_status = 'active') AS inventory_entries,
       (SELECT count(*)::int
          FROM npc_intelligence.npc_snapshots
         WHERE household_id = $1 AND world_id = $3 AND child_profile_id = $4) AS scoped_npcs,
       (SELECT relationship_to_character::text
          FROM npc_intelligence.npc_snapshots
         WHERE household_id = $1 AND world_id = $3 AND npc_id = $5) AS mira_relationship,
       (SELECT status
          FROM profile.quests
         WHERE id = $6 AND household_id = $1 AND world_id = $3) AS quest_status,
       (SELECT story_session_id::text
          FROM profile.quests
         WHERE id = $6 AND household_id = $1 AND world_id = $3) AS quest_session_id`,
    [
      LUMI_DEMO_MANIFEST.household.id,
      LUMI_DEMO_MANIFEST.character.id,
      LUMI_DEMO_MANIFEST.world.id,
      LUMI_DEMO_MANIFEST.childProfile.id,
      LUMI_DEMO_MANIFEST.npcs[0].id,
      LUMI_DEMO_MANIFEST.quest.id,
    ],
  );
  const support = supporting.rows[0] ?? {};
  if (support.inventory_entries !== LUMI_DEMO_MANIFEST.inventory.length) {
    throw new Error("DEMO_INVENTORY_ENTRIES_INVALID");
  }
  if (support.scoped_npcs !== LUMI_DEMO_MANIFEST.npcs.length) {
    throw new Error("DEMO_NPC_SCOPE_INVALID");
  }
  if (
    Number(support.mira_relationship) !==
    LUMI_DEMO_MANIFEST.npcs[0].relationshipToCharacter
  ) {
    throw new Error("DEMO_RELATIONSHIP_INVALID");
  }
  if (support.quest_status !== LUMI_DEMO_MANIFEST.quest.status) {
    throw new Error("DEMO_QUEST_STATUS_INVALID");
  }
  if (support.quest_session_id !== LUMI_DEMO_MANIFEST.story.sessionId) {
    throw new Error("DEMO_QUEST_SESSION_NOT_BOUND");
  }

  const storyStatus = await storyAdapter.inspect();
  if (!storyStatus.ready) throw new Error("DEMO_STORY_NOT_READER_READY");
  if (storyStatus.currentSceneId !== LUMI_DEMO_ENTRY_SCENE_ID) {
    throw new Error("DEMO_STORY_CURRENT_SCENE_INVALID");
  }
  if (storyStatus.sessionStatus !== "active") {
    throw new Error("DEMO_STORY_SESSION_NOT_ACTIVE");
  }

  const replay = await runDemoSeed({
    databaseUrl,
    adapter,
    nodeEnv: "test",
    confirmation,
  });
  if (replay.outcome !== "already_seeded") {
    throw new Error("SEED_REPLAY_NOT_IDEMPOTENT");
  }
  const storyReplay = await storyAdapter.ensure();
  if (storyReplay.outcome !== "already_ready") {
    throw new Error("STORY_REPLAY_NOT_IDEMPOTENT");
  }

  const replayStatus = await runDemoStatus({ adapter });
  if (
    replayStatus.counts?.inventoryItems !== LUMI_DEMO_MANIFEST.inventory.length ||
    replayStatus.counts?.npcs !== LUMI_DEMO_MANIFEST.npcs.length ||
    replayStatus.counts?.memories !== LUMI_DEMO_MANIFEST.memories.length ||
    replayStatus.counts?.quests !== 1
  ) {
    throw new Error("DEMO_SUPPORTING_STATE_REPLAY_DUPLICATED");
  }

  await storyAdapter.reset();
  const storyAfterReset = await storyAdapter.inspect();
  if (storyAfterReset.ready || storyAfterReset.sessions !== 0) {
    throw new Error("DEMO_STORY_RESET_LEFT_STATE");
  }

  const reset = await runDemoReset({
    databaseUrl,
    adapter,
    nodeEnv: "test",
    confirmation,
  });
  if (reset.outcome !== "reset") throw new Error("DEMO_RESET_NOT_APPLIED");

  const after = await runDemoStatus({ adapter });
  if (after.exists) throw new Error("DEMO_RESET_LEFT_SCOPE");

  const foreign = await admin.query(
    `SELECT count(*)::int AS count FROM profile.households WHERE id = $1 AND slug = $2`,
    [foreignHouseholdId, foreignSlug],
  );
  if (foreign.rows[0]?.count !== 1) {
    throw new Error("FOREIGN_HOUSEHOLD_WAS_MUTATED");
  }

  console.log("S51 T03/T04/T05 PostgreSQL demo selftest: PASS");
} finally {
  await storyAdapter.close();
  await adapter.close();
  await admin.query(`DELETE FROM profile.households WHERE id = $1`, [
    foreignHouseholdId,
  ]);
  await admin.end();
}
