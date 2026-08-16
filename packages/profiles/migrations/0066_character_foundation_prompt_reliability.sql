BEGIN;

UPDATE profile.ai_prompt_versions
SET status='archived', updated_at=NOW()
WHERE prompt_key IN (
  'character_onboarding.world_suggestions',
  'character_onboarding.region_suggestions',
  'character_onboarding.character_origin_suggestions',
  'character_onboarding.core_saga'
) AND status='active';

INSERT INTO profile.ai_prompt_versions
(id,prompt_key,version,status,system_template,user_template,allowed_variables,required_variables,output_schema,schema_version,generation_config,activated_at)
VALUES
(gen_random_uuid(),'character_onboarding.world_suggestions',2,'active',
'You are LUMI, a child-safe living-world designer. Create coherent, strongly differentiated worlds that specifically fit the selected character identity and universe. Be concise. Return JSON only, with one root property named suggestions. Never add prose before or after the JSON.',
'Character identity: {{characterIdentity}}\nCharacter type: {{characterType}}\nUniverse: {{universe}}\nPrevious selections: {{previousSelections}}\nReturn exactly {"suggestions":[4 world objects]}. Each object must contain key, name, description, ecology, climate, magicTechnology, adventureTone. Keep description under 55 words, ecology under 35 words, climate under 18 words, magicTechnology under 30 words, adventureTone under 18 words.',
'["characterIdentity","characterType","universe","previousSelections"]'::jsonb,'["characterIdentity","characterType","universe","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","name","description","ecology","climate","magicTechnology","adventureTone"],"properties":{"key":{"type":"string"},"name":{"type":"string","minLength":2,"maxLength":120},"description":{"type":"string","minLength":20,"maxLength":400},"ecology":{"type":"string","minLength":10,"maxLength":300},"climate":{"type":"string","minLength":5,"maxLength":200},"magicTechnology":{"type":"string","minLength":5,"maxLength":300},"adventureTone":{"type":"string","minLength":5,"maxLength":200}}}}}}'::jsonb,
'v1','{"temperature":0.75,"maxOutputTokens":3000}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.region_suggestions',2,'active',
'You are LUMI, a child-safe region designer. Create strongly differentiated starting regions that obey the selected world ecology and compatibility premise. Be concise and concrete. Return JSON only, with one root property named suggestions.',
'World: {{world}}\nCompatibility: {{compatibility}}\nCharacter identity: {{characterIdentity}}\nPrevious selections: {{previousSelections}}\nReturn exactly {"suggestions":[4 region objects]}. Each object must contain key, name, biome, tone, mystery, description. Keep biome and tone under 15 words, mystery under 35 words and description under 55 words.',
'["world","compatibility","characterIdentity","previousSelections"]'::jsonb,'["world","compatibility","characterIdentity","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","name","biome","tone","mystery","description"],"properties":{"key":{"type":"string"},"name":{"type":"string","minLength":2,"maxLength":120},"biome":{"type":"string","minLength":3,"maxLength":160},"tone":{"type":"string","minLength":3,"maxLength":160},"mystery":{"type":"string","minLength":10,"maxLength":300},"description":{"type":"string","minLength":20,"maxLength":400}}}}}}'::jsonb,
'v1','{"temperature":0.75,"maxOutputTokens":2600}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.character_origin_suggestions',2,'active',
'You are LUMI, a child-safe imaginative character worldbuilder. Create origins grounded in the selected character, world and region without tragedy, fear, abandonment or harmful stereotypes. Be concise. Return JSON only, with one root property named suggestions.',
'World feeling or selected world: {{worldFeeling}}\nCharacter/world grounding: {{characterArchetype}}\nCharacter identity: {{characterIdentity}}\nPrevious onboarding selections: {{previousSelections}}\nReturn exactly {"suggestions":[4 origin objects]}. Each object must contain key, title, origin, home, formativeExperience, storyHook. Keep origin under 65 words; every other prose field under 35 words.',
'["worldFeeling","characterArchetype","characterIdentity","previousSelections"]'::jsonb,'["worldFeeling","characterArchetype","characterIdentity","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","title","origin","home","formativeExperience","storyHook"],"properties":{"key":{"type":"string"},"title":{"type":"string"},"origin":{"type":"string"},"home":{"type":"string"},"formativeExperience":{"type":"string"},"storyHook":{"type":"string"}}}}}}'::jsonb,
'v1','{"temperature":0.75,"maxOutputTokens":2800}'::jsonb,NOW()),

(gen_random_uuid(),'character_onboarding.core_saga',2,'active',
'You are LUMI, a child-safe long-form saga architect. A Core Saga is a durable thematic journey that can produce many adventures. Ground it in the exact character, world, region and origin. Be concise. Return JSON only, with one root property named suggestions.',
'Character identity: {{characterIdentity}}\nWorld: {{world}}\nRegion: {{region}}\nOrigin: {{origin}}\nPrevious selections: {{previousSelections}}\nReturn exactly {"suggestions":[4 saga objects]}. Each must contain key, title, premise, longTermGoal, motivation, themes, futureBranches, specificity. Use 2-4 short themes and 2-4 short futureBranches. Keep premise and specificity under 55 words and other prose fields under 35 words.',
'["characterIdentity","world","region","origin","previousSelections"]'::jsonb,'["characterIdentity","world","region","origin","previousSelections"]'::jsonb,
'{"type":"object","required":["suggestions"],"properties":{"suggestions":{"type":"array","minItems":4,"maxItems":4,"items":{"type":"object","required":["key","title","premise","longTermGoal","motivation","themes","futureBranches","specificity"],"properties":{"key":{"type":"string"},"title":{"type":"string","minLength":2,"maxLength":120},"premise":{"type":"string","minLength":20,"maxLength":400},"longTermGoal":{"type":"string","minLength":10,"maxLength":300},"motivation":{"type":"string","minLength":10,"maxLength":300},"themes":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"string"}},"futureBranches":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"string"}},"specificity":{"type":"string","minLength":10,"maxLength":400}}}}}}'::jsonb,
'v1','{"temperature":0.75,"maxOutputTokens":3400}'::jsonb,NOW())
ON CONFLICT (prompt_key,version) DO NOTHING;

COMMIT;
