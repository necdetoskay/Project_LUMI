-- PR-5 / Data Integrity Hardening
-- Enforce world hierarchy and typed NPC scope with composite identities.

CREATE UNIQUE INDEX IF NOT EXISTS worlds_id_household_unique
  ON profile.worlds (id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS world_regions_id_world_unique
  ON profile.world_regions (id, world_id);
CREATE UNIQUE INDEX IF NOT EXISTS world_npcs_id_world_household_unique
  ON profile.world_npcs (character_id, world_id, household_id);

DO $$
DECLARE
  mismatch_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM profile.world_locations AS location
  LEFT JOIN profile.world_regions AS region
    ON region.id = location.region_id
    AND region.world_id = location.world_id
  WHERE region.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'World hierarchy mismatch: % location row(s) reference a region outside their world',
      mismatch_count;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profile.world_locations'::regclass
      AND conname = 'world_locations_region_world_fk'
  ) THEN
    ALTER TABLE profile.world_locations
      ADD CONSTRAINT world_locations_region_world_fk
      FOREIGN KEY (region_id, world_id)
      REFERENCES profile.world_regions (id, world_id)
      NOT VALID;
    ALTER TABLE profile.world_locations
      VALIDATE CONSTRAINT world_locations_region_world_fk;
  END IF;
END
$$;
