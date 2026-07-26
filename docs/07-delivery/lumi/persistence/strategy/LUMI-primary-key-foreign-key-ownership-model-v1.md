# Project LUMI — Primary Key, Foreign Key and Ownership Model v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** ADR-001, Database Domain Map, Conceptual ERD v1, Logical Data Model v1, Main Table and Relationship Inventory v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines how Project LUMI identifies records, enforces relationships and determines data ownership.

It establishes:

- primary key strategy;
- foreign key strategy;
- natural key usage;
- composite key usage;
- ownership paths;
- cross-domain integrity rules;
- delete and update behaviors;
- tenant and child-profile data isolation;
- import/export identity rules;
- distributed ID generation rules.

---

## 2. Core Principles

1. Every authoritative domain entity must have a stable identity.
2. Primary keys must not carry business meaning.
3. Business identity and technical identity must be separate.
4. Ownership must be explicit and queryable.
5. Foreign key integrity is preferred over application-only validation.
6. Historical records must retain their original references wherever possible.
7. Shared world data and child-private data must remain distinguishable.
8. Derived systems must not become the source of authoritative identity.
9. Cross-world and cross-owner references must be restricted.
10. Deletion must not destroy story continuity or audit history.

---

## 3. Primary Key Strategy

## 3.1 Default Domain Entity Key

All main domain entities use:

```sql
id UUID PRIMARY KEY
```

Recommended generation:

```sql
gen_random_uuid()
```

or an application-generated UUID compatible with PostgreSQL.

Examples:

- `users.id`
- `child_profiles.id`
- `worlds.id`
- `characters.id`
- `stories.id`
- `story_sessions.id`
- `memories.id`
- `media_assets.id`

### Reasons

- IDs can be generated before database insertion.
- Record counts are not exposed through sequential URLs.
- Imports and exports are easier.
- Future service separation is supported.
- Offline and asynchronous workflows can create identities safely.
- Object storage and event references can reuse stable identifiers.

---

## 3.2 UUID Version Preference

Preferred options:

1. UUIDv7, if fully supported by the selected application and migration stack.
2. UUIDv4 as the compatibility fallback.

UUIDv7 is preferred for new high-volume domain tables because it is time-ordered and generally more index-friendly than random UUIDv4.

The final implementation must use one standard consistently.

### Rule

Do not mix UUID versions arbitrarily across application modules.

---

## 3.3 Append-Only High-Volume Table Keys

High-volume historical and operational records may use:

```sql
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```

Examples:

- `domain_events`
- `audit_logs`
- `usage_events`
- `emotion_history`
- `character_trait_history`
- `item_transfers`
- `consequence_executions`

Where external reference is required, add:

```sql
event_uuid UUID NOT NULL UNIQUE
```

This provides:

- efficient storage and ordering internally;
- stable external correlation identity;
- easier event transport and deduplication.

---

## 3.4 Composite Primary Keys

Composite primary keys are suitable for pure join tables with no independent lifecycle.

Examples:

```sql
PRIMARY KEY (user_id, role_id)
PRIMARY KEY (role_id, permission_id)
PRIMARY KEY (memory_id, character_id, link_role)
```

Use a separate UUID `id` instead when the join relation has:

- its own status;
- historical lifecycle;
- metadata;
- audit references;
- external API identity;
- multiple active/inactive periods.

Example:

`group_memberships` should have its own ID because membership has role, rank, dates and status.

---

## 3.5 Natural Keys

Natural keys may be unique but must not replace primary keys.

Examples:

- user email;
- provider subject;
- world slug;
- role code;
- permission code;
- item definition code;
- prompt template code.

Example:

```sql
id UUID PRIMARY KEY,
code TEXT NOT NULL UNIQUE
```

### Rule

Natural keys may change. Primary keys must remain stable.

---

## 4. Foreign Key Strategy

## 4.1 Default Rule

Every authoritative relationship uses a real PostgreSQL foreign key wherever practical.

Example:

```sql
child_profiles.owner_user_id
    REFERENCES users(id)
```

Application validation does not replace foreign key constraints.

---

## 4.2 Required Foreign Keys

Use `NOT NULL` when the child record cannot exist meaningfully without the parent.

Examples:

```text
child_profiles.owner_user_id
worlds.universe_id
regions.world_id
locations.region_id
characters.world_id
story_versions.story_id
story_sessions.child_profile_id
story_sessions.story_version_id
memories.character_id
inventory_entries.inventory_id
generation_runs.generation_request_id
```

---

## 4.3 Optional Foreign Keys

Nullable foreign keys are allowed only where the relationship is genuinely optional.

Examples:

```text
characters.child_profile_id
characters.current_location_id
stories.world_id
story_scenes.location_id
media_assets.generation_output_id
world_events.location_id
```

Nullable foreign keys must not be used merely to avoid modeling a required relationship.

---

## 4.4 Cross-Domain Foreign Keys

Cross-domain foreign keys are allowed inside the modular monolith.

Examples:

```text
story_sessions.child_profile_id -> profiles.child_profiles.id
characters.world_id -> world.worlds.id
memories.story_session_id -> story.story_sessions.id
```

Logical module boundaries do not prohibit relational integrity.

If future service extraction occurs, new ADRs must define how those references are externalized.

---

## 4.5 Foreign Key Naming

Constraint naming standard:

```text
fk_<child_table>__<parent_table>__<column>
```

Example:

```text
fk_story_sessions__child_profiles__child_profile_id
```

Unique constraint naming:

```text
uq_<table>__<column_list>
```

Check constraint naming:

```text
ck_<table>__<rule_name>
```

---

## 5. Ownership Model

LUMI has four principal ownership categories:

1. User-owned data
2. Child-profile-owned data
3. World-owned data
4. System-owned data

Each record must belong clearly to one category or define an explicit shared scope.

---

## 6. User-Owned Data

Examples:

- account settings;
- authentication identities;
- consent records;
- owned child profiles;
- private media uploads;
- administrative preferences.

Canonical path:

```text
users
  -> child_profiles
```

The user account is the legal and administrative owner of child profile data.

### Rule

A child profile cannot exist without an owning user.

---

## 7. Child-Profile-Owned Data

Examples:

- story sessions;
- committed choices;
- private story history;
- child-specific preferences;
- playable characters;
- child-private memory perspective;
- personal inventory, if profile-owned;
- generated outputs created specifically for that child.

Canonical path:

```text
users
  -> child_profiles
      -> story_sessions
      -> playable characters
```

### Direct Ownership Columns

Where ownership queries are frequent and security-critical, tables may include a direct `child_profile_id` even if ownership can be derived indirectly.

Example:

```text
generation_requests.child_profile_id
media_assets.child_profile_id
```

This controlled denormalization is allowed for:

- authorization;
- data export;
- retention;
- deletion workflows;
- query performance.

It must be kept consistent with the indirect ownership path.

---

## 8. World-Owned Data

Examples:

- regions;
- locations;
- NPCs;
- settlements;
- cultures;
- shared world events;
- world clocks;
- autonomous simulation state;
- global item definitions.

Canonical path:

```text
universes
  -> worlds
      -> regions
      -> locations
      -> NPCs and events
```

### Rule

World-owned data must not automatically become child-private merely because a child interacts with it.

Example:

```text
Shared:
world_events.id = bridge-collapse event

Private:
memory owned by child character describing that event
```

---

## 9. System-Owned Data

Examples:

- model provider configurations;
- prompt templates;
- system roles;
- permissions;
- job definitions;
- operational audit metadata;
- migration records.

System-owned data has no child or world owner unless explicitly scoped.

---

## 10. Shared and Scoped Ownership

Some data may be:

- global;
- universe-scoped;
- world-scoped;
- user-scoped;
- child-scoped.

Recommended scope columns where necessary:

```text
scope_type
universe_id NULL
world_id NULL
user_id NULL
child_profile_id NULL
```

However, uncontrolled generic scope models are discouraged.

Prefer explicit ownership columns and check constraints.

---

## 11. Inventory Ownership

An inventory may belong to exactly one of:

- character;
- child profile;
- group;
- location.

Logical structure:

```text
character_id NULL
child_profile_id NULL
group_id NULL
location_id NULL
```

Required check:

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

### Rule

Every inventory has exactly one owner.

No inventory may have zero owners or multiple simultaneous owners.

---

## 12. Media Ownership

Media assets may have:

- one administrative owner;
- one child scope;
- one world scope;
- one generation source.

Recommended fields:

```text
owner_user_id NULL
child_profile_id NULL
world_id NULL
generation_output_id NULL
```

These fields serve different purposes and are not mutually exclusive.

Example:

An image may be:

- paid for by a user account;
- created for a child profile;
- depict a world location;
- originate from an AI generation output.

Asset-to-domain usage still uses explicit link tables.

---

## 13. Character Ownership and Affiliation

A character has:

```text
world_id NOT NULL
child_profile_id NULL
```

Interpretation:

- every character belongs to a world;
- playable characters may belong to a child profile;
- NPCs normally do not belong to a child profile.

### Rule

A child-owned playable character cannot belong to a world inaccessible to that child profile.

This may require application-level authorization validation in addition to foreign keys.

---

## 14. Story Ownership

A story may be:

- system template;
- user-created;
- world-native;
- generated for a child;
- reusable across multiple sessions.

Recommended ownership fields:

```text
world_id NULL
owner_user_id NULL
source_type NOT NULL
```

A story session always has explicit child ownership:

```text
story_sessions.child_profile_id NOT NULL
```

### Rule

Story content ownership and session ownership are separate concepts.

---

## 15. Memory Ownership

Every memory has exactly one owning character:

```text
memories.character_id NOT NULL
```

A memory may refer to many entities but those referenced entities do not own the memory.

Example:

```text
Owner:
Lina character

References:
fox character
forest location
story session
bridge event
```

### Rule

Memory reference links do not transfer ownership.

---

## 16. Foreign Key Delete Behaviors

## 16.1 Default

```sql
ON DELETE RESTRICT
```

This is the default for authoritative domain relationships.

---

## 16.2 Cascade

Use `ON DELETE CASCADE` only for true dependent rows with no independent historical meaning.

Approved candidates:

- `user_roles`
- `role_permissions`
- `child_interests`
- `child_preferences`
- `context_items`
- `media_variants`
- temporary uncommitted generation fragments

---

## 16.3 Set Null

Use `ON DELETE SET NULL` only when the child remains meaningful without the reference.

Possible candidates:

- `characters.current_location_id`
- `stories.world_id`
- `story_sessions.current_scene_id`
- optional actor references in audit logs

Historical interpretation must remain clear.

---

## 16.4 Never Cascade Delete

Never automatically cascade-delete:

- completed story sessions;
- committed choices;
- memories;
- published story versions;
- item transfer history;
- domain events;
- audit logs;
- cost records;
- simulation history;
- consent history.

---

## 17. Update Behaviors

Primary keys are immutable.

Therefore:

```sql
ON UPDATE RESTRICT
```

is the conceptual default.

Business codes, slugs and labels may change independently.

Foreign keys should not use cascading updates because UUID primary keys should never change.

---

## 18. Ownership Integrity Rules

1. A child profile has exactly one owning user.
2. A story session belongs to exactly one child profile.
3. A playable character may belong to one child profile.
4. An NPC does not require a child profile.
5. Every character belongs to exactly one world.
6. Every memory belongs to exactly one character.
7. Every inventory belongs to exactly one owner.
8. Every world event belongs to exactly one world.
9. Every story version belongs to exactly one story.
10. Every generation run belongs to exactly one generation request.
11. Every outbox message belongs to exactly one domain event.
12. Derived embeddings belong to exactly one source record.
13. Shared world state must not be stored only under a child profile.
14. Child-private history must not be exposed as global world state.
15. Historical ownership references must remain traceable after archival.

---

## 19. Cross-World Integrity

The following combinations are invalid unless an explicit travel or portal model permits them:

- character current location in another world;
- world event participant from another world;
- story scene location from an unrelated world;
- inventory item instance assigned to an owner in another world;
- relationship between isolated worlds with no cross-world presence.

PostgreSQL foreign keys alone cannot enforce all same-world constraints.

Use one of:

1. application service validation;
2. composite foreign keys including `world_id`;
3. deferred database triggers for critical cases.

### Recommended Initial Approach

Use standard foreign keys plus service-level same-world validation.

Add database triggers only for proven high-risk invariants.

---

## 20. Composite Foreign Key Candidates

Composite foreign keys may be used where same-scope integrity is critical.

Example conceptual pattern:

```text
characters:
  UNIQUE (id, world_id)

locations:
  UNIQUE (id, world_id)

character_locations:
  FOREIGN KEY (location_id, world_id)
    REFERENCES locations(id, world_id)
```

Use this selectively because composite foreign keys increase migration and ORM complexity.

---

## 21. Data Isolation and Authorization

Database ownership and application authorization are related but different.

Foreign keys prove structural ownership.

Authorization rules decide whether the current user may access that owner’s data.

Typical authorization path:

```text
authenticated user
  -> users.id
  -> child_profiles.owner_user_id
  -> story_sessions.child_profile_id
```

### Rule

No child-owned query may rely only on a record ID supplied by the client.

The owner path must be included in authorization checks.

---

## 22. Row-Level Security Position

PostgreSQL Row-Level Security may be considered later for child-private and user-private tables.

Potential candidates:

- `child_profiles`
- `story_sessions`
- `choice_selections`
- child-private `media_assets`
- user-private generation history

Initial recommendation:

- begin with service-layer authorization in a modular monolith;
- prepare ownership columns to support future RLS;
- enable RLS only after access patterns and connection identity strategy are stable.

---

## 23. Import and Export Identity Rules

Exports must preserve UUIDs for:

- worlds;
- characters;
- story versions;
- sessions;
- memories;
- items;
- media metadata.

On import:

- preserve original IDs when importing into an isolated namespace;
- remap IDs when collision risk exists;
- maintain an import identity map;
- never infer ownership from display names or slugs.

---

## 24. Event Identity Rules

`domain_events` should use:

```text
id BIGINT
event_uuid UUID UNIQUE
aggregate_type
aggregate_id UUID
```

Purpose:

- bigint for efficient local ordering;
- UUID for external idempotency and correlation.

Outbox messages use the same event identity.

---

## 25. Idempotency Keys

Idempotency keys are required for high-risk write workflows:

- choice commits;
- item transfers;
- AI generation requests;
- payment-like cost registration, if introduced;
- simulation run start;
- delayed consequence execution.

Typical uniqueness:

```sql
UNIQUE (idempotency_key)
```

or scoped:

```sql
UNIQUE (story_session_id, idempotency_key)
```

---

## 26. Optimistic Concurrency Ownership

Mutable authoritative aggregates include a version number.

Update pattern:

```sql
UPDATE story_sessions
SET
    current_scene_id = :new_scene,
    version = version + 1
WHERE id = :id
  AND version = :expected_version;
```

If zero rows are updated, a concurrency conflict occurred.

Use for:

- story sessions;
- inventories;
- world clocks;
- characters;
- world events;
- child profiles.

---

## 27. Soft Delete and Ownership

Soft deletion does not remove ownership.

Example:

```text
child_profiles.archived_at
characters.archived_at
stories.archived_at
```

Archived records remain attached to their original owner.

Hard deletion or anonymization requires a separate retention workflow.

---

## 28. Prohibited Identity Patterns

The following are prohibited:

- email address as primary key;
- slug as primary key;
- character name as identity;
- world name as identity;
- array of child IDs in JSONB instead of foreign keys;
- generic unvalidated `owner_type + owner_id` for security-critical ownership;
- mutable business codes used as foreign keys;
- storing only external provider IDs without an internal user ID;
- reusing deleted UUIDs;
- changing primary keys during migration.

---

## 29. Recommended Constraint Examples

### Child profile ownership

```sql
owner_user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE RESTRICT
```

### Directed relationship

```sql
CHECK (source_character_id <> target_character_id)
```

### Unique story choice

```sql
UNIQUE (story_session_id, choice_point_id)
```

### Exactly one inventory owner

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

### One world clock per world

```sql
UNIQUE (world_id)
```

### One current emotion state

```sql
UNIQUE (character_id)
```

---

## 30. Decisions Finalized

1. UUID is the standard domain primary key.
2. UUIDv7 is preferred if fully supported; UUIDv4 is the fallback.
3. Bigint identity keys are allowed for internal append-only high-volume tables.
4. Natural keys are unique business identifiers, not primary keys.
5. PostgreSQL foreign keys are mandatory for authoritative relationships.
6. `ON DELETE RESTRICT` is the default.
7. Historical records are never cascade-deleted.
8. Ownership is explicit and queryable.
9. Child-private and shared world data are separate ownership scopes.
10. An inventory has exactly one owner.
11. Every character belongs to one world.
12. Every memory belongs to one character.
13. Story sessions always belong to one child profile.
14. Primary keys are immutable.
15. Authorization checks must follow the full ownership path.
16. Future RLS remains possible because direct ownership columns are preserved.
17. Idempotency keys are required for critical write operations.
18. Mutable aggregates use optimistic concurrency.
19. Generic polymorphic ownership is prohibited for security-critical data.
20. Cross-world consistency is validated by service rules and selective database constraints.

---

## 31. Next Artifact

**Story Session Transaction Boundaries v1**

The next document will define:

- story session aggregate boundaries;
- choice commit transaction;
- inventory and memory updates;
- relationship and emotion effects;
- domain event and outbox creation;
- idempotency;
- retries;
- concurrency handling;
- rollback behavior.
