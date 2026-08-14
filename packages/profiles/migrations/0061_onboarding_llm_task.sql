BEGIN;
ALTER TABLE profile.llm_task_model_settings DROP CONSTRAINT IF EXISTS llm_task_model_settings_task_type_check;
ALTER TABLE profile.llm_task_model_settings ADD CONSTRAINT llm_task_model_settings_task_type_check CHECK (task_type IN ('character_origin_generation','character_world_suggestions','world_character_suggestions','story_outline_generation','story_turn_generation','safety_review','character_memory_summary','parent_explanation'));
COMMIT;
