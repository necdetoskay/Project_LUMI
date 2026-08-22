-- Ensure a managed asset canon can only select an asset from the same
-- household, subject, and asset kind. Existing data is validated fail-closed
-- before the composite foreign key is installed.

DO $$
DECLARE
  invalid_count integer;
  sample_ids text;
BEGIN
  WITH invalid_canons AS (
    SELECT canon.id
    FROM profile.managed_asset_canons canon
    LEFT JOIN profile.managed_assets asset
      ON asset.id = canon.selected_asset_id
    WHERE canon.selected_asset_id IS NOT NULL
      AND (
        asset.id IS NULL
        OR asset.household_id IS DISTINCT FROM canon.household_id
        OR asset.subject_type IS DISTINCT FROM canon.subject_type
        OR asset.subject_id IS DISTINCT FROM canon.subject_id
        OR asset.asset_kind IS DISTINCT FROM canon.asset_kind
      )
  ), samples AS (
    SELECT id
    FROM invalid_canons
    ORDER BY id
    LIMIT 10
  )
  SELECT
    (SELECT count(*) FROM invalid_canons),
    (SELECT string_agg(id::text, ', ' ORDER BY id) FROM samples)
  INTO invalid_count, sample_ids;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'Managed asset canon selection scope mismatch: % invalid row(s); sample canon ids: %',
      invalid_count,
      COALESCE(sample_ids, '<none>');
  END IF;
END $$;

-- The asset id is already globally unique, but PostgreSQL requires the exact
-- referenced tuple to be backed by a non-partial unique key for a composite FK.
CREATE UNIQUE INDEX IF NOT EXISTS uq_managed_assets_canon_selection_scope
  ON profile.managed_assets (
    id,
    household_id,
    subject_type,
    subject_id,
    asset_kind
  );

ALTER TABLE profile.managed_asset_canons
  ADD CONSTRAINT managed_asset_canons_selected_asset_scope_fk
  FOREIGN KEY (
    selected_asset_id,
    household_id,
    subject_type,
    subject_id,
    asset_kind
  )
  REFERENCES profile.managed_assets (
    id,
    household_id,
    subject_type,
    subject_id,
    asset_kind
  )
  ON DELETE SET NULL (selected_asset_id)
  NOT VALID;

ALTER TABLE profile.managed_asset_canons
  VALIDATE CONSTRAINT managed_asset_canons_selected_asset_scope_fk;

-- Historical rows may already have lost their selected asset through the
-- legacy ON DELETE SET NULL FK while still claiming to be selected. Normalize
-- that stale state before installing the invariant below.
UPDATE profile.managed_asset_canons
SET status = 'draft',
    selected_at = NULL
WHERE selected_asset_id IS NULL
  AND status = 'selected';

-- PostgreSQL implements FK ON DELETE SET NULL as an UPDATE of the referencing
-- row. Normalize the canon state in that same UPDATE so physical asset deletion
-- keeps the row internally consistent instead of leaving selected + NULL.
CREATE OR REPLACE FUNCTION profile.normalize_managed_asset_canon_selection_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.selected_asset_id IS NULL AND NEW.status = 'selected' THEN
    NEW.status := 'draft';
    NEW.selected_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER managed_asset_canons_normalize_selection_state
BEFORE UPDATE OF selected_asset_id ON profile.managed_asset_canons
FOR EACH ROW
EXECUTE FUNCTION profile.normalize_managed_asset_canon_selection_state();

-- Defense in depth for SQL/alternate writers: a canon cannot advertise an
-- active selection without a selected asset pointer.
ALTER TABLE profile.managed_asset_canons
  ADD CONSTRAINT managed_asset_canons_selected_requires_asset
  CHECK (status <> 'selected' OR selected_asset_id IS NOT NULL);
