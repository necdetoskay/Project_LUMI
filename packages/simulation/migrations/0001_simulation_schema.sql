-- Sprint 14: World Time and Background Simulation schema
-- Forward-only migration with idempotent guards.
-- Stores world clock state, simulation runs, committed/pending effects,
-- and scheduled world events.
-- Rule: no child private data, no raw story text, no secrets in effect payloads.
-- Cross-household isolation is enforced at the repository layer via household_id.

BEGIN;

-- ============================================================
-- 1. Schema and migration ledger
-- ============================================================

CREATE SCHEMA IF NOT EXISTS simulation;

CREATE TABLE IF NOT EXISTS simulation._simulation_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Helper function for idempotent constraint creation
-- ============================================================

CREATE OR REPLACE FUNCTION simulation.__simulation_constraint_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. World clock — persistent game-time tracker per world
-- ============================================================

CREATE TABLE IF NOT EXISTS simulation.world_clocks (
  world_id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 1,
  current_hour INTEGER NOT NULL DEFAULT 7,
  current_minute INTEGER NOT NULL DEFAULT 0,
  season VARCHAR(20) NOT NULL DEFAULT 'spring',
  last_advanced_at TIMESTAMPTZ,
  clock_hash VARCHAR(64) NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'wc_household_world_idx'
  ) THEN
    CREATE INDEX wc_household_world_idx
      ON simulation.world_clocks (household_id, world_id);
  END IF;
END $$;

-- ============================================================
-- 4. Simulation runs — one per background simulation invocation
-- ============================================================

CREATE TABLE IF NOT EXISTS simulation.simulation_runs (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  household_id UUID NOT NULL,
  child_last_seen_at TIMESTAMPTZ NOT NULL,
  child_absent_days INTEGER NOT NULL,
  time_phase VARCHAR(20) NOT NULL,
  budget_tokens INTEGER NOT NULL,
  run_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  checkpoint_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'sr_world_household_idx'
  ) THEN
    CREATE INDEX sr_world_household_idx
      ON simulation.simulation_runs (household_id, world_id, started_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'sr_run_hash_idx'
  ) THEN
    CREATE INDEX sr_run_hash_idx
      ON simulation.simulation_runs (run_hash);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT simulation.__simulation_constraint_exists('chk_simulation_run_phase')
  THEN
    ALTER TABLE simulation.simulation_runs
      ADD CONSTRAINT chk_simulation_run_phase
      CHECK (time_phase IN ('normal', 'reduced', 'limited', 'frozen'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT simulation.__simulation_constraint_exists('chk_simulation_run_status')
  THEN
    ALTER TABLE simulation.simulation_runs
      ADD CONSTRAINT chk_simulation_run_status
      CHECK (status IN ('planned', 'running', 'completed', 'failed'));
  END IF;
END $$;

-- ============================================================
-- 5. Simulation effects — committed/pending world changes
-- ============================================================

CREATE TABLE IF NOT EXISTS simulation.simulation_effects (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL,
  world_id UUID NOT NULL,
  household_id UUID NOT NULL,
  npc_id UUID,
  entity_id UUID,
  effect_type VARCHAR(60) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'low',
  payload JSONB NOT NULL DEFAULT '{}',
  evidence JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  idempotency_key VARCHAR(255) NOT NULL,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'se_run_idx'
  ) THEN
    CREATE INDEX se_run_idx
      ON simulation.simulation_effects (run_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'se_world_household_status_idx'
  ) THEN
    CREATE INDEX se_world_household_status_idx
      ON simulation.simulation_effects (household_id, world_id, status, committed_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT simulation.__simulation_constraint_exists('chk_sim_effect_status')
  THEN
    ALTER TABLE simulation.simulation_effects
      ADD CONSTRAINT chk_sim_effect_status
      CHECK (status IN ('pending', 'committed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT simulation.__simulation_constraint_exists('chk_sim_effect_severity')
  THEN
    ALTER TABLE simulation.simulation_effects
      ADD CONSTRAINT chk_sim_effect_severity
      CHECK (severity IN ('low', 'moderate', 'high'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_sim_effect_idempotency'
  ) THEN
    CREATE UNIQUE INDEX uq_sim_effect_idempotency
      ON simulation.simulation_effects (household_id, idempotency_key);
  END IF;
END $$;

-- ============================================================
-- 6. Scheduled events — conditional, player-preserved, or timed
-- ============================================================

CREATE TABLE IF NOT EXISTS simulation.scheduled_events (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  household_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  critical BOOLEAN NOT NULL DEFAULT false,
  player_preserved BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'se_world_scheduled_idx'
  ) THEN
    CREATE INDEX se_world_scheduled_idx
      ON simulation.scheduled_events (household_id, world_id, scheduled_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'se_world_unresolved_idx'
  ) THEN
    CREATE INDEX se_world_unresolved_idx
      ON simulation.scheduled_events (household_id, world_id, resolved, scheduled_at)
      WHERE resolved = false;
  END IF;
END $$;

-- ============================================================
-- 7. Idempotency ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS simulation.simulation_idempotency_ledger (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  world_id UUID,
  operation_type VARCHAR(60) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_sim_idempotency'
  ) THEN
    CREATE UNIQUE INDEX uq_sim_idempotency
      ON simulation.simulation_idempotency_ledger (household_id, operation_type, idempotency_key);
  END IF;
END $$;

-- ============================================================
-- 8. Foreign key to world checkpoints
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'profile' AND tablename = 'world_checkpoints'
  ) AND NOT simulation.__simulation_constraint_exists('fk_sim_run_checkpoint')
  THEN
    ALTER TABLE simulation.simulation_runs
      ADD CONSTRAINT fk_sim_run_checkpoint
      FOREIGN KEY (checkpoint_id) REFERENCES profile.world_checkpoints(id);
  END IF;
END $$;

COMMIT;
