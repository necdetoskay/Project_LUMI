# Sprint 03 - Acceptance Traceability and Progress

## Document Status

- Version: **1.1**
- Status: **Complete**
- Last updated: **2026-07-27**
- Sprint: **LUMI-S03**

## Task Progress

| Task ID | Status | Evidence |
| --- | --- | --- |
| S03-T01 | Complete | Household/profile domain model in `packages/profiles/src/domain/`. 4 test files with 62 unit tests covering validation, create, archive, members, preferences, character handoff. |
| S03-T02 | Complete | Profile schema migration (`0001_profile_schema.sql`) creates `profile` schema with 7 tables. Drizzle repositories in `packages/profiles/src/db/repositories/drizzle/`. 8/8 PostgreSQL integration tests passed with destructive DB flag enabled; when the flag is absent, the suite now skips instead of reporting false-green passes. |
| S03-T03 | Complete | All profile API routes implemented under `apps/web/app/api/`: `households`, `child-profiles`, `child-profiles/[id]`, `child-profiles/[id]/archive`, `onboarding`, `parent-policy`. Contract and authorization tests in Playwright cover cross-family rejection, validation, unauthenticated access, and duplicate-household conflict. |
| S03-T04 | Complete | Onboarding UI (`/app/onboarding`) and profiles page (`/app/profiles`) implemented. Playwright E2E coverage for full onboarding flow and profile archive. Unauthenticated redirect tested. |
| S03-T05 | Complete | Policy validation in `packages/profiles/src/policy/validator.ts`. Unit tests cover input validation, guardian permission checks, age-band consistency. 13 tests pass. Repository-level policy enforcement tested in integration suite. |
| S03-T06 | Complete | This traceability table, completion report, and CURRENT_STATUS.md updated with final evidence. |

## Acceptance Criteria

| Criterion | Status | Evidence File | Test | Execution Evidence |
| --- | --- | --- | --- | --- |
| Parent can manage its own household and child profiles | **PASS** | `apps/web/tests/e2e/profiles-smoke.spec.ts` | Full CRUD flow test | Playwright rerun passed 15/15 on 2026-07-27 |
| Access with a profile ID from another Family Space is rejected on every endpoint | **PASS** | `apps/web/tests/e2e/profiles-smoke.spec.ts`, `packages/profiles/tests/integration/profile-repository.integration.test.ts` | Cross-family access test, cross-household isolation | Playwright cross-family test now targets foreign resources; integration isolation test remains in place |
| Guardian permissions cannot exceed parent policy boundaries | **PASS** | `packages/profiles/tests/policy/policy-validator.test.ts`, `packages/profiles/tests/integration/profile-repository.integration.test.ts` | checkGuardianPermission test, non-owner policy write rejection | Unit + integration coverage |
| Invalid age/preference/policy combinations cannot be saved | **PASS** | `packages/profiles/tests/domain/validation.test.ts`, `packages/profiles/tests/domain/child-profile.test.ts`, `packages/profiles/tests/domain/parent-policy.test.ts` | Validation + domain + policy tests | Unit coverage across 3 test files |
| Archived profile cannot start session but history remains | **PASS** | `packages/profiles/tests/domain/child-profile.test.ts` | Archive behavior tests | Soft-delete + `listByHousehold` filter |
| Onboarding supports keyboard, screen-reader and responsive usage | **PASS** | `apps/web/app/app/onboarding/page.tsx` | Code review | Semantic HTML with aria-labels, keyboard-navigable forms |
| Isolation tests pass at repository and API level | **PASS** | `packages/profiles/tests/integration/profile-repository.integration.test.ts`, `apps/web/tests/e2e/profiles-smoke.spec.ts` | Integration + E2E isolation tests | 8/8 integration + cross-family Playwright |
| First-run character intent can be captured without downstream records | **PASS** | `packages/profiles/tests/domain/child-profile.test.ts` | Character origin handoff test | Domain validation + `first_run_handoffs` table |

## Verified Commands

Verified on 2026-07-27:

```powershell
pnpm --filter @lumi/profiles typecheck
pnpm --filter @lumi/profiles test          # 78/78 passed
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test:e2e           # Playwright profile E2E
```

## Acceptance Criteria -> File -> Test -> Evidence Mapping

| Acceptance Criterion | Source File | Test File | Test Name | Evidence |
| --- | --- | --- | --- | --- |
| Manage household and profiles | `app/api/households/route.ts`, `app/api/child-profiles/route.ts` | `profiles-smoke.spec.ts` | "full flow: register -> create household -> create child profile -> list -> archive" | Playwright passed |
| Cross-family rejection | `app/api/child-profiles/route.ts`, `packages/profiles/src/application/child-profile.service.ts` | `profiles-smoke.spec.ts`, `profile-repository.integration.test.ts` | "cross-family access is rejected", "does not expose profile across households" | Playwright + integration passed |
| Guardian permissions | `packages/profiles/src/policy/validator.ts`, `packages/profiles/src/db/repositories/drizzle/drizzle-parent-policy.repository.ts` | `policy-validator.test.ts`, `profile-repository.integration.test.ts` | "denies AI content when approval required", "rejects policy writes from non-owners" | Unit + integration passed |
| Invalid combinations | `packages/profiles/src/domain/validation.ts` | `validation.test.ts`, `child-profile.test.ts`, `parent-policy.test.ts` | Age band, display name, policy validation edge cases | Unit coverage present |
| Archive behavior | `packages/profiles/src/domain/child-profile.ts` | `child-profile.test.ts` | "supports archive", "prevents character handoff on archived profile" | Unit coverage present |
| First-run handoff | `packages/profiles/src/domain/child-profile.ts` | `child-profile.test.ts` | "sets character origin handoff" | Unit coverage present |

## Files Changed in This Close-out

| File | Change |
| --- | --- |
| `apps/web/tests/e2e/profiles-smoke.spec.ts` | New Playwright E2E tests for profile API contract/authorization and UI flows; fixed duplicate-household and cross-family assertions |
| `apps/web/app/app/onboarding/page.tsx` | Fixed age band display (`9-11` -> `9-12`) |
| `packages/profiles/tests/integration/profile-repository.integration.test.ts` | Fixed `__dirname` to `import.meta.url` for ESM; restored real skip semantics for DB-gated tests |
| `docs/07-delivery/lumi/sprint-03/COMPLETION_REPORT.md` | New completion report with final evidence |
| `docs/07-delivery/lumi/sprint-03/ACCEPTANCE_TRACEABILITY.md` | New traceability document |
| `docs/00-project/context/CURRENT_STATUS.md` | Updated to mark Sprint 03 complete |

## Notes

- PostgreSQL integration rerun passed 8/8.
- Playwright E2E rerun passed for all profile tests.
- Integration tests remain gated behind `PROFILE_TEST_ENABLE_DESTRUCTIVE=true` to prevent accidental data loss.
- The DB-gated integration suite now skips cleanly when destructive flags are not provided, avoiding false-green evidence.
