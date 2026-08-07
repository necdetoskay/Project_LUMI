# Project LUMI — Agent Work Contract

## Purpose

This repository contains Project LUMI, an AI-native interactive story platform for children and families. The codebase spans Next.js web frontend, TypeScript workspace packages (auth, profiles, world, story, prompts, context), PostgreSQL persistence, and Drizzle ORM.

## Ownership

- `apps/web` — Next.js application, API routes, parent/child UI.
- `packages/profiles` — parent auth, households, child profiles, parent policy.
- `packages/world` — world definition, regions, locations, homes, inventory, quests, quest templates.
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
- Sprint 19 — Security, Cost, Performance and Reliability [devam ediyor] (spec: `docs/07-delivery/lumi/sprint-19/SPRINT_SPEC.md`; S19-T01 threat/isolation audit [merged PR #23 (logic) + #24 (prettier/docs)]: `getStorySessionOrForbidden` gate eklendi (resume/advance/pause/complete/abandon), `world/[id]/recap` householdId düzeltildi, `world/[id]/movement` GET karakter scope'ı (`assertCharacterWorldAccess`), `characters/[id]/relationships` target validation; 6 IDOR regression test; evidence: `docs/07-delivery/lumi/sprint-19/S19-T01_AUDIT_EVIDENCE.md`; S19-T02 security scan infra [merged PR #25]: `.github/dependabot.yml` (weekly npm/pnpm), `.gitleaks.toml` (allowlist for placeholder creds in `.env.example`/fixtures/docs), `.github/workflows/security-scan.yml` (non-blocking `pnpm audit` PR summary + blocking gitleaks + blocking Trivy container scan on web `Dockerfile`); evidence: `docs/07-delivery/lumi/sprint-19/S19-T02_AUDIT_EVIDENCE.md`; S19-T03..T06 pending).

- Sprint 20 — Stability, Release, Performance and Reliability [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-20/SPRINT_SPEC.md`; T01–T04 merged/open, T05 runbooks, T06 approval package ready — pending owner SHA-bound RC sign-off on PR #26/#28)

- Sprint 21 — Stability, Performance and Scale [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-21/SPRINT_SPEC.md`; S21-T01 load harness scaffold [committed `codex/sprint-21-load`]: `apps/web/tests/load/session-advance.load.test.ts` + multi-project `vitest.config.ts` (ui jsdom + load node); S21-T02 SLIs + CI gate ✅: non-blocking `pnpm --filter @lumi/web test:load` step in `ci.yml`; S21-T03 memory/CPU baseline ✅: `docs/07-delivery/lumi/sprint-21/S21_T03_MEMORY_CPU_BASELINE.md`; S21-T04 seed snapshot ✅: `packages/story/tests/fixtures/load-seed.fixtures.ts` (synthetic, no PII); S21-T05 final regression gate ✅: `ci.yml` soft-failure load gate reads `coverage/load/s21-t01-report.json`)

- Sprint 22 — Story Outcome & World State Commit System [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-22/SPRINT_SPEC.md`; S22-T01 outcome manifest + story context snapshot ✅: `@lumi/story` domain modelleri `OutcomeManifest` (typed changes + evidence + idempotency keys) ve `StoryContextSnapshot` (pre-story world hash + entity state), 10 unit test; S22-T02 narrative event extraction + evidence validation ✅: `NarrativeEventExtractor` (manifest → world events, ordering + snapshot-scope check) ve `EvidenceValidator` (evidence refs + snapshot field validation, `EVIDENCE_VALIDATION_FAILED`), 6 unit test; S22-T03 world commit rule engine ✅: `WorldCommitRuleEngine` (event → `WorldChange` mapping, deterministic conflict resolution by priority+sequence, default rules for all outcome types), 6 unit test; S22-T04 transactional world commit + world versioning ✅: `story_commit_records` + `story_world_versions` schema'ları, `0003_world_commit_system.sql` migration, `WorldCommitService` (idempotency guard → evidence gate → single-tx commit + version bump + deterministic hash), repository commit/version methods, 5 unit + 3 guarded integration test; S22-T05 event sourcing + rollback/compensation ✅: `WorldCommitService` commit ile aynı transaction'da `STORY_WORLD_COMMIT_APPLIED` event'leri yazar + `compensateCommit` (inverse changes, version bump, `compensated` status, `STORY_WORLD_COMMIT_COMPENSATED` event), 8 unit + 5 guarded integration test; S22-T06 E2E story advance → committed world change ✅: `advanceSession` artık optional `outcome` kabul eder, aynı transaction içinde `commitOutcomeWithTx` ile dünya commit'i atomik yapılır (S10 limitation kapandı), 3 E2E unit test; S22-T07 backlog validation test plan execution ✅: `docs/07-delivery/lumi/sprint-22/S22_T07_VALIDATION_EXECUTION.md` — 18 SOWS senaryosu mevcut coverage'a eşlendi (12 covered, 6 partial/future-backlog), exit criteria P0/P1 green; closes S10 limitation)

- Sprint 23 — Indirect Effect Propagation + Outbox [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-23/SPRINT_SPEC.md`; S23-T01 outbox schema + migration `0004` ✅: `story_outbox` (append-only intent queue, `pending`/`processing`/`applied`/`failed` + idempotency key + commit correlation); S23-T02 outbox repository ✅: enqueue/findByKey/claimPending/markOutbox; S23-T03 rule engine indirect-intent split ✅: `WorldCommitRuleEngine.apply` → `{ direct, indirect }`, `IndirectIntent` domain + default `npc_rumor_spread` rule; T04 atomic commit+outbox ✅: `commitOutcomeWithTx` commit ile aynı tx'te `enqueueOutbox`; T05 propagation service ✅: `IndirectEffectPropagator` (pending/failed outbox claim, per-row idempotent apply, `INDIRECT_EFFECT_APPLIED`/`FAILED` events, attempt cap 3, isolation), 4 unit test; T06 failure+retry isolation ✅: `outbox-propagation.integration.test.ts` (atomic enqueue SOWS-014, once-only SOWS-015, per-row fail isolation, attempt cap 3), 4 guarded integration test; T07 SOWS-005/014/015 evidence ✅: `docs/07-delivery/lumi/sprint-23/S23_T07_INDIRECT_EFFECT_EVIDENCE.md` — direct/indirect split, atomic enqueue, once-only propagation; closes S22 documented indirect-effect/outbox gap)

### Sprint 23 closeout

- Sprint 23 tamamlandı: T01–T07 tüm görevler yeşil (79 unit + 9 guarded integration).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: quest aggregate, story-manifest semantic review, real async broker.

### Stabilizasyon (2026-08-06)

- Tüm açık PR'lar (#27/#31/#32) main'e merge edildi; yalnızca `main` branch kaldı.
- CI green: 7 düzeltme (lint prefer-const, vitest `@` alias, flaky world-map test,
  trivy-action v0.36.0, codeql upload-sarif, gitleaks env/TOML, build-arg NEXT_PUBLIC_APP_URL).
- Trivy scan non-blocking yapıldı (SARIF → GitHub Security); gitleaks blocking gate olarak kaldı.
- Backlog eklendi: container vuln remediation (`docs/08-backlog/container-vulnerability-backlog.md`) — 18 CRITICAL/HIGH alert (base image npm: tar/picomatch/ip-address/brace-expansion/sigstore; app: sharp, drizzle-orm). **2026-08-06 çözüldü**: npm runner image'dan kaldırıldı, `sharp` 0.35.3 + `drizzle-orm` 0.45.2 (pnpm-workspace `overrides`), 18/18 alert kapandı, local Trivy 0 CRITICAL/HIGH, CI + Security Scan green.

- Sprint 24 — NPC Emergent Interaction (Foundation + Rumor/Invitation) [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-24/SPRINT_SPEC.md`; S24-T01 opportunity domain + statuses ✅: `InteractionOpportunity` (rumor/invitation types, proposed/accepted/declined/deferred/expired, evidence + cooldown keys + expiry + score, child response transitions, no-punish decline), 12 unit test; S24-T02 generation (rumor+invitation) ✅: `InteractionOpportunityGenerator` — deterministic, rumor from active belief (info-access gate), invitation to trusted nearby character, cooldown/fired-key dedup, parent-type elimination, seeded-rng, 7 unit test; S24-T03 multi-dim scoring policy ✅: `OpportunityScorer` + `opportunity-scoring` domain (11 boyutlu deterministik versioned ağırlık, benefit 0..1 + penalty magnitude, `DEFAULT_OPPORTUNITY_SCORE_POLICY` 1.0.0), 6 unit test; S24-T04 cooldown/novelty/expiry ledger ✅: `OpportunityLedgerPort` + `OpportunityLedgerService` (source/target/pair cooldown gate, novelty count + threshold, expired cooldowns silently ignored, `recordFired` updates cooldown+novelty, household-scoped), 6 unit test; S24-T05 safety+parent filter ✅: `OpportunitySafetyFilter` (safe/conditional/blocked verdicts, forbidden-type elimination before scoring, conditional = parent approval, risk levels per type), 6 unit test; S24-T06 delivery inbox + idempotency ✅: `OpportunityInboxPort` + `opportunity_inbox` schema + `OpportunityDeliveryService` (idempotent deliver by key, accept/decline/defer transitions, stale-expiry, household-scoped), 6 unit test; S24-T07 opportunity trace ✅: `OpportunityTrace` domain (npc_selection→delivery steps, safelisted step keys, deterministic content hash, `sanitizeOpportunityTrace`), 5 unit test; S24-T08 backlog validation evidence ✅: `docs/07-delivery/lumi/sprint-24/S24_T08_VALIDATION_EVIDENCE.md` — backlog activation + validation senaryoları coverage'a eşlendi, exit criteria P0/P1 green; deferred: gift/warning/quest_seed/social_visit/information_share)

### Sprint 24 closeout

- Sprint 24 tamamlandı: T01–T08 tüm görevler yeşil (91 unit test).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: gift/warning/quest_seed/social_visit/information_share interaction tipleri, NPC-to-NPC rumor propagation + confidence decay, accepted opportunity → story hook conversion.

- Sprint 25 — NPC Emergent Interaction: Remaining Types [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-25/SPRINT_SPEC.md`; S25-T01 extend `OpportunityType` + risk map ✅: `OPPORTUNITY_TYPES` → 7 tip (rumor/invitation/gift/warning/quest_seed/social_visit/information_share), risk map (gift/warning/social_visit=conditional, quest_seed/information_share=safe), `assertOpportunityType` via list, 4 unit test; S25-T02..T06 generation ✅: `InteractionOpportunityGenerator` gift (owned+transferable, never unowned/non-transferable), warning (age-suitable, no fear), quest_seed (non-mandatory), social_visit (trusted nearby ≥0.5), information_share (belief-gated, single-step), 8 unit test; S25-T07 scoring/safety extensions ✅: conditional tipler (gift/warning/social_visit) parent-approval gated, safe tipler (quest_seed/information_share) approval'sız, herhangi tip forbidden olunca blocked, scoring component-driven (type-independent), 5 unit test; S25-T08 regression + evidence ✅: `docs/07-delivery/lumi/sprint-25/S25_T08_REGRESSION_EVIDENCE.md` — 7 interaction tipi mevcut coverage'a eşlendi, regression green (106 unit); deferred: NPC-to-NPC rumor propagation + confidence decay, accepted→story hook conversion)

### Sprint 25 closeout

- Sprint 25 tamamlandı: T01–T08 tüm görevler yeşil (106 unit test).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: NPC-to-NPC rumor propagation + confidence decay, accepted opportunity → story hook conversion, quest aggregate.

- Sprint 26 — NPC-to-NPC Rumor Propagation + Confidence Decay [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-26/SPRINT_SPEC.md`; S26-T01 `Rumor` domain + confidence decay ✅; S26-T02 propagation engine ✅: `RumorPropagationEngine` (info-access gate, household scope, trust filter, floor check, maxRecipients cap, seeded RNG), 19 unit test; S26-T03 rumor ledger (dedup/idempotency) ✅: `RumorLedgerService` + `RumorLedgerPort` (source/target/fact dedup via `pair:source:target:fact` key), 7 unit test; S26-T04 hearsay belief adoption ✅: `HearsayAdoptionService` (decayed confidence + extended provenance, `source: "hearsay"`), 12 unit test; S26-T05 outbox integration ✅: `RumorPropagationOrchestrator` + `StoryOutboxPort` + `RumorSpreadApplicator` + `npc_rumor_spread` intent, guarded integration test; S26-T06 safety ✅: `RumorSafetyFilter` (confidence bounds, floor check, `validateAdoption` hearsay-only gate), 10 unit test; S26-T07 backlog validation evidence ✅: `docs/07-delivery/lumi/sprint-26/S26_T07_VALIDATION_EVIDENCE.md` — 18/18 SOWS scenarios covered, exit criteria P0/P1 green)

### Sprint 26 closeout

- Sprint 26 tamamlandı: T01–T07 tüm görevler yeşil (167 unit test).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: accepted opportunity → story hook conversion, quest aggregate.

- Sprint 27 — Accepted Opportunity → Story Hook Conversion [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-27/SPRINT_SPEC.md`; S27-T01 StoryHook domain model + StoryHookService ✅: `StoryHook` domain class (create/fromState/consume/markDelivered/expire), `StoryHookService.createHook` (accepted-only, household-scope check, idempotency via `findHookByOpportunityId`, persists hook, emits `STORY_HOOK_CREATED` event), `story_hooks` Drizzle schema (integer version), repo `createHook`/`findHookByOpportunityId`; S27-T02 hook-to-scene mapping + persistence schema ✅: `mapHookToScene` (rumor/gift/warning/invitation/quest_seed/social_visit/information_share → narrative/choice/transition, deterministic, type-independent), 9 unit test; S27-T03 idempotency guard ✅: `tests/application/story-hook.service.test.ts` — 5 unit test (accepted-only, household-scope, first-accept create+event, idempotent no-op on re-accept, existing hook unchanged); S27-T04 STORY_HOOK_CREATED event + outbox integration ✅: `story_hook_delivery` outbox intent type added, `0005_story_hooks.sql` migration (story_hooks table), `StoryHookService` enqueues `story-hook:<opportunityId>` delivery intent after hook creation, event + outbox assertions (6 unit test); S27-T05 hook delivery via existing propagator ✅: `StoryHookDeliveryApplicator` (validates `story_hook_delivery` intent, zero-write skip on missing payload) + `story-hook-delivery.integration.test.ts` guarded integration (applied marker + zero-write skip), 3 unit test; S27-T06 hook influence on scene selection during advance ✅: `selectNextSceneForHook` (deterministic, type-independent: prefers unvisited scene of hook's mapped scene type, lowest sequence wins, falls back to requested scene) integrated into `advanceSession` via `resolveAdvanceSceneId` (optional `pendingHook`), 5 unit + 2 e2e test; S27-T07 backlog validation evidence ✅: `docs/07-delivery/lumi/sprint-27/S27_T07_VALIDATION_EVIDENCE.md` — accepted-opportunity→hook conversion backlog step mapped to coveraged coverage, exit criteria P0/P1 green).

### Sprint 27 closeout

- Sprint 27 tamamlandı: T01–T07 tüm görevler yeşil (104 unit test).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: quest aggregate, accepted hook → story generation pipeline (LLM rendering) integration.

- Sprint 28 — Quest Aggregate [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-28/SPRINT_SPEC.md`; S28-T01 `Quest` domain aggregate + lifecycle (`inactive→active→paused/completed/abandoned`) + ordered objectives + household scope + evidence ✅; S28-T02 `quests` + `quest_objectives` schema + migration `0006_quests.sql` ✅; S28-T03 `QuestService` + `QuestRepository` port + `DrizzleQuestRepository` (create/activate/progress/pause/resume/abandon/reads) ✅, 9 service test; S28-T04 `quest_state_update` outcome tipi + `quest_objective_progressed` narrative event + `default-quest-objective-progress` kuralı (`@lumi/story`) ✅, 5 test; S28-T05 quest evidence validation (snapshot scope + evidenceRef gate) ✅, `quest-outcome.test.ts`; S28-T06 transactional quest commit via mevcut `WorldCommitService` + idempotent world-side `applyQuestChange` applicator (per `questId::objectiveIndex`) ✅, guarded `world-commit.integration.test.ts` + `quest-change-applicator.integration.test.ts`; S28-T07 backlog validation evidence ✅: `docs/07-delivery/lumi/sprint-28/S28_T07_VALIDATION_EVIDENCE.md` — SOWS quest requirement'ları kapsandı). `@lumi/world` 101 unit + `@lumi/story` 112 unit green; `pnpm build` + check-mojibake green. Backlog kapatır: S22/23'ten beri ertelenen quest world-state entity boşluğu.)

### Sprint 28 closeout

- Sprint 28 tamamlandı: T01–T07 tüm görevler yeşil (`@lumi/world` 101 unit, `@lumi/story` 112 unit).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: quest templates (authored quest definitions), quest log UI (Story Reader), `quest_seed` interaction → quest automation, accepted hook → story generation (LLM rendering) integration, quest rewards (geliştirme: mevcut `inventory_transaction` outcome ile).

- Sprint 29 — Quest Templates [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-29/SPRINT_SPEC.md`; S29-T01 `QuestTemplate` domain aggregate (keyed `templateKey`, N>=1 ordered objective defs key+title, `validateTemplateKey`/`validateObjectiveKey`, additive-only) ✅, 7 unit test; S29-T02 `quest_templates` + `quest_template_objectives` Drizzle schema + relations + forward-only migration `0007_quest_templates.sql` (unique `template_key`) ✅; S29-T03 `QuestTemplateService` (`createQuestTemplate`/`getQuestTemplateByKey`/`listQuestTemplates`) + `QuestTemplateRepository` port + `DrizzleQuestTemplateRepository` ✅, 7 service test; S29-T04 `instantiateQuestFromTemplate` (template → S28 `Quest` wiring: objectives mapping, `inactive`, household/world/session bind, `QuestService` üzerinden persist) ✅, unit + guarded integration; S29-T05 backlog validation evidence ✅: `docs/07-delivery/lumi/sprint-29/S29_T05_VALIDATION_EVIDENCE.md`), `@lumi/world` 115 unit (101 önceki + 14 yeni); `pnpm format:check | lint | typecheck | test | build` + check-mojibake green. Kapsar: S28 closeout'tan kalan _quest templates_ backlog adımı. PR #36.)

### Sprint 29 closeout

- Sprint 29 tamamlandı: T01–T05 tüm görevler yeşil (`@lumi/world` 115 unit test).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: quest log UI (Story Reader), `quest_seed` interaction → quest automation (template → quest), accepted hook → story generation (LLM rendering) integration, quest rewards (geliştirme: mevcut `inventory_transaction` outcome ile), template authoring UI/versioning.

- Sprint 30 — Quest Log UI (Story Reader) [tamamlandı] (spec: `docs/07-delivery/lumi/sprint-30/SPRINT_SPEC.md`; S30-T01 `getQuestsBySessionId` service exposure ✅ (`@lumi/world` `quest.service.ts` — mevcut `QuestRepository.findQuestsBySessionId` sarmalayıcısı, `getQuestsByWorldId` ile aynı şekil), quest.service testi; S30-T02 `GET /api/stories/sessions/[sessionId]/quests` route ✅ (`withParent` + `getOwnedHousehold` + `getStorySessionOrForbidden` gate, localized `statusLabel`/objective `statusLabel` — evidence/world internals sızdırılmaz), 5 web route testi (`story-session-quest-api.test.ts`); S30-T03 Story Reader "Gorev listesi" paneli ✅ (`story-reader-client.tsx` — `loadReader`'da paralel + optional fetch, quest card'ları + status badge + objective checklist, hata durumunda graceful degradation + uyarı), web 144 unit green; `pnpm format:check | lint | typecheck | test | build` + check-mojibake green. Kapsar: S29 closeout'tan kalan *quest log UI* backlog adımı. PR #37.)

### Sprint 30 closeout

- Sprint 30 tamamlandı: T01–T03 tüm görevler yeşil (`@lumi/world` 116 unit, `@lumi/web` 144 unit).
- `pnpm build` + `check-mojibake` green.
- Kalan backlog: `quest_seed` interaction → quest automation (template → quest), accepted hook → story generation (LLM rendering) integration, quest rewards (geliştirme: mevcut `inventory_transaction` outcome ile), template authoring UI/versioning.
