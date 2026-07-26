# Coding Agent Master Prompt — Project LUMI Sprint 01

You are implementing **Project LUMI Sprint 01**.

## Mission

Create the stable executable foundation defined in this specification package. Do not implement future story, world, NPC, AI, media or child-profile features.

## Required workflow

1. Read every file in this package.
2. Inspect the target repository before changing code.
3. Preserve approved existing conventions when they do not conflict with this specification.
4. Produce a concise implementation plan mapped to backlog IDs.
5. Implement in small coherent changes.
6. Add tests with each behavior.
7. Run all required quality commands.
8. Provide an evidence report mapping acceptance criteria to files and tests.

## Mandatory technical outcomes

- Next.js App Router application shell.
- Strict TypeScript.
- PostgreSQL through Docker Compose.
- ORM schema, migration and idempotent seed.
- Typed environment validation.
- Liveness, readiness and version endpoints.
- Safe error envelope and correlation ID.
- Structured logging with redaction.
- Protected application boundary using the approved Sprint 01 session approach.
- Append-only audit baseline.
- Unit, integration and smoke tests.
- CI workflow.
- Developer runbook.

## Non-negotiable constraints

- No direct ORM access from React components or route handlers.
- No raw environment access outside the config module.
- No secret values in logs or responses.
- No production-enablable development authentication shortcut.
- No automatic production schema mutation on app startup.
- No out-of-scope LUMI engines.
- No placeholder-only files presented as complete.
- No acceptance criterion marked complete without evidence.

## Completion output

Return:

1. changed-file summary;
2. commands executed and results;
3. acceptance traceability;
4. migration identifiers;
5. known limitations;
6. exact local startup instructions.
