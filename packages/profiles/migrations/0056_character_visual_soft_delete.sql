-- Soft-delete support for character visual variants.
-- Adds deleted_at and expands lifecycle_state to include 'deleted'.
-- Deleted variants remain in the row (provenance preserved) but are excluded
-- from presentation role resolution and the visual variant gallery.

ALTER TABLE profile.character_visual_assets
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'character_visual_assets_lifecycle_check'
      AND conrelid = 'profile.character_visual_assets'::regclass
  ) THEN
    ALTER TABLE profile.character_visual_assets
      ADD CONSTRAINT character_visual_assets_lifecycle_check
      CHECK (lifecycle_state IN ('candidate','canonical','rejected','archived','deleted'));
  ELSE
    ALTER TABLE profile.character_visual_assets
      DROP CONSTRAINT character_visual_assets_lifecycle_check;
    ALTER TABLE profile.character_visual_assets
      ADD CONSTRAINT character_visual_assets_lifecycle_check
      CHECK (lifecycle_state IN ('candidate','canonical','rejected','archived','deleted'));
  END IF;
END $$;
