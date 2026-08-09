# ULTEF — LUMI Living Universe Verification Matrix

Status: CANONICAL TEST BACKLOG
Date: 2026-08-09

## Completion rule

Yeni bir LUMI davranışı ULTEF karşılığı tanımlanmadan tasarım olarak tamamlanmış sayılmaz. Production COMPLETE için uygun seviyelerde deterministic/unit/integration, DB-backed, adversarial/fault, narrative evaluator ve gerektiğinde L9 long-horizon kanıtı gerekir.

Test yaklaşımı üç katmanlıdır:
1. Hard invariants: auth/tenant/idempotency/canon/knowledge/state.
2. Behavioral scenarios: doğru bağlamda doğru davranış ve narrative consequence.
3. Long-horizon: 10/25/50/100+ story boyunca drift, continuity, memory, causality ve maliyet.

## Memory family

- MEM-DISTILL-001: uzun hikâyeden yalnız anlamlı memory events çıkarılır.
- MEM-RELEVANCE-001: ilgili memories retrieve edilir, alakasız memories context'i doldurmaz.
- MEM-KNOWLEDGE-001: character bilmediği world fact'i hatırlamaz.
- MEM-PERSPECTIVE-001: aynı event farklı aktörlerde farklı interpretation oluşturabilir.
- MEM-DECAY-001: önemsiz memories zamanla retrieval priority kaybeder.
- MEM-CORE-001: core memories rastgele kaybolmaz.
- MEM-REINFORCE-001: yeniden recall edilen memory güçlenebilir.
- MEM-SEMANTIC-001: episodic evidence'dan doğru semantic memory türetilir ve source linkage korunur.
- MEM-CONTEXT-BUDGET-001: çok büyük memory store prompt/context bütçesini patlatmaz.
- MEM-SAGA-001: uzun aradan sonra Saga-critical memory doğru geri çağrılır.
- MEM-CONFLICT-001: çelişkili memories tek gerçek olarak yanlış merge edilmez.
- MEM-TENANT-001: family/child memory isolation ihlal edilmez.
- L9-MEMORY-JOURNEY: 100+ story sonunda önemli anılar doğru, sıradan detaylar düşük öncelikli, semantic consolidation ve retrieval stabil.

## Character growth family

- GROWTH-EVIDENCE-001: trait/growth değişimi tek story claim'iyle değil evidence ile oluşur.
- GROWTH-GRADUAL-001: tek olay aşırı personality drift yaratmaz.
- GROWTH-PARENT-GOAL-001: parent development goals story bias oluşturur fakat zorlayıcı/didaktik sonuç üretmez.
- GROWTH-MEMORY-001: growth evidence canonical memory/event geçmişine dayanır.
- GROWTH-AGENCY-001: hedeflenen gelişim çocuğun seçimlerini geçersiz kılmaz.
- GAMIFICATION-LEAK-001: growth vector/stat/bonus çocuk anlatısına oyun metriği olarak sızmaz.
- L9-GROWTH-JOURNEY: 100+ story boyunca kişilik tutarlılığı ve yavaş gelişim.

## Relationships & social life family

- REL-EVIDENCE-001: tek olay aşırı relationship shift yaratmaz; değişim canonical evidence'e dayanır.
- REL-PERSPECTIVE-001: aynı event child ve NPC tarafında farklı interpretation oluşturabilir.
- REL-MEMORY-001: relationship change gerçek shared/actor-specific memory ile trace edilebilir.
- REL-PROMISE-001: verilen söz sonraki encounter'da doğru aktör tarafından doğru bağlamda hatırlanır.
- REL-GIFT-001: hediye ownership + memory + relationship evidence zinciri doğru çalışır.
- REL-NPC-NPC-001: NPC-NPC relationships child yokken policy sınırlarında değişebilir.
- REL-FAMILY-001: family actors başlangıç shared-history/context'i ile generic NPC'den farklı davranabilir.
- REL-NEGATIVE-001: kırgınlık/yanlış anlaşılma/rekabet güvenli biçimde mümkün; sistem monoton pozitif friendship üretmez.
- REL-REPAIR-001: misunderstanding/resentment doğal narrative interaction ile onarılabilir.
- REL-AGENCY-001: relationship state child choice'u zorla belirlemez.
- REL-UI-LEAK-001: trust/affection/respect sayıları child UI veya story'ye stat olarak sızmaz.
- REL-HOOK-001: relationship history uygun olduğunda NPC arc/story hook/Saga seed doğurabilir.
- REL-TENANT-001: başka child/household social graph, relationship state veya memories sızmaz.
- L9-SOCIAL-LIFE-JOURNEY: 100+ story boyunca multi-NPC relationships, shared memories, misunderstandings, promises, gifts, NPC-NPC changes ve repairs doğal biçimde ilerler; identity/knowledge/tenant isolation korunur.

## NPC / world evolution family

- NPC-AUTO-001: child yardım etmese de uygun NPC arc kontrollü ilerler.
- NPC-IDENTITY-001: uzun horizon'da NPC core identity drift etmez.
- NPC-PERSPECTIVE-001: NPC knowledge/memory kendi deneyim sınırında kalır.
- NPC-RELATION-001: NPC-NPC events child olmadan mümkün fakat canon/importance policy'ye bağlıdır.
- WORLD-PERSIST-001: location/world mutation sonraki hikâyelerde korunur.
- WORLD-OFFLINE-001: uzun yokluk kritik içerik kaybıyla child'ı cezalandırmaz.
- WORLD-CAUSALITY-001: world değişikliklerinin canonical nedeni vardır.
- SIM-RESOLUTION-001: uzak/alakasız entity gereksiz yüksek çözünürlükte simüle edilmez.
- L9-WORLD-EVOLUTION: uzun horizon'da world/NPC continuity, maliyet ve child-critical protection.

## Time family

- TIME-STORY-001: story duration world clock'u doğru ilerletir.
- TIME-ENV-001: day/night effective environment'ı değiştirir.
- TIME-SEASON-001: season environment/NPC tendencies'e yansır.
- TIME-NPC-001: NPC routine deterministic script değil context-sensitive tendency olarak davranır.
- TIME-OFFLINE-001: kısa yokluk anlamlı progression üretir.
- TIME-OFFLINE-002: uzun yokluk child-presence-required kritik event'i tamamlamaz.
- TIME-MEMORY-001: real-time yokluğu memories'i yanlış decay etmez.
- TIME-CAUSAL-001: future event geçmiş narrative'e sızmaz.
- TIME-SAGA-001: Saga pacing doğal kalır.
- TIME-FOMO-001: offline/deadline policy child'ı kritik içerik kaçırdığı için cezalandırmaz.
- L9-TIME-LONG-HORIZON: 100+ story + farklı offline aralıklarında timeline/causality/state tutarlılığı.

## Weather / ecology / environment family

- WEATHER-CANON-001: aynı canonical time/location'da çelişkili weather üretilmez.
- WEATHER-ENV-001: weather effective environment capabilities'i gerçekten etkiler.
- WEATHER-ITEM-001: uygun item possibility açar, garanti başarı vermez.
- WEATHER-OPPORTUNITY-001: kötü hava yalnız punishment üretmez.
- ECO-PERSIST-001: committed environment mutation sonraki ziyarette korunur.
- ECO-RECOVERY-001: geçici hasar uygun zaman/koşulla iyileşebilir.
- ECO-ENTITY-001: narrative significance kazanan background wildlife persistent entity olabilir.
- ECO-CANON-001: Story Generator authoritative commit olmadan büyük mutation yaratamaz.
- ECO-MEMORY-001: önemli natural event doğru memory oluşturabilir.
- ECO-MAP-001: environment mutation topology ile çelişmez.
- L9-MOUNTAIN-STORM-JOURNEY: weather + environment + item + NPC fear/memory + outcome + world commit + revisit zinciri.

## Progressive world generation family

- WORLD-EXPAND-001: yeni chunk boundary ile fiziksel uyumlu birleşir.
- WORLD-RIVER-001: river continuity korunur veya fiziksel açıklamayla dönüşür.
- WORLD-MOUNTAIN-001: elevation/mountain continuity korunur.
- WORLD-COAST-001: coastline kopmaz.
- WORLD-ROAD-001: road/path exits mantıklı devam eder.
- WORLD-KNOWLEDGE-001: UNKNOWN içerik UI/LLM tarafından erken ifşa edilmez.
- WORLD-RUMOR-001: rumor canonical fact gibi sunulmaz.
- WORLD-MAP-001: old/incorrect map knowledge world truth'tan ayrılır.
- WORLD-SAGA-001: expansion Saga narrative reservations'ı bozmaz.
- WORLD-DETAIL-001: mevcut location canon'u bozmadan vertical detail kazanır.
- WORLD-VISUAL-001: yeni chunk visual canon/neighbor references ile uyumludur.
- WORLD-TXN-001: validation failure yarım world state commit etmez.
- WORLD-TENANT-001: başka universe/tenant topology veya discovery state'i sızmaz.
- L9-PROGRESSIVE-WORLD-100: 100 story, çoklu expansion, rumor, map, events, seasons, bridge/river/environment changes ve Saga reservations boyunca topology/chronology/knowledge/memory tutarlılığı.

## Item & object family

- ITEM-OWN-001: transfer sonrası item eski owner inventory'sinden çıkar.
- ITEM-LOC-001: evde bırakılan item carried gibi kullanılamaz.
- ITEM-CAP-001: capability uygun situation'da possibility açar.
- ITEM-ALT-001: problem tek zorunlu item çözümüne indirgenmez.
- ITEM-KNOW-001: hidden property erken sızmaz.
- ITEM-BELIEF-001: NPC belief canonical item truth'a yanlış dönüşmez.
- ITEM-HISTORY-001: repair/transformation sonrası object lineage korunur.
- ITEM-GIFT-001: NPC kendisine verilen item'ı ve ilişkili history'yi daha sonra doğru hatırlar.
- ITEM-PROTECT-001: protected narrative asset random simulation ile yok edilemez.
- ITEM-EMERGE-001: sıradan item sonraki canonical bağlantılarla Saga seed olabilir.
- ITEM-REPLAY-001: story replay item grant/state mutation üretmez.
- ITEM-DUP-001: retry/worker replay duplicate grant üretmez.
- ITEM-TENANT-001: item ownership/grant tenant isolation'ı ihlal etmez.
- L9-OBJECT-LIFECYCLE-JOURNEY: tek canonical object 100 story boyunca inherit/use/discover/damage/repair/transfer/return/Saga/replay zincirinde identity ve history korur.

## Feedback intelligence family

- FEEDBACK-STORY-001: story rating preference signal olarak işlenebilir.
- FEEDBACK-IMAGE-001: visual feedback future visual generation policy'ye kontrollü etki eder.
- FEEDBACK-REASON-001: optional reason semantic preference'e dönüştürülebilir.
- FEEDBACK-DRIFT-001: tek rating aşırı generation drift yaratmaz.
- FEEDBACK-SAFETY-001: feedback safety/canon constraints'i override edemez.
- FEEDBACK-EFFECT-001: yeterli evidence sonrası generation çıktısında beklenen kontrollü değişim ölçülebilir.

## Narrative quality / cross-system family

- NARRATIVE-CANON-001: output canonical world/state ile çelişmez.
- NARRATIVE-KNOWLEDGE-001: LLM unavailable knowledge uydurmaz.
- NARRATIVE-INVENTORY-001: olmayan/yanında olmayan item kullanılmaz.
- NARRATIVE-MEMORY-001: retrieved memory doğru bağlamda kullanılır; uydurma geçmiş yaratılmaz.
- NARRATIVE-GAME-LEAK-001: stat/bonus/quest-engine dili story experience'a sızmaz.
- NARRATIVE-DIDACTIC-001: growth goal aşırı ders verici anlatı oluşturmaz.
- NARRATIVE-SAGA-001: episodic story kendi bütünlüğünü korurken long arc continuity'yi bozmaz.
- NARRATIVE-QUALITY-001: coherence, age fit, causal links, character voice ve emotional tone rubric ile değerlendirilir.

## UI/UX behavior family

- UX-AUTH-001: login/register/forgot-password kendi bağlamsal experience'larına sahiptir.
- UX-PARENT-001: parent home child cards ve universe-absent guidance'ı doğru gösterir.
- UX-PROFILE-001: interests/development goals edit edilebilir ve persisted state ile uyumludur.
- UX-CHARACTER-001: character creation kullanıcıyı aşırı seçenekle boğmaz.
- UX-CURRENT-LIFE-001: character surface son canonical location/state'i gösterir.
- UX-MAP-FOG-001: unknown/rumored/revealed/discovered görsel ayrımı knowledge state ile eşleşir.
- UX-REPLAY-001: eski hikâyeyi tekrar okumak production state mutation üretmez.
- UX-RESPONSIVE-001: web responsive behavior mobile viewport'ta temel deneyimi korur.
- UX-MEDIA-OPTIONAL-001: image/audio/hotspot kapalı olduğunda story flow bozulmaz.

## Long-horizon master program

ULTEF Living Universe Journey, aynı canonical universe üzerinde 10 -> 25 -> 50 -> 100+ story checkpoints kullanır. Her checkpoint'te en az şu alanlar doğrulanır:

- timeline and temporal causality
- world/location persistence
- NPC identity and autonomy
- social relationship continuity and actor perspectives
- episodic/semantic memory and retrieval quality
- character growth drift
- inventory/object identity and ownership
- Saga continuity/emergence
- knowledge boundaries and rumor/belief separation
- environment/weather consequences
- progressive topology consistency
- replay/idempotency
- tenant/family/child isolation
- narrative quality and gamification leakage
- context/token/cost growth

Master acceptance principle: ayrı motorların PASS olması yeterli değildir; birleşik yolculukta sistemlerin birbirini bozmadığı kanıtlanmalıdır.
