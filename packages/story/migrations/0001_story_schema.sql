-- Sprint 09: Story Definition and Session schema
-- Additive forward-only migration with idempotent guards
-- Cross-schema FKs to profile.*

BEGIN;

-- ============================================================
-- 1. Schema and migration ledger
-- ============================================================

CREATE SCHEMA IF NOT EXISTS story;

CREATE TABLE IF NOT EXISTS story._story_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Helper function for idempotent constraint creation
-- ============================================================

CREATE OR REPLACE FUNCTION story.__story_constraint_exists(p_name TEXT)
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

CREATE TABLE IF NOT EXISTS story.story_definitions (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  story_type VARCHAR(40) NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  lifecycle VARCHAR(20) NOT NULL DEFAULT 'draft',
  current_published_version_id UUID,
  age_group VARCHAR(40) NOT NULL,
  default_language VARCHAR(10) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS story.story_versions (
  id UUID PRIMARY KEY,
  story_definition_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  publication_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  schema_version INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(300) NOT NULL,
  summary VARCHAR(2000),
  story_mode VARCHAR(20) NOT NULL DEFAULT 'static',
  content_hash VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frozen_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS story.story_scenes (
  id UUID PRIMARY KEY,
  story_version_id UUID NOT NULL,
  scene_key VARCHAR(120) NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  scene_type VARCHAR(20) NOT NULL,
  title VARCHAR(300),
  narrative_text VARCHAR(8000) NOT NULL,
  is_entry_scene BOOLEAN NOT NULL DEFAULT FALSE,
  is_terminal_scene BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_scene_transitions (
  id UUID PRIMARY KEY,
  story_version_id UUID NOT NULL,
  from_scene_id UUID NOT NULL,
  to_scene_id UUID NOT NULL,
  transition_type VARCHAR(20) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_sessions (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  world_id UUID NOT NULL,
  story_definition_id UUID NOT NULL,
  story_version_id UUID NOT NULL,
  current_scene_id UUID,
  session_status VARCHAR(20) NOT NULL DEFAULT 'created',
  playback_mode VARCHAR(20) NOT NULL DEFAULT 'reading',
  started_at TIMESTAMPTZ,
  last_interacted_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandonment_reason VARCHAR(500),
  context_snapshot JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_session_characters (
  story_session_id UUID NOT NULL,
  character_id UUID NOT NULL,
  participation_role VARCHAR(20) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initial_state_snapshot JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (story_session_id, character_id)
);

CREATE TABLE IF NOT EXISTS story.story_session_scene_visits (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  visit_sequence INTEGER NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_reason VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_session_checkpoints (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  checkpoint_type VARCHAR(20) NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  session_state JSONB NOT NULL DEFAULT '{}',
  content_hash VARCHAR(128) NOT NULL,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_event_store (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  aggregate_version INTEGER NOT NULL DEFAULT 1,
  actor_household_id UUID,
  child_profile_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_idempotency_ledger (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  story_session_id UUID,
  operation_type VARCHAR(60) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story.story_parent_notes (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL,
  note_type VARCHAR(40) NOT NULL,
  placeholder VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- 4. Constraints
-- ============================================================

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_definitions_household') THEN
    ALTER TABLE story.story_definitions
      ADD CONSTRAINT fk_story_definitions_household
      FOREIGN KEY (household_id) REFERENCES profile.households(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_definitions_child_profile') THEN
    ALTER TABLE story.story_definitions
      ADD CONSTRAINT fk_story_definitions_child_profile
      FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_versions_definition') THEN
    ALTER TABLE story.story_versions
      ADD CONSTRAINT fk_story_versions_definition
      FOREIGN KEY (story_definition_id) REFERENCES story.story_definitions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_scenes_version') THEN
    ALTER TABLE story.story_scenes
      ADD CONSTRAINT fk_story_scenes_version
      FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_transitions_version') THEN
    ALTER TABLE story.story_scene_transitions
      ADD CONSTRAINT fk_story_transitions_version
      FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_transitions_from_scene') THEN
    ALTER TABLE story.story_scene_transitions
      ADD CONSTRAINT fk_story_transitions_from_scene
      FOREIGN KEY (from_scene_id) REFERENCES story.story_scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_transitions_to_scene') THEN
    ALTER TABLE story.story_scene_transitions
      ADD CONSTRAINT fk_story_transitions_to_scene
      FOREIGN KEY (to_scene_id) REFERENCES story.story_scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_sessions_household') THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT fk_story_sessions_household
      FOREIGN KEY (household_id) REFERENCES profile.households(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_sessions_child_profile') THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT fk_story_sessions_child_profile
      FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_sessions_world') THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT fk_story_sessions_world
      FOREIGN KEY (world_id) REFERENCES profile.worlds(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_sessions_definition') THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT fk_story_sessions_definition
      FOREIGN KEY (story_definition_id) REFERENCES story.story_definitions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_sessions_version') THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT fk_story_sessions_version
      FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_sessions_current_scene') THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT fk_story_sessions_current_scene
      FOREIGN KEY (current_scene_id) REFERENCES story.story_scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_session_characters_session') THEN
    ALTER TABLE story.story_session_characters
      ADD CONSTRAINT fk_story_session_characters_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_session_characters_character') THEN
    ALTER TABLE story.story_session_characters
      ADD CONSTRAINT fk_story_session_characters_character
      FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_session_visits_session') THEN
    ALTER TABLE story.story_session_scene_visits
      ADD CONSTRAINT fk_story_session_visits_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_session_visits_scene') THEN
    ALTER TABLE story.story_session_scene_visits
      ADD CONSTRAINT fk_story_session_visits_scene
      FOREIGN KEY (scene_id) REFERENCES story.story_scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_session_checkpoints_session') THEN
    ALTER TABLE story.story_session_checkpoints
      ADD CONSTRAINT fk_story_session_checkpoints_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_session_checkpoints_scene') THEN
    ALTER TABLE story.story_session_checkpoints
      ADD CONSTRAINT fk_story_session_checkpoints_scene
      FOREIGN KEY (scene_id) REFERENCES story.story_scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_event_store_session') THEN
    ALTER TABLE story.story_event_store
      ADD CONSTRAINT fk_story_event_store_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_idempotency_session') THEN
    ALTER TABLE story.story_idempotency_ledger
      ADD CONSTRAINT fk_story_idempotency_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT story.__story_constraint_exists('fk_story_parent_notes_session') THEN
    ALTER TABLE story.story_parent_notes
      ADD CONSTRAINT fk_story_parent_notes_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

-- ============================================================
-- 5. Unique indexes
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_definition_slug'
  ) THEN
    CREATE UNIQUE INDEX uq_story_definition_slug
      ON story.story_definitions (household_id, slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_version_number'
  ) THEN
    CREATE UNIQUE INDEX uq_story_version_number
      ON story.story_versions (story_definition_id, version_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_scenes_key'
  ) THEN
    CREATE UNIQUE INDEX uq_story_scenes_key
      ON story.story_scenes (story_version_id, scene_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_scenes_entry'
  ) THEN
    CREATE UNIQUE INDEX uq_story_scenes_entry
      ON story.story_scenes (story_version_id)
      WHERE is_entry_scene = TRUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_session_checkpoints_sequence'
  ) THEN
    CREATE UNIQUE INDEX uq_story_session_checkpoints_sequence
      ON story.story_session_checkpoints (story_session_id, sequence_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_session_visits_sequence'
  ) THEN
    CREATE UNIQUE INDEX uq_story_session_visits_sequence
      ON story.story_session_scene_visits (story_session_id, visit_sequence);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_story_idempotency_scope'
  ) THEN
    CREATE UNIQUE INDEX uq_story_idempotency_scope
      ON story.story_idempotency_ledger (household_id, operation_type, idempotency_key);
  END IF;
END $$;

COMMIT;

