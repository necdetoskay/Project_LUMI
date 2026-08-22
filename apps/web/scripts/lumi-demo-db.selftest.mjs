import pg from "pg";

import {
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "../../../scripts/demo/lumi-demo-runner.mjs";
import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";
import {
  createLumiDemoAuthPostgresAdapter,
  LUMI_DEMO_PARENT,
} from "./lumi-demo-auth-db.mjs";
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
const authAdapter = createLumiDemoAuthPostgresAdapter(databaseUrl);
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

  const authFirst = await authAdapter.ensure({
    password: process.env.LUMI_DEMO_PARENT_PASSWORD,
  });
  if (!authFirst.ready) throw new Error("DEMO_PARENT_NOT_BROWSER_READY");

  const storyFirst = await storyAdapter.ensure();
  if (storyFirst.outcome !== "seeded")
    throw new Error("FIRST_STORY_SEED_NOT_APPLIED");

  const status = await runDemoStatus({ adapter });
  if (!status.exists) throw new Error("DEMO_STATUS_MISSING");
  if (status.currentLocationKey !== LUMI_DEMO_MANIFEST.world.startLocationKey) {
    throw new Error("DEMO_START_LOCATION_MISMATCH");
  }
  if (
    status.counts?.profiles !== 1 ||
    status.counts?.characters !== 1 + LUMI_DEMO_MANIFEST.npcs.length ||
    status.counts?.childAvatars !== 1 ||
    status.counts?.npcIdentities !== LUMI_DEMO_MANIFEST.npcs.length ||
    status.counts?.worlds !== 1
  ) {
    throw new Error("DEMO_CANONICAL_IDENTITY_COUNTS_INVALID");
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
          FROM profile.lumi_characters
         WHERE household_id = $1 AND child_profile_id = $4
           AND character_subtype = 'npc' AND deleted_at IS NULL) AS canonical_npc_characters,
       (SELECT count(*)::int
          FROM profile.world_npcs
         WHERE household_id = $1 AND world_id = $3 AND child_profile_id = $4
           AND deleted_at IS NULL) AS typed_world_npcs,
       (SELECT count(*)::int
          FROM profile.child_avatars
         WHERE household_id = $1 AND child_profile_id = $4
           AND character_id = $2 AND deleted_at IS NULL) AS child_avatar_registry,
       (SELECT count(*)::int
          FROM profile.character_origin_packages
         WHERE household_id = $1 AND child_profile_id = $4
           AND id = ANY($8::uuid[])) AS origin_packages,
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
         WHERE id = $6 AND household_id = $1 AND world_id = $3) AS quest_session_id,
       (SELECT count(*)::int
          FROM profile.household_members
         WHERE household_id = $1 AND user_id = $7
           AND membership_role = 'owner' AND is_active = TRUE) AS demo_owner_memberships`,
    [
      LUMI_DEMO_MANIFEST.household.id,
      LUMI_DEMO_MANIFEST.character.id,
      LUMI_DEMO_MANIFEST.world.id,
      LUMI_DEMO_MANIFEST.childProfile.id,
      LUMI_DEMO_MANIFEST.npcs[0].id,
      LUMI_DEMO_MANIFEST.quest.id,
      LUMI_DEMO_PARENT.id,
      [
        LUMI_DEMO_MANIFEST.character.originPackageId,
        ...LUMI_DEMO_MANIFEST.npcs.map((npc) => npc.originPackageId),
      ],
    ],
  );
  const support = supporting.rows[0] ?? {};
  if (support.inventory_entries !== LUMI_DEMO_MANIFEST.inventory.length) {
    throw new Error("DEMO_INVENTORY_ENTRIES_INVALID");
  }
  if (support.canonical_npc_characters !== LUMI_DEMO_MANIFEST.npcs.length) {
    throw new Error("DEMO_CANONICAL_NPC_CHARACTERS_INVALID");
  }
  if (support.typed_world_npcs !== LUMI_DEMO_MANIFEST.npcs.length) {
    throw new Error("DEMO_TYPED_WORLD_NPCS_INVALID");
  }
  if (support.child_avatar_registry !== 1) {
    throw new Error("DEMO_CHILD_AVATAR_REGISTRY_INVALID");
  }
  if (support.origin_packages !== 1 + LUMI_DEMO_MANIFEST.npcs.length) {
    throw new Error("DEMO_ORIGIN_PACKAGES_INVALID");
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
  if (support.demo_owner_memberships !== 1) {
    throw new Error("DEMO_OWNER_MEMBERSHIP_INVALID");
  }

  const parent = await admin.query(
    `SELECT id::text, email, display_name
       FROM parent_accounts
      WHERE id = $1 AND email = $2`,
    [LUMI_DEMO_PARENT.id, LUMI_DEMO_PARENT.email],
  );
  if (parent.rowCount !== 1) throw new Error("DEMO_PARENT_ACCOUNT_MISSING");

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
  const authReplay = await authAdapter.ensure({
    password: process.env.LUMI_DEMO_PARENT_PASSWORD,
  });
  if (!authReplay.ready) throw new Error("AUTH_REPLAY_NOT_IDEMPOTENT");
  const storyReplay = await storyAdapter.ensure();
  if (storyReplay.outcome !== "already_ready") {
    throw new Error("STORY_REPLAY_NOT_IDEMPOTENT");
  }

  const replayStatus = await runDemoStatus({ adapter });
  if (
    replayStatus.counts?.characters !== 1 + LUMI_DEMO_MANIFEST.npcs.length ||
    replayStatus.counts?.childAvatars !== 1 ||
    replayStatus.counts?.npcIdentities !== LUMI_DEMO_MANIFEST.npcs.length ||
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
  await authAdapter.reset();

  const after = await runDemoStatus({ adapter });
  if (after.exists) throw new Error("DEMO_RESET_LEFT_SCOPE");
  const authAfter = await authAdapter.inspect();
  if (authAfter.ready || authAfter.parentExists) {
    throw new Error("DEMO_AUTH_RESET_LEFT_STATE");
  }

  const foreign = await admin.query(
    `SELECT count(*)::int AS count FROM profile.households WHERE id = $1 AND slug = $2`,
    [foreignHouseholdId, foreignSlug],
  );
  if (foreign.rows[0]?.count !== 1) {
    throw new Error("FOREIGN_HOUSEHOLD_WAS_MUTATED");
  }

  console.log("S51 T03/T04/T05/T06 auth-ready PostgreSQL demo selftest: PASS");
} finally {
  await storyAdapter.close();
  await authAdapter.close();
  await adapter.close();
  await admin.query(`DELETE FROM profile.households WHERE id = $1`, [
    foreignHouseholdId,
  ]);
  await admin.end();
}
