# Task Sequence and Dependencies

## Phase 1 — Bootstrap

Execute A01–A05 before feature code. Confirm install, lint and type-check scripts exist.

## Phase 2 — Configuration and database

Execute C01–C04 and D01–D06. The application must not import an unvalidated environment variable directly.

Dependency chain:

`Docker database -> ORM config -> schema -> migration -> seed -> integration database`

## Phase 3 — Infrastructure primitives

Implement errors, logging, correlation context and database health adapter before route handlers.

## Phase 4 — Endpoints

Implement liveness first, then version, then readiness. Add contract tests with each endpoint.

## Phase 5 — Application shell

Build status page using endpoint-backed or server-side service data. Add protected shell only after session boundary exists.

## Phase 6 — Identity and audit

Add seeded development user, household and membership. Implement audit append operation and one integration test.

## Phase 7 — CI and evidence

Run the complete acceptance matrix on a clean environment. Record commands and results.

## Parallelizable work

- UI shell and database baseline may proceed in parallel after repository conventions are fixed.
- Documentation may be updated continuously.
- Tests should be written with each task, not postponed to the end.

## Merge guidance

Prefer small pull requests grouped by a single epic or a coherent vertical slice. Do not combine formatting-only mass changes with functional code.
