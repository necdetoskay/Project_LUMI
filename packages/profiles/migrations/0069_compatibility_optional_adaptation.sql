BEGIN;

UPDATE profile.ai_prompt_versions
SET output_schema = jsonb_set(
      output_schema,
      '{properties,suggestions,items,required}',
      '["key","classification","explanation"]'::jsonb,
      false
    ),
    user_template = replace(
      user_template,
      'Include explanation and adaptationPremise.',
      'Include explanation. Include adaptationPremise only when the classification requires an adaptation or explanation.'
    ),
    updated_at = NOW()
WHERE status = 'active'
  AND prompt_key = 'character_onboarding.compatibility';

COMMIT;
