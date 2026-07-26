# Sprint 01 Test Strategy

## Test pyramid

### Unit tests

Cover:

- environment parser;
- error mapping;
- correlation ID validation;
- application info service;
- audit metadata validation;
- readiness use case with fake dependencies.

### Integration tests

Cover:

- migration applies to empty test database;
- seed is idempotent;
- database health query;
- audit event persistence;
- unique user email;
- household membership constraints;
- route handler responses with real database where relevant.

### Smoke tests

Cover:

- application starts;
- `/api/health/live` returns 200;
- `/api/health/ready` returns 200 with database;
- `/status` renders;
- production build starts sufficiently to answer liveness.

## Failure-path tests

- Invalid environment variable.
- Database unavailable.
- Readiness timeout.
- Invalid correlation ID header.
- Duplicate normalized email.
- Unauthorized protected route.
- Audit metadata above allowed size.

## Determinism

- Fixed test clock where timestamp equality matters.
- Isolated database state.
- No internet calls.
- No dependence on local timezone.
- No random IDs in snapshots unless normalized.
