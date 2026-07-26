# Project LUMI — Domain Event, Transactional Outbox and Integration Message Model v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** Database Domain Map, Logical Data Model v1, Story Session Transaction Boundaries v1, World Simulation Data Model v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the canonical model for:

- domain events;
- transactional outbox;
- integration messages;
- event naming;
- event payloads;
- schema versioning;
- consumer processing;
- idempotency;
- retries;
- dead-letter handling;
- event ordering;
- event retention;
- audit relationships;
- internal module integration.

The goal is to guarantee that meaningful state changes are reliably observable without adopting full event sourcing.

---

## 2. Core Architectural Decision

Project LUMI uses:

```text
State-Based Persistence
+
Append-Only Domain Events
+
Transactional Outbox
```

Project LUMI does **not** use full event sourcing.

Authoritative current state remains in normalized PostgreSQL tables.

Domain events record meaningful business changes.

Outbox messages provide reliable asynchronous delivery.

---

## 3. Event Categories

LUMI distinguishes four concepts:

1. Domain Event
2. Integration Message
3. World Event
4. Audit Record

### Domain Event

A technical business fact that has already occurred.

Example:

```text
story.choice_committed
inventory.item_acquired
character.memory_created
```

### Integration Message

A deliverable message derived from a domain event for another module or external worker.

Example:

```text
Generate story illustration
Create memory embedding
Build return summary
```

### World Event

An occurrence inside the fictional world.

Example:

```text
A storm damaged the bridge.
```

### Audit Record

A security or administrative record describing who performed an action.

These four concepts must not be merged into one table.

---

## 4. Domain Event Table

### Table: `domain_events`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
event_uuid UUID NOT NULL UNIQUE
event_name TEXT NOT NULL
event_version INTEGER NOT NULL
aggregate_type TEXT NOT NULL
aggregate_id UUID NOT NULL
aggregate_version INTEGER NULL
world_id UUID NULL
child_profile_id UUID NULL
story_session_id UUID NULL
actor_type TEXT NULL
actor_id UUID NULL
correlation_id UUID NOT NULL
causation_id UUID NULL
idempotency_key TEXT NULL
occurred_at TIMESTAMPTZ NOT NULL
occurred_world_time TIMESTAMPTZ NULL
payload_jsonb JSONB NOT NULL
metadata_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
```

### Characteristics

- append-only;
- immutable after commit;
- externally referenceable through `event_uuid`;
- locally ordered by bigint `id`;
- payload schema versioned;
- linked to an aggregate.

---

## 5. Event Naming Standard

Canonical format:

```text
<domain>.<entity_or_process>.<past_tense_action>
```

Examples:

```text
story.session.started
story.choice.committed
story.scene.advanced
story.session.completed

inventory.item.acquired
inventory.item.transferred
inventory.item.consumed

character.memory.created
character.emotion.changed
character.relationship.changed
character.goal.completed

world.event.created
world.event.resolved
world.clock.advanced

simulation.run.started
simulation.segment.completed
simulation.run.completed

generation.request.created
generation.run.completed
generation.output.accepted

media.asset.created
media.variant.generated
```

### Rules

- lower-case;
- dot-separated;
- past tense;
- describes a completed fact;
- no provider or transport detail in the name;
- no ambiguous generic names such as `updated`.

---

## 6. Event Payload Principle

Payloads contain enough information for consumers to react, but not a complete database dump.

Recommended payload shape:

```json
{
  "entity_id": "uuid",
  "previous_status": "in_progress",
  "new_status": "completed",
  "changed_fields": [
    "status",
    "completed_at"
  ]
}
```

### Include

- identifiers;
- meaningful state transition;
- required consumer context;
- stable business values;
- compact summary.

### Exclude

- secrets;
- credentials;
- private chain-of-thought;
- full child profile data;
- unnecessary story text;
- large binary content;
- entire aggregate snapshots by default.

---

## 7. Event Metadata

Recommended metadata:

```json
{
  "request_id": "uuid",
  "trace_id": "uuid",
  "source_module": "story",
  "application_version": "1.0.0",
  "schema_version": 1
}
```

Metadata is operational context.

Business facts remain in `payload_jsonb`.

---

## 8. Correlation and Causation

### Correlation ID

Groups all operations belonging to one workflow.

Example:

```text
Choice commit
-> inventory update
-> memory creation
-> image generation request
```

All related events share one `correlation_id`.

### Causation ID

Identifies the event or command that directly caused the current event.

Example:

```text
story.choice.committed
causes
character.memory.created
```

The second event stores the first event UUID as `causation_id`.

---

## 9. Aggregate Identity

Every domain event references an aggregate:

```text
aggregate_type
aggregate_id
aggregate_version
```

Examples:

```text
story_session
inventory
character
world
simulation_run
generation_request
```

### Rule

The aggregate reference identifies where the authoritative state belongs.

---

## 10. Event Versioning

Event schema changes use:

```text
event_name
event_version
```

Example:

```text
story.choice.committed v1
story.choice.committed v2
```

### Compatible Changes

May keep the same event version:

- adding optional metadata;
- adding optional nullable payload fields.

### Breaking Changes

Require a new version:

- renaming fields;
- changing field meaning;
- removing required fields;
- changing value type;
- changing identifier semantics.

---

## 11. Immutable Event Contract

After an event is committed:

- event name does not change;
- event version does not change;
- payload does not change;
- occurrence time does not change;
- aggregate reference does not change.

Corrections are represented by a new event.

Example:

```text
inventory.item.transfer_corrected
```

or a compensating business event.

---

## 12. Transactional Outbox Table

### Table: `outbox_messages`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
message_uuid UUID NOT NULL UNIQUE
domain_event_id BIGINT NOT NULL
event_uuid UUID NOT NULL
destination TEXT NOT NULL
message_type TEXT NOT NULL
message_version INTEGER NOT NULL
payload_jsonb JSONB NOT NULL
headers_jsonb JSONB NULL
status TEXT NOT NULL
priority INTEGER NOT NULL DEFAULT 0
available_at TIMESTAMPTZ NOT NULL
locked_at TIMESTAMPTZ NULL
locked_by TEXT NULL
attempt_count INTEGER NOT NULL DEFAULT 0
max_attempts INTEGER NOT NULL DEFAULT 10
last_error_code TEXT NULL
last_error_message TEXT NULL
published_at TIMESTAMPTZ NULL
dead_lettered_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

---

## 13. Outbox Statuses

Canonical values:

```text
pending
processing
published
retry_wait
dead_letter
cancelled
```

### State Flow

```text
pending
  -> processing
      -> published
      -> retry_wait
      -> dead_letter
```

---

## 14. Same-Transaction Rule

The authoritative state change, domain event and outbox message are written in the same PostgreSQL transaction.

Example:

```text
BEGIN

update inventory
insert item transfer
insert domain event
insert outbox message

COMMIT
```

### Guarantees

This prevents:

- state committed but message lost;
- message delivered but state rolled back.

---

## 15. Outbox Message Creation

Not every domain event requires an outbox message.

### Event Only

Use when the event exists for:

- history;
- debugging;
- local traceability;
- future projection.

### Event + Outbox

Use when asynchronous action is required:

- LLM generation;
- image generation;
- TTS;
- embedding;
- analytics projection;
- return summary;
- notification;
- background simulation;
- cache invalidation.

---

## 16. Destination Model

Canonical internal destinations:

```text
generation_worker
image_worker
tts_worker
embedding_worker
simulation_worker
analytics_worker
media_worker
notification_worker
projection_worker
```

The destination identifies the logical consumer, not a specific transport technology.

### Rule

Database schema must not depend on RabbitMQ, Kafka, Redis Streams or another transport.

---

## 17. Message Types

Integration message names describe requested work or deliverable notification.

Examples:

```text
generation.story.requested
generation.image.requested
generation.tts.requested
embedding.memory.requested
simulation.world_progression.requested
projection.world_news.refresh_requested
notification.parental_alert.requested
```

Domain event names describe facts.

Integration messages may describe commands or work requests.

---

## 18. Outbox Polling

Workers claim messages using a safe locking pattern.

Example:

```sql
SELECT id
FROM outbox_messages
WHERE status IN ('pending', 'retry_wait')
  AND available_at <= now()
ORDER BY priority DESC, id
FOR UPDATE SKIP LOCKED
LIMIT :batch_size;
```

Then mark them as:

```text
processing
```

### Rule

Multiple workers may process the same outbox table safely.

---

## 19. Processing Lease

A worker lock may expire.

Recommended fields:

```text
locked_at
locked_by
lock_expires_at
```

If a worker crashes:

- expired processing messages return to retry eligibility;
- idempotent consumers prevent duplicate side effects.

---

## 20. Delivery Semantics

The outbox provides:

```text
at-least-once delivery
```

Exactly-once transport delivery is not assumed.

Business-level exactly-once behavior is achieved through:

- message UUID;
- idempotency key;
- consumer inbox/deduplication;
- unique constraints.

---

## 21. Consumer Inbox

### Table: `consumer_inbox`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
consumer_name TEXT NOT NULL
message_uuid UUID NOT NULL
event_uuid UUID NULL
status TEXT NOT NULL
received_at TIMESTAMPTZ NOT NULL
processed_at TIMESTAMPTZ NULL
result_reference TEXT NULL
error_jsonb JSONB NULL
UNIQUE (consumer_name, message_uuid)
```

### Purpose

Before applying side effects, a consumer records the message.

If the same message is delivered again:

- the existing result is returned or ignored;
- side effects are not duplicated.

---

## 22. Retry Policy

Retryable failures:

- temporary provider error;
- network timeout;
- rate limit;
- temporary object storage failure;
- database connection interruption;
- worker restart.

Non-retryable failures:

- invalid payload;
- unsupported message version;
- missing mandatory entity;
- ownership violation;
- permanently rejected content;
- corrupted schema.

---

## 23. Retry Scheduling

Recommended policy:

```text
attempt 1: immediate
attempt 2: +30 seconds
attempt 3: +2 minutes
attempt 4: +10 minutes
attempt 5: +30 minutes
later attempts: capped exponential backoff
```

Add jitter to prevent synchronized retries.

Retry policy should be configurable per destination.

---

## 24. Dead-Letter Model

### Table: `dead_letter_messages`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
outbox_message_id BIGINT NOT NULL
message_uuid UUID NOT NULL
destination TEXT NOT NULL
message_type TEXT NOT NULL
message_version INTEGER NOT NULL
payload_jsonb JSONB NOT NULL
failure_code TEXT NOT NULL
failure_detail_jsonb JSONB NULL
attempt_count INTEGER NOT NULL
first_failed_at TIMESTAMPTZ NOT NULL
dead_lettered_at TIMESTAMPTZ NOT NULL
resolved_at TIMESTAMPTZ NULL
resolution_type TEXT NULL
resolution_note TEXT NULL
requeued_message_uuid UUID NULL
```

### Resolution Types

```text
discarded
corrected
requeued
manually_completed
superseded
```

---

## 25. Dead-Letter Requeue

A dead-letter message must not be silently reset.

Requeue creates a new outbox message with:

- new `message_uuid`;
- reference to original message;
- corrected payload or configuration;
- preserved correlation ID;
- audit record.

This keeps retry history traceable.

---

## 26. Ordering Rules

Global ordering is not guaranteed.

Ordering is guaranteed only where explicitly modeled.

Possible ordering key:

```text
aggregate_type + aggregate_id + aggregate_version
```

### Example

Events for one `story_session` should be processed in aggregate version order.

Independent aggregates may be processed concurrently.

---

## 27. Aggregate Version Gaps

A consumer receiving:

```text
version 7
```

before:

```text
version 6
```

may:

- defer processing;
- retry later;
- rebuild from authoritative state;
- process only if event type is order-independent.

The consumer contract must declare ordering needs.

---

## 28. Event Publication Record

### Table: `message_delivery_attempts`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
outbox_message_id BIGINT NOT NULL
attempt_no INTEGER NOT NULL
worker_id TEXT NULL
started_at TIMESTAMPTZ NOT NULL
completed_at TIMESTAMPTZ NULL
result_status TEXT NOT NULL
error_code TEXT NULL
error_detail_jsonb JSONB NULL
duration_ms INTEGER NULL
```

This provides operational diagnostics without mutating event history.

---

## 29. Payload Size Rule

Outbox payloads must remain compact.

Recommended target:

```text
below 64 KB per message
```

Large data should be stored elsewhere and referenced by:

- entity ID;
- media asset ID;
- object storage key;
- generation output ID;
- context package ID.

Do not place images, audio or large story documents in event payloads.

---

## 30. Sensitive Data Rules

Payloads must minimize:

- child names;
- birth dates;
- private profile information;
- raw prompts;
- personal media references;
- moderation-sensitive data.

Use internal IDs where possible.

Access-sensitive consumers fetch required authoritative data through approved services.

---

## 31. Domain Event Examples

### Choice Committed

```json
{
  "story_session_id": "uuid",
  "choice_point_id": "uuid",
  "choice_option_id": "uuid",
  "selected_by_child_profile_id": "uuid",
  "previous_session_version": 5,
  "new_session_version": 6
}
```

### Item Acquired

```json
{
  "inventory_id": "uuid",
  "item_definition_id": "uuid",
  "item_instance_id": "uuid",
  "quantity": 1,
  "source_type": "story_reward"
}
```

### World Clock Advanced

```json
{
  "world_id": "uuid",
  "from_world_time": "2026-07-01T08:00:00Z",
  "to_world_time": "2026-07-03T08:00:00Z",
  "simulation_run_id": "uuid"
}
```

---

## 32. Integration Message Examples

### Memory Embedding Request

```json
{
  "memory_id": "uuid",
  "embedding_profile": "memory-default-v1",
  "source_version": 3
}
```

### Story Image Request

```json
{
  "story_session_id": "uuid",
  "story_output_id": "uuid",
  "scene_id": "uuid",
  "media_role": "story_illustration"
}
```

### Return Summary Request

```json
{
  "world_id": "uuid",
  "child_profile_id": "uuid",
  "simulation_run_id": "uuid"
}
```

---

## 33. Event Handler Types

Handlers may be:

### Transactional Local Handler

Runs inside the originating transaction only for required invariant work.

Use sparingly.

### Post-Commit Local Handler

Runs through outbox and updates another module.

### External Worker

Performs expensive or provider-based work.

### Projection Handler

Builds read models or analytics.

---

## 34. Prohibited Event Behavior

Prohibited:

- calling external APIs before transaction commit;
- mutating committed domain event payload;
- using audit logs as a message queue;
- relying on process memory for guaranteed delivery;
- assuming exactly-once transport;
- placing full aggregate snapshots in every event;
- exposing sensitive child data unnecessarily;
- using one generic `entity.updated` event for all changes;
- silently dropping unsupported message versions.

---

## 35. Event Retention

Recommended retention categories:

### Long-Term

- major domain events;
- inventory transfer events;
- story completion events;
- consent-related events;
- audit-linked events.

### Medium-Term

- operational delivery attempts;
- simulation task events;
- generation workflow events.

### Short-Term

- verbose debug metadata;
- transient processing diagnostics.

Retention policy will be finalized in the archive and retention step.

---

## 36. Outbox Cleanup

Published outbox records may be archived after a safe retention period.

Recommended approach:

1. retain published rows in active table for operational troubleshooting;
2. archive older rows;
3. never delete corresponding domain event solely because outbox was cleaned;
4. preserve dead-letter and resolution history.

---

## 37. Event Replay Position

LUMI may replay events for:

- rebuilding projections;
- reprocessing analytics;
- recreating embeddings;
- rebuilding world-news feeds.

LUMI does not replay domain events to rebuild the authoritative full database state.

This preserves the non-event-sourced architecture.

---

## 38. Audit Relationship

A domain event may reference an audit record indirectly through:

```text
request_id
actor_type
actor_id
correlation_id
```

Audit logs answer:

```text
Who did what?
```

Domain events answer:

```text
What business fact occurred?
```

Outbox messages answer:

```text
What asynchronous work must be delivered?
```

---

## 39. Monitoring Metrics

Required operational metrics:

```text
outbox pending count
oldest pending age
processing count
retry count
dead-letter count
publish latency
consumer processing latency
duplicate delivery count
unsupported version count
per-destination failure rate
```

Alerts should be based on age and failure trend, not only queue size.

---

## 40. MVP Scope

Required for MVP:

- `domain_events`
- `outbox_messages`
- consumer idempotency support;
- correlation and causation IDs;
- event versioning;
- retry scheduling;
- dead-letter state;
- basic delivery metrics.

Recommended early:

- `consumer_inbox`
- `message_delivery_attempts`
- `dead_letter_messages`

Deferred:

- external message broker;
- schema registry service;
- cross-service event mesh;
- complex replay administration UI.

---

## 41. Critical Constraints

1. Domain events are immutable and append-only.
2. Authoritative state is not reconstructed from events.
3. State change, event and outbox insert commit together.
4. Outbox delivery is at least once.
5. Consumers must be idempotent.
6. Event and message schemas are versioned.
7. Event names describe completed facts.
8. Integration messages may request asynchronous work.
9. World events remain separate from domain events.
10. Audit records remain separate from domain events.
11. Large binary data is never embedded in payloads.
12. Unsupported versions fail explicitly.
13. Dead-letter records are never silently discarded.
14. Requeue creates a new message identity.
15. Aggregate ordering is explicit, not globally assumed.
16. Sensitive child data is minimized.
17. External API calls occur only after commit.
18. Event replay is for projections, not authoritative state reconstruction.

---

## 42. Example End-to-End Flow

A child chooses to give a berry to the fox.

### Transaction

```text
insert choice selection
decrement berry quantity
increase fox trust
create fox memory
advance session
insert domain events
insert outbox messages
commit
```

### Domain Events

```text
story.choice.committed
inventory.item.consumed
character.relationship.changed
character.memory.created
story.scene.advanced
```

### Outbox Messages

```text
embedding.memory.requested
projection.world_news.refresh_requested
```

### Asynchronous Work

```text
embedding worker creates vector
projection worker refreshes relevant feed
```

If a worker receives the same message twice, `consumer_inbox` prevents duplicate side effects.

---

## 43. Decisions Finalized

1. LUMI uses append-only domain events without full event sourcing.
2. Transactional outbox is the reliability mechanism.
3. Domain events, world events, integration messages and audit logs are separate concepts.
4. Event names follow domain/entity/past-tense naming.
5. Events use explicit schema versions.
6. Correlation and causation IDs are mandatory for workflows.
7. Outbox delivery uses at-least-once semantics.
8. Consumers implement inbox-based deduplication where needed.
9. Retry policy is bounded and configurable.
10. Failed messages move to an explicit dead-letter model.
11. Requeue creates a new message and preserves lineage.
12. Payloads are compact and reference large data externally.
13. Aggregate ordering is supported without global ordering.
14. Published outbox rows may be archived independently of domain events.
15. External brokers are not required for the initial modular monolith.

---

## 44. Next Artifact

**pgvector, Embedding and Semantic Retrieval Data Model v1**

The next document will define:

- embedding profiles;
- vector dimensions;
- memory embeddings;
- story and event embeddings;
- source versioning;
- chunking;
- retrieval filters;
- similarity search;
- re-embedding;
- model migration;
- semantic data lifecycle.
