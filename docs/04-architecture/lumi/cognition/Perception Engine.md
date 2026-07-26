Perception Engine

Perception Engine’in görevi:

NPC’nin bulunduğu dünyadan hangi sinyalleri alabileceğini, bu sinyallerin hangilerini fark ettiğini, nasıl yorumladığını ve Belief Engine’e hangi kanıtları gönderdiğini yönetmek.

Perception yalnızca:

NPC yakındaki nesneleri görür.

şeklinde çalışmamalıdır.

Sistem şu soruları cevaplamalıdır:

NPC neyi görebiliyor?
Neyi duyabiliyor?
Neyi fark etmiyor?
Dikkati nereye yönelmiş?
Karanlık, mesafe veya engeller algıyı nasıl etkiliyor?
Duygular algıyı nasıl değiştiriyor?
Bir şey görüldü mü, yoksa yalnızca tahmin mi edildi?
Aynı olayı iki NPC neden farklı algılıyor?

Temel akış:

Objective World State
        ↓
Potential Sensory Signals
        ↓
Sensory Access Validation
        ↓
Signal Quality Calculation
        ↓
Attention and Salience Filtering
        ↓
Percept Construction
        ↓
Initial Interpretation
        ↓
Evidence Generation
        ↓
Working Memory / Belief Engine
1. Dünya gerçeği ile perception ayrımı

Objective world state:

Tilki kayanın arkasında yaralı biçimde yatıyor.
Rüzgâr yaprakları hareket ettiriyor.
Uzakta avcının bıraktığı metal tuzak bulunuyor.

Mira’nın perception’ı:

Kayanın arkasından hafif bir hırıltı duyuyor.
Yapraklar arasında hareket görüyor.
Tilkiyi kısmen seçebiliyor.
Tuzak görüş alanında olmadığı için fark etmiyor.

Kardeşinin perception’ı:

Yalnızca yaprakların hareket ettiğini görüyor.
Hırıltıyı rüzgâr sesi sanıyor.
Tilkiyi fark etmiyor.

Dünya aynı olsa da perception farklıdır.

2. Perception’ın temel çıktısı

Perception Engine doğrudan belief üretmemelidir.

Önce Percept üretmelidir.

type Percept = {
  perceptId: string;
  observerId: string;

  sourceEntityIds: string[];
  sourceEventIds: string[];

  modality:
    | "vision"
    | "hearing"
    | "smell"
    | "touch"
    | "taste"
    | "proprioception"
    | "interoception"
    | "special";

  rawObservation: PerceivedSignal;

  detectedFeatures: PerceivedFeature[];

  clarity: number;
  completeness: number;
  confidence: number;

  attentionLevel: number;
  salience: number;

  occurredAt: number;
  perceivedAt: number;

  spatialEstimate?: SpatialEstimate;
  temporalEstimate?: TemporalEstimate;

  possibleInterpretations: PerceptInterpretation[];

  sourceQuality: PerceptionQualityProfile;
};

Percept şu tür bir kayıttır:

Mira, kayanın arkasından gelen düşük frekanslı bir hırıltı duydu.

Belief ise daha sonra:

Kayanın arkasında korkmuş veya saldırgan bir hayvan olabilir.

şeklinde oluşur.

3. PerceivedSignal

Algılanan sinyal mümkün olduğunca yorumsuz tutulmalıdır.

type PerceivedSignal = {
  signalType: string;

  intensity: number;
  duration: number;

  direction?: Vector3;
  approximateDistance?: number;

  pattern?: string;

  rawProperties: Record<string, number | string | boolean>;
};

Örnek:

{
  "signalType": "animal_vocalization",
  "intensity": 0.48,
  "duration": 1.4,
  "approximateDistance": 8,
  "pattern": "low_growl"
}

Burada:

“Tilki saldıracak.”

bilgisi yoktur.

Bu sonraki yorum katmanına aittir.

4. Perception modalities
Vision
Renk
Şekil
Hareket
Boyut
Mesafe
Yön
Yüz ifadesi
Beden duruşu
Işık değişimi
Hearing
Sesin yüksekliği
Kaynağın yönü
Ritim
Konuşma
Hırıltı
Ayak sesi
Dal kırılması
Smell
Yiyecek
Duman
Kan
Bitki
Tanıdık kişi
Hayvan izi
Touch
Sıcaklık
Basınç
Acı
Titreşim
Doku
Taste

Daha sınırlı kullanılabilir.

Yiyeceğin bozuk olup olmadığı
Bitkinin acılığı
Suyun tuzluluğu
Proprioception

NPC’nin kendi beden konumunu algılamasıdır.

Dengesi bozuk
Ayağı kayıyor
Kolu yeterince uzanmıyor
Interoception

İç beden sinyalleridir.

Açlık
Susuzluk
Kalp atışı
Nefes darlığı
Yorgunluk
Ağrı
Special perception

Fantastik dünya varlıkları için:

Büyü algısı
Duygu sezisi
Rüya işareti
Enerji izi

Dünya kurallarıyla açıkça sınırlandırılmalıdır.

5. Sense capability

Her aktörün algı kapasitesi farklıdır.

type SensoryCapabilityProfile = {
  actorId: string;

  vision: {
    acuity: number;
    lowLightVision: number;
    colorSensitivity: number;
    motionDetection: number;
    depthPerception: number;
  };

  hearing: {
    sensitivity: number;
    directionalAccuracy: number;
    frequencyRange: number;
    speechRecognition: number;
  };

  smell: {
    sensitivity: number;
    discrimination: number;
    trackingAbility: number;
  };

  touch: {
    sensitivity: number;
    painSensitivity: number;
    vibrationSensitivity: number;
  };

  specialSenses?: Record<string, number>;
};

Örnek:

Tilki:
koku ve işitme yüksek
renk ayrımı sınırlı
gece görüşü güçlü

Mira:
görsel ayrıntı iyi
koku takibi düşük
konuşma ayrımı güçlü
6. Sensory access

Bir sinyalin var olması algılanabileceği anlamına gelmez.

Vision için:

Görüş hattı var mı?
Nesne görüş alanında mı?
Arada engel var mı?
Işık yeterli mi?
Mesafe uygun mu?
Nesne saklanıyor mu?

Hearing için:

Ses yeterince güçlü mü?
Arka plan gürültüsü var mı?
Duvar veya mesafe sesi azaltıyor mu?
NPC’nin dikkati başka yerde mi?

Smell için:

Rüzgâr doğru yönde mi?
Koku yeterince taze mi?
Başka kokular baskılıyor mu?
type SensoryAccessResult = {
  accessible: boolean;

  visibility?: number;
  audibility?: number;
  smellAvailability?: number;

  occlusion: number;
  interference: number;

  blockedReasons: string[];
};
7. Vision field

NPC’nin çevresindeki her şeyi aynı anda görmemesi gerekir.

type VisionField = {
  forwardDirection: Vector3;

  horizontalAngle: number;
  verticalAngle: number;

  focusZoneAngle: number;
  peripheralZoneAngle: number;

  nearDistance: number;
  effectiveDistance: number;
  maximumDetectionDistance: number;
};
Focus zone
Yüksek ayrıntı
Renk ve şekil ayrımı
Yüz ifadeleri
Küçük nesneler
Peripheral zone
Hareket algısı
Genel şekil
Düşük ayrıntı

NPC arkasındaki bir varlığı görmez.

Ancak:

sesini duyabilir
gölgesini görebilir
başka bir NPC’nin tepkisini fark edebilir
8. Line of sight

Vision için fiziksel görüş hattı değerlendirilmelidir.

type LineOfSightResult = {
  observerId: string;
  targetId: string;

  clear: boolean;

  visibleFraction: number;
  obstructionIds: string[];

  concealment: number;
  camouflage: number;

  distance: number;
};

Örnek:

Tilkinin yalnızca kuyruğu ve arka bacağı görünüyor.

Bu durumda:

entity identification confidence düşük
injury detection mümkün
intent reading zayıf

olabilir.

9. Lighting

Işık algıyı çok boyutlu etkilemelidir.

type LightingCondition = {
  ambientLight: number;
  contrast: number;
  glare: number;
  shadowComplexity: number;
  lightColor?: string;
};

Düşük ışıkta:

renk ayrımı düşer
mesafe tahmini bozulur
küçük ayrıntılar kaybolur
hareket algısı göreceli olarak korunabilir

Parlak ışıkta da:

göz kamaşması
gölge kaybı
detay kaybı

oluşabilir.

10. Distance degradation

Mesafe arttıkça bütün özellikler aynı hızda kaybolmaz.

Örnek:

Yakında:
Yüz ifadesi, yara, eşya, yön

Orta mesafede:
Kimlik, hareket, genel duruş

Uzakta:
Sadece siluet ve hareket
type FeatureDetectability = {
  featureType: string;

  baseVisibility: number;
  distanceSensitivity: number;
  lightSensitivity: number;
  motionBonus: number;
  observerSkillModifier: number;
};

NPC uzaktan:

birinin koştuğunu

fark edebilir ama:

neden koştuğunu
elinde ne taşıdığını

bilemeyebilir.

11. Camouflage ve concealment
Concealment

Fiziksel engelin arkasında saklanmak.

Çalı
Kaya
Duvar
Sis
Camouflage

Görünür olduğu halde çevreyle benzeşmek.

Tilkinin tüylerinin sonbahar yapraklarına benzemesi
type ConcealmentProfile = {
  physicalCover: number;
  visualBlend: number;
  motionSuppression: number;
  noiseSuppression: number;
  scentSuppression: number;
};

Hareket çoğu zaman camouflage etkisini azaltır.

12. Hearing model

Sesler kaynaktan gözlemciye yayılır.

type SoundSignal = {
  soundId: string;
  sourceEntityId?: string;
  sourceLocation: Vector3;

  loudness: number;
  frequencyProfile: string;
  duration: number;
  repetition: number;

  semanticContent?: string;
};

Algılanan ses:

perceivedLoudness =
  sourceLoudness
  * distanceAttenuation
  * obstacleAttenuation
  * ambientNoisePenalty
  * hearingSensitivity;
13. Sound masking

Yüksek bir ses daha düşük sesi maskeleyebilir.

Şiddetli yağmur
→ ayak seslerini bastırabilir.

Şelale
→ konuşmayı anlaşılmaz hale getirebilir.

Kalabalık
→ belirli bir sesi ayırmayı zorlaştırabilir.
type SoundMaskingResult = {
  targetSoundId: string;
  maskingSoundIds: string[];

  maskingStrength: number;
  intelligibility: number;
};

NPC konuşmayı duyabilir ama kelimeleri yanlış anlayabilir.

14. Speech perception

Konuşma algısı ayrı katman taşımalıdır.

type SpeechPercept = {
  speakerEstimateId?: string;

  heardWords: string[];
  uncertainWords: string[];
  missingSegments: string[];

  languageRecognition: number;
  intelligibility: number;

  emotionalToneEstimate: EmotionVector;
  speakerIntentEstimate?: string;
};

Örnek gerçek cümle:

“Tilkiye yaklaşma, korkmuş olabilir.”

Kısmi algı:

“Tilkiye ... yaklaşma ... olabilir.”

NPC bunu:

Tilki çok tehlikeli.

şeklinde yorumlayabilir.

Bu yanlış anlamanın temeli fiziksel algıda bulunur.

15. Smell perception

Koku özellikle hayvanlar ve bazı dünya olayları için önemlidir.

type SmellSignal = {
  smellId: string;
  sourceEntityId?: string;

  scentProfile: string;
  intensity: number;
  freshness: number;

  sourceLocation: Vector3;

  dispersionRadius: number;
};

Koku yayılımı:

Rüzgâr
Nem
Mesafe
Kapalı alan
Diğer kokular

tarafından etkilenir.

Koku tam konum vermeyebilir.

Kan kokusu yakınlarda.

ama:

tam olarak kayanın arkasında

bilinmeyebilir.

16. Scent trails

Hayvanlar veya güçlü koku algısına sahip varlıklar iz takip edebilir.

type ScentTrail = {
  trailId: string;
  sourceActorId: string;

  pathPoints: Vector3[];

  createdAt: number;
  decayRate: number;

  scentStrength: number;
  contamination: number;
};

Yağmur:

trail strength’i düşürebilir.

Başka hayvanlar:

izi karıştırabilir.

NPC:

birinin buradan geçtiğine

inanabilir ama zaman tahmini belirsiz olabilir.

17. Touch perception

Touch yalnızca aktif temasla değil, çevresel temasla da çalışır.

Rüzgâr
Titreşim
Zemin hareketi
Sıcaklık değişimi
Yağmur
type TouchPercept = {
  contactEntityId?: string;
  bodyRegion: string;

  pressure: number;
  temperature: number;
  texture?: string;
  pain: number;
  vibration: number;
};

Örnek:

Mira köprü tahtasının ayağının altında titrediğini hisseder.

Bu perception:

Köprü dengesiz olabilir.

belief’ine kanıt üretir.

18. Interoception

Karakter kendi iç durumunu tam olarak doğru algılamayabilir.

Yorgun
Aç
Korkmuş
Baş dönmesi var
Nefesi hızlandı
type InteroceptivePercept = {
  dimension:
    | "hunger"
    | "thirst"
    | "fatigue"
    | "pain"
    | "temperature"
    | "breathing"
    | "heartbeat"
    | "nausea";

  perceivedLevel: number;
  actualLevelReference?: number;

  confidence: number;
};

Örneğin korku nedeniyle hızlanan kalp:

“Hasta oluyorum.”

diye yanlış yorumlanabilir.

19. Dikkat sistemi

Algılanabilir olan her şey fark edilmez.

Perception Engine’in en kritik bileşenlerinden biri Attention System’dir.

type AttentionState = {
  actorId: string;

  focusEntityIds: string[];
  focusLocation?: Vector3;

  focusTaskId?: string;
  activeThreatIds: string[];

  availableAttention: number;
  dividedAttentionLoad: number;

  attentionalMode:
    | "focused"
    | "scanning"
    | "vigilant"
    | "relaxed"
    | "overloaded"
    | "tunnel_vision";
};
20. Top-down attention

NPC ne arıyorsa onu daha kolay fark eder.

Mira tilkinin yarasını inceliyorsa:
kanama ve bacak hareketini daha kolay fark eder.

Mira şifalı ot arıyorsa:
bitki şekilleri daha dikkat çekici olur.
type TopDownAttentionBias = {
  goalIds: string[];
  expectedFeatureTypes: string[];

  detectionBoost: number;
  unexpectedFeaturePenalty: number;
};

Bu yararlıdır ama beklenmeyen önemli olayların kaçırılmasına neden olabilir.

21. Bottom-up attention

Bazı sinyaller hedeflerden bağımsız şekilde dikkati çeker.

Yüksek ses
Ani hareket
Parlak ışık
Keskin koku
Acı
İsmin söylenmesi
type BottomUpSalience = {
  intensity: number;
  suddenness: number;
  novelty: number;
  threatPotential: number;
  biologicalRelevance: number;
};

Ani dal kırılması, NPC’nin mevcut görevini kısa süreli kesebilir.

22. Salience

Bir sinyalin fark edilme ihtimali:

perceptualSalience =
  physicalIntensity
  + novelty
  + motion
  + threatRelevance
  + goalRelevance
  + emotionalRelevance
  + socialRelevance;

Ancak bu tek sayı yerine vektör olarak tutulabilir.

type PerceptualSalienceVector = {
  physical: number;
  threat: number;
  goal: number;
  emotional: number;
  social: number;
  novelty: number;
  biological: number;
};

Karar bağlamına göre farklı boyutlar öne çıkar.

23. Detection probability

Algı tamamen deterministic olmak zorunda değildir.

detectionProbability =
  sensoryAccess
  * signalQuality
  * attentionAvailability
  * salience
  * observerCapability;

Ancak önemli ve açık olaylarda rastlantı çok düşük olmalıdır.

Örnek:

NPC’nin önünde yüksek sesle düşen bir ağaç

neredeyse kesin fark edilir.

Uzak çalılıktaki küçük hareket

olasılıksal olabilir.

Replay için deterministic seed kullanılmalıdır.

24. Perception threshold

Her özellik algı eşiğini aşmalıdır.

type PerceptionThreshold = {
  modality: string;
  featureType: string;

  baseThreshold: number;

  attentionModifier: number;
  fatigueModifier: number;
  emotionModifier: number;
  skillModifier: number;
};

Sinyal eşik altında kalırsa:

fark edilmez

veya:

belirsiz bir percept

üretilebilir.

25. Partial perception

Algı çoğu zaman ya hep ya hiç değildir.

Bir varlık görüldü ama tanınmadı.
Bir konuşma duyuldu ama anlaşılmadı.
Bir hareket fark edildi ama yön belirlenemedi.
type PartialPerception = {
  detected: boolean;

  identityKnown: boolean;
  typeKnown: boolean;
  stateKnown: boolean;
  actionKnown: boolean;
  intentKnown: boolean;

  missingDimensions: string[];
};

Örnek:

Mira çalılıkta bir hayvan görüyor.

Ama:

tilki olduğunu bilmiyor
yaralı olduğunu henüz bilmiyor

olabilir.

26. Entity recognition

Bir sinyalin hangi varlığa ait olduğu ayrıca değerlendirilmelidir.

type EntityRecognitionResult = {
  perceptId: string;

  candidateEntityIds: {
    entityId: string;
    probability: number;
  }[];

  recognizedEntityId?: string;

  recognitionConfidence: number;

  recognitionCues: string[];
};

Mira uzaktan:

tilki
köpek
küçük kurt

arasında kararsız kalabilir.

Belief Engine’e:

Küçük bir yırtıcı hayvan olabilir.

kanıtı gönderilir.

27. Familiarity

Tanıdık varlıklar daha kolay fark ve teşhis edilebilir.

Kardeşinin sesi
Tanıdığı tilkinin kokusu
Şifacının yürüyüş biçimi
type FamiliarityProfile = {
  targetId: string;

  visualFamiliarity: number;
  voiceFamiliarity: number;
  scentFamiliarity: number;
  movementFamiliarity: number;
};

Ancak familiarity yanlış teşhisi de artırabilir.

“Bu kesin Arda’nın sesi.”

oysa benzer sesli başka biri olabilir.

28. Change detection

NPC değişiklikleri sabit durumlardan daha kolay fark edebilir.

Kapı az önce açıktı, şimdi kapalı.
Tilki hareket ediyordu, şimdi hareketsiz.
Ses birden kesildi.
type ChangePercept = {
  entityId?: string;
  dimension: string;

  previousPerceivedValue: unknown;
  currentPerceivedValue: unknown;

  changeMagnitude: number;
  confidence: number;
};

Change detection working memory’ye dayanır.

Önceki durum hatırlanmıyorsa değişiklik fark edilmeyebilir.

29. Inattentional blindness

NPC dikkatini yoğun biçimde bir şeye verdiğinde açık başka bir olayı kaçırabilir.

Örnek:

Mira tilkinin yarasını inceliyor.

Bu sırada:

kardeşinin çantasından harita düşüyor.

Olay görüş alanında olsa bile fark edilmeyebilir.

type AttentionCapture = {
  focusStrength: number;
  peripheralSuppression: number;
  duration: number;
};

Bu sistem doğal küçük consequences üretebilir.

30. Change blindness

NPC kısa bir kesinti sırasında değişikliği kaçırabilir.

Mira arkasını dönüyor.
Avcı elindeki çantayı değiştiriyor.
Mira tekrar baktığında fark etmiyor.

Algının süreklilik varsayımı hatalı belief üretebilir.

31. Vigilance

Tehdit bekleyen NPC çevreyi daha sık tarar.

type VigilanceState = {
  level: number;

  scanFrequency: number;
  threatDetectionBoost: number;

  falsePositiveRate: number;
  fatigueCost: number;
};

Yüksek vigilance:

tehdidi erken fark etme

avantajı sağlar.

Ama:

normal sesleri tehdit sanma
yorgunluk
dikkat bölünmesi

oluşturabilir.

32. Tunnel vision

Yoğun korku veya stres algı alanını daraltabilir.

type TunnelVisionEffect = {
  focusBoost: number;
  peripheralLoss: number;
  detailLoss: number;
  timePerceptionDistortion: number;
};

NPC doğrudan tehdidi iyi takip ederken:

kaçış yolunu
arkadaşının konumunu
yakındaki yardım nesnesini

kaçırabilir.

33. Emotion and perception

Duygular algı önceliğini değiştirir.

Fear
Ani hareketleri daha kolay fark eder.
Belirsiz şekilleri tehdit olarak yorumlayabilir.
Anger
Karşı tarafın düşmanca yüz ifadelerine odaklanır.
Nötr davranışları olumsuz yorumlayabilir.
Sadness
Çevresel dikkat azalabilir.
Olumsuz sosyal işaretler daha görünür olabilir.
Joy
Olumlu sosyal işaretler daha belirgin hale gelebilir.
Risk ayrıntıları küçümsenebilir.

Emotion, raw signal’i değiştirmez.

Şunları değiştirir:

detection
attention
feature selection
initial interpretation
34. Expectation bias

NPC beklediği şeyi görmeye daha yatkın olabilir.

Avcının geleceğini bekliyor.

Uzaktaki bir gölgeyi:

avcı

olarak teşhis etme ihtimali artar.

type ExpectationBias = {
  expectedEntityTypes: string[];
  expectedEventTypes: string[];

  detectionBoost: number;
  misidentificationRisk: number;
};

Bu perception katmanında:

recognition candidate probability

değiştirir.

35. Perceptual set

Uzun süreli belief ve deneyimler belirli özellikleri öne çıkarabilir.

Deneyimli iz sürücü:
ayak izlerini fark eder.

Şifacı:
solgunluk, nefes ve yara ayrıntılarını fark eder.

Çocuk:
parlak renkleri ve hareketli küçük nesneleri daha kolay fark eder.
type PerceptualExpertise = {
  domain: string;
  featureDetectionBoosts: Record<string, number>;
  interpretationAccuracy: number;
};

Skill yalnızca eylem başarısını değil, perception kalitesini de etkiler.

36. Active perception

NPC bazen pasif biçimde fark etmez; bilinçli olarak inceleme yapar.

Yarayı incele
İz ara
Sesi dinle
Koku takip et
Ufku tara

Bu bir action’dır.

type ActivePerceptionRequest = {
  actorId: string;

  targetEntityIds?: string[];
  targetArea?: SpatialArea;

  modality: string;

  searchGoal: string;
  expectedFeatures: string[];

  effort: number;
  duration: number;
};

Active perception:

attention artırır
algı eşiğini düşürür
zaman ve enerji tüketir
37. Inspect action

Inspect genel bir perception güçlendirici olarak kullanılabilir.

Inspect wound
Inspect tracks
Inspect object
Inspect expression
type InspectionResult = {
  discoveredFeatures: PerceivedFeature[];
  unresolvedQuestions: string[];

  confidenceGain: number;
  timeCost: number;

  triggeredEvidenceIds: string[];
};

Inspection her şeyi açığa çıkarmamalıdır.

Gerekli skill veya araç yoksa bazı özellikler bilinemez.

38. Search action

Search, belirli bir alanda varlığı bilinmeyen hedefi bulmaya yöneliktir.

type SearchContext = {
  targetPattern: string;

  searchArea: SpatialArea;
  method: string;

  availableTime: number;
  searchSkill: number;

  environmentalDifficulty: number;
};

Arama sonucu:

bulundu
iz bulundu
hiçbir şey bulunmadı
alanın bir kısmı tarandı
yanlış hedef bulundu

olabilir.

Yokluk kanıtı, aramanın kapsamına göre üretilmelidir.

39. Perception memory interaction

Working memory perception’ı yönlendirir.

Mira az önce bir dal sesi duydu.

Sonraki birkaç saniye:

aynı yöndeki hareketlere daha dikkatli olur.

Ayrıca episodic memory recognition sağlar.

Bu hırıltıyı daha önce korkmuş bir tilkiden duymuştum.

Ancak Perception Engine memory’yi gerçek gibi kullanmamalıdır.

Memory yalnızca:

feature expectation
recognition
attention

etkisi oluşturur.

40. Perception belief interaction

Mevcut belief’ler perception yorumunu etkileyebilir.

Belief:
Ormanda avcı var.

Perception:

uzakta insan biçimli gölge

Interpretation:

Avcı olabilir.

Fakat raw percept:

insan biçimli karanlık siluet

olarak korunmalıdır.

Bu ayrım yanlış belief’lerin sonradan düzeltilebilmesini sağlar.

41. Perception and goals

Aktif hedefler hangi sinyallerin önemli olduğunu belirler.

Hedef:

Şifalı ot bul.

Perception önceliği:

yaprak şekli
renk
koku
nemli alanlar

Hedef:

Kardeşini koru.

Perception önceliği:

kardeşin konumu
yakın tehditler
kaçış yolları
zemin güvenliği

Goal Engine perception içeriğini doğrudan belirlememeli; attention bias sağlamalıdır.

42. Perception and plans

Aktif plan step’leri kontrol edilmesi gereken çevresel özellikleri belirler.

Plan step:

Köprüden geç.

Perception cue’ları:

tahta kırıkları
su seviyesi
köprünün sallanması
engel
başka geçiş yapan kişiler

Plan assumptions perception doğrulama talepleri üretebilir.

43. Perception and Execution Engine

Execution sırasında sürekli perception geri bildirimi gerekebilir.

Örnek:

Mira tilkiye yaklaşıyor.

Her execution tick:

tilkinin duruşu
mesafe
hırlama
kaçma hareketi
zemin

kontrol edilir.

type ExecutionPerceptionFeedback = {
  executionId: string;
  stepId: string;

  relevantPercepts: Percept[];

  detectedHazards: string[];
  targetReactionPercepts: string[];

  continuationConfidence: number;
};

Bu feedback:

continue
adapt
pause
abort

kararlarını etkiler.

44. Perception and interrupts

Bir interrupt’ın tetiklenmesi için dünya olayının varlığı yeterli değildir.

NPC’nin bunu algılaması gerekir.

Kurt sürüsü bölgeye geldi.

Mira:

uluma sesini duyarsa

interrupt alır.

Duymuyorsa execution devam edebilir.

Ancak objective physical collision gibi olaylar algıdan bağımsız execution’ı etkileyebilir.

Bu ayrım:

world interrupt
perceived interrupt

olarak tutulmalıdır.

45. Observation ve interpretation ayrımı

Perception Engine iki katman üretmelidir.

Observation
Tilki kulaklarını geriye yatırdı.
Tilki vücudunu yere yaklaştırdı.
Tilki geri çekildi.
Initial interpretation
Tilki korkmuş olabilir.
Tilki kaçmaya hazırlanıyor olabilir.
type PerceptInterpretation = {
  interpretationId: string;

  proposition: Proposition;
  confidence: number;

  supportingFeatureIds: string[];

  interpretationSource:
    | "instinct"
    | "learned_pattern"
    | "domain_skill"
    | "existing_belief"
    | "social_knowledge";

  alternatives: string[];
};

Belief Engine interpretation’ı evidence olarak alır ama observation’dan daha düşük güvenle değerlendirebilir.

46. Perceptual ambiguity

Bir sinyal birden fazla anlama gelebilir.

Tilki hırlıyor.

Olasılıklar:

saldırganlık
korku
acı
yavru koruma
alan savunması

Perception Engine tek anlam seçmek yerine alternatif interpretation üretebilir.

type AmbiguousPercept = {
  perceptId: string;

  interpretationCandidates: {
    proposition: Proposition;
    probability: number;
  }[];

  ambiguityLevel: number;
};

Belief Engine bunları hypothesis olarak kullanabilir.

47. Perception confidence

Confidence tek sayıdan oluşmamalıdır.

type PerceptionConfidenceVector = {
  detectionConfidence: number;
  identityConfidence: number;
  featureConfidence: number;
  spatialConfidence: number;
  temporalConfidence: number;
  interpretationConfidence: number;
};

Örnek:

Bir hayvan gördüğünden emin.
Tilki olduğundan orta derecede emin.
Yaralı olduğundan düşük derecede emin.
48. Spatial perception

NPC’nin konum tahminleri yaklaşık olabilir.

type SpatialEstimate = {
  estimatedPosition?: Vector3;

  direction?: Vector3;
  distanceEstimate?: number;

  horizontalError: number;
  distanceError: number;

  referenceFrame:
    | "self_relative"
    | "landmark_relative"
    | "world_relative";
};

NPC:

Ses sol taraftaki ağaçların arkasından geliyor.

diye algılayabilir.

Kesin koordinatı bilmez.

49. Temporal perception

NPC olay süresini ve zamanını yanlış tahmin edebilir.

type TemporalEstimate = {
  perceivedStart?: number;
  perceivedDuration?: number;

  timingConfidence: number;
  sequenceConfidence: number;
};

Korku sırasında:

birkaç saniye çok uzun hissedilebilir.

Yorgunlukta:

zaman farkındalığı azalabilir.
50. Sequence perception

Hangi olayın önce olduğu nedensellik için önemlidir.

Örnek gerçek sıra:

Dal kırıldı.
Tilki irkildi.
Tilki hırladı.

Mira yanlış algılarsa:

Tilki hırladı.
Sonra dal kırıldı.

Nedensel belief farklı oluşabilir.

Perception eventlerinin zaman sırası confidence ile tutulmalıdır.

51. Social perception

NPC’ler diğerlerinin:

yüz ifadesini
ses tonunu
beden duruşunu
bakış yönünü
kişisel mesafesini

algılar.

type SocialPercept = {
  targetActorId: string;

  facialFeatures: Record<string, number>;
  postureFeatures: Record<string, number>;
  voiceFeatures: Record<string, number>;

  gazeTargetEstimate?: string;
  distanceBehavior?: string;

  emotionHypotheses: {
    emotion: string;
    confidence: number;
  }[];

  intentHypotheses: {
    intent: string;
    confidence: number;
  }[];
};

Emotion ve intent doğrudan gözlenmiş gerçek sayılmamalıdır.

52. Emotion recognition

Yüz ve beden ifadelerinin yorumu:

kültür
tür
tanışıklık
domain experience
kişisel önyargı

ile değişir.

Örneğin:

Tilkinin diş göstermesi

insan gülümsemesi gibi yorumlanamaz.

Türler arası emotion recognition sınırlı olmalıdır.

53. Deception perception

Bir NPC’nin yalan söylediği doğrudan algılanamaz.

Yalnızca işaretler algılanabilir:

bakış kaçırma
ses titremesi
cevap gecikmesi
önceki sözle çelişki

Ancak bu işaretler:

korku
utangaçlık
yorgunluk

nedeniyle de oluşabilir.

type DeceptionCuePercept = {
  cueType: string;
  strength: number;

  specificityToDeception: number;
  alternativeCauses: string[];
};

Belief Engine:

Yalan söylüyor olabilir.

hipotezi oluşturur, kesin sonuç değil.

54. Group perception

Kalabalık durumlarda bütün bireyler ayrıntılı algılanmaz.

Kalabalık huzursuz.
Bir grup bağırıyor.
Bazı kişiler geri çekiliyor.
type GroupPercept = {
  groupId?: string;

  estimatedCount: number;
  countConfidence: number;

  movementPattern: string;
  emotionalToneEstimate: string;

  visibleIndividuals: string[];
  unidentifiedMemberCount: number;
};

Topluluk davranışı bireysel niyetlere doğrudan uygulanmamalıdır.

55. Environmental perception

NPC yalnızca varlıkları değil çevresel state’leri de algılar.

Hava kararıyor.
Zemin kaygan.
Su yükseliyor.
Rüzgâr yön değiştirdi.
Duman kokusu var.
type EnvironmentalPercept = {
  dimension: string;

  perceivedValue: unknown;
  confidence: number;

  spatialScope: SpatialArea;
  temporalTrend?:
    | "increasing"
    | "decreasing"
    | "stable"
    | "unknown";
};

Trend perception consequence prediction için önemlidir.

56. Affordance perception

NPC çevrede hangi eylemlerin mümkün olduğunu algılar.

Kayanın arkasına saklanılabilir.
Dal kaldıraç olarak kullanılabilir.
Dere geçilebilir.
Kapı kilitli görünüyor.
type PerceivedAffordance = {
  targetEntityId: string;

  actionType: string;

  perceivedAvailability: number;
  perceivedDifficulty: number;
  perceivedRisk: number;

  capabilityDependencies: string[];
};

Affordance objective olarak mevcut olabilir ama NPC bunu fark etmeyebilir.

Action Generator yalnızca:

algılanan
hatırlanan
veya plan tarafından aranan

affordance’ları kullanmalıdır.

57. Hidden affordances

Bazı eylem olanakları active inspection gerektirir.

Taşın altındaki anahtar
Duvardaki gizli geçit
Kırık dalın içindeki işaret

Bu özellikler:

yüksek skill
özel bilgi
uygun açı
aktif arama

gerektirebilir.

58. Object state perception

NPC nesnenin tüm gerçek state’ini doğrudan bilemez.

Kapı:

kapalı görünüyor

ama:

kilitli mi
arkasında biri var mı
mekanizma bozuk mu

bilinmeyebilir.

type PerceivedObjectState = {
  objectId: string;

  visibleStates: Record<string, unknown>;
  inferredStates: Record<string, unknown>;

  unknownStates: string[];

  confidenceByState: Record<string, number>;
};
59. Perception of consequences

Bir outcome gerçekleştiğinde NPC sonucu algılamazsa bilgi sahibi olmaz.

Örnek:

Mira elmayı bıraktı ve uzaklaştı.
Tilki daha sonra elmayı yedi.

Mira bunu görmediyse:

Tilkinin elmayı yediğine dair belief oluşmaz.

Yalnızca:

Elmayı bıraktım.
Tilkinin yiyip yemediğini bilmiyorum.

bilgisine sahiptir.

Consequence Engine objective sonucu hesaplar; Perception Engine hangi aktörlerin bunu gözlemlediğini belirler.

60. Delayed observation

Bir sonucu doğrudan görmeyen NPC daha sonra izlerden çıkarım yapabilir.

Elma kaybolmuş.
Tilkinin ayak izleri var.

Perception:

Yiyecek artık yerde değil.
Yakında tilki izi var.

Belief inference:

Tilki elmayı yemiş olabilir.

Bu, doğrudan gözlemden daha düşük confidence taşır.

61. Perception event

Her algılanan sinyal event olarak kaydedilebilir.

type PerceptionEvent = {
  eventId: string;
  observerId: string;

  worldSignalId: string;
  perceptId: string;

  detectionResult: string;

  attentionContext: AttentionState;
  sensoryContext: PerceptionQualityProfile;

  timestamp: number;
};

Önerilen eventler:

SignalEnteredRange
SignalDetected
SignalMissed
FeatureRecognized
EntityRecognized
PerceptInterpreted
AttentionShifted
ActiveInspectionStarted
InspectionCompleted
PerceptionContradictionDetected
62. Missed perception

Kaçırılan önemli perception’lar debug için kaydedilebilir.

NPC bunu bilmez.

type MissedPerceptionRecord = {
  observerId: string;
  signalId: string;

  missReason:
    | "out_of_range"
    | "occluded"
    | "below_threshold"
    | "attention_elsewhere"
    | "sensory_limit"
    | "masked"
    | "misclassified";

  potentialNarrativeImpact: number;
};

Bu kayıtlar:

Neden fark etmedi?

sorusuna cevap verir.

63. Perception contradiction

Farklı duyular çelişebilir.

Göz:
Kimse görünmüyor.

Kulak:
Ayak sesi geliyor.

Koku:
Tanıdık bir kişi yakınlarda.
type PerceptualContradiction = {
  perceptIds: string[];

  contradictionType:
    | "cross_modal"
    | "temporal"
    | "identity"
    | "spatial";

  severity: number;

  recommendedResponse:
    | "inspect"
    | "wait"
    | "move_viewpoint"
    | "ask"
    | "remain_uncertain";
};

Bu doğrudan belief contradiction’a dönüşebilir veya active perception hedefi oluşturabilir.

64. Cross-modal integration

Birden fazla duyudan gelen sinyaller birleştirilebilir.

Görsel:
Çalılık hareket ediyor.

İşitsel:
Hafif hırıltı var.

Koku:
Hayvan kokusu geliyor.

Birleşik percept:

Çalılığın arkasında bir hayvan bulunma ihtimali yüksek.
type CrossModalIntegrationResult = {
  sourcePerceptIds: string[];

  combinedProposition: Proposition;

  combinedConfidence: number;
  modalityAgreement: number;
};

Duyular çelişirse confidence düşebilir.

65. Perception latency

Algı anlık olmak zorunda değildir.

Ses duyulur.
NPC yönünü anlamaya çalışır.
Sonra tepki verir.
type PerceptionLatency = {
  detectionDelay: number;
  recognitionDelay: number;
  interpretationDelay: number;
};

Ani olaylarda gecikme execution sonucunu etkileyebilir.

66. Reaction time

Bir şeyi algılamak ile eyleme başlamak arasında süre vardır.

reactionTime =
  baseReactionTime
  * cognitiveLoadModifier
  * fatigueModifier
  * surpriseModifier
  * familiarityModifier;

Deneyimli karakter tanıdık tehdide daha hızlı tepki verebilir.

Şaşırtıcı ve belirsiz olaylarda gecikme artabilir.

67. Perception resolution frequency

Her NPC için her tick tam perception hesaplamak pahalıdır.

Farklı çözünürlükler kullanılabilir.

type PerceptionUpdateMode =
  | "continuous"
  | "event_driven"
  | "periodic"
  | "on_activation"
  | "summary";
Continuous

Aktif execution ve kritik sahnelerde.

Event-driven

Yüksek salience sinyal oluştuğunda.

Periodic

Arka plan NPC’lerde belirli aralıklarla.

On activation

NPC hikâyeye yeniden girdiğinde.

Summary

Uzak veya önemsiz varlıklar için toplu algı özeti.

68. Perception relevance filtering

Dünya Motoru bir NPC’ye milyonlarca sinyal göndermemelidir.

Ön filtre:

Mekânsal erişim
Duyu türü
Sinyal yoğunluğu
Hikâye/goal relevance
Fiziksel etki
type SensoryCandidateFilter = {
  observerId: string;

  modalityRanges: Record<string, number>;

  maxCandidateSignals: number;
  priorityDimensions: string[];
};

Sonra ayrıntılı perception hesabı yapılır.

69. Perception budget

MVP önerisi:

Aktif sahnede NPC başına potansiyel sinyal: en fazla 30
Tam değerlendirilen percept: en fazla 12
Working memory’ye giren percept: en fazla 7
Belief evidence’a dönüşen percept: en fazla 8
Cross-modal birleşim: en fazla 3
Active inspection sonucu özellik: en fazla 10

Yüksek önemde sahnelerde sınırlar artırılabilir.

70. Perception LOD

NPC önemine ve uzaklığına göre algı ayrıntısı değişebilir.

LOD 0 — Full perception

Ana karakterler ve aktif sahne.

Ayrıntılı duyu
Dikkat
Yanlış algı
Feature bazlı detection
LOD 1 — Simplified perception

Yakın ama ikincil NPC’ler.

Temel varlık
tehdit
konuşma
önemli olay algısı
LOD 2 — Aggregate perception

Uzak arka plan NPC’leri.

Bölgede kavga oldu.
Kalabalık korktu.
LOD 3 — No active perception

NPC aktif değil.

Daha sonra world summary üzerinden gerekli belief projection oluşturulur.

71. Perception projection on reactivation

Bir NPC 10 gün sonra yeniden aktif olduğunda aradaki her şeyi algılamış sayılmamalıdır.

Yalnızca:

bulunduğu bölgede erişebildiği önemli olaylar
sosyal olarak kendisine iletilen bilgiler
doğrudan etkilendiği değişiklikler

perception summary’ye dönüşür.

type DormantPerceptionProjection = {
  actorId: string;
  timeRange: {
    from: number;
    to: number;
  };

  likelyObservedEvents: string[];
  missedEvents: string[];
  sociallyLearnedEvents: string[];

  confidence: number;
};
72. Perception and NPC type

Her aktör aynı perception pipeline’ını kullanabilir ama profil ve yorum katmanı değişir.

İnsan
Görsel ve konuşma ağırlıklı
Yüksek sosyal yorum
Orta koku kapasitesi
Hayvan
Koku
işitme
hareket
tehdit
yiyecek

ağırlıklı.

Bitki veya çevresel varlık

Klasik perception taşımayabilir.

Ancak:

ışık
nem
dokunma
kimyasal sinyal

gibi reaktif sensing taşıyabilir.

Fantastik varlık

Dünya kurallarına bağlı özel duyular kullanabilir.

73. Animal perception

Tilki perception modeli:

type AnimalPerceptionProfile = {
  visualMotionSensitivity: number;
  scentTracking: number;
  hearingDirectionality: number;

  threatSalience: number;
  foodSalience: number;
  socialFamiliaritySensitivity: number;

  symbolicInterpretationCapacity: number;
};

Tilki Mira’yı şöyle algılayabilir:

Tanıdık koku
Yavaş hareket
Yiyecek kokusu
Düşük yaklaşma baskısı

İnsan benzeri çıkarım:

Mira bana yardım etmek istiyor.

yerine associative interpretation:

Mira = düşük tehdit + yiyecek + tanıdıklık

daha uygundur.

74. Child perception profile

Çocuk karakterler için:

Ani ve parlak sinyaller yüksek salience
Uzun görevlerde attention daha hızlı düşebilir
Sosyal ton algısı güçlü ama niyet çıkarımı hatalı olabilir
Zaman ve mesafe tahmini daha düşük doğrulukta olabilir
Hayal gücü belirsiz sinyalleri etkileyebilir

Ancak yaşa göre genelleştirme dikkatli yapılmalı ve bireysel profil korunmalıdır.

75. Perception skill system

Algısal beceriler ayrıca tutulabilir.

type PerceptionSkill =
  | "observation"
  | "tracking"
  | "listening"
  | "medical_inspection"
  | "social_reading"
  | "danger_sense"
  | "navigation"
  | "foraging";

Skill etkileri:

detection threshold
feature recognition
interpretation accuracy
search efficiency
confidence calibration

üzerinde uygulanabilir.

76. Perception learning

NPC zamanla hangi sinyallerin önemli olduğunu öğrenebilir.

Tilkinin kulaklarını geriye yatırması korku işareti olabilir.
Yağmur sonrası köprü tahtalarının sesi değişir.
Şifalı otun kokusu diğer bitkilerden farklıdır.
type PerceptionLearningEvent = {
  actorId: string;

  featurePattern: string;
  associatedMeaning: string;

  outcomeValidation: number;
  confidenceGain: number;

  sourceEpisodeIds: string[];
};

Bu semantic veya procedural memory’ye dönüşebilir.

77. False positive perception

NPC gerçekte olmayan bir şeyi algıladığını düşünebilir.

Kaynaklar:

Düşük ışık
Yüksek korku
Benzer şekil
Ses yankısı
Beklenti
Yorgunluk
type PerceptionError = {
  perceptId: string;

  errorType:
    | "false_positive"
    | "false_negative"
    | "misidentification"
    | "feature_error"
    | "spatial_error"
    | "temporal_error";

  estimatedErrorProbability: number;
};

Gerçek olmayan percept objective event oluşturmaz.

Ama Belief Engine üzerinde gerçek etki yaratabilir.

78. False negative perception

Gerçek sinyal vardır ama NPC algılamaz.

Tilki sessizce geri çekiliyor.
Mira bunu fark etmiyor.

Bu durumda:

Mira tilkinin hâlâ aynı yerde olduğuna inanabilir.

Belief freshness düşene kadar eski belief korunur.

79. Perception correction

NPC bakış açısını değiştirerek veya tekrar inceleyerek algısını düzeltebilir.

Yaklaş
Işığı artır
Başka açıdan bak
Sessiz kalıp dinle
Birine sor
Nesneye dokun
type PerceptionCorrectionAction = {
  targetPerceptId: string;

  method: string;

  expectedConfidenceGain: number;
  expectedErrorReduction: number;

  cost: number;
  risk: number;
};

Bu, epistemic action adaylarının kaynağıdır.

80. Perspective taking

Aynı nesne farklı açılardan farklı görünür.

Mira kayanın önünde.
Kardeşi kayanın arkasında.

Mira tilkiyi görür.

Kardeşi tuzağı görür.

İki karakter konuşursa ortak bilgi genişler.

Perception Engine her observer için ayrı spatial relation kullanmalıdır.

81. Shared attention

İki NPC aynı nesneye birlikte dikkat edebilir.

type SharedAttentionState = {
  participantIds: string[];
  targetEntityId?: string;
  targetLocation?: Vector3;

  jointAttentionConfidence: number;

  initiatedByActorId?: string;
  communicationCueIds: string[];
};

Örnek:

Mira tilkiyi gösterir.
Kardeşi Mira’nın işaret ettiği yöne bakar.

Bu common ground oluşumunu destekler.

82. Pointing and reference resolution

Konuşmada:

“Şuna bak.”
“Orada.”
“Onu alma.”

gibi ifadelerin anlaşılması perception ve attention gerektirir.

type ReferenceResolution = {
  speakerId: string;
  listenerId: string;

  expression: string;

  candidateEntityIds: string[];
  resolvedEntityId?: string;

  confidence: number;
};

Yanlış referans çözümü sosyal yanlış anlaşılma oluşturabilir.

83. Gaze perception

NPC diğerinin nereye baktığını tahmin edebilir.

Şifacı yaranın üzerine bakıyor.
Avcı sürekli kapıya bakıyor.

Bu:

attention
interest
intent
threat

hakkında evidence üretir.

Ancak gaze interpretation kesin değildir.

84. Perception privacy

Bazı davranışlar yalnızca belirli gözlemcilere görünür.

Fısıltı
Gizli işaret
Kapalı odadaki hareket
Çanta içindeki eşya

Perception Engine bilgi erişimini fiziksel ve sosyal kurallarla sınırlar.

NPC, event log’daki açık olmayan bilgileri alamaz.

85. Narrative camera ile NPC perception ayrımı

Hikâye anlatıcısı bazen oyuncuya NPC’nin bilmediği bir şeyi gösterebilir.

Mira uzaklaşırken tilki elmayı yedi.

Bu bilgi oyuncuya görünür olabilir.

Ama Mira’nın belief state’ine aktarılmaz.

type NarrativeObservation = {
  audienceType:
    | "player"
    | "reader"
    | "specific_actor"
    | "omniscient_narrator";

  visibleEventIds: string[];
};

Narrative camera, Perception Engine’in NPC erişim kurallarını bozmamalıdır.

86. Perception guardrails

Perception Engine şu hataları önlemelidir:

Duvar arkasını sebepsiz görmek
Uzak konuşmayı eksiksiz duymak
Başkalarının duygularını kesin bilmek
Kapalı çantanın içeriğini bilmek
Gelecek olayları perception gibi sunmak
Dünya event açıklamasını doğrudan NPC’ye aktarmak
type PerceptionAccessGuardResult = {
  signalId: string;
  observerId: string;

  allowed: boolean;
  allowedFeatures: string[];

  blockedFeatures: string[];
  reason: string;
};
87. Perception quality profile
type PerceptionQualityProfile = {
  sensoryAccess: number;
  signalStrength: number;
  signalToNoise: number;
  attentionQuality: number;
  observerCapability: number;
  environmentalClarity: number;
  emotionalDistortion: number;
  cognitiveLoadPenalty: number;
};

Toplam kalite:

quality =
  sensoryAccess * 0.20 +
  signalStrength * 0.15 +
  signalToNoise * 0.15 +
  attentionQuality * 0.15 +
  observerCapability * 0.15 +
  environmentalClarity * 0.10 -
  emotionalDistortion * 0.05 -
  cognitiveLoadPenalty * 0.05;

Alt boyutlar mutlaka korunmalıdır.

88. Perception Engine çıktısı
type PerceptionEngineResult = {
  observerId: string;
  timestamp: number;

  candidateSignals: string[];

  detectedPercepts: Percept[];
  partialPercepts: PartialPerception[];

  missedSignals: MissedPerceptionRecord[];

  recognizedEntities: EntityRecognitionResult[];

  socialPercepts: SocialPercept[];
  environmentalPercepts: EnvironmentalPercept[];

  perceivedAffordances: PerceivedAffordance[];

  crossModalIntegrations: CrossModalIntegrationResult[];
  contradictions: PerceptualContradiction[];

  evidenceCandidates: Evidence[];

  workingMemoryCandidates: WorkingMemoryItem[];

  attentionChanges: {
    previous: AttentionState;
    current: AttentionState;
  };

  interruptCandidates: string[];

  explanation: {
    internal: string;
    narrative: string;
    debug: string;
  };
};
89. Örnek: Yaralı tilki sahnesi

Objective world state:

Tilki kayanın arkasında.
Sol arka bacağı yaralı.
Mira’ya bakıyor.
Korku nedeniyle hırlıyor.
Yakındaki çalılıkta kırılmış bir tuzak var.
Rüzgâr Mira’dan tilkiye doğru esiyor.

Mira’nın koşulları:

Mesafe: 9 metre
Işık: orta
Dikkat: köye giden patikada
Yorgunluk: 0.35
Korku: 0.20
Observation skill: 0.55

İlk perception:

Yapraklarda hareket fark edildi.
Kayanın arkasından hırıltı duyuldu.
Bir hayvanın kuyruğu ve arka bacağı görüldü.
Bacak hareketinde düzensizlik fark edildi.
Tuzak fark edilmedi.

Percept’ler:

Hayvan benzeri varlık var.
confidence: 0.91

Varlık tilki olabilir.
confidence: 0.67

Hayvanın arka bacağında sorun olabilir.
confidence: 0.58

Hırıltı mevcut.
confidence: 0.89

Initial interpretations:

Hayvan korkmuş olabilir.
confidence: 0.51

Hayvan saldırgan olabilir.
confidence: 0.42
90. Mira aktif inceleme yaparsa

Action:

Güvenli mesafeden tilkiyi incele.

Değişiklikler:

Attention quality yükselir.
Hareket etmeme nedeniyle hedef daha rahat gözlenir.
Zaman maliyeti oluşur.
Tilki Mira’nın bakışını fark edebilir.

Yeni percept’ler:

Tilkinin bacağına ağırlık veremediği görülür.
Kürkte koyu renkli bir leke fark edilir.
Tilki saldırmak yerine geri çekilmeye çalışır.
Yakında metal parıltısı görülür.

Yeni evidence:

Tilki yaralı.
Tilki geri çekilmek istiyor.
Yakında metal bir nesne bulunuyor.

Belief Engine hipotezleri:

Tilki korkmuş.
Tilki tuzakta yaralanmış olabilir.
91. Kardeşin perception’ı

Kardeş daha geride bulunuyor.

Tilkiyi net göremiyor.
Mira’nın durduğunu görüyor.
Hırıltıyı duyuyor.
Mira’nın dikkatli hareket ettiğini fark ediyor.

Kardeşin belief’i:

Mira’nın önünde tehlikeli bir şey olabilir.

Tilkinin yaralı olduğunu henüz bilmeyebilir.

Bu nedenle:

“Mira, geri gel!”

eylemini düşünebilir.

Aynı dünya durumu farklı davranış üretir.

92. Tilkinin perception’ı

Tilki:

Mira’nın kokusunu alıyor.
Mira’nın yaklaştığını görüyor.
Kardeşin daha uzakta olduğunu duyuyor.
Mira’nın elindeki elmanın kokusunu fark ediyor.

Associative percept:

Tanıdık olmayan insan kokusu
Yaklaşan büyük varlık
Yiyecek kokusu
Kaçışı sınırlayan yaralanma

Threat association:

yüksek ama kesin değil

Mira yavaşlayıp geri çekilirse:

yaklaşma baskısı düşer
tehdit algısı azalır
yiyecek salience artar
93. MVP Perception Engine

İlk sürümde desteklenecek duyular:

vision
hearing
smell
touch
interoception

İlk perception bileşenleri:

Range
Line of sight
Occlusion
Lighting
Distance
Signal intensity
Noise
Attention
Salience
Recognition
Observation–interpretation separation

İlk active perception eylemleri:

observe
inspect
listen
search
track
94. MVP sade veri modeli
type SimplePercept = {
  perceptId: string;
  observerId: string;

  modality: string;
  sourceEntityId?: string;

  feature: string;
  perceivedValue: unknown;

  clarity: number;
  confidence: number;
  salience: number;

  isInterpretation: boolean;

  occurredAt: number;
};
type SimpleAttentionState = {
  actorId: string;

  focusEntityId?: string;
  focusTaskId?: string;

  capacity: number;
  load: number;
  vigilance: number;
};
95. MVP işlem sırası
1. Observer çevresindeki potansiyel sinyaller bulunur
2. Duyu menzili ve erişim kontrol edilir
3. Mesafe, ışık, engel ve gürültü uygulanır
4. Attention ve salience değerlendirilir
5. Detection sonucu belirlenir
6. Algılanan feature’lar çıkarılır
7. Entity recognition yapılır
8. Observation ve interpretation ayrılır
9. Evidence candidate’ları üretilir
10. Working Memory ve Belief Engine’e aktarılır
96. MVP sınırları
Aktif sahne actor başına signal adayı: 25
Oluşturulan percept: en fazla 10
Interpretation: percept başına en fazla 3
Entity candidate: percept başına en fazla 3
Cross-modal birleşim: en fazla 2
Active inspection depth: en fazla 2
Perception inference: en fazla 1 adım

Perception Engine karmaşık nedensel çıkarım yapmamalıdır.

Bu Belief Engine’in görevidir.

97. Önerilen modüller
PerceptionEngine
├── SensoryCandidateCollector
├── SensoryAccessResolver
├── VisionResolver
├── HearingResolver
├── SmellResolver
├── TouchResolver
├── InteroceptionResolver
├── AttentionManager
├── SalienceEvaluator
├── DetectionResolver
├── FeatureExtractor
├── EntityRecognitionEngine
├── SocialPerceptionResolver
├── AffordancePerceptionBuilder
├── CrossModalIntegrator
├── ActivePerceptionResolver
├── PerceptionAccessGuard
└── PerceptionExplanationBuilder

İlk sürümde bunların tamamı ayrı servis olmamalıdır.

Tek bir Perception domain modülü içinde alt bileşenler olarak başlanabilir.

98. Temel prensipler

Perception, dünya state’inin doğrudan kopyası değildir.

Bir sinyalin dünyada var olması, NPC tarafından algılanacağı anlamına gelmez.

Görüş hattı, mesafe, ışık, gürültü, koku yönü, dikkat ve duyusal kapasite ayrı ayrı değerlendirilmelidir.

NPC algılanabilir olan her şeyi fark etmemeli; attention ve salience seçici olmalıdır.

Observation ile interpretation birbirinden ayrılmalıdır.

Başka karakterlerin duygu ve niyetleri doğrudan algılanmış gerçekler değil, yorumlanmış hipotezlerdir.

Perception kısmi, belirsiz ve hatalı olabilir.

Aynı olay farklı konum, dikkat, yetenek ve duygular nedeniyle her NPC tarafından farklı algılanmalıdır.

Aktif inceleme zaman ve efor karşılığında perception kalitesini artırmalıdır.

Skill’ler yalnızca action başarısını değil, hangi özelliklerin fark edildiğini de etkilemelidir.

Consequence ancak NPC tarafından algılanır veya sonradan öğrenilirse belief ve memory üzerinde etki oluşturmalıdır.

NPC yalnızca fiziksel ve epistemik olarak erişebildiği sinyaller üzerinden bilgi kazanmalıdır.

Narrative camera’nın bildiği bilgi, NPC’nin bildiği bilgiyle karıştırılmamalıdır.

Perception Engine kanıt üretmeli; kesin belief ve uzun nedensel yorumları Belief Engine’e bırakmalıdır.