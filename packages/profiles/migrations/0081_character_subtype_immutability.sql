-- PR-9 / Data Integrity Hardening
-- Treat character_subtype as canonical identity once a character row is created.
-- World-dependent registry synchronization is intentionally deferred to the
-- world migration phase so clean-schema ordering remains dependency-safe.

CREATE OR REPLACE FUNCTION profile.prevent_character_subtype_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.character_subtype IS DISTINCT FROM OLD.character_subtype THEN
    RAISE EXCEPTION 'Character subtype is immutable after creation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_character_subtype_mutation
ON profile.lumi_characters;

CREATE TRIGGER trg_prevent_character_subtype_mutation
BEFORE UPDATE OF character_subtype
ON profile.lumi_characters
FOR EACH ROW
EXECUTE FUNCTION profile.prevent_character_subtype_mutation();
