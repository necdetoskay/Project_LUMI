# Sprint 07 — Inventory and Persistent Objects

**Sprint ID:** LUMI-S07  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 06 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Karakter ve world object'leri için sahiplik, konum, anlam ve geçmişi koruyan
atomik inventory sistemi kurmak.

## In Scope

- item definition, instance, inventory and entry models;
- character/household/location ownership;
- quantity, uniqueness, capacity and transfer rules;
- item state, provenance and append-only ownership history;
- meaningful item metadata and story references;
- create/acquire/transfer/use/archive use cases;
- domain events, APIs and integration tests.

## Out of Scope

- gelişmiş crafting ve economy simulation;
- AI'nin serbestçe item üretmesi;
- payment/commerce;
- Story Outcome Commit System;
- görsel asset generation.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S07-T01 | Inventory/item domain | `packages/inventory/domain` | unit |
| S07-T02 | Schema and ownership constraints | database/inventory | PostgreSQL integration |
| S07-T03 | Transfer/use/archive services | inventory/application | transaction tests |
| S07-T04 | Inventory APIs | web API | contract + authorization |
| S07-T05 | Provenance/events/audit | inventory/events | integration |
| S07-T06 | Inventory docs and examples | `docs/` | review |

## Requirements

- Bir unique item aynı anda birden fazla owner/location taşıyamaz.
- Transfer kaynak sahipliği, hedef kapasitesi ve scope doğrulaması yapar.
- Ownership history append-only'dir.
- Story text doğrudan inventory değiştiremez.
- Archive fiziksel silme değildir.
- Meaningful metadata schema validation olmadan JSONB'ye yazılamaz.

## Acceptance Criteria

- Acquire, transfer, consume/use ve archive atomik çalışır.
- Concurrent transfer aynı item'i iki owner'a veremez.
- Yetkisiz Family Space transferi reddedilir.
- Duplicate request idempotent sonuç verir.
- Item history tüm sahiplik zincirini yeniden kurabilir.
- İlgisiz inventory ve character state'i değişmez.

## Quality Gate and Rollback

Domain, PostgreSQL transaction/concurrency, API contract, isolation ve
idempotency testleri zorunludur. Başarısız transfer hiçbir kısmi kayıt
bırakmamalıdır.

## Coding Agent Mission

Persistent object ve inventory temelini uygula. Economy/crafting veya backlog
Story Outcome davranışını kapsam içine alma.

