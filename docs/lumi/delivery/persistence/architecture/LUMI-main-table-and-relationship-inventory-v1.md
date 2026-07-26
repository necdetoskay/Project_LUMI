# Project LUMI — Main Table and Relationship Inventory v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** ADR-001, Database Domain Map, Conceptual ERD v1, Logical Data Model v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the canonical table inventory for Project LUMI.

It identifies:

- canonical table names;
- domain ownership;
- principal parent-child relationships;
- required foreign keys;
- cardinalities;
- migration dependency order;
- MVP, Phase 2 and Phase 3 classification;
- tables that are authoritative versus append-only or derived.

This inventory is the bridge between the logical model and the physical PostgreSQL schema.

---

## 2. Classification Legend

### Delivery Phase

- **MVP:** Required for the first playable production-capable version
- **P2:** Required for deeper living-world behavior
- **P3:** Advanced simulation, analytics or scale capability
- **Optional:** Introduced only when a measured requirement appears

### Data Role

- **Authoritative:** Current source of truth
- **Historical:** Append-only or version history
- **Join:** Explicit many-to-many relationship table
- **Operational:** Jobs, outbox, processing or system coordination
- **Derived:** Rebuildable projection or search representation

---

## 3. Canonical Table Inventory

## 3.1 Identity and Access

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `users` | Authoritative | MVP | — | Owns child profiles; linked to identities and roles |
| `user_identities` | Authoritative | MVP | `users` | N:1 user |
| `roles` | Authoritative | MVP | — | N:M users, N:M permissions |
| `permissions` | Authoritative | MVP | — | N:M roles |
| `user_roles` | Join | MVP | `users`, `roles` | Resolves user-role N:M |
| `role_permissions` | Join | MVP | `roles`, `permissions` | Resolves role-permission N:M |

### Mandatory Foreign Keys

```text
user_identities.user_id -> users.id
user_roles.user_id -> users.id
user_roles.role_id -> roles.id
role_permissions.role_id -> roles.id
role_permissions.permission_id -> permissions.id
```

---

## 3.2 Child Profile and Personalization

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `child_profiles` | Authoritative | MVP | `users` | Owns sessions and playable characters |
| `child_interests` | Authoritative | MVP | `child_profiles` | N:1 child profile |
| `child_preferences` | Authoritative | MVP | `child_profiles` | N:1 child profile |
| `parental_controls` | Authoritative | MVP | `child_profiles` | 1:1 child profile |
| `consent_records` | Historical | MVP | `users`, optional `child_profiles` | Consent history |

### Mandatory Foreign Keys

```text
child_profiles.owner_user_id -> users.id
child_interests.child_profile_id -> child_profiles.id
child_preferences.child_profile_id -> child_profiles.id
parental_controls.child_profile_id -> child_profiles.id
consent_records.user_id -> users.id
```

---

## 3.3 Universe, World and Geography

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `universes` | Authoritative | MVP | — | Contains worlds |
| `worlds` | Authoritative | MVP | `universes` | Contains regions, characters, stories and events |
| `world_clocks` | Authoritative | MVP | `worlds` | 1:1 world |
| `regions` | Authoritative | MVP | `worlds` | Contains locations |
| `locations` | Authoritative | MVP | `regions` | Hosts characters, scenes and events |
| `location_connections` | Join | MVP | `locations` | Directed location graph |
| `settlements` | Authoritative | P2 | `locations` | Hosts groups and occupations |
| `world_maps` | Authoritative | P2 | `worlds` | References media assets |
| `world_state_snapshots` | Historical | P2 | `worlds` | Periodic state checkpoints |

### Mandatory Foreign Keys

```text
worlds.universe_id -> universes.id
world_clocks.world_id -> worlds.id
regions.world_id -> worlds.id
locations.region_id -> regions.id
location_connections.source_location_id -> locations.id
location_connections.target_location_id -> locations.id
settlements.location_id -> locations.id
```

---

## 3.4 Character and Social Relationships

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `characters` | Authoritative | MVP | `worlds` | Core playable/NPC entity |
| `character_traits` | Authoritative | MVP | `characters` | Current trait values |
| `character_trait_history` | Historical | P2 | `characters` | Trait changes |
| `character_relationships` | Authoritative | MVP | `characters` | Directed character-to-character edges |
| `families` | Authoritative | P2 | `worlds` | Family grouping |
| `family_memberships` | Join | P2 | `families`, `characters` | N:M family membership |
| `groups` | Authoritative | P2 | `worlds` | Community, guild, team or institution |
| `group_memberships` | Join | P2 | `groups`, `characters` | N:M group membership |
| `occupations` | Authoritative | P2 | `worlds` | Occupation definitions |
| `character_occupations` | Join/Historical | P2 | `characters`, `occupations` | Character job history |
| `character_status_history` | Historical | P2 | `characters` | Status transitions |
| `character_location_history` | Historical | P2 | `characters`, `locations` | Movement history |

### Mandatory Foreign Keys

```text
characters.world_id -> worlds.id
characters.child_profile_id -> child_profiles.id NULL
characters.current_location_id -> locations.id NULL
character_traits.character_id -> characters.id
character_relationships.source_character_id -> characters.id
character_relationships.target_character_id -> characters.id
```

### Critical Integrity Rules

- `source_character_id <> target_character_id`
- Relationship direction is explicit.
- Playable characters may reference a child profile.
- NPCs normally have `child_profile_id = NULL`.

---

## 3.5 Story and Session

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `stories` | Authoritative | MVP | optional `worlds` | Story root |
| `story_versions` | Versioned | MVP | `stories` | Immutable published versions |
| `story_chapters` | Authoritative | MVP | `story_versions` | Ordered chapters |
| `story_scenes` | Authoritative | MVP | `story_chapters` | Ordered scenes |
| `story_sessions` | Authoritative | MVP | `child_profiles`, `story_versions` | Runtime instance |
| `story_participants` | Join | MVP | `story_sessions`, `characters` | N:M participation |
| `story_continuations` | Historical/Join | P2 | sessions and stories | Continuation lineage |
| `story_outputs` | Historical | MVP | `story_sessions` | Session-visible generated output |
| `story_session_state_history` | Historical | P2 | `story_sessions` | State snapshots or transitions |

### Mandatory Foreign Keys

```text
story_versions.story_id -> stories.id
story_chapters.story_version_id -> story_versions.id
story_scenes.chapter_id -> story_chapters.id
story_sessions.child_profile_id -> child_profiles.id
story_sessions.story_version_id -> story_versions.id
story_participants.story_session_id -> story_sessions.id
story_participants.character_id -> characters.id
```

### Critical Integrity Rules

- Published story versions are immutable.
- A session always references one exact story version.
- A session belongs to one child profile.
- Participants are explicit join rows.

---

## 3.6 Choice and Consequence

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `choice_points` | Authoritative | MVP | `story_scenes` | Defines decision point |
| `choice_options` | Authoritative | MVP | `choice_points` | Available options |
| `choice_selections` | Historical | MVP | `story_sessions`, `choice_options` | Committed selections |
| `choice_consequences` | Authoritative | MVP | `choice_options` | Consequence definitions |
| `delayed_effects` | Operational/Authoritative | P2 | choices, sessions, worlds | Deferred consequences |
| `consequence_executions` | Historical | P2 | consequences/effects | Execution history |

### Mandatory Foreign Keys

```text
choice_points.story_scene_id -> story_scenes.id
choice_options.choice_point_id -> choice_points.id
choice_selections.story_session_id -> story_sessions.id
choice_selections.choice_point_id -> choice_points.id
choice_selections.choice_option_id -> choice_options.id
choice_consequences.choice_option_id -> choice_options.id
```

### Critical Integrity Rules

- One committed selection per session and choice point.
- Selection rows are append-only after commit.
- Consequence execution must be idempotent.

---

## 3.7 Inventory and Items

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `item_definitions` | Authoritative | MVP | optional `worlds` | Reusable item type |
| `item_instances` | Authoritative | MVP | `item_definitions` | Unique persistent object |
| `inventories` | Authoritative | MVP | one explicit owner | Inventory root |
| `inventory_entries` | Authoritative | MVP | `inventories` | Quantity or instance ownership |
| `item_transfers` | Historical | MVP | inventories/items | Transfer audit |
| `item_capabilities` | Authoritative | P2 | — | Reusable capability definition |
| `item_capability_links` | Join | P2 | items, capabilities | N:M capability mapping |
| `item_usage_history` | Historical | P2 | items, sessions | Usage history |

### Mandatory Foreign Keys

```text
item_instances.item_definition_id -> item_definitions.id
inventories.character_id -> characters.id NULL
inventories.child_profile_id -> child_profiles.id NULL
inventories.group_id -> groups.id NULL
inventories.location_id -> locations.id NULL
inventory_entries.inventory_id -> inventories.id
inventory_entries.item_definition_id -> item_definitions.id
inventory_entries.item_instance_id -> item_instances.id NULL
```

### Critical Integrity Rules

- Exactly one inventory owner foreign key is non-null.
- Unique item instances can only exist in one active inventory.
- Stackable and unique-instance items follow different constraints.

---

## 3.8 Memory, Emotion, Goal and Decision

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `memories` | Authoritative | MVP | `characters` | Character-owned memory |
| `memory_character_links` | Join | MVP | memories, characters | Referenced characters |
| `memory_location_links` | Join | MVP | memories, locations | Referenced locations |
| `memory_event_links` | Join | P2 | memories, events | Referenced events |
| `memory_story_links` | Join | MVP | memories, sessions/scenes | Story source links |
| `memory_embeddings` | Derived | P2 | `memories` | pgvector embeddings |
| `emotional_states` | Authoritative | MVP | `characters` | Current emotional state |
| `emotion_history` | Historical | P2 | `characters` | Emotional transitions |
| `character_goals` | Authoritative | P2 | `characters` | Active and historical goals |
| `goal_progress` | Historical | P2 | goals | Progress changes |
| `decision_records` | Historical | P2 | `characters` | Autonomous decisions |
| `utility_evaluations` | Historical | P2 | decisions | Candidate scores |
| `trait_adjustments` | Historical | P2 | `characters` | Trait delta history |

### Mandatory Foreign Keys

```text
memories.character_id -> characters.id
memory_character_links.memory_id -> memories.id
memory_character_links.character_id -> characters.id
memory_location_links.memory_id -> memories.id
memory_location_links.location_id -> locations.id
emotional_states.character_id -> characters.id
```

### Critical Integrity Rules

- Every memory has one owning character.
- Current emotional state is unique per character.
- Embeddings are derived and rebuildable.
- Hidden model chain-of-thought is never stored.

---

## 3.9 Simulation, Time and Events

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `simulation_runs` | Operational/Historical | MVP | `worlds` | Offline or active simulation run |
| `simulation_tasks` | Operational | P2 | `simulation_runs` | Per-entity tasks |
| `world_events` | Authoritative | MVP | `worlds` | Narrative/simulation event |
| `event_participants` | Join | MVP | events, characters | Participant roles |
| `event_impacts` | Authoritative/Historical | P2 | events | Applied effects |
| `domain_events` | Historical | MVP | aggregate reference | Append-only business events |
| `outbox_messages` | Operational | MVP | `domain_events` | Reliable delivery |
| `simulation_checkpoints` | Historical | P2 | runs/worlds | Recovery checkpoint |
| `scheduled_effects` | Operational | P2 | worlds | Time or condition-based effects |
| `state_transitions` | Historical | P2 | typed entity reference | Important state changes |

### Mandatory Foreign Keys

```text
simulation_runs.world_id -> worlds.id
world_events.world_id -> worlds.id
event_participants.world_event_id -> world_events.id
event_participants.character_id -> characters.id
outbox_messages.domain_event_id -> domain_events.id
```

### Critical Integrity Rules

- Domain events are append-only.
- Outbox rows are written in the same transaction as state changes.
- World time cannot move backward.
- Offline progression cannot exceed the configured limit.

---

## 3.10 AI Generation and Context

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `model_providers` | Authoritative | MVP | — | Provider registry |
| `model_configs` | Authoritative | MVP | providers | Model capability and price config |
| `prompt_templates` | Authoritative | MVP | — | Template root |
| `prompt_template_versions` | Versioned | MVP | templates | Immutable prompt versions |
| `context_packages` | Historical | MVP | optional world/session/profile | Versioned context bundle |
| `context_items` | Historical | MVP | context packages | Ordered context entries |
| `generation_requests` | Operational | MVP | sessions/context | Logical request |
| `generation_runs` | Operational/Historical | MVP | requests | Attempts/retries |
| `generation_outputs` | Historical | MVP | runs | Generated result |
| `generation_cost_records` | Historical | MVP | runs | Usage and cost |
| `embedding_jobs` | Operational | P2 | source entity | Embedding pipeline |

### Mandatory Foreign Keys

```text
model_configs.provider_id -> model_providers.id
prompt_template_versions.prompt_template_id -> prompt_templates.id
context_items.context_package_id -> context_packages.id
generation_runs.generation_request_id -> generation_requests.id
generation_outputs.generation_run_id -> generation_runs.id
generation_cost_records.generation_run_id -> generation_runs.id
```

### Critical Integrity Rules

- Request, run and output remain separate.
- Published prompt versions are immutable.
- Accepted output requires validation status.
- Provider-specific payloads remain JSONB.

---

## 3.11 Media and Assets

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `media_assets` | Authoritative metadata | MVP | optional user/world/output | Object storage metadata |
| `media_variants` | Authoritative metadata | MVP | media assets | Thumbnail/mobile/audio variants |
| `character_asset_links` | Join | MVP | characters/assets | Character visuals |
| `story_asset_links` | Join | MVP | story versions/scenes/assets | Story media |
| `location_asset_links` | Join | P2 | locations/assets | Map/location media |
| `item_asset_links` | Join | MVP | item definitions/assets | Item visuals |
| `world_map_asset_links` | Join | P2 | maps/assets | World map versions |

### Mandatory Foreign Keys

```text
media_variants.media_asset_id -> media_assets.id
character_asset_links.character_id -> characters.id
character_asset_links.media_asset_id -> media_assets.id
story_asset_links.story_version_id -> story_versions.id
story_asset_links.media_asset_id -> media_assets.id
item_asset_links.item_definition_id -> item_definitions.id
item_asset_links.media_asset_id -> media_assets.id
```

### Critical Integrity Rules

- Binary data stays outside PostgreSQL.
- Object key and checksum are stored.
- Asset links are explicit for major domains.

---

## 3.12 Audit and Operations

| Table | Role | Phase | Main Parent | Principal Relationships |
|---|---|---:|---|---|
| `audit_logs` | Historical | MVP | optional actor | Security and admin audit |
| `usage_events` | Historical | P2 | optional user/profile/session | Product analytics |
| `job_runs` | Operational/Historical | MVP | — | Background job history |
| `error_records` | Historical | P2 | job/request/session | Structured error record |
| `administrative_actions` | Historical | P2 | users | Admin operation history |
| `data_retention_records` | Operational/Historical | P2 | user/profile | Retention actions |

### Critical Integrity Rules

- Audit records are append-only.
- Analytics does not replace audit logs.
- Sensitive child data is minimized in analytics.

---

## 4. MVP Canonical Table Set

The first production-capable schema should begin with the following core set.

### Identity and Profiles

1. `users`
2. `user_identities`
3. `roles`
4. `permissions`
5. `user_roles`
6. `role_permissions`
7. `child_profiles`
8. `child_interests`
9. `child_preferences`
10. `parental_controls`
11. `consent_records`

### World and Characters

12. `universes`
13. `worlds`
14. `world_clocks`
15. `regions`
16. `locations`
17. `location_connections`
18. `characters`
19. `character_traits`
20. `character_relationships`
21. `emotional_states`

### Story and Choices

22. `stories`
23. `story_versions`
24. `story_chapters`
25. `story_scenes`
26. `story_sessions`
27. `story_participants`
28. `choice_points`
29. `choice_options`
30. `choice_selections`
31. `choice_consequences`
32. `story_outputs`

### Inventory and Memory

33. `item_definitions`
34. `item_instances`
35. `inventories`
36. `inventory_entries`
37. `item_transfers`
38. `memories`
39. `memory_character_links`
40. `memory_location_links`
41. `memory_story_links`

### Simulation and Events

42. `simulation_runs`
43. `world_events`
44. `event_participants`
45. `domain_events`
46. `outbox_messages`

### AI and Media

47. `model_providers`
48. `model_configs`
49. `prompt_templates`
50. `prompt_template_versions`
51. `context_packages`
52. `context_items`
53. `generation_requests`
54. `generation_runs`
55. `generation_outputs`
56. `generation_cost_records`
57. `media_assets`
58. `media_variants`
59. `character_asset_links`
60. `story_asset_links`
61. `item_asset_links`

### Operations

62. `audit_logs`
63. `job_runs`

**Initial MVP canonical total: 63 tables**

This count is intentionally broad enough to preserve architecture integrity but should still be introduced through multiple migrations and implementation increments.

---

## 5. Minimum Playable Subset

For an internal first playable prototype, the following smaller subset is sufficient:

1. `users`
2. `child_profiles`
3. `universes`
4. `worlds`
5. `world_clocks`
6. `regions`
7. `locations`
8. `characters`
9. `character_traits`
10. `character_relationships`
11. `stories`
12. `story_versions`
13. `story_chapters`
14. `story_scenes`
15. `story_sessions`
16. `story_participants`
17. `choice_points`
18. `choice_options`
19. `choice_selections`
20. `choice_consequences`
21. `item_definitions`
22. `inventories`
23. `inventory_entries`
24. `memories`
25. `emotional_states`
26. `world_events`
27. `domain_events`
28. `outbox_messages`
29. `generation_requests`
30. `generation_runs`
31. `generation_outputs`
32. `media_assets`

**Minimum playable total: 32 tables**

This subset supports:

- one parent account;
- one or more child profiles;
- persistent worlds and locations;
- playable characters and NPCs;
- story versions and sessions;
- interactive choices;
- inventory;
- basic memories and emotions;
- world events;
- AI generation tracking;
- media references.

---

## 6. Migration Dependency Order

Recommended migration groups:

### Group 1 — Extensions and shared foundations

```text
pgcrypto or UUID support
pgvector
shared status/check functions
```

### Group 2 — Identity

```text
users
user_identities
roles
permissions
user_roles
role_permissions
```

### Group 3 — Profiles

```text
child_profiles
child_interests
child_preferences
parental_controls
consent_records
```

### Group 4 — World Geography

```text
universes
worlds
world_clocks
regions
locations
location_connections
settlements
```

### Group 5 — Characters and Social

```text
characters
character_traits
character_relationships
families
family_memberships
groups
group_memberships
occupations
character_occupations
```

### Group 6 — AI Provider Foundations

```text
model_providers
model_configs
prompt_templates
prompt_template_versions
```

This group precedes story versions if story versions reference generation outputs only through later nullable constraints.

### Group 7 — Story Structure

```text
stories
story_versions
story_chapters
story_scenes
story_sessions
story_participants
```

### Group 8 — Choices

```text
choice_points
choice_options
choice_consequences
choice_selections
delayed_effects
consequence_executions
```

### Group 9 — Inventory

```text
item_definitions
item_instances
inventories
inventory_entries
item_transfers
```

### Group 10 — Memory and Emotion

```text
memories
memory_character_links
memory_location_links
memory_story_links
emotional_states
emotion_history
character_goals
decision_records
utility_evaluations
trait_adjustments
```

### Group 11 — Simulation and Events

```text
simulation_runs
simulation_tasks
world_events
event_participants
event_impacts
domain_events
outbox_messages
simulation_checkpoints
```

### Group 12 — AI Runtime and Context

```text
context_packages
context_items
generation_requests
generation_runs
generation_outputs
generation_cost_records
memory_embeddings
```

### Group 13 — Media

```text
media_assets
media_variants
character_asset_links
story_asset_links
location_asset_links
item_asset_links
```

### Group 14 — Operations

```text
audit_logs
usage_events
job_runs
error_records
data_retention_records
```

### Group 15 — Deferred circular foreign keys

Nullable or circular references should be added after both sides exist.

Examples:

```text
story_versions.generation_output_id
media_assets.generation_output_id
story_sessions.current_scene_id
```

---

## 7. Relationship Cardinality Inventory

| Parent | Child / Join | Cardinality | Required Child FK |
|---|---|---:|---|
| `users` | `child_profiles` | 1:N | Yes |
| `users` | `user_identities` | 1:N | Yes |
| `users` | `user_roles` | 1:N | Yes |
| `universes` | `worlds` | 1:N | Yes |
| `worlds` | `regions` | 1:N | Yes |
| `regions` | `locations` | 1:N | Yes |
| `worlds` | `characters` | 1:N | Yes |
| `child_profiles` | playable `characters` | 1:N | No for NPCs |
| `characters` | `character_traits` | 1:N | Yes |
| `characters` | `character_relationships` | N:M directed | Yes |
| `stories` | `story_versions` | 1:N | Yes |
| `story_versions` | `story_chapters` | 1:N | Yes |
| `story_chapters` | `story_scenes` | 1:N | Yes |
| `story_versions` | `story_sessions` | 1:N | Yes |
| `child_profiles` | `story_sessions` | 1:N | Yes |
| `story_sessions` | `story_participants` | 1:N | Yes |
| `characters` | `story_participants` | 1:N | Yes |
| `story_scenes` | `choice_points` | 1:N | Yes |
| `choice_points` | `choice_options` | 1:N | Yes |
| `choice_options` | `choice_consequences` | 1:N | Yes |
| `story_sessions` | `choice_selections` | 1:N | Yes |
| `inventories` | `inventory_entries` | 1:N | Yes |
| `item_definitions` | `item_instances` | 1:N | Yes |
| `characters` | `memories` | 1:N | Yes |
| `characters` | `emotional_states` | 1:1 current | Yes |
| `worlds` | `world_events` | 1:N | Yes |
| `world_events` | `event_participants` | 1:N | Yes |
| `domain_events` | `outbox_messages` | 1:N | Yes |
| `generation_requests` | `generation_runs` | 1:N | Yes |
| `generation_runs` | `generation_outputs` | 1:N | Yes |
| `media_assets` | `media_variants` | 1:N | Yes |

---

## 8. Authoritative, Historical and Derived Boundaries

### Authoritative current-state tables

Examples:

- `users`
- `child_profiles`
- `worlds`
- `world_clocks`
- `characters`
- `character_traits`
- `character_relationships`
- `story_sessions`
- `inventories`
- `inventory_entries`
- `emotional_states`
- `world_events`

### Append-only historical tables

Examples:

- `choice_selections`
- `item_transfers`
- `character_trait_history`
- `emotion_history`
- `decision_records`
- `domain_events`
- `audit_logs`
- `generation_runs`
- `generation_cost_records`

### Derived and rebuildable tables

Examples:

- `memory_embeddings`
- future graph projections
- future recommendation projections
- future analytics aggregates

Derived tables must never become the only source of truth.

---

## 9. Deletion and Foreign Key Behavior Summary

### Default behavior

```text
ON DELETE RESTRICT
```

Use for most domain relationships.

### Controlled cascade candidates

```text
user_roles
role_permissions
child_interests
child_preferences
context_items
media_variants
```

Cascade is permitted only when the child has no independent historical value.

### Set-null candidates

```text
characters.current_location_id
stories.world_id
media_assets.generation_output_id
story_sessions.current_scene_id
```

Set-null is acceptable only when history and ownership remain understandable.

### Never cascade-delete automatically

- completed story sessions;
- committed choices;
- memories;
- item transfers;
- domain events;
- audit logs;
- generation cost records;
- published story versions.

---

## 10. Tables Requiring Future Partition Review

Partitioning is not required initially, but the following tables must be monitored:

- `domain_events`
- `audit_logs`
- `usage_events`
- `emotion_history`
- `character_trait_history`
- `decision_records`
- `simulation_tasks`
- `generation_runs`
- `generation_cost_records`
- `item_transfers`

Likely future partition key:

```text
occurred_at / created_at by month
```

Partitioning must be driven by measured volume, not implemented prematurely.

---

## 11. Cross-Domain Dependency Rules

1. Identity may not depend on story or simulation domains.
2. Child profile may depend only on identity.
3. World geography may exist independently of child profiles.
4. Characters depend on worlds and optionally profiles.
5. Story structure may depend on worlds and media metadata.
6. Story sessions depend on profiles, versions and participants.
7. Choice execution may update story, inventory, memory and events.
8. Simulation may update characters, events, world clocks and memories.
9. AI generation may read from any domain but may not directly become authoritative without validation.
10. Media depends on object storage but PostgreSQL metadata remains authoritative.

---

## 12. Canonical Naming Decisions

- Table names use plural `snake_case`.
- Primary key name is `id`.
- Foreign keys use `<entity>_id`.
- Join tables use both entity names or a domain-specific relationship name.
- Historical tables use `_history`, `_records`, `_events` or `_transfers`.
- Version tables use `_versions`.
- Current-state tables do not use `current_` unless needed to distinguish from history.
- Status values are lowercase `snake_case`.
- JSONB columns end with `_jsonb` only where clarity is needed; the final physical naming standard will decide whether the suffix is mandatory.

---

## 13. Decisions Finalized by This Inventory

1. The full logical model contains about 85 table candidates.
2. The initial production-capable MVP target contains 63 tables.
3. The minimum internal playable prototype can begin with 32 tables.
4. Migration order is domain-based and dependency-aware.
5. Circular foreign keys will be added in deferred migrations.
6. `ON DELETE RESTRICT` is the default.
7. Historical and audit records cannot be cascade-deleted.
8. Derived vector and graph records are rebuildable.
9. PostgreSQL remains the only authoritative source.
10. Table names and relationship ownership are now canonical.

---

## 14. Next Artifact

**Column vs JSONB Decision Rules v1**

The next document will define:

- when a field must be a normal column;
- when JSONB is allowed;
- indexing rules for JSONB;
- promotion rules from JSONB to columns;
- prohibited JSONB patterns;
- examples for characters, emotions, relationships, simulation and AI provider payloads.
