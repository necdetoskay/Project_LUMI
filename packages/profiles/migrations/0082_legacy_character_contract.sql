-- PR-9 / Data Integrity Hardening
-- Contract the legacy polymorphic character surface without dropping payload data.

CREATE OR REPLACE FUNCTION profile.prevent_character_subtype_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.character_subtype IS DISTINCT FROM OLD.character_subtype THEN
    RAISE EXCEPTION 'Character subtype is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_character_subtype_mutation ON profile.lumi_characters;
CREATE TRIGGER trg_prevent_character_subtype_mutation
BEFORE UPDATE OF character_subtype ON profile.lumi_characters
FOR EACH ROW
EXECUTE FUNCTION profile.prevent_character_subtype_mutation();

CREATE OR REPLACE FUNCTION profile.sync_typed_character_registry()
RETURNS TRIGGER AS $$
DECLARE
  resolved_world_id UUID;
  world_count INTEGER;
BEGIN
  IF NEW.character_subtype = 'child_avatar' THEN
    INSERT INTO profile.child_avatars (
      character_id, character_subtype, child_profile_id, household_id,
      deleted_at, created_at, updated_at
    ) VALUES (
      NEW.id, 'child_avatar', NEW.child_profile_id, NEW.household_id,
      NEW.deleted_at, NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (character_id) DO UPDATE SET
      child_profile_id = EXCLUDED.child_profile_id,
      household_id = EXCLUDED.household_id,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;
  ELSIF NEW.character_subtype = 'npc' THEN
    SELECT COUNT(*), MIN(id)
    INTO world_count, resolved_world_id
    FROM profile.worlds
    WHERE child_profile_id = NEW.child_profile_id
      AND household_id = NEW.household_id
      AND lifecycle_status <> 'archived';

    IF world_count <> 1 THEN
      RAISE EXCEPTION
        'NPC identity requires exactly one active world in child/household scope; found %',
        world_count;
    END IF;

    INSERT INTO profile.world_npcs (
      character_id, character_subtype, world_id, child_profile_id, household_id,
      deleted_at, created_at, updated_at
    ) VALUES (
      NEW.id, 'npc', resolved_world_id, NEW.child_profile_id, NEW.household_id,
      NEW.deleted_at, NEW.created_at, NEW.updated_at
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

DROP TRIGGER IF EXISTS trg_sync_child_avatar_registry ON profile.lumi_characters;
DROP TRIGGER IF EXISTS trg_sync_typed_character_registry ON profile.lumi_characters;
CREATE TRIGGER trg_sync_typed_character_registry
AFTER INSERT OR UPDATE OF child_profile_id, household_id, deleted_at
ON profile.lumi_characters
FOR EACH ROW
EXECUTE FUNCTION profile.sync_typed_character_registry();

DO $$
DECLARE
  missing_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM profile.lumi_characters AS character
  LEFT JOIN profile.child_avatars AS avatar
    ON avatar.character_id = character.id
  LEFT JOIN profile.world_npcs AS npc
    ON npc.character_id = character.id
  WHERE (character.character_subtype = 'child_avatar' AND avatar.character_id IS NULL)
     OR (character.character_subtype = 'npc' AND npc.character_id IS NULL)
     OR character.character_subtype NOT IN ('child_avatar', 'npc');

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Legacy character contract has % unregistered canonical character(s)', missing_count;
  END IF;
END
$$;
