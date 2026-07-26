# Data Integrity and Audit Rules

## Identity integrity

- Email is stored normalized.
- Duplicate normalized email is rejected.
- Disabled users cannot establish a valid application session.
- Household membership references existing users and households.
- Membership role is constrained.

## Audit integrity

- Audit events are append-only.
- Application code exposes create and query operations but no normal update/delete operation.
- `occurred_at` comes from the application clock.
- `created_at` comes from the persistence layer or database.
- Metadata must be valid JSON and size-limited.
- Correlation ID is required.
- Action names follow `<domain>.<entity>.<verb>` where practical.

## Time policy

Persist timestamps in UTC. Render in the user's locale at the presentation boundary.

## Concurrency

Sprint 01 operations are simple. Unique constraints are the final authority against duplicate identity and membership records.

## Soft deletion

Do not introduce generic soft deletion. User status handles disabling. Audit events are retained.
