-- Data Integrity Hardening: bind fingerprint-cache rows to the exact media asset scope.
--
-- media_fingerprint_cache duplicates household/child/world/fingerprint fields for lookup
-- performance. Those duplicated values must describe the same asset referenced by asset_id.
-- Fail closed if historical drift exists, then enforce the invariant for every writer.

DO $$
DECLARE
  violation_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM media.media_fingerprint_cache AS cache
  LEFT JOIN media.media_assets AS asset
    ON asset.id = cache.asset_id
  WHERE asset.id IS NULL
     OR asset.household_id IS DISTINCT FROM cache.household_id
     OR asset.child_profile_id IS DISTINCT FROM cache.child_profile_id
     OR asset.world_id IS DISTINCT FROM cache.world_id
     OR asset.fingerprint IS DISTINCT FROM cache.fingerprint;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'Media fingerprint cache asset scope mismatch: % invalid row(s)',
      violation_count;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_cache_scope
  ON media.media_assets (
    id,
    household_id,
    child_profile_id,
    world_id,
    fingerprint
  );

ALTER TABLE media.media_fingerprint_cache
  DROP CONSTRAINT IF EXISTS media_fingerprint_cache_asset_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'media.media_fingerprint_cache'::regclass
      AND conname = 'media_fingerprint_cache_asset_scope_fk'
  ) THEN
    ALTER TABLE media.media_fingerprint_cache
      ADD CONSTRAINT media_fingerprint_cache_asset_scope_fk
      FOREIGN KEY (
        asset_id,
        household_id,
        child_profile_id,
        world_id,
        fingerprint
      )
      REFERENCES media.media_assets (
        id,
        household_id,
        child_profile_id,
        world_id,
        fingerprint
      )
      ON DELETE CASCADE
      NOT VALID;

    ALTER TABLE media.media_fingerprint_cache
      VALIDATE CONSTRAINT media_fingerprint_cache_asset_scope_fk;
  END IF;
END
$$;
