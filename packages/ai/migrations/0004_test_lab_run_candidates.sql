ALTER TABLE ai.test_lab_runs DROP CONSTRAINT IF EXISTS test_lab_runs_candidate_state_id_test_lab_state_snapshots_id_fk;
DROP INDEX IF EXISTS ai.test_lab_runs_candidate_state_uq;
ALTER TABLE ai.test_lab_runs DROP COLUMN IF EXISTS candidate_state_id;

CREATE TABLE ai.test_lab_run_candidates (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES ai.test_lab_runs(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES ai.test_lab_sessions(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES ai.test_lab_branches(id) ON DELETE CASCADE,
  phase_id varchar(160) NOT NULL,
  ordinal integer NOT NULL,
  payload jsonb NOT NULL,
  candidate_state_id uuid NOT NULL REFERENCES ai.test_lab_state_snapshots(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_test_lab_candidate_ordinal CHECK (ordinal >= 0)
);

CREATE UNIQUE INDEX test_lab_candidate_state_uq
  ON ai.test_lab_run_candidates(candidate_state_id);
CREATE UNIQUE INDEX test_lab_candidate_run_ordinal_uq
  ON ai.test_lab_run_candidates(run_id, ordinal);
CREATE INDEX test_lab_candidates_run_idx
  ON ai.test_lab_run_candidates(run_id);

ALTER TABLE ai.test_lab_selections
  ADD COLUMN candidate_id uuid;

-- Existing Phase 1/2 data represented one candidate per run. Preserve it when present.
INSERT INTO ai.test_lab_run_candidates (
  id, run_id, session_id, branch_id, phase_id, ordinal, payload,
  candidate_state_id, created_at
)
SELECT
  gen_random_uuid(), r.id, r.session_id, r.branch_id, r.phase_id, 0, '{}'::jsonb,
  s.selected_state_id, r.created_at
FROM ai.test_lab_runs r
JOIN ai.test_lab_selections s ON s.run_id = r.id
WHERE NOT EXISTS (
  SELECT 1 FROM ai.test_lab_run_candidates c WHERE c.run_id = r.id
);

UPDATE ai.test_lab_selections s
SET candidate_id = c.id
FROM ai.test_lab_run_candidates c
WHERE c.run_id = s.run_id
  AND c.candidate_state_id = s.selected_state_id
  AND s.candidate_id IS NULL;

ALTER TABLE ai.test_lab_selections
  ALTER COLUMN candidate_id SET NOT NULL,
  ADD CONSTRAINT test_lab_selections_candidate_id_test_lab_run_candidates_id_fk
    FOREIGN KEY (candidate_id) REFERENCES ai.test_lab_run_candidates(id);

CREATE INDEX test_lab_selections_candidate_idx
  ON ai.test_lab_selections(candidate_id);
