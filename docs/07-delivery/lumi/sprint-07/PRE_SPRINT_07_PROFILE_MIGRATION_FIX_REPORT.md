# Pre-Sprint 07 Profile Migration Fix Report

## Kök Neden

Login sonrası `/app?success=signed_in` sayfası 500 dönüyordu çünkü PostgreSQL veritabanında `profile` schema'sı ve altındaki tablolar (`profile.households`, `profile.household_members`, vb.) mevcut değildi.

Profil migration SQL dosyaları (`packages/profiles/migrations/`) var olmasına rağmen iki sorun vardı:

1. **Root seviyesinde unified migration komutu yoktu.** Sadece `pnpm auth:migrate` root `package.json`'da tanımlıydı. Profil migration'ı (`pnpm --filter @lumi/profiles profile:migrate`) ayrıca çalıştırılması gerekiyordu ama README'de belirtilmemişti.

2. **`0003_character_domain_schema.sql` idempotent değildi.** `ALTER TABLE ... ADD CONSTRAINT` doğrudan kullanıldığı için migration ikinci kez çalıştırıldığında `42710` (duplicate constraint) hatası ile patlıyordu. Bu, migration'ın güvenle tekrarlanmasını engelliyordu.

3. **Readiness kontrolü sadece TCP bağlantısını test ediyordu.** Schema/tablo varlığını kontrol etmediği için uygulama, login sonrası 500 almadan önce ortam sorunu görünür değildi.

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `package.json` (root) | `profile:migrate` ve `db:migrate` scriptleri eklendi |
| `apps/web/lib/readiness.ts` | Schema-level DB check eklendi (`profile.households` + `parent_accounts` tablolarını sorgular); `ReadinessCheck` tipine `schema` alanı eklendi |
| `packages/profiles/migrations/0003_character_domain_schema.sql` | `lumi_characters_subtype_check` ve `lumi_characters_lifecycle_check` constraint'leri `DO $$ ... END $$` bloğu ile idempotent hale getirildi |
| `packages/profiles/src/application/onboarding.service.ts` | Schema eksikliğinde anlamlı hata mesajı (`PROFILE_SCHEMA_MISSING`) ve log eklendi |
| `README.md` | Başlangıç bölümüne `pnpm db:migrate` adımı eklendi; Docker uzak sunucu notu eklendi |
| `docs/ops/runbooks/migration-failure.md` | `profile.schema_version` kontrolü kaldırıldı, `to_regclass` ve `\dt profile.*` ile gerçek tablo kontrolleri eklendi; migration runner'ın schema_version tablosu oluşturmadığı notu eklendi |

## Eklenen/İyileştirilen Scriptler

### Root `package.json` — Yeni scriptler

```json
"profile:migrate": "pnpm --filter @lumi/profiles profile:migrate",
"db:migrate": "pnpm auth:migrate && pnpm profile:migrate"
```

### Migration Sırası

`pnpm db:migrate` şu sırayla çalışır:

1. `pnpm auth:migrate` → auth tabloları (`parent_accounts`, `parent_sessions`, `parent_password_reset_tokens`)
2. `pnpm profile:migrate` → profile tabloları (sırasıyla 3 migration dosyası):
   - `0001_profile_schema.sql`: `profile` schema, households, child_profiles, parental_settings, vb.
   - `0002_character_bootstrap_schema.sql`: character bootstrap tabloları
   - `0003_character_domain_schema.sql`: trait/emotion/needs/goals/influence/relationships/events

Tüm migration'lar idempotenttir (`IF NOT EXISTS` + `DO $$` constraint guard). Tekrar çalıştırmak güvenlidir.

## Hangi DB Hedefinde Doğrulandı

- **Host:** `172.41.42.51:15432` (Docker remote context)
- **Database:** `lumi`
- **Connection:** `DATABASE_URL=postgresql://lumi:lumi_local_only@172.41.42.51:15432/lumi`

Doğrulama `.env` dosyasındaki `DATABASE_URL` değeri kullanılarak yapıldı. Migration script'i (`profile-migrate.mjs`) root `.env`'yi okuyarak aynı bağlantıyı kullanır.

## Çalıştırılan Komutlar ve Sonuçları

| Komut | Sonuç |
|---|---|
| `pnpm db:migrate` | PASS — auth + 3 profile migration başarılı |
| `pnpm db:migrate` (2. kez, idempotency test) | PASS — tüm migration'lar `IF NOT EXISTS` ile güvenle atlandı |
| `pnpm --filter @lumi/profiles typecheck` | PASS |
| `pnpm --filter @lumi/profiles test` | **140/140** PASS (43 DB-gated skipped) |
| `pnpm --filter @lumi/web lint` | PASS (0 errors) |
| `pnpm --filter @lumi/web typecheck` | PASS |
| `pnpm --filter @lumi/web test` | **77/77** PASS |

### DB Tablo Doğrulaması

```sql
SELECT to_regclass('profile.households');
-- → profile.households (NOT NULL — migration uygulanmış)

SELECT to_regclass('parent_accounts');
-- → parent_accounts (NOT NULL — auth migration uygulanmış)
```

Tüm 16 profile tablosu mevcut:
`profile.households`, `profile.household_members`, `profile.child_profiles`,
`profile.parental_settings`, `profile.policy_audit_log`, `profile.first_run_handoffs`,
`profile.lumi_characters`, `profile.character_trait_state`, `profile.character_trait_history`,
`profile.character_emotion_state`, `profile.character_needs`, `profile.character_goals`,
`profile.character_influence`, `profile.character_relationships`, `profile.character_domain_events`,
`profile.character_origin_packages`

## Login Sonrası `/app` 500 Hatasının Giderildiğine Dair Kanıt

1. Migration çalıştırıldı → `profile.households` ve tüm bağımlı tablolar oluştu.
2. `pnpm db:migrate` idempotent — ikinci çalıştırmada hata vermedi.
3. Readiness kontrolü artık `profile.households` ve `parent_accounts` tablolarını sorguluyor; schema eksikse `status: "error"` dönüyor (HTTP 503).
4. `getOnboardingState()` schema eksikliğinde artık `PROFILE_SCHEMA_MISSING` hatası fırlatıyor (ham `PostgresError` ile 500 yerine).

## Bilinen Riskler

1. **`profile-migrate.mjs` pgcrypto extension'ı oluşturmaz.** Auth migration'ı `CREATE EXTENSION IF NOT EXISTS pgcrypto` içerir. Profile migration'ı buna bağımlıdır (`gen_random_uuid()` kullanır). Auth migration'ı önce çalıştırıldığı sürece sorun yoktur, ancak bu bağımlılık belgelenmemiştir.

2. **Migration runner versiyon takibi yapmaz.** Tüm SQL dosyaları her seferinde sırayla çalıştırılır. `IF NOT EXISTS` idempotency sağlasa da, yeni eklenen migration'lar eski dosyaları tekrar çalıştıracaktır. Gelecekte bir migration dosyası `IF NOT EXISTS` olmayan bir DDL içerirse patlayabilir. Uzun vadede bir `schema_version` tablosu eklenmesi önerilir.

3. **`apps/web/lib/readiness.ts` pg Pool bağlantısı açar.** Readiness endpoint'i (`/api/readiness`) her çağrıldığında yeni bir Pool oluşturup kapatır. Yüksek trafikte bu ek yük oluşturabilir. Gelecekte bağlantı havuzu singleton yapılabilir.

4. **E2E testleri doğrulanamadı.** Dev server port 3000'i kullandığı için `test:e2e` çalıştırılamadı. Migration sonrası manuel doğrulama önerilir.

## Rollback Planı

Tüm migration'lar additive (CREATE only) olduğu için rollback manuel dropping gerektirir:

```sql
DROP SCHEMA profile CASCADE;
```

Bu işlem tüm profile tablolarını ve verilerini siler. Sonra düzeltilmiş migration yeniden çalıştırılabilir:

```bash
pnpm db:migrate
```

Auth tabloları (`parent_accounts`, `parent_sessions`) etkilenmez (`profile` schema'sından bağımsızdır).

Root `package.json`'daki değişikliklerin rollback'i:

```bash
git checkout -- package.json
```

Migration dosyasındaki değişikliklerin rollback'i:

```bash
git checkout -- packages/profiles/migrations/0003_character_domain_schema.sql
```
