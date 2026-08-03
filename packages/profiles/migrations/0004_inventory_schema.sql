-- Sprint 07: Inventory and Persistent Objects
-- Additive migration: adds inventory/ownership tables to profile schema
-- Does NOT modify or drop existing Sprint 02/03/04/06 tables
-- Preserves all existing data

BEGIN;

-- 1. Item Definitions (template/catalog for item types)
CREATE TABLE IF NOT EXISTS profile.inventory_item_definitions (
  id UUID PRIMARY KEY,
  definition_key VARCHAR(120) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(40) NOT NULL,
  item_type VARCHAR(40) NOT NULL,
  rarity VARCHAR(40) NOT NULL,
  stack_mode VARCHAR(40) NOT NULL,
  max_stack_size INTEGER,
  durability_mode VARCHAR(40) NOT NULL,
  default_durability REAL,
  is_transferable BOOLEAN NOT NULL DEFAULT TRUE,
  is_equippable BOOLEAN NOT NULL DEFAULT FALSE,
  is_consumable BOOLEAN NOT NULL DEFAULT FALSE,
  is_story_selectable BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_owner_types JSONB NOT NULL DEFAULT '["character"]',
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_inv_item_def_key UNIQUE (definition_key)
);

CREATE INDEX IF NOT EXISTS inv_item_def_lifecycle_idx
  ON profile.inventory_item_definitions (lifecycle_status);

-- 2. Item Instances (concrete items in the world)
CREATE TABLE IF NOT EXISTS profile.inventory_item_instances (
  id UUID PRIMARY KEY,
  item_definition_id UUID NOT NULL
    REFERENCES profile.inventory_item_definitions(id)
    ON DELETE RESTRICT,
  instance_name VARCHAR(200),
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active',
  condition_status VARCHAR(20) NOT NULL DEFAULT 'pristine',
  durability_current REAL,
  durability_max REAL,
  quantity INTEGER NOT NULL DEFAULT 1,
  custom_properties JSONB NOT NULL DEFAULT '{}',
  origin_type VARCHAR(20) NOT NULL,
  origin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS inv_item_inst_def_idx
  ON profile.inventory_item_instances (item_definition_id);
CREATE INDEX IF NOT EXISTS inv_item_inst_lifecycle_idx
  ON profile.inventory_item_instances (lifecycle_status);

-- 3. Inventories (containers)
CREATE TABLE IF NOT EXISTS profile.inventory_inventories (
  id UUID PRIMARY KEY,
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  inventory_type VARCHAR(40) NOT NULL DEFAULT 'personal',
  display_name VARCHAR(200) NOT NULL,
  capacity_mode VARCHAR(20) NOT NULL DEFAULT 'unlimited',
  capacity_value INTEGER,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS inv_inv_owner_idx
  ON profile.inventory_inventories (owner_type, owner_id);

-- 4. Inventory Entries (items in containers)
CREATE TABLE IF NOT EXISTS profile.inventory_entries (
  id UUID PRIMARY KEY,
  inventory_id UUID NOT NULL
    REFERENCES profile.inventory_inventories(id)
    ON DELETE CASCADE,
  item_instance_id UUID NOT NULL
    REFERENCES profile.inventory_item_instances(id)
    ON DELETE RESTRICT,
  slot_key VARCHAR(80),
  sort_order INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  entry_status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inv_entry_inv_instance UNIQUE (inventory_id, item_instance_id)
);

CREATE INDEX IF NOT EXISTS inv_entry_inv_idx
  ON profile.inventory_entries (inventory_id, entry_status, sort_order);
CREATE INDEX IF NOT EXISTS inv_entry_instance_idx
  ON profile.inventory_entries (item_instance_id, entry_status);

-- 5. Item Ownerships (current + history; append-only active tracking)
CREATE TABLE IF NOT EXISTS profile.inventory_ownerships (
  id UUID PRIMARY KEY,
  item_instance_id UUID NOT NULL
    REFERENCES profile.inventory_item_instances(id)
    ON DELETE RESTRICT,
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  ownership_type VARCHAR(20) NOT NULL DEFAULT 'owned',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  source_type VARCHAR(40) NOT NULL,
  source_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

-- Partial unique index: exactly one active ownership per item
CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_ownership_active
  ON profile.inventory_ownerships (item_instance_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS inv_ownership_owner_idx
  ON profile.inventory_ownerships (owner_type, owner_id, status);
CREATE INDEX IF NOT EXISTS inv_ownership_source_idx
  ON profile.inventory_ownerships (source_type, source_id);

-- 6. Ownership History (append-only; all records including released)
CREATE TABLE IF NOT EXISTS profile.inventory_ownership_history (
  id UUID PRIMARY KEY,
  item_instance_id UUID NOT NULL
    REFERENCES profile.inventory_item_instances(id)
    ON DELETE RESTRICT,
  from_owner_type VARCHAR(40),
  from_owner_id UUID,
  to_owner_type VARCHAR(40) NOT NULL,
  to_owner_id UUID NOT NULL,
  ownership_type VARCHAR(20) NOT NULL,
  transfer_type VARCHAR(40) NOT NULL,
  reason TEXT,
  idempotency_key VARCHAR(200),
  actor_household_id UUID NOT NULL,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_own_hist_item_idx
  ON profile.inventory_ownership_history (item_instance_id, created_at DESC);

-- 7. Item Transfers (audit trail)
CREATE TABLE IF NOT EXISTS profile.inventory_transfers (
  id UUID PRIMARY KEY,
  item_instance_id UUID NOT NULL
    REFERENCES profile.inventory_item_instances(id)
    ON DELETE RESTRICT,
  from_owner_type VARCHAR(40) NOT NULL,
  from_owner_id UUID NOT NULL,
  to_owner_type VARCHAR(40) NOT NULL,
  to_owner_id UUID NOT NULL,
  transfer_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  source_type VARCHAR(40) NOT NULL,
  source_id UUID,
  idempotency_key VARCHAR(200),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS inv_transfer_item_idx
  ON profile.inventory_transfers (item_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inv_transfer_idempotency_idx
  ON profile.inventory_transfers (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 8. Item Usages
CREATE TABLE IF NOT EXISTS profile.inventory_usages (
  id UUID PRIMARY KEY,
  item_instance_id UUID NOT NULL
    REFERENCES profile.inventory_item_instances(id)
    ON DELETE RESTRICT,
  used_by_owner_type VARCHAR(40) NOT NULL,
  used_by_owner_id UUID NOT NULL,
  usage_type VARCHAR(40) NOT NULL,
  usage_context TEXT,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  validation_status VARCHAR(20) NOT NULL DEFAULT 'valid',
  application_status VARCHAR(20) NOT NULL DEFAULT 'applied',
  idempotency_key VARCHAR(200),
  actor_household_id UUID NOT NULL,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_usage_item_idx
  ON profile.inventory_usages (item_instance_id, created_at DESC);

-- 9. Inventory Domain Events (immutable audit)
CREATE TABLE IF NOT EXISTS profile.inventory_domain_events (
  id UUID PRIMARY KEY,
  item_instance_id UUID NOT NULL
    REFERENCES profile.inventory_item_instances(id)
    ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  actor_household_id UUID NOT NULL,
  actor_user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  idempotency_key VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_events_item_idx
  ON profile.inventory_domain_events (item_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inv_events_type_idx
  ON profile.inventory_domain_events (event_type, created_at DESC);

-- 10. Idempotency ledger for inventory operations
CREATE TABLE IF NOT EXISTS profile.inventory_idempotency_ledger (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR(200) NOT NULL,
  operation_type VARCHAR(40) NOT NULL,
  item_instance_id UUID NOT NULL,
  actor_household_id UUID NOT NULL,
  result_status VARCHAR(20) NOT NULL DEFAULT 'completed',
  result_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inv_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS inv_idempotency_item_idx
  ON profile.inventory_idempotency_ledger (item_instance_id, operation_type);

-- Ensure all existing sequences are untouched
COMMIT;
