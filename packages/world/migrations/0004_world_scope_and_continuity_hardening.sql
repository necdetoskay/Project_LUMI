-- Sprint 08: World scope hardening and referential integrity
-- Additive forward-only migration: adds FK constraints, unique indexes, idempotency
-- Safe for re-runs via DO blocks that check catalog before adding constraints
-- Preserves all existing data

BEGIN;

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
      FOREIGN KEY (character_id) REFERENCES profile.characters(id);
  END IF;
END $$;

-- ============================================================
-- 2. Partial unique index: one active world per character
-- ============================================================

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

-- ============================================================
-- 3. Composite FK guards for region/location/home scope
--    These are already enforced by application code; DB-level
--    cross-world composite FKs are advisory via partial indexes.
-- ============================================================

-- Region -> world (already has FK fk_world_regions_world from 0003)
-- Location -> world + region (already has FKs from 0003)
-- Home -> world + location (already has FKs from 0003)

-- ============================================================
-- 4. Event store monotonic sequence invariant
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_world_event_sequence'
  ) THEN
    CREATE UNIQUE INDEX uq_world_event_sequence
      ON profile.world_event_store (world_id, aggregate_version);
  END IF;
END $$;

-- ============================================================
-- 5. Idempotency key scope: household + operation + key
--    Existing uq_idempotency_scope already covers this.
--    Ensure the index exists on world_idempotency_ledger.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_idempotency_scope'
  ) THEN
    CREATE UNIQUE INDEX uq_idempotency_scope
      ON profile.world_idempotency_ledger (household_id, world_id, operation_type, idempotency_key);
  END IF;
END $$;

-- ============================================================
-- 6. FK for world_residences
-- ============================================================

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
      FOREIGN KEY (character_id) REFERENCES profile.characters(id);
  END IF;
END $$;

-- ============================================================
-- 7. Single active residence per character partial unique index
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_character_active_residence'
  ) THEN
    CREATE UNIQUE INDEX uq_character_active_residence
      ON profile.world_residences (character_id)
      WHERE is_active = true;
  END IF;
END $$;

-- ============================================================
-- 8. Character location: one active per character (already PK)
--    Ensure FK to character table
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_character_locations_character'
  ) THEN
    ALTER TABLE profile.world_character_locations
      ADD CONSTRAINT fk_character_locations_character
      FOREIGN KEY (character_id) REFERENCES profile.characters(id);
  END IF;
END $$;

-- ============================================================
-- 9. Environment snapshot FKs (if table exists)
-- ============================================================

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

-- ============================================================
-- 10. Location connection FKs (if table exists)
-- ============================================================

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
