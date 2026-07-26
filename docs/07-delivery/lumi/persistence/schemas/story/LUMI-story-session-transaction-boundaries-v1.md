# Project LUMI — Story Session Transaction Boundaries v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** ADR-001, Database Domain Map, Conceptual ERD v1, Logical Data Model v1, PK/FK & Ownership Model v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the transaction boundaries for interactive story sessions in Project LUMI.

It establishes:

- the story session aggregate;
- atomic write operations;
- choice commit behavior;
- inventory, memory, emotion and relationship updates;
- domain event and outbox creation;
- idempotency and retry rules;
- optimistic concurrency;
- rollback behavior;
- asynchronous post-commit work;
- consistency boundaries between story state and shared world state.

---

## 2. Core Transaction Principle

A committed child choice must never leave the system in a partially applied state.

The following must either all succeed together or all fail together:

- choice selection;
- story session progression;
- immediate inventory changes;
- immediate relationship changes;
- immediate trait or emotion changes;
- memory creation;
- domain event creation;
- outbox registration.

This is the principal transactional rule of the story engine.

---

## 3. Story Session Aggregate

The core aggregate root is:

```text
story_sessions
```

The aggregate directly controls:

- current scene;
- current chapter;
- current session status;
- bounded session state;
- last activity time;
- optimistic concurrency version.

Closely related records:

- `story_participants`
- `choice_selections`
- `story_outputs`
- `story_session_state_history`

Not every related table belongs to the same aggregate.

For example:

- `inventories`
- `memories`
- `character_relationships`
- `world_events`

are separate aggregates that may participate in the same transaction.

---

## 4. Transaction Types

LUMI defines the following story-related transaction types:

1. Start Story Session
2. Resume Story Session
3. Commit Choice
4. Advance Scene Without Choice
5. Apply Immediate Consequences
6. Complete Story Session
7. Abandon Story Session
8. Generate Continuation Request
9. Apply Delayed Consequence
10. Repair or Reconcile Failed State

---

## 5. Start Story Session Transaction

### Inputs

- child profile;
- story version;
- selected playable character;
- optional companion characters;
- optional starting inventory items;
- optional starting location.

### Atomic Writes

```text
story_sessions
story_participants
optional inventory initialization
optional initial memory records
domain_events
outbox_messages
```

### Required Validations

- child profile is active;
- story version is published and accessible;
- selected characters belong to the child or are allowed NPCs;
- selected story version is compatible with age and parental controls;
- starting location belongs to the target world;
- duplicate start request is blocked by idempotency key.

### Result

The session enters:

```text
in_progress
```

with:

- current scene assigned;
- session version set to 1;
- initial participants registered.

---

## 6. Resume Story Session Transaction

Resume usually does not need a state-changing transaction unless it updates:

- `last_activity_at`;
- resume token;
- temporary lock;
- session status from `paused` to `in_progress`.

### Atomic Writes

```text
story_sessions
optional domain_events
```

### Rule

Resuming a session must not automatically advance world state or reapply consequences.

---

## 7. Commit Choice Transaction

This is the most critical transaction boundary in LUMI.

## 7.1 Inputs

- story session ID;
- choice point ID;
- selected choice option ID;
- expected session version;
- idempotency key;
- selecting child profile ID;
- optional client context.

## 7.2 Pre-Transaction Validation

Before opening the transaction, the service may perform non-authoritative checks:

- request format;
- session existence;
- option existence;
- parental rule compatibility;
- content schema validation.

Authoritative validation must still occur inside the transaction.

## 7.3 In-Transaction Lock

Recommended pattern:

```sql
SELECT *
FROM story_sessions
WHERE id = :session_id
FOR UPDATE;
```

or optimistic update using:

```text
version = expected_version
```

The final implementation may use both:

- pessimistic lock for choice commit;
- optimistic version for API conflict detection.

## 7.4 In-Transaction Validations

The transaction must verify:

1. session belongs to selecting child profile;
2. session status is `in_progress`;
3. current scene contains the choice point;
4. selected option belongs to the choice point;
5. no committed selection already exists;
6. requirements are still satisfied;
7. required item is still in inventory;
8. expected version matches current version;
9. session has not already advanced;
10. idempotency key is not used for a conflicting request.

## 7.5 Atomic Writes

The following are written in the same PostgreSQL transaction:

```text
choice_selections
story_sessions
story_session_state_history
inventory_entries
item_transfers
character_relationships
character_traits
trait_adjustments
emotional_states
emotion_history
memories
memory link tables
world_events where immediate
domain_events
outbox_messages
```

Not every transaction touches every table.

Only applicable consequences are written.

## 7.6 Commit Order

Recommended logical order:

1. lock session;
2. validate ownership and version;
3. insert choice selection;
4. compute immediate consequence set;
5. apply inventory mutations;
6. apply character and relationship mutations;
7. create memories;
8. update emotional state;
9. advance current scene;
10. increment session version;
11. append domain events;
12. insert outbox messages;
13. commit.

---

## 8. Choice Selection Idempotency

The same request may be retried due to:

- client timeout;
- network interruption;
- application restart;
- queue retry.

Required uniqueness:

```text
UNIQUE (story_session_id, choice_point_id)
```

and preferably:

```text
UNIQUE (story_session_id, idempotency_key)
```

### Retry Behavior

If the same idempotency key is received with the same payload:

- return the original committed result;
- do not apply consequences again.

If the same key is received with a different payload:

- reject as idempotency conflict.

---

## 9. Inventory Changes in Story Transactions

Immediate inventory effects may include:

- acquire item;
- consume item;
- transfer item;
- equip item;
- damage item;
- unlock item capability.

### Required Atomicity

For a consume-and-advance action:

```text
decrement inventory
insert transfer/usage history
advance story
record selection
```

must all succeed together.

### Rule

Story progression must not succeed if required item mutation fails.

---

## 10. Relationship Updates

A choice may update directional relationship dimensions.

Example:

```text
source: Lina
target: Fox
trust +5
fear -2
```

### Transaction Rule

Immediate relationship changes belong in the choice commit transaction.

Delayed or reflective changes may be scheduled separately through delayed effects.

### Concurrency

Relationship rows use version-based updates or row locks when multiple actors may update the same edge.

---

## 11. Trait Updates

Small persistent trait adjustments may be produced by choices.

Example:

- courage +0.01;
- helpfulness -0.005.

### Atomic Writes

```text
character_traits
trait_adjustments
```

The current value and historical delta must be written together.

### Rule

Trait adjustment is bounded by configured minimum and maximum values.

---

## 12. Emotional State Updates

Immediate emotional effects include:

- joy increase;
- fear decrease;
- curiosity increase;
- sadness persistence.

### Atomic Writes

```text
emotional_states
emotion_history
```

The current emotional state and history record must remain consistent.

---

## 13. Memory Creation

A committed choice may create memories for:

- playable character;
- companion;
- nearby NPC;
- witness character.

### Memory Transaction Rule

Memories directly caused by the committed choice are created in the same transaction.

Optional later processing may generate:

- summaries;
- embeddings;
- importance recalculation;
- memory consolidation.

These post-processing steps are asynchronous and outside the main transaction.

---

## 14. Story Session Progression

The session progression update may include:

```text
current_scene_id
session_state_jsonb
status
last_activity_at
completed_at
version
```

### Rule

Only one authoritative current scene exists.

The current scene must never be advanced before the choice selection is safely recorded.

---

## 15. Immediate World Event Creation

Some choices may create an immediate shared world event.

Example:

```text
The child opens the old dam gate.
```

If the event is an immediate authoritative consequence, these must be written together:

```text
world_events
event_participants
domain_events
outbox_messages
```

If the event requires expensive simulation or AI generation, only a scheduled effect or job is created inside the transaction.

---

## 16. Domain Event and Outbox Rule

Every meaningful committed state change produces one or more domain events.

Examples:

```text
story.choice_committed
story.scene_advanced
inventory.item_acquired
character.memory_created
character.relationship_changed
story.session_completed
```

For events requiring asynchronous handling:

```text
domain_events
outbox_messages
```

must be written in the same transaction as the state change.

This prevents:

- state committed but event lost;
- event published but state rolled back.

---

## 17. Work Outside the Main Transaction

The following must not run inside the choice commit transaction:

- image generation;
- TTS generation;
- long LLM generation;
- embedding generation;
- analytics aggregation;
- notification delivery;
- object storage upload;
- heavy simulation;
- recommendation recalculation.

Instead, the transaction writes:

```text
domain event
outbox message
job request
```

The worker processes them after commit.

---

## 18. Transaction Duration Rule

Critical user-facing transactions should remain short.

Target:

```text
normally below 500 ms database time
```

This is a design target, not a hard SLA.

Long-running external API calls are prohibited inside database transactions.

---

## 19. Optimistic Concurrency

The client sends:

```text
expected_version
```

The update uses:

```sql
UPDATE story_sessions
SET
    current_scene_id = :next_scene,
    version = version + 1,
    updated_at = now()
WHERE id = :session_id
  AND version = :expected_version;
```

If zero rows are updated:

- session changed elsewhere;
- request returns concurrency conflict;
- client reloads current session state.

---

## 20. Pessimistic Locking

Use row-level lock for high-risk transaction paths:

```sql
SELECT ...
FOR UPDATE
```

Recommended for:

- committing a choice;
- transferring a unique item;
- completing a session;
- applying a delayed effect.

Avoid locking large result sets or entire world aggregates.

---

## 21. Deadlock Prevention

Recommended lock order:

1. story session;
2. inventories ordered by ID;
3. character relationships ordered by source/target ID;
4. character state rows ordered by character ID;
5. world event rows;
6. outbox rows.

All services must use the same lock order.

Retry deadlock failures with bounded retries.

---

## 22. Retry Policy

Database retry is allowed for:

- serialization failures;
- deadlocks;
- transient connection errors.

Recommended policy:

```text
maximum 3 retries
exponential backoff
same idempotency key
```

Do not blindly retry:

- validation failures;
- ownership violations;
- insufficient inventory;
- incompatible session version;
- duplicate conflicting selection.

---

## 23. Rollback Behavior

If any mandatory consequence fails:

- selection is not committed;
- session does not advance;
- inventory does not change;
- memory is not created;
- event is not emitted;
- outbox message is not inserted.

The user receives a recoverable failure response.

No partial success is allowed for immediate consequences.

---

## 24. Partial Consequences

Partial consequence behavior is only allowed when explicitly modeled.

Example:

```text
mandatory effects
optional effects
best-effort effects
```

### Mandatory

Failure rolls back transaction.

### Optional

Failure may be recorded and skipped.

### Best-effort

Must run asynchronously after commit.

Default consequence class is mandatory.

---

## 25. Complete Story Session Transaction

Completion must atomically:

```text
set session status = completed
set completed_at
persist final session state
create completion memory
apply final inventory rewards
apply final trait/emotion changes
append completion domain event
insert outbox messages
```

Optional image, audio, certificate or social-card generation occurs after commit.

---

## 26. Abandon Story Session Transaction

Abandoning a session must:

```text
set status = abandoned
set last_activity_at
record abandonment reason
append domain event
```

Already committed choices and consequences remain intact.

Abandonment does not roll back story history.

---

## 27. Delayed Consequence Transaction

A delayed effect worker must:

1. lock delayed effect;
2. verify status is eligible;
3. validate target state;
4. apply effect;
5. create history;
6. append domain event;
7. mark effect applied;
8. commit.

Idempotency is required.

A delayed effect cannot be applied twice.

---

## 28. Story Generation Transaction Boundary

AI story generation uses a multi-step workflow:

### Transaction A — Create Request

```text
generation_requests
outbox/job
```

### External Processing

```text
LLM call
validation
moderation
cost capture
```

### Transaction B — Save Result

```text
generation_runs
generation_outputs
generation_cost_records
```

### Transaction C — Publish Story Version

```text
story_versions
story_chapters
story_scenes
choice_points
choice_options
domain_events
```

Generated content must not become session-visible before validation and publication.

---

## 29. Session State JSONB Boundary

`story_sessions.session_state_jsonb` may contain bounded transient state such as:

- current local puzzle state;
- presentation flags;
- temporary narrative variables;
- selected visual theme;
- short-lived branch context.

It must not be the only authoritative location for:

- inventory;
- relationships;
- memories;
- current story version;
- committed choices;
- current owner;
- world event state.

---

## 30. Shared World vs Private Story Transaction

A story choice may affect:

### Private state

- child session;
- child-owned character memory;
- private inventory;
- private emotional response.

### Shared state

- world event;
- NPC relationship;
- location state;
- settlement state.

Both may be committed in one transaction if immediate and lightweight.

Heavy shared simulation is scheduled post-commit.

---

## 31. Consistency Levels

### Strong consistency required

- session current scene;
- committed choice;
- item ownership;
- immediate consequence;
- current emotional state;
- relationship mutation;
- domain event creation;
- outbox insertion.

### Eventual consistency allowed

- embeddings;
- thumbnails;
- audio;
- analytics;
- recommendations;
- summaries;
- graph projections;
- world-news feed projection.

---

## 32. Audit Requirements

Critical story transactions must record:

- actor;
- child profile;
- session;
- idempotency key;
- request ID;
- correlation ID;
- previous session version;
- new session version;
- result status.

Sensitive content should be minimized in audit logs.

---

## 33. Error Categories

Canonical error categories:

```text
SESSION_NOT_FOUND
SESSION_NOT_ACTIVE
SESSION_VERSION_CONFLICT
CHOICE_POINT_NOT_CURRENT
OPTION_NOT_AVAILABLE
CHOICE_ALREADY_COMMITTED
REQUIREMENT_NOT_MET
ITEM_NOT_AVAILABLE
OWNERSHIP_VIOLATION
WORLD_SCOPE_VIOLATION
IDEMPOTENCY_CONFLICT
CONSEQUENCE_EXECUTION_FAILED
TRANSACTION_RETRY_EXHAUSTED
```

---

## 34. Example Choice Commit Pseudocode

```text
begin transaction

lock story_session

validate ownership
validate status
validate expected version
validate current choice point
validate option
validate idempotency

insert choice_selection

apply inventory consequences
apply relationship consequences
apply trait consequences
apply emotion consequences
create memories
create immediate world events

advance story_session
increment version

append domain_events
insert outbox_messages

commit
```

---

## 35. Decisions Finalized

1. Choice commit is the main story transaction boundary.
2. Selection and all mandatory immediate consequences commit atomically.
3. External AI and media calls never run inside database transactions.
4. Domain events and outbox rows are written with state changes.
5. Story sessions use optimistic concurrency.
6. High-risk operations may also use row-level locks.
7. Idempotency is mandatory for choice commit and delayed effects.
8. Inventory changes and story advancement cannot diverge.
9. Current state and history rows are written together.
10. Generated content becomes active only after validation and publication.
11. Heavy simulation and embeddings are eventually consistent.
12. Shared world and private child effects may coexist in one short transaction.
13. Mandatory consequence failure causes full rollback.
14. Retry is bounded and uses the same idempotency key.
15. Completed history is never undone by session abandonment.

---

## 36. Next Artifact

**NPC Memory, Emotion, Goal and Decision Data Model v1**

The next document will define:

- memory lifecycle;
- memory importance and decay;
- emotion vectors;
- goal hierarchy;
- autonomous decisions;
- utility evaluation;
- trait adjustment;
- time sensitivity;
- relationships between memories, events and NPC behavior.
