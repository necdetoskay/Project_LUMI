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
- `tooling/*` — shared TypeScript, ESLint, and repository tooling.

## Local Contracts

- PostgreSQL is the authoritative datastore; migrations are forward-only.
- Workspace packages expose clean application boundaries through domain/application/ports; no direct ORM calls from routes or other packages.
- Strict TypeScript (`tooling/typescript/base.json`) and ESLint (`eslint.config.mjs`) apply to all packages.
- Integration tests that truncate/drop data require explicit environment guards and are skipped by default.
- No raw secrets, API keys, or real child data in fixtures, tests, or logs.

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
- Sprint 12 — Story Generation Pipeline [tamamlandı] (merge onay bekliyor: `agent/sprint-12-story-generation-pipeline`)
- Sprint 13 — NPC Intelligence Foundation [tamamlandı] (merge onay bekliyor: `agent/sprint-13-npc-intelligence-foundation`)
