BEGIN;

UPDATE profile.ai_prompt_versions
SET output_schema = output_schema #- '{properties,suggestions,items,properties,adaptationPremise,minLength}',
    updated_at = NOW()
WHERE status = 'active'
  AND prompt_key = 'character_onboarding.compatibility';

COMMIT;
