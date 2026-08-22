-- PR-5 / Data Integrity Hardening
-- Replace repository-only isolation with database-enforced world/run scope integrity.

CREATE UNIQUE INDEX IF NOT EXISTS simulation_runs_id_world_household_unique
  ON simulation.simulation_runs (id, world_id, household_id);

DO $$
DECLARE
  mismatch_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM simulation.simulation_runs AS run
  LEFT JOIN profile.worlds AS world
    ON world.id = run.world_id
    AND world.household_id = run.household_id
  WHERE world.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Simulation run world scope mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM simulation.simulation_effects AS effect
  LEFT JOIN simulation.simulation_runs AS run
    ON run.id = effect.run_id
    AND run.world_id = effect.world_id
    AND run.household_id = effect.household_id
  WHERE run.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Simulation effect run scope mismatch: % invalid row(s)',
      mismatch_count;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'simulation.simulation_runs'::regclass
      AND conname = 'simulation_runs_world_scope_fk'
  ) THEN
    ALTER TABLE simulation.simulation_runs
      ADD CONSTRAINT simulation_runs_world_scope_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id)
      NOT VALID;
    ALTER TABLE simulation.simulation_runs
      VALIDATE CONSTRAINT simulation_runs_world_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'simulation.world_clocks'::regclass
      AND conname = 'world_clocks_world_scope_fk'
  ) THEN
    ALTER TABLE simulation.world_clocks
      ADD CONSTRAINT world_clocks_world_scope_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id)
      NOT VALID;
    ALTER TABLE simulation.world_clocks
      VALIDATE CONSTRAINT world_clocks_world_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'simulation.scheduled_events'::regclass
      AND conname = 'scheduled_events_world_scope_fk'
  ) THEN
    ALTER TABLE simulation.scheduled_events
      ADD CONSTRAINT scheduled_events_world_scope_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id)
      NOT VALID;
    ALTER TABLE simulation.scheduled_events
      VALIDATE CONSTRAINT scheduled_events_world_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'simulation.simulation_effects'::regclass
      AND conname = 'simulation_effects_run_scope_fk'
  ) THEN
    ALTER TABLE simulation.simulation_effects
      ADD CONSTRAINT simulation_effects_run_scope_fk
      FOREIGN KEY (run_id, world_id, household_id)
      REFERENCES simulation.simulation_runs (id, world_id, household_id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE simulation.simulation_effects
      VALIDATE CONSTRAINT simulation_effects_run_scope_fk;
  END IF;
END
$$;
