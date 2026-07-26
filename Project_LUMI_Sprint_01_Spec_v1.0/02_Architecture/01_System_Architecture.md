# System Architecture

## Context

Sprint 01 implements a modular monolith consisting of a Next.js web application and PostgreSQL database. The application contains UI, route handlers, application services, domain types and infrastructure adapters.

## Logical layers

### Presentation

- React Server and Client Components.
- Layouts and pages.
- Route handlers.
- View models.
- No direct ORM access.

### Application

- Use-case orchestration.
- Transaction boundaries.
- Validation coordination.
- Audit invocation.
- Framework-independent interfaces where practical.

### Domain

- Core types, invariants and errors.
- No Next.js, ORM or UI imports.
- Minimal in Sprint 01.

### Infrastructure

- ORM client.
- Repositories.
- logging;
- environment parsing;
- clock and identifier adapters;
- authentication adapter.

## Proposed source layout

```text
src/
  app/
    (public)/
    (protected)/
    api/
  components/
    layout/
    status/
    ui/
  modules/
    identity/
    audit/
    system/
  lib/
    config/
    db/
    errors/
    logging/
    validation/
  test/
```

## Dependency direction

`presentation -> application -> domain`

Infrastructure implements interfaces required by application or domain. Domain must not import presentation or infrastructure.

## Transaction guidance

Use explicit transactions for operations that write more than one related record. Health checks must use a lightweight bounded query such as `SELECT 1`.

## Future compatibility

The architecture reserves clean boundaries for:

- story orchestration;
- world-state commits;
- autonomous NPC simulation;
- AI provider adapters;
- background workers;
- media generation;
- event outbox.

These are not implemented during Sprint 01.
