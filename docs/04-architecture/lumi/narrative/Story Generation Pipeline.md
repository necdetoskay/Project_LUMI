Story Generation Pipeline

Bu bölümde LUMI’nin tüm motorlarını tek bir çalışan akışta birleştiriyoruz.

Ana soru:

Çocuk “devam et” dediğinde sistemde ne olur?

Cevap yalnızca “LLM’ye prompt gönderilir” değildir.

Doğru akış:

Kullanıcı isteği
↓
Niyet analizi
↓
Mevcut hikâye ve dünya kontrolü
↓
Olası olayların hesaplanması
↓
NPC kararları
↓
Sahne planı
↓
Story Context Builder
↓
Narrative Engine
↓
Doğrulama
↓
Dünya durumunun güncellenmesi
↓
Hikâyenin kullanıcıya gösterilmesi

Temel ilke:

Hikâye metni, sistem hesaplarının başlangıcı değil sonucudur.

1. Pipeline giriş türleri

LUMI her isteği aynı biçimde işlememelidir.

type StoryRequestType =
  | "start_new_story"
  | "continue_story"
  | "select_choice"
  | "freeform_action"
  | "inspect_world"
  | "talk_to_character"
  | "use_inventory_item"
  | "continue_after_absence"
  | "create_followup_story"
  | "end_story"

Örnekler:

“Yeni macera başlat.”
→ start_new_story

“Devam et.”
→ continue_story

“Baykuşun notunu aç.”
→ select_choice

“Tilki yapraklardan şemsiye yapsın.”
→ freeform_action

“Haritayı incele.”
→ inspect_world

“Yaşlı denizciyle konuş.”
→ talk_to_character

“Mavi taşı kullanalım.”
→ use_inventory_item

Her istek farklı başlangıç adımları çalıştırır.

2. Ana pipeline nesnesi
type StoryGenerationRequest = {
  requestId: string
  playerProfileId: string
  universeId: string
  storyId?: string
  sceneId?: string

  requestType: StoryRequestType
  rawInput?: string
  selectedChoiceId?: string
  selectedInventoryItemId?: string

  requestedAt: number
  language: string
}

Bu nesne pipeline boyunca korunur.

3. İlk adım: İstek doğrulama

Sistem önce isteğin teknik olarak geçerli olup olmadığını kontrol eder.

- Kullanıcı profili var mı?
- Aktif evren var mı?
- Hikâye devam edebilir durumda mı?
- Seçilen seçenek gerçekten mevcut mu?
- Kullanılmak istenen nesne envanterde mi?
- Hikâye daha önce tamamlandı mı?
- Aynı istek iki kez gönderilmiş olabilir mi?
type RequestValidationResult = {
  valid: boolean
  normalizedRequest?: StoryGenerationRequest
  rejectionReason?: string
  recoverable: boolean
}
4. Idempotency

Çocuk veya ebeveyn düğmeye iki kez basabilir.

Aynı seçim iki kez uygulanmamalıdır.

type IdempotencyRecord = {
  requestId: string
  inputHash: string
  status:
    | "processing"
    | "completed"
    | "failed"

  outputSceneId?: string
}

Örnek:

“Baykuşun notunu aç”

iki kez gönderilirse:

iki ayrı not açma olayı oluşmamalı,
ilişki ve hafıza etkileri iki kez uygulanmamalı,
aynı sahne tekrar üretilebilir ama state ikinci kez değişmemelidir.
5. Kullanıcı niyetini anlama

Hazır seçimlerde niyet açıktır.

Serbest metinde Player Intent Interpreter çalışır.

type PlayerIntent = {
  actorId?: string
  actionType: string
  targetId?: string
  objectId?: string
  locationId?: string

  modifiers: string[]
  confidence: number

  interpretation:
    | "exact"
    | "reasonable"
    | "ambiguous"
    | "invalid"
}

Örnek giriş:

“Tilki taşa bakarken biz denizciyi çağıralım.”

Çıktı:

{
  actorId: "lumi",
  actionType: "call_character",
  targetId: "old_sailor",
  modifiers: ["while_fox_investigates"],
  confidence: 0.91,
  interpretation: "reasonable"
}
6. Serbest metin yorumlama sınırı

Niyet yorumlayıcısı hikâye sonucu üretmez.

Yalnızca isteği yapılandırır.

Yanlış yaklaşım:

Kullanıcı:
“Denizciyi çağıralım.”

Interpreter:
“Denizci gelir ve sırrını anlatır.”

Doğru yaklaşım:

Interpreter:
Lumi, yaşlı denizciyi çağırmaya çalışmak istiyor.

Denizcinin:

çağrıyı duyup duymadığı,
gelip gelmediği,
ne söylediği

daha sonra sistem tarafından belirlenir.

7. Uygulanabilirlik kontrolü

Yapılandırılmış niyet dünya kurallarına göre değerlendirilir.

type ActionFeasibilityResult = {
  feasible: boolean
  feasibilityScore: number

  blockers: string[]
  requiredResources: string[]
  alternativeActions: string[]

  requiresDecisionEngine: boolean
  requiresPlayerClarification: boolean
}

Kontroller:

- Aktör doğru yerde mi?
- Hedef erişilebilir mi?
- Gerekli nesne mevcut mu?
- Eylem karakterin yeteneklerine uygun mu?
- Dünya kurallarına aykırı mı?
- Hikâye kapısı tarafından engelleniyor mu?
- Eylem başka bir karakterin kararını zorla belirliyor mu?
8. Yaratıcı ama mümkün eylemler

Daha önce tanımlanmamış bir eylem otomatik reddedilmemelidir.

Örnek:

“Tilki yapraklardan şemsiye yapsın.”

Kontrol:

Yaprak var mı?
Tilki basit el işi yapabilir mi?
Zaman var mı?
Bu, kritik dünya değişimi yaratıyor mu?

Sonuç uygunsa yeni geçici eylem adayı üretilebilir.

type EmergentAction = {
  actionType: string
  actorId: string
  requiredConditions: string[]
  expectedEffects: string[]
  persistenceLevel:
    | "scene"
    | "temporary"
    | "persistent"
}
9. Aktif hikâye durumunu yükleme

Pipeline yalnızca son hikâye metnini getirmemelidir.

Şunlar birlikte yüklenir:

- mevcut dünya state sürümü
- aktif hikâye
- mevcut sahne
- açık oyuncu seçimi
- aktif karakterler
- aktif görevler
- bekleyen olaylar
- envanter
- player knowledge
- son önemli hikâye özeti
type StoryRuntimeSnapshot = {
  worldStateVersion: number
  storyState: unknown
  sceneState: unknown

  activeCharacterIds: string[]
  activeGoalIds: string[]
  pendingEventIds: string[]
  reservedDecisionId?: string

  playerInventoryIds: string[]
  playerKnowledgeStateId: string
}
10. Uzun aradan sonra geri dönüş kontrolü

Kullanıcı bir süre uygulamaya girmediyse normal devam akışı öncesinde offline simülasyon kontrol edilir.

Son aktif zaman
↓
Geçen süre
↓
Offline Simulation gerekli mi?
type ReturnState = {
  absenceDurationHours: number
  simulationRequired: boolean
  simulationLimitDays: number
  returnSummaryRequired: boolean
}

Akış:

0–birkaç saat:
simülasyon gerekmez

1–10 gün:
azalan yoğunlukta simülasyon

10 günden fazla:
yalnızca ilk 10 gün simüle edilir,
sonrasında dünya dondurulur
11. Offline simülasyon, hikâyeden önce tamamlanmalı

Kullanıcı “devam et” dediğinde önce hikâye üretilip sonra dünya güncellenmemelidir.

Doğru sıra:

Offline simülasyon
↓
Dünya güncellemesi
↓
Sen yokken özeti
↓
Yeni hikâye bağlamı
↓
Devam sahnesi

Böylece anlatılan sahne güncel dünya üzerinde oluşur.

12. Hikâye üretim amacı

Her istek için bir Story Generation Intent oluşturulur.

type PipelineStoryIntent = {
  mode:
    | "opening"
    | "continuation"
    | "reaction"
    | "choice_resolution"
    | "exploration"
    | "dialogue"
    | "transition"
    | "resolution"

  primaryGoal: string
  secondaryGoals: string[]

  shouldAdvanceMainPlot: boolean
  shouldOfferChoice: boolean
  shouldResolveCurrentChoice: boolean

  maximumWorldImpact: number
}

Örnek:

İstek:
“Baykuşun notunu aç.”

Mod:
choice_resolution

Ana amaç:
Notun açılması ve içeriğinin öğrenilmesi.

İkincil amaç:
Tilki ve Lumi’nin bilgiye verdiği tepki.

Bu sahnede:
Ana sır tamamen çözülmeyecek.
Yeni bir seçim sunulabilir.
13. Hikâye planlama katmanı

Narrative Engine doğrudan çağrılmadan önce sahnenin yapısı planlanmalıdır.

Bu katmana:

Story Planner

veya:

Scene Planner

diyebiliriz.

Story Planner:

hangi olayların bu sahnede gerçekleşeceğini,
hangi sırayla gerçekleşeceğini,
sahnenin nerede biteceğini,
seçim sunulup sunulmayacağını

belirler.

LLM kullanılması zorunlu değildir.

14. Story Planner girdileri
type StoryPlannerInput = {
  storyIntent: PipelineStoryIntent

  currentWorldState: unknown
  activeGoals: unknown[]
  availableEvents: unknown[]

  playerAction?: PlayerIntent
  pendingEvents: unknown[]

  recentNarrativePatterns: string[]
  storyLengthProfile: string
}
15. Story Planner çıktısı
type StoryPlan = {
  storyId: string
  sceneId: string

  scenePurpose: string
  openingCondition: string[]
  canonicalEvents: PlannedCanonicalEvent[]

  requiredBeats: string[]
  optionalBeats: string[]

  activeCharacterIds: string[]
  locationId: string

  expectedStateChanges: PlannedStateChange[]
  unresolvedThreadsAfterScene: string[]

  endingType:
    | "choice"
    | "soft_stop"
    | "resolution"
    | "transition"

  reservedPlayerDecision?: ReservedPlayerDecision
}
16. Kanonik olay planı
type PlannedCanonicalEvent = {
  id: string
  eventType: string

  actorIds: string[]
  targetIds: string[]
  locationId: string

  preconditions: string[]
  expectedOutcome: string

  importance: number
  requiresDecisionEngine: boolean
  requiresPlayerChoice: boolean
}

Örnek:

Event 1:
Lumi Baykuş’un notunu açar.

Event 2:
Notta kuzey yolundaki eski sembolden söz edilir.

Event 3:
Tilki bu sembolün haritasıyla ilgili olabileceğini düşünür.

Event 4:
Karakterler sıradaki adımı seçmeden durur.
17. NPC karar aşaması

Planlanan olaylarda NPC eylemi gerekiyorsa Decision Engine çalışır.

Örnek:

Lumi notu açtı.

Tilki:
- hemen kuzey yoluna gitmeyi önerebilir,
- önce notun doğruluğunu sorgulayabilir,
- denizciye danışmayı isteyebilir.

Decision Engine şu bilgileri kullanır:

Goals
Beliefs
Emotions
Relationships
Memories
Current Constraints

Çıktı:

type PipelineCharacterDecision = {
  characterId: string
  selectedActionId: string
  intention: string
  utilityScore: number

  visibleBehaviorGuidance: string[]
  hiddenReasoningSummary: string
}
18. Oyuncu karakteri adına karar verilmemesi

Eğer Lumi doğrudan çocuğun yönettiği karakterse sistem onun kritik kararını otomatik seçemez.

NPC’ler:

kendi kararlarını verir

Oyuncu karakteri:

hazır seçim veya serbest metin yoluyla oyuncu tarafından yönetilir

Sistem yalnızca otomatik mikro davranışlar verebilir:

notu tutmak,
düşmemek için geri çekilmek,
konuşana bakmak,
seçilmiş eylemi uygulamak.

Ama şunları belirleyemez:

kimi affedeceği,
hangi yola gideceği,
kime güveneceği,
risk alıp almayacağı.
19. Eylem çözümleme

Karar verildikten sonra eylemlerin sonuçları Narrative Engine’den önce çözülmelidir.

Action
↓
World Rules
↓
Probability / Skill Check
↓
Outcome
↓
State Delta
type ActionResolution = {
  actionId: string
  successLevel:
    | "failure"
    | "partial"
    | "success"
    | "exceptional"

  observableOutcome: string[]
  hiddenOutcome: string[]

  stateDelta: ProposedCanonicalStateDelta
  generatedEventIds: string[]
}
20. Başarı ve başarısızlık

LUMI’de her eylem doğrudan başarılı olmamalıdır.

Ama başarısızlık cezalandırıcı da olmamalıdır.

Örnek:

Tilki işareti çözmeye çalışıyor.

Olası sonuçlar:

Success:
Sembolün kuzey yolunu gösterdiğini anlar.

Partial:
Sembolün bir yön işareti olduğunu anlar ama yönü kesinleştiremez.

Failure:
İşareti çözemez fakat taşın üzerinde yeni bir çizgi fark eder.

Başarısızlık bile hikâyeyi tamamen durdurmamalıdır.

21. “Fail forward” ilkesi

Özellikle çocuk hikâyelerinde:

Başarısızlık
→ yeni bilgi
→ yeni yöntem
→ küçük bedel
→ alternatif yol

üretmelidir.

Örnek:

Kapı açılamadı.

Sonuç:

- Kapı kırılmaz.
- Anahtarın şekliyle ilgili bir iz bulunur.
- Denizciye sorma seçeneği açılır.
22. State Delta üretimi

Sahne içinde meydana gelecek bütün kalıcı değişiklikler önceden hazırlanmalıdır.

type ProposedCanonicalStateDelta = {
  worldChanges: unknown[]
  characterChanges: unknown[]
  inventoryChanges: unknown[]
  goalChanges: unknown[]
  relationshipEvents: unknown[]
  beliefEvidence: unknown[]
  emotionEvents: unknown[]
  memoryCandidates: unknown[]
  playerKnowledgeChanges: unknown[]
}

Narrative Engine bu değişiklikleri yalnızca anlatır.

23. State Delta hemen commit edilmemeli

Henüz hikâye üretimi başarısız olabilir.

Bu nedenle state değişiklikleri önce taslak olarak tutulmalıdır.

Current World State
↓
Proposed State Delta
↓
Generate Narrative
↓
Validate Narrative
↓
Commit Delta

Hikâye doğrulanamazsa delta uygulanmaz.

24. Story Context Builder çalışması

Artık bütün hesaplanmış veriler Story Context Builder’a gönderilir.

Girdiler:

- dünya gerçekleri
- oyuncunun seçilmiş eylemi
- NPC kararları
- çözümlenmiş olay sonuçları
- aktif duygular
- ilişkiler
- ilgili inançlar
- ilgili hafızalar
- player knowledge
- gizli bilgiler
- sahne planı
- yaş ve ebeveyn ayarları

Çıktı:

Narrative Contract
+
Core Story Context
25. Context Freeze

Narrative Engine çağrılmadan önce bağlam dondurulmalıdır.

type FrozenNarrativeContext = {
  contextId: string
  worldStateVersion: number
  storyPlanVersion: number
  decisionVersions: string[]
  createdAt: number

  contextHash: string
  payload: unknown
}

Bu sırada dünya değişirse mevcut üretim etkilenmemelidir.

Örneğin kullanıcı başka bir cihazdan aynı anda işlem yaparsa sürüm çakışması tespit edilmelidir.

26. Concurrent request kontrolü

Aynı hikâyede eşzamanlı iki seçim uygulanmamalıdır.

Request A:
Mağaraya git

Request B:
Denizciyle konuş

İkisi aynı açık seçim için gelirse yalnızca biri kabul edilmelidir.

type StoryLock = {
  storyId: string
  lockedByRequestId: string
  expiresAt: number
}

Alternatif:

Optimistic concurrency

kullanılabilir.

Commit sırasında:

Beklenen worldStateVersion
=
güncel worldStateVersion

değilse işlem yeniden değerlendirilir.

27. Narrative Engine çağrısı

Narrative Engine’e yalnızca dondurulmuş bağlam gönderilir.

Çıktı:

type RawNarrativeResult = {
  title?: string
  storyText: string
  choicePrompt?: unknown

  usedBeatIds: string[]
  claimedFacts: string[]
  proposedPersistentFacts: string[]

  generationMetadata: unknown
}
28. İlk doğrulama: Yapısal kontrol

LLM çıktısı önce teknik olarak parse edilir.

- Geçerli JSON mu?
- storyText var mı?
- seçim gerekiyorsa seçenekler var mı?
- zorunlu alanlar eksik mi?
- beklenmeyen alanlar var mı?

Parse edilemeyen çıktı kullanıcıya gösterilmez.

29. İkinci doğrulama: Kanonik kontrol

Narrative Validator şunları karşılaştırır:

Story Plan
vs.
Generated Narrative

Kontroller:

zorunlu olaylar anlatıldı mı?
olmayan olay eklendi mi?
sonuç yanlış mı anlatıldı?
NPC kararı değişti mi?
oyuncu seçimi çözüldü mü?
gizli bilgi sızdı mı?
mevcut olmayan nesne kullanıldı mı?
30. Üçüncü doğrulama: Stil ve çocuk güvenliği
- yaşa uygun dil
- uygun cümle uzunluğu
- maksimum gerilim
- korku ve şiddet sınırı
- güvenli karakter varlığı
- seçim dilinin anlaşılabilirliği
- gereksiz olumsuzluk

Bu katman hikâye mantığından sonra çalışır.

31. Dördüncü doğrulama: Tekrar kontrolü
- yakın zamanda kullanılan açılış tekrarlandı mı?
- aynı duygu hareketi tekrarlandı mı?
- aynı seçim kalıbı tekrarlandı mı?
- aynı karakter sözü fazla tekrarlandı mı?
- sahne önceki sahneye çok benziyor mu?

Tekrar kritik değilse sahne reddedilmeyebilir.

Düşük seviyeli düzeltme yapılabilir.

32. Düzeltme stratejisi

İhlaller üç sınıfa ayrılır.

Küçük
- biraz uzun
- birkaç tekrar
- düşük stil uyumsuzluğu

Çözüm:

metni yerel olarak düzelt
Orta
- bir beat eksik
- karakter sesi belirgin şekilde yanlış
- seçim ifadesi zayıf

Çözüm:

kısmi yeniden yazım
Kritik
- gizli bilgi açıldı
- oyuncu kararı verildi
- dünya gerçeği değişti
- NPC bilmediği bilgiyi kullandı

Çözüm:

tüm sahneyi yeniden üret
33. Yeniden üretim bağlamı

İkinci üretimde yalnızca “tekrar dene” denmemelidir.

İhlaller açıkça belirtilir.

Önceki taslak şu nedenle reddedildi:
- Ejderhanın yaralı olduğu açıklandı.
- Bu bilgi oyuncu tarafından henüz bilinmiyor.
- Yeni taslakta yalnızca mağaradan gelen ses gibi dolaylı ipucu kullan.

Ancak eski hatalı metin gereksiz yere tamamen prompt’a eklenmemelidir.

34. Fallback üretim

Maksimum deneme başarısız olursa:

Safe Narrative Template

çalışır.

Fallback:

bütün kanonik olayları anlatır,
süslü olmayan basit metin üretir,
seçim sınırını korur,
gizli bilgi içermez.

Bu, kullanıcıya hata ekranı göstermekten daha iyi olabilir.

35. Commit öncesi son kontrol

Narrative doğrulandıktan sonra state delta bir kez daha kontrol edilir.

- Dünya sürümü hâlâ aynı mı?
- Olay precondition’ları geçerli mi?
- Envanter nesnesi hâlâ mevcut mu?
- Seçim hâlâ açık mı?
- Başka işlem aynı olayı çözmüş mü?

Her şey uygunsa transaction başlatılır.

36. Atomik commit

Tek sahneyle ilişkili bütün değişiklikler birlikte uygulanmalıdır.

BEGIN TRANSACTION

- world state update
- story state update
- scene record
- inventory changes
- goal progress
- player knowledge
- relationship events
- belief evidence
- emotion events
- memory candidates
- pending event updates

COMMIT

Bir adım hata verirse:

ROLLBACK

Böylece hikâye ile dünya durumu ayrışmaz.

37. Memory, Belief ve Emotion sonrası işleme

Commit sırasında veya sonrasında ilgili motorlara olaylar gönderilir.

Canonical Events
↓
Perception Filter
↓
Memory Candidates
↓
Belief Evidence
↓
Emotion Appraisal
↓
Relationship Effects

Önemli nokta:

Hikâye metni değil,
kanonik olay kayıtları motorları besler.

Metinde:

Tilki gülümsedi.

yazması tek başına ilişki artışı yaratmaz.

İlişkisel olay sistemde ayrıca tanımlanmış olmalıdır.

38. Event Bus yaklaşımı

Motorlar birbirini doğrudan çağırmak yerine olayları dinleyebilir.

type DomainEvent = {
  id: string
  eventType: string
  aggregateId: string

  payload: unknown
  occurredAt: number
  causationId?: string
  correlationId: string
}

Örnek olaylar:

PLAYER_CHOICE_MADE
ITEM_USED
SECRET_DISCOVERED
PROMISE_MADE
PROMISE_BROKEN
CHARACTER_HELPED
LOCATION_ENTERED
GOAL_ADVANCED
STORY_SCENE_COMPLETED
39. Event Bus’ın avantajı
CHARACTER_HELPED

olayı oluştuğunda:

Relationship Engine güven etkisini hesaplar,
Memory Engine anı adayı oluşturur,
Belief Engine “yardım eder” inancına kanıt ekler,
Emotion Engine minnettarlık üretebilir,
Achievement System rozet kontrolü yapabilir.

Story Pipeline’ın bütün motorları tek tek bilmesi gerekmez.

40. Senkron ve asenkron işlemler

Kullanıcıya hikâye gösterilmeden önce gerekli olanlar senkron çalışmalıdır:

- state update
- aktif görev güncellemesi
- oyuncu bilgisi
- kritik hafıza
- kritik ilişki etkisi

Daha sonra çalışabilecek işlemler:

- uzun dönem hafıza konsolidasyonu
- analytics
- maliyet raporu
- öneri indeksleme
- eski kayıt arşivleme

Ancak kullanıcı yeni sahneye geçmeden önce sonraki kararları etkileyen her şey hazır olmalıdır.

41. Kullanıcıya çıktı hazırlama

Kullanıcıya yalnızca hikâye metni verilmez.

type StoryClientResponse = {
  storyId: string
  sceneId: string

  title?: string
  pages: StoryPage[]

  choice?: {
    question: string
    options: {
      id: string
      label: string
      iconHint?: string
    }[]
  }

  availableActions: {
    inspectMap: boolean
    openInventory: boolean
    talkToCharacterIds: string[]
  }

  returnSummary?: string[]
  illustrationStatus?: string
  audioStatus?: string
}
42. Görsel üretim ne zaman başlar?

Hikâye doğrulanıp state commit edilmeden görsel üretilmemelidir.

Doğru sıra:

Narrative validated
↓
State committed
↓
Illustration Cue finalized
↓
Image generation request

Böylece:

hatalı sahne için ücret ödenmez,
görsel ile kanonik hikâye çelişmez,
karakter ve nesne listesi kesin olur.
43. Görsel beklenirken metin gösterilebilir mi?

Evet.

Metin:

hemen gösterilebilir

Görsel:

hazır olduğunda eklenebilir

Ancak sayfa yerleşimi görsel gelmeden bozulmamalıdır.

Bir placeholder kullanılabilir:

“Sahnenin resmi hazırlanıyor.”

Görsel başarısız olsa bile hikâye kullanılabilir kalmalıdır.

44. TTS akışı

TTS isteğe bağlıysa:

Validated Story Text
↓
Pronunciation Preparation
↓
Speaker Segmentation
↓
TTS Cost Estimate
↓
Parent/User Approval if required
↓
Audio Generation

Ses üretimi başarısız olursa dünya state’i geri alınmaz.

Çünkü ses, hikâyenin sunum katmanıdır.

45. Tam “devam et” akışı

Çocuk:

“Devam et.”

dediğinde:

1. İstek oluşturulur.
2. Tekrarlı istek kontrol edilir.
3. Aktif hikâye ve dünya state’i yüklenir.
4. Uzun süreli yokluk kontrol edilir.
5. Gerekirse offline simülasyon çalışır.
6. Açık oyuncu seçimi olup olmadığı kontrol edilir.
7. “Devam et” için uygun hikâye niyeti belirlenir.
8. Aktif görevler ve bekleyen olaylar değerlendirilir.
9. Story Planner yeni sahneyi planlar.
10. NPC kararları Decision Engine tarafından seçilir.
11. Planlanan eylemler sistem kurallarıyla çözülür.
12. Taslak state delta hazırlanır.
13. Story Context Builder bağlamı derler.
14. Bağlam dondurulur.
15. Narrative Engine sahneyi yazar.
16. Yapısal doğrulama yapılır.
17. Kanonik doğrulama yapılır.
18. Yaş ve güvenlik doğrulaması yapılır.
19. Gerekirse metin düzeltilir veya yeniden üretilir.
20. State delta transaction ile commit edilir.
21. Domain event’ler yayımlanır.
22. Hafıza, inanç, duygu ve ilişkiler güncellenir.
23. Kullanıcı çıktısı hazırlanır.
24. Hikâye ekranda gösterilir.
25. Görsel ve isteğe bağlı ses üretimi başlatılır.
46. Hazır seçim akışı

Çocuk:

“Yaşlı denizciyle konuş.”

seçeneğini seçtiğinde:

1. choiceId doğrulanır.
2. Açık karar ile eşleştiği kontrol edilir.
3. PLAYER_CHOICE_MADE olayı hazırlanır.
4. Oyuncu karakterinin niyeti kaydedilir.
5. Denizcinin mevcut konumu ve erişilebilirliği kontrol edilir.
6. Denizcinin reaksiyonu Decision Engine ile hesaplanır.
7. Konuşmanın hangi bilgiyi açabileceği Belief ve Knowledge sınırlarıyla belirlenir.
8. Diyalog sahnesi planlanır.
9. Kanonik bilgi aktarımı state delta’ya eklenir.
10. Narrative Engine konuşmayı doğal dile çevirir.
11. Gizli bilgi sızıntısı kontrol edilir.
12. Sahne ve dünya birlikte commit edilir.
47. Envanter kullanma akışı

Çocuk:

“Mavi taşı kullanalım.”

dediğinde:

1. Taş gerçekten envanterde mi?
2. Kim taşıyor?
3. Bu mekânda kullanılabilir mi?
4. Taşın tanımlı yetenekleri neler?
5. Kullanım tüketimli mi?
6. Hangi hedefleri veya olayları etkileyebilir?
7. Kullanım oyuncu için beklenmedik kalıcı kayıp yaratır mı?

Sonuç sistem tarafından çözülür.

Narrative Engine yalnızca kullanım sahnesini anlatır.

48. Karakterle konuşma akışı

Serbest konuşma isteğinde:

“Tilki’ye korkup korkmadığını sor.”

Akış:

Player Speech Intent
↓
NPC Perception
↓
Belief and Relationship Context
↓
Emotion Response
↓
Decision Engine
↓
Dialogue Intent
↓
Narrative Rendering

Tilki her zaman dürüst cevap vermek zorunda değildir.

Cevabı:

güven,
utanç,
kişilik,
mevcut duygu,
söylemenin sonucu

üzerinden belirlenmelidir.

49. Saf sohbet ile hikâye olayı ayrımı

Her konuşma dünya state’inde büyük değişiklik yaratmamalıdır.

“Bugün nasılsın?”

küçük bir etkileşim olabilir.

Ama:

“Sana güveniyorum.”

belirli koşullarda:

ilişki olayı,
hafıza adayı,
duygusal etki

yaratabilir.

Sistemin konuşmadaki kanonik anlamı sınıflandırması gerekir.

50. Yeni hikâye başlatma akışı
1. Çocuk profili yüklenir.
2. İlgi alanları ve ebeveyn ayarları getirilir.
3. Evrenin mevcut durumu kontrol edilir.
4. Kullanılabilir karakterler belirlenir.
5. Aktif veya çözülmemiş hikâye iplikleri getirilir.
6. Hikâye türü ve ton seçilir.
7. Yeni hikâye amacı oluşturulur.
8. Story Planner açılış sahnesini planlar.
9. Dünya kurallarına uygun başlangıç olayları seçilir.
10. Story Context Builder başlangıç bağlamını hazırlar.
11. Narrative Engine açılışı yazar.
12. Validator kontrol eder.
13. Story ve ilk scene kaydı commit edilir.
14. Kullanıcıya ilk sahne veya ilk seçim gösterilir.
51. Yeni hikâye mevcut evreni sıfırlamamalı

Yeni hikâye:

yeni bir macera

olabilir ama dünya geçmişi korunmalıdır.

Örneğin:

Tilki hâlâ Lumi’ye güvenir,
önceki yaralanmalar iyileşme durumuna göre sürer,
alınan nesneler envanterde kalır,
keşfedilmiş bölgeler haritada görünür,
eski sözler ve ilişkiler devam eder.

Ancak her hikâye eski bütün olayları kullanmak zorunda değildir.

52. Devam hikâyesi üretimi

“Hikâyenin devamını oluştur” isteği iki anlama gelebilir:

Aynı sahneden devam

veya:

Tamamlanmış hikâyenin devam macerası

Sistem story state üzerinden bunu ayırt eder.

Tamamlanmış bir hikâye için:

Previous Story Canonical Summary
↓
Unresolved Threads
↓
Character Changes
↓
World State
↓
New Story Hook

kullanılır.

53. Hikâye sonlandırma akışı

Bir hikâye tamamlandığında:

1. Ana sahne sonucu çözülür.
2. Açık seçim bırakılmaz.
3. Kısa duygusal kapanış yapılır.
4. Görev durumu güncellenir.
5. Kanonik hikâye özeti oluşturulur.
6. Kritik hafızalar işaretlenir.
7. İlişki ve inanç etkileri uygulanır.
8. Çözülmeyen iplikler gelecek hikâyeye aktarılır.
9. İsteğe bağlı sorular hazırlanır.
10. Hikâye completed durumuna alınır.
54. Hikâye bitişi ile dünya bitişi aynı değildir

Bir hikâye tamamlanabilir ama dünya yaşamaya devam eder.

Hikâye:
Kırık köprünün sırrı çözüldü.

Dünya:
Köprü hâlâ onarılmayı bekliyor.
Denizcinin başka sırları olabilir.
Tilki yeni yolculuk planlayabilir.

Bu ayrım LUMI’nin yaşayan evren yapısının temelidir.

55. Pipeline hata türleri
type PipelineErrorType =
  | "invalid_request"
  | "story_state_conflict"
  | "world_state_conflict"
  | "intent_parse_failure"
  | "action_not_feasible"
  | "decision_failure"
  | "context_build_failure"
  | "narrative_generation_failure"
  | "narrative_validation_failure"
  | "state_commit_failure"
  | "media_generation_failure"

Her hata aynı şekilde ele alınmamalıdır.

56. Kullanıcıya gösterilmeyen teknik hatalar

Çocuğa şu mesajlar gösterilmemelidir:

LLM JSON parse error.
World state version conflict.
Validation rule 17 failed.

Çocuk için güvenli mesaj:

“Hikâyeyi bir kez daha düzenleyelim.”

veya sistem otomatik fallback kullanır.

Ebeveyn veya geliştirici loglarında teknik hata ayrıntısı tutulabilir.

57. State commit hatası

Metin üretildi ama state commit başarısız olduysa hikâye kullanıcıya gösterilmemelidir.

Çünkü kullanıcı şunu okuyabilir:

Lumi taşı Tilki’ye verdi.

ama sistem envanteri güncellememiş olabilir.

Bu durum devamlılığı bozar.

Doğru yaklaşım:

Commit başarılı
↓
Hikâyeyi göster
58. Media generation hatası

Görsel veya ses başarısız olursa hikâye yine gösterilebilir.

Çünkü medya:

sunum zenginleştirmesi

dir.

Kanonik hikâye veya dünya state’i değildir.

59. Pipeline gözlemlenebilirliği

Her hikâye isteği tek bir correlation ID ile izlenmelidir.

type PipelineTrace = {
  correlationId: string
  requestId: string

  stages: {
    name: string
    startedAt: number
    completedAt?: number
    status: string
    metadata?: unknown
  }[]
}

Böylece:

hangi aşama yavaş,
hangi model hata verdi,
validator neyi reddetti,
hangi state değişiklikleri oluştu

görülebilir.

60. Maliyet takibi

Her pipeline çalışması için maliyet ayrıştırılmalıdır.

type StoryGenerationCost = {
  contextBuildCost: number
  planningCost: number
  narrativeCost: number
  validationCost: number
  imageCost: number
  audioCost: number

  totalCost: number
  currency: "USD"
}

Kurallı motorların maliyeti API maliyeti değildir ama işlem süresi izlenebilir.

61. Model çağrısı azaltma

Her sahnede ayrı ayrı şu model çağrıları yapılırsa maliyet büyür:

Intent LLM
Planner LLM
Narrative LLM
Validator LLM
Summary LLM
Image Prompt LLM

MVP’de şu yaklaşım daha iyi olabilir:

Hazır seçim:
Intent LLM yok

Story Planner:
Kurallı sistem

Narrative:
Ana LLM çağrısı

Validator:
Kurallar + gerektiğinde küçük LLM

Summary:
Kanonik olaylardan şablon

Böylece çoğu sahne:

1 ana LLM çağrısı
+
gerektiğinde 1 doğrulama çağrısı

ile üretilebilir.

62. Pipeline performans bütçesi

Kesin süre vermek yerine aşama bütçeleri tanımlanabilir.

type PipelinePerformanceBudget = {
  maxPlanningComplexity: number
  maxContextTokens: number
  maxGenerationRetries: number
  maxValidationPasses: number
  maxMediaJobs: number
}

Amaç:

kullanıcı isteğinin kontrolsüz iş yüküne dönüşmemesi,
büyük dünya büyüdükçe gecikmenin katlanmaması,
pahalı model tekrarlarının sınırlandırılmasıdır.
63. Cache kullanılabilecek alanlar
- karakter ses profilleri
- dünya sabit kuralları
- yaş profili talimatları
- ebeveyn ayarları
- karakter görsel tanımları
- mekân görsel tanımları
- Narrative Engine sistem prompt’u

Her üretimde yeniden hesaplanmamalıdır.

Dinamik olanlar:

- aktif duygu
- son hafızalar
- güncel ilişkiler
- açık görev
- oyuncu bilgisi
- yeni kararlar
64. Pipeline sürümleme

Hikâye üretim sonucu şu sürümleri kaydetmelidir:

World Rules Version
Story Planner Version
Decision Engine Version
Context Builder Version
Narrative Prompt Version
Narrative Model Version
Validator Version
Age Profile Version

Bu sayede gelecekte bir hikâyenin neden farklı üretildiği anlaşılabilir.

65. Replay desteği

Kanonik olaylar ve seed değerleri tutulursa bir sahne teknik olarak yeniden oynatılabilir.

Same World Snapshot
+
Same Player Choice
+
Same Engine Versions
+
Same Seed

→ aynı veya çok yakın kanonik sonuç.

Narrative metin birebir aynı olmak zorunda değildir.

Çünkü anlatım varyasyon gösterebilir.

66. Kanonik sonuç ile anlatı varyasyonu

Aynı kanonik sahne:

Tilki sembolü buldu.
Lumi notu açtı.
Not kuzey yolunu gösterdi.

farklı biçimlerde anlatılabilir.

Bu kalite ve çeşitlilik için iyidir.

Ancak:

world state sonucu

değişmemelidir.

67. Test edilebilir pipeline

Pipeline’ın her aşaması bağımsız test edilmelidir.

Örnek testler:

Intent Interpreter:
“Notu aç” doğru eyleme dönüşüyor mu?

Action Feasibility:
Envanterde olmayan anahtar reddediliyor mu?

Decision Engine:
NPC bilmediği bilgiyle karar veriyor mu?

Context Builder:
Gizli bilgi narrative context’e sızıyor mu?

Narrative Validator:
Oyuncu seçiminin otomatik çözüldüğünü yakalıyor mu?

Commit:
Aynı request iki kez çalışınca state iki kez değişiyor mu?
68. Golden story testleri

Belirli dünya durumları için beklenen sahne kuralları oluşturulabilir.

Örnek fixture:

World:
Kapı kilitli.

Player Knowledge:
Ejderhanın yaralı olduğu bilinmiyor.

Decision:
Tilki çevreyi araştıracak.

Expected:
- Kapı açılmamalı.
- Ejderhanın yaralı olduğu söylenmemeli.
- Tilki mağaraya girmemeli.
- Seçim sahne sonunda kalmalı.

Üretilen metin birebir karşılaştırılmaz.

Kuralların korunup korunmadığı test edilir.

69. Pipeline güvenlik katmanları
Input Safety
↓
World Rule Validation
↓
Age Profile
↓
Narrative Content Validation
↓
Output Safety

Çocuk serbest metinde uygunsuz bir istek yazarsa sistem:

ayrıntıya girmeden,
hikâye tonunu bozmadan,
güvenli alternatif üreterek

yanıt vermelidir.

Bu ayrı bir Child Safety katmanında daha ayrıntılı ele alınmalıdır.

70. MVP Story Generation Pipeline

İlk uygulanabilir sürüm:

1. Request Validation
2. Choice veya basit intent normalization
3. Story Runtime Snapshot
4. Offline Simulation Check
5. Rule-based Scene Planner
6. Decision Engine
7. Action Resolution
8. Proposed State Delta
9. Story Context Builder
10. Single Narrative LLM Call
11. Rule-based Validator
12. One Repair/Retry
13. Atomic State Commit
14. Client Response
15. Optional Image Job

MVP’de şunlar sonraya bırakılabilir:

çok aşamalı LLM planlama,
karmaşık serbest metin eylemleri,
çoklu paralel karakter sahneleri,
gelişmiş semantik validator,
gerçek zamanlı ses,
karmaşık hikâye dalları,
model ensemble sistemi.
71. MVP orkestratör
async function generateNextScene(
  request: StoryGenerationRequest
): Promise<StoryClientResponse> {
  const normalizedRequest = await validateAndNormalizeRequest(request)

  const runtime = await loadStoryRuntimeSnapshot(normalizedRequest)

  const updatedRuntime = await applyOfflineSimulationIfNeeded(runtime)

  const intent = await resolveStoryIntent(
    normalizedRequest,
    updatedRuntime
  )

  const plan = await buildScenePlan(intent, updatedRuntime)

  const decisions = await resolveNpcDecisions(plan, updatedRuntime)

  const resolution = await resolveCanonicalEvents(
    plan,
    decisions,
    updatedRuntime
  )

  const context = await buildStoryContext({
    runtime: updatedRuntime,
    plan,
    decisions,
    resolution
  })

  const narrative = await generateNarrative(context)

  const validatedNarrative = await validateAndRepairNarrative({
    narrative,
    context,
    plan
  })

  const committedScene = await commitSceneTransaction({
    request: normalizedRequest,
    plan,
    resolution,
    narrative: validatedNarrative
  })

  return buildStoryClientResponse(committedScene)
}

Bu yalnızca orkestrasyon şemasıdır.

Motorların mantığı bu fonksiyonun içine gömülmemelidir.

72. Pipeline temel ilkeleri
1. Kullanıcı isteği doğrudan LLM’ye gitmez.
2. Serbest metin önce yapılandırılmış niyete dönüştürülür.
3. Dünya uygunluğu anlatıdan önce kontrol edilir.
4. NPC kararlarını Decision Engine verir.
5. Olay sonuçları Narrative Engine’den önce hesaplanır.
6. Kalıcı state değişiklikleri taslak delta olarak tutulur.
7. Story Context Builder yalnızca gerekli bağlamı derler.
8. Narrative Engine hesaplanan olayları anlatır.
9. Hikâye doğrulanmadan state commit edilmez.
10. State commit edilmeden hikâye kullanıcıya gösterilmez.
11. Bütün kalıcı değişiklikler atomik uygulanır.
12. Motorlar doğal hikâye metniyle değil, kanonik olaylarla beslenir.
13. Aynı kullanıcı isteği iki kez uygulanmaz.
14. Eşzamanlı seçimler state sürümüyle korunur.
15. Görsel ve ses, hikâye doğrulamasından sonra üretilir.
16. LLM çağrıları maliyet için sınırlandırılır.
17. Her aşama sürümlenir ve izlenebilir olmalıdır.
18. Hata durumunda dünya ile hikâye birbirinden kopmamalıdır.

Story Generation Pipeline’ın kavramsal çekirdeği böylece tamamlandı.