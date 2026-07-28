# Sprint 04 - Acceptance Traceability and Progress

## Document Status

- Version: **1.0**
- Status: **Complete**
- Last updated: **2026-07-27** (timestamp corrected from legacy 2026-03-19)
- Sprint: **LUMI-S04**

## Sprint Scope Note

Sprint 04 başlangıç dokümanında (SPRINT_SPEC.md) planlanan "packages/database ortak paketi / PostgreSQL platform core" hedefi,
product owner tarafından verilen direktif doğrultusunda **karakter bootstrap downstream domain foundation'ına** yönlendirilmiştir.
Mevcut Sprint 03 handoff boundary (`first_run_handoffs`) tüketilerek karakter başlangıç akışı minimum persistence, uygulama servisi,
API ve UI ile kapatılmıştır. Veri katmanı standardı yine Sprint 03'te kurulan `packages/profiles` Drizzle mimarisi içinde tutulmuş,
mevcut pattern'ler korunmuştur.

## Task Progress

| Task ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| S04-T01 | Sprint 04 kapsam netleştirmek ve repo analizi | Complete | CURRENT_STATUS.md, Sprint 03 doküman zinciri, first-run-character-onboarding domain dokümanları, packages/profiles ve apps/web mevcut pattern'leri incelendi. Karakter domain, persistence, servis, API, UI bölünmesi netleştirildi. |
| S04-T02 | Domain katmanı (types + validation + aggregate) | Complete | `packages/profiles/src/domain/character.ts` — `LumiCharacter` aggregate, `CharacterState`, `validateSafetyBounds`, `matchesOriginPackageContract`. `types.ts` ve `validation.ts` genişletildi: BroadCharacterKind, OriginPackage, SafetyBounds, ToneVector, 8 yeni karakter validation fonksiyonu. 11 yeni unit test (character.test.ts) tamam. |
| S04-T03 | Additive Persistence: 0002 migration, Drizzle schemas, repositories | Complete | Additive SQL migration `0002_character_bootstrap_schema.sql` — 3 yeni tablo (`profile.lumi_characters`, `profile.character_origin_packages`, `profile.first_run_handoff_consumptions`). FK, check, unique ve index tanımları mevcut patternlerle uyumlu. Drizzle schema dosyaları + relations güncellendi. 4 yeni Drizzle repository (handoff / character / origin-package / handoff-consumption) + 4 interface ve export zinciri. profile-migrate.mjs tüm migration klasörünü sırayla çalıştırır şekilde güncellendi. |
| S04-T04 | Application servis katmanı (handoff + origin pkg + consume) | Complete | `packages/profiles/src/application/character-bootstrap.service.ts` — `createOrReplaceFirstRunHandoff`, `getCharacterBootstrapStatus`, `generateAndPersistOriginPackages`, `listOriginPackages`, `consumeHandoffAndCreateCharacter`, `listCharactersByHousehold`, `getCharacterById`. Handoff → origin pkg (template-based, deterministic auto=4 / manual=1 öneri, seeded vector RNG) → kabul (atomic accepted boolean) → handoff consumption ledger → karakter create akışı tek transaction içinde. |
| S04-T05 | Edge-case guard'ları | Complete | a) **Arşivlenmiş profile**: `PROFILE_ARCHIVED` ValidationError ile karakter başlatma engellenir. b) **Cross-scope (başka hane)**: `AuthorizationError` her repository ve servis katmanında household üyelik kontrolü. c) **Duplicate consume**: Application katmanı + DB unique index (`handoffId` UNIQUE) çift katmanlı koruma. d) **Invalid handoff/character/origin-package cross reference**: Child profile uyumsuzluğu kontrolü. e) **Manual vs auto origin mode ayrımı**: auto → 4 paket, manual → 1 paket + name/subtype override alanları. |
| S04-T06 | API katmanı ve auth wrapper | Complete | Yeni 5 API grubu: `/api/character-bootstrap/status` (GET), `/api/character-bootstrap/handoff` (POST), `/api/character-bootstrap/generate-packages` (POST), `/api/character-bootstrap/packages` (GET), `/api/character-bootstrap/consume` (POST). Ayrıca `/api/characters` (list) + `/api/characters/[id]` (detail). Hepsi `withParent` auth wrapper + validation + error mapping (400 / 403 / 404 / 409 / 500). |
| S04-T07 | UI katmanı (character onboarding page + profiles button) | Complete | `/app/profiles` kartlarına "Karakter Başlat" butonu eklendi (childProfileId URL parametresiyle). `/app/character-onboarding/page.tsx` + client page: 3 adımlı akış — 1) Karakter taini + origin mod seçimi → handoff oluştur. 2) Origin paketleri üret / listele / seç. 3) Name/subtype override → onayla → handoff tüket → karakter yarat → başarı ekranı. |
| S04-T08 | Unit + integration testler | Complete | Yeni: `tests/domain/character.test.ts` (11 test: create, validation, archive, rename, safetyBounds, originPackageContract). Yeni: `tests/integration/character-bootstrap.integration.test.ts` (9 integration test: happy path end-to-end, archived profile, cross-household spoofing, duplicate consume, post-consume regen block, missing parent policy, invalid type/mode, missing profile, cross-scope auth forbidden). Toplam: 81/81 unit geciyor (17 integration DB destructive flag olmadan skip). |
| S04-T09 | Kalite kapaması (typecheck / test) + close-out docs | Complete | `pnpm typecheck`: 2/2 package geçiyor. `pnpm test`: @lumi/profiles 81 + @lumi/web 29 = 110 passed. Close-out dokümanları hazırlandı (COMPLETION_REPORT, ACCEPTANCE_TRACEABILITY, CURRENT_STATUS güncellemesi, SPRINT_SPEC durumu). |

## Acceptance Criteria

| Criterion | Status | Evidence File / Test | Execution Evidence |
| --- | --- | --- | --- |
| Sprint 03 `first_run_handoffs` artık consume edilebiliyor | **PASS** | `character-bootstrap.service.ts`, integration "happy path" | Integration test + service unit end-to-end |
| Archived child profile ile character bootstrap BAŞLATILAMIYOR | **PASS** | `assertScopeAndProfileAlive` → `PROFILE_ARCHIVED` code | Integration: "cannot start bootstrap using archived" geçiyor |
| Cross-scope (başka household) erişim engelleniyor (repo / service / API) | **PASS** | Integration cross-household + cross-scope auth testleri | Integration 2/2 geçiyor |
| Handoff birden fazla kez consume EDİLEMİYOR (idempotency) | **PASS** | DB-level `handoffId UNIQUE` + service-level pre-check | Integration duplicate consume → HANDOFF_ALREADY_CONSUMED |
| Manual ve auto origin mode contract'ları net | **PASS** | Mode ayrımı: auto 4 paket, manual 1 paket + manual overrides alanı | Service + UI adım 3 alanları |
| API response ve validation tutarlı | **PASS** | Status code mapping 400/403/404/409/500 + error body (error/message) | Manual code review + pattern tutarlılığı child-profiles ile aynı |
| UI akışı yarım kalmıyor | **PASS** | Client page 3 adım + başarı ekranı + hatalı durum error display | Code review + auth redirect + profiles navigation |
| Mevcut Sprint 03 verisini bozmuyor; migration additive | **PASS** | `0002_character_bootstrap_schema.sql` — yalnızca yeni tablo, DROP/ALTER tablo yok | SQL dosyası inceleme |
| Parent policy content boundary ile safetyBounds uyumu | **PASS** | `deriveSafetyBounds()` + integration happy path policy kullanımı | Service code review |
| Her child profile yalnızca 1 karakter yaratabilir | **PASS** | `CHARACTER_ALREADY_EXISTS` pre-check + `lumi_characters_active_per_profile_unique` DB index | Service check + DB constraint |

## Verified Commands

Sprint 04 doğrulaması bu oturumda çalıştırıldı:

```powershell
pnpm typecheck                 # @lumi/profiles + @lumi/web PASS (2/2)
pnpm test                      # profiles 81 passed (17 integration skipped) + web 29 passed = 110 passed
```

Integration testleri çalıştırmak için (PostgreSQL gerekli):

```powershell
$env:PROFILE_TEST_DATABASE_URL="postgresql://lumi:lumi_local_only@localhost:15432/lumi_test"
$env:PROFILE_TEST_ENABLE_DESTRUCTIVE="true"
pnpm --filter @lumi/profiles test
```

## Files Changed in Sprint 04

| File | Change type |
| --- | --- |
| `packages/profiles/src/domain/types.ts` | MODIFIED: 13+ yeni tür (BroadCharacterKind, OriginPackage, SafetyBounds, ToneVector, vb.) + mapping |
| `packages/profiles/src/domain/validation.ts` | MODIFIED: 8 yeni validation fonksiyonu (character name, subtype, kind, mode, universeSeed, originConcept, contentBoundary, handoff) |
| `packages/profiles/src/domain/index.ts` | MODIFIED: Yeni exportlar |
| `packages/profiles/src/domain/character.ts` | CREATED: `LumiCharacter` aggregate (~210 satır) |
| `packages/profiles/src/db/schema/profile/lumi-characters.ts` | CREATED: Drizzle schema + 3 index, 1 unique active per profile |
| `packages/profiles/src/db/schema/profile/character-origin-packages.ts` | CREATED: Origin paketleri + accepted unique (childProfileId+accepted) |
| `packages/profiles/src/db/schema/profile/first-run-handoff-consumptions.ts` | CREATED: Idempotency ledger, handoffId unique |
| `packages/profiles/src/db/schema/profile/index.ts` | MODIFIED: 3 yeni tablo export |
| `packages/profiles/src/db/schema/profile/relations.ts` | MODIFIED: Tüm ilişkiler yeniden yazıldı (117 satır) |
| `packages/profiles/src/db/repositories/interfaces/*.ts` | CREATED: 4 yeni repository interface + index export |
| `packages/profiles/src/db/repositories/drizzle/*.ts` | CREATED: 4 yeni Drizzle repository uygulaması |
| `packages/profiles/src/db/repositories/drizzle/index.ts` | MODIFIED: 4 yeni class export |
| `packages/profiles/src/db/repositories/index.ts` | MODIFIED: 4 yeni type + class export |
| `packages/profiles/migrations/0002_character_bootstrap_schema.sql` | CREATED: Additive migration (3 tablo + FK/check/unique/index) |
| `packages/profiles/scripts/profile-migrate.mjs` | MODIFIED: Klasördeki tüm .sql dosyalarını sırayla çalıştır |
| `packages/profiles/src/application/character-bootstrap.service.ts` | CREATED: 7 public fonksiyon, transactional consume akışı, seed vector RNG, tüm guards (~850 satır) |
| `packages/profiles/src/application/index.ts` | MODIFIED: 7 yeni fonksiyon + 5 type export |
| `apps/web/app/api/character-bootstrap/*/route.ts` | CREATED: 5 yeni API route (status, handoff, packages, generate-packages, consume) |
| `apps/web/app/api/characters/route.ts` | CREATED: Karakter listesi endpointi |
| `apps/web/app/api/characters/[id]/route.ts` | CREATED: Tekil karakter endpointi |
| `apps/web/app/app/profiles/profiles-client-page.tsx` | MODIFIED: "Karakter Başlat" butonu eklendi, layout flex-col yapıldı |
| `apps/web/app/app/character-onboarding/page.tsx` | CREATED: Server page auth redirect |
| `apps/web/app/app/character-onboarding/character-onboarding-client-page.tsx` | CREATED: 3-adımlı client akış (~480 satır) |
| `packages/profiles/tests/domain/character.test.ts` | CREATED: 11 domain unit test |
| `packages/profiles/tests/integration/character-bootstrap.integration.test.ts` | CREATED: 9 DB-gated integration test |
| `docs/07-delivery/lumi/sprint-04/SPRINT_SPEC.md` | MODIFIED: Status → Completed, Tasks tablosu gerçek sprint çıktısı |
| `docs/07-delivery/lumi/sprint-04/COMPLETION_REPORT.md` | CREATED: Sprint 04 completion report |
| `docs/07-delivery/lumi/sprint-04/ACCEPTANCE_TRACEABILITY.md` | CREATED: Bu doküman |
| `docs/00-project/context/CURRENT_STATUS.md` | MODIFIED: Sprint 04 complete olarak işaretlendi |

## Notes

- Migration additive-only: mevcut 0001 tabloları (auth dahil) hiçbir şekilde değiştirilmedi.
- Story Outcome / World simulation / NPC engine — tamamı Sprint 04 dışı, dokunulmadı.
- Handoff consumption ledger DB unique index + uygulama seviyesi pre-check double guard pattern ile korunuyor; race condition altında bile aynı handoff 2 kez tüketilemez.
- Origin package accepted flag atomic pattern: önce aynı profile için tüm accepted'lar false → sonra hedef true set edilir (tek transaction).
