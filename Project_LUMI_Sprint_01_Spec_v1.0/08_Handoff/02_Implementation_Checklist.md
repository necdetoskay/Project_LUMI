# Implementation Checklist

## Repository

- [ ] Node and pnpm versions pinned.
- [ ] Lockfile committed.
- [ ] Strict TypeScript enabled.
- [ ] Lint and format scripts exist.
- [ ] Source boundaries created.

## Configuration

- [ ] `.env.example` complete.
- [ ] Environment schema implemented.
- [ ] Dev auth rejected in production.
- [ ] Secrets redacted.

## Database

- [ ] PostgreSQL Compose service healthy.
- [ ] ORM configured.
- [ ] Initial migration committed.
- [ ] Seed idempotent.
- [ ] Test database isolated.

## API and diagnostics

- [ ] Liveness implemented.
- [ ] Readiness implemented with timeout.
- [ ] Version endpoint implemented.
- [ ] Correlation IDs implemented.
- [ ] Error envelope implemented.

## Application

- [ ] Public shell.
- [ ] Protected shell.
- [ ] Status page.
- [ ] Error pages.
- [ ] Responsive and keyboard-accessible navigation.

## Identity and audit

- [ ] Seed user and household.
- [ ] Session service.
- [ ] Protected route test.
- [ ] Append-only audit event.
- [ ] Audit integration test.

## Quality

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Smoke tests pass.
- [ ] Lint passes.
- [ ] Type-check passes.
- [ ] Production build passes.
- [ ] CI passes.

## Handoff

- [ ] Setup guide validated.
- [ ] Acceptance matrix completed.
- [ ] Known issues documented.
- [ ] Sprint completion report created.
