BEGIN;

CREATE TABLE media.assets (
  id UUID PRIMARY KEY,
  storage_provider VARCHAR(40) NOT NULL,
  bucket VARCHAR(120) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  asset_type VARCHAR(40) NOT NULL,
  size_bytes BIGINT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX assets_storage_key_unique_active
  ON media.assets (
    storage_provider,
    bucket,
    storage_key
  )
  WHERE deleted_at IS NULL;

CREATE INDEX assets_type_idx
  ON media.assets (asset_type);

CREATE INDEX assets_created_at_idx
  ON media.assets (created_at);

CREATE TABLE media.asset_variants (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL
    REFERENCES media.assets(id)
    ON DELETE CASCADE,
  variant_code VARCHAR(80) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT asset_variants_asset_code_unique
    UNIQUE (asset_id, variant_code)
);

CREATE INDEX asset_variants_asset_idx
  ON media.asset_variants (asset_id);

CREATE TABLE world.biomes (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE world.universes (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX universes_household_slug_unique_active
  ON world.universes (household_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX universes_household_idx
  ON world.universes (household_id);

CREATE TABLE world.worlds (
  id UUID PRIMARY KEY,
  universe_id UUID NOT NULL
    REFERENCES world.universes(id)
    ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  cover_asset_id UUID
    REFERENCES media.assets(id)
    ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT worlds_status_check CHECK (
    status IN ('draft', 'active', 'paused', 'archived')
  )
);

CREATE UNIQUE INDEX worlds_universe_slug_unique_active
  ON world.worlds (universe_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX worlds_universe_idx
  ON world.worlds (universe_id);

CREATE INDEX worlds_cover_asset_idx
  ON world.worlds (cover_asset_id);

CREATE TABLE world.regions (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL
    REFERENCES world.worlds(id)
    ON DELETE CASCADE,
  parent_region_id UUID
    REFERENCES world.regions(id)
    ON DELETE SET NULL,
  biome_id UUID
    REFERENCES world.biomes(id)
    ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  map_asset_id UUID
    REFERENCES media.assets(id)
    ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX regions_world_slug_unique_active
  ON world.regions (world_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX regions_world_idx
  ON world.regions (world_id);

CREATE INDEX regions_parent_idx
  ON world.regions (parent_region_id);

CREATE INDEX regions_biome_idx
  ON world.regions (biome_id);

CREATE TABLE world.locations (
  id UUID PRIMARY KEY,
  region_id UUID NOT NULL
    REFERENCES world.regions(id)
    ON DELETE CASCADE,
  parent_location_id UUID
    REFERENCES world.locations(id)
    ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  location_type VARCHAR(60) NOT NULL DEFAULT 'place',
  image_asset_id UUID
    REFERENCES media.assets(id)
    ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX locations_region_slug_unique_active
  ON world.locations (region_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX locations_region_idx
  ON world.locations (region_id);

CREATE INDEX locations_parent_idx
  ON world.locations (parent_location_id);

CREATE INDEX locations_type_idx
  ON world.locations (location_type);

CREATE TABLE world.location_connections (
  source_location_id UUID NOT NULL
    REFERENCES world.locations(id)
    ON DELETE CASCADE,
  target_location_id UUID NOT NULL
    REFERENCES world.locations(id)
    ON DELETE CASCADE,
  connection_type VARCHAR(60) NOT NULL DEFAULT 'path',
  travel_cost REAL NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT location_connections_pk PRIMARY KEY (
    source_location_id,
    target_location_id
  ),
  CONSTRAINT location_connections_not_self_check CHECK (
    source_location_id <> target_location_id
  ),
  CONSTRAINT location_connections_travel_cost_check CHECK (
    travel_cost >= 0
  )
);

CREATE INDEX location_connections_target_idx
  ON world.location_connections (target_location_id);

CREATE TABLE world.world_states (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL
    REFERENCES world.worlds(id)
    ON DELETE CASCADE,
  effective_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX world_states_world_effective_idx
  ON world.world_states (world_id, effective_at);

CREATE TABLE world.world_calendars (
  world_id UUID PRIMARY KEY
    REFERENCES world.worlds(id)
    ON DELETE CASCADE,
  calendar_code VARCHAR(80) NOT NULL DEFAULT 'default',
  days_per_year INTEGER NOT NULL DEFAULT 360,
  hours_per_day INTEGER NOT NULL DEFAULT 24,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT world_calendars_days_per_year_check CHECK (
    days_per_year BETWEEN 1 AND 10000
  ),
  CONSTRAINT world_calendars_hours_per_day_check CHECK (
    hours_per_day BETWEEN 1 AND 100
  )
);

ALTER TABLE profile.child_profiles
  ADD CONSTRAINT child_profiles_avatar_asset_fk
  FOREIGN KEY (avatar_asset_id)
  REFERENCES media.assets(id)
  ON DELETE SET NULL;

COMMIT;
