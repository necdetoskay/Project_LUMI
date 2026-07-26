Goal Engine

Goal Engine’in görevi:

NPC’nin neyi başarmaya çalıştığını, neden bunu istediğini, hedefin ne kadar önemli olduğunu, hangi koşullarda değişeceğini ve diğer hedeflerle nasıl çatışacağını yönetmek.

Goal Engine yalnızca bir görev listesi değildir.

“Hedef: Köye git.”

demek yeterli olmaz.

Sistem ayrıca şunları bilmelidir:

NPC neden köye gitmek istiyor?
Ne kadar acil?
Başarısız olursa ne olur?
Hedef geçici mi, uzun süreli mi?
Başka hangi hedeflerle çatışıyor?
Hedef hâlâ anlamlı mı?
NPC hedefe ulaşmak için ne kadar bedel ödemeye hazır?

Temel akış:

Needs / Values / Roles
Memories / Emotions
World Events / Consequences
Social Requests / Commitments
          ↓
     Goal Generation
          ↓
     Goal Validation
          ↓
   Goal Priority Evaluation
          ↓
     Goal Conflict Map
          ↓
Goal Selection / Goal Portfolio
          ↓
Subgoal and Intent Generation
          ↓
Action Generator
          ↓
Progress and Outcome Feedback
1. Goal ile action ayrımı

Goal:

Ulaşılmak istenen durum

Action:

Bu duruma ulaşmak için yapılan hareket

Örnek:

Goal:
Tilkinin güvende olmasını sağla.

Actions:
Tilkiye yiyecek bırak.
Şifacı bul.
Tehlikeyi uzaklaştır.
Barınak hazırla.

Bir hedef birçok farklı eylemle gerçekleştirilebilir.

Aynı eylem de birden fazla hedefe hizmet edebilir.

Köye dönmek

şu hedefleri aynı anda destekleyebilir:

Gece olmadan eve ulaş
Şifacı bul
Kardeşini güvende tut
Yiyecek temin et
2. Goal veri modeli
type Goal = {
  goalId: string;
  actorId: string;

  goalType: string;
  targetState: GoalTargetState;

  source: GoalSource;
  motivations: GoalMotivation[];

  importance: number;
  urgency: number;
  commitment: number;

  expectedValue: number;
  confidence: number;

  progress: number;

  status:
    | "latent"
    | "candidate"
    | "active"
    | "paused"
    | "blocked"
    | "completed"
    | "failed"
    | "abandoned"
    | "expired"
    | "superseded";

  timeHorizon:
    | "immediate"
    | "short_term"
    | "medium_term"
    | "long_term"
    | "lifelong";

  activationConditions: Condition[];
  successConditions: Condition[];
  failureConditions: Condition[];
  abandonmentConditions: Condition[];
  expiryConditions: Condition[];

  parentGoalId?: string;
  subgoalIds: string[];

  conflictingGoalIds: string[];
  supportingGoalIds: string[];

  createdAt: number;
  updatedAt: number;
  deadline?: number;

  explanation: GoalExplanation;
};
3. Goal target state

Bir hedef string değil, ulaşılması beklenen dünya durumu olmalıdır.

type GoalTargetState = {
  entityId?: string;
  dimension: string;

  operation:
    | "reach"
    | "increase"
    | "decrease"
    | "maintain"
    | "prevent"
    | "discover"
    | "create"
    | "remove";

  targetValue?: unknown;
  threshold?: number;

  tolerance?: number;
};

Örnek:

{
  "entityId": "fox_12",
  "dimension": "physical.safety",
  "operation": "reach",
  "threshold": 0.75,
  "tolerance": 0.05
}

Bu şu anlama gelir:

Tilkinin güvenlik seviyesini en az 0.75’e çıkar.

Bu yapı sayesinde sistem hedefin tamamlanıp tamamlanmadığını ölçebilir.

4. Goal kaynakları

Hedefler tek bir kaynaktan doğmamalıdır.

type GoalSource =
  | "need"
  | "value"
  | "emotion"
  | "role"
  | "relationship"
  | "commitment"
  | "world_event"
  | "consequence"
  | "memory"
  | "identity"
  | "habit"
  | "social_request"
  | "player_instruction"
  | "plan"
  | "curiosity";
5. Need tabanlı hedefler

İhtiyaçlar eşik aştığında hedef oluşturabilir.

Açlık yükseldi
→ yiyecek bul

Yorgunluk yükseldi
→ dinlenecek güvenli yer bul

Aidiyet ihtiyacı yükseldi
→ gruba yeniden bağlan

Güvenlik ihtiyacı yükseldi
→ tehdidi azalt
type NeedGoalRule = {
  needId: string;
  activationThreshold: number;
  generatedGoalType: string;
  defaultUrgency: number;
};

Ancak her ihtiyaç doğrudan aktif hedefe dönüşmemelidir.

Örneğin:

Açlık: 0.40

yalnızca latent bir hedef oluşturabilir.

Açlık: 0.85

aktif ve acil hedef oluşturabilir.

6. Value tabanlı hedefler

Karakter değerleri hedef üretir.

Örnek:

Compassion yüksek
→ yaralı canlıya yardım et

Fairness yüksek
→ haksızlığı düzelt

Curiosity yüksek
→ gizemli ışığın kaynağını öğren

Loyalty yüksek
→ arkadaşını yalnız bırakma

Value tabanlı hedefler çoğu zaman ihtiyaç hedeflerinden daha uzun ömürlüdür.

type ValueGoalMotivation = {
  valueId: string;
  alignment: number;
  identityRelevance: number;
};
7. Emotion tabanlı hedefler

Duygular yalnızca eylem değil, hedef de oluşturabilir.

Korku
Tehditten uzaklaş
Güvenli bölgeye ulaş
Tehdidin ne olduğunu öğren
Suçluluk
Hatayı telafi et
Özür dile
Zarar gören kişiye yardım et
Öfke
Yüzleş
Adaleti sağla
İntikam al
Uzaklaş
Sevgi
Yakın kişiyi koru
Onunla zaman geçir
Onun hedefini destekle

Duygusal hedeflerin bazıları geçici olabilir.

Öfke geçince:

İntikam hedefi

anlamını kaybedebilir.

Bu yüzden goal stability gerekir.

8. Role ve duty tabanlı hedefler

NPC’nin rolü sürekli veya koşullu hedefler oluşturabilir.

Köy muhafızı:

Köyü koru
Tehditleri araştır
Kapıları gece kapat

Şifacı:

Yaralıları tedavi et
Şifalı ot stoğunu koru
Hastalığın yayılmasını önle

Ebeveyn:

Çocuğu güvende tut
Beslenmesini sağla
Tehlikeli davranışı engelle

Bu hedefler çoğu zaman:

maintenance goal

türündedir.

Tamamlanmazlar; sürekli korunurlar.

9. Relationship tabanlı hedefler

İlişkiler hedef üretir.

Arkadaşını koru
Kardeşinle barış
Birinin güvenini kazan
Bir sırrı sakla
Bir borcu geri öde

İlişki hedefleri hedef kişiye göre farklı öncelik kazanır.

type RelationshipGoalMotivation = {
  targetId: string;
  relationshipDimensions: {
    attachment: number;
    trust: number;
    loyalty: number;
    obligation: number;
    protectiveness: number;
  };
};
10. Commitment hedefleri

NPC verdiği sözlerden hedef üretmelidir.

“Gün batmadan döneceğim.”
“Tilki için yardım getireceğim.”
“Sırrını kimseye söylemeyeceğim.”
type Commitment = {
  commitmentId: string;
  actorId: string;
  beneficiaryIds: string[];

  promisedState: GoalTargetState;

  strength: number;
  socialVisibility: number;
  moralImportance: number;

  deadline?: number;
};

Söz verilmiş hedeflerin terk edilmesi:

guilt
reputation loss
trust loss
identity conflict

doğurabilir.

11. Consequence tabanlı hedefler

Outcome & Consequence Engine yeni hedef seed’leri üretmişti.

Örnek:

Tilkinin yarası kötüleşiyor.

Yeni hedef:

Tilki için şifacı bul.

Başka örnek:

Mira’nın bıraktığı yiyecek başka hayvanları çekti.

Yeni hedef:

Patikayı güvenli hale getir.

Bu hedefler otomatik olarak aktif olmamalıdır.

Önce NPC’nin:

Sonucu bilmesi
Sonucu önemsemesi
Müdahale edebileceğine inanması

gerekir.

12. Identity tabanlı hedefler

Karakterin kimlik inançları hedef üretir.

“Ben küçük canlıları korurum.”

Bu kimlik:

Yaralı hayvanı yalnız bırakmama

hedefi doğurabilir.

“Ben güvenilir biriyim.”

şu hedefleri doğurabilir:

Sözünü tut
Gerçeği söyle
Görevi tamamla

Identity goal’lar karakter tutarlılığını güçlendirir.

Fakat kimlik ile ihtiyaç çatışabilir.

“Ben herkese yardım ederim.”

ama:

NPC çok yorgun ve yaralı.

Bu çatışma Decision Engine’de görünür hale gelmelidir.

13. Curiosity goal

Merak yalnızca:

Bir nesneyi incele

gibi kısa eylemler üretmez.

Uzun süreli araştırma hedefleri de doğurabilir.

Ormandaki ışığın kaynağını öğren
Eski haritanın neyi gösterdiğini çöz
Avcının neden yalan söylediğini bul
type CuriosityGoal = {
  unknownId: string;
  uncertainty: number;
  novelty: number;
  personalRelevance: number;
  expectedInformationValue: number;
};

Merak hedefleri deadline taşımayabilir ama unutulabilir veya önem kaybedebilir.

14. Goal seed ve gerçek goal ayrımı

Bir olay hedef ihtimali oluşturabilir fakat doğrudan aktif hedef üretmemelidir.

type GoalSeed = {
  seedId: string;
  targetActorIds: string[];

  proposedGoalType: string;
  targetState: GoalTargetState;

  motivationSources: string[];

  initialImportance: number;
  initialUrgency: number;

  activationConditions: Condition[];
  expiryConditions: Condition[];

  confidence: number;
};

Goal Engine seed’i değerlendirir:

NPC bunun farkında mı?
Hedef değerleriyle uyumlu mu?
Aktör bunu yapabilecek durumda mı?
Hedef hâlâ geçerli mi?
Benzer hedef zaten var mı?

Sonra:

latent
candidate
active
rejected

durumlarından birine geçirir.

15. Goal yaşam döngüsü
Seed
 ↓
Latent
 ↓
Candidate
 ↓
Active
 ↓
Paused / Blocked
 ↓
Completed / Failed / Abandoned / Expired
Latent

Henüz güçlü şekilde fark edilmemiş veya koşulları oluşmamış hedef.

Candidate

Aktörün dikkate aldığı fakat henüz bağlılık göstermediği hedef.

Active

Karar sistemini düzenli olarak etkileyen hedef.

Paused

Geçici olarak ertelenmiş hedef.

Blocked

İlerlemek için gerekli koşullar yok.

Completed

Başarı koşulları sağlandı.

Failed

Başarı artık mümkün değil.

Abandoned

NPC bilinçli olarak vazgeçti.

Expired

Zaman veya bağlam nedeniyle geçerliliğini kaybetti.

Superseded

Daha yeni veya daha kapsamlı hedef tarafından değiştirildi.

16. Goal activation

Bir hedefin aktifleşmesi için yalnızca importance yeterli değildir.

goalActivation =
  relevance
  * motivationStrength
  * perceivedFeasibility
  * awareness
  * temporalPressure
  * emotionalSalience;

Örnek:

Tilkiye yardım etmek önemli.

Ancak NPC:

Tilkinin yaralı olduğunu görmüyorsa

hedef aktifleşmez.

Başka örnek:

Köyü kurtarmak çok önemli.

Ama NPC bunun için hiçbir şey yapamayacağını düşünüyorsa:

active goal

yerine:

aspirational veya blocked goal

olabilir.

17. Goal importance

Importance hedefin karakter açısından temel değeridir.

Kaynaklar:

İhtiyaç seviyesi
Değer uyumu
İlişki önemi
Kimlik bağlantısı
Söz veya görev
Beklenen dünya etkisi
goalImportance =
  needImportance
  + valueAlignment
  + relationshipImportance
  + identityAlignment
  + commitmentStrength
  + worldImpact;

Sonuç normalize edilir.

Importance çoğu zaman yavaş değişir.

18. Goal urgency

Urgency zaman baskısını ifade eder.

Tilkinin yarası kanıyor:
yüksek urgency

Bir gün eski tapınağı keşfetmek:
düşük urgency

Urgency faktörleri:

type GoalUrgencyFactors = {
  deadlinePressure: number;
  deteriorationRate: number;
  opportunityWindow: number;
  threatEscalation: number;
  dependencyPressure: number;
};

Formül:

goalUrgency =
  deadlinePressure
  + deteriorationRate
  + opportunityWindow
  + threatEscalation
  + dependencyPressure;

Importance ile urgency aynı şey değildir.

Çok önemli fakat acil değil:
Kayıp ailesini bulmak.

Acil fakat çok önemli değil:
Yağmur başlamadan paltosunu almak.
19. Commitment

Commitment, NPC’nin hedefe ne kadar bağlandığını ifade eder.

Importance yüksek olabilir ama commitment düşük olabilir.

Örnek:

“Müzik öğrenmek önemli.”

Ama NPC hiç zaman ayırmıyorsa:

importance yüksek
commitment düşük

Commitment kaynakları:

Verilen söz
Harcanmış emek
Kimlik bağlantısı
Tekrarlanan seçimler
Sosyal görünürlük
Duygusal yatırım
type GoalCommitmentState = {
  value: number;
  momentum: number;
  investment: number;
  identityBinding: number;
};
20. Goal portfolio

NPC aynı anda yalnızca tek hedefe sahip olmamalıdır.

type GoalPortfolio = {
  immediateGoals: string[];
  activeGoals: string[];
  backgroundGoals: string[];
  maintenanceGoals: string[];
  aspirationalGoals: string[];
};
Immediate goals

Şu anda kararları doğrudan etkileyen hedefler.

Yangından çık
Kardeşini yakala
Active goals

Kısa veya orta vadede takip edilen hedefler.

Tilki için yardım getir
Köye ulaş
Background goals

Şu anda odak değil ama unutulmamış hedefler.

Haritanın sırrını çöz
Maintenance goals

Sürekli korunan durumlar.

Kardeşini güvende tut
Yeterli yiyecek stoğunu koru
Aspirational goals

Uzun vadeli idealler.

Şifacı ol
Dünyayı keşfet
Köyün güvenini kazan
21. Focus goal

Birden çok aktif hedef olsa da her karar anında bir veya birkaç odak hedef bulunmalıdır.

type GoalFocusState = {
  primaryGoalId?: string;
  secondaryGoalIds: string[];

  focusStrength: number;
  switchingCost: number;

  focusReason: string;
};

NPC sürekli hedef değiştirmemelidir.

Bu yüzden:

goal switching cost

kullanılabilir.

Bir hedefe yatırım yaptıysa küçük yeni olaylarda hemen vazgeçmez.

Ancak ciddi tehdit:

focus override

yapabilir.

22. Goal prioritization

Goal priority tek bir sabit sayı olmamalıdır.

effectiveGoalPriority =
  importance
  * urgency
  * commitment
  * relevance
  * feasibility
  * emotionalSalience
  * identityAlignment
  * opportunityAvailability;

Ancak çarpım modeli sıfır sorunları yaratabilir.

Pratikte ağırlıklı ve guardrail destekli model daha iyi olabilir:

priority =
  importance * 0.25 +
  urgency * 0.20 +
  commitment * 0.15 +
  relevance * 0.10 +
  feasibility * 0.10 +
  emotionalSalience * 0.10 +
  identityAlignment * 0.05 +
  opportunityAvailability * 0.05;

Ardından bağlamsal modifier’lar uygulanır.

23. Feasibility hedefi silmemeli

Düşük yapılabilirlik, hedefin önemsiz olduğu anlamına gelmez.

Kayıp ailesini bulmak

çok önemli olabilir ama şu anda yapılabilir olmayabilir.

Bu durumda:

Goal importance yüksek
Goal feasibility düşük
Status blocked

Sistem hedefi silmek yerine yardımcı hedef üretebilir:

Bilgi topla
Güçlen
Harita bul
Birinden yardım iste
24. Goal conflict

Hedefler birbirleriyle çatışabilir.

Tilkiye yardım et
↔
Gece olmadan köye ulaş
Gerçeği söyle
↔
Arkadaşının sırrını koru
Kardeşini koru
↔
Onun bağımsız hareket etmesine izin ver
type GoalConflict = {
  conflictId: string;
  goalAId: string;
  goalBId: string;

  conflictType:
    | "resource"
    | "time"
    | "value"
    | "state"
    | "strategy"
    | "social"
    | "identity";

  severity: number;
  resolvability: number;

  sharedResources: string[];
  explanation: string;
};
25. Resource conflict

İki hedef aynı sınırlı kaynağı kullanabilir.

Son şifalı otu tilkiye kullan
Son şifalı otu kardeşin için sakla
type GoalResourceDemand = {
  goalId: string;
  resourceId: string;
  requiredAmount: number;
  exclusivity: number;
};

Goal Engine kaynağın nasıl kullanılacağına karar vermez.

Ancak çatışmayı Decision Engine’e görünür hale getirir.

26. Time conflict
Gün batmadan köye ulaş
Tilkinin yanında bekle

İki hedef aynı anda yapılamayabilir.

type GoalTimeDemand = {
  goalId: string;
  estimatedTime: number;
  deadline?: number;
  schedulingFlexibility: number;
};

Bu çatışma compromise goal oluşturabilir:

Tilkiye yiyecek bırak, konumu işaretle ve köyden yardım getir.
27. Value conflict

İki hedef farklı değerlere dayanabilir.

Honesty:
Gerçeği söyle.

Loyalty:
Arkadaşının sırrını koru.

Goal Engine bu çatışmayı çözmemelidir.

Şunları üretmelidir:

Conflict severity
İlgili değerler
Muhtemel pişmanlık
Kimlik etkisi
Uzlaşma ihtiyacı

Decision Engine bunları değerlendirir.

28. Goal support ilişkisi

Hedefler yalnızca çatışmaz, birbirini destekleyebilir.

Şifacıyı bul
→
Tilkiyi iyileştir
Haritayı çöz
→
Kayıp tapınağı bul
type GoalSupportRelation = {
  supporterGoalId: string;
  supportedGoalId: string;

  supportType:
    | "required"
    | "enabling"
    | "accelerating"
    | "risk_reducing";

  strength: number;
};
29. Parent goal ve subgoal

Büyük hedefler doğrudan eyleme çevrilemez.

Tilkiyi kurtar

alt hedeflere ayrılabilir:

Tilkinin durumunu öğren
Tehlikeyi azalt
Tedavi yöntemi bul
Gerekli malzemeyi getir
Tedaviyi uygula
İyileşmeyi kontrol et
type GoalDecomposition = {
  parentGoalId: string;

  subgoals: {
    goalId: string;
    order?: number;
    required: boolean;
    parallelizable: boolean;
  }[];

  completionPolicy:
    | "all_required"
    | "any"
    | "threshold"
    | "ordered";
};
30. Subgoal üretimi

Subgoal Generator şu kaynakları kullanabilir:

Goal template
Known methods
NPC skills
Available resources
Memories
Social knowledge
Environmental affordances

Örnek:

Goal:
Tilkinin sağlık değerini yükselt.

Bilinen yöntemler:
Şifalı ot uygula
Şifacı getir
Dinlenmesini sağla
Yiyecek ver

NPC şifacılık bilmiyorsa:

Şifacı bul

alt hedefi daha olası olur.

31. Necessary ve optional subgoal

Her alt hedef zorunlu değildir.

Tilkiyi iyileştir

için:

Yarayı incele:
gerekli olabilir

Tilkiye isim ver:
opsiyonel

Köy şifacısını getir:
alternatif yöntemlerden biri
type SubgoalRequirement =
  | "required"
  | "optional"
  | "alternative"
  | "contingent";
32. Goal dependency graph

Hedefler bağımlılık grafiğinde tutulabilir.

Tilkiyi kurtar
   ├── Durumunu değerlendir
   ├── Tedavi yöntemi belirle
   │      ├── Şifalı ot bul
   │      └── Şifacı getir
   └── Tehlikeyi uzaklaştır
type GoalDependency = {
  fromGoalId: string;
  toGoalId: string;

  dependencyType:
    | "requires"
    | "blocks"
    | "enables"
    | "invalidates";

  condition?: Condition;
};

Bu yapı ileride Plan Engine için temel oluşturur.

33. Goal progress

Progress yalnızca tamamlanan alt görev sayısı olmamalıdır.

type GoalProgress = {
  value: number;
  confidence: number;

  achievedConditions: Condition[];
  remainingConditions: Condition[];

  trend:
    | "improving"
    | "stable"
    | "deteriorating"
    | "unknown";

  lastProgressEventId?: string;
};

Örnek:

Tilkiyi kurtar

hedefi:

Yiyecek verildi:
progress +0.15

Yara incelendi:
progress +0.15

Şifacı getirildi:
progress +0.30

Tedavi tamamlandı:
progress +0.40

Ancak tilkinin durumu kötüleşirse progress düşebilir.

34. Monotonic olmayan progress

Bazı hedeflerde ilerleme geri alınabilir.

Birinin güvenini kazan

ilerleme:

0.30 → 0.55 → 0.42

olabilir.

Köyü yangından koru

hedefinde yeni yangın çıkarsa progress düşebilir.

Bu yüzden progress her zaman artan bir sayaç olmamalıdır.

35. Maintain goals

Bazı hedefler tamamlanmak yerine korunur.

Kardeşini güvende tut
Tilkinin durumunu stabil tut
Köyün yiyecek stoğunu yeterli seviyede tut
type MaintenanceGoalState = {
  desiredRange: {
    min: number;
    max?: number;
  };

  currentValue: number;
  deviation: number;
  riskOfViolation: number;
};

Hedef, değer istenen aralıkta olduğu sürece başarılı şekilde sürdürülür.

36. Prevention goals

Bazı hedefler bir olayın gerçekleşmesini önlemeye yöneliktir.

Tilkinin enfeksiyon kapmasını önle
Avcının köye ulaşmasını engelle
Sırrın yayılmasını önle

Başarı koşulu:

Belirli süre boyunca olay gerçekleşmedi.

Bu hedeflerde başarının kanıtlanması zordur.

Çünkü:

Olay neden gerçekleşmedi?
NPC’nin çabası yüzünden mi?
Zaten gerçekleşmeyecek miydi?

Bu nedenle prevention goal confidence tutulmalıdır.

37. Discover goals

Bilgiye ulaşmaya yönelik hedefler:

Avcının doğru söyleyip söylemediğini öğren
Haritanın kaynağını keşfet
Tilkinin neden yaralandığını bul

Başarı koşulu:

Belief confidence belirli eşiği geçti.
type DiscoverGoalTarget = {
  questionId: string;
  requiredConfidence: number;
  acceptableSources?: string[];
  contradictionTolerance: number;
};

Sadece bir cevap duymak hedefi tamamlamamalıdır.

NPC cevabın doğru olduğuna yeterince inanmalıdır.

38. Goal completion

Bir hedefin tamamlanması için success condition doğrulanmalıdır.

type GoalCompletionResult = {
  completed: boolean;
  completionConfidence: number;

  satisfiedConditions: Condition[];
  uncertainConditions: Condition[];

  completionEventId?: string;
};

Örnek:

Hedef:
Tilkiyi güvende tut.

Tilki şu anda güvende:
Evet.

Ancak yaklaşan fırtına var:
Tamamlama geçici olabilir.

Bu durumda:

completed

yerine:

temporarily_satisfied

veya maintenance goal’a dönüşüm düşünülebilir.

39. Partial completion

Hedef tamamen tamamlanmadan anlamlı ilerleme sağlanabilir.

Tilki tamamen iyileşmedi ama kritik tehlike geçti.
type GoalOutcome =
  | "completed"
  | "partially_completed"
  | "temporarily_satisfied"
  | "failed"
  | "superseded";

Partial completion:

memnuniyet oluşturabilir,
yeni alt hedef doğurabilir,
commitment’ı değiştirebilir,
hedefi başka bir hedefe dönüştürebilir.
40. Goal failure

Goal failure yalnızca action failure değildir.

Bir eylem başarısız olabilir ama hedef hâlâ devam eder.

Örneğin:

Şifalı otu uygulama başarısız oldu.

Ama:

Tilkiyi kurtar

hedefi hâlâ mümkündür.

Hedef ancak şu durumlarda failed olur:

Başarı koşulu artık imkânsız
Deadline geçti
Hedef nesnesi yok oldu
Hedef başka olayla geri dönüşsüz şekilde engellendi
41. Goal abandonment

Abandonment, NPC’nin bilinçli şekilde hedefi bırakmasıdır.

type GoalAbandonmentEvaluation = {
  remainingValue: number;
  remainingFeasibility: number;
  expectedCost: number;
  conflictPressure: number;
  commitmentCost: number;
  identityCost: number;
  socialCost: number;
};

NPC şu nedenlerle vazgeçebilir:

Hedef artık anlamlı değil
Maliyeti aşırı yükseldi
Daha önemli hedef çıktı
Başarı ihtimali çok düştü
Duygusal bağlılık kayboldu
Yeni bilgi hedefi geçersiz kıldı
42. Vazgeçmek her zaman olumsuz değildir

Örnek:

Mira tehlikeli biçimde tilkiyi tek başına tedavi etmeye çalışıyor.

Yeni bilgi:

Yanlış tedavi tilkiye zarar verebilir.

Bu durumda hedefi terk etmek yerine:

Tek başına tedavi et

alt hedefi terk edilir.

Ana hedef:

Tilkiye yardım et

devam eder.

Yeni alt hedef:

Şifacı getir

oluşur.

Bu bir başarısızlık değil, adaptasyondur.

43. Goal substitution

Hedefe ulaşmanın yolu veya hedefin kendisi değişebilir.

type GoalSubstitution = {
  oldGoalId: string;
  newGoalId: string;

  substitutionType:
    | "method_change"
    | "scope_reduction"
    | "scope_expansion"
    | "target_change"
    | "value_preserving";

  preservedMotivations: string[];
  reason: string;
};

Örnek:

Eski hedef:
Tilkiyi burada iyileştir.

Yeni hedef:
Tilkiyi gece boyunca hayatta tut ve sabah şifacı getir.

Temel değer korunur ama yöntem ve zaman değişir.

44. Goal persistence

NPC küçük engellerde hedefi unutmamalıdır.

Goal persistence şu faktörlerden etkilenir:

Commitment
Identity relevance
Emotional investment
Past effort
Social promise
Goal importance
Trait persistence
goalPersistence =
  commitment
  * identityBinding
  * investedEffort
  * persistenceTrait;

Ancak aşırı persistence:

inatçılık
obsesyon
sunk-cost davranışı

üretebilir.

45. Sunk cost

NPC yalnızca çok emek harcadığı için anlamsız hedefi sürdürebilir.

type SunkCostBias = {
  investedTime: number;
  investedResources: number;
  emotionalInvestment: number;
  publicCommitment: number;
};

Örnek:

Mira yanlış patikada çok uzun yürüdü.

Yeni kanıt yolun yanlış olduğunu gösteriyor.

Rasyonel seçim:

Geri dön.

Ama yüksek sunk-cost bias:

Biraz daha devam et.

kararını güçlendirebilir.

Bu hata karaktere özgü olabilir.

46. Goal momentum

Bir hedef üzerinde ilerleme sağlandıkça devam etme eğilimi artabilir.

type GoalMomentum = {
  recentProgress: number;
  progressConsistency: number;
  interruptionCount: number;
  momentumValue: number;
};

Momentum:

odaklanmayı artırır,
switching cost’u yükseltir,
hedefe bağlı action’ların görünürlüğünü artırır.

Ancak yeni tehditler yine de hedefi kesebilir.

47. Goal frustration

Hedef sürekli engellenirse frustration oluşabilir.

type GoalFrustrationState = {
  blockedDuration: number;
  failedAttempts: number;
  setbackMagnitude: number;
  frustration: number;
};

Frustration sonuçları:

Öfke
Umutsuzluk
Dürtüsellik
Yöntem değiştirme
Yardım isteme
Hedefi terk etme
Daha riskli eylemler düşünme

Karakter özellikleri bu tepkiyi değiştirir.

Sabırlı karakter:
yöntem değiştirir.

Dürtüsel karakter:
riskli bir kısayol dener.

Çekingen karakter:
vazgeçebilir.
48. Goal satisfaction

Hedefe ulaşınca yalnızca status değişmemelidir.

type GoalSatisfactionResult = {
  satisfaction: number;
  relief: number;
  pride: number;
  disappointment: number;

  valueFulfillment: Record<string, number>;
  needReduction: Record<string, number>;

  identityReinforcement: number;
};

Bir hedef tamamlanmış olabilir ama sonuç hayal kırıklığı yaratabilir.

Örnek:

Mira tilkiyi köye getirdi.
Ama tilki kafese konuldu.

Teknik hedef tamamlandı:

Tilki tedavi altında.

Fakat Mira’nın özgürlük değerine aykırı sonuç oluştu.

Satisfaction düşük
Conflict devam ediyor
Yeni hedef: Tilkinin serbest bırakılmasını sağla
49. Goal completion sonrası yeni hedefler

Bir hedefin tamamlanması yeni hedef zinciri yaratabilir.

Tilkiyi iyileştir
→ güvenini kazan
→ onu ormana geri götür
→ tuzakların kaynağını bul
→ avcının faaliyetlerini durdur

Goal completion, hikâyenin sonu olmak zorunda değildir.

50. Shared goals

Birden fazla NPC aynı hedefi paylaşabilir.

type SharedGoal = {
  sharedGoalId: string;
  participantIds: string[];

  targetState: GoalTargetState;

  sharedImportance: number;

  participantCommitments: Record<string, number>;
  roleAssignments: Record<string, string[]>;

  coordinationState:
    | "aligned"
    | "partially_aligned"
    | "conflicted"
    | "collapsed";
};

Örnek:

Mira: Tilkiyi kurtarmak istiyor.
Şifacı: Yarayı tedavi etmek istiyor.
Kardeşi: Mira’yı güvende tutmak istiyor.

Görünürde benzer hedefler vardır ama motivasyon ve kabul edilen risk farklıdır.

51. Misaligned shared goals

İki NPC aynı sonucu istiyor gibi görünse de yöntem konusunda çatışabilir.

Mira:
Tilkiyi iyileştirip serbest bırak.

Avcı:
Tilkiyi yakalayıp köyden uzaklaştır.

İkisi de:

Köyü güvende tut

hedefini savunabilir.

Fakat target state tanımları farklıdır.

Bu yüzden ortak hedefler yalnızca isim üzerinden eşleştirilmemelidir.

52. Assigned goals

Bir NPC başka bir NPC’ye görev verebilir.

“Şifacıyı getir.”

Bu, dinleyen NPC için otomatik hedef değildir.

Dinleyen karakter şunları değerlendirir:

Emri veren kişiye güveniyor mu?
Otoriteyi kabul ediyor mu?
Görev değerleriyle uyumlu mu?
Kendi hedefleriyle çatışıyor mu?
Yapabilecek durumda mı?
type GoalRequest = {
  requesterId: string;
  recipientId: string;

  proposedGoal: GoalSeed;

  authority: number;
  relationshipPressure: number;
  reward?: number;
  threat?: number;
};
53. Player-assigned goals

Oyuncu veya çocuk bir karaktere yön verebilir.

“Tilkiye yardım et.”

Bu iki farklı modda ele alınabilir:

Direct control

Oyuncu doğrudan hedefi zorunlu hale getirir.

Influential guidance

NPC talebi duyar ama kendi karakterine göre değerlendirir.

LUMI’nin yaşayan dünya yaklaşımı için ikinci model daha zengindir.

type PlayerGuidance = {
  instruction: string;

  controlMode:
    | "command"
    | "strong_suggestion"
    | "suggestion"
    | "narrative_prompt";

  compliancePressure: number;
};

Çocuk odaklı hikâyelerde ana karakter için daha yüksek kontrol, bağımsız NPC’ler için daha düşük kontrol kullanılabilir.

54. Goal awareness

NPC’nin sistemde bir hedefi olabilir ama bunu bilinçli şekilde ifade edemeyebilir.

type GoalAwareness =
  | "unconscious"
  | "implicit"
  | "felt"
  | "recognized"
  | "articulated";

Örnek:

NPC sürekli yalnız kalmaktan kaçınıyor.

Bilinçli hedefi:

Arkadaş edinmek

olmayabilir.

Gerçekte:

Belonging ihtiyacını koruma

hedefi implicit çalışıyor olabilir.

55. Goal confidence

NPC hedefe ulaşmanın mümkün olduğuna ne kadar inanıyor?

type GoalExpectation = {
  perceivedFeasibility: number;
  expectedSuccess: number;
  expectedCost: number;
  expectedTime: number;
  uncertainty: number;
};

Düşük confidence:

hedefi latent bırakabilir
yardım aramaya yönlendirebilir
umutsuzluk oluşturabilir

Yüksek ama hatalı confidence:

aşırı özgüvenli planlar

üretebilir.

56. Gerçek feasibility ile algılanan feasibility

Goal Engine NPC’nin kararları için algılanan feasibility kullanmalıdır.

Gerçek:
Şifacı yalnızca 10 dakika uzakta.

NPC’nin inancı:
Şifacı köyde değil.

Bu durumda hedef:

Şifacıyı getir

düşük algılanan feasibility taşır.

Dünya Motoru ise gerçek feasibility’yi ayrı tutar.

57. Goal memory

Unutulan hedefler olabilir.

Özellikle düşük importance ve düşük commitment hedefleri zamanla background state’e düşebilir.

type GoalMemoryState = {
  salience: number;
  recallProbability: number;
  reminderTriggers: string[];
};

Örnek:

Mira eski haritadaki sembolü araştırmak istiyordu.

Aylar sonra benzer sembolü görünce hedef yeniden aktifleşir.

58. Goal trigger

Bir hedef belirli olaylarla tekrar canlanabilir.

type GoalTrigger = {
  goalId: string;

  triggerType:
    | "perception"
    | "memory"
    | "location"
    | "person"
    | "emotion"
    | "time"
    | "consequence";

  conditions: Condition[];
  salienceBoost: number;
};

Örnek:

Tilkinin bıraktığı tüyü görmek
→ Eski tilkiyi bulma hedefini yeniden hatırlatır.
59. Goal decay

Bazı hedefler zamanla önem kaybeder.

effectiveImportance =
  baseImportance
  * decayFunction(timeSinceActivation);

Ama şu hedefler yavaş söner:

Kimlik hedefleri
Verilmiş sözler
Derin ilişkisel hedefler
Travmatik olaylardan doğan hedefler

Hızlı sönen hedefler:

Anlık merak
Küçük rahatlık hedefleri
Geçici öfke hedefleri
60. Obsession ve fixation

Bazı hedefler normalden fazla merkezileşebilir.

type GoalFixation = {
  fixationLevel: number;
  attentionCapture: number;
  competingGoalSuppression: number;
  emotionalDependency: number;
};

Örnek:

Kayıp kardeşini bulma hedefi

diğer tüm hedefleri bastırabilir.

Bu her zaman hata değildir; güçlü karakter motivasyonu olabilir.

Ancak yaşam ihtiyaçları ihmal edilirse sistem bunu risk olarak işaretlemelidir.

61. Goal guardrails

Bazı hedefler doğrudan aktifleşmemeli veya dönüştürülmelidir.

Örneğin çocuk odaklı dünya için:

Kendine ağır zarar verme
Savunmasız kişiye kasıtlı zarar
Kontrolsüz intikam
Geri dönüşsüz tehlikeli eylem

Goal Guardrail sonucu:

type GoalGuardrailResult = {
  allowed: boolean;
  transformedGoal?: GoalSeed;
  blockedReason?: string;
};

Örnek:

“Avcıyı yarala”

hedefi yerine:

“Avcıyı durdur”
“Yetişkinlere haber ver”
“Tuzaklarını etkisiz hale getir”

gibi güvenli hedefler üretilebilir.

62. Goal explanation

Her hedef açıklanabilir olmalıdır.

type GoalExplanation = {
  internal: string;
  narrative: string;
  debug: string;

  primaryMotivations: string[];
  supportingEvents: string[];
  conflictingGoals: string[];
};

Örnek:

Internal:
Mira, tilkiye karşı yüksek şefkat ve sorumluluk hissettiği için yardım hedefi oluşturdu.

Narrative:
Mira yaralı tilkiyi orada tek başına bırakmak istemedi.

Debug:
Goal activated by compassion=0.81, targetNeed=0.88,
identityAlignment=0.72, feasibility=0.63.
63. Goal Engine çıktısı
type GoalEngineResult = {
  actorId: string;
  timestamp: number;

  generatedGoalSeeds: GoalSeed[];

  activatedGoals: Goal[];
  updatedGoals: Goal[];

  pausedGoals: {
    goalId: string;
    reason: string;
  }[];

  abandonedGoals: {
    goalId: string;
    reason: string;
  }[];

  completedGoals: GoalCompletionResult[];

  goalConflicts: GoalConflict[];
  goalSupportRelations: GoalSupportRelation[];

  focusState: GoalFocusState;

  decompositionRequests: {
    goalId: string;
    reason: string;
  }[];

  actionGenerationTriggers: string[];

  explanation: {
    internal: string;
    narrative: string;
    debug: string;
  };
};
64. Örnek: Yaralı tilki senaryosu

Mira’nın mevcut hedefleri:

[
  {
    "goal": "reach_village_before_dark",
    "importance": 0.72,
    "urgency": 0.78,
    "commitment": 0.66
  },
  {
    "goal": "keep_younger_sister_safe",
    "importance": 0.92,
    "urgency": 0.55,
    "commitment": 0.94
  }
]

Yaralı tilki görüldüğünde yeni seed:

{
  "proposedGoalType": "protect_injured_fox",
  "initialImportance": 0.80,
  "initialUrgency": 0.70,
  "motivationSources": [
    "compassion",
    "identity_protect_small_creatures"
  ]
}

Goal Engine çatışmaları bulur:

Tilkiye yardım et
↔
Köye zamanında ulaş

Tilkiye yaklaş
↔
Kardeşini güvende tut

Doğrudan hedef seçmek yerine goal portfolio oluşturur:

Primary:
Tilkinin acil durumunu hafiflet.

Secondary:
Köye ulaş ve yardım getir.

Maintenance:
Kardeşini tehlikeden uzak tut.

Yeni birleşik alt hedef:

Tilkiye güvenli mesafeden yiyecek bırak,
konumu işaretle ve köyden şifacı getir.

Bu hedef:

şefkat hedefini kısmen karşılar,
köye ulaşma hedefini korur,
kardeş güvenliği hedefini ihlal etmez.
65. Örnek: Hedefin evrilmesi

Başlangıç hedefi:

Tilkiyi hemen tedavi et.

Yeni bilgi:

Mira bitkinin doğru olduğundan emin değil.
Tilki yaklaşılmasına izin vermiyor.

Goal Engine:

Ana motivasyonu korur:
Tilkiye yardım et.

Eski yöntemi bloke eder:
Doğrudan tedavi uygula.

Yeni alt hedefler üretir:
Tilkinin durumunu güvenli mesafeden incele.
Şifacıyı bul.
Tilkinin yerini işaretle.

Bu yapı sayesinde NPC:

başarısız olduğu için hedefi tamamen unutan

bir sistem gibi davranmaz.

Hedefe farklı yöntemle devam eder.

66. İlk sürüm için sade Goal Engine

İlk sürümde desteklenecek hedef kaynakları:

need
value
emotion
relationship
role
commitment
consequence
player guidance

Goal tipleri:

achieve
maintain
prevent
discover
protect
acquire
repair
reach

Durumlar:

candidate
active
paused
blocked
completed
failed
abandoned

Her goal için:

type SimpleGoal = {
  goalId: string;
  actorId: string;
  targetState: GoalTargetState;

  importance: number;
  urgency: number;
  commitment: number;
  perceivedFeasibility: number;

  progress: number;
  status: GoalStatus;

  parentGoalId?: string;

  successConditions: Condition[];
  failureConditions: Condition[];
};

İlk sınırlar:

Aktif ana hedef: en fazla 3
Arka plan hedefi: en fazla 10
Bir ana hedef için alt hedef: en fazla 6
Aynı anda decomposition depth: en fazla 3
67. Önerilen modüller
GoalEngine
├── GoalSeedCollector
├── GoalGenerator
├── GoalValidator
├── GoalActivationEvaluator
├── GoalPriorityEvaluator
├── GoalConflictDetector
├── GoalSupportResolver
├── GoalPortfolioManager
├── GoalFocusManager
├── GoalDecomposer
├── GoalProgressTracker
├── GoalCompletionEvaluator
├── GoalAdaptationManager
├── GoalMemoryManager
├── GoalGuardrail
└── GoalExplanationBuilder

İlk sürümde bunlar tek domain modülü içindeki bileşenler olarak tutulabilir.

68. Temel prensipler

Hedef, yapılacak eylem değil; ulaşılmak istenen dünya durumudur.

NPC aynı anda birden fazla hedef taşıyabilir ancak her karar anında sınırlı sayıda hedefe odaklanmalıdır.

Importance, urgency ve commitment birbirinden ayrı kavramlardır.

Düşük yapılabilirlik hedefi silmez; hedefi bloke edebilir veya yeni alt hedefler oluşturabilir.

Büyük hedefler, NPC’nin bilgisi ve yeteneklerine göre alt hedeflere ayrılmalıdır.

Hedefler birbirleriyle çatışabilir, birbirlerini destekleyebilir veya aynı kaynak için yarışabilir.

Bir hedefin yöntemi başarısız olduğunda ana motivasyon korunarak yeni yöntemler üretilebilmelidir.

Hedef tamamlanması yalnızca teknik başarı değil; karakterin değerleri, beklentileri ve duygusal tatmini açısından da değerlendirilmelidir.

NPC hedefleri unutabilir, yeniden hatırlayabilir, yanlış değerlendirebilir, gereğinden fazla bağlanabilir veya sağlıklı biçimde terk edebilir.

Consequences yeni hedefler üretir; Goal Engine bu hedefleri davranışa dönüşebilecek düzenli niyetlere çevirir.