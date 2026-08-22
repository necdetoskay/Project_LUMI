-- Production compatibility repair for the generation-1 LUMI demo fixture.
--
-- Profile migration 0081 restores the reserved canonical NPC characters. This
-- world-owned migration binds those exact identities to the reserved demo world
-- before npc_intelligence/9000 validates scoped foreign keys. Fresh installs are
-- a no-op because the reserved demo child/world rows are not seeded by schema
-- migrations.

BEGIN;

DO $$
DECLARE
  demo_household_id CONSTANT UUID := '51000000-0000-4000-8000-000000000001';
  demo_child_profile_id CONSTANT UUID := '51000000-0000-4000-8000-000000000002';
  demo_world_id CONSTANT UUID := '51000000-0000-4000-8000-000000000004';
  demo_child_count BIGINT;
  demo_world_count BIGINT;
  mismatch_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO demo_child_count
  FROM profile.child_profiles
  WHERE id = demo_child_profile_id
    AND household_id = demo_household_id;

  IF demo_child_count = 0 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO demo_world_count
  FROM profile.worlds
  WHERE id = demo_world_id
    AND child_profile_id = demo_child_profile_id
    AND household_id = demo_household_id;

  IF demo_world_count <> 1 THEN
    RAISE EXCEPTION
      'Legacy demo NPC registry backfill requires canonical demo world %, found % matching row(s)',
      demo_world_id,
      demo_world_count;
  END IF;

  INSERT INTO profile.world_npcs (
    character_id,
    character_subtype,
    world_id,
    child_profile_id,
    household_id
  )
  SELECT
    expected.character_id,
    'npc',
    demo_world_id,
    demo_child_profile_id,
    demo_household_id
  FROM (
    VALUES
      ('51000000-0000-4000-8000-000000000030'::uuid),
      ('51000000-0000-4000-8000-000000000031'::uuid),
      ('51000000-0000-4000-8000-000000000032'::uuid)
  ) AS expected(character_id)
  INNER JOIN profile.lumi_characters AS character
    ON character.id = expected.character_id
    AND character.character_subtype = 'npc'
    AND character.child_profile_id = demo_child_profile_id
    AND character.household_id = demo_household_id
  ON CONFLICT (character_id) DO NOTHING;

  SELECT COUNT(*) INTO mismatch_count
  FROM (
    VALUES
      ('51000000-0000-4000-8000-000000000030'::uuid),
      ('51000000-0000-4000-8000-000000000031'::uuid),
      ('51000000-0000-4000-8000-000000000032'::uuid)
  ) AS expected(character_id)
  LEFT JOIN profile.world_npcs AS npc
    ON npc.character_id = expected.character_id
  WHERE npc.character_id IS NULL
     OR npc.character_subtype IS DISTINCT FROM 'npc'
     OR npc.world_id IS DISTINCT FROM demo_world_id
     OR npc.child_profile_id IS DISTINCT FROM demo_child_profile_id
     OR npc.household_id IS DISTINCT FROM demo_household_id;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Legacy demo NPC registry backfill found % missing or conflicting reserved identity row(s)',
      mismatch_count;
  END IF;
END
$$;

COMMIT;
