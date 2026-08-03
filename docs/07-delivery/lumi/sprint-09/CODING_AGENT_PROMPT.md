# Sprint 09 Coding Agent Prompt

Bu promptu Project LUMI reposunda calisacak farkli bir kod ajanina ver.

## Rol ve ana hedef

Sen senior TypeScript, domain-driven design ve PostgreSQL muhendisisin.
Project LUMI Sprint 09 - Story Definition and Session kapsaminda versioned
Story Definition ile Story Session'i ayiran kalici story domain temelini
uygulayacaksin.

Baslatma, ilerletme, checkpoint ve guvenli resume saglayan story session
temelini kur. LLM uretimi, choice consequence degerlendirme, world commit veya
medya uretimi bu sprint'in kapsami disindadir.

Bu gorev analiz veya taslak gorevi degildir. Kod, migration, test ve uygulama
raporunu tamamla. Ancak kapsam disi sistemleri baslatma.

## Once okunacak belgeler

Kod yazmadan once su belgeleri oku (canonical belgelerle calisan kodun her
celiskisini implementation report'ta saklama):

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-09/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-08/IMPLEMENTATION_REPORT.md`
- `docs/07-delivery/lumi/persistence/schemas/story/LUMI-story-schema-v1.md`
- `docs/07-delivery/lumi/persistence/schemas/story/LUMI-story-session-transaction-boundaries-v1.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_07_Story_Scene_Choice_Session_Schema_v1.0.md`
- `docs/04-architecture/lumi/narrative/Story Session, Playback & Interaction Orchestration Engine.md`
- `docs/04-architecture/lumi/narrative/Scene, Beat & Narrative Flow Orchestration.md`
- `docs/04-architecture/story-experience/story-challenge-puzzle-encounters.md`

Mevcut kod kaliplarini da incele (Sprint 08 uygulamasi en yakin referans):

- `packages/world/src/domain`
- `packages/world/src/application`
- `packages/world/src/db/client` ve `packages/world/src/db/repositories`
- `packages/world/src/db/schema/world`
- `packages/world/migrations`
- `packages/world/scripts/world-migrate.mjs`
- `packages/world/vitest.config.ts` ve `vitest.integration.config.ts`
- `apps/web/app/api/world`
- `apps/web/lib/auth` ve `apps/web/lib/observability`

## Baslangic ve exit-gate kontrolu

1. Dirty worktree olabilecegini kabul et. Kullaniciya veya baska ajanlara ait
   degisiklikleri revert etme.
2. Sprint 08 exit gate kanitlarini kontrol et:
   - `@lumi/world` unit: 73 passed;
   - `@lumi/web` unit: 85 passed;
   - `@lumi/profiles` unit: 228 passed;
   - `pnpm build` passed.
3. `CURRENT_STATUS.md` eskiyse bunu gercek kod ve son raporlarla karsilastir;
   sessizce eski durumu dogru kabul etme.
4. Baseline komutlarini calistir ve Sprint 09 oncesinde zaten bulunan hatalari
   ayri kaydet. Yeni kodun bunlari artirmasina izin verme.
5. Bilinen pre-existing lint borcunu Sprint 09 basarisi gibi gizleme veya
   alakasiz toplu refactor ile temizlemeye calisma. Sprint 09'un kendi
   dosyalari sifir lint hatasi vermeli.

## Mimari sinir

Sprint spec `packages/story/domain` sinirini tanimliyor. Yeni bir workspace
paketi olustur:

```text
packages/story/
  src/domain/
  src/application/
  src/db/
  migrations/
  scripts/
  tests/domain/
  tests/events/
  tests/integration/
```

Paket adi `@lumi/story` olsun. Mevcut world/profiles paketlerini story deposu
yapma. Story paketi child profile, character ve world kayitlarini yalnizca
server-side referanslarla tuketmeli; read contract'larini public export veya
application port/interface ile kurmalidir. Paketler arasi cyclic dependency ve
path import yasak.

Yeni paket:

- strict TypeScript kullanmali;
- domain -> application -> infrastructure bagimlilik yonunu korumali;
- route veya React component icinden dogrudan ORM cagirmamali;
- unit test ve ayri destructive PostgreSQL integration test config'i
  tasimali;
- migration runner'i temiz ve mevcut veritabaninda forward-only calismali.

Yeni schema `story` olmalidir (Sprint 08'den `profile` ve `world` ayri).

## Sprint task'lari

### S09-T01 - Story Definition ve Version domain

Asgari domain modelleri (`packages/story/domain`):

- `StoryDefinition` (aggregate root; reusable)
- `StoryVersion` (immutable publication record)
- `StoryChapter` ve `StoryScene` (yapilandirilmis chapter/scene)
- `StorySceneTransition`
- `StoryMode` (static / interactive)
- `PublishedStoryVersion` read projection

P0 invariant'lar:

- Story Definition ile Story Session farkli aggregate root'lardir.
- Published Story Version immutable'dir; duzeltme yeni version gerektirir.
- Her version `storyDefinitionId`'ye baglanir ve `versionNumber` monoton artar.
- Version. Yalniz `frozen` version `published` olabilir.
- Scene ve transition yalniz kendi version'ina aittir; cross-version baglanti
  reddedilir.
- Her version tam olarak bir entry scene tasir.
- Immutable published versiyonda content mutation (scene/choice/prompt/transition
  guncelleme) reddedilir.
- LLM veya story text canonical world state'i degistiremez.

Domain validation:

- Slug, title, storyType, sceneType, transitionType, lifecycle enum degerleri
  validate edilmeli.
- `Math.random()` domain'de kullanilmamali.
- hash, versionNumber ve sequence pozitif/non-negative kontrol edilmeli.

### S09-T02 - Story Session lifecycle (state machine)

`StorySession` aggregate root. State machine:

```text
created -> active <-> paused
active -> completed
active -> abandoned
```

Su use case'ler en az:

- `startSession()` - version'dan session baslat; active scene'i entry scene
  set; version=1; participant kaydet.
- `getSessionPlaybackState()` - active scene + participant + context snapshot.
- `pauseSession()` - active -> paused; checkpoint yaz.
- `resumeSession()` - paused -> active; ayni active scene + participant state.
- `advanceScene()` - session'i ilerlet (next scene); optimistic version.
- `completeSession()` -> completed + `completedAt`.
- `abandonSession()` -> abandoned, gecemis korunur.
- `getSessionHistory()`.

Zorunlu kurallar:

- Yalnizca izin verilen state machine transitionlari yurutulebilir; invalid
  transition reddedilir.
- Completed session yeniden ilerletilemez.
- Ayni session/choice retry ile ikinci kez commit edilemez (idempotency).
- Active/paused session state'i server-side canonical.

### S09-T03 - Story schema ve repository

Additive ve forward-only migration. Ayrik `story` schema kullan. World paketi
migration numaralari ile cakismayan strateji secer; `0001_story_schema.sql`
ve gerekirse `0002_story_hardening.sql` ekle.

Asgari tablolar:

- `story.story_definitions`
- `story.story_versions`
- `story.story_chapters`
- `story.story_scenes`
- `story.story_scene_transitions`
- `story.story_sessions`
- `story.story_session_characters`
- `story.story_session_scene_visits`
- `story.story_session_checkpoints`
- `story.story_idempotency_ledger`
- `story.story_event_store`
- gemein outbox tablosu ya da story.story_outbox_events

Zorunlu DB korumalari (DO block + `__story_constraint_exists` idempotent guard):

- `child_profile_id` ve `world_id` icin FK,
- `story_sessions` icin `(story_session_id, scene_id)` value,
- tek aktif session pointer'i child profil basina partial unique index,
- version / sequence non-negative check,
- version immutable publish (content hash vs),
- event append-only; update/delete metodu yok.

Repository questlerinin tamami `householdId + childProfileId + storyId` scope:
client'tan gelen household ID yetki kaniti sayilmaz.

### S09-T04 - Web API

Mevcut `withParent` ve `observeHandler` kaliplarini kullan. Route icinden ORM
cagirma.

Asgari endpoint'ler:

- `GET /api/stories` - yayinlanmis hikaye katalogu (scope'lu)
- `GET /api/stories/{storyId}/versions/{versionNumber}` - hikaye/version graph
- `POST /api/stories/{storyId}/sessions` - session baslat
- `GET /api/stories/sessions/{sessionId}` - playback state
- `POST /api/stories/sessions/{sessionId}/pause`
- `POST /api/stories/sessions/{sessionId}/resume`
- `POST /api/stories/sessions/{sessionId}/advance`
- `POST /api/stories/sessions/{sessionId}/complete`
- `POST /api/stories/sessions/{sessionId}/abandon`
- `POST /api/stories/sessions/{sessionId}/checkpoints`
- `GET /api/stories/sessions/{sessionId}/checkpoints/latest`

Body/query schema'larini Zod strict + unknown field reddet. Idempotency key icin
`Idempotency-Key` header'i tercih et ve normalize operation ile scope et.

Status mapping:

- unauthenticated 401
- validation/missing field 400
- cross-family/cross-child 403 ya da kaynak gizleme 404
- not found / not accessible 404
- duplicate active session, stale version, invalid transition 409
- completed-session progression durduruldu 409

Response'da child-sensitive ham payload, secret, prompt veya encryption bilgisi
donme/loglama.

Full map UI / story reader UI yapma. Sprint 09 domain+API+session sprinti.
Mevcut profil detay sayfasina gerekli ve kucuk bir "Story/Session ozet" state'i
ancak kabul icin zorunluysa ekle; yeni reader ya da marketing UI olusturma.

### S09-T05 - Checkpoint, resume, idempotency

- Checkpoint: canonical Sorted payload'dan SHA-256 stabil hash; `sessionVersion`,
  `eventSequence`, active scene, active participants, context snapshot referansi.
- Retry: ayni idempotency key ile ayni payload ikinci kez ayni result dondurur,
  durum bir kere apply edilir; farkli payload key hesabinda 409.
- Stale version optimistic concurrency conflict 409.
- Crash sonrasi resume active scene'i ayni state ile geri getirir; duplicate
  progression uretmez.

Checkpoint. 2026 yili itibari insert check:

- ayni session durumunun iki kez ilerletilememesini garantiler.
- checkpoint sonrasi crash/retry duplicate progression uretmez.

### S09-T06 - Dokumantasyon ve fixture

Ekle:

- `docs/07-delivery/lumi/sprint-09/IMPLEMENTATION_REPORT.md`
- En az su story fixture'lari `packages/story/tests/fixtures/`:

  - static story definition (Chapter/Scene/narrative, must type);
  - interactive story definition (choice); 
  - published story version graph + one child session.

Fixture'larda gercek cocuk verisi, API key veya secret kullanma.

## Mimari ve teknik sinir

- static + interactive story mode support;
- chapter / scene / transition structure;
- session context snapshot ve checkpoint;
- pause/resume/complete/abandon lifecycle;
- reflection question ve parent-note placeholder 'contracts' (yalnizca
  declaration / placeholder tablo/yadsi);
- resumable stability.

## Quality stort

Yeni `@lumi/story` icin script'ler ekle ve gercekten calistir:

```powershell
pnpm --filter @lumi/story lint
pnpm --filter @lumi/story typecheck
pnpm --filter @lumi/story test
pnpm --filter @lumi/story test:int

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
degiskenlerini ve exact sonucu rapora yaz. Calistirilmayan komutu PASS yazmaz.

## Implementation report zorunlulugu

Is bitince
`docs/07-delivery/lumi/sprint-09/IMPLEMENTATION_REPORT.md` dosyasini olustur.

Rapor bolumleri (Sprint 08 report deseni ile uyumlu):

1. Release identity ve tarih.
2. S09-T01..S09-T06 task durumlari.
3. Degisen dosyalar.
4. Domain invariant/state machine kaniti (unit test).
5. Migration tablolari, constraint/indexler och forward-only kaniti.
6. API endpoint/body/response/status contract'lari.
7. Session lifecycle + resume/identifier kontra.
8. Checkpoint SHA-256 + crash/retry kaniti.
9. Family Space/Child Profile izolasyon kaniti.
10. Calistirilan tum komutlar + exact pass/fail/skip sayilarini.
11. Acceptance Criteria -> source file -> test -> result traceability tablosu.
12. Bilinen riskler ve scope disi biraklar.
13. Rollback/rollforward plani.
14. Codex review icin ozet.

Raporu kanitsiz "complete" yazmaz. P0/P1 acik sorun, calismayan migration,
calistirilmamış PostgreSQL testi, cross-family izolasyon acigi veya partial
transaction riski varsa Sprint 09'i kapanmis gostermez.

## Cod ajani final mesaj

Final mesajinda:

- tamamlanan Task ID'leri;
- ana degisiklikleri;
- migration sayini;
- unit/integration/API/E2E test sayilari;
- calismayen kontrol veya bilinen risk;
- `IMPLEMENTATION_REPORT.md` yolunu

kisa ve dogrulanabilir sekilde yaz.