-- Referential Integrity Audit: preserve and complete the PR-7 current-owner
-- companion contract.
--
-- 0014 represented character/avatar/NPC/household owners only. The canonical
-- inventory domain also permits child_profile and location owners. 0017 now
-- validates all canonical owner types in household scope; this migration
-- evolves the original PR-7 companion tables to the same contract, backfills
-- any current rows created since 0014, and installs write-through triggers so
-- the two typed representations cannot diverge.

BEGIN;

ALTER TABLE profile.inventory_ownership_typed_owners
  ADD COLUMN IF NOT EXISTS child_profile_id UUID,
  ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE profile.inventory_container_typed_owners
  ADD COLUMN IF NOT EXISTS child_profile_id UUID,
  ADD COLUMN IF NOT EXISTS location_id UUID;

ALTER TABLE profile.inventory_ownership_typed_owners
  DROP CONSTRAINT IF EXISTS inventory_ownership_child_profile_fk,
  DROP CONSTRAINT IF EXISTS inventory_ownership_location_fk,
  DROP CONSTRAINT IF EXISTS inventory_ownership_one_typed_owner_check;
ALTER TABLE profile.inventory_ownership_typed_owners
  ADD CONSTRAINT inventory_ownership_child_profile_fk
    FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles (id),
  ADD CONSTRAINT inventory_ownership_location_fk
    FOREIGN KEY (location_id) REFERENCES profile.world_locations (id),
  ADD CONSTRAINT inventory_ownership_one_typed_owner_check CHECK (
    ((child_profile_id IS NOT NULL)::integer +
     (child_avatar_id IS NOT NULL)::integer +
     (npc_id IS NOT NULL)::integer +
     (household_id IS NOT NULL)::integer +
     (location_id IS NOT NULL)::integer) = 1
    AND owner_id = COALESCE(
      child_profile_id,
      child_avatar_id,
      npc_id,
      household_id,
      location_id
    )
    AND (
      (owner_type = 'child_profile' AND child_profile_id IS NOT NULL)
      OR (owner_type IN ('character', 'child_avatar') AND child_avatar_id IS NOT NULL)
      OR (owner_type IN ('character', 'npc') AND npc_id IS NOT NULL)
      OR (owner_type = 'household' AND household_id IS NOT NULL)
      OR (owner_type = 'location' AND location_id IS NOT NULL)
    )
  );

ALTER TABLE profile.inventory_container_typed_owners
  DROP CONSTRAINT IF EXISTS inventory_container_child_profile_fk,
  DROP CONSTRAINT IF EXISTS inventory_container_location_fk,
  DROP CONSTRAINT IF EXISTS inventory_container_one_typed_owner_check;
ALTER TABLE profile.inventory_container_typed_owners
  ADD CONSTRAINT inventory_container_child_profile_fk
    FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles (id),
  ADD CONSTRAINT inventory_container_location_fk
    FOREIGN KEY (location_id) REFERENCES profile.world_locations (id),
  ADD CONSTRAINT inventory_container_one_typed_owner_check CHECK (
    ((child_profile_id IS NOT NULL)::integer +
     (child_avatar_id IS NOT NULL)::integer +
     (npc_id IS NOT NULL)::integer +
     (household_id IS NOT NULL)::integer +
     (location_id IS NOT NULL)::integer) = 1
    AND owner_id = COALESCE(
      child_profile_id,
      child_avatar_id,
      npc_id,
      household_id,
      location_id
    )
    AND (
      (owner_type = 'child_profile' AND child_profile_id IS NOT NULL)
      OR (owner_type IN ('character', 'child_avatar') AND child_avatar_id IS NOT NULL)
      OR (owner_type IN ('character', 'npc') AND npc_id IS NOT NULL)
      OR (owner_type = 'household' AND household_id IS NOT NULL)
      OR (owner_type = 'location' AND location_id IS NOT NULL)
    )
  );

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
WHERE ownership.status = 'active'
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
WHERE inventory.lifecycle_status = 'active'
ON CONFLICT (inventory_id) DO UPDATE
SET owner_type = EXCLUDED.owner_type,
    owner_id = EXCLUDED.owner_id,
    child_profile_id = EXCLUDED.child_profile_id,
    child_avatar_id = EXCLUDED.child_avatar_id,
    npc_id = EXCLUDED.npc_id,
    household_id = EXCLUDED.household_id,
    location_id = EXCLUDED.location_id;

CREATE OR REPLACE FUNCTION profile.__inventory_sync_current_ownership_companion()
RETURNS TRIGGER AS $$
DECLARE
  typed RECORD;
BEGIN
  SELECT
    child_profile_id,
    child_avatar_id,
    npc_id,
    household_id,
    location_id
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
    child_profile_id,
    child_avatar_id,
    npc_id,
    household_id,
    location_id
  ) VALUES (
    NEW.id,
    NEW.owner_type,
    NEW.owner_id,
    typed.child_profile_id,
    typed.child_avatar_id,
    typed.npc_id,
    typed.household_id,
    typed.location_id
  )
  ON CONFLICT (ownership_id) DO UPDATE
  SET owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      child_profile_id = EXCLUDED.child_profile_id,
      child_avatar_id = EXCLUDED.child_avatar_id,
      npc_id = EXCLUDED.npc_id,
      household_id = EXCLUDED.household_id,
      location_id = EXCLUDED.location_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_sync_current_container_companion()
RETURNS TRIGGER AS $$
DECLARE
  typed RECORD;
BEGIN
  SELECT
    child_profile_id,
    child_avatar_id,
    npc_id,
    household_id,
    location_id
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
    child_profile_id,
    child_avatar_id,
    npc_id,
    household_id,
    location_id
  ) VALUES (
    NEW.id,
    NEW.owner_type,
    NEW.owner_id,
    typed.child_profile_id,
    typed.child_avatar_id,
    typed.npc_id,
    typed.household_id,
    typed.location_id
  )
  ON CONFLICT (inventory_id) DO UPDATE
  SET owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      child_profile_id = EXCLUDED.child_profile_id,
      child_avatar_id = EXCLUDED.child_avatar_id,
      npc_id = EXCLUDED.npc_id,
      household_id = EXCLUDED.household_id,
      location_id = EXCLUDED.location_id;

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
