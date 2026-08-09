# ULTEF-LUMI Sprint 00 — Test Inventory

Status: DISCOVERY IN PROGRESS
Date: 2026-08-08

This file is intentionally evidence-first. Items are marked `VERIFIED`, `PARTIAL`, or `TO DISCOVER`; absence from this first pass is not treated as proof that a test does not exist.

## Root orchestration

| Item | Status | Observation |
|---|---|---|
| Root test command | VERIFIED | `pnpm test` → `turbo run test` |
| Turbo test task | VERIFIED | Depends on `^build`; declares `coverage/**` outputs |
| Workspace scope | VERIFIED | `apps/*`, `services/*`, `packages/*`, `tooling/*` |
| Dedicated ULTEF runner | TO DISCOVER / NOT YET ESTABLISHED | Sprint 00 target |
| Machine-readable ULTEF gate summary | NOT YET ESTABLISHED | Sprint 00 target |

## Recent verification evidence from repository history

The latest Sprint 34 closeout commit reports:

- `@lumi/npc-intelligence`: 171 unit tests green;
- `@lumi/web`: 152 unit tests green;
- guarded `opportunity-inbox.integration.test.ts`;
- root `format:check`, `lint`, `typecheck`, `test`, `build`, and mojibake check green.

This confirms meaningful existing automated verification and also highlights an ULTEF concern: guarded integration tests must expose whether they actually executed or were skipped because prerequisites were unavailable.

## Preliminary ULTEF interpretation

| Level | First-pass status | Reason |
|---|---|---|
| L0 Contract | PARTIAL/UNKNOWN | API/Zod/schema validation is present in code and recent route tests exist; full contract-test inventory pending |
| L1 Domain | PARTIAL | Recent world/story/NPC commits explicitly report domain unit tests |
| L2 Infrastructure | PARTIAL | Guarded DB integration tests exist; execution coverage and migration/persistence breadth pending |
| L3 Component/Agent | PARTIAL | Large package unit suites exist; engine-by-engine classification pending |
| L4 Integration | PARTIAL/UNKNOWN | Guarded integration and cross-package flows exist; complete chain coverage pending |
| L5 Quality | UNKNOWN | Dedicated narrative-quality/rubric suite not yet verified |
| L6 Golden Headless E2E | UNKNOWN | Canonical full journey not yet verified |
| L7 Adversarial/Regression | PARTIAL/UNKNOWN | Unit regression cases likely exist; dedicated adversarial catalog pending |
| L8 Real Provider/Model Eval | UNKNOWN | Dedicated benchmark harness not yet verified |
| L9 UI E2E | UNKNOWN | Browser E2E runner/config not yet verified |
| PX-LUMI | NOT YET FORMALIZED | Existing tests may satisfy parts; formal mapping pending |

## Discovery backlog

- [ ] Enumerate every workspace package and its `package.json` test scripts.
- [ ] Enumerate test/config file conventions.
- [ ] Identify the concrete test runner(s) and versions.
- [ ] Map domain tests for profiles/world/story/NPC intelligence and other engines.
- [ ] Inventory database integration tests and their guard conditions.
- [ ] Inventory fixtures/fakes/seeds/test factories.
- [ ] Inventory provider mocks and any live-provider tests.
- [ ] Inventory web route tests.
- [ ] Verify whether browser E2E/Playwright/Cypress exists.
- [ ] Inventory GitHub Actions workflows and exact test commands.
- [ ] Identify skipped tests and environment-dependent execution paths.
- [ ] Map existing tests into ULTEF without moving/duplicating them unnecessarily.

## Discovery rule

No ULTEF level becomes `COVERED` based only on test count. Coverage requires evidence that the tests prove the intended semantics and that mandatory scenarios actually execute.
