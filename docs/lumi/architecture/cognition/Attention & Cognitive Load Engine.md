Attention & Cognitive Load Engine

Bu motorun görevi:

NPC’nin aynı anda hangi bilgilere odaklandığını, ne kadar zihinsel kapasitesinin kaldığını, hangi uyarıları bastırdığını, odağını ne zaman değiştirdiğini ve bilişsel yükün karar kalitesini nasıl etkilediğini yönetmek.

Perception Engine şunu belirler:

NPC hangi sinyalleri algılayabilir?

Attention Engine:

Algılanabilir sinyallerden hangileri zihinsel işleme alınır?

Cognitive Load Engine ise:

NPC bu bilgileri ne kadar sağlıklı işleyebilir?

sorularını cevaplar.

Tam akış:

Percepts
Active Goals
Current Plans
Emotions
Needs
Memories
Interrupt Candidates
        ↓
Attention Demand Collection
        ↓
Salience and Relevance Evaluation
        ↓
Capacity Allocation
        ↓
Focus Selection
        ↓
Working Memory Update
        ↓
Cognitive Load Evaluation
        ↓
Processing Quality Modifiers
        ↓
Perception / Belief / Goal / Plan / Decision Feedback
1. Attention ile cognitive load ayrımı

Attention:

NPC zihnini neye yöneltiyor?

Cognitive load:

NPC’nin zihinsel kaynakları ne kadar dolu?

Örnek:

Mira yaralı tilkiye odaklanıyor.

Bu attention’dır.

Aynı anda:

Karanlık yaklaşıyor.
Kardeşi konuşuyor.
Tilki hırlıyor.
Köye giden yolu hatırlamaya çalışıyor.
Ne yapacağını planlıyor.

Bu durum cognitive load oluşturur.

NPC bir şeye güçlü biçimde odaklanabilir fakat zihinsel yükü yüksek olduğu için yanlış değerlendirme yapabilir.

2. Temel veri modeli
type CognitiveAttentionState = {
  actorId: string;
  timestamp: number;

  focusState: FocusState;
  attentionAllocations: AttentionAllocation[];

  workingMemory: WorkingMemoryState;

  cognitiveLoad: CognitiveLoadState;
  processingCapacity: ProcessingCapacity;

  interruptionState: InterruptionState;
  fatigueState: CognitiveFatigueState;

  mode:
    | "relaxed"
    | "focused"
    | "scanning"
    | "multitasking"
    | "vigilant"
    | "overloaded"
    | "tunnel_vision"
    | "panic"
    | "automatic";

  explanation: CognitiveStateExplanation;
};
3. Processing capacity

Her NPC’nin temel bilişsel kapasitesi farklıdır.

type ProcessingCapacity = {
  totalCapacity: number;
  availableCapacity: number;
  reservedCapacity: number;

  workingMemoryCapacity: number;
  attentionControl: number;
  inhibitionControl: number;
  switchingAbility: number;

  reasoningCapacity: number;
  planningCapacity: number;
  socialProcessingCapacity: number;
  perceptualProcessingCapacity: number;
};

Bu değerler sabit değildir.

Şunlardan etkilenir:

Yaş
Yorgunluk
Açlık
Korku
Ağrı
Stres
Uyku
Yetenek
Deneyim
Çevresel karmaşıklık
4. Capacity bir vektör olmalıdır

Tek bir bilişsel kapasite değeri yeterli değildir.

type CognitiveCapacityVector = {
  perception: number;
  workingMemory: number;
  reasoning: number;
  planning: number;
  inhibition: number;
  emotionalRegulation: number;
  socialInterpretation: number;
  motorCoordination: number;
};

Örneğin:

Yorgunluk:
planning ve workingMemory’yi düşürür.

Korku:
threat perception’ı artırabilir,
ama reasoning ve socialInterpretation’ı düşürebilir.

Ağrı:
attention kapasitesini sürekli tüketebilir.
5. Attention demand

Dünya ve iç durumlar NPC’nin dikkatini talep eder.

type AttentionDemand = {
  demandId: string;
  actorId: string;

  sourceType:
    | "percept"
    | "goal"
    | "plan_step"
    | "emotion"
    | "need"
    | "memory"
    | "social_signal"
    | "internal_state"
    | "interrupt";

  sourceId: string;

  demandVector: {
    threat: number;
    urgency: number;
    goalRelevance: number;
    emotionalSalience: number;
    novelty: number;
    socialImportance: number;
    identityImportance: number;
  };

  requiredCapacity: number;
  persistence: number;

  interruptPotential: number;
};

Örnek talepler:

Tilkinin hırlaması
Kardeşin “Mira!” diye bağırması
Gün batımının yaklaşması
Ayağındaki ağrı
Şifacıyı bulma planı
Geçmişteki ısırılma anısı
6. Attention priority

Attention priority tek bir salience değerinden oluşmamalıdır.

attentionPriority =
  threat * 0.25 +
  urgency * 0.20 +
  currentGoalRelevance * 0.15 +
  emotionalSalience * 0.15 +
  novelty * 0.10 +
  socialImportance * 0.10 +
  identityImportance * 0.05;

Ancak mode’a göre ağırlıklar değişir.

Örneğin vigilant mode:

threat ağırlığını artırır.

Focused mode:

currentGoalRelevance ağırlığını artırır.

Panic mode:

en yüksek fiziksel tehdit dışındaki boyutları bastırır.
7. Focus State
type FocusState = {
  primaryFocus?: FocusTarget;
  secondaryFocuses: FocusTarget[];

  focusStrength: number;
  focusDuration: number;

  switchingCost: number;
  peripheralAwareness: number;

  focusMode:
    | "single"
    | "split"
    | "alternating"
    | "broad"
    | "automatic";

  protectedFromInterruption: boolean;
};
type FocusTarget = {
  targetType:
    | "entity"
    | "location"
    | "task"
    | "goal"
    | "plan_step"
    | "thought"
    | "memory"
    | "internal_state";

  targetId: string;

  allocation: number;
  reason: string;
};
8. Primary ve secondary focus

NPC’nin tek bir primary focus’u olabilir.

Örnek:

Primary:
Tilkinin hareketlerini takip et.

Secondary:
Kardeşin konumunu izle.
Gün ışığını takip et.

Primary focus:

yüksek çözünürlük
daha hızlı değişim algısı
daha güçlü working memory kaydı

sağlar.

Secondary focus:

düşük ayrıntı
daha yüksek kaçırma ihtimali

taşır.

9. Peripheral awareness

NPC odaklanmadığı alanları tamamen kaybetmemelidir.

type PeripheralAwareness = {
  capacity: number;

  motionSensitivity: number;
  loudSoundSensitivity: number;
  nameDetectionSensitivity: number;
  threatDetectionSensitivity: number;

  detailResolution: number;
};

Peripheral awareness:

ani hareket
yüksek ses
yaklaşan büyük tehdit
kişinin ismi

gibi sinyalleri fark edebilir.

Ancak:

küçük nesnenin düşmesi
sessiz yüz ifadesi
uzak konuşma ayrıntısı

kaçırılabilir.

10. Working memory

Working memory, o anda zihinsel olarak kullanılabilir öğeleri tutar.

type WorkingMemoryState = {
  actorId: string;

  items: WorkingMemoryItem[];

  capacity: number;
  usedCapacity: number;

  rehearsalLoad: number;
  interferenceLevel: number;

  overflowItems: string[];
};

Örnek öğeler:

Tilki yaralı.
Kardeşim arkamda.
Köy kapısı gün batımında kapanır.
Çantamda elma var.
Tilkiye yaklaşmak riskli.
Şifacı köyde olabilir.
11. Working memory item cost

Her öğe eşit yer kaplamaz.

type WorkingMemoryItem = {
  itemId: string;

  contentType:
    | "percept"
    | "belief"
    | "goal"
    | "plan_step"
    | "instruction"
    | "question"
    | "social_context"
    | "internal_state";

  referenceId: string;

  salience: number;
  relevance: number;

  capacityCost: number;
  decayRate: number;

  rehearsalStrength: number;
  interferenceSensitivity: number;

  enteredAt: number;
  lastAccessedAt: number;
};

Basit öğe:

Elma çantada.

düşük maliyetli olabilir.

Karmaşık öğe:

Şifacı köydeyse onu getir; değilse bitki uzmanını bul.

daha yüksek working memory maliyeti taşır.

12. Chunking

Deneyimli NPC birden fazla bilgiyi tek zihinsel paket halinde tutabilir.

Acemi:

Yarayı temizle
Kanamayı kontrol et
Şifalı otu hazırla
Bezi bağla

şeklinde dört ayrı öğe tutar.

Şifacı:

Temel yara bakımı

şeklinde tek chunk kullanabilir.

type CognitiveChunk = {
  chunkId: string;

  sourceItemIds: string[];
  semanticLabel: string;

  compressedCapacityCost: number;
  expertiseRequirement: number;

  retrievalConfidence: number;
};

Skill ve procedural memory working memory verimliliğini artırır.

13. Cognitive load türleri
type CognitiveLoadVector = {
  intrinsic: number;
  perceptual: number;
  workingMemory: number;
  emotional: number;
  social: number;
  temporal: number;
  physical: number;
  coordination: number;
  uncertainty: number;
};
Intrinsic load

Görevin kendi karmaşıklığıdır.

Yarayı tedavi etmek
bir kapıyı kapatmaktan daha karmaşıktır.
Perceptual load

Çok sayıda ses, hareket ve görsel sinyal.

Working memory load

Aynı anda tutulması gereken bilgi miktarı.

Emotional load

Korku, suçluluk, öfke veya üzüntünün tükettiği kapasite.

Social load

Birden fazla kişinin niyetini ve tepkisini takip etmek.

Temporal load

Deadline ve hızlı karar baskısı.

Physical load

Ağrı, yorgunluk, açlık ve motor zorluk.

Coordination load

Birden fazla kişi ve plan adımını yönetme.

Uncertainty load

Eksik veya çelişkili bilgiyle karar verme.

14. Cognitive Load State
type CognitiveLoadState = {
  vector: CognitiveLoadVector;

  totalLoad: number;
  effectiveLoad: number;

  overloadThreshold: number;
  overloadAmount: number;

  loadTrend:
    | "increasing"
    | "stable"
    | "decreasing";

  dominantLoadSources: string[];
};

Toplam load basit toplam olmamalıdır.

Bazı yükler birbirini büyütür.

Örnek:

Yüksek korku
+
yüksek uncertainty
+
zaman baskısı

birlikte reasoning kapasitesini orantısız düşürebilir.

15. Load interaction
type LoadInteractionRule = {
  loadA: keyof CognitiveLoadVector;
  loadB: keyof CognitiveLoadVector;

  affectedCapacity: keyof CognitiveCapacityVector;

  amplification: number;
};

Örnekler:

Emotional + temporal
→ inhibition düşer.

Physical + workingMemory
→ planning düşer.

Social + uncertainty
→ intent interpretation hatası artar.

Perceptual + coordination
→ önemli sinyalleri kaçırma artar.
16. Effective cognitive capacity
effectiveCapacity =
  baseCapacity
  * fatigueModifier
  * needModifier
  * emotionModifier
  * painModifier
  * loadModifier
  * skillModifier;

Vektör bazında:

effectiveReasoning =
  baseReasoning
  - uncertaintyLoad
  - emotionalLoad
  - temporalPressure
  + domainExpertise;

Değerler normalize edilmelidir.

17. Overload

Load kapasiteyi geçtiğinde overload oluşur.

overloadAmount =
  max(0, effectiveLoad - availableCapacity);

Overload sonuçları:

Working memory item kaybı
Daha hızlı ama daha yüzeysel karar
Plan ufkunun kısalması
Belief confidence hataları
Peripheral awareness düşüşü
Goal conflict’lerin gözden kaçması
Tekrarlayan eylemler
Dürtüsellik
Freeze veya kaçınma
18. Overload dereceleri
type OverloadLevel =
  | "none"
  | "mild"
  | "moderate"
  | "severe"
  | "critical";
Mild
Bazı ayrıntılar kaçırılır.
Karar biraz yavaşlar.
Moderate
Working memory kapasitesi düşer.
Planlar basitleşir.
Hedef geçişleri zorlaşır.
Severe
Tunnel vision
Yanlış yorum
Plan adımlarını unutma
Dürtüsel davranış
Critical
Freeze
Panik
Otomatik alışkanlık davranışı
Yardım çağırma
Kaçış davranışı
19. Automatic mode

Yüksek yük altında NPC öğrenilmiş prosedürlere geçebilir.

Düşünmek yerine alışkanlıkla hareket eder.
type AutomaticBehaviorState = {
  active: boolean;

  triggerReason: string;
  candidateHabitIds: string[];

  proceduralReliance: number;
  consciousControl: number;
};

Deneyimli şifacı:

yüksek stres altında temel yara bakımını otomatik uygulayabilir.

Acemi:

donabilir veya yanlış sıraya geçebilir.

Bu nedenle procedural memory kritik rol oynar.

20. Attention allocation

Mevcut kapasite talepler arasında dağıtılır.

type AttentionAllocation = {
  demandId: string;
  allocatedCapacity: number;

  requestedCapacity: number;
  satisfactionRatio: number;

  status:
    | "fully_attended"
    | "partially_attended"
    | "peripheral"
    | "suppressed"
    | "ignored";
};

Örnek:

Tilki hareketi: %45
Kardeş güvenliği: %25
Yol ve gün ışığı: %15
İç korku kontrolü: %10
Diğer çevre: %5

Bu dağılım sabit değildir.

21. Attention allocation politikası
type AttentionAllocationPolicy = {
  minimumThreatAllocation: number;
  minimumPrimaryGoalAllocation: number;
  peripheralReserve: number;

  maxSingleTargetAllocation: number;
  secondaryTargetLimit: number;

  overloadCompressionMode: boolean;
};

Peripheral reserve bırakılmazsa karakter tamamen tunnel vision’a girer.

Ancak panic mode’da reserve sıfıra yaklaşabilir.

22. Focus lock

Bazı görevler kısa süreli kesintisiz odak gerektirir.

Düğüm çözmek
Yarayı temizlemek
Dar köprüden geçmek
Hassas bir nesneyi taşımak
type FocusLock = {
  targetId: string;

  requiredMinimumAllocation: number;
  protectedDuration: number;

  interruptionCost: number;
  failureRiskIfInterrupted: number;
};

Düşük önemde kesintiler bastırılabilir.

Ancak yüksek tehdit focus lock’u kırabilir.

23. Focus persistence

NPC’nin odağı her küçük sinyalde değişmemelidir.

type FocusPersistence = {
  currentFocusValue: number;
  investedTime: number;
  currentTaskProgress: number;

  focusStabilityTrait: number;
  interruptionResistance: number;
};

Yeni talebin odağı değiştirmesi için:

newDemandPriority >
  currentFocusPriority
  + switchingThreshold

olmalıdır.

24. Attention switching

Odağın bir hedeften diğerine geçmesi maliyetlidir.

type AttentionSwitch = {
  fromTargetId?: string;
  toTargetId: string;

  triggerDemandId: string;

  switchingCost: number;
  reorientationDelay: number;

  lostWorkingMemoryItems: string[];
  suspendedTaskId?: string;
};

Geçiş sırasında:

kısa gecikme
önceki görevin bağlam kaybı
hata ihtimali

oluşabilir.

25. Switching cost
switchingCost =
  taskComplexity
  * focusDepth
  * workingMemoryDependency
  * interruptionUnexpectedness;

Basit görev:

Yürümek

kolay kesilir.

Karmaşık görev:

Şifalı ot dozunu hazırlamak

yüksek switching cost taşır.

26. Task resumption cost

Kesilen göreve dönmek de maliyetlidir.

type TaskResumptionState = {
  taskId: string;

  retainedContext: number;
  lostContext: number;

  resumeDelay: number;
  errorRisk: number;

  requiredRecallIds: string[];
};

Prospective memory veya plan step notları, yeniden başlamayı kolaylaştırabilir.

27. Interrupt sistemi
type CognitiveInterrupt = {
  interruptId: string;

  sourceType:
    | "threat"
    | "social"
    | "perceptual"
    | "internal"
    | "goal"
    | "plan"
    | "memory";

  sourceId: string;

  priority: number;
  urgency: number;

  requiresImmediateResponse: boolean;
  expiryTime?: number;

  interruptionCost: number;
};
28. Interrupt değerlendirmesi
interruptScore =
  threat
  + urgency
  + consequenceMagnitude
  + personalRelevance
  + expiryPressure;

Karşılaştırılan değer:

Mevcut focus değeri
+
kesinti maliyeti
+
mevcut adımın kırılganlığı

Örnek:

Kardeşin ayağı kaydı.

yüksek interrupt’tır.

Uzakta güzel bir kuş öttü.

düşük interrupt olabilir.

Ancak curiosity yüksek karakterde dikkat çekebilir.

29. Interrupt suppression

NPC bazı sinyalleri bilinçli veya otomatik bastırabilir.

type InterruptSuppression = {
  interruptId: string;

  suppressionStrength: number;
  suppressionCost: number;

  reason:
    | "lower_priority"
    | "focus_lock"
    | "habit"
    | "emotional_avoidance"
    | "cognitive_overload";

  reconsiderationTrigger?: string;
};

Bastırılan sinyal tamamen kaybolmayabilir.

Daha sonra:

yeniden dikkat talebi
working memory reminder
spontaneous recall

oluşturabilir.

30. Attentional capture

Bazı sinyaller odağı istem dışı ele geçirir.

Patlama
İsimle seslenme
Ani acı
Hızla yaklaşan nesne
Bebeğin ağlaması
type AttentionalCapture = {
  sourceSignalId: string;

  captureStrength: number;
  automaticity: number;

  focusOverrideDuration: number;
  recoveryCost: number;
};

Bu bottom-up mekanizmadır.

31. Goal shielding

Aktif önemli hedef, alakasız talepleri bastırabilir.

Mira kardeşini kaybetti.

Bu sırada:

Haritadaki ilginç sembol

düşük salience alır.

type GoalShieldingState = {
  protectedGoalId: string;

  shieldingStrength: number;
  suppressedDemandTypes: string[];

  missedOpportunityRisk: number;
};

Goal shielding faydalıdır ama yeni fırsat veya tehditlerin kaçırılmasına yol açabilir.

32. Goal neglect

Cognitive load altında bazı aktif hedefler working context’ten düşebilir.

Örnek:

Ana hedef:
Kardeşi güvende tut.

Yeni yoğun görev:
Tilkinin yarasını incelemek.

Mira kısa süreliğine kardeşinin konumunu takip etmeyi bırakabilir.

type GoalAttentionState = {
  goalId: string;

  activeAttention: number;
  backgroundMonitoring: number;

  neglectRisk: number;
  reminderStrength: number;
};

Maintenance hedefleri için minimum attention reserve gerekebilir.

33. Plan attention

Planın bütün adımları aynı anda working memory’de tutulmamalıdır.

Mevcut adım
Bir sonraki adım
Kritik contingency

aktif tutulabilir.

type PlanAttentionProjection = {
  activeStepId: string;
  nextStepIds: string[];

  criticalAssumptionIds: string[];
  contingencyTriggerIds: string[];

  omittedFutureStepCount: number;
};

Bu Plan Engine’in rolling horizon yaklaşımıyla uyumludur.

34. Prospective memory ve attention

Gelecekte yapılacak işler, sürekli attention tüketmemelidir.

Köye ulaşınca şifacıya haber ver.

Bu prospective memory trigger’a bırakılır.

Yanlış yaklaşım:

NPC bunu bütün yol boyunca working memory’de taşır.

Doğru yaklaşım:

Konum trigger’ı oluşunca working memory’ye geri getir.

Bu bilişsel maliyeti azaltır.

35. Rehearsal

NPC önemli bilgiyi unutmamak için zihninde tekrarlayabilir.

“Şifacı, elma, kuzey yol.”
type CognitiveRehearsal = {
  itemIds: string[];

  rehearsalFrequency: number;
  capacityCost: number;

  retentionBoost: number;
  distractionSensitivity: number;
};

Rehearsal memory’yi korur ama sürekli kapasite tüketir.

36. External cognitive aids

NPC zihinsel yükü çevreye aktarabilir.

Taşlarla konumu işaretlemek
Haritaya not düşmek
Birine görevi hatırlatmak
Eşyaları sıraya dizmek
İp bağlamak
type ExternalCognitiveAid = {
  aidId: string;
  actorId: string;

  aidType:
    | "marker"
    | "note"
    | "object_arrangement"
    | "social_reminder"
    | "map"
    | "symbol";

  supportsItemIds: string[];

  workingMemoryReduction: number;
  retrievalReliability: number;

  visibilityRisk: number;
  lossRisk: number;
};

Bu sistem çocuk karakterlerin doğal yöntemler geliştirmesini sağlar.

37. Multitasking

Gerçek paralel düşünme sınırlıdır.

Çoğu durumda NPC:

hızlı attention switching

yapar.

type MultitaskingState = {
  taskIds: string[];

  mode:
    | "true_parallel"
    | "rapid_switching"
    | "primary_plus_monitoring";

  efficiencyLoss: number;
  errorRateIncrease: number;
};

Gerçek paralel işleme daha çok şu durumlarda mümkündür:

Yürürken konuşmak
Basit rutin hareket + çevre tarama
Otomatik skill + sosyal dinleme

Karmaşık iki görev paralel yürütülemez.

38. Multitasking interference
type TaskInterference = {
  taskAId: string;
  taskBId: string;

  sharedCapacityDimensions: string[];

  interferenceStrength: number;

  affectedOutputs:
    | "speed"
    | "accuracy"
    | "memory"
    | "safety";
};

Örnek:

Dar köprüden geçmek
+
karmaşık tartışma yapmak

yüksek interference taşır.

39. Cognitive tunneling

NPC overload altında tek bir çözüm veya tehdide kilitlenebilir.

type CognitiveTunnel = {
  targetId: string;

  tunnelStrength: number;
  alternativeSuppression: number;

  contradictionNeglect: number;
  opportunityNeglect: number;

  exitTriggers: string[];
};

Örnek:

“Mutlaka şifacıyı bulmalıyım.”

NPC yolda bitki uzmanıyla karşılaşsa bile fırsatı fark etmeyebilir.

40. Fixation ile odak ayrımı

Sağlıklı focus:

Görevi verimli biçimde sürdürür.
Yeni kritik bilgiye açıktır.

Fixation:

Alternatifleri bastırır.
Plan çökmüş olsa bile aynı yöntemi sürdürür.
type FixationAssessment = {
  persistence: number;
  evidenceAgainstCurrentApproach: number;
  alternativeAvailability: number;

  fixationRisk: number;
};
41. Decision fatigue

Tekrarlanan kararlar bilişsel kapasiteyi azaltabilir.

type DecisionFatigueState = {
  recentDecisionCount: number;
  recentHighConflictDecisionCount: number;

  accumulatedFatigue: number;

  simplificationBias: number;
  defaultChoiceBias: number;
  avoidanceBias: number;
};

Sonuçları:

Daha az aday değerlendirme
Varsayılan seçeneğe yönelme
Kararı erteleme
Önceki kararı tekrar etme
Sosyal öneriye daha kolay uyma
42. Analysis depth

NPC her kararı aynı ayrıntıyla düşünmemelidir.

type ReasoningDepth =
  | "reflex"
  | "habitual"
  | "quick"
  | "deliberate"
  | "deep";
Reflex
Ani fiziksel tepki.
Habitual
Bilinen prosedürü uygula.
Quick
Az sayıda aday ve kısa sonuç tahmini.
Deliberate
Hedef çatışması ve risk analizi.
Deep
Uzun planlama, bilgi toplama ve karşı olgusal düşünme.
43. Reasoning depth selection
type ReasoningDepthAssessment = {
  consequenceMagnitude: number;
  uncertainty: number;
  reversibility: number;
  timeAvailable: number;

  cognitiveCapacity: number;
  familiarity: number;

  selectedDepth: ReasoningDepth;
};

Derin düşünme şu durumlarda anlamlıdır:

Yüksek sonuç etkisi
Yüksek belirsizlik
Geri dönüşsüz karar
Yeterli zaman
Yeterli kapasite

Ani saldırıda deep reasoning yapılmamalıdır.

44. Bounded rationality

Decision Engine bütün adayları değerlendirmemelidir.

Cognitive engine şu sınırları iletebilir:

type DecisionProcessingBudget = {
  maxCandidateActions: number;
  maxConsequenceDepth: number;
  maxGoalDimensions: number;

  maxBeliefsRetrieved: number;
  maxMemoriesRetrieved: number;

  reasoningDepth: ReasoningDepth;
  timeBudget: number;
};

Yüksek kapasite:

daha fazla aday
daha uzun sonuç zinciri
daha iyi conflict analizi

sağlar.

Düşük kapasite:

ilk yeterli seçeneği seçme
alışkanlık
otoriteye uyma

üretebilir.

45. Satisficing

NPC en iyi seçeneği bulmak yerine yeterince iyi ilk seçeneği seçebilir.

type SatisficingPolicy = {
  minimumAcceptableUtility: number;
  minimumSafety: number;

  searchPersistence: number;
  stopAfterAcceptableOption: boolean;
};

Cognitive load yüksek olduğunda:

kabul edilebilir eşik düşebilir
arama daha erken durabilir
46. Choice overload

Çok fazla aday karar kalitesini düşürebilir.

type ChoiceOverloadState = {
  candidateCount: number;
  similarityBetweenCandidates: number;

  comparisonCost: number;
  paralysisRisk: number;
};

Sonuç:

Kararı erteleme
Varsayılan seçeneği seçme
En basit seçeneğe yönelme
Birinden yardım isteme

Action Generator cognitive budget’a göre aday sayısını sınırlamalıdır.

47. Time pressure
type TimePressureState = {
  availableDecisionTime: number;
  estimatedRequiredTime: number;

  pressureLevel: number;
  deadlineSourceIds: string[];
};

Yüksek time pressure:

reasoning depth düşürür
plan horizon kısaltır
riskli ayrıntıları kaçırabilir
habit kullanımını artırır

Ancak eğitim ve deneyim varsa hızlı karar kalitesi korunabilir.

48. Stress response modes

Cognitive Engine, stres altında farklı davranış modları oluşturabilir.

type StressResponseMode =
  | "fight"
  | "flight"
  | "freeze"
  | "seek_help"
  | "appease"
  | "focused_coping";

Bu modlar kesin ve biyolojik olarak sabit değildir.

Aşağıdakilerden etkilenir:

Trait
Geçmiş deneyim
Mevcut kaynak
Sosyal destek
Algılanan kaçış yolu
Algılanan kontrol
49. Freeze

Freeze yalnızca hiçbir şey yapmamak değildir.

type FreezeState = {
  motorInhibition: number;
  decisionInhibition: number;

  threatMonitoring: number;
  duration: number;

  recoveryTriggers: string[];
};

NPC:

hareket etmeyebilir
ama tehdidi yoğun biçimde gözlemleyebilir

Dış destek:

isminin söylenmesi
basit talimat
güvenilir birinin yaklaşması

freeze’den çıkmayı kolaylaştırabilir.

50. Panic mode
type PanicState = {
  intensity: number;

  reasoningSuppression: number;
  workingMemorySuppression: number;
  threatFocusBoost: number;

  randomActionRisk: number;
  flightBias: number;

  calmingFactors: string[];
};

Panic mode çocuk hikâyelerinde kontrollü ve kısa kullanılmalıdır.

Amaç:

karakteri cezalandırmak değil
yardım, sakinleşme ve destek mekanizmaları üretmek

olmalıdır.

51. Emotional regulation cost

Duyguyu düzenlemek de bilişsel kapasite tüketir.

Mira korkusunu bastırmaya çalışıyor.

Bu:

davranış kontrolünü artırabilir
ama working memory kapasitesini azaltabilir
type EmotionalRegulationLoad = {
  targetEmotion: string;

  regulationStrategy:
    | "suppression"
    | "reappraisal"
    | "breathing"
    | "social_support"
    | "distraction"
    | "acceptance";

  capacityCost: number;
  expectedEffectiveness: number;
};
52. Regulation stratejileri
Suppression
Duyguyu dışarı göstermemeye çalışma.

Kısa vadede davranış kontrolü sağlar ama load yüksektir.

Reappraisal
“Tilki saldırmıyor, yalnızca korkuyor olabilir.”

Belief güncellemesiyle duyguyu azaltır.

Breathing / grounding
Fiziksel uyarılmayı düşürür.
Social support
Güvenilir kişinin yönlendirmesi yükü azaltır.
Distraction
Duygusal odağı kısa süreli başka yöne taşır.
53. Social cognitive load

Sosyal sahneler ayrıca kapasite tüketir.

NPC aynı anda şunları takip edebilir:

Kim konuşuyor?
Kime güveniyorum?
Ne söylemeliyim?
Bir sır saklıyor muyum?
Karşı taraf ne hissediyor?
Sözüm nasıl anlaşılacak?
type SocialCognitiveLoad = {
  participantCount: number;
  relationshipComplexity: number;
  hiddenIntentCount: number;

  politenessDemand: number;
  deceptionDemand: number;
  conflictIntensity: number;

  load: number;
};

Kalabalık ve çatışmalı konuşmalarda yanlış anlaşılma artabilir.

54. Deception load

Yalan söylemek veya sır saklamak ek bilişsel yük oluşturabilir.

type DeceptionCognitiveState = {
  concealedBeliefIds: string[];
  fabricatedClaims: string[];

  consistencyTrackingLoad: number;
  emotionalControlLoad: number;
  exposureRisk: number;
};

NPC:

önceki söylediklerini takip etmek
gerçek bilgiyi bastırmak
sosyal işaretlerini kontrol etmek

zorundadır.

Yük yükselirse çelişki veya hata ihtimali artar.

55. Coordination load

Birden fazla NPC ile plan yürütmek:

rolleri hatırlamak
ilerlemeyi takip etmek
zamanlamayı eşlemek
iletişim kurmak

gerektirir.

type CoordinationCognitiveLoad = {
  participantIds: string[];

  activeAssignments: number;
  synchronizationPoints: number;

  communicationReliability: number;
  trustUncertainty: number;

  load: number;
};

Deneyimli liderlerde bu load daha düşük olabilir.

56. Cognitive offloading to others

NPC bazı zihinsel görevleri başkasına devredebilir.

“Sen yolu takip et.”
“Sen kardeşimi gözle.”
“Ben yaraya bakacağım.”
type CognitiveDelegation = {
  delegatorId: string;
  delegateId: string;

  delegatedAttentionDemandIds: string[];

  expectedLoadReduction: number;
  trustRequirement: number;

  coordinationCost: number;
};

Delegation başarılıysa yük azalır.

Ancak:

karşı tarafın kabulü
yeterliliği
güvenilirliği

gereklidir.

57. Cognitive recovery

Load zamanla düşebilir.

type CognitiveRecoveryFactors = {
  rest: number;
  safety: number;
  socialSupport: number;

  hydration: number;
  food: number;
  emotionalResolution: number;

  taskCompletion: number;
  environmentalCalm: number;
};

Recovery:

kısa mola
uyku
güvenli alan
bir hedefin tamamlanması
destekleyici konuşma

ile hızlanabilir.

58. Cognitive fatigue

Uzun süreli odak ve karar verme yorgunluk oluşturur.

type CognitiveFatigueState = {
  level: number;

  sustainedAttentionDuration: number;
  recentSwitchCount: number;
  recentDecisionLoad: number;

  recoveryRate: number;

  effects: {
    attentionControlLoss: number;
    workingMemoryLoss: number;
    reasoningLoss: number;
    irritabilityIncrease: number;
  };
};

Cognitive fatigue fiziksel yorgunlukla ilişkili ama aynı değildir.

59. Vigilance decrement

Uzun süre tehdit beklemek algı performansını düşürebilir.

Mira uzun süredir ormanı dikkatle tarıyor.

Başta:

yüksek threat detection

Daha sonra:

dikkat azalması
false negative artışı
irritability

oluşabilir.

type VigilanceDecrement = {
  vigilanceDuration: number;
  monotony: number;

  detectionLoss: number;
  falseAlarmIncrease: number;
};
60. Boredom

Düşük uyarım da attention’ı etkiler.

type BoredomState = {
  underStimulation: number;
  taskMeaninglessness: number;

  mindWandering: number;
  noveltySeeking: number;

  taskNeglectRisk: number;
};

Uzun ve monoton bekleme sırasında NPC:

dikkatini kaybedebilir
başka şeyle ilgilenebilir
beklenmedik fırsat arayabilir
61. Mind wandering

NPC odağından koparak memory veya hayallere geçebilir.

type MindWanderingState = {
  active: boolean;

  trigger:
    | "boredom"
    | "fatigue"
    | "emotion"
    | "unresolved_goal"
    | "memory_trigger";

  thoughtIds: string[];

  externalAwarenessPenalty: number;
};

Mind wandering yalnızca olumsuz değildir.

Şunları üretebilir:

yaratıcı fikir
reflection
eski hedef hatırlama
yeni bağlantı

Ama çevresel dikkat azalır.

62. Incubation

Bazı problemlerin çözümü, aktif odaktan çıktıktan sonra ortaya çıkabilir.

Mira haritadaki sembolü çözemedi.
Daha sonra başka bir işle uğraşırken benzer şekli hatırladı.
type CognitiveIncubation = {
  unresolvedProblemId: string;

  backgroundActivation: number;
  associativeSearchPotential: number;

  insightProbability: number;
};

Bu yaratıcı plan ve keşif sistemini destekleyebilir.

63. Insight event
type InsightEvent = {
  actorId: string;

  sourceProblemId: string;
  connectedMemoryIds: string[];
  connectedBeliefIds: string[];

  insightProposition: Proposition;

  confidence: number;
  surprise: number;
};

Insight rastgele sihirli bilgi üretmemelidir.

Mevcut memory ve belief’ler arasında yeni bağlantı kurmalıdır.

64. Metacognitive awareness

NPC kendi bilişsel durumunun farkına varabilir.

“Kafam çok karıştı.”
“Şu anda doğru düşünemiyorum.”
“Biraz sakinleşmem gerek.”
“Bunu unutmamak için işaret koymalıyım.”
type MetacognitiveState = {
  overloadAwareness: number;
  uncertaintyAwareness: number;
  biasAwareness: number;

  selfMonitoringSkill: number;

  strategyCandidates: string[];
};

Bu farkındalık sağlıklı coping eylemleri üretebilir.

65. Metacognitive actions
Dur ve düşün
Derin nefes al
Bilgiyi tekrar et
Birine sor
Not al
Planı sadeleştir
Bir işi devret
Öncelikleri yeniden sırala
type MetacognitiveActionCandidate = {
  actionType: string;

  expectedLoadReduction: number;
  expectedAccuracyGain: number;

  timeCost: number;
  riskCost: number;
};
66. Attention and Memory Engine

Attention, hangi olayların hafızaya kodlanacağını etkiler.

Yüksek attention
→ daha yüksek detail ve confidence

Peripheral perception
→ düşük detail

Overload
→ source ve zaman bilgisinin kaybı
type AttentionMemoryEncodingModifier = {
  attentionLevel: number;
  workingMemoryAvailability: number;
  emotionalLoad: number;

  detailModifier: number;
  stabilityModifier: number;
  sourceAccuracyModifier: number;
};
67. Attention and Belief Engine

Düşük attention:

daha az evidence
daha kısmi observation
daha yüksek inference boşluğu

oluşturur.

Overload altında Belief Engine:

daha az hypothesis
daha düşük contradiction detection
daha yüksek mevcut-belief bağımlılığı

kullanabilir.

Cognitive Engine Belief Engine’e işlem bütçesi gönderir.

68. Attention and Goal Engine

Goal salience attention talebi üretir.

Attention da Goal Engine’i etkiler:

working context’te olmayan hedef
kararları geçici olarak etkilemeyebilir

Ancak hedef silinmez.

Örnek:

Haritayı inceleme hedefi

tilki krizinde background’a düşer.

Kriz geçince yeniden dikkat kazanabilir.

69. Attention and Plan Engine

Cognitive load yüksekse Plan Engine:

daha kısa plan
daha az branch
daha fazla bilinen yöntem
daha yüksek contingency sadeliği

üretmelidir.

type PlanningCognitiveConstraints = {
  maxDetailedSteps: number;
  maxBranches: number;
  maxAlternativePlans: number;

  planningHorizon: number;
  abstractionPreference: number;

  proceduralReuseBias: number;
};
70. Attention and Action Generator

Action Generator bütün olası eylemleri üretmemelidir.

Cognitive state şu filtreleri sağlar:

Hangi goal’lar working context’te?
Hangi affordance’lar fark edildi?
Hangi memory’ler çağrıldı?
Kaç aday karşılaştırılabilir?
Hangi eylemler aşırı karmaşık?

Overload halinde:

habitual
safe
simple
help-seeking
escape

eylemleri daha görünür olabilir.

71. Attention and Utility Evaluator

Cognitive load utility fonksiyonunu doğrudan değiştirmemelidir.

Ancak evaluation kalitesini etkiler.

type UtilityEvaluationQuality = {
  consideredDimensions: string[];
  omittedDimensions: string[];

  consequenceDepth: number;
  estimateNoise: number;

  confidenceCalibration: number;
};

Örnek:

Normal durumda:
safety + relationship + goal + time

Overload altında:
yalnızca immediate safety

değerlendirilebilir.

72. Attention and Decision Engine

Decision Engine’e şu context gönderilir:

type CognitiveDecisionContext = {
  reasoningDepth: ReasoningDepth;

  candidateBudget: number;
  evaluationDimensionBudget: number;
  consequenceDepthBudget: number;

  activeGoalIds: string[];
  activeBeliefIds: string[];
  activeMemoryIds: string[];

  dominantEmotionIds: string[];

  overloadLevel: OverloadLevel;
  automaticBehaviorBias: number;

  switchingCost: number;
  decisionTimeBudget: number;
};
73. Attention and Execution Engine

Execution sırasında attention düşerse:

hassas hareketlerde hata
reaksiyon gecikmesi
interrupt kaçırma
hedef state kontrolünün azalması

oluşabilir.

type ExecutionCognitiveModifier = {
  motorAttention: number;
  monitoringAttention: number;

  reactionDelay: number;
  precisionModifier: number;
  errorProbabilityModifier: number;
};
74. Attention and social conversation

Konuşma sırasında NPC bütün cümleleri eşit işleyemeyebilir.

Uzun açıklama
Yüksek stres
Çok sayıda kişi
Arka plan gürültüsü

sonucunda:

bazı cümleleri kaçırabilir
son kısmı hatırlayabilir
duygusal kelimelere odaklanabilir
type ConversationAttentionState = {
  speakerFocusId?: string;

  semanticProcessing: number;
  emotionalToneProcessing: number;

  missedStatementIds: string[];
  retainedStatementIds: string[];

  responsePlanningLoad: number;
};
75. Listening while preparing a response

NPC karşı taraf konuşurken cevabını düşünüyorsa dinleme kalitesi düşebilir.

Şifacı konuşurken Mira kendini nasıl savunacağını düşünüyor.

Sonuç:

cümlelerin bir kısmını kaçırabilir.

Bu doğal sosyal yanlış anlamalar üretir.

76. Cognitive load and language

Yüksek yük altında NPC’nin konuşması değişebilir.

Kısa cümleler
Tekrarlama
Kelime bulmada zorluk
Talimatları sadeleştirme
Sosyal nezaketin azalması
type LanguageProductionModifier = {
  sentenceComplexity: number;
  vocabularyAccess: number;

  emotionalLeakage: number;
  politenessControl: number;

  repetitionRisk: number;
};

Narrative Generator bu veriyi diyalog üretiminde kullanabilir.

77. Age profiles

Her yaş için katı değerler yerine bilişsel profil kullanılmalıdır.

type CognitiveDevelopmentProfile = {
  sustainedAttention: number;
  workingMemory: number;

  inhibition: number;
  switchingAbility: number;

  planningHorizon: number;
  metacognition: number;

  emotionalRegulation: number;
};

Küçük çocuk karakterlerde genel olarak:

Working memory daha sınırlı
Ani salience etkisi daha yüksek
Uzun planlarda odak kaybı daha yüksek
Dış hatırlatıcılar daha yararlı
Somut talimatlar daha etkili

olabilir.

Ancak karaktere özel farklılıklar korunmalıdır.

78. Animal cognitive profiles

Hayvanlar için karmaşık working memory ve planlama yerine daha sade sistem kullanılabilir.

type AnimalCognitiveProfile = {
  threatAttention: number;
  foodAttention: number;
  socialAttention: number;

  spatialWorkingMemory: number;
  associativeWorkingMemory: number;

  planDepth: number;
  habitReliance: number;

  interruptSensitivity: number;
};

Tilki:

Tehdit
Kaçış yolu
Ağrı
Yiyecek
Tanıdık koku

üzerinde yoğunlaşabilir.

79. NPC importance ve cognitive LOD

Her NPC için tam bilişsel simülasyon pahalıdır.

type CognitiveLOD =
  | "full"
  | "simplified"
  | "aggregate"
  | "dormant";
Full

Ana karakter ve aktif sahne NPC’leri.

Working memory
Attention allocation
Switching
Overload
Metacognition
Simplified

Yakın ikincil NPC’ler.

Primary focus
Load seviyesi
Interrupt response
Aggregate

Arka plan karakterleri.

Meşgul
Stresli
Dikkatsiz
Görev odaklı
Dormant

Aktif bilişsel simülasyon yok.

Zaman atlamasında summary projection uygulanır.

80. Cognitive projection

Uzak NPC’ler için her saniye attention simüle edilmez.

type CognitiveProjectionRequest = {
  actorId: string;

  startState: CognitiveAttentionState;
  duration: number;

  activeGoals: string[];
  routinePlanIds: string[];

  environmentalStressors: string[];
  majorInterrupts: string[];
};

Çıktı:

type CognitiveProjectionResult = {
  likelyCompletedFocusTasks: string[];
  likelyMissedTasks: string[];

  fatigueChange: number;
  stressChange: number;

  importantMemoryEncodingCandidates: string[];

  stateAtEnd: CognitiveAttentionState;
};
81. Cognitive state persistence

Her küçük dikkat değişimi kalıcı kayda dönüşmemelidir.

Kalıcı olabilecek durumlar:

Uzun süreli yorgunluk
Devam eden yüksek stres
Aktif fixation
Önemli prospective reminder
Kesilmiş kritik plan
Sürekli vigilance

Kısa focus değişimleri event log’da aggregate edilebilir.

82. Cognitive state events
AttentionDemandCreated
PrimaryFocusChanged
SecondaryFocusAdded
AttentionAllocationChanged
InterruptDetected
InterruptSuppressed
TaskInterrupted
TaskResumed
WorkingMemoryItemAdded
WorkingMemoryItemDropped
CognitiveLoadIncreased
OverloadEntered
OverloadExited
TunnelVisionEntered
AutomaticModeActivated
MetacognitiveStrategySelected
CognitiveRecoveryStarted

Bu eventler explainability için önemlidir.

83. Working memory overflow

Kapasite aşıldığında hangi öğelerin düşeceği seçilmelidir.

type WorkingMemoryEvictionScore = {
  itemId: string;

  lowRelevance: number;
  lowSalience: number;
  age: number;
  lowRehearsal: number;
  interference: number;

  evictionProbability: number;
};

Genellikle düşecek öğeler:

Düşük önemde
Uzun süredir kullanılmayan
Hatırlatıcı trigger’a bağlanmış
Başka memory’de güvenli biçimde saklanan

öğelerdir.

Ancak overload altında önemli öğe de düşebilir.

84. Prospective memory failure

Örnek:

Mira köye vardığında şifacıya tilkiyi söyleyecekti.

Ancak köye girince:

Kardeşi düşer.
Kalabalık bağırır.
Kapı kapanmaktadır.

Cognitive load yükselir ve trigger algılansa bile intended action working memory’ye giremeyebilir.

Sonuç:

Prospective memory missed

Bu karakterin hedefe bağlı olmadığı anlamına gelmez.

85. Error taxonomy

Cognitive Engine şu hataları ayırt edebilir:

type CognitiveErrorType =
  | "attention_miss"
  | "working_memory_loss"
  | "switching_error"
  | "goal_neglect"
  | "plan_step_omission"
  | "premature_decision"
  | "fixation"
  | "overload_simplification"
  | "misprioritization"
  | "prospective_memory_failure";

Bu ayrım consequence ve reflection için önemlidir.

86. Responsibility değerlendirmesi

Cognitive hata olduğunda sorumluluk değerlendirmesi yalnızca outcome’a bakmamalıdır.

NPC ağır overload altında mıydı?
Görev kapasitesini aşıyor muydu?
Yardım isteyebilir miydi?
Risk öngörülebilir miydi?
Hata tekrar eden bir ihmal miydi?

Attention Engine, Responsibility Evaluator’a bağlamsal veri sağlar.

87. Learning from cognitive errors

NPC şu tür meta-belief ve prosedürler öğrenebilir:

“Stresliyken görevleri unutabiliyorum.”
“Önemli yerleri işaretlemeliyim.”
“Birden fazla şeyi aynı anda yapmaya çalışmamalıyım.”
“Karar vermeden önce kardeşimin nerede olduğunu kontrol etmeliyim.”
type CognitiveLessonCandidate = {
  sourceErrorIds: string[];

  lessonType:
    | "attention"
    | "planning"
    | "memory_aid"
    | "delegation"
    | "emotion_regulation"
    | "decision_strategy";

  proposedRule: string;

  confidence: number;
};
88. Cognitive traits

Bazı özellikler doğrudan cognitive behavior’ı etkiler.

type CognitiveTraitVector = {
  focusStability: number;
  distractibility: number;

  cognitiveFlexibility: number;
  inhibition: number;

  stressTolerance: number;
  ambiguityTolerance: number;

  persistence: number;
  metacognitiveAwareness: number;
};

Bu değerler davranışı etkiler fakat deterministik sonuç üretmez.

89. Trait evolution

Tek bir attention hatası trait değiştirmemelidir.

Tekrarlanan davranış ve reflection sonrası:

Daha iyi dikkat yönetimi
Daha güçlü metacognition
Daha düşük distractibility

gelişebilir.

Aynı şekilde sürekli overload ve başarısızlık:

kaçınma
düşük confidence
hızlı pes etme

eğilimlerini güçlendirebilir.

90. Cognitive guardrails

Sistem şu hataları önlemelidir:

NPC’nin sınırsız working memory kullanması
Her olayı eşit ayrıntıyla işlemesi
Panik halinde uzun stratejik analiz yapması
Karmaşık iki görevi hatasız paralel yürütmesi
Overload’ın yalnızca rastgele hata üretmesi
Çocuk karakterlerin sürekli yetersiz gösterilmesi
Hayvanların insan gibi karmaşık plan taşıması
Cognitive load’un karakter iradesini tamamen silmesi

Cognitive state davranışı sınırlar ve değiştirir; NPC’nin bütün kararlarını otomatik olarak belirlemez.

91. Explanation
type CognitiveStateExplanation = {
  internal: string;
  narrative: string;
  debug: string;

  dominantAttentionDemands: string[];
  ignoredDemands: string[];

  loadSources: string[];
  capacityModifiers: string[];

  activeBiases: string[];
  likelyErrors: string[];
};

Örnek:

Internal:
Mira’nın dikkati tilkinin hareketleri ve kardeşinin güvenliği arasında bölündü. Yaklaşan karanlık ve kendi korkusu working memory yükünü artırdığı için uzun vadeli planlama kapasitesi azaldı.

Narrative:
Mira bir yandan tilkiyi izlerken bir yandan da kardeşinin arkasında kaldığından emin olmaya çalışıyordu. Karanlık yaklaşırken her şeyi aynı anda düşünmek zorlaşıyordu.

Debug:
primaryFocus=fox_12
secondaryFocus=sibling_04
totalLoad=0.78
availableCapacity=0.66
overload=0.12
planningCapacityModifier=-0.18
peripheralAwarenessModifier=-0.09
92. Engine çıktısı
type AttentionCognitiveLoadEngineResult = {
  actorId: string;
  timestamp: number;

  collectedDemands: AttentionDemand[];

  previousFocus: FocusState;
  currentFocus: FocusState;

  allocations: AttentionAllocation[];

  workingMemoryAdded: string[];
  workingMemoryRemoved: string[];
  workingMemoryRetained: string[];

  cognitiveLoad: CognitiveLoadState;
  effectiveCapacity: CognitiveCapacityVector;

  detectedInterrupts: CognitiveInterrupt[];
  suppressedInterrupts: string[];

  overloadLevel: OverloadLevel;
  reasoningDepth: ReasoningDepth;

  decisionBudget: DecisionProcessingBudget;
  planningConstraints: PlanningCognitiveConstraints;

  perceptionModifiers: Record<string, number>;
  executionModifiers: ExecutionCognitiveModifier;

  metacognitiveActionCandidates: MetacognitiveActionCandidate[];

  explanation: CognitiveStateExplanation;
};
93. Yaralı tilki örneği

Mira’nın attention talepleri:

Tilkinin hareketi
priority: 0.82

Kardeşin konumu
priority: 0.79

Gün batımı
priority: 0.65

Kendi korkusu
priority: 0.52

Elmanın çantada olması
priority: 0.31

Haritadaki eski sembol
priority: 0.12

Attention allocation:

Tilki: 0.42
Kardeş: 0.28
Çevresel tehdit taraması: 0.12
Zaman takibi: 0.10
İç duygu düzenleme: 0.08

Harita sembolü working context’e alınmaz.

94. Working memory
Tilki yaralı olabilir.
Tilki hırlıyor.
Kardeşim arkamda.
Gün batmadan köye gitmeliyiz.
Çantamda elma var.
Tilkiye doğrudan yaklaşmak riskli.

Kapasite:

6.5 / 7.0

Kardeş konuşmaya başlayıp yeni bilgi verirse kapasite aşılabilir.

Düşme riski taşıyan öğe:

Elmanın çantada olduğu

olabilir.

Ancak elmanın kokusu veya çantanın görülmesi bunu yeniden tetikleyebilir.

95. Yeni interrupt

Kardeşin ayağı kayar.

Interrupt priority: 0.96

Mevcut tilki incelemesi:

focus value: 0.82
switching cost: 0.18

Karşılaştırma:

0.96 > 0.82 + kısmi threshold

Focus değişir:

Primary:
Kardeşe yardım et.

Secondary:
Tilkinin konumunu koru.

Tilki inceleme görevi:

paused

durumuna geçer.

96. Resumption

Kardeş güvenli hale geldikten sonra eski plan değerlendirilir.

Tilki hâlâ görülebiliyor mu?
Konumu değişti mi?
Gün batımına ne kadar kaldı?
Elma hâlâ mevcut mu?

Mevcut context eskidiyse:

önce yeniden gözlemle

adımı gerekir.

Doğrudan eski execution step’ine dönülmez.

97. Overload örneği

Aynı anda:

Tilki hırlıyor.
Kardeş ağlıyor.
Yağmur başlıyor.
Gün batıyor.
Mira yolu tam hatırlamıyor.

Load vector:

{
  "perceptual": 0.72,
  "workingMemory": 0.81,
  "emotional": 0.74,
  "temporal": 0.80,
  "uncertainty": 0.68,
  "coordination": 0.51
}

Sonuç:

moderate/severe overload

Decision budget:

Candidate action: en fazla 4
Consequence depth: 1
Reasoning mode: quick

Adaylar:

Kardeşle birlikte köye dön
Güvenli yerde dur ve yardım çağır
Tilkiye elma bırakıp uzaklaş
Panikle koş

Uzun ve karmaşık planlar geçici olarak bastırılır.

98. Metacognitive çözüm

Mira overload’ı fark ederse:

“Önce kardeşimi yanıma alacağım. Sonra ne yapacağımıza karar veririz.”

Bu eylem:

coordination load ↓
uncertainty load ↓
goal conflict ↓

sağlar.

Yeni cognitive state:

Primary focus:
Kardeşle güvenli pozisyona geç.

Sonraki değerlendirme:
Tilkiye uzaktan yardım seçeneği.

Bu, karakterin daha akıllı görünmesini sağlayan önemli bir mekanizmadır.

99. MVP kapsamı

İlk sürümde aşağıdakiler yeterlidir:

Attention:

Primary focus
En fazla 2 secondary focus
Peripheral awareness
Focus switching
Interrupt handling

Cognitive load:

Perceptual
Working memory
Emotional
Temporal
Physical
Uncertainty

Working memory:

Kapasite
Öğe maliyeti
Decay
Overflow
Rehearsal

Cognitive modlar:

focused
scanning
overloaded
tunnel_vision
automatic

Reasoning depth:

reflex
habitual
quick
deliberate
100. MVP sade modeller
type SimpleCognitiveState = {
  actorId: string;

  primaryFocusId?: string;
  secondaryFocusIds: string[];

  attentionCapacity: number;
  workingMemoryCapacity: number;

  currentLoad: number;
  overloadLevel: OverloadLevel;

  reasoningDepth: ReasoningDepth;

  fatigue: number;
  stress: number;
};
type SimpleAttentionDemand = {
  demandId: string;
  sourceId: string;

  priority: number;
  capacityCost: number;

  interruptPotential: number;
};
101. MVP işlem sırası
1. Perception, goals, plans, emotions ve needs attention demand üretir
2. Demand priority hesaplanır
3. Mevcut focus ve switching cost değerlendirilir
4. Primary ve secondary focus belirlenir
5. Working memory projection güncellenir
6. Cognitive load vektörü hesaplanır
7. Effective capacity belirlenir
8. Overload seviyesi çıkarılır
9. Reasoning depth ve decision budget oluşturulur
10. Perception, Belief, Plan, Decision ve Execution motorlarına modifier gönderilir
102. MVP sınırları
Primary focus: 1
Secondary focus: en fazla 2
Working memory item: en fazla 7
Aktif attention demand: en fazla 12
Bir döngüde focus switch: en fazla 2
Aktif interrupt: en fazla 5
Decision candidate budget: 3–8
Plan branch budget: 1–3
103. Önerilen modüller
AttentionCognitiveLoadEngine
├── AttentionDemandCollector
├── AttentionPriorityEvaluator
├── FocusManager
├── PeripheralAwarenessManager
├── WorkingMemoryManager
├── CognitiveLoadEvaluator
├── CapacityResolver
├── InterruptManager
├── FocusSwitchResolver
├── OverloadResolver
├── ReasoningDepthSelector
├── DecisionBudgetBuilder
├── CognitiveFatigueManager
├── MetacognitiveStrategyBuilder
├── CognitiveProjectionEngine
└── CognitiveExplanationBuilder

İlk sürümde bunların tamamı ayrı servis olmamalıdır.

Tek bir cognition domain modülü altında alt bileşenler olarak başlamalıdır.

104. Temel prensipler

Algılanabilir olan her şey attention’a girmemelidir.

Attention, NPC’nin hangi bilgiyi yüksek çözünürlükte işlediğini belirlemelidir.

Working memory sınırlı olmalı ve karmaşık bilgiler daha fazla kapasite tüketmelidir.

Cognitive load tek sayı değil; algısal, duygusal, zamansal, sosyal ve fiziksel boyutları olan bir vektör olmalıdır.

Yük kapasiteyi geçtiğinde rastgele hata değil, bağlama uygun bilişsel daralma oluşmalıdır.

Stres bazı tehdit algılarını güçlendirirken planlama ve sosyal yorum kapasitesini azaltabilir.

NPC aynı anda birden fazla karmaşık görevi hatasız yürütememelidir.

Attention switching ve görev kesintilerinin gerçek bir maliyeti bulunmalıdır.

Kesilen planlar baştan başlamamalı; kalan context doğrulanarak devam etmelidir.

Goal ve planlar dikkat dışına çıkabilir ama otomatik olarak silinmemelidir.

Prospective memory, gelecekteki görevlerin sürekli working memory tüketmesini engellemelidir.

Deneyim, chunking ve otomatik prosedürler bilişsel yükü azaltmalıdır.

Overload altında NPC daha kısa düşünmeli, daha az aday değerlendirmeli ve bilinen yöntemlere yönelmelidir.

Metacognition, karakterin kendi zihinsel sınırlarını fark edip mola verme, sadeleştirme, not alma veya yardım isteme gibi sağlıklı eylemler üretmesini sağlamalıdır.

Cognitive state NPC’nin iradesini ortadan kaldırmamalı; hangi kararların düşünülebilir ve uygulanabilir olduğunu bağlama göre sınırlandırmalıdır.