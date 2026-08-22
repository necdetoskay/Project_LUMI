-- PR-9 / Data Integrity Hardening
-- Complete the compatibility bridge between legacy character payload rows and
-- typed child-avatar/NPC identity registries after world tables are available.

DO $$
DECLARE
  ambiguous_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO ambiguous_count
  FROM profile.lumi_characters AS character
  WHERE character.character_subtype = 'npc'
    AND (
      SELECT COUNT(*)
      FROM profile.worlds AS world
      WHERE world.child_profile_id = character.child_profile_id
        AND world.household_id = character.household_id
        AND world.lifecycle_status <> 'archived'
    ) <> 1;

  IF ambiguous_count > 0 THEN
    RAISE EXCEPTION
      'NPC identity requires exactly one non-archived world in child/household scope: % unresolved NPC row(s)',
      ambiguous_count;
  END IF;
END
$$;

INSERT INTO profile.world_npcs (
  character_id,
  character_subtype,
  world_id,
  child_profile_id,
  household_id,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  character.id,
  'npc',
  world.id,
  character.child_profile_id,
  character.household_id,
  character.deleted_at,
  character.created_at,
  character.updated_at
FROM profile.lumi_characters AS character
INNER JOIN profile.worlds AS world
  ON world.child_profile_id = character.child_profile_id
  AND world.household_id = character.household_id
  AND world.lifecycle_status <> 'archived'
WHERE character.character_subtype = 'npc'
ON CONFLICT (character_id) DO UPDATE SET
  world_id = EXCLUDED.world_id,
  child_profile_id = EXCLUDED.child_profile_id,
  household_id = EXCLUDED.household_id,
  deleted_at = EXCLUDED.deleted_at,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION profile.sync_typed_character_registry()
RETURNS TRIGGER AS $$
DECLARE
  resolved_world_id UUID;
  world_count INTEGER;
BEGIN
  IF NEW.character_subtype = 'child_avatar' THEN
    INSERT INTO profile.child_avatars (
      character_id,
      character_subtype,
      child_profile_id,
      household_id,
      deleted_at,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'child_avatar',
      NEW.child_profile_id,
      NEW.household_id,
      NEW.deleted_at,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (character_id) DO UPDATE SET
      child_profile_id = EXCLUDED.child_profile_id,
      household_id = EXCLUDED.household_id,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;
  ELSIF NEW.character_subtype = 'npc' THEN
    SELECT COUNT(*), MIN(world.id::text)::uuid
    INTO world_count, resolved_world_id
    FROM profile.worlds AS world
    WHERE world.child_profile_id = NEW.child_profile_id
      AND world.household_id = NEW.household_id
      AND world.lifecycle_status <> 'archived';

    IF world_count <> 1 THEN
      RAISE EXCEPTION
        'NPC identity requires exactly one non-archived world in child/household scope; found %',
        world_count;
    END IF;

    INSERT INTO profile.world_npcs (
      character_id,
      character_subtype,
      world_id,
      child_profile_id,
      household_id,
      deleted_at,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'npc',
      resolved_world_id,
      NEW.child_profile_id,
      NEW.household_id,
      NEW.deleted_at,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (character_id) DO UPDATE SET
      world_id = EXCLUDED.world_id,
      child_profile_id = EXCLUDED.child_profile_id,
      household_id = EXCLUDED.household_id,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;
  ELSE
    RAISE EXCEPTION 'Unsupported canonical character subtype: %', NEW.character_subtype;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_child_avatar_registry
ON profile.lumi_characters;
DROP TRIGGER IF EXISTS trg_sync_typed_character_registry
ON profile.lumi_characters;

CREATE TRIGGER trg_sync_typed_character_registry
AFTER INSERT OR UPDATE OF child_profile_id, household_id, deleted_at
ON profile.lumi_characters
FOR EACH ROW
EXECUTE FUNCTION profile.sync_typed_character_registry();

DO $$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM profile.lumi_characters AS character
  LEFT JOIN profile.child_avatars AS avatar
    ON avatar.character_id = character.id
  LEFT JOIN profile.world_npcs AS npc
    ON npc.character_id = character.id
  LEFT JOIN profile.worlds AS world
    ON world.id = npc.world_id
  WHERE (
      character.character_subtype = 'child_avatar'
      AND (
        avatar.character_id IS NULL
        OR avatar.child_profile_id <> character.child_profile_id
        OR avatar.household_id <> character.household_id
        OR avatar.deleted_at IS DISTINCT FROM character.deleted_at
        OR npc.character_id IS NOT NULL
      )
    )
    OR (
      character.character_subtype = 'npc'
      AND (
        npc.character_id IS NULL
        OR npc.child_profile_id <> character.child_profile_id
        OR npc.household_id <> character.household_id
        OR npc.deleted_at IS DISTINCT FROM character.deleted_at
        OR avatar.character_id IS NOT NULL
        OR world.id IS NULL
        OR world.child_profile_id <> character.child_profile_id
        OR world.household_id <> character.household_id
        OR world.lifecycle_status = 'archived'
      )
    );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'Typed character registry verification failed: % invalid legacy character row(s)',
      invalid_count;
  END IF;
END
$$;
