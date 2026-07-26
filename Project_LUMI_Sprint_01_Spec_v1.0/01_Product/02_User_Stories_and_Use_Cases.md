# User Stories and Use Cases

## US-01 — Developer starts the project

**As a developer**, I want to start the full local stack with documented commands so that I can work without reconstructing the environment.

Acceptance summary:

- PostgreSQL starts through Docker Compose.
- The application connects using `.env.local`.
- Migrations and seed complete successfully.
- The app loads without manual database edits.

## US-02 — Developer verifies system health

**As a developer or operator**, I want liveness and readiness endpoints so that I can distinguish application failure from dependency failure.

Acceptance summary:

- Liveness returns success while the process is running.
- Readiness returns failure when PostgreSQL is unreachable.
- Responses contain timestamps and version-safe metadata.
- No connection string or secret is returned.

## US-03 — Developer changes the schema

**As a developer**, I want versioned migrations so that schema changes are repeatable and reviewable.

Acceptance summary:

- Schema changes create a migration.
- CI checks migration consistency.
- Applied migrations are not modified.
- Seed data can be safely rerun.

## US-04 — Maintainer diagnoses an error

**As a maintainer**, I want structured logs and correlation IDs so that I can trace failed requests.

Acceptance summary:

- Each API request has a correlation ID.
- Error responses include a safe error code and correlation ID.
- Server logs contain technical detail without exposing it to the client.

## US-05 — Product team opens the foundation UI

**As a product stakeholder**, I want a simple status page so that I can see that the LUMI foundation is operational.

Acceptance summary:

- Page works on desktop and mobile widths.
- Page displays environment and service status.
- Placeholder navigation clearly marks future modules as unavailable.
