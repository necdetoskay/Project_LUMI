
# Project LUMI — Audit, Outbox & Integration Schema v1

## Status
Accepted

## Purpose

Defines the persistence model for auditing, transactional messaging and external integrations.

## Aggregate Roots

- AuditLog
- OutboxMessage

Supporting entities:

- IntegrationEvent
- EventDispatch
- DeadLetterMessage
- IdempotencyRecord

## audit_logs

Fields:

- id
- world_id
- actor_type
- actor_id
- action
- entity_type
- entity_id
- before_snapshot
- after_snapshot
- correlation_id
- causation_id
- created_at

Audit records are append-only.

## outbox_messages

Fields:

- id
- aggregate_type
- aggregate_id
- event_type
- payload
- status
- retry_count
- next_retry_at
- created_at
- published_at

Statuses:

- pending
- processing
- published
- failed
- dead_letter

Messages are written in the same transaction as domain changes.

## integration_events

Tracks externally visible events.

Fields:

- id
- outbox_message_id
- destination
- protocol
- response_code
- response_summary
- completed_at

## event_dispatch_queue

Responsible for asynchronous delivery.

Rules:

- FIFO per aggregate
- retry with backoff
- idempotent publishing

## dead_letter_messages

Stores permanently failed deliveries.

Fields:

- id
- outbox_message_id
- failure_reason
- payload_snapshot
- moved_at

Messages may be replayed after investigation.

## idempotency_records

Fields:

- id
- idempotency_key
- request_hash
- response_hash
- expires_at
- created_at

Repeated requests must return the same logical outcome.

## Correlation

Every distributed workflow carries:

- correlation_id
- causation_id

These identifiers flow across services.

## External Integrations

Supported examples:

- image generation
- narration generation
- notifications
- semantic indexing

External failures must never roll back committed business data.

## Lifecycle

pending
→ processing
→ published

or

pending
→ processing
→ failed
→ dead_letter

## Security

- Audit logs are immutable.
- Sensitive payloads may be redacted.
- Administrative access is logged.

## Repository

- writeAudit
- enqueueOutbox
- publishMessage
- moveToDeadLetter
- registerIdempotency

## Domain Events

- AuditWritten
- OutboxEnqueued
- MessagePublished
- MessageFailed
- MessageDeadLettered

## Acceptance Criteria

- Business transaction and outbox commit atomically.
- Audit history is immutable.
- Retries are supported.
- Dead-letter handling exists.
- Idempotent processing is enforced.

## Decisions Finalized

1. Audit is append-only.
2. Outbox pattern is mandatory.
3. External delivery is asynchronous.
4. Correlation IDs are propagated.
5. Failed messages are isolated in a dead-letter queue.

## Next Artifact

**Persistence Architecture Summary v1**
