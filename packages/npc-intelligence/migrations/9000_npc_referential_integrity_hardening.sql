-- Referential Integrity Audit: enforce canonical NPC scope at the database layer.
--
-- Historical migrations intentionally delegated cross-family isolation to the
-- repository layer. Data Model Freeze requires the database to reject UUIDs
-- that are individually valid but belong to different household/world/child
-- scopes.

BEGIN;

-- Composite targets used by same-domain scoped references.
CREATE UNIQUE INDEX IF NOT EXISTS npc_decision_traces_id_scope_unique
  ON npc_intelligence.decision_traces (id, npc_id, household_id);

CREATE UNIQUE INDEX IF NOT EXISTS npc_memories_id_scope_unique
  ON npc_intelligence.memories (id, household_id, world_id);

-- The repository contract says one idempotency key delivers an opportunity at
-- most once per household. The original migration created only a normal index.
DROP INDEX IF EXISTS npc_intelligence.opp_inbox_idempotency_idx;
CREATE UNIQUE INDEX opp_inbox_idempotency_idx
  ON npc_intelligence.opportunity_inbox (household_id, idempotency_key);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.decision_traces'::regclass
      AND conname = 'npc_decision_traces_npc_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.decision_traces
      ADD CONSTRAINT npc_decision_traces_npc_household_fk
      FOREIGN KEY (npc_id, household_id)
      REFERENCES profile.world_npcs (character_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.decision_traces
      VALIDATE CONSTRAINT npc_decision_traces_npc_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.decision_events'::regclass
      AND conname = 'npc_decision_events_npc_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.decision_events
      ADD CONSTRAINT npc_decision_events_npc_household_fk
      FOREIGN KEY (npc_id, household_id)
      REFERENCES profile.world_npcs (character_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.decision_events
      VALIDATE CONSTRAINT npc_decision_events_npc_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.decision_events'::regclass
      AND conname = 'npc_decision_events_trace_scope_fk'
  ) THEN
    ALTER TABLE npc_intelligence.decision_events
      ADD CONSTRAINT npc_decision_events_trace_scope_fk
      FOREIGN KEY (trace_id, npc_id, household_id)
      REFERENCES npc_intelligence.decision_traces (id, npc_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.decision_events
      VALIDATE CONSTRAINT npc_decision_events_trace_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.opportunity_inbox'::regclass
      AND conname = 'npc_opportunity_source_scope_fk'
  ) THEN
    ALTER TABLE npc_intelligence.opportunity_inbox
      ADD CONSTRAINT npc_opportunity_source_scope_fk
      FOREIGN KEY (source_npc_id, child_profile_id, household_id)
      REFERENCES profile.world_npcs (character_id, child_profile_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.opportunity_inbox
      VALIDATE CONSTRAINT npc_opportunity_source_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.beliefs'::regclass
      AND conname = 'npc_beliefs_npc_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.beliefs
      ADD CONSTRAINT npc_beliefs_npc_household_fk
      FOREIGN KEY (npc_id, household_id)
      REFERENCES profile.world_npcs (character_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.beliefs
      VALIDATE CONSTRAINT npc_beliefs_npc_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.beliefs'::regclass
      AND conname = 'npc_beliefs_npc_world_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.beliefs
      ADD CONSTRAINT npc_beliefs_npc_world_household_fk
      FOREIGN KEY (npc_id, world_id, household_id)
      REFERENCES profile.world_npcs (character_id, world_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.beliefs
      VALIDATE CONSTRAINT npc_beliefs_npc_world_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.memories'::regclass
      AND conname = 'npc_memories_world_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.memories
      ADD CONSTRAINT npc_memories_world_household_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.memories
      VALIDATE CONSTRAINT npc_memories_world_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.memories'::regclass
      AND conname = 'npc_memories_world_child_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.memories
      ADD CONSTRAINT npc_memories_world_child_household_fk
      FOREIGN KEY (world_id, child_profile_id, household_id)
      REFERENCES profile.worlds (id, child_profile_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.memories
      VALIDATE CONSTRAINT npc_memories_world_child_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.memories'::regclass
      AND conname = 'npc_memories_supersedes_scope_fk'
  ) THEN
    ALTER TABLE npc_intelligence.memories
      ADD CONSTRAINT npc_memories_supersedes_scope_fk
      FOREIGN KEY (supersedes_memory_id, household_id, world_id)
      REFERENCES npc_intelligence.memories (id, household_id, world_id)
      NOT VALID;
    ALTER TABLE npc_intelligence.memories
      VALIDATE CONSTRAINT npc_memories_supersedes_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.memory_usages'::regclass
      AND conname = 'npc_memory_usages_world_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.memory_usages
      ADD CONSTRAINT npc_memory_usages_world_household_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.memory_usages
      VALIDATE CONSTRAINT npc_memory_usages_world_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.memory_usages'::regclass
      AND conname = 'npc_memory_usages_world_child_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.memory_usages
      ADD CONSTRAINT npc_memory_usages_world_child_household_fk
      FOREIGN KEY (world_id, child_profile_id, household_id)
      REFERENCES profile.worlds (id, child_profile_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.memory_usages
      VALIDATE CONSTRAINT npc_memory_usages_world_child_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.memory_usages'::regclass
      AND conname = 'npc_memory_usages_memory_scope_fk'
  ) THEN
    ALTER TABLE npc_intelligence.memory_usages
      ADD CONSTRAINT npc_memory_usages_memory_scope_fk
      FOREIGN KEY (memory_id, household_id, world_id)
      REFERENCES npc_intelligence.memories (id, household_id, world_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.memory_usages
      VALIDATE CONSTRAINT npc_memory_usages_memory_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.npc_snapshots'::regclass
      AND conname = 'npc_snapshots_world_child_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.npc_snapshots
      ADD CONSTRAINT npc_snapshots_world_child_household_fk
      FOREIGN KEY (world_id, child_profile_id, household_id)
      REFERENCES profile.worlds (id, child_profile_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.npc_snapshots
      VALIDATE CONSTRAINT npc_snapshots_world_child_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.npc_snapshots'::regclass
      AND conname = 'npc_snapshots_npc_world_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.npc_snapshots
      ADD CONSTRAINT npc_snapshots_npc_world_household_fk
      FOREIGN KEY (npc_id, world_id, household_id)
      REFERENCES profile.world_npcs (character_id, world_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.npc_snapshots
      VALIDATE CONSTRAINT npc_snapshots_npc_world_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.npc_snapshots'::regclass
      AND conname = 'npc_snapshots_location_world_fk'
  ) THEN
    ALTER TABLE npc_intelligence.npc_snapshots
      ADD CONSTRAINT npc_snapshots_location_world_fk
      FOREIGN KEY (location_id, world_id)
      REFERENCES profile.world_locations (id, world_id)
      NOT VALID;
    ALTER TABLE npc_intelligence.npc_snapshots
      VALIDATE CONSTRAINT npc_snapshots_location_world_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.worker_npc_decisions'::regclass
      AND conname = 'worker_npc_decisions_world_child_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.worker_npc_decisions
      ADD CONSTRAINT worker_npc_decisions_world_child_household_fk
      FOREIGN KEY (world_id, child_profile_id, household_id)
      REFERENCES profile.worlds (id, child_profile_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.worker_npc_decisions
      VALIDATE CONSTRAINT worker_npc_decisions_world_child_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'npc_intelligence.worker_npc_decisions'::regclass
      AND conname = 'worker_npc_decisions_npc_world_household_fk'
  ) THEN
    ALTER TABLE npc_intelligence.worker_npc_decisions
      ADD CONSTRAINT worker_npc_decisions_npc_world_household_fk
      FOREIGN KEY (npc_id, world_id, household_id)
      REFERENCES profile.world_npcs (character_id, world_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE npc_intelligence.worker_npc_decisions
      VALIDATE CONSTRAINT worker_npc_decisions_npc_world_household_fk;
  END IF;
END
$$;

COMMIT;
