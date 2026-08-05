# Project LUMI — Agent Work Contract

## Purpose

This repository contains Project LUMI, an AI-native interactive story platform for children and families. The codebase spans Next.js web frontend, TypeScript workspace packages (auth, profiles, world, story, prompts, context), PostgreSQL persistence, and Drizzle ORM.

## Ownership

- `apps/web` — Next.js application, API routes, parent/child UI.
- `packages/profiles` — parent auth, households, child profiles, parent policy.
- `packages/world` — world definition, regions, locations, homes, inventory.
- `packages/story` — story definitions, versions, sessions, choice/consequence engine.
- `packages/prompts` — versioned prompt registry and typed template renderer.
- `packages/context` — deterministic context builder and safety/parent precedence policy.
- `packages/npc-intelligence` — NPC perception/belief, need/goal evaluation, decision context, candidate/utility selection, decision traces.
- `packages/simulation` — world time, calendar, and background simulation engine (absence policy, budget planning, idempotent runs, committed effects, recap builder).
- `services/worker` — background job orchestrator that drives world simulation, dispatching idempotent runs and recording committed effects.
- `tooling/*` — shared TypeScript, ESLint, and repository tooling.

## Local Contracts

- PostgreSQL is the authoritative datastore; migrations are forward-only.
- Workspace packages expose clean application boundaries through domain/application/ports; no direct ORM calls from routes or other packages.
- Strict TypeScript (`tooling/typescript/base.json`) and ESLint (`eslint.config.mjs`) apply to all packages.
- Integration tests that truncate/drop data require explicit environment guards and are skipped by default.
- No raw secrets, API keys, or real child data in fixtures, tests, or logs.
- Docker: compose (`infra/compose/docker-compose.yml`) exposes ONLY the web service to the host. postgres and redis are internal-only (`5432/tcp`, `6379/tcp`, no host port). Web reaches them via the compose network (`postgres:5432`, `redis:6379`).
- `NEXT_PUBLIC_APP_URL` is build-time inlined and must equal the public URL (server host + `WEB_PORT`); `redirectWithQuery` prefers the request `Host` header for redirects.
- Next standalone builds do NOT trace `drizzle-orm`/`postgres` from workspace packages — `scripts/inject-standalone-deps.mjs` injects them into `.next/standalone` after build (required for the Docker web image).
- Client components must not call `crypto.randomUUID()` directly on HTTP origins (non-secure context makes it undefined) — use `newIdempotencyKey()` from `apps/web/lib/new-id.ts`.

## Work Guidance

- Prefer minimal, additive changes. Do not refactor unrelated code to fix pre-existing lint debt.
- Keep domain models pure; application services orchestrate; repositories handle persistence.
- Prompt and context packages must not generate story text, make autonomous decisions, or leak private data.
- When creating a new package, mirror the existing `package.json`, `tsconfig.json`, and test setup of `@lumi/story`.

## Verification

- Run lint, typecheck, unit tests for every touched package.
- Run `pnpm build` and `node scripts/check-mojibake.mjs` before finishing.
- Integration tests only run when their specific `*_TEST_ENABLE_DESTRUCTIVE=true` guard is set.

## Gelecek Planlar ve Yol Haritaları

- Sprint 09 — Story Definition and Session [tamamlandı]
- Sprint 10 — Choice and Session Consequence [tamamlandı]
- Sprint 11 — Prompt Registry and Context Builder [tamamlandı]
- Sprint 12 — Story Generation Pipeline [tamamlandı]
- Sprint 13 — NPC Intelligence Foundation [tamamlandı]
- Sprint 14 — Simulation Engine [tamamlandı] (2026-08-04 hardening: BudgetPlanner testi doğru pakete taşındı, worker discovery portu eklendi, `undefined as never` composition-root bağlantıları kaldırıldı, worker smoke/freeze/concurrency testleri eklendi)
- Sprint 15 — Image, Voice and Audio Pipelines [tamamlandı]
- Sprint 16 — Story Reader [tamamlandı] (story session listesi, world map API+UI, story reader API+UI, character onboarding handoff; PR #18 merge edildi; PR #19 ile CI prettier `validate` check düzeltildi, web testleri 111/111 yeşil)
- Sprint 18 — Parent Panel and Safety Controls [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-18/SPRINT_SPEC.md`; S18-T01 parent policy use cases, T02 audit persistence, T03 panel APIs, T04 dashboard/settings UI, T05 consent/export/archive, T06 runbooks; 2026-08-05 T01-T04 ilk dilim: `DrizzleParentPolicySource` üretim adapter'ı, `blockedTopics`/`customNotes` yüzeyi, audit trail GET, `/app/settings/safety` ebeveyn paneli + nav fix; 2026-08-05 web Docker'a taşındı: root `Dockerfile` (Next standalone, `inject-standalone-deps.mjs`), web servisi 3001'de, postgres/redis internal-only; hikaye oluşturma fix: `drizzle-orm`/`postgres` standalone enjeksiyonu, `startSession` transaction okuma, `redirectWithQuery` Host-header tabanlı, client `crypto.randomUUID` → `newIdempotencyKey`; 2026-08-05 T05 ilk dilim: yeni `@lumi/privacy` paketi — consent records (grant/revoke), metadata-only child data export, archive orchestration (child profile + world archive), lifecycle audit; `/api/privacy/*` route'ları; privacy schema migration production'a uygulandı; 2026-08-05 T06: `PARENT_PANEL_RUNBOOK.md` + `SAFETY_OPERATIONS_RUNBOOK.md`; PR #21 ve #22 merge edildi; purge (idempotent async job) ayrı backlog dilimi olarak planlandı)
