-- PR-3 / Data Integrity Hardening
-- Expand the polymorphic character model with an explicit child-avatar identity table.
-- The legacy profile.lumi_characters row remains the payload source until PR-4 moves consumers.

CREATE UNIQUE INDEX IF NOT EXISTS lumi_characters_id_subtype_unique
  ON profile.lumi_characters (id, character_subtype);

CREATE TABLE IF NOT EXISTS profile.child_avatars (
  character_id UUID PRIMARY KEY,
  character_subtype VARCHAR(20) NOT NULL DEFAULT 'child_avatar',
  child_profile_id UUID NOT NULL,
  household_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT child_avatars_subtype_check
    CHECK (character_subtype = 'child_avatar'),
  CONSTRAINT child_avatars_character_subtype_fk
    FOREIGN KEY (character_id, character_subtype)
    REFERENCES profile.lumi_characters (id, character_subtype)
    ON DELETE CASCADE,
  CONSTRAINT child_avatars_child_scope_fk
    FOREIGN KEY (child_profile_id, household_id)
    REFERENCES profile.child_profiles (id, household_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS child_avatars_household_idx
  ON profile.child_avatars (household_id);

CREATE UNIQUE INDEX IF NOT EXISTS child_avatars_active_child_unique
  ON profile.child_avatars (child_profile_id)
  WHERE deleted_at IS NULL;

INSERT INTO profile.child_avatars (
  character_id,
  character_subtype,
  child_profile_id,
  household_id,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  id,
  character_subtype,
  child_profile_id,
  household_id,
  deleted_at,
  created_at,
  updated_at
FROM profile.lumi_characters
WHERE character_subtype = 'child_avatar'
ON CONFLICT (character_id) DO NOTHING;

DO $$
DECLARE
  source_count BIGINT;
  split_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO source_count
  FROM profile.lumi_characters
  WHERE character_subtype = 'child_avatar';

  SELECT COUNT(*) INTO split_count
  FROM profile.child_avatars;

  IF source_count <> split_count THEN
    RAISE EXCEPTION
      'Child avatar split verification failed: source %, split %',
      source_count,
      split_count;
  END IF;
END
$$;
