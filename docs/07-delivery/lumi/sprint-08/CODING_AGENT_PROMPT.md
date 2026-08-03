# Sprint 08 Coding Agent Prompt

Bu promptu Project LUMI reposunda calisacak farkli bir kod ajanina ver.

## Rol ve ana hedef

Sen senior TypeScript, domain-driven design ve PostgreSQL muhendisisin.
Project LUMI Sprint 08 - World, Region and Home Domain kapsaminda ilk kalici
dunya temelini uygulayacaksin.

Kabul edilmis Character Origin Package'tan deterministik ve tekrar oynatilabilir
bir World, ilk Region, baslangic Location ve Home olustur. Character'in aktif
konumunu, hareket event'lerini, world version/checkpoint temelini ve
Family Space izolasyonunu kur.

Bu gorev bir analiz veya taslak gorevi degildir. Kod, migration, test ve
uygulama raporunu tamamla. Ancak kapsam disi sistemleri baslatma.

## Once okunacak belgeler

Kod yazmadan once su belgeleri oku:

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-08/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-07/IMPLEMENTATION_REPORT.md`
- `docs/07-delivery/lumi/sprint-07/AI_CHARACTER_ONBOARDING_FIX_REPORT.md`
- `docs/03-domain-design/characters/character-origin-and-world-bootstrap.md`
- `docs/03-domain-design/simulation/seeded-vector-bootstrap.md`
- `docs/03-domain-design/relationships/home-household-and-daily-life-system.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_08_World_State_Time_Simulation_Schema_v1.0.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_11_Audit_Outbox_Idempotency_Jobs_Operational_Schema_v1.0.md`
- `docs/04-architecture/lumi/application/01_Application_Architecture/04_TRANSACTION_AND_CONCURRENCY.md`
- `docs/07-delivery/lumi/initial-implementation-track-v1.md`

Mevcut kod kaliplarini da incele:

- `packages/profiles/src/domain`
- `packages/profiles/src/application`
- `packages/profiles/src/db`
- `packages/profiles/migrations`
- `packages/profiles/tests/integration`
- `apps/web/app/api/character-bootstrap`
- `apps/web/app/api/characters`
- `apps/web/lib/observability`

Belgeler ile calisan kod celisirse bunu gizleme. Canonical belgeyi, mevcut
runtime gercegini ve sectigin uyarlamayi implementation report'ta acikla.

## Baslangic ve exit-gate kontrolu

1. Dirty worktree olabilecegini kabul et. Kullaniciya veya baska ajanlara ait
   degisiklikleri revert etme.
2. Sprint 07 Round 5 kanitlarini kontrol et:
   - profiles unit: 228 passed;
   - profiles PostgreSQL integration: 68 passed;
   - web unit: 85 passed;
   - Playwright: 27 passed.
3. `CURRENT_STATUS.md` eskiyse bunu gercek kod ve son raporlarla karsilastir.
   Sessizce eski durumu dogru kabul etme.
4. Baseline komutlarini calistir ve Sprint 08 oncesinde zaten bulunan hatalari
   ayri kaydet. Yeni kodun bunlari artirmasina izin verme.
5. `@lumi/profiles` icin bilinen lint borcunu Sprint 08 basarisi gibi gizleme
   veya alakasiz toplu refactor ile temizlemeye calisma. Sprint 08'in kendi
   dosyalari sifir lint hatasi vermeli.

## Mimari sinir

Sprint spec `packages/world/domain` sinirini tanimliyor. Bu nedenle yeni bir
workspace paketi olustur:

```text
packages/world/
  src/domain/
  src/application/
  src/db/
  src/events/
  migrations/
  tests/domain/
  tests/integration/
  scripts/
```

Paket adi `@lumi/world` olsun. Mevcut `@lumi/profiles` paketini world domain
deposuna cevirmeyin. Profiles paketi child profile, character ve kabul edilmis
origin verisinin sahibi olarak kalmali. World paketi bu kayitlari server-side
referanslarla tuketmeli.

Yeni paket:

- strict TypeScript kullanmali;
- domain -> application -> infrastructure bagimlilik yonunu korumali;
- route veya React component icinden dogrudan ORM cagirmamali;
- unit test ve ayri destructive PostgreSQL integration test config'i
  tasimali;
- migration runner'i temiz ve mevcut veritabaninda forward-only calismali.

Paketler arasi cyclic dependency olusturma. World paketinin profiles ic
modullerine path import yapmasi yasak. Gerekli read contract'larini public
exports veya application port/interface ile kur. Yeni ortak soyutlama ancak
gercek dependency dongusunu kaldiriyorsa eklenebilir.

## Sprint task'lari

### S08-T01 - World, Region ve Location domain

Asgari domain modelleri:

- `World`
- `Region`
- `Location`
- `LocationConnection` veya esdeger accessibility modeli
- `Home`
- `Residence`
- `CharacterLocation`
- `EnvironmentSnapshot`
- `WorldBootstrapManifest`
- `WorldCheckpoint`
- `WorldEvent`

P0 invariant'lar:

- Her world tam olarak bir `householdId` ve `childProfileId` scope'una aittir.
- Bir child profile icin ayni anda en fazla bir aktif world vardir.
- Her Region tek bir World'e aittir.
- Her Location tek bir Region ve World'e aittir.
- Character ayni anda en fazla bir aktif Location'da bulunabilir.
- Home aidiyeti ile aktif physical residence ayri kayitlardir.
- Hareket yalnizca ayni world icindeki erisilebilir hedefe yapilabilir.
- Archived world mutate edilemez ve yeni session/hareket baslatamaz.
- State version monoton artar ve optimistic concurrency ile korunur.
- World event'leri append-only'dir.
- LLM veya story text canonical world state'i dogrudan degistiremez.

Domain validation:

- UUID, ad, slug, lifecycle, location type, accessibility ve environment enum
  degerleri validate edilmeli.
- Vector degerleri finite ve `0..1` araliginda olmali.
- JSONB metadata yalnizca typed schema validation sonrasinda kabul edilmeli.
- Domain'de `Math.random()` kullanma.

### S08-T02 - PostgreSQL schema ve repository

Additive ve forward-only migration olustur. Ayrik `world` schema kullan.
Mevcut migration numaralarini ve runner kalibini inceleyip cakismayan bir
strateji sec.

Asgari tablolar:

- `world.worlds` veya `world.world_states`
- `world.regions`
- `world.locations`
- `world.location_connections`
- `world.homes`
- `world.residences`
- `world.character_locations`
- `world.environment_snapshots`
- `world.bootstrap_manifests`
- `world.checkpoints`
- `world.world_events`
- transactional outbox icin mevcut ortak tablo veya
  `world.world_outbox_events`
- bootstrap/write idempotency ledger

Zorunlu DB korumalari:

- household, child profile, character ve accepted origin referanslari icin
  uygun foreign key veya acikca belgelenmis boundary kontrolu;
- bir child profile icin tek aktif world partial unique index'i;
- bir character icin tek aktif location partial unique index'i;
- Region/Location/Home world sahipligi icin composite FK veya esdeger DB
  korumasi;
- `(world_id, event_sequence)` unique;
- `(world_id, idempotency_key)` veya operation scope iceren unique
  idempotency index'i;
- non-negative/positive version ve sequence check'leri;
- archive soft-state; physical delete yok;
- immutable event tablosunda update/delete application metodu yok.

Repository sorgularinin tamami `householdId + childProfileId + worldId`
scope'unu tasimali. Yalniz `worldId` ile sorgu yapma. Client'tan gelen
household ID yetki kaniti sayilmaz.

### S08-T03 - Bootstrap, move ve checkpoint use case'leri

Asgari application servisleri:

- `bootstrapWorldFromAcceptedOrigin()`
- `getWorldForChildProfile()`
- `getWorldDetail()`
- `moveCharacter()`
- `createWorldCheckpoint()`
- `getLatestWorldCheckpoint()`
- `archiveWorld()`

#### Bootstrap transaction'i

Client'tan Origin Package payload'i alma. Yalniz ID'leri al ve server-side
olarak su zinciri dogrula:

1. Parent authenticated.
2. Parent household uyesi/owner.
3. Child profile ayni household'a ait ve archived degil.
4. Character ayni household ve child profile'a ait.
5. Character aktif ve `firstOriginPackageId` tasiyor.
6. Origin package ayni household/child profile'a ait.
7. Origin package `accepted = true`.
8. Handoff gercekten consume edilmis.
9. Active world daha once olusturulmamis veya ayni idempotency key replay'i.

Tek transaction icinde:

1. stable `universeSeed` ve versioned `regionSeed` turet;
2. bootstrap vector set'i deterministik olustur;
3. World kaydini olustur;
4. ilk Region'i olustur;
5. baslangic, home ve gerekiyorsa bir komsu/transition Location olustur;
6. Location connection/accessibility kayitlarini olustur;
7. Home ve Residence aidiyetini olustur;
8. Character'in tek aktif Location kaydini olustur;
9. ilk environment snapshot'i olustur;
10. tam `WorldBootstrapManifest` kaydet;
11. `WORLD_BOOTSTRAPPED` immutable event'ini ekle;
12. transactional outbox kaydini ekle;
13. version 1 checkpoint/hash kaydini ekle.

Herhangi bir adim basarisizsa hicbir partial world kaydi kalmamali.

Bootstrap idempotent olmali:

- ayni household + child profile + operation + idempotency key replay ayni
  world sonucunu dondurmeli;
- farkli household'lar ayni key'i kullanabilmeli;
- ayni child profile icin farkli key ile ikinci aktif world 409 conflict
  vermeli;
- concurrent iki bootstrap yalniz bir aktif world uretebilmeli.

#### Deterministik world olusturma

`seeded-vector-bootstrap.md` kurallarini gercek kodla uygula:

- versioned deterministic RNG;
- `universeSeed`, `originSeed`, accepted candidate seed, `regionSeed`,
  `generatorVersion`, `rngVersion`, `vectorVersion`;
- ayni manifest girdisi ayni vector, region archetype, location graph ve
  checkpoint hash'i uretmeli;
- farkli seed kontrollu farklilik uretmeli;
- vector degerleri `0..1`;
- deniz canlisi deniz/reef/lagoon/river baglaminda;
- sky creature cloud/cliff/floating-island baglaminda;
- robot workshop/lab/observatory/city baglaminda;
- coherent exception varsa Origin Package bunu acikca tasimali.

Sprint 08 bootstrap icin yeni LLM cagirma. Kabul edilmis Origin Package zaten
yaratici girdidir. Canonical World application/domain kodu tarafindan
deterministik olusturulur.

#### Movement

`moveCharacter()`:

- source active location'i server-side resolve etmeli;
- target ayni world'e ait olmali;
- aktif connection/accessibility bulunmali;
- archived/locked/inaccessible target reddedilmeli;
- expected world version zorunlu olmali;
- character location update, world version increment, immutable
  `CHARACTER_MOVED` event ve outbox ayni transaction'da olmali;
- idempotency key replay state'i ikinci kez degistirmemeli;
- stale version 409 conflict vermeli.

#### Checkpoint

Checkpoint:

- canonical ve stabil siralanmis payload'dan SHA-256 veya esdeger stabil hash
  uretmeli;
- world version, event sequence, active character location, home,
  environment ve bootstrap manifest referansini tasimali;
- tekrar okundugunda hash yeniden dogrulanabilmeli;
- snapshot event gecmisinin yerine gecmemeli.

### S08-T04 - Web API

Mevcut `withParent` ve `observeHandler` kaliplarini kullan. Route icinden ORM
cagirma.

Asgari endpoint'ler:

- `POST /api/worlds/bootstrap`
- `GET /api/worlds?householdId=&childProfileId=`
- `GET /api/worlds/[worldId]?householdId=&childProfileId=`
- `POST /api/worlds/[worldId]/move`
- `POST /api/worlds/[worldId]/checkpoints`
- `GET /api/worlds/[worldId]/checkpoints/latest`
- `POST /api/worlds/[worldId]/archive`

Body/query schema'larini Zod 4 ile strict validate et. Unknown field reddet.
Idempotency key icin tercihen `Idempotency-Key` header'i kullan ve normalize
edilmis operation type ile server-side scope et.

Status mapping:

- unauthenticated: 401;
- validation/missing field: 400;
- cross-family/cross-child: 403 veya kaynak gizleme gerekiyorsa mevcut
  contract ile uyumlu 404;
- not found: 404;
- duplicate active world, stale version, inaccessible movement: 409;
- archived world: 409;
- unexpected: 500.

Response'larda child-sensitive ham payload, secret, prompt veya encryption
bilgisi donme/loglama.

Tam map UI yapma. Sprint 08 API ve domain sprintidir. Var olan profil detay
sayfasina yalnizca mevcut tasarimla uyumlu, gerekli ve kucuk bir World ozet
durumu eklemek acceptance icin zorunluysa yap; yeni harita editoru veya
marketing UI olusturma.

### S08-T05 - Events, outbox ve continuity

Asgari event tipleri:

- `WORLD_BOOTSTRAPPED`
- `CHARACTER_LOCATION_INITIALIZED`
- `CHARACTER_MOVED`
- `WORLD_CHECKPOINT_CREATED`
- `WORLD_ARCHIVED`

Event envelope:

- event ID;
- world ID;
- household ID;
- child profile ID;
- aggregate version;
- event sequence;
- event type;
- occurredAt;
- actor user ID;
- idempotency key/operation;
- schema version;
- validated, minimum payload.

Event ve outbox yazimi state mutation ile ayni transaction'da olmali.
Outbox delivery worker, background simulation ve event propagation Sprint 08
kapsami disidir; yalniz kalici outbox kaydi ve delivery durumu temeli kur.

Replay testi:

- bootstrap event + movement event'lerinden projection yeniden kuruldugunda
  canonical active location ve version ayni olmali;
- event sequence bosluk/duplicate uretmemeli;
- checkpoint hash replay edilen state ile uyusmali.

### S08-T06 - Dokumantasyon ve seed fixture

Ekle:

- `docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md`
- `packages/world/tests/fixtures/` altinda en az:
  - sea creature accepted origin fixture;
  - fantasy/dragon fixture;
  - robot veya human fixture.

Fixture'larda gercek cocuk verisi, API key veya secret kullanma.

## Kapsam disi

Sunlari uygulama:

- background/offline simulation;
- world clock ilerletme motoru;
- autonomous NPC karar sistemi;
- NPC cognition/belief/memory;
- economy, civilization, politics veya culture simulation;
- Story Outcome Commit System;
- story generation pipeline;
- full map UI;
- image/audio generation;
- LLM ile canonical world mutation;
- mature event propagation worker.

Bu alanlara yalnizca interface/outbox boundary gerekiyorsa minimum port birak.

## Zorunlu test matrisi

### Domain unit

- deterministic RNG ayni seed icin ayni cikti;
- farkli seed kontrollu farkli cikti;
- vector clamp `0..1`;
- habitat affinity ve coherent exception;
- world lifecycle/version invariant'lari;
- Region/Location/Home sahiplik invariant'lari;
- tek aktif character location;
- inaccessible movement rejection;
- archived world mutation rejection;
- stable checkpoint hash.

### PostgreSQL integration

- temiz DB'de tum profiles + world migration'lari;
- mevcut Sprint 07 schema uzerine forward migration;
- bootstrap transaction tam basari;
- bootstrap partial failure rollback;
- bir child icin tek aktif world DB korumasi;
- bir character icin tek aktif location DB korumasi;
- cross-household ayni idempotency key;
- ayni scope replay;
- concurrent bootstrap;
- concurrent movement/stale version;
- append-only event ve unique sequence;
- state + event + outbox atomikligi;
- archive gecmisi korur;
- checkpoint read/hash verify.

Destructive testler development DB'de calistirilamaz. Benzersiz disposable
PostgreSQL database/container kullan, sonunda temizle. Testler DB yokken
sessizce PASS olamaz. Skip varsa raporda acikca blocker olarak yaz.

### API contract ve authorization

- her endpoint unauthenticated 401;
- missing household/child/world 400;
- cross-family ve cross-child denial;
- forged origin package/character ID denial;
- valid bootstrap;
- idempotent bootstrap replay;
- duplicate active world conflict;
- valid movement;
- inaccessible movement conflict;
- stale version conflict;
- checkpoint create/read;
- archived world denial.

### Smoke/E2E

Asgari server-side smoke:

1. parent kaydolur;
2. household ve child profile olusturur;
3. kabul edilmis origin ve character fixture'i olusturur;
4. world bootstrap endpoint'ini cagirir;
5. world detail'da Region, Location, Home ve active character location gorur;
6. erisilebilir ikinci Location'a hareket eder;
7. checkpoint olusturur ve hash/version okur;
8. baska household ayni world'e erisemez.

External LLM bu Sprint 08 smoke testinin parcasi degildir.

## Kalite komutlari

Yeni `@lumi/world` paketi icin script'leri ekle ve gercekten calistir:

```powershell
pnpm --filter @lumi/world lint
pnpm --filter @lumi/world typecheck
pnpm --filter @lumi/world test
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

PostgreSQL integration komutunda kullanilan disposable DB yontemini, env
degiskenlerini ve exact sonucu rapora yaz. Calistirilmayan komutu PASS olarak
yazma. Baseline'da bulunan unrelated failure ile Sprint 08'in olusturdugu
failure'i ayir.

## Implementation report zorunlulugu

Is bitince
`docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md` dosyasini olustur.

Rapor su bolumleri icermeli:

1. Release identity ve tarih.
2. S08-T01..S08-T06 task durumlari.
3. Degisen dosyalar.
4. Domain invariant'lari ve kod/test kaniti.
5. Migration tablolari, constraint/index'ler ve forward-only kaniti.
6. API endpoint/body/response/status contract'lari.
7. Bootstrap transaction ve idempotency kaniti.
8. Seed/RNG/vector version ve replay kaniti.
9. Movement, optimistic concurrency ve tek aktif location kaniti.
10. Event/outbox atomicity ve checkpoint hash kaniti.
11. Family Space/Child Profile izolasyon kaniti.
12. Calistirilan tum komutlar ve exact pass/fail/skip sayilari.
13. Acceptance Criteria -> source file -> test -> result traceability tablosu.
14. Bilinen riskler ve kapsam disi birakilanlar.
15. Rollback/roll-forward plani.
16. Codex review icin ozet.

Raporu kanitsiz "complete" yazma. P0/P1 acik sorun, calismayan migration,
calistirilmamis PostgreSQL testi, cross-family izolasyon acigi veya partial
transaction riski varsa Sprint 08'i kapanmis gostermeyin.

## Kod ajani final mesaji

Final mesajinda:

- tamamlanan Task ID'lerini;
- ana degisiklikleri;
- migration sayisini;
- unit/integration/API/E2E test sayilarini;
- calismayan kontrol veya bilinen riski;
- `IMPLEMENTATION_REPORT.md` yolunu

kisa ve dogrulanabilir bicimde yaz.

Bu implementasyondan sonra Codex kodu ve raporu review edecek. Eksik veya hatali
bulgu varsa takip duzeltme promptu hazirlanacak; tum P0/P1 bulgular kapanmadan
Sprint 08 kapanmayacak.
