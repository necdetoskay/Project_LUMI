# Sprint 08 Review Round 2 Fix Prompt

Bu promptu Project LUMI reposunda calisacak kod ajanina ver.

## Gorev

Sprint 08 ikinci review sonrasinda kalan kapanis engellerini duzelt. Mevcut
uygulamayi sifirdan yazma ve unrelated degisiklikleri revert etme. Once
asagidaki dosyalari oku:

- `docs/07-delivery/lumi/sprint-08/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-08/CODING_AGENT_PROMPT.md`
- `docs/07-delivery/lumi/sprint-08/REVIEW_FIX_PROMPT.md`
- `docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md`
- `packages/world`
- `apps/web/app/api/world`
- Sprint 07 accepted origin/character repository ve servisleri

Sprint 08'e ait checkpoint, concurrency ve idempotency sorunlarini Sprint 09'a
erteleme. Bunlar Sprint 08 kapanis kriteridir.

## Dogrulanmis mevcut durum

- `@lumi/world` lint: PASS
- `@lumi/world` typecheck: PASS
- `@lumi/web` typecheck: PASS
- world unit: 7 dosya, 73 test PASS
- disposable PostgreSQL integration: 1 dosya, 5 test FAIL
- exact DB hatasi: `relation "profile.worlds" does not exist`
- integration ve E2E raporda calistirilmamis

## P0 - PostgreSQL integration altyapisini duzelt

Sorun:

- Test migration SQL'lerinde `profile.` metni `world_test_temp.` ile
  degistiriliyor.
- Drizzle schema ise `pgSchema("profile")` ile sabit nitelikli sorgu uretiyor.
- `search_path=world_test_temp` sabit `profile.worlds` sorgusunu etkilemez.
- Bu nedenle 5 testin tamami fail oluyor.

Dosyalar:

- `packages/world/tests/integration/world-bootstrap.integration.test.ts`
- `packages/world/src/db/schema/world/schemas.ts`
- test DB factory/configuration

Yapilacaklar:

1. Integration testleri disposable database icinde gercek `profile` schema ile
   calistir. Disposable DB adi icin sert guvenlik kilidi koy:
   - DB adi `test`, `review` veya acik izinli prefix/suffix icermeli;
   - normal `lumi` DB, production benzeri URL veya eksik
     `WORLD_TEST_DATABASE_URL` ile destructive suite hard-fail etmeli.
2. Alternatif olarak schema adini injectable hale getir; Drizzle ve migration
   ayni schema adini kullanmali. Yalniz SQL string replace + search_path
   kullanma.
3. `WORLD_TEST_ENABLE_DESTRUCTIVE=true` iken testleri `it.skip` yapma. Eksik
   veya guvensiz URL acik hata vermeli.
4. Test cleanup sadece disposable DB/schema'yi temizlemeli ve finally
   garantili olmali.
5. Mevcut 5 testin semantigini duzelt:
   - movement testi bootstrap home location'ina yeniden hareket etmemeli;
   - ikinci erisilebilir ve bagli location olusturup ona hareket etmeli;
   - blocked test dogru character/household ile gercek
     `LOCATION_NOT_ACCESSIBLE` hatasini assert etmeli.
6. PostgreSQL suite sonunda 0 skip ve 0 fail olmali.

## P0 - Family Space authorization aciklarini tamamen kapat

Mevcut durum:

- `GET /api/world/{id}` parent'in world household'una uyeligini kontrol etmiyor.
- regions, locations, homes ve checkpoints GET route'lari ayni sekilde siziyor.
- movement GET URL world ID'yi yok sayiyor ve herhangi bir character history
  okuyabiliyor.
- POST bootstrap yalniz body'deki household'a uyeligi kontrol ediyor; child
  profile, character ve accepted origin zincirini dogrulamiyor.
- movement POST household ID'yi client body'den almaya devam ediyor.

Yapilacaklar:

1. Tek bir application-level authorization helper/use case olustur:
   authenticated parent -> household -> child profile -> character -> world.
2. Tum world GET/PATCH/subresource route'lari bu helper'i kullanmadan veri
   okumamali veya degistirmemeli.
3. Movement GET/POST route parametresindeki world ID'yi authoritative kabul
   etmeli; body'den household alma.
4. Cross-household kayitlarda proje politikasina uygun, veri varligini
   sizdirmayan tutarli 404/403 don.
5. Route'lar repository ve raw DB istemcisini dogrudan olusturmasin.
6. Actor household/user ID server session ve ownership cozumunden gelsin.

Zorunlu API testleri:

- World detail cross-household reddedilir.
- Archive cross-household reddedilir.
- Region/location/home/checkpoint listeleri cross-household reddedilir.
- Movement GET/POST cross-household reddedilir.
- URL world ID ile character world ID farkliysa reddedilir.
- Yetkili household tum endpointleri kullanabilir.

## P0 - Bootstrap'ta authoritative origin'i server-side coz

Mevcut POST schema halen sunlari client'tan kabul ediyor:

- `householdId`
- `childProfileId`
- tum seed/version alanlari
- tum `originPackage` payload'i

Bu tasarim sahte origin/world bootstrap'a izin verir.

Yapilacaklar:

1. Public bootstrap request'i en aza indir:
   - `characterId` veya accepted `originPackageId`;
   - `idempotencyKey`.
2. Character, child profile, household ve accepted origin package'i Sprint 07
   repository/application servislerinden server-side getir.
3. Origin package'in gercekten accepted/consumed state'te oldugunu ve character
   ile bagli oldugunu dogrula.
4. Universe/origin/candidate seed ile generator/vector version'i DB kaydindan
   al.
5. Client origin payload, seed veya actor kimligi override edemesin.
6. Application service public input tipini de bu guven sinirina gore daralt.
7. Sahte payload'in yok sayildigini/reddedildigini API ve PostgreSQL testiyle
   kanitla.

## P1 - 0003 migration hardening'i gercek tamamla

Mevcut `0003_world_hardening.sql` sorunlari:

- `ALTER TABLE ADD CONSTRAINT` tekrar calistirmada duplicate constraint ile
  kirilir.
- World -> household/child profile/character FK'leri yok.
- FK'ler sadece tek kolonlu; cross-world region/location/home baglari hala
  mumkun.
- Tek aktif world partial unique index'i yok.
- Event sequence/idempotency unique constraint'i yok.
- Comment "residence index" diyor fakat ayri residence modeli yok.
- Orphan data icin kanitli backfill/validation stratejisi yok.

Mevcut `0003` uygulanmis olabilecegi icin onu geriye donuk degistirme. Yeni
`0004_world_scope_and_continuity_hardening.sql` gibi additive migration ekle.

Yeni migration:

1. Mevcut constraint'leri catalog sorgulari/guard'larla yeniden calistirmada
   guvenli hale getirsin veya migration ledger kullan.
2. `worlds.household_id`, `child_profile_id`, `character_id` icin gercek profile
   tablolariyla FK eklesin.
3. Region/location/home/residence/environment/connection/character location
   icin ayni world'i zorlayan composite unique + FK yapisi kursun.
4. Bir character/child profile icin yalniz bir active world partial unique
   index'i eklesin.
5. Event store icin world-scoped monotonic sequence/aggregate version
   invariant'i eklesin.
6. Household + world + operation + idempotency key scope'u eklesin.
7. Mevcut orphan/cakisan data varsa migration fail etmeden once raporlayan veya
   guvenli backfill yapan strateji kullansin.
8. `world:migrate` ikinci kez calistirildiginda basarili olmali. Migration
   ledger tercih edilir; her SQL'i her seferinde korlemesine tekrar uygulama.

Drizzle schema'lari migration ile birebir uyumlu olmalidir.

## P1 - Residence, environment ve location graph'i runtime'a bagla

Migration ile tablo olusturmak implementasyon degildir. Su anda:

- environment snapshot ve connection icin Drizzle schema/repository yok;
- bootstrap bu tablolara kayit yazmiyor;
- ikinci location yok;
- ayri residence tablosu yok;
- movement adjacency kontrolu yapmiyor.

Yapilacaklar:

1. Ayri `world_character_residences` modeli/tablosu ekle. Home aidiyeti ile
   active physical residence ayri olsun.
2. Environment snapshot ve location connection icin Drizzle schema, repository
   ve application API ekle.
3. Bootstrap tek transaction icinde:
   - home location;
   - en az bir ikinci erisilebilir location;
   - aralarinda connection;
   - home;
   - active residence;
   - initial environment snapshot
   olustursun.
4. Movement yalniz ayni world icindeki bagli ve erisilebilir hedefe izin
   versin.
5. World detail response bu verileri application use case uzerinden dondursun.

## P1 - Deterministik checkpoint ve replay'i tamamla

`checkpoint.service.ts` random UUID hash uretiyor ve
`return target.stateHash === currentHash || true` ile her zaman true donuyor.
Bu kodu Sprint 09'a erteleme.

1. Stable canonical world projection ve stable serialization tanimla.
2. SHA-256 state hash kullan.
3. Random ID, timestamp ve sirasi belirsiz collection'lari canonical hash'ten
   cikar veya normalize et.
4. Ayni seed/package/version ayni topology ve checkpoint hash'i uretsin.
5. State degisikligi farkli hash uretsin.
6. Verify gercek hash karsilastirmasi yapsin ve false durumunu test et.
7. Checkpoint create, event ve outbox ayni transaction'da olsun.
8. Checkpoint sequence concurrency-safe olsun.

## P1 - Concurrency, idempotency, event ve outbox

1. Movement `expectedVersion` ve `idempotencyKey` alsin.
2. Character location update compare-and-swap kullansin:
   `WHERE character_id = ? AND version = ?`.
3. Conflict HTTP 409 dondursun.
4. Ayni idempotency key ikinci location update/event/outbox uretmesin ve ayni
   sonucu dondursun.
5. Bootstrap da household + operation + key scope'unda idempotent olsun.
6. Her movement'ta world/event aggregate version gercekten ilerlesin. Su an
   `worldRecord.version + 1` tekrar tekrar ayni degeri uretebilir.
7. Bootstrap yalniz WORLD_CREATED degil gerekli REGION_ADDED,
   LOCATION_ADDED, HOME_CREATED, CHARACTER_ARRIVED ve CHECKPOINT_CREATED
   event'lerini sirali yazsin.
8. Archive event actor household/user alanlarini doldursun.
9. Transactional outbox ekle veya repodaki canonical outbox'i kullan.
10. Domain mutation + event + outbox rollback/atomicity testlerini ekle.

## Test ve rapor

Asagidaki kontrolleri calistir:

```powershell
pnpm --filter @lumi/world lint
pnpm --filter @lumi/world typecheck
pnpm --filter @lumi/world test

$env:WORLD_TEST_ENABLE_DESTRUCTIVE="true"
$env:WORLD_TEST_DATABASE_URL="<disposable-test-db-url>"
pnpm --filter @lumi/world test:int

pnpm --filter @lumi/profiles typecheck
pnpm --filter @lumi/profiles test
pnpm --filter @lumi/web lint
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test
pnpm --filter @lumi/web test:e2e
node scripts/check-mojibake.mjs
git diff --check
pnpm build
```

World API contract/authorization testleri ve Playwright world flow zorunludur.
PostgreSQL testinde 0 skip olmali.

`docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md` raporunu gercek
sonuclarla guncelle:

- "Remaining / Out of Scope" altinda Sprint 08 kriterlerini Sprint 09'a
  erteleme;
- exact unit/integration/API/E2E pass/fail/skip sayilarini yaz;
- disposable DB adini ve guvenlik kilidini yaz;
- migration 1. ve 2. calisma kanitini yaz;
- authorization matrisi ekle;
- acceptance criteria -> source -> test -> result traceability ekle;
- outbox, determinism, concurrency ve idempotency kanitlarini ekle.

Integration/E2E calistirilmadiysa veya herhangi bir P0/P1 aciksa Sprint 08'i
complete olarak raporlama.
