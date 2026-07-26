
# Project LUMI — Character Schema v1

- **Document Type:** Persistence Schema Specification
- **Status:** Accepted
- **Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** Shared Database Types v1, World Schema v1

---

## 1. Purpose

This document defines the persistent PostgreSQL data model for characters and NPCs in Project LUMI.

The model must support:

- player-linked child characters;
- recurring companions;
- autonomous NPCs;
- animals and fantasy beings;
- traits and trait vectors;
- emotions;
- goals;
- relationships;
- memories;
- routines;
- influence;
- time sensitivity;
- temporary and persistent state changes;
- long-term character evolution.

The schema must remain expressive enough for a living world while avoiding uncontrolled state growth.

---

## 2. Aggregate Strategy

`Character` is an aggregate root.

The aggregate directly owns:

- identity;
- role;
- lifecycle;
- current location;
- current availability;
- core trait vector;
- current emotional summary;
- current goal summary;
- simulation relevance;
- version.

High-volume historical structures are persisted separately:

- emotion history;
- goal history;
- memory records;
- relationship changes;
- routine executions;
- state transitions.

A character should not require full hydration of all memories and history for normal operations.

---

## 3. Core Character Table

### `characters`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Primary identifier |
| world_id | uuid | yes | Owning world |
| child_profile_id | uuid | no | Linked child profile, if applicable |
| home_location_id | uuid | no | Character home |
| current_location_id | uuid | no | Current location |
| name | text | yes | Display name |
| slug | text | yes | Stable world-scoped identifier |
| character_type | text / enum | yes | child_avatar, companion, npc, animal, fantasy |
| species | text | no | Human, fox, dragon, etc. |
| age_category | text / enum | no | child, teen, adult, elder, ageless |
| role_type | text / enum | yes | protagonist, companion, resident, visitor, guide |
| lifecycle_status | text / enum | yes | draft, active, inactive, missing, archived |
| availability_status | text / enum | yes | available, busy, sleeping, traveling, unavailable |
| narrative_importance | smallint | yes | Current story relevance |
| simulation_priority | smallint | yes | Background simulation priority |
| trait_profile_version | integer | yes | Trait profile schema version |
| emotion_state_version | integer | yes | Current emotion schema version |
| goal_state_version | integer | yes | Current goal schema version |
| last_seen_at | timestamptz | no | Last observed by child |
| last_simulated_at | timestamptz | no | Last simulation update |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Last update timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Optimistic concurrency version |

Unique constraint:

```text
UNIQUE (world_id, slug)
```

---

## 4. Character Ownership and Scope

Every character belongs to exactly one world.

Rules:

- `world_id` is mandatory;
- a character cannot move to another world by changing ownership;
- inter-world travel uses transfer or portal events;
- `child_profile_id` is optional and only used for direct child-linked characters;
- a child-linked character must belong to a world owned by that child;
- current and home locations must belong to the same world.

Foreign key behavior:

```text
worlds.id
    1
    ↓
characters.world_id
    N
```

Recommended delete behavior:

```text
ON DELETE RESTRICT
```

---

## 5. Character Type

Recommended `character_type` values:

```text
child_avatar
companion
npc
animal
fantasy
system
```

`system` should be used rarely for non-personified world actors.

Character type affects:

- allowed ownership;
- simulation priority;
- memory richness;
- routine complexity;
- narrative exposure.

---

## 6. Trait Model

Traits are represented as vectors rather than one flat score.

Example dimensions:

```text
courage
curiosity
kindness
patience
caution
empathy
creativity
loyalty
independence
sociability
```

Trait dimensions may evolve by version.

Stable frequently used dimensions should remain relationally queryable.

---

## 7. Character Trait Table

### `character_traits`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Trait record identifier |
| character_id | uuid | yes | Owning character |
| trait_key | text | yes | Stable trait dimension |
| base_value | numeric | yes | Long-term baseline |
| current_value | numeric | yes | Current effective value |
| confidence | numeric | yes | Confidence in value |
| last_changed_at | timestamptz | no | Last update |
| source | text / enum | yes | initial, observed, story, parent, system |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| version | integer | yes | Concurrency version |

Unique constraint:

```text
UNIQUE (character_id, trait_key)
```

Recommended value range:

```text
0.0–1.0
```

or a normalized equivalent.

---

## 8. Trait History

### `character_trait_history`

Append-only history of meaningful trait changes.

Fields:

- id
- character_id
- trait_key
- previous_value
- new_value
- delta
- reason_code
- source_event_id
- correlation_id
- effective_at
- created_at

Only meaningful changes should be stored.

Do not create a history row for negligible floating-point noise.

---

## 9. Emotion Model

Current emotion is modeled as a multi-dimensional state.

Possible dimensions:

```text
joy
sadness
fear
anger
trust
surprise
calm
excitement
loneliness
hope
```

The emotional state must support mixed emotions.

One scalar emotion field is prohibited.

---

## 10. Current Emotion Table

### `character_emotion_states`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | State identifier |
| character_id | uuid | yes | Owning character |
| schema_version | integer | yes | Emotion schema version |
| emotion_vector | jsonb | yes | Current normalized emotion dimensions |
| dominant_emotion | text | no | Current dominant emotion |
| intensity | numeric | yes | Overall emotional intensity |
| stability | numeric | yes | Resistance to rapid change |
| decay_profile | jsonb | no | Emotion decay parameters |
| effective_at | timestamptz | yes | State effective time |
| updated_at | timestamptz | yes | Last update |
| version | integer | yes | Concurrency version |

Unique constraint:

```text
UNIQUE (character_id)
```

The JSONB payload must include `schema_version`.

---

## 11. Emotion History

### `character_emotion_history`

Append-only table.

Fields:

- id
- character_id
- previous_vector
- resulting_vector
- dominant_emotion
- intensity
- trigger_type
- trigger_id
- source_event_id
- effective_at
- created_at
- correlation_id

Emotion history is not loaded by default.

It is queried only for:

- reflection;
- long-term pattern analysis;
- story context;
- parent-facing summaries;
- consistency checks.

---

## 12. Goal Model

Characters may hold multiple concurrent goals.

Goals include:

- immediate needs;
- short-term intentions;
- long-term ambitions;
- social goals;
- safety goals;
- story-related goals.

Goals are prioritized and time-sensitive.

---

## 13. Character Goals Table

### `character_goals`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Goal identifier |
| character_id | uuid | yes | Owning character |
| goal_type | text / enum | yes | need, short_term, long_term, social, story |
| title | text | yes | Human-readable title |
| description | text | no | Goal details |
| priority | numeric | yes | Current utility weight |
| progress | numeric | yes | Progress value |
| urgency | numeric | yes | Time pressure |
| persistence | numeric | yes | Resistance to abandonment |
| status | text / enum | yes | active, paused, achieved, failed, abandoned |
| target_character_id | uuid | no | Optional social target |
| target_location_id | uuid | no | Optional location target |
| target_object_id | uuid | no | Optional object target |
| starts_at | timestamptz | no | Activation time |
| due_at | timestamptz | no | Optional deadline |
| completed_at | timestamptz | no | Completion time |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| version | integer | yes | Concurrency version |

---

## 14. Goal Constraints

Recommended normalized ranges:

```text
priority: 0.0–1.0
progress: 0.0–1.0
urgency: 0.0–1.0
persistence: 0.0–1.0
```

Rules:

- achieved goals require `progress = 1.0`;
- completed goals require `completed_at`;
- paused or abandoned goals are excluded from active utility evaluation;
- target entities must belong to the same world unless explicitly cross-world;
- only a limited number of high-priority active goals should be loaded into context.

---

## 15. Relationship Model

Relationships are directional.

Character A's relationship with Character B may differ from Character B's relationship with Character A.

This is required because:

- trust may be asymmetric;
- fear may be one-sided;
- admiration may not be mutual;
- influence may differ by direction.

---

## 16. Character Relationships Table

### `character_relationships`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Relationship identifier |
| world_id | uuid | yes | Owning world |
| source_character_id | uuid | yes | Evaluating character |
| target_character_id | uuid | yes | Evaluated character |
| relationship_type | text / enum | no | friend, family, rival, mentor, stranger |
| trust | numeric | yes | Trust level |
| affection | numeric | yes | Affection level |
| fear | numeric | yes | Fear level |
| respect | numeric | yes | Respect level |
| familiarity | numeric | yes | Familiarity level |
| influence | numeric | yes | Target influence on source |
| conflict | numeric | yes | Current conflict level |
| last_interaction_at | timestamptz | no | Last interaction |
| metadata | jsonb | no | Dynamic relationship details |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| version | integer | yes | Concurrency version |

Unique constraint:

```text
UNIQUE (source_character_id, target_character_id)
```

Constraint:

```text
source_character_id <> target_character_id
```

---

## 17. Influence Vector

Influence is not represented by one universal number.

Influence should be evaluated across dimensions such as:

```text
emotional
social
authority
proximity
story
cultural
economic
physical
knowledge
```

Persistent representation options:

- stable dimensions as relational columns;
- evolving dimensions as versioned JSONB;
- derived total influence calculated at runtime.

Recommended table:

### `character_influence_profiles`

Fields:

- character_id
- schema_version
- influence_vector
- default_reach
- decay_profile
- updated_at
- version

---

## 18. Proximity and Reach

Influence depends on distance and connection.

Possible reach levels:

```text
same_location
same_settlement
same_region
same_world
cross_world
```

Rules:

- local influence decays with distance;
- highly important leaders may retain regional influence;
- direct family or strong emotional bonds may remain relevant across distance;
- influence reach is not equivalent to story importance.

---

## 19. Memory Model

Memory is modeled as event-based, selective and relevance-weighted.

Memory is not a verbatim transcript.

Each memory records:

- what happened;
- who was involved;
- emotional impact;
- confidence;
- importance;
- persistence;
- decay;
- source;
- access scope.

---

## 20. Character Memories Table

### `character_memories`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Memory identifier |
| character_id | uuid | yes | Owning character |
| world_id | uuid | yes | Owning world |
| memory_type | text / enum | yes | episodic, social, factual, emotional, promise |
| subject_type | text / enum | no | character, location, item, event, world |
| subject_id | uuid | no | Referenced subject |
| title | text | yes | Short summary |
| summary | text | yes | Compact memory text |
| emotional_vector | jsonb | no | Emotional imprint |
| importance | numeric | yes | Retrieval weight |
| confidence | numeric | yes | Belief confidence |
| persistence | numeric | yes | Resistance to decay |
| accessibility | numeric | yes | Recall ease |
| occurred_at | timestamptz | yes | Event time |
| last_recalled_at | timestamptz | no | Last use |
| expires_at | timestamptz | no | Optional decay end |
| source_event_id | uuid | no | Domain/world event |
| semantic_document_id | uuid | no | Semantic indexing link |
| created_at | timestamptz | yes | Creation timestamp |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Concurrency version |

---

## 21. Memory Importance and Decay

Recommended normalized fields:

```text
importance
confidence
persistence
accessibility
```

Range:

```text
0.0–1.0
```

Memory retrieval score is derived, not stored as one permanent value.

Conceptual formula:

```text
relevance
× importance
× accessibility
× emotional similarity
× relationship relevance
× time decay
```

The exact formula belongs to the Memory/Context Engine.

---

## 22. Memory Archival

Memories may become:

```text
active
↓
faded
↓
archived
```

Do not hard-delete significant memories merely because they are not currently recalled.

Low-value transient memories may be compacted or summarized according to retention policy.

---

## 23. Routine Model

NPC routines represent expected background behavior.

Examples:

- sleep at home;
- work in a shop;
- visit a harbor;
- attend a festival;
- care for an animal;
- patrol a village.

Routines are plans, not guaranteed events.

---

## 24. Character Routines Table

### `character_routines`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Routine identifier |
| character_id | uuid | yes | Owning character |
| title | text | yes | Routine label |
| routine_type | text / enum | yes | daily, weekly, seasonal, conditional |
| schedule_profile | jsonb | yes | Time/calendar rules |
| target_location_id | uuid | no | Expected location |
| activity_type | text | yes | Activity key |
| priority | numeric | yes | Routine priority |
| flexibility | numeric | yes | Ability to deviate |
| enabled | boolean | yes | Operational state |
| valid_from | timestamptz | no | Start time |
| valid_until | timestamptz | no | End time |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Update timestamp |
| version | integer | yes | Concurrency version |

---

## 25. Routine Execution History

### `character_routine_executions`

Append-only operational table.

Fields:

- id
- routine_id
- character_id
- scheduled_for
- started_at
- completed_at
- outcome
- resulting_location_id
- interruption_reason
- source_event_id
- created_at

This table supports simulation diagnostics and story consistency.

---

## 26. Time Sensitivity Profile

Each character has a time-sensitivity profile that determines how much elapsed time should affect it.

Example dimensions:

```text
hunger
fatigue
injury
loneliness
goal_urgency
relationship_decay
routine_dependence
environment_sensitivity
```

Recommended table:

### `character_time_profiles`

Fields:

- character_id
- schema_version
- sensitivity_vector
- simulation_decay_rate
- freeze_tolerance
- last_evaluated_at
- updated_at
- version

---

## 27. Time Progression Rules

Examples:

- an uninjured fox far from the story may receive almost no update;
- an injured fox may require time-sensitive healing or worsening;
- a character waiting for a promise may accumulate disappointment;
- an unrelated distant NPC may be skipped;
- a high-priority companion may receive richer simulation.

The persistence layer stores sensitivity and cursors.

The simulation engine decides whether to evaluate the character.

---

## 28. Character State Effects

Temporary or persistent state effects include:

- injured;
- tired;
- unable_to_speak;
- frightened;
- inspired;
- cursed;
- protected;
- traveling.

Recommended table:

### `character_state_effects`

Fields:

- id
- character_id
- effect_type
- severity
- source_type
- source_id
- starts_at
- expires_at
- persistent
- state_payload
- created_at
- updated_at
- version

Active effects are queried with a partial index.

---

## 29. Character Inventory Relationship

Characters may own or carry items through the Inventory domain.

The Character schema must not duplicate item ownership.

References are resolved through:

- inventories;
- inventory entries;
- item instances.

Character records may hold an optional default inventory reference only if approved by the Inventory Schema.

---

## 30. Story Participation

Character participation in stories is modeled outside the core character table.

Recommended relation:

### `story_session_characters`

Fields:

- story_session_id
- character_id
- participation_role
- joined_at
- left_at
- state_snapshot
- version

This keeps session-specific state separate from persistent character state.

---

## 31. Current State Summary

The character core row should contain only high-value summary pointers and control fields.

Detailed state belongs to specialized tables.

Do not add one large `character_state` JSONB containing:

- traits;
- emotions;
- goals;
- memories;
- relationships;
- inventory;
- routines.

That pattern is prohibited.

---

## 32. Index Strategy

### `characters`

Recommended indexes:

```text
(world_id, lifecycle_status)
(world_id, current_location_id)
(world_id, narrative_importance DESC)
(world_id, simulation_priority DESC)
(child_profile_id)
(last_simulated_at)
```

### `character_traits`

```text
(character_id)
(trait_key, current_value)
```

### `character_goals`

```text
(character_id, status, priority DESC)
(target_character_id)
(target_location_id)
(due_at)
```

### `character_relationships`

```text
(source_character_id)
(target_character_id)
(world_id, relationship_type)
```

### `character_memories`

```text
(character_id, occurred_at DESC)
(character_id, importance DESC)
(subject_type, subject_id)
(source_event_id)
```

### `character_routines`

```text
(character_id, enabled)
(target_location_id)
```

### `character_state_effects`

Partial index:

```text
(character_id, effect_type)
WHERE expires_at IS NULL OR expires_at > now()
```

---

## 33. Constraints

Required constraints:

- normalized vector values remain in range;
- source and target characters differ;
- relationship characters belong to the same world;
- goal progress remains between 0 and 1;
- active effects have valid time ranges;
- current location belongs to character world;
- child-linked character belongs to child-owned world;
- one current emotion state per character;
- one time profile per character;
- one influence profile per character;
- one trait row per trait key.

---

## 34. Deletion and Archive Policy

Character lifecycle:

```text
draft
↓
active
↓
inactive / missing
↓
archived
```

Rules:

- direct deletion is prohibited for story-referenced characters;
- memories and relationship history remain;
- archived characters may still appear in historical stories;
- active routines and goals are closed or archived;
- child-linked character data follows child retention policy.

---

## 35. Repository Responsibilities

Recommended `CharacterRepository` operations:

```text
createCharacter
findById
findWorldCharacter
listCharactersAtLocation
updateLocation
updateAvailability
saveTraits
saveEmotionState
saveGoals
applyStateEffect
archiveCharacter
updateWithExpectedVersion
```

Separate repositories or services may be used for:

- MemoryRepository
- RelationshipRepository
- CharacterRoutineRepository

These remain within the Character bounded context.

---

## 36. Query Services

Recommended read queries:

```text
getCharacterProfile
getCharacterContext
listRelevantCharactersForScene
listCharacterRelationships
getCharacterEmotionalSummary
getActiveCharacterGoals
getRelevantCharacterMemories
getCharacterSimulationCandidates
```

Context queries must apply strict relevance limits.

---

## 37. Transaction Boundaries

### Character Interaction

```text
load characters
update relationships
update emotions
create memories
apply trait deltas
write domain events
write outbox messages
commit
```

### Character Movement

```text
validate destination
update current location
update routine execution
update session participation if needed
write event
commit
```

### Goal Resolution

```text
lock or version-check goal
update progress/status
update emotion state
create memory
write event
commit
```

---

## 38. Concurrency

Optimistic concurrency is required for:

- character core state;
- emotion state;
- goals;
- relationships;
- routines.

Critical relationship or goal transitions may use row locks where concurrent updates are likely.

Append-only histories do not require in-place version updates.

---

## 39. Domain Events

Suggested events:

```text
CharacterCreated
CharacterActivated
CharacterMoved
CharacterBecameUnavailable
CharacterTraitChanged
CharacterEmotionChanged
CharacterGoalCreated
CharacterGoalProgressed
CharacterGoalAchieved
CharacterRelationshipChanged
CharacterMemoryCreated
CharacterStateEffectApplied
CharacterRoutineInterrupted
CharacterArchived
```

---

## 40. Semantic Integration

Selected memories, summaries and character profiles may be indexed semantically.

Rules:

- relational state remains authoritative;
- embedding records reference memory or profile source;
- semantic retrieval never mutates character state;
- memory archive does not automatically delete embeddings without lifecycle coordination;
- embedding profile version is tracked separately.

---

## 41. Security and Child Safety

- parent-visible summaries must avoid exposing internal system reasoning;
- sensitive child-linked character data is access-scoped;
- character memory text must not store prohibited private inference;
- administrative access is audited;
- safety settings from Child Profile constrain story usage, not character persistence ownership.

---

## 42. Test Requirements

Required integration tests:

- create character in owned world;
- reject cross-world location;
- enforce unique world slug;
- save normalized traits;
- update emotion state with version check;
- create directional relationship;
- reject self-relationship;
- create and archive memory;
- goal progress and completion constraints;
- routine schedule validation;
- active state effect query;
- optimistic concurrency conflict;
- atomic interaction transaction;
- event and outbox atomicity;
- archive preserving historical references.

---

## 43. Acceptance Criteria

The Character Schema is accepted when:

1. Characters are scoped to one world.
2. Traits are multi-dimensional.
3. Emotions are multi-dimensional.
4. Relationships are directional.
5. Goals support priority, urgency and progress.
6. Memories support importance, confidence and decay.
7. Routines support autonomous background behavior.
8. Time-sensitivity supports selective simulation.
9. Influence can be represented as a vector.
10. Temporary and persistent effects can be stored.
11. Historical state remains queryable.
12. Core updates support optimistic concurrency.
13. Context retrieval can avoid full character hydration.
14. Events and outbox commit atomically.
15. Child-linked characters obey ownership rules.

---

## 44. Decisions Finalized

1. `Character` is an aggregate root.
2. Every character belongs to one world.
3. Traits are stored as normalized dimensions.
4. Emotion is a vector, not one scalar.
5. Relationships are directional.
6. Influence is multi-dimensional.
7. Memories are selective summaries, not transcripts.
8. Goals are persistent prioritized entities.
9. Routines are plans that may be interrupted.
10. Time sensitivity controls simulation depth.
11. High-volume histories are append-only.
12. Core character state is not stored in one giant JSONB document.
13. Current state and historical state are separated.
14. Optimistic concurrency is mandatory.
15. Archived characters remain valid in historical stories.
16. Semantic embeddings are secondary representations.
17. Story-session character state is separated from persistent character state.
18. Domain events record meaningful changes.
19. Cross-world ownership changes are prohibited.
20. Full character hydration is not required for normal queries.

---

## 45. Next Artifact

**Story Schema v1**

The next document will define:

- story definition;
- story versions;
- scenes;
- choice points;
- choice options;
- story sessions;
- session participants;
- choice commits;
- checkpoints;
- story lifecycle;
- immutable publication rules.
