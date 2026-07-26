Bu motor, tek bir sahneyi değil, hikâyenin uzun vadeli yönünü planlar.

Scene & Beat Orchestration şu soruya cevap veriyordu:

“Bu sahnede ne olacak?”

Narrative Planner ise şunu cevaplar:

“Bu hikâye nereye gidiyor, hangi gelişmeler hangi sırada yaşanmalı ve karakterler zaman içinde nasıl değişmeli?”

LUMI gibi yaşayan bir evrende bu motorun görevi sabit bir senaryo yazmak değildir. Görevi:

yön vermek,
açık hikâye hatlarını takip etmek,
önemli gelişmeleri zamanlamak,
karakter gelişimini korumak,
oyuncu seçimlerine rağmen anlatısal bütünlüğü sürdürmek

olmalıdır.

1. Story, Arc ve Plotline ayrımı

Bu üç kavramı birbirinden ayırmalıyız.

Story

Çocuğun deneyimlediği belirli maceradır.

Örnek:

Lila ve Kayıp Fener
Story Arc

Bir hikâye veya birden fazla hikâye boyunca gelişen büyük anlatısal değişimdir.

Örnek:

Lila'nın tilkiye güvenmeyi öğrenmesi
Plotline

Belirli bir sorun, hedef, gizem veya çatışmayı takip eden anlatı hattıdır.

Örnek:

Kayıp fenerin neden yalnızca Lila'nın elinde yandığı

Bir hikâye birden fazla plotline içerebilir.

Bir arc ise birden fazla hikâyeye yayılabilir.

2. Arc türleri

LUMI’de anlatı yaylarını birkaç temel türe ayırabiliriz.

type ArcType =
  | "ADVENTURE"
  | "CHARACTER_GROWTH"
  | "RELATIONSHIP"
  | "MYSTERY"
  | "WORLD_CHANGE"
  | "RECOVERY"
  | "DISCOVERY"
  | "MORAL_DEVELOPMENT"
  | "IDENTITY"
  | "COMMUNITY";

Örnekler:

Adventure Arc
Kayıp haritayı bul
Adalara ulaş
Fırtınayı aş
Gizli limanı keşfet
Character Growth Arc
Lila başlangıçta yardım istemekten çekinir.
Zamanla başkalarına güvenmeyi öğrenir.
Relationship Arc
Lila ve tilki birbirine yabancıdır.
Birlikte küçük sorunlar çözerler.
Güven oluşur.
Bir anlaşmazlık yaşarlar.
Daha güçlü bir bağ kurarlar.
Mystery Arc
Fener neden kendi kendine parlıyor?
Fener eski bekçiye mi ait?
Fener neyi göstermeye çalışıyor?
World Change Arc
Ormandaki nehir kurumaya başlar.
Canlılar etkilenir.
Sebep bulunur.
Denge yeniden kurulur.
3. Arc modeli
interface NarrativeArc {
  id: string;
  worldId: string;

  type: ArcType;
  title: string;
  premise: string;

  status:
    | "PLANNED"
    | "ACTIVE"
    | "PAUSED"
    | "DORMANT"
    | "COMPLETED"
    | "ABANDONED"
    | "TRANSFORMED";

  importance: number;
  urgency: number;
  visibility: number;

  startState: ArcStateVector;
  targetState: ArcStateVector;
  currentState: ArcStateVector;

  involvedCharacters: string[];
  involvedLocations: string[];
  involvedPlotlines: string[];

  milestones: ArcMilestone[];

  prerequisites: string[];
  completionConditions: string[];
  failureConditions?: string[];

  earliestStartWindow?: StoryWindow;
  preferredCompletionWindow?: StoryWindow;

  parentArcId?: string;
  childArcIds: string[];

  version: number;
}
4. Arc State Vector

Bir arc yalnızca “başladı” veya “bitmedi” şeklinde tutulmamalıdır.

interface ArcStateVector {
  progress: number;
  tension: number;
  clarity: number;
  emotionalInvestment: number;
  characterCommitment: number;
  worldImpact: number;
  uncertainty: number;
  resolutionReadiness: number;
}

Örnek:

{
  "progress": 0.35,
  "tension": 0.55,
  "clarity": 0.40,
  "emotionalInvestment": 0.75,
  "characterCommitment": 0.60,
  "worldImpact": 0.30,
  "uncertainty": 0.70,
  "resolutionReadiness": 0.20
}

Bu sayede motor yalnızca arc’ın ne kadar ilerlediğini değil, anlatısal olarak nasıl bir durumda olduğunu da anlayabilir.

5. Plotline modeli
interface Plotline {
  id: string;
  arcId?: string;

  type:
    | "GOAL"
    | "MYSTERY"
    | "THREAT"
    | "RELATIONSHIP"
    | "PROMISE"
    | "DEBT"
    | "SECRET"
    | "QUEST"
    | "RECOVERY"
    | "TRANSFORMATION";

  description: string;

  status:
    | "OPEN"
    | "ACTIVE"
    | "BLOCKED"
    | "DORMANT"
    | "PARTIALLY_RESOLVED"
    | "RESOLVED"
    | "FAILED"
    | "TRANSFORMED";

  importance: number;
  urgency: number;
  childAwareness: number;

  introducedAt: StoryPosition;

  lastAdvancedAt?: StoryPosition;
  expectedNextAdvanceWindow?: StoryWindow;

  involvedCharacters: string[];
  relatedFacts: string[];
  relatedHooks: string[];

  advancementConditions: string[];
  resolutionConditions: string[];

  consequenceIfIgnored?: string[];
}
6. Child Awareness

Sistemin bildiği her şeyi çocuk bilmemelidir.

Bir plotline için farkındalık seviyesi tutulmalıdır.

0.00 → Çocuk hiçbir şey bilmiyor
0.25 → Küçük bir ipucu gördü
0.50 → Bir sorun olduğunu fark etti
0.75 → Sorunun çoğunu anlıyor
1.00 → Plotline tamamen açık

Örneğin sistem biliyor olabilir:

Tilki eski bekçinin yardımcısıdır.

Ama çocuk yalnızca şunu biliyor olabilir:

Tilki bu yolları beklenmedik derecede iyi tanıyor.

Narrative Planner bu farkı korumalıdır.

7. Arc Milestone

Arc bir anda tamamlanmamalıdır. Ara dönüm noktalarına ayrılmalıdır.

interface ArcMilestone {
  id: string;
  arcId: string;

  type:
    | "INTRODUCTION"
    | "FIRST_PROGRESS"
    | "COMPLICATION"
    | "REVERSAL"
    | "REVELATION"
    | "COMMITMENT"
    | "CRISIS"
    | "CLIMAX"
    | "RESOLUTION"
    | "AFTERMATH";

  description: string;

  status:
    | "LOCKED"
    | "AVAILABLE"
    | "ACTIVE"
    | "COMPLETED"
    | "SKIPPED"
    | "REPLACED";

  prerequisites: string[];

  requiredStateChanges: string[];
  optionalStateChanges: string[];

  preferredStoryWindow?: StoryWindow;

  allowAlternativeFulfillment: boolean;
}
8. Arc akışı

Klasik ama esnek bir akış şöyle olabilir:

Introduction
→ First Progress
→ Complication
→ Deeper Commitment
→ Reversal
→ Crisis
→ Climax
→ Resolution
→ Aftermath

Ancak her hikâye bu yapıyı birebir kullanmak zorunda değildir.

Çocuk hikâyelerinde daha yumuşak bir örnek:

Merak
→ Küçük keşif
→ Yardım ihtiyacı
→ İş birliği
→ Beklenmedik zorluk
→ Çözüm
→ Duygusal kapanış
9. Arc Graph

Arc’ları düz bir liste yerine grafik olarak düşünmeliyiz.

Ana Macera Arc’ı
├── Kayıp Fener Gizemi
├── Lila–Tilki Güven Arc’ı
├── Ormanın Dengesini Koruma Arc’ı
└── Yaşlı Bekçinin Geçmişi

Bu arc’lar birbirine bağlı olabilir.

Örnek:

Tilki güven arc’ı ilerlemeden
bekçinin geçmişi arc’ının bazı bilgileri açılamaz.

Bu bağlantılar açıkça tanımlanmalıdır.

interface ArcDependency {
  sourceArcId: string;
  targetArcId: string;

  type:
    | "REQUIRES"
    | "UNLOCKS"
    | "SUPPORTS"
    | "COMPLICATES"
    | "MIRRORS"
    | "CONTRASTS"
    | "RESOLVES";

  threshold?: number;
}
10. Main Arc ve Supporting Arc

Her hikâyede aynı anda birçok arc çalışabilir fakat hepsi eşit görünürlükte olmamalıdır.

MAIN
SUPPORTING
BACKGROUND
DORMANT
Main Arc

O anki hikâyeyi taşıyan ana gelişme.

Supporting Arc

Ana hikâyeyi duygusal veya tematik olarak destekler.

Background Arc

Dünyada ilerlemeye devam eden fakat ön planda olmayan gelişme.

Dormant Arc

Şimdilik durdurulmuş, uygun zamanda geri dönebilecek anlatı hattı.

Örnek:

Main:
Kayıp feneri bulmak

Supporting:
Lila ile tilki arasında güven kurmak

Background:
Ormandaki su seviyesinin azalması

Dormant:
Haritada görünmeyen ada
11. Arc Rotation

Aynı arc’ın sürekli merkezde tutulması yorucu olabilir.

Planner arc’ları dönüşümlü olarak öne çıkarabilir.

Hikâye 1:
Ana odak → Kayıp Fener

Hikâye 2:
Ana odak → Tilki ile güven
Yan odak → Fener gizemi

Hikâye 3:
Ana odak → Ormandaki su sorunu
Yan odak → Fenerin davranışı

Hikâye 4:
Ana odak → Fener gizeminin büyük açıklaması

Bu yöntem uzun süreli hikâyeleri daha doğal yapar.

12. Arc Fatigue

Bir arc çok uzun süre ilerlemeden açık kalırsa çocuk ilgisini kaybedebilir.

interface ArcFatigueState {
  storiesSinceLastProgress: number;
  scenesSinceLastMention: number;

  repetitionScore: number;
  childEngagementEstimate: number;

  fatigueRisk: number;
}

Planner şu soruları sorar:

Bu arc uzun süredir ilerlemedi mi?
Sadece tekrar mı ediyor?
Yeni bir bilgi veya değişim gerekiyor mu?
Arc geçici olarak arka plana mı alınmalı?
Çözülme zamanı geldi mi?
13. Arc Advancement Budget

Her hikâyede bütün arc’lar ilerletilmemelidir.

Öneri:

1 ana arc belirgin ilerler
1–2 destek arc küçük ilerler
diğer arc’lar yalnızca hatırlatılabilir

Örnek bütçe:

interface ArcAdvancementBudget {
  majorAdvancements: number;
  minorAdvancements: number;
  reinforcementOnly: number;
  newArcIntroductions: number;
  resolutions: number;
}
14. New Arc Introduction Policy

Sistem sürekli yeni gizemler açmamalıdır.

Yeni arc ancak şu koşullarda açılabilir:

Mevcut aktif arc sayısı yaşa uygun sınırın altında mı?
Yeni arc mevcut hikâyeyle bağlantılı mı?
Çocuğun takip etmesi kolay mı?
Eski arc’lardan en az biri ilerliyor veya kapanıyor mu?
Yeni arc gerçekten uzun vadeli değer taşıyor mu?

Aksi takdirde evren sürekli yeni şeyler başlatan ama hiçbir şeyi tamamlamayan bir yapıya dönüşür.

15. Arc Saturation

Aynı anda aktif arc sayısı sınırlandırılmalıdır.

Örnek:

4–6 yaş:
1 ana + 1–2 destek arc

7–9 yaş:
1–2 ana + 2–4 destek arc

10+ yaş:
2 ana + 3–6 destek arc

Buradaki amaç kapasiteyi sınırlamak değil, anlatıyı anlaşılır tutmaktır.

16. Long-Term Story Plan

Planner gelecek hikâyeleri kesin metin olarak değil, esnek hedefler olarak planlamalıdır.

Yanlış yaklaşım:

Hikâye 7’de kesinlikle şu olacak.
Hikâye 8’de şu karakter şunu söyleyecek.

Daha iyi yaklaşım:

Önümüzdeki 2–4 hikâye içinde:
- Tilki güven arc’ında bir komplikasyon yaşanmalı.
- Fener gizemiyle ilgili ikinci büyük ipucu gösterilmeli.
- Orman su problemi ilk kez görünür hâle gelmeli.

Yani plan bir narrative intention horizon olmalıdır.

17. Planning Horizon
interface NarrativePlanningHorizon {
  immediate: PlannedIntent[];
  nearTerm: PlannedIntent[];
  midTerm: PlannedIntent[];
  longTerm: PlannedIntent[];
}
Immediate

Bir sonraki sahne veya hikâye.

Near Term

Önümüzdeki 2–3 hikâye.

Mid Term

Önümüzdeki 4–8 hikâye.

Long Term

Kesin zaman verilmeden gelecekte gerçekleşmesi düşünülen yön.

Örnek:

Immediate:
Tilki gizli yolu göstermeli.

Near Term:
Tilkinin geçmişinden küçük bir ipucu çıkmalı.

Mid Term:
Tilki ile Lila arasında bir güven sınavı yaşanmalı.

Long Term:
Tilkinin eski bekçiyle bağlantısı açıklanmalı.
18. Planned Intent
interface PlannedIntent {
  id: string;

  type:
    | "ADVANCE_ARC"
    | "INTRODUCE_HOOK"
    | "REINFORCE_HOOK"
    | "RESOLVE_HOOK"
    | "DEVELOP_CHARACTER"
    | "DEVELOP_RELATIONSHIP"
    | "CHANGE_WORLD"
    | "FORESHADOW"
    | "PROVIDE_RECOVERY"
    | "CREATE_CHOICE"
    | "PAY_OFF_CONSEQUENCE";

  description: string;

  priority: number;
  flexibility: number;

  requiredBefore?: string[];
  requiredAfter?: string[];

  eligibleStoryContexts: string[];

  expirationWindow?: StoryWindow;
}

flexibility önemli bir alandır.

0.0 → Neredeyse kesin şekilde gerçekleşmeli
1.0 → Uygun olmazsa kolayca ertelenebilir veya değişebilir
19. Story Window

Planları kesin sıra numarasına bağlamak yerine pencere kullanabiliriz.

interface StoryWindow {
  earliestStoryIndex?: number;
  latestStoryIndex?: number;

  minimumElapsedWorldTime?: number;
  maximumElapsedWorldTime?: number;

  requiredArcProgress?: number;
}

Örnek:

Tilkinin geçmişine dair büyük ipucu:
En erken 3. hikâye
En geç 6. hikâye
Güven arc’ı en az %40 ilerlemiş olmalı
20. Character Development Arc

Karakter gelişimi tek bir özellik artışı değildir.

Örneğin “Lila daha cesur oldu” demek yetersizdir.

Karakter gelişimini vektör olarak tutabiliriz.

interface CharacterDevelopmentVector {
  confidence: number;
  trust: number;
  empathy: number;
  patience: number;
  curiosity: number;
  independence: number;
  cooperation: number;
  emotionalExpression: number;
  responsibility: number;
  resilience: number;
}

Bir arc tüm değerleri yükseltmek zorunda değildir.

Örneğin:

Lila daha cesur olabilir,
ama bazen yardım istememekte ısrarcı hâle gelebilir.

Bu daha doğal bir gelişimdir.

21. Growth Direction

Her karakter gelişiminin yönü doğrusal olmamalıdır.

PROGRESS
SETBACK
PLATEAU
REGRESSION
REINTERPRETATION
INTEGRATION
Progress

Karakter yeni bir davranış gösterir.

Setback

Eski alışkanlığına geçici olarak geri döner.

Plateau

Gelişim bir süre ilerlemez.

Regression

Gerçek ve daha kalıcı bir geri gidiş olur.

Reinterpretation

Karakter önceki deneyimini farklı anlamaya başlar.

Integration

Yeni davranış artık karakterin doğal parçası hâline gelir.

22. Gelişimde tutarlılık

Karakter bir hikâyede güvenmeyi öğrendi diye sonraki hikâyede tamamen farklı biri olmamalıdır.

Örnek:

Yanlış:

Lila artık hiç korkmuyor.

Daha iyi:

Lila hâlâ korkabiliyor ama korktuğunda yardım istemeyi daha kolay hatırlıyor.

Bu nedenle gelişim davranış kalıpları üzerinden izlenmelidir.

interface BehavioralEvidence {
  traitId: string;
  context: string;
  observedBehavior: string;
  strength: number;
  storyId: string;
}
23. Relationship Arc

İlişkiler de tek bir “güven puanı” ile yönetilmemelidir.

interface RelationshipArcVector {
  trust: number;
  warmth: number;
  familiarity: number;
  respect: number;
  dependence: number;
  reciprocity: number;
  honesty: number;
  unresolvedTension: number;
  sharedHistory: number;
  repairCapacity: number;
}

Örneğin iki karakter:

Birbirini çok seviyor olabilir
ama birbirine tam güvenmiyor olabilir.

Ya da:

Birbirine güveniyor olabilir
ama sık sık anlaşamayabilir.
24. Relationship Milestones
First Contact
First Cooperation
First Trust
Shared Secret
Disagreement
Repair Attempt
Mutual Sacrifice
Deep Trust
Independent Bond

Her ilişki arc’ı tüm bu aşamaları kullanmak zorunda değildir.

Ancak önemli ilişkiler bir anda oluşmamalıdır.

25. Conflict Planning

Çatışma yalnızca kötü karakter veya tehlike değildir.

type ConflictType =
  | "EXTERNAL_OBSTACLE"
  | "GOAL_CONFLICT"
  | "RELATIONSHIP_TENSION"
  | "MISUNDERSTANDING"
  | "RESOURCE_LIMIT"
  | "TIME_PRESSURE"
  | "VALUE_DIFFERENCE"
  | "INTERNAL_HESITATION"
  | "WORLD_CONDITION"
  | "KNOWLEDGE_GAP";

Çocuk hikâyelerinde özellikle şu çatışmalar değerlidir:

yanlış anlaşılma,
farklı istekler,
korku ile merak arasındaki gerilim,
yardım isteme zorluğu,
sınırlı kaynak,
birlikte karar verme.
26. Conflict Escalation Ladder

Çatışmalar kontrollü olarak yükselmelidir.

Hint
→ Friction
→ Clear Problem
→ Complication
→ Crisis
→ Resolution
→ Repair

Örnek:

Tilki bir şey saklıyor gibi görünür.
Lila bundan rahatsız olur.
Tilki soruları cevaplamaz.
Lila ona güvenmemeye başlar.
Tehlikeli anda tilkinin gerçeği neden sakladığı ortaya çıkar.
İkisi konuşur.
İlişki yeni bir seviyeye gelir.
27. Misunderstanding Lifecycle

Yanlış anlaşılmalar çocuk hikâyelerinde çok güçlü olabilir fakat uzun süre gereksiz sürdürülmemelidir.

interface MisunderstandingArc {
  actualTruth: string;
  perceivedTruth: string;

  whoMisunderstands: string[];
  whoKnowsTruth: string[];

  introductionEvidence: string[];
  correctionEvidence: string[];

  maximumDurationStories: number;

  repairRequired: boolean;
}

Bir yanlış anlaşılma çözülünce yalnızca gerçek açıklanmamalı; duygusal etkisi de işlenmelidir.

28. Promise & Payoff sistemi

Hikâye çocuğa anlatısal sözler verir.

Örnek:

Haritada görünmeyen bir ada gösterildi.

Bu bir anlatısal sözdür. Sistem daha sonra bunu hatırlamalı ve karşılığını vermelidir.

interface NarrativePromise {
  id: string;

  promiseType:
    | "MYSTERY"
    | "CHARACTER_RETURN"
    | "ITEM_PURPOSE"
    | "LOCATION_VISIT"
    | "RELATIONSHIP_CHANGE"
    | "CONSEQUENCE"
    | "REVELATION";

  description: string;

  introducedAt: StoryPosition;

  expectedPayoffWindow?: StoryWindow;

  status:
    | "OPEN"
    | "REINFORCED"
    | "PAID_OFF"
    | "TRANSFORMED"
    | "CANCELLED";

  payoffQuality?: number;
}
29. Payoff Quality

Bir payoff yalnızca “açıklandı” diye başarılı sayılmamalıdır.

interface PayoffQualityVector {
  relevance: number;
  emotionalSatisfaction: number;
  surprise: number;
  fairness: number;
  continuity: number;
  consequenceStrength: number;
}

İyi payoff:

daha önceki ipuçlarıyla uyumlu,
tamamen rastgele değil,
duygusal anlam taşıyor,
karakter veya dünya üzerinde sonuç doğuruyor.
30. Foreshadowing

Gelecekteki gelişmeler önceden küçük işaretlerle hazırlanabilir.

Foreshadowing türleri:

OBJECT
DIALOGUE
ENVIRONMENT
BEHAVIOR
DREAM
RUMOR
MEMORY
SYMBOL
WORLD_EVENT

Örnek:

Fener, yalnızca kuzeye dönüldüğünde hafifçe parlıyor.

Daha sonra kuzeyde gizli bir yer bulunabilir.

Ancak her ayrıntı foreshadowing olmamalıdır. Aksi hâlde dünya doğal hissettirmez.

31. Retrospective Meaning

Bazı olaylar gerçekleştiğinde eski ayrıntılara yeni anlam kazandırılabilir.

Örnek:

Tilkinin sürekli eski kuleye bakması önce meraklı bir davranıştı.
Daha sonra orada yaşadığı öğrenildi.

Bu özellik uzun vadeli anlatıda güçlü bir süreklilik hissi yaratır.

32. World Arc

Bazı gelişmeler yalnızca karakterlerle ilgili değildir.

interface WorldArc {
  id: string;

  affectedRegions: string[];
  affectedSystems: string[];

  changeType:
    | "ECOLOGICAL"
    | "SOCIAL"
    | "POLITICAL"
    | "MAGICAL"
    | "SEASONAL"
    | "INFRASTRUCTURAL"
    | "CULTURAL";

  initialState: string;
  currentState: string;
  targetOrPossibleStates: string[];

  visibilityToChild: number;

  progressionDrivers: string[];
  interventionPossibilities: string[];
}

Örnek:

Ormanın su seviyesi azalıyor.
Bitkiler etkileniyor.
Hayvanlar yeni bölgelere gidiyor.
Köylüler farklı çözümler öneriyor.

Bu arc, çocuk aktif olarak ilgilenmese bile düşük yoğunlukta ilerleyebilir.

33. Background Progression

Her dünya arc’ı her hikâyede ayrıntılı hesaplanmamalıdır.

Öncelik sistemi:

DIRECTLY_RELEVANT
NEARBY_RELEVANT
BACKGROUND_ACTIVE
DORMANT
IGNORE_FOR_NOW

Daha önce konuştuğumuz gibi:

yakındaki,
etkili,
ilgili,
yaralı,
zaman hassasiyeti olan

varlıklar hesaplanır.

Alakasız bölgeler ayrıntılı simülasyona alınmaz.

Narrative Planner, World Engine’den yalnızca anlatısal olarak gerekli ilerlemeleri ister.

34. Player Choice and Arc Adaptation

Çocuğun seçimi planı bozduğunda sistem çocuğu tekrar plana zorlamamalıdır.

Üç yaklaşım olabilir:

ADAPT
DEFER
TRANSFORM
Adapt

Aynı arc farklı yoldan ilerler.

Örnek:

Çocuk tilkiyle gitmedi.
Tilkiye ait izler üzerinden gizem ilerler.
Defer

Arc geçici olarak ertelenir.

Transform

Arc başka bir arc’a dönüşür.

Örnek:

Tilki dostluk arc’ı gerçekleşmedi.
Bunun yerine uzaktan güven ve yeniden karşılaşma arc’ına dönüşür.
35. Arc Protection Level

Bazı arc’lar daha esnek, bazıları daha temel olabilir.

type ArcProtectionLevel =
  | "OPTIONAL"
  | "PREFERRED"
  | "CORE_FLEXIBLE"
  | "CORE_REQUIRED";
Optional

Olmasa da hikâye çalışır.

Preferred

Olması iyi olur fakat değiştirilebilir.

Core Flexible

Ana anlatı için önemlidir fakat farklı biçimde gerçekleşebilir.

Core Required

Hikâyenin temel önermesi için mutlaka çözülmesi gereken arc.

CORE_REQUIRED bile çocuğun belirli seçimi yapmasını zorunlu kılmamalıdır. Yalnızca anlatısal işlev korunmalıdır.

36. Failure Arc

Her hedef başarıyla tamamlanmak zorunda değildir.

Ancak çocuk hikâyelerinde başarısızlık:

cezalandırıcı,
utandırıcı,
geri döndürülemez derecede ağır

olmamalıdır.

Başarısızlık türleri:

PARTIAL_SUCCESS
TEMPORARY_FAILURE
REDIRECTED_GOAL
LEARNING_FAILURE
DELAYED_SUCCESS
COLLABORATIVE_RECOVERY

Örnek:

Lila köprüyü tamir edemedi.
Ama hangi tahtaların değişmesi gerektiğini öğrendi.
Köyden yardım istemeye karar verdi.

Bu, başarısızlığı yeni bir anlatı fırsatına dönüştürür.

37. Arc Resolution Types
type ArcResolutionType =
  | "COMPLETE"
  | "PARTIAL"
  | "BITTERSWEET"
  | "TRANSFORMATIVE"
  | "OPEN_ENDED"
  | "DEFERRED"
  | "CYCLICAL";
Complete

Ana sorun kapanır.

Partial

Bir bölüm çözülür, daha büyük konu açık kalır.

Bittersweet

Olumlu sonuç vardır fakat bir bedel veya vedalaşma bulunur.

Transformative

Sorun çözülmez, karakterin ona yaklaşımı değişir.

Open Ended

Ana anlam oluşur fakat gelecek olasılığı korunur.

Deferred

Çözüm bilinçli biçimde ertelenir.

Cyclical

Sorun farklı biçimde gelecekte tekrar ortaya çıkabilir.

38. Aftermath

Büyük arc’lar çözülünce hemen yeni maceraya geçilmemelidir.

Aftermath sahneleri gerekir.

Aftermath şunları gösterir:

karakterlerin ne hissettiği,
ilişkilerin nasıl değiştiği,
dünyanın yeni durumu,
alınan kararların sonucu,
normal hayatın nasıl etkilendiği.

Örnek:

Fener bulundu.
Ama asıl önemli olan:
Tilki artık köy meydanına korkmadan girebiliyor.
Lila ona herkesin yanında arkadaşım diyebiliyor.
39. Story Ending Planner

Bir hikâyenin bitmesi tüm arc’ların bitmesi anlamına gelmez.

Hikâye sonu şu katmanları taşıyabilir:

Session Closure
Story Goal Closure
Emotional Closure
Arc Progress
Future Hook
World Continuity

Örnek:

Session kapanır:
Lila ve tilki dinlenmeye çekilir.

Hikâye hedefi kapanır:
Kayıp fener bulunur.

Duygusal kapanış:
Lila yardım istemenin zayıflık olmadığını fark eder.

Uzun arc ilerler:
Fenerin üzerindeki sembol açıklanmaz.

Gelecek hook:
Aynı sembol haritanın kuzeyinde de vardır.
40. Ending Balance Vector
interface EndingBalanceVector {
  immediateClosure: number;
  emotionalClosure: number;
  mysteryRemaining: number;
  futurePotential: number;
  safety: number;
  satisfaction: number;
}

Çocuk hikâyelerinde:

güvenlik,
duygusal kapanış,
başarı hissi

yüksek olmalıdır.

Gelecek merakı bulunabilir ama kaygı yaratmamalıdır.

41. Story Arc Planner Pipeline
1. Aktif arc’ları yükle
2. Açık plotline ve promise’ları yükle
3. Karakter gelişim durumlarını al
4. Dünya arc’larını al
5. Son hikâyelerde hangi arc’ların işlendiğini kontrol et
6. Arc fatigue ve saturation hesapla
7. Bir sonraki hikâyenin ana odağını seç
8. Destek arc’ları seç
9. Advancement budget oluştur
10. Hikâye hedeflerini belirle
11. Milestone adaylarını seç
12. Seçimlere açık esnek plan üret
13. Story Contract oluştur
14. Scene Planner’a aktar
15. Hikâye sonunda gerçek ilerlemeyi değerlendir
16. Uzun vadeli planı güncelle
42. Story Contract

Scene Contract’ın üst seviyesidir.

interface StoryContract {
  storyId: string;
  storyRunId: string;

  primaryArcId: string;
  supportingArcIds: string[];

  primaryGoal: string;
  optionalGoals: string[];

  intendedMilestones: string[];

  startState: StoryNarrativeState;
  desiredEndState: StoryNarrativeState;

  requiredCharacters: string[];
  optionalCharacters: string[];

  requiredLocations: string[];
  optionalLocations: string[];

  targetChapterCount: number;
  targetSessionCount: number;
  targetDurationMinutes: number;

  choiceBudget: {
    minor: number;
    major: number;
    structural: number;
  };

  revealBudget: {
    hints: number;
    minorReveals: number;
    majorReveals: number;
  };

  emotionalProfile: string[];
  safetyConstraints: string[];

  requiredClosure: string[];
  futureHooksAllowed: number;
}
43. Narrative Priority Score

Bir sonraki hikâyede hangi arc’ın işleneceğini seçmek için tek bir rastgele seçim kullanılmamalıdır.

interface NarrativePriorityVector {
  importance: number;
  urgency: number;
  childInterest: number;
  timeSinceLastAdvance: number;
  readiness: number;
  dependencyPressure: number;
  consequencePressure: number;
  fatiguePenalty: number;
  repetitionPenalty: number;
  safetySuitability: number;
}

Utility Evaluator bu vektörü değerlendirerek arc adaylarını sıralayabilir.

44. Child Interest ve Narrative Need dengesi

Sistem yalnızca çocuğun en çok sevdiği şeyi tekrar tekrar üretmemelidir.

Örneğin çocuk sürekli ejderha seçiyorsa her hikâyenin ejderha olması bir süre sonra dünyayı daraltır.

Denge:

Child Preference
+
Narrative Need
+
World Relevance
+
Variety
+
Development Opportunity

Çocuğun ilgisi önemli bir sinyal olmalı ama tek belirleyici olmamalıdır.

45. Variety Memory

Planner son hikâyelerde kullanılan kalıpları takip etmelidir.

interface NarrativeVarietyMemory {
  recentLocations: string[];
  recentConflictTypes: string[];
  recentChoiceCategories: string[];
  recentArcTypes: string[];
  recentEmotionalTones: string[];
  recentResolutionTypes: string[];
}

Örnek kontrol:

Son üç hikâye de ormanda mı geçti?
Sürekli kayıp eşya mı arandı?
Sürekli yardım et / yardım etme seçimi mi verildi?
Hep aynı karakter mi rehber oldu?
Her hikâye kutlama ile mi bitti?
46. Repetition Detection

Tekrar yalnızca aynı cümle değildir.

Anlamsal tekrarlar da tespit edilmelidir.

Örnek:

Kayıp anahtar
Kayıp harita
Kayıp fener
Kayıp kolye

Nesneler farklı olsa da anlatı kalıbı aynıdır:

Bir nesne kayboldu, çocuk onu aradı ve buldu.

Planner hikâye şablonu tekrarını da izlemelidir.

47. Long-Term Consistency Validation

Uzun vadeli plan şu açılardan doğrulanmalıdır:

Karakter gelişimi tersine mi dönüyor?
Çözülmüş arc yeniden çözülmemiş gibi mi davranıyor?
Eski promise unutuldu mu?
Bir karakter bilmemesi gereken bilgiyi biliyor mu?
Bir yer yok olduktan sonra tekrar normal mi görünüyor?
Çocuğun kararı iz bırakmadan silindi mi?
Dünya değişimleri hikâyeye yansıyor mu?
Aynı duygusal ders tekrar tekrar mı veriliyor?
48. Arc Revision

Uzun plan sabit kalmamalıdır.

Planner belirli aralıklarla arc’ları yeniden değerlendirmeli.

KEEP
ACCELERATE
SLOW_DOWN
PAUSE
MERGE
SPLIT
TRANSFORM
RESOLVE_EARLY
ABANDON_GRACEFULLY
Merge

İki benzer arc birleşir.

Örnek:

Kayıp su kaynağı
+
Eski değirmenin sırrı

tek bir arc’a dönüşebilir.

Split

Bir arc iki ayrı gelişime ayrılır.

Abandon Gracefully

Artık anlamlı olmayan arc sessizce kaybolmamalıdır. Küçük bir kapanış verilir.

49. Graceful Abandonment

Örneğin çocuk belirli bir yan göreve hiç ilgi göstermedi.

Sistem bunu sonsuza kadar açık tutmamalıdır.

Doğal kapanış:

“Yaşlı denizci, haritayı başka bir araştırmacıya verdi. Yine de Lila’ya adanın küçük bir çizimini bıraktı.”

Böylece arc kapanır fakat dünya yapay hissettirmez.

50. Planner’ın karar vermemesi gereken şeyler

Narrative Planner her şeyi yönetmemelidir.

Planner şunları belirler:

hangi arc ilerlemeli,
hangi milestone hedeflenmeli,
hangi tür sonuç gerekli,
hangi anlatı sözleri korunmalı.

Planner şunları doğrudan belirlememelidir:

tam cümleler,
kesin diyaloglar,
ses dosyaları,
animasyon zamanları,
her beat’in teknik oynatımı.

Bunlar alt motorlara aittir.

51. Motor sınırları
Narrative Planner
→ Uzun vadeli yön ve hedef

Story Planner
→ Tek hikâyenin yapısı

Scene Planner
→ Sahne amaçları ve beat yapısı

Narrative Generator
→ Metin ve diyalog

Playback Orchestrator
→ İçeriğin sunumu

World Engine
→ Gerçek dünya durumunun uygulanması

Decision Engine
→ Karakter ve sistem kararları

Bu ayrım ileride sistemin karışmasını engeller.

52. Örnek uzun vadeli plan
Ana Arc
Kayıp Fenerin Sırrı
Destek Arc’lar
Lila–Tilki güven ilişkisi
Ormanın su dengesinin bozulması
Yaşlı bekçinin geçmişi
Hikâye 1
Fener bulunur.
Tilkiyle ilk güven oluşur.
Fenerin kuzeye dönünce parladığı görülür.
Hikâye 2
Tilki Lila’yı gizli yola götürür.
Ormandaki su seviyesinin azaldığı fark edilir.
Tilkinin eski bekçiyi tanıdığına dair ipucu verilir.
Hikâye 3
Lila ve tilki bir konuda anlaşamaz.
Güven arc’ında komplikasyon yaşanır.
Fenerin eski su yollarına tepki verdiği ortaya çıkar.
Hikâye 4
İkili birlikte çalışmak zorunda kalır.
İlişki onarılır.
Eski bekçinin feneri neden sakladığı açıklanır.
Hikâye 5
Su sorununun gerçek nedeni bulunur.
Ana fener arc’ı kısmen çözülür.
Haritadaki görünmeyen ada yeni uzun vadeli hook olur.

Bu bir senaryo değil, esnek bir yön planıdır.

53. Önerilen ana servisler
NarrativePlannerService
ArcManager
PlotlineManager
MilestonePlanner
PromiseAndPayoffManager
ForeshadowingManager
CharacterArcPlanner
RelationshipArcPlanner
WorldArcPlanner
ConflictPlanner
EndingPlanner
NarrativeVarietyManager
ArcFatigueEvaluator
ArcRevisionManager
LongTermConsistencyValidator
54. Sabit prensipler
Uzun vadeli plan kesin senaryo değil, esnek niyet planıdır.
Story, Arc ve Plotline ayrı kavramlardır.
Her arc milestone’lara bölünür.
Aynı anda aktif arc sayısı sınırlıdır.
Her hikâyede bütün arc’lar ilerletilmez.
Çocuğun seçimleri planı değiştirebilir.
Ana arc’lar bile tek bir seçim yoluna bağlı olmamalıdır.
Karakter gelişimi doğrusal olmak zorunda değildir.
İlişkiler tek puanla temsil edilmez.
Narrative promise’lar takip edilmeli ve karşılığı verilmelidir.
Çözümden sonra aftermath gösterilmelidir.
Tekrarlanan anlatı kalıpları tespit edilmelidir.
Gereksiz arc’lar doğal biçimde kapatılmalıdır.
Kabul edebileceğimiz karar seti
Narrative Planner uzun vadeli anlatı yönünü yönetir.
Arc, Plotline ve Story ayrı veri modelleridir.
Arc’lar vektör tabanlı ilerleme durumuna sahiptir.
Planlama Immediate, Near-Term, Mid-Term ve Long-Term katmanlarından oluşur.
Her hikâye bir ana arc ve sınırlı sayıda destek arc seçer.
Arc advancement budget kullanılır.
Character ve Relationship gelişimleri ayrı vektörlerle tutulur.
Promise, Foreshadowing ve Payoff yaşam döngüsü takip edilir.
Çocuk seçimleri sonucunda arc Adapt, Defer veya Transform edilebilir.
Story Contract, uzun vadeli planı sahne planlamasına aktarır.