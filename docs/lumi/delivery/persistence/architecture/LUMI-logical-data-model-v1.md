# Project LUMI — Logical Data Model v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** ADR-001, Database Domain Map, Conceptual ERD v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document converts the Conceptual ERD into a logical relational model.

It defines:

- logical tables;
- primary keys;
- foreign keys;
- required and optional relationships;
- normalization boundaries;
- subtype strategies;
- canonical status fields;
- initial JSONB boundaries;
- versioning and ownership columns.

It does not yet define final SQL types, every index, partitioning rule or physical DDL.

---

## 2. Global Logical Conventions

### 2.1 Identifier Strategy

All major entities use:

```text
id UUID PRIMARY KEY
```

UUIDs are chosen because:

- records may be created by distributed application components;
- IDs should not reveal sequence or record volume;
- import, export and offline generation become easier;
- future service separation remains possible.

Internal append-only logs may use sequence-backed bigint identifiers where ordering and storage efficiency matter.

### 2.2 Common Columns

Most mutable entities include:

```text
id
created_at
updated_at
version
status
```

Where needed:

```text
archived_at
deleted_at
created_by
updated_by
```

### 2.3 Optimistic Concurrency

Entities with frequent state changes should include:

```text
version INTEGER NOT NULL DEFAULT 1
```

Candidates:

- characters;
- story_sessions;
- inventories;
- world_clocks;
- world_events;
- simulation_runs;
- child_profiles.

### 2.4 Time Domains

The model distinguishes:

- application time;
- world simulation time;
- event occurrence time;
- processing time.

Examples:

```text
created_at
occurred_at
world_occurred_at
processed_at
effective_from
effective_until
```

---

## 3. Identity and Access Model

## 3.1 users

Purpose: Primary account identity.

Logical columns:

```text
id
email
display_name
status
locale
timezone
last_login_at
created_at
updated_at
version
```

Constraints:

- `email` unique where present;
- `status` required;
- one user can own many child profiles.

## 3.2 user_identities

Purpose: Authentication provider identities.

Logical columns:

```text
id
user_id FK -> users.id
provider
provider_subject
provider_metadata_jsonb
created_at
updated_at
```

Constraints:

- unique `(provider, provider_subject)`;
- user_id required.

## 3.3 roles

```text
id
code
name
description
status
created_at
updated_at
```

Constraints:

- `code` unique.

## 3.4 permissions

```text
id
code
name
description
created_at
updated_at
```

Constraints:

- `code` unique.

## 3.5 user_roles

```text
user_id FK -> users.id
role_id FK -> roles.id
assigned_at
assigned_by_user_id FK -> users.id NULL
```

Primary key:

```text
(user_id, role_id)
```

## 3.6 role_permissions

```text
role_id FK -> roles.id
permission_id FK -> permissions.id
```

Primary key:

```text
(role_id, permission_id)
```

---

## 4. Child Profile and Personalization Model

## 4.1 child_profiles

```text
id
owner_user_id FK -> users.id
display_name
birth_year NULL
age_band
default_language
status
personalization_jsonb
created_at
updated_at
version
archived_at NULL
```

Rules:

- owner_user_id required;
- birth year optional if age band is used;
- sensitive attributes minimized;
- one owner user initially.

## 4.2 child_interests

```text
id
child_profile_id FK -> child_profiles.id
interest_code
weight
source
created_at
updated_at
```

Constraints:

- unique `(child_profile_id, interest_code)`.

## 4.3 child_preferences

```text
id
child_profile_id FK -> child_profiles.id
preference_key
value_jsonb
created_at
updated_at
```

Constraints:

- unique `(child_profile_id, preference_key)`.

## 4.4 parental_controls

```text
id
child_profile_id FK -> child_profiles.id
content_age_limit
media_generation_allowed
audio_generation_allowed
interaction_limits_jsonb
retention_policy_code
consent_status
created_at
updated_at
version
```

Constraints:

- one-to-one with child profile;
- unique child_profile_id.

---

## 5. Universe, World and Geography Model

## 5.1 universes

```text
id
name
slug
description
status
settings_jsonb
created_at
updated_at
version
```

Constraints:

- `slug` unique.

## 5.2 worlds

```text
id
universe_id FK -> universes.id
name
slug
description
status
world_type
settings_jsonb
created_at
updated_at
version
archived_at NULL
```

Constraints:

- unique `(universe_id, slug)`.

## 5.3 world_clocks

```text
id
world_id FK -> worlds.id
current_world_time
last_simulated_at
last_user_activity_at
offline_progression_limit_days
simulation_intensity_profile_jsonb
is_frozen
freeze_reason
version
updated_at
```

Constraints:

- one-to-one with world;
- unique world_id.

## 5.4 regions

```text
id
world_id FK -> worlds.id
parent_region_id FK -> regions.id NULL
name
slug
region_type
description
environment_jsonb
status
created_at
updated_at
version
```

Constraints:

- unique `(world_id, slug)`.

## 5.5 locations

```text
id
region_id FK -> regions.id
parent_location_id FK -> locations.id NULL
name
slug
location_type
description
biome_code
environment_jsonb
status
created_at
updated_at
version
```

Constraints:

- unique `(region_id, slug)`.

## 5.6 location_connections

```text
id
source_location_id FK -> locations.id
target_location_id FK -> locations.id
connection_type
direction_mode
is_active
conditions_jsonb
travel_cost_jsonb
created_at
updated_at
version
```

Constraints:

- source and target cannot be identical;
- unique active path rules decided later.

## 5.7 settlements

```text
id
location_id FK -> locations.id
name
slug
settlement_type
population_estimate NULL
status
society_state_jsonb
economy_state_jsonb
created_at
updated_at
version
```

Constraints:

- unique `(location_id, slug)`.

---

## 6. Character and Social Model

## 6.1 characters

Unified root table for playable characters, NPCs and creatures.

```text
id
world_id FK -> worlds.id
child_profile_id FK -> child_profiles.id NULL
current_location_id FK -> locations.id NULL
character_kind
name
slug
status
is_playable
is_autonomous
importance_level
profile_jsonb
simulation_profile_jsonb
created_at
updated_at
version
archived_at NULL
```

Rules:

- NPC and playable character share one table;
- child_profile_id is optional;
- `character_kind` differentiates human, animal, fantasy and other types;
- stable identity stays relational;
- flexible appearance and profile details may use JSONB.

## 6.2 character_traits

```text
id
character_id FK -> characters.id
trait_code
value
confidence
source
updated_at
version
```

Constraints:

- unique `(character_id, trait_code)`.

Reason for separate rows:

- frequent querying;
- incremental changes;
- history support;
- avoids rewriting a large JSON object.

## 6.3 character_trait_history

```text
id BIGINT
character_id FK -> characters.id
trait_code
old_value
new_value
reason_type
reason_reference_id NULL
occurred_at
world_occurred_at NULL
```

Append-only.

## 6.4 character_relationships

```text
id
source_character_id FK -> characters.id
target_character_id FK -> characters.id
relationship_type
dimensions_jsonb
status
last_interaction_at
created_at
updated_at
version
```

Constraints:

- source != target;
- unique active `(source_character_id, target_character_id, relationship_type)`.

Directionality is explicit.

## 6.5 families

```text
id
world_id FK -> worlds.id
name
status
metadata_jsonb
created_at
updated_at
```

## 6.6 family_memberships

```text
family_id FK -> families.id
character_id FK -> characters.id
family_role
joined_at
left_at NULL
```

Primary key may include active membership rule.

## 6.7 groups

```text
id
world_id FK -> worlds.id
settlement_id FK -> settlements.id NULL
name
group_type
status
metadata_jsonb
created_at
updated_at
version
```

## 6.8 group_memberships

```text
id
group_id FK -> groups.id
character_id FK -> characters.id
role_code
rank_value NULL
loyalty_value NULL
joined_at
left_at NULL
status
```

## 6.9 occupations

```text
id
world_id FK -> worlds.id
code
name
description
metadata_jsonb
```

## 6.10 character_occupations

```text
id
character_id FK -> characters.id
occupation_id FK -> occupations.id
settlement_id FK -> settlements.id NULL
started_at
ended_at NULL
status
```

---

## 7. Story and Session Model

## 7.1 stories

```text
id
world_id FK -> worlds.id NULL
owner_user_id FK -> users.id NULL
story_type
title
slug
status
source_type
metadata_jsonb
created_at
updated_at
version
archived_at NULL
```

## 7.2 story_versions

Immutable after publication.

```text
id
story_id FK -> stories.id
version_number
content_hash
status
language
title
summary
generation_output_id FK -> generation_outputs.id NULL
published_at NULL
created_at
```

Constraints:

- unique `(story_id, version_number)`;
- published versions immutable.

## 7.3 story_chapters

```text
id
story_version_id FK -> story_versions.id
chapter_order
title
summary
content_jsonb
created_at
```

Constraints:

- unique `(story_version_id, chapter_order)`.

## 7.4 story_scenes

```text
id
chapter_id FK -> story_chapters.id
scene_order
scene_type
location_id FK -> locations.id NULL
title
narrative_text
presentation_jsonb
created_at
```

Constraints:

- unique `(chapter_id, scene_order)`.

## 7.5 story_sessions

```text
id
child_profile_id FK -> child_profiles.id
story_version_id FK -> story_versions.id
world_id FK -> worlds.id NULL
current_scene_id FK -> story_scenes.id NULL
status
started_at
last_activity_at
completed_at NULL
session_state_jsonb
version
created_at
updated_at
```

Rules:

- references exact immutable version;
- session state remains bounded;
- authoritative inventory or relationship changes do not live only in JSONB.

## 7.6 story_participants

```text
id
story_session_id FK -> story_sessions.id
character_id FK -> characters.id
participant_role
joined_scene_id FK -> story_scenes.id NULL
left_scene_id FK -> story_scenes.id NULL
status
```

Constraints:

- unique active `(story_session_id, character_id, participant_role)`.

## 7.7 story_continuations

```text
id
source_story_session_id FK -> story_sessions.id
source_story_version_id FK -> story_versions.id
new_story_id FK -> stories.id
continuation_type
created_at
```

---

## 8. Choice and Consequence Model

## 8.1 choice_points

```text
id
story_scene_id FK -> story_scenes.id
choice_order
prompt_text
status
selection_mode
metadata_jsonb
created_at
```

## 8.2 choice_options

```text
id
choice_point_id FK -> choice_points.id
option_order
label
description
hint_text NULL
requirements_jsonb
status
created_at
```

Constraints:

- unique `(choice_point_id, option_order)`.

## 8.3 choice_selections

Append-only after commit.

```text
id
story_session_id FK -> story_sessions.id
choice_point_id FK -> choice_points.id
choice_option_id FK -> choice_options.id
selected_by_child_profile_id FK -> child_profiles.id
selected_at
world_selected_at NULL
commit_status
idempotency_key
created_at
```

Constraints:

- unique `(story_session_id, choice_point_id)`;
- unique idempotency key where present.

## 8.4 choice_consequences

```text
id
choice_option_id FK -> choice_options.id
consequence_type
execution_timing
priority
payload_jsonb
status
created_at
```

## 8.5 delayed_effects

```text
id
source_consequence_id FK -> choice_consequences.id
story_session_id FK -> story_sessions.id NULL
world_id FK -> worlds.id
scheduled_world_time NULL
scheduled_real_time NULL
condition_jsonb NULL
payload_jsonb
status
attempt_count
created_at
updated_at
```

## 8.6 consequence_executions

```text
id BIGINT
consequence_id FK -> choice_consequences.id NULL
delayed_effect_id FK -> delayed_effects.id NULL
story_session_id FK -> story_sessions.id NULL
status
started_at
completed_at NULL
result_jsonb
error_code NULL
```

---

## 9. Inventory and Item Model

## 9.1 item_definitions

```text
id
world_id FK -> worlds.id NULL
code
name
item_type
description
stackable
unique_instance_required
capabilities_jsonb
metadata_jsonb
status
created_at
updated_at
version
```

Constraints:

- unique `(world_id, code)` where world-specific.

## 9.2 item_instances

```text
id
item_definition_id FK -> item_definitions.id
world_id FK -> worlds.id
serial_label NULL
durability_value NULL
state_jsonb
status
created_at
updated_at
version
```

## 9.3 inventories

Explicit owner model will use nullable owner columns plus a database check constraint in the logical design.

```text
id
character_id FK -> characters.id NULL
child_profile_id FK -> child_profiles.id NULL
group_id FK -> groups.id NULL
location_id FK -> locations.id NULL
inventory_type
status
created_at
updated_at
version
```

Rule:

Exactly one owner foreign key must be non-null.

## 9.4 inventory_entries

```text
id
inventory_id FK -> inventories.id
item_definition_id FK -> item_definitions.id
item_instance_id FK -> item_instances.id NULL
quantity
entry_state_jsonb
acquired_at
updated_at
version
```

Rules:

- unique instance entries use quantity 1;
- stackable entries may omit item_instance_id;
- uniqueness rules depend on stackability.

## 9.5 item_transfers

Append-only.

```text
id
item_instance_id FK -> item_instances.id NULL
item_definition_id FK -> item_definitions.id
source_inventory_id FK -> inventories.id NULL
target_inventory_id FK -> inventories.id NULL
quantity
transfer_reason
story_session_id FK -> story_sessions.id NULL
occurred_at
world_occurred_at NULL
```

---

## 10. Memory, Emotion, Goal and Decision Model

## 10.1 memories

```text
id
character_id FK -> characters.id
memory_type
title NULL
content
importance_value
emotional_valence
confidence_value
occurred_at NULL
world_occurred_at NULL
expires_at NULL
source_type
source_reference_jsonb
metadata_jsonb
status
created_at
updated_at
version
```

## 10.2 memory_character_links

```text
memory_id FK -> memories.id
character_id FK -> characters.id
link_role
```

Primary key:

```text
(memory_id, character_id, link_role)
```

## 10.3 memory_location_links

```text
memory_id FK -> memories.id
location_id FK -> locations.id
link_role
```

## 10.4 memory_event_links

```text
memory_id FK -> memories.id
world_event_id FK -> world_events.id NULL
domain_event_id FK -> domain_events.id NULL
link_role
```

## 10.5 memory_story_links

```text
memory_id FK -> memories.id
story_session_id FK -> story_sessions.id
story_scene_id FK -> story_scenes.id NULL
link_role
```

## 10.6 memory_embeddings

```text
id
memory_id FK -> memories.id
embedding_model
embedding_dimension
embedding_vector
content_hash
created_at
```

Constraints:

- unique `(memory_id, embedding_model, content_hash)`.

## 10.7 emotional_states

Current emotional state.

```text
id
character_id FK -> characters.id
dimensions_jsonb
dominant_emotion
intensity
effective_at
version
updated_at
```

Constraint:

- one current row per character.

## 10.8 emotion_history

Append-only.

```text
id BIGINT
character_id FK -> characters.id
previous_dimensions_jsonb
new_dimensions_jsonb
trigger_type
trigger_reference_jsonb
occurred_at
world_occurred_at NULL
```

## 10.9 character_goals

```text
id
character_id FK -> characters.id
goal_type
title
description
priority
progress_value
status
target_reference_jsonb
started_at
due_world_time NULL
completed_at NULL
created_at
updated_at
version
```

## 10.10 decision_records

```text
id
character_id FK -> characters.id
decision_type
selected_action
candidate_actions_jsonb
reasoning_summary
input_snapshot_jsonb
utility_snapshot_jsonb
occurred_at
world_occurred_at NULL
created_at
```

Important:

Do not store hidden model chain-of-thought. Store only concise, product-safe decision rationale and structured inputs.

## 10.11 utility_evaluations

```text
id
decision_record_id FK -> decision_records.id
candidate_code
score
factor_scores_jsonb
selected
created_at
```

## 10.12 trait_adjustments

```text
id BIGINT
character_id FK -> characters.id
trait_code
delta_value
reason_type
reason_reference_jsonb
occurred_at
world_occurred_at NULL
```

---

## 11. Simulation, Time and Event Model

## 11.1 simulation_runs

```text
id
world_id FK -> worlds.id
run_type
status
real_elapsed_seconds
world_time_from
world_time_to
intensity_profile_jsonb
selected_entity_count
started_at
completed_at NULL
version
error_summary NULL
```

## 11.2 simulation_tasks

```text
id
simulation_run_id FK -> simulation_runs.id
entity_type
entity_id
task_type
priority
status
input_jsonb
result_jsonb NULL
started_at NULL
completed_at NULL
```

## 11.3 world_events

```text
id
world_id FK -> worlds.id
region_id FK -> regions.id NULL
location_id FK -> locations.id NULL
event_type
title
description
scope
status
importance
started_world_time
ended_world_time NULL
state_jsonb
created_at
updated_at
version
```

## 11.4 event_participants

```text
id
world_event_id FK -> world_events.id
character_id FK -> characters.id
participation_role
impact_level
knowledge_status
created_at
updated_at
```

## 11.5 event_impacts

```text
id
world_event_id FK -> world_events.id
target_type
character_id FK -> characters.id NULL
location_id FK -> locations.id NULL
settlement_id FK -> settlements.id NULL
group_id FK -> groups.id NULL
impact_type
impact_payload_jsonb
applied_at NULL
status
```

Rule:

Exactly one target foreign key is required for target types represented relationally.

## 11.6 domain_events

Append-only integration-neutral business events.

```text
id BIGINT
event_uuid UUID
aggregate_type
aggregate_id UUID
event_type
event_version
payload_jsonb
metadata_jsonb
occurred_at
world_occurred_at NULL
correlation_id UUID NULL
causation_id UUID NULL
```

Constraints:

- `event_uuid` unique.

## 11.7 outbox_messages

```text
id BIGINT
domain_event_id BIGINT FK -> domain_events.id
topic
message_key
payload_jsonb
status
attempt_count
available_at
processed_at NULL
last_error NULL
created_at
```

## 11.8 simulation_checkpoints

```text
id
simulation_run_id FK -> simulation_runs.id
world_id FK -> worlds.id
checkpoint_type
world_time
state_reference_jsonb
created_at
```

---

## 12. AI Generation and Context Model

## 12.1 model_providers

```text
id
code
name
status
configuration_reference
created_at
updated_at
```

## 12.2 model_configs

```text
id
provider_id FK -> model_providers.id
model_code
capability_type
status
pricing_jsonb
limits_jsonb
settings_jsonb
created_at
updated_at
version
```

## 12.3 prompt_templates

```text
id
code
name
purpose
language
status
current_version_number
created_at
updated_at
```

## 12.4 prompt_template_versions

```text
id
prompt_template_id FK -> prompt_templates.id
version_number
template_text
input_schema_jsonb
output_schema_jsonb
created_at
published_at NULL
```

Constraints:

- unique `(prompt_template_id, version_number)`.

## 12.5 context_packages

```text
id
world_id FK -> worlds.id NULL
child_profile_id FK -> child_profiles.id NULL
story_session_id FK -> story_sessions.id NULL
context_type
content_hash
summary
metadata_jsonb
created_at
```

## 12.6 context_items

```text
id
context_package_id FK -> context_packages.id
item_order
item_type
reference_id UUID NULL
content
metadata_jsonb
token_estimate NULL
created_at
```

## 12.7 generation_requests

```text
id
request_type
child_profile_id FK -> child_profiles.id NULL
story_session_id FK -> story_sessions.id NULL
context_package_id FK -> context_packages.id NULL
prompt_template_version_id FK -> prompt_template_versions.id NULL
status
idempotency_key
requested_at
completed_at NULL
metadata_jsonb
```

## 12.8 generation_runs

```text
id
generation_request_id FK -> generation_requests.id
model_config_id FK -> model_configs.id
attempt_number
status
request_payload_jsonb
response_metadata_jsonb
started_at
completed_at NULL
error_code NULL
```

## 12.9 generation_outputs

```text
id
generation_run_id FK -> generation_runs.id
output_type
text_content NULL
structured_content_jsonb NULL
validation_status
content_hash
created_at
```

## 12.10 generation_cost_records

```text
id
generation_run_id FK -> generation_runs.id
currency_code
input_units
output_units
image_megapixels NULL
audio_seconds NULL
estimated_cost
actual_cost NULL
created_at
```

---

## 13. Media and Asset Model

## 13.1 media_assets

```text
id
owner_user_id FK -> users.id NULL
child_profile_id FK -> child_profiles.id NULL
world_id FK -> worlds.id NULL
asset_type
mime_type
object_key
checksum
file_size
width NULL
height NULL
duration_seconds NULL
status
generation_output_id FK -> generation_outputs.id NULL
created_at
updated_at
version
```

## 13.2 media_variants

```text
id
media_asset_id FK -> media_assets.id
variant_type
mime_type
object_key
checksum
file_size
width NULL
height NULL
duration_seconds NULL
created_at
```

## 13.3 character_asset_links

```text
character_id FK -> characters.id
media_asset_id FK -> media_assets.id
link_role
sort_order
```

## 13.4 story_asset_links

```text
story_version_id FK -> story_versions.id
story_scene_id FK -> story_scenes.id NULL
media_asset_id FK -> media_assets.id
link_role
sort_order
```

## 13.5 location_asset_links

```text
location_id FK -> locations.id
media_asset_id FK -> media_assets.id
link_role
sort_order
```

## 13.6 item_asset_links

```text
item_definition_id FK -> item_definitions.id
media_asset_id FK -> media_assets.id
link_role
sort_order
```

---

## 14. Audit and Operations Model

## 14.1 audit_logs

Append-only.

```text
id BIGINT
actor_user_id FK -> users.id NULL
actor_type
action_code
subject_type
subject_id UUID NULL
before_jsonb NULL
after_jsonb NULL
request_id UUID NULL
occurred_at
metadata_jsonb
```

## 14.2 usage_events

```text
id BIGINT
user_id FK -> users.id NULL
child_profile_id FK -> child_profiles.id NULL
event_code
story_session_id FK -> story_sessions.id NULL
occurred_at
properties_jsonb
```

## 14.3 job_runs

```text
id
job_type
job_key
status
attempt_count
started_at
completed_at NULL
input_jsonb
result_jsonb NULL
error_summary NULL
```

## 14.4 consent_records

```text
id
user_id FK -> users.id
child_profile_id FK -> child_profiles.id NULL
consent_type
consent_version
status
granted_at NULL
revoked_at NULL
metadata_jsonb
```

---

## 15. Canonical Logical Status Groups

Final implementation may use lookup tables, PostgreSQL enums or constrained text. The physical choice will be decided later.

### Generic lifecycle

```text
draft
active
paused
completed
archived
cancelled
failed
```

### Story session

```text
created
in_progress
paused
completed
abandoned
failed
```

### Generation

```text
queued
running
validating
succeeded
rejected
failed
cancelled
```

### Simulation

```text
planned
running
partially_completed
completed
failed
cancelled
```

### Event

```text
scheduled
active
resolved
cancelled
expired
```

### Delayed effect

```text
pending
eligible
processing
applied
skipped
failed
cancelled
```

---

## 16. Normalization Decisions

### Normalized as separate tables

- user identities;
- roles and permissions;
- child interests;
- world geography;
- character relationships;
- character traits;
- family and group memberships;
- story versions;
- story chapters and scenes;
- choice options;
- inventory entries;
- memories and entity links;
- character goals;
- world events;
- generation attempts;
- media variants.

### Retained as JSONB

- provider-specific AI payloads;
- flexible presentation settings;
- bounded simulation parameters;
- relationship dimension vectors;
- emotional dimension vectors;
- consequence payloads;
- optional environment attributes;
- generated structured output before domain promotion.

### Not allowed as JSONB-only authoritative data

- ownership;
- authorization;
- inventory quantities;
- selected story choice;
- current story version;
- current location;
- relationship endpoints;
- event target identity;
- parent-child profile ownership.

---

## 17. Subtype Strategy Decisions

### Character subtypes

Use single-table inheritance at the logical level:

```text
characters.character_kind
characters.profile_jsonb
```

Reasons:

- playable characters and NPCs share most behavior;
- simpler foreign keys;
- easier relationship and event references;
- avoids duplicate tables.

Dedicated subtype tables may be added only for large stable subtype-specific fields.

### Media subtypes

Use one media asset root with variants.

### Event subtypes

Use one world event root with typed payloads and explicit impact rows.

### Generation output subtypes

Use one output table with mutually exclusive text and structured fields initially.

---

## 18. Required Ownership Constraints

The following paths are mandatory:

```text
child_profile.owner_user_id -> users.id
story_session.child_profile_id -> child_profiles.id
playable character.child_profile_id -> child_profiles.id
memory.character_id -> characters.id
inventory -> exactly one owner
story_session.story_version_id -> story_versions.id
world_event.world_id -> worlds.id
character.world_id -> worlds.id
```

Cross-world foreign key consistency must be enforced through service validation and, where practical, database constraints or triggers.

---

## 19. Logical Data Integrity Rules

1. A published story version cannot be modified.
2. A committed choice selection cannot be replaced.
3. An inventory must have exactly one owner.
4. A unique item instance cannot exist in multiple active inventories.
5. A character relationship cannot target the same character as its source.
6. A world clock must exist for every active world.
7. A child profile must always have an owning user.
8. A story session must reference one exact story version.
9. A memory must belong to one character.
10. A domain event is append-only.
11. An outbox message must refer to a domain event.
12. A media asset object key must be unique.
13. A published prompt template version is immutable.
14. A generation output cannot be marked accepted before validation.
15. A simulation run cannot move world time backward.
16. Offline progression cannot exceed the configured maximum without an explicit administrative override.

---

## 20. Tables Deferred from MVP

The following may be postponed while preserving their conceptual boundaries:

- deep culture and tradition tables;
- law enforcement and governance execution tables;
- advanced economy ledgers;
- ecology population simulation;
- graph read-model projections;
- dedicated recommendation tables;
- advanced analytics warehouse;
- multi-user child-profile sharing;
- cross-world character residency history.

---

## 21. Initial Table Count Estimate

Approximate logical scope:

| Domain | Estimated tables |
|---|---:|
| Identity & Access | 6 |
| Child Profile | 4 |
| World & Geography | 7 |
| Character & Social | 10 |
| Story & Session | 7 |
| Choice & Consequence | 6 |
| Inventory & Items | 5 |
| Memory & Decision | 12 |
| Simulation & Events | 8 |
| AI Generation | 10 |
| Media | 6 |
| Audit & Operations | 4 |
| **Total logical candidates** | **85** |

This does not mean all 85 tables must be implemented in the first sprint.

The MVP subset will be selected during physical schema planning.

---

## 22. Logical Model Decisions Finalized

1. UUID is the default identifier for domain entities.
2. Append-only high-volume logs may use bigint.
3. NPC and playable character use one character root table.
4. Character traits use separate rows rather than one authoritative JSONB object.
5. Relationships are directional.
6. Story versions are immutable after publication.
7. Choices are append-only after commit.
8. Inventory uses explicit ownership and entries.
9. Memory links use explicit typed link tables.
10. Current emotional state and history are separated.
11. World event and domain event remain separate models.
12. Full event sourcing remains rejected.
13. AI request, run and output are separate entities.
14. Media files remain outside PostgreSQL.
15. PostgreSQL is the only authoritative store.

---

## 23. Open Items for the Next Step

The next step will define the canonical main table list and relationship inventory.

Items to refine:

- exact MVP table subset;
- physical naming conventions;
- required versus optional foreign keys;
- cascade and restrict behaviors;
- ownership check constraints;
- aggregate-specific table groups;
- cross-domain dependency map;
- tables that require partitioning later.

---

## 24. Next Artifact

**Main Table and Relationship Inventory v1**

This document will provide:

- canonical table names;
- domain ownership;
- parent-child relationships;
- mandatory foreign keys;
- relationship cardinalities;
- dependency order for migrations;
- MVP versus later-phase classification.
