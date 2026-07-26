# Sprint 10 — Choice and Session Consequence

**Sprint ID:** LUMI-S10  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 09 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Interactive story içindeki choice point, choice option ve session-local
consequence kayıtlarını deterministik ve izlenebilir biçimde uygulamak.

## In Scope

- choice point/option contracts and availability rules;
- hint and consequence preview metadata;
- committed choice and immutable choice history;
- session-local consequence evaluation;
- character/session context input validation;
- decision evidence and explanation;
- choice APIs, idempotency and tests;
- completed session outcome candidate contract.

## Out of Scope

- canonical world-state mutation;
- Story Outcome & World State Commit System;
- autonomous NPC decision engine;
- generated story text;
- reward economy.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S10-T01 | Choice/consequence domain | `packages/story/choice` | unit |
| S10-T02 | Availability/rule evaluator | story/application | table-driven unit |
| S10-T03 | Persistence and idempotency | database/story | integration |
| S10-T04 | Choice commit APIs | web API | contract + concurrency |
| S10-T05 | Outcome candidate contract | story/contracts | schema tests |
| S10-T06 | Traceability and examples | `docs/` | review |

## Requirements

- Bir choice point yalnızca bir kez commit edilir.
- Option availability server-side canonical session context ile hesaplanır.
- Hint sonuç garantisi vermez; yaşa uygun ve manipülatif olmayan dil kullanır.
- Consequence yalnızca session-local state ve outcome candidate üretir.
- `evidenceSceneId`, choice ve rule version izlenir.
- LLM kural sonucunu veya DB state'ini belirleyemez.

## Acceptance Criteria

- Geçerli option tek kez commit edilir ve doğru transition oluşur.
- Kilitli/geçersiz option reddedilir.
- Concurrent iki seçimden yalnızca biri başarılı olur.
- Retry duplicate choice/consequence oluşturmaz.
- Choice history append-only ve açıklanabilirdir.
- Outcome candidate world state'i değiştirmeden schema-valid üretilir.

## Quality Gate and Rollback

Rule unit, property-based boundary, PostgreSQL concurrency/idempotency, API
contract ve interactive session E2E testleri zorunludur. Yanlış kural version'ı
yeni version ile düzeltilir; geçmiş choice silinmez.

## Coding Agent Mission

Choice ve session-local consequence sistemini uygula. Backlog'daki Story Outcome
Commit Engine'i etkinleştirme veya canonical world değişikliği yazma.

