ALTER TABLE profile.llm_task_model_settings
  DROP CONSTRAINT IF EXISTS llm_task_model_settings_task_type_check;

ALTER TABLE profile.llm_task_model_settings
  ADD CONSTRAINT llm_task_model_settings_task_type_check
  CHECK (task_type IN (
    'character_origin_generation',
    'character_world_suggestions',
    'world_character_suggestions',
    'character_identity_suggestions',
    'character_origin_suggestions',
    'character_world_compatibility',
    'character_region_suggestions',
    'character_core_saga',
    'character_genesis',
    'genesis_divergence',
    'genesis_evaluation',
    'saga_foundation',
    'social_ecology_generation',
    'living_world_bootstrap',
    'adventure_opportunity_generation',
    'story_outline_generation',
    'story_turn_generation',
    'safety_review',
    'character_memory_summary',
    'parent_explanation'
  ));
