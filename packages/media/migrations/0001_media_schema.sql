-- Sprint 15: Media asset metadata, variants, generation meta, references
-- and fingerprint cache. Binary payloads never stored here; only metadata
-- referencing object storage. Forward-only with idempotent guards.

BEGIN;

-- ============================================================
-- 1. Schema and migration ledger
-- ============================================================

CREATE SCHEMA IF NOT EXISTS media;

CREATE TABLE IF NOT EXISTS media._media_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Helper functions for idempotent constraint creation
-- ============================================================

CREATE OR REPLACE FUNCTION media.__media_constraint_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_name
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION media.__media_index_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = p_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Core table: media_assets (metadata only)
-- ============================================================

CREATE TABLE IF NOT EXISTS media.media_assets (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  world_id UUID NOT NULL,
  kind VARCHAR(10) NOT NULL,
  asset_type VARCHAR(40) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_provider VARCHAR(80) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  fingerprint VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- 4. Variants, generation meta, references
-- ============================================================

CREATE TABLE IF NOT EXISTS media.media_asset_variants (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES media.media_assets(id) ON DELETE CASCADE,
  variant_key VARCHAR(40) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  width INTEGER,
  height INTEGER,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media.media_asset_generations (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES media.media_assets(id) ON DELETE CASCADE,
  provider_id VARCHAR(80) NOT NULL,
  model_id VARCHAR(200) NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  seed VARCHAR(100),
  cost_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media.media_asset_references (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES media.media_assets(id) ON DELETE CASCADE,
  reference_type VARCHAR(40) NOT NULL,
  reference_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media.media_fingerprint_cache (
  id UUID PRIMARY KEY,
  fingerprint VARCHAR(64) NOT NULL,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  world_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES media.media_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. Indexes
-- ============================================================

DO $$
BEGIN
  IF NOT media.__media_index_exists('media_assets_scope_idx') THEN
    CREATE INDEX media_assets_scope_idx
      ON media.media_assets (household_id, asset_type);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_index_exists('media_assets_key_idx') THEN
    CREATE INDEX media_assets_key_idx
      ON media.media_assets (storage_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_index_exists('media_assets_fingerprint_idx') THEN
    CREATE INDEX media_assets_fingerprint_idx
      ON media.media_assets (household_id, fingerprint);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_index_exists('media_assets_lifecycle_idx') THEN
    CREATE INDEX media_assets_lifecycle_idx
      ON media.media_assets (lifecycle_status);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_index_exists('media_cache_lookup_idx') THEN
    CREATE INDEX media_cache_lookup_idx
      ON media.media_fingerprint_cache (household_id, child_profile_id, fingerprint);
  END IF;
END $$;

-- ============================================================
-- 6. Check constraints
-- ============================================================

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_media_kind') THEN
    ALTER TABLE media.media_assets
      ADD CONSTRAINT chk_media_kind
      CHECK (kind IN ('image', 'audio'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_media_lifecycle') THEN
    ALTER TABLE media.media_assets
      ADD CONSTRAINT chk_media_lifecycle
      CHECK (lifecycle_status IN ('draft', 'active', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_media_bytes') THEN
    ALTER TABLE media.media_assets
      ADD CONSTRAINT chk_media_bytes
      CHECK (byte_size >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('uq_media_asset_variant') THEN
    ALTER TABLE media.media_asset_variants
      ADD CONSTRAINT uq_media_asset_variant
      UNIQUE (asset_id, variant_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('uq_media_cache_lookup') THEN
    ALTER TABLE media.media_fingerprint_cache
      ADD CONSTRAINT uq_media_cache_lookup
      UNIQUE (household_id, child_profile_id, fingerprint);
  END IF;
END $$;

COMMIT;
