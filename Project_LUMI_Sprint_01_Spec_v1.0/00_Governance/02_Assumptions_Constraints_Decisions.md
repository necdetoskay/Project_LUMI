# Assumptions, Constraints and Decisions

## Assumptions

- Development is primarily performed on Windows 11 with Docker Desktop and WSL2 available.
- The application uses Node.js and pnpm.
- PostgreSQL is the authoritative transactional database.
- The first deployment target is not fixed in this sprint.
- The application will later support multiple child profiles under a parent or household account.
- The architecture must remain modular enough to support background workers and AI integrations later.

## Constraints

- Sprint 01 must avoid feature creep.
- No external paid AI service is required.
- Local startup must not depend on cloud infrastructure.
- Secrets must never be committed.
- Migrations are immutable after merging.
- The application must use strict TypeScript.
- Database access must be isolated behind a data-access layer.
- Core modules must not import UI components.

## Architecture decisions

### ADR-001 — PostgreSQL as the system of record

PostgreSQL is selected because LUMI contains strongly related entities, transactional state changes, audit requirements and future consistency-sensitive world-state updates.

### ADR-002 — Next.js App Router

Next.js provides the web shell, route handlers and server-rendered application boundary. Domain code remains framework-light.

### ADR-003 — ORM with explicit migrations

Use Prisma unless the implementation repository already has an approved alternative. Schema changes must be represented by versioned migrations and reviewed.

### ADR-004 — Modular monolith first

Sprint 01 starts as a modular monolith. Future workers or services may be extracted only when workload or isolation requirements justify it.

### ADR-005 — Contract-first endpoints

Every endpoint has a documented request, response and error contract. Zod validates external input.

### ADR-006 — Background jobs deferred

The directory boundaries may reserve a jobs module, but no queue broker is introduced in Sprint 01.

### ADR-007 — Minimal authentication boundary

The sprint may include a development-safe session boundary and protected application layout, but complete production authentication is not required unless already available in the repository.
