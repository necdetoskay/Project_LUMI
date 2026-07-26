Utility Aggregator ve Decision Selector

Utility Evaluator her aday eylem için çok boyutlu bir sonuç üretir.

Örneğin:

Aday 1: Yaralı tilkiye doğrudan yardım et
Aday 2: Köyden yardım getir
Aday 3: Güvenli mesafeden yiyecek bırak
Aday 4: Yoluna devam et

Her aday için:

UtilityEvaluationResult

oluşturulur.

Utility Aggregator’ın görevi bu sonuçları karşılaştırılabilir hale getirmektir.

Decision Selector’ın görevi ise NPC’nin gerçekten hangi eylemi yapacağını seçmektir.

Bu iki katmanı ayırmak önemlidir.

Utility Evaluator
        ↓
Utility Aggregator
        ↓
Decision Selector
        ↓
Selected Action
1. Utility Aggregator ne yapar?

Utility Aggregator şu işleri yapar:

- Boyutları NPC önceliklerine göre ağırlıklandırır
- Zaman ufuklarını birleştirir
- Risk ve belirsizlik etkisini uygular
- Kritik eşikleri kontrol eder
- İç çatışmaları hesaba katar
- Aday eylemleri karşılaştırılabilir hale getirir
- Kararın açıklama izini korur

Fakat Aggregator da henüz eylemi seçmez.

Çıktısı bir Decision Profile olur.

type DecisionProfile = {
  actionId: string;

  utilityVector: UtilityVector;
  adjustedUtilityVector: UtilityVector;

  positiveScore: number;
  negativeScore: number;
  netScore: number;

  feasibility: number;
  confidence: number;
  risk: number;
  urgency: number;

  conflictLevel: number;
  regretPotential: number;

  guardrailStatus: GuardrailStatus;

  rankHints: string[];

  explanation: DecisionExplanation;
};
2. Neden doğrudan toplam puan kullanmıyoruz?

Basit bir sistem şöyle çalışır:

Toplam puan = tüm boyutların toplamı

Fakat bu hatalı sonuçlar üretebilir.

Örnek:

{
  "compassion": 0.9,
  "narrativeValue": 0.8,
  "socialBond": 0.7,
  "safety": -1.0
}

Toplam:

1.4

çıkar.

Ancak safety = -1.0, eylemin ölümcül veya kabul edilemez derecede tehlikeli olduğunu ifade ediyorsa diğer olumlu boyutlar bunu kapatmamalıdır.

Bu nedenle LUMI’de utility boyutları üç farklı davranış sınıfına ayrılmalıdır.

Telafi edilebilir boyutlar

Bir boyuttaki kayıp başka bir boyuttaki kazançla dengelenebilir.

Örnek:

resourceEfficiency
comfort
curiosity
goalProgress
Sınırlı telafi edilebilir boyutlar

Belirli bir seviyeye kadar dengelenebilir.

Örnek:

safety
socialTrust
emotionalStability
Telafi edilemez boyutlar

Eşik aşıldığında eylem elenir veya yeniden tasarlanır.

Örnek:

fatalRisk
childSafety
worldRuleViolation
ethicalConstraint
physicalImpossibility

Bu davranış boyut tanımında belirtilmelidir.

type UtilityDimensionDefinition = {
  id: string;

  aggregationMode:
    | "compensatory"
    | "bounded_compensatory"
    | "non_compensatory";

  positiveWeight: number;
  negativeWeight: number;

  softMinimum?: number;
  hardMinimum?: number;

  softMaximum?: number;
  hardMaximum?: number;
};
3. Ağırlıklar sabit olmamalı

NPC’nin kişilik vektörü temel ağırlıkları belirler.

Fakat ağırlıklar bağlama göre değişebilir.

Örneğin normal durumda:

{
  "safety": 1.0,
  "compassion": 1.2,
  "goalProgress": 0.8
}

NPC’nin küçük kardeşi tehlikedeyse:

{
  "safety": 0.7,
  "compassion": 1.0,
  "socialBond": 1.8,
  "urgency": 1.7
}

Yani gerçek ağırlık:

Base Personality Weight
× Current Need Modifier
× Emotion Modifier
× Relationship Modifier
× Situation Modifier

şeklinde oluşabilir.

effectiveWeight =
  basePreferenceWeight
  * needModifier
  * emotionModifier
  * relationshipModifier
  * contextModifier;

Ancak çarpanların kontrolsüz büyümesini önlemek gerekir.

effectiveWeight = clamp(effectiveWeight, 0, 2.5);
4. Duygular karar ağırlıklarını değiştirir

Duygu vektörü utility sonucunu doğrudan değiştirmekten çok, bazı boyutların önemini değiştirebilir.

Örneğin korku:

{
  "safetyWeightModifier": 1.5,
  "uncertaintyPenaltyModifier": 1.4,
  "curiosityWeightModifier": 0.6
}

Öfke:

{
  "safetyWeightModifier": 0.8,
  "socialCostModifier": 0.7,
  "immediateRewardModifier": 1.3,
  "longTermConsequenceModifier": 0.6
}

Suçluluk:

{
  "responsibilityWeightModifier": 1.5,
  "repairRelationshipModifier": 1.4,
  "selfProtectionModifier": 0.8
}

Bu sayede duygular yalnızca hikâye metninde görünen süsler olmaz; karar mekanizmasını gerçek anlamda değiştirir.

5. İhtiyaçlar ve homeostasis

NPC’nin ihtiyaçları da ağırlıkları dinamik olarak değiştirmelidir.

type NeedVector = {
  hunger: number;
  thirst: number;
  rest: number;
  safety: number;
  belonging: number;
  autonomy: number;
  competence: number;
  meaning: number;
};

Değer büyüdükçe ihtiyacın eksikliği artıyor olsun.

Örneğin:

{
  "hunger": 0.85,
  "rest": 0.70,
  "safety": 0.20,
  "belonging": 0.40
}

Aç NPC için yiyecek harcamanın maliyeti yükselir.

Normal durumda son elmayı vermek:
resourceCost = -0.60

Çok açken son elmayı vermek:
resourceCost = -0.95

Burada önemli ayrım:

Eylemin nesnel kaynak maliyeti

ile

NPC’nin o kaynağa şu anda verdiği öznel değer

aynı şey değildir.

6. Zaman ufuklarının birleştirilmesi

Utility Evaluator şu üç çıktıyı üretiyordu:

type TemporalUtility = {
  immediate: UtilityVector;
  shortTerm: UtilityVector;
  longTerm: UtilityVector;
};

Aggregator NPC’nin zaman tercihine göre bunları birleştirir.

combinedDimension =
  immediateValue * immediateWeight
  + shortTermValue * shortTermWeight
  + longTermValue * longTermWeight;

Fakat değerlerin normalize edilmesi gerekir.

Örnek:

combinedDimension =
  (
    immediateValue * immediateWeight +
    shortTermValue * shortTermWeight +
    longTermValue * longTermWeight
  ) /
  (
    immediateWeight +
    shortTermWeight +
    longTermWeight
  );

NPC’nin zaman ufku bağlama göre de değişebilir.

Acil tehlikede:

{
  "immediateWeight": 1.8,
  "shortTermWeight": 0.6,
  "longTermWeight": 0.2
}

Sakin planlama sırasında:

{
  "immediateWeight": 0.8,
  "shortTermWeight": 1.0,
  "longTermWeight": 1.2
}
7. Risk ve belirsizlik

İki eylemin beklenen faydası aynı olabilir fakat risk dağılımı farklı olabilir.

Eylem A
Kesin olarak orta seviyede fayda sağlar.
Eylem B
Ya çok iyi sonuç verir ya da felaketle sonuçlanır.

Basit beklenen değer sistemi ikisini aynı görebilir.

Bu nedenle Aggregator şu değerleri kullanmalıdır:

type OutcomeDistribution = {
  expectedValue: number;
  variance: number;
  worstLikelyOutcome: number;
  bestLikelyOutcome: number;
  confidence: number;
};

Risk ayarlı skor:

riskAdjustedScore =
  expectedValue
  - variance * uncertaintyAversion
  - abs(worstLikelyOutcome) * lossSensitivity;

Risk arayan NPC için bazı katsayılar tersine bile çalışabilir.

type RiskProfile = {
  riskTolerance: number;
  uncertaintyAversion: number;
  lossSensitivity: number;
  noveltySeeking: number;
};

Meraklı ve maceracı karakter:

{
  "riskTolerance": 0.8,
  "uncertaintyAversion": 0.2,
  "lossSensitivity": 0.4,
  "noveltySeeking": 0.9
}

Kaygılı karakter:

{
  "riskTolerance": 0.2,
  "uncertaintyAversion": 0.9,
  "lossSensitivity": 0.8,
  "noveltySeeking": 0.2
}
8. Regret Potential

NPC yalnızca beklenen faydaya değil, daha sonra duyabileceği pişmanlığa göre de karar verebilir.

Örneğin:

Tilkiye yardım etmezsem ve tilki ölürse pişman olur muyum?

Bu özellikle:

Vicdanlı,
Sorumluluk sahibi,
Geçmişte benzer kayıp yaşamış,
Sosyal bağları güçlü

karakterlerde önemlidir.

type RegretEvaluation = {
  actionRegret: number;
  omissionRegret: number;
  expectedFutureSelfJudgment: number;
};

Burada iki pişmanlık ayrılır:

Eylemi yaptığım için pişman olmak
Eylemi yapmadığım için pişman olmak

Örneğin:

{
  "actionRegret": 0.30,
  "omissionRegret": 0.85,
  "expectedFutureSelfJudgment": 0.70
}

Bu durumda riskli olmasına rağmen yardım eylemi daha güçlü hale gelebilir.

9. İç çatışma ceza değil, karar sinyalidir

İç çatışmayı yalnızca puan düşüren bir unsur gibi kullanmamalıyız.

Çünkü güçlü iç çatışma bazen hikâye açısından önemli bir karar anıdır.

Örneğin:

Korkusuna rağmen yardım etmek

karakter gelişimi yaratabilir.

Bu yüzden iki ayrı değer tutulmalıdır.

type ConflictEvaluation = {
  decisionDifficulty: number;
  emotionalIntensity: number;
  growthOpportunity: number;
  instabilityRisk: number;
};

Örnek:

{
  "decisionDifficulty": 0.82,
  "emotionalIntensity": 0.77,
  "growthOpportunity": 0.68,
  "instabilityRisk": 0.40
}

Decision Selector bu bilgiyi şöyle kullanabilir:

Düşük baskı altında ara çözüm arar.
Acil durumda baskın değere göre karar verir.
Hikâyesel olarak önemli anda karakter gelişimi seçeneğine yönelebilir.
Çok yüksek kararsızlıkta yardım isteyebilir veya eylemi geciktirebilir.
10. Decision Selector neden her zaman en yüksek puanı seçmemeli?

Her zaman en yüksek skoru seçerse NPC mekanik ve tahmin edilebilir olur.

Örneğin aynı koşullarda her seferinde aynı davranışı gösterir.

Gerçekçi seçim modeli şu unsurları hesaba katmalıdır:

- En yüksek fayda
- Alışkanlık
- Kişilik
- Duygusal dürtü
- Belirsizlik
- Karar yorgunluğu
- Sosyal baskı
- Daha önceki seçimler
- Keşif eğilimi
- Rastlantısallık

Ancak rastlantısallık kontrolsüz olmamalıdır.

NPC tamamen rastgele davranmamalı, fakat yakın puanlı seçenekler arasında çeşitlilik gösterebilmelidir.

11. Seçim kümeleri

Aday eylemleri yalnızca sıralamak yerine kümelere ayırabiliriz.

Dominant Actions
Viable Actions
Compromise Actions
Desperate Actions
Rejected Actions
Dominant Actions

Çoğu önemli boyutta güçlü, ciddi engeli olmayan seçenekler.

Viable Actions

Makul fakat en güçlü olmayan seçenekler.

Compromise Actions

İç çatışmayı azaltan ara çözümler.

Desperate Actions

Normalde seçilmeyecek fakat kriz anında mümkün olan eylemler.

Rejected Actions

Hard constraint, kritik risk veya bilgi sınırı nedeniyle seçilemeyen eylemler.

type ActionTier =
  | "dominant"
  | "viable"
  | "compromise"
  | "desperate"
  | "rejected";

Bu kümeler karar sisteminin daha anlaşılır çalışmasını sağlar.

12. Softmax tabanlı seçim

Yakın puanlı eylemler arasında kontrollü çeşitlilik için softmax kullanılabilir.

probability(action_i) =
  exp(score_i / temperature)
  /
  Σ exp(score_j / temperature);

temperature davranışın ne kadar deterministik olduğunu belirler.

Düşük sıcaklık:

NPC neredeyse her zaman en yüksek puanlı eylemi seçer.

Yüksek sıcaklık:

NPC yakın puanlı alternatiflere daha fazla şans verir.

Örnek:

type DecisionStyle = {
  temperature: number;
  impulsiveness: number;
  consistency: number;
  exploration: number;
};

Disiplinli muhafız:

{
  "temperature": 0.20,
  "impulsiveness": 0.15,
  "consistency": 0.90,
  "exploration": 0.10
}

Meraklı çocuk:

{
  "temperature": 0.65,
  "impulsiveness": 0.55,
  "consistency": 0.45,
  "exploration": 0.75
}
13. Gürültü tüm eylemlere eşit uygulanmamalı

Rastlantısal varyasyon yalnızca yakın puanlı ve makul seçeneklerde uygulanmalıdır.

Örneğin:

A eylemi: 0.82
B eylemi: 0.79
C eylemi: 0.22
D eylemi: yasak

A ve B arasında çeşitlilik olabilir.

C yalnızca özel bir dürtü, hata veya kriz nedeniyle seçilmelidir.

D hiçbir zaman seçilmemelidir.

Bu nedenle önce uygunluk havuzu oluşturulur.

eligibleActions = actions.filter(
  action =>
    action.guardrailStatus !== "rejected" &&
    action.score >= bestScore - eligibilityMargin
);

Sonra stochastic seçim uygulanır.

14. İmpulsif seçim

Bazı durumlarda NPC normal karar sürecini tamamlamadan tepki verebilir.

Örnek:

Ani patlama
Yüksek korku
Çocuğun çığlığı
Yakın saldırı
Geçmiş travmayı tetikleyen olay
type ImpulseTrigger = {
  type: string;
  intensity: number;
  responseBias: UtilityVector;
  actionBiases: Record<string, number>;
};

Örneğin yangın:

{
  "type": "sudden_fire",
  "intensity": 0.95,
  "responseBias": {
    "safety": 1.8,
    "urgency": 2.0,
    "goalProgress": 0.2,
    "curiosity": 0.0
  }
}

Bu durumda Decision Selector normal uzun vadeli değerlendirmeyi bastırabilir.

Normal Decision Mode
Deliberative Decision Mode
Impulsive Decision Mode
Panic Decision Mode
Habitual Decision Mode
15. Karar modu
type DecisionMode =
  | "deliberative"
  | "normal"
  | "impulsive"
  | "panic"
  | "habitual"
  | "socially_driven"
  | "desperate";

Karar modu şu verilere göre belirlenebilir:

Zaman baskısı
Duygusal yoğunluk
Tehdit seviyesi
Enerji seviyesi
Karar önemi
Belirsizlik
Önceden öğrenilmiş rutin

Örnek seçim:

function determineDecisionMode(
  actor: ActorState,
  context: DecisionContext
): DecisionMode {
  if (context.fatalThreat > 0.85 && actor.emotions.fear > 0.8) {
    return "panic";
  }

  if (context.timePressure > 0.8) {
    return "impulsive";
  }

  if (context.hasStrongHabit && context.novelty < 0.2) {
    return "habitual";
  }

  if (context.decisionImportance > 0.7) {
    return "deliberative";
  }

  return "normal";
}
16. Alışkanlıklar

NPC daha önce benzer durumlarda seçtiği eylemlere eğilim gösterebilir.

type HabitPattern = {
  situationPattern: string;
  actionId: string;
  strength: number;
  successHistory: number;
  repetitionCount: number;
};

Örneğin:

{
  "situationPattern": "encounter_injured_animal",
  "actionId": "seek_adult_help",
  "strength": 0.72,
  "successHistory": 0.85,
  "repetitionCount": 4
}

Alışkanlık bonusu:

habitBonus =
  habit.strength
  * habit.successHistory
  * actor.habitReliance;

Ancak bağlam ciddi şekilde değiştiyse alışkanlık geçersiz olabilir.

Örneğin köy çok uzaktaysa yardım çağırmak artık iyi seçenek değildir.

17. Karar geçmişi ve tutarlılık

NPC’nin kişiliği yalnızca sabit traitlerden değil, geçmiş seçimlerinden de oluşmalıdır.

Bir karakter sürekli cesur davranıyorsa sistem zamanla bu davranışı karakter kimliğinin parçası olarak değerlendirebilir.

type DecisionHistorySummary = {
  repeatedDimensions: Record<string, number>;
  identityCommitments: string[];
  recentContradictions: string[];
};

Örnek:

{
  "repeatedDimensions": {
    "compassion": 0.82,
    "riskTaking": 0.64
  },
  "identityCommitments": [
    "protects_small_creatures",
    "does_not_abandon_friends"
  ],
  "recentContradictions": []
}

Bu durumda tilkiyi terk etmek yalnızca düşük compassion değil, kimlik tutarsızlığı da yaratır.

identityConsistencyScore: number;

Fakat NPC her zaman tutarlı olmak zorunda değildir.

Tutarsızlık:

Yorgunluk,
Korku,
Travma,
Manipülasyon,
Karakter gelişimi,
İçsel çöküş

nedeniyle oluşabilir.

Sistem bunu hata olarak değil, açıklanabilir sapma olarak kaydetmelidir.

18. Sosyal karar baskısı

Bir grubun içindeki NPC tek başına vereceği karardan farklı davranabilir.

type SocialDecisionPressure = {
  authorityPressure: number;
  conformityPressure: number;
  reputationPressure: number;
  attachmentPressure: number;
  rebellionPressure: number;
};

Örneğin:

{
  "authorityPressure": 0.20,
  "conformityPressure": 0.60,
  "reputationPressure": 0.75,
  "attachmentPressure": 0.80,
  "rebellionPressure": 0.10
}

NPC’nin sosyal özellikleri:

type SocialDecisionProfile = {
  conformity: number;
  obedience: number;
  independence: number;
  approvalSeeking: number;
  protectiveness: number;
};

Aynı grup baskısı farklı NPC’lerde farklı sonuç verir.

19. Manipülasyon ve yanlış bilgi

Decision Selector doğru dünya durumuna göre değil, NPC’nin belief state’ine göre çalışır.

Bir NPC kandırıldıysa yanlış fakat kendi açısından mantıklı karar verebilir.

{
  "belief": "Tilki köye hastalık taşıyor.",
  "confidence": 0.82,
  "source": "village_hunter",
  "sourceTrust": 0.75
}

NPC gerçekte zararsız olan tilkiyi uzaklaştırabilir.

Bu davranış sistem açısından hata değildir.

Karar izi şöyle olmalıdır:

Karar, yanlış fakat yüksek güvenli bir inanca dayanıyor.

Bu özellikle yaşayan dünya için değerlidir; çünkü bilgi yayılımı ve söylentiler gerçek sonuçlar doğurabilir.

20. Kararsızlık sonucu da bir karar olabilir

Bazı durumlarda hiçbir eylem yeterince güçlü değildir.

NPC:

Bekleyebilir
Gözlemleyebilir
Bilgi toplayabilir
Yardım isteyebilir
Kararı erteleyebilir
Başkasının kararını takip edebilir

Bu davranışlar ayrı aday eylemler olarak oluşturulmalıdır.

type MetaAction =
  | "wait"
  | "observe"
  | "ask_for_help"
  | "gather_information"
  | "delegate"
  | "follow_group"
  | "delay_decision";

Belirsizlik yüksekse gather_information çok değerli olabilir.

Örneğin:

Tilkiye dokunmak yerine önce yarasını incele.

Bu eylem gelecekteki kararların güvenini artırır.

21. Bilgi değeri

Bilgi toplama eylemlerinin utility’si yalnızca mevcut etkilerine göre ölçülmemelidir.

Bir eylemin gelecekte daha iyi karar verme kapasitesi yaratması da değer taşır.

type InformationValue = {
  uncertaintyReduction: number;
  futureDecisionImpact: number;
  observationCost: number;
  riskOfObservation: number;
};

Basit formül:

informationUtility =
  uncertaintyReduction
  * futureDecisionImpact
  - observationCost
  - riskOfObservation;

Bu sayede NPC hemen hareket etmek yerine bazen mantıklı biçimde araştırır.

22. Karar seçim algoritması

Önerilen akış:

1. Aday eylemleri al
2. Hard constraint ile geçersizleri ele
3. Utility sonuçlarını normalize et
4. NPC ve bağlam ağırlıklarını uygula
5. Zaman ufuklarını birleştir
6. Risk ve belirsizlik ayarlaması yap
7. Guardrail kontrollerini uygula
8. İç çatışmaları tespit et
9. Gerekirse ara eylem üretim talebi oluştur
10. Aksiyonları tier'lara ayır
11. Karar modunu belirle
12. Alışkanlık ve sosyal baskı etkisini uygula
13. Kimlik tutarlılığı etkisini uygula
14. Uygun seçim havuzunu oluştur
15. Deterministik veya stochastic seçim yap
16. Karar izini kaydet
23. Örnek karar karşılaştırması

Mira gece ormanda yaralı bir tilki görüyor.

Adaylar
A: Tilkiye yaklaş ve iyileştirici otu kullan
B: Güvenli mesafeden yiyecek bırak
C: Köyden yardım getir
D: Tilkiyi bırak ve yoluna devam et
Aggregated sonuçlar
[
  {
    "action": "A",
    "netScore": 0.61,
    "risk": 0.76,
    "urgency": 0.92,
    "conflictLevel": 0.84,
    "tier": "viable"
  },
  {
    "action": "B",
    "netScore": 0.74,
    "risk": 0.28,
    "urgency": 0.58,
    "conflictLevel": 0.30,
    "tier": "compromise"
  },
  {
    "action": "C",
    "netScore": 0.68,
    "risk": 0.18,
    "urgency": 0.36,
    "conflictLevel": 0.22,
    "tier": "viable"
  },
  {
    "action": "D",
    "netScore": 0.19,
    "risk": 0.08,
    "urgency": -0.85,
    "conflictLevel": 0.72,
    "tier": "desperate"
  }
]

Mira merhametli fakat korkak.

Zaman baskısı orta-yüksek.

Decision mode:

normal

En dengeli seçenek:

B: Güvenli mesafeden yiyecek bırak

Ancak bu eylem tilkinin yarasını çözmez.

Sistem bunun geçici bir çözüm olduğunu kaydeder.

{
  "selectedAction": "leave_food_at_safe_distance",
  "selectionReason": [
    "high_compassion_alignment",
    "acceptable_safety",
    "low_immediate_resource_cost",
    "resolves_internal_conflict_partially"
  ],
  "unresolvedConcerns": [
    "fox_injury_not_treated",
    "condition_may_worsen"
  ],
  "followUpIntent": "seek_help_from_village"
}

Böylece tek eylem değil, küçük bir plan oluşur:

Önce yiyecek bırak.
Sonra yardım getir.
24. Tek karar yerine plan üretimi

Bazı eylemler tek başına düşük utility’ye sahip olabilir fakat bir planın parçası olduğunda değerli hale gelir.

Örneğin:

Köye dönmek

tek başına tilkiye yardım etmez.

Fakat:

Tilkiyi işaretle
Yiyecek bırak
Köye dön
Şifacıyı getir

planı güçlü olabilir.

Bu nedenle Decision Selector’ın ileride bir Plan Evaluator ile çalışması gerekir.

type ActionPlan = {
  steps: PlannedAction[];
  expectedUtility: TemporalUtility;
  totalCost: number;
  failurePoints: string[];
  dependencies: string[];
};

Ancak ilk sürümde tam planlama motoru yerine:

followUpIntent

kullanabiliriz.

25. Karar sonucu veri modeli
type DecisionResult = {
  decisionId: string;
  actorId: string;
  contextId: string;
  selectedActionId: string;

  decisionMode: DecisionMode;
  selectionMethod:
    | "highest_score"
    | "softmax"
    | "habit"
    | "impulse"
    | "social_pressure"
    | "guardrail_fallback";

  candidateProfiles: DecisionProfile[];

  selectedProfile: DecisionProfile;

  primaryMotivations: string[];
  secondaryMotivations: string[];

  rejectedAlternatives: {
    actionId: string;
    reason: string;
  }[];

  unresolvedConflicts: UtilityConflict[];
  followUpIntent?: string;

  confidence: number;
  deliberationCost: number;

  explanation: {
    internal: string;
    narrative: string;
    debug: string;
  };

  timestamp: string;
};
26. Üç farklı açıklama seviyesi

Aynı karar üç farklı biçimde açıklanmalıdır.

Internal explanation

Sistem bileşenleri için:

Compassion ve urgency yüksek; safety riski doğrudan yaklaşmayı baskıladı.
Compromise-tier eylem en yüksek risk ayarlı skoru aldı.
Narrative explanation

Hikâye üreticisi için:

Mira tilkiye yaklaşmaya cesaret edemedi. Ama onu orada tamamen yalnız da bırakamazdı. Çantasındaki elmayı yavaşça yere bıraktı ve köyden yardım getirmeye karar verdi.
Debug explanation

Geliştirici için:

{
  "baseScore": 0.69,
  "riskPenalty": -0.12,
  "compassionBonus": 0.21,
  "fearModifier": -0.09,
  "relationshipModifier": 0.03,
  "finalScore": 0.72
}

Bu ayrım sistemin hem anlatısal hem teknik olarak kullanılabilmesini sağlar.

27. Determinizm ve tekrar üretilebilirlik

Karar sisteminde rastlantısallık varsa aynı dünya durumunu debug etmek zorlaşabilir.

Bu nedenle tüm stochastic seçimler seed kullanmalıdır.

type DecisionRandomContext = {
  seed: string;
  randomSample: number;
};

Seed şu verilerden üretilebilir:

worldId
actorId
decisionId
worldTick

Böylece aynı karar koşulları yeniden çalıştırıldığında aynı sonuç elde edilebilir.

Testlerde ise farklı seed’lerle davranış dağılımı ölçülebilir.

28. İlk sürüm için önerilen selector

İlk sürümde sistemi şu kadar sade tutabiliriz:

1. Hard constraint kontrolü
2. Sekiz utility boyutunun ağırlıklandırılması
3. Risk cezası
4. Urgency bonusu
5. Kritik safety guardrail
6. İç çatışma tespiti
7. Action tier belirleme
8. En iyi skora yakın adaylardan softmax seçimi
9. Karar açıklaması
10. Follow-up intent

Karar modları ilk sürümde üç adet olabilir:

normal
deliberative
impulsive

Daha sonra:

panic
habitual
socially_driven
desperate

eklenebilir.

29. Temel karar ilkeleri

Utility Aggregator ve Decision Selector için şu ilkeleri sabitleyebiliriz:

Yüksek fayda, kritik bir riski otomatik olarak geçersiz kılamaz.

NPC, gerçek dünya durumuna değil, algıladığı ve inandığı dünya durumuna göre seçim yapar.

En yüksek puanlı eylem her zaman seçilmez; fakat düşük kaliteli eylemler nedensiz biçimde seçilemez.

İç çatışma yalnızca ceza değil, ara çözüm ve karakter gelişimi üretme sinyalidir.

Kararsızlık, bilgi toplama ve yardım isteme de geçerli eylemlerdir.

Her karar, yeniden üretilebilir ve açıklanabilir bir karar izi bırakmalıdır.

Karar yalnızca bir sonraki hareketi değil, gerektiğinde takip niyetini de üretmelidir.