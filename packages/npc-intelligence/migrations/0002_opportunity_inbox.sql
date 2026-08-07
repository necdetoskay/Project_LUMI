-- S34-T01: Opportunity inbox persistence schema.
-- Forward-only migration with idempotent guards, following 0001 conventions.
-- Persists delivered interaction opportunities so the child can list + respond
-- (accept/decline/defer). Cross-family isolation at the repository layer via
-- household_id.

BEGIN;

CREATE SCHEMA IF NOT EXISTS npc_intelligence;

CREATE TABLE IF NOT EXISTS npc_intelligence._npc_intelligence_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION npc_intelligence.__npc_intelligence_constraint_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_name
  );
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS npc_intelligence.opportunity_inbox (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  source_npc_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  opportunity_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'proposed',
  message VARCHAR(500) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  reason VARCHAR(600) NOT NULL DEFAULT '',
  idempotency_key VARCHAR(200) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'opp_inbox_child_idx') THEN
    CREATE INDEX opp_inbox_child_idx
      ON npc_intelligence.opportunity_inbox (household_id, child_profile_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'opp_inbox_status_idx') THEN
    CREATE INDEX opp_inbox_status_idx
      ON npc_intelligence.opportunity_inbox (status, expires_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'opp_inbox_idempotency_idx') THEN
    CREATE INDEX opp_inbox_idempotency_idx
      ON npc_intelligence.opportunity_inbox (household_id, idempotency_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT npc_intelligence.__npc_intelligence_constraint_exists('opp_inbox_status_check') THEN
    ALTER TABLE npc_intelligence.opportunity_inbox
      ADD CONSTRAINT opp_inbox_status_check
      CHECK (status IN ('proposed','accepted','declined','deferred','expired'));
  END IF;
END $$;

COMMIT;