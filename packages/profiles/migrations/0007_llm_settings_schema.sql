-- Sprint 07: LLM provider settings and task model configuration
-- Forward-only migration.

BEGIN;

CREATE TABLE IF NOT EXISTS profile.llm_provider_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  encrypted_api_key TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_llm_provider_settings_user_household_provider
  ON profile.llm_provider_settings (user_id, household_id, provider);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_provider_settings_provider_check'
  ) THEN
    ALTER TABLE profile.llm_provider_settings
      ADD CONSTRAINT llm_provider_settings_provider_check
      CHECK (provider IN ('openrouter'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profile.llm_task_model_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  task_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  reasoning_level TEXT NOT NULL DEFAULT 'medium',
  temperature REAL NOT NULL DEFAULT 0.8,
  max_output_tokens INTEGER NOT NULL DEFAULT 1800,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_llm_task_model_settings_user_household_provider_task
  ON profile.llm_task_model_settings (user_id, household_id, provider, task_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_task_model_settings_provider_check'
  ) THEN
    ALTER TABLE profile.llm_task_model_settings
      ADD CONSTRAINT llm_task_model_settings_provider_check
      CHECK (provider IN ('openrouter'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_task_model_settings_task_type_check'
  ) THEN
    ALTER TABLE profile.llm_task_model_settings
      ADD CONSTRAINT llm_task_model_settings_task_type_check
      CHECK (task_type IN (
        'character_origin_generation',
        'story_outline_generation',
        'story_turn_generation',
        'safety_review',
        'character_memory_summary',
        'parent_explanation'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_task_model_settings_reasoning_check'
  ) THEN
    ALTER TABLE profile.llm_task_model_settings
      ADD CONSTRAINT llm_task_model_settings_reasoning_check
      CHECK (reasoning_level IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_task_model_settings_temp_check'
  ) THEN
    ALTER TABLE profile.llm_task_model_settings
      ADD CONSTRAINT llm_task_model_settings_temp_check
      CHECK (temperature >= 0 AND temperature <= 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_task_model_settings_tokens_check'
  ) THEN
    ALTER TABLE profile.llm_task_model_settings
      ADD CONSTRAINT llm_task_model_settings_tokens_check
      CHECK (max_output_tokens >= 256 AND max_output_tokens <= 8000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_task_model_settings_model_id_length'
  ) THEN
    ALTER TABLE profile.llm_task_model_settings
      ADD CONSTRAINT llm_task_model_settings_model_id_length
      CHECK (char_length(model_id) >= 1 AND char_length(model_id) <= 160);
  END IF;
END $$;

COMMIT;
