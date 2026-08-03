# Sprint 08 Review Fix Prompt

Bu promptu Project LUMI reposunda calisacak kod ajanina ver.

## Rol

Sen senior TypeScript, Next.js, PostgreSQL ve domain-driven design
muhendisisin. Sprint 08 implementasyonunu sifirdan yeniden yazma. Mevcut
`@lumi/world` paketini ve web API'lerini incele, asagidaki review bulgularini
kucuk ama eksiksiz ve production-guvenli degisikliklerle kapat.

Kullaniciya veya baska ajanlara ait unrelated degisiklikleri revert etme.
Mevcut `0001_world_bootstrap.sql` ve `0002_world_event_store.sql` migration
dosyalari uygulanmis olabilir. Bunlari geriye donuk degistirme; DB
hardening icin `0003_...sql` ve gerekiyorsa sonraki additive/forward-only
migration'lari ekle.

## Once oku

- `docs/07-delivery/lumi/sprint-08/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-08/CODING_AGENT_PROMPT.md`
- `docs/03-domain-design/characters/character-origin-and-world-bootstrap.md`
- `docs/03-domain-design/simulation/seeded-vector-bootstrap.md`
- `docs/03-domain-design/relationships/home-household-and-daily-life-system.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_08_World_State_Time_Simulation_Schema_v1.0.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_11_Audit_Outbox_Idempotency_Jobs_Operational_Schema_v1.0.md`
- `docs/04-architecture/lumi/application/01_Application_Architecture/04_TRANSACTION_AND_CONCURRENCY.md`
- Sprint 07 character bootstrap service, repository, schema ve API akisi
- `packages/world` altindaki mevcut kod, migration ve testlerin tamami
- `apps/web/app/api/world` altindaki mevcut route'lar

## Review sonucu

Sprint 08 kapanis icin reddedildi. Mevcut kanit:

- `@lumi/world` lint: PASS
- `@lumi/world` typecheck: PASS
- `@lumi/web` typecheck: PASS
- world unit: 7 dosya, 71 test PASS
- world PostgreSQL integration, env olmadan: 5 test SKIP
- disposable PostgreSQL ile gercek kosu: 5/5 FAIL
- temel hata: `duplicate key value violates unique constraint
  "world_locations_pkey"`
- zorunlu `docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md` yok

Unit testlerin gecmesi Sprint 08'in calistigini kanitlamiyor.

## P0 - Bootstrap'i gercekten calisir hale getir

Dosya:
`packages/world/src/application/world-bootstrap.service.ts`

Mevcut kod ayni `Location.id` ile once satir 211 civarinda, sonra satir 230
civarinda ikinci kez `createLocation()` cagiriyor. Ikinci INSERT her
bootstrap'i primary-key ihlaliyle rollback ediyor.

Yapilacaklar:

1. Baslangic location'ini tek kez `isHome: true` ile olustur veya ilk insert
   sonrasinda repository `updateLocation` ile guncelle. Ayni ID ile ikinci
   INSERT yapma.
2. Bootstrap'in tek transaction icinde su kayitlari eksiksiz olusturmasini
   sagla:
   - world;
   - starting region;
   - home location ve en az bir erisilebilir komsu location;
   - location graph/connection;
   - home;
   - residence/active residence;
   - character active location;
   - environment snapshot;
   - bootstrap manifest;
   - deterministic checkpoint;
   - domain events;
   - transactional outbox kayitlari.
3. Herhangi bir adim hata verirse hicbir partial world kaydi kalmadigini
   PostgreSQL testiyle kanitla.
4. Ayni kabul edilmis origin icin retry, duplicate world uretmemeli. Household,
   character ve operation scope'lu idempotency uygula.

## P0 - Client payload trust ve Family Space acigini kapat

Dosyalar:

- `apps/web/app/api/world/route.ts`
- `apps/web/app/api/world/[id]/route.ts`
- `apps/web/app/api/world/[id]/**/route.ts`
- world application/repository servisleri

Mevcut POST route, client'in gonderdigi `householdId`, `childProfileId`,
`characterId`, seed/version ve tum `originPackage` payload'ini dogrudan
authoritative kabul ediyor. GET/PATCH alt route'lari authenticated parent
olmasini kontrol ediyor ama world'ün o parent household'una ait oldugunu
kontrol etmiyor. Movement POST body'deki `householdId`'ye guveniyor ve URL'deki
`worldId`'yi kullanmiyor. Movement GET herhangi bir `characterId` icin konum ve
history dondurebiliyor.

Yapilacaklar:

1. Bootstrap API client'tan authoritative origin payload, household ID, seed
   veya generator version almasin.
2. Client yalniz gerekli kimlik ve idempotency verisini gondersin:
   `characterId` veya accepted `originPackageId`, `idempotencyKey`.
3. Server authenticated parent'tan household membership'i cozsun.
4. Character, child profile ve accepted origin package'i server-side profile
   repository/service uzerinden getir.
5. Su baglantilarin ayni household zincirinde oldugunu dogrula:
   parent -> household -> child profile -> character -> accepted origin.
6. GET, archive, regions, locations, homes, checkpoints, movement GET/POST
   dahil tum world endpoint'lerinde world household ownership kontrolu yap.
7. Movement endpoint'inde URL `worldId`, character'in world ID'si ve target
   location world ID'si ayni olmali. Body'den household kabul etme.
8. Cross-household kayitlar icin veri varligini sizdirmayan tutarli 404/403
   politikasini mevcut proje standardina gore uygula.
9. `actorUserId` her zaman session parent ID'sinden gelsin; client override
   edemesin.

Zorunlu API testleri:

- Household A, Household B world detail'ini okuyamaz.
- Household A, Household B world'ünü archive edemez.
- Region/location/home/checkpoint listeleri cross-household sizmaz.
- Movement GET ve POST cross-household sizmaz.
- URL world ID ile character world ID farkliysa islem reddedilir.
- Sahte client origin payload'i authoritative kaydi degistiremez.

## P0 - Destructive test guvenligini duzelt

Dosya:
`packages/world/tests/integration/world-bootstrap.integration.test.ts`

Mevcut teardown satir 62 civarinda `DROP SCHEMA IF EXISTS profile CASCADE`
calistiriyor. Yanlis URL verilirse auth, profiles, characters ve diger sprint
tablolarini silebilir.

Yapilacaklar:

1. Test suite yalniz disposable DB'de calissin.
2. DB adinda acik test suffix/prefix bulunmasini zorunlu kil:
   `_test`, `test_`, `lumi_world_review_` gibi.
3. `lumi`, production veya normal development DB adinda destructive test
   baslamadan hard-fail et.
4. Mumkunse her run icin ayri schema kullan ve sadece o schema'yi temizle.
   World migration `profile` schema'sina bagliysa disposable database
   zorunlulugunu sert kilitle.
5. Test lifecycle'i failure durumunda da connection'lari kapatsin.
6. Testlerin "env yoksa yesil" gorunmesini engelle. `test:int` komutu gerekli
   env yoksa acik hata ile cikmali; skip sonucu kapanis kaniti sayilamaz.

## P1 - DB referential integrity ve lifecycle invariant'larini sertlestir

Mevcut `0001` tablolarinda neredeyse hic FK yok. World, region, location, home,
checkpoint, character location, movement event ve event store orphan veya
cross-world kayit kabul ediyor. "Bir child/character icin tek aktif world"
constraint'i de yok.

Yeni additive migration ile:

1. `worlds.household_id -> profile.households(id)`.
2. `worlds.child_profile_id` ve `worlds.character_id` icin mevcut gercek tablo
   adlarina FK ekle.
3. Child profile/character'in household/world bagini DB seviyesinde mumkun
   olan composite FK/unique constraint'lerle koru.
4. Region -> world.
5. Location -> ayni world icindeki region.
6. Home -> ayni world icindeki location.
7. Character location -> ayni world icindeki character ve location.
8. Movement event `from`/`to` location'lari -> ayni world.
9. Manifest/checkpoint/event -> world.
10. Bir child profile veya character icin yalniz bir active world partial
    unique index'i.
11. Event store icin `(world_id, aggregate_version)` veya belgede tanimlanan
    kesin sequence invariant'i.
12. Bootstrap ve mutation idempotency icin household + operation + key unique
    scope'u.
13. Mevcut data varsa validation/backfill stratejisi kullan. Migration
    forward-only ve yeniden calistirmada guvenli olsun.

Drizzle schema migration ile birebir uyumlu olmali.

## P1 - Residence, environment ve location graph modelini tamamla

Sprint spec, home aidiyeti ile aktif physical residence'in ayri olmasini
istiyor. Mevcut kod `residenceType` alanini home satirina koyarak iki kavrami
birbirine karistiriyor. Ayrica environment snapshot ve location connection
modeli yok; bootstrap yalniz tek location uretiyor.

Yapilacaklar:

1. Home ownership/belonging ile character residence kaydini ayri tablolar ve
   domain tipleriyle modelle.
2. Bir character icin etkin residence invariant'ini tanimla.
3. Time phase, weather ve season reference iceren versioned environment
   snapshot ekle.
4. Starting location ile en az bir erisilebilir komsu arasinda yonlu veya
   belgede tanimlanan location connection kaydi olustur.
5. Movement yalniz ayni world icindeki erisilebilir ve bagli hedefe izin
   versin.
6. Bootstrap sonucunda bu kayitlari API detail response'unda goster.

## P1 - Deterministik seed, checkpoint ve replay'i gercek uygula

Dosyalar:

- `packages/world/src/application/checkpoint.service.ts`
- `packages/world/src/application/world-bootstrap.service.ts`

Mevcut checkpoint hash'i random UUID parcasidir. `verifyCheckpointHash()`
satir 85 civarinda `... || true` nedeniyle her zaman true doner.

Yapilacaklar:

1. Canonical world-state projection tanimla.
2. Object key ordering ve collection ordering'i sabitle.
3. Stable serialization uzerinden SHA-256 hash uret.
4. Ayni seed + accepted package + generator/vector version ayni manifest,
   topology ve state hash'i uretsin.
5. Farkli state hash farki uretsin.
6. `verifyCheckpointHash` gercek yeniden hesaplama ile true/false donsun;
   bypass olmasin.
7. Checkpoint sequence allocation transaction/concurrency-safe olsun.
8. RNG/generator/vector version'lari manifest ve checkpoint'te sakla.
9. Deterministik testlerde random UUID/timestamp alanlarini canonical hash
   disinda birak veya deterministik turet.

## P1 - Optimistic concurrency ve movement idempotency ekle

Mevcut repository once location'i okuyor, sonra version predicate olmadan
update ediyor. Paralel iki hareket lost update uretebilir. Input'ta
`expectedVersion` ve `idempotencyKey` yok.

Yapilacaklar:

1. Movement input `expectedVersion` ve `idempotencyKey` alsin.
2. Update `WHERE character_id = ? AND version = ?` ile compare-and-swap
   kullansin.
3. Etkilenen satir yoksa `VERSION_CONFLICT` ve HTTP 409 dondur.
4. Ayni household + world + character + operation + key replay ayni sonucu
   dondursun, ikinci event/outbox uretmesin.
5. Paralel hareket testinde yalniz biri basarili olsun.
6. Ayni location'a hareket gercek servis testiyle reddedilsin.

## P1 - Event store ve transactional outbox'i use case'lere bagla

Mevcut `recordDomainEvent()` yalniz mock unit testlerde cagriliyor. Bootstrap,
movement, checkpoint ve archive use case'leri `world_event_store` yazmiyor.
Outbox implementasyonu yok.

Yapilacaklar:

1. Bootstrap transaction'inda en az WORLD_CREATED, REGION_ADDED,
   LOCATION_ADDED, HOME_CREATED, CHARACTER_ARRIVED ve CHECKPOINT_CREATED
   event'lerini sirali kaydet.
2. Movement transaction'inda character location update, movement audit event,
   CHARACTER_MOVED domain event ve outbox ayni transaction'da olsun.
3. Archive ve checkpoint event'lerini ilgili transaction'a dahil et.
4. Event'lerde world-scoped monotonic sequence/aggregate version uygula.
5. Transactional outbox'i mevcut persistence standardina uygun ekle veya
   repoda var olan ortak outbox'i kullan.
6. Rollback testinde domain state, event ve outbox'in birlikte geri alindigini
   kanitla.
7. Replay ayni canonical state/hash sonucunu vermeli.

## P1 - API contract ve response'lari tamamla

1. Naming'i Sprint 08 contract'i ile tutarli hale getir. Singular `/api/world`
   korunacaksa raporda gerekce ve kesin contract yaz; aksi halde canonical
   `/api/worlds` kullan.
2. World detail response yalniz `worlds` satiri olmasin. Region, location,
   home, residence, active character location, environment, manifest/version
   ve latest checkpoint ozetini donsun.
3. Checkpoint create ve verify endpoint'lerini ekle.
4. Tum request body ve query parametrelerini Zod ile validate et. `as never`
   ve unchecked cast kullanma.
5. Domain error -> HTTP status mapping tek yerde ve tutarli olsun.
6. World application boundary'sini route'larda repository'yi dogrudan
   olusturmayacak sekilde koru.

## Test kalite sorunlarini duzelt

`packages/world/tests/events/invariants.test.ts` icindeki bazi testler isimleri
ile ters davranis gosteriyor:

- "region keys are unique" testi duplicate iki key'in esit oldugunu onayliyor;
- "location keys are unique" ayni sekilde duplicate kabul ediyor;
- "home must reference a valid location" DB veya service validation yapmiyor;
- "movement from location to same location is rejected" yalniz getter
  assertion'i yapiyor.

Bu placebo testleri gercek davranis testleriyle degistir.

Zorunlu test matrisi:

- domain invariant unit testleri;
- deterministic generator/vector/hash golden testleri;
- disposable PostgreSQL migration + FK + unique constraint testleri;
- atomic bootstrap success/rollback/idempotency testleri;
- movement accessibility/adjacency/same-location/version/idempotency testleri;
- event sequence/replay/outbox atomicity testleri;
- API auth, validation, status ve cross-family isolation testleri;
- Playwright parent flow:
  accepted origin -> world bootstrap -> detail -> second location movement ->
  checkpoint -> reload/replay;
- ikinci household ayni world kaynaklarina erisemez.

External LLM smoke testin parcasi degildir. Kabul edilmis origin fixture'i DB'ye
seed et.

## Zorunlu dogrulama

Asagidaki komutlari gercekten calistir:

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

PostgreSQL integration testinde 0 skip olmali. Komut, disposable DB adi ve
exact pass/fail/skip sayilari rapora yazilmali. Test DB'yi is bitince temizle.

## Implementation report

Eksik olan
`docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md`
dosyasini olustur.

Rapor sunlari icersin:

1. S08-T01..S08-T06 durum tablosu.
2. Bu review'daki her P0/P1 bulgu icin source ve test kaniti.
3. Degisen dosyalar ve migration listesi.
4. DB constraint/FK/index tablosu.
5. API contract ve authorization matrisi.
6. Bootstrap transaction/idempotency kaniti.
7. Determinism, checkpoint hash ve replay kaniti.
8. Movement concurrency/idempotency kaniti.
9. Event/outbox atomicity kaniti.
10. Unit, PostgreSQL, API ve E2E exact test sonuclari.
11. Calistirilmayan veya skip edilen kontroller.
12. Known risks ve roll-forward plani.
13. Acceptance Criteria -> source -> test -> result traceability.

P0/P1 acik sorun, skipped PostgreSQL testi, cross-household sizinti, fake
checkpoint/replay, partial transaction veya rapor eksigi varsa Sprint 08'i
complete yazma.

## Final mesaj

Final mesajinda:

- kapatilan review bulgularini;
- yeni migration sayisini;
- unit/integration/API/E2E exact test sayilarini;
- skip/fail kalan kontrolleri;
- `IMPLEMENTATION_REPORT.md` yolunu

kisa ve dogrulanabilir sekilde yaz. Uygulamadan sonra Codex tekrar review
yapacak; Sprint 08 ancak tum kapanis kanitlari dogrulandiktan sonra
kapatilacak.
