import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.STORY_INTEGRITY_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("STORY_INTEGRITY_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const storyIntegrityMigrationPath = resolve(
  __dirname,
  "..",
  "..",
  "story",
  "migrations",
  "0010_story_integrity.sql",
);
const managedAssetIntegrityMigrationPath = resolve(
  __dirname,
  "..",
  "..",
  "story",
  "migrations",
  "0011_managed_asset_story_scene_integrity.sql",
);
const storyIntegrityMigration = await readFile(
  storyIntegrityMigrationPath,
  "utf8",
);
const managedAssetIntegrityMigration = await readFile(
  managedAssetIntegrityMigrationPath,
  "utf8",
);

function fixtureId(index) {
  const suffix = String(index + 1).padStart(12, "0");
  return `30000000-0000-4000-8000-${suffix}`;
}

const ids = Array.from({ length: 19 }, (_, index) => fixtureId(index));
const [
  h1,
  h2,
  child,
  world,
  definition,
  version,
  scene,
  session,
  avatar,
  npc,
  badSession,
  unknown,
  legacyAsset,
  runtimeAsset,
  foreignAsset,
  unknownAsset,
  nonStoryAsset,
  invalidLegacyAsset,
  invalidLegacyScopeAsset,
] = ids;

const dropSchemasSql = `
  DROP SCHEMA IF EXISTS story CASCADE;
  DROP SCHEMA IF EXISTS profile CASCADE;
`;
const createSchemasSql = `
  CREATE SCHEMA profile;
  CREATE SCHEMA story;
`;
const fixtureSchemaSql = `
  CREATE TABLE profile.child_profiles (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL,
    UNIQUE(id, household_id)
  );
  CREATE TABLE profile.worlds (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL,
    UNIQUE(id, household_id)
  );
  CREATE TABLE profile.child_avatars (character_id uuid PRIMARY KEY);
  CREATE TABLE profile.world_npcs (character_id uuid PRIMARY KEY);
  CREATE TABLE profile.managed_assets (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL,
    subject_type varchar(32) NOT NULL,
    subject_id uuid NOT NULL
  );
  CREATE TABLE story.story_definitions (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );
  CREATE TABLE story.story_versions (
    id uuid PRIMARY KEY,
    story_definition_id uuid NOT NULL
  );
  CREATE TABLE story.story_scenes (
    id uuid PRIMARY KEY,
    story_version_id uuid NOT NULL
  );
  CREATE TABLE story.story_sessions (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL,
    child_profile_id uuid NOT NULL,
    world_id uuid NOT NULL,
    story_definition_id uuid NOT NULL,
    story_version_id uuid NOT NULL,
    current_scene_id uuid
  );
  CREATE TABLE story.story_session_characters (
    story_session_id uuid NOT NULL,
    character_id uuid NOT NULL,
    participation_role varchar(20) NOT NULL,
    PRIMARY KEY(story_session_id, character_id)
  );
`;
const insertSessionSql = `
  INSERT INTO story.story_sessions
  VALUES ($1,$2,$3,$4,$5,$6,$7)
`;
const insertParticipantsSql = `
  INSERT INTO story.story_session_characters
  VALUES ($1,$2,'protagonist'),($1,$3,'support')
`;
const insertInvalidParticipantSql = `
  INSERT INTO story.story_session_characters (
    story_session_id,
    character_id,
    participation_role,
    child_avatar_id,
    npc_id
  ) VALUES ($1,$2,'support',NULL,NULL)
`;
const selectParticipantsSql = `
  SELECT character_id, child_avatar_id, npc_id
  FROM story.story_session_characters
  ORDER BY character_id
`;
const selectManagedAssetIdentitySql = `
  SELECT story_scene_id, story_version_id, story_definition_id
  FROM profile.managed_assets
  WHERE id = $1
`;

const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function resetFixture() {
  await client.query(dropSchemasSql);
  await client.query(createSchemasSql);
  await client.query(fixtureSchemaSql);
}

async function seedCanonicalStoryGraph() {
  await client.query("INSERT INTO profile.child_profiles VALUES ($1,$2)", [
    child,
    h1,
  ]);
  await client.query("INSERT INTO profile.worlds VALUES ($1,$2)", [world, h1]);
  await client.query("INSERT INTO profile.child_avatars VALUES ($1)", [avatar]);
  await client.query("INSERT INTO profile.world_npcs VALUES ($1)", [npc]);
  await client.query("INSERT INTO story.story_definitions VALUES ($1,$2)", [
    definition,
    h1,
  ]);
  await client.query("INSERT INTO story.story_versions VALUES ($1,$2)", [
    version,
    definition,
  ]);
  await client.query("INSERT INTO story.story_scenes VALUES ($1,$2)", [
    scene,
    version,
  ]);
}

try {
  // Legacy preflight must fail closed for both an unknown scene and a real
  // scene bound to the wrong household. No FK/check relaxation is permitted.
  await resetFixture();
  await seedCanonicalStoryGraph();
  await client.query(
    `INSERT INTO profile.managed_assets
      (id, household_id, subject_type, subject_id)
     VALUES
      ($1,$2,'story_scene',$3),
      ($4,$5,'story_scene',$6)`,
    [invalidLegacyAsset, h1, unknown, invalidLegacyScopeAsset, h2, scene],
  );
  await client.query(storyIntegrityMigration);
  await assert.rejects(
    client.query(managedAssetIntegrityMigration),
    /Managed asset Story scene graph mismatch: 2 invalid row\(s\)/,
  );

  // Clean generation-1 style state: one legacy generic Story-scene asset must
  // backfill to the canonical scene/version/definition graph.
  await resetFixture();
  await seedCanonicalStoryGraph();
  await client.query(
    `INSERT INTO profile.managed_assets
      (id, household_id, subject_type, subject_id)
     VALUES ($1,$2,'story_scene',$3)`,
    [legacyAsset, h1, scene],
  );
  await client.query(insertSessionSql, [
    session,
    h1,
    child,
    world,
    definition,
    version,
    scene,
  ]);
  await client.query(insertParticipantsSql, [session, avatar, npc]);
  await client.query(storyIntegrityMigration);
  await client.query(managedAssetIntegrityMigration);

  const typed = await client.query(selectParticipantsSql);
  assert.equal(typed.rowCount, 2);
  assert.equal(typed.rows.filter((row) => row.child_avatar_id).length, 1);
  assert.equal(typed.rows.filter((row) => row.npc_id).length, 1);

  const legacyIdentity = await client.query(selectManagedAssetIdentitySql, [
    legacyAsset,
  ]);
  assert.equal(legacyIdentity.rowCount, 1);
  assert.deepEqual(legacyIdentity.rows[0], {
    story_scene_id: scene,
    story_version_id: version,
    story_definition_id: definition,
  });

  await client.query(
    "DELETE FROM story.story_session_characters WHERE story_session_id = $1",
    [session],
  );
  await client.query(insertParticipantsSql, [session, avatar, npc]);
  const resolvedOnWrite = await client.query(selectParticipantsSql);
  assert.equal(resolvedOnWrite.rowCount, 2);
  assert.equal(
    resolvedOnWrite.rows.filter((row) => row.child_avatar_id).length,
    1,
  );
  assert.equal(resolvedOnWrite.rows.filter((row) => row.npc_id).length, 1);

  await assert.rejects(
    client.query(insertSessionSql, [
      badSession,
      h2,
      child,
      world,
      definition,
      version,
      scene,
    ]),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(insertInvalidParticipantSql, [session, unknown]),
    /check constraint/,
  );

  // Typed Story IDs are DB-derived. Caller-provided fake typed values are
  // overwritten by the trigger using the canonical subject scene.
  await client.query(
    `INSERT INTO profile.managed_assets (
      id,
      household_id,
      subject_type,
      subject_id,
      story_scene_id,
      story_version_id,
      story_definition_id
    ) VALUES ($1,$2,'story_scene',$3,$4,$4,$4)`,
    [runtimeAsset, h1, scene, unknown],
  );
  const runtimeIdentity = await client.query(selectManagedAssetIdentitySql, [
    runtimeAsset,
  ]);
  assert.deepEqual(runtimeIdentity.rows[0], {
    story_scene_id: scene,
    story_version_id: version,
    story_definition_id: definition,
  });

  // A canonical scene from another household is still invalid: the
  // definition/household composite FK closes the cross-household hole.
  await assert.rejects(
    client.query(
      `INSERT INTO profile.managed_assets
        (id, household_id, subject_type, subject_id)
       VALUES ($1,$2,'story_scene',$3)`,
      [foreignAsset, h2, scene],
    ),
    /managed_assets_story_definition_scope_fk|foreign key constraint/,
  );

  await assert.rejects(
    client.query(
      `INSERT INTO profile.managed_assets
        (id, household_id, subject_type, subject_id)
       VALUES ($1,$2,'story_scene',$3)`,
      [unknownAsset, h1, unknown],
    ),
    /Managed asset Story scene identity not found/,
  );

  // Non-Story polymorphic subjects must never carry Story typed columns.
  await client.query(
    `INSERT INTO profile.managed_assets
      (id, household_id, subject_type, subject_id)
     VALUES ($1,$2,'character',$3)`,
    [nonStoryAsset, h1, avatar],
  );
  const nonStoryIdentity = await client.query(selectManagedAssetIdentitySql, [
    nonStoryAsset,
  ]);
  assert.deepEqual(nonStoryIdentity.rows[0], {
    story_scene_id: null,
    story_version_id: null,
    story_definition_id: null,
  });

  console.warn("Story integrity database self-test OK");
} finally {
  await client.query(dropSchemasSql).catch(() => {});
  await client.end();
}
