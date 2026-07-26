# Project LUMI — Database Domain Map

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** ADR-001 — Primary Database Architecture
- **Primary Database:** PostgreSQL
- **Supporting Technologies:** JSONB, pgvector, Redis, S3/MinIO-compatible object storage

---

## 1. Purpose

This document defines the primary data domains of Project LUMI, the responsibilities of each domain, and the principal relationships between them.

It is the foundation for:

- the Entity Relationship Diagram (ERD);
- table and schema design;
- aggregate boundaries;
- migration planning;
- API boundaries;
- event and outbox design;
- indexing and performance strategy.

The domains in this document are logical boundaries. They do not automatically imply separate databases or microservices.

---

## 2. Domain Map Overview

```text
Identity & Access
      |
      v
Child Profiles & Preferences
      |
      v
Worlds & Geography
      |
      +--------------------+
      |                    |
      v                    v
Characters & Social      Culture, Society
Relationships            & Governance
      |                    |
      +---------+----------+
                |
                v
Story & Session Orchestration
                |
       +--------+---------+
       |                  |
       v                  v
Choices & Consequences   Inventory & Items
       |                  |
       +--------+---------+
                |
                v
Memory, Emotion & Decision
                |
                v
Simulation, Time & Events
                |
       +--------+---------+
       |                  |
       v                  v
AI Generation & Context  Media & Assets
       |
       v
Analytics, Audit & Operations
```

---

## 3. Core Domains

## 3.1 Identity & Access Domain

### Responsibility

Manages accounts, authentication identity, authorization and account-level settings.

### Core Entities

- `users`
- `user_identities`
- `roles`
- `permissions`
- `user_roles`
- `sessions`
- `account_settings`

### Key Relationships

- One user may own multiple child profiles.
- One user may have multiple authentication identities.
- Roles and permissions control access to administrative and parent functions.

### Data Rules

- Authentication secrets must not be stored in plain text.
- Authorization-critical fields must use normal relational columns.
- Account deletion must follow a controlled retention policy.
- Child profile data must not be used as an authentication identity.

---

## 3.2 Child Profile & Personalization Domain

### Responsibility

Stores child-specific preferences, age settings, interests, accessibility needs and parent-approved configuration.

### Core Entities

- `child_profiles`
- `child_preferences`
- `child_interests`
- `child_accessibility_settings`
- `parental_controls`
- `content_age_profiles`

### Key Relationships

- A user may own or manage multiple child profiles.
- A child profile may participate in multiple worlds and stories.
- A child profile may have one or more playable characters.
- Preferences influence story generation, difficulty, visuals and educational prompts.

### Stable Columns

- `user_id`
- `display_name`
- `birth_year` or age band
- `status`
- `default_language`
- `created_at`
- `updated_at`

### JSONB Candidates

- presentation preferences;
- accessibility configuration;
- optional interest weights;
- experimental personalization signals.

---

## 3.3 World & Geography Domain

### Responsibility

Represents persistent universes, worlds, regions, locations, routes and environmental geography.

### Core Entities

- `universes`
- `worlds`
- `regions`
- `locations`
- `location_connections`
- `biomes`
- `world_maps`
- `world_state_snapshots`

### Key Relationships

- A universe contains one or more worlds.
- A world contains regions.
- A region contains locations and settlements.
- Locations connect through routes, portals, roads, rivers or other travel links.
- Events, characters and stories reference geographic entities.

### Design Notes

- Geography must be relational because locations are frequently referenced by characters, events, quests and stories.
- Flexible environmental metadata may use JSONB.
- Map image files belong in object storage; PostgreSQL stores metadata and object keys.

### JSONB Candidates

- environmental modifiers;
- biome-specific properties;
- procedural generation parameters;
- temporary visual descriptors.

---

## 3.4 Character & Social Relationship Domain

### Responsibility

Stores playable characters, NPCs, creatures, social ties, group memberships and influence relationships.

### Core Entities

- `characters`
- `character_profiles`
- `character_traits`
- `character_relationships`
- `character_group_memberships`
- `character_locations`
- `character_status_history`
- `families`
- `groups`
- `occupations`

### Key Relationships

- A character belongs to a world.
- A character may be linked to a child profile.
- NPCs and playable characters use the same base character model where practical.
- Relationships are directional and may contain multiple dimensions.
- Characters may belong to families, settlements, guilds, teams or communities.

### Relationship Vector Example

A relationship may contain:

- trust;
- affection;
- fear;
- respect;
- rivalry;
- obligation;
- familiarity;
- influence.

These dimensions may initially be stored in JSONB, but relationship identity and endpoints must remain relational.

### Important Rule

Do not store all relationships inside the character document. Use explicit relationship rows.

---

## 3.5 Culture, Society & Governance Domain

### Responsibility

Represents settlements, communities, customs, traditions, beliefs, festivals, economic structures, laws and governance.

### Core Entities

- `settlements`
- `communities`
- `cultures`
- `traditions`
- `belief_systems`
- `festivals`
- `institutions`
- `governance_structures`
- `laws`
- `economic_entities`
- `settlement_resources`

### Key Relationships

- Settlements belong to locations or regions.
- Characters may belong to cultures, communities and institutions.
- Laws apply to geographic or social scopes.
- Festivals and traditions may trigger events or stories.
- Economic conditions affect settlement and NPC behavior.

### Design Notes

This domain should begin with a limited MVP model. Deep simulation fields can be added gradually without changing the core relational identity.

---

## 3.6 Story & Session Orchestration Domain

### Responsibility

Stores story definitions, generated story instances, chapters, scenes, participants, runtime sessions and playback progress.

### Core Entities

- `stories`
- `story_versions`
- `story_sessions`
- `story_chapters`
- `story_scenes`
- `story_participants`
- `story_session_state`
- `story_outputs`
- `story_continuations`

### Key Relationships

- A story belongs to a world or may be world-independent.
- A story session belongs to a child profile.
- A session may include multiple characters.
- Stories may reference locations, events, items and memories.
- A story may generate a continuation or branch.

### Stable Columns

- story type;
- lifecycle status;
- owner;
- world;
- current chapter;
- started/completed timestamps;
- version;
- generation source.

### JSONB Candidates

- generation parameters;
- scene presentation metadata;
- AI provider response metadata;
- optional narrative structure descriptors.

### Important Rule

Generated narrative text must be versioned. Regeneration must not silently overwrite the historical version experienced by the child.

---

## 3.7 Choice & Consequence Domain

### Responsibility

Records decision points, available options, selected choices, consequences and delayed effects.

### Core Entities

- `choice_points`
- `choice_options`
- `choice_selections`
- `choice_consequences`
- `delayed_effects`
- `consequence_executions`

### Key Relationships

- Choice points belong to story scenes or world events.
- A child profile selects an option during a session.
- Consequences may affect characters, relationships, items, memories, world state or future stories.
- Delayed effects may execute after a time or event condition.

### Transaction Boundary

A choice commit may update:

- session progress;
- inventory;
- relationships;
- memories;
- world state;
- domain events.

These updates must execute in a single transaction where immediate consistency is required.

---

## 3.8 Inventory & Item Domain

### Responsibility

Manages items, ownership, quantities, durability, capabilities, discovery and story use.

### Core Entities

- `item_definitions`
- `item_instances`
- `inventories`
- `inventory_entries`
- `item_capabilities`
- `item_usage_history`
- `item_transfers`

### Key Relationships

- An inventory may belong to a character, child profile, group or location.
- Item definitions describe reusable concepts.
- Item instances represent unique persistent objects.
- Items may unlock story options or influence consequences.

### Important Rule

Ownership must be authoritative and relational. It must not exist only inside story-state JSON.

---

## 3.9 Memory, Emotion & Decision Domain

### Responsibility

Stores character memories, emotional states, goals, motivations, utility evaluations and decision history.

### Core Entities

- `memories`
- `memory_entity_links`
- `memory_embeddings`
- `emotional_states`
- `emotion_history`
- `character_goals`
- `goal_progress`
- `decision_records`
- `utility_evaluations`
- `trait_adjustments`

### Memory Types

- episodic;
- semantic;
- relational;
- emotional;
- promise or obligation;
- rumor or uncertain knowledge;
- world-event memory.

### Key Relationships

- Memories belong to characters.
- A memory may reference multiple entities.
- Embeddings support semantic retrieval.
- Decisions reference the memories, goals and emotions that influenced them.

### Data Strategy

- Memory identity, owner, type, timestamps and importance use normal columns.
- Flexible content metadata may use JSONB.
- Embeddings use pgvector.
- Referenced entities use explicit link rows where reliable querying is required.

---

## 3.10 Simulation, Time & Event Domain

### Responsibility

Controls world time, background simulation, event occurrence, state changes and offline progression.

### Core Entities

- `world_clocks`
- `simulation_runs`
- `simulation_tasks`
- `domain_events`
- `world_events`
- `event_participants`
- `event_impacts`
- `state_transitions`
- `scheduled_effects`
- `simulation_checkpoints`

### Key Rules

- LUMI simulates a maximum of ten days of offline progression.
- Simulation intensity decays over the offline period.
- After the configured limit, the world remains static until the user returns.
- Only relevant entities should be simulated.
- Important state transitions must be auditable.

### Event Strategy

Use:

- current state tables for authoritative state;
- append-only event records for important changes;
- outbox records for reliable asynchronous processing.

Do not implement full event sourcing at the initial stage.

---

## 3.11 AI Generation & Context Domain

### Responsibility

Tracks generation requests, prompts, models, cost data, context packages and generated outputs.

### Core Entities

- `generation_requests`
- `generation_runs`
- `generation_outputs`
- `prompt_templates`
- `context_packages`
- `context_items`
- `model_providers`
- `model_configs`
- `generation_cost_records`
- `embedding_jobs`

### Key Relationships

- Generation requests may belong to stories, images, audio, maps or NPC actions.
- Context packages link to memories, characters, locations and events.
- Generated outputs must record provenance.
- Costs must be associated with provider, model and output type.

### JSONB Candidates

- provider-specific request payloads;
- provider-specific response metadata;
- generation tuning parameters;
- moderation or validation metadata.

### Important Rule

Provider-specific payloads must not dictate the core domain model.

---

## 3.12 Media & Asset Domain

### Responsibility

Stores metadata for images, audio, maps, icons and other generated or uploaded assets.

### Core Entities

- `media_assets`
- `media_variants`
- `asset_links`
- `generation_asset_links`
- `audio_tracks`
- `image_sets`

### Storage Rule

Binary files are stored in S3/MinIO-compatible object storage.

PostgreSQL stores:

- object key;
- media type;
- checksum;
- dimensions;
- duration;
- file size;
- ownership;
- generation provenance;
- lifecycle status.

---

## 3.13 Analytics, Audit & Operations Domain

### Responsibility

Supports auditability, usage analysis, error tracking, operational monitoring and administrative reporting.

### Core Entities

- `audit_logs`
- `usage_events`
- `feature_usage`
- `error_records`
- `job_runs`
- `data_retention_records`
- `consent_records`
- `administrative_actions`

### Important Distinction

Operational audit data and product analytics are different concerns.

- Audit records prioritize integrity and traceability.
- Analytics records prioritize aggregation and product insight.

Sensitive child-related analytics must be minimized and governed by explicit retention rules.

---

## 4. Shared Cross-Domain Concepts

## 4.1 Entity References

Several domains need to refer to multiple entity types. Avoid uncontrolled polymorphic references where foreign-key integrity is essential.

Preferred strategies:

1. explicit link tables;
2. separate nullable foreign keys only when the number of types is small and stable;
3. typed generic references only for low-risk metadata or audit contexts.

---

## 4.2 Lifecycle Status

Important entities should use explicit lifecycle states, such as:

- draft;
- active;
- paused;
- completed;
- archived;
- deleted.

Status transitions should be validated and, where important, recorded in history tables.

---

## 4.3 Temporal Data

Use:

- `created_at`;
- `updated_at`;
- `effective_from`;
- `effective_until`;
- `occurred_at`;
- `processed_at`;
- `deleted_at` only where soft deletion is justified.

Application time and world simulation time must not be confused.

---

## 4.4 Versioning

Versioning is required for:

- story content;
- prompt templates;
- generated outputs;
- world definitions where historical playback depends on them;
- major character-profile changes;
- schema-dependent simulation payloads.

---

## 4.5 Data Ownership

Every child-specific or user-specific record must have a clear ownership path.

Examples:

```text
user
  -> child_profile
      -> story_session
      -> choice_selection
```

```text
user
  -> child_profile
      -> playable_character
      -> inventory
```

World-shared data and child-private data must be clearly separated.

---

## 5. Recommended PostgreSQL Schema Boundaries

The first implementation may use logical PostgreSQL schemas:

- `identity`
- `profiles`
- `world`
- `character`
- `society`
- `story`
- `inventory`
- `memory`
- `simulation`
- `ai`
- `media`
- `operations`

These schemas improve organization but do not imply separate deployments.

For a smaller MVP, all tables may initially remain in `public` if migration tooling and naming conventions remain disciplined. The final choice will be recorded during physical schema design.

---

## 6. Initial Aggregate Boundaries

Suggested transactional aggregates:

### User Account Aggregate

- user;
- identities;
- account settings;
- role assignments.

### Child Profile Aggregate

- child profile;
- preferences;
- parental controls.

### Character Aggregate

- character;
- current traits;
- current emotional state;
- current location.

Large memory histories and relationships remain separate collections of rows.

### Story Session Aggregate

- session;
- current state;
- participant links;
- current scene;
- choice commit.

### Inventory Aggregate

- inventory;
- entries;
- item ownership mutations.

### World Event Aggregate

- world event;
- participants;
- impacts;
- scheduled consequences.

### Simulation Run Aggregate

- simulation run;
- selected tasks;
- checkpoint;
- resulting domain events.

---

## 7. MVP Domain Priority

### Phase 1 — Required for first playable product

1. Identity & Access
2. Child Profiles
3. Worlds & Geography
4. Characters
5. Stories & Sessions
6. Choices & Consequences
7. Inventory & Items
8. Basic Memory
9. Basic Simulation Events
10. Media Assets
11. Generation Tracking

### Phase 2 — Living world depth

1. Emotional history
2. Goals and utility decisions
3. Social groups and family systems
4. Background routines
5. Settlement and cultural systems
6. Advanced event impacts
7. Semantic memory retrieval

### Phase 3 — Advanced simulation

1. Economy
2. Governance and laws
3. Ecology and environmental feedback
4. Complex graph projections
5. Dedicated analytics pipeline
6. Specialized storage only if metrics justify it

---

## 8. Risks and Controls

### Risk: Excessive JSONB usage

**Control:** Stable and query-critical fields must be promoted to columns.

### Risk: Over-normalization

**Control:** Model transactional boundaries around real use cases, not theoretical purity.

### Risk: Giant character or world records

**Control:** Histories, relationships and event lists remain separate tables.

### Risk: Premature microservices

**Control:** Keep logical domain boundaries inside a modular monolith initially.

### Risk: Multiple sources of truth

**Control:** PostgreSQL remains authoritative. Redis and search projections are disposable.

### Risk: Simulation write volume

**Control:** Store meaningful state changes and aggregate low-value transient calculations.

---

## 9. Decisions Established by This Document

1. LUMI uses a domain-oriented relational model.
2. PostgreSQL remains the system of record.
3. JSONB is used selectively, not as a substitute for domain modeling.
4. Relationships, ownership and authorization remain relational.
5. Story sessions and choice commits require explicit transaction boundaries.
6. Memories use relational metadata plus optional vector embeddings.
7. Simulation uses current state plus append-only important events.
8. Media binaries remain outside the database.
9. Domain boundaries begin as modules, not separate microservices.
10. The next design artifact is the Conceptual ERD.

---

## 10. Next Artifact

The next document will be:

**LUMI Conceptual ERD v1**

It will define:

- entities;
- primary keys;
- principal foreign keys;
- cardinalities;
- ownership paths;
- high-risk many-to-many relationships;
- initial table groupings.
