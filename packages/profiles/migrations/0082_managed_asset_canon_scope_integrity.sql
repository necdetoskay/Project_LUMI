-- Harden generic managed-asset canon identity at the database boundary.
--
-- A canon may only point at an asset from the exact same household, subject and
-- asset kind. Active canon assets are intentionally not nullable-on-delete:
-- deleting a selected asset must fail closed until the canon is explicitly
-- changed or archived by an owning workflow.

DO $$
DECLARE
  invalid_scope_count bigint;
  invalid_selected_state_count bigint;
BEGIN
  SELECT count(*)
  INTO invalid_scope_count
  FROM profile.managed_asset_canons canon
  JOIN profile.managed_assets asset
    ON asset.id = canon.selected_asset_id
  WHERE canon.selected_asset_id IS NOT NULL
    AND (
      asset.household_id IS DISTINCT FROM canon.household_id
      OR asset.subject_type IS DISTINCT FROM canon.subject_type
      OR asset.subject_id IS DISTINCT FROM canon.subject_id
      OR asset.asset_kind IS DISTINCT FROM canon.asset_kind
    );

  IF invalid_scope_count > 0 THEN
    RAISE EXCEPTION
      'Managed asset canon scope mismatch: % invalid row(s)',
      invalid_scope_count;
  END IF;

  SELECT count(*)
  INTO invalid_selected_state_count
  FROM profile.managed_asset_canons
  WHERE status = 'selected'
    AND selected_asset_id IS NULL;

  IF invalid_selected_state_count > 0 THEN
    RAISE EXCEPTION
      'Managed asset canon selected state mismatch: % invalid row(s)',
      invalid_selected_state_count;
  END IF;
END;
$$;

-- Drop the dependent FK before replacing the referenced unique identity so the
-- migration remains safe to replay directly in regression tests and recovery
-- tooling.
ALTER TABLE profile.managed_asset_canons
  DROP CONSTRAINT IF EXISTS managed_asset_canons_selected_asset_id_fkey;
ALTER TABLE profile.managed_asset_canons
  DROP CONSTRAINT IF EXISTS managed_asset_canons_selected_asset_scope_fk;

ALTER TABLE profile.managed_assets
  DROP CONSTRAINT IF EXISTS uq_managed_assets_canon_scope;
ALTER TABLE profile.managed_assets
  ADD CONSTRAINT uq_managed_assets_canon_scope
  UNIQUE (id, household_id, subject_type, subject_id, asset_kind);

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
  ON DELETE NO ACTION;

ALTER TABLE profile.managed_asset_canons
  DROP CONSTRAINT IF EXISTS managed_asset_canons_selected_pointer_check;
ALTER TABLE profile.managed_asset_canons
  ADD CONSTRAINT managed_asset_canons_selected_pointer_check
  CHECK (status <> 'selected' OR selected_asset_id IS NOT NULL);
