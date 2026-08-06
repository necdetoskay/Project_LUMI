# Changelog

All notable changes to Project LUMI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Summary

Interactive story platform prototype spanning Sprints 09 through 19.

### Added

#### Sprint 09–10 — Story Definition, Sessions, Choice & Consequence
- Story definitions with versioned `storyVersion` and lifecycle states.
- Story sessions (`start`, `advance`, `resume`, `pause`, `complete`, `abandon`)
  with household-scoped authorization (`getStorySessionOrForbidden`).
- Choice/consequence engine: deterministic choice application and consequence
  persistence (PR #17, #22).

#### Sprint 11–12 — Prompt Registry & Context Builder
- Versioned prompt registry with typed template renderer (`@lumi/prompts`).
- Deterministic context builder with parent/safety precedence policy
  (`@lumi/context`).
- Story generation pipeline wiring prompts → context → session.

#### Sprint 13–14 — NPC Intelligence & Simulation
- NPC perception/belief, need/goal evaluation, decision context, and
  candidate/utility selection (`@lumi/npc-intelligence`).
- World time, calendar, and background simulation engine
  (`@lumi/simulation`) with absence policy and idempotent runs.
- Worker orchestrator (`services/worker`) driving simulation runs and
  committed effects (PR #16, #24).

#### Sprint 15 — Media Pipelines
- Image, voice, and audio generation pipelines (PR #18).

#### Sprint 16 — Story Reader
- Story session list, world map API + UI, story reader API + UI.
- Character onboarding handoff (PR #18, #19).

#### Sprint 18 — Parent Panel & Safety Controls
- Parent policy use cases, blocked topics, custom notes (PR #21).
- Audit trail, parent dashboard and `/app/settings/safety` panel (PR #22).
- `@lumi/privacy` package: consent records, metadata-only child data export,
  archive orchestration, lifecycle audit (PR #22).
- Parent panel and safety operations runbooks.

#### Sprint 19 — Security, Cost, Performance & Reliability
- **S19-T01 Threat / Isolation Audit (PR #23, #24):**
  - `getStorySessionOrForbidden` gates on session mutators.
  - Household ownership enforced on `world/[id]/recap`, `world/[id]/movement`,
    and `characters/[id]/relationships`.
  - 6 IDOR regression tests. Audit evidence:
    `docs/07-delivery/lumi/sprint-19/S19-T01_AUDIT_EVIDENCE.md`.
- **S19-T02 Security Scan Infra (PR #25):**
  - `.github/dependabot.yml` — weekly npm/pnpm updates.
  - `.gitleaks.toml` — secret scanning allowlist for documented placeholders.
  - `.github/workflows/security-scan.yml` — non-blocking `pnpm audit` PR
    comment + blocking gitleaks + blocking Trivy container scan on the web
    `Dockerfile`.

### Notes

- PostgreSQL is the authoritative datastore; forward-only migrations.
- Compose exposes only the web service to the host (port configurable);
  postgres and redis are internal-only.
- Client code must use `newIdempotencyKey()` instead of `crypto.randomUUID()`
  on non-secure (HTTP) origins.
- Next standalone builds require `scripts/inject-standalone-deps.mjs` to trace
  `drizzle-orm`/`postgres` from workspace packages.
