-- Sprint 10: Choice and Session Consequence schema
-- Additive forward-only migration with idempotent guards

BEGIN;

-- ============================================================
-- 1. Choice points and options
-- ============================================================

CREATE TABLE IF NOT EXISTS story.story_choice_points (
  id UUID PRIMARY KEY,
  story_version_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  choice_point_key VARCHAR(120) NOT NULL,
  choice_point_type VARCHAR(20) NOT NULL,
  prompt_text VARCHAR(2000) NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  rule_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_choice_options (
  id UUID PRIMARY KEY,
  choice_point_id UUID NOT NULL,
  option_key VARCHAR(120) NOT NULL,
  option_text VARCHAR(1000) NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  availability_rule JSONB,
  consequence_previews JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_committed_choices (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  choice_point_id UUID NOT NULL,
  option_id UUID NOT NULL,
  evidence_scene_id UUID NOT NULL,
  rule_version INTEGER NOT NULL DEFAULT 1,
  actor_user_id UUID,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_choice_consequences (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  committed_choice_id UUID NOT NULL,
  consequence_type VARCHAR(30) NOT NULL,
  target_key VARCHAR(120),
  payload JSONB NOT NULL DEFAULT '{}',
  sequence_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_outcome_candidates (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  source_consequence_id UUID NOT NULL,
  candidate_schema_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Constraints
-- ============================================================

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_choice_points_version') THEN
    ALTER TABLE story.story_choice_points
      ADD CONSTRAINT fk_story_choice_points_version
      FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_choice_points_scene') THEN
    ALTER TABLE story.story_choice_points
      ADD CONSTRAINT fk_story_choice_points_scene
      FOREIGN KEY (scene_id) REFERENCES story.story_scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_choice_options_point') THEN
    ALTER TABLE story.story_choice_options
      ADD CONSTRAINT fk_story_choice_options_point
      FOREIGN KEY (choice_point_id) REFERENCES story.story_choice_points(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_committed_choices_session') THEN
    ALTER TABLE story.story_committed_choices
      ADD CONSTRAINT fk_story_committed_choices_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_committed_choices_point') THEN
    ALTER TABLE story.story_committed_choices
      ADD CONSTRAINT fk_story_committed_choices_point
      FOREIGN KEY (choice_point_id) REFERENCES story.story_choice_points(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_committed_choices_option') THEN
    ALTER TABLE story.story_committed_choices
      ADD CONSTRAINT fk_story_committed_choices_option
      FOREIGN KEY (option_id) REFERENCES story.story_choice_options(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_choice_consequences_session') THEN
    ALTER TABLE story.story_choice_consequences
      ADD CONSTRAINT fk_story_choice_consequences_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_choice_consequences_choice') THEN
    ALTER TABLE story.story_choice_consequences
      ADD CONSTRAINT fk_story_choice_consequences_choice
      FOREIGN KEY (committed_choice_id) REFERENCES story.story_committed_choices(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_outcome_candidates_session') THEN
    ALTER TABLE story.story_outcome_candidates
      ADD CONSTRAINT fk_story_outcome_candidates_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_outcome_candidates_consequence') THEN
    ALTER TABLE story.story_outcome_candidates
      ADD CONSTRAINT fk_story_outcome_candidates_consequence
      FOREIGN KEY (source_consequence_id) REFERENCES story.story_choice_consequences(id);
  END IF;
END $$;

-- ============================================================
-- 3. Unique indexes
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_choice_point_key'
  ) THEN
    CREATE UNIQUE INDEX uq_story_choice_point_key
      ON story.story_choice_points (scene_id, choice_point_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_choice_option_key'
  ) THEN
    CREATE UNIQUE INDEX uq_story_choice_option_key
      ON story.story_choice_options (choice_point_id, option_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_committed_choice_session_point'
  ) THEN
    CREATE UNIQUE INDEX uq_story_committed_choice_session_point
      ON story.story_committed_choices (story_session_id, choice_point_id);
  END IF;
END $$;

COMMIT;
