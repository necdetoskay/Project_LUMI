CREATE TABLE IF NOT EXISTS npc_intelligence.npc_snapshots (
  id UUID PRIMARY KEY,
  npc_id UUID NOT NULL,
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  character_id UUID NOT NULL,
  location_id UUID,
  need_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  relationship_to_character NUMERIC(6,5) NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT npc_snapshots_relationship_check
    CHECK (relationship_to_character >= -1 AND relationship_to_character <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS npc_snapshots_scope_uq
  ON npc_intelligence.npc_snapshots
  (household_id, world_id, child_profile_id, npc_id);

CREATE INDEX IF NOT EXISTS npc_snapshots_worker_idx
  ON npc_intelligence.npc_snapshots
  (household_id, world_id, updated_at DESC, npc_id);

COMMENT ON TABLE npc_intelligence.npc_snapshots IS
  'Canonical structured NPC state used by background simulation and deterministic decision orchestration. Missing rows mean no NPC; callers must not synthesize identities.';
