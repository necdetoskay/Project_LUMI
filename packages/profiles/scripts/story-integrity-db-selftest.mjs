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
const migrationPath = resolve(
  __dirname,
  "..",
  "..",
  "story",
  "migrations",
  "0010_story_integrity.sql",
);
const migration = await readFile(migrationPath, "utf8");

function fixtureId(index) {
  const suffix = String(index + 1).padStart(12, "0");
  return `30000000-0000-4000-8000-${suffix}`;
}

const ids = Array.from({ length: 12 }, (_, index) => fixtureId(index));
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

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(dropSchemasSql);
  await client.query(createSchemasSql);
  await client.query(fixtureSchemaSql);
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
  await client.query(migration);

  const typed = await client.query(selectParticipantsSql);
  assert.equal(typed.rowCount, 2);
  assert.equal(typed.rows.filter((row) => row.child_avatar_id).length, 1);
  assert.equal(typed.rows.filter((row) => row.npc_id).length, 1);

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

  console.warn("Story integrity database self-test OK");
} finally {
  await client.query(dropSchemasSql).catch(() => {});
  await client.end();
}
