CREATE TABLE IF NOT EXISTS profile.character_foundations (
  character_id UUID PRIMARY KEY REFERENCES profile.lumi_characters(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  foundation JSONB NOT NULL,
  bootstrap_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  bootstrap_run_id VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT character_foundations_version_check CHECK (version > 0),
  CONSTRAINT character_foundations_bootstrap_status_check CHECK (bootstrap_status IN ('planned', 'pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS character_foundations_household_idx
  ON profile.character_foundations(household_id);
CREATE INDEX IF NOT EXISTS character_foundations_child_profile_idx
  ON profile.character_foundations(child_profile_id);
