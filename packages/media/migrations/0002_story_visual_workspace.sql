-- Story Visual Workspace persistence.
-- Stores manifest/read-model metadata only; binary image payloads remain in object storage.

BEGIN;

CREATE TABLE IF NOT EXISTS media.story_visual_manifests (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  world_id UUID NOT NULL,
  story_id UUID NOT NULL,
  schema_version INTEGER NOT NULL,
  source VARCHAR(32) NOT NULL,
  manifest_fingerprint VARCHAR(64) NOT NULL,
  manifest_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media.story_visual_asset_sets (
  id UUID PRIMARY KEY,
  manifest_id UUID NOT NULL REFERENCES media.story_visual_manifests(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  world_id UUID NOT NULL,
  story_id UUID NOT NULL,
  manifest_fingerprint VARCHAR(64) NOT NULL,
  style_id VARCHAR(120) NOT NULL,
  style_version INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media.story_visual_asset_set_renders (
  id UUID PRIMARY KEY,
  asset_set_id UUID NOT NULL REFERENCES media.story_visual_asset_sets(id) ON DELETE CASCADE,
  target_kind VARCHAR(24) NOT NULL,
  target_id VARCHAR(160) NOT NULL,
  manifest_entity_id VARCHAR(160),
  resolved_entity_id VARCHAR(160),
  variant_id VARCHAR(160),
  state_id VARCHAR(160),
  render_fingerprint VARCHAR(64) NOT NULL,
  asset_id UUID REFERENCES media.media_assets(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_story_visual_manifest_fingerprint
  ON media.story_visual_manifests (household_id, story_id, manifest_fingerprint);

CREATE INDEX IF NOT EXISTS story_visual_manifest_story_idx
  ON media.story_visual_manifests (household_id, story_id, created_at DESC);

CREATE INDEX IF NOT EXISTS story_visual_asset_set_story_idx
  ON media.story_visual_asset_sets (household_id, story_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_story_visual_active_asset_set
  ON media.story_visual_asset_sets (household_id, story_id)
  WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_story_visual_asset_set_render
  ON media.story_visual_asset_set_renders (asset_set_id, render_fingerprint);

CREATE INDEX IF NOT EXISTS story_visual_asset_set_render_status_idx
  ON media.story_visual_asset_set_renders (asset_set_id, status);

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_story_visual_manifest_source') THEN
    ALTER TABLE media.story_visual_manifests
      ADD CONSTRAINT chk_story_visual_manifest_source
      CHECK (source IN ('story-generation', 'story-edit', 'backfill'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_story_visual_asset_set_status') THEN
    ALTER TABLE media.story_visual_asset_sets
      ADD CONSTRAINT chk_story_visual_asset_set_status
      CHECK (status IN ('planned', 'generating', 'ready', 'partial', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_story_visual_render_target_kind') THEN
    ALTER TABLE media.story_visual_asset_set_renders
      ADD CONSTRAINT chk_story_visual_render_target_kind
      CHECK (target_kind IN ('entity-render', 'story-illustration'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('chk_story_visual_render_status') THEN
    ALTER TABLE media.story_visual_asset_set_renders
      ADD CONSTRAINT chk_story_visual_render_status
      CHECK (status IN ('planned', 'reused', 'missing', 'generating', 'ready', 'failed'));
  END IF;
END $$;

COMMIT;
