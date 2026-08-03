# Sprint 05 Implementation Report

## Release Identity

- **Sprint:** LUMI-S05 – Observability and Operations Baseline
- **Version:** 0.1.0
- **Completion date:** 2026-07-28
- **Implementer:** opencode agent (deepseek-v4-flash-free)

## Task Completion

| Task ID | Deliverable | Status | Evidence |
|---|---|---|---|
| S05-T01 | Logger/redaction package | **PASS** | `packages/logger` – 59 unit tests, 0 failed |
| S05-T02 | Correlation propagation | **PASS** | All 21 API routes wrapped with `withObservedApiRoute`; `observeHandlerNoArg` accepts real request (no synthetic `new Request`); DB/repository boundary correlation contract tested (3 tests); error propagation preserves original error (3 tests); no-arg handler correlation preservation (3 tests); 18 correlation tests total |
| S05-T03 | Health/version/readiness endpoints | **PASS** | Updated with `withObservedApiRoute` wrapper, 6 contract tests |
| S05-T04 | Metrics/error adapters | **PASS** | No-op + safe adapter wired into app, all routes emit metric labels with normalized path patterns (UUID segments → `{id}`), 6 emission tests |
| S05-T05 | Alert/dashboard baseline | **PASS** | `infra/observability/alerts.json` + `dashboards.json` + 9 validation tests |
| S05-T06 | Incident/troubleshooting runbooks | **PASS** | 7 runbooks under `docs/ops/runbooks/` |

## File Changes

### New Files

- `packages/logger/` (new workspace package)
  - `src/index.ts` – public API exports
  - `src/logger.ts` – structured JSON logger with levels, redaction, correlation support
  - `src/redact.ts` – field-level redaction with allowlist/denylist
  - `src/safe-error.ts` – error serialization with secret string redaction
  - `src/correlation.ts` – UUID v4 generation, validation, AsyncLocalStorage propagation
  - `src/metrics.ts` – MetricsAdapter interface, no-op adapter, safe wrapper, label validation
  - `tests/safe-error.test.ts` – 12 tests
  - `tests/redaction.test.ts` – 14 tests
  - `tests/correlation.test.ts` – 11 tests
  - `tests/metrics.test.ts` – 13 tests
  - `tests/logger.test.ts` – 9 tests
  - `package.json`, `tsconfig.json`, `vitest.config.ts`

- `apps/web/proxy.ts` (Next.js 16 Proxy/Middleware convention) – correlation ID extraction/validation, response header, `correlation.invalid` counter emission
- `apps/web/lib/observability/` – observability infrastructure
  - `correlation.ts` – request-level correlation helpers
  - `metrics.ts` – runtime metrics emission functions with built-in path normalization (UUID → `{id}`)
   - `observed-api-route.ts` – `withObservedApiRoute(request, handler)` wrapper: sets correlation context, emits HTTP total/error/duration metrics, sets response header, `normalizePath()` for low-cardinality metric labels; catch block re-throws original error (not `new Error(path)`)
- `apps/web/tests/correlation.test.ts` – 18 tests (proxy, withObservedApiRoute propagation, DB/repository boundary contract, error propagation preservation, observeHandlerNoArg correlation preservation)
- `apps/web/tests/health.test.ts` – 1 test
- `apps/web/tests/version.test.ts` – 2 tests
- `apps/web/tests/metrics-observability.test.ts` – 6 tests (spy adapter emission verification)
- `apps/web/tests/observability-config.test.ts` – 9 tests
- `infra/observability/alerts.json` – 5 alert rules matching runtime metric names
- `infra/observability/dashboards.json` – 5-panel API overview dashboard
- `docs/ops/runbooks/` – 7 incident runbooks

### Modified Files

- `apps/web/proxy.ts` – renamed from `middleware.ts`, correlation header propagation
- All 21 API route handler files wrapped with `observeHandler` or `withObservedApiRoute`:
  - Auth: register, login, logout, me, refresh, forgot-password, reset-password
  - Households: create
  - Onboarding: get state
  - Parent policy: get, update
  - Child profiles: list, create, update by id, archive
  - Characters: list by household, get by id
  - Character bootstrap: handoff, generate-packages, consume, list packages, get status
- `apps/web/lib/auth/audit.ts` – uses `@lumi/logger` for structured logging
- `apps/web/lib/observability/metrics.ts` – path normalization added to all emission functions
- `apps/web/lib/observability/observed-api-route.ts` – `normalizePath()` utility, `observeHandler` with variadic params support, `observeHandlerNoArg`; catch re-throws original error instead of `new Error(path)`
- `apps/web/tests/readiness.test.ts` – updated (no longer test full response shape against live deps)
- `apps/web/package.json` – added `@lumi/logger` dependency
- `docs/07-delivery/lumi/sprint-05/IMPLEMENTATION_REPORT.md` – updated with final state

### Deleted Files

- `apps/web/middleware.ts` → renamed to `apps/web/proxy.ts` (Next.js 16 proxy convention)

### Pre-existing (unchanged)

- `apps/web/lib/readiness.ts` – low-level TCP/PING check functions (unchanged)
- `packages/profiles/` – no changes
- `apps/web/tests/auth.test.ts` – 22 tests (unchanged)
- `apps/web/tests/auth.integration.test.ts` – 4 tests (unchanged)
- `apps/web/tests/e2e/` – 25 Playwright tests (unchanged)

## Test Results

| Suite | Tests | Status |
|---|---|---|
| `@lumi/logger` – logger | 9/9 | PASS |
| `@lumi/logger` – redaction | 14/14 | PASS |
| `@lumi/logger` – correlation | 11/11 | PASS |
| `@lumi/logger` – metrics | 13/13 | PASS |
| `@lumi/logger` – safeError | 12/12 | PASS |
| `@lumi/web` – auth | 22/22 | PASS |
| `@lumi/web` – readiness | 3/3 | PASS |
| `@lumi/web` – health | 1/1 | PASS |
| `@lumi/web` – version | 2/2 | PASS |
| `@lumi/web` – correlation | 18/18 | PASS |
| `@lumi/web` – metrics-observability | 6/6 | PASS |
| `@lumi/web` – observability-config | 9/9 | PASS |
| `@lumi/web` – smoke | 1/1 | PASS |
| `@lumi/web` – auth integration (skipped) | 4/4 | PASS (skipped) |
| `@lumi/profiles` – domain + policy | 81/81 | PASS (unchanged) |
| **Total Vitest** | **203** | **PASS** |
| Playwright E2E | 25/25 | PASS (unchanged) |

## Acceptance Traceability

| Acceptance Criteria | Evidence |
|---|---|
| HTTP isteği API boyunca aynı correlation zinciriyle izlenir | `withObservedApiRoute` + AsyncLocalStorage; valid incoming ID log'da aynen görünür; response header set edilir; DB/repository boundary testi `getCorrelationId()` erişilebilirliğini doğrular |
| Redaction tüm secret/PII türlerini maskeler | 14 denylist pattern; test fixture'ları password/token/secret/cookie/session/authorization/prompt/story/email/child data için kanıt |
| Liveness dependency kontrol etmez | `/api/health` statik Response, hiçbir IO çağırmaz |
| Readiness PostgreSQL durumunu güvenli timeout ile değerlendirir | `checkTcpUrl` 1500ms timeout, catch ile hatayı yutar, public response sadece status/checkedAt döndürür |
| Version endpoint commit/build metadata secret olmadan verir | `LUMI_APP_VERSION` / `LUMI_GIT_COMMIT` env vars; test DATABASE_URL/REDIS_URL/PASSWORD/TOKEN sızdırmadığını doğrular |
| Error rate/latency eşikleri için alarm kuralı doğrulanır | `alerts.json` 5 kural; validation test metric isimlerini ve runbook path'lerini doğrular |
| Runbook yaygın startup/DB/migration/health hatalarını kapsar | 7 runbook dokümanı |

## Known Risks and Deferred Items

1. **pnpm lint root failure**: `pnpm lint` fails on `@lumi/profiles` – **pre-existing blocker** (12 ESLint errors: unused variables, unnecessary escape characters, `any` type usage in test files). Not introduced by Sprint 05. Sprint 05 new code (`@lumi/logger` and `@lumi/web`) passes lint with 0 errors.

2. **Metrics adapter is no-op by default**: Runtime metrics emission functions exist and are wired, but the adapter is no-op. To activate, call `configureMetricsAdapter(realAdapter)` at app startup with a vendor-specific adapter (e.g., Prometheus, OpenTelemetry). The safe wrapper ensures adapter failures never break business flow.

3. **Database-layer correlation tracking**: DB/repository boundary correlation contract is defined and tested (`getCorrelationId()` accessible at application layer with AsyncLocalStorage propagation). Concrete repository implementations that read/write correlation ID to database tables is deferred.

4. **Rate limiting is process-local**: Auth rate limiting (`AUTH_RATE_LIMIT_MAX_REQUESTS`) remains process-local; distributed rate limiting requires Redis-based implementation.

5. **Redaction is field-name based**: The `redact()` function matches field names (case-insensitive). It does not perform deep content inspection of arbitrary string values. Secrets inside error messages/stack traces are handled by `safeError()` with its own regex-based SECRET_PATTERNS.

## Rollback Plan

- **New package**: Remove `packages/logger/` directory, revert `apps/web/package.json` dependency, run `pnpm install`
- **Proxy convention**: Revert `proxy.ts` → `middleware.ts`
- **Route changes**: Revert all route files to original `export async function GET/POST` pattern
- **Observability lib**: Remove `apps/web/lib/observability/`
- **Infra config**: Remove `infra/observability/`, `apps/web/tests/observability-config.test.ts`
- **Runbooks**: Remove `docs/ops/runbooks/`
- **Test files**: Remove `tests/correlation.test.ts`, `tests/health.test.ts`, `tests/version.test.ts`, `tests/metrics-observability.test.ts`

## Verification Commands

| Command | Result |
|---|---|
| `pnpm --filter @lumi/logger typecheck` | PASS |
| `pnpm --filter @lumi/logger test` | **59/59** PASS |
| `pnpm --filter @lumi/web lint` | PASS |
| `pnpm --filter @lumi/web typecheck` | PASS |
| `pnpm --filter @lumi/web test` | **66/66** PASS |
| `pnpm build` | PASS (compiled successfully) |
| `pnpm lint` | FAIL (pre-existing `@lumi/profiles` issues; see Known Risks) |
| `pnpm --filter @lumi/web test:e2e` | **25/25** PASS |
