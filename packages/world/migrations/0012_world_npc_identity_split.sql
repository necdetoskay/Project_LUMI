-- PR-3 / Data Integrity Hardening
-- Expand the polymorphic character model with an explicit NPC identity table.
-- NPC payload remains in profile.lumi_characters until PR-4 moves consumers.

CREATE TABLE IF NOT EXISTS profile.world_npcs (
  character_id UUID PRIMARY KEY,
  character_subtype VARCHAR(20) NOT NULL DEFAULT 'npc',
  world_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  household_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT world_npcs_subtype_check
    CHECK (character_subtype = 'npc'),
  CONSTRAINT world_npcs_character_subtype_fk
    FOREIGN KEY (character_id, character_subtype)
    REFERENCES profile.lumi_characters (id, character_subtype)
    ON DELETE CASCADE,
  CONSTRAINT world_npcs_world_fk
    FOREIGN KEY (world_id)
    REFERENCES profile.worlds (id)
    ON DELETE CASCADE,
  CONSTRAINT world_npcs_child_scope_fk
    FOREIGN KEY (child_profile_id, household_id)
    REFERENCES profile.child_profiles (id, household_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS world_npcs_world_idx
  ON profile.world_npcs (world_id);
CREATE INDEX IF NOT EXISTS world_npcs_household_idx
  ON profile.world_npcs (household_id);
CREATE INDEX IF NOT EXISTS world_npcs_child_profile_idx
  ON profile.world_npcs (child_profile_id);

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
    ) <> 1;

  IF ambiguous_count > 0 THEN
    RAISE EXCEPTION
      'NPC split requires exactly one world per NPC scope: % ambiguous NPC row(s)',
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
  character.character_subtype,
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
WHERE character.character_subtype = 'npc'
ON CONFLICT (character_id) DO NOTHING;

DO $$
DECLARE
  source_count BIGINT;
  split_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO source_count
  FROM profile.lumi_characters
  WHERE character_subtype = 'npc';

  SELECT COUNT(*) INTO split_count
  FROM profile.world_npcs;

  IF source_count <> split_count THEN
    RAISE EXCEPTION
      'NPC split verification failed: source %, split %',
      source_count,
      split_count;
  END IF;
END
$$;
