-- Sprint 08: World, Region and Home Domain
-- Additive migration: creates world schema tables for the first persistent world foundation
-- Does NOT modify existing auth or profile tables
-- Preserves all existing data

BEGIN;

CREATE SCHEMA IF NOT EXISTS profile;

-- 1. Worlds: authoritative root aggregate for a character's universe
CREATE TABLE IF NOT EXISTS profile.worlds (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  character_id UUID NOT NULL,
  universe_seed VARCHAR(120) NOT NULL,
  origin_seed VARCHAR(120) NOT NULL,
  accepted_candidate_seed VARCHAR(120) NOT NULL,
  generator_version VARCHAR(40) NOT NULL,
  vector_version VARCHAR(40) NOT NULL,
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT worlds_lifecycle_check CHECK (
    lifecycle_status IN ('active', 'paused', 'frozen', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS worlds_household_idx ON profile.worlds (household_id);
CREATE INDEX IF NOT EXISTS worlds_character_idx ON profile.worlds (character_id);
CREATE INDEX IF NOT EXISTS worlds_child_profile_idx ON profile.worlds (child_profile_id);
CREATE INDEX IF NOT EXISTS worlds_lifecycle_idx ON profile.worlds (lifecycle_status);

-- 2. World Bootstrap Manifests: audit/replay record of the origin decision
CREATE TABLE IF NOT EXISTS profile.world_bootstrap_manifests (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL UNIQUE,
  universe_seed VARCHAR(120) NOT NULL,
  origin_seed VARCHAR(120) NOT NULL,
  accepted_candidate_seed VARCHAR(120) NOT NULL,
  generator_version VARCHAR(40) NOT NULL,
  vector_version VARCHAR(40) NOT NULL,
  origin_package_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wbm_world_idx ON profile.world_bootstrap_manifests (world_id);

-- 3. World Checkpoints: versioned snapshots for state hash verification
CREATE TABLE IF NOT EXISTS profile.world_checkpoints (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  checkpoint_sequence INTEGER NOT NULL,
  world_version INTEGER NOT NULL,
  state_hash VARCHAR(96) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_checkpoint_seq UNIQUE (world_id, checkpoint_sequence)
);

CREATE INDEX IF NOT EXISTS wc_world_idx ON profile.world_checkpoints (world_id, checkpoint_sequence DESC);

-- 4. Regions: geographical/domain areas within a world
CREATE TABLE IF NOT EXISTS profile.world_regions (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  region_key VARCHAR(120) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  region_type VARCHAR(40) NOT NULL,
  accessibility_status VARCHAR(20) NOT NULL DEFAULT 'open',
  discovery_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  environment_vector JSONB NOT NULL DEFAULT '{}',
  subregion_of UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_region_key UNIQUE (world_id, region_key),
  CONSTRAINT wr_accessibility_check CHECK (
    accessibility_status IN ('open', 'restricted', 'blocked', 'dangerous')
  ),
  CONSTRAINT wr_discovery_check CHECK (
    discovery_status IN ('unknown', 'rumored', 'discovered', 'explored')
  ),
  CONSTRAINT wr_region_type_check CHECK (
    region_type IN ('wilderness', 'settlement', 'water', 'mountain', 'forest', 'sky', 'underground', 'magical', 'urban', 'coastal', 'island', 'custom')
  )
);

CREATE INDEX IF NOT EXISTS wr_world_idx ON profile.world_regions (world_id, sort_order);

-- 5. Locations: concrete places within regions
CREATE TABLE IF NOT EXISTS profile.world_locations (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  region_id UUID NOT NULL,
  location_key VARCHAR(120) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  accessibility_status VARCHAR(20) NOT NULL DEFAULT 'open',
  location_type VARCHAR(40) NOT NULL,
  occupancy_level VARCHAR(20) NOT NULL DEFAULT 'empty',
  safety_level VARCHAR(20) NOT NULL DEFAULT 'safe',
  is_home BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_location_key UNIQUE (world_id, location_key),
  CONSTRAINT wl_accessibility_check CHECK (
    accessibility_status IN ('open', 'restricted', 'blocked', 'dangerous')
  ),
  CONSTRAINT wl_occupancy_check CHECK (
    occupancy_level IN ('empty', 'sparse', 'moderate', 'crowded')
  ),
  CONSTRAINT wl_safety_check CHECK (
    safety_level IN ('safe', 'caution', 'risky', 'dangerous')
  )
);

CREATE INDEX IF NOT EXISTS wl_world_region_idx ON profile.world_locations (world_id, region_id);
CREATE INDEX IF NOT EXISTS wl_world_idx ON profile.world_locations (world_id);

-- 6. Homes: character residence/aidiyet records linked to locations
CREATE TABLE IF NOT EXISTS profile.world_homes (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  location_id UUID NOT NULL,
  home_type VARCHAR(20) NOT NULL DEFAULT 'permanent',
  display_name VARCHAR(200) NOT NULL,
  residence_type VARCHAR(20) NOT NULL DEFAULT 'primary',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wh_home_type_check CHECK (
    home_type IN ('permanent', 'temporary', 'safe_haven')
  ),
  CONSTRAINT wh_residence_type_check CHECK (
    residence_type IN ('primary', 'secondary', 'guest')
  )
);

CREATE INDEX IF NOT EXISTS wh_world_idx ON profile.world_homes (world_id);
CREATE INDEX IF NOT EXISTS wh_location_idx ON profile.world_homes (location_id);

-- 7. Character Locations: exactly one active location per character
CREATE TABLE IF NOT EXISTS profile.world_character_locations (
  character_id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  location_id UUID NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS wcl_world_idx ON profile.world_character_locations (world_id);
CREATE INDEX IF NOT EXISTS wcl_location_idx ON profile.world_character_locations (location_id);

-- 8. Character Movement Events: immutable audit trail of character movement
CREATE TABLE IF NOT EXISTS profile.world_character_movement_events (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL,
  world_id UUID NOT NULL,
  from_location_id UUID,
  to_location_id UUID NOT NULL,
  move_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wcme_move_type_check CHECK (
    move_type IN ('arrival', 'movement', 'return_home')
  )
);

CREATE INDEX IF NOT EXISTS wcme_character_idx ON profile.world_character_movement_events (character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wcme_world_idx ON profile.world_character_movement_events (world_id);

COMMIT;
