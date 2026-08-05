-- Sprint 08: World scope hardening and referential integrity
-- Additive forward-only migration: adds FK constraints, unique indexes, idempotency
-- Safe for re-runs via DO blocks that check catalog before adding constraints
-- Preserves all existing data

BEGIN;

-- Ensure late-added support tables exist before constraints/indexes reference them.
CREATE TABLE IF NOT EXISTS profile.world_idempotency_ledger (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  world_id UUID,
  operation_type VARCHAR(60) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile.world_residences (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  character_id UUID NOT NULL,
  location_id UUID NOT NULL,
  home_id UUID,
  residence_type VARCHAR(20) NOT NULL DEFAULT 'primary',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wr_character_idx ON profile.world_residences (character_id);
CREATE INDEX IF NOT EXISTS wr_world_idx ON profile.world_residences (world_id);
CREATE INDEX IF NOT EXISTS wr_location_idx ON profile.world_residences (location_id);

-- ============================================================
-- 1. Foreign Key constraints to real profile tables
--    Use DO blocks for idempotent re-runs
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_worlds_household'
  ) THEN
    ALTER TABLE profile.worlds
      ADD CONSTRAINT fk_worlds_household
      FOREIGN KEY (household_id) REFERENCES profile.households(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_worlds_child_profile'
  ) THEN
    ALTER TABLE profile.worlds
      ADD CONSTRAINT fk_worlds_child_profile
      FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_worlds_character'
  ) THEN
    ALTER TABLE profile.worlds
      ADD CONSTRAINT fk_worlds_character
      FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_character_active_world'
  ) THEN
    CREATE UNIQUE INDEX uq_character_active_world
      ON profile.worlds (character_id)
      WHERE lifecycle_status = 'active';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_world_event_sequence'
  ) THEN
    CREATE UNIQUE INDEX uq_world_event_sequence
      ON profile.world_event_store (world_id, aggregate_version);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_idempotency_scope'
  ) THEN
    CREATE UNIQUE INDEX uq_idempotency_scope
      ON profile.world_idempotency_ledger (household_id, world_id, operation_type, idempotency_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_residences_world'
  ) THEN
    ALTER TABLE profile.world_residences
      ADD CONSTRAINT fk_world_residences_world
      FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_residences_character'
  ) THEN
    ALTER TABLE profile.world_residences
      ADD CONSTRAINT fk_world_residences_character
      FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_character_active_residence'
  ) THEN
    CREATE UNIQUE INDEX uq_character_active_residence
      ON profile.world_residences (character_id)
      WHERE home_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_character_locations_character'
  ) THEN
    ALTER TABLE profile.world_character_locations
      ADD CONSTRAINT fk_character_locations_character
      FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'profile' AND tablename = 'world_environment_snapshots'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_env_snapshots_world'
  ) THEN
    ALTER TABLE profile.world_environment_snapshots
      ADD CONSTRAINT fk_world_env_snapshots_world
      FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'profile' AND tablename = 'world_environment_snapshots'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_env_snapshots_region'
  ) THEN
    ALTER TABLE profile.world_environment_snapshots
      ADD CONSTRAINT fk_world_env_snapshots_region
      FOREIGN KEY (region_id) REFERENCES profile.world_regions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'profile' AND tablename = 'world_location_connections'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_loc_conn_world'
  ) THEN
    ALTER TABLE profile.world_location_connections
      ADD CONSTRAINT fk_world_loc_conn_world
      FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'profile' AND tablename = 'world_location_connections'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_loc_conn_from'
  ) THEN
    ALTER TABLE profile.world_location_connections
      ADD CONSTRAINT fk_world_loc_conn_from
      FOREIGN KEY (from_location_id) REFERENCES profile.world_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'profile' AND tablename = 'world_location_connections'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_world_loc_conn_to'
  ) THEN
    ALTER TABLE profile.world_location_connections
      ADD CONSTRAINT fk_world_loc_conn_to
      FOREIGN KEY (to_location_id) REFERENCES profile.world_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
