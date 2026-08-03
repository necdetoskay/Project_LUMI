-- Sprint 12: AI generation usage/cost records schema
-- Forward-only migration with idempotent guards.
-- Records cost/token/latency without storing child story text.

BEGIN;

-- ============================================================
-- 1. Schema and migration ledger
-- ============================================================

CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS ai._ai_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Helper function for idempotent constraint creation
-- ============================================================

CREATE OR REPLACE FUNCTION ai.__ai_constraint_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Core table
-- ============================================================

CREATE TABLE IF NOT EXISTS ai.generation_usage (
  id UUID PRIMARY KEY,
  request_id VARCHAR(200) NOT NULL,
  provider_id VARCHAR(80) NOT NULL,
  model_id VARCHAR(200) NOT NULL,
  task VARCHAR(40) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  attempt INTEGER NOT NULL DEFAULT 1,
  outcome VARCHAR(10) NOT NULL,
  failure_state VARCHAR(40),
  validation_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  child_content BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. Indexes
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'gen_usage_request_idx'
  ) THEN
    CREATE INDEX gen_usage_request_idx ON ai.generation_usage (request_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'gen_usage_model_idx'
  ) THEN
    CREATE INDEX gen_usage_model_idx ON ai.generation_usage (model_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'gen_usage_created_idx'
  ) THEN
    CREATE INDEX gen_usage_created_idx ON ai.generation_usage (created_at);
  END IF;
END $$;

-- ============================================================
-- 5. Check constraints
-- ============================================================

DO $$
BEGIN
  IF NOT ai.__ai_constraint_exists('chk_gen_usage_task') THEN
    ALTER TABLE ai.generation_usage
      ADD CONSTRAINT chk_gen_usage_task
      CHECK (task IN ('origin_candidate', 'story_scene', 'story_dialogue', 'choice_proposal', 'reflection_qa'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT ai.__ai_constraint_exists('chk_gen_usage_outcome') THEN
    ALTER TABLE ai.generation_usage
      ADD CONSTRAINT chk_gen_usage_outcome
      CHECK (outcome IN ('success', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT ai.__ai_constraint_exists('chk_gen_usage_tokens') THEN
    ALTER TABLE ai.generation_usage
      ADD CONSTRAINT chk_gen_usage_tokens
      CHECK (input_tokens >= 0 AND output_tokens >= 0 AND total_tokens >= 0);
  END IF;
END $$;

COMMIT;
