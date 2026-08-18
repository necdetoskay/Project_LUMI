CREATE TABLE IF NOT EXISTS ai.test_lab_evaluation_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_key varchar(160) NOT NULL,
  revision integer NOT NULL,
  target_type varchar(40) NOT NULL,
  label varchar(240) NOT NULL,
  criteria jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_test_lab_eval_rubric_revision CHECK (revision > 0),
  CONSTRAINT chk_test_lab_eval_rubric_target_type CHECK (
    target_type IN ('character', 'world', 'npc', 'story', 'story_arc')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS test_lab_eval_rubric_key_revision_uq
  ON ai.test_lab_evaluation_rubrics (rubric_key, revision);

CREATE TABLE IF NOT EXISTS ai.test_lab_candidate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai.test_lab_sessions(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES ai.test_lab_runs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES ai.test_lab_run_candidates(id) ON DELETE CASCADE,
  rubric_key varchar(160) NOT NULL,
  rubric_revision integer NOT NULL,
  mode varchar(30) NOT NULL,
  author_type varchar(20) NOT NULL,
  author_id varchar(240) NOT NULL,
  judge_model_slug varchar(240),
  findings jsonb NOT NULL,
  overall_score double precision NOT NULL,
  rank integer,
  usage_snapshot jsonb,
  provenance jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_test_lab_candidate_eval_mode CHECK (
    mode IN ('absolute', 'blind_ranking')
  ),
  CONSTRAINT chk_test_lab_candidate_eval_author_type CHECK (
    author_type IN ('judge', 'human')
  ),
  CONSTRAINT chk_test_lab_candidate_eval_judge_model CHECK (
    (author_type = 'judge' AND judge_model_slug IS NOT NULL)
    OR (author_type = 'human' AND judge_model_slug IS NULL)
  ),
  CONSTRAINT chk_test_lab_candidate_eval_rank CHECK (
    rank IS NULL OR rank > 0
  )
);

CREATE INDEX IF NOT EXISTS test_lab_candidate_eval_candidate_idx
  ON ai.test_lab_candidate_evaluations (candidate_id);
CREATE INDEX IF NOT EXISTS test_lab_candidate_eval_rubric_idx
  ON ai.test_lab_candidate_evaluations (rubric_key, rubric_revision);
CREATE INDEX IF NOT EXISTS test_lab_candidate_eval_author_idx
  ON ai.test_lab_candidate_evaluations (author_type, author_id);
