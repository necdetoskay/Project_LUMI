BEGIN;

UPDATE profile.ai_prompt_versions
SET generation_config = jsonb_set(
      COALESCE(generation_config, '{}'::jsonb),
      '{maxOutputTokens}',
      '7000'::jsonb,
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
