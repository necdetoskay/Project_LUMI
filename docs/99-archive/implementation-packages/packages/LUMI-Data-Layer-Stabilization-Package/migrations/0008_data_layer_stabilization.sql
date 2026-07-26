BEGIN;

CREATE INDEX IF NOT EXISTS characters_world_idx
  ON character.characters(world_id);

CREATE INDEX IF NOT EXISTS characters_child_profile_idx
  ON character.characters(child_profile_id);

CREATE INDEX IF NOT EXISTS characters_location_idx
  ON character.characters(current_location_id);

CREATE INDEX IF NOT EXISTS story_sessions_child_idx
  ON story.story_sessions(child_profile_id);

CREATE INDEX IF NOT EXISTS story_sessions_version_idx
  ON story.story_sessions(story_version_id);

CREATE INDEX IF NOT EXISTS memories_world_time_idx
  ON memory.memories(world_id, occurred_at);

CREATE INDEX IF NOT EXISTS simulation_runs_world_created_idx
  ON simulation.simulation_runs(world_id, created_at);

CREATE INDEX IF NOT EXISTS outbox_events_status_available_idx
  ON system.outbox_events(status, available_at);

CREATE INDEX IF NOT EXISTS audit_logs_entity_time_idx
  ON audit.audit_logs(entity_type, entity_id, occurred_at);

CREATE INDEX IF NOT EXISTS generation_requests_status_idx
  ON ai.generation_requests(status);

ALTER TABLE ai.generation_attempts
  ADD CONSTRAINT generation_attempts_request_number_unique
  UNIQUE (generation_request_id, attempt_number);

ALTER TABLE system.job_attempts
  ADD CONSTRAINT job_attempts_job_number_unique
  UNIQUE (job_id, attempt_number);

ALTER TABLE memory.memory_subjects
  ADD CONSTRAINT memory_subjects_relevance_weight_check
  CHECK (relevance_weight BETWEEN 0 AND 1);

ALTER TABLE ai.token_usage
  ADD CONSTRAINT token_usage_non_negative_check
  CHECK (
    input_tokens >= 0
    AND output_tokens >= 0
    AND cached_input_tokens >= 0
    AND reasoning_tokens >= 0
  );

ALTER TABLE ai.cost_records
  ADD CONSTRAINT cost_records_non_negative_check
  CHECK (amount >= 0);

ALTER TABLE system.outbox_events
  ADD CONSTRAINT outbox_events_attempts_non_negative_check
  CHECK (attempts >= 0);

COMMIT;
