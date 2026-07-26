Belief Engine

Belief Engine’in görevi:

NPC’nin dünyayı nasıl anladığını; hangi bilgilere inandığını, ne kadar emin olduğunu, hangi kaynaklara güvendiğini, çelişkileri nasıl yönettiğini ve yeni kanıtlarla inançlarını nasıl güncellediğini yönetmek.

Memory Engine şunu saklar:

Mira, tilkinin hırladığını hatırlıyor.

Belief Engine ise şu çıkarımları yönetir:

Tilki korkmuş olabilir.
Tilki saldırgan olabilir.
Tilkiye yaklaşmak riskli olabilir.
Yavaş hareket etmek tehlikeyi azaltabilir.

Temel ayrım:

World State
→ Dünyada gerçekte ne var?

Perception
→ NPC ne algıladı?

Memory
→ NPC neyi hatırlıyor?

Belief
→ NPC neyin doğru olduğunu düşünüyor?

Tam akış:

Perceptions
Memories
Social Reports
Existing Beliefs
World Model Rules
       ↓
Evidence Construction
       ↓
Source Reliability Evaluation
       ↓
Belief Update
       ↓
Contradiction Detection
       ↓
Inference
       ↓
Confidence Calibration
       ↓
Belief State Projection
       ↓
Goal / Plan / Utility / Action Generation
1. Belief dünya gerçeği değildir

NPC’nin inancı yanlış olabilir.

Gerçek dünya:

Tilki yaralı ve korkmuş.

Mira’nın belief’i:

Tilki saldırmaya hazırlanıyor.

Kardeşinin belief’i:

Tilki Mira’dan yardım istiyor.

Avcının belief’i:

Tilki köy için tehdit oluşturuyor.

Aynı dünya durumu farklı belief state’ler üretir.

Bu farklılık LUMI’nin temel davranış kaynaklarından biridir.

2. Belief veri modeli
type Belief = {
  beliefId: string;
  actorId: string;

  proposition: Proposition;

  beliefType:
    | "fact"
    | "state"
    | "causal"
    | "intent"
    | "predictive"
    | "normative"
    | "relational"
    | "self"
    | "social"
    | "spatial"
    | "temporal"
    | "capability";

  confidence: number;
  stability: number;
  salience: number;

  polarity:
    | "supports"
    | "rejects"
    | "uncertain";

  status:
    | "active"
    | "contested"
    | "dormant"
    | "retracted"
    | "superseded";

  evidenceIds: string[];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];

  sourceSummary: BeliefSourceSummary;

  firstFormedAt: number;
  lastUpdatedAt: number;
  lastValidatedAt?: number;

  contextScope: BeliefContextScope;

  explanation: BeliefExplanation;
};
3. Proposition yapısı

Belief yalnızca serbest metin olmamalıdır.

type Proposition = {
  subjectId?: string;
  predicate: string;
  objectId?: string;

  value?: unknown;

  qualifiers?: Record<string, unknown>;

  temporalScope?: {
    from?: number;
    to?: number;
    tense:
      | "past"
      | "present"
      | "future"
      | "timeless";
  };

  spatialScope?: {
    locationIds?: string[];
    regionIds?: string[];
  };
};

Örnek:

{
  "subjectId": "fox_12",
  "predicate": "is_aggressive",
  "value": true,
  "temporalScope": {
    "tense": "present"
  },
  "spatialScope": {
    "locationIds": ["forest_clearing"]
  }
}

Başka örnek:

{
  "subjectId": "village_gate",
  "predicate": "closes_at",
  "value": "sunset",
  "temporalScope": {
    "tense": "timeless"
  }
}
4. Belief türleri
Fact belief
Tilkinin sol arka bacağı yaralı.
State belief
Tilki şu anda korkuyor.
Causal belief
Tilki Mira hızlı yaklaştığı için hırladı.
Intent belief
Tilki kaçmak istiyor.
Avcı bir şeyi saklıyor.
Predictive belief
Tilkiye yaklaşılırsa kaçabilir.
Yağmur sürerse köprü kapanabilir.
Normative belief
Yaralı canlılara yardım edilmelidir.
Verilen söz tutulmalıdır.
Relational belief
Arda bana güveniyor.
Şifacı Mira’yı ciddiye almıyor.
Self belief
Ben tedavi konusunda yetersizim.
Ben tehlike anında sakin kalabilirim.
Social belief
Köy halkı avcıdan şüpheleniyor.
Spatial belief
Şifacı köyün kuzey tarafında yaşıyor.
Temporal belief
Gün batımına yaklaşık yarım saat kaldı.
Capability belief
Mira tilkiyi tek başına taşıyamaz.
Şifacı yarayı tedavi edebilir.
5. Evidence

Belief’ler kanıtlardan oluşmalıdır.

type Evidence = {
  evidenceId: string;
  actorId: string;

  proposition: Proposition;

  evidenceType:
    | "direct_perception"
    | "episodic_memory"
    | "semantic_memory"
    | "social_report"
    | "inference"
    | "document"
    | "environmental_trace"
    | "absence"
    | "authority_claim"
    | "intuition";

  direction:
    | "support"
    | "contradict"
    | "neutral";

  strength: number;
  reliability: number;
  relevance: number;
  specificity: number;
  freshness: number;

  sourceActorId?: string;
  sourceMemoryId?: string;
  sourcePerceptionId?: string;
  sourceBeliefIds?: string[];

  observedAt?: number;
  createdAt: number;

  contextScope: BeliefContextScope;
};
6. Evidence strength ile reliability ayrımı

Bir kanıt güçlü ama güvenilmez olabilir.

Örnek:

Bir NPC çok emin biçimde:
“Avcı köprüyü yıktı.”

der.

İfade güçlüdür fakat kaynak güvenilmez olabilir.

strength = 0.90
reliability = 0.30

Başka örnek:

Mira uzaktan avcının köprü yakınında olduğunu gördü.
strength = 0.45
reliability = 0.80

Belief Engine bu boyutları ayrı değerlendirmelidir.

7. Source reliability

Kaynak güvenilirliği sabit tek sayı olmamalıdır.

type SourceReliabilityProfile = {
  sourceActorId: string;

  honesty: number;
  competence: number;
  perceptualAccuracy: number;
  domainKnowledge: number;
  consistency: number;

  relationshipBias: number;
  emotionalBias: number;
  selfInterestBias: number;

  topicSpecificReliability: Record<string, number>;
};

Örnek:

Şifacı sağlık konusunda güvenilir olabilir.
Ama avcıların niyetleri konusunda önyargılı olabilir.

Bu yüzden:

global trust

tek başına yeterli değildir.

8. Direct perception evidence

Doğrudan algı genellikle güçlüdür ama kusursuz değildir.

Etkileyen faktörler:

Mesafe
Işık
Dikkat
Duygu
Algı yeteneği
Engeller
Olay süresi
Beklenti
type PerceptionEvidenceQuality = {
  clarity: number;
  duration: number;
  attention: number;
  sensoryFit: number;
  obstruction: number;
  emotionalDistortion: number;
};

Örnek:

Mira karanlıkta uzaktan bir gölge gördü.

Bu kanıt:

“Orada biri var.”

belief’ini destekleyebilir.

Ancak:

“Oradaki kişi avcıdır.”

belief’i için daha zayıf kanıttır.

9. Absence of evidence

Bir şeyin görülmemesi, onun olmadığı anlamına gelmeyebilir.

Örnek:

Mira şifacıyı evinde bulamadı.

Geçerli çıkarım:

Şifacı şu anda evde görünmüyor.

Aşırı çıkarım:

Şifacı köyü terk etti.
type AbsenceEvidence = {
  expectedObservation: string;

  detectionOpportunity: number;
  searchQuality: number;
  expectedVisibility: number;

  absenceStrength: number;
};

Bir yokluk ancak yeterli gözlem fırsatı varsa güçlü kanıt sayılmalıdır.

10. Belief confidence

Confidence, belief’in doğru olma ihtimaline ilişkin NPC’nin öznel değerlendirmesidir.

type BeliefConfidenceVector = {
  evidenceConfidence: number;
  sourceConfidence: number;
  inferenceConfidence: number;
  contextualConfidence: number;
  temporalConfidence: number;
};

Tek bir toplam confidence ayrıca üretilebilir:

confidence =
  evidenceConfidence * 0.30 +
  sourceConfidence * 0.20 +
  inferenceConfidence * 0.20 +
  contextualConfidence * 0.15 +
  temporalConfidence * 0.15;

Ancak alt boyutlar korunmalıdır.

11. Confidence ile certainty hissi farklı olabilir

NPC kendini çok emin hissedebilir ama kanıt kalitesi düşük olabilir.

type BeliefCalibration = {
  subjectiveCertainty: number;
  evidenceSupportedConfidence: number;

  calibrationGap: number;
};

Örnek:

Mira:
“Tilkinin saldıracağını biliyorum.”

Gerçek destek:

Tilki yalnızca korkuyla hırladı.
subjectiveCertainty = 0.90
evidenceSupportedConfidence = 0.45

Bu fark karakterin:

önyargı
korku
aşırı özgüven

özelliklerinden doğabilir.

12. Belief state

NPC’nin bütün aktif inançlarının çalışma görünümüdür.

type BeliefState = {
  actorId: string;
  timestamp: number;

  activeBeliefs: Belief[];
  contestedBeliefs: Belief[];
  salientUnknowns: UnknownBelief[];
  contradictions: BeliefContradiction[];

  attentionFocus: string[];

  confidenceProfile: {
    overallCalibration: number;
    uncertaintyTolerance: number;
  };
};

Karar döngüsüne bütün belief veritabanı değil, bağlama özel belief projection gönderilmelidir.

13. Unknown belief

Bilinmeyen şeyler açıkça temsil edilmelidir.

type UnknownBelief = {
  unknownId: string;
  actorId: string;

  question: Proposition;

  importance: number;
  urgency: number;
  informationValue: number;

  possibleHypotheses: BeliefHypothesis[];

  status:
    | "unnoticed"
    | "recognized"
    | "investigating"
    | "resolved"
    | "abandoned";
};

Örnek:

Tilki neden yaralı?
Şifacı şu anda nerede?
Bu ot gerçekten şifalı mı?

Unknown state olmadan sistem belirsizlikleri rastgele varsayımlarla doldurabilir.

14. Hypothesis

Bir bilinmeyen için birden fazla açıklama tutulabilir.

type BeliefHypothesis = {
  hypothesisId: string;
  proposition: Proposition;

  confidence: number;

  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];

  expectedObservations: Proposition[];
};

Örnek:

Tilkinin yaralanma nedeni:

Hipotez A:

Avcı tuzağı
confidence: 0.55

Hipotez B:

Başka hayvan saldırısı
confidence: 0.25

Hipotez C:

Kayalıkta düşme
confidence: 0.20

Yeni kanıtlar dağılımı değiştirebilir.

15. Belief update

Yeni evidence geldiğinde belief sıfırdan oluşturulmamalıdır.

type BeliefUpdateRequest = {
  actorId: string;
  existingBelief?: Belief;
  newEvidence: Evidence[];

  currentContext: BeliefUpdateContext;
};

Basit yaklaşım:

support =
  Σ(evidence.strength
    * evidence.reliability
    * evidence.relevance
    * evidence.freshness);

contradiction =
  Σ(contradicting evidence weights);

Sonra:

netSupport = support - contradiction;

Ancak confidence doğrusal artmamalıdır.

Çok sayıda aynı kaynaktan gelen tekrar bilgi, bağımsız kanıt gibi sayılmamalıdır.

16. Evidence independence

Aynı söylentinin farklı kişilerden duyulması, kişiler aynı kaynağa dayanıyorsa bağımsız kanıt değildir.

Mira bunu Arda’dan duydu.
Kardeşi de Arda’dan duydu.
Sonra kardeşi Mira’ya söyledi.

Bu iki ayrı kaynak gibi görünmemelidir.

type EvidenceLineage = {
  rootEvidenceId: string;
  transmissionPath: string[];
  independenceGroupId: string;
};

Belief Engine aynı lineage içindeki kanıtları indirgemelidir.

17. Corroboration

Bağımsız kaynaklar aynı belief’i destekliyorsa confidence artar.

Örnek:

Mira avcının köprü yanında olduğunu gördü.
Köy muhafızı da aynı saatte onu orada gördüğünü söyledi.
Çamurda avcının arabasına benzeyen izler bulundu.

Bu üç kanıt:

perception
social report
environmental trace

olarak birbirini destekler.

Ancak yine de:

Avcı köprüyü yıktı.

sonucu otomatik değildir.

Yalnızca:

Avcı köprü yakınındaydı.

belief’i güçlü hale gelir.

18. Correlation ile causation ayrımı

Belief Engine nedensellik çıkarımında dikkatli olmalıdır.

Avcı geldi.
Köprü çöktü.

Bu yalnızca zaman ilişkisi olabilir.

Causal belief için:

mekanizma
zaman sırası
alternatif nedenler
fiziksel izler
niyet

değerlendirilmelidir.

type CausalBeliefAssessment = {
  temporalOrder: number;
  mechanismPlausibility: number;
  spatialConnection: number;
  alternativeCauseStrength: number;
  interventionEvidence: number;
  repeatedPattern: number;
};
19. Belief inference

NPC yalnızca doğrudan bilgi tutmaz; çıkarımlar da yapar.

Tilkinin bacağında metal izleri var.
Yakında kırık tuzak bulundu.
Avcının bu bölgede tuzak kurduğu biliniyor.

Çıkarım:

Tilki muhtemelen avcı tuzağında yaralandı.
type BeliefInference = {
  inferenceId: string;

  premiseBeliefIds: string[];
  conclusion: Proposition;

  ruleId?: string;

  inferenceType:
    | "deductive"
    | "inductive"
    | "abductive"
    | "analogical"
    | "social"
    | "causal"
    | "predictive";

  confidence: number;
};
20. Deductive inference

Kurallar doğruysa sonuç zorunludur.

Köy kapısı gün batımında kapanır.
Gün battı.

Sonuç:

Köy kapısı kapalı olmalıdır.

Ancak premise belief’lerin kendisi yanlış olabilir.

conclusionConfidence =
  min(premiseConfidences)
  * ruleReliability;
21. Inductive inference

Tekrarlanan deneyimlerden genel eğilim çıkarılır.

Mira birkaç kez bu patikanın yağmurda çamurlaştığını gördü.

Sonuç:

Bu patika yağmurda genellikle zor geçilir.

Confidence:

örnek sayısı
bağlam çeşitliliği
karşıt örnekler

ile değişir.

22. Abductive inference

Gözlenen sonucu en iyi açıklayan hipotezi seçmektir.

Tilki yaralı.
Yakında kırılmış tuzak var.

Olası açıklama:

Tilki tuzağa yakalandı.

Bu kesin bilgi değildir.

Belief tipi:

causal hypothesis

olarak tutulmalıdır.

23. Analogical inference

Benzer geçmiş olaylardan tahmin yapılır.

Daha önce yaralı kuş sessizleşmişti.
Bu tilki de sessizleşiyor.

Çıkarım:

Tilkinin durumu kötüleşiyor olabilir.

Benzerlik yüzeysel olabilir.

Bu nedenle:

type AnalogyQuality = {
  structuralSimilarity: number;
  contextualSimilarity: number;
  relevantDifferencePenalty: number;
};
24. Predictive belief

Bir olayın gelecekte gerçekleşme beklentisidir.

type PredictiveBelief = {
  beliefId: string;

  predictedProposition: Proposition;

  probability: number;
  confidence: number;

  expectedTimeWindow: {
    earliest?: number;
    latest?: number;
  };

  causalBeliefIds: string[];
  assumptionIds: string[];
};

Örnek:

Tilki tedavi edilmezse yarası 6 saat içinde kötüleşebilir.

Burada:

probability

ile:

confidence in probability

ayrı tutulmalıdır.

NPC %70 ihtimal tahmin edebilir ama bu tahmine güveni düşük olabilir.

25. Belief contradiction

İki aktif belief aynı anda doğru olamıyorsa çelişki oluşur.

type BeliefContradiction = {
  contradictionId: string;
  actorId: string;

  beliefIds: string[];

  contradictionType:
    | "direct"
    | "temporal"
    | "causal"
    | "source"
    | "identity"
    | "contextual";

  severity: number;
  salience: number;

  resolutionStatus:
    | "unnoticed"
    | "recognized"
    | "investigating"
    | "tolerated"
    | "resolved";

  suggestedInformationGoals: string[];
};

Örnek:

Şifacı köyde.
Şifacı dağda.

Bu doğrudan çelişkidir.

Ancak zaman farklıysa:

Sabah köydeydi.
Öğleden sonra dağa çıktı.

çelişki çözülür.

26. Contradiction tolerance

Her çelişki hemen çözülmeyebilir.

NPC şunu taşıyabilir:

“İki farklı şey duydum; emin değilim.”

Bu daha gerçekçidir.

type UncertaintyToleranceProfile = {
  ambiguityTolerance: number;
  contradictionDiscomfort: number;
  closureNeed: number;
};

Yüksek closure need:

Hızlı ama hatalı sonuca varma

riski oluşturabilir.

Yüksek ambiguity tolerance:

Belirsizliği daha uzun süre taşıma

sağlar.

27. Belief revision

Çelişki olduğunda her zaman yeni kanıt eski belief’i tamamen silmemelidir.

Olası işlemler:

type BeliefRevisionOperation =
  | "strengthen"
  | "weaken"
  | "contextualize"
  | "split"
  | "merge"
  | "retract"
  | "supersede"
  | "mark_contested";

Örnek:

Eski belief:

Tilkiler saldırgandır.

Yeni deneyimler sonrası split:

Korkmuş tilkiler yaklaşılınca saldırgan davranabilir.
Bazı tilkiler güven oluşunca insanlara yaklaşabilir.

Bu, kaba genellemeyi bağlama özel belief’lere böler.

28. Belief contextualization

Bir belief her yerde ve her zaman geçerli olmayabilir.

type BeliefContextScope = {
  entityIds?: string[];
  actorTypes?: string[];

  locationIds?: string[];
  regionTypes?: string[];

  situationTags?: string[];
  emotionalConditions?: string[];

  validFrom?: number;
  validUntil?: number;
};

Örnek:

“Kuzey patikası tehlikelidir.”

daha doğru biçimde:

“Kuzey patikası yoğun yağmurdan sonra tehlikelidir.”

olabilir.

29. Belief temporal decay

Bazı belief’ler zamanla eskir.

Şifacı köydedir.

Bu belief birkaç saat sonra güven kaybetmelidir.

Ancak:

Şifacı tıbbi bitkileri bilir.

daha yavaş eskir.

type BeliefFreshnessProfile = {
  expectedValidityDuration: number;
  freshnessDecayRate: number;
  refreshTriggers: string[];
};

Belief confidence zamanla:

effectiveConfidence =
  baseConfidence
  * freshnessFactor;

ile düşebilir.

30. Stable ve volatile belief
Stable belief
Köy kuzeyde.
Mira’nın kardeşinin adı Lina.
Su ateşi söndürebilir.
Volatile belief
Avcı şu anda ormanda.
Tilki hâlâ kayanın yanında.
Kapı açık.
type BeliefVolatility =
  | "stable"
  | "slow_changing"
  | "dynamic"
  | "highly_volatile";

Karar öncesi volatile belief’ler yeniden doğrulanmalıdır.

31. Belief salience

NPC her belief’e aynı anda dikkat etmez.

beliefSalience =
  currentGoalRelevance
  + threatRelevance
  + emotionalActivation
  + recentEvidence
  + identityConnection;

Örnek:

Mira’nın kardeşinin çiçek sevdiği belief’i

tilki krizinde düşük salience taşır.

Ancak hediye seçerken yüksek olabilir.

32. Belief focus

Working Belief Context yalnızca ilgili belief’leri içermelidir.

type BeliefFocusRequest = {
  actorId: string;

  situationEntityIds: string[];
  activeGoalIds: string[];
  currentPlanIds: string[];
  currentEmotionVector: EmotionVector;

  maxBeliefs: number;
};

Çıktı:

type BeliefProjection = {
  actorId: string;

  relevantBeliefs: Belief[];
  relevantUnknowns: UnknownBelief[];
  criticalContradictions: BeliefContradiction[];

  omittedBeliefCount: number;
};
33. Belief retrieval

Belief Engine, Memory Engine gibi retrieval yapmalıdır.

Indexler:

subject
predicate
object
location
time
entity type
goal relation
threat relation
causal connection

Belief retrieval RAG gerektirmez.

Yapılandırılmış proposition, graph bağlantıları ve tag tabanlı seçim yeterlidir.

34. Belief graph

Belief’ler birbirine bağlı bir graph oluşturabilir.

type BeliefGraphNode = {
  beliefId: string;
  proposition: Proposition;
};

type BeliefGraphEdge = {
  fromBeliefId: string;
  toBeliefId: string;

  relation:
    | "supports"
    | "contradicts"
    | "causes"
    | "predicts"
    | "implies"
    | "depends_on"
    | "generalizes"
    | "specializes";

  strength: number;
};

Örnek:

Tilki yaralı
   ↓ supports
Tilki yavaş hareket ediyor
   ↓ predicts
Tilki bölgeden ayrılamayabilir
   ↓ supports
Tilkinin yardıma ihtiyacı var
35. Circular belief risk

Belief graph döngüsel yanlış güven üretebilir.

Örnek:

Avcı güvenilmez çünkü yalan söylüyor.
Avcının söylediği şey yanlıştır çünkü güvenilmez.

Bu kendini destekleyen kapalı döngüdür.

type CircularSupportDetection = {
  cycleBeliefIds: string[];
  independentEvidenceCount: number;
  confidencePenalty: number;
};

Bağımsız dış kanıt yoksa confidence sınırlandırılmalıdır.

36. Belief and emotion

Duygular belief formation’ı etkiler.

Korku
Tehdit ihtimalini yükseltir.
Belirsiz işaretleri tehlike olarak yorumlar.
Öfke
Kötü niyet attribution’ını artırır.
Karşı tarafın olumsuz kanıtlarını öne çıkarır.
Sevgi
Olumlu niyet yorumunu artırabilir.
Kusurları küçümseyebilir.
Suçluluk
Kendi sorumluluğunu abartabilir.
type EmotionalBeliefBias = {
  threatAmplification: number;
  negativeIntentBias: number;
  positiveIntentBias: number;
  selfBlameBias: number;
  optimismBias: number;
};

Duygu evidence’ı değiştirmez; yorum ve confidence modifier üretir.

37. Confirmation bias

NPC mevcut belief’ini destekleyen kanıtları daha kolay fark edebilir ve hatırlayabilir.

type ConfirmationBiasProfile = {
  supportingEvidenceBoost: number;
  contradictingEvidencePenalty: number;
  disconfirmationThreshold: number;
};

Örnek:

Mira tilkilerin tehlikeli olduğuna inanıyorsa:
hırlamayı güçlü biçimde hatırlar,
elmayı sakin biçimde yemesini küçümseyebilir.

Ancak sistem bu önyargıyı sınırsız güçlendirmemelidir.

38. Anchoring

İlk edinilen bilgi sonraki belief’i orantısız etkileyebilir.

İlk duyduğu:
“Avcı hırsızdır.”

Sonraki nötr olaylar bu anchor üzerinden yorumlanabilir.

type BeliefAnchor = {
  beliefId: string;
  anchorStrength: number;
  firstImpressionEventId: string;
};

Yeni güçlü kanıtlar anchor’ı zayıflatabilir.

39. Availability bias

Kolay hatırlanan olaylar daha yaygın sanılabilir.

Bir kez köprü çöktü.
Olay çok korkutucuydu.

NPC:

Köprüler sık sık çöker.

diye düşünebilir.

Belief Engine, Memory retrieval salience’ının frequency estimate’i bozabileceğini modelleyebilir.

40. Authority bias

Bir otoritenin söylediği bilgi gereğinden fazla güvenilir kabul edilebilir.

type AuthorityBias = {
  authorityRecognition: number;
  deference: number;
  domainMismatchPenalty: number;
};

Şifacı:

sağlık konusunda otorite

olabilir.

Ancak:

ormandaki suçlar konusunda

uzman olmayabilir.

41. Relationship bias

Kaynağa duyulan güven, belief güncellemesini etkiler.

Arkadaşın aynı şeyi söylüyor.
Yabancı aynı şeyi söylüyor.

Etkileri farklı olabilir.

Ancak ilişki güveni:

domain competence

yerine geçmemelidir.

42. Intent belief

Bir NPC’nin niyeti doğrudan gözlenemez.

Avcı kapıyı kapattı.

Olası niyetler:

İnsanları korumak istedi.
Birini içeride tutmak istedi.
Rüzgârı engellemek istedi.

Intent belief düşük veya orta confidence ile tutulmalıdır.

type IntentBelief = {
  targetActorId: string;

  inferredGoalType: string;
  inferredMotivationIds: string[];

  confidence: number;

  observedActionIds: string[];
  contextualEvidenceIds: string[];

  alternativeIntentHypotheses: string[];
};
43. Theory of mind

NPC’ler başkalarının belief ve hedefleri hakkında tahmin yürütebilir.

Mira şifacının tilkinin ne kadar kötü durumda olduğunu bilmediğini düşünüyor.

Bu ikinci dereceden belief’tir:

Mira believes:
Şifacı believes:
Tilkinin durumu hafif.
type NestedBelief = {
  ownerActorId: string;
  modeledActorId: string;

  modeledProposition: Proposition;

  confidence: number;
  evidenceIds: string[];

  depth: number;
};

İlk sürümde nested belief depth sınırı:

en fazla 2

olmalıdır.

Aksi halde karmaşıklık hızla büyür.

44. False belief about others

Mira şifacının kendisine kızgın olduğunu düşünebilir.

Gerçekte şifacı yalnızca yorgundur.

Bu belief:

yardım istemekten çekinme
yanlış sosyal plan
kaçınma

üretebilir.

Sosyal davranışların önemli kısmı gerçek ilişkiden değil, algılanan ilişkiden doğmalıdır.

45. Common ground

İki NPC’nin ortak bildiğini düşündüğü bilgiler vardır.

type CommonGroundBelief = {
  actorAId: string;
  actorBId: string;

  proposition: Proposition;

  actorAConfidence: number;
  actorBConfidence: number;

  mutualAwarenessConfidence: number;
};

Örnek:

Mira ve şifacı tilkinin yaralı olduğunu biliyor.
İkisi de diğerinin bunu bildiğini biliyor.

Bu durumda Mira yaralanmayı baştan açıklamak zorunda olmayabilir.

Fakat common ground yanlış varsayılabilir.

46. Social misunderstanding

Örnek:

Mira:
Şifacı tilkinin durumunu biliyor.

Gerçek:
Şifacı yalnızca küçük bir çizik olduğunu düşünüyor.

Bu yanlış common ground iletişim sorununa yol açar.

Belief Engine sosyal konuşmalarda:

hangi bilgilerin ortak olduğu
hangi bilgilerin açıklanması gerektiği

konusunda Plan ve Action Generator’a sinyal vermelidir.

47. Belief about self

Self-belief karar sisteminde çok önemlidir.

Ben hızlı koşamam.
Ben iyi bir iz sürücüyüm.
Ben tehlike anında donup kalırım.

Bu belief gerçek capability ile aynı olmayabilir.

type SelfCapabilityBelief = {
  skillId: string;

  perceivedLevel: number;
  actualLevelReference?: number;

  confidence: number;
  evidenceIds: string[];

  attributionStyle:
    | "stable"
    | "temporary"
    | "contextual";
};

Düşük self-belief:

yapabilecek olsa bile eylemi düşünmemesine

neden olabilir.

Yüksek ama yanlış self-belief:

aşırı riskli planlar

üretebilir.

48. Learned helplessness benzeri belief

Tekrarlanan başarısızlıklar şu belief’i oluşturabilir:

“Ne yaparsam yapayım işe yaramıyor.”

Bu:

feasibility belief ↓
goal activation ↓
help-seeking veya avoidance ↑

etkisi oluşturabilir.

Ancak çocuk odaklı tasarımda sistem:

destek
küçük başarı
geri bildirim
alternatif yöntem

ile iyileşme yolları üretmelidir.

49. Growth belief

Karakter şu semantic self-belief’i geliştirebilir:

“Henüz iyi değilim ama öğrenebilirim.”

Bu belief:

skill learning
persistence
help seeking
exploration

üzerinde olumlu etki yaratır.

Trait Evolution ile belief sistemi burada birbirini destekler.

50. Normative belief

Normatif belief’ler:

Ne doğru?
Ne yanlış?
Ne yapılmalı?

sorularını temsil eder.

type NormativeBelief = {
  proposition: Proposition;

  valueIds: string[];
  culturalSourceIds: string[];
  authoritySourceIds: string[];

  personalAcceptance: number;
  socialCompliancePressure: number;

  confidence: number;
};

NPC bir kuralı doğru bulmadan da sosyal baskı nedeniyle takip edebilir.

“Büyüklerin sözü dinlenmeli.”

belief’i:

personalAcceptance = 0.40
socialCompliancePressure = 0.85

olabilir.

51. Cultural beliefs

Topluluklar ortak belief sistemleri taşıyabilir.

Ormanın kuzeyi uğursuzdur.
Ay tutulmasında dışarı çıkılmaz.
Tilkiler haberci hayvanlardır.

Bu belief’lerin doğruluğu dünya kurallarına göre değişebilir.

type CulturalBelief = {
  groupId: string;
  proposition: Proposition;

  prevalence: number;
  socialEnforcement: number;
  symbolicImportance: number;

  originUnknown: boolean;
};

NPC bu kültürel belief’i:

kabul edebilir
şüpheyle taşıyabilir
reddedebilir
52. Belief diffusion

Belief’ler sosyal ağ üzerinden yayılabilir.

type BeliefTransmission = {
  senderId: string;
  receiverId: string;

  transmittedProposition: Proposition;

  senderConfidence: number;
  senderPersuasiveness: number;

  receiverTrust: number;
  receiverPriorCompatibility: number;

  emotionalFraming: number;
  socialPressure: number;

  resultingEvidenceId: string;
};

Aynı belief farklı aktarım zincirlerinde değişebilir.

53. Rumor belief

Söylenti belief’i kaynağı belirsizleşmiş sosyal bilgidir.

type RumorBelief = {
  beliefId: string;

  proposition: Proposition;

  knownTransmissionDepth: number;
  sourceTraceConfidence: number;

  sensationalism: number;
  emotionalCharge: number;

  spreadPotential: number;
};

Söylentiler:

yüksek salience
düşük reliability

taşıyabilir.

Bu nedenle çok etkili ama yanlış belief’ler oluşturabilirler.

54. Belief propagation through groups

Bir belief grup içinde yayılırken yalnızca bireysel ikna değil, sosyal kanıt da etkili olur.

Herkes böyle düşünüyorsa doğrudur.
type SocialProofEffect = {
  perceivedAdoptionRate: number;
  groupIdentification: number;
  dissentVisibility: number;

  confidenceModifier: number;
};

NPC’nin bağımsızlığı ve conformity trait’i bu etkiyi değiştirir.

55. Belief correction

Yanlış belief düzeltmek için yalnızca doğru bilgi vermek yeterli olmayabilir.

Etkileyen faktörler:

Eski belief’in kimlik bağlantısı
Kaynağa güven
Duygusal yatırım
Sosyal maliyet
Yeni kanıtın açıklığı
Alternatif açıklama
type BeliefCorrectionResult = {
  targetBeliefId: string;

  oldConfidence: number;
  newConfidence: number;

  correctionAccepted: number;
  resistance: number;

  replacementBeliefIds: string[];
};
56. Backfire riski

Bir belief sert biçimde reddedildiğinde karakter daha da savunmacı olabilir.

Bu özellikle belief:

kimlik
grup aidiyeti
ahlaki değer

ile bağlıysa mümkündür.

Ancak bu mekanizma aşırı kullanılmamalıdır.

LUMI’de correction için daha sağlıklı yollar:

Doğrudan kanıt
Güvenilir kişi
Kendi gözlemi
Soruyla düşündürme
Alternatif açıklama
Küçük çelişkileri adım adım gösterme
57. Belief retraction

Bir belief yanlış olduğu anlaşıldığında tamamen silinmemelidir.

Retracted belief:
“Avcı köprüyü bilerek yıktı.”

Memory olarak şu kalabilir:

Bir süre avcının köprüyü yıktığına inanmıştım.

Bu önemlidir çünkü:

pişmanlık
özür
ilişki onarımı
önyargı farkındalığı

üretebilir.

58. Belief persistence

Belief’in kalıcılığı şunlardan etkilenir:

Tekrar
Kimlik bağlantısı
Duygusal yoğunluk
Sosyal destek
Kaynak otoritesi
Geçmiş doğrulamalar
type BeliefPersistenceProfile = {
  repetitionStrength: number;
  identityBinding: number;
  emotionalBinding: number;
  socialReinforcement: number;
  historicalSuccess: number;
};
59. Belief update ve memory reconsolidation

Belief değiştiğinde geçmiş memory yorumu da değişebilir.

Eski memory:

Tilki saldırmaya çalıştı.

Yeni belief:

Tilki yavrularını koruyordu.

Memory reconsolidation:

Tilkinin davranışını saldırı olarak yorumlamıştım ama korktuğunu şimdi anlıyorum.

Belief Engine Memory Engine’e doğrudan memory silme komutu vermemelidir.

Yalnızca:

reinterpretation candidate

göndermelidir.

60. Belief and Goal Engine

Belief’ler hedef aktivasyonunu belirler.

Belief:
Tilki ciddi biçimde yaralı.

→ yardım hedefi urgency yükselir.

Belief:
Tilki kendi başına iyileşebilir.

→ yardım hedefi urgency düşebilir.

Belief:
Şifacı yakında.

→ şifacı getirme hedefi feasibility yükselir.

Goal Engine objective truth değil, perceived state kullanmalıdır.

61. Belief and Plan Engine

Planlar belief’lere dayanır.

Belief:
Köprü açık.

→ köprü rotası seçilir.

Belief:
Şifacı köyde.

→ köye git planı oluşturulur.

Plan varsayımları belief ID’lerine bağlanmalıdır.

Belief değiştiğinde Plan Monitor hangi planların etkilendiğini bulabilir.

62. Belief and Action Generator

Belief, hangi eylemlerin akla geleceğini etkiler.

Tilki saldırgan belief’i yüksek:

Adaylar:

geri çekil
yardım çağır
uzaktan gözlemle
Tilki korkmuş belief’i yüksek:

Adaylar:

yavaş yaklaş
yiyecek bırak
sakin konuş

Aynı dünya state’i farklı belief’lerle farklı candidate set üretir.

63. Belief and Utility Evaluator

Utility tahminleri belief üzerinden yapılır.

Action:
Tilkiye yaklaş.

Gerçek saldırı riski düşük olabilir.

Ama Mira’nın belief’i:

saldırı riski yüksek

ise Utility Evaluator safety utility’yi düşük hesaplar.

Bu hata beklenen ve doğru davranıştır.

64. Belief and Consequence prediction

Consequence Engine objective sonuçları hesaplar.

Decision sistemi ise perceived consequence kullanır.

type PerceivedConsequencePrediction = {
  actorId: string;
  actionId: string;

  predictedEffects: EffectPrediction[];

  confidence: number;
  beliefDependencies: string[];
};

NPC gerçekte oluşmayacak bir sonuçtan korkabilir veya gerçek riski göremeyebilir.

65. Belief and emotion feedback loop
Belief:
Tilki saldıracak.
↓
Fear artar.
↓
Tehdit kanıtları daha görünür olur.
↓
Belief confidence artabilir.

Bu loop sınırlandırılmalıdır.

Önerilen korumalar:

Emotion modifier cap
Contradictory evidence quota
Confidence calibration
Time-based reevaluation
External feedback
66. Belief and identity

Kimlik belief’leri diğer evidence’ları yorumlayabilir.

“Ben korkağım.”

NPC yardım etmeye çalışıp geri çekildiğinde:

“Yine korkak olduğumu kanıtladım.”

diye yorumlayabilir.

Oysa gerçek execution:

Risk değerlendirdi ve güvenli biçimde geri çekildi.

olabilir.

Reflection Engine identity belief ile event arasındaki attribution’ı incelemelidir.

67. Belief about responsibility

NPC bir outcome için kendi sorumluluğunu yanlış değerlendirebilir.

Mira elmayı bıraktı.
Yaban domuzu geldi.
Patika bozuldu.

Mira:

“Her şey benim yüzümden oldu.”

diye düşünebilir.

Belief Engine’de:

type ResponsibilityBelief = {
  actorId: string;
  consequenceId: string;

  perceivedCausalContribution: number;
  perceivedForeseeability: number;
  perceivedControl: number;

  guiltRelevance: number;
};

Objective responsibility assessment Consequence Engine’de ayrı tutulur.

68. Belief calibration learning

NPC zamanla kendi tahminlerinin doğruluğunu öğrenebilir.

Mira sürekli tehlikeyi olduğundan yüksek tahmin ediyor.

Sonuçlar karşılaştırılır:

type BeliefCalibrationExperience = {
  beliefId: string;
  predictedConfidence: number;
  outcomeTruthValue: number;

  calibrationError: number;
  domain: string;
};

Tekrarlanan deneyimler sonrası:

Mira tehlike tahminlerinde aşırı ihtiyatlı olduğunu fark edebilir.

Bu meta-belief oluşturur.

69. Meta-belief

NPC kendi belief süreci hakkında belief taşıyabilir.

“Karanlıkta gördüklerime fazla güvenmemeliyim.”
“Arda’nın sağlık bilgisinin güvenilir olmadığını öğrendim.”
“Korktuğumda en kötü ihtimali düşünüyorum.”
type MetaBelief = {
  beliefId: string;
  actorId: string;

  targetDomain:
    | "self_reasoning"
    | "source_reliability"
    | "perception"
    | "memory"
    | "emotion_bias";

  proposition: Proposition;
  confidence: number;
};

Bu, karakterin zihinsel olarak gelişmesini sağlar.

70. Epistemic goals

Belief eksikleri Goal Engine’e bilgi hedefi gönderebilir.

Tilkinin yarasının nedenini öğren.
Şifacının nerede olduğunu doğrula.
Avcının doğru söyleyip söylemediğini bul.
type EpistemicGoalSeed = {
  unknownId: string;
  desiredConfidence: number;

  informationValue: number;
  delayCost: number;

  suggestedMethods: string[];
};

Her bilinmeyen bilgi hedefe dönüşmemelidir.

Yalnızca karar kalitesini anlamlı biçimde etkileyenler aktive edilmelidir.

71. Value of information

Bilgi toplamanın değeri:

informationValue =
  expectedDecisionImprovement
  * consequenceMagnitude
  * uncertaintyReduction;

Maliyet:

informationCost =
  timeCost
  + riskCost
  + resourceCost
  + opportunityCost;

Bilgi toplamak ancak değeri maliyetini aşıyorsa güçlü aday olmalıdır.

72. Belief revision priority

Bütün belief’ler her tick güncellenmemelidir.

Öncelik:

Aktif karara bağlı belief’ler
Yüksek volatility belief’ler
Yeni güçlü evidence alan belief’ler
Çelişki içeren belief’ler
Yüksek riskli plan varsayımları
Kimlik açısından kritik belief’ler
type BeliefUpdatePriority = {
  decisionRelevance: number;
  volatility: number;
  evidenceChange: number;
  contradictionSeverity: number;
  consequenceRisk: number;
};
73. Belief budget

Bir NPC binlerce belief taşıyabilir ama aktif çalışma seti sınırlı olmalıdır.

MVP önerisi:

Aktif belief projection: en fazla 20
Kritik unknown: en fazla 5
Aktif hypothesis: unknown başına en fazla 4
Karar başına inference depth: en fazla 3
Nested belief depth: en fazla 2
Çelişki çözüm turu: en fazla 2
74. Belief compression

Benzer belief’ler birleştirilebilir.

Örnek:

Kuzey patikasında çamur var.
Kuzey patikasında su birikintisi var.
Kuzey patikasında ilerlemek yavaş.

Özet belief:

Kuzey patikası şu anda zor geçilebilir.

Ancak kaynak ayrıntıları kaybolmamalıdır.

type BeliefSummary = {
  summaryBeliefId: string;
  sourceBeliefIds: string[];

  generalizedProposition: Proposition;
  confidence: number;

  retainedExceptions: string[];
};
75. Belief eventleri

Önerilen eventler:

EvidenceReceived
BeliefCreated
BeliefStrengthened
BeliefWeakened
BeliefContested
BeliefContextualized
BeliefSplit
BeliefRetracted
BeliefSuperseded
UnknownRecognized
HypothesisCreated
ContradictionDetected
ContradictionResolved
InferenceGenerated
MetaBeliefLearned

Bu eventler explainability ve replay için önemlidir.

76. Belief explanation

Her önemli belief şu sorulara cevap verebilmelidir:

NPC buna neden inanıyor?
Hangi kanıtlar destekliyor?
Hangi kanıtlar çelişiyor?
Kaynaklar ne kadar güvenilir?
Ne kadar emin?
Hangi koşullarda değişebilir?
type BeliefExplanation = {
  internal: string;
  narrative: string;
  debug: string;

  supportingReasons: string[];
  contradictingReasons: string[];

  uncertaintyNotes: string[];
  biasNotes: string[];
};

Örnek:

Internal:
Mira, tilkinin hırlamasını ve geri çekilmesini tehdit işareti olarak yorumladığı için onun saldırgan olabileceğine inanıyor. Ancak tilkinin yaralı ve korkmuş olduğuna dair karşıt kanıtlar bulunuyor.

Narrative:
Tilkinin dişlerini göstermesi Mira’yı endişelendirdi. Yine de onun yalnızca korkmuş olabileceğini düşündü.

Debug:
Belief fox_is_aggressive confidence=0.58.
Support: growl=0.72, teeth_display=0.63.
Contradiction: retreat_behavior=0.44, injury_state=0.51.
Fear bias modifier=+0.09.
77. Belief Engine çıktısı
type BeliefEngineResult = {
  actorId: string;
  timestamp: number;

  createdEvidence: Evidence[];

  createdBeliefs: Belief[];
  updatedBeliefs: Belief[];

  contestedBeliefs: string[];
  retractedBeliefs: string[];
  supersededBeliefs: string[];

  createdUnknowns: UnknownBelief[];
  resolvedUnknowns: string[];

  generatedHypotheses: BeliefHypothesis[];
  generatedInferences: BeliefInference[];

  contradictions: BeliefContradiction[];

  epistemicGoalSeeds: EpistemicGoalSeed[];

  affectedPlanIds: string[];
  affectedGoalIds: string[];

  projection: BeliefProjection;

  explanation: {
    internal: string;
    narrative: string;
    debug: string;
  };
};
78. Örnek: Yaralı tilki perception’ı

Gerçek dünya:

Tilki yaralı.
Mira yaklaşınca hırlıyor.
Asıl amacı kendini korumak.

Mira’nın perception evidence’ı:

[
  {
    "proposition": "fox_12 growled",
    "evidenceType": "direct_perception",
    "strength": 0.85,
    "reliability": 0.88
  },
  {
    "proposition": "fox_12 moved backward",
    "evidenceType": "direct_perception",
    "strength": 0.75,
    "reliability": 0.83
  },
  {
    "proposition": "fox_12 has injured leg",
    "evidenceType": "direct_perception",
    "strength": 0.62,
    "reliability": 0.70
  }
]

Olası belief’ler:

Tilki korkuyor.
confidence: 0.67

Tilki saldırabilir.
confidence: 0.54

Tilki kaçmak istiyor.
confidence: 0.61

Tilkinin yardıma ihtiyacı var.
confidence: 0.72

Unknown:

Tilkiye ne kadar yaklaşmak güvenli?

Epistemic action adayları:

Uzaktan gözlemle
Yiyecek bırak
Daha fazla yaklaşmadan tepkisini izle
79. Yeni bilgiyle belief güncelleme

Mira elmayı bırakıp geri çekilir.

Tilki:

Hırlamayı bırakır.
Elmaya yaklaşır.
Mira’ya doğru saldırmaz.

Yeni evidence:

Tilki mesafe korununca sakinleşti.
Tilki yiyeceğe yöneldi.
Tilki takip etmedi.

Belief update:

Tilki saldırgan:
0.54 → 0.27

Tilki korkuyor:
0.67 → 0.81

Güvenli mesafe riski azaltır:
0.40 → 0.76

Procedural belief:

Yaralı vahşi hayvanlara yardım ederken mesafeyi korumak etkilidir.

oluşabilir.

80. Yanlış sosyal belief örneği

Köylü Arda şöyle der:

“Avcı tilkiye tuzak kurdu.”

Mira’nın değerlendirmesi:

Arda dürüst: 0.75
Arda tuzaklar konusunda bilgili: 0.40
Arda avcıya kızgın: bias 0.50
Kaynak doğrudan gözlem değil.

Belief:

Avcı tilkiye tuzak kurmuş olabilir.
confidence: 0.42
status: contested hypothesis

Mira bunu gerçek gibi kabul etmemelidir.

Yeni unknown:

Tilkinin yarasının avcı tuzağından kaynaklanıp kaynaklanmadığını doğrula.
81. Yanlış belief’in hikâye etkisi

Mira avcının suçlu olduğuna erken inanırsa:

Avcıya güven azalır
Öfke artar
Yüzleşme hedefi oluşur
Şifacı yerine avcıyı takip etme planı doğabilir

Daha sonra avcının tuzağı kaldırmaya çalıştığı ortaya çıkarsa:

Belief retraction
Pişmanlık
Özür hedefi
İlişki onarımı
Self-reflection

oluşur.

Yanlış belief yalnızca hata değildir; yaşayan hikâye kaynağıdır.

82. Yaşa ve türe göre belief modeli

Her NPC aynı çıkarım kapasitesine sahip olmamalıdır.

type EpistemicCognitiveProfile = {
  evidenceIntegration: number;
  causalReasoning: number;
  sourceMonitoring: number;
  contradictionDetection: number;
  uncertaintyTolerance: number;
  theoryOfMindDepth: number;
  confidenceCalibration: number;
};
Küçük çocuk karakter
Somut evidence’a yüksek ağırlık
Otoriteye daha fazla güven
Kaynak ayrımı daha sınırlı
Duygu etkisi daha yüksek
Yetişkin
Daha güçlü kaynak değerlendirme
Daha iyi temporal ve causal reasoning
Hayvan
Associative belief
Tehdit
Yiyecek
Mekân
Sosyal güven
Fantastik varlık

Dünya kurallarına göre özel epistemik yetenekler taşıyabilir.

83. Hayvan belief modeli

Tilki için insan benzeri proposition sistemi zorunlu değildir.

type AssociativeBeliefState = {
  actorId: string;

  entityAssociations: Record<
    string,
    {
      threat: number;
      safety: number;
      food: number;
      pain: number;
      familiarity: number;
    }
  >;

  locationAssociations: Record<
    string,
    {
      shelter: number;
      danger: number;
      food: number;
    }
  >;

  confidence: number;
};

Tilkinin belief’i:

Mira’nın kokusu:
düşük tehdit
orta yiyecek ilişkisi
artan güven

şeklinde temsil edilebilir.

84. Belief Guardrails

Belief Engine dünya dışı bilgi sızdırmamalıdır.

NPC şu bilgilere yalnızca uygun kaynakla ulaşmalıdır:

Başka NPC’nin iç düşünceleri
Gizli olaylar
Oyuncunun ekran bilgileri
Henüz gerçekleşmemiş kesin sonuçlar
Event log’un objective açıklaması

Guardrail:

type EpistemicAccessCheck = {
  actorId: string;
  informationId: string;

  accessible: boolean;
  accessPath?: string;

  blockedReason?: string;
};
85. Belief truth evaluation

Debug ve simülasyon için belief objective world state ile karşılaştırılabilir.

Ancak bu veri NPC’ye gösterilmez.

type BeliefTruthAssessment = {
  beliefId: string;

  truthStatus:
    | "true"
    | "false"
    | "partially_true"
    | "currently_unverifiable"
    | "context_dependent";

  truthConfidence: number;
  worldEvidenceIds: string[];
};

Bu sistem:

NPC doğruluğu
kalibrasyon
önyargı testleri
hikâye debug

için kullanılabilir.

86. MVP Belief Engine

İlk sürümde desteklenecek belief türleri:

fact
state
causal
intent
predictive
relational
self
capability
spatial
temporal

Evidence türleri:

direct perception
episodic memory
semantic memory
social report
inference
environmental trace

İlk update işlemleri:

create
strengthen
weaken
contest
contextualize
retract
supersede

İlk inference türleri:

deductive
abductive
analogical
predictive
87. MVP sade veri modeli
type SimpleBelief = {
  beliefId: string;
  actorId: string;

  proposition: Proposition;

  confidence: number;
  salience: number;

  status:
    | "active"
    | "contested"
    | "retracted";

  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];

  volatility:
    | "stable"
    | "dynamic";

  lastUpdatedAt: number;
};
type SimpleEvidence = {
  evidenceId: string;

  proposition: Proposition;

  direction:
    | "support"
    | "contradict";

  strength: number;
  reliability: number;

  sourceType: string;
  sourceId?: string;
};
88. MVP işlem sırası
1. Perception ve Memory evidence üretir
2. Evidence proposition’a normalize edilir
3. İlgili mevcut belief’ler bulunur
4. Kaynak güvenilirliği hesaplanır
5. Belief confidence güncellenir
6. Çelişkiler işaretlenir
7. Gerekli basit inference’lar üretilir
8. Kritik unknown’lar çıkarılır
9. Epistemic goal seed’leri oluşturulur
10. Decision context için belief projection hazırlanır
89. MVP sınırları
Karar başına evidence: en fazla 20
Aktif belief projection: en fazla 15
Yeni inference: en fazla 5
Unknown: en fazla 5
Unknown başına hypothesis: en fazla 3
Inference depth: en fazla 2
Nested belief: ilk sürümde en fazla 1 seviye
90. Önerilen modüller
BeliefEngine
├── EvidenceCollector
├── EvidenceNormalizer
├── SourceReliabilityEvaluator
├── BeliefStore
├── BeliefMatcher
├── BeliefUpdateEngine
├── ConfidenceCalibrator
├── ContradictionDetector
├── HypothesisManager
├── InferenceEngine
├── UnknownManager
├── EpistemicGoalBuilder
├── BeliefProjectionBuilder
├── BeliefTruthEvaluator
├── EpistemicAccessGuard
└── BeliefExplanationBuilder

İlk sürümde bunlar ayrı servis olarak ayrılmamalıdır. Tek bir Belief domain modülü altında tutulmaları daha uygundur.

91. Temel prensipler

Belief, dünyada doğru olanı değil, NPC’nin doğru olduğunu düşündüğü şeyi temsil eder.

Algı, memory ve social report aynı güvenilirlikte değildir.

Fact, interpretation ve inference birbirinden ayrılmalıdır.

Belirsizlik açıkça temsil edilmeli; sistem eksik bilgiyi kesin gerçek gibi doldurmamalıdır.

Bir belief tek confidence sayısından ibaret olmamalı; kaynak, kanıt, bağlam ve zaman güveni korunmalıdır.

Aynı bilginin aynı kaynaktan tekrar edilmesi bağımsız kanıt sayılmamalıdır.

Zaman ilişkisi nedensellik anlamına gelmez.

Başka NPC’lerin niyetleri doğrudan bilinemez; yalnızca tahmin edilebilir.

Belief’ler bağlama ve zamana özel olmalıdır.

Yeni bilgi eski belief’i yalnızca silmemeli; onu zayıflatabilir, bölebilir, bağlama özel hale getirebilir veya değiştirebilir.

Duygular belief oluşumunu etkileyebilir ancak evidence’ın yerine geçmemelidir.

Yanlış belief’ler sistem hatası değil; doğal karar farklılıkları, çatışmalar ve karakter gelişimi için temel mekanizmalardır.

NPC yalnızca epistemik olarak erişebildiği bilgiye inanabilmelidir.

Objective truth, yalnızca simülasyon ve debug katmanında bulunmalı; NPC kararları öznel belief state üzerinden verilmelidir.