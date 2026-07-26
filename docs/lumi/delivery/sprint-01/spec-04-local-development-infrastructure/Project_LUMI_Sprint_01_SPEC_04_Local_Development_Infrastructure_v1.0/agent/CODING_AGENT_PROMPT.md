# Coding Agent Prompt — LUMI-S01-SPEC-04

Implement **LUMI-S01-SPEC-04 — Local Development Infrastructure Foundation**
exactly as defined in `spec/LUMI-S01-SPEC-04.md`.

## Mandatory Rules

1. Read governance and SPEC-01 through SPEC-03 first.
2. Use Docker Compose for local infrastructure.
3. Pin all image versions.
4. Add PostgreSQL and a Redis-compatible cache.
5. Add object storage only under the approved optional profile.
6. Use cross-platform Node wrapper scripts.
7. Keep reset behavior explicitly guarded.
8. Commit no real secret.
9. Do not add schemas, migrations or app integration.
10. Stop after SPEC-04.

## Required Validation

Report:

```text
docker compose config
pnpm infra:up
pnpm infra:status
pnpm infra:logs
pnpm infra:down
pnpm infra:up
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also test reset refusal without confirmation and successful project-scoped reset with confirmation.

## Completion Response

Return:

- created and modified files;
- image versions;
- variables added;
- command outcomes;
- health and persistence evidence;
- reset-safety evidence;
- acceptance criteria PASS/FAIL;
- deviations and unresolved issues.

Do not begin SPEC-05.
