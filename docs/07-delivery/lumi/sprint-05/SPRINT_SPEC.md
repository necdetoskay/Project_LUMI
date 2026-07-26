# Sprint 05 — Observability and Operations Baseline

**Sprint ID:** LUMI-S05  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 04 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Uygulama, API, veritabanı ve background işlerinin güvenli biçimde
gözlemlenmesini; hataların correlation zinciriyle teşhis edilmesini sağlamak.

## In Scope

- structured JSON logging and redaction;
- correlation/trace IDs across HTTP, DB and outbox;
- liveness, readiness and version/build endpoints;
- error reporting adapter;
- baseline metrics and latency/error counters;
- health dependency timeout and degraded-state policy;
- operational dashboards/alerts as configuration;
- troubleshooting and incident runbooks.

## Out of Scope

- vendor-specific lock-in;
- production autoscaling;
- business analytics and child behavior profiling;
- raw prompt, story, token or child data logging;
- full SRE maturity work.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S05-T01 | Logger/redaction package | `packages/logger` | unit + security |
| S05-T02 | Correlation propagation | web/application/database | integration |
| S05-T03 | Health/version endpoints | `apps/web/app/api` | contract |
| S05-T04 | Metrics/error adapters | observability package | unit + integration |
| S05-T05 | Alert/dashboard baseline | `infra/observability` | config validation |
| S05-T06 | Incident/troubleshooting runbooks | `docs/` | operational review |

## Functional and Technical Requirements

- Loglar yapılandırılmış, seviyeli ve makinece aranabilir olmalıdır.
- Password, token, cookie, secret, personal child data ve ham AI içerikleri
  redact edilir.
- Readiness dependency timeout uygular ve hata ayrıntısını public response'a
  sızdırmaz.
- Correlation ID dış girdiden alınırsa doğrulanır; yoksa server üretir.
- Metrics düşük kardinaliteli olmalıdır.
- Observability failure ana business transaction'ı sessizce bozamaz.

## Acceptance Criteria

- Bir HTTP isteği API, application, DB ve outbox boyunca aynı correlation
  zinciriyle izlenir.
- Redaction test fixture'larındaki tüm secret/PII türlerini maskeler.
- Liveness dependency kontrol etmez; readiness PostgreSQL durumunu güvenli
  timeout ile değerlendirir.
- Version endpoint commit/build metadata'sını secret olmadan verir.
- Beklenen error rate/latency eşikleri için alarm kuralı doğrulanır.
- Runbook yaygın startup, DB, migration ve health hatalarını kapsar.

## Quality Gate and Rollback

Unit, integration, contract, redaction regression ve degraded dependency smoke
testleri zorunludur. Vendor adapter kapatıldığında uygulama temel loglamayla
çalışmaya devam etmelidir.

## Coding Agent Mission

Gözlemlenebilirlik altyapısını kur; kullanıcı gözetimi veya davranış profilleme
özelliği üretme. Log içeriğinde çocuk güvenliğini ve veri minimizasyonunu koru.

