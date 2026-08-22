-- Story graph referential integrity hardening.
-- Keep canonical story definition/version/scene/choice/session relations in one DB-enforced graph.

CREATE UNIQUE INDEX IF NOT EXISTS story_sessions_id_household_unique
  ON story.story_sessions (id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_sessions_id_child_profile_unique
  ON story.story_sessions (id, child_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_choice_points_id_version_unique
  ON story.story_choice_points (id, story_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_choice_options_id_point_unique
  ON story.story_choice_options (id, choice_point_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_committed_choices_id_session_unique
  ON story.story_committed_choices (id, story_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_choice_consequences_id_session_unique
  ON story.story_choice_consequences (id, story_session_id);

DO $$
DECLARE
  mismatch_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_definitions AS definition
  LEFT JOIN profile.child_profiles AS child
    ON child.id = definition.child_profile_id
   AND child.household_id = definition.household_id
  WHERE definition.child_profile_id IS NOT NULL
    AND child.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story definition child scope mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_definitions AS definition
  LEFT JOIN story.story_versions AS version
    ON version.id = definition.current_published_version_id
   AND version.story_definition_id = definition.id
  WHERE definition.current_published_version_id IS NOT NULL
    AND version.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story published-version graph mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_scene_transitions AS transition
  LEFT JOIN story.story_scenes AS from_scene
    ON from_scene.id = transition.from_scene_id
   AND from_scene.story_version_id = transition.story_version_id
  LEFT JOIN story.story_scenes AS to_scene
    ON to_scene.id = transition.to_scene_id
   AND to_scene.story_version_id = transition.story_version_id
  WHERE from_scene.id IS NULL OR to_scene.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story transition version graph mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_choice_points AS point
  LEFT JOIN story.story_scenes AS scene
    ON scene.id = point.scene_id
   AND scene.story_version_id = point.story_version_id
  WHERE scene.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story choice-point scene/version mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_committed_choices AS committed
  LEFT JOIN story.story_sessions AS session
    ON session.id = committed.story_session_id
  LEFT JOIN story.story_choice_points AS point
    ON point.id = committed.choice_point_id
   AND point.story_version_id = session.story_version_id
  LEFT JOIN story.story_choice_options AS option
    ON option.id = committed.option_id
   AND option.choice_point_id = committed.choice_point_id
  LEFT JOIN story.story_scenes AS evidence_scene
    ON evidence_scene.id = committed.evidence_scene_id
   AND evidence_scene.story_version_id = session.story_version_id
  WHERE session.id IS NULL
     OR point.id IS NULL
     OR option.id IS NULL
     OR evidence_scene.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story committed-choice graph mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_choice_consequences AS consequence
  LEFT JOIN story.story_committed_choices AS committed
    ON committed.id = consequence.committed_choice_id
   AND committed.story_session_id = consequence.story_session_id
  WHERE committed.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story consequence session graph mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_outcome_candidates AS candidate
  LEFT JOIN story.story_choice_consequences AS consequence
    ON consequence.id = candidate.source_consequence_id
   AND consequence.story_session_id = candidate.story_session_id
  WHERE consequence.id IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story outcome-candidate session graph mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_idempotency_ledger AS ledger
  LEFT JOIN profile.households AS household
    ON household.id = ledger.household_id
  LEFT JOIN story.story_sessions AS session
    ON session.id = ledger.story_session_id
   AND session.household_id = ledger.household_id
  WHERE household.id IS NULL
     OR (ledger.story_session_id IS NOT NULL AND session.id IS NULL);

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story idempotency scope mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_event_store AS event
  LEFT JOIN story.story_sessions AS session
    ON session.id = event.story_session_id
  WHERE session.id IS NULL
     OR (
       event.actor_household_id IS NOT NULL
       AND event.actor_household_id IS DISTINCT FROM session.household_id
     )
     OR (
       event.child_profile_id IS NOT NULL
       AND event.child_profile_id IS DISTINCT FROM session.child_profile_id
     );

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story event session scope mismatch: % invalid row(s)',
      mismatch_count;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION story.enforce_committed_choice_graph()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_version UUID;
  point_version UUID;
  option_point UUID;
  evidence_version UUID;
BEGIN
  SELECT story_version_id INTO session_version
  FROM story.story_sessions
  WHERE id = NEW.story_session_id;
  IF session_version IS NULL THEN
    RAISE EXCEPTION 'Committed choice references an unknown story session'
      USING ERRCODE = '23514';
  END IF;

  SELECT story_version_id INTO point_version
  FROM story.story_choice_points
  WHERE id = NEW.choice_point_id;
  IF point_version IS NULL OR point_version IS DISTINCT FROM session_version THEN
    RAISE EXCEPTION 'Committed choice point is outside the session story version'
      USING ERRCODE = '23514';
  END IF;

  SELECT choice_point_id INTO option_point
  FROM story.story_choice_options
  WHERE id = NEW.option_id;
  IF option_point IS NULL OR option_point IS DISTINCT FROM NEW.choice_point_id THEN
    RAISE EXCEPTION 'Committed choice option is outside the selected choice point'
      USING ERRCODE = '23514';
  END IF;

  SELECT story_version_id INTO evidence_version
  FROM story.story_scenes
  WHERE id = NEW.evidence_scene_id;
  IF evidence_version IS NULL OR evidence_version IS DISTINCT FROM session_version THEN
    RAISE EXCEPTION 'Committed choice evidence scene is outside the session story version'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS story_committed_choices_graph_guard
  ON story.story_committed_choices;
CREATE TRIGGER story_committed_choices_graph_guard
BEFORE INSERT OR UPDATE OF story_session_id, choice_point_id, option_id, evidence_scene_id
ON story.story_committed_choices
FOR EACH ROW
EXECUTE FUNCTION story.enforce_committed_choice_graph();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_definitions_child_scope_fk'
      AND conrelid = 'story.story_definitions'::regclass
  ) THEN
    ALTER TABLE story.story_definitions
      ADD CONSTRAINT story_definitions_child_scope_fk
      FOREIGN KEY (child_profile_id, household_id)
      REFERENCES profile.child_profiles (id, household_id)
      NOT VALID;
    ALTER TABLE story.story_definitions
      VALIDATE CONSTRAINT story_definitions_child_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_definitions_published_version_fk'
      AND conrelid = 'story.story_definitions'::regclass
  ) THEN
    ALTER TABLE story.story_definitions
      ADD CONSTRAINT story_definitions_published_version_fk
      FOREIGN KEY (current_published_version_id, id)
      REFERENCES story.story_versions (id, story_definition_id)
      NOT VALID;
    ALTER TABLE story.story_definitions
      VALIDATE CONSTRAINT story_definitions_published_version_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_transitions_from_version_fk'
      AND conrelid = 'story.story_scene_transitions'::regclass
  ) THEN
    ALTER TABLE story.story_scene_transitions
      ADD CONSTRAINT story_transitions_from_version_fk
      FOREIGN KEY (from_scene_id, story_version_id)
      REFERENCES story.story_scenes (id, story_version_id)
      NOT VALID;
    ALTER TABLE story.story_scene_transitions
      VALIDATE CONSTRAINT story_transitions_from_version_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_transitions_to_version_fk'
      AND conrelid = 'story.story_scene_transitions'::regclass
  ) THEN
    ALTER TABLE story.story_scene_transitions
      ADD CONSTRAINT story_transitions_to_version_fk
      FOREIGN KEY (to_scene_id, story_version_id)
      REFERENCES story.story_scenes (id, story_version_id)
      NOT VALID;
    ALTER TABLE story.story_scene_transitions
      VALIDATE CONSTRAINT story_transitions_to_version_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_choice_points_scene_version_fk'
      AND conrelid = 'story.story_choice_points'::regclass
  ) THEN
    ALTER TABLE story.story_choice_points
      ADD CONSTRAINT story_choice_points_scene_version_fk
      FOREIGN KEY (scene_id, story_version_id)
      REFERENCES story.story_scenes (id, story_version_id)
      NOT VALID;
    ALTER TABLE story.story_choice_points
      VALIDATE CONSTRAINT story_choice_points_scene_version_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_committed_choices_option_point_fk'
      AND conrelid = 'story.story_committed_choices'::regclass
  ) THEN
    ALTER TABLE story.story_committed_choices
      ADD CONSTRAINT story_committed_choices_option_point_fk
      FOREIGN KEY (option_id, choice_point_id)
      REFERENCES story.story_choice_options (id, choice_point_id)
      NOT VALID;
    ALTER TABLE story.story_committed_choices
      VALIDATE CONSTRAINT story_committed_choices_option_point_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_choice_consequences_choice_session_fk'
      AND conrelid = 'story.story_choice_consequences'::regclass
  ) THEN
    ALTER TABLE story.story_choice_consequences
      ADD CONSTRAINT story_choice_consequences_choice_session_fk
      FOREIGN KEY (committed_choice_id, story_session_id)
      REFERENCES story.story_committed_choices (id, story_session_id)
      NOT VALID;
    ALTER TABLE story.story_choice_consequences
      VALIDATE CONSTRAINT story_choice_consequences_choice_session_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_outcome_candidates_consequence_session_fk'
      AND conrelid = 'story.story_outcome_candidates'::regclass
  ) THEN
    ALTER TABLE story.story_outcome_candidates
      ADD CONSTRAINT story_outcome_candidates_consequence_session_fk
      FOREIGN KEY (source_consequence_id, story_session_id)
      REFERENCES story.story_choice_consequences (id, story_session_id)
      NOT VALID;
    ALTER TABLE story.story_outcome_candidates
      VALIDATE CONSTRAINT story_outcome_candidates_consequence_session_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_idempotency_household_fk'
      AND conrelid = 'story.story_idempotency_ledger'::regclass
  ) THEN
    ALTER TABLE story.story_idempotency_ledger
      ADD CONSTRAINT story_idempotency_household_fk
      FOREIGN KEY (household_id)
      REFERENCES profile.households (id)
      NOT VALID;
    ALTER TABLE story.story_idempotency_ledger
      VALIDATE CONSTRAINT story_idempotency_household_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_idempotency_session_scope_fk'
      AND conrelid = 'story.story_idempotency_ledger'::regclass
  ) THEN
    ALTER TABLE story.story_idempotency_ledger
      ADD CONSTRAINT story_idempotency_session_scope_fk
      FOREIGN KEY (story_session_id, household_id)
      REFERENCES story.story_sessions (id, household_id)
      NOT VALID;
    ALTER TABLE story.story_idempotency_ledger
      VALIDATE CONSTRAINT story_idempotency_session_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_events_actor_session_scope_fk'
      AND conrelid = 'story.story_event_store'::regclass
  ) THEN
    ALTER TABLE story.story_event_store
      ADD CONSTRAINT story_events_actor_session_scope_fk
      FOREIGN KEY (story_session_id, actor_household_id)
      REFERENCES story.story_sessions (id, household_id)
      NOT VALID;
    ALTER TABLE story.story_event_store
      VALIDATE CONSTRAINT story_events_actor_session_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_events_child_session_scope_fk'
      AND conrelid = 'story.story_event_store'::regclass
  ) THEN
    ALTER TABLE story.story_event_store
      ADD CONSTRAINT story_events_child_session_scope_fk
      FOREIGN KEY (story_session_id, child_profile_id)
      REFERENCES story.story_sessions (id, child_profile_id)
      NOT VALID;
    ALTER TABLE story.story_event_store
      VALIDATE CONSTRAINT story_events_child_session_scope_fk;
  END IF;
END
$$;
