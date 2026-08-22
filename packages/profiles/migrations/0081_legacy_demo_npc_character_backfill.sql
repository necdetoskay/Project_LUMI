-- Production compatibility repair for the generation-1 LUMI demo fixture.
--
-- The original demo seed persisted NPC-owned rows using stable NPC UUIDs before
-- canonical NPC identities were required. PR #452 correctly rejects those
-- orphan UUIDs. This migration restores only the reserved demo identities in
-- the profile-owned character/origin tables. Fresh installs are a no-op because
-- the reserved demo household/child rows do not exist during schema bootstrap.

BEGIN;

DO $$
DECLARE
  demo_household_id CONSTANT UUID := '51000000-0000-4000-8000-000000000001';
  demo_child_profile_id CONSTANT UUID := '51000000-0000-4000-8000-000000000002';
  demo_root_count BIGINT;
  mismatch_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO demo_root_count
  FROM profile.child_profiles AS child
  INNER JOIN profile.households AS household
    ON household.id = child.household_id
  WHERE child.id = demo_child_profile_id
    AND child.household_id = demo_household_id;

  IF demo_root_count = 0 THEN
    RETURN;
  END IF;

  INSERT INTO profile.character_origin_packages (
    id,
    child_profile_id,
    household_id,
    broad_kind,
    character_type,
    subtype,
    origin_mode,
    universe_seed,
    created_by,
    accepted,
    payload,
    generation_source
  )
  SELECT
    identity.origin_package_id,
    demo_child_profile_id,
    demo_household_id,
    identity.broad_kind,
    identity.character_type,
    identity.subtype,
    'auto',
    'lumi-demo-isik-vadisi-v1:' || identity.identity_key,
    'system',
    FALSE,
    jsonb_build_object(
      'originConcept', 'lumi-demo-npc:' || identity.identity_key,
      'startingRegionArchetype', 'forest',
      'startingLocation', identity.location_key,
      'homeArchetype', 'world-resident',
      'nearbyNpcSeed', 'lina',
      'firstMysterySeed', 'kayip-isik-izi',
      'toneVector', '[]'::jsonb,
      'noveltyMarkers', jsonb_build_array('lumi_demo_legacy_backfill'),
      'safetyBounds', jsonb_build_object('lumiDemo', TRUE, 'role', identity.role_key)
    ),
    'lumi_demo_legacy_backfill_v1'
  FROM (
    VALUES
      ('51000000-0000-4000-8000-000000000033'::uuid, 'mira', 'human', 'helper', 'forest-guide', 'fisildayan-orman', 'orman-rehberi'),
      ('51000000-0000-4000-8000-000000000034'::uuid, 'tiko', 'animal', 'explorer', 'fox', 'atesbocekleri-korusu', 'tilki'),
      ('51000000-0000-4000-8000-000000000035'::uuid, 'yasli-mese', 'fantasy', 'storyteller', 'ancient-tree', 'eski-tas-kopru', 'hafiza-koruyucusu')
  ) AS identity(origin_package_id, identity_key, broad_kind, character_type, subtype, location_key, role_key)
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO mismatch_count
  FROM (
    VALUES
      ('51000000-0000-4000-8000-000000000033'::uuid, 'human', 'helper', 'forest-guide'),
      ('51000000-0000-4000-8000-000000000034'::uuid, 'animal', 'explorer', 'fox'),
      ('51000000-0000-4000-8000-000000000035'::uuid, 'fantasy', 'storyteller', 'ancient-tree')
  ) AS expected(id, broad_kind, character_type, subtype)
  LEFT JOIN profile.character_origin_packages AS package
    ON package.id = expected.id
  WHERE package.id IS NULL
     OR package.child_profile_id IS DISTINCT FROM demo_child_profile_id
     OR package.household_id IS DISTINCT FROM demo_household_id
     OR package.broad_kind IS DISTINCT FROM expected.broad_kind
     OR package.character_type IS DISTINCT FROM expected.character_type
     OR package.subtype IS DISTINCT FROM expected.subtype;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Legacy demo NPC origin backfill found % conflicting reserved identity row(s)',
      mismatch_count;
  END IF;

  INSERT INTO profile.lumi_characters (
    id,
    child_profile_id,
    household_id,
    name,
    broad_kind,
    character_type,
    subtype,
    origin_mode,
    first_origin_package_id,
    origin_concept,
    starting_region_archetype,
    starting_location,
    home_archetype,
    nearby_npc_seed,
    first_mystery_seed,
    universe_seed,
    safety_bounds,
    character_subtype,
    lifecycle_stage,
    version
  )
  SELECT
    identity.character_id,
    demo_child_profile_id,
    demo_household_id,
    identity.display_name,
    identity.broad_kind,
    identity.character_type,
    identity.subtype,
    'auto',
    identity.origin_package_id,
    'lumi-demo-npc:' || identity.identity_key,
    'forest',
    identity.location_key,
    'world-resident',
    'lina',
    'kayip-isik-izi',
    'lumi-demo-isik-vadisi-v1:' || identity.identity_key,
    jsonb_build_object(
      'lumiDemo', TRUE,
      'legacyBackfill', TRUE,
      'role', identity.role_key
    ),
    'npc',
    identity.lifecycle_stage,
    1
  FROM (
    VALUES
      ('51000000-0000-4000-8000-000000000030'::uuid, '51000000-0000-4000-8000-000000000033'::uuid, 'mira', 'Mira', 'human', 'helper', 'forest-guide', 'fisildayan-orman', 'orman-rehberi', 'adulthood'),
      ('51000000-0000-4000-8000-000000000031'::uuid, '51000000-0000-4000-8000-000000000034'::uuid, 'tiko', 'Tiko', 'animal', 'explorer', 'fox', 'atesbocekleri-korusu', 'tilki', 'childhood'),
      ('51000000-0000-4000-8000-000000000032'::uuid, '51000000-0000-4000-8000-000000000035'::uuid, 'yasli-mese', 'Yaşlı Meşe', 'fantasy', 'storyteller', 'ancient-tree', 'eski-tas-kopru', 'hafiza-koruyucusu', 'elder')
  ) AS identity(character_id, origin_package_id, identity_key, display_name, broad_kind, character_type, subtype, location_key, role_key, lifecycle_stage)
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO mismatch_count
  FROM (
    VALUES
      ('51000000-0000-4000-8000-000000000030'::uuid, '51000000-0000-4000-8000-000000000033'::uuid, 'human', 'helper', 'forest-guide', 'adulthood'),
      ('51000000-0000-4000-8000-000000000031'::uuid, '51000000-0000-4000-8000-000000000034'::uuid, 'animal', 'explorer', 'fox', 'childhood'),
      ('51000000-0000-4000-8000-000000000032'::uuid, '51000000-0000-4000-8000-000000000035'::uuid, 'fantasy', 'storyteller', 'ancient-tree', 'elder')
  ) AS expected(id, origin_package_id, broad_kind, character_type, subtype, lifecycle_stage)
  LEFT JOIN profile.lumi_characters AS character
    ON character.id = expected.id
  WHERE character.id IS NULL
     OR character.child_profile_id IS DISTINCT FROM demo_child_profile_id
     OR character.household_id IS DISTINCT FROM demo_household_id
     OR character.first_origin_package_id IS DISTINCT FROM expected.origin_package_id
     OR character.broad_kind IS DISTINCT FROM expected.broad_kind
     OR character.character_type IS DISTINCT FROM expected.character_type
     OR character.subtype IS DISTINCT FROM expected.subtype
     OR character.character_subtype IS DISTINCT FROM 'npc'
     OR character.lifecycle_stage IS DISTINCT FROM expected.lifecycle_stage;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Legacy demo NPC character backfill found % conflicting reserved identity row(s)',
      mismatch_count;
  END IF;
END
$$;

COMMIT;
