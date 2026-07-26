# Sprint 14 — World Time and Background Simulation

**Sprint ID:** LUMI-S14  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 08 and Sprint 13 exit gates  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

World Clock, event scheduling, relevance-budgeted background life ve çocuğun
yokluğunda en fazla on gün süren azalan yoğunluklu güvenli simülasyonu kurmak.

## In Scope

- World Clock, calendar, season and time-phase;
- simulation checkpoint/run/plan/effect records;
- entity relevance bubble and simulation budget;
- NPC routine/intent evaluation hooks;
- ecology, household, settlement and environment hooks;
- scheduled/conditional/player-preserved world events;
- offline catch-up, freeze and “Sen yokken…” recap;
- idempotent worker/job orchestration and observability.

## Out of Scope

- NPC Emergent Interaction inbox;
- Story Outcome Commit System;
- irreversible critical events while child is absent;
- full civilization/economy simulation;
- minute-by-minute simulation of every entity.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S14-T01 | World clock/event policy | `packages/simulation/time` | unit |
| S14-T02 | Relevance/budget planner | simulation/planning | deterministic/property |
| S14-T03 | Simulation run/effect persistence | database/simulation | PostgreSQL integration |
| S14-T04 | Background worker/idempotency | `services/worker` or jobs module | integration |
| S14-T05 | Return recap API | web API | contract + narrative parity |
| S14-T06 | Simulation runbook/fixtures | tests, `docs/` | E2E |

## Requirements

- 1–3 gün normal ama güvenli; 4–7 gün azaltılmış; 8–10 gün yalnızca küçük ve
  düşük etkili gelişmeler; 10 günden sonra freeze.
- Çocuğun karakteri onun yokluğunda seçim yapmaz.
- Kritik/irreversible event `player-preserved` veya `pending` kalır.
- Uzak/alakasız entity ayrıntılı simüle edilmez.
- Her effect rule/evidence ve idempotency key taşır.
- “Sen yokken…” yalnızca committed event'leri özetler.

## Acceptance Criteria

- 1, 5, 9 ve 14 günlük yokluk fixture'ları doğru policy segmentini uygular.
- 14 günlük yoklukta yalnızca ilk 10 gün sınırlı ilerler, sonrası donar.
- Retry aynı run/effect'i ikinci kez uygulamaz.
- Yaralı/ilgili NPC, alakasız NPC'den daha yüksek değerlendirme alır.
- Kritik event child dönmeden resolve olmaz.
- Return recap DB event'leriyle tutarlıdır.

## Quality Gate and Rollback

Clock/policy unit, property, PostgreSQL, worker retry/idempotency, failure
injection, 10-day freeze ve recap parity E2E testleri zorunludur. Başarısız run
son güvenli checkpoint'e döner.

## Coding Agent Mission

Sınırlı background simulation'ı uygula; dünya büyümesini kontrolsüz bırakma ve
backlog sistemlerini kapsam içine alma.

