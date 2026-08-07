-- S27-T02/T04: Story hook persistence schema.
-- One row = one story hook produced from an accepted NPC interaction
-- opportunity. Additive only; forward-only (no rollback).
-- S27-T04: an outbox delivery intent is enqueued after hook creation.

CREATE TABLE IF NOT EXISTS story.story_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  story_session_id UUID NOT NULL,
  world_id UUID NOT NULL,
  opportunity_id VARCHAR(255) NOT NULL,
  hook_type VARCHAR(40) NOT NULL,
  source_npc_id UUID NOT NULL,
  target_npc_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  scene_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  CONSTRAINT chk_story_hook_status
    CHECK (status IN ('pending', 'delivered', 'consumed', 'expired'))
);

CREATE INDEX IF NOT EXISTS story_hook_opportunity_idx
  ON story.story_hooks (opportunity_id);
CREATE INDEX IF NOT EXISTS story_hook_session_idx
  ON story.story_hooks (story_session_id);
CREATE INDEX IF NOT EXISTS story_hook_household_idx
  ON story.story_hooks (household_id);