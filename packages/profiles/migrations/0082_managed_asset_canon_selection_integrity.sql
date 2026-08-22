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
