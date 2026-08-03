# Sprint 08 Review Round 3 Fix Prompt

Bu gorev Sprint 08 kapanis blokajlarini gidermek icindir. Onceki rapor
`docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md` bazi maddeleri
"fixed" olarak isaretliyor; ancak review kod kontrolunde bu maddelerin onemli
bir kismi hala kapanmadi. Bu sprinti kapatmak icin asagidaki sorunlari
duzelt, test kanitlarini rapora ekle ve en sonda Codex review icin net cikti
uret.

## P0 - Rapor gercegi yansitmiyor, deferred maddeler Sprint 08 kapsaminda

`IMPLEMENTATION_REPORT.md` su maddeleri Sprint 09'a erteleme olarak yaziyor:

- deterministic checkpoint hash/replay;
- optimistic concurrency;
- movement/bootstrap idempotency;
- transactional outbox;
- integration tests;
- E2E tests.

Bunlar Sprint 08 kapanis kriterleriydi. Bu maddeleri Sprint 09'a erteleme.
Kodda tamamla veya raporda Sprint 08 kapanamaz diye acikca belirt. Beklenen
cikti Sprint 08'in kapanabilecegini kanitlamali.

## P0 - Checkpoint hash ve verify placebo

Sorunlu dosyalar:

- `packages/world/src/application/checkpoint.service.ts`
- `packages/world/src/application/world-bootstrap.service.ts`

Mevcut durum:

- `checkpoint.service.ts:47` state hash olarak random UUID parcasi uretiyor.
- `checkpoint.service.ts:84-85` verify icin tekrar random hash uretiyor ve
  `|| true` ile her zaman basarili donuyor.
- `world-bootstrap.service.ts:369-375` bootstrap checkpoint hash'i de random.

Beklenen cozum:

1. Deterministik canonical world state snapshot olustur:
   - world;
   - regions;
   - locations;
   - homes/residences;
   - character current location;
   - environment snapshots;
   - location connections;
   - bootstrap manifest;
   - generator/vector/schema version metadata.
2. JSON canonicalization kullan:
   - key sirasi stabil;
   - volatile alanlari disla veya normalize et (`createdAt`, `updatedAt`,
     random UUID gibi degerler hash'e girmemeli).
3. SHA-256 hash uret.
4. `verifyCheckpointHash()` gercek yeniden hesaplama yapmali ve sadece hash
   esit ise true donmeli.
5. Bootstrap ve manuel checkpoint ayni mekanizmayi kullanmali.
6. Test ekle:
   - ayni seed/input ayni checkpoint hash'i uretir;
   - state degisince hash degisir;
   - verify false/true senaryolari;
   - `|| true` benzeri bypass olmadigini yakalayan regression test.

## P0 - Idempotency sadece schema'da var, use case'e bagli degil

Sorunlu dosyalar:

- `apps/web/app/api/world/route.ts`
- `packages/world/src/application/world-bootstrap.service.ts`
- `packages/world/src/application/movement.service.ts`
- `packages/world/src/db/schema/world/idempotency-ledger.ts`
- `packages/world/src/db/repositories/drizzle/drizzle-world.repository.ts`

Mevcut durum:

- API `idempotencyKey` kabul ediyor ama `createWorldFromOrigin()` input'una
  iletmiyor.
- `BootstrapWorldInput` icinde `idempotencyKey` yok.
- `world_idempotency_ledger` schema'si var ama repository/use-case tarafinda
  lookup/create/replay kullanimi yok.
- Movement input'unda `idempotencyKey` yok.

Beklenen cozum:

1. Bootstrap input'una `idempotencyKey` ekle ve route'tan use case'e ilet.
2. Movement input'una `idempotencyKey` ve `expectedVersion` ekle.
3. Ledger repository metodlari ekle:
   - find by `(householdId, worldId nullable, operationType, idempotencyKey)`;
   - insert pending/complete veya transactional insert + result payload;
   - replay sonucu ayni response payload olarak dondur.
4. Scope kurallari:
   - bootstrap: household + character/child profile + operation + key;
   - movement: household + world + operation + key.
5. Ayni idempotency key replay ikinci world/location/event/outbox kaydi
   uretmemeli.
6. Farkli household ayni key ile birbirini etkilememeli.
7. Test ekle:
   - ayni bootstrap key replay ayni `worldId` dondurur;
   - farkli household ayni key ile ayri world olusturabilir;
   - movement replay ayni event/result dondurur;
   - replay sonrasi event sayisi artmaz.

## P0 - Movement concurrency ve world version eksik

Sorunlu dosyalar:

- `apps/web/app/api/world/[id]/movement/route.ts`
- `packages/world/src/application/movement.service.ts`
- `packages/world/src/db/repositories/drizzle/drizzle-world.repository.ts`

Mevcut durum:

- Request body `expectedVersion` almiyor.
- `moveCharacterToLocation()` sadece current location version + 1 yapiyor.
- `worldRecord.version` movement sirasinda artmiyor.
- Event aggregate version `worldRecord.version + 1`, ama world version update
  edilmedigi icin tekrarlayan hareketlerde ayni aggregate version uretilebilir.

Beklenen cozum:

1. Movement route `expectedVersion` ve `idempotencyKey` alsin.
2. Transaction icinde optimistic concurrency uygula:
   - current world/version veya character-location version beklenen degerle
     eslesmeli;
   - mismatch durumunda 409 `VERSION_CONFLICT`.
3. Movement basarili olunca world version atomik artmali.
4. Event aggregate version artan world version ile ayni olmali.
5. Unique event sequence constraint'i gercek akista conflict uretmemeli.
6. Test ekle:
   - stale expectedVersion 409;
   - iki movement sirali version 2/3 event uretir;
   - ayni idempotency replay version artirmaz.

## P0 - Transactional outbox yok

Sorunlu dosyalar:

- `packages/world/migrations/*`
- `packages/world/src/db/schema/world/*`
- `packages/world/src/application/event-store.service.ts`
- bootstrap, movement, archive, checkpoint use case'leri.

Mevcut durum:

- Domain event store var, ama transactional outbox tablosu/modeli yok.
- Rapor "event store wired" diyor; ancak Sprint 08 prompt'unda istenen outbox
  persistence ve delivery status temeli yok.

Beklenen cozum:

1. Forward-only migration ile outbox tablosu ekle veya repoda canonical outbox
   varsa onu kullan:
   - id;
   - world_id;
   - event_id;
   - event_type;
   - aggregate_version;
   - payload;
   - status (`pending`, `published`, `failed`);
   - attempts;
   - created_at/updated_at.
2. Event store ve outbox ayni DB transaction icinde yazilsin.
3. Bootstrap, movement, archive, checkpoint eventleri outbox kaydi uretmeli.
4. Rollback testinde state/event/outbox birlikte geri alinmali.

## P1 - Migration hardening hala yarim

Sorunlu dosyalar:

- `packages/world/migrations/0003_world_hardening.sql`
- `packages/world/migrations/0004_world_scope_and_continuity_hardening.sql`
- `packages/world/scripts/world-migrate.mjs`
- `packages/world/tests/integration/world-bootstrap.integration.test.ts`

Mevcut durum:

- `0003_world_hardening.sql` unguarded `ALTER TABLE ADD CONSTRAINT` kullaniyor.
  Migration runner ledger'i bos olan disposable DB'de ilk calismada tamam; ama
  ledger olmayan mevcut DB'de veya SQL dosyasi manuel replay edilirse kirilir.
- `world-migrate.mjs` ledger tablosunu `profile._world_migration_ledger`
  altinda yaratmadan once `profile` schema var sayiyor.
- Integration test `afterAll` icinde `DROP SCHEMA IF EXISTS profile CASCADE`
  yapiyor. DB name guard var ama yine de sadece disposable DB'de calismasi
  net raporlanmali.
- `0004` yorumunda "one active world per child" deniyor ama index
  `character_id` uzerinde. Kural netlestirilmeli: uygulamada bir child profile
  birden cok karakter/world tasiyacaksa character bazli; degilse child bazli.

Beklenen cozum:

1. Yeni forward-only migration ekle; mevcut dosyalari geriye donuk bozma.
2. Eksik FK/unique/check constraint'leri idempotent `DO $$` bloklariyla ekle.
3. `CREATE SCHEMA IF NOT EXISTS profile` migration runner tarafinda garanti
   edilsin.
4. Ledger eski DB'lerde guvenli calissin:
   - ledger yoksa mevcut constraint/table durumunu tespit edip migrationlari
     tekrar calistirirken patlamayacak strateji uygula;
   - en azindan raporda migration replay sinirlarini acik yaz.
5. Integration test disposable DB disinda destructive calismasin ve env eksikse
   test suite yesil gorunmesin.
6. Test/komut kaniti:
   - migration runner iki kez ust uste calisir;
   - disposable PostgreSQL integration suite 0 skip ile gecer.

## P1 - API movement GET hala karakter sorgusuna fazla guveniyor

Sorunlu dosya:

- `apps/web/app/api/world/[id]/movement/route.ts`

Mevcut durum:

- Route world access'i dogruluyor, fakat sonra query'den gelen `characterId`
  ile `getCharacterCurrentLocation(characterId)` ve
  `getCharacterMovementHistory(characterId)` cagiriyor.
- Service fonksiyonlari worldId/householdId scope almiyor.

Beklenen cozum:

1. Movement read servisleri `worldId`, `householdId`, `characterId` scope'u ile
   calissin.
2. Character'in URL'deki world'e ait oldugu servis seviyesinde de dogrulansin.
3. Cross-world/cross-household read testleri ekle.

## P1 - Server-side origin resolve hala zayif fallback uretiyor

Sorunlu dosya:

- `apps/web/app/api/world/route.ts`

Mevcut durum:

- Accepted origin package payload alanlari eksikse route fallback stringleri
  uretiyor (`friendly_neighbor`, `mystery_seed`, `Home Base`, `Starting Area`).
- Bu, Sprint 07'de yasadigimiz statik/mock hissini world bootstrap tarafina
  tekrar tasir.

Beklenen cozum:

1. Accepted origin package payload contract'ini zod ile dogrula.
2. Eksik kritik alanlarda fallback world uretme; 400/422 don.
3. Gerekirse profile package tarafinda accepted package payload normalizer
   kullan.
4. Test ekle:
   - eksik origin payload world olusturmaz;
   - valid accepted package server-side resolve ile world uretir;
   - client body'den seed/originPackage override edilemez.

## Gerekli dogrulama

Asagidaki komutlari calistir ve rapora tam sonuc ekle:

```powershell
pnpm --filter @lumi/world lint
pnpm --filter @lumi/world typecheck
pnpm --filter @lumi/world test
pnpm --filter @lumi/web typecheck
node scripts/check-mojibake.mjs
git diff --check
```

PostgreSQL destructive integration icin disposable DB kullan:

```powershell
$env:WORLD_TEST_ENABLE_DESTRUCTIVE="true"
$env:WORLD_TEST_DATABASE_URL="postgresql://lumi:lumi_local_only@localhost:15432/<disposable-test-db>"
pnpm --filter @lumi/world test:int
```

E2E icin world bootstrap akisini kapsayan test ekle ve calistir:

```powershell
pnpm --filter @lumi/web test:e2e
```

## Rapor guncelleme

`docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md` icinde:

1. Deferred to Sprint 09 altinda Sprint 08 kapanis kriteri olan madde
   kalmasin.
2. Integration/E2E unchecked ise Sprint 08 kapatilamaz diye yaz.
3. Migration runner iki kez calisma kanitini ekle.
4. Idempotency replay, checkpoint determinism, concurrency ve outbox kanitlarini
   test isimleriyle yaz.
5. En sona su baslikla Codex review cikti bolumu ekle:

```md
## Codex Review Handoff

- Changed files:
- Commands run:
- PostgreSQL disposable DB name:
- Integration result:
- E2E result:
- Known remaining risks:
```

Bu prompt tamamlandiktan sonra Codex tekrar review yapacak. Sprint 08 ancak
P0/P1 maddeleri kod, migration ve test kanitlariyla kapandiginda kapatilabilir.
