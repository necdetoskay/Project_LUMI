# Sprint 02 - Acceptance Traceability and Progress

## Document Status

- Version: **2.2**
- Status: **Complete**
- Last updated: **2026-07-27**
- Sprint: **LUMI-S02**

## Task Progress

| Task ID | Status | Evidence |
| --- | --- | --- |
| S02-T01 | Complete | Identity/session domain and ports implemented in `apps/web/lib/auth/` (7 files). Service layer covers register, login, logout, refresh rotation, reuse detection, password reset, remember-me, session revocation. |
| S02-T02 | Complete | Auth schema and migration in `apps/web/lib/auth/schema.ts` (3 tables: parent_accounts, parent_sessions, parent_password_reset_tokens). Migration script in `apps/web/scripts/auth-migrate.mjs`. PostgreSQL integration rerun passed 4/4 on 2026-07-27. |
| S02-T03 | Complete | All auth API routes implemented: `register`, `login`, `refresh`, `logout`, `me`, `forgot-password`, `reset-password` under `apps/web/app/api/auth`. Dual-mode (JSON + form submission) support. |
| S02-T04 | Complete | Auth screens: `/register`, `/login`, `/forgot-password`, `/reset-password`, protected `/app` boundary with server-side session check. Playwright rerun passed 6/6 on 2026-07-27. |
| S02-T05 | Complete | In-memory rate limiting (`lib/auth/rate-limit.ts`) and redacted auth audit logging (`lib/auth/audit.ts`) implemented and unit-tested. |
| S02-T06 | Complete | Sprint status, runbook, traceability and completion report updated with final evidence. |

## Acceptance Criteria

| Criterion | Status | Evidence File | Test | Execution Evidence |
| --- | --- | --- | --- | --- |
| Parent register/login/logout/me flow works with real PostgreSQL | **PASS** | `apps/web/tests/auth.integration.test.ts` | `auth.integration.test.ts` - register + session persistence | PostgreSQL rerun passed 4/4 on 2026-07-27 |
| Invalid credentials return a consistent envelope | **PASS** | `apps/web/tests/auth.test.ts` | `auth.test.ts` - invalid credential cases | Unit coverage present; browser/API verification in Playwright |
| Refresh rotation and reuse detection are automatically tested | **PASS** | `apps/web/tests/auth.test.ts`, `apps/web/tests/auth.integration.test.ts` | Unit + integration coverage exists | PostgreSQL rerun passed; unit coverage present |
| Cookie security flags follow environment policy | **PASS** | `apps/web/lib/auth/http.ts` | Code review | Cookie helper uses env-aware Secure flag |
| Revoked session cannot access protected endpoint | **PASS** | `apps/web/tests/auth.test.ts` | `auth.test.ts` - revoked or expired sessions return null | Unit coverage present; logout flow verified in Playwright |
| Rate limit and audit logs do not contain secrets or credentials | **PASS** | `apps/web/tests/auth.test.ts` | `auth.test.ts` - audit redaction test | Unit coverage present |
| Unauthorized users are rejected from protected route and API | **PASS** | `apps/web/tests/e2e/auth-smoke.spec.ts` | Playwright auth smoke suite | Playwright rerun passed 6/6 on 2026-07-27 |

## Verified Commands

Verified on 2026-07-27:

```powershell
pnpm --filter @lumi/profiles typecheck
pnpm --filter @lumi/profiles test
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test -- tests/auth.integration.test.ts
pnpm --filter @lumi/web test:e2e
```

## Acceptance Criteria -> File -> Test -> Evidence Mapping

| Acceptance Criterion | Source File | Test File | Test Name | Evidence |
| --- | --- | --- | --- | --- |
| Register/login/logout/me with PostgreSQL | `lib/auth/service.ts` | `auth.integration.test.ts` | "registers a parent and persists an active session" | PostgreSQL rerun passed |
| Consistent error envelope | `app/api/auth/login/route.ts` | `auth.test.ts` | "rejects login with non-existent email as INVALID_CREDENTIALS" | Unit coverage present |
| Refresh rotation + reuse | `lib/auth/service.ts` | `auth.integration.test.ts` | "rotates refresh sessions and revokes the whole family on token reuse" | PostgreSQL rerun passed |
| Cookie security flags | `lib/auth/http.ts` | - | Code review | `secure: serverEnvironment.AUTH_COOKIE_SECURE` |
| Revoked session rejection | `lib/auth/service.ts` | `auth.test.ts` | "returns null when session is revoked" | Unit coverage present |
| Rate limit + audit redaction | `lib/auth/rate-limit.ts`, `lib/auth/audit.ts` | `auth.test.ts` | "redacts client identifiers into hashes" | Unit coverage present |
| Unauthorized rejection | `lib/auth/with-parent.ts` | `auth-smoke.spec.ts` | "protected /app redirect" | Playwright rerun passed |

## Files Changed in This Close-out

| File | Change |
| --- | --- |
| `apps/web/tests/auth.integration.test.ts` | Added `AUTH_TEST_ENABLE_DESTRUCTIVE` safety guard, runtime skip fallback |
| `apps/web/tests/auth.test.ts` | Added auth coverage for duplicate email, invalid credentials, expired/revoked session, empty reset token, and session revocation edge cases |
| `apps/web/tests/e2e/auth-smoke.spec.ts` | New Playwright auth smoke tests, updated to use isolated users per test |
| `apps/web/playwright.config.ts` | Playwright config with chromium + server auto-start |
| `apps/web/package.json` | Added `start`, `test:e2e`, and `test:e2e:ui` scripts |
| `.env` | Added comment about `AUTH_TEST_ENABLE_DESTRUCTIVE` env var |
| `docs/07-delivery/lumi/sprint-02/COMPLETION_REPORT.md` | Updated with final evidence |
| `docs/07-delivery/lumi/sprint-02/ACCEPTANCE_TRACEABILITY.md` | Updated with final traceability status |
| `docs/07-delivery/lumi/sprint-02/AUTH_RUNBOOK.md` | Updated with final verification status |
| `docs/00-project/context/CURRENT_STATUS.md` | Updated to mark Sprint 02 complete |

## Notes

- PostgreSQL integration rerun passed 4/4.
- Playwright E2E rerun passed 6/6.
- Integration tests remain gated behind `AUTH_TEST_ENABLE_DESTRUCTIVE=true` to prevent accidental data loss.
- Playwright CI startup is fixed with `pnpm start`.