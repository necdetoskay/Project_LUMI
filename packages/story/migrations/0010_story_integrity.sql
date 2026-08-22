-- PR-6 / Data Integrity Hardening
-- Rebuilt on merged PR-5 to validate the story integrity contract against main.
-- Enforce session graph scope and typed character participation.

CREATE UNIQUE INDEX IF NOT EXISTS story_definitions_id_household_unique
  ON story.story_definitions (id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_versions_id_definition_unique
  ON story.story_versions (id, story_definition_id);
CREATE UNIQUE INDEX IF NOT EXISTS story_scenes_id_version_unique
  ON story.story_scenes (id, story_version_id);

DO $$
DECLARE
  mismatch_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM story.story_sessions AS session
  LEFT JOIN profile.child_profiles AS child
    ON child.id = session.child_profile_id
    AND child.household_id = session.household_id
  LEFT JOIN profile.worlds AS world
    ON world.id = session.world_id
    AND world.household_id = session.household_id
  LEFT JOIN story.story_definitions AS definition
    ON definition.id = session.story_definition_id
    AND definition.household_id = session.household_id
  LEFT JOIN story.story_versions AS version
    ON version.id = session.story_version_id
    AND version.story_definition_id = session.story_definition_id
  LEFT JOIN story.story_scenes AS scene
    ON scene.id = session.current_scene_id
    AND scene.story_version_id = session.story_version_id
  WHERE child.id IS NULL
     OR world.id IS NULL
     OR definition.id IS NULL
     OR version.id IS NULL
     OR (session.current_scene_id IS NOT NULL AND scene.id IS NULL);

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Story session graph mismatch: % invalid row(s)', mismatch_count;
  END IF;
END
$$;

ALTER TABLE story.story_session_characters
  ADD COLUMN IF NOT EXISTS child_avatar_id UUID,
  ADD COLUMN IF NOT EXISTS npc_id UUID;

UPDATE story.story_session_characters AS participant
SET child_avatar_id = participant.character_id
WHERE child_avatar_id IS NULL
  AND npc_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profile.child_avatars AS avatar
    WHERE avatar.character_id = participant.character_id
  );

UPDATE story.story_session_characters AS participant
SET npc_id = participant.character_id
WHERE child_avatar_id IS NULL
  AND npc_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profile.world_npcs AS npc
    WHERE npc.character_id = participant.character_id
  );

DO $$
DECLARE
  unresolved_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM story.story_session_characters
  WHERE (child_avatar_id IS NULL AND npc_id IS NULL)
     OR (child_avatar_id IS NOT NULL AND npc_id IS NOT NULL)
     OR character_id IS DISTINCT FROM COALESCE(child_avatar_id, npc_id);

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION
      'Story participant identity mismatch: % unresolved or ambiguous row(s)',
      unresolved_count;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION story.resolve_story_participant_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_child_avatar BOOLEAN;
  is_npc BOOLEAN;
BEGIN
  IF NEW.child_avatar_id IS NULL AND NEW.npc_id IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM profile.child_avatars AS avatar
      WHERE avatar.character_id = NEW.character_id
    ) INTO is_child_avatar;

    SELECT EXISTS (
      SELECT 1
      FROM profile.world_npcs AS npc
      WHERE npc.character_id = NEW.character_id
    ) INTO is_npc;

    IF is_child_avatar AND NOT is_npc THEN
      NEW.child_avatar_id := NEW.character_id;
    ELSIF is_npc AND NOT is_child_avatar THEN
      NEW.npc_id := NEW.character_id;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS story_participants_resolve_identity
  ON story.story_session_characters;
CREATE TRIGGER story_participants_resolve_identity
BEFORE INSERT OR UPDATE OF character_id, child_avatar_id, npc_id
ON story.story_session_characters
FOR EACH ROW
EXECUTE FUNCTION story.resolve_story_participant_identity();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_sessions_child_scope_fk'
  ) THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT story_sessions_child_scope_fk
      FOREIGN KEY (child_profile_id, household_id)
      REFERENCES profile.child_profiles (id, household_id)
      NOT VALID;
    ALTER TABLE story.story_sessions VALIDATE CONSTRAINT story_sessions_child_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_sessions_world_scope_fk'
  ) THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT story_sessions_world_scope_fk
      FOREIGN KEY (world_id, household_id)
      REFERENCES profile.worlds (id, household_id)
      NOT VALID;
    ALTER TABLE story.story_sessions VALIDATE CONSTRAINT story_sessions_world_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_sessions_definition_scope_fk'
  ) THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT story_sessions_definition_scope_fk
      FOREIGN KEY (story_definition_id, household_id)
      REFERENCES story.story_definitions (id, household_id)
      NOT VALID;
    ALTER TABLE story.story_sessions VALIDATE CONSTRAINT story_sessions_definition_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_sessions_version_definition_fk'
  ) THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT story_sessions_version_definition_fk
      FOREIGN KEY (story_version_id, story_definition_id)
      REFERENCES story.story_versions (id, story_definition_id)
      NOT VALID;
    ALTER TABLE story.story_sessions VALIDATE CONSTRAINT story_sessions_version_definition_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_sessions_scene_version_fk'
  ) THEN
    ALTER TABLE story.story_sessions
      ADD CONSTRAINT story_sessions_scene_version_fk
      FOREIGN KEY (current_scene_id, story_version_id)
      REFERENCES story.story_scenes (id, story_version_id)
      NOT VALID;
    ALTER TABLE story.story_sessions VALIDATE CONSTRAINT story_sessions_scene_version_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_participants_avatar_fk'
  ) THEN
    ALTER TABLE story.story_session_characters
      ADD CONSTRAINT story_participants_avatar_fk
      FOREIGN KEY (child_avatar_id)
      REFERENCES profile.child_avatars (character_id)
      NOT VALID;
    ALTER TABLE story.story_session_characters VALIDATE CONSTRAINT story_participants_avatar_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_participants_npc_fk'
  ) THEN
    ALTER TABLE story.story_session_characters
      ADD CONSTRAINT story_participants_npc_fk
      FOREIGN KEY (npc_id)
      REFERENCES profile.world_npcs (character_id)
      NOT VALID;
    ALTER TABLE story.story_session_characters VALIDATE CONSTRAINT story_participants_npc_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_participants_typed_identity_check'
  ) THEN
    ALTER TABLE story.story_session_characters
      ADD CONSTRAINT story_participants_typed_identity_check CHECK (
        ((child_avatar_id IS NOT NULL)::integer + (npc_id IS NOT NULL)::integer) = 1
        AND character_id = COALESCE(child_avatar_id, npc_id)
      ) NOT VALID;
    ALTER TABLE story.story_session_characters VALIDATE CONSTRAINT story_participants_typed_identity_check;
  END IF;
END
$$;
