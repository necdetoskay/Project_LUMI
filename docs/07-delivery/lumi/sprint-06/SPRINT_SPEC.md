# Sprint 06 — Character Domain

**Sprint ID:** LUMI-S06
**Version:** 1.0.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 05 exit gate
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Çocuk avatarları ve NPC'ler için kalıcı, çok boyutlu ve izlenebilir Character
aggregate temelini kurmak.

## In Scope

- Character aggregate, type, lifecycle and active location;
- character origin package fields required for first-run bootstrap;
- trait/personality vectors and bounded evolution;
- emotion state, needs, goals and temporary conditions;
- child avatar and NPC separation;
- directional relationship foundation;
- character memory references, not full retrieval;
- character repository, APIs and domain events;
- Family Space/Child Profile ownership.

## Out of Scope

- autonomous NPC planning and emergent interactions;
- full memory retrieval/consolidation;
- inventory behavior;
- final world bootstrap execution;
- world simulation;
- irreversible aging/death automation.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S06-T01 | Character aggregate and invariants | `packages/characters/domain` | unit |
| S06-T02 | Character/trait/emotion/goal schema | database/character | PostgreSQL integration |
| S06-T03 | Scoped repositories/use cases | characters/application | integration + isolation |
| S06-T04 | Character APIs | web API | contract + authorization |
| S06-T05 | Domain events and audit | characters/events | integration |
| S06-T06 | Character architecture/traceability | `docs/` | review |

## Requirements

- Trait, emotion and influence concepts tek sayıya indirgenmez.
- Trait değişimi bounded, evidence-linked ve append-only history ile
  izlenebilir olmalıdır.
- Relationship yönlüdür; A'nın B'ye güveni B'nin A'ya güveni değildir.
- Child avatar onun yokluğunda kendi adına seçim yapamaz.
- Character aynı anda yalnızca tek aktif Location taşıyabilir.
- NPC state, memory ve relationship ayrı veri alanlarıdır.

## Acceptance Criteria

- Child avatar ve NPC create/read/update akışları scope içinde çalışır.
- Geçersiz trait/emotion vector boyutu reddedilir.
- Trait delta sınırı ve evidence zorunluluğu test edilir.
- Cross-family ve cross-child erişim engellenir.
- Location invariant ve optimistic version conflict testleri geçer.
- Character mutation doğru domain event/audit kaydını üretir.

## Quality Gate and Rollback

Domain unit, PostgreSQL repository, API contract, isolation ve concurrency
testleri zorunludur. Schema additive migration kullanır; history kaydı
silinmez. Completion report invariant kanıtlarını içerir.

## Coding Agent Mission

Canonical Character belgelerini uygula; NPC'lere planlama, söylenti veya
background autonomy ekleme.

## Character Origin Requirement

Sprint 06 must model the accepted Origin Package at the Character aggregate boundary. Character type and subtype are not only display fields; they influence initial traits, needs, affinities and the first world bootstrap handoff.

The implementation must follow:

- [Character Origin and World Bootstrap](../../../03-domain-design/characters/character-origin-and-world-bootstrap.md)
