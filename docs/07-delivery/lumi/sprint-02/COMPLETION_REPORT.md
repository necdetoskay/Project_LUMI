# Sprint 02 Completion Report

## Release identity

- Application version: `0.1.0`
- Commit SHA: `working-tree`
- Completion date: `2026-07-27`
- Implementer: `Codex + user workspace changes + opencode agent`
- Reviewer: `Pending`
- Sprint status: `Complete - acceptance evidence collected`

## Outcome summary

Sprint 02 parent authentication foundation is complete. The core auth flows,
safety mechanisms, and acceptance criteria are implemented and verified with
final evidence collected on 2026-07-27. The current slice delivers:

- Parent registration, login, logout
- Protected `/app` boundary
- `/api/auth/me` session lookup
- Refresh rotation and refresh-token reuse detection
- Remember-me session support
- Forgot-password and reset-password flow
- In-memory auth rate limiting
- Redacted auth audit logging
- Cookie security flags (httpOnly, SameSite, Secure policy)

## Environment

- OS: `Windows / PowerShell`
- Node: `>=22 <25` project requirement
- pnpm: `11.7.0` project requirement
- Docker: `Required for local PostgreSQL and Redis validation`
- PostgreSQL: `Configured at 172.41.42.51:15432`
- ORM: `Direct pg driver for current auth slice`
- Playwright: `1.62.0` for browser E2E coverage

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `pnpm auth:migrate` | PASS | Auth schema applied successfully on 2026-07-27 |
| `pnpm --filter @lumi/profiles typecheck` | PASS | Verified in current session |
| `pnpm --filter @lumi/profiles test` | PASS | Verified in current session |
| `pnpm --filter @lumi/web typecheck` | PASS | Verified in current session |
| `pnpm --filter @lumi/web test -- tests/auth.integration.test.ts` | PASS | 4/4 PostgreSQL integration tests passed on 2026-07-27 |
| `pnpm --filter @lumi/web test:e2e` | PASS | 6/6 Playwright auth E2E tests passed on 2026-07-27 |
| PostgreSQL destructive auth integration | PASS | Guarded by `AUTH_TEST_ENABLE_DESTRUCTIVE=true`, rerun completed |

## Acceptance criteria

Reference: [`ACCEPTANCE_TRACEABILITY.md`](./ACCEPTANCE_TRACEABILITY.md)

| Criterion | Status | Evidence |
|---|---|---|
| Parent register/login/logout/me flow works with real PostgreSQL | PASS | PostgreSQL integration tests passed; browser/API flow also covered in Playwright |
| Invalid credentials return a consistent envelope | PASS | Unit coverage present; browser/API verification in Playwright |
| Refresh rotation and reuse detection are automatically tested | PASS | Covered in unit and PostgreSQL integration suites |
| Cookie security flags follow environment policy | PASS | `AUTH_COOKIE_SECURE` policy enforced in `lib/auth/http.ts` |
| Revoked session cannot access protected endpoint | PASS | Unit coverage present; logout/session invalidation covered in Playwright |
| Rate limit and audit logs do not contain secrets or credentials | PASS | Unit coverage present |
| Unauthorized users are rejected from protected route and API | PASS | Playwright verifies `/app` redirect and `/api/auth/me` 401 behavior |

## Database

- Auth migration: `Implemented and verified with pnpm auth:migrate`
- Tables expected: `parent_accounts`, `parent_sessions`, `parent_password_reset_tokens`
- PostgreSQL integration tests: `4/4 passed on 2026-07-27`
- Safety guard: `Requires AUTH_TEST_ENABLE_DESTRUCTIVE=true - will TRUNCATE auth tables`

## Auth verification

| Feature | Status | Evidence |
|---|---|---|
| Register form | Implemented | `/register` page + POST `/api/auth/register` |
| Login form | Implemented | `/login` page + POST `/api/auth/login` |
| Logout flow | Implemented | POST `/api/auth/logout` + cookie clear |
| Protected app redirect | Implemented | `/app` redirects to `/login` when unauthenticated |
| Refresh rotation | Implemented | Unit + integration tested |
| Refresh reuse detection | Implemented | Unit + integration tested |
| Forgot/reset password flow | Implemented | With development preview token for non-production |
| Remember-me | Implemented | Session expiry and DB flag verified |
| Confirm-password validation | Implemented | Schema validation in register and reset |
| Rate limit | Implemented | In-memory, configurable window/max requests |
| Audit logging | Implemented | Redacted IP/email hashes |
| Cookie security | Implemented | httpOnly, SameSite=Lax, Secure based on env |

## Security verification

| Check | Status | Details |
|---|---|---|
| Password hashing | PASS | Argon2id (memoryCost: 19456, timeCost: 2) |
| Refresh token storage | PASS | SHA-256 hash only in DB |
| Reuse detection | PASS | Revokes entire session family on reuse |
| Rate limiting | PASS | Per-action + per-identifier, in-memory |
| Log redaction | PASS | IP and email SHA-256 partial hash |
| Safe error responses | PASS | Consistent error envelope, no detail leakage |
| Unauthorized access | PASS | 401 for API, redirect for pages |

## Test coverage

### Unit tests (22 tests in auth.test.ts)
- Token creation and hashing (1)
- Request body reader JSON and form (2)
- Auth schema validation (3)
- Audit log redaction (1)
- Rate limiting (1)
- Refresh session rotation and reuse detection (3)
- Register duplicate email error path (1)
- Login with non-existent email (1)
- Login with wrong password (1)
- getParentFromSessionToken with undefined/expired/revoked (3)
- revokeParentSession with undefined/token (2)
- requestPasswordReset for non-existent email (1)
- resetParentPassword with invalid token (1)

### Integration tests (4 tests in auth.integration.test.ts)
- Register parent + session persistence in PostgreSQL
- Remember-me=false short session
- Refresh rotation + reuse detection
- Password reset full flow

### E2E tests (6 tests in auth-smoke.spec.ts)
- Register via API + session cookie + /me (browser-level)
- Login via API + /me + logout (browser-level)
- Invalid credentials consistent 401
- Protected /app redirect to /login
- /api/auth/me 401 for unauthenticated
- Forgot-password + reset-password full flow

## Safety mechanisms

1. **Auth integration tests** require `AUTH_TEST_ENABLE_DESTRUCTIVE=true` env var (matches profiles package pattern). Without this, all integration tests are skipped.
2. **E2E tests** create isolated unique users per test case, reducing order dependence and cross-test coupling.
3. **Auth migration** is idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

## Known issues

1. **Password reset uses dev preview link**: Non-production environments expose a preview token instead of sending email. Email delivery integration is future work (outside Sprint 02).
2. **Auth rate limiting is process-local**: Not distributed across multiple processes. Redis-based rate limiting is future work.

## Sign-off

- Product: `Pending`
- Engineering: `Pending`
- Quality: `Pending`