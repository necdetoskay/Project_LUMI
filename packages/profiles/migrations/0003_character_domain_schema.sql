-- Sprint 06: Character Domain Extension
-- Additive migration: adds character domain tables and columns to profile schema
-- Does NOT modify or drop existing Sprint 02/03/04 tables
-- Preserves all existing lumi_characters rows and bootstrap contracts

BEGIN;

-- 1. Add new columns to lumi_characters (all nullable or have defaults for existing rows)
ALTER TABLE profile.lumi_characters
  ADD COLUMN IF NOT EXISTS character_subtype VARCHAR(20) NOT NULL DEFAULT 'child_avatar',
  ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) NOT NULL DEFAULT 'childhood',
  ADD COLUMN IF NOT EXISTS active_location_id UUID,
  ADD COLUMN IF NOT EXISTS active_location_type VARCHAR(40),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lumi_characters_subtype_check'
  ) THEN
    ALTER TABLE profile.lumi_characters
      ADD CONSTRAINT lumi_characters_subtype_check CHECK (
        character_subtype IN ('child_avatar', 'npc')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lumi_characters_lifecycle_check'
  ) THEN
    ALTER TABLE profile.lumi_characters
      ADD CONSTRAINT lumi_characters_lifecycle_check CHECK (
        lifecycle_stage IN ('newborn', 'childhood', 'adolescence', 'adulthood', 'elder')
      );
  END IF;
END $$;

-- Existing active-per-profile unique index already exists from 0002

-- 2. Character Trait State (current values, one row per dimension)
CREATE TABLE IF NOT EXISTS profile.character_trait_state (
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  dimension VARCHAR(40) NOT NULL,
  value REAL NOT NULL CHECK (value >= 0 AND value <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, dimension)
);

CREATE INDEX IF NOT EXISTS character_trait_state_char_idx
  ON profile.character_trait_state (character_id);

-- 3. Character Trait History (append-only, bounded evidence-linked deltas)
CREATE TABLE IF NOT EXISTS profile.character_trait_history (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  dimension VARCHAR(40) NOT NULL,
  old_value REAL NOT NULL,
  new_value REAL NOT NULL,
  evidence TEXT NOT NULL,
  delta_magnitude REAL NOT NULL,
  actor_household_id UUID NOT NULL,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS character_trait_history_char_idx
  ON profile.character_trait_history (character_id, created_at DESC);

-- 4. Character Emotion State
CREATE TABLE IF NOT EXISTS profile.character_emotion_state (
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  dimension VARCHAR(40) NOT NULL,
  value REAL NOT NULL CHECK (value >= 0 AND value <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, dimension)
);

CREATE INDEX IF NOT EXISTS character_emotion_state_char_idx
  ON profile.character_emotion_state (character_id);

-- 5. Character Needs
CREATE TABLE IF NOT EXISTS profile.character_needs (
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  need_type VARCHAR(40) NOT NULL,
  value REAL NOT NULL CHECK (value >= 0 AND value <= 1),
  decay REAL NOT NULL DEFAULT 0.05 CHECK (decay >= 0 AND decay <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, need_type)
);

-- 6. Character Goals
CREATE TABLE IF NOT EXISTS profile.character_goals (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  need_type VARCHAR(40) NOT NULL,
  description VARCHAR(500) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS character_goals_char_idx
  ON profile.character_goals (character_id, status);

-- 7. Character Influence Vector
CREATE TABLE IF NOT EXISTS profile.character_influence (
  character_id UUID PRIMARY KEY
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  emotional REAL NOT NULL DEFAULT 0 CHECK (emotional >= 0 AND emotional <= 1),
  social REAL NOT NULL DEFAULT 0 CHECK (social >= 0 AND social <= 1),
  cultural REAL NOT NULL DEFAULT 0 CHECK (cultural >= 0 AND cultural <= 1),
  educational REAL NOT NULL DEFAULT 0 CHECK (educational >= 0 AND educational <= 1),
  political REAL NOT NULL DEFAULT 0 CHECK (political >= 0 AND political <= 1),
  environmental REAL NOT NULL DEFAULT 0 CHECK (environmental >= 0 AND environmental <= 1),
  familial REAL NOT NULL DEFAULT 0 CHECK (familial >= 0 AND familial <= 1),
  spiritual REAL NOT NULL DEFAULT 0 CHECK (spiritual >= 0 AND spiritual <= 1),
  historical REAL NOT NULL DEFAULT 0 CHECK (historical >= 0 AND historical <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Directional Relationships (A->B != B->A enforced by PK)
CREATE TABLE IF NOT EXISTS profile.character_relationships (
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  target_character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  trust REAL NOT NULL DEFAULT 0.5 CHECK (trust >= 0 AND trust <= 1),
  affinity REAL NOT NULL DEFAULT 0.5 CHECK (affinity >= 0 AND affinity <= 1),
  familiarity REAL NOT NULL DEFAULT 0 CHECK (familiarity >= 0 AND familiarity <= 1),
  relationship_type VARCHAR(40) NOT NULL DEFAULT 'neutral',
  custom_type_label VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, target_character_id),
  CONSTRAINT character_relationships_self_check CHECK (character_id <> target_character_id)
);

CREATE INDEX IF NOT EXISTS character_relationships_target_idx
  ON profile.character_relationships (target_character_id);

-- 9. Character Domain Events (immutable audit log)
CREATE TABLE IF NOT EXISTS profile.character_domain_events (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  aggregate_version INTEGER NOT NULL,
  actor_household_id UUID NOT NULL,
  actor_user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS character_domain_events_char_idx
  ON profile.character_domain_events (character_id, created_at DESC);

CREATE INDEX IF NOT EXISTS character_domain_events_type_idx
  ON profile.character_domain_events (event_type, created_at DESC);

COMMIT;
