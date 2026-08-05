# Sprint 18 — Parent Panel and Safety Controls

**Sprint ID:** LUMI-S18  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 03, Sprint 16 and Sprint 17 exit gates  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Ebeveynin child profile, içerik politikaları, kullanım tercihleri ve güvenli
özetleri yönetebildiği; çocuğun mahremiyetini koruyan parent paneli üretmek.

## In Scope

- household/profile management;
- age/content/topic/time policy controls;
- story/session and world activity summaries;
- parent-visible memory controls at approved abstraction;
- media/cost preference controls;
- policy version/audit history;
- consent and data lifecycle actions;
- accessible parent UI and authorization tests.

## Out of Scope

- çocuğun bütün özel konuşmalarını ham biçimde göstermek;
- gizli izleme veya davranış puanlama;
- support/admin impersonation;
- clinical/psychological diagnosis;
- backlog feature activation.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S18-T01 | Parent policy domain/use cases | `packages/parent-policy` | unit |
| S18-T02 | Policy/audit persistence | database/policy | integration |
| S18-T03 | Parent panel APIs | web API | contract + authorization |
| S18-T04 | Dashboard/settings UI | `apps/web` parent routes | component + E2E |
| S18-T05 | Consent/export/archive flows | privacy/application | security + integration |
| S18-T06 | Parent/safety runbooks | `docs/` | review |

> Note (2026-08-05): T01-T04 initial slice implemented in `codex/sprint-18-parent-panel`
> (`DrizzleParentPolicySource` production adapter, blockedTopics/customNotes surface,
> audit trail GET, `/app/settings/safety` parent panel + nav). T05 initial slice
> implemented (2026-08-05): new `@lumi/privacy` package — consent records
> (grant/revoke, household + child scope), metadata-only child data export
> (`lumi-child-v1`), archive orchestration (child profile + world archive), lifecycle
> audit trail; API routes `/api/privacy/consent`, `/api/privacy/consent/[id]`,
> `/api/privacy/export`, `/api/privacy/archive`, `/api/privacy/audit`; privacy schema
> migration `0001_privacy_schema.sql` applied to production. T06 runbooks delivered
> (2026-08-05): `PARENT_PANEL_RUNBOOK.md` and `SAFETY_OPERATIONS_RUNBOOK.md`. Purge
> (async job) remains a planned follow-up slice outside this sprint.

## Requirements

- Parent policy safety baseline'ı gevşetemez.
- Değişiklikler versioned ve audit edilir.
- Parent yalnızca kendi Family Space'ini yönetebilir.
- Child experience özeti veri minimizasyonu uygular.
- Memory controls erase-history yanılsaması yaratmaz; archive/visibility ve
  retention politikaları açıkça ayrılır.
- Support/admin erişimi ayrı yetki ve audit gerektirir.

## Acceptance Criteria

- Parent policy değişikliği sonraki context/generation kararına uygulanır.
- Başka household/profile paneline erişim engellenir.
- Ham story/prompt/memory içeriği gereksiz biçimde gösterilmez.
- Consent/export/archive akışı kimlik doğrulama ve audit üretir.
- Policy conflict güvenli olan kural lehine çözülür.
- Parent panel responsive ve erişilebilir ana akışları geçer.

## Quality Gate and Rollback

Policy unit, persistence, API authorization, cross-family, privacy regression,
consent ve browser E2E testleri zorunludur. Policy version rollback edilebilir;
audit geçmişi korunur.

## Coding Agent Mission

Ebeveyn kontrol ve görünürlüğünü veri minimizasyonuyla uygula; gözetim,
manipülasyon veya backlog sistemi ekleme.

