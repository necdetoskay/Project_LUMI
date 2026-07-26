Utility Evaluator

Utility Evaluator’ın görevi şudur:

NPC’nin yapabileceği aday eylemleri, içinde bulunduğu bağlama ve kendi özelliklerine göre değerlendirmek; fakat kararı doğrudan vermek yerine Decision Engine’e açıklanabilir bir değerlendirme sonucu sunmak.

Klasik utility sistemlerinde her eylem tek bir puan alır:

Tilkiye yardım et = 0.72
Yola devam et = 0.54
Köye dön = 0.31

LUMI’de bu yaklaşım yetersiz kalır. Çünkü aynı eylem farklı açılardan hem iyi hem kötü olabilir.

Bu nedenle Utility Evaluator’ın temel çıktısı tek sayı değil, bir Utility Vector olmalıdır.

1. Utility Vector

Örnek bir değerlendirme vektörü:

type UtilityVector = {
  survival: number;
  safety: number;
  compassion: number;
  curiosity: number;
  socialBond: number;
  responsibility: number;
  goalProgress: number;
  worldImpact: number;
  emotionalFit: number;
  resourceEfficiency: number;
  urgencyResponse: number;
  narrativeValue: number;
};

Örneğin çocuk karakter, yaralı bir tilkiyle karşılaşmış olsun.

Aday eylem: Tilkiye yardım et
{
  "survival": -0.10,
  "safety": -0.25,
  "compassion": 0.95,
  "curiosity": 0.40,
  "socialBond": 0.55,
  "responsibility": 0.70,
  "goalProgress": -0.20,
  "worldImpact": 0.65,
  "emotionalFit": 0.80,
  "resourceEfficiency": -0.35,
  "urgencyResponse": 0.90,
  "narrativeValue": 0.75
}

Bu eylem:

Tehlikeli olabilir.
Zaman ve kaynak kaybettirebilir.
Fakat merhamet, sorumluluk ve dünya etkisi bakımından oldukça değerlidir.

Bu farklı etkiler tek puanda kaybolmamalıdır.

2. Utility Evaluator kararı vermemeli

Burada önemli bir ayrım yapalım.

Utility Evaluator:

Bu eylem ne kadar değerlidir?

sorusunu cevaplar.

Decision Selector ise:

Bu NPC şu anda hangi eylemi seçer?

sorusunu cevaplar.

Böylece aynı Utility Vector, farklı NPC’lerde farklı kararlara dönüşebilir.

Örneğin:

Eylem: Tilkiye yardım et

Aynı değerlendirme sonucu karşısında:

Merhametli çocuk yardım eder.
Korkak çocuk uzaktan yardım arar.
Görev odaklı muhafız köye gidip destek getirir.
Yaralı bir karakter kendi güvenliğini seçebilir.
Tilkilerden geçmişte zarar görmüş bir NPC kaçabilir.

Dolayısıyla Utility Evaluator objektif veya bağlamsal etkiyi çıkarır; NPC’nin kişiliği ise bu etkiyi yorumlar.

3. Utility değerlendirmesinin katmanları

Her aday eylem tek aşamada puanlanmamalıdır. Değerlendirme birkaç katmandan oluşmalıdır.

Candidate Action
      ↓
Base Utility
      ↓
Actor Compatibility
      ↓
Context Modifiers
      ↓
Relationship Modifiers
      ↓
Memory Modifiers
      ↓
Time and Urgency
      ↓
Prediction / Consequence
      ↓
Final Utility Vector
3.1 Base Utility

Eylemin genel doğasından gelen değerlerdir.

Örneğin:

{
  "actionType": "HELP_INJURED_CREATURE",
  "baseUtility": {
    "compassion": 0.8,
    "responsibility": 0.5,
    "safety": -0.2,
    "resourceEfficiency": -0.3
  }
}

Bu değerler aktörden bağımsız başlangıç değerleridir.

3.2 Actor Compatibility

Eylemin NPC’nin fiziksel, zihinsel ve sosyal kapasitesiyle uyumudur.

Örneğin küçük bir çocuk ağır bir kayayı kaldırmayı düşünüyorsa:

{
  "physicalCapability": -0.9,
  "confidenceFit": -0.4,
  "knowledgeFit": -0.7
}

Fakat yanında güçlü bir ayı varsa, aynı eylem mümkün hale gelebilir.

Burada değerlendirme sadece:

NPC bunu istiyor mu?

değil,

NPC bunu yapabilir mi?

sorusunu da kapsamalıdır.

3.3 Context Modifiers

Çevrenin eylem üzerindeki etkisidir.

Örnek bağlam:

{
  "location": "dark_forest",
  "weather": "heavy_rain",
  "timeOfDay": "night",
  "nearbyThreats": ["wolf_pack"],
  "visibility": 0.2
}

Tilkiye yardım etmek gündüz güvenliyken gece çok daha riskli olabilir.

{
  "safety": -0.45,
  "urgencyResponse": 0.15,
  "resourceEfficiency": -0.10
}

Bu değiştiriciler temel vektöre eklenir.

3.4 Relationship Modifiers

Eylemin hedefiyle aktör arasındaki ilişki önemlidir.

type RelationshipVector = {
  trust: number;
  affection: number;
  fear: number;
  respect: number;
  resentment: number;
  dependency: number;
  familiarity: number;
  protectiveness: number;
};

Yaralı varlık:

Tanımadığı bir tilkiyse başka,
Daha önce kendisine yardım etmiş bir tilkiyse başka,
Kardeşinin evcil dostuysa başka,
Daha önce onu ısırmışsa başka değerlendirilir.

Örneğin:

{
  "trust": 0.7,
  "affection": 0.6,
  "protectiveness": 0.8
}

şu utility etkilerini oluşturabilir:

{
  "socialBond": 0.45,
  "compassion": 0.20,
  "responsibility": 0.30,
  "emotionalFit": 0.35
}
4. NPC kişiliği de vektör olmalı

NPC’nin tercih yapısı bir ağırlık vektörü olabilir.

type PreferenceVector = {
  survival: number;
  safety: number;
  compassion: number;
  curiosity: number;
  socialBond: number;
  responsibility: number;
  goalProgress: number;
  worldImpact: number;
  emotionalFit: number;
  resourceEfficiency: number;
  urgencyResponse: number;
  narrativeValue: number;
};

Örneğin merhametli fakat korkak bir çocuk:

{
  "survival": 0.8,
  "safety": 1.2,
  "compassion": 1.5,
  "curiosity": 0.7,
  "socialBond": 1.1,
  "responsibility": 0.9,
  "goalProgress": 0.5,
  "worldImpact": 0.6,
  "emotionalFit": 1.0,
  "resourceEfficiency": 0.4,
  "urgencyResponse": 1.2,
  "narrativeValue": 0.3
}

Utility Vector ile Preference Vector birleştirildiğinde NPC’ye özel anlam oluşur.

Basit haliyle:

weightedUtility[d] =
  utilityVector[d] * preferenceVector[d];

Fakat nihai sonucu hemen tek sayıya indirmemeliyiz.

Önce Weighted Utility Vector tutulmalıdır:

{
  "safety": -0.30,
  "compassion": 1.43,
  "responsibility": 0.63,
  "urgencyResponse": 1.08
}

Bu sayede karakterin iç çatışması görülebilir:

Yardım etmek istiyor, fakat oldukça korkuyor.

Bu bilgi hikâye üretiminde çok değerlidir.

5. İç çatışma ayrı bir çıktı olmalı

Utility Evaluator yalnızca değer üretmemeli, çatışmaları da tespit etmelidir.

type UtilityConflict = {
  positiveDimension: string;
  negativeDimension: string;
  strength: number;
  interpretation: string;
};

Örneğin:

{
  "positiveDimension": "compassion",
  "negativeDimension": "safety",
  "strength": 0.81,
  "interpretation": "Karakter yardım etmek istiyor fakat yaklaşmaktan korkuyor."
}

Bunun sonucunda Decision Engine yalnızca şu iki seçenekle sınırlı kalmaz:

Yardım et
Kaç

Yeni bir ara eylem üretebilir:

Güvenli bir mesafeden tilkiye yiyecek bırak.

Bu çok önemli bir özellik olacaktır.

Çünkü gerçekçi karar sistemlerinde eylemler yalnızca seçilmez; bazen çatışmayı çözmek için uyarlanır.

6. Utility Evaluator yeni eylem önerebilir mi?

Doğrudan eylem üretmemeli, fakat bir Action Refinement Request oluşturabilmelidir.

Örneğin:

{
  "candidateAction": "approach_and_help_fox",
  "conflict": {
    "compassion": 0.95,
    "safety": -0.75
  },
  "refinementNeeded": true,
  "refinementGoal": {
    "preserve": ["compassion", "urgencyResponse"],
    "reduceCost": ["safety"]
  }
}

Action Generator bu isteği alıp alternatifler üretebilir:

1. Uzaktan yiyecek bırak.
2. Bir yetişkin çağır.
3. Tilkiyi korkutmadan yarasını gözlemle.
4. Güvenli bir barınak oluştur.

Böylece sistem siyah-beyaz kararlar yerine daha insani ve yaratıcı çözümler üretir.

7. Hard Constraint ve Soft Utility ayrımı

Her şey utility puanı değildir.

Bazı eylemler kesinlikle yapılamaz.

Hard constraints
Fiziksel olarak imkânsız
Gerekli eşya yok
NPC baygın
Kapı kilitli ve anahtar yok
Karakter olaydan haberdar değil
Çocuk profili için uygunsuz içerik
Dünya kuralına aykırı

Bunlar puanı düşürmek yerine eylemi geçersiz kılmalıdır.

type ConstraintResult = {
  allowed: boolean;
  failedConstraints: string[];
};

Örnek:

{
  "allowed": false,
  "failedConstraints": [
    "actor_does_not_know_target_location",
    "required_item_missing"
  ]
}
Soft utility

Eylem yapılabilir, fakat:

Riskli,
Pahalı,
Korkutucu,
Zaman alıcı,
Sosyal olarak uygunsuz

olabilir.

Bunlar utility vektöründe değerlendirilir.

8. Bilgi sınırı

Utility Evaluator dünya üzerindeki tüm gerçekleri kullanmamalıdır.

NPC yalnızca bildiği, algıladığı veya tahmin ettiği verilere göre karar vermelidir.

Gerçek dünya durumu:

{
  "foxCondition": "poisoned",
  "nearbyPlant": "antidote_herb"
}

Fakat NPC bunları bilmiyorsa değerlendirmede doğrudan kullanılamaz.

NPC algısı:

{
  "foxConditionBelief": {
    "value": "injured",
    "confidence": 0.65
  },
  "nearbyPlantBelief": null
}

Evaluator şu veriyle çalışmalıdır:

Objective World State
        ↓
Perception Filter
        ↓
Belief State
        ↓
Utility Evaluation

Bu ayrım olmazsa NPC’ler her şeyi bilen yapay karakterler gibi davranır.

9. Belirsizlik değerlendirmesi

Her utility boyutu kesin bir sayı olmak zorunda değildir.

type UtilityValue = {
  expected: number;
  confidence: number;
  variance?: number;
};

Örneğin tilkiye yaklaşmanın güvenlik etkisi:

{
  "expected": -0.35,
  "confidence": 0.45,
  "variance": 0.50
}

NPC tilkinin saldırıp saldırmayacağını bilmiyor olabilir.

Bu durumda NPC’nin risk yaklaşımı önem kazanır.

type RiskProfile = {
  tolerance: number;
  uncertaintyAversion: number;
  lossSensitivity: number;
};

İki NPC aynı beklenen sonuca rağmen farklı davranabilir:

Cesur NPC belirsizliği kabul eder.
Kaygılı NPC düşük güvenilirliği tehlike olarak görür.
Meraklı NPC belirsizliği olumlu bile değerlendirebilir.
10. Beklenen sonuç simülasyonu

Utility Evaluator yalnızca eylemin anlık etkisine bakmamalıdır.

Eylem
 ├─ Anlık sonuç
 ├─ Yakın gelecek sonucu
 └─ Uzun vadeli sonucu

Örneğin tilkiye yardım etmek:

Anlık
{
  "safety": -0.25,
  "resourceEfficiency": -0.30,
  "compassion": 0.90
}
Yakın gelecek
{
  "socialBond": 0.60,
  "goalProgress": -0.15
}
Uzun vadeli
{
  "worldImpact": 0.55,
  "socialBond": 0.75,
  "narrativeValue": 0.65
}

Bunlar ayrı tutulmalıdır.

type TemporalUtility = {
  immediate: UtilityVector;
  shortTerm: UtilityVector;
  longTerm: UtilityVector;
};

NPC’nin zaman ufku da tercihlerini etkiler.

type TimePreference = {
  immediateWeight: number;
  shortTermWeight: number;
  longTermWeight: number;
};

Sabırsız bir karakter:

{
  "immediateWeight": 1.4,
  "shortTermWeight": 0.7,
  "longTermWeight": 0.2
}

Bilge bir karakter:

{
  "immediateWeight": 0.8,
  "shortTermWeight": 1.0,
  "longTermWeight": 1.3
}
11. Zaman baskısı

Daha önce konuştuğumuz zaman etkisi burada doğrudan kullanılabilir.

Yaralı tilkinin durumu:

{
  "health": 0.35,
  "bleedingRate": 0.04,
  "timeSensitivity": 0.9
}

Eylem geciktikçe utility değişir.

Şimdi yardım et:
urgencyResponse = 0.95

2 saat sonra yardım et:
urgencyResponse = 0.55

1 gün sonra yardım et:
eylem artık geçersiz olabilir

Utility Evaluator, değerlendirme zamanını açık biçimde almalıdır:

evaluateUtility({
  actorId,
  action,
  beliefState,
  evaluationTime,
  predictionHorizon
});
12. Kaynakların marjinal değeri

Bir eşyanın harcanması her zaman aynı utility kaybını oluşturmamalıdır.

NPC’de 20 yiyecek varsa birini tilkiye vermekle, son yiyeceğini vermek aynı değildir.

function calculateResourceCost(
  currentAmount: number,
  consumedAmount: number,
  scarcity: number
): number;

Örnek:

10 elmadan 1 elma vermek:
resourceEfficiency = -0.10

1 elmadan sonuncusunu vermek:
resourceEfficiency = -0.85

Ayrıca kaynağın gelecek planlardaki önemi de hesaba katılmalıdır.

{
  "resource": "healing_herb",
  "currentAmount": 1,
  "expectedFutureNeed": 0.8,
  "replacementDifficulty": 0.9
}

Bu durumda kullanmanın maliyeti oldukça yüksek olur.

13. Sosyal ve gözlemsel etkiler

NPC yalnızken yaptığı eylemle, başkaları izlerken yaptığı eylemi farklı değerlendirebilir.

type SocialContext = {
  observers: string[];
  authorityPresent: boolean;
  groupNorms: Vector;
  reputationSensitivity: number;
};

Örneğin korkak bir NPC, küçük kardeşi izliyorsa cesur davranmaya çalışabilir.

{
  "socialBond": 0.35,
  "responsibility": 0.40,
  "emotionalFit": -0.10,
  "reputation": 0.25
}

Buradaki önemli nokta şudur:

NPC yardım etmek istemediği halde, iyi görünmek için yardım edebilir.

Bu nedenle:

Eylemin dış sonucu

ile:

Eylemin iç motivasyonu

ayrı tutulmalıdır.

14. Motivasyon izi

Evaluator her yüksek veya düşük değerin kaynağını saklamalıdır.

type UtilityContribution = {
  dimension: string;
  value: number;
  sourceType:
    | "base_action"
    | "trait"
    | "emotion"
    | "relationship"
    | "memory"
    | "context"
    | "goal"
    | "social_norm"
    | "prediction";
  sourceId?: string;
  explanation: string;
};

Örneğin:

[
  {
    "dimension": "compassion",
    "value": 0.55,
    "sourceType": "trait",
    "sourceId": "trait_gentle",
    "explanation": "Karakterin şefkat eğilimi yaralı canlılara yardım etme isteğini artırdı."
  },
  {
    "dimension": "safety",
    "value": -0.40,
    "sourceType": "memory",
    "sourceId": "memory_fox_bite",
    "explanation": "Geçmişte bir tilki tarafından ısırılması yaklaşma riskini büyüttü."
  }
]

Bu kayıt sayesinde sistem:

Neden bu kararı verdiğini açıklayabilir.
Hatalı davranışları debug edebilir.
Hikâye anlatıcısına iç monolog sağlayabilir.
Ebeveyn görünümünde kararın gelişimini gösterebilir.
Aynı kararın tekrar tekrar anlamsız biçimde verilmesini analiz edebilir.
15. Utility Evaluator sonucu

Tam çıktı şu yapıda olabilir:

type UtilityEvaluationResult = {
  actionId: string;
  actorId: string;

  constraintResult: {
    allowed: boolean;
    failedConstraints: string[];
  };

  rawUtility: TemporalUtility;
  weightedUtility: TemporalUtility;

  confidence: number;
  uncertainty: number;

  dominantBenefits: UtilityDimensionScore[];
  dominantCosts: UtilityDimensionScore[];

  conflicts: UtilityConflict[];

  contributions: UtilityContribution[];

  refinementRequest?: {
    preserveDimensions: string[];
    reduceCosts: string[];
  };

  evaluationSummary: string;
};

Örnek:

{
  "actionId": "help_injured_fox",
  "actorId": "mira",
  "constraintResult": {
    "allowed": true,
    "failedConstraints": []
  },
  "confidence": 0.68,
  "uncertainty": 0.32,
  "dominantBenefits": [
    {
      "dimension": "compassion",
      "score": 1.42
    },
    {
      "dimension": "urgencyResponse",
      "score": 1.08
    }
  ],
  "dominantCosts": [
    {
      "dimension": "safety",
      "score": -0.81
    },
    {
      "dimension": "resourceEfficiency",
      "score": -0.52
    }
  ],
  "conflicts": [
    {
      "positiveDimension": "compassion",
      "negativeDimension": "safety",
      "strength": 0.84,
      "interpretation": "Mira yardım etmek istiyor fakat tilkiye yaklaşmaktan korkuyor."
    }
  ],
  "refinementRequest": {
    "preserveDimensions": [
      "compassion",
      "urgencyResponse"
    ],
    "reduceCosts": [
      "safety",
      "resourceEfficiency"
    ]
  },
  "evaluationSummary": "Eylem Mira'nın şefkat eğilimiyle güçlü biçimde uyumlu, ancak geçmiş deneyimi ve gece koşulları ciddi güvenlik kaygısı oluşturuyor."
}
16. Nihai puana geçiş

Decision Selector bir noktada adayları sıralamak için bileşik bir değere ihtiyaç duyacaktır. Ancak bu değer Utility Evaluator’ın ana çıktısı değil, türetilmiş bir değer olmalıdır.

Örnek:

type SelectionScore = {
  total: number;
  positiveUtility: number;
  negativeUtility: number;
  conflictPenalty: number;
  uncertaintyPenalty: number;
  urgencyBonus: number;
};

Basitleştirilmiş formül:

Total =
  Σ weighted positive dimensions
  + urgency bonus
  - Σ weighted negative dimensions
  - uncertainty penalty
  - unresolved conflict penalty

Fakat bazı boyutların birbirini telafi etmesine izin verilmemelidir.

Örneğin:

Çok yüksek narrativeValue,
ölümcül güvenlik riskini otomatik olarak kapatmamalıdır.

Bu nedenle bazı boyutlara eşik koymalıyız.

type UtilityGuardrail = {
  dimension: string;
  minimum?: number;
  maximum?: number;
  response: "reject" | "penalize" | "require_refinement";
};

Örneğin:

{
  "dimension": "safety",
  "minimum": -0.8,
  "response": "require_refinement"
}
17. Önerilen Utility Evaluator modülleri
UtilityEvaluator
├── ConstraintEvaluator
├── BaseUtilityResolver
├── CapabilityEvaluator
├── ContextModifierResolver
├── RelationshipModifierResolver
├── MemoryModifierResolver
├── EmotionModifierResolver
├── GoalAlignmentEvaluator
├── ResourceCostEvaluator
├── TemporalUtilityPredictor
├── RiskAndUncertaintyEvaluator
├── SocialImpactEvaluator
├── ConflictDetector
├── ActionRefinementAdvisor
└── ExplanationBuilder

İlk sürümde bunların hepsini ayrı servis yapmak gerekmez. Mantıksal modüller olarak başlayabiliriz.

18. İlk sürüm için sadeleştirme

İlk uygulamada sistemi gereğinden fazla büyütmeden şu çekirdekle başlayabiliriz:

Utility boyutları
safety
compassion
curiosity
socialBond
goalProgress
resourceCost
urgency
worldImpact
Değerlendirme kaynakları
base action
actor traits
current emotions
relationships
active memories
environment context
current goals
time pressure
Çıktılar
utility vector
weighted utility vector
dominant benefits
dominant costs
conflicts
explanation trace

Daha sonra:

Uzun vadeli tahmin,
Belirsizlik dağılımları,
Sosyal normlar,
İtibar,
Action refinement,
Öğrenilen utility modelleri

eklenebilir.