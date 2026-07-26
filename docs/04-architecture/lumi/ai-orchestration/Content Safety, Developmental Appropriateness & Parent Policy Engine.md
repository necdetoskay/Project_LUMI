Bu motorun görevi yalnızca “sakıncalı kelimeleri filtrelemek” değildir.

Asıl görevi:

Hikâye daha üretilmeden önce, çocuğun yaşına, hassasiyetlerine, ebeveyn tercihlerine ve mevcut duygusal yoğunluğa uygun bir anlatı alanı oluşturmaktır.

Yani bu motor sonradan metin silen pasif bir filtre değil; tüm anlatı sistemine sınır ve yön veren aktif bir politika katmanı olmalıdır.

1. Güvenlik ile uygunluk aynı şey değildir

İki kavramı ayırmalıyız.

Content Safety

Açıkça zararlı, korkutucu, travmatik veya yaşa uygun olmayan içeriği önler.

Developmental Appropriateness

İçeriğin çocuğun gelişim düzeyine uygun biçimde sunulmasını sağlar.

Bir içerik zararlı olmayabilir ama yine de yaşa uygun olmayabilir.

Örnek:

Bir karakterin arkadaşına küstüğünü anlatmak güvenlidir.

Ancak:

Uzun, karmaşık ve manipülatif bir ilişki çatışması

5 yaşındaki bir çocuk için gelişimsel olarak uygun olmayabilir.

2. Parent Policy Engine’in rolü

Parent Policy Engine ebeveyn tercihlerini sistem politikalarıyla birleştirir.

Önemli kural:

Ebeveyn ayarı, temel çocuk güvenliği kurallarını geçersiz kılamaz.

Örneğin ebeveyn:

Korku seviyesi sınırsız olsun

dese bile sistem yaşa bağlı güvenlik sınırlarını aşmamalıdır.

Bu nedenle iki katman olmalıdır:

Non-Overrideable Safety Rules
+
Configurable Parent Preferences
3. Politika kaynakları

Motor karar verirken şu kaynakları birleştirir:

Platform Safety Policy
Child Age Profile
Developmental Profile
Known Sensitivities
Parent Preferences
Current Story Tone
Current Emotional State
Recent Story History
Current Scene Risk
Narrative Purpose

Bunların hepsi aynı ağırlıkta değildir.

Öncelik sırası:

1. Zorunlu güvenlik kuralları
2. Çocuğun hassasiyetleri
3. Yaş ve gelişim uygunluğu
4. Ebeveyn tercihleri
5. Hikâye tonu
6. Anlatısal tercih
4. Child Safety Profile

Çocuk profiline güvenlik açısından gerekli bilgiler eklenebilir.

interface ChildSafetyProfile {
  childProfileId: string;

  age: number;
  developmentalBand:
    | "EARLY_CHILDHOOD"
    | "MIDDLE_CHILDHOOD"
    | "PRETEEN";

  knownSensitivities: SensitivityProfile[];

  preferredIntensity: number;
  maximumIntensity: number;

  separationSensitivity?: number;
  darknessSensitivity?: number;
  animalHarmSensitivity?: number;
  loudSoundSensitivity?: number;
  lossSensitivity?: number;
  conflictSensitivity?: number;

  requiresReassuranceFrequency?: number;
  prefersPredictableResolution?: boolean;

  parentConfiguredRestrictions: ParentRestriction[];

  lastUpdatedAt: string;
}

Bu alanların hepsi zorunlu değildir.

Sistem çocuğa psikolojik teşhis koymamalıdır.

Yalnızca ebeveynin açıkça belirttiği veya sistem kullanımından güvenli biçimde çıkarılabilen tercihler tutulmalıdır.

5. Sensitivity Profile
interface SensitivityProfile {
  category:
    | "DARKNESS"
    | "SEPARATION"
    | "LOUD_NOISE"
    | "ANIMAL_INJURY"
    | "CHARACTER_LOSS"
    | "CONFLICT"
    | "ENCLOSED_SPACES"
    | "MONSTERS"
    | "MEDICAL_THEMES"
    | "ABANDONMENT"
    | "FAILURE"
    | "UNKNOWN";

  level: number;

  source:
    | "PARENT_DECLARED"
    | "CHILD_PREFERENCE"
    | "SESSION_OBSERVATION"
    | "SYSTEM_DEFAULT";

  confidence: number;

  temporary: boolean;
  expiresAt?: string;
}

Önemli nokta:

Sistem tek bir tepkiden kalıcı hassasiyet sonucu çıkarmamalıdır.

Örneğin çocuk bir sahnede karanlık mağarayı seçmediyse bu, “karanlıktan korkuyor” anlamına gelmez.

6. Parent Preference Profile
interface ParentPreferenceProfile {
  profileId: string;

  allowedIntensityRange: {
    minimum: number;
    maximum: number;
  };

  topicPolicies: TopicPolicy[];

  scaryContentPolicy:
    | "AVOID"
    | "MILD_ONLY"
    | "MODERATE_WITH_REASSURANCE";

  sadnessPolicy:
    | "AVOID"
    | "MILD"
    | "ALLOW_WITH_RECOVERY";

  conflictPolicy:
    | "LOW"
    | "MODERATE"
    | "REALISTIC_BUT_SAFE";

  fantasyThreatPolicy:
    | "NONE"
    | "SYMBOLIC"
    | "MILD"
    | "MODERATE";

  educationalThemes: string[];

  valuesToEncourage: string[];
  valuesToAvoidExplicitTeaching: string[];

  bedtimeModeDefaults?: BedtimePolicy;

  reflectionQuestionPolicy:
    | "NONE"
    | "OPTIONAL"
    | "ALWAYS";

  parentGuidanceEnabled: boolean;
}
7. Topic Policy

Her konu için tek bir izin/yasak mantığı yeterli değildir.

interface TopicPolicy {
  topic: string;

  mode:
    | "ALLOW"
    | "ALLOW_WITH_LIMITS"
    | "TRANSFORM"
    | "DEFER"
    | "BLOCK";

  constraints?: string[];

  ageMinimum?: number;
  intensityMaximum?: number;

  requiredRecovery?: boolean;
  requiredParentGuidance?: boolean;
}

Örnek:

{
  "topic": "CHARACTER_SEPARATION",
  "mode": "ALLOW_WITH_LIMITS",
  "constraints": [
    "Separation must be temporary",
    "Child must know reunion is possible",
    "Trusted character remains present"
  ],
  "requiredRecovery": true
}
8. İçerik risk kategorileri
type ContentRiskCategory =
  | "FEAR"
  | "VIOLENCE"
  | "INJURY"
  | "LOSS"
  | "SEPARATION"
  | "ABANDONMENT"
  | "HUMILIATION"
  | "BULLYING"
  | "COERCION"
  | "MANIPULATION"
  | "DANGEROUS_IMITATION"
  | "MEDICAL_DISTRESS"
  | "DEATH"
  | "NIGHTMARE_IMAGERY"
  | "MORAL_PRESSURE"
  | "SHAME"
  | "SELF_BLAME"
  | "ADULT_THEME"
  | "PRIVACY_RISK";

Her risk kategorisi için:

yoğunluk,
süre,
bağlam,
çözüm biçimi,
tekrar sıklığı

ayrı değerlendirilmelidir.

9. Risk yalnızca içerikten doğmaz

Aynı olay farklı sunumlarda çok farklı etki yaratabilir.

Örnek olay:

Çocuk karakter ormanda yolunu kaybediyor.

Düşük riskli anlatım:

Patika kayboldu ama yanında tilki var.
Harita çalışıyor.
Köyün ışıkları uzaktan görünüyor.

Yüksek riskli anlatım:

Karanlık çöktü.
Kimse onu bulamayacak.
Tek başına ve çaresiz.

Bu nedenle motor yalnızca “ne oldu?” sorusunu değil, “nasıl anlatıldı?” sorusunu da değerlendirmelidir.

10. Safety Risk Vector
interface SafetyRiskVector {
  fear: number;
  helplessness: number;
  isolation: number;
  injuryDetail: number;
  permanence: number;
  unpredictability: number;
  moralPressure: number;
  shame: number;
  imitationRisk: number;
  emotionalRecoveryDemand: number;
}

İki sahne aynı genel risk puanına sahip olabilir ama risk türleri farklı olabilir.

Bu yüzden tek sayı yeterli değildir.

11. Developmental Appropriateness Vector
interface DevelopmentalAppropriatenessVector {
  languageFit: number;
  emotionalComplexityFit: number;
  conceptFit: number;
  choiceComplexityFit: number;
  consequenceClarityFit: number;
  attentionSpanFit: number;
  socialUnderstandingFit: number;
  ambiguityToleranceFit: number;
  recoveryClarityFit: number;
}

Bu vektör, sahnenin “zararsız ama fazla karmaşık” olmasını da tespit eder.

12. Intensity Model

Yoğunluk tek bir “korku seviyesi” değildir.

interface SceneIntensityVector {
  fear: number;
  sadness: number;
  urgency: number;
  conflict: number;
  uncertainty: number;
  sensoryIntensity: number;
  emotionalWeight: number;
  moralWeight: number;
}

Sistem bu vektörü:

sahne planlamasında,
metin üretiminde,
ses tasarımında,
görsel üretimde,
playback hızında

kullanmalıdır.

13. Intensity Budget

Her hikâyenin toplam bir yoğunluk bütçesi olmalıdır.

interface StoryIntensityBudget {
  maximumPeakIntensity: number;
  maximumAverageIntensity: number;

  maximumHighIntensityScenes: number;
  maximumConsecutiveTenseBeats: number;

  requiredRecoveryScenes: number;
  requiredWarmthRatio: number;

  bedtimeAdjustmentFactor?: number;
}

Örneğin:

Bir hikâyede yüksek yoğunluklu yalnızca 1 sahne olabilir.
Arka arkaya en fazla 2 gerilim beat’i olabilir.
Son bölüm mutlaka güvenli kapanış içermelidir.
14. Peak Intensity sınırı

Sahnenin ortalama yoğunluğu düşük olsa bile kısa bir tepe çok yüksek olabilir.

Örnek:

Sahne genel olarak sakin.
Bir anda çok yüksek ses ve tehdit.

Bu yine rahatsız edici olabilir.

Bu yüzden:

Average Intensity
+
Peak Intensity
+
Peak Duration

birlikte değerlendirilmelidir.

15. Exposure Duration

Aynı yoğunluk kısa veya uzun sürmesine göre farklı etki oluşturur.

interface IntensityExposure {
  intensity: number;
  durationSeconds: number;
  recoveryDelaySeconds: number;
}

Örneğin:

3 saniyelik şaşkınlık

ile

3 dakika süren çaresizlik

aynı kabul edilmemelidir.

16. Recovery Requirement

Her yoğun olaydan sonra uygun toparlanma içeriği gerekebilir.

interface RecoveryRequirement {
  required: boolean;

  type:
    | "REASSURANCE"
    | "SAFE_CHARACTER_PRESENCE"
    | "PROBLEM_CLARIFICATION"
    | "HUMOR"
    | "REST"
    | "EMOTIONAL_CONVERSATION"
    | "SUCCESS_SIGNAL"
    | "RETURN_TO_SAFE_PLACE";

  minimumRecoveryBeats: number;
  maximumDelayBeforeRecovery: number;
}
17. Safety Envelope

Her sahne üretimi öncesinde bir güvenlik zarfı oluşturulmalıdır.

interface SceneSafetyEnvelope {
  allowedRiskCategories: ContentRiskCategory[];

  prohibitedElements: string[];
  transformedElements: string[];

  maximumIntensity: SceneIntensityVector;

  requiredSafetySignals: string[];
  requiredRecoverySignals: string[];

  forbiddenOutcomeTypes: string[];

  parentPolicyReferences: string[];
}

Narrative Generator bu zarfın dışına çıkamaz.

18. Safety Signal

Çocuğun hikâyenin güvenli sınırlar içinde olduğunu anlamasına yardım eden anlatısal işaretlerdir.

Örnekler:

güvenilir arkadaşın yanında olması,
çıkış yolunun görünür olması,
yardım çağrılabilmesi,
tehdit oluşturan karakterin aslında yanlış anlaşılması,
yaralanmanın hafif olduğunun gösterilmesi,
geri dönüş ihtimalinin açık olması,
tehlikenin kısa süreli olması.
type SafetySignal =
  | "TRUSTED_COMPANION_PRESENT"
  | "VISIBLE_EXIT"
  | "HELP_AVAILABLE"
  | "THREAT_NOT_PERMANENT"
  | "INJURY_IS_MINOR"
  | "REUNION_EXPECTED"
  | "SAFE_PLACE_NEARBY"
  | "CHILD_HAS_AGENCY"
  | "ADULT_SUPPORT_AVAILABLE";
19. Helplessness kontrolü

Çocuk karakterin hiç seçeneği olmaması yoğunluğu artırır.

Bu nedenle sahnede en az bir agency sinyali bulunmalıdır.

Agency örnekleri:

yardım çağırabilmek,
saklanabilmek,
konuşabilmek,
geri dönebilmek,
bir araç kullanabilmek,
güvenilir karaktere danışabilmek.

Önemli kural:

Çocuk karakter hata yapabilir ama tamamen güçsüz bırakılmamalıdır.

20. Choice Safety

Bazı seçimler teknik olarak iki seçenek sunar ama aslında çocuğu baskılar.

Örnek:

Arkadaşını kurtar
Onu yalnız bırak

Bu seçenekler ahlaki olarak simetrik değildir.

Daha iyi:

Yanında kal ve yardım et
Köye koşup yardım çağır

İki seçenek de güvenli ve makul olabilir.

Choice Safety Validator şunları kontrol etmelidir:

seçeneklerden biri utandırıcı mı,
biri açıkça kötü gösteriliyor mu,
çocuk ağır sonuçlardan sorumlu tutuluyor mu,
sonuçlar yaşına göre fazla kalıcı mı,
seçim yeterince açıklanmış mı,
seçim geri dönüşsüz mü.
21. Moral Pressure

Çocuğa sürekli “iyi çocuk olma” baskısı uygulanmamalıdır.

Yanlış:

Gerçekten iyi bir arkadaşsan tilkiye yardım edersin.

Bu ifade:

suçluluk,
kimlik baskısı,
manipülasyon

oluşturur.

Doğru yaklaşım:

Tilki yaralı görünüyordu. Lila yoluna devam etmekle yardım etmek arasında kararsız kaldı.

Sistem davranışı tartışabilir ama çocuğun değerini davranışa bağlamamalıdır.

22. Shame Prevention

Hikâye çocuğu utandırmamalıdır.

Kaçınılması gerekenler:

“Yanlış seçtin.”
“Bunu nasıl düşünemedin?”
karakterlerin çocukla alay etmesi,
başarısızlık sonrası küçümseme,
korkunun zayıflık gibi sunulması.

Alternatif:

Bu yol beklediklerinden daha zor çıktı.
Şimdi başka bir çözüm deneyebilirler.
23. Failure Safety

Başarısızlık:

yeni bilgi,
ikinci deneme,
yardım isteme,
alternatif çözüm

üretmelidir.

interface SafeFailurePolicy {
  allowPermanentFailure: boolean;
  allowCharacterBlame: boolean;

  requiredLearningSignal: boolean;
  requiredRecoveryPath: boolean;

  maximumConsequenceSeverity: number;

  allowedFailureTypes:
    | "TEMPORARY"
    | "PARTIAL"
    | "REDIRECTED"
    | "COLLABORATIVE_RECOVERY";
}

Küçük yaşlarda kalıcı başarısızlık varsayılan olarak kullanılmamalıdır.

24. Injury Policy

Yaralanma içeriği tamamen yasak olmak zorunda değildir.

Örneğin yaralı tilki hikâyenin şefkat temasını destekleyebilir.

Ancak sınırlar gerekir.

interface InjuryPolicy {
  allowedSeverity:
    | "NONE"
    | "MINOR"
    | "MODERATE_NON_GRAPHIC";

  visualDetailMaximum: number;
  painDescriptionMaximum: number;

  recoveryCertaintyRequired: boolean;
  caregiverPresenceRequired: boolean;

  allowBloodReference: boolean;
  allowMedicalProcedureDetail: boolean;
}

Küçük çocuk için uygun örnek:

Tilkinin patisinde küçük bir çizik vardı. Üzerine basarken biraz zorlanıyordu.

Uygun olmayan örnek:

Yara ayrıntılı şekilde tarif edilir ve uzun süre acı vurgulanır.

25. Animal Harm Policy

Çocuklar hayvanlara yönelik zarara özellikle hassas olabilir.

Bu nedenle:

yaralanma geçici olmalı,
bakım ve iyileşme görünür olmalı,
grafik ayrıntı olmamalı,
hayvan çaresizce terk edilmemeli,
çocuğun tüm sorumluluğu tek başına taşımaması sağlanmalı.

Hayvana yardım teması kullanılabilir ama duygusal manipülasyona dönüştürülmemelidir.

26. Separation Policy

Ayrılık güçlü bir hikâye aracı olabilir.

Ancak yaşa göre sınırlandırılmalıdır.

Güvenli ayrılık:

Geçici
Nedeni anlaşılır
Yeniden buluşma ihtimali açık
Çocuk yalnız değil
Yardım yolu mevcut

Riskli ayrılık:

Belirsiz süreli
Terk edilme hissi
Kimsenin geri gelmeyeceği düşüncesi
Uzun süreli çaresizlik
27. Character Loss ve Death Policy

Ölüm teması varsayılan çocuk hikâyesinde kullanılmamalıdır.

Ancak bazı özel hikâyelerde ebeveyn tercihiyle:

doğadaki yaşam döngüsü,
geçmişte yaşamış bir karakter,
kayıp ve hatırlama

temaları işlenebilir.

Böyle bir durumda:

açık ve sakin dil,
yanlış umut vermeme,
suçluluk oluşturmama,
yaşa uygun açıklık,
güvenli yetişkin veya rehber varlığı,
ebeveyn rehberi

gerekir.

Bu motor yaşam sonu veya kayıp temasını rastgele üretmemelidir.

28. Villain Policy

Her hikâyede kötü karakter gerekmez.

Çocuk hikâyelerinde çatışma kaynakları şunlar olabilir:

doğa koşulları,
yanlış anlaşılma,
farklı hedefler,
bilgi eksikliği,
sınırlı kaynak,
hata,
korku,
iletişim sorunu.

Kötü karakter varsa:

tamamen sadist olmamalı,
tehdit düzeyi yaşa uygun olmalı,
çocuğu doğrudan uzun süre hedef almamalı,
çözüm yalnızca şiddet olmamalı.
29. Misunderstood Character Safety

LUMI’nin “yanlış anlaşılan karakterler” fikri bu motorla çok uyumlu.

Ancak şu hata yapılmamalıdır:

Her tehdit aslında iyiymiş.

Bu zamanla çocuğun tehlike sinyallerini değersizleştirebilir.

Daha dengeli yaklaşım:

Bazı karakterler yanlış anlaşılır.
Bazıları gerçekten sınır ihlali yapar.
Bazıları iyi niyetli ama hatalı davranır.
Bazılarından uzak durmak gerekir.

Hikâye:

empatiyi,
sınır koymayı,
dikkatli olmayı

birlikte öğretebilir.

30. Boundary Safety

Çocuk hikâyelerinde “hayır” diyebilme ve yardım isteme güvenli biçimde desteklenebilir.

Örnek güvenli mesajlar:

istemediğin bir şeye hayır diyebilirsin,
güvendiğin bir büyüğe söyleyebilirsin,
yalnız gitmek zorunda değilsin,
rahatsız hissedersen uzaklaşabilirsin.

Ancak sistem bunu doğrudan korkutucu gerçek dünya senaryolarıyla vermemelidir.

Fantastik ve yaşa uygun örneklerle sunulabilir.

31. Dangerous Imitation Risk

Bazı sahneler çocuk tarafından taklit edilebilir.

Örnekler:

yüksek yere tırmanma,
ateş yakma,
kesici alet kullanma,
bilinmeyen madde içme,
elektrikle oynama,
yalnız dışarı çıkma.

Bu davranışlar fantastik bağlamda olsa bile açık güvenlik sinyali gerekebilir.

interface ImitationRiskPolicy {
  riskType: string;

  mode:
    | "BLOCK"
    | "ADULT_SUPERVISION_REQUIRED"
    | "FANTASY_ONLY"
    | "ALLOW_WITH_CAUTION";

  requiredNarrativeSignal?: string;
}
32. Real-World Safety Separation

Fantastik hikâye ile gerçek dünya davranışı karışmamalıdır.

Örneğin:

Lila sihirli iksir içti.

Bu, fantastik dünyada sorun olmayabilir.

Ama gerçek dünya bağlamında:

tanımadığı sıvıyı içmek,
ilaçları denemek,
kimyasal maddelerle oynamak

normalleştirilmemelidir.

Motor nesnelerin fantastik ve gerçek dünya karşılıklarını ayırt etmelidir.

33. Privacy Safety

Çocuk etkileşimlerde serbest metin veya ses kullanıyorsa kişisel veri paylaşabilir.

Örnek:

Benim okulumun adı...
Evimizin adresi...
Telefon numaram...

Parent Policy Engine yalnızca hikâye içeriğini değil, çocuk girdilerini de korumalıdır.

interface ChildInputSafetyPolicy {
  detectPersonalData: boolean;
  storeRawVoice: boolean;
  storeRawText: boolean;

  redactSensitiveData: boolean;
  notifyParentOnRepeatedRisk: boolean;

  allowRealNameUseInStory: boolean;
  allowLocationUseInStory: boolean;
}
34. Child Input Redirection

Çocuk kişisel bilgi verirse sistem bunu hikâyeye işlememelidir.

Örneğin çocuk:

Evim şu sokakta.

Sistem:

Bunu kaydetmeyelim. Hikâyedeki ev için hayalî bir isim seçebiliriz.

Benzer şekilde çocuk:

Telefon numaram...

derse bu veri saklanmamalı ve kullanılmamalıdır.

35. Emotional State Estimation

Sistem çocuğun duygusunu kesin olarak bildiğini iddia etmemelidir.

Yanlış:

Çocuk şu anda korkuyor.

Daha doğru:

Possible discomfort signal detected.
interface SessionEmotionalSignal {
  signalType:
    | "REPEATED_PAUSE"
    | "SKIP"
    | "EXIT"
    | "REPLAY"
    | "NO_RESPONSE"
    | "PARENT_INTERVENTION"
    | "NEGATIVE_FEEDBACK";

  possibleMeaning: string[];
  confidence: number;

  requiresAdaptation: boolean;
}

Bu sinyaller teşhis değildir.

36. Adaptive Safety Response

Çocuk yoğunluk sinyali verirse sistem şu adımları uygulayabilir:

1. Yoğunluğu azalt
2. Güvenilir karakteri öne çıkar
3. Durumu netleştir
4. Daha fazla agency ver
5. Kısa toparlanma beat’i ekle
6. Alternatif yol sun
7. Gerekirse sahneyi erken kapat

Sistem:

Korktun mu?

diye zorlayıcı şekilde sormak zorunda değildir.

Daha doğal:

Biraz durup dinlenelim mi, yoksa daha sakin olan patikadan mı devam edelim?

37. Stop & Safe Exit

Çocuk her zaman hikâyeden güvenli biçimde çıkabilmelidir.

Çıkış:

ceza vermemeli,
ilerlemeyi bozmayacak,
karakterleri terk etmiş gibi hissettirmeyecek,
doğal bir duraklama yaratmalıdır.

Örnek:

Lila ve tilki, büyük ağacın altında dinlenmeye karar verdi. Maceraya hazır olduklarında devam edebilirler.

Bu, Story Session Engine’deki soft ending ile bağlantılıdır.

38. Bedtime Safety Mode

Uyku öncesi mod ayrı bir politika profili olmalıdır.

interface BedtimePolicy {
  enabled: boolean;

  maximumTension: number;
  maximumMystery: number;
  maximumUrgency: number;

  avoidCliffhangers: boolean;
  avoidLoudSoundCues: boolean;
  avoidFastTransitions: boolean;

  requireSafeLocationEnding: boolean;
  requireWarmClosure: boolean;

  narrationSpeedFactor: number;
  musicIntensityMaximum: number;
}

Uyku öncesi hikâyede:

çözülmemiş tehdit,
yüksek ses,
kovalamaca,
karanlıkta yalnız kalma

kullanılmamalıdır.

39. Bedtime Narrative Transformation

Aynı sahne uyku öncesi modda farklı ifade edilebilir.

Normal mod:

Köprünün altından ani bir gürültü geldi. Tilki hızla geri çekildi.

Uyku modu:

Köprünün altından yumuşak bir su sesi duyuldu. Tilki durup dikkatle dinledi.

Kanonik olay değişebilir mi?

Eğer olay temel hikâye için gerekli değilse yumuşatılabilir.

Temel olay gerekli ise:

ses yoğunluğu azaltılır,
güvenlik sinyali artırılır,
tehdit yerine merak kullanılır.
40. Parent Override Limits

Ebeveyn bazı tercihleri değiştirebilir:

korku seviyesi,
üzüntü yoğunluğu,
çatışma sıklığı,
mini oyunlar,
gece modu,
belirli temalar.

Ancak şunları açamaz:

grafik şiddet,
ağır psikolojik baskı,
cinsel içerik,
zararlı taklit davranışları,
çocuğa yönelik manipülasyon,
mahremiyet ihlali,
ağır korku.

Bu sınırlar sistem seviyesinde sabit olmalıdır.

41. Parent Preview

Ebeveyn isterse hikâye öncesi kısa içerik özeti görebilir.

Örnek:

Bu hikâye şunları içerir:
- hafif karanlık mağara sahnesi
- geçici ayrılık
- yaralı bir hayvana yardım
- güvenli ve sıcak kapanış

Bu özet spoiler vermeden içerik şeffaflığı sağlar.

42. Content Descriptor System

Hikâyeler için içerik etiketleri üretilebilir.

interface ContentDescriptor {
  category: string;
  intensity: number;

  duration: "BRIEF" | "MODERATE" | "EXTENDED";

  resolvedSafely: boolean;
  parentPreviewText: string;
}

Örnek:

{
  "category": "MILD_DARKNESS",
  "intensity": 0.25,
  "duration": "BRIEF",
  "resolvedSafely": true,
  "parentPreviewText": "Kısa süreli loş mağara sahnesi bulunur."
}
43. Parent Guidance Trigger

Bazı temalar ebeveyn rehberi üretebilir.

Örnek:

yardım isteme,
arkadaşlık çatışması,
kayıp,
korku,
sınır koyma,
başarısızlık,
empati,
kıskançlık.
interface ParentGuidanceTrigger {
  topic: string;
  intensityThreshold: number;

  guidanceType:
    | "CONVERSATION_STARTER"
    | "REASSURANCE_TIP"
    | "FOLLOW_UP_ACTIVITY"
    | "OBSERVATION_NOTE";
}

Bu rehber çocuğa gösterilmemelidir.

44. Over-Parenting Risk

Sistem her davranışı ebeveyne raporlamamalıdır.

Çocuğun:

hangi rengi seçtiği,
hangi karakteri sevdiği,
bir seçimde tereddüt ettiği

gibi sıradan davranışları psikolojik rapora dönüştürmek doğru değildir.

Ebeveyne yalnızca:

içerik tercihleri,
oynanan hikâye özeti,
ebeveynin açtığı gelişim temaları,
açık güvenlik uyarıları

gösterilmelidir.

45. No Diagnosis Principle

Sistem şunları söylememelidir:

çocuğunuz kaygılı,
bağlanma sorunu var,
empati düzeyi düşük,
dikkat eksikliği olabilir.

Bunun yerine gözleme dayalı tarafsız ifadeler kullanılabilir:

Çocuk son üç oturumda yüksek gerilimli sahneleri atlamayı tercih etti.

Bu bile yalnızca ebeveynin bu tür özetleri açtığı durumda sunulmalıdır.

46. Policy Decision Model
interface SafetyPolicyDecision {
  requestId: string;

  decision:
    | "ALLOW"
    | "ALLOW_WITH_CONSTRAINTS"
    | "TRANSFORM"
    | "DEFER"
    | "BLOCK";

  riskVector: SafetyRiskVector;
  appropriatenessVector: DevelopmentalAppropriatenessVector;

  appliedPolicies: string[];

  requiredConstraints: string[];
  requiredSafetySignals: string[];
  requiredRecovery: RecoveryRequirement[];

  parentGuidanceRequired: boolean;

  explanationForSystem: string;
}
47. Transform yerine Block

Her riskli fikir tamamen engellenmek zorunda değildir.

Örnek fikir:

Çocuk karanlık ormanda yalnız kalıyor.

Transform sonucu:

Çocuk kısa süreliğine patikayı kaybediyor ama yanında konuşan fener bulunuyor ve köy ışıkları görünüyor.

Bu şekilde anlatısal amaç korunabilir:

belirsizlik,
yön bulma,
cesaret

ama risk azaltılır.

48. Safety Transformation Types
type SafetyTransformationType =
  | "REDUCE_INTENSITY"
  | "SHORTEN_EXPOSURE"
  | "ADD_COMPANION"
  | "ADD_ESCAPE_PATH"
  | "MAKE_THREAT_SYMBOLIC"
  | "REMOVE_GRAPHIC_DETAIL"
  | "MAKE_CONSEQUENCE_TEMPORARY"
  | "ADD_REASSURANCE"
  | "CHANGE_CONFLICT_TYPE"
  | "MOVE_TO_OFFSCREEN"
  | "REPLACE_WITH_MYSTERY"
  | "ADD_ADULT_SUPPORT";
49. Örnek dönüşümler
Ağır tehdit

Önce:

Canavar Lila’yı yakalamak için peşinden koştu.

Dönüşüm:

Büyük gölge Lila’nın yolunu kapattı. Tilki başka bir patika olduğunu fark etti.

Kalıcı kayıp

Önce:

Tilki sonsuza kadar kayboldu.

Dönüşüm:

Tilki sisin içinde gözden kayboldu ama uzaktan bıraktığı pati izleri görünüyordu.

Utandırıcı başarısızlık

Önce:

Lila yanlış yaptığı için herkes güldü.

Dönüşüm:

Lila’nın planı işe yaramadı. Diğerleri farklı bir çözüm bulmak için onun yanına geldi.

50. Safety Checkpoint’leri

Güvenlik tek aşamada kontrol edilmemelidir.

1. Arc planlama öncesi
2. Story Contract oluşturulurken
3. Scene Contract oluşturulurken
4. Beat planlama sırasında
5. Narrative Generation öncesi
6. Metin üretimi sonrası
7. Görsel üretimi öncesi
8. Ses tasarımı öncesi
9. Playback öncesi
10. Kullanıcı girdisi sonrası

Her katman farklı riskleri yakalar.

51. Visual Safety

Metin güvenli olsa bile görsel korkutucu olabilir.

Örnek:

Metin:
Mağarada büyük bir gölge vardı.

Görsel:

Keskin dişli, kanlı, çok gerçekçi yaratık

Bu nedenle görsel için ayrı güvenlik sözleşmesi gerekir.

interface VisualSafetyProfile {
  realismMaximum: number;
  darknessMaximum: number;
  threateningScaleMaximum: number;

  prohibitGraphicInjury: boolean;
  prohibitMenacingEyeContact: boolean;

  requireFriendlyDesignSignals: boolean;
  requireVisibleSafeCharacter: boolean;
}
52. Sound Safety

Ses içerikleri de yoğunluğu artırabilir.

Riskli sesler:

ani yüksek ses,
uzun çığlık,
yoğun kalp atışı,
sert metal sesi,
uzun süreli karanlık ambiyans,
çok yüksek bas.
interface SoundSafetyPolicy {
  maximumVolumeSpike: number;
  maximumSustainedTensionDuration: number;

  allowScreams: boolean;
  allowHeartbeat: boolean;
  allowSuddenImpact: boolean;

  requireVolumeNormalization: boolean;
  bedtimeModeRestrictions: string[];
}
53. TTS Safety

TTS sesi:

aşırı dramatik,
tehditkâr,
alaycı,
bağıran

olmamalıdır.

Metin yumuşak olsa bile seslendirme korkutucu hale gelebilir.

Bu nedenle emotional delivery metadata da kontrol edilmelidir.

54. Interaction Safety

Mini oyun veya etkileşimler de baskı oluşturabilir.

Kaçınılması gerekenler:

süre baskısı,
yüksek sesli başarısızlık efekti,
tekrar tekrar deneme zorunluluğu,
başarısız olunca karakter zarar görmesi,
ödül kaybı tehdidi,
utandırıcı geri bildirim.

Güvenli alternatif:

süre sınırı yok,
tekrar deneyebilirsin,
yardım seçeneği,
farklı çözüm yolu,
düşük riskli sonuç.
55. Time Pressure Policy

Küçük çocuklar için geri sayım çoğu zaman gereksiz stres oluşturur.

interface TimePressurePolicy {
  allowed: boolean;

  maximumDurationSeconds?: number;
  visibleCountdownAllowed?: boolean;

  failureConsequenceMaximum?: number;
  pauseAllowed: boolean;
}

Varsayılan olarak:

4–6 yaş:
Gerçek zamanlı baskı yok

7–9 yaş:
İsteğe bağlı, düşük riskli

10+:
Hikâyeye bağlı sınırlı kullanım
56. Reward Safety

Ödül sistemi çocuğu zorlayıcı biçimde yönlendirmemelidir.

Kaçınılması gerekenler:

korkutucu sahneyi geçmek için ödül,
“iyi çocuk” puanı,
yardım etmediği için rozet kaybı,
sürekli streak baskısı,
seçimlerin ahlaki puanlanması.

Ödüller:

keşif,
merak,
katılım,
hikâye tamamlaması,
yaratıcı ifade

üzerinden verilebilir.

57. Moral Score kullanılmamalı

Çocuğun seçimlerinden:

İyilik puanı
Kötülük puanı

üretmek yanlış olur.

Bunun yerine karakter ve dünya sonuçları tutulur:

Tilkinin güveni arttı.
Köye geç ulaşıldı.
Yeni yol keşfedildi.

Çocuğun karakteri veya ahlakı puanlanmaz.

58. Safety Memory

Sistem güvenlik açısından yalnızca gerekli bilgiyi saklamalıdır.

Saklanabilir:

ebeveynin açıkça belirttiği hassasiyet,
tercih edilen yoğunluk,
içerik ayarları,
hikâye düzeyinde atlanan risk kategorileri.

Saklanmamalı:

çocuğun “korkak” olduğu yorumu,
psikolojik etiketler,
kalıcı kişilik çıkarımları,
gereksiz ham ses kayıtları.
59. Temporary Safety Adaptation

Bir oturumda çocuk huzursuz görünüyorsa bu ayar geçici olabilir.

interface TemporarySafetyOverride {
  sessionId: string;

  intensityReduction: number;
  disabledRiskCategories: string[];

  expiresAtSessionEnd: boolean;
}

Bu geçici ayar kalıcı profile otomatik yazılmamalıdır.

60. Safety Audit Event
interface SafetyAuditEvent {
  id: string;

  stage:
    | "PLANNING"
    | "GENERATION"
    | "VALIDATION"
    | "PLAYBACK"
    | "CHILD_INPUT";

  riskCategory: ContentRiskCategory;

  detectedIssue: string;
  actionTaken:
    | "ALLOWED"
    | "TRANSFORMED"
    | "BLOCKED"
    | "REGENERATED"
    | "ESCALATED";

  policyId: string;

  containsChildPersonalData: boolean;

  timestamp: string;
}

Audit kayıtları çocuğun özel içeriğini gereksiz yere saklamamalıdır.

61. Safety Rule Types
type SafetyRuleType =
  | "HARD_BLOCK"
  | "HARD_LIMIT"
  | "SOFT_LIMIT"
  | "TRANSFORMATION_RULE"
  | "RECOVERY_REQUIREMENT"
  | "PARENT_NOTIFICATION"
  | "PARENT_PREVIEW"
  | "DATA_PROTECTION";

Bu ayrım politika sisteminin anlaşılır olmasını sağlar.

62. Rule örneği
{
  "ruleId": "CHILD_SEPARATION_4_6",
  "type": "TRANSFORMATION_RULE",
  "conditions": {
    "ageMaximum": 6,
    "riskCategory": "SEPARATION",
    "intensityGreaterThan": 0.4
  },
  "actions": [
    "ADD_TRUSTED_COMPANION",
    "MAKE_SEPARATION_TEMPORARY",
    "SHOW_REUNION_PATH",
    "REQUIRE_RECOVERY_BEAT"
  ]
}
63. Policy Conflict Resolution

Bazen politikalar çelişebilir.

Örnek:

Ebeveyn macera yoğunluğunu yüksek istiyor.
Çocuk karanlık temalarını atlıyor.
Bedtime mode açık.

Çözüm:

Bedtime güvenlik sınırı
>
Geçici çocuk sinyali
>
Ebeveyn macera tercihi

Sonuç:

macera korunabilir,
karanlık azaltılır,
fiziksel tehdit yerine merak kullanılır.
64. Safe Narrative Substitution

Riskli bir anlatı işlevi daha güvenli başka bir araçla karşılanabilir.

Korku yerine merak
Şiddet yerine engel
Kayıp yerine geçici ayrılık
Ceza yerine doğal sonuç
Utanç yerine yeniden deneme
Kötü karakter yerine yanlış anlaşılma
Çaresizlik yerine yardım ihtiyacı

Bu, motorun yaratıcılığı azaltmaz; aksine daha iyi anlatı çözümleri üretir.

65. Safety vs Narrative Integrity

Güvenlik dönüşümü hikâyeyi anlamsız hale getirmemelidir.

Örnek:

Ana sahne amacı:

Karakterin yardım istemeyi öğrenmesi

Tehlike tamamen kaldırılırsa yardım ihtiyacı da ortadan kalkabilir.

Daha iyi dönüşüm:

Ağır tehdit kaldırılır.
Köprü problemi korunur.
Karakter tek başına çözemediğini fark eder.
Köyden yardım ister.

Tema korunur, risk azaltılır.

66. Safety-aware Scene Planning

Scene Planner sahne üretirken önceden şu bilgileri almalıdır:

Allowed conflict types
Maximum intensity
Required safety signals
Forbidden consequences
Recovery requirements
Parent restrictions
Bedtime restrictions

Böylece riskli sahne üretildikten sonra düzeltmek zorunda kalmaz.

67. Safety-aware Arc Planning

Uzun vadeli arc’lar da güvenlik açısından değerlendirilmelidir.

Örnek:

Bir karakterin uzun süre kayıp olması

tek sahnede güvenli görünebilir ama 6 hikâye boyunca sürerse ayrılık baskısı yaratabilir.

Arc Safety Validator şunları kontrol eder:

riskin toplam süresi,
tekrar sıklığı,
çözüm gecikmesi,
duygusal yorgunluk,
recovery dengesi.
68. Cumulative Emotional Load

Her sahne tek başına uygun olabilir ama art arda geldiğinde ağırlaşabilir.

Örnek:

Hikâye 1: yaralı hayvan
Hikâye 2: kayıp arkadaş
Hikâye 3: köyde sorun
Hikâye 4: karakterler tartışıyor

Tek tek güvenli olabilir ama toplam yük yüksektir.

interface EmotionalLoadMemory {
  recentFearLoad: number;
  recentSadnessLoad: number;
  recentConflictLoad: number;
  recentRecoveryLoad: number;
  recentWarmthLoad: number;
}

Planner yeni hikâyede denge kurmalıdır.

69. Warmth Reserve

Sistem yalnızca risk bütçesi değil, sıcaklık rezervi de hesaplayabilir.

interface WarmthReserve {
  companionship: number;
  humor: number;
  safety: number;
  success: number;
  affection: number;
  wonder: number;
}

Yoğun sahnelerden önce veya sonra bu rezerv kullanılabilir.

70. Safety Validation Pipeline
1. Çocuk ve ebeveyn profili yüklenir
2. Zorunlu güvenlik kuralları uygulanır
3. Sahne risk kategorileri çıkarılır
4. Intensity Vector hesaplanır
5. Gelişim uygunluğu değerlendirilir
6. Parent Policy ile karşılaştırılır
7. Safety Envelope oluşturulur
8. Gerekirse sahne dönüştürülür
9. Narrative Generation yapılır
10. Metin sonrası güvenlik taraması yapılır
11. Görsel ve ses güvenliği doğrulanır
12. Playback öncesi son kontrol yapılır
13. Oturum sonrası yalnızca gerekli güvenlik sinyalleri kaydedilir
71. Örnek değerlendirme
Planlanan sahne
Lila karanlık mağarada tek başına kalır.
Arkadaşları uzun süre geri dönmez.
İçeriden tehditkâr sesler gelir.
Risk analizi
{
  "fear": 0.75,
  "helplessness": 0.85,
  "isolation": 0.90,
  "unpredictability": 0.80,
  "permanence": 0.40
}
Karar
TRANSFORM
Yeni sahne
Lila mağara girişinde bekler.
Tilki birkaç adım ileride yolu kontrol eder.
Lila’nın elindeki fener mağaranın duvarlarını aydınlatır.
Uzakta duyulan sesin damlayan sudan geldiği anlaşılır.

Anlatısal amaç korunur:

mağara keşfi,
hafif belirsizlik,
cesaret.

Ama:

yalnızlık,
çaresizlik,
ağır korku

azaltılır.

72. Örnek ebeveyn politikası uygulaması

Ebeveyn ayarları:

Karanlık içerik: hafif
Hayvan yaralanması: izinli, grafik olmayan
Ayrılık: kaçın
Bedtime mode: açık

Planner sonucu:

Mağara olabilir ama loş ve güvenli olmalı.
Tilki yaralı olabilir fakat iyileşme açık olmalı.
Lila ve tilki ayrılmamalı.
Hikâye sıcak, güvenli bir yerde bitmeli.
Cliffhanger kullanılmamalı.
73. Önerilen servisler
ContentSafetyPolicyService
DevelopmentalAppropriatenessService
ParentPolicyService
ChildSafetyProfileService
SceneSafetyEnvelopeBuilder
IntensityBudgetManager
CumulativeEmotionalLoadManager
SafetyTransformationService
ChoiceSafetyValidator
FailureSafetyValidator
VisualSafetyValidator
AudioSafetyValidator
ChildInputPrivacyFilter
ParentPreviewBuilder
ParentGuidanceTriggerService
SafetyAuditService
PolicyConflictResolver
74. Motor sınırları

Bu motor:

hikâyeyi doğrudan yazmaz,
karakter kararı vermez,
dünya state’ini değiştirmez,
psikolojik teşhis koymaz.

Bu motor:

sınır belirler,
risk değerlendirir,
dönüşüm ister,
recovery zorunluluğu ekler,
ebeveyn tercihini uygular,
çocuk girdisini korur.
75. Sabit prensipler
Güvenlik yalnızca sonradan filtreleme değildir.
Yaşa uygunluk ile içerik güvenliği ayrı değerlendirilir.
Ebeveyn tercihleri temel güvenlik sınırlarını geçersiz kılamaz.
Risk tek puanla değil vektörle izlenir.
Yoğunluk kadar süre ve tekrar sıklığı da önemlidir.
Her yüksek yoğunluk sonrası recovery gerekebilir.
Çocuğun çaresizliği sınırlandırılmalıdır.
Seçimler ahlaki baskı veya utanç üretmemelidir.
Başarısızlık yeniden deneme veya yardım yolu sunmalıdır.
Çocuk davranışları psikolojik teşhise dönüştürülmemelidir.
Kişisel veriler hikâyeye veya hafızaya izinsiz eklenmemelidir.
Metin, görsel, ses ve etkileşim ayrı ayrı doğrulanmalıdır.
Uyku öncesi modu ayrı bir güvenlik profiline sahip olmalıdır.
Kabul edebileceğimiz karar seti
Content Safety Engine aktif bir planlama katmanıdır.
Child Safety Profile ve Parent Preference Profile ayrı tutulur.
Zorunlu güvenlik kuralları ebeveyn tarafından kapatılamaz.
Her sahne için Scene Safety Envelope oluşturulur.
Risk, Intensity ve Developmental Appropriateness vektörleri kullanılır.
Riskli içerik mümkünse Block yerine Transform edilir.
Recovery Beat ve Safety Signal gereksinimleri sahne sözleşmesine eklenir.
Choice, Failure, Visual, Audio ve Child Input güvenliği ayrı doğrulanır.
Bedtime Mode özel yoğunluk ve kapanış politikaları uygular.
Çocuk davranışlarından teşhis veya kalıcı kişilik etiketi üretilmez.