-- S28-T02: Quest aggregate persistence schema.
-- Additive, forward-only (no rollback). One row = one quest instance and
-- its ordered objectives. Quest *definitions/templates* are deferred, so the
-- schema is kept additive for later layering.

BEGIN;

CREATE TABLE IF NOT EXISTS profile.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  story_session_id UUID,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  version INTEGER NOT NULL DEFAULT 1,
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_quest_status
    CHECK (status IN ('inactive', 'active', 'paused', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS quest_household_idx ON profile.quests (household_id);
CREATE INDEX IF NOT EXISTS quest_world_idx ON profile.quests (world_id);
CREATE INDEX IF NOT EXISTS quest_session_idx ON profile.quests (story_session_id);

CREATE TABLE IF NOT EXISTS profile.quest_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL,
  objective_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'locked',
  evidence_ref TEXT,
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_quest_objective UNIQUE (quest_id, objective_index),
  CONSTRAINT chk_quest_objective_status
    CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed', 'skipped')),
  CONSTRAINT fk_quest_objective_quest
    FOREIGN KEY (quest_id) REFERENCES profile.quests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS quest_objective_quest_idx
  ON profile.quest_objectives (quest_id);

COMMIT;