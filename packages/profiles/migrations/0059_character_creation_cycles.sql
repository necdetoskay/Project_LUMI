BEGIN;
CREATE SCHEMA IF NOT EXISTS profile;
CREATE TABLE IF NOT EXISTS profile.character_creation_cycles (
 id UUID PRIMARY KEY,
 child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE CASCADE,
 household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
 status VARCHAR(20) NOT NULL DEFAULT 'draft', start_direction VARCHAR(20),
 current_step VARCHAR(60) NOT NULL DEFAULT 'start', latest_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 completed_at TIMESTAMPTZ, abandoned_at TIMESTAMPTZ,
 CONSTRAINT character_creation_cycles_status_check CHECK (status IN ('draft','completed','abandoned')),
 CONSTRAINT character_creation_cycles_direction_check CHECK (start_direction IS NULL OR start_direction IN ('character_first','world_first'))
);
CREATE UNIQUE INDEX IF NOT EXISTS character_creation_cycles_active_profile_unique ON profile.character_creation_cycles(child_profile_id) WHERE status='draft';
CREATE INDEX IF NOT EXISTS character_creation_cycles_household_idx ON profile.character_creation_cycles(household_id);
CREATE TABLE IF NOT EXISTS profile.character_creation_selections (
 id UUID PRIMARY KEY, cycle_id UUID NOT NULL REFERENCES profile.character_creation_cycles(id) ON DELETE CASCADE,
 child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE CASCADE,
 household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
 step_key VARCHAR(60) NOT NULL, selection_key VARCHAR(100) NOT NULL,
 selection_payload JSONB NOT NULL DEFAULT '{}'::jsonb, selected_by VARCHAR(20) NOT NULL DEFAULT 'user',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT character_creation_selections_actor_check CHECK (selected_by IN ('user','system','llm'))
);
CREATE INDEX IF NOT EXISTS character_creation_selections_cycle_idx ON profile.character_creation_selections(cycle_id,created_at);
CREATE INDEX IF NOT EXISTS character_creation_selections_profile_idx ON profile.character_creation_selections(child_profile_id);
COMMIT;
