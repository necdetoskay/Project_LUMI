Scene, Beat & Narrative Flow Orchestration

Bu katman, hikâyenin yalnızca ne anlattığını değil, hangi sırayla, hangi yoğunlukta ve hangi dramatik ritimle ilerlediğini yönetir.

Story Session Engine oturumu yönetiyordu. Bu katman ise oturum içinde oynatılacak anlatının yapısını kurar.

Temel soru şudur:

“Bir sahnede hangi olaylar, hangi sırada, ne kadar süreyle ve hangi seçim noktalarıyla gerçekleşmeli?”

1. Scene ile Beat ayrımı

Bir Scene, belirli bir zaman, mekân ve anlatısal amaç içinde gerçekleşen olay bütünüdür.

Bir Beat ise sahnenin içindeki anlamlı en küçük dramatik değişimdir.

Örnek sahne:

Sahne:
Lila ve yaralı tilki, sisli köprüye ulaşır.

Bu sahnenin beat’leri:

1. Köprü uzaktan görünür.
2. Tilki yavaşlar.
3. Köprüden garip bir ses gelir.
4. Lila köprüye yaklaşır.
5. Tahtalardan biri kırılır.
6. Tilki gizli yolu fark eder.
7. Çocuğa seçim sunulur.

Her beat hikâyede bir şeyi değiştirmelidir.

Bu değişim:

bilgi,
duygu,
ilişki,
hedef,
risk,
ortam,
beklenti,
karar imkânı

olabilir.

Hiçbir şeyi değiştirmeyen beat, büyük ihtimalle gereksizdir.

2. Scene’in temel amaçları

Her sahnenin en az bir ana amacı olmalıdır.

type ScenePurpose =
  | "INTRODUCTION"
  | "EXPLORATION"
  | "DISCOVERY"
  | "CHARACTER_BONDING"
  | "CONFLICT"
  | "DECISION"
  | "CONSEQUENCE"
  | "RECOVERY"
  | "TRANSITION"
  | "REVELATION"
  | "RESOLUTION"
  | "REFLECTION";

Bir sahne birden fazla amaca sahip olabilir. Ancak birincil amacı belirlenmelidir.

Örnek:

{
  "primaryPurpose": "DISCOVERY",
  "secondaryPurposes": [
    "CHARACTER_BONDING",
    "DECISION"
  ]
}

Bu ayrım, sahnenin dağılmasını engeller.

3. Scene Contract

Her sahne başlamadan önce motorun elinde bir “sahne sözleşmesi” bulunmalıdır.

Bu sözleşme, sahnenin neyi başarması gerektiğini tanımlar.

interface SceneContract {
  sceneId: string;

  locationId: string;
  timeContext: string;

  participants: string[];

  primaryPurpose: ScenePurpose;
  secondaryPurposes: ScenePurpose[];

  entryState: NarrativeState;
  desiredExitState: NarrativeState;

  requiredFacts: string[];
  optionalFacts: string[];

  requiredEmotionalShift?: EmotionalShift;

  requiredDecision?: DecisionRequirement;

  maximumBeatCount: number;
  targetDurationMinutes: number;

  allowedIntensityRange: {
    min: number;
    max: number;
  };

  safetyConstraints: string[];

  continuityConstraints: string[];

  unresolvedHooksToPreserve: string[];
}

Bu yapı sayesinde Narrative Engine yalnızca güzel metin üretmez; sahnenin görevini de tamamlar.

4. Entry State ve Exit State

Her sahne bir başlangıç durumuyla açılır ve farklı bir durumla kapanmalıdır.

Örnek:

Entry:
- Lila tilkiye tam güvenmiyor.
- Köprünün güvenli olduğu sanılıyor.
- Hedef karşı kıyıya geçmek.

Exit:
- Köprünün tehlikeli olduğu öğrenildi.
- Tilki gizli bir yol bildiğini gösterdi.
- Lila tilkiye daha fazla güveniyor.
- Yeni hedef: gizli geçidi bulmak.

Bir sahne sonunda hiçbir şey değişmediyse o sahnenin anlatısal değeri düşüktür.

5. Narrative State Vector

Daha önce konuştuğumuz vektör yaklaşımı burada da kullanılmalı.

Bir sahnenin anlatısal durumu tek sayı olmamalıdır.

interface NarrativeStateVector {
  tension: number;
  curiosity: number;
  safety: number;
  emotionalWarmth: number;
  uncertainty: number;
  urgency: number;
  wonder: number;
  humor: number;
  agency: number;
  relationshipFocus: number;
  discoveryPotential: number;
  closure: number;
}

Örneğin çocuk köprü sahnesine girerken:

{
  "tension": 0.25,
  "curiosity": 0.70,
  "safety": 0.80,
  "emotionalWarmth": 0.45,
  "uncertainty": 0.40,
  "urgency": 0.20,
  "wonder": 0.65,
  "humor": 0.10,
  "agency": 0.30,
  "relationshipFocus": 0.50,
  "discoveryPotential": 0.80,
  "closure": 0.10
}

Sahnenin sonunda:

{
  "tension": 0.55,
  "curiosity": 0.85,
  "safety": 0.55,
  "emotionalWarmth": 0.65,
  "uncertainty": 0.60,
  "urgency": 0.35,
  "wonder": 0.70,
  "humor": 0.05,
  "agency": 0.75,
  "relationshipFocus": 0.75,
  "discoveryPotential": 0.90,
  "closure": 0.20
}

Bu değişim sahnenin dramatik yönünü gösterir.

6. Beat türleri

Beat’leri içeriklerine göre sınıflandırabiliriz.

type BeatType =
  | "ESTABLISHING"
  | "ACTION"
  | "DIALOGUE"
  | "REACTION"
  | "DISCOVERY"
  | "EMOTIONAL_SHIFT"
  | "CONFLICT_ESCALATION"
  | "RELIEF"
  | "FORESHADOWING"
  | "CHOICE_SETUP"
  | "INTERACTION"
  | "CONSEQUENCE"
  | "TRANSITION"
  | "REFLECTION";

Örnek akış:

ESTABLISHING
→ DISCOVERY
→ REACTION
→ DIALOGUE
→ CONFLICT_ESCALATION
→ CHOICE_SETUP
→ INTERACTION
→ CONSEQUENCE

Aynı tip beat’lerin arka arkaya aşırı kullanılması sahneyi monotonlaştırabilir.

Örneğin:

DIALOGUE
DIALOGUE
DIALOGUE
DIALOGUE
DIALOGUE

yerine:

DIALOGUE
REACTION
ENVIRONMENTAL_CHANGE
DIALOGUE
DISCOVERY

daha doğal hissettirir.

7. Beat Contract

Her beat de küçük bir sözleşmeye sahip olabilir.

interface BeatContract {
  beatId: string;
  sceneId: string;

  type: BeatType;

  purpose: string;

  requiredInputState: NarrativeStateVector;
  expectedOutputDelta: Partial<NarrativeStateVector>;

  activeCharacters: string[];

  requiredInformation?: string[];
  hiddenInformation?: string[];

  interactionAllowed: boolean;
  interactionRequired: boolean;

  canBeSkipped: boolean;
  canBeCompressed: boolean;

  estimatedDurationSeconds: number;

  emotionalIntensity: number;
  narrativeImportance: number;
}

Bu yapı, sistemin oturum süresine göre bazı beat’leri sıkıştırmasına izin verir.

8. Mandatory, Optional ve Adaptive Beat’ler

Her beat aynı önemde değildir.

MANDATORY
OPTIONAL
ADAPTIVE
Mandatory

Hikâyenin anlaşılması için gereklidir.

Örnek:

Köprünün kırık olduğunun gösterilmesi
Tilkinin gizli yolu bildiğinin açıklanması
Çocuğa karar sunulması
Optional

Atmosfer veya karakter derinliği katar.

Örnek:

Kuşların siste kaybolması
Lila’nın eski bir şarkıyı hatırlaması
Tilkinin komik bir şekilde hapşırması
Adaptive

Çocuğun profiline veya mevcut dünya durumuna göre eklenir.

Örnek:

Karanlıktan korkan çocuk için güven verici beat
Uzayı seven çocuk için yıldızlarla ilgili ayrıntı
Daha önce tilkiye yardım eden çocuk için özel diyalog
9. Scene Beat Budget

Her sahnenin sınırsız beat üretmesine izin verilmemelidir.

interface SceneBeatBudget {
  minimumBeats: number;
  targetBeats: number;
  maximumBeats: number;

  mandatoryBeatCount: number;
  optionalBeatLimit: number;
  adaptiveBeatLimit: number;

  targetDurationSeconds: number;
}

Örnek:

{
  "minimumBeats": 5,
  "targetBeats": 8,
  "maximumBeats": 11,
  "mandatoryBeatCount": 5,
  "optionalBeatLimit": 3,
  "adaptiveBeatLimit": 2,
  "targetDurationSeconds": 240
}

Bu bütçe, gereksiz uzayan sahneleri engeller.

10. Narrative Rhythm

Hikâye sürekli yükselen gerilimden oluşmamalıdır.

İyi bir ritim:

Kurulum
→ Merak
→ Küçük keşif
→ Rahatlama
→ Yeni soru
→ Gerilim
→ Karar
→ Sonuç
→ Nefes alma

Çocuk hikâyelerinde özellikle şu hata yapılmamalıdır:

Tehlike
→ Daha büyük tehlike
→ Daha büyük tehlike
→ Daha büyük tehlike

Bu yapı yorucu ve kaygı verici olabilir.

Bu nedenle her yüksek yoğunluklu beat’ten sonra bir regulation beat gerekebilir.

11. Regulation Beat

Regulation Beat, duygusal yoğunluğu dengeler.

Örnekleri:

karakterin güven verici konuşması,
komik küçük bir an,
sakin çevre betimlemesi,
arkadaşlık göstergesi,
tehlikenin kontrol altında olduğunun belirtilmesi,
çocuğa düşünme zamanı verilmesi.
interface RegulationBeat {
  triggerIntensityThreshold: number;
  regulationType:
    | "REASSURANCE"
    | "HUMOR"
    | "PAUSE"
    | "WARM_DIALOGUE"
    | "SAFE_ENVIRONMENT"
    | "BREATHING_SPACE";

  expectedIntensityReduction: number;
}

Örneğin:

Köprü tahtası kırılır.
Lila korkar.
Tilki hemen yanında durur ve:
“Merak etme, başka bir yol biliyorum,” der.

Burada gerilim tamamen yok olmaz ama güven hissi geri gelir.

12. Tension Curve

Her sahnenin bir gerilim eğrisi olabilir.

0.20 → 0.30 → 0.45 → 0.60 → 0.40 → 0.55 → 0.35

Bu eğri sahnenin dramatik formunu gösterir.

Çocuklar için önerilen yapı:

Başlangıç: düşük veya orta
Orta bölüm: kontrollü yükseliş
Karar öncesi: belirgin ama güvenli tepe
Karar sonrası: rahatlama veya merak
Sahne sonu: güvenli açık uç

Çok küçük çocuklarda sahne gerilimi belirlenen üst sınırı aşmamalıdır.

13. Curiosity Curve

Gerilim ile merak aynı şey değildir.

Bir sahne korkutucu olmadan da yüksek merak taşıyabilir.

Örnek:

parlayan bir kapı,
konuşan bir taş,
ters akan bir dere,
kimseye ait olmayan ayak izleri.

Bu nedenle ayrı bir merak eğrisi tutulmalı.

interface NarrativeCurve {
  beatIndex: number;
  tension: number;
  curiosity: number;
  warmth: number;
  agency: number;
  closure: number;
}

LUMI’nin birçok hikâyesinde gerilim yerine merak ana taşıyıcı olabilir.

14. Information Reveal Management

Hikâyedeki bilgiler tek seferde açıklanmamalıdır.

Bilgiler şu kategorilere ayrılabilir:

KNOWN
SUSPECTED
HINTED
HIDDEN
REVEALED
MISUNDERSTOOD

Örnek:

Bilgi:
Tilki aslında ormandaki kayıp bekçinin yardımcısıdır.

Başlangıçta:

HIDDEN

İlk iz:

Tilkinin boynunda eski bir rozet vardır.
→ HINTED

Daha sonra:

Tilki kapalı yolu tanır.
→ SUSPECTED

Sonunda:

Bekçi tilkiyi tanır.
→ REVEALED
15. Reveal Budget

Bir sahne çok fazla önemli bilgiyi aynı anda açıklamamalıdır.

interface RevealBudget {
  majorRevealLimit: number;
  minorRevealLimit: number;
  hintLimit: number;
}

Örneğin bir sahnede:

1 büyük açıklama
2 küçük açıklama
3 ipucu

sınırı olabilir.

Aksi hâlde çocuk anlatıyı takip etmekte zorlanabilir.

16. Narrative Hook

Hook, ileride tamamlanması beklenen anlatısal sorudur.

Örnek:

Fener neden yalnızca Lila’nın elinde yanıyor?
Tilki neden eski köprüyü biliyor?
Haritada olmayan ada nereden çıktı?
Yaşlı denizci neden gerçeği sakladı?
interface NarrativeHook {
  id: string;

  question: string;

  introducedInSceneId: string;

  status:
    | "OPEN"
    | "REINFORCED"
    | "PARTIALLY_RESOLVED"
    | "RESOLVED"
    | "ABANDONED";

  importance: number;
  urgency: number;

  earliestResolutionScene?: string;
  latestResolutionWindow?: number;

  relatedCharacters: string[];
  relatedWorldFacts: string[];
}
17. Hook saturation

Çok fazla açık soru hikâyeyi karmaşıklaştırır.

Bu nedenle aynı anda açık hook sayısı sınırlandırılmalıdır.

Örnek yaşa göre:

4–6 yaş: 1–3 aktif ana hook
7–9 yaş: 2–5 aktif ana hook
10+ yaş: 3–7 aktif ana hook

Yan hook’lar olabilir ama ana anlatıyı bastırmamalıdır.

Motor yeni hook açmadan önce şunu kontrol etmeli:

Mevcut hook sayısı yüksek mi?
Eski hook’lardan biri güçlendirilmeli mi?
Bir hook kapatılmalı mı?
Yeni soru gerçekten gerekli mi?
18. Hook Reinforcement

Bir hook uzun süre görünmez kalırsa çocuk onu unutabilir.

Bu nedenle zaman zaman küçük hatırlatmalar yapılmalı.

Örnek:

Lila yürürken fener bir kez daha kendi kendine parladı.

Bu, sırrı açıklamaz ama hook’u canlı tutar.

Reinforcement yolları:

görsel tekrar,
karakter sorusu,
çevresel işaret,
eşya davranışı,
kısa diyalog,
rüya veya hatıra,
başka karakterin tepkisi.
19. Scene Transition

Sahne geçişleri yalnızca mekân değişimi değildir.

Geçiş türleri:

type SceneTransitionType =
  | "LOCATION_CHANGE"
  | "TIME_SKIP"
  | "GOAL_CHANGE"
  | "EMOTIONAL_SHIFT"
  | "POINT_OF_VIEW_CHANGE"
  | "CONSEQUENCE_FOLLOWUP"
  | "REST_TRANSITION"
  | "CHAPTER_TRANSITION";

Her geçişin açık bir nedeni olmalı.

Yanlış:

Bir anda başka bir yerdeydiler.

Daha iyi:

Tilkinin gösterdiği dar patikayı izlediler.
Sis inceldikçe eski değirmenin çatısı görünmeye başladı.

Burada geçiş hem mekânsal hem anlatısal olarak bağlanır.

20. Transition Bridge

Sahneler arasında bağlayıcı kısa beat kullanılabilir.

interface TransitionBridge {
  fromSceneId: string;
  toSceneId: string;

  transitionType: SceneTransitionType;

  continuityText: string;

  carriesForward:
    | "GOAL"
    | "EMOTION"
    | "OBJECT"
    | "QUESTION"
    | "RELATIONSHIP"
    | "THREAT";

  durationSeconds: number;
}

Bu sistem ani ve kopuk sahne değişimlerini azaltır.

21. Choice Setup Beat

Bir seçim çocuğun önüne aniden bırakılmamalıdır.

Önce seçim zemini hazırlanmalıdır.

İyi seçim akışı:

1. Durum açıklanır.
2. Seçeneklerin sonuç ihtimalleri sezdirilir.
3. Karakterlerin görüşleri sunulabilir.
4. Çocuğa karar alanı açılır.

Örnek:

Köprü sallanıyordu.
Tilki, derenin aşağısında dar bir geçit gördüğünü söyledi.
Köprü daha kısa ama riskliydi.
Geçit daha güvenli ama yolu uzatabilirdi.

Sonra:

Köprüden mi geçelim?
Yoksa aşağıdaki yolu mu deneyelim?
22. Meaningful Choice

Her seçim anlamlı olmalıdır.

Anlamlı bir seçimde seçenekler arasında en az bir fark bulunur:

risk,
zaman,
ilişki,
kaynak,
bilgi,
duygu,
dünya etkisi,
karakter gelişimi,
sonraki sahne,
ödül veya bedel.

Sahte seçim:

Sağa git
Sola git

İki yol da tamamen aynı sonucu veriyorsa bu yalnızca kozmetik seçimdir.

Kozmetik seçimler kullanılabilir ama sistem bunu anlamlı karar gibi sunmamalıdır.

23. Choice Categories
type ChoiceCategory =
  | "TACTICAL"
  | "MORAL"
  | "RELATIONAL"
  | "EXPLORATORY"
  | "RESOURCE"
  | "EMOTIONAL"
  | "IDENTITY"
  | "COSMETIC"
  | "PACING";

Örnekler:

TACTICAL:
Köprü mü, gizli yol mu?

MORAL:
Tilkiye yardım etmek mi, göreve devam etmek mi?

RELATIONAL:
Arkadaşına güvenmek mi, tek başına ilerlemek mi?

EXPLORATORY:
Mağarayı incelemek mi, haritayı takip etmek mi?

RESOURCE:
Fener yağını şimdi kullanmak mı, saklamak mı?

EMOTIONAL:
Korktuğunu söylemek mi, sessiz kalmak mı?

IDENTITY:
Cesur bir lider gibi mi, dikkatli bir araştırmacı gibi mi davranmak?

COSMETIC:
Kırmızı pelerin mi, mavi pelerin mi?

PACING:
Hemen yola çıkmak mı, önce dinlenmek mi?
24. Choice Weight

Her seçimin anlatısal etkisi aynı değildir.

LOW_IMPACT
MEDIUM_IMPACT
HIGH_IMPACT
WORLD_ALTERING
Low Impact
kısa diyalog değişir,
küçük animasyon,
geçici duygu etkisi.
Medium Impact
bir ilişki değişir,
farklı sahne açılır,
bir eşya kazanılır veya kullanılır.
High Impact
önemli karakter ilişkisi,
kalıcı durum değişimi,
büyük olay yönü değişir.
World Altering
bölge kalıcı şekilde değişir,
önemli karakter ayrılır,
ana hikâye hattı yön değiştirir.

Çocuk hikâyesinde WORLD_ALTERING seçimler seyrek ve açık biçimde hazırlanmalıdır.

25. Choice Consequence Horizon

Her seçimin sonucu hemen görünmek zorunda değildir.

type ConsequenceHorizon =
  | "IMMEDIATE"
  | "SAME_SCENE"
  | "NEXT_SCENE"
  | "LATER_CHAPTER"
  | "FUTURE_STORY"
  | "WORLD_PERSISTENT";

Örnek:

Tilkiye yardım etmek:
- IMMEDIATE: Tilki sakinleşir.
- SAME_SCENE: Gizli yolu gösterir.
- LATER_CHAPTER: Lila’yı bir tehlikeden kurtarır.
- FUTURE_STORY: Tilkinin ailesiyle bağ kurulur.
- WORLD_PERSISTENT: Orman halkı Lila’ya daha çok güvenir.

Bu katmanlı sonuç yapısı LUMI’nin “yaşayan dünya” hissini güçlendirir.

26. Consequence Echo

Eski kararlar daha sonra küçük yankılarla hatırlatılabilir.

Örnek:

“Tilki, Lila’nın daha önce ona uzattığı mavi mendili hâlâ boynunda taşıyordu.”

Bu küçük detay:

hafıza,
ilişki,
süreklilik,
duygusal ödül

oluşturur.

Her sonuç büyük bir olay olmak zorunda değildir. Bazı kararların en güçlü etkisi küçük bir hatırlamadır.

27. Choice Diversity

Arka arkaya aynı tür seçimler verilmemeli.

Örneğin sürekli:

Yardım et
Yardım etme

sunmak zamanla mekanik hale gelir.

Seçim dağılımı:

Exploratory
→ Relational
→ Tactical
→ Emotional
→ Resource

şeklinde çeşitlendirilebilir.

28. Decision Density

Çok fazla seçim çocuğu yorabilir. Çok az seçim ise pasif hissettirebilir.

interface DecisionDensityProfile {
  minimumMinutesBetweenMajorChoices: number;
  maximumMinorChoicesPerScene: number;
  maximumMajorChoicesPerChapter: number;
  preferredChoiceCount: number;
}

Genel yaklaşım:

Kısa sahne:
0–1 anlamlı seçim

Orta sahne:
1 anlamlı seçim
gerekirse 1 küçük etkileşim

Uzun sahne:
1–2 anlamlı seçim
birkaç düşük etkili etkileşim

Her paragraf sonunda seçim vermek hikâyeyi oyun menüsüne dönüştürür.

29. Agency Vector

Çocuğun hikâyedeki etki hissi de vektör olarak tutulabilir.

interface AgencyVector {
  pathInfluence: number;
  relationshipInfluence: number;
  worldInfluence: number;
  identityInfluence: number;
  discoveryInfluence: number;
  pacingInfluence: number;
}

Bazı hikâyelerde çocuk dünyayı az, ilişkileri çok etkileyebilir.

Örneğin:

{
  "pathInfluence": 0.40,
  "relationshipInfluence": 0.90,
  "worldInfluence": 0.20,
  "identityInfluence": 0.75,
  "discoveryInfluence": 0.65,
  "pacingInfluence": 0.30
}

Bu, “seçimlerin hepsi evreni değiştirmeli” baskısını ortadan kaldırır.

30. Branch Management

Her seçim tamamen farklı hikâye dalları üretirse sistem kısa sürede kontrol edilemez hale gelir.

Bu nedenle üç dallanma türü öneriyorum:

MICRO_BRANCH
TEMPORARY_BRANCH
STRUCTURAL_BRANCH
Micro Branch

Kısa süreli farklı içerik üretir, sonra aynı akışa döner.

Farklı diyalog
Farklı küçük animasyon
Farklı duygu etkisi
Temporary Branch

Bir veya birkaç sahne farklı ilerler, sonra yeniden birleşir.

Köprü yolu
Gizli dere yolu

İki yol daha sonra değirmende birleşebilir.

Structural Branch

Hikâyenin ana yönünü değiştirir.

Tilkiyle devam etmek
Köye dönmek

Structural branch seyrek kullanılmalıdır.

31. Branch Rejoin

Dalların birleşmesi doğal olmalıdır.

Yanlış:

Hangi yolu seçersen seç aynı kapıya çıktın.

Bu seçim etkisiz görünür.

Daha iyi:

Köprüyü seçen çocuk:
Daha hızlı ulaştı ama fener zarar gördü.

Gizli yolu seçen çocuk:
Daha geç ulaştı ama yeni bir taş buldu.

İki yol aynı değirmene çıkabilir ama sonuçları farklı kalır.

Yani:

Yol birleşebilir, durum birleşmek zorunda değildir.

32. State-Preserving Rejoin

Dallar birleştiğinde önceki kararların izleri korunmalıdır.

interface BranchRejoinState {
  commonSceneId: string;

  preservedEffects: string[];

  branchSpecificDialogue: string[];

  branchSpecificInventory: string[];

  relationshipDifferences: string[];

  unresolvedConsequences: string[];
}

Bu sayede hikâye yönetilebilir kalırken seçimler değersizleşmez.

33. Narrative Compression

Oturum süresi azalınca sahne kesilmek yerine sıkıştırılabilir.

Sıkıştırılabilir öğeler:

çevre betimlemeleri,
ikincil diyaloglar,
tekrar eden bilgiler,
kozmetik etkileşimler,
düşük etkili yan hook’lar.

Sıkıştırılmaması gerekenler:

temel olay nedeni,
önemli duygu geçişi,
seçim zemini,
sonuç beat’i,
güvenlik açıklaması,
ana karakter motivasyonu.
interface CompressionPolicy {
  preserveMandatoryBeats: boolean;
  preserveChoiceSetup: boolean;
  preserveEmotionalTransitions: boolean;

  removeOptionalDescriptionFirst: boolean;
  mergeCompatibleBeats: boolean;
  reduceDialogueTurns: boolean;
}
34. Beat Merging

Bazı beat’ler süre kısalınca birleştirilebilir.

Ayrı hâli:

1. Sis yoğunlaşır.
2. Lila yavaşlar.
3. Tilki kulaklarını diker.

Birleşmiş hâli:

“Sis yoğunlaşınca Lila yavaşladı; tilki ise kulaklarını dikkatle ileri çevirdi.”

Anlatı korunur ama playback süresi azalır.

35. Scene Expansion

Çocuk belirli bir sahneye yoğun ilgi gösterirse sahne kontrollü biçimde genişletilebilir.

Örnek sinyaller:

görsel ayrıntılara tekrar dokunma,
bir karakteri daha çok dinleme,
haritayı inceleme,
tekrar tekrar soru sorma,
keşif seçeneğini tercih etme.

Genişletilebilecek içerikler:

ek keşif beat’i,
kısa karakter diyaloğu,
çevresel ayrıntı,
küçük yan görev,
güvenli mini etkileşim.

Ancak sahne ana amacını kaybetmemelidir.

36. Scene Exit Conditions

Bir sahne ne zaman tamamlanmış sayılacak?

interface SceneExitCondition {
  requiredGoalsCompleted: string[];
  requiredFactsDelivered: string[];
  requiredInteractionsResolved: string[];
  requiredStateChangesApplied: string[];

  minimumBeatCountReached: boolean;
  safeToTransition: boolean;

  unresolvedCriticalConflict: boolean;
}

Sahne yalnızca tüm playback unit’leri oynatıldığı için tamamlanmış sayılmamalıdır.

Anlatısal hedefi gerçekleşmiş olmalıdır.

37. Scene Failure

Bazen sahne planlanan amacını tamamlayamayabilir.

Örnek:

gerekli karakter artık sahnede değil,
envanter nesnesi yok,
çocuk seçim yapmadan çıktı,
içerik güvenlik kontrolünden geçmedi,
dünya durumu değişti.

Bu durumda seçenekler:

REPLAN_SCENE
SUBSTITUTE_BEAT
SKIP_OPTIONAL_GOAL
DEFER_REVEAL
CREATE_RECOVERY_SCENE
PAUSE_SESSION

Sistem kırılmış bir sahneyi zorla oynatmamalıdır.

38. Recovery Scene

Recovery Scene, tutarlılık bozulduğunda anlatıyı doğal biçimde yeniden hizalar.

Örnek:

Planlanan sahnede tilkinin olması gerekiyordu ama tilki önceki kararda köyde kaldı.

Motor şunu yapmamalı:

Tilki bir anda yine ortaya çıktı.

Bunun yerine:

Lila köprüye yalnız ulaştı.
Taşların üzerinde tilkinin bıraktığı pati işaretlerini gördü.
Bu işaretler ona gizli yolu gösterdi.

Böylece sahne amacı korunur ama dünya durumu ihlal edilmez.

39. Character Participation Roles

Bir sahnedeki her karakter aynı anlatısal role sahip değildir.

type SceneCharacterRole =
  | "PROTAGONIST"
  | "COMPANION"
  | "GUIDE"
  | "OBSERVER"
  | "OBSTACLE"
  | "INFORMANT"
  | "EMOTIONAL_ANCHOR"
  | "COMIC_RELIEF"
  | "DECISION_INFLUENCER"
  | "BACKGROUND";

Bir karakter aynı sahnede birden fazla role sahip olabilir.

Örneğin tilki:

COMPANION
GUIDE
EMOTIONAL_ANCHOR

Bu roller, karakterlerin neden sahnede bulunduğunu netleştirir.

40. Dialogue Turn Budget

Çok fazla karakter konuşursa sahne karışabilir.

interface DialogueBudget {
  maximumSpeakersPerBeat: number;
  maximumTurnsPerBeat: number;
  maximumTurnsPerScene: number;

  childAgeAdjustmentFactor: number;
}

Küçük yaşlarda:

kısa cümleler,
az konuşmacı,
net konuşma sırası,
konuşanın görsel olarak belirgin olması

önemlidir.

41. Perspective Control

Hikâye hangi bakış açısından anlatılıyor?

type NarrativePerspective =
  | "THIRD_PERSON_CLOSE"
  | "THIRD_PERSON_WIDE"
  | "FIRST_PERSON_CHARACTER"
  | "SECOND_PERSON_GUIDED"
  | "MIXED_INTERACTIVE";

LUMI için varsayılan olarak:

THIRD_PERSON_CLOSE
+
MIXED_INTERACTIVE

uygun olabilir.

Örnek:

“Lila köprüye baktı. Tahtaların arasından suyu görebiliyordu. Sence önce hangi tarafı incelemeli?”

Hikâye üçüncü şahıs anlatılır ama çocuk doğrudan karar sürecine çağrılır.

42. Child Integration Style

Çocuğun hikâyeye katılım biçimi seçenekli olmalıdır.

DIRECT_ACTOR
GUIDING_FRIEND
STORY_HELPER
OBSERVER_WITH_CHOICES
CO_NARRATOR
Direct Actor

Çocuk doğrudan hikâyedeki karakterdir.

Guiding Friend

Çocuk ana karaktere tavsiye verir.

Story Helper

Çocuk çevredeki nesneleri bulur, kapıları açar, işaretleri yorumlar.

Observer with Choices

Çocuk olaylara yön verir ama doğrudan hikâyede görünmez.

Co-Narrator

Bazı sahneleri çocuk tamamlar veya anlatır.

LUMI’de tek bir katılım biçimine bağlı kalmak yerine hikâye türüne göre seçilebilir.

43. Narrative Coherence Validation

Her sahne üretildikten sonra doğrulanmalıdır.

Kontrol listesi:

Sahnenin amacı açık mı?
Giriş durumu dünya durumu ile uyumlu mu?
Karakterler doğru yerde mi?
Beat sırası mantıklı mı?
Duygular gerekçeli mi?
Seçim zemini yeterli mi?
Seçenekler geçerli mi?
Sonuçlar önceki kararlarla uyumlu mu?
Açık hook’lar unutuldu mu?
Yeni bilgi çelişki oluşturuyor mu?
Sahne güvenli yoğunluk sınırında mı?
Çıkış durumu sonraki sahneye bağlanıyor mu?

Bu doğrulama hem kurallarla hem de gerektiğinde LLM değerlendirmesiyle yapılabilir.

44. Scene Quality Vector

Sahne kalitesi tek puan yerine vektör olmalıdır.

interface SceneQualityVector {
  coherence: number;
  pacing: number;
  emotionalClarity: number;
  childAgency: number;
  continuity: number;
  characterConsistency: number;
  worldConsistency: number;
  readability: number;
  engagement: number;
  safety: number;
  consequenceClarity: number;
}

Düşük kalan alan için sahne yeniden düzenlenebilir.

Örneğin:

Coherence: yüksek
Pacing: düşük
Agency: düşük
Safety: yüksek

Bu durumda tüm sahneyi yeniden yazmak yerine yalnızca tempo ve etkileşim kısmı iyileştirilebilir.

45. Scene Generation Pipeline

Önerilen sahne üretim sırası:

1. Dünya durumu alınır
2. Karakter durumları alınır
3. Açık narrative hook’lar alınır
4. Oturum süresi ve tempo bütçesi alınır
5. Scene Contract hazırlanır
6. Beat taslağı oluşturulur
7. Beat sırası doğrulanır
8. Seçim noktası gerekiyorsa hazırlanır
9. Duygusal eğri kontrol edilir
10. Tutarlılık doğrulaması yapılır
11. Playback Unit’lere dönüştürülür
12. Story Session Engine’e teslim edilir
46. Önerilen veri modeli
interface NarrativeScene {
  id: string;
  storyRunId: string;
  chapterId: string;

  contract: SceneContract;

  beatIds: string[];

  entryState: NarrativeStateVector;
  exitState?: NarrativeStateVector;

  activeHooks: string[];
  introducedHooks: string[];
  resolvedHooks: string[];

  branchContext?: BranchContext;

  status:
    | "PLANNED"
    | "GENERATING"
    | "READY"
    | "PLAYING"
    | "COMPLETED"
    | "REPLANNING"
    | "INVALID";

  qualityVector?: SceneQualityVector;

  version: number;
}

Beat modeli:

interface NarrativeBeat {
  id: string;
  sceneId: string;

  type: BeatType;
  importance: "MANDATORY" | "OPTIONAL" | "ADAPTIVE";

  contentIntent: string;

  participants: string[];

  inputState: NarrativeStateVector;
  expectedDelta: Partial<NarrativeStateVector>;
  actualOutputState?: NarrativeStateVector;

  choiceId?: string;
  hookIds?: string[];

  canCompress: boolean;
  canSkip: boolean;

  playbackUnitIds: string[];

  status:
    | "PLANNED"
    | "READY"
    | "PLAYING"
    | "COMPLETED"
    | "SKIPPED"
    | "REPLACED";
}
47. Örnek tam sahne akışı
Scene Contract
Mekân:
Sisli köprü

Ana amaç:
Lila ile tilki arasındaki güveni artırmak

İkincil amaç:
Yeni rota seçimi oluşturmak

Giriş durumu:
Lila tilkiye orta seviyede güveniyor.
Köprünün güvenli olduğu sanılıyor.

Çıkış durumu:
Köprü tehlikeli olarak biliniyor.
Tilkinin gizli yolu bildiği öğreniliyor.
Çocuk rota seçiyor.
Beat’ler
Beat 1 — Establishing
Köprü sisin içinde görünür.

Beat 2 — Discovery
Tahtalardan bazılarının kırık olduğu fark edilir.

Beat 3 — Reaction
Lila geri çekilir, tilki çevreyi koklar.

Beat 4 — Relationship
Tilki Lila’nın önüne geçerek onu korur.

Beat 5 — Reveal
Tilki aşağıda başka bir geçit olduğunu söyler.

Beat 6 — Choice Setup
Köprünün hızlı, geçidin güvenli ama uzun olduğu açıklanır.

Beat 7 — Interaction
Çocuğa rota seçimi sunulur.

Beat 8 — Consequence
Seçilen yola göre ilk sonuç gösterilir.

Beat 9 — Transition
Sonraki sahneye geçiş yapılır.
48. Bu motorun sabit prensipleri
Her scene açık bir amaç taşımalıdır.
Her beat anlatısal durumu değiştirmelidir.
Scene giriş ve çıkış durumları tanımlanmalıdır.
Gerilim ve merak ayrı vektörler olarak izlenmelidir.
Yoğunluk sonrası regulation beat kullanılmalıdır.
Seçimler hazırlıksız sunulmamalıdır.
Seçenekler gerçek fark taşımalıdır.
Dallar birleşebilir, ancak sonuç izleri korunmalıdır.
Açık narrative hook sayısı yaşa göre sınırlandırılmalıdır.
Sahne süresi beat budget ile kontrol edilmelidir.
Kritik beat’ler sıkıştırılmamalıdır.
Tutarsız sahneler zorla oynatılmamalı, yeniden planlanmalıdır.
Kabul edebileceğimiz karar seti
Scene ve Beat ayrı seviyelerdir.
Scene Contract, sahnenin anlatısal görevini tanımlar.
Her sahne Narrative State Vector ile izlenir.
Beat’ler Mandatory, Optional ve Adaptive olabilir.
Gerilim sonrası duygusal dengeleme beat’i kullanılabilir.
Narrative Hook’lar yaşam döngüsüne sahiptir.
Seçimler kategori, ağırlık ve consequence horizon taşır.
Dallanma Micro, Temporary ve Structural olarak ayrılır.
Branch rejoin, önceki etkileri silmez.
Sahne üretiminden sonra coherence ve quality doğrulaması yapılır.