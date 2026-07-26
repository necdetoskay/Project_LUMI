BEGIN;

CREATE TABLE character.characters (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  child_profile_id UUID REFERENCES profile.child_profiles(id) ON DELETE SET NULL,
  current_location_id UUID REFERENCES world.locations(id) ON DELETE SET NULL,
  portrait_asset_id UUID REFERENCES media.assets(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  character_type VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (character_type IN ('child_avatar','npc','companion','guest')),
  CHECK (status IN ('active','inactive','missing','retired'))
);

CREATE UNIQUE INDEX characters_world_slug_unique_active
  ON character.characters(world_id, slug)
  WHERE deleted_at IS NULL;

CREATE TABLE character.trait_definitions (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  minimum_value REAL NOT NULL DEFAULT 0,
  maximum_value REAL NOT NULL DEFAULT 1,
  default_value REAL NOT NULL DEFAULT 0.5,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (minimum_value < maximum_value),
  CHECK (default_value BETWEEN minimum_value AND maximum_value)
);

CREATE TABLE character.character_traits (
  character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE CASCADE,
  trait_definition_id UUID NOT NULL REFERENCES character.trait_definitions(id) ON DELETE RESTRICT,
  value REAL NOT NULL CHECK (value BETWEEN 0 AND 1),
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, trait_definition_id)
);

CREATE TABLE character.emotion_definitions (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE character.character_emotions (
  character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE CASCADE,
  emotion_definition_id UUID NOT NULL REFERENCES character.emotion_definitions(id) ON DELETE RESTRICT,
  intensity REAL NOT NULL DEFAULT 0 CHECK (intensity BETWEEN 0 AND 1),
  decay_rate REAL NOT NULL DEFAULT 0.1 CHECK (decay_rate BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, emotion_definition_id)
);

CREATE TABLE character.relationships (
  id UUID PRIMARY KEY,
  source_character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE CASCADE,
  target_character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE CASCADE,
  relationship_type VARCHAR(60) NOT NULL DEFAULT 'acquaintance',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_character_id, target_character_id),
  CHECK (source_character_id <> target_character_id)
);

CREATE TABLE character.relationship_dimensions (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE character.relationship_values (
  relationship_id UUID NOT NULL REFERENCES character.relationships(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES character.relationship_dimensions(id) ON DELETE RESTRICT,
  value REAL NOT NULL DEFAULT 0 CHECK (value BETWEEN -1 AND 1),
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (relationship_id, dimension_id)
);

CREATE TABLE character.character_goals (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE CASCADE,
  goal_code VARCHAR(100) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  priority REAL NOT NULL DEFAULT 0.5 CHECK (priority BETWEEN 0 AND 1),
  due_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE character.character_conditions (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE CASCADE,
  condition_code VARCHAR(100) NOT NULL,
  severity REAL NOT NULL DEFAULT 0.5 CHECK (severity BETWEEN 0 AND 1),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory.item_definitions (
  id UUID PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  item_type VARCHAR(60) NOT NULL,
  icon_asset_id UUID REFERENCES media.assets(id) ON DELETE SET NULL,
  is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory.item_instances (
  id UUID PRIMARY KEY,
  item_definition_id UUID NOT NULL REFERENCES inventory.item_definitions(id) ON DELETE RESTRICT,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  state VARCHAR(40) NOT NULL DEFAULT 'available',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (state IN ('available','equipped','consumed','lost','destroyed'))
);

CREATE TABLE inventory.inventories (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  owner_character_id UUID REFERENCES character.characters(id) ON DELETE CASCADE,
  inventory_type VARCHAR(40) NOT NULL DEFAULT 'personal',
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_character_id, inventory_type),
  CHECK (inventory_type IN ('personal','shared','storage','quest'))
);

CREATE TABLE inventory.inventory_entries (
  inventory_id UUID NOT NULL REFERENCES inventory.inventories(id) ON DELETE CASCADE,
  item_instance_id UUID NOT NULL REFERENCES inventory.item_instances(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (inventory_id, item_instance_id),
  UNIQUE (item_instance_id)
);

CREATE TABLE inventory.item_history (
  id UUID PRIMARY KEY,
  item_instance_id UUID NOT NULL REFERENCES inventory.item_instances(id) ON DELETE CASCADE,
  from_inventory_id UUID REFERENCES inventory.inventories(id) ON DELETE SET NULL,
  to_inventory_id UUID REFERENCES inventory.inventories(id) ON DELETE SET NULL,
  event_type VARCHAR(60) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMIT;
