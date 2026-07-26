# Sprint 03 — Household and Child Profiles

**Sprint ID:** LUMI-S03
**Version:** 1.0.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 02 exit gate
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Ebeveynin Family Space içinde household oluşturmasını ve izole, yaşa uygun
child profile'ları güvenle yönetmesini sağlamak.

## In Scope

- Family Space, household, membership and ownership model;
- child profile create/read/update/archive;
- display name, age band, interests and experience preferences;
- parent policy, content boundary and time-limit preferences;
- parent/guardian ownership and role checks;
- onboarding UI and profile switcher;
- first-run character type entry point and manual/Auto origin choice handoff;
- profile audit history and soft archive;
- isolation, validation and API contracts.

## Out of Scope

- gerçek dünya çocuğuna ait gereksiz kişisel bilgiler;
- voice biometric veya hassas sağlık verisi;
- character, world and story creation;
- recommendation/learning engine;
- NPC Emergent Interaction Engine.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S03-T01 | Household/profile domain model | `packages/profiles` | unit |
| S03-T02 | Scoped repositories and migrations | database/profile | PostgreSQL integration |
| S03-T03 | Household/child profile APIs | `apps/web/app/api` | contract + authorization |
| S03-T04 | Parent onboarding and profile UI | `apps/web` | component + E2E |
| S03-T05 | Parent policy validation | profiles/policy | unit + security |
| S03-T06 | Privacy and lifecycle documentation | `docs/` | review |

## Functional and Technical Requirements

- Her child profile tam olarak bir Family Space'e aittir.
- Server authenticated membership'ten Family Space scope üretir.
- Client `familySpaceId` veya role beyanı güven kaynağı değildir.
- Yaş doğrudan gerekmiyorsa age band kullanılır.
- Profile archive geçmişi silmez; aktif listeden kaldırır.
- Parent policy değişiklikleri append-only audit izi üretir.
- JSONB tercihleri Zod/schema validation olmadan yazılamaz.

## Acceptance Criteria

- Parent kendi household ve child profile'larını yönetebilir.
- Başka Family Space'e ait profile ID ile erişim her endpoint'te reddedilir.
- Guardian izinleri parent policy sınırlarını aşamaz.
- Geçersiz yaş/tercih/policy kombinasyonu kaydedilemez.
- Arşivlenen profil yeni session başlatamaz fakat geçmişi korunur.
- Onboarding klavye, ekran okuyucu ve responsive kullanım sağlar.
- Isolation testleri repository ve API seviyesinde geçer.

## Quality Gate and Rollback

Unit, repository integration, API authorization, cross-family security ve
onboarding E2E testleri zorunludur. Migration additive olmalı; profile archive
geri alınabilir. Completion report privacy ve ownership kanıtlarını içerir.

## Coding Agent Mission

Household ve Child Profile foundation'ını uygula. Çocuk için story, character
ve world üretme; sonraki sprintlere ait domain tablolarını ekleme.

## Character Origin Handoff

Sprint 03 owns the child-facing entry point for first-run character setup. It must let the child choose a broad character type and then select either manual setup or Auto generation.

Sprint 03 does not create the final world. It hands the selected intent to the Character Domain and World Bootstrap sprints using the canonical first-run documents:

- [First-Run Character Onboarding](../../../02-product/experience/first-run-character-onboarding.md)
- [Character Origin and World Bootstrap](../../../03-domain-design/characters/character-origin-and-world-bootstrap.md)
