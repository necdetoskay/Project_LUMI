import type pg from "pg";

export type StoryFixtureIds = {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  storyDefinitionId: string;
  storyVersionId: string;
  entrySceneId: string;
  storySessionId: string;
};

export async function seedStoryFixture(pool: pg.Pool, ids: StoryFixtureIds) {
  await pool.query(
    `INSERT INTO profile.households (id, name, slug)
     VALUES ($1, 'ULTEF Household', $2)
     ON CONFLICT (id) DO NOTHING`,
    [ids.householdId, `ultef-${ids.householdId}`],
  );
  await pool.query(
    `INSERT INTO profile.child_profiles (id, household_id, display_name, age_band, locale)
     VALUES ($1, $2, 'Deniz', '6-8', 'tr-TR')
     ON CONFLICT (id) DO NOTHING`,
    [ids.childProfileId, ids.householdId],
  );
  await pool.query(
    `INSERT INTO profile.lumi_characters (
       id, child_profile_id, household_id, name, broad_kind, character_type, subtype,
       origin_mode, first_origin_package_id, origin_concept, starting_region_archetype,
       starting_location, home_archetype, nearby_npc_seed, first_mystery_seed, universe_seed,
       safety_bounds
     ) VALUES (
       $1, $2, $3, 'Arin', 'human', 'explorer', 'child',
       'manual', $4, 'Curious young explorer', 'valley',
       'Old Library', 'warm_home', 'Mira', 'Bridge lights mystery', 'ultef-universe',
       '{}'::jsonb
     ) ON CONFLICT (id) DO NOTHING`,
    [ids.characterId, ids.childProfileId, ids.householdId, crypto.randomUUID()],
  );
  await pool.query(
    `INSERT INTO profile.worlds (
       id, household_id, child_profile_id, character_id, universe_seed, origin_seed,
       accepted_candidate_seed, generator_version, vector_version, lifecycle_status, metadata, version
     ) VALUES (
       $1, $2, $3, $4, 'ultef-universe', 'ultef-origin', 'ultef-candidate',
       'ultef-generator-v1', 'ultef-vector-v1', 'active', '{}'::jsonb, 1
     ) ON CONFLICT (id) DO NOTHING`,
    [ids.worldId, ids.householdId, ids.childProfileId, ids.characterId],
  );
  await pool.query(
    `INSERT INTO story.story_definitions (
       id, household_id, child_profile_id, title, slug, story_type, source_type, lifecycle,
       age_group, default_language, version
     ) VALUES ($1, $2, $3, 'ULTEF Fixture Story', $4, 'interactive', 'generated', 'published', '6-8', 'tr', 1)
     ON CONFLICT (id) DO NOTHING`,
    [
      ids.storyDefinitionId,
      ids.householdId,
      ids.childProfileId,
      `ultef-fixture-${ids.storyDefinitionId}`,
    ],
  );
  await pool.query(
    `INSERT INTO story.story_versions (
       id, story_definition_id, version_number, publication_status, schema_version, title, story_mode, published_at
     ) VALUES ($1, $2, 1, 'published', 1, 'ULTEF Fixture Story v1', 'dynamic', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [ids.storyVersionId, ids.storyDefinitionId],
  );
  await pool.query(
    `INSERT INTO story.story_scenes (
       id, story_version_id, scene_key, sequence_number, scene_type, title, narrative_text,
       is_entry_scene, is_terminal_scene, metadata
     ) VALUES ($1, $2, 'entry', 0, 'narrative', 'Baslangic',
       'Arin Gunes Vadisi eski kutuphanesine girdi.', TRUE, FALSE, '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [ids.entrySceneId, ids.storyVersionId],
  );
  await pool.query(
    `INSERT INTO story.story_sessions (
       id, household_id, child_profile_id, world_id, story_definition_id, story_version_id,
       current_scene_id, session_status, playback_mode, started_at, last_interacted_at,
       context_snapshot, version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'reading', NOW(), NOW(), '{}'::jsonb, 1)
     ON CONFLICT (id) DO NOTHING`,
    [
      ids.storySessionId,
      ids.householdId,
      ids.childProfileId,
      ids.worldId,
      ids.storyDefinitionId,
      ids.storyVersionId,
      ids.entrySceneId,
    ],
  );
}

export async function cleanupStoryFixture(pool: pg.Pool, ids: StoryFixtureIds) {
  await pool.query(
    `DELETE FROM story.story_idempotency_ledger WHERE story_session_id = $1`,
    [ids.storySessionId],
  );
  await pool.query(
    `DELETE FROM story.story_event_store WHERE story_session_id = $1`,
    [ids.storySessionId],
  );
  await pool.query(
    `DELETE FROM story.story_session_checkpoints WHERE story_session_id = $1`,
    [ids.storySessionId],
  );
  await pool.query(
    `DELETE FROM story.story_session_scene_visits WHERE story_session_id = $1`,
    [ids.storySessionId],
  );
  await pool.query(`DELETE FROM story.story_sessions WHERE id = $1`, [
    ids.storySessionId,
  ]);
  await pool.query(
    `DELETE FROM story.story_scenes WHERE story_version_id = $1`,
    [ids.storyVersionId],
  );
  await pool.query(`DELETE FROM story.story_versions WHERE id = $1`, [
    ids.storyVersionId,
  ]);
  await pool.query(`DELETE FROM story.story_definitions WHERE id = $1`, [
    ids.storyDefinitionId,
  ]);
  await pool.query(`DELETE FROM profile.worlds WHERE id = $1`, [ids.worldId]);
  await pool.query(`DELETE FROM profile.lumi_characters WHERE id = $1`, [
    ids.characterId,
  ]);
  await pool.query(`DELETE FROM profile.child_profiles WHERE id = $1`, [
    ids.childProfileId,
  ]);
  await pool.query(`DELETE FROM profile.households WHERE id = $1`, [
    ids.householdId,
  ]);
}
