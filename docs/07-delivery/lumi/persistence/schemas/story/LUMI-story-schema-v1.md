
# Project LUMI — Story Schema v1

- **Document Type:** Persistence Schema Specification
- **Status:** Accepted
- **Date:** 2026-07-25
- **Phase:** Persistence Implementation
- **Depends On:** Shared Database Types v1, Child Profile Schema v1, World Schema v1, Character Schema v1

---

## 1. Purpose

This document defines the persistent PostgreSQL model for stories, story versions, scenes, choices, sessions and checkpoints in Project LUMI.

The schema must support:

- static stories;
- interactive stories;
- branching choices;
- continuing stories;
- persistent world consequences;
- session resume;
- immutable published versions;
- character participation;
- item and location continuity;
- reflection questions;
- story generation metadata;
- safe replay and auditability.

---

## 2. Domain Separation

The Story bounded context is divided into two layers:

### Story Definition Layer

Stores authored or generated story structures:

- story definitions;
- story versions;
- scenes;
- scene transitions;
- choice points;
- choice options;
- reflection prompts;
- publication state.

### Story Execution Layer

Stores one child’s live experience:

- story sessions;
- session participants;
- current scene;
- committed choices;
- checkpoints;
- generated outputs;
- resulting world changes.

Definitions are reusable.

Sessions are child- and world-specific.

---

## 3. Story Aggregate

`StoryDefinition` is the aggregate root for reusable story content.

`StorySession` is a separate aggregate root for runtime execution.

This separation prevents live sessions from mutating published story definitions.

---

## 4. Story Definitions Table

### `story_definitions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Story definition identifier |
| world_id | uuid | no | Optional source world |
| created_for_child_profile_id | uuid | no | Optional originating child |
| title | text | yes | Story title |
| slug | text | yes | Stable identifier |
| story_type | text / enum | yes | static, interactive, continuing, event |
| source_type | text / enum | yes | generated, authored, imported, adapted |
| theme | text | no | Main theme |
| summary | text | no | Short description |
| age_group | text / enum | yes | Intended age range |
| default_language | text | yes | Primary language |
| lifecycle_status | text / enum | yes | draft, review, published, retired, archived |
| current_draft_version_id | uuid | no | Current editable version |
| current_published_version_id | uuid | no | Current published version |
| created_by | uuid | no | Actor or system principal |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Last update |
| archived_at | timestamptz | no | Archive timestamp |
| version | integer | yes | Optimistic concurrency version |

Recommended uniqueness:

```text
UNIQUE (created_for_child_profile_id, slug)
```

For globally reusable templates, a separate namespace should be used.

---

## 5. Story Types

Recommended values:

```text
static
interactive
continuing
world_event
educational
reflection
```

### Static

- linear;
- no child decision required;
- may still generate reflection prompts.

### Interactive

- contains choice points;
- branching may alter scene progression or world state.

### Continuing

- begins from prior story/session consequences;
- must reference continuity sources.

### World Event

- generated from current world state;
- may remain available only during a limited time window.

---

## 6. Story Versions Table

### `story_versions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Version identifier |
| story_definition_id | uuid | yes | Parent definition |
| version_number | integer | yes | Monotonic version |
| publication_status | text / enum | yes | draft, frozen, published, retired |
| schema_version | integer | yes | Story structure schema |
| title | text | yes | Version-specific title |
| summary | text | no | Version summary |
| generation_profile | jsonb | no | LLM/model configuration |
| safety_profile_snapshot | jsonb | no | Safety configuration at generation |
| continuity_context_snapshot | jsonb | no | Source continuity summary |
| estimated_duration_minutes | integer | no | Runtime estimate |
| estimated_scene_count | integer | no | Scene estimate |
| content_hash | text | yes | Integrity hash |
| created_by | uuid | no | Actor or system |
| created_at | timestamptz | yes | Creation timestamp |
| frozen_at | timestamptz | no | Freeze timestamp |
| published_at | timestamptz | no | Publication timestamp |
| retired_at | timestamptz | no | Retirement timestamp |

Unique constraint:

```text
UNIQUE (story_definition_id, version_number)
```

---

## 7. Immutable Publication Rule

Published story versions are immutable.

After publication:

- scenes cannot be edited;
- choices cannot be changed;
- prompts cannot be replaced;
- transition rules cannot be modified;
- content hash cannot change.

Corrections require a new story version.

Only lifecycle metadata such as retirement timestamp may change.

Database and repository logic must reject content mutation on published versions.

---

## 8. Story Scenes Table

### `story_scenes`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Scene identifier |
| story_version_id | uuid | yes | Owning story version |
| scene_key | text | yes | Stable version-local key |
| sequence_number | integer | no | Default linear order |
| scene_type | text / enum | yes | narrative, choice, transition, ending, reflection |
| title | text | no | Optional scene title |
| narrative_text | text | yes | Main content |
| narration_markup | jsonb | no | TTS/SFX/ambience tags |
| image_prompt | text | no | Scene illustration prompt |
| location_id | uuid | no | Referenced world location |
| duration_estimate_seconds | integer | no | Reading estimate |
| is_entry_scene | boolean | yes | Entry marker |
| is_terminal_scene | boolean | yes | Ending marker |
| metadata | jsonb | no | Versioned dynamic metadata |
| created_at | timestamptz | yes | Creation timestamp |

Unique constraints:

```text
UNIQUE (story_version_id, scene_key)
```

Only one entry scene per story version.

---

## 9. Scene Types

Recommended values:

```text
narrative
choice
transition
challenge
ending
reflection
system
```

A scene may be narrative and still end with a choice point.

`scene_type` describes the scene’s primary responsibility.

---

## 10. Scene Transitions Table

### `story_scene_transitions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Transition identifier |
| story_version_id | uuid | yes | Story version |
| from_scene_id | uuid | yes | Source scene |
| to_scene_id | uuid | yes | Destination scene |
| transition_type | text / enum | yes | automatic, conditional, choice, fallback |
| condition_expression | jsonb | no | Versioned rule expression |
| priority | integer | yes | Resolution order |
| created_at | timestamptz | yes | Creation timestamp |

Rules:

- both scenes must belong to the same version;
- self-transition requires explicit approval;
- fallback transitions must be unique per source scene;
- cycles are allowed only where story design explicitly supports them.

---

## 11. Choice Points Table

### `story_choice_points`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Choice point identifier |
| story_version_id | uuid | yes | Story version |
| scene_id | uuid | yes | Scene containing the choice |
| choice_key | text | yes | Stable version-local key |
| prompt | text | yes | Child-facing choice question |
| hint_text | text | no | Optional consequence hint |
| selection_mode | text / enum | yes | single, multiple, ranked |
| minimum_selections | integer | yes | Minimum choices |
| maximum_selections | integer | yes | Maximum choices |
| timeout_seconds | integer | no | Optional timed choice |
| default_option_id | uuid | no | Optional fallback |
| required | boolean | yes | Whether session may continue without selection |
| created_at | timestamptz | yes | Creation timestamp |

Unique constraint:

```text
UNIQUE (story_version_id, choice_key)
```

---

## 12. Choice Options Table

### `story_choice_options`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Option identifier |
| choice_point_id | uuid | yes | Parent choice point |
| option_key | text | yes | Stable local key |
| label | text | yes | Child-facing option |
| description | text | no | Additional explanation |
| consequence_hint | text | no | Safe preview of possible consequence |
| next_scene_id | uuid | no | Direct destination |
| consequence_payload | jsonb | no | Versioned consequence specification |
| utility_tags | jsonb | no | Decision-engine metadata |
| display_order | integer | yes | Presentation order |
| enabled | boolean | yes | Option availability |
| created_at | timestamptz | yes | Creation timestamp |

Unique constraint:

```text
UNIQUE (choice_point_id, option_key)
```

---

## 13. Choice Consequence Model

A choice may affect:

- next scene;
- world state;
- location access;
- character emotion;
- character relationship;
- traits;
- goals;
- inventory;
- memory creation;
- future story eligibility.

`consequence_payload` is a declarative specification, not arbitrary executable code.

It must be:

- schema-versioned;
- validated;
- auditable;
- processed by approved application services.

Direct SQL or code execution from stored JSON is prohibited.

---

## 14. Story Participants Definition

Optional story-level participant requirements are stored separately.

### `story_character_requirements`

Fields:

- story_version_id
- role_key
- character_type
- minimum_count
- maximum_count
- required_traits
- required_relationships
- optional
- created_at

This allows a story to require, for example:

- one child avatar;
- one companion;
- one guide;
- one misunderstood creature.

---

## 15. Reflection Prompts Table

### `story_reflection_prompts`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Prompt identifier |
| story_version_id | uuid | yes | Story version |
| scene_id | uuid | no | Optional scene link |
| prompt_type | text / enum | yes | comprehension, emotion, ethics, imagination |
| prompt_text | text | yes | Child-facing question |
| age_group | text / enum | yes | Intended age range |
| expected_format | text / enum | yes | free_text, multiple_choice, voice |
| display_order | integer | yes | Presentation order |
| metadata | jsonb | no | Dynamic settings |
| created_at | timestamptz | yes | Creation timestamp |

---

## 16. Story Session Aggregate

`StorySession` represents one child’s execution of one immutable story version.

The session owns:

- current progression;
- participants;
- choices;
- checkpoint state;
- runtime status;
- continuity outcome;
- completion metadata.

---

## 17. Story Sessions Table

### `story_sessions`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Session identifier |
| child_profile_id | uuid | yes | Owning child profile |
| world_id | uuid | yes | Active world |
| story_definition_id | uuid | yes | Story definition |
| story_version_id | uuid | yes | Immutable story version |
| parent_session_id | uuid | no | Previous session for continuation |
| current_scene_id | uuid | no | Current scene |
| current_checkpoint_id | uuid | no | Latest checkpoint |
| session_status | text / enum | yes | created, active, paused, completed, abandoned, failed |
| playback_mode | text / enum | yes | reading, narrated, mixed |
| started_at | timestamptz | no | Start time |
| last_interacted_at | timestamptz | no | Last interaction |
| paused_at | timestamptz | no | Pause time |
| completed_at | timestamptz | no | Completion time |
| abandonment_reason | text | no | Optional reason |
| continuity_summary | jsonb | no | Resulting compact continuity state |
| created_at | timestamptz | yes | Creation timestamp |
| updated_at | timestamptz | yes | Last update |
| version | integer | yes | Optimistic concurrency version |

---

## 18. Session Ownership Rules

- a session belongs to one child profile;
- world must belong to the same child;
- story version is fixed after session start;
- current scene must belong to that story version;
- parent session must belong to the same child and world;
- active story pointer on child profile may reference only one active session.

---

## 19. Session Status Lifecycle

```text
created
↓
active
↔
paused
↓
completed
```

Alternative terminal states:

```text
abandoned
failed
```

Rules:

- completed sessions are immutable except for derived summaries;
- abandoned sessions may be resumed only by explicit workflow;
- failed sessions require retry or restart policy;
- active sessions update `last_interacted_at`.

---

## 20. Session Participants Table

### `story_session_characters`

| Column | Type | Required | Description |
|---|---|---:|---|
| story_session_id | uuid | yes | Session |
| character_id | uuid | yes | Participating character |
| participation_role | text / enum | yes | protagonist, companion, guide, antagonist, guest |
| joined_at | timestamptz | yes | Join time |
| left_at | timestamptz | no | Leave time |
| initial_state_snapshot | jsonb | no | Start-state snapshot |
| final_state_snapshot | jsonb | no | End-state snapshot |
| version | integer | yes | Concurrency version |

Primary key:

```text
(story_session_id, character_id)
```

---

## 21. Session Scene Visits Table

### `story_session_scene_visits`

Append-only progression history.

Fields:

- id
- story_session_id
- scene_id
- visit_sequence
- entered_at
- exited_at
- visit_reason
- generated_variant_id
- correlation_id
- created_at

This table preserves actual traversal, including loops and revisits.

---

## 22. Choice Commits Table

### `story_choice_commits`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Choice commit identifier |
| story_session_id | uuid | yes | Session |
| choice_point_id | uuid | yes | Choice point |
| selected_option_ids | uuid[] / relation | yes | Selected options |
| selected_by | text / enum | yes | child, parent, system, default |
| choice_context | jsonb | no | Context at decision time |
| consequence_result | jsonb | no | Applied result summary |
| committed_at | timestamptz | yes | Commit timestamp |
| correlation_id | uuid | no | Operation correlation |
| causation_id | uuid | no | Prior event or action |
| version | integer | yes | Concurrency version |

Recommended uniqueness:

```text
UNIQUE (story_session_id, choice_point_id)
```

unless repeated choices are explicitly supported.

---

## 23. Choice Selection Relation

For normalization, preferred table:

### `story_choice_commit_options`

Fields:

- choice_commit_id
- choice_option_id
- selection_order
- created_at

Primary key:

```text
(choice_commit_id, choice_option_id)
```

This is preferred over storing UUID arrays when relational filtering is required.

---

## 24. Commit Semantics

A choice commit must be atomic.

Transaction:

```text
validate session status
validate current scene
validate choice point
validate selected options
insert choice commit
insert selected option relations
apply consequences
update character/world/session state
create memories/events
advance current scene
write outbox messages
commit
```

A choice must never be recorded without its consequences, or vice versa.

---

## 25. Story Checkpoints Table

### `story_session_checkpoints`

| Column | Type | Required | Description |
|---|---|---:|---|
| id | uuid | yes | Checkpoint identifier |
| story_session_id | uuid | yes | Session |
| scene_id | uuid | yes | Current scene |
| checkpoint_type | text / enum | yes | automatic, manual, choice, chapter, recovery |
| schema_version | integer | yes | Payload schema |
| session_state | jsonb | yes | Compact runtime state |
| world_state_reference | uuid | no | Optional world checkpoint |
| sequence_number | integer | yes | Checkpoint order |
| created_at | timestamptz | yes | Creation timestamp |
| created_by | uuid | no | Actor or system |
| correlation_id | uuid | no | Operation correlation |

Unique constraint:

```text
UNIQUE (story_session_id, sequence_number)
```

---

## 26. Checkpoint Strategy

Checkpoints are compact recovery points.

They should include:

- current scene;
- selected continuity flags;
- active participants;
- temporary session variables;
- unresolved choice state;
- references to authoritative world/character versions.

They should not duplicate the entire world database.

Recommended triggers:

- session start;
- chapter boundary;
- after committed choice;
- before external generation;
- session pause;
- recovery-safe boundaries.

---

## 27. Generated Scene Variants

Some scenes may be generated or adapted at runtime.

### `story_generated_variants`

Fields:

- id
- story_session_id
- base_scene_id
- variant_type
- generation_profile
- input_context_hash
- generated_text
- narration_markup
- image_prompt
- safety_result
- content_hash
- created_at

Generated variants are immutable once presented to the child.

---

## 28. Story Continuity Links

### `story_continuity_links`

Fields:

- id
- source_story_session_id
- target_story_session_id
- link_type
- continuity_payload
- created_at

Possible link types:

```text
continuation
shared_character
shared_item
shared_location
consequence
memory
world_event
```

This supports future stories that reference prior experiences.

---

## 29. Story Outcomes

### `story_session_outcomes`

Fields:

- id
- story_session_id
- outcome_type
- subject_type
- subject_id
- outcome_payload
- persistence_scope
- applied_at
- source_choice_commit_id
- created_at

Possible scopes:

```text
session_only
character
world
child_profile
future_story
```

Outcomes provide an auditable record of persistent consequences.

---

## 30. Story Generation Jobs

Generation execution belongs to an operational table.

### `story_generation_jobs`

Fields:

- id
- child_profile_id
- world_id
- story_definition_id
- generation_type
- status
- model_provider
- model_name
- prompt_version
- request_payload
- response_metadata
- estimated_cost
- actual_cost
- started_at
- completed_at
- failed_at
- error_code
- correlation_id
- created_at
- version

Raw provider payload retention must follow privacy and cost policies.

---

## 31. Media Assets

Story-related media must reference the Media bounded context.

Recommended relation:

### `story_scene_assets`

Fields:

- story_scene_id
- media_asset_id
- asset_role
- display_order
- created_at

Asset roles:

```text
illustration
thumbnail
background
sound_effect
ambience
narration
```

The Story schema does not store binary media.

---

## 32. Narration and SFX Markup

Narration markup may include approved tags such as:

```text
[Orman ambiyansı]
[Dal kırılma]
[Duraklama]
[Fısıltıyla]
```

Markup is stored as versioned JSONB or structured token rows.

Free-form executable markup is prohibited.

The playback engine owns interpretation.

---

## 33. Story Publication Lifecycle

Story definition lifecycle:

```text
draft
↓
review
↓
published
↓
retired
↓
archived
```

Version lifecycle:

```text
draft
↓
frozen
↓
published
↓
retired
```

Rules:

- only frozen versions may be published;
- publication validates graph integrity;
- published version cannot be modified;
- retiring a version does not invalidate existing sessions;
- new sessions use the current published version unless explicitly pinned.

---

## 34. Graph Validation

Before freeze/publication, validate:

- exactly one entry scene;
- at least one reachable terminal scene;
- all transitions point to same-version scenes;
- every required choice has valid options;
- every enabled option has a valid destination or consequence;
- no orphan scenes unless explicitly allowed;
- no infinite path without escape where prohibited;
- reflection prompts reference valid scenes;
- participant requirements are satisfiable.

---

## 35. Index Strategy

### `story_definitions`

```text
(created_for_child_profile_id, lifecycle_status)
(world_id, lifecycle_status)
(current_published_version_id)
(updated_at DESC)
```

### `story_versions`

```text
(story_definition_id, version_number DESC)
(publication_status)
(published_at DESC)
```

### `story_scenes`

```text
(story_version_id, sequence_number)
(story_version_id, scene_type)
```

### `story_sessions`

```text
(child_profile_id, session_status)
(world_id, session_status)
(story_version_id)
(last_interacted_at DESC)
(parent_session_id)
```

### `story_choice_commits`

```text
(story_session_id, committed_at)
(choice_point_id)
```

### `story_session_checkpoints`

```text
(story_session_id, sequence_number DESC)
```

---

## 36. Constraints

Required constraints:

- one entry scene per story version;
- story version number positive;
- scene sequence numbers non-negative;
- selection minimum not greater than maximum;
- selected option belongs to selected choice point;
- current scene belongs to session story version;
- world and child ownership match;
- completed session has `completed_at`;
- published version has `published_at`;
- frozen/published version has content hash;
- terminal scene cannot require an automatic next scene unless explicitly modeled.

---

## 37. Archive and Retention

Story definitions use archive lifecycle.

Rules:

- published versions are never hard-deleted while referenced;
- completed sessions remain available for continuity;
- generated raw prompts/responses may have shorter retention;
- child-visible story text and outcomes follow child data policy;
- checkpoints may be compacted after completion;
- choice commits and persistent outcomes remain auditable.

---

## 38. Repository Responsibilities

Recommended `StoryDefinitionRepository` operations:

```text
createDefinition
createDraftVersion
saveSceneGraph
freezeVersion
publishVersion
retireVersion
findPublishedVersion
archiveDefinition
```

Recommended `StorySessionRepository` operations:

```text
createSession
startSession
findActiveSession
pauseSession
resumeSession
commitChoice
advanceScene
createCheckpoint
completeSession
abandonSession
updateWithExpectedVersion
```

---

## 39. Query Services

Recommended read queries:

```text
getStoryCatalog
getStoryDefinition
getPublishedStoryGraph
getSessionPlaybackState
getSessionHistory
getAvailableChoices
getStoryContinuitySummary
listCompletedStories
listContinuingStoryCandidates
getReflectionPrompts
```

---

## 40. Concurrency

Optimistic concurrency is mandatory for:

- story definition draft;
- story session;
- current checkpoint pointer;
- choice commit;
- session completion.

Choice commit processing may use row locking on the session.

Example:

```text
SELECT *
FROM story_sessions
WHERE id = :session_id
FOR UPDATE
```

This prevents double selection or duplicate scene advancement.

---

## 41. Domain Events

Suggested events:

```text
StoryDefinitionCreated
StoryVersionCreated
StoryVersionFrozen
StoryVersionPublished
StoryVersionRetired
StorySessionCreated
StorySessionStarted
StorySceneEntered
StoryChoiceCommitted
StoryCheckpointCreated
StorySessionPaused
StorySessionResumed
StorySessionCompleted
StorySessionAbandoned
StoryOutcomeApplied
ReflectionResponseSubmitted
```

---

## 42. Outbox Integration

The same transaction that changes session state must also write relevant outbox messages.

Examples:

- generate next scene;
- create illustration;
- produce narration;
- apply delayed world consequence;
- update semantic memory;
- generate parent summary.

No external effect is considered committed before the database transaction succeeds.

---

## 43. Security and Safety

- story queries are child/parent ownership scoped;
- published content is safety-validated;
- runtime generated variants require safety validation before presentation;
- parent controls override story defaults;
- internal prompts and hidden reasoning are never exposed;
- choice consequences must respect age and safety settings;
- external model metadata is audited without storing unnecessary personal data.

---

## 44. Test Requirements

Required tests:

- create story definition and draft version;
- enforce version uniqueness;
- validate one entry scene;
- reject cross-version transition;
- freeze and publish valid graph;
- reject published content mutation;
- create session with matching child/world;
- reject foreign world session;
- start, pause and resume session;
- commit choice atomically;
- prevent duplicate choice commit;
- create and restore checkpoint;
- continue from parent session;
- complete session and persist outcomes;
- preserve published version after retirement;
- event and outbox atomicity;
- optimistic concurrency conflict;
- generated variant immutability.

---

## 45. Acceptance Criteria

The Story Schema is accepted when:

1. Story definitions and sessions are separate aggregates.
2. Published versions are immutable.
3. Scene graphs are validated before publication.
4. Static and interactive stories are supported.
5. Choice commits and consequences are atomic.
6. Sessions can pause and resume.
7. Checkpoints support recovery without duplicating the whole world.
8. Character participation is session-specific.
9. Continuing stories can reference previous sessions.
10. Persistent outcomes are auditable.
11. Generated variants are immutable after presentation.
12. Media is referenced through the Media context.
13. Current scene and story version integrity are enforced.
14. Child/world ownership is enforced.
15. Events and outbox messages commit atomically.

---

## 46. Decisions Finalized

1. `StoryDefinition` and `StorySession` are separate aggregate roots.
2. Story definitions are reusable; sessions are child-specific.
3. Published versions are immutable.
4. Corrections require a new version.
5. Story execution always pins one version.
6. Scene traversal history is append-only.
7. Choices are declarative, not executable code.
8. Choice commits and consequences are one transaction.
9. One committed choice per choice point is the default.
10. Checkpoints store compact recovery state.
11. Generated scene variants become immutable once shown.
12. Story outcomes have explicit persistence scope.
13. Continuing stories use continuity links.
14. Media binaries remain outside the Story schema.
15. Runtime generation requires safety validation.
16. Published versions may be retired without breaking sessions.
17. Completed sessions remain available for continuity.
18. Optimistic concurrency is mandatory.
19. Session row locking may prevent double progression.
20. Domain events and outbox are mandatory for persistent consequences.

---

## 47. Next Artifact

**Inventory and Item Schema v1**

The next document will define:

- item definitions;
- item instances;
- inventories;
- ownership and custody;
- durability;
- item state;
- story acquisition;
- item transfer;
- persistent item consequences;
- unique and generated items.
