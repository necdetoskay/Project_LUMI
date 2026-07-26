Child Profile & Personalization Engine

Bu motor, LUMI’nin her çocuk için aynı evrenden farklı ama tutarlı bir deneyim üretmesini sağlar.

Temel amaç:

Aynı dünya
+
aynı karakterler
+
çocuğa uygun farklı anlatım ve etkileşim

Kişiselleştirme şu alanları etkileyebilir:

hikâye uzunluğu,
cümle zorluğu,
seçim sayısı,
gerilim seviyesi,
sevilen karakterlerin görünme sıklığı,
tercih edilen hikâye türleri,
eğitim hedefleri,
görsel yoğunluk,
soru-cevap biçimi,
yardım düzeyi.

Ama şu alanları keyfî biçimde değiştiremez:

dünya gerçeği,
NPC kişiliği,
geçmiş olaylar,
kanonik ilişkiler,
görev ön koşulları,
oyuncunun önceki seçimleri.

Temel ilke:

Kişiselleştirme, evreni çocuğa uyarlar; evrenin gerçeklerini çocuğa göre yeniden yazmaz.

1. Sistemdeki yeri
Child Profile
↓
Parent Settings
↓
Personalization Engine
↓
Story Planner
↓
Story Context Builder
↓
Narrative Engine
↓
Presentation Layer

Bu motor tek başına hikâye üretmez.

Diğer motorlara şu tür talimatlar verir:

Bu çocuk için:
- 3 seçenek kullan.
- Gerilimi düşük tut.
- Daha kısa cümleler yaz.
- Tilki’yi destek karakter olarak kullan.
- Sayma hedefini doğal biçimde ekle.
- Hikâye sonunda yalnızca 1 soru sor.
2. Çocuk profili veri modeli
type ChildProfile = {
  id: string
  familyAccountId: string

  displayName: string
  birthDate?: string
  ageBand: AgeBand

  primaryLanguage: string
  secondaryLanguages: string[]

  readingProfile: ReadingProfile
  interactionProfile: InteractionProfile
  preferenceProfile: PreferenceProfile
  safetyProfile: ChildSafetyProfile
  learningProfile?: LearningProfile

  createdAt: number
  updatedAt: number
}
3. Yaş bandı

Kesin yaş tek başına yeterli değildir.

type AgeBand =
  | "3_4"
  | "4_5"
  | "6_7"
  | "8_10"
  | "11_plus"

Çünkü aynı yaştaki iki çocuk:

farklı okuma seviyesinde,
farklı dikkat süresinde,
farklı gerilim toleransında,
farklı seçim becerisinde

olabilir.

Bu nedenle yaş yalnızca başlangıç sinyalidir.

4. Okuma profili
type ReadingProfile = {
  readingMode:
    | "read_aloud"
    | "shared_reading"
    | "independent_reading"

  vocabularyLevel:
    | "very_simple"
    | "simple"
    | "developing"
    | "advanced"

  preferredSentenceLength: number
  preferredParagraphLength: number

  targetStoryWords: number
  maximumStoryWords: number

  dialoguePreference: number
  repetitionSupport: number
}
5. Okuma modu
Read aloud

Ebeveyn veya TTS hikâyeyi okur.

Öncelikler:

ritmik dil,
doğal konuşma,
sesli okumaya uygun cümleler,
daha fazla diyalog,
ses efektleri.
Shared reading

Ebeveyn ve çocuk birlikte okur.

Öncelikler:

kısa paragraflar,
görsel destek,
birlikte cevaplanabilecek sorular,
tekrar eden anahtar kelimeler.
Independent reading

Çocuk kendi okur.

Öncelikler:

daha açık cümle yapısı,
zor kelimelerin sınırlanması,
paragraf uzunluğunun azaltılması,
gerekirse kelime açıklamaları.
6. Etkileşim profili
type InteractionProfile = {
  preferredChoiceCount: number
  choiceComplexity:
    | "binary"
    | "simple_multi"
    | "strategic"

  freeformInputEnabled: boolean
  freeformSupportLevel:
    | "guided"
    | "assisted"
    | "open"

  hintPreference:
    | "never"
    | "on_request"
    | "after_difficulty"
    | "frequent"

  reflectionQuestionCount: number
  interactionFrequency: number
}
7. Seçim karmaşıklığı
Binary
1. İçeri girelim
2. Önce bekleyelim

Küçük yaş için uygundur.

Simple multi
1. Baykuşa sor
2. Haritaya bak
3. Denizciyi çağır
Strategic

Seçenekler kaynak, ilişki veya risk farkı içerir.

1. Hızlı ama riskli yol
2. Güvenli ama uzun yol
3. Bir karakterden yardım istemek
8. Tercih profili
type PreferenceProfile = {
  storyGenres: Record<StoryGenre, number>
  themes: Record<StoryTheme, number>

  characterAffinities: Record<string, number>
  locationAffinities: Record<string, number>

  preferredTone: string[]
  avoidedTone: string[]

  preferredActivities: {
    exploration: number
    dialogue: number
    puzzle: number
    crafting: number
    helping: number
    collecting: number
    mapUse: number
  }
}

Değerler örneğin 0–1 aralığında tutulabilir.

9. Açık tercih ve öğrenilen tercih

Tercihler iki kaynaktan gelir:

Explicit Preference
Observed Preference
Explicit

Ebeveyn veya çocuk seçer:

- Ejderhaları seviyorum.
- Korkutucu hikâye istemiyorum.
- Harita keşfetmeyi seviyorum.
Observed

Sistem davranışlardan çıkarır:

- Sürekli keşif seçeneklerini seçiyor.
- Diyalog sahnelerini yarım bırakıyor.
- Tilki olan hikâyelere daha sık dönüyor.

Açık tercih, gözlemlenen tercihten daha yüksek otoriteye sahip olmalıdır.

10. Tercih kanıtı
type PreferenceEvidence = {
  id: string
  childProfileId: string

  category: string
  targetId: string

  evidenceType:
    | "explicit_like"
    | "explicit_dislike"
    | "choice_selected"
    | "story_completed"
    | "story_abandoned"
    | "positive_feedback"
    | "negative_feedback"

  weight: number
  createdAt: number
}
11. Tercihlerin yavaş güncellenmesi

Tek bir seçim kalıcı tercih oluşturmamalıdır.

Örnek:

Bir kez mağara seçti.

Bu:

Mağara hikâyelerini çok seviyor.

anlamına gelmez.

Önerilen güncelleme:

New Preference =
Old Preference × Stability
+
New Evidence × Evidence Weight

Tercihler zamanla yumuşak biçimde değişmelidir.

12. Tercih çürümesi

Uzun süre gösterilmeyen tercihler tamamen kaybolmamalıdır.

Ama eski ilgi alanlarının ağırlığı yavaşça azalabilir.

type PreferenceDecayConfig = {
  decayEnabled: boolean
  decayRatePerMonth: number
  minimumRetainedWeight: number
}

Açıkça seçilen güçlü tercihler daha yavaş azalmalıdır.

13. Filtre balonu riski

Çocuk yalnızca sevdiği içerikleri görürse deneyim daralabilir.

Örnek:

Sürekli ejderha
Sürekli gizem
Sürekli Tilki

Bu nedenle kişiselleştirme:

Preference
+
Variety
+
Developmental exploration

dengesi kullanmalıdır.

Öneri:

%60 güçlü tercihler
%25 yakın ilgi alanları
%15 kontrollü yenilik

Bu oranlar sabit değil, test edilebilir başlangıç değerleridir.

14. Yenilik bütçesi
type PersonalizationExplorationBudget = {
  familiarContentRatio: number
  adjacentContentRatio: number
  novelContentRatio: number

  maxNovelElementsPerStory: number
}

Küçük yaşta yenilik oranı daha düşük tutulabilir.

15. Sevilen karakterler

Sevilen karakterler daha sık kullanılabilir.

Ama şu sorunlardan kaçınılmalıdır:

her hikâyede aynı karakter,
diğer karakterlerin unutulması,
dünya mantığına aykırı şekilde karakterin her yerde görünmesi,
tüm sorunları sevilen karakterin çözmesi.
type CharacterAffinity = {
  characterId: string
  affinityScore: number
  explicitFavorite: boolean
  recentAppearanceCount: number
  cooldownScenes: number
}
16. Karakter görünme puanı
Appearance Score =
Story Relevance
+ Character Affinity
+ Arc Opportunity
+ Skill Relevance
+ Recent Absence Bonus
− Overuse Penalty
− Spatial Infeasibility

Kişisel sevgi, dünya uygunluğunu geçersiz kılamaz.

17. Tercih ve NPC kişiliği ayrımı

Çocuk bir karakteri seviyor diye o karakter her zaman çocuğun istediğini yapmamalıdır.

Örnek:

Çocuk Tilki’yi çok seviyor.

Bu nedenle Tilki:

daha sık görünebilir,
daha fazla ilişki sahnesi alabilir,
callback’lerde kullanılabilir.

Ama Tilki:

kendi korkularını unutmaz,
kişiliğini değiştirmez,
her isteğe evet demez,
bilmediği şeyi bilmez.

Bu ayrım yaşayan karakter hissi için kritiktir.

18. Kişiselleştirme katmanları
type PersonalizationLayer =
  | "presentation"
  | "narrative_style"
  | "interaction"
  | "content_selection"
  | "learning"
  | "safety"
  | "story_pacing"
Presentation
font büyüklüğü,
sayfa yoğunluğu,
görsel sayısı,
sesli okuma.
Narrative style
cümle uzunluğu,
mizah,
betimleme yoğunluğu.
Interaction
seçim sayısı,
ipucu düzeyi,
serbest metin desteği.
Content selection
tür,
tema,
karakter,
mekân.
Learning
sayma,
kelime,
empati,
problem çözme.
Safety
gerilim,
üzüntü,
yalnızlık,
çatışma sınırı.
Story pacing
sahne uzunluğu,
seçim sıklığı,
toplam hikâye süresi.
19. Kişiselleştirme yetki matrisi
type PersonalizationAuthority = {
  field: string

  mayInfluence: boolean
  mayOverride: boolean
  maximumImpact: number
}

Örnek:

Narrative sentence length:
mayOverride = true

Story genre selection:
mayInfluence = true

World fact:
mayOverride = false

NPC core personality:
mayOverride = false

Character appearance frequency:
mayInfluence = true

Canonical quest outcome:
mayOverride = false
20. Güvenlik profili
type ChildSafetyProfile = {
  maximumTension: number
  maximumFearDurationScenes: number

  allowMildSadness: boolean
  allowSeparationThemes: boolean
  allowMildConflict: boolean
  allowFantasyDanger: boolean

  requireSafeAdultPresence: boolean
  requirePositiveRecoverySignal: boolean

  blockedThemes: string[]
  sensitiveTopics: string[]
}

Bu profil ebeveyn ayarlarından ve yaş varsayımlarından oluşur.

21. Güvenlik profili ile hikâye sonucu ayrımı

Güvenlik ayarı olayları keyfî biçimde yok etmemelidir.

Örneğin dünya gerçeğinde:

Tilki hafif yaralı.

Çocuk profili yaralanma detaylarını istemiyorsa:

yaralanma kanonik olarak kalır,
anlatım daha yumuşak olur,
görselde ayrıntı gösterilmez,
hikâye bakım ve iyileşmeye odaklanır.

Yanlış yaklaşım:

Profil nedeniyle Tilki aslında yaralı değilmiş.
22. Gerilim adaptasyonu
type TensionAdaptation = {
  baseAgeLimit: number
  parentLimit: number
  observedTolerance: number

  effectiveLimit: number
}

Etkili sınır:

Minimum(
Yaş sınırı,
Ebeveyn sınırı,
Uyarlanmış tolerans
)

Sistem gözlemlenen toleransa göre ebeveyn sınırını aşamaz.

23. Gözlemlenen gerilim toleransı

Sinyaller:

hikâyeyi yarıda bırakma,
“korktum” geri bildirimi,
aynı sahneyi tekrar açmama,
korkulu seçeneklerden sürekli kaçınma,
ebeveyn geri bildirimi.

Ancak sistem çocuğun duygusunu kesin teşhis etmemelidir.

Doğru ifade:

Bu çocuk düşük gerilimli sahneleri daha sık tamamlıyor.

Yanlış çıkarım:

Bu çocuk kaygılıdır.
24. Duygusal hassasiyet

Bazı çocuklar belirli temalara karşı hassas olabilir:

kaybolma,
yalnız kalma,
ebeveynden ayrılma,
hayvan yaralanması,
karanlık,
yüksek ses,
tartışma.

Bu bilgiler yalnızca ebeveyn açıkça belirttiğinde veya doğrudan güvenlik ayarı olarak seçildiğinde kullanılmalıdır.

type ContentSensitivity = {
  topic: string
  handling:
    | "block"
    | "avoid"
    | "soften"
    | "allow_with_recovery"
}
25. Parent Settings ile Child Profile ayrımı
Child Profile:
Çocuğun deneyim özellikleri.

Parent Settings:
Ebeveynin sınırları ve tercihleri.

Örnek:

Child Profile:
Gizem hikâyelerini seviyor.

Parent Settings:
Karanlık mağara teması kapalı.

Sonuç:

Gizem kullanılabilir,
ama karanlık mağara yerine gündüz geçen eski değirmen gizemi seçilir.
26. Ebeveyn ayar modeli
type ParentSettings = {
  childProfileId: string

  contentControls: ParentContentControls
  learningControls: ParentLearningControls
  mediaControls: ParentMediaControls
  privacyControls: ParentPrivacyControls
  spendingControls?: ParentSpendingControls
}
27. İçerik kontrolleri
type ParentContentControls = {
  maximumStoryLength: string
  maximumTension: number

  allowMagic: boolean
  allowFantasyCreatures: boolean
  allowMildConflict: boolean
  allowSadThemes: boolean

  blockedThemes: string[]
  requiredThemes?: string[]

  freeformInputEnabled: boolean
}
28. Öğrenme profili
type LearningProfile = {
  enabled: boolean

  activeGoals: LearningGoal[]
  preferredLearningStyle: string[]

  maximumLearningElementsPerStory: number
  reviewFrequency: number
}
type LearningGoal = {
  id: string
  category:
    | "language"
    | "math"
    | "nature"
    | "emotion"
    | "social"
    | "problem_solving"
    | "memory"

  targetSkill: string
  currentLevel: number
  targetLevel: number

  priority: number
  status:
    | "active"
    | "paused"
    | "completed"
}
29. Öğrenme içeriğinin sınırı

Hikâye eğitim uygulamasına dönüşmemelidir.

Önerilen kural:

Bir hikâyede:
1 ana öğrenme hedefi
+
isteğe bağlı 1 küçük tekrar

Örnek:

Ana hedef:
1’den 5’e kadar sayma.

Doğal kullanım:
Köprüyü güçlendirmek için beş tahta saymak.
30. Öğrenme zorluğu
type LearningDifficulty = {
  challengeLevel: number
  assistanceLevel: number
  repetitionLevel: number
}

Zorluk:

Çok kolay
→ sıkıcı

Çok zor
→ hikâyeyi böler

Biraz destekle yapılabilir
→ uygun

Yaklaşım:

Current Skill
+
Small Challenge
+
Optional Support
31. Yardım sistemi

Çocuk bir soruda zorlanırsa sistem doğrudan cevabı vermek zorunda değildir.

Yardım seviyeleri:

1. Hatırlatıcı ipucu
2. Seçenekleri daraltma
3. Görsel ipucu
4. Karakter yardımı
5. Açıklamalı cevap

Örnek:

Soru:

Köprü için kaç tahta gerekiyor?

Karakter yardımı:

Tilki tahtaları birer birer gösterdi. “İstersen birlikte sayabiliriz,” dedi.

32. Yardımın kişilikle birleşmesi

Yardım doğrudan sistem mesajı olmak zorunda değildir.

Karakter üzerinden sunulabilir.

Baykuş:
düşündürür.

Tilki:
birlikte yapmayı önerir.

Denizci:
küçük bir ipucu verir.

Ancak karakterin sahip olmadığı bilgi yardıma dönüşmemelidir.

33. Başarı kaydı

Öğrenme başarısı hikâye olaylarından ayrı tutulmalıdır.

type LearningEvidence = {
  childProfileId: string
  learningGoalId: string

  activityType: string
  difficulty: number
  supportUsed: number
  result:
    | "independent_success"
    | "assisted_success"
    | "attempted"
    | "skipped"

  storyId: string
  sceneId: string
  createdAt: number
}
34. Notlandırma yerine gelişim sinyali

Küçük çocuklar için puanlama dikkatli kullanılmalıdır.

Öneri:

Doğru / yanlış

yerine:

denedin,
birlikte çözdünüz,
yeni bir yöntem buldun,
hatırladın,
dikkat ettin.

Hikâye çocuğu sınav performansıyla etiketlememelidir.

35. Rozetler

Rozetler kalıcı gelişim veya katılım için kullanılabilir.

Örnek:

Dikkatli Gözlemci
İyi Dinleyici
Yardımsever Arkadaş
Cesur Kaşif
Sabırlı Çözücü

Ama rozetler:

ahlaki üstünlük,
diğer çocuklarla kıyaslama,
yoğun puan baskısı

yaratmamalıdır.

36. Rozet doğrulaması

Rozet yalnızca anlatı metnine göre verilmemelidir.

Canonical Events
+
Player Choices
+
Learning Evidence

üzerinden verilmelidir.

Örnek:

Lumi yardım etti.

olayı gerçekten oyuncu seçimiyle gerçekleştiyse yardım rozeti ilerleyebilir.

37. Hikâye uzunluğu adaptasyonu

Sistem şu sinyalleri gözlemleyebilir:

hikâyelerin tamamlanma oranı,
hangi sahnede bırakıldığı,
devam etme sıklığı,
ebeveyn geri bildirimi,
“daha kısa” tercihi.
type StoryLengthAdaptation = {
  targetSceneWords: number
  targetSceneCount: number

  completionRate: number
  recentAbandonmentRate: number

  adjustmentDirection:
    | "shorten"
    | "keep"
    | "lengthen"
}
38. Uzunluk değişimi yavaş olmalı

Bir hikâye yarıda bırakıldı diye sistem hemen bütün hikâyeleri yarıya indirmemelidir.

3–5 benzer sinyal
→ küçük ayarlama

Ayrıca bırakma nedeni uzunluk olmayabilir:

uygulama kapandı,
çocuk başka şeye geçti,
internet kesildi,
ebeveyn zamanı bitti.

Bu nedenle davranış sinyalleri düşük güvenle değerlendirilmelidir.

39. Seçim sıklığı adaptasyonu

Bazı çocuklar sık seçim sever.

Bazıları uzun süre dinlemeyi tercih eder.

type ChoiceFrequencyProfile = {
  targetScenesBetweenChoices: number
  majorChoicePreference: number
  minorChoicePreference: number
}

Ama Story Planner’ın anlatı gereksinimi daha üst otorite olabilir.

Örneğin climax sonucunu göstermeden hemen yeni seçim sunulmamalıdır.

40. Serbest metin desteği

Serbest metin üç seviyede olabilir.

Guided

Çocuk cümleyi tamamlar:

“Lumi önce ______ yapsın.”
Assisted

Çocuk serbestçe yazar ama sistem öneriler sunar.

Open

Tam serbest giriş.

Küçük yaşta sesli giriş kullanılabilir fakat niyet yorumlaması dikkatli olmalıdır.

41. Serbest metin başarısızlığında davranış

Sistem çocuğun isteğini anlayamazsa teknik hata vermemelidir.

Örnek:

Lumi bunu tam anlayamadı. İstersen şunlardan birini deneyebiliriz:

Ardından yakın niyetler sunulabilir.

Ancak çocuğun ifadesi gereksiz yere düzeltilmemeli veya alay konusu yapılmamalıdır.

42. İsim kullanımı

Çocuğun adı hikâyede kullanılabilir.

Ama aşırı kullanım yapay hissettirir.

type NameUsageProfile = {
  useChildNameInNarration: boolean
  useChildNameInDialogue: boolean
  maximumUsesPerScene: number
}

Ayrıca ebeveyn takma ad tercih edebilir.

43. Çocuğun hikâyedeki rolü
type PlayerRepresentation =
  | "named_avatar"
  | "second_person"
  | "custom_character"
  | "observer"
Named avatar
Lumi kapıya yaklaştı.
Second person
Kapıya yaklaştığında bir ses duydun.
Custom character

Çocuk kendi karakterini oluşturur.

Observer

Çocuk karakterleri yönlendirir ama hikâyede fiziksel olarak yer almaz.

44. Profil ve karakter ayrımı

Çocuğun gerçek profili ile hikâye karakteri aynı şey değildir.

Child Profile:
Gerçek kullanıcı tercihleri.

Player Character:
Evren içindeki kurmaca karakter.

Bu ayrım:

mahremiyet,
çoklu karakter kullanımı,
kardeş profilleri,
rol yapma

için önemlidir.

45. Çoklu çocuk profili

Aynı aile hesabında birden fazla çocuk bulunabilir.

type FamilyAccount = {
  id: string
  parentUserIds: string[]
  childProfileIds: string[]
}

Her çocuk için ayrı tutulması gerekenler:

tercihler,
okuma seviyesi,
envanter,
hikâye geçmişi,
karakter ilişkileri,
öğrenme hedefleri.
46. Ortak evren mi ayrı evren mi?

İki seçenek desteklenebilir:

Separate Universe
Shared Family Universe
Separate Universe

Her çocuğun kendi dünyası vardır.

En basit ve güvenli modeldir.

Shared Family Universe

Kardeşlerin karakterleri aynı dünyada yaşayabilir.

Daha zengin ama daha karmaşıktır.

47. Paylaşılan evren riskleri
bir çocuğun seçimi diğerinin hikâyesini değiştirebilir,
envanter çakışabilir,
gizli bilgiler açığa çıkabilir,
ilerleme seviyesi farklı olabilir,
bir çocuk diğerinin görevini tamamlayabilir.

Bu nedenle varsayılan:

Her çocuk için ayrı evren

olmalıdır.

Paylaşılan macera ayrı ve açık bir mod olarak tasarlanabilir.

48. Ortak hikâye modu
type GroupStoryProfile = {
  participantProfileIds: string[]

  sharedControlMode:
    | "turn_based"
    | "parent_moderated"
    | "consensus"

  readingLevelPolicy:
    | "youngest"
    | "average"
    | "parent_selected"

  safetyPolicy:
    | "strictest_profile"
}

Güvenlikte en sıkı profil uygulanmalıdır.

49. Yaşa göre rol dağılımı

Kardeşlerden biri daha küçükse seçimler ortak ama roller farklı olabilir.

Örnek:

Küçük çocuk:
Renk veya nesne seçer.

Büyük çocuk:
Yöntem veya strateji seçer.

Ancak hiçbir çocuk sürekli ikincil role itilmemelidir.

50. Günlük kullanım adaptasyonu

Sistem günün bağlamına göre deneyimi değiştirebilir.

Örnek modlar:

Quick Story
Bedtime Story
Normal Adventure
Shared Family Story

Ama otomatik olarak günün saatine göre varsayım yapmak yerine kullanıcı veya ebeveyn seçimi tercih edilmelidir.

51. Uyku hikâyesi profili
type BedtimeProfile = {
  enabled: boolean

  maximumTension: number
  slowerPacing: boolean
  softEndingRequired: boolean

  avoidCliffhanger: boolean
  avoidLoudAudio: boolean
  maximumChoiceCount: number
}

Uyku hikâyesinde:

gerilim azalır,
tempo yavaşlar,
aktif görev kapanmak zorunda değildir,
sahne güvenli duraklama noktasına gelir.
52. Kısa hikâye modu
3–5 dakikalık hikâye

için:

tek ana amaç,
bir küçük seçim,
kısa sonuç,
yeni büyük arc açmama

kuralı uygulanabilir.

Kısa mod, ana evren geçmişini yine kullanabilir.

53. İletişim stili
type CommunicationStyle = {
  narrationWarmth: number
  humorLevel: number
  directness: number

  emotionLabelingLevel: number
  encouragementLevel: number
}

Aşırı övgüden kaçınılmalıdır.

Zayıf:

Harika! Mükemmel! Muhteşem bir seçim yaptın!

Daha doğal:

Bu dikkatli bir seçimdi. Tilki de aynı şeyi fark etmiş gibiydi.

Her seçim “doğru” ilan edilmemelidir.

54. Çocuğun kararlarına saygı

Kişiselleştirme sistemi çocuğu tercih edilen yola zorlamamalıdır.

Örnek:

Sistem keşif hikâyelerini sevdiğini biliyor.

Ama çocuk:

Köye dönelim.

derse hikâye zorla keşfe devam etmemelidir.

Tercihler öneri sinyalidir, kontrol değildir.

55. Karar geçmişinden kişilik çıkarma riski

Çocuğun hikâye seçimlerinden gerçek kişilik etiketi çıkarılmamalıdır.

Yanlış:

Sürekli güvenli yolu seçti.
→ Çocuk cesaretsiz.

Doğru:

Son hikâyelerde düşük riskli seçenekleri daha sık seçti.

Sistem yalnızca deneyim kişiselleştirmesi için davranış eğilimi tutmalıdır.

56. Profil açıklanabilirliği

Ebeveyn şu sorulara cevap bulabilmelidir:

Neden bu hikâye seçildi?
Neden gerilim düşük tutuldu?
Neden Tilki daha sık görünüyor?
Neden hikâye kısaldı?

Örnek açıklama:

Bu hikâye keşif türünde seçildi çünkü son dönemde harita ve keşif etkinlikleri daha sık tercih edildi.

Ancak çocuğa karmaşık analizler gösterilmemelidir.

57. Profil güven seviyesi

Her öğrenilmiş tercih bir güven seviyesi taşımalıdır.

type InferredPreference = {
  target: string
  score: number
  confidence: number

  evidenceCount: number
  lastEvidenceAt: number
}

Düşük güvenli tercih:

yalnızca hafif bias oluşturur.

Yüksek güvenli tercih:

daha güçlü içerik seçimi etkisi yaratabilir.
58. Soğuk başlangıç

Yeni çocuk profili için veri yoktur.

Başlangıçta:

yaş bandı,
ebeveyn ayarları,
seçilen birkaç ilgi alanı,
varsayılan dengeli profil

kullanılır.

type OnboardingPreference = {
  favoriteCharacterTypes: string[]
  favoriteStoryTypes: string[]
  dislikedThemes: string[]
  preferredStoryLength: string
}

Onboarding kısa tutulmalıdır.

59. Onboarding soruları

Örnek:

En çok hangisini seversin?
- Hayvanlar
- Keşif
- Ejderhalar
- Bulmacalar
Hikâyeler nasıl olsun?
- Kısa
- Orta
- Uzun
Biraz heyecanlı olabilir mi?
- Çok sakin
- Biraz heyecanlı
- Maceralı

Ebeveyn güvenlik ayarları ayrı ekranda tutulmalıdır.

60. Varsayılan profil

Veri yoksa güvenli varsayılan:

- yaşa uygun orta-alt zorluk,
- düşük gerilim,
- 2–3 seçenek,
- kısa-orta hikâye,
- tanıdık karakter ağırlığı,
- sınırlı yeni unsur,
- tek öğrenme hedefi veya hiçbiri,
- yumuşak kapanış.
61. Profil güncelleme olayları
type PersonalizationEvent =
  | "STORY_STARTED"
  | "STORY_COMPLETED"
  | "STORY_ABANDONED"
  | "CHOICE_SELECTED"
  | "FREEFORM_ACTION_USED"
  | "CHARACTER_FAVORITED"
  | "PARENT_SETTING_CHANGED"
  | "FEEDBACK_SUBMITTED"
  | "LEARNING_ACTIVITY_COMPLETED"

Personalization Engine bu olayları dinler.

62. Profil güncelleme sırası
Canonical User Interaction
↓
Evidence Creation
↓
Confidence Update
↓
Slow Preference Adjustment
↓
Profile Version

Profil, doğal hikâye metninden tahmin edilmemelidir.

63. Profil sürümleme
type ChildProfileVersion = {
  version: number
  childProfileId: string

  changedFields: string[]
  changeSource:
    | "parent"
    | "child"
    | "observed_behavior"
    | "system_default"

  createdAt: number
}

Ebeveyn değişiklikleri ayrıca kaydedilmelidir.

64. Kişiselleştirme snapshot’ı

Her hikâye başında kullanılan profil dondurulabilir.

type PersonalizationSnapshot = {
  id: string
  childProfileVersion: number
  parentSettingsVersion: number

  effectiveAgeProfile: string
  effectiveSafetyLimits: unknown
  effectiveStoryPreferences: unknown
  effectiveNarrativeSettings: unknown
}

Hikâye ortasında profil değişirse mevcut sahne bozulmamalıdır.

Yeni ayarlar sonraki sahnede veya güvenli geçişte uygulanabilir.

65. Etkin profil hesaplama
Base Age Profile
+
Child Explicit Preferences
+
Parent Constraints
+
High-confidence Observed Preferences
+
Current Story Mode
=
Effective Personalization Profile

Ebeveyn güvenlik sınırı en yüksek otoritedir.

66. Çakışma çözümü

Örnek:

Çocuk:
Daha korkutucu hikâye istiyor.

Ebeveyn:
Gerilim seviyesi düşük.

Sonuç:

Gerilim ebeveyn sınırını aşmaz.
Merak ve gizem artırılabilir ama korku artırılmaz.

Başka örnek:

Çocuk uzun hikâye seviyor.
Gece modu kısa hikâye istiyor.

Sonuç:

Bu oturum kısa veya bölümlü anlatılır.
Uzun arc daha sonra devam eder.
67. Kişiselleştirme karar modeli
type PersonalizationDecision = {
  category: string
  selectedValue: unknown

  sourceFactors: {
    source: string
    weight: number
  }[]

  blockedBy?: string[]
  confidence: number
}

Bu, sistemin neden belirli bir tercih uyguladığını açıklanabilir kılar.

68. Story Planner’a etkisi

Personalization Engine Story Planner’a şu çıktıları verir:

type PlannerPersonalizationGuidance = {
  preferredGenres: StoryGenre[]
  preferredThemes: StoryTheme[]

  preferredCharacterIds: string[]
  preferredActivityTypes: string[]

  targetSceneCount: number
  maximumOpenThreads: number
  maximumNewElements: number

  choiceCount: number
  choiceComplexity: string

  maximumTension: number
  learningGoalIds: string[]
}
69. Narrative Engine’e etkisi
type NarrativePersonalizationGuidance = {
  language: string
  vocabularyLevel: string

  targetSentenceLength: number
  targetParagraphLength: number
  targetWordCount: number

  dialogueDensity: number
  humorLevel: number
  descriptionDensity: number

  emotionExplanationLevel: number
  repetitionSupport: number
}
70. Presentation Layer’a etkisi
type PresentationProfile = {
  fontScale: number
  textPerPage: number

  imageFrequency: number
  animationLevel: number

  audioEnabled: boolean
  autoReadEnabled: boolean

  showChoicesAs:
    | "text"
    | "image_cards"
    | "voice"

  accessibilitySettings: unknown
}
71. Erişilebilirlik

Kişiselleştirme motoru erişilebilirlik ayarlarıyla entegre olmalıdır.

Örnek:

büyük yazı,
yüksek kontrast,
az animasyon,
daha yavaş TTS,
seçenekleri sesli okuma,
ikonlu seçimler,
motor beceri için büyük düğmeler.

Bu ayarlar tercih değil, kullanılabilirlik gereksinimi olabilir ve daha yüksek öncelik taşımalıdır.

72. Dil kişiselleştirmesi

Bir çocuk iki dil öğreniyor olabilir.

Modlar:

Primary language only
Occasional vocabulary
Bilingual support
Full target language

Örnek hafif İngilizce desteği:

Tilki küçük kırmızı taşı gösterdi. “Red,” dedi Baykuş. “Kırmızı.”

Ama bu kullanım:

ebeveyn ayarına,
öğrenme hedefine,
çocuğun seviyesine

bağlı olmalıdır.

73. Kod değiştirme yerine kavram eşleştirme

Diller veritabanındaki kanonik gerçekleri değiştirmemelidir.

{
  conceptId: "red_color",
  localizedLabels: {
    tr: "kırmızı",
    en: "red"
  }
}

Narrative Engine hedef dile göre ifade üretir.

74. Kültürel kişiselleştirme

Hikâyelerde:

isimler,
yemekler,
kutlamalar,
günlük yaşam unsurları

yerelleştirilebilir.

Ancak sistem kültürel kimlik hakkında otomatik hassas çıkarımlar yapmamalıdır.

Kültürel tercihler ebeveyn veya kullanıcı tarafından açıkça seçilmelidir.

75. Görsel kişiselleştirme

Çocuk:

belirli renkleri,
karakter türlerini,
görsel yoğunluğu

tercih edebilir.

Ancak kanonik karakter görünümü keyfî değişmemelidir.

Örnek:

Tilki turuncu ve beyazdır.

Çocuk mavi seviyor diye Tilki her hikâyede mavi olmamalıdır.

Mavi şu alanlarda kullanılabilir:

aksesuar,
arayüz,
dekoratif unsur,
geçici eşya.
76. Karakter tutarlılığı ile kişisel aksesuar

Oyuncu karakteri için özelleştirme daha geniş olabilir.

type AvatarCustomization = {
  hairStyle?: string
  outfitId?: string
  accessoryIds: string[]
  colorPreferences: string[]
}

Bu seçimler dünya state’inde kalıcı görünüm bilgisi olur.

Narrative ve görsel motorları bunu korumalıdır.

77. Kişiselleştirilmiş envanter

Çocuğun sevdiği öğelere göre ödül türleri seçilebilir:

rozet,
harita çıkartması,
karakter aksesuarı,
küçük hikâye nesnesi.

Ama ödül:

kanonik görev sonucu ile uyumlu,
aşırı sık olmayan,
mekanik dengeyi bozmayan

bir nesne olmalıdır.

78. Oyuncu beceri modeli

Hikâye içi problem çözme için ayrı bir beceri profili tutulabilir.

type PlayerSkillModel = {
  patternRecognition: number
  counting: number
  memoryRecall: number
  languageComprehension: number
  planning: number
  emotionalRecognition: number

  confidenceBySkill: Record<string, number>
}

Bu model çocuğa etiket olarak gösterilmemelidir.

Yalnızca zorluk uyarlaması için kullanılmalıdır.

79. Zorluk adaptasyonu
Activity Difficulty =
Estimated Skill
+
Small Challenge Margin

Çocuk sürekli yardımsız çözüyorsa:

zorluk yavaşça artar.

Sürekli yardım gerekiyorsa:

ipucu artar veya görev sadeleşir.

Ama ana hikâye, öğrenme başarısızlığı nedeniyle kilitlenmemelidir.

80. Hikâye ve beceri kapısı

Yanlış yaklaşım:

Bulmacayı çözemezsen hikâye devam etmez.

Daha doğru:

Çocuk çözerse özel yol açılır.
Yardımla çözülürse ana yol devam eder.
Atlanırsa alternatif hikâye yöntemi kullanılır.

Bu da fail forward ilkesidir.

81. Kişiselleştirme ve ödül döngüsü

Sistem yalnızca çocuğu uygulamada tutmak için manipülatif ödül döngüleri kurmamalıdır.

Kaçınılması gerekenler:

sürekli geri dönme baskısı,
günlük seri kaybetme korkusu,
rastgele ödül kutuları,
karakterin “gelmezsen üzülürüm” demesi,
kaçırma korkusu.

LUMI’nin yaşayan dünya sistemi çocuk üzerinde sorumluluk baskısı yaratmamalıdır.

82. Geri dönme mesajları

Uygun:

Tilki seni yeniden gördüğüne sevindi.

Uygun olmayan:

Neden bu kadar geç kaldın? Tilki günlerdir üzgündü.

Offline simülasyon çocuk yokken dünyayı ilerletebilir ama çocuğu suçlamamalıdır.

83. Devamsızlık ve kişiselleştirme

Çocuk uzun süre gelmediyse:

hikâye özeti daha açıklayıcı olabilir,
eski karakterler kısa biçimde yeniden tanıtılabilir,
seçim karmaşıklığı geçici azaltılabilir,
son hedef hatırlatılabilir.

Ama profil kalıcı olarak “unutkan” gibi etiketlenmemelidir.

84. Recap adaptasyonu
type RecapProfile = {
  absenceHours: number
  storyComplexity: number
  childAgeBand: AgeBand

  recapLength: number
  includeCharacterReminder: boolean
  includeGoalReminder: boolean
  includeLastChoiceReminder: boolean
}
85. Kişiselleştirme sınırları

Motor şu tür değişiklikleri yapamaz:

- Sevilen NPC’nin kötü kararını silmek.
- Çocuğun sevmediği karakteri geçmişten kaldırmak.
- Zor görevi otomatik başarıya çevirmek.
- Çocuğun teorisini gerçek yapmak.
- Beğenilmeyen seçimin sonucunu yok saymak.
- Dünya kurallarını ilgi alanına göre değiştirmek.

Yapabileceği şey:

- farklı anlatım,
- alternatif görev önerisi,
- daha fazla destek,
- sonraki içerik seçiminde bias,
- uygun karakter ve tema ağırlığı.
86. Profil veri gizliliği

Çocuk profili yalnızca gerekli verileri tutmalıdır.

Kaçınılması gerekenler:

gereksiz kişisel ayrıntılar,
hassas kişilik etiketleri,
sağlık çıkarımları,
okul performansı hakkında geniş profil,
konuşmalardan ilgisiz özel bilgi çıkarımı.

Veri minimizasyonu ilkesi:

Yalnızca deneyimi gerçekten geliştiren bilgi saklanır.
87. Saklama süresi
type PersonalizationDataRetention = {
  evidenceRetentionDays: number
  aggregatedPreferenceRetention: string
  rawFreeformInputRetentionDays: number
  parentCanDelete: boolean
}

Ham davranış olayları zamanla özetlenebilir.

Örneğin:

100 ayrı seçim kaydı
↓
“Keşif seçeneklerine orta-yüksek ilgi”
88. Silme ve sıfırlama

Ebeveyn şunları yapabilmelidir:

tercihleri sıfırla,
öğrenme profilini sıfırla,
hikâye geçmişini ayrı tut,
belirli karakter tercihini kaldır,
çocuk profilini tamamen sil.

Tercihleri sıfırlamak dünya geçmişini otomatik silmemelidir.

89. Kişiselleştirme geri alma

Yanlış öğrenilmiş bir tercih varsa ebeveyn düzeltebilir.

Örnek:

Sistem çocuğun kısa hikâyeleri sevdiğini düşündü.

Ebeveyn:

Uzun hikâyeleri tercih ediyor.

olarak değiştirebilir.

Açık ebeveyn tercihi, gözlemlenen eski sinyalleri geçersiz kılar.

90. A/B test sınırları

Çocuk profillerinde deneyler dikkatli yapılmalıdır.

Test edilebilecekler:

sayfa uzunluğu,
buton düzeni,
anlatım yoğunluğu,
seçim kartı biçimi.

Dikkatli olunması gerekenler:

gerilim seviyesi,
duygusal manipülasyon,
ödül baskısı,
öğrenme etiketi,
hassas içerik.

Güvenlik kuralları hiçbir deney grubunda gevşetilmemelidir.

91. Personalization Engine çıktısı
type PersonalizationOutput = {
  snapshotId: string

  plannerGuidance: PlannerPersonalizationGuidance
  narrativeGuidance: NarrativePersonalizationGuidance
  presentationProfile: PresentationProfile

  safetyLimits: ChildSafetyProfile
  learningGuidance?: {
    activeGoalId?: string
    difficulty: number
    supportLevel: number
  }

  explanationMetadata: {
    appliedPreferences: string[]
    blockedPreferences: string[]
    parentOverrides: string[]
  }
}
92. Kişiselleştirme akışı
1. Child Profile yüklenir.
2. Parent Settings yüklenir.
3. Yaş varsayımları getirilir.
4. Açık tercihler getirilir.
5. Güven seviyesi yüksek öğrenilmiş tercihler eklenir.
6. Mevcut hikâye modu değerlendirilir.
7. Güvenlik sınırları uygulanır.
8. Çakışmalar çözülür.
9. Etkin kişiselleştirme profili oluşturulur.
10. Snapshot dondurulur.
11. Planner, Narrative ve Presentation çıktıları hazırlanır.
12. Hikâye üretiminde aynı snapshot kullanılır.
93. MVP Child Profile

İlk sürüm için şu alanlar yeterlidir:

type CoreChildProfile = {
  id: string
  displayName: string

  ageBand: AgeBand
  primaryLanguage: string

  storyLength:
    | "short"
    | "medium"
    | "long"

  vocabularyLevel:
    | "very_simple"
    | "simple"
    | "developing"

  preferredChoiceCount: 2 | 3 | 4
  maximumTension: number

  favoriteCharacterIds: string[]
  preferredGenres: StoryGenre[]
  preferredThemes: StoryTheme[]

  reflectionQuestions:
    | "off"
    | "one"
    | "standard"
}
94. MVP Parent Settings
type CoreParentSettings = {
  childProfileId: string

  maximumTension: number
  allowMildConflict: boolean
  allowSadThemes: boolean
  allowFreeformInput: boolean

  blockedThemes: string[]

  learningEnabled: boolean
  activeLearningGoalId?: string

  audioEnabled: boolean
  imageGenerationEnabled: boolean
}
95. MVP gözlemlenen tercihler

İlk sürümde yalnızca birkaç sinyal yeterlidir:

- seçilen hikâye türü,
- sevilen karakter,
- tamamlanan hikâyeler,
- açık geri bildirim,
- tercih edilen hikâye uzunluğu.

Başlangıçta şunları çıkarmaya çalışmamalıyız:

karmaşık kişilik,
duygusal durum,
gelişimsel teşhis,
ayrıntılı bilişsel profil.
96. MVP kişiselleştirme kuralları
1. Ebeveyn güvenlik ayarı en yüksek otoritedir.
2. Açık tercihler gözlemlenen tercihlerden güçlüdür.
3. Tek davranış kalıcı tercih oluşturmaz.
4. Tercihler dünya gerçeğini değiştirmez.
5. Sevilen karakterler daha sık görünür ama aşırı kullanılmaz.
6. Hikâye uzunluğu ve dil yaş profiline göre sınırlandırılır.
7. Bir hikâyede en fazla bir öğrenme hedefi kullanılır.
8. Çocuk uygulamaya dönmediği için suçlanmaz.
9. Önemli seçimler tercih puanına kurban edilmez.
10. Kişiselleştirme snapshot olarak sürümlenir.
97. Örnek etkin profil

Çocuk profili:

Yaş:
5

Sevdiği karakter:
Tilki

Sevdiği tür:
Keşif

Hikâye uzunluğu:
Orta

Seçim sayısı:
3

Gerilim:
Düşük

Öğrenme hedefi:
1’den 5’e sayma

Ebeveyn ayarları:

Karanlık mağara:
Kaçınılsın

Üzücü temalar:
Sınırlı

Serbest metin:
Açık

Etkin çıktı:

- Hikâye keşif türünde olabilir.
- Tilki ana yol arkadaşı olabilir.
- Mağara yerine açık hava veya aydınlık eski yapı kullanılmalı.
- En fazla 3 seçenek sunulmalı.
- Cümleler kısa tutulmalı.
- Gerilim düşük olmalı.
- Sayma etkinliği doğal bir görev adımına eklenmeli.
- Hikâye yaklaşık 5–7 sahne olmalı.
98. Örnek kişiselleştirilmiş sahne planı

Kanonik dünya durumu:

Köprü onarılıyor.
Beş kısa tahtaya ihtiyaç var.
Tilki yardım etmek istiyor.

Kişiselleştirme:

5 yaş
Tilki seviliyor
Sayma hedefi aktif
Düşük gerilim

Story Planner çıktısı:

- Tilki ile birlikte tahtalar aranır.
- Çocuk beş tahtayı saymaya yardım eder.
- Bir tahta yanlış yerde değil, çamurun altında bulunur.
- Başarısızlık veya ceza yoktur.
- Sahne sonunda köprünün küçük bir bölümü tamamlanır.

Narrative Engine:

Tilki tahtaları yan yana koydu.
“Kaç tane olduklarını birlikte sayalım mı?” dedi.
Bir, iki, üç, dört…
Beşinci tahta görünmüyordu.
Sonra çamurun altından küçük bir köşe çıktı.

Burada öğrenme hedefi hikâyenin içine doğal biçimde yerleşmiştir.

99. Validation kontrolleri

Personalization Output için şu kontroller yapılmalıdır:

- Ebeveyn sınırı aşılıyor mu?
- Yaş profiliyle çelişiyor mu?
- Tercih dünya gerçeğini değiştiriyor mu?
- Aynı sevilen karakter aşırı kullanılıyor mu?
- Öğrenme hedefi hikâyeyi bastırıyor mu?
- Güven seviyesi düşük çıkarım fazla etkili mi?
- Hassas içerik engeli uygulanmış mı?
- Çocuk gerçek kişiliği hakkında uygunsuz etiket üretilmiş mi?
100. Kişiselleştirme başarısızlığında fallback

Profil yüklenemezse güvenli varsayılan kullanılır:

- yaşa göre basit dil,
- düşük gerilim,
- orta-kısa hikâye,
- 2–3 seçim,
- öğrenme hedefi yok,
- dengeli karakter dağılımı,
- güvenli kapanış.

Profil hatası nedeniyle hikâye sistemi tamamen durmamalıdır.

101. İlk sürümde yapılmaması gerekenler

Başlangıçta şunlardan kaçınmalıyız:

çocuğun kişiliğini tahmin etmek,
ruh hâli teşhisi yapmak,
her tıklamadan tercih çıkarmak,
çok ayrıntılı psikometrik profil oluşturmak,
kişiselleştirmeyi gerçek dünya kimliğiyle bağlamak,
çocukları birbirleriyle karşılaştırmak,
agresif ödül sistemleri,
sürekli geri dönme baskısı,
öğrenme başarısına göre hikâyeyi kilitlemek,
ebeveynin anlayamayacağı gizli profil değişiklikleri.

MVP hedefi:

Dili uygunlaştır.
Gerilimi güvenli tut.
İlgi alanlarını dikkate al.
Çeşitliliği koru.
Dünya mantığını bozma.
102. Child Profile & Personalization Engine temel ilkeleri
1. Kişiselleştirme dünya gerçeğini değiştirmez.
2. NPC kişiliği çocuk tercihine göre keyfî biçimde değişmez.
3. Yaş yalnızca başlangıç sinyalidir; okuma ve etkileşim profilleri ayrı tutulur.
4. Ebeveyn güvenlik sınırları en yüksek otoritedir.
5. Açık tercihler, davranıştan çıkarılan tercihlerden daha güçlüdür.
6. Tek seçim kalıcı tercih oluşturmaz.
7. Tercihler yavaş ve açıklanabilir biçimde güncellenir.
8. Çocuğa yalnızca sevdiği içerikler gösterilmez; kontrollü çeşitlilik korunur.
9. Sevilen karakterler daha sık kullanılabilir ama dünya mantığına uymalıdır.
10. Kişiselleştirme anlatım, tempo, seçim ve içerik adaylarını etkiler.
11. Kanonik görev sonuçlarını veya geçmiş seçimleri silmez.
12. Öğrenme hedefleri hikâyeye doğal biçimde yerleşir.
13. Öğrenme başarısızlığı hikâyeyi kilitlemez.
14. Gerilim adaptasyonu ebeveyn sınırını aşamaz.
15. Çocuğun seçimlerinden kişilik veya sağlık etiketi çıkarılmaz.
16. Uzun süre gelmeyen çocuk suçlanmaz.
17. Profil verileri minimum ve amaçla sınırlı tutulur.
18. Ebeveyn tercihleri sıfırlayabilir veya düzeltebilir.
19. Her hikâye bir kişiselleştirme snapshot’ı kullanır.
20. Kişiselleştirme hatasında güvenli varsayılan profil uygulanır.

Child Profile & Personalization Engine’in kavramsal çekirdeği böylece tamamlandı.