# S19-T01 — Threat / Isolation Audit Evidence

**Sprint:** LUMI-S19  
**Task:** S19-T01 — Threat/isolation audit fixes  
**Status:** Implemented (PR #23 logic, PR #24 prettier follow-up)  
**Method:** Static review of all `apps/web/app/api/**/route.ts` (interactive) plus service-layer scope verification in `@lumi/profiles`, `@lumi/world`, `@lumi/story`, `@lumi/privacy`. Auth entry point: `withParent(handler)` → `parent: { id, email, displayName }` from session token (`apps/web/lib/auth/with-parent.ts`).

## Summary

| Finding | Severity | Verdict | Status |
| --- | --- | --- | --- |
| Story session mutators bypass `getStorySessionOrForbidden` (5 routes) | **P0 / IDOR** | Exploitable cross-household session mutation | **Fixed** |
| `world/[id]/recap` passes `parent.id` (user id) instead of householdId | P2 / logic bug (DoS for own users) | Gate always raised → denial, no leak | **Fixed** |
| `world/[id]/movement` GET reads by client `characterId` after only world-scope gate | P1 / IDOR | Unauthenticated-ish cross-family location/movement read | **Fixed** |
| `characters/[id]/relationships` stores cross-household `targetCharacterId` | P3 / integrity | Reference injection of foreign character id | **Fixed** |

**Not in scope for code change (verified clean):** client-side `crypto.randomUUID()` (none in client components — AGENTS.md constraint honored via `newIdempotencyKey()`); cache/Redis layer (Redis referenced only for health-check PING; no cache keys to namespace); all other route families (world, inventory, characters, parent-policy, privacy, onboarding, settings, auth plumbing) already gate through `assertMembership`/`assertWorldAccess`/`assertScope`/`getStorySessionOrForbidden`.

## 1. Findings & Fixes

### H1 (P0) — Cross-household story-session mutation (5 routes) — FIXED

**Root cause:** `resumeSession`, `advanceSession`, `pauseSession`, `completeSession`, `abandonSession`
(`packages/story/src/application/story-session.service.ts`) resolve the session via `repo.findSessionById(db, sessionId)` keyed only on `sessionId`. The route only verified the caller's *household* claim (`getOwnedHousehold`), never that the session belongs to that household. An authenticated parent of household A could pass their own `householdId` in the query plus another household's `sessionId` in the path.

**Fix:** call `getStorySessionOrForbidden(sessionId, householdId)` (which throws `AuthorizationError` on household mismatch) before each mutating service call, mirroring the existing pattern in `choices/[choicePointId]/commit/route.ts`.

Files changed:
- `apps/web/app/api/stories/sessions/[sessionId]/advance/route.ts`
- `apps/web/app/api/stories/sessions/[sessionId]/resume/route.ts`
- `apps/web/app/api/stories/sessions/[sessionId]/pause/route.ts`
- `apps/web/app/api/stories/sessions/[sessionId]/complete/route.ts`
- `apps/web/app/api/stories/sessions/[sessionId]/abandon/route.ts`

Evidence of fix (pause route):
```ts
try {
  await getStorySessionOrForbidden(sessionId, householdId);   // <-- H1 gate
  const result = await pauseSession({ sessionId, expectedVersion, idempotencyKey });
  return NextResponse.json(result);
} catch (error) {
  return handleStoryError(error, "Failed to pause session"); // AuthorizationError -> 403
}
```

### H2 (P2) — `world/[id]/recap` wrong authorization argument — FIXED

**Root cause:** `getWorldOrForbidden(worldId, householdId)` (`packages/world/src/application/world-auth.service.ts:32`) compares `world.householdId !== householdId`, but the route passed `parent.id` (a user UUID) as the second argument. Since a user id ≠ household id, the gate could never pass → the endpoint was effectively broken (403 for its own legitimate users), a denial rather than a leak.

**Fix:** resolve the parent's owned household (`getOwnedHousehold(parent.id)`) and pass `household.id` to both `getWorldOrForbidden` and `buildRecap`.

File changed: `apps/web/app/api/world/[id]/recap/route.ts`

### H3 (P1) — `world/[id]/movement` GET unscoped `characterId` — FIXED

**Root cause:** after `assertWorldAccess(worldId, household.id)`, the GET handler read `getCharacterCurrentLocation(characterId)` and `getCharacterMovementHistory(characterId)` (`packages/world/src/application/movement.service.ts:168,178`), each keyed purely by `characterId` with no household/world scope. A caller with a valid household and world could supply any `characterId` to read another family's location/movement history.

**Fix:** added `assertCharacterWorldAccess(characterId, householdId)` to `world-auth.service.ts`, which resolves the character's world via `findWorldByCharacterId` and asserts the household matches, called before the reads. Exported from `@lumi/world`.

Files changed:
- `packages/world/src/application/world-auth.service.ts` (new guard)
- `packages/world/src/application/index.ts` (export)
- `apps/web/app/api/world/[id]/movement/route.ts` (call guard)

### H4 (P3) — `characters/[id]/relationships` cross-household reference — FIXED

**Root cause:** `addRelationship` (`packages/profiles/src/application/character-domain.service.ts:719`) validated the source character but stored `relationship.targetCharacterId` without confirming it belongs to the same household — allowing a parent to write a relationship pointing at a foreign family's character UUID.

**Fix:** assert the target character's household membership before persisting, using the existing `assertCharacterScope(targetCharacterId, householdId, repos)`.

File changed: `packages/profiles/src/application/character-domain.service.ts`

## 2. Regression Tests

`apps/web/tests/story-session-mutation-idor.test.ts` — 6 tests, all passing:
- Each of the 5 mutator routes returns 403 when `getStorySessionOrForbidden` throws `AuthorizationError`, and its underlying service (`pauseSession`/`resumeSession`/`completeSession`/`abandonSession`/`advanceSession`) is **not** called.
- Positive case: returns 200 and calls the service exactly once when the session belongs to the caller's household.

Pattern: same mock harness as `story-reader-api.test.ts` (`withParent` stubbed to `{ id: "parent-user-id" }`, services mocked via `vi.mock`).

## 3. Verification (AGENTS.md gate)

- `pnpm --filter @lumi/story lint` ✅  · `--filter @lumi/world lint` ✅  · `--filter @lumi/profiles lint` ✅  · `--filter @lumi/web lint` ✅ `--max-warnings=0`
- `pnpm --filter @lumi/story typecheck` ✅ · world ✅ · profiles ✅ · web ✅
- `pnpm --filter @lumi/story test` ✅ (40) · `--filter @lumi/world test` ✅ (73) · `--filter @lumi/profiles test` ✅ (232) · `--filter @lumi/web test` ✅ (138, incl. 6 new)
- `pnpm --filter @lumi/web build` ✅
- `node scripts/check-mojibake.mjs` ✅ PASS
- CI `validate` (prettier) on PR #24 ✅ PASS

## 4. Out-of-band notes (no code change)

- **Client `crypto.randomUUID()`:** none in `apps/web/app/**` components. AGENTS.md constraint honored.
- **Cache/Redis:** `REDIS_URL` referenced only in env + a readiness PING check. No KV/cache substrate exists, so no cache-key namespace risk. Re-flag if a cache layer is introduced.
- **Integration tests:** destructive DB tests require `*_TEST_ENABLE_DESTRUCTIVE=true` and are skipped by default; none were added in this task.
