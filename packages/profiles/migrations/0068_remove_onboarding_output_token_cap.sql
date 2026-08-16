BEGIN;

ALTER TABLE profile.llm_task_model_settings
  DROP CONSTRAINT IF EXISTS llm_task_model_settings_tokens_check;
ALTER TABLE profile.llm_task_model_settings
  ADD CONSTRAINT llm_task_model_settings_tokens_check
  CHECK (max_output_tokens >= 256);

UPDATE profile.ai_prompt_versions
SET generation_config = jsonb_set(
      COALESCE(generation_config, '{}'::jsonb),
      '{maxOutputTokens}',
      'null'::jsonb,
      true
    ),
    updated_at = NOW()
WHERE status = 'active'
  AND prompt_key IN (
    'character_onboarding.character_first_identity_suggestions',
    'character_onboarding.world_suggestions',
    'character_onboarding.compatibility',
    'character_onboarding.region_suggestions',
    'character_onboarding.character_origin_suggestions',
    'character_onboarding.core_saga'
  );

COMMIT;
