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
const storyMigration = async (filename) =>
  readFile(
    resolve(__dirname, "..", "..", "story", "migrations", filename),
    "utf8",
  );
const sessionIntegrityMigration = await storyMigration(
  "0010_story_integrity.sql",
);
const graphIntegrityMigration = await storyMigration(
  "0011_story_graph_referential_integrity.sql",
);

function fixtureId(index) {
  const suffix = String(index + 1).padStart(12, "0");
  return `30000000-0000-4000-8000-${suffix}`;
}

const ids = Array.from({ length: 32 }, (_, index) => fixtureId(index));
const [
  h1,
  h2,
  child1,
  child2,
  world1,
  definition1,
  version1,
  scene1,
  scene2,
  session1,
  avatar,
  npc,
  badSession,
  unknown,
  definition2,
  version2,
  otherScene,
  transition1,
  point1,
  option1,
  committed1,
  consequence1,
  candidate1,
  event1,
  ledger1,
  session2,
  otherPoint,
  otherOption,
  nullableEvent,
  badRow1,
  badRow2,
  badRow3,
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
  CREATE TABLE profile.households (
    id uuid PRIMARY KEY
  );
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
    household_id uuid NOT NULL,
    child_profile_id uuid,
    current_published_version_id uuid
  );
  CREATE TABLE story.story_versions (
    id uuid PRIMARY KEY,
    story_definition_id uuid NOT NULL
  );
  CREATE TABLE story.story_scenes (
    id uuid PRIMARY KEY,
    story_version_id uuid NOT NULL
  );
  CREATE TABLE story.story_scene_transitions (
    id uuid PRIMARY KEY,
    story_version_id uuid NOT NULL,
    from_scene_id uuid NOT NULL,
    to_scene_id uuid NOT NULL
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
  CREATE TABLE story.story_choice_points (
    id uuid PRIMARY KEY,
    story_version_id uuid NOT NULL,
    scene_id uuid NOT NULL
  );
  CREATE TABLE story.story_choice_options (
    id uuid PRIMARY KEY,
    choice_point_id uuid NOT NULL
  );
  CREATE TABLE story.story_committed_choices (
    id uuid PRIMARY KEY,
    story_session_id uuid NOT NULL,
    choice_point_id uuid NOT NULL,
    option_id uuid NOT NULL,
    evidence_scene_id uuid NOT NULL
  );
  CREATE TABLE story.story_choice_consequences (
    id uuid PRIMARY KEY,
    story_session_id uuid NOT NULL,
    committed_choice_id uuid NOT NULL
  );
  CREATE TABLE story.story_outcome_candidates (
    id uuid PRIMARY KEY,
    story_session_id uuid NOT NULL,
    source_consequence_id uuid NOT NULL
  );
  CREATE TABLE story.story_event_store (
    id uuid PRIMARY KEY,
    story_session_id uuid NOT NULL,
    actor_household_id uuid,
    child_profile_id uuid
  );
  CREATE TABLE story.story_idempotency_ledger (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL,
    story_session_id uuid
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

  await client.query("INSERT INTO profile.households VALUES ($1),($2)", [h1, h2]);
  await client.query(
    "INSERT INTO profile.child_profiles VALUES ($1,$2),($3,$4)",
    [child1, h1, child2, h2],
  );
  await client.query("INSERT INTO profile.worlds VALUES ($1,$2)", [world1, h1]);
  await client.query("INSERT INTO profile.child_avatars VALUES ($1)", [avatar]);
  await client.query("INSERT INTO profile.world_npcs VALUES ($1)", [npc]);

  await client.query(
    "INSERT INTO story.story_definitions VALUES ($1,$2,$3,NULL),($4,$2,$3,NULL)",
    [definition1, h1, child1, definition2],
  );
  await client.query(
    "INSERT INTO story.story_versions VALUES ($1,$2),($3,$4)",
    [version1, definition1, version2, definition2],
  );
  await client.query(
    "INSERT INTO story.story_scenes VALUES ($1,$2),($3,$2),($4,$5)",
    [scene1, version1, scene2, otherScene, version2],
  );
  await client.query(
    "UPDATE story.story_definitions SET current_published_version_id = $1 WHERE id = $2",
    [version1, definition1],
  );
  await client.query(
    "INSERT INTO story.story_scene_transitions VALUES ($1,$2,$3,$4)",
    [transition1, version1, scene1, scene2],
  );

  await client.query(insertSessionSql, [
    session1,
    h1,
    child1,
    world1,
    definition1,
    version1,
    scene1,
  ]);
  await client.query(insertSessionSql, [
    session2,
    h1,
    child1,
    world1,
    definition1,
    version1,
    scene1,
  ]);
  await client.query(insertParticipantsSql, [session1, avatar, npc]);

  await client.query(
    "INSERT INTO story.story_choice_points VALUES ($1,$2,$3),($4,$5,$6)",
    [point1, version1, scene1, otherPoint, version2, otherScene],
  );
  await client.query(
    "INSERT INTO story.story_choice_options VALUES ($1,$2),($3,$4)",
    [option1, point1, otherOption, otherPoint],
  );
  await client.query(
    "INSERT INTO story.story_committed_choices VALUES ($1,$2,$3,$4,$5)",
    [committed1, session1, point1, option1, scene1],
  );
  await client.query(
    "INSERT INTO story.story_choice_consequences VALUES ($1,$2,$3)",
    [consequence1, session1, committed1],
  );
  await client.query(
    "INSERT INTO story.story_outcome_candidates VALUES ($1,$2,$3)",
    [candidate1, session1, consequence1],
  );
  await client.query(
    "INSERT INTO story.story_event_store VALUES ($1,$2,$3,$4)",
    [event1, session1, h1, child1],
  );
  await client.query(
    "INSERT INTO story.story_idempotency_ledger VALUES ($1,$2,$3)",
    [ledger1, h1, session1],
  );

  await client.query(sessionIntegrityMigration);
  await client.query(graphIntegrityMigration);

  const typed = await client.query(selectParticipantsSql);
  assert.equal(typed.rowCount, 2);
  assert.equal(typed.rows.filter((row) => row.child_avatar_id).length, 1);
  assert.equal(typed.rows.filter((row) => row.npc_id).length, 1);

  await client.query(
    "DELETE FROM story.story_session_characters WHERE story_session_id = $1",
    [session1],
  );
  await client.query(insertParticipantsSql, [session1, avatar, npc]);
  const resolvedOnWrite = await client.query(selectParticipantsSql);
  assert.equal(resolvedOnWrite.rowCount, 2);
  assert.equal(
    resolvedOnWrite.rows.filter((row) => row.child_avatar_id).length,
    1,
  );
  assert.equal(resolvedOnWrite.rows.filter((row) => row.npc_id).length, 1);

  const graphConstraints = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE conname IN (
      'story_definitions_child_scope_fk',
      'story_definitions_published_version_fk',
      'story_transitions_from_version_fk',
      'story_transitions_to_version_fk',
      'story_choice_points_scene_version_fk',
      'story_committed_choices_option_point_fk',
      'story_choice_consequences_choice_session_fk',
      'story_outcome_candidates_consequence_session_fk',
      'story_idempotency_household_fk',
      'story_idempotency_session_scope_fk',
      'story_events_actor_session_scope_fk',
      'story_events_child_session_scope_fk'
    )
  `);
  assert.equal(graphConstraints.rowCount, 12);

  await assert.rejects(
    client.query(
      "UPDATE story.story_definitions SET current_published_version_id = $1 WHERE id = $2",
      [version2, definition1],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_definitions VALUES ($1,$2,$3,NULL)",
      [badRow1, h1, child2],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_scene_transitions VALUES ($1,$2,$3,$4)",
      [badRow1, version1, scene1, otherScene],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_choice_points VALUES ($1,$2,$3)",
      [badRow1, version1, otherScene],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_committed_choices VALUES ($1,$2,$3,$4,$5)",
      [badRow1, session2, point1, otherOption, scene1],
    ),
    /outside the selected choice point|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_committed_choices VALUES ($1,$2,$3,$4,$5)",
      [badRow1, session2, otherPoint, otherOption, otherScene],
    ),
    /outside the session story version/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_committed_choices VALUES ($1,$2,$3,$4,$5)",
      [badRow1, session2, point1, option1, otherScene],
    ),
    /evidence scene is outside the session story version/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_choice_consequences VALUES ($1,$2,$3)",
      [badRow1, session2, committed1],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_outcome_candidates VALUES ($1,$2,$3)",
      [badRow2, session2, consequence1],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_idempotency_ledger VALUES ($1,$2,$3)",
      [badRow2, h2, session1],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_event_store VALUES ($1,$2,$3,$4)",
      [badRow2, session1, h2, child1],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO story.story_event_store VALUES ($1,$2,$3,$4)",
      [badRow3, session1, h1, child2],
    ),
    /foreign key constraint/,
  );

  await client.query(
    "INSERT INTO story.story_event_store VALUES ($1,$2,NULL,NULL)",
    [nullableEvent, session1],
  );

  await assert.rejects(
    client.query(insertSessionSql, [
      badSession,
      h2,
      child1,
      world1,
      definition1,
      version1,
      scene1,
    ]),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(insertInvalidParticipantSql, [session1, unknown]),
    /check constraint/,
  );

  await client.query(graphIntegrityMigration);

  console.warn("Story integrity database self-test OK");
} finally {
  await client.query(dropSchemasSql).catch(() => {});
  await client.end();
}
