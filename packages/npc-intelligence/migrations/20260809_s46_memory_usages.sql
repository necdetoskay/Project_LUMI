CREATE TABLE IF NOT EXISTS npc_intelligence.memory_usages (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  child_profile_id UUID,
  owner_type VARCHAR(20) NOT NULL,
  owner_id UUID NOT NULL,
  memory_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT npc_memory_usages_owner_type_check CHECK (owner_type IN ('character','npc','profile'))
);

CREATE UNIQUE INDEX IF NOT EXISTS npc_memory_usages_scene_memory_uq
  ON npc_intelligence.memory_usages (household_id, world_id, scene_id, memory_id);

CREATE INDEX IF NOT EXISTS npc_memory_usages_memory_idx
  ON npc_intelligence.memory_usages (household_id, world_id, memory_id, used_at);

COMMENT ON TABLE npc_intelligence.memory_usages IS
  'Idempotent evidence that a persisted generated story scene actually used a canonical memory. One scene can reinforce a memory at most once.';
