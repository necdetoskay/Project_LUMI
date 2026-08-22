-- Story Visual asset sets must remain bound to the exact manifest identity they duplicate.
-- Fail closed on historical mismatches before replacing the UUID-only FK.

BEGIN;

DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM media.story_visual_asset_sets asset_set
  JOIN media.story_visual_manifests manifest
    ON manifest.id = asset_set.manifest_id
  WHERE manifest.household_id <> asset_set.household_id
     OR manifest.child_profile_id <> asset_set.child_profile_id
     OR manifest.world_id <> asset_set.world_id
     OR manifest.story_id <> asset_set.story_id
     OR manifest.manifest_fingerprint <> asset_set.manifest_fingerprint;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Story visual asset set manifest identity mismatch: % invalid row(s)', mismatch_count;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('uq_story_visual_manifest_asset_set_identity') THEN
    ALTER TABLE media.story_visual_manifests
      ADD CONSTRAINT uq_story_visual_manifest_asset_set_identity
      UNIQUE (
        id,
        household_id,
        child_profile_id,
        world_id,
        story_id,
        manifest_fingerprint
      );
  END IF;
END $$;

ALTER TABLE media.story_visual_asset_sets
  DROP CONSTRAINT IF EXISTS story_visual_asset_sets_manifest_id_fkey;

DO $$
BEGIN
  IF NOT media.__media_constraint_exists('story_visual_asset_sets_manifest_identity_fk') THEN
    ALTER TABLE media.story_visual_asset_sets
      ADD CONSTRAINT story_visual_asset_sets_manifest_identity_fk
      FOREIGN KEY (
        manifest_id,
        household_id,
        child_profile_id,
        world_id,
        story_id,
        manifest_fingerprint
      )
      REFERENCES media.story_visual_manifests (
        id,
        household_id,
        child_profile_id,
        world_id,
        story_id,
        manifest_fingerprint
      )
      ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
