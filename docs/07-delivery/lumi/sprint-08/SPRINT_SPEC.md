# Sprint 08 — World, Region and Home Domain

**Sprint ID:** LUMI-S08  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 07 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Universe → Region → Location hiyerarşisini, canonical World State'i ve
home/household yaşam alanlarını kalıcı domain modeli olarak kurmak.

## In Scope

- World aggregate and lifecycle;
- region, subregion, location and accessibility;
- World State/version/checkpoint foundation;
- character active-location movement;
- home, household residence and shared-space links;
- environment snapshot: time phase, weather and season references;
- world/location/object events and APIs;
- world bootstrap and archive behavior.

## Out of Scope

- offline/background simulation;
- autonomous NPC decisions;
- full map UI;
- economy/civilization simulation;
- Story Outcome Commit System.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S08-T01 | World/region/location aggregates | `packages/world/domain` | unit |
| S08-T02 | World/home/location schema | database/world | PostgreSQL integration |
| S08-T03 | Bootstrap/move/checkpoint use cases | world/application | integration |
| S08-T04 | World/location APIs | web API | contract + authorization |
| S08-T05 | World events and continuity | world/events | replay/invariant tests |
| S08-T06 | World/home docs and seed fixture | `docs/`, seeds | review + smoke |

## Requirements

- World State tek canonical gerçekliktir ve version taşır.
- Her world tam olarak bir owning Child Profile/Family Space scope taşır.
- Character hareketi erişilebilir Location'a immutable event ile kaydedilir.
- Geçmiş world event sessizce değiştirilemez.
- Home aidiyeti ile aktif physical residence ayrıdır.
- World bootstrap deterministik seed/version üretir.

## Acceptance Criteria

- İzole bir child world oluşturulup region/location/home yapısı bootstrap edilir.
- Character geçerli konuma taşınır; erişilemez konum reddedilir.
- Aynı character iki aktif Location'da görünmez.
- Checkpoint hash/version ile tekrar okunabilir.
- Cross-child world erişimi repository/API seviyesinde engellenir.
- Archive edilen world yeni session başlatamaz, geçmişi korunur.

## Quality Gate and Rollback

Domain invariant, PostgreSQL, event/replay, API contract, isolation ve bootstrap
smoke testleri zorunludur. World history destructive rollback ile silinemez.

## Coding Agent Mission

World, Region, Location ve Home domain temelini uygula; zaman ilerletme veya NPC
simulation başlatma.

