ALTER TABLE ai.test_lab_runs
  ADD COLUMN IF NOT EXISTS model_slug varchar(240),
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS usage_snapshot jsonb;

CREATE INDEX IF NOT EXISTS test_lab_runs_model_slug_idx
  ON ai.test_lab_runs (model_slug);

ALTER TABLE ai.test_lab_runs
  DROP CONSTRAINT IF EXISTS chk_test_lab_run_model_pricing_pair;

ALTER TABLE ai.test_lab_runs
  ADD CONSTRAINT chk_test_lab_run_model_pricing_pair
  CHECK (
    (model_slug IS NULL AND pricing_snapshot IS NULL)
    OR
    (model_slug IS NOT NULL AND pricing_snapshot IS NOT NULL)
  );

ALTER TABLE ai.test_lab_runs
  DROP CONSTRAINT IF EXISTS chk_test_lab_run_usage_traceable;

ALTER TABLE ai.test_lab_runs
  ADD CONSTRAINT chk_test_lab_run_usage_traceable
  CHECK (
    usage_snapshot IS NULL
    OR
    (model_slug IS NOT NULL AND pricing_snapshot IS NOT NULL)
  );
