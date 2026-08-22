-- Story Visual managed-asset referential-integrity hardening.
--
-- `profile.managed_assets` is intentionally generic, but Story illustration
-- assets use `subject_type = 'story_scene'`. After Story Visual scene
-- canonicalization, those subjects are persisted `story.story_scenes.id`
-- values. Mirror the polymorphic subject into a typed Story graph so the
-- database can enforce scene -> version -> definition -> household scope.

ALTER TABLE profile.managed_assets
  ADD COLUMN IF NOT EXISTS story_scene_id UUID,
  ADD COLUMN IF NOT EXISTS story_version_id UUID,
  ADD COLUMN IF NOT EXISTS story_definition_id UUID;

-- Fail closed before backfill. Do not create/validate constraints on top of
-- legacy rows whose generic subject cannot be proven to belong to the same
-- household Story graph.
DO $$
DECLARE
  invalid_count BIGINT;
  sample_asset_ids TEXT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM profile.managed_assets AS asset
  LEFT JOIN story.story_scenes AS scene
    ON scene.id = asset.subject_id
  LEFT JOIN story.story_versions AS version
    ON version.id = scene.story_version_id
  LEFT JOIN story.story_definitions AS definition
    ON definition.id = version.story_definition_id
  WHERE asset.subject_type = 'story_scene'
    AND (
      scene.id IS NULL
      OR version.id IS NULL
      OR definition.id IS NULL
      OR definition.household_id IS DISTINCT FROM asset.household_id
    );

  IF invalid_count > 0 THEN
    SELECT string_agg(candidate.id::text, ', ' ORDER BY candidate.id::text)
      INTO sample_asset_ids
    FROM (
      SELECT asset.id
      FROM profile.managed_assets AS asset
      LEFT JOIN story.story_scenes AS scene
        ON scene.id = asset.subject_id
      LEFT JOIN story.story_versions AS version
        ON version.id = scene.story_version_id
      LEFT JOIN story.story_definitions AS definition
        ON definition.id = version.story_definition_id
      WHERE asset.subject_type = 'story_scene'
        AND (
          scene.id IS NULL
          OR version.id IS NULL
          OR definition.id IS NULL
          OR definition.household_id IS DISTINCT FROM asset.household_id
        )
      ORDER BY asset.id
      LIMIT 10
    ) AS candidate;

    RAISE EXCEPTION
      'Managed asset Story scene graph mismatch: % invalid row(s); sample asset ids: %',
      invalid_count,
      COALESCE(sample_asset_ids, 'none');
  END IF;
END
$$;

-- Canonical backfill. The household predicate is deliberate defense in depth:
-- preflight must already have proven it for every Story-scene row.
UPDATE profile.managed_assets AS asset
SET story_scene_id = scene.id,
    story_version_id = scene.story_version_id,
    story_definition_id = version.story_definition_id
FROM story.story_scenes AS scene
JOIN story.story_versions AS version
  ON version.id = scene.story_version_id
JOIN story.story_definitions AS definition
  ON definition.id = version.story_definition_id
WHERE asset.subject_type = 'story_scene'
  AND asset.subject_id = scene.id
  AND asset.household_id = definition.household_id;

-- Keep typed Story columns impossible on every other polymorphic subject.
UPDATE profile.managed_assets
SET story_scene_id = NULL,
    story_version_id = NULL,
    story_definition_id = NULL
WHERE subject_type <> 'story_scene'
  AND (
    story_scene_id IS NOT NULL
    OR story_version_id IS NOT NULL
    OR story_definition_id IS NOT NULL
  );

CREATE OR REPLACE FUNCTION story.resolve_managed_asset_story_scene_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subject_type = 'story_scene' THEN
    SELECT scene.id,
           scene.story_version_id,
           version.story_definition_id
      INTO NEW.story_scene_id,
           NEW.story_version_id,
           NEW.story_definition_id
    FROM story.story_scenes AS scene
    JOIN story.story_versions AS version
      ON version.id = scene.story_version_id
    JOIN story.story_definitions AS definition
      ON definition.id = version.story_definition_id
    WHERE scene.id = NEW.subject_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Managed asset Story scene identity not found: %',
        NEW.subject_id
        USING ERRCODE = '23503';
    END IF;
  ELSE
    NEW.story_scene_id := NULL;
    NEW.story_version_id := NULL;
    NEW.story_definition_id := NULL;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS managed_assets_resolve_story_scene_identity
  ON profile.managed_assets;
CREATE TRIGGER managed_assets_resolve_story_scene_identity
BEFORE INSERT OR UPDATE OF
  subject_type,
  subject_id,
  story_scene_id,
  story_version_id,
  story_definition_id
ON profile.managed_assets
FOR EACH ROW
EXECUTE FUNCTION story.resolve_managed_asset_story_scene_identity();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_assets_story_scene_version_fk'
  ) THEN
    ALTER TABLE profile.managed_assets
      ADD CONSTRAINT managed_assets_story_scene_version_fk
      FOREIGN KEY (story_scene_id, story_version_id)
      REFERENCES story.story_scenes (id, story_version_id)
      NOT VALID;
    ALTER TABLE profile.managed_assets
      VALIDATE CONSTRAINT managed_assets_story_scene_version_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_assets_story_version_definition_fk'
  ) THEN
    ALTER TABLE profile.managed_assets
      ADD CONSTRAINT managed_assets_story_version_definition_fk
      FOREIGN KEY (story_version_id, story_definition_id)
      REFERENCES story.story_versions (id, story_definition_id)
      NOT VALID;
    ALTER TABLE profile.managed_assets
      VALIDATE CONSTRAINT managed_assets_story_version_definition_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_assets_story_definition_scope_fk'
  ) THEN
    ALTER TABLE profile.managed_assets
      ADD CONSTRAINT managed_assets_story_definition_scope_fk
      FOREIGN KEY (story_definition_id, household_id)
      REFERENCES story.story_definitions (id, household_id)
      NOT VALID;
    ALTER TABLE profile.managed_assets
      VALIDATE CONSTRAINT managed_assets_story_definition_scope_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_assets_story_scene_typed_check'
  ) THEN
    ALTER TABLE profile.managed_assets
      ADD CONSTRAINT managed_assets_story_scene_typed_check CHECK (
        (
          subject_type = 'story_scene'
          AND story_scene_id IS NOT NULL
          AND story_version_id IS NOT NULL
          AND story_definition_id IS NOT NULL
          AND subject_id = story_scene_id
        )
        OR
        (
          subject_type <> 'story_scene'
          AND story_scene_id IS NULL
          AND story_version_id IS NULL
          AND story_definition_id IS NULL
        )
      ) NOT VALID;
    ALTER TABLE profile.managed_assets
      VALIDATE CONSTRAINT managed_assets_story_scene_typed_check;
  END IF;
END
$$;
