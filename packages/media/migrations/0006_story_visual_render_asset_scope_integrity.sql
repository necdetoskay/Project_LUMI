-- Story Visual renders may only reference media assets from their parent asset-set scope.
-- Ready/reused renders are canonical pointers and must keep a concrete asset.

BEGIN;

DO $$
DECLARE
  mismatch_count BIGINT;
  missing_pointer_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM media.story_visual_asset_set_renders render
  JOIN media.story_visual_asset_sets asset_set
    ON asset_set.id = render.asset_set_id
  JOIN media.media_assets asset
    ON asset.id = render.asset_id
  WHERE render.asset_id IS NOT NULL
    AND (
      asset.household_id IS DISTINCT FROM asset_set.household_id
      OR asset.child_profile_id IS DISTINCT FROM asset_set.child_profile_id
      OR asset.world_id IS DISTINCT FROM asset_set.world_id
    );

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Story visual render asset scope mismatch: % invalid row(s)',
      mismatch_count;
  END IF;

  SELECT COUNT(*)
  INTO missing_pointer_count
  FROM media.story_visual_asset_set_renders
  WHERE status IN ('ready', 'reused')
    AND asset_id IS NULL;

  IF missing_pointer_count > 0 THEN
    RAISE EXCEPTION
      'Story visual render ready pointer mismatch: % invalid row(s)',
      missing_pointer_count;
  END IF;
END $$;

ALTER TABLE media.story_visual_asset_set_renders
  DROP CONSTRAINT IF EXISTS story_visual_asset_set_renders_asset_id_fkey;
ALTER TABLE media.story_visual_asset_set_renders
  DROP CONSTRAINT IF EXISTS story_visual_render_asset_fk;
ALTER TABLE media.story_visual_asset_set_renders
  ADD CONSTRAINT story_visual_render_asset_fk
  FOREIGN KEY (asset_id)
  REFERENCES media.media_assets (id)
  ON DELETE NO ACTION;

ALTER TABLE media.story_visual_asset_set_renders
  DROP CONSTRAINT IF EXISTS chk_story_visual_render_ready_asset;
ALTER TABLE media.story_visual_asset_set_renders
  ADD CONSTRAINT chk_story_visual_render_ready_asset
  CHECK (status NOT IN ('ready', 'reused') OR asset_id IS NOT NULL);

CREATE OR REPLACE FUNCTION media.__assert_story_visual_render_asset_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_household_id UUID;
  parent_child_profile_id UUID;
  parent_world_id UUID;
  asset_household_id UUID;
  asset_child_profile_id UUID;
  asset_world_id UUID;
BEGIN
  IF NEW.asset_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT household_id, child_profile_id, world_id
    INTO parent_household_id, parent_child_profile_id, parent_world_id
  FROM media.story_visual_asset_sets
  WHERE id = NEW.asset_set_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Story visual render asset set not found: %', NEW.asset_set_id
      USING ERRCODE = '23503';
  END IF;

  SELECT household_id, child_profile_id, world_id
    INTO asset_household_id, asset_child_profile_id, asset_world_id
  FROM media.media_assets
  WHERE id = NEW.asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Story visual render media asset not found: %', NEW.asset_id
      USING ERRCODE = '23503';
  END IF;

  IF asset_household_id IS DISTINCT FROM parent_household_id
    OR asset_child_profile_id IS DISTINCT FROM parent_child_profile_id
    OR asset_world_id IS DISTINCT FROM parent_world_id THEN
    RAISE EXCEPTION
      'Story visual render asset scope mismatch for render %',
      NEW.id
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS story_visual_render_asset_scope_guard
  ON media.story_visual_asset_set_renders;
CREATE TRIGGER story_visual_render_asset_scope_guard
BEFORE INSERT OR UPDATE OF asset_set_id, asset_id
ON media.story_visual_asset_set_renders
FOR EACH ROW
EXECUTE FUNCTION media.__assert_story_visual_render_asset_scope();

CREATE OR REPLACE FUNCTION media.__guard_story_visual_asset_set_scope_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM media.story_visual_asset_set_renders render
    JOIN media.media_assets asset ON asset.id = render.asset_id
    WHERE render.asset_set_id = NEW.id
      AND render.asset_id IS NOT NULL
      AND (
        asset.household_id IS DISTINCT FROM NEW.household_id
        OR asset.child_profile_id IS DISTINCT FROM NEW.child_profile_id
        OR asset.world_id IS DISTINCT FROM NEW.world_id
      )
  ) THEN
    RAISE EXCEPTION
      'Story visual asset set scope update would invalidate render asset scope: %',
      NEW.id
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS story_visual_asset_set_render_scope_guard
  ON media.story_visual_asset_sets;
CREATE TRIGGER story_visual_asset_set_render_scope_guard
BEFORE UPDATE OF household_id, child_profile_id, world_id
ON media.story_visual_asset_sets
FOR EACH ROW
EXECUTE FUNCTION media.__guard_story_visual_asset_set_scope_update();

CREATE OR REPLACE FUNCTION media.__guard_story_visual_media_asset_scope_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM media.story_visual_asset_set_renders render
    JOIN media.story_visual_asset_sets asset_set ON asset_set.id = render.asset_set_id
    WHERE render.asset_id = NEW.id
      AND (
        NEW.household_id IS DISTINCT FROM asset_set.household_id
        OR NEW.child_profile_id IS DISTINCT FROM asset_set.child_profile_id
        OR NEW.world_id IS DISTINCT FROM asset_set.world_id
      )
  ) THEN
    RAISE EXCEPTION
      'Media asset scope update would invalidate Story visual render scope: %',
      NEW.id
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS media_asset_story_visual_render_scope_guard
  ON media.media_assets;
CREATE TRIGGER media_asset_story_visual_render_scope_guard
BEFORE UPDATE OF household_id, child_profile_id, world_id
ON media.media_assets
FOR EACH ROW
EXECUTE FUNCTION media.__guard_story_visual_media_asset_scope_update();

COMMIT;
