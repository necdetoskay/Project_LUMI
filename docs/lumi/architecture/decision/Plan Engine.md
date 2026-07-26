Plan Engine

Plan Engine’in görevi:

Goal Engine tarafından oluşturulan hedefleri, uygulanabilir adımlara, alt planlara, kaynak ihtiyaçlarına ve alternatif yollara dönüştürmek.

Temel ayrım:

Goal Engine:
Neye ulaşmak istiyorum?

Plan Engine:
Oraya nasıl ulaşabilirim?

Action Generator:
Şu anda hangi eylemleri düşünebilirim?

Decision Engine:
Bu anda hangi eylemi seçmeliyim?

Execution Engine:
Seçilen eylemi dünyada nasıl uygularım?

Plan Engine, karakterin geleceğe dönük niyetini temsil eder. Ancak plan değişmez bir senaryo değildir.

Plan = geçici yol haritası

Dünya değiştikçe plan:

uyarlanabilir
duraklatılabilir
yeniden sıralanabilir
kısmen korunabilir
veya tamamen değiştirilebilir

Tam akış:

Active Goal Portfolio
        ↓
Plan Need Detection
        ↓
Planning Context Construction
        ↓
Method Retrieval
        ↓
Goal Decomposition
        ↓
Plan Candidate Generation
        ↓
Constraint and Resource Analysis
        ↓
Plan Evaluation
        ↓
Plan Selection
        ↓
Execution Monitoring
        ↓
Repair / Replan / Abandon
1. Her hedef plan gerektirmez

Bazı hedefler doğrudan tek bir eylemle gerçekleştirilebilir.

Örnek:

Hedef:
Kapıyı kapat.

Eylem:
Kapıyı kapat.

Burada ayrı bir plan gereksizdir.

Ancak:

Hedef:
Tilki için şifacı getir.

şu adımları gerektirebilir:

Tilkinin konumunu işaretle
Köye giden güvenli yolu seç
Köye ulaş
Şifacıyı bul
Durumu anlat
Şifacıyı ikna et
Tilkinin yanına geri dön

Plan ihtiyacı şu faktörlerden doğabilir:

type PlanNeedAssessment = {
  actionCountEstimate: number;
  temporalLength: number;
  dependencyCount: number;
  uncertainty: number;
  resourceComplexity: number;
  coordinationNeed: number;
  risk: number;
  reversibility: number;
};

Aşağıdaki durumlarda plan oluşturulmalıdır:

Birden fazla bağımlı adım varsa
Hedef uzun sürüyorsa
Kaynak toplamak gerekiyorsa
Birden fazla NPC koordine olacaksa
Başarısızlık maliyeti yüksekse
Alternatif yol seçmek gerekiyorsa
Zamanlama önemliyse
2. Plan veri modeli
type Plan = {
  planId: string;
  actorId: string;

  goalIds: string[];

  planType:
    | "linear"
    | "branching"
    | "conditional"
    | "hierarchical"
    | "collaborative"
    | "maintenance"
    | "contingency";

  status:
    | "draft"
    | "candidate"
    | "active"
    | "paused"
    | "blocked"
    | "completed"
    | "failed"
    | "abandoned"
    | "superseded";

  steps: PlanStep[];

  currentStepIds: string[];
  completedStepIds: string[];
  failedStepIds: string[];

  dependencies: PlanDependency[];
  branches: PlanBranch[];

  resourceRequirements: PlanResourceRequirement[];
  reservations: string[];

  assumptions: PlanAssumption[];
  risks: PlanRisk[];

  expectedDuration: number;
  expectedCost: number;
  expectedSuccess: number;
  flexibility: number;
  robustness: number;

  fallbackPlanIds: string[];

  createdAt: number;
  updatedAt: number;

  explanation: PlanExplanation;
};
3. Plan step ile execution step ayrımı

Plan step, karakterin amaç seviyesindeki adımıdır.

Execution step ise fiziksel veya sosyal uygulama seviyesindeki adımdır.

Örnek plan:

1. Köye ulaş
2. Şifacıyı bul
3. Şifacıyı ikna et
4. Tilkinin yanına dön

Köye ulaş plan adımıdır.

Execution Engine bunu şu alt adımlara çevirebilir:

Patikaya çık
Köprüden geç
Kuzey yoluna dön
Köy kapısına ilerle

Bu ayrım önemlidir.

Plan Engine çok düşük seviyeye inerse:

planlar aşırı büyük
kırılgan
ve pahalı

hale gelir.

4. PlanStep
type PlanStep = {
  stepId: string;
  planId: string;

  stepType:
    | "action"
    | "subgoal"
    | "information"
    | "coordination"
    | "wait"
    | "check"
    | "decision_point";

  objective: GoalTargetState;

  suggestedActionTypes: string[];

  status:
    | "pending"
    | "available"
    | "active"
    | "completed"
    | "failed"
    | "blocked"
    | "skipped";

  preconditions: Condition[];
  successConditions: Condition[];
  failureConditions: Condition[];

  estimatedDuration: number;
  estimatedCost: number;
  expectedRisk: number;

  requiredResources: PlanResourceRequirement[];
  requiredCapabilities: string[];
  requiredKnowledge: string[];

  optional: boolean;
  repeatable: boolean;
  interruptible: boolean;

  priority: number;

  nextStepIds: string[];
  fallbackStepIds: string[];
};
5. Plan, sabit eylem dizisi olmamalı

Yanlış yaklaşım:

Adım 1 tamamlanır.
Adım 2 tamamlanır.
Adım 3 tamamlanır.

Daha doğru yaklaşım:

Adımlar koşullara göre kullanılabilir hale gelir.

Örneğin:

Şifacıyı bul

tamamlandıktan sonra iki olasılık vardır:

Şifacı gelmeyi kabul etti
→ Tilkinin yanına dön

Şifacı gelmeyi reddetti
→ Başka bir şifacı bul
→ Onu ikna edecek bilgi getir
→ Kendisi için gerekli malzemeyi bul

Bu yüzden plan bir graph olarak düşünülmelidir.

Plan = dependency graph + conditional branches
6. Linear plan

Basit ve düşük belirsizlikli planlarda kullanılabilir.

Elmayı al
Çantaya koy
Patikaya çık
Köye git
type LinearPlan = {
  orderedStepIds: string[];
};

Avantajı:

Basit
Ucuz
Açıklanabilir

Dezavantajı:

Dünya değişikliklerine karşı kırılgan
7. Branching plan

Bir adım farklı sonuçlar üretebiliyorsa dallanma gerekir.

Şifacıya durumu anlat
       ↓
 ┌─────┴─────────┐
Kabul eder      Reddeder
   ↓                ↓
Geri dön       İkna yöntemi ara
type PlanBranch = {
  branchId: string;
  sourceStepId: string;

  condition: Condition;
  nextStepId: string;

  probabilityEstimate?: number;
  branchImportance: number;
};

Plan Engine tüm olası dalları üretmemelidir.

Yalnızca:

yüksek olasılıklı
yüksek etkili
veya kritik riskli

dallar önceden planlanmalıdır.

8. Conditional plan

Bazı adımlar yalnızca belirli koşullarda uygulanır.

Tilkinin durumu kötüleşirse:
Şifacıyı hızla getir.

Tilki bölgeden ayrılırsa:
İzlerini takip et.

Fırtına başlarsa:
Önce güvenli barınak bul.
type ConditionalPlanRule = {
  condition: Condition;
  activateStepIds: string[];
  deactivateStepIds?: string[];
  priorityModifier?: number;
};
9. Hierarchical plan

Büyük hedefler katmanlı planlara ayrılabilir.

Ana hedef:
Tilkiyi kurtar

Plan:
1. Durumu değerlendir
2. Acil tehlikeyi azalt
3. Tedavi düzenle
4. İyileşmeyi takip et

Tedavi düzenle kendi alt planına sahip olabilir:

1. Tedavi bilgisi edin
2. Malzeme bul
3. Yardımcı bul
4. Tedaviyi uygula
type HierarchicalPlanNode = {
  nodeId: string;
  parentNodeId?: string;

  nodeType:
    | "plan"
    | "subplan"
    | "step";

  childNodeIds: string[];
  completionPolicy:
    | "all"
    | "any"
    | "threshold"
    | "ordered";
};

Hierarchical planning planın yönetilebilir kalmasını sağlar.

10. Planlama ufku

NPC bütün geleceği aynı ayrıntıyla planlamamalıdır.

Örnek:

Şimdi:
Tilkinin yerini işaretle.

Biraz sonra:
Köye ulaş.

Sonra:
Şifacıyı bul.

Daha sonra:
Tilkinin yanına dön.

İlk adımlar ayrıntılı, uzak adımlar soyut olmalıdır.

type PlanningHorizon = {
  nearTermDetail: number;
  mediumTermDetail: number;
  longTermDetail: number;

  maxDetailedSteps: number;
  maxAbstractSteps: number;
};

Bu yaklaşım:

partial-order planning
rolling horizon planning

mantığına yakındır.

LUMI için uygun prensip:

Yakın gelecek ayrıntılı, uzak gelecek niyet düzeyinde planlanmalıdır.

11. Rolling horizon

Plan yalnızca ilk birkaç adımı ayrıntılı üretir.

Örneğin:

Ayrıntılı:
1. Tilkinin konumunu işaretle
2. Kardeşini yanında tut
3. Güvenli patikaya çık

Soyut:
4. Köye ulaş
5. Şifacıyı getir

Köye yaklaşıldığında:

4 ve 5 yeniden ayrıntılandırılır.
type PlanExpansionRequest = {
  planId: string;
  abstractStepId: string;
  currentContext: PlanningContext;
  desiredDepth: number;
};

Bu yöntem:

gereksiz plan üretimini azaltır
güncel bilgiyi kullanır
plan kırılganlığını düşürür
12. Planning Context

Plan, objective world state’e göre değil NPC’nin belief state’ine göre oluşturulmalıdır.

type PlanningContext = {
  actorId: string;

  beliefState: BeliefState;
  activeGoals: Goal[];
  focusState: GoalFocusState;

  knownCapabilities: CapabilityState;
  knownResources: InventoryState;
  knownLocations: KnownLocation[];
  knownActors: KnownActorState[];

  activeCommitments: Commitment[];
  currentEmotions: EmotionVector;
  needs: NeedVector;

  currentPlans: Plan[];
  timeConstraints: TimeConstraint[];

  riskProfile: RiskProfile;
  planningTraits: {
    patience: number;
    impulsiveness: number;
    creativity: number;
    flexibility: number;
    persistence: number;
  };
};

NPC’nin planı yanlış bilgi üzerine kurulabilir.

Bu hata bug değildir.

Örnek:

NPC şifacının köyde olduğunu düşünüyor.
Gerçekte şifacı dağda.

Plan:

Köye git ve şifacıyı bul.

Execution sırasında varsayım yanlış çıkınca plan onarılır.

13. Plan assumptions

Her plan hangi varsayımlara dayandığını bilmelidir.

type PlanAssumption = {
  assumptionId: string;
  beliefId?: string;

  statement: string;
  confidence: number;

  criticality: number;
  validationPolicy:
    | "none"
    | "before_step"
    | "during_execution"
    | "continuous";

  invalidationEffect:
    | "minor_adjustment"
    | "step_repair"
    | "branch_change"
    | "full_replan";
};

Örnek:

{
  "statement": "Köy şifacısı şu anda köydedir.",
  "confidence": 0.62,
  "criticality": 0.84,
  "validationPolicy": "before_step",
  "invalidationEffect": "branch_change"
}

Bu, planın neden bozulduğunu açıklamayı sağlar.

14. Method library

Plan Engine her hedef için sıfırdan plan üretmemelidir.

Bilinen yöntemler kullanılabilir.

type PlanningMethod = {
  methodId: string;
  supportedGoalTypes: string[];

  requiredCapabilities: string[];
  requiredKnowledge: string[];
  requiredResources: string[];

  defaultSteps: MethodStepTemplate[];

  strengths: string[];
  weaknesses: string[];

  expectedRisk: number;
  expectedCost: number;
  expectedDuration: number;

  adaptability: number;
};

Örnek hedef:

Yaralı varlığı iyileştir

Yöntemler:

Doğrudan ilk yardım uygula
Şifacı getir
Hedefi şifacıya götür
Doğal iyileşmeyi destekle
Tehlikeyi azaltıp bekle

NPC yalnızca bildiği yöntemleri düşünmelidir.

15. Plan knowledge

Karakterlerin planlama repertuarları farklı olmalıdır.

Şifacı:

Yarayı temizle
Kanamayı durdur
Enfeksiyonu önle
Takip et

Çocuk:

Bir yetişkin çağır
Yiyecek bırak
Güvenli mesafede bekle
type PlanKnowledge = {
  actorId: string;
  knownMethodIds: string[];

  methodConfidence: Record<string, number>;
  pastMethodExperience: Record<string, number>;

  learnedVariants: LearnedPlanPattern[];
};

Bu sayede karakterler aynı hedef için farklı planlar üretir.

16. Memory tabanlı planlama

Geçmişte işe yarayan planlar tekrar kullanılabilir.

Mira daha önce yaralı kuş için şifacı getirmişti.

Yeni durumda:

Tilki için de şifacı getirme planı

akla gelebilir.

type LearnedPlanPattern = {
  patternId: string;

  situationPattern: string;
  goalPattern: string;

  planTemplateId: string;

  successHistory: number;
  failureHistory: number;
  confidence: number;

  contextualLimits: string[];
};

Ancak benzerlik yanlış kurulabilir.

Kuş için işe yarayan yöntem tilki için riskli olabilir.

Bu yüzden aktarım güveni tutulmalıdır.

17. Plan candidate generation

Tek bir plan üretmek yerine birkaç farklı plan adayı oluşturulabilir.

Örnek hedef:

Tilkiye yardım et.

Plan A:

Doğrudan tedavi et.

Plan B:

Yiyecek bırak ve şifacı getir.

Plan C:

Tilkiyi güvenli yere taşı.

Plan D:

Yanında bekle ve başka birinin gelmesini bekle.
type PlanCandidate = {
  candidateId: string;
  goalIds: string[];

  methodIds: string[];
  draftPlan: Plan;

  estimatedSuccess: number;
  estimatedCost: number;
  estimatedRisk: number;
  estimatedDuration: number;

  goalCoverage: number;
  robustness: number;
  flexibility: number;

  confidence: number;
};
18. Plan evaluation

Plan değerlendirmesi action utility’den farklıdır.

Action Utility:

Bir sonraki eylemin değeri

Plan Evaluation:

Birden fazla adımın toplam yol kalitesi

Değerlendirme boyutları:

type PlanEvaluation = {
  goalCoverage: number;
  expectedSuccess: number;
  expectedUtility: UtilityVector;

  totalCost: number;
  totalRisk: number;
  duration: number;

  robustness: number;
  flexibility: number;
  reversibility: number;

  informationDependency: number;
  coordinationComplexity: number;
  assumptionRisk: number;

  conflictResolution: number;
  regretRisk: number;

  confidence: number;
};
19. Goal coverage

Plan bir hedefi tam veya kısmen destekleyebilir.

Örnek:

Tilkiye yiyecek bırak

şunları sağlar:

Açlığı azaltır
Güveni artırabilir
Kısa süreli hayatta kalma ihtimalini artırır

Ancak:

Yarayı tedavi etmez

Bu yüzden:

{
  "goalCoverage": {
    "reduceImmediateDanger": 0.65,
    "healInjury": 0.10,
    "ensureLongTermSafety": 0.25
  }
}

Plan selection yalnızca tek başarı puanına bakmamalıdır.

20. Robustness

Robust plan, küçük dünya değişikliklerinde tamamen bozulmayan plandır.

Örnek kırılgan plan:

Şifacı kesin köydedir.
Köprü açıktır.
Tilki aynı yerde bekler.

Bu varsayımlardan biri yanlışsa plan çöker.

Daha robust plan:

Tilkinin yerini işaretle.
Köprü kapalıysa kuzey patikasını kullan.
Şifacı yoksa yardım edebilecek başka bir yetişkin bul.
Dönüş gecikecekse tilkiye yiyecek bırak.
robustness =
  alternativeCoverage
  + assumptionTolerance
  + resourceRedundancy
  + recoveryCapacity;
21. Flexibility

Robustness ve flexibility aynı değildir.

Robustness:

Plan sorunlara dayanabiliyor mu?

Flexibility:

Plan yeni bilgiye göre kolay değişebiliyor mu?

Örneğin çok ayrıntılı ve sıkı bir plan düşük flexibility taşır.

type PlanFlexibilityProfile = {
  reorderability: number;
  stepOptionality: number;
  methodSubstitutability: number;
  timingFlexibility: number;
  targetFlexibility: number;
};
22. Plan risk

Plan riskleri yalnızca eylem risklerinin toplamı değildir.

Plan seviyesinde riskler:

Tek kaynağa bağımlılık
Zaman aşımı
Kritik varsayım
Bir NPC’nin iş birliğine aşırı bağımlılık
Geri dönüşü olmayan erken adım
Uzun süre açıkta kalma
type PlanRisk = {
  riskId: string;
  category:
    | "resource"
    | "time"
    | "safety"
    | "social"
    | "information"
    | "coordination"
    | "irreversibility"
    | "dependency";

  probability: number;
  impact: number;
  detectability: number;

  mitigationStepIds: string[];
  contingencyPlanId?: string;
};
23. Plan constraint türleri
type PlanConstraint =
  | TimeConstraint
  | ResourceConstraint
  | CapabilityConstraint
  | LocationConstraint
  | SocialConstraint
  | KnowledgeConstraint
  | SafetyConstraint
  | CommitmentConstraint;

Örnek:

Gün batmadan köye ulaşılmalı.
Kardeş yalnız bırakılamaz.
Tek bir şifalı ot var.
Tilkiye çok yaklaşmak tehlikeli.

Plan Generator bu constraint’leri yalnızca sonradan kontrol etmemelidir.

Plan üretirken de kullanmalıdır.

24. Temporal planning

Bazı adımların yalnızca belirli zamanlarda yapılması gerekir.

Köy kapısı gün batımında kapanır.
Şifacı sabah ormana gider.
Tilki gece daha hareketli olur.
type PlanTemporalWindow = {
  stepId: string;

  earliestStart?: number;
  latestStart?: number;
  deadline?: number;

  preferredWindow?: {
    from: number;
    to: number;
  };

  expectedDuration: number;
};

Plan Engine zaman çakışmalarını tespit etmelidir.

25. Partial-order plan

Her adımın tam sırası zorunlu olmayabilir.

Örnek:

Tilkinin yerini işaretle
Kardeşe durumu açıkla
Çantayı hazırla

Bu adımlar farklı sırayla yapılabilir.

Ama:

Şifacıyı bul
→ Şifacıyla geri dön

sırası zorunludur.

type PlanDependency = {
  predecessorStepId: string;
  successorStepId: string;

  dependencyType:
    | "finish_before_start"
    | "start_before_start"
    | "condition_enables"
    | "resource_release"
    | "information_required";
};

Partial-order yapı planın esnekliğini artırır.

26. Parallel plan steps

Birden fazla aktör varsa adımlar paralel yürütülebilir.

Mira:
Şifacıyı bulur.

Kardeşi:
Tilkinin yanında güvenli mesafede bekler.

Köy muhafızı:
Patikayı kontrol eder.
type ParallelStepGroup = {
  groupId: string;
  stepIds: string[];

  synchronizationPolicy:
    | "all_complete"
    | "any_complete"
    | "threshold"
    | "no_sync";

  timeout?: number;
};

Paralel planlar daha hızlı olabilir ama koordinasyon riski taşır.

27. Collaborative planning

Bir plan birden fazla NPC gerektiriyorsa bu karakterlerin aynı planı kabul etmesi gerekir.

type CollaborativePlan = {
  planId: string;
  participantIds: string[];

  sharedGoalIds: string[];

  assignments: PlanAssignment[];

  coordinationProtocol: string;

  participantCommitments: Record<string, number>;
  trustDependencies: Record<string, number>;
};
type PlanAssignment = {
  actorId: string;
  stepIds: string[];

  accepted: boolean;
  capabilityFit: number;
  willingness: number;
};

Plan Engine başka NPC adına kesin karar vermemelidir.

Şifacıya adım atamak:

Şifacı kesin gelir

anlamına gelmez.

Önce:

Şifacıdan yardım isteme

adımı gerekir.

28. Commitment acquisition

Planın başka bir NPC’ye bağlı adımı varsa o NPC’nin taahhüdü alınmalıdır.

Mira şifacının geleceğini varsayamaz.

Plan:

1. Şifacıyı bul
2. Durumu anlat
3. Yardım iste
4. Kabul ederse birlikte dön
5. Reddederse alternatif yardım ara
type ExternalCommitmentRequirement = {
  actorId: string;
  requestedContribution: string;

  currentCommitmentState:
    | "unknown"
    | "requested"
    | "tentative"
    | "accepted"
    | "declined";

  requiredBeforeStepId: string;
};
29. Contingency plan

Yüksek riskli durumlarda alternatif plan önceden hazırlanabilir.

Ana plan:

Şifacıyı getir.

Contingency:

Şifacı yoksa köyün bitki uzmanını bul.

İkinci contingency:

Kimse yardım edemiyorsa yiyecek ve sıcak barınak hazırla.
type ContingencyPlan = {
  planId: string;
  triggerConditions: Condition[];

  protectsAgainstRiskIds: string[];
  activationCost: number;
  preparednessLevel: number;
};

Her risk için contingency üretmek pahalıdır.

Yalnızca:

yüksek olasılık × yüksek etki

risklerine hazırlanılmalıdır.

30. Plan B ile fallback action ayrımı

Fallback action:

Tek bir step başarısız olduğunda kullanılacak alternatif eylem

Plan B:

Ana yöntemin bütünü başarısız olduğunda kullanılacak alternatif yol

Örnek:

Ana plan:
Şifacıyı getir.

Fallback action:
Şifacıya farklı biçimde durumu açıkla.

Plan B:
Bitki uzmanını getir.
31. Information gathering planı

Belirsizlik çok yüksekse sistem doğrudan çözüm planı yerine bilgi planı oluşturabilir.

Önce tilkinin yarasını anlamaya çalış.

Adımlar:

Güvenli mesafeden gözlemle
Kanama olup olmadığını kontrol et
Ayak izlerini incele
Daha önceki hafızaları hatırla
Bir bilgili kişiye sor
type InformationPlan = {
  questionIds: string[];

  acquisitionSteps: string[];

  expectedInformationGain: number;
  expectedDecisionImprovement: number;

  cost: number;
  delayRisk: number;
};

Bilgi toplamak zaman kaybettiriyorsa:

information value
↔
delay cost

çatışması değerlendirilmelidir.

32. Exploration vs exploitation

Plan Engine yalnızca bilinen en iyi yöntemi kullanmamalıdır.

Bazen:

Yeni bir yol denemek
Yeni bir kişiden yardım istemek
Daha iyi yöntem öğrenmek

uzun vadede değerli olabilir.

type PlanExplorationProfile = {
  novelty: number;
  uncertainty: number;
  learningPotential: number;
  failureCost: number;
};

Karakter özellikleri etkiler:

Curiosity yüksek:
daha yeni planlara açık

Caution yüksek:
bilinen yöntemlere yönelir

Creativity yüksek:
yöntem bileşimleri üretir
33. Creative plan synthesis

Yeni planlar tamamen serbest şekilde üretilmemelidir.

Daha güvenli yapı:

Known methods
+
Available resources
+
World affordances
+
Conflict constraints
+
Composition rules
=
New plan candidate

Örnek:

Sorun:
Mira tilkiye yaklaşamıyor.
Şifacıya ulaşması zaman alacak.
Tilki aç.

Bileşik plan:

Yiyeceği güvenli mesafeden bırak.
Konumu taşlarla işaretle.
Köye git.
Şifacıyı getir.

Bu plan tek bir hazır template olmayabilir ama bilinen yapıların kontrollü birleşimidir.

34. Plan conflict resolution

Goal Engine hedef çatışmalarını belirlemişti.

Plan Engine bu çatışmaları yöntem seviyesinde azaltmaya çalışır.

Çatışan hedefler:

Tilkiye yardım et
Köye zamanında ulaş
Kardeşini güvende tut

Kötü plan:

Tilkinin yanında saatlerce bekle.

Daha dengeli plan:

Tilkiye yiyecek bırak.
Yerini işaretle.
Kardeşle birlikte köye git.
Şifacı getir.

Plan Engine’in görevi hedeflerden birini seçmek değil, mümkünse ortak çözüm üretmektir.

35. Plan compression

Aynı anda çok fazla aktif plan tutulmamalıdır.

Benzer planlar birleştirilebilir.

Örnek:

Köye ulaş
Şifacıyı bul
Yiyecek al

ayrı planlar yerine:

Köy yolculuğu planı
├── Şifacıyı bul
└── Yiyecek temin et

şeklinde birleştirilebilir.

type PlanMergeResult = {
  mergedPlanId: string;
  sourcePlanIds: string[];

  sharedSteps: string[];
  preservedGoalIds: string[];

  conflicts: string[];
};
36. Multi-goal planning

Tek bir plan birden fazla hedefi destekleyebilir.

type GoalCoverageEntry = {
  goalId: string;
  contribution: number;
  required: boolean;
};

Örnek:

Plan:
Köye git, şifacıyı bul ve yiyecek al.

Goal coverage:

[
  {
    "goalId": "reach_village",
    "contribution": 1.0
  },
  {
    "goalId": "bring_healer",
    "contribution": 0.72
  },
  {
    "goalId": "reduce_hunger",
    "contribution": 0.65
  }
]

Bu, plan verimliliğini artırır.

37. Plan efficiency

Plan çok sayıda hedefi destekliyor diye her zaman iyi değildir.

Aşırı yüklü plan:

çok karmaşık
yavaş
kırılgan
koordinasyonu zor

olabilir.

planEfficiency =
  totalGoalCoverage
  / (
    expectedCost
    + complexity
    + coordinationBurden
    + assumptionRisk
  );
38. Plan complexity
type PlanComplexity = {
  stepCount: number;
  branchCount: number;
  dependencyCount: number;
  participantCount: number;
  resourceTypeCount: number;
  assumptionCount: number;
  depth: number;
};

Karakterin bilişsel kapasitesi plan karmaşıklığını sınırlar.

Çocuk NPC:

daha kısa
daha somut
daha az dallı

planlar üretebilir.

Deneyimli stratejist:

daha uzun
koşullu
yedekli

planlar kurabilir.

39. Cognitive planning capacity
type PlanningCapacity = {
  workingMemory: number;
  foresight: number;
  causalReasoning: number;
  flexibility: number;
  attention: number;
  domainKnowledge: number;
};

Plan sınırları:

maxPlanDepth =
  baseDepth
  * workingMemory
  * domainKnowledge;

maxBranches =
  baseBranches
  * foresight
  * attention;

Bu sayede her NPC aynı kalitede plan yapmaz.

40. Emotion and planning

Duygular plan üretimini değiştirmelidir.

Korku
Daha güvenli
Daha kısa
Daha fazla geri çekilme içeren planlar
Öfke
Daha doğrudan
Daha az alternatifli
Daha riskli planlar
Suçluluk
Telafi odaklı
Kendi maliyetini fazla önemsemeyen planlar
Yorgunluk
Daha basit
Daha az adımlı
Daha kısa ufuklu planlar

Duygu plan kalitesini teknik olarak düşürebilir veya plan tarzını değiştirebilir.

41. Trait effects on planning

Trait’ler eylem seçimini etkilediği gibi plan yapısını da etkileyebilir.

Patience:
Uzun vadeli planlara tolerans

Impulsiveness:
Hemen uygulanabilir kısa planlar

Caution:
Daha fazla doğrulama ve contingency

Creativity:
Daha fazla yöntem bileşimi

Persistence:
Aynı planı onarma eğilimi

Flexibility:
Yöntem değiştirmeye açıklık

Trust:
Başkalarına bağlı planlara açıklık
42. Plan commitment

Karakter bir plana ne kadar bağlı?

Goal commitment ile plan commitment aynı değildir.

Hedefe çok bağlı olabilir
ama mevcut planın kötü olduğunu düşünebilir.
type PlanCommitment = {
  planId: string;

  value: number;
  investedEffort: number;
  confidence: number;
  emotionalAttachment: number;
  publicCommitment: number;
};

Bu ayrım sağlıklı plan değişimini mümkün kılar.

43. Plan inertia

NPC planı küçük değişikliklerde sürekli değiştirmemelidir.

type PlanInertia = {
  currentPlanCommitment: number;
  switchingCost: number;
  progressMomentum: number;
  sunkCostBias: number;
};

Yeni plan yalnızca biraz daha iyi diye mevcut plan terk edilmemelidir.

Yeni plan avantajı
>
geçiş maliyeti + kaybedilen ilerleme

olduğunda değişim anlamlıdır.

44. Plan monitoring

Plan aktifken sistem düzenli olarak şunları kontrol etmelidir:

Hedef hâlâ geçerli mi?
Mevcut adım uygulanabilir mi?
Varsayımlar hâlâ doğru mu?
Kaynaklar mevcut mu?
Yeni tehdit oluştu mu?
Daha iyi yöntem ortaya çıktı mı?
Deadline riske girdi mi?
Plan ilerliyor mu?
type PlanMonitoringResult = {
  planId: string;

  progressState: string;
  goalValidity: number;
  feasibility: number;

  invalidatedAssumptions: string[];
  blockedSteps: string[];
  newlyAvailableSteps: string[];

  detectedRisks: PlanRisk[];

  recommendation:
    | "continue"
    | "adjust"
    | "repair"
    | "pause"
    | "replan"
    | "abandon";
};
45. Plan repair

Bir step başarısız olduğunda bütün planı silmek gereksiz olabilir.

Örnek:

Plan:
Köprüden geç → Köye ulaş → Şifacıyı bul

Sorun:
Köprü kapalı.

Plan repair:

Köprüden geç

yerine:

Kuzey patikasını kullan

adımı eklenir.

Geri kalan plan korunur.

type PlanRepair = {
  planId: string;
  damagedStepIds: string[];

  preservedStepIds: string[];
  removedStepIds: string[];
  addedStepIds: string[];

  repairReason: string;
  repairCost: number;
};
46. Local repair vs full replan
Local repair

Şu durumlarda:

Tek step bozuldu
Ana hedef aynı
Yöntemin çoğu hâlâ geçerli
Yeni çözüm düşük maliyetli
Full replan

Şu durumlarda:

Ana varsayım çöktü
Hedef değişti
Kaynakların çoğu kayboldu
Yeni büyük tehdit çıktı
Mevcut yöntem artık anlamsız
replanSeverity =
  affectedGoalFraction
  + invalidatedStepFraction
  + assumptionCriticality
  + newThreatMagnitude;
47. Plan adaptation

Repair, bozulmuş planı düzeltir.

Adaptation ise plan bozulmadan daha uygun hale getirebilir.

Örnek:

Başlangıçta fırtına beklenmiyordu.
Hafif yağmur başladı.

Plan hâlâ uygulanabilir ama:

daha hızlı yol
barınak hazırlığı
koruyucu eşya

eklenebilir.

type PlanAdaptation = {
  trigger: string;
  changedPriorities: string[];

  parameterChanges: Record<string, unknown>;
  reorderedSteps: string[];
  addedPrecautions: string[];
};
48. Opportunistic planning

Dünya yeni fırsatlar sunabilir.

Örnek:

Mira köye giderken şifacıyla yolda karşılaştı.

Plan:

Köye ulaş
Şifacıyı bul

yerine:

Şifacıyla hemen konuş
Tilkinin yanına dön

olabilir.

type PlanOpportunity = {
  opportunityId: string;

  enablingFactIds: string[];
  affectedGoalIds: string[];

  expectedBenefit: number;
  expiryTime?: number;

  proposedPlanChange: string;
};

Plan Engine fırsatları kullanabilmeli ama sürekli dikkat dağılmasına da izin vermemelidir.

49. Plan interruption

Bir plan geçici olarak durabilir.

Örnek:

Tilki için şifacı getirme planı

yürürken:

Kardeş düşüp yaralandı.

Plan durumu:

paused

Yeni acil plan:

Kardeşe yardım et.

Eski plan:

silinmez

Daha sonra yeniden değerlendirilebilir.

type PlanSuspension = {
  planId: string;
  reason: string;

  resumeConditions: Condition[];
  retainedReservations: string[];
  releasedReservations: string[];

  memorySalience: number;
};
50. Plan resume

Bir plan yeniden başladığında baştan devam etmemelidir.

Kontrol:

Hangi adımlar tamamlandı?
Hangi sonuçlar hâlâ geçerli?
Hedef durumu değişti mi?
Kaynaklar duruyor mu?
Varsayımlar eskidi mi?
type PlanResumeEvaluation = {
  resumable: boolean;

  validCompletedSteps: string[];
  staleSteps: string[];
  invalidatedSteps: string[];

  refreshRequired: boolean;
  newPlanningContextRequired: boolean;
};
51. Plan abandonment

Plan terk edilebilir ama hedef devam edebilir.

Örnek:

Plan:
Tilkiyi köye taşı.

Sorun:
Taşımak tilkiye zarar verebilir.

Plan terk edilir.

Hedef:

Tilkiye yardım et

devam eder.

Yeni plan:

Şifacıyı tilkiye getir.

Plan abandonment nedenleri:

Düşük başarı ihtimali
Aşırı maliyet
Yeni bilgi
Daha iyi alternatif
Ahlaki uyumsuzluk
Kaynak kaybı
Zaman aşımı
52. Plan failure

Bir planın başarısız olması ile hedefin başarısız olması farklıdır.

Şifacıyı getirme planı başarısız oldu.

Ama:

Tilkiyi kurtarma hedefi

başka planla devam edebilir.

type PlanOutcome =
  | "completed"
  | "partially_completed"
  | "failed_recoverably"
  | "failed_terminally"
  | "abandoned"
  | "superseded";
53. Plan learning

Plan sonuçları gelecekte kullanılacak bilgi üretmelidir.

type PlanExperience = {
  actorId: string;
  planId: string;
  methodIds: string[];

  contextPattern: string;

  outcome: PlanOutcome;
  successLevel: number;

  actualDuration: number;
  actualCost: number;
  actualRisk: number;

  failedAssumptions: string[];
  effectiveSteps: string[];
  ineffectiveSteps: string[];

  lessonCandidates: string[];
};

Örnek öğrenme:

Yaralı vahşi hayvana doğrudan yaklaşmak güvenli değil.
Önce yiyecek bırakmak güven oluşturabilir.
Şifacıyı bulmadan önce bulunduğu yeri doğrulamak gerekir.
54. Plan pattern consolidation

Tek bir deneyim genel yöntem haline gelmemelidir.

Tekrar eden başarılar sonrası:

LearnedPlanPattern

oluşturulur.

type PlanPatternConsolidation = {
  supportingExperienceIds: string[];

  consistency: number;
  contextDiversity: number;
  successRate: number;

  generalizedPattern: LearnedPlanPattern;
};

Aynı plan farklı bağlamlarda işe yararsa güven artar.

55. Plan explanation

Her planın neden seçildiği açıklanmalıdır.

type PlanExplanation = {
  internal: string;
  narrative: string;
  debug: string;

  supportedGoals: string[];
  selectedMethods: string[];

  keyAssumptions: string[];
  majorRisks: string[];
  fallbackSummary: string[];
};

Örnek:

Internal:
Mira, tilkiye doğrudan yaklaşmanın riskli olduğunu ve köye gitme hedefini de sürdürmesi gerektiğini düşündüğü için önce yiyecek bırakıp ardından şifacı getirmeyi planladı.

Narrative:
Mira tilkiyi yalnız bırakmak istemedi ama karanlık çökmeden köye de ulaşmalıydı. Bu yüzden ona biraz yiyecek bırakıp yardım getirmeye karar verdi.

Debug:
Plan selected due to goalCoverage=0.84,
risk=0.31, duration=0.58, robustness=0.76,
siblingSafetyCompatibility=0.88.
56. Plan Engine ile Action Generator ilişkisi

Plan Engine doğrudan kesin eylem seçmez.

Aktif plan step’i Action Generator’a aday kaynağı olur.

Active Plan Step:
Şifacıyı bul.

Action Generator:
Şifacının evine git
Köy meydanında sor
Şifacının çırağına ulaş
Şifacının son görüldüğü yeri araştır

Decision Engine bu eylemler arasından seçim yapar.

Bu sayede plan karakteri tamamen kontrol etmez.

57. Decision Engine planı bozabilir

Plan step’i yüksek öncelikli aday üretir ama zorunlu seçim değildir.

Örnek:

Plan:
Köye doğru ilerle.

Yeni perception:

Kardeş çukura düştü.

Decision Engine:

Kardeşe yardım et

eylemini seçebilir.

Plan:

paused

durumuna geçer.

Bu LUMI’nin reaktif ve yaşayan yapısını korur.

58. Execution Engine bağlantısı

Decision Engine plan kaynaklı eylemi seçtiğinde Execution Engine uygular.

Plan Step
   ↓
Candidate Action
   ↓
Selected Action
   ↓
Execution Plan
   ↓
Execution Result
   ↓
Plan Progress Update

Execution başarılıysa:

Plan step tamamlanır.

Kısmi başarıysa:

Plan step ilerlemesi güncellenir.

Başarısızsa:

Repair veya replan değerlendirmesi başlar.
59. Consequence Engine bağlantısı

Execution sonucu yalnızca plan ilerlemesi değil, beklenmeyen consequences da üretebilir.

Örnek:

Mira şifacıyı ararken avcının sırrını öğrendi.

Bu bilgi:

Yeni hedef
Yeni risk
Yeni plan dalı

oluşturabilir.

Plan Engine yeni consequence’ları izlemeli ama bunları doğrudan çözümlememelidir.

60. Plan state event’leri

Plan yaşam döngüsü event olarak kaydedilebilir.

PlanCreated
PlanActivated
StepAvailable
StepStarted
StepCompleted
StepFailed
PlanPaused
PlanRepaired
PlanReplanned
PlanResumed
PlanCompleted
PlanAbandoned

Bu sayede:

plan neden değişti
hangi varsayım çöktü
hangi adım işe yaradı

izlenebilir.

61. Plan determinism

Plan aday üretiminde çeşitlilik olabilir ancak replay mümkün olmalıdır.

Seed kaynakları:

worldId
actorId
goalPortfolioVersion
planningCycleId
worldTick

Yaratıcı plan varyasyonları bu seed üzerinden seçilebilir.

62. Plan budget

Plan üretimi combinatorial explosion yaratabilir.

Sınırlar gerekir.

İlk öneri:

Bir goal portfolio için plan adayı: en fazla 4
Bir plandaki detaylı step: en fazla 8
Soyut step: en fazla 6
Branch: en fazla 4
Contingency plan: en fazla 2
Hierarchy depth: en fazla 3
Repair turu: plan döngüsü başına en fazla 2

Yüksek önem olaylarda budget artırılabilir.

63. Plan pruning

Aday planlar şu durumlarda erken elenebilir:

Hard-impossible
Temel capability eksik
Kritik kaynak yok
Deadline kesin kaçıyor
Goal coverage çok düşük
Guardrail ihlali
Bilgi sızıntısı içeriyor
NPC’nin bilmediği yönteme dayanıyor

Belirsiz planlar elenmemeli, uncertainty ile değerlendirilmelidir.

64. Plan diversity

En yüksek puanlı planların hepsi aynı yöntem ailesinden gelebilir.

Bu nedenle şu çeşitlilik korunmalıdır:

Doğrudan çözüm
Güvenli çözüm
Hızlı çözüm
Düşük kaynaklı çözüm
Sosyal yardım çözümü
Bilgi toplama çözümü
Yaratıcı uzlaşma

Örnek plan havuzu:

Doğrudan tedavi et
Şifacı getir
Tilkiyi güvenli yere taşı
Yiyecek bırakıp durumu izle
65. Plan selector

Plan Engine kendi plan adayları arasından bir plan seçebilir ama bu seçim Decision Selector’dan farklıdır.

Plan Selector:

Uzun vadeli yöntem seçer.

Decision Selector:

Şu anda yapılacak eylemi seçer.
type PlanSelectionResult = {
  selectedPlanId: string;

  alternativePlanIds: string[];

  confidence: number;
  uncertainty: number;

  selectionReasons: string[];

  reconsiderationTriggers: Condition[];
};
66. İlk sürüm için sade Plan Engine

İlk sürümde şu plan türleri yeterlidir:

linear
conditional
hierarchical
contingency

İlk bileşenler:

Goal decomposition
Method selection
Dependency construction
Resource check
Risk check
Plan candidate evaluation
Plan monitoring
Local repair
Full replan

İlk veri modeli:

type SimplePlan = {
  planId: string;
  actorId: string;
  goalIds: string[];

  steps: SimplePlanStep[];

  status: PlanStatus;

  expectedDuration: number;
  expectedCost: number;
  expectedRisk: number;
  expectedSuccess: number;

  assumptions: PlanAssumption[];
  fallbackPlanId?: string;
};
type SimplePlanStep = {
  stepId: string;
  objective: GoalTargetState;

  preconditions: Condition[];
  successConditions: Condition[];

  status: PlanStepStatus;

  requiredResources: string[];
  nextStepIds: string[];
};

İlk sınırlar:

Aktif plan: en fazla 2
Birincil aktif plan: 1
Detaylı plan step’i: en fazla 8
Fallback plan: en fazla 1
Branch: en fazla 3
Plan depth: en fazla 2
67. Örnek tam plan

Aktif hedefler:

Tilkiye yardım et
Köye gün batmadan ulaş
Kardeşini güvende tut

Plan adayı:

1. Tilkinin bulunduğu yeri taşlarla işaretle
2. Güvenli mesafeden yiyecek bırak
3. Kardeşine tilkiye yaklaşmamasını söyle
4. Köyün kısa fakat güvenli yoluna çık
5. Köyde şifacının yerini sor
6. Şifacıdan yardım iste
7. Kabul ederse tilkinin yanına dön
8. Reddederse bitki uzmanını bul

Varsayımlar:

Tilki bir süre bölgede kalacak.
Köye ulaşmak için yeterli zaman var.
Şifacı veya alternatif bir yardımcı bulunabilir.

Riskler:

Tilki bölgeden ayrılabilir.
Şifacı yardım etmeyebilir.
Karanlık dönüşü zorlaştırabilir.

Contingency:

Dönüş geceye kalırsa:
Köy muhafızından eşlik iste.

Bu plan:

Tilkiye acil yardım sağlar
Köy hedefini sürdürür
Kardeş güvenliğini korur
Belirsizliği branch ile yönetir
68. Örnek plan onarımı

Plan:

Köye git
Şifacıyı bul
Tilkinin yanına dön

Yeni bilgi:

Köprü sel nedeniyle kapanmış.

Plan Repair:

Silinen step:
Köprüden geç.

Eklenen step:
Orman kenarındaki kuzey yolunu kullan.

Değişen sonuç:
Tahmini süre +15 dakika.
Risk +0.08.
Gün batımı baskısı yükseldi.

Planın geri kalanı korunur.

Ancak kuzey yolu da kapalıysa:

full replan

gerekebilir.

69. Önerilen modüller
PlanEngine
├── PlanNeedEvaluator
├── PlanningContextBuilder
├── MethodLibrary
├── PlanKnowledgeResolver
├── GoalDecomposer
├── PlanCandidateGenerator
├── DependencyBuilder
├── TemporalPlanner
├── ResourcePlanner
├── CollaborativePlanCoordinator
├── PlanRiskEvaluator
├── PlanEvaluator
├── PlanSelector
├── PlanMonitor
├── PlanRepairEngine
├── ReplanCoordinator
├── PlanLearningEngine
└── PlanExplanationBuilder

İlk sürümde bunların hepsi ayrı servis olmamalıdır. Tek domain modülü içinde bileşenler halinde başlamak daha sağlıklıdır.

70. Temel prensipler

Plan, hedefe ulaşmak için hazırlanmış geçici ve değiştirilebilir bir yol haritasıdır.

Plan Engine hedef seçmez; seçilmiş hedefler için uygulanabilir yöntemler üretir.

NPC yalnızca bildiği yöntemler, kaynaklar ve inandığı dünya durumu üzerinden plan yapmalıdır.

Yakın gelecek ayrıntılı, uzak gelecek soyut planlanmalıdır.

Planlar lineer listeler yerine gerektiğinde bağımlılık ve koşul grafikleri olarak tutulmalıdır.

Bir step’in başarısız olması bütün planın başarısız olduğu anlamına gelmez.

Mümkün olduğunda önce local repair yapılmalı, yalnızca ana yapı çöktüğünde full replan uygulanmalıdır.

Plan başka NPC’lerin iş birliğini gerektiriyorsa onların onayı varsayılmamalıdır.

Plan commitment ile goal commitment birbirinden ayrılmalıdır.

İyi plan yalnızca yüksek başarı ihtimali taşıyan değil; değişikliklere dayanıklı, açıklanabilir ve onarılabilir plandır.

Plan, Decision Engine’i zorlamamalı; mevcut plan adımları aday eylemler üretmeli, ancak yeni olaylar karşısında karakter özgürce tepki verebilmelidir.

Plan sonuçları, karakterin gelecekte daha iyi veya daha kötü planlar yapmasını sağlayacak öğrenme verisine dönüşmelidir.