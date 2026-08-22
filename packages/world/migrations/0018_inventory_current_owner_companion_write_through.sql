-- Referential Integrity Audit: preserve the PR-7 current-owner companion contract.
--
-- 0017 validates every future current owner before the parent write. These
-- AFTER triggers additionally materialize the existing PR-7 companion rows so
-- old and new typed representations cannot diverge.

BEGIN;

CREATE OR REPLACE FUNCTION profile.__inventory_sync_current_ownership_companion()
RETURNS TRIGGER AS $$
DECLARE
  typed RECORD;
BEGIN
  SELECT child_avatar_id, npc_id, household_id
  INTO typed
  FROM profile.inventory_typed_owner_references
  WHERE reference_kind = 'ownership'
    AND reference_id = NEW.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Inventory ownership % is missing canonical typed owner reference',
      NEW.id;
  END IF;

  INSERT INTO profile.inventory_ownership_typed_owners (
    ownership_id,
    owner_type,
    owner_id,
    child_avatar_id,
    npc_id,
    household_id
  ) VALUES (
    NEW.id,
    NEW.owner_type,
    NEW.owner_id,
    typed.child_avatar_id,
    typed.npc_id,
    typed.household_id
  )
  ON CONFLICT (ownership_id) DO UPDATE
  SET owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      child_avatar_id = EXCLUDED.child_avatar_id,
      npc_id = EXCLUDED.npc_id,
      household_id = EXCLUDED.household_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_sync_current_container_companion()
RETURNS TRIGGER AS $$
DECLARE
  typed RECORD;
BEGIN
  SELECT child_avatar_id, npc_id, household_id
  INTO typed
  FROM profile.inventory_typed_owner_references
  WHERE reference_kind = 'inventory'
    AND reference_id = NEW.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Inventory container % is missing canonical typed owner reference',
      NEW.id;
  END IF;

  INSERT INTO profile.inventory_container_typed_owners (
    inventory_id,
    owner_type,
    owner_id,
    child_avatar_id,
    npc_id,
    household_id
  ) VALUES (
    NEW.id,
    NEW.owner_type,
    NEW.owner_id,
    typed.child_avatar_id,
    typed.npc_id,
    typed.household_id
  )
  ON CONFLICT (inventory_id) DO UPDATE
  SET owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      child_avatar_id = EXCLUDED.child_avatar_id,
      npc_id = EXCLUDED.npc_id,
      household_id = EXCLUDED.household_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_ownership_current_companion_sync
  ON profile.inventory_ownerships;
CREATE TRIGGER inventory_ownership_current_companion_sync
AFTER INSERT OR UPDATE OF id, owner_type, owner_id
ON profile.inventory_ownerships
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_sync_current_ownership_companion();

DROP TRIGGER IF EXISTS inventory_container_current_companion_sync
  ON profile.inventory_inventories;
CREATE TRIGGER inventory_container_current_companion_sync
AFTER INSERT OR UPDATE OF id, owner_type, owner_id
ON profile.inventory_inventories
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_sync_current_container_companion();

DO $$
DECLARE
  unresolved BIGINT;
BEGIN
  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_ownerships AS ownership
  LEFT JOIN profile.inventory_ownership_typed_owners AS typed
    ON typed.ownership_id = ownership.id
  WHERE ownership.status = 'active'
    AND typed.ownership_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory active ownership has % missing PR-7 companion row(s)',
      unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_inventories AS inventory
  LEFT JOIN profile.inventory_container_typed_owners AS typed
    ON typed.inventory_id = inventory.id
  WHERE inventory.lifecycle_status = 'active'
    AND typed.inventory_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory container has % missing PR-7 companion row(s)',
      unresolved;
  END IF;
END
$$;

COMMIT;
