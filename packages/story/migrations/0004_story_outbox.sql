-- S23-T01: Indirect-effect outbox schema.
-- Append-only intent queue; enqueued atomically with the producing commit.
-- Additive only; forward-only (no rollback).

CREATE TABLE IF NOT EXISTS story.story_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  commit_id UUID NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  intent_type VARCHAR(60) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_ref VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count VARCHAR(20) NOT NULL DEFAULT '0',
  last_error VARCHAR(400),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_story_outbox_status
    CHECK (status IN ('pending', 'processing', 'applied', 'failed'))
);

CREATE INDEX IF NOT EXISTS story_outbox_pending_idx
  ON story.story_outbox (household_id, status, created_at);
CREATE INDEX IF NOT EXISTS story_outbox_commit_idx
  ON story.story_outbox (commit_id);
CREATE INDEX IF NOT EXISTS story_outbox_idempotency_idx
  ON story.story_outbox (household_id, idempotency_key);
