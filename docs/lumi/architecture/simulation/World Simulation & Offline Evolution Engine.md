World Simulation & Offline Evolution Engine

Bu motor, LUMI dünyasının aktif hikâye dışında nasıl ilerlediğini belirler.

Temel sorusu şudur:

Zaman geçtiğinde dünyada gerçekten ne değişmeli?

Bu motor:

bütün evreni sürekli simüle etmez,
yalnızca anlamlı entity’leri işler,
kritik oyuncu kararlarını bekletir,
düşük önemdeki ayrıntıları sıkıştırır,
offline ilerlemeyi güvenli sınırlar içinde tutar,
aynı state ve seed ile aynı sonucu üretir.

Temel ilke:

Dünya yaşamalı, fakat oyuncunun yokluğunda onun hikâyesini elinden almamalıdır.

1. Sistemdeki yeri
Time Advance Request
↓
Simulation Scope Builder
↓
Relevance Evaluation
↓
Simulation Budget Allocation
↓
Entity Step Planning
↓
Deterministic Resolution
↓
Cross-System Effects
↓
Pending Player Conversion
↓
Validation
↓
Canonical Commit
↓
Return Recap

World Simulation Engine bir içerik üreticisi değildir.

Bir orkestratördür.

Şu motorların kurallarını çağırır:

Time Engine
NPC Goal Engine
Decision Engine
Emotion Engine
Relationship Engine
Quest Engine
Inventory Engine
Map Engine
World Event Engine
Safety Engine
Validation Engine
2. Active simulation ve offline simulation ayrımı
Active simulation

Oyuncu hikâye içindeyken gerçekleşir.

Özellikleri:

yüksek ayrıntı,
kısa zaman adımları,
oyuncu kararları,
görünür olaylar,
sahne bazlı çözümleme.
Offline simulation

Oyuncu uygulamada değilken gerçekleşir.

Özellikleri:

düşük ayrıntı,
sınırlı kapsam,
güvenli gelişmeler,
hazırlık odaklı ilerleme,
oyuncu kapılarında durma,
10 günlük üst sınır.

Aynı kuralların farklı yoğunlukta çalışan biçimleridir.

3. Simulation Request
type SimulationRequest = {
  universeId: string

  mode:
    | "active"
    | "offline"
    | "catch_up"
    | "preview"
    | "replay"

  fromWorldMinute: number
  toWorldMinute: number

  realAbsenceMinutes?: number

  sourceRequestId: string
  deterministicSeed: string
}
4. Simulation Result
type SimulationResult = {
  simulationId: string

  appliedFromWorldMinute: number
  appliedToWorldMinute: number

  processedEntityIds: string[]
  skippedEntityIds: string[]

  generatedEventIds: string[]
  pendingPlayerEventIds: string[]

  stateDeltas: SimulationStateDelta[]
  recapEntryIds: string[]

  budgetUsed: SimulationBudgetUsage
  resultingWorldStateVersion: number
}
5. Neden bütün dünya simüle edilmemeli?

Büyük bir dünyada şunlar bulunabilir:

yüzlerce NPC,
yüzlerce mekân,
çok sayıda görev,
binlerce nesne,
çevresel süreçler,
karakter ilişkileri.

Her zaman adımında bütün entity’leri işlemek:

pahalıdır,
gereksizdir,
hataya açıktır,
önemsiz ayrıntıları fazla büyütür,
deterministik replay’i zorlaştırır.

Bu nedenle scope seçimi gerekir.

6. Simulation scope
type SimulationScope = {
  highPriorityEntityIds: string[]
  normalPriorityEntityIds: string[]
  backgroundEntityIds: string[]

  frozenEntityIds: string[]
  excludedEntityIds: string[]
}

Entity sınıfları:

character
location
quest
world_event
route
item
relationship_pair
group
7. Relevance scoring

Bir entity’nin simülasyona girip girmeyeceği relevance score ile belirlenebilir.

Simulation Relevance =
Active Quest Relevance
+ Story Arc Relevance
+ Player Attachment
+ Recent Interaction
+ Pending State
+ Temporal Urgency
+ World Event Relevance
+ Spatial Proximity
− Dormancy
− Distance
− Redundancy
− Safety Risk
8. Relevance boyutları
type SimulationRelevanceVector = {
  player: number
  quest: number
  storyArc: number
  temporal: number
  spatial: number
  relationship: number
  world: number
  safety: number
}

Tek sayı yalnızca son seçim için kullanılabilir.

Ham vektör audit için korunmalıdır.

9. Player attachment

Player attachment şu sinyallerden çıkarılabilir:

son hikâyelerde birlikte olma,
favori karakter işareti,
duygusal eşya bağlantısı,
tekrar ziyaret edilen mekân,
aktif görev,
çocuğun açık ilgisi.

Ancak bu değer world truth’u değiştirmez.

Sadece simülasyon bütçesini etkiler.

10. Recent interaction

Son etkileşim, entity’yi daha yüksek öncelikli yapabilir.

Örnek:

Tilki ile dün hikâye oynandı.

Tilki yüksek önceliklidir.

Ama üç ay önce kısa görülen uzak bir tüccar düşük öncelikte kalabilir.

11. Spatial proximity

Oyuncunun aktif bölgesine yakın entity’ler daha yüksek önem taşıyabilir.

Örnek:

Oyuncu Sis Ormanı’nda.

Yakın:
Değirmen
Tilki
Kuzey yolu

Uzak:
Güney limanı
Çöl kervanı

Uzak entity’ler tamamen yok sayılmaz; daha düşük çözünürlükte işlenir.

12. Pending state önceliği

Şu durumdaki entity’ler yükseltilmelidir:

yaralı,
görev hazırlığında,
bekleyen world event içinde,
oyuncudan karar bekliyor,
seyahat hâlinde,
onarım sürecinde,
geçici item taşıyor.

Ancak player-gated durumlar ilerletilmez.

Sadece korunur veya hazırlanır.

13. Safety risk bir relevance bonusu değildir

Bir entity tehlikeli durumda diye offline simülasyonda daha çok ilerletilmemelidir.

Aksine:

yüksek safety risk
→ daha sıkı sınır
→ pending player veya freeze

üretmelidir.

14. Simulation tiers
type SimulationTier =
  | "detailed"
  | "standard"
  | "compressed"
  | "background"
  | "frozen"
Detailed

Aktif hikâyedeki ana entity’ler.

Standard

Yakın ve ilgili entity’ler.

Compressed

Önemli ama düşük ayrıntıyla işlenebilen süreçler.

Background

Yalnızca basit rutin veya aggregate değişim.

Frozen

Hiç ilerleme yok.

15. Tier özellikleri
Detailed:
dakika veya sahne adımları

Standard:
saatlik veya olay bazlı adımlar

Compressed:
günlük özet adımları

Background:
tek aggregate sonuç

Frozen:
state korunur

Offline simülasyonda detailed çok sınırlı kullanılmalıdır.

16. Simulation budget
type SimulationBudget = {
  maximumEntitySteps: number
  maximumGeneratedEvents: number
  maximumDecisionEvaluations: number
  maximumRelationshipEvaluations: number
  maximumLocationTransitions: number
  maximumQuestTransitions: number
}

Bütçe:

cihaz kapasitesi,
evren büyüklüğü,
offline süre,
aktif görev sayısı

ile ayarlanabilir.

17. Budget allocation

Örnek dağılım:

%35 aktif görev ve karakterler
%20 yakın NPC hedefleri
%15 world event hazırlıkları
%10 yaralanma ve recovery
%10 konum ve rota değişimleri
%5 ilişkisel sonuçlar
%5 arka plan dünya değişimleri

Bu sabit olmak zorunda değildir.

18. Budget exhaustion

Bütçe biterse:

kritik entity’ler tamamlanır,
düşük öncelikli entity’ler compressed veya frozen olur,
sonuç nondeterministic bırakılmaz,
sonraki simülasyona ertelenen işler kaydedilir.
type DeferredSimulationWork = {
  entityId: string
  reason: "budget_exhausted"
  resumePriority: number
}
19. Deterministic ordering

Aynı request için entity sırası değişmemelidir.

Örnek sıra:

1. Safety-critical states
2. Pending player boundaries
3. Active world events
4. Active quests
5. Relevant NPC goals
6. Recovery processes
7. Location and route changes
8. Background routines

Aynı grupta:

priority
→ nextEligibleTime
→ stable entity ID

kullanılabilir.

20. Simulation stepping

Büyük zaman aralığı tek adımda çözülmemelidir.

type SimulationStep = {
  fromWorldMinute: number
  toWorldMinute: number

  stepType:
    | "boundary"
    | "scheduled_event"
    | "entity_action"
    | "compressed_period"
}

Adımlar şu sınırlarda bölünebilir:

day period,
world event,
quest timer,
recovery milestone,
NPC routine değişimi,
player gate.
21. Adaptive step size

Her entity aynı zaman çözünürlüğünü kullanmaz.

Örnek:

Yaralı Tilki:
6 saatlik recovery adımları

Festival hazırlığı:
1 günlük adımlar

Aktif seyahat:
30 dakikalık adımlar

Uzak köy rutini:
tek aggregate sonuç
22. Entity simulation contract

Her motor kendi entity türü için standart arayüz sağlamalıdır.

type EntitySimulationAdapter = {
  canSimulate(
    entityId: string,
    context: SimulationContext
  ): boolean

  planStep(
    entityId: string,
    context: SimulationContext
  ): SimulationStepProposal

  resolveStep(
    proposal: SimulationStepProposal,
    context: SimulationContext
  ): EntitySimulationResult

  validateResult(
    result: EntitySimulationResult
  ): ValidationFinding[]
}
23. Simulation Context
type SimulationContext = {
  mode: SimulationRequest["mode"]

  worldClock: WorldClock
  worldStateVersion: number

  intensityMultiplier: number
  allowedEventClasses: string[]

  playerPresent: boolean
  safetyProfileId: string

  deterministicSeed: string
  remainingBudget: SimulationBudget
}
24. NPC simulation

NPC simülasyonu şu alanları değerlendirebilir:

mevcut hedefler
duygular
belief’ler
ilişkiler
konum
rutin
erişilebilir eşyalar
aktif world event’ler
zaman
hava

Akış:

NPC goal candidates
↓
Decision Engine
↓
Action feasibility
↓
Offline policy
↓
Canonical action
25. NPC offline action sınıfları
type NpcOfflineActionClass =
  | "routine"
  | "preparation"
  | "recovery"
  | "safe_travel"
  | "resource_gathering"
  | "maintenance"
  | "social_minor"
  | "player_gated"
  | "unsafe"

İlk altı sınıf sınırlı biçimde ilerleyebilir.

player_gated ve unsafe ilerletilmez.

26. NPC autonomous goal progression

Örnek:

Denizci’nin hedefi:
Teknenin yırtık yelkenini onarmak.

Offline:

kumaşı bulabilir,
yelkeni temizleyebilir,
aletleri hazırlayabilir,
basit onarım yapabilir.

Ama oyuncu daha önce:

Yelkeni eski haliyle koruyalım mı,
yoksa tamamen değiştirelim mi?

gibi karar sahibi yapıldıysa kritik dönüşüm bekler.

27. NPC goal boundary

Bir NPC kendi hedefini tamamlayabilir.

Ancak şu durumlarda durmalıdır:

oyuncunun verdiği sözü etkiliyorsa,
oyuncu tarafından başlatılmış ortak görevse,
benzersiz item tüketilecekse,
kalıcı world transformation üretecekse,
ana arc dalını belirleyecekse.
28. NPC safe travel

NPC offline seyahat edebilir, fakat yalnızca:

bilinen rota,
düşük risk,
açık erişim,
uygun zaman,
player gate olmayan hedef

durumunda.

Seyahat sonucu recap açısından önemliyse kaydedilir.

29. NPC teleport yasağı

Offline compressed simulation bile teleport değildir.

Aşağıdaki veriler korunmalıdır:

origin
route
travel duration
destination
arrival event

Narrative ayrıntısı sıkıştırılabilir ama mekânsal gerçek atlanamaz.

30. Yaralanma ve recovery

Daha önce verdiğimiz örnek:

Tilki en son yaralı görüldü.
10 gün sonra state hesaplanırken bu önemli.

Bu motor tam olarak bunu yönetir.

Yaralanma state’i:

ciddiyet,
iyileşme hızı,
güvenli konum,
bakım,
geçen simüle zaman

ile değerlendirilir.

31. Recovery model
type RecoveryProcess = {
  id: string
  characterId: string

  conditionId: string
  severity: number

  recoveryRatePerWorldDay: number

  requiredConditions: GoalCondition[]
  blockingConditions: GoalCondition[]

  offlinePolicy:
    | "safe_progress"
    | "reduced_progress"
    | "freeze"
    | "player_required"
}
32. Recovery kanıtı

İyileşme yalnızca süreyle olmaz.

Faktörler:

dinlenme,
güvenli konum,
bakım,
yiyecek ve su,
yeni zarar görmeme,
gerekiyorsa yardım.

Time Engine süreyi sağlar.

Recovery resolver koşulları değerlendirir.

33. Recovery fail-safe

Offline sürede hafif yaralanma kötüleşmemelidir.

Daha ciddi durumlarda:

stable_pending_help

durumuna geçilebilir.

Çocuk döndüğünde ağır krizle karşılaşmamalıdır.

34. Alakasız entity’lerin atlanması

Kullanıcının verdiği tilki örneğindeki kritik fikir:

Yaralı Tilki zamanla ilgili olduğu için işlenmeli; alakasız karakterler hiç hesaba katılmamalı.

Bu nedenle her entity için:

type TemporalRelevanceAssessment = {
  entityId: string

  hasTimeSensitiveState: boolean
  hasActiveGoal: boolean
  hasPendingProcess: boolean
  isPlayerRelevant: boolean

  shouldSimulate: boolean
  selectedTier: SimulationTier
}

tutulabilir.

35. Time-sensitive state

Şu state’ler zaman hassastır:

yaralanma,
geçici duygu,
seyahat,
crafting,
onarım,
event hazırlığı,
item kuruması,
görev bekleme süresi,
büyüyen bitki,
hava olayı.

Şunlar çoğunlukla zaman hassas değildir:

bir NPC’nin göz rengi,
kalıcı kişilik özelliği,
ziyaret edilmemiş uzak heykel,
değişim süreci olmayan sıradan item.
36. No-op simulation

Bir entity değerlendirildiğinde hiçbir anlamlı değişim yoksa event üretilmemelidir.

type EntitySimulationResult =
  | {
      changed: true
      stateDelta: SimulationStateDelta
      eventIds: string[]
    }
  | {
      changed: false
      reason: "no_meaningful_change"
    }

Bu event spam’ini önler.

37. Emotion simulation

Duygular zamanla değişebilir.

Ancak World Simulation Engine yalnızca:

geçen süre
güvenli ortam
aktif olay
karakter etkileşimi

bağlamını Emotion Engine’e verir.

Emotion Engine:

decay,
persistence,
recovery,
reinforcement

kurallarını uygular.

38. Offline emotion sınırı

Offline sürede:

hafif korku azalabilir,
sakinlik artabilir,
kısa öfke yatışabilir,
kalıcı yas tamamen yok olmamalıdır,
sevgi veya güven yalnızca zaman geçti diye artmamalıdır.
39. Relationship simulation

İlişkiler background’da sürekli puan değiştirmemelidir.

Offline ilişki değişimi yalnızca kanonik etkileşim varsa oluşur.

Örnek:

Tilki ve Baykuş köprü hazırlığında birlikte çalıştı.

Bu bir relationship event adayıdır.

Ama:

3 gün geçti
→ güven +2

yanlıştır.

40. Minor social interactions

NPC’ler offline küçük sosyal etkileşimler yaşayabilir.

type MinorSocialSimulation = {
  participantIds: string[]

  interactionType:
    | "greet"
    | "work_together"
    | "share_information"
    | "offer_help"
    | "rest_together"

  narrativeImportance: number
}

Sadece anlamlı ilişki kanıtı varsa ilgili motorlara event gönderilir.

41. Relationship change cap

Offline tek simülasyonda büyük ilişki sıçramaları engellenmelidir.

type OfflineRelationshipCap = {
  maximumAbsoluteChangePerPair: number
  maximumSignificantEventsPerPair: number
}

Özellikle oyuncu-NPC ilişkisi oyuncu yokken büyük ölçüde değişmemelidir.

42. Quest simulation

Quest Engine offline şu işlemleri yapabilir:

hazırlık objective’i,
NPC-owned objective,
resource collection,
güvenli tamir,
available durumuna geçiş,
obsolete kontrolü.

Yapamaz:

player-gated objective,
ana sonuç seçimi,
kritik ödül seçimi,
oyuncunun rotasını belirleme,
ana gizemi çözme.
43. Quest preparation cap

Offline ilerleme görev aşamasını tamamlamadan şu noktada durabilir:

objective readiness = complete
stage resolution = pending player

Örnek:

Tahtalar ve ipler hazır.
Köprü tasarımı seçilmedi.
44. Quest obsolescence

Dünya değişimi bir görevi anlamsız hâle getirebilir.

Offline değerlendirmede görev:

obsolete

olabilir.

Ancak oyuncunun emeği korunmalıdır.

Örnek:

toplanan malzemeler başka projeye aktarılır,
NPC teşekkür eder,
kısmi contribution kaydedilir,
follow-up görev açılır.
45. Inventory simulation

Offline güvenli işlemler:

eşyanın depoya konması,
ödünç item’in iade edilmesi,
hafif condition recovery,
basit crafting hazırlığı,
ıslak item’in kuruması.

Kısıtlı işlemler:

önemli item tüketimi,
benzersiz item transferi,
quest item kaybı,
geri döndürülemez crafting,
oyuncu item’inin NPC tarafından kullanılması.
46. Perishable ve decay

Decay yalnızca:

item açıkça perishable ise,
offline policy izin veriyorsa,
10 günlük sınır içindeyse,
sonuç cezalandırıcı değilse

uygulanır.

MVP’de çoğu item freeze edilebilir.

47. Map ve location simulation

Offline mekânsal değişimler:

NPC safe travel,
onarım hazırlığı,
rota temizliği,
küçük çevresel değişim,
geçici hava etkisi.

Yasak veya player-gated:

yeni ana bölge keşfi,
oyuncu adına gizli yol keşfi,
sevilen mekânın yıkılması,
büyük kalıcı dönüşüm,
oyuncuya ait harita seçimi.
48. Environmental simulation

Çevresel süreç sınıfları:

type EnvironmentalProcessClass =
  | "cosmetic"
  | "restorative"
  | "preparatory"
  | "accessibility_change"
  | "major_transformation"
  | "hazard_escalation"

Offline:

cosmetic,
restorative,
preparatory

çoğunlukla izinlidir.

Diğerleri sıkı kontrol ister.

49. World event simulation

World Event Engine:

scheduled
→ announced
→ preparing

aşamalarında ilerleyebilir.

Player-preserved event:

preparing
→ pending player

noktasında durur.

Ana etkinlik başlamaz.

50. Event auto-resolution

Şu event’ler offline çözülebilir:

hafif yağmurun bitmesi,
küçük pazarın kapanması,
basit teslimat,
düşük etkili bakım.

Şunlar çözülemez:

festival ana anı,
büyük fırtına sonucu,
ana görev olayı,
önemli karakter karşılaşması,
harita açan keşif.
51. Pending player conversion

Bir süreç oyuncu kapısına ulaştığında:

type PlayerGateConversion = {
  sourceEntityId: string
  sourceProcessId: string

  reachedAtWorldMinute: number

  pendingEventId: string
  preparedChoiceIds: string[]

  preservedStateVersion: number
}

Bundan sonra süreç freeze olur.

52. Pending player deduplication

Aynı süreç her simülasyonda yeni pending event üretmemelidir.

Benzersiz anahtar:

sourceProcessId
+
gateId
+
worldStateVersion

olabilir.

53. Simulation intensity

Offline intensity:

type SimulationIntensity =
  | "normal_safe"
  | "reduced"
  | "minimal"
  | "frozen"

Her intensity farklı limitler taşır.

54. Normal-safe intensity

İlk 0–3 gerçek gün için:

rutinler,
recovery,
hazırlık,
güvenli seyahat,
küçük sosyal etkileşim,
düşük etkili world event

çalışabilir.

Yine de kritik player gate korunur.

55. Reduced intensity

4–7 gün için:

daha az entity,
daha az seyahat,
daha az sosyal olay,
yalnızca doğrudan ilgili görev hazırlığı,
sınırlı recovery,
world event yalnızca hazırlık.
56. Minimal intensity

8–10 gün için:

time-sensitive recovery,
güvenli durum stabilizasyonu,
küçük hazırlık,
pending player üretimi.

Yeni hikâye ipliği başlatılmaz.

57. Frozen intensity

10 günden sonra:

entity step yok
event yok
state delta yok

Sadece:

yokluk süresi,
freeze uygulandığı,
dönüş checkpoint’i

kaydedilir.

58. Simulation compression

Uzun offline sürelerde her gün ayrı olay üretmek yerine aggregate sonuç oluşturulabilir.

Yanlış:

1. gün Tilki odun topladı.
2. gün Tilki odun topladı.
3. gün Tilki odun topladı.

Doğru:

Tilki birkaç gün boyunca köprü için küçük dallar topladı.

State yine net miktar değişimi taşıyabilir.

59. Aggregate action
type AggregateSimulationAction = {
  actorId: string
  actionType: string

  repeatedCount: number
  totalWorldMinutes: number

  resultingDelta: SimulationStateDelta
  sourceStepIds: string[]
}
60. Aggregate cap

Arka plan kaynak toplama sınırsız ilerlememelidir.

type BackgroundProgressCap = {
  processType: string

  maximumProgressPerOfflineWindow: number
  maximumCompletionRatio: number
}

Örnek:

Köprü malzemesi hazırlığı:
offline en fazla %80

Son karar ve tamamlanma oyuncuyu bekler.

61. Novelty cap

Offline simülasyon yeni içerik üretmemelidir.

Varsayılan olarak:

yeni ana NPC yok,
yeni bölge yok,
yeni büyük görev yok,
yeni gizem yok,
yeni ana item yok.

Yalnızca mevcut süreçleri güvenli biçimde ilerletir.

62. Story seed generation

Küçük bir offline olay yeni story seed oluşturabilir.

Örnek:

Baykuş eski duvarda tanıdık olmayan bir işaret fark etti.

Ama bu işaretin anlamı çözülmez.

Story seed:

Baykuşun Yeni İşareti

olarak pending kalabilir.

63. Simulation causality

Her delta kaynak olaya bağlanmalıdır.

type SimulationStateDelta = {
  id: string
  entityId: string
  entityType: string

  previousVersion: number
  resultingVersion: number

  changes: Record<string, unknown>

  causedBySimulationStepId: string
  causationEventIds: string[]
}
64. Cross-engine event order

Tek bir entity action birden fazla motoru etkileyebilir.

Örnek:

Tilki köprü için odun topladı.

Olası sıra:

1. Action resolved
2. Time advanced
3. Inventory updated
4. Quest progress evaluated
5. Memory event emitted
6. Relationship context emitted
7. Recap candidate created

Bu sıra deterministik olmalıdır.

65. Cross-engine ownership

Her state’in sahibi tek motordur.

Character location:
Map Engine

Item ownership:
Inventory Engine

Quest objective:
Quest Engine

Emotion vector:
Emotion Engine

Relationship state:
Relationship Engine

World clock:
Time Engine

World Simulation Engine bu state’leri doğrudan düzenlemez.

İlgili motora validated command gönderir.

66. Saga yaklaşımı

Bir offline action birden fazla motoru etkiliyorsa saga kullanılabilir.

type SimulationSaga = {
  id: string
  stepIds: string[]

  status:
    | "planned"
    | "executing"
    | "completed"
    | "compensating"
    | "failed"
}

Örnek:

NPC seyahat etti
+
item taşıdı
+
quest hazırlığı ilerledi

Her alt işlem doğrulanmalıdır.

67. Atomicity sınırı

Bütün offline pencereyi tek büyük transaction yapmak pahalı olabilir.

Daha doğru:

simulation step transaction
+
final snapshot commit

Kritik ilişkili işlemler aynı step içinde atomik olmalıdır.

68. Simulation checkpoint
type SimulationCheckpoint = {
  simulationId: string

  worldMinute: number
  worldStateVersion: number

  processedStepCount: number
  remainingEntityIds: string[]

  deterministicCursor: string
}

Teknik kesinti olursa buradan devam edilebilir.

69. Idempotency

Aynı simulation request iki kez uygulanmamalıdır.

type SimulationOperationKey = {
  universeId: string
  sourceRequestId: string
  fromWorldMinute: number
  toWorldMinute: number
}

Aynı key’in sonucu tekrar döndürülür.

70. Replayability

Replay için gerekli bilgiler:

başlangıç snapshot’ı,
simulation request,
rule versions,
deterministic seed,
entity ordering,
step sonuçları,
external proposals’ın onaylanmış sonuçları.

LLM çıktıları replay sırasında yeniden üretilmemelidir.

Yapılandırılmış onaylanmış sonuç kullanılmalıdır.

71. Randomness

Rastgelelik gerekiyorsa seed’li olmalıdır.

Örnek:

Tilki kısa yol mu seçti,
normal yol mu?

Aynı state ve seed aynı sonucu vermelidir.

type DeterministicRandomContext = {
  seed: string
  streamName: string
  cursor: number
}
72. Randomness sınırı

Rastgelelik şunları belirleyebilir:

küçük rutin varyasyonu,
kozmetik olay,
düşük riskli rota tercihi,
kaynak miktarı içindeki küçük değişim.

Belirleyemez:

kritik görev sonucu,
ağır zarar,
önemli ilişki kopuşu,
benzersiz item kaybı,
ana arc dalı.
73. Simulation safety review

Her planned action şu sorulardan geçer:

Oyuncu yokken yapılabilir mi?
Geri döndürülemez mi?
Çocuk dönünce suçluluk yaratır mı?
Sevilen entity’ye ağır zarar verir mi?
Oyuncunun karar alanını daraltır mı?
Dünya çok fazla değişir mi?
74. Unsafe simulation disposition
type SimulationSafetyDisposition =
  | "allow"
  | "allow_reduced"
  | "convert_to_preparation"
  | "convert_to_pending_player"
  | "freeze"
  | "block"

Örnek:

Köprüyü tamamen yeniden tasarlama:
convert_to_pending_player

Malzeme toplama:
allow

Yıkılan köprüde NPC ağır yaralandı:
block
75. Player agency preservation

Offline simülasyon şu alanları korumalıdır:

hedef seçimi,
hikâye dalı,
önemli karaktere güvenme,
benzersiz eşya kullanımı,
kalıcı mekân dönüşümü,
ana görev çözümü,
grup üyeliği,
karaktere verilen söz.
76. Agency reservation
type PlayerAgencyReservation = {
  domain: string
  targetId: string

  reservedDecisionType: string
  createdByEventId: string

  releaseConditionIds: string[]
}

Bu reservation varken NPC veya simulation aynı kararı veremez.

77. Player-owned promises

Çocuk:

“Yarın Tilki ile kuleye gideceğim.”

demişse NPC offline kuleye tek başına gidip görevi çözmemelidir.

Bu söz:

Memory Engine,
Quest Engine,
Agency Reservation

tarafından korunabilir.

78. Contribution preservation

Offline NPC ilerlemesi oyuncunun katkısını görünmez yapmamalıdır.

Örnek:

Çocuk daha önce üç tahta topladı.

Offline NPC’ler dört tahta daha topladı.

Dönüşte:

Senin bulduğun tahtaların yanına köylüler de birkaç sağlam parça ekledi.

Oyuncu emeği açıkça korunur.

79. Simulation recap selection

Her değişiklik çocuğa gösterilmez.

Recap Score =
Player Relevance
+ Quest Relevance
+ Visible World Change
+ Character Importance
+ Pending Decision
− Redundancy
− Technical Detail
80. Recap türleri
type SimulationRecapEntry = {
  id: string

  entryType:
    | "character"
    | "quest"
    | "world"
    | "item"
    | "event"
    | "pending_decision"

  importance: number
  sourceEventIds: string[]

  childFacingSummaryIntent: string
}

LLM summary intent’i doğal dile çevirebilir.

81. Recap truth boundary

Recap yalnızca:

oyuncunun bilebileceği,
gözle görünür,
NPC’nin iletebileceği,
mektup veya mesajla öğrenilen

bilgileri içermelidir.

Uzak bölgede gizli gerçekleşen olay doğrudan anlatılamaz.

82. Hidden offline events

Bazı offline değişiklikler kanoniktir ama oyuncu henüz bilmez.

Örnek:

Denizci haritayı daha güvenli bir sandığa taşıdı.

Bu state değişebilir.

Ancak recap:

Haritanın yeri değişti.

dememelidir.

Oyuncu sonradan keşfedebilir.

83. Character return reactions

Çocuk döndüğünde NPC’ler:

suçlayıcı,
bağımlılık kuran,
aşırı özlem baskısı yapan

dil kullanmamalıdır.

Uygun:

Tilki seni görünce sevindi ve hazırladıkları tahtaları gösterdi.

Uygun olmayan:

Bizi neden bu kadar yalnız bıraktın?

84. Long absence recovery

10 günden uzun gerçek yoklukta özel dönüş modu kullanılabilir.

type LongAbsenceReturnMode = {
  freezeApplied: true

  recapDepth:
    | "brief"
    | "guided"

  suggestedResumeOptions: string[]
  safeReorientationRequired: boolean
}

Dünya donduğu için uzun olay listesi oluşmaz.

85. Reorientation

Uzun aradan sonra sistem şunları sunabilir:

En son neredeydik?
Kimler yanımızdaydı?
Aktif hedef neydi?
Çantada önemli ne vardı?
Hangi karar bekliyor?

Bu Story Context Builder’dan hazırlanır.

86. Simulation debt

İşlenemeyen düşük öncelikli süreçler birikmemelidir.

type SimulationDebt = {
  entityId: string
  deferredCount: number
  accumulatedPriorityBoost: number
}

Her ertelemede küçük priority artışı olabilir.

Ama relevance yoksa sonsuza kadar işlenmek zorunda değildir.

87. Dormant entities

Uzun süre alakasız kalan entity:

dormant

durumuna alınabilir.

Dormant entity:

sürekli simüle edilmez,
yalnızca yeni relevance sinyaliyle aktive edilir,
canonical state’i korunur.
88. Dormancy modeli
type EntityDormancyState = {
  entityId: string

  state:
    | "active"
    | "cooling"
    | "dormant"
    | "archived"

  lastRelevantWorldMinute: number
  wakeConditionIds: string[]
}
89. Wake conditions

Dormant entity şu durumlarda uyanabilir:

oyuncu bölgeye yaklaşır,
görevi tekrar aktif olur,
world event etkiler,
başka NPC onunla ilgili hedef edinir,
child explicitly mentions entity,
önemli callback uygun olur.
90. Aggregate population simulation

Her küçük NPC ayrı simüle edilmek zorunda değildir.

Örnek:

Köy halkı
Orman hayvanları
Liman işçileri

aggregate group olarak işlenebilir.

type PopulationAggregate = {
  id: string
  locationId: string

  populationType: string
  activityState: string
  resourceContributionRate: number
}

Önemli birey hâline gelen NPC daha sonra ayrı entity’ye ayrılabilir.

91. Aggregate-to-individual promotion

Bir arka plan NPC:

oyuncuyla konuşursa,
isim alırsa,
görev sahibi olursa,
ilişki kurulursa

kalıcı bireysel entity’ye dönüşebilir.

Bu dönüşüm kanonik event ile yapılır.

92. Fox example

Kullanıcının örneğini tam akışa çevirelim.

Başlangıç:

Tilki:
yaralı
location = forest_shelter
recoveryProcess = active
player relevance = high

Uzak tüccar:
sağlıklı
aktif hedef yok
player relevance = very low
time-sensitive state yok

Simülasyon:

Tilki:
selected tier = standard
recovery değerlendirilir

Uzak tüccar:
selected tier = frozen veya background no-op
ayrıntılı hesaplanmaz

Sonuç:

Tilki’nin yarası iyileşir veya stabil kalır.
Uzak tüccar için event üretilmez.

Tam olarak istediğimiz davranış budur.

93. Simulation planner
type SimulationPlan = {
  simulationId: string

  orderedEntityPlans: {
    entityId: string
    tier: SimulationTier
    allocatedSteps: number
    priority: number
  }[]

  temporalSteps: SimulationStep[]
  budget: SimulationBudget
}

Plan önce hazırlanır, sonra uygulanır.

94. Plan validation

Çalıştırmadan önce:

- player-gated entity detailed ilerliyor mu?
- freeze süresi aşılmış mı?
- budget gerçekçi mi?
- aynı entity iki kez planlanmış mı?
- dependency sırası doğru mu?
- critical state atlanmış mı?

kontrol edilir.

95. Dependency graph

Entity’ler arası işlem sırası bağımlılıkla belirlenebilir.

Örnek:

Weather
↓
Route accessibility
↓
NPC travel
↓
Quest preparation
type SimulationDependency = {
  beforeEntityId: string
  afterEntityId: string
  reason: string
}
96. Circular dependency

Şu döngü oluşabilir:

NPC action quest’e bağlı
quest ilerlemesi NPC action’a bağlı

Çözüm:

current snapshot üzerinden proposal,
aynı step sonunda aggregate commit,
sonraki step’te yeni state kullanımı.

Aynı step içinde sonsuz yeniden değerlendirme yapılmaz.

97. Fixed-point sınırı

Bazı sistemler birkaç tur değerlendirme isteyebilir.

MVP için:

maximumResolutionPasses = 2 veya 3

Sonrasında:

stable state,
pending,
deferred

sonuçlarından biri seçilir.

98. Simulation validation layers
Entity validation
↓
Cross-engine validation
↓
Temporal validation
↓
Safety validation
↓
World invariant validation
↓
Recap visibility validation
99. World invariants

Commit öncesi:

- karakter aynı anda iki yerde değil,
- item iki owner’da değil,
- world time geriye gitmedi,
- player-gated quest tamamlanmadı,
- critical item kaybolmadı,
- ilişki değişimi kanıtsız değil,
- event lifecycle geçerli,
- 10 günlük freeze aşılmadı,
- gizli bilgi recap’e sızmadı.
100. Simulation commit
BEGIN SIMULATION COMMIT

- verify starting world version
- apply time deltas
- apply entity step transactions
- create pending player events
- update process states
- store recap candidates
- create simulation audit record
- persist final snapshot

COMMIT
101. Conflict handling

Aktif başka request state’i değiştirdiyse:

WORLD_VERSION_CONFLICT

oluşur.

Offline simülasyon eski snapshot’a zorla uygulanmaz.

Yeni snapshot üzerinden yeniden planlanır.

102. Simulation preview

Ebeveyn veya geliştirici için preview modu olabilir.

type SimulationPreviewResult = {
  proposedChanges: SimulationStateDelta[]
  blockedChanges: string[]
  pendingPlayerConversions: string[]
  estimatedRecapEntries: string[]
}

Preview hiçbir state commit etmez.

103. Developer explainability
type SimulationTraceEntry = {
  entityId: string

  relevanceVector: SimulationRelevanceVector
  selectedTier: SimulationTier

  evaluatedRules: string[]
  selectedActionId?: string
  blockedReason?: string

  resultingEventIds: string[]
}

Bu sistem sorunlarını anlamada çok değerlidir.

104. Parent-facing transparency

Ebeveyne teknik trace değil, sade özet gösterilebilir:

Çevrimdışı ilerleme sırasında:

- güvenli iyileşme süreçleri devam etti,
- görev hazırlıkları ilerledi,
- kritik kararlar bekletildi,
- önemli eşyalar korunarak dünya 10 günlük sınırda donduruldu.
105. Simulation metrics

Takip edilebilecek metrikler:

processed entity count
skipped entity count
no-op ratio
pending conversion count
budget utilization
validation failure count
average simulation duration
recap entry count
freeze rate
replay mismatch count
106. No-op ratio

No-op oranı çok yüksekse scope seçimi zayıf olabilir.

Örneğin:

1000 entity değerlendirildi
920 değişmedi

Bu fazla geniş scope anlamına gelir.

Relevance threshold yükseltilmelidir.

107. Simulation quality metrics
Agency Preservation Rate
Critical State Coverage
Offline Safety Violation Rate
World Consistency Pass Rate
Recap Relevance Score
Deterministic Replay Match Rate
108. Testing strategy
Unit tests
Scope selection tests
Relevance scoring tests
Budget tests
Offline intensity tests
NPC action tests
Recovery tests
Quest preparation tests
Pending player tests
Cross-engine saga tests
Replay tests
Idempotency tests
Freeze tests
Recap visibility tests
109. Property-based tests
On günden sonra hiçbir state delta oluşmaz.
Player-gated süreç offline tamamlanmaz.
Aynı simulation request iki kez state değiştirmez.
Aynı snapshot ve seed aynı sonucu üretir.
Simülasyon sonrası her item tek konum zincirindedir.
Her karakter tek fiziksel konumdadır.
İlişki değişiminin kaynak interaction event’i vardır.
Recap gizli world truth içermez.
110. Scenario: yaralı Tilki

Başlangıç:

Offline süre:
6 gerçek gün

Tilki:
hafif yaralı
güvenli barınakta
Baykuş bakım sağlıyor

Quest:
Kuzey yolculuğu
player gate ile bekliyor

Beklenen:

- Offline intensity ilk bölümde normal-safe, sonra reduced.
- Tilki recovery süreci ilerler.
- Baykuşun bakım olayı kanonik kaydedilir.
- Kuzey yolculuğu başlamaz.
- Quest pending kalır.
- Tilki iyileşmişse recap’e eklenir.
111. Scenario: alakasız karakter

Başlangıç:

Uzak adadaki balıkçı:
aktif hedef yok
player tarafından hiç görülmedi
time-sensitive state yok

Beklenen:

- Relevance düşük.
- Simulation tier frozen veya background no-op.
- Decision Engine çağrılmaz.
- Event üretilmez.
- Bütçe tüketimi minimum olur.
112. Scenario: köprü hazırlığı

Başlangıç:

Quest:
Köprüyü Onar

Eksik:
5 tahta
1 tasarım kararı

Köylüler:
malzeme toplayabilir

Oyuncu:
7 gün yok

Beklenen:

- Köylüler sınırlı malzeme toplar.
- 5 tahta tamamlanabilir.
- Tasarım kararı verilmez.
- Quest stage tamamlanmaz.
- Pending player event oluşur.
- Oyuncunun önceki katkısı recap’te korunur.
113. Scenario: festival

Başlangıç:

World Event:
Ay Işığı Festivali

status:
preparing

offlinePolicy:
player_preserved

Oyuncu:
12 gün yok

Beklenen:

- İlk 10 gün içinde hazırlık güvenli sınırda ilerler.
- Festival ana etkinliği başlamaz.
- Son 2 gün freeze.
- Meydan süslemeleri tamamlanabilir.
- Event pending player olur.
- Çocuk festival kaçırmış sayılmaz.
114. Scenario: gizli bilgi

Başlangıç:

Denizci:
haritayı eski sandıktan yeni sandığa taşıdı

Player:
haritanın yerini bilmiyor

Beklenen:

- Inventory/location state güncellenebilir.
- Recap haritanın yeni yerini açıklamaz.
- Gerekirse yalnızca Denizci’nin bir şeyleri düzenlediği söylenebilir.
- Quest journal gizli bilgi kazanmaz.
115. Scenario: eşzamanlı aktif hikâye

Durum:

Offline simulation başlatıldı.
Aynı anda kullanıcı aktif hikâyeye girdi.

Beklenen:

- World version değişirse offline commit başarısız olur.
- Eski simulation delta uygulanmaz.
- Yeni snapshot üzerinden yeniden değerlendirme yapılır.
- Çifte zaman ilerlemesi oluşmaz.
116. MVP World Simulation Engine

İlk sürüm için şu yapı yeterlidir:

1. Active ve offline simulation ayrımı
2. Relevance tabanlı scope seçimi
3. Detailed, standard, compressed, background ve frozen tier’ları
4. Simulation budget
5. Deterministic entity ordering
6. Adaptive temporal stepping
7. NPC routine, preparation, recovery ve safe travel
8. Yaralanma ve recovery işlemleri
9. Quest prepare-only progression
10. World event player-preserved progression
11. Pending player conversion
12. 0–3 / 4–7 / 8–10 gün intensity eğrisi
13. 10 günden sonra tam freeze
14. Cross-engine state ownership
15. Idempotent simulation request
16. Snapshot, checkpoint ve replay
17. Canonical return recap
117. MVP Simulation Request
type CoreSimulationRequest = {
  universeId: string

  mode:
    | "active"
    | "offline"
    | "replay"

  fromWorldMinute: number
  toWorldMinute: number

  realAbsenceMinutes?: number

  requestId: string
  seed: string
}
118. MVP Relevance Assessment
type CoreRelevanceAssessment = {
  entityId: string
  entityType: string

  playerRelevance: number
  questRelevance: number
  timeSensitivity: number
  spatialRelevance: number
  safetyRisk: number

  totalScore: number

  selectedTier:
    | "standard"
    | "compressed"
    | "background"
    | "frozen"
}

Offline MVP’de detailed gerekmeyebilir.

119. MVP Simulation Plan
type CoreSimulationPlan = {
  simulationId: string

  entityPlans: {
    entityId: string
    tier:
      | "standard"
      | "compressed"
      | "background"
      | "frozen"

    priority: number
  }[]

  maximumSteps: number
  maximumEvents: number
}
120. MVP ana işlemler
calculateOfflineWindow()

buildSimulationScope()

evaluateEntityRelevance()

assignSimulationTiers()

allocateSimulationBudget()

buildSimulationPlan()

simulateNpcProcesses()

simulateRecoveryProcesses()

simulateQuestPreparation()

simulateWorldEventPreparation()

simulateSafeTravel()

convertPlayerGatesToPending()

validateSimulationDeltas()

commitSimulation()

buildOfflineRecap()

replaySimulation()
121. Örnek orchestration
async function runWorldSimulation(
  request: CoreSimulationRequest
): Promise<SimulationResult> {
  const snapshot = await loadWorldSnapshot(
    request.universeId
  )

  const offlineWindow = calculateOfflineWindow({
    request,
    clock: snapshot.clock
  })

  if (
    request.mode === "offline" &&
    offlineWindow.intensity === "frozen"
  ) {
    return commitFreezeRecord({
      request,
      snapshot,
      offlineWindow
    })
  }

  const scope = buildSimulationScope({
    snapshot,
    request,
    offlineWindow
  })

  const assessments = evaluateEntityRelevance({
    scope,
    snapshot,
    request
  })

  const plan = buildSimulationPlan({
    assessments,
    snapshot,
    request,
    offlineWindow
  })

  const stepResults = []

  for (const entityPlan of plan.entityPlans) {
    const result = await simulateEntityPlan({
      entityPlan,
      snapshot,
      request,
      offlineWindow
    })

    stepResults.push(result)
  }

  const pendingConversions =
    convertPlayerGatesToPending({
      stepResults,
      snapshot
    })

  const deltas = buildSimulationDeltas({
    stepResults,
    pendingConversions
  })

  validateSimulationDeltas({
    snapshot,
    deltas,
    request
  })

  return commitSimulation({
    request,
    snapshot,
    deltas,
    pendingConversions
  })
}
122. İlk sürümde yapılmaması gerekenler

Başlangıçta kaçınılması gerekenler:

bütün NPC’leri her offline girişte simüle etmek,
dakika dakika background simulation,
kontrolsüz LLM kararları,
oyuncu yokken yeni ana hikâye başlatmak,
büyük relationship değişimleri,
önemli item kaybı,
ağır yaralanma veya felaket,
sınırsız kaynak üretimi,
rastgele world transformation,
replay edilemeyen randomness,
bütün evreni tek transaction’a almak,
her küçük değişikliği recap’te göstermek.

MVP hedefi:

Yalnızca anlamlı entity’leri işle.
Zamana duyarlı state’leri kaçırma.
Alakasız varlıkları atla.
Oyuncu kararlarını koru.
Dünyayı biraz ilerlet.
On gün sonra güvenle dondur.
Dönüşte anlaşılır bir özet sun.
123. World Simulation & Offline Evolution Engine temel ilkeleri
1. Dünya simülasyonu bütün evreni sürekli işlemek değildir.
2. Yalnızca relevance veya zaman hassasiyeti taşıyan entity’ler simüle edilir.
3. Yaralı, seyahatte, onarımda veya görev hazırlığında olan entity’ler önceliklidir.
4. Alakasız ve değişim süreci olmayan entity’ler atlanabilir.
5. Simülasyon ayrıntı düzeyi entity önemine göre belirlenir.
6. Bütçe kritik entity’lere öncelik verilerek dağıtılır.
7. Aynı snapshot ve seed aynı sonucu üretmelidir.
8. Rastgelelik kritik sonuçları belirleyemez.
9. NPC’ler yalnızca kendi otoriteleri içindeki hedefleri ilerletebilir.
10. Oyuncuya ait önemli kararlar agency reservation ile korunur.
11. Player-gated süreçler pending player durumunda durur.
12. Offline görev ilerlemesi çoğunlukla hazırlıkla sınırlıdır.
13. NPC seyahati gerçek rota ve süreye dayanır; teleport değildir.
14. Hafif yaralanmalar güvenli koşullarda iyileşebilir.
15. Ağır veya riskli durumlar offline kötüleşmek yerine stabilize edilir.
16. İlişkiler yalnızca gerçek etkileşim olayı varsa değişebilir.
17. Zaman geçti diye otomatik ilişki artışı veya düşüşü olmaz.
18. Önemli item’ler offline kaybolmaz veya tüketilmez.
19. World event’ler hazırlık aşamasına ilerleyebilir ama ana an oyuncuyu bekleyebilir.
20. Offline yoğunluk zamanla azalır.
21. On günden sonra hiçbir dünya süreci ilerlemez.
22. Uzun süreler aggregate sonuçlarla sıkıştırılabilir.
23. Aggregate ilerleme oyuncunun katkısını görünmez yapmamalıdır.
24. Offline simülasyon yeni ana NPC, bölge veya gizem üretmemelidir.
25. Her delta kaynak step ve event’lere bağlanmalıdır.
26. Her state’in tek bir otoriter motor sahibi vardır.
27. Simülasyon motoru state’i doğrudan değil, ilgili domain motorları üzerinden değiştirir.
28. Simülasyon işlemleri idempotent, version kontrollü ve replay edilebilir olmalıdır.
29. Dönüş özeti yalnızca görünür, önemli ve kanonik değişiklikleri içermelidir.
30. Dünya oyuncu yokken yaşar ama oyuncunun hikâyesini onun yerine oynamaz.

World Simulation & Offline Evolution Engine’in kavramsal çekirdeği böylece tamamlandı.

Sıradaki en mantıklı ana başlık:

Event Bus, State Commit & Canonical Consistency Engine

Bu bölümde artık bütün motorların aynı dünya üzerinde güvenli biçimde nasıl çalışacağını tanımlamalıyız:

domain event standardı
command ve event ayrımı
transaction sınırları
state ownership
event ordering
idempotency
optimistic locking
saga ve compensation
snapshot
event sourcing
replay
cross-engine validation
canonical commit
failed commit recovery
audit trail