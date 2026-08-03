-- Sprint 13: NPC Intelligence Foundation decision trace/event schema
-- Forward-only migration with idempotent guards.
-- Stores explainable decision traces and decision events.
-- Rule: no child private data, no raw story text, no secrets in trace_json.
-- Cross-family isolation is enforced at the repository layer via household_id.

BEGIN;

-- ============================================================
-- 1. Schema and migration ledger
-- ============================================================

CREATE SCHEMA IF NOT EXISTS npc_intelligence;

CREATE TABLE IF NOT EXISTS npc_intelligence._npc_intelligence_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Helper function for idempotent constraint creation
-- ============================================================

CREATE OR REPLACE FUNCTION npc_intelligence.__npc_intelligence_constraint_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Core tables
-- ============================================================

CREATE TABLE IF NOT EXISTS npc_intelligence.decision_traces (
  id UUID PRIMARY KEY,
  npc_id UUID NOT NULL,
  household_id UUID NOT NULL,
  seed VARCHAR(200) NOT NULL,
  selected_candidate_id VARCHAR(120),
  selection_reason VARCHAR(600) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  trace_json JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS npc_intelligence.decision_events (
  id UUID PRIMARY KEY,
  npc_id UUID NOT NULL,
  household_id UUID NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  aggregate_version INTEGER NOT NULL DEFAULT 1,
  trace_id UUID,
  selected_candidate_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. Indexes
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'npc_traces_household_idx'
  ) THEN
    CREATE INDEX npc_traces_household_idx
      ON npc_intelligence.decision_traces (household_id, npc_id, decided_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'npc_traces_npc_idx'
  ) THEN
    CREATE INDEX npc_traces_npc_idx
      ON npc_intelligence.decision_traces (npc_id, decided_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'npc_traces_hash_idx'
  ) THEN
    CREATE INDEX npc_traces_hash_idx
      ON npc_intelligence.decision_traces (content_hash);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'npc_events_household_idx'
  ) THEN
    CREATE INDEX npc_events_household_idx
      ON npc_intelligence.decision_events (household_id, npc_id, created_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'npc_events_type_idx'
  ) THEN
    CREATE INDEX npc_events_type_idx
      ON npc_intelligence.decision_events (event_type, created_at);
  END IF;
END $$;

-- ============================================================
-- 5. Check constraints
-- ============================================================

DO $$
BEGIN
  IF NOT npc_intelligence.__npc_intelligence_constraint_exists('chk_npc_trace_seed') THEN
    ALTER TABLE npc_intelligence.decision_traces
      ADD CONSTRAINT chk_npc_trace_seed
      CHECK (char_length(seed) BETWEEN 1 AND 200);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT npc_intelligence.__npc_intelligence_constraint_exists('chk_npc_trace_hash') THEN
    ALTER TABLE npc_intelligence.decision_traces
      ADD CONSTRAINT chk_npc_trace_hash
      CHECK (char_length(content_hash) = 64);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT npc_intelligence.__npc_intelligence_constraint_exists('chk_npc_trace_reason') THEN
    ALTER TABLE npc_intelligence.decision_traces
      ADD CONSTRAINT chk_npc_trace_reason
      CHECK (char_length(selection_reason) BETWEEN 1 AND 600);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT npc_intelligence.__npc_intelligence_constraint_exists('chk_npc_event_type') THEN
    ALTER TABLE npc_intelligence.decision_events
      ADD CONSTRAINT chk_npc_event_type
      CHECK (event_type IN ('NPC_DECISION_MADE'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT npc_intelligence.__npc_intelligence_constraint_exists('chk_npc_event_version') THEN
    ALTER TABLE npc_intelligence.decision_events
      ADD CONSTRAINT chk_npc_event_version
      CHECK (event_version >= 1 AND aggregate_version >= 1);
  END IF;
END $$;

COMMIT;
