CREATE TABLE IF NOT EXISTS npc_intelligence.memories (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  world_id UUID NOT NULL,
  child_profile_id UUID,
  owner_type VARCHAR(20) NOT NULL,
  owner_id UUID NOT NULL,
  kind VARCHAR(24) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  salience NUMERIC(6,5) NOT NULL,
  confidence NUMERIC(6,5) NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  source_id VARCHAR(180) NOT NULL,
  story_session_id UUID,
  outcome_id VARCHAR(180),
  effect_key VARCHAR(240) NOT NULL,
  provenance JSONB NOT NULL DEFAULT '[]'::jsonb,
  lifecycle VARCHAR(20) NOT NULL DEFAULT 'durable',
  supersedes_memory_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reinforced_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  CONSTRAINT npc_memories_salience_check CHECK (salience >= 0 AND salience <= 1),
  CONSTRAINT npc_memories_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT npc_memories_owner_type_check CHECK (owner_type IN ('character','npc','profile')),
  CONSTRAINT npc_memories_lifecycle_check CHECK (lifecycle IN ('durable','decaying','superseded','archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS npc_memories_effect_scope_uq
  ON npc_intelligence.memories (household_id, world_id, effect_key);

CREATE INDEX IF NOT EXISTS npc_memories_owner_scope_idx
  ON npc_intelligence.memories (household_id, world_id, owner_type, owner_id);

CREATE INDEX IF NOT EXISTS npc_memories_profile_scope_idx
  ON npc_intelligence.memories (household_id, world_id, child_profile_id);

CREATE INDEX IF NOT EXISTS npc_memories_retrieval_idx
  ON npc_intelligence.memories (household_id, world_id, lifecycle, salience, created_at);

COMMENT ON COLUMN npc_intelligence.memories.effect_key IS
  'Deterministic committed-effect idempotency key; unique within household/world scope.';

COMMENT ON TABLE npc_intelligence.memories IS
  'Canonical selective memory evidence. Beliefs remain the NPC epistemic model; memories preserve committed continuity evidence and retrieval salience.';
