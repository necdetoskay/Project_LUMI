# Sprint 01-04 Review — Fix Report

## Summary

4 findings from the Sprint 01-04 review were fixed:

### Finding 1: AuthorizationError mapping in API routes

**Problem:** Route handlers checked `message.includes("not a member")` for 403 mapping, but `AuthorizationError` with different messages (e.g. `"Handoff does not belong to this child profile"`, `"Origin package does not belong to this child profile"`) fell through to 500.

**Fix:** Added `err.name === "AuthorizationError"` check alongside the existing `message.includes("not a member")` check in all 7 character-bootstrap and characters routes. This ensures any `AuthorizationError` (regardless of message content) maps to 403.

### Finding 2: Missing parent policy non-null assumption in consume flow

**Problem:** `consumeHandoffAndCreateCharacter` used `!` (non-null assertion) on the policy lookup result. If no policy existed for the household, accessing `policy.contentBoundary` would throw a cryptic runtime error.

**Fix:** Replaced the `!` assertion with an explicit null check that throws `ValidationError("MISSING_PARENT_POLICY", ...)`, matching the behavior in `generateAndPersistOriginPackages`. The consume route already maps `ValidationError` to 400 `VALIDATION_ERROR`, so no route change was needed.

### Finding 3: Nested transaction fragility in `markAccepted`

**Problem:** `consumeHandoffAndCreateCharacter` runs inside a `rawDb.transaction(...)` outer transaction. Inside it, `originPkgRepo.markAccepted(...)` opened another `this.db.transaction(...)`. This created a nested transaction (savepoint) with unreliable behavior guarantees in Drizzle/postgres-js.

**Fix:** Removed the inner `this.db.transaction(...)` wrapper from `markAccepted`. The two updates now run directly on `this.db`, which when called from within the outer transaction is the transaction executor. Atomicity is guaranteed by the outer transaction. When called outside a transaction, each statement auto-commits independently (caller responsibility for atomicity).

### Finding 4: Sprint status and date drift

**Problem:** Three inconsistencies:
- Sprint 02 spec said `Status: Active / In Progress` but completion evidence was complete.
- Sprint 03 spec said `Status: Planned / Agent-ready` but completion evidence was complete.
- Sprint 04 docs had `2026-03-19` timestamps while Sprint 02/03 evidence is `2026-07-27` — impossible chronological order.

**Fix:** Updated Sprint 02 and 03 spec status to `Completed`. Corrected Sprint 04 timestamps from `2026-03-19` to `2026-07-27` (same batch as Sprint 03 completion). CURRENT_STATUS last-updated set to `2026-07-28` with a correction note.

## Changed Files

### Code changes

| File | Change |
|------|--------|
| `apps/web/app/api/character-bootstrap/consume/route.ts:59` | Added `err.name === "AuthorizationError"` to 403 check |
| `apps/web/app/api/character-bootstrap/handoff/route.ts:54` | Added `err.name === "AuthorizationError"` to 403 check |
| `apps/web/app/api/character-bootstrap/status/route.ts:31` | Added `err.name === "AuthorizationError"` to 403 check |
| `apps/web/app/api/character-bootstrap/packages/route.ts:31` | Added `err.name === "AuthorizationError"` to 403 check |
| `apps/web/app/api/character-bootstrap/generate-packages/route.ts:35` | Added `err.name === "AuthorizationError"` to 403 check |
| `apps/web/app/api/characters/route.ts:29` | Added `err.name === "AuthorizationError"` to 403 check |
| `apps/web/app/api/characters/[id]/route.ts:36` | Added `err.name === "AuthorizationError"` to 403 check |
| `packages/profiles/src/application/character-bootstrap.service.ts:662-671` | Replaced `!` assertion with explicit null check + `ValidationError("MISSING_PARENT_POLICY", ...)` |
| `packages/profiles/src/db/repositories/drizzle/drizzle-character-origin-package.repository.ts:81-109` | Removed nested `this.db.transaction(...)` wrapper, direct updates |
| `packages/profiles/tests/integration/character-bootstrap.integration.test.ts` | Added DB-gated missing parent policy consume regression test |

### Doc changes

| File | Change |
|------|--------|
| `docs/07-delivery/lumi/sprint-02/SPRINT_SPEC.md` | Status: `Active / In Progress` → `Completed` |
| `docs/07-delivery/lumi/sprint-03/SPRINT_SPEC.md` | Status: `Planned / Agent-ready` → `Completed` |
| `docs/07-delivery/lumi/sprint-04/SPRINT_SPEC.md` | Timestamp `2026-03-19` → `2026-07-27` with correction note |
| `docs/07-delivery/lumi/sprint-04/COMPLETION_REPORT.md` | Timestamp `2026-03-19` → `2026-07-27` with correction note |
| `docs/07-delivery/lumi/sprint-04/ACCEPTANCE_TRACEABILITY.md` | Timestamp `2026-03-19` → `2026-07-27` with correction note |
| `docs/00-project/context/CURRENT_STATUS.md` | Last-updated: `2026-07-28` with correction note; Sprint 04 header timestamp corrected |

## Behavior Changes

1. **API 403 mapping:** All 7 character-bootstrap and characters routes now return 403 for any `AuthorizationError`, not just those with `"not a member"` in the message. Previously, `AuthorizationError("Handoff does not belong to this child profile")` and `AuthorizationError("Origin package does not belong to this child profile")` would fall through to 500.

2. **Missing policy behavior:** Consume flow now returns `ValidationError("MISSING_PARENT_POLICY")` (400 `VALIDATION_ERROR`) instead of a cryptic `TypeError` when no parent policy exists for the household. Matches the generate flow behavior.

3. **Transaction behavior:** `markAccepted` no longer opens a nested transaction. When called from within `consumeHandoffAndCreateCharacter`'s outer transaction, the two updates share that outer transaction. No change in public API or observable outcomes.

4. **Doc status/timestamps:** Sprint 02 and 03 correctly show `Completed`. Sprint 04 timestamps are corrected to `2026-07-27` to match Sprint 03 completion batch.

## Tests

### Commands executed and results

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm --filter @lumi/profiles typecheck` | **PASS** | No errors |
| `pnpm --filter @lumi/web typecheck` | **PASS** | No errors |
| `pnpm --filter @lumi/profiles test` | **81 passed, 17 skipped** | 17 integration tests skipped (DB destructive flag not set) |
| `pnpm --filter @lumi/web test` | **29 passed** | All web tests pass |
| `pnpm lint` | **12 pre-existing errors** | All 12 errors are from Sprint 03 files; my changes added 0 new lint errors |

### Tests not executed

- **DB destructive integration tests** (both `@lumi/profiles` and `@lumi/web` auth): Skipped because `PROFILE_TEST_ENABLE_DESTRUCTIVE=true` / `AUTH_TEST_ENABLE_DESTRUCTIVE=true` env flags + database URL are not set in the current environment. The character-bootstrap integration suite now includes 9 DB-gated tests, including missing parent policy and AuthorizationError service paths. They were not executed in this environment because the destructive DB flags and database URL were not set.

## Review Notes For Codex

1. **Sorun 1 (AuthorizationError mapping):** The fix adds `err.name === "AuthorizationError"` alongside existing `message.includes("not a member")` checks. The `message.includes("not a member")` check is kept as a safety net for backward compat. Consider whether a centralized `mapApiError(err)` helper in `apps/web/lib/http/response.ts` would reduce duplication across all 7 routes — I kept it minimal per the brief.

2. **Sorun 2 (missing policy):** The ValidationError message in consume matches generate exactly (`"Parent policy must exist before character bootstrap"`). The route layer already maps ValidationError → 400, so no route change was needed. Edge case: if someone passes a `householdId` that exists but has no policy, the error is now clean instead of crashy.

3. **Sorun 3 (nested transaction):** Removing the inner `this.db.transaction(...)` is safe because the only production call site (`consumeHandoffAndCreateCharacter`) wraps everything in an outer transaction. If `markAccepted` is ever called outside a transaction in the future, the two updates will auto-commit independently. Consider adding a `markAccepted` overload that accepts an optional transaction executor if atomicity outside a transaction becomes required.

4. **Sorun 4 (doc drift):** Sprint 04 timestamps corrected to `2026-07-27` to align with Sprint 03 completion batch. This is an educated correction — the original `2026-03-19` is clearly impossible since Sprint 04 depends on Sprint 03 (completed `2026-07-27`). If the actual completion date was different (e.g., `2026-07-28`), the correction note makes this explicit.

5. **Pre-existing lint errors (12 total):** These are from Sprint 03 files and were not touched per the "no unnecessary refactor" rule. They include `any` types in test files, unused variables, and unnecessary escape characters.
