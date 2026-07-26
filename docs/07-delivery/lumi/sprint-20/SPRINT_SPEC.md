# Sprint 20 — Release Candidate

**Sprint ID:** LUMI-S20  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 19 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Project LUMI'nin ilk release candidate'ını tekrarlanabilir build, migration,
operasyon, güvenlik ve ürün kabul kanıtlarıyla hazırlamak.

## In Scope

- release scope freeze and final traceability;
- versioning, changelog and release notes;
- production-like build/artifact;
- migration rehearsal and rollback/forward-fix plan;
- smoke, regression, security and load gate;
- backup/restore and disaster recovery rehearsal;
- deployment/operations/incident runbooks;
- known limitations and handoff;
- release candidate tag preparation and human approval.

## Out of Scope

- yeni özellik veya tasarım değişikliği;
- backlog activation;
- başarısız kalite kapısını atlama;
- otomatik production deployment without approval;
- force merge/admin bypass.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S20-T01 | Scope freeze/traceability | release docs | review |
| S20-T02 | Version/build artifact | repository/CI | reproducibility |
| S20-T03 | Migration/restore rehearsal | database/operations | staging drill |
| S20-T04 | Full release test suite | tests | regression/security/load |
| S20-T05 | Runbooks/monitoring/handoff | `docs/`, infra | operational review |
| S20-T06 | RC PR/tag and approval package | GitHub/release | human gate |

## Requirements

- Release artifact aynı commit ve lockfile'dan yeniden üretilebilir.
- Migration staging snapshot üzerinde prova edilir.
- Rollback mümkün değilse açık forward-fix ve restore kararı bulunur.
- Release notes kullanıcı etkisi, migration ve known limitations içerir.
- Production secret/config repository'ye yazılmaz.
- RC yalnızca exact reviewed commit SHA için hazırlanır.

## Acceptance Criteria

- Tüm sprint acceptance traceability kapanmıştır veya onaylı limitation taşır.
- Format/lint/typecheck/unit/integration/E2E/build başarılıdır.
- Security/load/restore gate geçer; açık P0/P1 yoktur.
- Fresh install ve supported upgrade smoke testleri geçer.
- Monitoring, alert ve incident escalation prova edilir.
- Product/engineering owner exact RC SHA için yazılı onay verir.

## Quality Gate and Rollback

Release checklist, full regression, security, accessibility, performance,
migration, backup/restore ve operational readiness zorunludur. Landing/deploy
öncesinde exact PR/commit için insan onayı alınır; başarısız gate release'i
durdurur.

## Coding Agent Mission

Yeni kapsam üretmeden release candidate'ı doğrula ve paketle. Her sonucu gerçek
komut/artefact kanıtıyla raporla; production'a kendiliğinden deploy etme.

