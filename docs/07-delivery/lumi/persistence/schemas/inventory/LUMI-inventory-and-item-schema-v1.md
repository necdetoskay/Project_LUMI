
# Project LUMI — Inventory and Item Schema v1

- **Document Type:** Persistence Schema Specification
- **Status:** Accepted
- **Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** Shared Database Types v1, World Schema v1, Character Schema v1, Story Schema v1

---

## 1. Purpose

This document defines the persistent PostgreSQL model for items, item instances, inventories, ownership, custody, durability, state changes, transfers and story-related acquisition in Project LUMI.

The model must support:

- reusable item definitions;
- unique item instances;
- stackable and non-stackable items;
- character, settlement, world and session inventories;
- item discovery and acquisition;
- item usage;
- item transfer;
- item damage and repair;
- item loss and recovery;
- story continuity;
- generated and one-of-a-kind items;
- auditable ownership history.

---

## 2. Domain Separation

The Inventory bounded context is divided into four layers:

### Item Definition Layer

Stores reusable templates:

- item name;
- item type;
- description;
- behavior metadata;
- durability rules;
- stacking rules;
- rarity;
- visual identity.

### Item Instance Layer

Stores persistent unique objects:

- instance identity;
- current condition;
- state;
- provenance;
- custom name;
- unique properties.

### Inventory Layer

Stores containers and entries:

- character inventories;
- location inventories;
- settlement inventories;
- story-session inventories;
- world/system inventories.

### Transaction Layer

Stores auditable actions:

- acquisition;
- transfer;
- use;
- consume;
- damage;
- repair;
- drop;
- recover;
- destroy;
- archive.

---

## 3. Aggregate Strategy

`ItemDefinition` is the aggregate root for reusable item templates.

`ItemInstance` is an aggregate root for unique persistent items.

`Inventory` is an aggregate root for ownership and custody.

Inventory-changing operations must be processed through application services, not by unrestricted direct table updates.

---

## 4. Item Definitions Table

### `item_definitions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Definition identifier |
| world_id | uuid | no | Optional world-specific definition |
| created_for_child_profile_id | uuid | no | Optional child-specific generated definition |
| name | text | yes | Display name |
| slug | text | yes | Stable scoped identifier |
| item_type | text / enum | yes | tool, key, map, food, gift, clothing, artifact, etc. |
| item_category | text | no | Optional secondary category |
| description | text | no | Item description |
| rarity | text / enum | yes | common, uncommon, rare, legendary, unique |
| stackable | boolean | yes | Whether quantity stacking is allowed |
| maximum_stack_size | integer | no | Maximum quantity per stack |
| durable | boolean | yes | Whether durability applies |
| maximum_durability | integer | no | Default maximum durability |
| consumable | boolean | yes | Whether use may consume quantity |
| transferable | boolean | yes | Whether transfer is allowed |
| unique_per_world | boolean | yes | Whether only one active instance may exist |
| behavior_profile | jsonb | no | Versioned functional metadata |
| visual_profile | jsonb | no | Illustration/icon metadata |
| lifecycle_status | text / enum | yes | draft, active, retired, archived |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Optimistic concurrency version |

---

## 5. Definition Scope

Item definitions may be:

```text
global
world-specific
child-specific
story-generated
```

Rules:

- global definitions have no `world_id` or child owner;
- world-specific definitions belong to one world;
- child-specific definitions may only be used in that child’s worlds;
- story-generated definitions become immutable after an instance is presented to the child;
- retired definitions remain valid for existing instances.

Recommended uniqueness:

```text
UNIQUE (world_id, slug)
```

A separate namespace is required for global definitions.

---

## 6. Item Type Strategy

Recommended initial item types:

```text
tool
key
map
food
medicine
gift
clothing
book
toy
artifact
container
material
quest_item
companion_item
vehicle
miscellaneous
```

Database types should remain broad.

Detailed behavior belongs to versioned profiles and application services.

---

## 7. Item Instances Table

### `item_instances`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Unique instance identifier |
| item_definition_id | uuid | yes | Source definition |
| world_id | uuid | yes | Owning world |
| origin_story_session_id | uuid | no | Session where item originated |
| origin_character_id | uuid | no | Character associated with creation |
| custom_name | text | no | Optional child-facing name |
| serial_key | text | no | Stable unique serial |
| quantity | integer | yes | Quantity for stackable instances |
| durability_current | integer | no | Current durability |
| durability_maximum | integer | no | Instance-specific durability maximum |
| item_status | text / enum | yes | active, damaged, broken, lost, consumed, destroyed, archived |
| custody_inventory_id | uuid | no | Current containing inventory |
| equipped_by_character_id | uuid | no | Optional equipped character |
| state_payload | jsonb | no | Versioned instance-specific state |
| provenance_payload | jsonb | no | Creation and history summary |
| discovered_at | timestamptz | no | Discovery timestamp |
| acquired_at | timestamptz | no | Acquisition timestamp |
| last_used_at | timestamptz | no | Last use |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Optimistic concurrency version |

---

## 8. Instance Rules

- every item instance belongs to one world;
- the definition must be valid in that world;
- non-stackable items must always have `quantity = 1`;
- stackable quantity must be positive;
- consumed or destroyed items cannot remain in an active inventory;
- equipped items must belong to the equipping character’s inventory or an approved linked inventory;
- current durability cannot exceed maximum durability;
- broken items may remain recoverable unless explicitly destroyed.

---

## 9. Unique Items

Unique or legendary items may require one active instance per world.

Examples:

- a one-of-a-kind map;
- a magical key;
- a named artifact;
- a unique companion token.

Recommended partial uniqueness:

```text
UNIQUE (world_id, item_definition_id)
WHERE item_status NOT IN ('destroyed', 'archived')
AND unique_per_world = true
```

Because `unique_per_world` belongs to the definition, this rule may be enforced through application logic plus integration tests if a direct database constraint is impractical.

---

## 10. Inventories Table

### `inventories`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Inventory identifier |
| world_id | uuid | yes | Owning world |
| inventory_type | text / enum | yes | character, location, settlement, session, container, system |
| owner_character_id | uuid | no | Character owner |
| owner_location_id | uuid | no | Location owner |
| owner_settlement_id | uuid | no | Settlement owner |
| owner_story_session_id | uuid | no | Session owner |
| parent_item_instance_id | uuid | no | Container-item owner |
| name | text | no | Optional display name |
| capacity_mode | text / enum | yes | unlimited, slots, weight, custom |
| slot_capacity | integer | no | Maximum slots |
| weight_capacity | numeric | no | Maximum abstract weight |
| access_policy | text / enum | yes | private, shared, public, restricted |
| lifecycle_status | text / enum | yes | active, locked, archived |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Optimistic concurrency version |

---

## 11. Inventory Ownership Constraint

Exactly one inventory owner must be present for normal inventories.

Possible owners:

- character;
- location;
- settlement;
- story session;
- container item;
- system/world.

Rules:

- owner must belong to the same world;
- character inventory belongs to one character;
- session inventory belongs to one story session;
- container inventory belongs to one container-capable item;
- system inventories require an explicit type and audit trail;
- ownership and custody are different concepts.

---

## 12. Ownership vs Custody

LUMI distinguishes:

### Ownership

Who the item belongs to conceptually.

### Custody

Where the item currently exists physically or operationally.

Example:

- a key belongs to the child character;
- it is temporarily held by a companion;
- later it is stored in a chest.

Ownership may remain with the child while custody changes.

---

## 13. Item Ownership Table

### `item_ownerships`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Ownership record identifier |
| item_instance_id | uuid | yes | Item |
| owner_type | text / enum | yes | character, child_profile, settlement, world, shared |
| owner_id | uuid | yes | Owner identifier |
| ownership_status | text / enum | yes | active, transferred, disputed, relinquished |
| ownership_share | numeric | yes | Supports shared ownership |
| acquired_at | timestamptz | yes | Ownership start |
| ended_at | timestamptz | no | Ownership end |
| source_transaction_id | uuid | no | Originating transaction |
| created_at | timestamptz | yes | Creation timestamp |
| version | integer | yes | Concurrency version |

Only one full active owner is expected by default.

Shared ownership requires explicit domain approval.

---

## 14. Inventory Entries Table

### `inventory_entries`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Entry identifier |
| inventory_id | uuid | yes | Containing inventory |
| item_instance_id | uuid | yes | Stored item instance |
| slot_key | text | no | Optional slot or position |
| quantity | integer | yes | Quantity represented by entry |
| entry_status | text / enum | yes | active, reserved, locked, removed |
| added_at | timestamptz | yes | Placement time |
| removed_at | timestamptz | no | Removal time |
| version | integer | yes | Concurrency version |

Recommended uniqueness:

```text
UNIQUE (inventory_id, item_instance_id)
WHERE entry_status = 'active'
```

An active item instance may have only one active custody entry.

---

## 15. Quantity Strategy

Preferred rule:

- quantity is stored primarily on `item_instances`;
- inventory entry quantity mirrors the active custody amount only when partial stack movement is supported;
- non-stackable instances always represent one object;
- splitting a stack creates a new item instance;
- merging stacks retires or archives the merged source instance.

This preserves item history and transaction traceability.

---

## 16. Item State Payload

`state_payload` may store dynamic state such as:

- map discoveries;
- key activation state;
- magical charge;
- written notes;
- custom markings;
- remaining uses;
- bound character;
- story-specific flags.

Requirements:

- `schema_version` required;
- runtime validation required;
- core searchable state must become columns;
- arbitrary executable behavior is prohibited.

---

## 17. Durability

Durable items use:

```text
durability_current
durability_maximum
```

Rules:

- durability never drops below zero;
- zero durability normally produces `broken`;
- repair cannot exceed maximum durability;
- story-specific permanent damage may reduce maximum durability;
- non-durable items leave both fields NULL.

Durability changes are recorded as transactions.

---

## 18. Item Transactions Table

### `item_transactions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Transaction identifier |
| world_id | uuid | yes | World |
| item_instance_id | uuid | yes | Affected item |
| transaction_type | text / enum | yes | acquire, transfer, use, consume, damage, repair, drop, recover, destroy |
| source_inventory_id | uuid | no | Source custody |
| target_inventory_id | uuid | no | Target custody |
| source_owner_type | text / enum | no | Prior owner type |
| source_owner_id | uuid | no | Prior owner |
| target_owner_type | text / enum | no | New owner type |
| target_owner_id | uuid | no | New owner |
| quantity_delta | integer | no | Quantity effect |
| durability_delta | integer | no | Durability effect |
| source_story_session_id | uuid | no | Story origin |
| source_choice_commit_id | uuid | no | Choice origin |
| reason_code | text | no | Domain reason |
| metadata | jsonb | no | Versioned transaction details |
| correlation_id | uuid | no | Operation correlation |
| causation_id | uuid | no | Prior event |
| committed_at | timestamptz | yes | Commit time |
| created_by | uuid | no | Actor or system |

Transactions are append-only.

---

## 19. Transaction Types

Recommended values:

```text
create
discover
acquire
transfer
lend
return
equip
unequip
use
consume
damage
repair
split
merge
drop
lose
recover
bind
unbind
destroy
archive
restore
```

The application layer validates allowed state transitions.

---

## 20. Item Acquisition

An item may be acquired through:

- story consequence;
- location discovery;
- NPC gift;
- crafting;
- purchase;
- world event;
- parent-approved reward;
- system grant.

Acquisition transaction:

```text
validate definition and world
create or activate item instance
create ownership
insert inventory entry
record transaction
apply story outcome
write domain event
write outbox message
commit
```

---

## 21. Item Transfer

Transfer may change:

- custody only;
- ownership only;
- both custody and ownership.

Examples:

### Custody Transfer

A child gives a map to a companion temporarily.

### Ownership Transfer

A character gives a gift permanently.

### Location Deposit

An item is placed in a chest while ownership remains unchanged.

Transfer must be explicit about which semantics apply.

---

## 22. Transfer Transaction Boundary

```text
lock source inventory
lock target inventory
validate item status
validate permissions
validate capacity
remove source entry
insert target entry
update custody pointer
update ownership if required
record transaction
write domain event
write outbox message
commit
```

A transfer must never leave an item in two active inventories.

---

## 23. Item Use

Using an item may produce:

- no persistent change;
- quantity reduction;
- durability reduction;
- state mutation;
- world effect;
- character effect;
- memory creation;
- story branch unlock;
- access-state change.

Item-use behavior is implemented through approved handlers mapped by item type or behavior profile.

Stored JSON never executes itself.

---

## 24. Consumption

Consumable item workflow:

```text
validate quantity
apply effect
decrement quantity
record transaction
if quantity = 0:
    set status = consumed
    remove inventory entry
write event
commit
```

Consumption effects and quantity changes are atomic.

---

## 25. Equipped Items

Equipped state may be represented with a separate relation.

### `character_equipped_items`

Fields:

- character_id
- item_instance_id
- equipment_slot
- equipped_at
- version

Primary key:

```text
(character_id, equipment_slot)
```

Rules:

- item must be in valid custody;
- only compatible items may use a slot;
- one item per slot by default;
- equipping does not necessarily change ownership.

---

## 26. Container Items

Some item instances may contain another inventory.

Examples:

- bag;
- chest;
- box;
- magical pouch.

Rules:

- container definition must declare container capability;
- nested containers require depth limits;
- containment cycles are prohibited;
- container movement moves its contained inventory by reference;
- contained item world IDs must match.

---

## 27. Story Session Inventory

A story session may hold temporary items.

Examples:

- puzzle tokens;
- temporary lantern;
- one-scene disguise;
- challenge-specific materials.

At session completion, each item must be resolved as:

```text
promote_to_persistent
return_to_source
consume
destroy
archive
```

Temporary session items must not silently become permanent.

---

## 28. Persistent Story Items

Items intended to affect future stories receive:

- persistent item instance;
- active ownership;
- active inventory entry;
- provenance reference;
- story outcome record;
- continuity eligibility metadata.

Example:

```text
A map found in one story may unlock a location in a later story.
```

---

## 29. Provenance

`provenance_payload` may include:

- original story;
- scene;
- choice;
- creator;
- previous owners summary;
- world event;
- generation profile;
- custom child name;
- discovery context.

Authoritative history remains in transaction records.

The payload is a compact display summary.

---

## 30. Item Discovery

Discovery and acquisition are separate.

An item may be:

```text
undiscovered
discovered
acquired
lost
recovered
```

Discovery may reveal:

- definition;
- location;
- partial description;
- unknown function;
- hidden state.

A discovered item need not belong to the child.

---

## 31. Item Visibility

Recommended item visibility fields may be added through state or discovery relations:

```text
hidden
rumored
seen
identified
understood
```

For child-specific knowledge, use a separate relation.

### `child_item_knowledge`

Fields:

- child_profile_id
- item_instance_id
- knowledge_status
- discovered_properties
- first_seen_at
- last_updated_at
- version

---

## 32. Generated Items

Generated item definitions and instances must record:

- generation profile;
- prompt version;
- source world/session;
- content hash;
- safety result;
- schema version.

Once shown to the child:

- identity becomes stable;
- name changes require explicit rename workflow;
- visual identity should remain consistent;
- behavior changes require versioned migration.

---

## 33. Item Visual Identity

Item illustrations belong to the Media context.

Recommended relation:

### `item_media_assets`

Fields:

- item_definition_id
- item_instance_id
- media_asset_id
- asset_role
- created_at

Roles:

```text
icon
illustration
inventory_thumbnail
story_scene_reference
```

A unique instance may override the definition image.

---

## 34. Inventory Capacity

Capacity modes:

```text
unlimited
slots
weight
custom
```

For child-facing simplicity, capacity may remain unlimited in early releases.

The schema supports future constraints without forcing them into initial UX.

Capacity validation belongs to application services.

---

## 35. Reservation and Locking

Items may be reserved for:

- active story;
- pending choice;
- crafting;
- transfer;
- world event.

Reserved items cannot be transferred or consumed by unrelated operations.

Recommended table:

### `item_reservations`

Fields:

- id
- item_instance_id
- reservation_type
- reserved_for_type
- reserved_for_id
- quantity
- starts_at
- expires_at
- status
- created_at
- version

---

## 36. Loss and Recovery

Lost items remain persistent.

Loss workflow:

```text
remove active custody
set item_status = lost
record last known location
record transaction
create character memory if relevant
write domain event
commit
```

Recovery creates a new custody entry and a recovery transaction.

---

## 37. Destruction

Destroyed items:

- cannot be used;
- cannot be transferred;
- cannot remain in active inventory;
- remain in history;
- may produce fragments or successor items;
- may continue to appear in memories and story continuity.

Restoration requires an explicit approved domain workflow.

---

## 38. Archive Policy

Archive is used for:

- retired definitions;
- inactive generated items;
- migrated legacy items;
- administrative cleanup.

Archive is not equivalent to destruction.

Archived items may be restored administratively if integrity permits.

---

## 39. Index Strategy

### `item_definitions`

```text
(world_id, lifecycle_status)
(created_for_child_profile_id)
(item_type, lifecycle_status)
(slug)
```

### `item_instances`

```text
(world_id, item_status)
(item_definition_id)
(custody_inventory_id)
(equipped_by_character_id)
(origin_story_session_id)
(serial_key)
```

### `inventories`

```text
(world_id, inventory_type)
(owner_character_id)
(owner_location_id)
(owner_settlement_id)
(owner_story_session_id)
(parent_item_instance_id)
```

### `inventory_entries`

```text
(inventory_id, entry_status)
(item_instance_id, entry_status)
```

### `item_transactions`

```text
(item_instance_id, committed_at DESC)
(world_id, committed_at DESC)
(source_story_session_id)
(source_choice_commit_id)
(correlation_id)
```

### `item_ownerships`

```text
(item_instance_id, ownership_status)
(owner_type, owner_id, ownership_status)
```

---

## 40. Constraints

Required constraints:

- positive quantity;
- stack size not exceeded;
- non-stackable quantity equals one;
- durability values valid;
- one active custody entry per item instance;
- source and target inventories differ for transfer;
- world IDs match;
- container cycles prohibited;
- consumed/destroyed items not actively stored;
- exactly one valid inventory owner;
- ownership share between zero and one;
- active ownership shares do not exceed one;
- equipped item custody is valid.

---

## 41. Repository Responsibilities

Recommended `ItemDefinitionRepository` operations:

```text
createDefinition
findDefinition
activateDefinition
retireDefinition
archiveDefinition
```

Recommended `ItemInstanceRepository` operations:

```text
createInstance
findInstance
updateState
applyDurabilityChange
renameInstance
archiveInstance
updateWithExpectedVersion
```

Recommended `InventoryRepository` operations:

```text
createInventory
findInventory
listEntries
addItem
removeItem
transferItem
reserveItem
releaseReservation
```

High-level transaction services should orchestrate cross-aggregate changes.

---

## 42. Query Services

Recommended read queries:

```text
getCharacterInventory
getInventorySummary
getItemDetails
getItemHistory
listStoryContinuityItems
listItemsAtLocation
listLostItems
getChildItemKnowledge
getUsableItemsForContext
```

Story context queries must return only relevant items.

---

## 43. Concurrency

Optimistic concurrency is mandatory for:

- item instance state;
- inventories;
- inventory entries;
- ownership changes;
- reservations.

Transfer and consumption may additionally use row locks.

Recommended lock order:

```text
lower inventory UUID first
then higher inventory UUID
then item instance
```

A consistent lock order reduces deadlock risk.

---

## 44. Domain Events

Suggested events:

```text
ItemDefinitionCreated
ItemInstanceCreated
ItemDiscovered
ItemAcquired
ItemTransferred
ItemOwnershipChanged
ItemEquipped
ItemUnequipped
ItemUsed
ItemConsumed
ItemDamaged
ItemRepaired
ItemLost
ItemRecovered
ItemDestroyed
ItemArchived
InventoryCreated
InventoryCapacityExceeded
ItemReservationCreated
ItemReservationReleased
```

---

## 45. Outbox Integration

Examples of outbox-triggered work:

- generate item illustration;
- update semantic continuity index;
- generate child-facing item description;
- notify story engine of newly available item;
- update world event eligibility;
- create parent summary.

The item transaction and outbox message must commit atomically.

---

## 46. Security and Access

- inventory queries are scoped by child/parent ownership;
- administrative item grants are audited;
- system inventories are inaccessible to normal child queries;
- hidden items remain hidden until discovery rules permit exposure;
- generated item text and images require safety validation;
- internal behavior metadata is not directly exposed to the child.

---

## 47. Test Requirements

Required tests:

- create reusable definition;
- create unique item instance;
- reject invalid world scope;
- enforce non-stackable quantity;
- split and merge stack;
- create character inventory;
- transfer custody atomically;
- transfer ownership separately;
- prevent duplicate active custody;
- consume final quantity;
- damage and repair durability;
- lose and recover item;
- equip and unequip item;
- prevent container cycle;
- resolve session-temporary item;
- preserve provenance;
- reject use while reserved;
- optimistic concurrency conflict;
- event and outbox atomicity;
- archive without losing history.

---

## 48. Acceptance Criteria

The Inventory and Item Schema is accepted when:

1. Item definitions and instances are separate.
2. Unique and stackable items are both supported.
3. Ownership and custody are distinct.
4. An item cannot exist in two active inventories.
5. Transfers are atomic and auditable.
6. Durability and repair are supported.
7. Temporary story items have explicit resolution.
8. Persistent story items support continuity.
9. Generated items retain stable identity.
10. Container items are supported without cycles.
11. Lost and destroyed items remain historically traceable.
12. Reservations prevent conflicting operations.
13. Media remains outside the Inventory schema.
14. Optimistic concurrency is enforced.
15. Events and outbox messages commit atomically.

---

## 49. Decisions Finalized

1. `ItemDefinition`, `ItemInstance` and `Inventory` are separate aggregate roots.
2. Reusable templates are separated from persistent objects.
3. Ownership and custody are modeled independently.
4. One item instance has only one active custody location.
5. Non-stackable items always have quantity one.
6. Stack splitting creates a new instance.
7. Transactions are append-only.
8. Published/generated item identity becomes stable after presentation.
9. Stored JSON describes behavior but never executes code.
10. Story-temporary items require explicit completion resolution.
11. Persistent items retain provenance.
12. Durability is optional per definition.
13. Broken and destroyed are different states.
14. Lost items remain persistent.
15. Container cycles are prohibited.
16. Inventory capacity is supported but may be unlimited initially.
17. Reservations protect items from conflicting actions.
18. Transfer operations use one transaction.
19. Optimistic concurrency is mandatory.
20. Media assets are referenced through the Media bounded context.

---

## 50. Next Artifact

**World Event and Simulation Schema v1**

The next document will define:

- world events;
- event scopes;
- simulation runs;
- simulation candidates;
- background changes;
- delayed effects;
- event chains;
- ten-day decay and freeze;
- catch-up simulation;
- idempotent processing;
- simulation checkpoints.
