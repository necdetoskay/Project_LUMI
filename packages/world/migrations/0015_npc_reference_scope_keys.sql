-- Referential Integrity Audit: canonical reference keys for NPC-owned data.
--
-- These keys let downstream npc_intelligence tables reference typed identities
-- with household/world/child scope instead of validating unrelated UUIDs one by
-- one. The target rows remain owned by the profile/world domain.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS worlds_id_child_household_unique
  ON profile.worlds (id, child_profile_id, household_id);

CREATE UNIQUE INDEX IF NOT EXISTS world_npcs_id_household_unique
  ON profile.world_npcs (character_id, household_id);

CREATE UNIQUE INDEX IF NOT EXISTS world_npcs_id_child_household_unique
  ON profile.world_npcs (character_id, child_profile_id, household_id);

CREATE UNIQUE INDEX IF NOT EXISTS world_locations_id_world_unique
  ON profile.world_locations (id, world_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'profile.worlds'::regclass
      AND conname = 'worlds_child_scope_fk'
  ) THEN
    ALTER TABLE profile.worlds
      ADD CONSTRAINT worlds_child_scope_fk
      FOREIGN KEY (child_profile_id, household_id)
      REFERENCES profile.child_profiles (id, household_id)
      NOT VALID;
    ALTER TABLE profile.worlds
      VALIDATE CONSTRAINT worlds_child_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'profile.world_npcs'::regclass
      AND conname = 'world_npcs_world_child_scope_fk'
  ) THEN
    ALTER TABLE profile.world_npcs
      ADD CONSTRAINT world_npcs_world_child_scope_fk
      FOREIGN KEY (world_id, child_profile_id, household_id)
      REFERENCES profile.worlds (id, child_profile_id, household_id)
      NOT VALID;
    ALTER TABLE profile.world_npcs
      VALIDATE CONSTRAINT world_npcs_world_child_scope_fk;
  END IF;
END
$$;

COMMIT;
