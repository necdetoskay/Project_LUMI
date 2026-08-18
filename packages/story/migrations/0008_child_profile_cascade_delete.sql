-- Sprint 37: Child profile permanent delete cascades into story data.
-- Converts the story dependency chain to ON DELETE CASCADE so that a hard
-- delete of profile.child_profiles removes every story definition, version,
-- scene, session, choice record, event and outbox intent for the child.
-- Forward-only; no rollback. Safe because nothing deletes story rows today
-- except this new child-profile delete path.

-- story_definitions -> profile.child_profiles
ALTER TABLE story.story_definitions
  DROP CONSTRAINT IF EXISTS fk_story_definitions_child_profile,
  ADD CONSTRAINT fk_story_definitions_child_profile
    FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles(id) ON DELETE CASCADE;

-- story_versions -> story_definitions
ALTER TABLE story.story_versions
  DROP CONSTRAINT IF EXISTS fk_story_versions_definition,
  ADD CONSTRAINT fk_story_versions_definition
    FOREIGN KEY (story_definition_id) REFERENCES story.story_definitions(id) ON DELETE CASCADE;

-- story_scenes -> story_versions
ALTER TABLE story.story_scenes
  DROP CONSTRAINT IF EXISTS fk_story_scenes_version,
  ADD CONSTRAINT fk_story_scenes_version
    FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id) ON DELETE CASCADE;

-- story_scene_transitions -> story_versions / story_scenes
ALTER TABLE story.story_scene_transitions
  DROP CONSTRAINT IF EXISTS fk_story_transitions_version,
  ADD CONSTRAINT fk_story_transitions_version
    FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id) ON DELETE CASCADE;

ALTER TABLE story.story_scene_transitions
  DROP CONSTRAINT IF EXISTS fk_story_transitions_from_scene,
  ADD CONSTRAINT fk_story_transitions_from_scene
    FOREIGN KEY (from_scene_id) REFERENCES story.story_scenes(id) ON DELETE CASCADE;

ALTER TABLE story.story_scene_transitions
  DROP CONSTRAINT IF EXISTS fk_story_transitions_to_scene,
  ADD CONSTRAINT fk_story_transitions_to_scene
    FOREIGN KEY (to_scene_id) REFERENCES story.story_scenes(id) ON DELETE CASCADE;

-- story_choice_points -> story_versions / story_scenes
ALTER TABLE story.story_choice_points
  DROP CONSTRAINT IF EXISTS fk_story_choice_points_version,
  ADD CONSTRAINT fk_story_choice_points_version
    FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id) ON DELETE CASCADE;

ALTER TABLE story.story_choice_points
  DROP CONSTRAINT IF EXISTS fk_story_choice_points_scene,
  ADD CONSTRAINT fk_story_choice_points_scene
    FOREIGN KEY (scene_id) REFERENCES story.story_scenes(id) ON DELETE CASCADE;

-- story_choice_options -> story_choice_points
ALTER TABLE story.story_choice_options
  DROP CONSTRAINT IF EXISTS fk_story_choice_options_point,
  ADD CONSTRAINT fk_story_choice_options_point
    FOREIGN KEY (choice_point_id) REFERENCES story.story_choice_points(id) ON DELETE CASCADE;

-- story_sessions -> profile.child_profiles / worlds / definitions / versions / scenes
ALTER TABLE story.story_sessions
  DROP CONSTRAINT IF EXISTS fk_story_sessions_child_profile,
  ADD CONSTRAINT fk_story_sessions_child_profile
    FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles(id) ON DELETE CASCADE;

ALTER TABLE story.story_sessions
  DROP CONSTRAINT IF EXISTS fk_story_sessions_world,
  ADD CONSTRAINT fk_story_sessions_world
    FOREIGN KEY (world_id) REFERENCES profile.worlds(id) ON DELETE CASCADE;

ALTER TABLE story.story_sessions
  DROP CONSTRAINT IF EXISTS fk_story_sessions_definition,
  ADD CONSTRAINT fk_story_sessions_definition
    FOREIGN KEY (story_definition_id) REFERENCES story.story_definitions(id) ON DELETE CASCADE;

ALTER TABLE story.story_sessions
  DROP CONSTRAINT IF EXISTS fk_story_sessions_version,
  ADD CONSTRAINT fk_story_sessions_version
    FOREIGN KEY (story_version_id) REFERENCES story.story_versions(id) ON DELETE CASCADE;

ALTER TABLE story.story_sessions
  DROP CONSTRAINT IF EXISTS fk_story_sessions_current_scene,
  ADD CONSTRAINT fk_story_sessions_current_scene
    FOREIGN KEY (current_scene_id) REFERENCES story.story_scenes(id) ON DELETE CASCADE;

-- story_session_characters -> story_sessions
ALTER TABLE story.story_session_characters
  DROP CONSTRAINT IF EXISTS fk_story_session_characters_session,
  ADD CONSTRAINT fk_story_session_characters_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

-- story_session_scene_visits -> story_sessions / story_scenes
ALTER TABLE story.story_session_scene_visits
  DROP CONSTRAINT IF EXISTS fk_story_session_visits_session,
  ADD CONSTRAINT fk_story_session_visits_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

ALTER TABLE story.story_session_scene_visits
  DROP CONSTRAINT IF EXISTS fk_story_session_visits_scene,
  ADD CONSTRAINT fk_story_session_visits_scene
    FOREIGN KEY (scene_id) REFERENCES story.story_scenes(id) ON DELETE CASCADE;

-- story_session_checkpoints -> story_sessions / story_scenes
ALTER TABLE story.story_session_checkpoints
  DROP CONSTRAINT IF EXISTS fk_story_session_checkpoints_session,
  ADD CONSTRAINT fk_story_session_checkpoints_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

ALTER TABLE story.story_session_checkpoints
  DROP CONSTRAINT IF EXISTS fk_story_session_checkpoints_scene,
  ADD CONSTRAINT fk_story_session_checkpoints_scene
    FOREIGN KEY (scene_id) REFERENCES story.story_scenes(id) ON DELETE CASCADE;

-- story_event_store -> story_sessions
ALTER TABLE story.story_event_store
  DROP CONSTRAINT IF EXISTS fk_story_event_store_session,
  ADD CONSTRAINT fk_story_event_store_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

-- story_idempotency_ledger -> story_sessions
ALTER TABLE story.story_idempotency_ledger
  DROP CONSTRAINT IF EXISTS fk_story_idempotency_session,
  ADD CONSTRAINT fk_story_idempotency_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

-- story_parent_notes -> story_sessions
ALTER TABLE story.story_parent_notes
  DROP CONSTRAINT IF EXISTS fk_story_parent_notes_session,
  ADD CONSTRAINT fk_story_parent_notes_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

-- story_committed_choices -> story_sessions / story_choice_points / story_choice_options
ALTER TABLE story.story_committed_choices
  DROP CONSTRAINT IF EXISTS fk_story_committed_choices_session,
  ADD CONSTRAINT fk_story_committed_choices_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

ALTER TABLE story.story_committed_choices
  DROP CONSTRAINT IF EXISTS fk_story_committed_choices_point,
  ADD CONSTRAINT fk_story_committed_choices_point
    FOREIGN KEY (choice_point_id) REFERENCES story.story_choice_points(id) ON DELETE CASCADE;

ALTER TABLE story.story_committed_choices
  DROP CONSTRAINT IF EXISTS fk_story_committed_choices_option,
  ADD CONSTRAINT fk_story_committed_choices_option
    FOREIGN KEY (option_id) REFERENCES story.story_choice_options(id) ON DELETE CASCADE;

-- story_choice_consequences -> story_sessions / story_committed_choices
ALTER TABLE story.story_choice_consequences
  DROP CONSTRAINT IF EXISTS fk_story_choice_consequences_session,
  ADD CONSTRAINT fk_story_choice_consequences_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

ALTER TABLE story.story_choice_consequences
  DROP CONSTRAINT IF EXISTS fk_story_choice_consequences_choice,
  ADD CONSTRAINT fk_story_choice_consequences_choice
    FOREIGN KEY (committed_choice_id) REFERENCES story.story_committed_choices(id) ON DELETE CASCADE;

-- story_outcome_candidates -> story_sessions / story_choice_consequences
ALTER TABLE story.story_outcome_candidates
  DROP CONSTRAINT IF EXISTS fk_story_outcome_candidates_session,
  ADD CONSTRAINT fk_story_outcome_candidates_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;

ALTER TABLE story.story_outcome_candidates
  DROP CONSTRAINT IF EXISTS fk_story_outcome_candidates_consequence,
  ADD CONSTRAINT fk_story_outcome_candidates_consequence
    FOREIGN KEY (source_consequence_id) REFERENCES story.story_choice_consequences(id) ON DELETE CASCADE;

-- story_outbox -> story_sessions
ALTER TABLE story.story_outbox
  DROP CONSTRAINT IF EXISTS fk_story_outbox_session,
  ADD CONSTRAINT fk_story_outbox_session
    FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id) ON DELETE CASCADE;
