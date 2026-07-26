# Sprint 01 Product Requirements

## PR-01 — Application shell

The system shall provide a responsive application shell with:

- application name;
- environment badge outside production;
- navigation placeholders;
- technical status page;
- error and not-found pages.

## PR-02 — Startup diagnostics

The application shall expose a clear startup path. Missing or invalid required configuration must produce actionable errors.

## PR-03 — Service health

The system shall expose:

- liveness endpoint;
- readiness endpoint;
- version endpoint.

The readiness endpoint shall include database connectivity status and complete within a bounded timeout.

## PR-04 — Database baseline

The system shall create its schema through migrations only and populate development data through an idempotent seed command.

## PR-05 — Protected application boundary

The application shall contain a protected route group prepared for authenticated LUMI functionality. A development-only authentication mechanism is acceptable when explicitly marked and disabled in production.

## PR-06 — Audit baseline

The system shall support recording foundational audit events with actor, action, target, timestamp, correlation ID and optional metadata.

## PR-07 — Configuration visibility

A technical status page shall show non-secret application information:

- application version;
- environment;
- database readiness;
- build or commit identifier when available.

## PR-08 — Quality gates

The repository shall provide commands for:

- formatting check;
- lint;
- type-check;
- unit tests;
- integration tests;
- production build.

## Non-functional requirements

- NFR-01: Server-side endpoint response p95 under 500 ms in local baseline conditions, excluding cold start.
- NFR-02: Health endpoints must not disclose secrets.
- NFR-03: All external input is validated.
- NFR-04: Logs use structured JSON in server environments.
- NFR-05: Critical startup configuration is type-safe.
- NFR-06: Tests are deterministic and isolated.
- NFR-07: No database schema mutation occurs automatically in production startup.
