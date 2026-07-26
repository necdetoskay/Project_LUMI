# Sprint 04 — PostgreSQL Domain Core

**Sprint ID:** LUMI-S04  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 03 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Mevcut identity/profile tablolarını ortak, sürümlenebilir PostgreSQL ve Drizzle
persistence mimarisinde birleştirip sonraki domain sprintleri için güvenli veri
temeli kurmak.

## In Scope

- `packages/database` Drizzle configuration and schema organization;
- migration registry, idempotent seed and test database lifecycle;
- repository/query service conventions;
- transaction and optimistic version abstraction;
- domain event envelope, append-only audit and transactional outbox;
- UUID/PK/FK/ownership, timestamp and soft-delete standards;
- validated JSONB and pgvector extension preparation;
- index, retention and schema evolution baseline.

## Out of Scope

- bütün gelecekteki domain tablolarını erken oluşturmak;
- production data migration without approved plan;
- MongoDB or Redis as authoritative datastore;
- business UI;
- Story Outcome Commit System.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S04-T01 | Shared database package and config | `packages/database` | config unit |
| S04-T02 | Migration/seed lifecycle | migrations, scripts | clean + upgrade integration |
| S04-T03 | Repository and transaction ports | database/application | integration |
| S04-T04 | Event, audit and outbox baseline | database/events | atomicity integration |
| S04-T05 | Index/version/retention standards | schema + docs | schema assertions |
| S04-T06 | Backup/restore developer verification | scripts/runbook | smoke |

## Functional and Technical Requirements

- PostgreSQL authoritative state'tir; Redis yalnızca geçici koordinasyon sağlar.
- Migration isimleri sıralı ve immutable'dır.
- Uygulama başlangıcı production schema'yı otomatik değiştiremez.
- Business mutation ve outbox kaydı aynı transaction içindedir.
- Repository sorguları Family Space scope'u zorunlu parametre olarak taşır.
- JSONB ve vector alanları gerekçesiz kullanılmaz.
- Schema drift CI içinde tespit edilir.

## Acceptance Criteria

- Temiz PostgreSQL üzerinde migration + seed tek komutla çalışır.
- Sprint 02–03 verisi upgrade sırasında korunur.
- Transaction rollback kısmi audit/outbox/business state bırakmaz.
- Duplicate seed ve retry idempotenttir.
- Cross-family repository query testleri geçer.
- Schema, FK, unique, check ve index beklentileri otomatik doğrulanır.
- Backup alınır ve ayrı test veritabanına restore edilir.

## Quality Gate and Rollback

Gerçek PostgreSQL integration zorunludur; mock repository yeterli değildir.
Migration temiz kurulum, upgrade, rollback/forward-fix ve restore senaryolarında
test edilir. Destructive migration ayrı insan onayı olmadan uygulanamaz.

## Coding Agent Mission

Persistence platformunu kur ve yalnızca mevcut/sonraki sprintlerin gerektirdiği
şemaları ekle. Arşivdeki prototip kodu doğrudan production modülü sayma.

