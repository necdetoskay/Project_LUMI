# Runbook: Release Monitoring & Incident Response

**Scope:** Sprint 20 (S20-T05). Operational review of monitoring, alert
thresholds, and incident escalation for the LUMI release candidate.

## 1. Service surface

The shipped container publishes only the **web service** (compose exposes
`WEB_PORT` only; postgres `5432` and redis `6379` are internal-only). All
observability therefore starts at the web tier and the DB.

## 2. Liveness / readiness

- `GET /api/health` — HTTP 200 = healthy.
- Docker `HEALTHCHECK` (in `Dockerfile`) probes `/api/health` every 15s
  (5s timeout, 30s start, 5 retries).
- Alert: **web container unhealthy for > 90s** → page on-call.

## 3. Error rate & latency (web)

| Metric | Threshold | Action |
| --- | --- | --- |
| 5xx rate, 5-min window | > 1% | Create incident; route to `apps/web`. |
| 4xx rate, 5-min window | > 5% (spike) | Check client regressions; if 401/403 spike, review access guards. |
| p95 latency `/api/sessions/[id]/advance` | > 500 ms | Investigate story engine; scale if CPU-bound. |
| p95 latency all other web routes | > 1000 ms | Investigate; treat as P1 if sustained > 2 min. |

These thresholds mirror the S20-T04 load-test gap recommendation (see
`docs/07-delivery/lumi/sprint-20/S20-T04_VERIFICATION.md`).

## 4. Household isolation (security)

- Alert: **any response from a household-scoped endpoint whose `householdId`
  does not match the authenticated session** → page on-call + block IP.
  Baseline: 0 (enforced by `getStorySessionOrForbidden` +
  `assertCharacterWorldAccess`, verified in `story-session-mutation-idor.test.ts`).

## 5. Database

- Connection pool utilization (`postgres`): alert > 80% sustained 5 min.
- Slow query: any single query > 2 s in production → investigate via
  `pg_stat_statements`.
- Disk: alert > 85% (Postgres `lumi` db growth must stay bounded by seed
  + session data).

## 6. Incident escalation

1. **Detect** — alert fires (web unhealthy / 5xx / latency / isolation).
2. **Triage** — on-call checks `docs/ops/runbooks/` (startup-failure,
   high-error-rate, high-latency, db-failure, missing-correlation).
3. **Contain** — if household isolation breached, disable the offending
   endpoint via feature flag and rotate any leaked credentials.
4. **Resolve** — forward-fix (no rollback; see `release-runbook.md`);
   tag as `0.1.1`.
5. **Review** — post-incident blameless note appended to
   `docs/07-delivery/lumi/sprint-20/` under `S20_T<incident>.md`.

## 7. Handoff checklist (for whoever owns the RC deploy)

- [ ] RC tag `v0.1.0-rc.1` points at approved commit.
- [ ] Image labels verified (`version` + `revision`).
- [ ] Staging smoke test green (web health + household scope).
- [ ] Owner SHA-bound approval recorded.
- [ ] Monitoring thresholds above are live (or explicitly accepted as
      TODO-ON-FIRST-DEPLOY if infra is not yet wired).
- [ ] On-call contact + paging schedule known.
