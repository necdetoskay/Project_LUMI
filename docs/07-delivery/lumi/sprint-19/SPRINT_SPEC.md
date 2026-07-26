# Sprint 19 — Security, Cost, Performance and Reliability

**Sprint ID:** LUMI-S19  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 18 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Release öncesinde uçtan uca güvenlik, veri izolasyonu, maliyet, performans ve
operasyonel dayanıklılık açıklarını kapatmak.

## In Scope

- threat model and permission matrix verification;
- Family Space/Child Profile isolation audit;
- dependency, secret and container scanning;
- rate limit, abuse and prompt-injection hardening;
- query/index/cache and bundle optimization;
- AI/media budget quotas and circuit breakers;
- queue retry/DLQ/idempotency verification;
- backup/restore, failure injection and load tests;
- accessibility and privacy regression.

## Out of Scope

- yeni ürün özelliği;
- backlog engine implementation;
- unsafe deadline-driven security exception;
- admin bypass or protection weakening;
- premature microservice split.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S19-T01 | Threat/isolation audit fixes | all modules | security |
| S19-T02 | Dependency/secret/container hardening | CI/infra | scan |
| S19-T03 | DB/API/frontend performance | database/web | benchmark |
| S19-T04 | AI/media cost controls | ai/media policy | boundary tests |
| S19-T05 | Worker/retry/DR verification | jobs/operations | failure injection |
| S19-T06 | Hardening evidence/report | `docs/` | review |

## Requirements

- Security finding P0/P1 release öncesinde kapanır.
- Family/child scope her repository, API, worker ve cache key'de doğrulanır.
- Cache authoritative state değildir ve scope içermeyen key kullanamaz.
- AI/media budget aşımı güvenli degradation uygular.
- Retry duplicate business effect üretmez.
- Performance optimizasyonu correctness veya safety kuralını atlayamaz.

## Acceptance Criteria

- Cross-family attack suite geçer.
- Secret/dependency/container scan'de açık P0/P1 yoktur.
- Kritik endpoint ve reader akışı onaylı latency/error hedefini karşılar.
- AI/media quota ve circuit breaker testleri geçer.
- Queue retry/DLQ ve duplicate delivery state'i bozmaz.
- Backup restore ve controlled failure drill başarıyla raporlanır.

## Quality Gate and Rollback

Security, load, soak, failure injection, restore, accessibility ve privacy
regression paketleri zorunludur. Her optimizasyon için ölçüm ve geri alma planı
bulunur; korumalar geçici olarak kapatılamaz.

## Coding Agent Mission

Yeni özellik eklemeden sistemi sertleştir. Bulguları kanıtla kapat; güvenlik
kapısını aşmak için admin/bypass kullanma.

