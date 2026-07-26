Action Execution Engine

Action Execution Engine’in görevi:

Decision Selector tarafından seçilen eylemi, dünya içinde uygulanabilir adımlara dönüştürmek; süreç boyunca kesintileri, başarısızlıkları, kısmi sonuçları ve oluşan yeni dünya durumunu yönetmek.

Decision Engine yalnızca:

Ne yapılmalı?

sorusunu cevaplar.

Execution Engine ise:

Bu eylem dünyada gerçekten nasıl gerçekleşecek?

sorusunu cevaplar.

Temel akış:

Selected Action
      ↓
Execution Planning
      ↓
Precondition Validation
      ↓
Primitive Steps
      ↓
Step Execution
      ↓
Interrupt / Failure Handling
      ↓
Effects
      ↓
World State Update
      ↓
Memory, Emotion, Trait and Goal Updates
1. Seçilen eylem doğrudan uygulanmamalı

Örneğin Decision Selector şu eylemi seçti:

Yaralı tilkiye şifalı otla yardım et.

Bu tek bir motor hareketi değildir.

Alt adımlar içerebilir:

1. Tilkiye güvenli mesafeden yaklaş
2. Tilkinin davranışını gözlemle
3. Şifalı otu çantadan çıkar
4. Tilkinin yarasını kontrol et
5. Otu uygun biçimde uygula
6. Tilkinin tepkisini gözlemle
7. Gerekirse geri çekil

Bu nedenle seçilen tactical eylem, primitive veya executable step’lere ayrılmalıdır.

2. Execution Plan
type ExecutionPlan = {
  planId: string;
  actorId: string;
  sourceActionId: string;

  steps: ExecutionStep[];

  currentStepIndex: number;

  expectedDuration: number;
  expectedResourceUsage: ResourceUsage[];

  interruptibility: number;
  reversibility: number;

  successConditions: Condition[];
  failureConditions: Condition[];

  fallbackActions: string[];

  status:
    | "pending"
    | "running"
    | "paused"
    | "interrupted"
    | "completed"
    | "failed"
    | "cancelled";
};

Örnek:

{
  "planId": "exec_plan_204",
  "actorId": "mira",
  "sourceActionId": "help_fox_with_herb",
  "currentStepIndex": 0,
  "expectedDuration": 240,
  "interruptibility": 0.75,
  "reversibility": 0.40,
  "status": "pending"
}
3. Execution Step

Her adım kendi koşullarına ve etkilerine sahip olmalıdır.

type ExecutionStep = {
  stepId: string;
  stepType: string;

  targetIds: string[];
  parameters: Record<string, unknown>;

  preconditions: Condition[];

  duration: number;
  effortCost: number;

  resourceCosts: ResourceUsage[];

  successProbability?: number;

  expectedEffects: Effect[];
  possibleFailureEffects: Effect[];

  interruptible: boolean;
  retryable: boolean;

  status:
    | "pending"
    | "running"
    | "succeeded"
    | "failed"
    | "skipped"
    | "interrupted";
};

Örnek:

{
  "stepId": "step_03",
  "stepType": "remove_item_from_inventory",
  "targetIds": ["healing_herb_04"],
  "preconditions": [
    {
      "type": "inventory_contains",
      "entityId": "healing_herb_04"
    }
  ],
  "duration": 4,
  "effortCost": 0.01,
  "resourceCosts": [],
  "interruptible": true,
  "retryable": true,
  "status": "pending"
}
4. Primitive step ile narrative step ayrımı

Her şey çok düşük seviyeli motor hareketine indirgenmemelidir.

Yanlış örnek:

Sağ ayağı kaldır
Sağ ayağı öne koy
Ağırlığı aktar
Sol ayağı kaldır

Bu düzey yalnızca fizik veya animasyon motorunun sorumluluğudur.

Execution Engine için uygun primitive seviye:

Hedefe yaklaş
Eşyayı çıkar
Nesneyi incele
Yaraya otu uygula
Geri çekil

Yani burada “primitive” kelimesi, karar sistemi açısından atomik eylem anlamına gelmelidir.

5. Preconditions tekrar kontrol edilmeli

Eylem seçildiğinde koşullar doğru olabilir. Ancak uygulama başlamadan önce dünya değişmiş olabilir.

Örneğin:

Tilki hâlâ orada mı?
Şifalı ot hâlâ çantada mı?
Mira hâlâ hareket edebiliyor mu?
Yaklaşılacak yol açık mı?
Yeni bir tehdit çıktı mı?

Bu nedenle her execution plan başlamadan önce precondition validation yapılmalıdır.

type PreconditionValidationResult = {
  valid: boolean;

  satisfied: Condition[];
  failed: Condition[];
  unknown: Condition[];

  recoverable: boolean;
  suggestedRecoveryActions: string[];
};
6. Failed ve unknown ayrımı

Koşulun yanlış olmasıyla doğrulanamaması farklıdır.

Failed
Şifalı ot çantada değil.
Tilki bölgeden ayrılmış.
Mira baygın.
Yol tamamen kapanmış.
Unknown
Tilkinin saldırgan olup olmadığı bilinmiyor.
Bitkinin doğru ot olup olmadığı kesin değil.
Karanlık nedeniyle yolun açık olup olmadığı görünmüyor.

Unknown durumlarında plan doğrudan iptal edilmemelidir.

Şu seçeneklerden biri üretilebilir:

Bilgi topla
Daha dikkatli ilerle
Başka yöntem kullan
Risk kabul ederek devam et
7. Execution başlamadan yeniden karar verme

Bazı precondition değişiklikleri küçük olabilir.

Örneğin:

Tilki 4 metre yerine 6 metre uzakta.

Plan güncellenerek devam edebilir.

Bazıları ise eylemin anlamını tamamen değiştirir.

Örneğin:

Tilki artık bir kurt sürüsü tarafından çevrilmiş.

Bu durumda Execution Engine kendi başına devam etmemelidir.

Execution Engine
      ↓
Replan Required
      ↓
Decision Engine

Bu ayrım için:

type ReplanTrigger = {
  severity: number;
  invalidatedAssumptions: string[];
  affectedGoals: string[];
  immediateThreat: number;
};
8. Execution sırasında dünya değişebilir

Eylem birkaç saniye veya birkaç saat sürebilir.

Bu süre boyunca:

Başka NPC’ler hareket eder.
Hava değişebilir.
Hedef uzaklaşabilir.
Yeni olaylar başlayabilir.
Kaynaklar tüketilebilir.
Aktör yorulabilir.
Dünya simülasyonu ilerler.

Bu nedenle execution tek seferlik atomik güncelleme olmamalıdır.

Start Step
   ↓
Advance Time
   ↓
Apply Progressive Costs
   ↓
Check Interrupts
   ↓
Resolve Outcome
   ↓
Apply Effects
9. Progressive execution

Uzun eylemler tek anda tamamlanmamalıdır.

Örneğin:

Köye yardım getirmek için git

20 dakika sürüyorsa:

0–5 dakika: ormandan çıkış
5–15 dakika: köy yolunda ilerleme
15–20 dakika: şifacıyı bulma

Bu süreçte tilkinin durumu kötüleşebilir.

type ProgressState = {
  progress: number;
  elapsedTime: number;
  remainingTime: number;

  accumulatedCosts: ResourceUsage[];
  intermediateEffects: Effect[];
};
10. Execution tick modeli

Execution Engine dünya zamanına bağlı çalışabilir.

type ExecutionTick = {
  worldTime: number;
  deltaTime: number;

  activeStepId: string;
  progressBefore: number;
  progressAfter: number;

  appliedCosts: ResourceUsage[];
  triggeredEvents: string[];
};

Her tick gerçek zamanlı olmak zorunda değildir.

Örnek:

Basit konuşma: tek tick
Kısa hareket: 2–3 tick
Uzun yolculuk: büyük zaman sıçramaları
Kritik sahne: küçük tick’ler

Detay seviyesi olayın önemine göre değişebilir.

11. Interrupt sistemi

Eylemler kesintiye uğrayabilir.

Kesinti kaynakları:

Yeni tehdit
Hedefin hareket etmesi
Başka NPC’nin müdahalesi
Fiziksel engel
Duygusal çöküş
Yeni bilgi
Kaynak kaybı
Öncelikli hedef değişimi
Dünya olayı
type ExecutionInterrupt = {
  interruptId: string;
  sourceType:
    | "world_event"
    | "actor_state"
    | "target_change"
    | "social_intervention"
    | "goal_change"
    | "resource_failure";

  severity: number;
  urgency: number;

  affectedStepId: string;

  suggestedResponse:
    | "ignore"
    | "pause"
    | "adapt"
    | "abort"
    | "replan";
};
12. Her kesinti planı iptal etmemeli

Kesintiler farklı seviyelerde ele alınmalıdır.

Minor interrupt
Kısa bir ses duyuldu.
Hafif yağmur başladı.
Hedef biraz yer değiştirdi.

Plan adapte edilerek devam edebilir.

Moderate interrupt
Tilki hırladı.
Mira korkusu yükseldi.
Yaklaşma yolu değişti.

Plan duraklatılır, mevcut step yeniden değerlendirilir.

Major interrupt
Kurt sürüsü geldi.
Mira yaralandı.
Tilki kaçtı.

Plan sonlandırılır ve Decision Engine tekrar çağrılır.

13. Adaptation

Execution Engine küçük değişikliklerde tam karar döngüsüne dönmeden planı uyarlayabilmelidir.

Örnek:

Plan:
Tilkiye üç metre yaklaş.

Değişiklik:
Tilki bir metre geri çekildi.

Adaptasyon:

Yeni hedef mesafe hesapla.
Daha yavaş yaklaş.
type ExecutionAdaptation = {
  originalStepId: string;
  modifiedParameters: Record<string, unknown>;
  reason: string;
  utilityRiskChange: number;
};

Ancak adaptasyon yeni bir stratejik karar oluşturmamalıdır.

Yaklaşma hızını değiştirmek:
Execution adaptation

Tilkiye yardım etmek yerine köye dönmek:
Decision Engine kararı
14. Başarı ikili olmamalı

Eylemler yalnızca:

başarılı
başarısız

olmamalıdır.

Daha gerçekçi sonuç türleri:

type ExecutionOutcomeType =
  | "full_success"
  | "partial_success"
  | "success_with_cost"
  | "temporary_success"
  | "failed_safely"
  | "failed_with_consequence"
  | "aborted"
  | "interrupted";

Örnek:

Şifalı otu uyguladı ama tilki tamamen iyileşmedi.

Bu:

partial_success

olabilir.

15. Kısmi başarı

Kısmi başarı dünya state’ine gerçek etkiler bırakmalıdır.

Örnek:

{
  "before": {
    "foxHealth": 0.28,
    "foxPain": 0.80,
    "foxTrustTowardMira": 0.15
  },
  "after": {
    "foxHealth": 0.36,
    "foxPain": 0.58,
    "foxTrustTowardMira": 0.42
  }
}

Tilki tamamen iyileşmemiştir ama eylem boşa gitmemiştir.

Bu durum yeni hedef üretebilir:

Tilki için şifacı bul.
16. Success with cost

Eylem başarılı olabilir fakat bedel doğurabilir.

Örnek:

Mira tilkiyi kurtardı fakat son şifalı otunu kullandı.

Sonuç:

{
  "outcome": "success_with_cost",
  "effects": {
    "foxHealth": 0.45,
    "inventoryHealingHerb": 0,
    "miraFatigue": 0.18
  }
}

Bu bedel sonraki kararlarda önem kazanmalıdır.

17. Başarısızlık nedeni

Başarısızlık rastgele bir zar atışı gibi görünmemelidir.

Başarısızlık kaynakları açıklanabilir olmalıdır.

type FailureCause =
  | "insufficient_skill"
  | "insufficient_resource"
  | "bad_information"
  | "environmental_change"
  | "target_resistance"
  | "interruption"
  | "bad_luck"
  | "overconfidence"
  | "execution_error";

Örnek:

{
  "outcome": "failed_with_consequence",
  "failureCause": "bad_information",
  "explanation": "Mira doğru olduğunu düşündüğü fakat etkisiz olan bir bitki kullandı."
}
18. Rastlantısallık kontrollü olmalı

Bazı eylemlerde belirsizlik bulunabilir.

successProbability =
  capability
  * informationQuality
  * environmentalSupport
  * targetCooperation;

Ancak bu doğrudan basit çarpım olmak zorunda değildir.

Örnek bileşenler:

Skill match
Physical condition
Tool quality
Environmental difficulty
Target resistance
Plan quality
Information confidence
Luck
type ExecutionChanceProfile = {
  competenceScore: number;
  conditionScore: number;
  toolScore: number;
  informationScore: number;
  environmentScore: number;
  targetCooperation: number;
  stochasticVariance: number;
};
19. Beceri sistemi

Bir eylemin başarısı yalnızca trait’lere bağlı olmamalıdır.

Cesaret:
Eylemi seçme eğilimini etkiler.

Beceri:
Eylemi başarıyla uygulama ihtimalini etkiler.

Örneğin Mira çok merhametli ve cesur olabilir ama şifacılık bilgisi düşük olabilir.

type SkillState = {
  skillId: string;
  level: number;
  confidence: number;
  experience: number;
};

Örnek:

{
  "basic_healing": {
    "level": 0.32,
    "confidence": 0.45,
    "experience": 4
  }
}
20. Skill growth

Eylem uygulamak beceriyi geliştirebilir.

Trait Evolution:
Karakterin kim olduğunu değiştirir.

Skill Learning:
Karakterin ne kadar iyi yapabildiğini değiştirir.

Örneğin:

Tilkiye yardım etmeyi seçmek:
compassion ve courage etkisi

Otu doğru uygulamak:
healing skill etkisi
type SkillExperienceEvent = {
  skillId: string;
  difficulty: number;
  successLevel: number;
  feedbackQuality: number;
  experienceGain: number;
};

Başarısız denemeler de öğrenme üretebilir.

21. Kaynak tüketimi

Kaynaklar yalnızca plan tamamlandığında tüketilmemelidir.

Örneğin şifalı ot uygulandıktan sonra plan kesilirse ot geri gelmez.

Kaynak tüketim türleri:

type ResourceUsageMode =
  | "reserve"
  | "consume_on_start"
  | "consume_progressively"
  | "consume_on_success"
  | "damage_on_failure";

Örnek:

{
  "resourceId": "healing_herb_04",
  "amount": 1,
  "usageMode": "consume_on_start"
}
22. Kaynak rezervasyonu

Aynı eşya iki farklı aktif plan tarafından kullanılamamalıdır.

Örneğin Mira’nın tek şifalı otu varsa:

Tilkiye otu kullan

planı başlatıldığında eşya reserve edilmelidir.

type ResourceReservation = {
  resourceId: string;
  actorId: string;
  executionPlanId: string;
  amount: number;
  status: "reserved" | "consumed" | "released";
};

Plan başlamazsa rezervasyon kaldırılır.

23. Eylem geri alınabilirliği

Bazı eylemler kolayca geri alınabilir.

Tilkiye yaklaşmak
Beklemek
Soru sormak

Bazıları geri alınamaz.

Son şifalı otu kullanmak
Bir sırrı açıklamak
Köprüyü yıkmak
Birini suçlamak
type ReversibilityProfile = {
  reversibility: number;
  recoveryCost: number;
  irreversibleEffects: string[];
};

Düşük reversibility yüksek karar önemi oluşturur ve execution öncesi ekstra doğrulama gerektirebilir.

24. Commit point

Bazı planlarda belirli bir noktadan sonra geri dönmek pahalı veya imkânsızdır.

Şifalı otu çıkarmak:
geri alınabilir

Otu yaraya sürmek:
commit point
type CommitPoint = {
  stepId: string;
  consequencesAfterCommit: string[];
  confirmationPolicy:
    | "none"
    | "internal_recheck"
    | "decision_revalidation";
};

NPC sistemi için kullanıcı onayı gerekmez ama Decision Engine kısa bir yeniden doğrulama yapabilir.

25. Aktörün state değişimleri

Execution boyunca aktörün durumu değişir.

Enerji azalır
Korku artar veya düşer
Güven oluşur
Açlık artar
Acı oluşur
Dikkat dağılır
Kararlılık artar
type ActorExecutionEffects = {
  physical: StateDelta[];
  emotional: StateDelta[];
  cognitive: StateDelta[];
  social: StateDelta[];
};

Örneğin tilkiye yaklaşırken:

{
  "fear": 0.08,
  "focus": 0.05,
  "fatigue": 0.02
}

Tilkinin sakin kaldığını görünce:

{
  "fear": -0.12,
  "confidence": 0.06
}
26. Hedefin tepkisi

Bir eylemin hedefi pasif nesne olmayabilir.

Tilki:

Kaçabilir
Hırlayabilir
Sakinleşebilir
Isırmaya çalışabilir
Yardımı kabul edebilir

Bu nedenle bazı execution step’leri karşılıklı etkileşimdir.

type InteractionResolution = {
  initiatorAction: string;
  responderReaction: string;
  combinedOutcome: Effect[];
};

Örnek:

Mira yavaşça yaklaştı.
Tilki hırladı ve geri çekildi.
Mira durdu.

Execution planı adapte edilebilir:

Daha fazla yaklaşma.
Yiyeceği yere bırak.
27. Karşılıklı eylemler

İki NPC aynı anda birbirini etkileyebilir.

Mira tilkiye yaklaşır.
Tilki kaçmaya çalışır.

Bu durumda sonuç yalnızca Mira’nın planına göre belirlenmemelidir.

type ContestedActionResolution = {
  actorIntent: ActionIntent;
  targetIntent: ActionIntent;

  actorCapability: number;
  targetCapability: number;

  environmentalFactors: number;

  outcome: string;
};

Bu yapı ileride sosyal çatışmalar ve fiziksel yarışlar için de kullanılabilir.

28. Sosyal eylem execution

Konuşma eylemleri de execution planına sahip olabilir.

Örnek:

Şifacıdan yardım iste.

Alt adımlar:

1. Şifacıya ulaş
2. Dikkatini çek
3. Durumu anlat
4. İsteği ilet
5. Cevabı bekle

Başarı sadece konuşmanın gerçekleşmesi değildir.

Şifacı:

Kabul edebilir
Reddedebilir
Şart koşabilir
Daha fazla bilgi isteyebilir
Başkasını önerebilir

Dolayısıyla sosyal eylemler target decision üretmelidir.

Mira’nın social action’ı
        ↓
Şifacı için Decision Context
        ↓
Şifacının Decision Engine’i
        ↓
Response
29. Execution sırasında yeni karar noktaları

Bazı eylemler dallanabilir.

Örneğin Mira tilkiye yaklaştı ve tilkinin bacağında tuzak gördü.

Bu bilgi başlangıçta yoktu.

Yeni seçenekler:

Tuzağı açmaya çalış
Köyden yardım getir
Tilkiyi sakinleştir
Avcıyı bul

Bu noktada mevcut plan otomatik devam etmemelidir.

type MidExecutionDecisionPoint = {
  discoveredFacts: BeliefUpdate[];
  invalidatedSteps: string[];
  newCandidateTriggers: string[];
};

Execution duraklatılır ve yeni karar üretilir.

30. Belief update

Execution yalnızca world state’i değil, NPC’nin belief state’ini de günceller.

Örnek:

Mira tilkiye yaklaşınca tilkinin saldırgan olmadığını gördü.

Belief değişimi:

{
  "belief": "fox_is_aggressive",
  "previousConfidence": 0.60,
  "newConfidence": 0.18
}

Yeni belief sonraki Utility Evaluation’ı değiştirir.

31. Observation results

Her execution sonucu dünya hakkında bilgi üretebilir.

type ObservationResult = {
  observerId: string;
  observedEntityId: string;

  facts: ObservedFact[];

  perceptionConfidence: number;
  interpretationConfidence: number;
};

Gözlenen gerçek ile yorum ayrılmalıdır.

Gözlem:
Tilki dişlerini gösterdi.

Yorum:
Tilki saldırmak üzere.

Bu yorum yanlış olabilir.

32. Effect sistemi

Execution sonucunda etkiler standart bir yapıda üretilmelidir.

type Effect =
  | StateChangeEffect
  | InventoryEffect
  | RelationshipEffect
  | BeliefEffect
  | GoalEffect
  | MemoryEffect
  | EnvironmentEffect
  | EventEffect
  | TraitEvidenceEffect
  | SkillExperienceEffect;

Bu yapı diğer motorlara olay aktarımını kolaylaştırır.

33. State change effect
type StateChangeEffect = {
  type: "state_change";
  entityId: string;
  path: string;
  operation: "add" | "set" | "multiply";
  value: number;
  reason: string;
};

Örnek:

{
  "type": "state_change",
  "entityId": "fox_12",
  "path": "physical.health",
  "operation": "add",
  "value": 0.12,
  "reason": "Şifalı ot yaranın etkisini azalttı."
}
34. Relationship effect
type RelationshipEffect = {
  type: "relationship_change";
  sourceId: string;
  targetId: string;
  dimension: string;
  delta: number;
  reason: string;
};

Örnek:

{
  "type": "relationship_change",
  "sourceId": "fox_12",
  "targetId": "mira",
  "dimension": "trust",
  "delta": 0.22,
  "reason": "Mira tilkinin yarasına yardım etti."
}

İlişki değişimi simetrik olmak zorunda değildir.

Mira’nın tilkiye güveni değişmeyebilir.
Tilkinin Mira’ya güveni artabilir.
35. Goal effect

Execution mevcut hedefleri ilerletebilir, tamamlayabilir veya yeni hedef oluşturabilir.

type GoalEffect = {
  type: "goal_change";
  actorId: string;
  goalId: string;

  operation:
    | "progress"
    | "complete"
    | "fail"
    | "pause"
    | "create";

  value?: number;
  reason: string;
};

Örnek:

{
  "operation": "create",
  "goalId": "bring_healer_to_fox",
  "reason": "Tilkinin durumu yalnızca geçici olarak iyileşti."
}
36. Memory creation

Her execution hafızaya dönüşmemelidir.

Memory Engine şu kriterlere göre karar verebilir:

Duygusal yoğunluk
Yenilik
Kişisel önem
Karar etkisi
Sosyal önem
Beklenmedik sonuç
Trait veya kimlikle ilişkisi

Execution Engine yalnızca memory candidate üretmelidir.

type MemoryCandidate = {
  eventId: string;
  participants: string[];

  significance: number;
  emotionalIntensity: number;
  novelty: number;

  summary: string;
  rawFacts: string[];
};
37. Trait Evolution bağlantısı

Execution sonucunda Trait Evolution Engine’e kanıt gönderilir.

Örnek:

Karar:
Tilkiye yardım et.

Execution:
Mira korkmasına rağmen yaklaşmayı sürdürdü.
Tilki hırlayınca geri kaçmadı fakat güvenli mesafede durdu.

Bu execution ayrıntısı cesaret kanıtını güçlendirebilir.

Yani trait değişimi yalnızca seçilen karara değil, eylemin gerçekten uygulanış biçimine de bağlıdır.

Kararı aldı ama hiç uygulamadı:
zayıf trait kanıtı

Kararı zor koşullarda tamamladı:
güçlü trait kanıtı
38. Niyet ile tamamlanan eylem ayrımı

Decision Result:

Yardım etme niyeti

Execution Result:

Yardım etmeyi başardı mı?
Ne kadar ilerledi?
Ne zaman vazgeçti?
Neden vazgeçti?

Trait Evolution bunları ayrı ayrı değerlendirmelidir.

Örneğin:

Yardım etmeyi seçti.
İlk hırlamada vazgeçti.

Sonuç:

{
  "compassionEvidence": 0.55,
  "courageEvidence": 0.15,
  "avoidanceEvidence": 0.35
}
39. Execution Result
type ExecutionResult = {
  executionId: string;
  planId: string;

  actorId: string;
  sourceActionId: string;

  outcome: ExecutionOutcomeType;

  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];

  progress: number;

  appliedEffects: Effect[];
  unappliedExpectedEffects: Effect[];

  consumedResources: ResourceUsage[];

  interrupts: ExecutionInterrupt[];

  failureCause?: FailureCause;

  discoveredFacts: ObservedFact[];
  beliefUpdates: BeliefUpdate[];

  generatedGoals: string[];
  generatedMemoryCandidates: MemoryCandidate[];
  generatedTraitEvidence: TraitEvidence[];
  generatedSkillExperience: SkillExperienceEvent[];

  followUpRequired: boolean;
  replanRequired: boolean;

  summary: {
    internal: string;
    narrative: string;
    debug: string;
  };
};
40. Örnek tam execution

Seçilen eylem:

Güvenli mesafeden tilkiye elma bırak.

Plan:

1. Çantadan elmayı çıkar
2. Tilkiye yaklaşmadan uygun yer seç
3. Elmayı yere bırak
4. Birkaç adım geri çekil
5. Tilkinin tepkisini gözlemle

Execution:

Mira elmayı çıkardı.
Tilki hırlayınca daha fazla yaklaşmadı.
Elmayı bir kayanın yanına bıraktı.
Beş adım geri çekildi.
Tilki önce bekledi, sonra elmaya yaklaştı.

Sonuç:

{
  "outcome": "full_success",
  "progress": 1,
  "appliedEffects": [
    {
      "entity": "mira_inventory",
      "change": "apple -1"
    },
    {
      "entity": "fox_hunger",
      "change": "-0.18"
    },
    {
      "entity": "fox_trust_toward_mira",
      "change": "+0.10"
    },
    {
      "entity": "mira_fear",
      "change": "-0.04"
    }
  ],
  "followUpRequired": true,
  "generatedGoals": [
    "find_help_for_injured_fox"
  ]
}

Bu eylem tilkinin açlığını azaltır fakat yarayı çözmez.

41. Örnek başarısız execution

Seçilen eylem:

Tilkinin yarasına şifalı ot uygula.

Execution:

Mira yaklaştı.
Tilki hareket etti.
Mira otu düşürdü.
Tilki korkup çalılıkların arasına kaçtı.

Sonuç:

{
  "outcome": "failed_with_consequence",
  "progress": 0.45,
  "failureCause": "target_resistance",
  "effects": [
    {
      "healingHerbCondition": "dirty"
    },
    {
      "foxDistance": "+25m"
    },
    {
      "foxFearTowardMira": "+0.18"
    },
    {
      "miraConfidence": "-0.06"
    }
  ],
  "replanRequired": true
}

Ancak trait sonucu doğrudan negatif değildir.

Mira gerçekten denemiştir.

{
  "compassionEvidence": 0.72,
  "courageEvidence": 0.48,
  "healingSkillExperience": 0.05,
  "confidenceEffect": -0.06
}
42. Transaction ve event modeli

Dünya güncellemeleri tutarlı uygulanmalıdır.

Örneğin aynı execution içinde:

Elma tüketildi
Tilki açlığı azaldı
İlişki değişti
Yeni hedef oluştu

Bu etkiler tek event paketi olarak kaydedilebilir.

type WorldMutationTransaction = {
  transactionId: string;
  sourceExecutionId: string;

  effects: Effect[];

  validationStatus: "pending" | "valid" | "invalid";
  applicationStatus: "pending" | "applied" | "rolled_back";
};
43. Rollback her durumda doğru olmayabilir

Teknik transaction başarısız olursa rollback gerekir.

Fakat hikâye açısından bazı etkiler geri alınamaz.

Örneğin:

Mira elmayı attı.
Tam o anda execution servisi hata verdi.

Teknik sistem elmayı geri koymamalıdır.

Bu nedenle iki tür rollback ayırmalıyız:

Technical rollback
Narrative rollback

Narrative etkiler event log’dan yeniden oluşturulabilmelidir.

En güvenli yaklaşım:

Execution outcome önce event olarak kaydedilir.
World state eventlerden türetilir veya atomik uygulanır.
44. Event sourcing uyumu

Execution Engine doğal olarak event sourcing yapısına uygundur.

Örnek eventler:

ExecutionStarted
StepStarted
ItemReserved
ActorApproachedTarget
TargetReacted
ItemConsumed
StepCompleted
ExecutionCompleted
WorldEffectsApplied

Bu sayede:

Debug yapılabilir.
Hikâye yeniden oynatılabilir.
Dünya state’i yeniden oluşturulabilir.
Karar sonucu açıklanabilir.
Hatalı eventler izlenebilir.
45. Idempotency

Aynı execution sonucu iki kez uygulanmamalıdır.

type ExecutionCommand = {
  executionId: string;
  idempotencyKey: string;
};

Örneğin bağlantı sorunu nedeniyle aynı completion komutu tekrar gelirse:

Elma ikinci kez tüketilmemeli.
46. Execution güvenlik sınırları

Execution Engine seçilmiş olsa bile bazı eylemleri tekrar kontrol etmelidir.

Çocuk güvenliği
Dünya kuralları
Fiziksel sınırlar
İçerik politikaları
Yaş uygunluğu
Karakterin beden bütünlüğü

Decision Engine’deki guardrail’ler ilk savunmadır.

Execution Engine’deki guardrail’ler son savunmadır.

47. İlk sürüm için sade Execution Engine

İlk sürümde şu yapı yeterlidir:

1. Seçilen tactical action alınır
2. Template üzerinden 1–6 executable step üretilir
3. Preconditions tekrar kontrol edilir
4. Kaynaklar reserve edilir
5. Step’ler sırayla uygulanır
6. Her step sonrası interrupt kontrolü yapılır
7. Full, partial veya failed outcome üretilir
8. Etkiler world state’e uygulanır
9. Belief ve goal update’leri oluşturulur
10. Trait ve skill evidence yayınlanır
11. Gerekirse replan tetiklenir

Desteklenecek ilk outcome türleri:

full_success
partial_success
success_with_cost
failed_safely
failed_with_consequence
interrupted

İlk interrupt türleri:

new_threat
target_moved
resource_missing
actor_incapacitated
new_information
48. Önerilen modüller
ActionExecutionEngine
├── ExecutionPlanBuilder
├── StepTemplateResolver
├── PreconditionValidator
├── ResourceReservationManager
├── StepExecutor
├── ProgressManager
├── InterruptDetector
├── AdaptationResolver
├── OutcomeResolver
├── EffectBuilder
├── WorldMutationApplier
├── ObservationBuilder
├── BeliefUpdateBuilder
├── ExperiencePublisher
└── ExecutionExplanationBuilder

İlk sürümde bunlar ayrı servis değil, aynı modül içindeki bileşenler olabilir.

49. Temel prensipler

Decision Engine eylemi seçer; Execution Engine eylemin dünyada nasıl gerçekleştiğini belirler.

Seçilmiş olmak, eylemin hâlâ uygulanabilir olduğu anlamına gelmez; koşullar execution öncesinde ve sırasında yeniden doğrulanmalıdır.

Eylemler yalnızca başarılı veya başarısız olmaz; kısmi başarı, bedelli başarı ve güvenli başarısızlık gibi sonuçlar üretir.

Execution sırasında ortaya çıkan yeni bilgi, mevcut planı değiştirebilir veya yeni bir karar döngüsü başlatabilir.

Trait değişimi yalnızca niyetten değil, kararın gerçekten nasıl uygulandığından da etkilenir.

Dünya etkileri, kaynak tüketimi, ilişki değişimleri ve yeni hedefler açıklanabilir bir event zinciriyle kaydedilmelidir.