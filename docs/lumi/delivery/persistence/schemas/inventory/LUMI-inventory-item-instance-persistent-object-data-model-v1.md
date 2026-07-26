# Project LUMI — Inventory, Item Instance and Persistent Object Data Model v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** Database Domain Map, Conceptual ERD v1, Logical Data Model v1, PK/FK & Ownership Model v1, Story Session Transaction Boundaries v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the canonical data model for:

- item definitions;
- unique item instances;
- stackable items;
- inventories;
- ownership;
- item transfer;
- equipping;
- durability and condition;
- item capabilities;
- story persistence;
- world-bound and child-bound objects;
- item history and provenance;
- item effects and usage.

The goal is to support persistent objects that can survive across story sessions and remain meaningful in the living world.

---

## 2. Core Principle

Project LUMI distinguishes between:

1. **Item Definition**
2. **Item Instance**
3. **Inventory Entry**

### Item Definition

Represents what an item is.

Examples:

- wooden key;
- healing berry;
- old map;
- blue scarf;
- lantern.

### Item Instance

Represents one unique physical or narrative object.

Examples:

- the specific old map found in the cave;
- Lina’s blue scarf;
- the dragon egg rescued in a previous story.

### Inventory Entry

Represents where the item currently is and in what quantity.

---

## 3. Item Definition Table

### Table: `item_definitions`

Recommended fields:

```text
id UUID PK
world_id UUID NULL
code TEXT NOT NULL
name TEXT NOT NULL
description TEXT NULL
item_type TEXT NOT NULL
stackable BOOLEAN NOT NULL DEFAULT false
max_stack_size INTEGER NULL
unique_by_default BOOLEAN NOT NULL DEFAULT false
durability_enabled BOOLEAN NOT NULL DEFAULT false
default_durability NUMERIC NULL
weight NUMERIC NULL
rarity TEXT NOT NULL
status TEXT NOT NULL
properties_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
version INTEGER NOT NULL DEFAULT 1
```

### Uniqueness

Recommended:

```sql
UNIQUE (world_id, code)
```

Global definitions use:

```text
world_id = NULL
```

World-specific definitions use a concrete `world_id`.

---

## 4. Item Types

Canonical item types:

```text
consumable
tool
key
map
clothing
container
quest_item
collectible
companion_token
crafting_material
document
artifact
currency_like
decorative
unknown
```

The type is authoritative and stored as a normal column.

Flexible attributes remain in `properties_jsonb`.

---

## 5. Stackable vs Unique Items

## 5.1 Stackable Items

Examples:

- berries;
- stones;
- seeds;
- paper stars.

Stored through:

```text
inventory_entries.item_definition_id
quantity > 0
item_instance_id = NULL
```

## 5.2 Unique Items

Examples:

- named sword;
- magical map;
- personal scarf;
- story-specific key;
- damaged lantern.

Stored through:

```text
inventory_entries.item_instance_id
quantity = 1
```

### Rule

A unique item instance can appear in only one active inventory entry.

---

## 6. Item Instance Table

### Table: `item_instances`

Recommended fields:

```text
id UUID PK
item_definition_id UUID NOT NULL
world_id UUID NULL
serial_code TEXT NULL
display_name TEXT NULL
custom_description TEXT NULL
condition_status TEXT NOT NULL
durability_current NUMERIC NULL
durability_max NUMERIC NULL
bound_scope TEXT NOT NULL
bound_user_id UUID NULL
bound_child_profile_id UUID NULL
bound_character_id UUID NULL
bound_world_id UUID NULL
origin_type TEXT NOT NULL
origin_id UUID NULL
provenance_jsonb JSONB NULL
state_jsonb JSONB NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
version INTEGER NOT NULL DEFAULT 1
```

### Condition Statuses

```text
new
good
worn
damaged
broken
restored
sealed
lost
destroyed
```

---

## 7. Bound Scope

Some items may be transferable, while others are bound.

Canonical values:

```text
unbound
user_bound
child_bound
character_bound
world_bound
story_bound
system_bound
```

### Examples

- A family subscription reward may be `user_bound`.
- A child’s personal keepsake may be `child_bound`.
- A companion badge may be `character_bound`.
- An ancient gate key may be `world_bound`.
- A tutorial object may be `story_bound`.

### Rule

Binding rules are enforced during transfer validation.

---

## 8. Inventory Table

### Table: `inventories`

Recommended fields:

```text
id UUID PK
inventory_type TEXT NOT NULL
character_id UUID NULL
child_profile_id UUID NULL
group_id UUID NULL
location_id UUID NULL
capacity_slots INTEGER NULL
capacity_weight NUMERIC NULL
status TEXT NOT NULL
metadata_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
version INTEGER NOT NULL DEFAULT 1
```

### Ownership Constraint

Exactly one owner must be non-null:

```sql
CHECK (
  num_nonnulls(
    character_id,
    child_profile_id,
    group_id,
    location_id
  ) = 1
)
```

---

## 9. Inventory Types

Canonical values:

```text
character_personal
child_shared
group_storage
location_container
quest_storage
temporary_story
system_reward
```

### Rule

Inventory type must match owner type.

Example:

- `character_personal` requires `character_id`.
- `child_shared` requires `child_profile_id`.
- `location_container` requires `location_id`.

---

## 10. Inventory Entry Table

### Table: `inventory_entries`

Recommended fields:

```text
id UUID PK
inventory_id UUID NOT NULL
item_definition_id UUID NOT NULL
item_instance_id UUID NULL
quantity INTEGER NOT NULL
slot_key TEXT NULL
equipped BOOLEAN NOT NULL DEFAULT false
equipped_slot TEXT NULL
locked BOOLEAN NOT NULL DEFAULT false
acquired_world_time TIMESTAMPTZ NULL
source_type TEXT NULL
source_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
version INTEGER NOT NULL DEFAULT 1
```

### Core Constraints

```sql
CHECK (quantity > 0)
```

For unique instance:

```text
item_instance_id IS NOT NULL
quantity = 1
```

For stackable item:

```text
item_instance_id IS NULL
quantity >= 1
```

---

## 11. Unique Item Placement

Recommended uniqueness:

```sql
UNIQUE (item_instance_id)
WHERE item_instance_id IS NOT NULL
  AND active = true
```

If soft-delete or inactive rows exist, use a partial unique index.

### Rule

One active unique item instance cannot exist in two inventories simultaneously.

---

## 12. Item Transfer Table

### Table: `item_transfers`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PK
transfer_uuid UUID NOT NULL UNIQUE
item_definition_id UUID NOT NULL
item_instance_id UUID NULL
quantity INTEGER NOT NULL
from_inventory_id UUID NULL
to_inventory_id UUID NULL
transfer_type TEXT NOT NULL
story_session_id UUID NULL
world_event_id UUID NULL
reason_code TEXT NULL
idempotency_key TEXT NOT NULL UNIQUE
occurred_world_time TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
actor_type TEXT NULL
actor_id UUID NULL
metadata_jsonb JSONB NULL
```

### Transfer Types

```text
acquire
give
take
consume
drop
store
retrieve
reward
steal
lose
destroy
restore
craft
split
merge
```

---

## 13. Transfer Transaction Rule

An item transfer must atomically:

1. lock source inventory;
2. lock destination inventory;
3. validate binding;
4. validate quantity;
5. update source entry;
6. update/create destination entry;
7. write `item_transfers`;
8. append domain event;
9. write outbox record if needed;
10. commit.

No transfer history record may exist without corresponding state change.

---

## 14. Capacity Rules

Inventories may be constrained by:

- slot count;
- total weight;
- item type;
- equipped slot;
- locked story state.

Capacity rules are authoritative.

Possible fields:

```text
capacity_slots
capacity_weight
allowed_item_types_jsonb
blocked_item_types_jsonb
```

### Rule

Capacity checks happen inside the transfer transaction.

---

## 15. Equipped Items

Equipped state belongs to the inventory entry.

Recommended fields:

```text
equipped
equipped_slot
```

Canonical slots:

```text
head
body
hand_left
hand_right
back
neck
companion
tool
special
```

### Rule

A character cannot equip an item that is not in that character’s accessible inventory.

---

## 16. Durability and Condition

Durability applies only when:

```text
item_definitions.durability_enabled = true
```

Current durability belongs to the item instance.

### Example

```text
durability_current = 35
durability_max = 100
condition_status = damaged
```

### Rule

Stackable items do not carry individual durability unless converted into unique instances.

---

## 17. Item Capability Model

### Table: `item_capabilities`

Recommended fields:

```text
id UUID PK
code TEXT NOT NULL UNIQUE
name TEXT NOT NULL
description TEXT NULL
capability_type TEXT NOT NULL
default_parameters_jsonb JSONB NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

### Table: `item_capability_links`

```text
id UUID PK
item_definition_id UUID NULL
item_instance_id UUID NULL
item_capability_id UUID NOT NULL
parameters_jsonb JSONB NULL
priority INTEGER NOT NULL DEFAULT 0
active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL
```

Exactly one of:

```text
item_definition_id
item_instance_id
```

must be non-null.

---

## 18. Capability Examples

```text
opens_lock
reveals_map_area
heals
creates_light
summons_companion
stores_memory
protects_from_weather
allows_underwater_travel
activates_portal
changes_dialogue_option
```

Capabilities are reusable behavior definitions.

They must not be hidden only inside free-form story text.

---

## 19. Item Requirement Model

Story or choice requirements may reference:

- item definition;
- item instance;
- capability;
- quantity;
- condition;
- equipped state.

Recommended table:

### Table: `item_requirements`

```text
id UUID PK
requirement_owner_type TEXT NOT NULL
requirement_owner_id UUID NOT NULL
item_definition_id UUID NULL
item_instance_id UUID NULL
item_capability_id UUID NULL
minimum_quantity INTEGER NULL
must_be_equipped BOOLEAN NOT NULL DEFAULT false
minimum_durability NUMERIC NULL
consume_on_success BOOLEAN NOT NULL DEFAULT false
condition_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
```

For critical relationships, owner-specific join tables may later replace the generic owner reference.

---

## 20. Item Usage History

### Table: `item_usage_history`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PK
item_definition_id UUID NOT NULL
item_instance_id UUID NULL
inventory_id UUID NULL
character_id UUID NULL
story_session_id UUID NULL
choice_selection_id UUID NULL
usage_type TEXT NOT NULL
quantity INTEGER NOT NULL DEFAULT 1
effect_summary TEXT NULL
occurred_world_time TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
idempotency_key TEXT NOT NULL UNIQUE
```

### Usage Types

```text
equipped
unequipped
used
consumed
activated
opened
read
combined
repaired
damaged
```

---

## 21. Item Provenance

A unique item’s history should remain traceable.

Possible origin types:

```text
story_reward
world_found
crafted
gift
system_reward
imported
created_by_event
generated
unknown
```

Recommended provenance fields:

```text
origin_type
origin_id
provenance_jsonb
```

### Example

```json
{
  "found_in_location": "old-cave",
  "found_during_story": "story-session-uuid",
  "original_owner": "fox-character-uuid"
}
```

---

## 22. Story Persistence

Persistent items survive story completion.

A story session may grant an item to:

- character inventory;
- child shared inventory;
- world location inventory;
- companion character inventory.

### Rule

Story completion must never silently delete persistent items.

Temporary story items are handled separately.

---

## 23. Temporary Story Items

Temporary items use one of:

- `inventory_type = temporary_story`;
- `bound_scope = story_bound`;
- explicit expiry;
- cleanup policy.

Recommended fields:

```text
expires_at_story_end BOOLEAN
expires_world_time TIMESTAMPTZ NULL
cleanup_policy TEXT
```

### Cleanup Policies

```text
remove
convert_to_persistent
return_to_origin
drop_at_location
archive
```

Cleanup must be explicit and auditable.

---

## 24. Quest and Key Items

Quest items often need stricter rules.

Recommended properties:

```text
cannot_drop
cannot_destroy
cannot_transfer
consumed_on_use
story_visibility
unlock_scope
```

These may live in stable columns if frequently enforced, otherwise validated JSONB properties.

### Rule

Critical story progression must not depend on an item that can be accidentally lost without recovery logic.

---

## 25. Lost Items

A lost item remains a real object.

Possible behavior:

- moved to location inventory;
- marked as `lost`;
- linked to recovery event;
- visible in world news;
- discoverable by another character.

### Rule

“Lost” is usually a state transition, not deletion.

---

## 26. Destroyed Items

Destroyed unique items are not hard-deleted.

Recommended:

```text
status = destroyed
condition_status = destroyed
```

Transfer and usage history remain intact.

Recovery or restoration may create:

- same restored instance;
- new replacement instance linked to the original.

---

## 27. Containers

Container items may themselves own an inventory.

Recommended table:

### Table: `item_containers`

```text
id UUID PK
item_instance_id UUID NOT NULL UNIQUE
inventory_id UUID NOT NULL UNIQUE
created_at TIMESTAMPTZ NOT NULL
```

Example:

- backpack;
- treasure chest;
- magic pouch.

### Rule

Recursive containment depth must be bounded.

---

## 28. Item Relationships

Some items are linked.

Examples:

- key opens lock;
- map points to location;
- two fragments form artifact;
- book stores clue.

Recommended table:

### Table: `item_links`

```text
id UUID PK
source_item_instance_id UUID NULL
source_item_definition_id UUID NULL
target_type TEXT NOT NULL
target_id UUID NOT NULL
relation_type TEXT NOT NULL
metadata_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
```

Canonical relation types:

```text
opens
reveals
belongs_to
part_of
crafted_from
paired_with
points_to
stores
repairs
```

---

## 29. Child-Shared vs Character Inventory

### Character Inventory

Use for:

- equipped items;
- character-specific tools;
- personal keepsakes;
- items that affect character state.

### Child Shared Inventory

Use for:

- story selection items;
- cross-story collectibles;
- account-level child rewards;
- items available to multiple playable characters.

### Rule

Movement between these inventories is an explicit transfer.

---

## 30. World-Bound Items

World-bound items cannot leave their world.

Examples:

- local temple key;
- kingdom seal;
- weather crystal;
- location mechanism component.

Transfer validation must ensure destination owner belongs to the same world.

---

## 31. Cross-Story Item Use

A persistent item may unlock later content.

Example:

```text
Old Map acquired in Story A
used to reveal island in Story C
```

This must be supported through:

- item instance identity;
- capability links;
- item requirements;
- usage history;
- story choice validation.

---

## 32. Item and Memory Relationship

Items may create or reinforce memory.

Example:

- seeing the blue scarf recalls a friend;
- holding the old key recalls the cave;
- losing the dragon egg creates sadness.

Recommended table:

### Table: `item_memory_links`

```text
id UUID PK
item_instance_id UUID NOT NULL
memory_id UUID NOT NULL
relation_type TEXT NOT NULL
strength NUMERIC NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

---

## 33. Item and Emotion Effects

Items may have emotional meaning.

Examples:

- comfort object;
- feared artifact;
- family gift;
- symbol of trust.

These effects should be modeled through:

- capability/effect definitions;
- memory links;
- choice consequences;
- explicit event impacts.

Not solely through descriptive text.

---

## 34. Crafting Position

Advanced crafting is deferred.

MVP may support simple combinations.

Future tables:

- `crafting_recipes`
- `crafting_recipe_inputs`
- `crafting_recipe_outputs`
- `crafting_attempts`

Do not introduce a full crafting economy until the story use case requires it.

---

## 35. Item Definition Versioning

Changing an item definition must not invalidate existing instances.

Recommended approach:

- stable `item_definitions.id`;
- version field for compatible changes;
- separate version table if definitions become publishable content.

Existing instances may snapshot critical values such as:

- durability max;
- custom capabilities;
- original appearance.

---

## 36. Media Links

Item visuals use:

```text
item_asset_links
```

Possible roles:

```text
icon
thumbnail
inventory_card
story_illustration
damaged_variant
equipped_variant
```

Binary assets remain in object storage.

---

## 37. Domain Events

Important item events:

```text
inventory.item_acquired
inventory.item_transferred
inventory.item_consumed
inventory.item_lost
inventory.item_restored
inventory.item_destroyed
inventory.item_equipped
inventory.item_unequipped
inventory.capacity_changed
```

Domain event and outbox rows are written with the state mutation.

---

## 38. Concurrency Rules

Use row locks or optimistic concurrency for:

- source inventory;
- destination inventory;
- unique item instance;
- inventory entry.

Recommended lock order:

1. lower inventory UUID;
2. higher inventory UUID;
3. item instance;
4. inventory entries.

This reduces deadlock risk.

---

## 39. Idempotency

Required for:

- transfer;
- consume;
- reward grant;
- crafting;
- restore;
- destruction;
- story completion reward.

A retry with the same key must not duplicate items.

---

## 40. Soft Delete and Archival

Active item definitions may be archived.

Unique item instances with history should not be hard-deleted.

Recommended fields:

```text
archived_at
status
```

Historical transfer and usage records remain permanent according to retention rules.

---

## 41. MVP Tables

Required:

- `item_definitions`
- `item_instances`
- `inventories`
- `inventory_entries`
- `item_transfers`
- `item_capabilities`
- `item_capability_links`
- `item_usage_history`
- `item_requirements`

Optional for first playable:

- `item_containers`
- `item_links`
- `item_memory_links`

Deferred:

- full crafting model;
- complex economy valuation;
- marketplace;
- trading system.

---

## 42. Critical Constraints

1. Every inventory has exactly one owner.
2. Every unique item instance has at most one active inventory location.
3. Stackable items and unique instances use different storage rules.
4. Item transfer and transfer history commit atomically.
5. Bound items obey scope restrictions.
6. Persistent items survive story completion.
7. Temporary item cleanup is explicit.
8. Lost and destroyed items are not silently deleted.
9. Critical item capabilities are modeled explicitly.
10. Item requirements are validated inside story transactions.
11. Capacity is enforced transactionally.
12. Item usage is idempotent.
13. Cross-world transfer is prohibited for world-bound objects.
14. History remains traceable through provenance and transfer records.
15. Binary assets stay outside PostgreSQL.

---

## 43. Example Scenario

A child finds an old map.

### Definition

```text
item_definitions:
Old Map
type = map
stackable = false
unique_by_default = true
```

### Instance

```text
item_instances:
display_name = The Fox’s Old Map
bound_scope = child_bound
origin_type = story_reward
```

### Inventory

```text
child shared inventory
```

### Later Story

A choice checks:

```text
required capability = reveals_map_area
```

The map unlocks:

```text
Northern Island
```

The usage is recorded without deleting the map.

---

## 44. Decisions Finalized

1. Item definition, item instance and inventory entry are separate concepts.
2. Stackable and unique items use different constraints.
3. Every inventory has one explicit owner.
4. Persistent item history is append-only.
5. Transfers are atomic and idempotent.
6. Unique item instances cannot exist in multiple active inventories.
7. Item binding supports user, child, character, world and story scopes.
8. Item capabilities are explicit reusable definitions.
9. Story requirements may reference item, instance, capability or condition.
10. Persistent objects survive story completion.
11. Temporary objects require explicit cleanup policy.
12. Lost and destroyed objects remain historically traceable.
13. Child-shared and character inventories are separate.
14. Cross-story item use is a first-class capability.
15. Full crafting and economy systems are deferred.

---

## 45. Next Artifact

**Domain Event, Outbox and Integration Message Model v1**

The next document will define:

- domain event schema;
- transactional outbox;
- event naming;
- payload versioning;
- idempotency;
- consumer tracking;
- retries;
- dead-letter handling;
- integration boundaries;
- audit relationship.
