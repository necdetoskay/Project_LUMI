-- Referential Integrity Audit: typed inventory owner references.
--
-- PR-7 backfilled typed companions for current ownership/container rows, but
-- legacy writers can still insert those parent rows without a companion, and
-- audit/transfer/usage owner references remain UUID-only. This migration adds
-- one canonical typed reference registry plus write-through triggers so every
-- future owner reference is validated transactionally against the typed owner
-- identity in the same household scope.
--
-- Canonical domain owner types are household, child_profile, character and
-- location. The historical child_avatar/npc aliases remain accepted for
-- forward compatibility with pre-domain rows, but new application writes use
-- the canonical four-value contract.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS child_profiles_id_household_unique
  ON profile.child_profiles (id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS child_avatars_id_household_unique
  ON profile.child_avatars (character_id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS world_npcs_id_household_unique
  ON profile.world_npcs (character_id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS worlds_id_household_unique
  ON profile.worlds (id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS world_locations_id_world_unique
  ON profile.world_locations (id, world_id);

CREATE TABLE IF NOT EXISTS profile.inventory_typed_owner_references (
  reference_kind VARCHAR(32) NOT NULL,
  reference_id UUID NOT NULL,
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  scope_household_id UUID NOT NULL,
  child_profile_id UUID,
  child_avatar_id UUID,
  npc_id UUID,
  household_id UUID,
  location_id UUID,
  location_world_id UUID,
  PRIMARY KEY (reference_kind, reference_id),
  CONSTRAINT inventory_typed_owner_reference_kind_check CHECK (
    reference_kind IN (
      'ownership',
      'inventory',
      'ownership_history_from',
      'ownership_history_to',
      'transfer_from',
      'transfer_to',
      'usage'
    )
  ),
  CONSTRAINT inventory_typed_owner_reference_scope_household_fk
    FOREIGN KEY (scope_household_id)
    REFERENCES profile.households (id),
  CONSTRAINT inventory_typed_owner_reference_child_profile_scope_fk
    FOREIGN KEY (child_profile_id, scope_household_id)
    REFERENCES profile.child_profiles (id, household_id),
  CONSTRAINT inventory_typed_owner_reference_avatar_scope_fk
    FOREIGN KEY (child_avatar_id, scope_household_id)
    REFERENCES profile.child_avatars (character_id, household_id),
  CONSTRAINT inventory_typed_owner_reference_npc_scope_fk
    FOREIGN KEY (npc_id, scope_household_id)
    REFERENCES profile.world_npcs (character_id, household_id),
  CONSTRAINT inventory_typed_owner_reference_household_fk
    FOREIGN KEY (household_id)
    REFERENCES profile.households (id),
  CONSTRAINT inventory_typed_owner_reference_location_fk
    FOREIGN KEY (location_id, location_world_id)
    REFERENCES profile.world_locations (id, world_id),
  CONSTRAINT inventory_typed_owner_reference_location_world_scope_fk
    FOREIGN KEY (location_world_id, scope_household_id)
    REFERENCES profile.worlds (id, household_id),
  CONSTRAINT inventory_typed_owner_reference_location_pair_check CHECK (
    (location_id IS NULL) = (location_world_id IS NULL)
  ),
  CONSTRAINT inventory_typed_owner_reference_one_owner_check CHECK (
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
      OR (
        owner_type = 'household'
        AND household_id IS NOT NULL
        AND household_id = scope_household_id
      )
      OR (owner_type = 'location' AND location_id IS NOT NULL)
    )
  )
);

CREATE INDEX IF NOT EXISTS inventory_typed_owner_reference_owner_idx
  ON profile.inventory_typed_owner_references (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS inventory_typed_owner_reference_scope_idx
  ON profile.inventory_typed_owner_references (scope_household_id, reference_kind);

CREATE OR REPLACE FUNCTION profile.__inventory_assert_item_household(
  p_item_instance_id UUID,
  p_scope_household_id UUID
)
RETURNS VOID AS $$
DECLARE
  item_household_id UUID;
BEGIN
  SELECT item.household_id
  INTO item_household_id
  FROM profile.inventory_item_instances AS item
  WHERE item.id = p_item_instance_id;

  IF item_household_id IS NULL THEN
    RAISE EXCEPTION
      'Inventory owner reference cannot resolve item household for %',
      p_item_instance_id;
  END IF;

  IF item_household_id <> p_scope_household_id THEN
    RAISE EXCEPTION
      'Inventory item % belongs to household %, not actor household %',
      p_item_instance_id,
      item_household_id,
      p_scope_household_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_sync_typed_owner_reference(
  p_reference_kind VARCHAR,
  p_reference_id UUID,
  p_owner_type VARCHAR,
  p_owner_id UUID,
  p_scope_household_id UUID
)
RETURNS VOID AS $$
DECLARE
  child_profile_match BOOLEAN := FALSE;
  avatar_match BOOLEAN := FALSE;
  npc_match BOOLEAN := FALSE;
  household_match BOOLEAN := FALSE;
  location_match BOOLEAN := FALSE;
  resolved_location_world_id UUID;
  match_count INTEGER := 0;
BEGIN
  IF p_reference_id IS NULL
     OR p_owner_type IS NULL
     OR p_owner_id IS NULL
     OR p_scope_household_id IS NULL THEN
    RAISE EXCEPTION
      'Inventory typed owner reference requires kind/id/type/owner/scope';
  END IF;

  IF p_reference_kind NOT IN (
    'ownership',
    'inventory',
    'ownership_history_from',
    'ownership_history_to',
    'transfer_from',
    'transfer_to',
    'usage'
  ) THEN
    RAISE EXCEPTION 'Unsupported inventory owner reference kind: %', p_reference_kind;
  END IF;

  IF p_owner_type NOT IN (
    'household',
    'child_profile',
    'character',
    'location',
    'child_avatar',
    'npc'
  ) THEN
    RAISE EXCEPTION 'Unsupported inventory owner type: %', p_owner_type;
  END IF;

  IF p_owner_type = 'child_profile' THEN
    SELECT EXISTS (
      SELECT 1
      FROM profile.child_profiles AS child_profile
      WHERE child_profile.id = p_owner_id
        AND child_profile.household_id = p_scope_household_id
    ) INTO child_profile_match;
  END IF;

  IF p_owner_type IN ('character', 'child_avatar') THEN
    SELECT EXISTS (
      SELECT 1
      FROM profile.child_avatars AS avatar
      WHERE avatar.character_id = p_owner_id
        AND avatar.household_id = p_scope_household_id
    ) INTO avatar_match;
  END IF;

  IF p_owner_type IN ('character', 'npc') THEN
    SELECT EXISTS (
      SELECT 1
      FROM profile.world_npcs AS npc
      WHERE npc.character_id = p_owner_id
        AND npc.household_id = p_scope_household_id
    ) INTO npc_match;
  END IF;

  IF p_owner_type = 'household' THEN
    SELECT p_owner_id = p_scope_household_id
      AND EXISTS (
        SELECT 1
        FROM profile.households AS household
        WHERE household.id = p_owner_id
      )
    INTO household_match;
  END IF;

  IF p_owner_type = 'location' THEN
    SELECT location.world_id
    INTO resolved_location_world_id
    FROM profile.world_locations AS location
    INNER JOIN profile.worlds AS world
      ON world.id = location.world_id
    WHERE location.id = p_owner_id
      AND world.household_id = p_scope_household_id;

    location_match := resolved_location_world_id IS NOT NULL;
  END IF;

  match_count :=
    child_profile_match::integer +
    avatar_match::integer +
    npc_match::integer +
    household_match::integer +
    location_match::integer;

  IF match_count <> 1 THEN
    RAISE EXCEPTION
      'Inventory owner reference %/% has % typed owner match(es) in household %',
      p_owner_type,
      p_owner_id,
      match_count,
      p_scope_household_id;
  END IF;

  INSERT INTO profile.inventory_typed_owner_references (
    reference_kind,
    reference_id,
    owner_type,
    owner_id,
    scope_household_id,
    child_profile_id,
    child_avatar_id,
    npc_id,
    household_id,
    location_id,
    location_world_id
  ) VALUES (
    p_reference_kind,
    p_reference_id,
    p_owner_type,
    p_owner_id,
    p_scope_household_id,
    CASE WHEN child_profile_match THEN p_owner_id END,
    CASE WHEN avatar_match THEN p_owner_id END,
    CASE WHEN npc_match THEN p_owner_id END,
    CASE WHEN household_match THEN p_owner_id END,
    CASE WHEN location_match THEN p_owner_id END,
    CASE WHEN location_match THEN resolved_location_world_id END
  )
  ON CONFLICT (reference_kind, reference_id) DO UPDATE
  SET owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      scope_household_id = EXCLUDED.scope_household_id,
      child_profile_id = EXCLUDED.child_profile_id,
      child_avatar_id = EXCLUDED.child_avatar_id,
      npc_id = EXCLUDED.npc_id,
      household_id = EXCLUDED.household_id,
      location_id = EXCLUDED.location_id,
      location_world_id = EXCLUDED.location_world_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_ownership_owner_reference_trigger()
RETURNS TRIGGER AS $$
DECLARE
  scope_household UUID;
BEGIN
  SELECT item.household_id
  INTO scope_household
  FROM profile.inventory_item_instances AS item
  WHERE item.id = NEW.item_instance_id;

  IF scope_household IS NULL THEN
    RAISE EXCEPTION
      'Inventory ownership % cannot resolve item household for %',
      NEW.id,
      NEW.item_instance_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'ownership' AND reference_id = OLD.id;
  END IF;

  PERFORM profile.__inventory_sync_typed_owner_reference(
    'ownership', NEW.id, NEW.owner_type, NEW.owner_id, scope_household
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_container_owner_reference_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'inventory' AND reference_id = OLD.id;
  END IF;

  PERFORM profile.__inventory_sync_typed_owner_reference(
    'inventory', NEW.id, NEW.owner_type, NEW.owner_id, NEW.household_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_history_owner_reference_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM profile.__inventory_assert_item_household(
    NEW.item_instance_id,
    NEW.actor_household_id
  );

  IF (NEW.from_owner_type IS NULL) <> (NEW.from_owner_id IS NULL) THEN
    RAISE EXCEPTION
      'Inventory ownership history % requires from_owner_type/from_owner_id together',
      NEW.id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_id = OLD.id
      AND reference_kind IN ('ownership_history_from', 'ownership_history_to');
  END IF;

  IF NEW.from_owner_id IS NULL THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'ownership_history_from'
      AND reference_id = NEW.id;
  ELSE
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'ownership_history_from',
      NEW.id,
      NEW.from_owner_type,
      NEW.from_owner_id,
      NEW.actor_household_id
    );
  END IF;

  PERFORM profile.__inventory_sync_typed_owner_reference(
    'ownership_history_to',
    NEW.id,
    NEW.to_owner_type,
    NEW.to_owner_id,
    NEW.actor_household_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_transfer_owner_reference_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM profile.__inventory_assert_item_household(
    NEW.item_instance_id,
    NEW.actor_household_id
  );

  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_id = OLD.id
      AND reference_kind IN ('transfer_from', 'transfer_to');
  END IF;

  PERFORM profile.__inventory_sync_typed_owner_reference(
    'transfer_from',
    NEW.id,
    NEW.from_owner_type,
    NEW.from_owner_id,
    NEW.actor_household_id
  );
  PERFORM profile.__inventory_sync_typed_owner_reference(
    'transfer_to',
    NEW.id,
    NEW.to_owner_type,
    NEW.to_owner_id,
    NEW.actor_household_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_usage_owner_reference_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM profile.__inventory_assert_item_household(
    NEW.item_instance_id,
    NEW.actor_household_id
  );

  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'usage' AND reference_id = OLD.id;
  END IF;

  PERFORM profile.__inventory_sync_typed_owner_reference(
    'usage',
    NEW.id,
    NEW.used_by_owner_type,
    NEW.used_by_owner_id,
    NEW.actor_household_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profile.__inventory_owner_reference_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'inventory_ownerships' THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'ownership' AND reference_id = OLD.id;
  ELSIF TG_TABLE_NAME = 'inventory_inventories' THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'inventory' AND reference_id = OLD.id;
  ELSIF TG_TABLE_NAME = 'inventory_ownership_history' THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_id = OLD.id
      AND reference_kind IN ('ownership_history_from', 'ownership_history_to');
  ELSIF TG_TABLE_NAME = 'inventory_transfers' THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_id = OLD.id
      AND reference_kind IN ('transfer_from', 'transfer_to');
  ELSIF TG_TABLE_NAME = 'inventory_usages' THEN
    DELETE FROM profile.inventory_typed_owner_references
    WHERE reference_kind = 'usage' AND reference_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_ownership_owner_reference_sync
  ON profile.inventory_ownerships;
CREATE TRIGGER inventory_ownership_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, item_instance_id, owner_type, owner_id
ON profile.inventory_ownerships
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_ownership_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_container_owner_reference_sync
  ON profile.inventory_inventories;
CREATE TRIGGER inventory_container_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, household_id, owner_type, owner_id
ON profile.inventory_inventories
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_container_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_history_owner_reference_sync
  ON profile.inventory_ownership_history;
CREATE TRIGGER inventory_history_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, item_instance_id, from_owner_type, from_owner_id, to_owner_type, to_owner_id, actor_household_id
ON profile.inventory_ownership_history
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_history_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_transfer_owner_reference_sync
  ON profile.inventory_transfers;
CREATE TRIGGER inventory_transfer_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, item_instance_id, from_owner_type, from_owner_id, to_owner_type, to_owner_id, actor_household_id
ON profile.inventory_transfers
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_transfer_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_usage_owner_reference_sync
  ON profile.inventory_usages;
CREATE TRIGGER inventory_usage_owner_reference_sync
BEFORE INSERT OR UPDATE OF id, item_instance_id, used_by_owner_type, used_by_owner_id, actor_household_id
ON profile.inventory_usages
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_usage_owner_reference_trigger();

DROP TRIGGER IF EXISTS inventory_ownership_owner_reference_delete
  ON profile.inventory_ownerships;
CREATE TRIGGER inventory_ownership_owner_reference_delete
AFTER DELETE ON profile.inventory_ownerships
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_owner_reference_delete_trigger();

DROP TRIGGER IF EXISTS inventory_container_owner_reference_delete
  ON profile.inventory_inventories;
CREATE TRIGGER inventory_container_owner_reference_delete
AFTER DELETE ON profile.inventory_inventories
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_owner_reference_delete_trigger();

DROP TRIGGER IF EXISTS inventory_history_owner_reference_delete
  ON profile.inventory_ownership_history;
CREATE TRIGGER inventory_history_owner_reference_delete
AFTER DELETE ON profile.inventory_ownership_history
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_owner_reference_delete_trigger();

DROP TRIGGER IF EXISTS inventory_transfer_owner_reference_delete
  ON profile.inventory_transfers;
CREATE TRIGGER inventory_transfer_owner_reference_delete
AFTER DELETE ON profile.inventory_transfers
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_owner_reference_delete_trigger();

DROP TRIGGER IF EXISTS inventory_usage_owner_reference_delete
  ON profile.inventory_usages;
CREATE TRIGGER inventory_usage_owner_reference_delete
AFTER DELETE ON profile.inventory_usages
FOR EACH ROW
EXECUTE FUNCTION profile.__inventory_owner_reference_delete_trigger();

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
    WHERE ownership.status = 'active'
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
    WHERE lifecycle_status = 'active'
  LOOP
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'inventory',
      row_record.id,
      row_record.owner_type,
      row_record.owner_id,
      row_record.scope_household_id
    );
  END LOOP;

  FOR row_record IN
    SELECT * FROM profile.inventory_ownership_history
  LOOP
    PERFORM profile.__inventory_assert_item_household(
      row_record.item_instance_id,
      row_record.actor_household_id
    );

    IF (row_record.from_owner_type IS NULL) <> (row_record.from_owner_id IS NULL) THEN
      RAISE EXCEPTION
        'Inventory ownership history % has partial from-owner identity',
        row_record.id;
    END IF;

    IF row_record.from_owner_id IS NOT NULL THEN
      PERFORM profile.__inventory_sync_typed_owner_reference(
        'ownership_history_from',
        row_record.id,
        row_record.from_owner_type,
        row_record.from_owner_id,
        row_record.actor_household_id
      );
    END IF;

    PERFORM profile.__inventory_sync_typed_owner_reference(
      'ownership_history_to',
      row_record.id,
      row_record.to_owner_type,
      row_record.to_owner_id,
      row_record.actor_household_id
    );
  END LOOP;

  FOR row_record IN
    SELECT * FROM profile.inventory_transfers
  LOOP
    PERFORM profile.__inventory_assert_item_household(
      row_record.item_instance_id,
      row_record.actor_household_id
    );
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'transfer_from',
      row_record.id,
      row_record.from_owner_type,
      row_record.from_owner_id,
      row_record.actor_household_id
    );
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'transfer_to',
      row_record.id,
      row_record.to_owner_type,
      row_record.to_owner_id,
      row_record.actor_household_id
    );
  END LOOP;

  FOR row_record IN
    SELECT * FROM profile.inventory_usages
  LOOP
    PERFORM profile.__inventory_assert_item_household(
      row_record.item_instance_id,
      row_record.actor_household_id
    );
    PERFORM profile.__inventory_sync_typed_owner_reference(
      'usage',
      row_record.id,
      row_record.used_by_owner_type,
      row_record.used_by_owner_id,
      row_record.actor_household_id
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  unresolved BIGINT;
BEGIN
  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_ownerships AS ownership
  LEFT JOIN profile.inventory_typed_owner_references AS typed
    ON typed.reference_kind = 'ownership'
   AND typed.reference_id = ownership.id
  WHERE ownership.status = 'active'
    AND typed.reference_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory active ownership has % unresolved typed owner reference(s)',
      unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_inventories AS inventory
  LEFT JOIN profile.inventory_typed_owner_references AS typed
    ON typed.reference_kind = 'inventory'
   AND typed.reference_id = inventory.id
  WHERE inventory.lifecycle_status = 'active'
    AND typed.reference_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory container has % unresolved typed owner reference(s)',
      unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_ownership_history AS history
  LEFT JOIN profile.inventory_typed_owner_references AS typed
    ON typed.reference_kind = 'ownership_history_to'
   AND typed.reference_id = history.id
  WHERE typed.reference_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory ownership history has % unresolved to-owner reference(s)',
      unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_transfers AS transfer
  LEFT JOIN profile.inventory_typed_owner_references AS from_typed
    ON from_typed.reference_kind = 'transfer_from'
   AND from_typed.reference_id = transfer.id
  LEFT JOIN profile.inventory_typed_owner_references AS to_typed
    ON to_typed.reference_kind = 'transfer_to'
   AND to_typed.reference_id = transfer.id
  WHERE from_typed.reference_id IS NULL OR to_typed.reference_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory transfer has % unresolved typed endpoint(s)',
      unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_usages AS usage
  LEFT JOIN profile.inventory_typed_owner_references AS typed
    ON typed.reference_kind = 'usage'
   AND typed.reference_id = usage.id
  WHERE typed.reference_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION
      'Inventory usage has % unresolved typed owner reference(s)',
      unresolved;
  END IF;
END
$$;

COMMIT;
