-- Sprint 07 Review Fix: harden inventory household scope and idempotency
-- Forward-only migration. Fails fast if pre-existing inventory rows cannot be
-- safely assigned to a household.

BEGIN;

-- Backfill transfer household scope from item instances where possible.
ALTER TABLE profile.inventory_transfers
  ADD COLUMN IF NOT EXISTS actor_household_id UUID;

UPDATE profile.inventory_transfers AS t
SET actor_household_id = i.household_id
FROM profile.inventory_item_instances AS i
WHERE t.item_instance_id = i.id
  AND t.actor_household_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profile.inventory_item_instances WHERE household_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot harden inventory_item_instances.household_id: NULL rows exist; backfill before applying 0006.';
  END IF;

  IF EXISTS (SELECT 1 FROM profile.inventory_inventories WHERE household_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot harden inventory_inventories.household_id: NULL rows exist; backfill before applying 0006.';
  END IF;

  IF EXISTS (SELECT 1 FROM profile.inventory_transfers WHERE actor_household_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot harden inventory_transfers.actor_household_id: NULL rows exist; backfill before applying 0006.';
  END IF;
END $$;

ALTER TABLE profile.inventory_item_instances
  ALTER COLUMN household_id SET NOT NULL;

ALTER TABLE profile.inventory_inventories
  ALTER COLUMN household_id SET NOT NULL;

ALTER TABLE profile.inventory_transfers
  ALTER COLUMN actor_household_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_instances_household_fk'
  ) THEN
    ALTER TABLE profile.inventory_item_instances
      ADD CONSTRAINT inventory_item_instances_household_fk
      FOREIGN KEY (household_id)
      REFERENCES profile.households(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_inventories_household_fk'
  ) THEN
    ALTER TABLE profile.inventory_inventories
      ADD CONSTRAINT inventory_inventories_household_fk
      FOREIGN KEY (household_id)
      REFERENCES profile.households(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_idempotency_ledger_household_fk'
  ) THEN
    ALTER TABLE profile.inventory_idempotency_ledger
      ADD CONSTRAINT inventory_idempotency_ledger_household_fk
      FOREIGN KEY (actor_household_id)
      REFERENCES profile.households(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transfers_actor_household_fk'
  ) THEN
    ALTER TABLE profile.inventory_transfers
      ADD CONSTRAINT inventory_transfers_actor_household_fk
      FOREIGN KEY (actor_household_id)
      REFERENCES profile.households(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE profile.inventory_idempotency_ledger
  DROP CONSTRAINT IF EXISTS uq_inv_idempotency_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_idempotency_household_operation_key
  ON profile.inventory_idempotency_ledger (actor_household_id, operation_type, idempotency_key);

DROP INDEX IF EXISTS profile.inv_transfer_idempotency_idx;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_transfer_household_item_type_key
  ON profile.inventory_transfers (actor_household_id, item_instance_id, transfer_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;

