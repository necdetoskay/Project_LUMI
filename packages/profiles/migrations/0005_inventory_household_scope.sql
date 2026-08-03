-- Sprint 07 Review Fix: Add household_id scoping to inventory tables
-- Additive migration: adds household_id columns for Family Space isolation
-- Does NOT modify or drop existing tables/data

BEGIN;

ALTER TABLE profile.inventory_item_instances
  ADD COLUMN IF NOT EXISTS household_id UUID;

ALTER TABLE profile.inventory_inventories
  ADD COLUMN IF NOT EXISTS household_id UUID;

-- Add index for household-scoped lookups
CREATE INDEX IF NOT EXISTS inv_item_inst_household_idx
  ON profile.inventory_item_instances (household_id);

CREATE INDEX IF NOT EXISTS inv_inv_household_idx
  ON profile.inventory_inventories (household_id);

COMMIT;
