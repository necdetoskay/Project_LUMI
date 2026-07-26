# Sprint 17 — World Map, Characters and Inventory UX

**Sprint ID:** LUMI-S17  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 08 and Sprint 16 exit gates  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Çocuğun yaşayan dünyasını, keşfedilen konumları, karakterlerini ve anlamlı
eşyalarını sade ve güvenli bir arayüzde incelemesini sağlamak.

## In Scope

- world/region/location map view;
- discovered/locked/available location states;
- “Haritayı İncele” entry and location detail;
- character list/detail and relationship-safe summaries;
- inventory item cards, provenance and next-story selection;
- current events/world news read-only feed contract;
- responsive/accessibility and empty/error states;
- scoped query APIs and E2E.

## Out of Scope

- free-form map editor;
- NPC Emergent interaction delivery;
- trading/crafting economy;
- real-time multiplayer;
- simulation policy changes.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S17-T01 | Map query/read model | world/query + API | integration |
| S17-T02 | Map/location UI | `apps/web/components/world` | component + E2E |
| S17-T03 | Character views | web/characters | component + authorization |
| S17-T04 | Inventory views/selection | web/inventory | integration |
| S17-T05 | World news read model | world/events/query | contract |
| S17-T06 | Accessibility/UX docs | tests, `docs/` | audit |

## Requirements

- UI yalnızca discovered/authorized bilgi gösterir.
- Child Profile scope server query'de zorunludur.
- Locked location nedeni yaşa uygun ve spoiler içermeyen biçimde gösterilir.
- Item selection ownership ve availability ile doğrulanır.
- Character özeti özel memory veya gizli belief bilgisini açığa çıkarmaz.
- Map canonical World State'i doğrudan değiştirmez.

## Acceptance Criteria

- World hierarchy ve current location doğru gösterilir.
- Keşfedilmemiş bölge ayrıntısı sızmaz.
- Item sonraki session için seçilir; sahip olunmayan item reddedilir.
- Character/inventory cross-child erişimi engellenir.
- World news yalnızca committed, görünür event'leri kullanır.
- Keyboard/screen reader/responsive ana akışları geçer.

## Quality Gate and Rollback

Query integration, API authorization, component/accessibility, spoiler/privacy
ve browser E2E testleri zorunludur. UI feature flag ile geri alınabilir;
canonical domain state etkilenmez.

## Coding Agent Mission

Read-model tabanlı map/character/inventory deneyimini uygula. Backlog emergent
interaction veya world mutation davranışı ekleme.

