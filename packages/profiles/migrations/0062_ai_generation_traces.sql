BEGIN;
CREATE TABLE IF NOT EXISTS profile.ai_generation_traces (
 id UUID PRIMARY KEY,
 household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
 child_profile_id UUID REFERENCES profile.child_profiles(id) ON DELETE SET NULL,
 creation_cycle_id UUID REFERENCES profile.character_creation_cycles(id) ON DELETE SET NULL,
 task_type VARCHAR(80) NOT NULL,
 prompt_key VARCHAR(160) NOT NULL,
 prompt_version INTEGER NOT NULL,
 provider VARCHAR(40) NOT NULL,
 model_id TEXT NOT NULL,
 input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
 output_payload JSONB,
 validation_status VARCHAR(20) NOT NULL,
 prompt_tokens INTEGER,
 completion_tokens INTEGER,
 total_tokens INTEGER,
 latency_ms INTEGER NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT ai_generation_traces_validation_check CHECK (validation_status IN ('valid','invalid'))
);
CREATE INDEX IF NOT EXISTS ai_generation_traces_cycle_idx ON profile.ai_generation_traces(creation_cycle_id, created_at);
CREATE INDEX IF NOT EXISTS ai_generation_traces_prompt_idx ON profile.ai_generation_traces(prompt_key, prompt_version);
COMMIT;
