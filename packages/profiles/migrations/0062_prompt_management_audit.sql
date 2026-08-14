BEGIN;

CREATE TABLE IF NOT EXISTS profile.ai_prompt_audit_log (
  id UUID PRIMARY KEY,
  prompt_key VARCHAR(160) NOT NULL,
  prompt_version INTEGER NOT NULL,
  action VARCHAR(40) NOT NULL,
  actor_user_id UUID,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_prompt_audit_log_action_check
    CHECK (action IN ('draft_created','activated','rollback'))
);

CREATE INDEX IF NOT EXISTS ai_prompt_audit_log_prompt_idx
  ON profile.ai_prompt_audit_log(prompt_key, created_at DESC);

COMMIT;
