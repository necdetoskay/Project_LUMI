-- Sprint 08 review: FK constraints, environment snapshots, location graph, residence index
-- Additive migration: hardens existing tables with referential integrity and new tables
-- Preserves all existing data
-- WARNING: ALTER TABLE ADD CONSTRAINT will fail if orphan rows exist. Run cleanup first.

BEGIN;

-- ============================================================
-- 1. Foreign Key Constraints (self-contained within profile.*)
-- ============================================================

-- world_regions → worlds
ALTER TABLE profile.world_regions
  ADD CONSTRAINT fk_world_regions_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

-- world_locations → worlds + world_regions
ALTER TABLE profile.world_locations
  ADD CONSTRAINT fk_world_locations_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

ALTER TABLE profile.world_locations
  ADD CONSTRAINT fk_world_locations_region
  FOREIGN KEY (region_id) REFERENCES profile.world_regions(id) ON DELETE CASCADE;

-- world_homes → worlds + world_locations
ALTER TABLE profile.world_homes
  ADD CONSTRAINT fk_world_homes_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

ALTER TABLE profile.world_homes
  ADD CONSTRAINT fk_world_homes_location
  FOREIGN KEY (location_id) REFERENCES profile.world_locations(id) ON DELETE CASCADE;

-- world_bootstrap_manifests → worlds
ALTER TABLE profile.world_bootstrap_manifests
  ADD CONSTRAINT fk_wbm_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

-- world_checkpoints → worlds
ALTER TABLE profile.world_checkpoints
  ADD CONSTRAINT fk_wc_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

-- world_character_locations → worlds + world_locations
ALTER TABLE profile.world_character_locations
  ADD CONSTRAINT fk_wcl_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

ALTER TABLE profile.world_character_locations
  ADD CONSTRAINT fk_wcl_location
  FOREIGN KEY (location_id) REFERENCES profile.world_locations(id) ON DELETE CASCADE;

-- world_character_movement_events → worlds
ALTER TABLE profile.world_character_movement_events
  ADD CONSTRAINT fk_wcme_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

-- world_event_store → worlds
ALTER TABLE profile.world_event_store
  ADD CONSTRAINT fk_wes_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Unique Constraints for Business Rules
-- ============================================================

-- Each world can have exactly one active bootstrap manifest
-- (enforced by UNIQUE on world_id from 0001, added here as named constraint for clarity)
-- Already covered: UNIQUE (world_id) on world_bootstrap_manifests

-- ============================================================
-- 3. Environment Snapshots Table
-- ============================================================

CREATE TABLE IF NOT EXISTS profile.world_environment_snapshots (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  region_id UUID NOT NULL,
  snapshot_type VARCHAR(30) NOT NULL DEFAULT 'periodic',
  environment_vector JSONB NOT NULL DEFAULT '{}',
  anomaly_level VARCHAR(20) NOT NULL DEFAULT 'stable',
  snapshot_metadata JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wesnap_world_region_idx
  ON profile.world_environment_snapshots (world_id, region_id, created_at DESC);

ALTER TABLE profile.world_environment_snapshots
  ADD CONSTRAINT fk_wesnap_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

ALTER TABLE profile.world_environment_snapshots
  ADD CONSTRAINT fk_wesnap_region
  FOREIGN KEY (region_id) REFERENCES profile.world_regions(id) ON DELETE CASCADE;

-- ============================================================
-- 4. Location Connections (graph edges)
-- ============================================================

CREATE TABLE IF NOT EXISTS profile.world_location_connections (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  from_location_id UUID NOT NULL,
  to_location_id UUID NOT NULL,
  connection_type VARCHAR(30) NOT NULL DEFAULT 'path',
  traversal_cost INTEGER NOT NULL DEFAULT 1,
  is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  accessibility_requirement VARCHAR(20),
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_location_connection UNIQUE (from_location_id, to_location_id)
);

CREATE INDEX IF NOT EXISTS wlc_world_idx ON profile.world_location_connections (world_id);
CREATE INDEX IF NOT EXISTS wlc_from_idx ON profile.world_location_connections (from_location_id);
CREATE INDEX IF NOT EXISTS wlc_to_idx ON profile.world_location_connections (to_location_id);

ALTER TABLE profile.world_location_connections
  ADD CONSTRAINT fk_wlc_world
  FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

ALTER TABLE profile.world_location_connections
  ADD CONSTRAINT fk_wlc_from_location
  FOREIGN KEY (from_location_id) REFERENCES profile.world_locations(id) ON DELETE CASCADE;

ALTER TABLE profile.world_location_connections
  ADD CONSTRAINT fk_wlc_to_location
  FOREIGN KEY (to_location_id) REFERENCES profile.world_locations(id) ON DELETE CASCADE;

COMMIT;
