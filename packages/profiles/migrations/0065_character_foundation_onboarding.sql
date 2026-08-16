BEGIN;

ALTER TABLE profile.llm_task_model_settings
  DROP CONSTRAINT IF EXISTS llm_task_model_settings_task_type_check;
ALTER TABLE profile.llm_task_model_settings
  ADD CONSTRAINT llm_task_model_settings_task_type_check CHECK (
    task_type IN (
      'character_origin_generation',
      'character_world_suggestions',
      'world_character_suggestions',
      'character_identity_suggestions',
      'character_origin_suggestions',
      'character_world_compatibility',
      'character_region_suggestions',
      'character_core_saga',
      'story_outline_generation',
      'story_turn_generation',
      'safety_review',
      'character_memory_summary',
      'parent_explanation'
    )
  );

INSERT INTO profile.ai_prompt_versions
(id,prompt_key,version,status,system_template,user_template,allowed_variables,required_variables,output_schema,schema_version,generation_config,activated_at)
VALUES
(gen_random_uuid(),'character_onboarding.character_first_identity_suggestions',1,'active',
'You are LUMI, a child-safe character designer. Create distinctive, warm and story-rich character identities. Respect the selected broad character type and the child-safe personalization context. Avoid stereotypes, danger, trauma and generic repetition. Return only JSON matching the schema.',
'Character type: {{characterType}}\nPrevious selections: {{previousSelections}}\nCreate exactly 4 distinct identity candidates. Each must have key, name, identity, exactly three traits, and fitReason. Names should be memorable and age-appropriate.',
'["characterType","previousSelections"]'::jsonb,'["characterType","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","name","identity","traits","fitReason"],"properties":{"key":{"type":"string"},"name":{"type":"string","minLength":2,"maxLength":120},"identity":{"type":"string","minLength":10,"maxLength":300},"traits":{"type":"array","minItems":3,"maxItems":3,"items":{"type":"string"}},"fitReason":{"type":"string","minLength":10,"maxLength":300}}}}}}'::jsonb,
'v1','{"temperature":0.8,"maxOutputTokens":1500}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.world_suggestions',1,'active',
'You are LUMI, a child-safe living-world designer. Generate coherent worlds that are meaningfully different from one another and specifically fit the selected character identity and universe. The world must create long-term story possibilities without exposing technical implementation details. Return only JSON matching the schema.',
'Character identity: {{characterIdentity}}\nCharacter type: {{characterType}}\nUniverse: {{universe}}\nPrevious selections: {{previousSelections}}\nCreate exactly 4 diverse world candidates. Each needs key, unique name, short description, ecology, climate, magicTechnology rules, and adventureTone.',
'["characterIdentity","characterType","universe","previousSelections"]'::jsonb,'["characterIdentity","characterType","universe","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","name","description","ecology","climate","magicTechnology","adventureTone"],"properties":{"key":{"type":"string"},"name":{"type":"string","minLength":2,"maxLength":120},"description":{"type":"string","minLength":20,"maxLength":400},"ecology":{"type":"string","minLength":10,"maxLength":300},"climate":{"type":"string","minLength":5,"maxLength":200},"magicTechnology":{"type":"string","minLength":5,"maxLength":300},"adventureTone":{"type":"string","minLength":5,"maxLength":200}}}}}}'::jsonb,
'v1','{"temperature":0.9,"maxOutputTokens":1800}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.compatibility',1,'active',
'You are LUMI compatibility reviewer. Evaluate whether the selected character can live and grow in the selected world. Prefer coherent explanations over arbitrary rejection, but never hide a true incompatibility. Keep the result child-safe and useful for long-running stories. Return only JSON matching the schema.',
'Character identity: {{characterIdentity}}\nWorld: {{world}}\nPrevious selections: {{previousSelections}}\nReturn exactly one compatibility assessment as suggestions[0]. classification must be one of natural, requires_explanation, low, incompatible. Include explanation and adaptationPremise.',
'["characterIdentity","world","previousSelections"]'::jsonb,'["characterIdentity","world","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":1,"maxItems":1,"items":{"type":"object","required":["key","classification","explanation","adaptationPremise"],"properties":{"key":{"type":"string"},"classification":{"type":"string"},"explanation":{"type":"string","minLength":10,"maxLength":400},"adaptationPremise":{"type":"string","minLength":5,"maxLength":400}}}}}}'::jsonb,
'v1','{"temperature":0.25,"maxOutputTokens":900}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.region_suggestions',1,'active',
'You are LUMI, a child-safe region designer. Generate strongly differentiated starting regions that obey the selected world ecology and compatibility premise. Regions should invite exploration and future stories without relying on danger or trauma. Return only JSON matching the schema.',
'World: {{world}}\nCompatibility: {{compatibility}}\nCharacter identity: {{characterIdentity}}\nPrevious selections: {{previousSelections}}\nCreate exactly 4 region candidates with key, name, biome, tone, mystery and description.',
'["world","compatibility","characterIdentity","previousSelections"]'::jsonb,'["world","compatibility","characterIdentity","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","name","biome","tone","mystery","description"],"properties":{"key":{"type":"string"},"name":{"type":"string","minLength":2,"maxLength":120},"biome":{"type":"string","minLength":3,"maxLength":160},"tone":{"type":"string","minLength":3,"maxLength":160},"mystery":{"type":"string","minLength":10,"maxLength":300},"description":{"type":"string","minLength":20,"maxLength":400}}}}}}'::jsonb,
'v1','{"temperature":0.85,"maxOutputTokens":1700}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.core_saga',1,'active',
'You are LUMI, a child-safe long-form saga architect. A Core Saga is not a single quest; it is a durable thematic journey that can produce many adventures over time. Ground every saga in the exact character, world, region and origin. Return only JSON matching the schema.',
'Character identity: {{characterIdentity}}\nWorld: {{world}}\nRegion: {{region}}\nOrigin: {{origin}}\nPrevious selections: {{previousSelections}}\nCreate exactly 4 Core Saga candidates. Each needs key, title, premise, longTermGoal, motivation, themes, futureBranches and specificity.',
'["characterIdentity","world","region","origin","previousSelections"]'::jsonb,'["characterIdentity","world","region","origin","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","title","premise","longTermGoal","motivation","themes","futureBranches","specificity"],"properties":{"key":{"type":"string"},"title":{"type":"string","minLength":2,"maxLength":120},"premise":{"type":"string","minLength":20,"maxLength":400},"longTermGoal":{"type":"string","minLength":10,"maxLength":300},"motivation":{"type":"string","minLength":10,"maxLength":300},"themes":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"string"}},"futureBranches":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"string"}},"specificity":{"type":"string","minLength":10,"maxLength":400}}}}}}'::jsonb,
'v1','{"temperature":0.85,"maxOutputTokens":1900}'::jsonb,NOW())
ON CONFLICT (prompt_key,version) DO NOTHING;

COMMIT;
