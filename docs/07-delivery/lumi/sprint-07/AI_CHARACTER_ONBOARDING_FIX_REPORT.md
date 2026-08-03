# AI Character Onboarding Fix Report - Sprint 07 (Round 5)

## Sonuç

AI karakter başlangıç akışı için Round 4 review bulguları giderildi ve gerçek uygulama, mock OpenRouter ve izole PostgreSQL üzerinde doğrulandı.

| Konu | Durum |
|---|---|
| AI arketip üretimi ve yeniden üretme | Tamamlandı |
| Origin paketlerinin yalnızca LLM'den üretilmesi | Tamamlandı |
| Paket bazlı provenance (`generationSource`, `modelId`, `generationBatchId`) | Tamamlandı |
| LLM hatasında eski/statik kartların temizlenmesi | Tamamlandı |
| Preference hint allowlist ve boyut sınırları | Tamamlandı |
| Arketip batch migration uyumu | Tamamlandı |
| Gerçek PostgreSQL entegrasyon testleri | 68/68 geçti |
| AI onboarding Playwright akışı | 2/2 geçti |
| Tüm web Playwright paketi | 27/27 geçti |

## Uygulanan Düzeltmeler

### 1. AI üretim ve provenance sözleşmesi

- `generateAndPersistOriginPackages()` artık dönen her pakete şu alanları ekler:
  - `generationSource: "llm"`
  - `modelId`
  - `generationBatchId`
- API üst seviye provenance bilgisi ile paket seviyesindeki provenance aynı generation batch'i gösterir.
- UI yalnızca gerçek LLM paketlerini gösterir.
- Yeniden üretme başlamadan mevcut paket listesi temizlenir. İki retry da başarısız olursa eski veya statik öneriler ekranda kalmaz.

### 2. Arketip batch migration düzeltmesi

Drizzle şeması `archetype_suggestion_batches.updated_at` alanını bekliyordu fakat `0009_archetype_suggestion_batches.sql` bu kolonu oluşturmuyordu. Bu nedenle gerçek akışta `column updated_at does not exist` hatası oluşuyordu.

Forward-only migration eklendi:

- `packages/profiles/migrations/0010_archetype_batch_updated_at.sql`
- `ALTER TABLE IF EXISTS ... ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

İzole veritabanında 10 migration sırasıyla başarıyla uygulandı.

### 3. Profil ve consume davranışı

- `ChildProfileRepository.findByIdIncludingDeleted()` eklendi.
- Bootstrap scope kontrolü arşivli profili artık `PROFILE_ARCHIVED` olarak tanır; aktif kayıt filtresi nedeniyle yanlış `NOT_FOUND` dönmez.
- Consume işleminde handoff consumption kontrolü mevcut karakter kontrolünden önce çalışır.
- Aynı handoff ikinci kez tüketildiğinde doğru hata `HANDOFF_ALREADY_CONSUMED` olur.
- Farklı household'a ait arketip batch lookup, kaynak varlığını sızdırmadan `ARCHETYPE_BATCH_NOT_FOUND` döndürür.

### 4. Test altyapısı hardening

- Playwright app portu varsayılan olarak `3100`; kullanıcının `3000` portundaki geliştirme sunucusuyla çakışmaz.
- Next E2E çıktısı `NEXT_DIST_DIR=.next-e2e` altında tutulur.
- `.next-e2e` hem Git hem ESLint ignore listesine eklendi.
- Standalone mock OpenRouter sunucusu kontrol endpoint'leri sağlar: reset, fail-next ve state.
- Mock origin yanıtı prompt'taki `characterType` değerini sözleşmeye uygun döndürür.
- Varsayılan profiles Vitest config'i `tests/integration/**` dosyalarını dışlar.
- Destructive DB testleri yalnızca `vitest.integration.config.ts` ve `test:int` üzerinden çalışır.
- İki entegrasyon dosyasındaki `beforeAll` öncesi yanlış skip seçimi düzeltildi. DB hazırlığı başarısızsa testler sessizce skip edilmez, koşu fail olur.

### 5. E2E kapsamı

`apps/web/tests/e2e/onboarding-flow.spec.ts` şunları doğrular:

1. İlk çağrıda beş AI arketipi gösterilir.
2. Yeniden üretme farklı beş arketip getirir.
3. Önceki başlıklar ikinci prompt'a excluded concept olarak taşınır.
4. Seçilen arketip handoff'a aktarılır.
5. Auto mod dört origin paketi üretir.
6. Paket kartları gerçek model ve `AI üretimi` provenance bilgisini gösterir.
7. LLM iki denemede de başarısız olursa hata gösterilir ve kart listesi boş kalır.
8. Bilinmeyen veya limit üstü preference hint payload'ları 400 ile reddedilir.

Tema E2E testleri de güncel ürün sözleşmesine uyarlandı:

- Profil listesinde birincil CTA `Profili Aç`tır.
- Onboarding tema testi statik karakter türleri yerine AI arketip kartlarının seçili/seçili olmayan renklerini doğrular.

## PostgreSQL Doğrulaması

Docker CLI bu ortamda `127.0.0.1:9` proxy bağlantı hatası verdiği için geliştirme veritabanı kullanılmadı. Mevcut PostgreSQL sunucusunda benzersiz adlı geçici bir veritabanı oluşturuldu, migration ve testler çalıştırıldı, ardından veritabanı silindi.

```text
pnpm --filter @lumi/profiles profile:migrate
All 10 profile migrations applied successfully

PROFILE_TEST_ENABLE_DESTRUCTIVE=true
PROFILE_TEST_DATABASE_URL=<disposable-db-url>
pnpm --filter @lumi/profiles test:int

Test Files  4 passed (4)
Tests       68 passed (68)
```

## Son Doğrulama Sonuçları

```text
pnpm --filter @lumi/profiles typecheck
PASS

pnpm --filter @lumi/profiles test
Test Files  11 passed (11)
Tests       228 passed (228)

pnpm --filter @lumi/web lint
PASS

pnpm --filter @lumi/web typecheck
PASS

pnpm --filter @lumi/web test
Test Files  12 passed (12)
Tests       85 passed (85)

pnpm --filter @lumi/web test:e2e
Tests       27 passed (27)

node scripts/check-mojibake.mjs
PASS: No mojibake patterns detected.

git diff --check
PASS (yalnızca line-ending uyarıları)
```

Toplam doğrulanmış test sayısı: **408 passed** (`228 profiles unit + 68 profiles PostgreSQL integration + 85 web unit + 27 web E2E`).

## Değişen Ana Dosyalar

- `packages/profiles/src/application/character-bootstrap.service.ts`
- `packages/profiles/src/db/repositories/interfaces/child-profile.repository.ts`
- `packages/profiles/src/db/repositories/drizzle/drizzle-child-profile.repository.ts`
- `packages/profiles/migrations/0010_archetype_batch_updated_at.sql`
- `packages/profiles/tests/integration/character-bootstrap.integration.test.ts`
- `packages/profiles/tests/integration/profile-repository.integration.test.ts`
- `packages/profiles/vitest.config.ts`
- `packages/profiles/vitest.integration.config.ts`
- `apps/web/app/app/character-onboarding/character-onboarding-client-page.tsx`
- `apps/web/app/api/character-bootstrap/generate-archetypes/route.ts`
- `apps/web/tests/e2e/mock-llm-server-entry.mjs`
- `apps/web/tests/e2e/onboarding-flow.spec.ts`
- `apps/web/tests/e2e/theme-visual-smoke.spec.ts`
- `apps/web/playwright.config.ts`
- `apps/web/next.config.ts`
- `eslint.config.mjs`

## Kalan Risk

`pnpm --filter @lumi/profiles lint` bu Round 5 değişikliklerinin dışındaki Sprint 05-07 dosyalarında toplam 38 mevcut lint hatası raporluyor. Bunlar ağırlıklı olarak kullanılmayan importlar, testlerde `any` ve bir regex escape uyarısıdır. Round 5'in zorunlu doğrulamaları olan profiles typecheck, unit test, gerçek PostgreSQL integration testleri ve tüm web kontrolleri temizdir; ancak repo genelinde profiles lint sıfırlanmadan tam monorepo lint kapısı yeşil kabul edilmemelidir.

## Review Kararı

AI character onboarding düzeltmeleri teknik olarak doğrulandı. Statik origin fallback kaldırılmış durumda, yeniden üretme gerçek LLM çağrısı yapıyor, provenance doğru taşınıyor ve PostgreSQL/E2E kanıtı mevcut.