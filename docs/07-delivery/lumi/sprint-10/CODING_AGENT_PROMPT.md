# Sprint 10 Coding Agent Prompt

Bu promptu Project LUMI reposunda calisacak farkli bir kod ajanina ver.

## Rol ve ana hedef

Sen senior TypeScript, domain-driven design ve PostgreSQL muhendisisin.
Project LUMI Sprint 10 - Choice and Session Consequence kapsaminda
interactive story icindeki choice point, choice option, session-local consequence
ve immutable choice history sistemini uygulayacaksin.

Choice commit, availability/rule evaluation, consequence preview ve outcome
candidate contract'ini kur. Canonical world state mutation, story outcome commit
engine, NPC decision engine ve reward economy bu sprint'in kapsami disindadir.

Bu gorev analiz veya taslak gorevi degildir. Kod, migration, test ve uygulama
raporunu tamamla. Ancak kapsam disi sistemleri baslatma.

## Once okunacak belgeler

Kod yazmadan once su belgeleri oku (canonical belgelerle calisan kodun her
celiskisini implementation report'ta saklama):

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-10/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-09/IMPLEMENTATION_REPORT.md`
- `docs/07-delivery/lumi/persistence/schemas/story/LUMI-story-schema-v1.md`
- `docs/07-delivery/lumi/persistence/schemas/story/LUMI-story-session-transaction-boundaries-v1.md`
- `docs/04-architecture/lumi/narrative/Story Session, Playback & Interaction Orchestration Engine.md`
- `docs/04-architecture/lumi/narrative/Scene, Beat & Narrative Flow Orchestration.md`
- `docs/04-architecture/story-experience/story-challenge-puzzle-encounters.md`

Mevcut kod kaliplarini da incele (Sprint 09 uygulamasi en yakin referans):

- `packages/story/src/domain`
- `packages/story/src/application`
- `packages/story/src/db/client` ve `packages/story/src/db/repositories`
- `packages/story/src/db/schema/story`
- `packages/story/migrations`
- `packages/story/vitest.config.ts`
- `apps/web/app/api/stories`
- `apps/web/lib/auth` ve `apps/web/lib/observability`

## Baslangic ve exit-gate kontrolu

1. Dirty worktree olabilecegini kabul et. Kullaniciya veya baska ajanlara ait
   degisiklikleri revert etme.
2. Sprint 09 exit gate kanitlarini kontrol et:
   - `@lumi/story` unit: 16 passed;
   - `@lumi/profiles` unit: 228 passed;
   - `@lumi/web` unit: 85 passed;
   - `pnpm build` passed.
3. `CURRENT_STATUS.md` eskiyse bunu gercek kod ve son raporlarla karsilastir;
   sessizce eski durumu dogru kabul etme.
4. Baseline komutlarini calistir ve Sprint 10 oncesinde zaten bulunan hatalari
   ayri kaydet. Yeni kodun bunlari artirmasina izin verme.
5. Bilinen pre-existing lint borcunu Sprint 10 basarisi gibi gizleme veya
   alakasiz toplu refactor ile temizlemeye calisma. Sprint 10'un kendi
   dosyalari sifir lint hatasi vermeli.

## Mimari sinir

Sprint 10 spec `packages/story` paketi icinde calisir. Mevcut `@lumi/story`
paketini genislet:

```text
packages/story/
  src/domain/choice/
  src/application/choice/
  src/db/schema/story/
  migrations/
  tests/domain/choice/
  tests/application/
  tests/integration/
```

Yeni kod:

- strict TypeScript kullanmali;
- domain -> application -> infrastructure bagimlilik yonunu korumali;
- route veya React component icinden dogrudan ORM cagirmamali;
- unit test ve ayri destructive PostgreSQL integration test config'i tasimali;
- migration runner'i temiz ve mevcut veritabaninda forward-only calismali.

## Sprint task'lari

### S10-T01 - Choice / Consequence domain

Asgari domain modelleri (`packages/story/src/domain/choice`):

- `StoryChoicePoint` (session-local choice point reference)
- `StoryChoiceOption` (availability rule + hint + consequence preview)
- `CommittedChoice` (immutable choice record)
- `ChoiceConsequence` (session-local outcome)
- `OutcomeCandidate` (schema-valid placeholder for world commit engine)
- `ChoiceRuleContext` / `ChoiceAvailabilityRule`

P0 invariant'lar:

- Bir choice point ayni session icinde yalnizca bir kez commit edilir.
- Committed choice immutable'dir; guncelleme yeni kayit gerektirir.
- Option availability server-side canonical session context ile hesaplanir.
- LLM kural sonucunu veya DB state'ini belirleyemez.
- Consequence yalnizca session-local state ve outcome candidate uretir.
- `evidenceSceneId`, choice ve rule version izlenir.

Domain validation:

- Enum degerleri validate edilmeli (choice type, rule operator, consequence type).
- `Math.random()` domain'de kullanilmamali.
- Sequence ve version degerleri non-negative/positive kontrol edilmeli.

### S10-T02 - Availability / rule evaluator

Application katmaninda table-driven rule evaluator:

- `evaluateOptionAvailability(choicePoint, option, sessionContext)`
- Operator seti: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `has_flag`.
- Rule context: session status, active scene, checkpoint hash, participant state,
  story version, choice history.
- Hint sonuc garantisi vermez; yasa uygun ve manipulatif olmayan dil kullanir.

Test'ler table-driven unit test olmali; boundary case'leri kapsamali.

### S10-T03 - Persistence ve idempotency

Additive ve forward-only migration. `story` schema icine ekle:

- `story.story_choice_points`
- `story.story_choice_options`
- `story.story_committed_choices`
- `story.story_choice_consequences`
- `story.story_outcome_candidates`

Zorunlu DB korumalari (DO block + idempotent guard):

- FK'ler `story_sessions`, `story_scenes`, `story_versions` tablolarina;
- `(story_session_id, choice_point_id)` unique committed choice;
- `(story_session_id, choice_point_id, option_id)` idempotency scope;
- outcome candidate append-only; update/delete metodu yok.

Repository sorgularinin tamami `householdId + childProfileId + storySessionId`
scope'lu; client'tan gelen household ID yetki kaniti sayilmaz.

### S10-T04 - Choice commit APIs

Mevcut `withParent` ve `observeHandler` kaliplarini kullan. Route icinden ORM
bagimli kod cagirma.

Asgari endpoint'ler:

- `GET /api/stories/sessions/{sessionId}/choices` - aktif scene'deki choice point'ler
- `GET /api/stories/sessions/{sessionId}/choices/{choicePointId}` - option availability
- `POST /api/stories/sessions/{sessionId}/choices/{choicePointId}/commit` - secim commit
- `GET /api/stories/sessions/{sessionId}/choices/history` - immutable choice history
- `GET /api/stories/sessions/{sessionId}/outcomes/latest` - latest outcome candidate

Body/query schema'larini Zod strict + unknown field reddet. Idempotency key icin
`Idempotency-Key` header'i tercih et ve normalize operation ile scope et.

Status mapping:

- unauthenticated 401
- validation/missing field 400
- cross-family/cross-child 403 ya da kaynak gizleme 404
- not found / not accessible 404
- already committed / invalid option / concurrent conflict 409
- rule version mismatch 409

Response'da child-sensitive ham payload, secret, prompt veya encryption bilgisi
donne/loglama.

### S10-T05 - Outcome candidate contract

- `OutcomeCandidate` schema-valid JSON uretir.
- World state'i degistirmez; yalnizca candidate kaydi olusturur.
- `story_outcome_candidates` tablosu append-only'dir.
- Candidate'ler choice history ve consequence ile baglantilidir.

### S10-T06 - Dokumantasyon ve fixture

Ekle:

- `docs/07-delivery/lumi/sprint-10/IMPLEMENTATION_REPORT.md`
- En az su choice fixture'lari `packages/story/tests/fixtures/`:

  - static story icin basit choice point;
  - interactive story icin conditional option;
  - committed choice + consequence + outcome candidate chain.

Fixture'larda gercek cocuk verisi, API key veya secret kullanma.

## Quality short

Yeni Sprint 10 icin script'leri calistir ve gercekten calistir:

```powershell
pnpm --filter @lumi/story lint
pnpm --filter @lumi/story typecheck
pnpm --filter @lumi/story test
pnpm --filter @lumi/story test:int

pnpm --filter @lumi/web lint
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test

node scripts/check-mojibake.mjs
git diff --check
pnpm build
```

PostgreSQL integration komutunda kullanilan disposable DB yontemini, env
degiskenlerini ve exact sonucu rapora yaz. Calistirilmayan komutu PASS yazmaz.

## Implementation report zorunlulugu

Is bitince
`docs/07-delivery/lumi/sprint-10/IMPLEMENTATION_REPORT.md` dosyasini olustur.

Rapor bolumleri (Sprint 09 report deseni ile uyumlu):

1. Release identity ve tarih.
2. S10-T01..S10-T06 task durumlari.
3. Degisen dosyalar.
4. Domain invariant / rule evaluator kaniti (unit test).
5. Migration tablolari, constraint/indexler ve forward-only kaniti.
6. API endpoint/body/response/status contract'lari.
7. Choice commit idempotency + concurrency kaniti.
8. Outcome candidate schema contract kaniti.
9. Family Space/Child Profile izolasyon kaniti.
10. Calistirilan tum komutlar + exact pass/fail/skip sayilarini.
11. Acceptance Criteria -> source file -> test -> result traceability tablosu.
12. Bilinen riskler ve scope disi biraklar.
13. Rollback/rollforward plani.
14. Codex review icin ozet.

Raporu kanitsiz "complete" yazmaz. P0/P1 acik sorun, calismayan migration,
calistirilmamis PostgreSQL testi, cross-family izolasyon acigi veya partial
transaction riski varsa Sprint 10'i kapanmis gostermez.

## Cod ajan final mesaj

Final mesajinda:

- tamamlanan Task ID'leri;
- ana degisiklikleri;
- migration sayisini;
- unit/integration/API/E2E test sayilari;
- calismayan kontrol veya bilinen risk;
- `IMPLEMENTATION_REPORT.md` yolunu

kisa ve dogrulanabilir sekilde yaz.
