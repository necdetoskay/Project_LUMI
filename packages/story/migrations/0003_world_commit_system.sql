-- S22-T04: World Commit System schema
-- Append-only commit log + world versioning ledger for story outcome commits.
-- Additive only; forward-only (no rollback).

CREATE TABLE IF NOT EXISTS story.story_commit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL,
  story_session_id UUID NOT NULL,
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  world_version_before INTEGER NOT NULL,
  world_version_after INTEGER NOT NULL,
  world_state_hash VARCHAR(128) NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'committed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_story_commit_version_after_gt_before
    CHECK (world_version_after > world_version_before),
  CONSTRAINT chk_story_commit_status
    CHECK (status IN ('committed', 'compensated'))
);

CREATE INDEX IF NOT EXISTS story_commit_manifest_idx
  ON story.story_commit_records (manifest_id);
CREATE INDEX IF NOT EXISTS story_commit_session_idx
  ON story.story_commit_records (story_session_id, created_at);
CREATE INDEX IF NOT EXISTS story_commit_household_idx
  ON story.story_commit_records (household_id);
CREATE INDEX IF NOT EXISTS story_commit_idempotency_idx
  ON story.story_commit_records (household_id, idempotency_key);

CREATE TABLE IF NOT EXISTS story.story_world_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  current_version VARCHAR(40) NOT NULL DEFAULT '1',
  world_state_hash VARCHAR(128) NOT NULL,
  last_manifest_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS story_world_versions_scope_idx
  ON story.story_world_versions (household_id, world_id);
