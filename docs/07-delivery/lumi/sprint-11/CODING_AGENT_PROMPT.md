# Sprint 11 Coding Agent Prompt

Bu promptu Project LUMI reposunda calisacak farkli bir kod ajanina ver.

## Rol ve ana hedef

Sen senior TypeScript, domain-driven design ve prompt engineering muhendisisin.
Project LUMI Sprint 11 - Prompt Registry and Context Builder kapsaminda
uygulama kodundan ayrilan versioned prompt registry ve yalnizca ilgili,
yetkili, butcelenmis baglami olusturan Context Builder altyapisini
uygulayacaksin.

Prompt registry, template renderer, context source ports, relevance/token
budget builder ve safety/parent precedence policy'i kur. Story metni uretme,
bagimsiz RAG urunu olusturma veya LLM'ye state mutation yetkisi verme bu
sprint'in kapsami disindadir.

Bu gorev analiz veya taslak gorevi degildir. Kod, migration, test ve uygulama
raporunu tamamla. Ancak kapsam disi sistemleri baslatma.

## Once okunacak belgeler

Kod yazmadan once su belgeleri oku (canonical belgelerle calisan kodun her
celiskisini implementation report'ta saklama):

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-11/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-09/IMPLEMENTATION_REPORT.md`
- `docs/07-delivery/lumi/sprint-10/IMPLEMENTATION_REPORT.md`
- `docs/04-architecture/lumi/narrative/Story Session, Playback & Interaction Orchestration Engine.md`
- `docs/04-architecture/lumi/narrative/Scene, Beat & Narrative Flow Orchestration.md`
- `docs/04-architecture/lumi/context/Context Builder Architecture.md` (varsa)
- `docs/04-architecture/lumi/prompts/Prompt Registry Design.md` (varsa)

Mevcut kod kaliplarini da incele:

- `packages/story/src/domain` ve `packages/story/src/application`
- `packages/story/src/db/schema/story`
- `packages/story/src/db/repositories`
- `packages/profiles/src/application`
- `packages/world/src/application`
- `apps/web/app/api/stories` route pattern'leri
- `tooling/typescript/base.json` strict kurallari

## Baslangic ve exit-gate kontrolu

1. Dirty worktree olabilecegini kabul et. Kullaniciya veya baska ajanlara ait
   degisiklikleri revert etme.
2. Sprint 10 exit gate kanitlarini kontrol et:
   - `@lumi/story` unit: 40 passed;
   - `@lumi/web` unit: 85 passed;
   - `pnpm build` passed.
3. `CURRENT_STATUS.md` eskiyse bunu gercek kod ve son raporlarla karsilastir;
   sessizce eski durumu dogru kabul etme.
4. Baseline komutlarini calistir ve Sprint 11 oncesinde zaten bulunan hatalari
   ayri kaydet. Yeni kodun bunlari artirmasina izin verme.
5. Bilinen pre-existing lint borcunu Sprint 11 basarisi gibi gizleme veya
   alakasiz toplu refactor ile temizlemeye calisma. Sprint 11'in kendi
   dosyalari sifir lint hatasi vermeli.

## Mimari sinir

Sprint 11 iki yeni workspace paketi gerektirir:

```text
packages/prompts/
  src/domain/
  src/application/
  src/db/
  migrations/
  scripts/
  tests/domain/
  tests/application/
  tests/fixtures/

packages/context/
  src/ports/
  src/adapters/
  src/application/
  src/builder/
  tests/application/
  tests/fixtures/
```

Paket adlari `@lumi/prompts` ve `@lumi/context` olsun. Mevcut paketlere
buyuk mudahalede bulunma; onlarin repository'lerine port/interface ile
baglan. Cyclic dependency yasak.

Yeni paketler:

- strict TypeScript kullanmali;
- domain -> application -> infrastructure bagimlilik yonunu korumali;
- route veya React component icinden dogrudan ORM cagirmamali;
- unit test ve ayri destructive PostgreSQL integration test config'i tasimali
  (sadece `@lumi/prompts` icin gerekir; `@lumi/context` DB disidir).

Prompt registry `prompts` schema kullanir. Context builder stateless'dir ve
sadece source port'lari uygulayan adapter'lari cagirir.

## Sprint task'lari

### S11-T01 - Prompt registry/version model

Asgari domain modelleri (`packages/prompts/src/domain`):

- `PromptRegistry` (aggregate root; prompt key + household scope)
- `PromptVersion` (immutable publication record)
- `PromptTemplate` (variable schema + template body)
- `PromptVariable` (name, type, required, default, validation)
- `PromptActivation` (which version is active for a household/world)

P0 invariant'lar:

- Prompt registry key household-scope'dur.
- Prompt Version immutable'dir; duzeltme yeni version gerektirir.
- Yalniz `published` version activate edilebilir.
- Activation explicit olmalidir; default activation son published version
  degildir (activation ayridir).
- Required variable eksikse render edilemez.
- Prompt template injection (raw user input interpolation) yasak; variable
  substitution only.

Domain validation:

- Template key, version, variable type enum, lifecycle degerleri validate.
- Version number monoton artar.
- `Math.random()` domain'de kullanilmamali.

### S11-T02 - Typed template renderer

`packages/prompts/src/application/rendering`:

- `renderPrompt(versionId, variables)` — strict variable substitution.
- Type validation: string, number, boolean, enum, json.
- Missing required variable durdurur.
- Default value fallback.
- Escape/sanitization for variable values (no HTML/JS injection).
- Rendered prompt metadata: used version, variables resolved, token estimate
  (character count heuristic).

Renderer unit test table-driven olmali.

### S11-T03 - Context source ports

`packages/context/src/ports`:

Port interface'leri (adapter implementasyonu `packages/context/src/adapters`):

- `SafetyPolicySource` — parent policy, content boundary, time limits.
- `ParentPolicySource` — active parent policy snapshot.
- `WorkingStorySource` — active story session, current scene, choice history.
- `EmotionalStateSource` — character emotional/needs snapshot (read-only).
- `LongTermMemorySource` — relevant memory snippets (mock/filtered).
- `KnowledgeSource` — world knowledge / lore (mock/filtered).
- `WorldSource` — world bootstrap manifest, region, location summaries.
- `OriginPackageSource` — accepted origin package seed manifest.

Her port:

- `householdId + childProfileId` ile cagrilir.
- `relevance` score doner.
- secret/ham child verisi/prompt log icermez.

Adapter'lar mevcut `@lumi/profiles`, `@lumi/world`, `@lumi/story` paketlerinin
uygulama servislerini kullanir; dogrudan ORM cagirma.

### S11-T04 - Relevance/token budget builder

`packages/context/src/builder`:

- `ContextBuilder` deterministic builder.
- Context priority: Safety -> Parent Policies -> Working/Active Story ->
  Emotional State -> relevant Long-Term Memory -> Knowledge/World context.
- `TokenBudget` policy: max token, truncation order, summarization strategy.
- `ContextManifest` cikti: paketlenmis baglam, source list, token usage,
  finding'ler (budget overflow, missing source, policy override).
- Ayni input/snapshot ayni context manifest'i uretir (deterministic).

Unit test: determinism, budget overflow, priority order, missing source.

### S11-T05 - Safety/parent precedence

`packages/context/src/policy`:

- `SafetyPolicy` en ust oncelikli context item.
- Parent policy safety kuralini gevsetemez.
- Yetkisiz memory/world kaydi context'e giremez.
- Baska cocuk verisi ve secret prompt'a giremez.
- Audit metadata: which policy applied, source ids, redacted content markers.

### S11-T06 - Eval fixtures and docs

Ekle:

- `docs/07-delivery/lumi/sprint-11/IMPLEMENTATION_REPORT.md`
- `packages/prompts/tests/fixtures/`:
  - simple prompt template with variables;
  - prompt version with activation;
  - prompt with missing required variable.
- `packages/context/tests/fixtures/`:
  - context manifest with full priority stack;
  - token budget overflow fixture;
  - safety override fixture.

Fixture'larda gercek cocuk verisi, API key veya secret kullanma.

## Quality short

Yeni paketler icin script'ler ekle ve gercekten calistir:

```powershell
pnpm --filter @lumi/prompts lint
pnpm --filter @lumi/prompts typecheck
pnpm --filter @lumi/prompts test
pnpm --filter @lumi/prompts test:int

pnpm --filter @lumi/context lint
pnpm --filter @lumi/context typecheck
pnpm --filter @lumi/context test

pnpm --filter @lumi/story lint
pnpm --filter @lumi/story typecheck
pnpm --filter @lumi/story test

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
`docs/07-delivery/lumi/sprint-11/IMPLEMENTATION_REPORT.md` dosyasini olustur.

Rapor bolumleri (Sprint 10 report deseni ile uyumlu):

1. Release identity ve tarih.
2. S11-T01..S11-T06 task durumlari.
3. Degisen dosyalar.
4. Prompt registry invariant / version immutability / activation kaniti.
5. Template renderer type/safety/escape kaniti.
6. Context source port contract'lari ve adapter baglantilari.
7. Context builder priority + token budget + determinism kaniti.
8. Safety/parent precedence + isolation kaniti.
9. Migration tablolari, constraint/indexler ve forward-only kaniti.
10. Calistirilan tum komutlar + exact pass/fail/skip sayilarini.
11. Acceptance Criteria -> source file -> test -> result traceability tablosu.
12. Bilinen riskler ve scope disi biraklar.
13. Rollback/rollforward plani.
14. Codex review icin ozet.

Raporu kanitsiz "complete" yazmaz. P0/P1 acik sorun, calismayan migration,
calistirilmamis PostgreSQL testi, context isolation acigi veya prompt injection
riski varsa Sprint 11'i kapanmis gostermez.

## Cod ajan final mesaj

Final mesajinda:

- tamamlanan Task ID'leri;
- ana degisiklikleri;
- migration sayisini;
- unit/integration/API/E2E test sayilari;
- calismayan kontrol veya bilinen risk;
- `IMPLEMENTATION_REPORT.md` yolunu

kisa ve dogrulanabilir sekilde yaz.
