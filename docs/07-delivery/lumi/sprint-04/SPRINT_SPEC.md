# Sprint 04 — PostgreSQL Domain Core

**Sprint ID:** LUMI-S04
**Version:** 1.1.0
**Status:** Completed (scope re-aligned to Character Bootstrap Downstream Foundation, see notes)
**Depends On:** Sprint 03 exit gate
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Scope Re-alignment Note (v1.1.0 - 2026-07-27, timestamp corrected from legacy 2026-03-19)

Sprint başlangıç planı `packages/database` ortak paket, migration registry,
repository convention, outbox/audit/event baseline hedefliyordu. Product owner'ın
bu oturumda verdiği direktif ve Sprint 03 exit gate (first_run_handoffs tablosunun
consume edilmemesi, character/world bootstrap handoff boundary) nedeniyle
Sprint 04 çıktısı **Karakter Bootstrap Minimum Downstream Foundation** olarak
uygulandı. Orijinal S04-T01..T06 platform taskları deferred backlog'a kaydırıldı
(Sprint 05+).

## Goal

Sprint 03'ün bıraktığı first-run character handoff noktasını tüketerek karakter
başlangıç akışını uçtan uca kapatmak; minimum karakter domain persistence'ını,
deterministik origin package üreticisini, handoff idempotency ledger'ını ve
karakter onboarding UI + API katmanını mevcut mimariye uyumlu şekilde eklemek.

## In Scope (uygulanan)

- Character domain: `LumiCharacter` aggregate, validation, CharacterState, safetyBounds,
  originPackage contract matching;
- Additive migration `0002_character_bootstrap_schema.sql` altında 3 yeni tablo:
  `profile.lumi_characters`, `profile.character_origin_packages`,
  `profile.first_run_handoff_consumptions`;
- Drizzle schemas, relations, repository interface + 4 Drizzle implementation
  (character, origin-package, handoff, handoff-consumption);
- Application servis: `character-bootstrap.service.ts` (handoff create/replace,
  status query, deterministic origin package generate, list origin packages,
  transactional handoff consume + character create + markAccepted + ledger);
- Edge-case guard set: archived profile, cross-scope/cross-household, duplicate
  consume, missing parent policy, invalid type/mode, per-profile one character;
- 7 yeni API (character-bootstrap/status + handoff + packages + generate-packages
  + consume, characters/ + [id]);
- UI: profiles kartına "Karakter Başlat" butonu, `/app/character-onboarding`
  3-adımlı client akış (tain+mod → paket seç → override + onay → success);
- 11 karakter domain unit test, 9 DB-gated integration test.

## Out of Scope (korunan)

- bütün gelecekteki world/story engine tablolarını erken oluşturmak;
- production data migration without approved plan;
- MongoDB or Redis as authoritative datastore;
- packages/database consolidation (orijinal S04 planı — deferred);
- domain event outbox (orijinal S04 planı — deferred);
- LLM tabanlı origin generation (kural: deterministik template generator, LLM yok).

## Tasks (gerçekleştirilen)

| Task ID | Deliverable | Target Boundary | Required Tests | Status |
| --- | --- | --- | --- | --- |
| S04-C01 | Karakter domain types + validation + aggregate | `packages/profiles/src/domain/*` | character.test.ts (11 unit) | ✅ Complete |
| S04-C02 | Additive 0002 migration + Drizzle schemas + relations | `packages/profiles/migrations`, `src/db/schema/profile/*` | Integration migration bootstrap (part of S04-C08) | ✅ Complete |
| S04-C03 | Repository interface + 4 Drizzle impl + index exports | `src/db/repositories/*` | Integration happy path (S04-C08) | ✅ Complete |
| S04-C04 | profile-migrate.mjs upgrade (tüm .sql dosyalarını sırayla çalıştır) | `scripts/*` | Migrate smoke script | ✅ Complete |
| S04-C05 | Application character-bootstrap servisi + tüm edge-case guard'ları | `src/application/character-bootstrap.service.ts` | Integration 9 test (S04-C08) | ✅ Complete |
| S04-C06 | 7 yeni API endpoint (withParent wrapper + status mapping) | `apps/web/app/api/{character-bootstrap/*,characters/*}` | Contract code review (tutarlı child-profiles pattern) | ✅ Complete |
| S04-C07 | Karakter onboarding UI + profiles entry button | `/app/app/profiles`, `/app/app/character-onboarding` | Unauth redirect + manual code walkthrough | ✅ Complete |
| S04-C08 | Unit + DB-gated integration testler | `packages/profiles/tests/*` | 11/11 unit + 17/17 total integration DB-gated (skip without flag) | ✅ Complete |
| S04-C09 | Close-out docs (traceability, completion report, CURRENT_STATUS) | `docs/07-delivery/lumi/sprint-04/*` | İnsan review bekleniyor | ✅ Complete |
| S04-T01..T06 | Orijinal platform core task'ları (shared DB pkg, registry, outbox) | `docs/07-delivery/lumi/sprint-04/` — kod yok | Gelecek sprint backlog | ⏭️ Deferred |

## Functional and Technical Requirements

- PostgreSQL authoritative state'tir; Redis yalnızca geçici koordinasyon sağlar.
- Migration isimleri sıralı ve immutable'dır. 0002 additive-only (DROP/ALTER YOK).
- Business mutation + origin_package.accepted flag güncellemesi + consumption kaydı
  aynı PostgreSQL transaction içindedir.
- Repository ve servis sorguları Family Space scope'u zorunlu parametre olarak taşır.
- JSONB alanları (safetyBounds, preferenceHints, payload) gerekçelidir.
- `exactOptionalPropertyTypes: true` altında typecheck temiz olmalıdır.
- Her child profile için en fazla 1 aktif karakter olabilir (unique partial index + service check).
- Her handoff en fazla 1 kez tüketilebilir. (DB unique + app double guard)
- Parent policy contentBoundary + profile ageBand SafetyBounds içinde taşınır.

## Acceptance Criteria

- Temiz PostgreSQL üzerinde migration sırayla 0001 → 0002 çalışır (additive).
- Sprint 03 verisi upgrade sırasında korunur (0001 tabloları değiştirilmez).
- Transaction rollback kısmi character / handoff kaydı bırakmaz.
- Arşivlenmiş profil ile bootstrap başlatılamaz.
- Cross-scope repository/API sorguları AuthorizationError (403) döner.
- Invalid characterType veya originMode → ValidationError (400).
- Duplicate handoff consume → DomainError/HANDOFF_ALREADY_CONSUMED (409).
- UI akışında 3 adım ve başarı ekranı düzgün şekilde akıcıdır.

## Quality Gate and Rollback

- DB-gated PostgreSQL integration testleri zorunludur; localde flag ile koşulur:
  `$env:PROFILE_TEST_ENABLE_DESTRUCTIVE="true"; pnpm --filter @lumi/profiles test`
- Migration additive-only'dir. Rollback: `DROP SCHEMA profile CASCADE` yalnızca
  geliştirici/destructive test akışında kullanılır; production için ayrı insan onayı.

## Coding Agent Mission

Sprint 03 handoff boundary'yi koruyarak minimum karakter bootstrap foundation'ını
ekle. Büyük simulation/story engine, packages/database refaktörü veya NPC
sistemlerini dahil etme. Sadece scope ile sınırlı kal.
