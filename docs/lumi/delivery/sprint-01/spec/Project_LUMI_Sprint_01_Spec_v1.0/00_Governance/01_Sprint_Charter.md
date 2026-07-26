# Sprint 01 Charter

## Purpose

Sprint 01 creates the smallest stable technical foundation on which the living-universe application can be developed safely. The sprint must reduce architectural uncertainty, establish repeatable engineering workflows and prevent feature work from starting on an unstable base.

## Sprint goal

Create a locally runnable, testable and migration-driven application foundation using Next.js, TypeScript, PostgreSQL and Docker Compose.

## Business value

Although the sprint delivers little visible end-user functionality, it creates the foundations required for dependable development:

- consistent project structure;
- reproducible local setup;
- database migration discipline;
- automated quality gates;
- health checks and diagnostics;
- traceable configuration;
- defined module boundaries.

## In scope

1. Monorepo or single-application repository baseline.
2. Next.js application shell using App Router.
3. Strict TypeScript configuration.
4. PostgreSQL service in Docker Compose.
5. ORM and migration baseline.
6. Initial identity, audit and application configuration tables.
7. Health, readiness and version endpoints.
8. Development seed.
9. Logging and error-envelope conventions.
10. Unit, integration and smoke tests.
11. CI workflow.
12. Developer documentation.

## Out of scope

- Story creation and playback.
- Child profile management beyond placeholder domain boundaries.
- World, region, settlement, NPC and item engines.
- AI provider integrations.
- Image generation, TTS and cost calculation.
- Subscription, payment or quota management.
- Production-grade SSO.
- Mobile application.
- Admin dashboard beyond a technical status page.
- Full observability stack.

## Sprint completion statement

Sprint 01 is complete only when a new developer can clone the repository, copy the sample environment file, run one documented command, apply migrations, seed development data, open the application and run all quality gates successfully.
