ALTER TABLE npc_intelligence.beliefs
  ADD COLUMN IF NOT EXISTS world_id UUID;

CREATE INDEX IF NOT EXISTS npc_beliefs_world_scope_idx
  ON npc_intelligence.beliefs (household_id, world_id, npc_id);

COMMENT ON COLUMN npc_intelligence.beliefs.world_id IS
  'World scope for NPC belief continuity. Nullable for legacy rows; new world-aware writes should populate this field.';
