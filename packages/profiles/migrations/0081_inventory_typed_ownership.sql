-- PR-7 / Data Integrity Hardening
-- Replace UUID-only polymorphic ownership with typed FK-backed associations.

CREATE UNIQUE INDEX IF NOT EXISTS inventory_ownership_identity_unique
  ON profile.inventory_ownerships (id, owner_type, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_container_identity_unique
  ON profile.inventory_inventories (id, owner_type, owner_id);

CREATE TABLE IF NOT EXISTS profile.inventory_ownership_typed_owners (
  ownership_id UUID PRIMARY KEY,
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  child_avatar_id UUID,
  npc_id UUID,
  household_id UUID,
  CONSTRAINT inventory_ownership_typed_parent_fk
    FOREIGN KEY (ownership_id, owner_type, owner_id)
    REFERENCES profile.inventory_ownerships (id, owner_type, owner_id)
    ON DELETE CASCADE,
  CONSTRAINT inventory_ownership_avatar_fk
    FOREIGN KEY (child_avatar_id) REFERENCES profile.child_avatars (character_id),
  CONSTRAINT inventory_ownership_npc_fk
    FOREIGN KEY (npc_id) REFERENCES profile.world_npcs (character_id),
  CONSTRAINT inventory_ownership_household_fk
    FOREIGN KEY (household_id) REFERENCES profile.households (id),
  CONSTRAINT inventory_ownership_one_typed_owner_check CHECK (
    ((child_avatar_id IS NOT NULL)::integer +
     (npc_id IS NOT NULL)::integer +
     (household_id IS NOT NULL)::integer) = 1
    AND owner_id = COALESCE(child_avatar_id, npc_id, household_id)
    AND (
      (owner_type IN ('character', 'child_avatar') AND child_avatar_id IS NOT NULL)
      OR (owner_type IN ('character', 'npc') AND npc_id IS NOT NULL)
      OR (owner_type = 'household' AND household_id IS NOT NULL)
    )
  )
);

CREATE TABLE IF NOT EXISTS profile.inventory_container_typed_owners (
  inventory_id UUID PRIMARY KEY,
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  child_avatar_id UUID,
  npc_id UUID,
  household_id UUID,
  CONSTRAINT inventory_container_typed_parent_fk
    FOREIGN KEY (inventory_id, owner_type, owner_id)
    REFERENCES profile.inventory_inventories (id, owner_type, owner_id)
    ON DELETE CASCADE,
  CONSTRAINT inventory_container_avatar_fk
    FOREIGN KEY (child_avatar_id) REFERENCES profile.child_avatars (character_id),
  CONSTRAINT inventory_container_npc_fk
    FOREIGN KEY (npc_id) REFERENCES profile.world_npcs (character_id),
  CONSTRAINT inventory_container_household_fk
    FOREIGN KEY (household_id) REFERENCES profile.households (id),
  CONSTRAINT inventory_container_one_typed_owner_check CHECK (
    ((child_avatar_id IS NOT NULL)::integer +
     (npc_id IS NOT NULL)::integer +
     (household_id IS NOT NULL)::integer) = 1
    AND owner_id = COALESCE(child_avatar_id, npc_id, household_id)
    AND (
      (owner_type IN ('character', 'child_avatar') AND child_avatar_id IS NOT NULL)
      OR (owner_type IN ('character', 'npc') AND npc_id IS NOT NULL)
      OR (owner_type = 'household' AND household_id IS NOT NULL)
    )
  )
);

INSERT INTO profile.inventory_ownership_typed_owners (
  ownership_id, owner_type, owner_id, child_avatar_id, npc_id, household_id
)
SELECT ownership.id, ownership.owner_type, ownership.owner_id,
  CASE WHEN avatar.character_id IS NOT NULL THEN ownership.owner_id END,
  CASE WHEN npc.character_id IS NOT NULL THEN ownership.owner_id END,
  CASE WHEN household.id IS NOT NULL THEN ownership.owner_id END
FROM profile.inventory_ownerships AS ownership
LEFT JOIN profile.child_avatars AS avatar
  ON avatar.character_id = ownership.owner_id
  AND ownership.owner_type IN ('character', 'child_avatar')
LEFT JOIN profile.world_npcs AS npc
  ON npc.character_id = ownership.owner_id
  AND ownership.owner_type IN ('character', 'npc')
LEFT JOIN profile.households AS household
  ON household.id = ownership.owner_id
  AND ownership.owner_type = 'household'
WHERE ownership.status = 'active'
ON CONFLICT (ownership_id) DO NOTHING;

INSERT INTO profile.inventory_container_typed_owners (
  inventory_id, owner_type, owner_id, child_avatar_id, npc_id, household_id
)
SELECT inventory.id, inventory.owner_type, inventory.owner_id,
  CASE WHEN avatar.character_id IS NOT NULL THEN inventory.owner_id END,
  CASE WHEN npc.character_id IS NOT NULL THEN inventory.owner_id END,
  CASE WHEN household.id IS NOT NULL THEN inventory.owner_id END
FROM profile.inventory_inventories AS inventory
LEFT JOIN profile.child_avatars AS avatar
  ON avatar.character_id = inventory.owner_id
  AND inventory.owner_type IN ('character', 'child_avatar')
LEFT JOIN profile.world_npcs AS npc
  ON npc.character_id = inventory.owner_id
  AND inventory.owner_type IN ('character', 'npc')
LEFT JOIN profile.households AS household
  ON household.id = inventory.owner_id
  AND inventory.owner_type = 'household'
WHERE inventory.lifecycle_status = 'active'
ON CONFLICT (inventory_id) DO NOTHING;

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
    RAISE EXCEPTION 'Inventory active ownership has % unresolved typed owner(s)', unresolved;
  END IF;

  SELECT COUNT(*) INTO unresolved
  FROM profile.inventory_inventories AS inventory
  LEFT JOIN profile.inventory_container_typed_owners AS typed
    ON typed.inventory_id = inventory.id
  WHERE inventory.lifecycle_status = 'active'
    AND typed.inventory_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION 'Inventory container has % unresolved typed owner(s)', unresolved;
  END IF;
END
$$;
