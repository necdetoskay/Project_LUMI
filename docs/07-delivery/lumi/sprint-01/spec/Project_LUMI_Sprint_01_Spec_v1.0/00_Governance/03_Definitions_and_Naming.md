# Definitions and Naming

## Core terms

- **Household:** Parent-managed logical account boundary containing child profiles and future shared worlds.
- **User:** Authenticated adult or operator identity.
- **Child Profile:** A child-specific experience profile. Full management is outside Sprint 01.
- **World:** Persistent fictional universe. Not implemented in Sprint 01.
- **Story Session:** A single interactive or static story experience. Not implemented in Sprint 01.
- **Module:** Cohesive domain or infrastructure boundary.
- **Migration:** Immutable database schema change.
- **Readiness:** Whether the application can serve normal traffic with required dependencies available.
- **Liveness:** Whether the application process is running.
- **Correlation ID:** Identifier used to connect logs and API errors for a request.

## Naming conventions

- TypeScript files: `kebab-case.ts`.
- React components: file and exported component use `PascalCase`.
- Functions and variables: `camelCase`.
- Database tables: `snake_case`.
- Database primary keys: `id`.
- Foreign keys: `<entity>_id`.
- Timestamps: `created_at`, `updated_at`, optional `deleted_at`.
- API routes: lowercase, plural nouns where applicable.
- Environment variables: `UPPER_SNAKE_CASE`.
- Tests: `<subject>.test.ts` or `<subject>.integration.test.ts`.
- Migrations: timestamp plus concise description.

## Identifier policy

Use UUIDs for domain and identity tables unless the ORM baseline selects another globally safe identifier. IDs exposed through APIs are opaque strings.
