-- Referential Integrity Audit: close the remaining state-transition bypass.
--
-- 0017/0018 enforce typed ownership on owner-field writes. Historical rows
-- created before those triggers may still be inactive/archived and therefore
-- absent from the original PR-7 active-row backfill. A later state-only change
-- must not be able to activate one of those rows without typed validation.
-- This migration validates/backfills every current-owner row and makes status
-- changes part of both the canonical and PR-7 companion write-through paths.

BEGIN;

DROP TRIGGER IF EXISTS inventory_ownership_owner_reference_sync
  ON profile.inventory_ownerships;
CREATE TRIGGER inventory_ownership_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, item_instance_id, owner_type, owner_id, status
ON profile.inventory_ownerships
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_ownership_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_container_owner_reference_sync
  ON profile.inventory_inventories;
CREATE TRIGGER inventory_container_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, household_id, owner_type, owner_id, lifecycle_status
ON profile.inventory_inventories
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_container_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_ownership_current_companion_sync
  ON profile.inventory_ownerships;
CREATE TRIGGER inventory_ownership_current_companion_sync
AFTER INSERT OR UPDATE OF id, owner_type, owner_id, status
ON profile.inventory_ownerships
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_sync_current_ownership_companion();

DROP TRIGGER IF EXISTS inventory_container_current_companion_sync
  ON profile.inventory_inventories;
CREATE TRIGGER inventory_container_current_companion_sync
AFTER INSERT OR UPDATE OF id, owner_type, owner_id, lifecycle_status
ON profile.inventory_inventories
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_sync_current_container_companion();

DO $$
DECLARE
  row_record RECORD;
BEGIN
  FOR row_record IN
    SELECT ownership.id,
           ownership.owner_type,
           ownership.owner_id,
           item.household_id AS scope_household_id
    FROM profile.inventory_ownerships AS ownership
    INNER JOIN profile.inventory_item_instances AS item
      ON item.id = ownership.item_instance_id
  LOOP
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'ownership',
      row_record.id,
      row_record.owner_type,
      row_record.owner_id,
      row_record.scope_household_id
    );
  END LOOP;

  FOR row_record IN
    SELECT id, owner_type, owner_id, household_id AS scope_household_id
    FROM profile.inventory_inventories
  LOOP
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'inventory',
      row_record.id,
      row_record.owner_type,
      row_record.owner_id,
      row_record.scope_household_id
    );
  END LOOP;
END
$$;

INSERT INTO profile.inventory_ownership_typed_owners (
  ownership_id,
  owner_type,
  owner_id,
  child_profile_id,
  child_avatar_id,
  npc_id,
  household_id,
  location_id
)
SELECT
  ownership.id,
  ownership.owner_type,
  ownership.owner_id,
  typed.child_profile_id,
  typed.child_avatar_id,
  typed.npc_id,
  typed.household_id,
  typed.location_id
FROM profile.inventory_ownerships AS ownership
INNER JOIN profile.inventory_typed_owner_references AS typed
  ON typed.reference_kind = 'ownership'
 AND typed.reference_id = ownership.id
ON CONFLICT (ownership_id) DO UPDATE
SET owner_type = EXCLUDED.owner_type,
    owner_id = EXCLUDED.owner_id,
    child_profile_id = EXCLUDED.child_profile_id,
    child_avatar_id = EXCLUDED.child_avatar_id,
    npc_id = EXCLUDED.npc_id,
    household_id = EXCLUDED.household_id,
    location_id = EXCLUDED.location_id;

INSERT INTO profile.inventory_container_typed_owners (
  inventory_id,
  owner_type,
  owner_id,
  child_profile_id,
  child_avatar_id,
  npc_id,
  household_id,
  location_id
)
SELECT
  inventory.id,
  inventory.owner_type,
  inventory.owner_id,
  typed.child_profile_id,
  typed.child_avatar_id,
  typed.npc_id,
  typed.household_id,
  typed.location_id
FROM profile.inventory_inventories AS inventory
INNER JOIN profile.inventory_typed_owner_references AS typed
  ON typed.reference_kind = 'inventory'
 AND typed.reference_id = inventory.id
ON CONFLICT (inventory_id) DO UPDATE
SET owner_type = EXCLUDED.owner_type,
    owner_id = EXCLUDED.owner_id,
    child_profile_id = EXCLUDED.child_profile_id,
    child_avatar_id = EXCLUDED.child_avatar_id,
    npc_id = EXCLUDED.npc_id,
    household_id = EXCLUDED.household_id,
    location_id = EXCLUDED.location_id;

DO $$
DECLARE
  unresolved BIGINT;
BEGIN
  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_ownerships AS ownership
  LEFT JOIN profile.inventory_typed_owner_references AS canonical
    ON canonical.reference_kind = 'ownership'
   AND canonical.reference_id = ownership.id
  LEFT JOIN profile.inventory_ownership_typed_owners AS companion
    ON companion.ownership_id = ownership.id
  WHERE canonical.reference_id IS NULL
     OR companion.ownership_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory ownership has % unresolved typed current-owner row(s)',
      unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_inventories AS inventory
  LEFT JOIN profile.inventory_typed_owner_references AS canonical
    ON canonical.reference_kind = 'inventory'
   AND canonical.reference_id = inventory.id
  LEFT JOIN profile.inventory_container_typed_owners AS companion
    ON companion.inventory_id = inventory.id
  WHERE canonical.reference_id IS NULL
     OR companion.inventory_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory container has % unresolved typed current-owner row(s)',
      unresolved;
  END IF;
END
$$;

COMMIT;
