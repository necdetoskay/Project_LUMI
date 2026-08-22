-- PR-8 / Data Integrity Hardening

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_child_scope_fk') THEN
    ALTER TABLE media.media_assets
      ADD CONSTRAINT media_assets_child_scope_fk
      FOREIGN KEY (child_profile_id, household_id)
      REFERENCES profile.child_profiles (id, household_id) NOT VALID;
    ALTER TABLE media.media_assets VALIDATE CONSTRAINT media_assets_child_scope_fk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_world_scope_fk') THEN
    ALTER TABLE media.media_assets
      ADD CONSTRAINT media_assets_world_scope_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id) NOT VALID;
    ALTER TABLE media.media_assets VALIDATE CONSTRAINT media_assets_world_scope_fk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_dimensions_check') THEN
    ALTER TABLE media.media_assets
      ADD CONSTRAINT media_assets_dimensions_check CHECK (
        (width IS NULL OR width > 0)
        AND (height IS NULL OR height > 0)
        AND (duration_seconds IS NULL OR duration_seconds >= 0)
        AND version >= 1
      ) NOT VALID;
    ALTER TABLE media.media_assets VALIDATE CONSTRAINT media_assets_dimensions_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_generation_cost_check') THEN
    ALTER TABLE media.media_asset_generations
      ADD CONSTRAINT media_generation_cost_check CHECK (cost_usd >= 0) NOT VALID;
    ALTER TABLE media.media_asset_generations VALIDATE CONSTRAINT media_generation_cost_check;
  END IF;
END
$$;
