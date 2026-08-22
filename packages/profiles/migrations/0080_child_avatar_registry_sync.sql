-- PR-4 / Data Integrity Hardening
-- Compatibility bridge while legacy character creation still writes profile.lumi_characters.

CREATE OR REPLACE FUNCTION profile.sync_child_avatar_registry()
RETURNS TRIGGER AS $$
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
      NEW.character_subtype,
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_child_avatar_registry ON profile.lumi_characters;
CREATE TRIGGER trg_sync_child_avatar_registry
AFTER INSERT OR UPDATE OF child_profile_id, household_id, character_subtype, deleted_at
ON profile.lumi_characters
FOR EACH ROW
EXECUTE FUNCTION profile.sync_child_avatar_registry();
