CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS ai.test_lab_sessions (
  id uuid PRIMARY KEY,
  scenario_key varchar(160) NOT NULL,
  mode varchar(20) NOT NULL DEFAULT 'manual',
  active_branch_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_test_lab_session_mode CHECK (mode IN ('manual', 'automated'))
);

CREATE TABLE IF NOT EXISTS ai.test_lab_branches (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES ai.test_lab_sessions(id) ON DELETE CASCADE,
  parent_branch_id uuid NULL,
  forked_from_phase_id varchar(160) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_test_lab_branch_parent
    FOREIGN KEY (parent_branch_id) REFERENCES ai.test_lab_branches(id)
);

CREATE TABLE IF NOT EXISTS ai.test_lab_state_snapshots (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES ai.test_lab_sessions(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES ai.test_lab_branches(id) ON DELETE CASCADE,
  parent_state_id uuid NULL,
  created_by_run_id uuid NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_test_lab_state_parent
    FOREIGN KEY (parent_state_id) REFERENCES ai.test_lab_state_snapshots(id)
);

CREATE TABLE IF NOT EXISTS ai.test_lab_runs (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES ai.test_lab_sessions(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES ai.test_lab_branches(id) ON DELETE CASCADE,
  phase_id varchar(160) NOT NULL,
  parent_state_id uuid NOT NULL REFERENCES ai.test_lab_state_snapshots(id),
  candidate_state_id uuid NOT NULL REFERENCES ai.test_lab_state_snapshots(id),
  status varchar(20) NOT NULL DEFAULT 'candidate',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_test_lab_run_status CHECK (status IN ('candidate', 'failed')),
  CONSTRAINT test_lab_runs_candidate_state_uq UNIQUE (candidate_state_id)
);

CREATE TABLE IF NOT EXISTS ai.test_lab_selections (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES ai.test_lab_sessions(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES ai.test_lab_branches(id) ON DELETE CASCADE,
  phase_id varchar(160) NOT NULL,
  run_id uuid NOT NULL REFERENCES ai.test_lab_runs(id),
  selected_state_id uuid NOT NULL REFERENCES ai.test_lab_state_snapshots(id),
  actor varchar(20) NOT NULL,
  strategy varchar(80) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_test_lab_selection_actor CHECK (actor IN ('human', 'automation')),
  CONSTRAINT test_lab_one_selection_per_branch_phase_uq
    UNIQUE (session_id, branch_id, phase_id)
);

CREATE INDEX IF NOT EXISTS test_lab_sessions_scenario_idx
  ON ai.test_lab_sessions(scenario_key);
CREATE INDEX IF NOT EXISTS test_lab_branches_session_idx
  ON ai.test_lab_branches(session_id);
CREATE INDEX IF NOT EXISTS test_lab_branches_parent_idx
  ON ai.test_lab_branches(parent_branch_id);
CREATE INDEX IF NOT EXISTS test_lab_states_session_branch_idx
  ON ai.test_lab_state_snapshots(session_id, branch_id);
CREATE INDEX IF NOT EXISTS test_lab_states_parent_idx
  ON ai.test_lab_state_snapshots(parent_state_id);
CREATE INDEX IF NOT EXISTS test_lab_runs_phase_idx
  ON ai.test_lab_runs(session_id, branch_id, phase_id);
CREATE INDEX IF NOT EXISTS test_lab_selections_run_idx
  ON ai.test_lab_selections(run_id);

COMMENT ON COLUMN ai.test_lab_sessions.active_branch_id IS
  'Navigation pointer maintained by TestLabCoordinator. Canonical history is stored in append-only branches/selections.';

COMMENT ON CONSTRAINT test_lab_one_selection_per_branch_phase_uq
  ON ai.test_lab_selections IS
  'Test Lab invariant: one canonical selected candidate per session/branch/phase. Reselection must fork a branch instead of overwriting history.';
