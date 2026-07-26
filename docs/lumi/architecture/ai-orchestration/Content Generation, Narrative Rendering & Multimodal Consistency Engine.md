Content Generation, Narrative Rendering & Multimodal Consistency Engine

Bu motor, LUMI’nin kanonik dünya durumunu çocuğun okuyacağı, dinleyeceği ve göreceği hikâyeye dönüştürür.

Temel görevi yalnızca “güzel metin yazmak” değildir.

Şunları güvence altına almalıdır:

Anlatılan olay gerçekten gerçekleşti mi?
Karakterler kendi kişiliklerine uygun mu konuşuyor?
Çocuğun bilmemesi gereken bilgiler sızıyor mu?
Metin yaş düzeyine uygun mu?
Görseldeki karakter, eşya ve mekân kanonik state ile uyumlu mu?
Ses ve ambiyans sahneyle çelişiyor mu?
Aynı hikâye yeniden üretildiğinde temel gerçekler korunuyor mu?

Temel ilke:

Yaratıcılık serbesttir; gerçeklik serbest değildir.

LLM anlatım biçiminde yaratıcı olabilir.

Ancak:

dünya gerçeğini,
olay sonucunu,
eşya sahipliğini,
karakter konumunu,
görev durumunu,
gizli bilgiyi

değiştiremez.

1. Sistemin mimarideki yeri
Canonical Commit
↓
Committed Domain Events
↓
Story Planner Output
↓
Narrative Context Builder
↓
Knowledge & Safety Filter
↓
Narrative Renderer
↓
Dialogue Renderer
↓
Choice Presenter
↓
Multimodal Prompt Builder
↓
Narrative Validation
↓
Presentation Commit

Buradaki kritik ayrım:

Canonical Commit

ile:

Presentation Commit

aynı şey değildir.

Dünya state’i zaten değişmiştir.

Bu motor o değişimin nasıl sunulacağını üretir.

2. Presentation state

Anlatı metni kanonik world state değildir.

Ancak çocuk deneyiminin devamlılığı için presentation state saklanabilir.

type PresentationState = {
  storySessionId: string
  worldVersion: number

  renderedSceneIds: string[]
  currentPageIndex: number

  selectedNarrativeStyleId: string
  activeVoiceProfileIds: string[]

  generatedIllustrationIds: string[]
  generatedAudioIds: string[]

  version: number
}
3. Canonical data ve creative data ayrımı
Canonical data

Değiştirilemez gerçekler:

Tilki kulede.
Mavi fener Tilki’nin elinde.
Kapı hâlâ kilitli.
Akşam oldu.
Yağmur hafifledi.
Creative data

Sunum tercihleri:

Yağmurun sesi nasıl betimlenecek?
Tilki hangi kelimeleri kullanacak?
Sahne kaç paragrafta anlatılacak?
Resimde kamera açısı ne olacak?
Hangi ambiyans sesi kullanılacak?

Creative data, canonical data ile çelişemez.

4. Narrative Input Package

Narrative Engine’e ham world snapshot verilmemelidir.

Sadece gerekli ve izinli bilgilerden oluşan yapılandırılmış paket verilmelidir.

type NarrativeInputPackage = {
  storySessionId: string
  basedOnWorldVersion: number

  scenePlan: ScenePlan
  committedEvents: DomainEvent[]

  visibleWorldFacts: NarrativeFact[]
  characterPresentationProfiles: CharacterPresentationProfile[]

  childProfileContext: ChildNarrativeProfile
  safetyContext: NarrativeSafetyContext

  continuityContext: NarrativeContinuityContext
  styleContext: NarrativeStyleContext

  forbiddenKnowledge: ForbiddenNarrativeFact[]
}
5. Narrative Fact

Her gerçek anlatı motoruna serbest metin olarak değil, yapılandırılmış biçimde verilmelidir.

type NarrativeFact = {
  id: string

  factType:
    | "character_state"
    | "location_state"
    | "item_state"
    | "quest_state"
    | "relationship_visible"
    | "weather"
    | "time"
    | "event_result"

  subjectId: string
  predicate: string
  object?: unknown

  visibility:
    | "directly_visible"
    | "known"
    | "communicable"
    | "internal_only"

  importance:
    | "required"
    | "supporting"
    | "optional"
}
6. Required facts

Bazı gerçekler metinde açıkça görünmelidir.

Örnek:

Mavi fener Tilki’ye verildi.

Bu olay sahnenin merkezindeyse required olur.

Narrative bu olayı atlayamaz.

7. Supporting facts

Sahne tutarlılığı için kullanılabilir.

Örnek:

Akşam oldu.
Hafif yağmur sürüyor.
Kule taşları ıslak.

Bunların hepsi ayrı ayrı söylenmek zorunda değildir.

Ama anlatı bunlarla çelişemez.

8. Optional facts

Atmosfer veya callback için kullanılabilir.

Örnek:

Tilki daha önce burada korkmuştu.

Story Planner uygun bulursa kullanılabilir.

9. Forbidden Knowledge

Anlatı motoruna yalnızca “söyleme” talimatı vermek yeterli değildir.

Gizli bilgilerin explicit listesi hazırlanmalıdır.

type ForbiddenNarrativeFact = {
  factId: string

  reason:
    | "undiscovered"
    | "character_secret"
    | "player_unknown"
    | "future_event"
    | "system_only"
    | "safety_hidden"

  prohibitedSurfaces:
    | "narration"
    | "dialogue"
    | "choice"
    | "illustration"
    | "audio" []
}
10. Bilgi sızıntısı türleri
Narrator leak

Tilki bilmese de anahtar duvarın arkasındaydı.

Oyuncunun bilmemesi gereken bilgi sızar.

Dialogue leak

NPC bilmediği şeyi söyler.

Choice leak

Gizli geçidi aç.

Henüz gizli geçit keşfedilmemiştir.

Visual leak

Resimde gizli kapı açıkça görünür.

Metadata leak

Görsel dosya adı:

secret-door-final.png

gibi doğrudan spoiler içerebilir.

11. Knowledge-aware narration

Anlatıcı türü belirlenmelidir.

type NarratorKnowledgeMode =
  | "player_limited"
  | "character_limited"
  | "safe_omniscient"
Player limited

Yalnızca oyuncunun bildiklerini anlatır.

LUMI için güçlü varsayılandır.

Character limited

Belirli ana karakterin algısıyla anlatır.

Safe omniscient

Daha geniş anlatım yapabilir ama gizli çözüm ve gelecek olayları açıklamaz.

12. Anlatıcının otoritesi

Narrator:

görünenleri betimleyebilir,
atmosfer kurabilir,
karakterin açık davranışını anlatabilir,
doğrulanmış içsel durumu sınırlı biçimde yansıtabilir.

Narrator:

yeni world fact oluşturamaz,
karakterin bilinmeyen niyetini kesinleştiremez,
gizli nesne ekleyemez,
sonucu değiştiremez.
13. Scene Plan

Story Planner anlatıcıya serbest bir “hikâye yaz” komutu vermemelidir.

Önce sahne planı oluşturulmalıdır.

type ScenePlan = {
  id: string

  sceneType:
    | "arrival"
    | "exploration"
    | "dialogue"
    | "choice"
    | "action"
    | "discovery"
    | "recovery"
    | "transition"
    | "resolution"

  purpose: string
  locationId: string

  participatingCharacterIds: string[]

  requiredEventIds: string[]
  requiredFactIds: string[]

  optionalCallbackIds: string[]

  desiredEmotionalTone: string[]
  maximumTensionLevel: number

  expectedNarrativeLength: NarrativeLength
  endingMode: SceneEndingMode
}
14. Scene purpose

Her sahnenin açık bir amacı olmalıdır.

Örnek:

Tilki’nin iyileştiğini göstermek.
Köprü için iki çözüm seçeneğini sunmak.
Kuleye varışı kanonik olarak anlatmak.
Yeni rota hakkında ipucu vermek.

Amaçsız sahne:

gereksiz uzar,
tekrar üretir,
hikâye odağını dağıtır.
15. Scene types
Arrival

Karakterlerin mekâna girişini anlatır.

Exploration

Gözlem ve çevre affordance’larını sunar.

Dialogue

Karakter etkileşimi merkezlidir.

Choice

Oyuncuya anlamlı seçenek sunar.

Action

Commit edilmiş eylemi anlatır.

Discovery

Yeni bilgi veya özellik açılır.

Recovery

Gerilim sonrası sakinleşme sağlar.

Transition

Zaman veya mekân geçişini özetler.

Resolution

Görev veya sahne sonucunu kapatır.

16. Scene length
type NarrativeLength =
  | "micro"
  | "short"
  | "standard"
  | "extended"

Örnek:

micro:
1–2 cümle

short:
1 kısa paragraf

standard:
2–4 paragraf

extended:
birkaç sayfalık önemli sahne

Her event extended anlatılmamalıdır.

17. Narrative density

Çocuğun yaşına göre aynı sahne farklı yoğunlukta sunulabilir.

4–5 yaş
kısa cümleler,
tek olay odağı,
az karakter,
tekrar eden güvenli ifadeler,
somut eylemler.
6–7 yaş
daha zengin diyalog,
basit neden-sonuç,
kısa duygusal açıklamalar,
iki veya üç seçenek.
8–10 yaş
alt metin,
daha karmaşık hedefler,
farklı bakış açıları,
daha uzun sahneler.
18. Child Narrative Profile
type ChildNarrativeProfile = {
  ageBand: string

  readingLevel: string
  preferredSentenceLength: number

  maximumNewConceptsPerScene: number
  maximumNamedCharactersPerScene: number

  preferredDialogueRatio: number
  preferredDescriptionRatio: number

  toleratedTensionLevel: number

  repetitionSupportLevel: number
  explanationDepth: number
}
19. Yaşa uygunluk yalnızca kelime seçimi değildir

Yaşa uygunluk şunları da etkiler:

olay karmaşıklığı,
karakter sayısı,
neden-sonuç zinciri,
sahne uzunluğu,
zaman atlamaları,
seçenek sayısı,
soyut kavram yoğunluğu,
gerilim süresi,
belirsizlik düzeyi.
20. Vocabulary control

Kelime havuzu kategorilere ayrılabilir.

type VocabularyLevel = {
  preferredWords: string[]
  supportedWords: string[]
  explainWhenUsedWords: string[]
  avoidWords: string[]
}

Ama mekanik ve katı bir sözlük kullanılmamalıdır.

Yeni kelime öğretme fırsatları korunmalıdır.

21. Yeni kelime öğretimi

Yeni kelime:

bağlamdan anlaşılmalı,
kısa açıklama almalı,
aynı sahnede çok fazla kullanılmamalıdır.

Örnek:

Taşların üzerinde küçük bir “oyuk”, yani içeri doğru çökmüş bir bölüm vardı.

22. Cümle yapısı

Küçük yaşta:

Tek cümle = tek ana fikir

tercih edilmelidir.

Uzun zincirler:

Tilki, yağmurun giderek hızlandığını fark ettiği için, daha önce Baykuş’un ona gösterdiği dar taş yolu kullanarak...

küçük yaş için uygun değildir.

23. Paragraf ritmi

Ekran tabanlı okuma için:

kısa paragraflar,
görsel aralıklar,
diyalog ayrımı,
sayfa başına sınırlı metin

kullanılmalıdır.

24. Story Page
type StoryPage = {
  id: string
  sceneId: string

  pageIndex: number

  narrativeBlocks: NarrativeBlock[]
  dialogueBlocks: DialogueBlock[]

  choiceSetId?: string

  illustrationIntentId?: string
  audioCueIds: string[]

  basedOnWorldVersion: number
}
25. Narrative Block
type NarrativeBlock = {
  id: string

  blockType:
    | "description"
    | "action"
    | "transition"
    | "reflection"
    | "recap"

  text: string

  sourceFactIds: string[]
  sourceEventIds: string[]
}

Her blok hangi canonical gerçeklerden türediğini bilmelidir.

26. Source grounding

Metindeki önemli iddialar canonical fact’e bağlanmalıdır.

Örnek:

“Tilki mavi feneri dikkatlice tuttu.”

Grounding:

ITEM_TRANSFERRED
ITEM_EQUIPPED
CHARACTER_PRESENT_AT_LOCATION

Bu bağ, narrative hallucination denetiminde kullanılır.

27. Unsupported claim

Narrative şu cümleyi üretirse:

Tilki feneri daha önce hiç görmemişti.

Ama böyle bir knowledge fact yoksa bu unsupported claim’dir.

Her küçük atmosfer cümlesi event’e bağlanmak zorunda değildir.

Ancak dünya, geçmiş, sahiplik, duygu ve bilgi iddiaları bağlanmalıdır.

28. Narrative claim extraction

Üretilen metinden iddialar çıkarılabilir.

type NarrativeClaim = {
  subjectId?: string
  predicate: string
  object?: unknown

  claimType:
    | "canonical"
    | "descriptive"
    | "subjective"
    | "metaphorical"

  sourceTextRange: string
}

Sonra canonical facts ile karşılaştırılır.

29. Claim sınıfları
Canonical claim

Tilki kuleye ulaştı.

Doğrulanmalıdır.

Descriptive claim

Taşlar yağmurda parlıyordu.

Hava ve mekânla uyumlu olmalıdır.

Subjective claim

Kule Tilki’ye biraz ürkütücü göründü.

Emotion/location association ile desteklenmelidir.

Metaphorical claim

Rüzgâr eski bir şarkı gibi esiyordu.

Dünya gerçeği iddiası sayılmaz.

30. Hallucination kontrolü

Kontroller:

Yeni karakter eklendi mi?
Olmayan item kullanıldı mı?
Yanlış kişi konuştu mu?
Karakter yanlış yerde mi?
Hava yanlış mı?
Zaman yanlış mı?
Quest sonucu erken mi açıklandı?
Gizli bilgi sızdı mı?
Karakterin bilmediği bilgi konuşmaya girdi mi?
31. Narrative validation pipeline
Generated Draft
↓
Schema Validation
↓
Canonical Claim Extraction
↓
Fact Grounding
↓
Forbidden Knowledge Scan
↓
Character Voice Validation
↓
Age Suitability Validation
↓
Safety Validation
↓
Choice Validation
↓
Multimodal Consistency Validation
↓
Approved Presentation
32. Validation disposition
type NarrativeValidationDisposition =
  | "approve"
  | "approve_with_minor_edits"
  | "regenerate_section"
  | "fallback_template"
  | "reject"

Bütün hikâyeyi baştan üretmek yerine yalnızca hatalı blok yeniden oluşturulabilir.

33. Deterministic fallback

LLM başarısız olursa sistem tamamen durmamalıdır.

Basit şablonlar bulunmalıdır.

Örnek:

{characterName}, {itemName} eşyasını aldı.
Birlikte {locationName} yönüne baktılar.
Şimdi iki güvenli seçenekleri vardı:
{choiceA}
{choiceB}

Fallback daha az yaratıcı olabilir ama tutarlı kalır.

34. Narrative retry

Retry aynı hatayı tekrar üretmemelidir.

Yeni denemeye validation feedback verilmelidir.

type NarrativeRevisionRequest = {
  originalDraftId: string

  invalidBlockIds: string[]
  validationCodes: string[]

  preservedBlockIds: string[]
  requiredCorrections: string[]
}
35. Karakter sesi

Her karakterin tutarlı bir konuşma profili olmalıdır.

type CharacterVoiceProfile = {
  characterId: string

  speakingStyleTags: string[]

  sentenceLengthPreference: string
  vocabularyStyle: string

  humorStyle?: string
  hesitationStyle?: string

  commonExpressionIds: string[]
  avoidedExpressionIds: string[]

  emotionalVoiceModifiers: Record<string, string[]>
}
36. Karakter sesi ve kişilik ayrımı

Kişilik:

Tilki meraklı ama temkinli.

Konuşma biçimi:

Kısa konuşur.
Bazen önce çevreyi kontrol eder.
Kesin bilmediğinde “Belki...” der.

Bunlar ayrı tutulmalıdır.

37. Karakter sesinde tekrar riski

Catchphrase’ler çok sık kullanılmamalıdır.

Örneğin Tilki her sahnede:

Bir bakalım!

derse yapaylaşır.

type VoiceExpressionCooldown = {
  expressionId: string
  minimumSceneGap: number
}
38. Duygusal ses değişimi

Aynı karakter farklı duygularda farklı konuşur.

Örnek:

Tilki sakin:
“Önce izlere bakalım.”

Tilki kaygılı:
“Bir dakika... Bu izler biraz tuhaf.”

Tilki heyecanlı:
“İşte burada! İzler kuleye gidiyor!”

Ama temel karakter sesi korunur.

39. Character knowledge boundary

Bir karakter yalnızca bildiği şeyler hakkında kesin konuşabilir.

type CharacterDialogueKnowledgeContext = {
  characterId: string

  knownFactIds: string[]
  beliefIds: string[]
  suspicionIds: string[]

  forbiddenFactIds: string[]
}
40. Bilgi ve belief dili

Character truth:

Köprü yıkıldı.

Character belief:

Bence yağmur köprüyü zayıflatmış olabilir.

Character suspicion:

Taşların altında başka bir geçit olabilir.

Dialogue Engine bunları dilde ayırmalıdır.

41. Yanlış belief’in anlatımı

NPC yanlış inanıyorsa sistem bunu dünya gerçeği gibi yazmamalıdır.

Doğru:

Baykuş, eski yolun hâlâ açık olduğunu sanıyordu.

Yanlış:

Eski yol hâlâ açıktı.

42. Diyalog işlevi

Her diyalog en az bir işlev taşımalıdır:

bilgi verme,
duygu gösterme,
ilişki kurma,
seçim sunma,
hedef belirleme,
geçmişe callback,
atmosfer yaratma.

Salt dolgu konuşmaları sınırlandırılmalıdır.

43. Dialogue Turn
type DialogueTurn = {
  speakerCharacterId: string

  dialogueIntent:
    | "inform"
    | "ask"
    | "suggest"
    | "react"
    | "reassure"
    | "disagree"
    | "joke"
    | "reflect"

  text: string

  groundedFactIds: string[]
  expressedBeliefIds: string[]
  expressedEmotionIds: string[]
}
44. NPC anlaşmazlığı

Karakterler her zaman aynı fikirde olmak zorunda değildir.

Ancak çocuklara uygun anlaşmazlık:

saygılı,
anlaşılır,
çözüm odaklı,
kişisel saldırısız

olmalıdır.

Örnek:

“Ben taş yolu daha güvenli buluyorum,” dedi Baykuş.
Tilki kulaklarını hafifçe kaldırdı. “Ben de dere yolunun daha kısa olduğunu düşünüyorum. Önce ikisini karşılaştıralım mı?”

45. Karakter bağımsızlığı

NPC yalnızca oyuncuya seçenek açıklayan bir arayüz olmamalıdır.

Kendi:

görüşü,
kaygısı,
hedefi,
bilgisi

olmalıdır.

Ancak son oyuncu kararını ele geçirmemelidir.

46. Dialogue participation

Her sahnede bütün karakterler konuşmamalıdır.

type DialogueParticipationScore = {
  characterId: string

  sceneRelevance: number
  knowledgeRelevance: number
  relationshipRelevance: number
  novelty: number
  repetitionPenalty: number
}

En ilgili karakterler seçilir.

47. Sessiz karakter davranışı

Konuşmayan karakter yine görünür olabilir.

Baykuş, Tilki konuşurken haritadaki çizgileri dikkatle izledi.

Bu, karakter varlığını korur.

Ama her hareket de ayrı anlatılmamalıdır.

48. Internal thought

Karakterin iç düşüncesi ancak anlatıcı modu izin veriyorsa kullanılmalıdır.

type InternalThoughtPolicy = {
  allowedCharacterIds: string[]
  narratorMode: NarratorKnowledgeMode

  maximumThoughtBlocksPerScene: number
}

Player-limited anlatıda NPC’nin gizli düşüncesi gösterilmemelidir.

49. Çocuk karakterin iç düşüncesi

Sistem çocuğa ait karakterin ne düşündüğünü kesin biçimde dayatmamalıdır.

Yanlış:

Lumi çok korkmuştu.

Daha güvenli:

Kule oldukça karanlık görünüyordu. Lumi isterse biraz durup etrafı inceleyebilirdi.

Çocuğun duygusal yorumu için alan bırakılır.

50. Player avatar agency

Oyuncunun avatarı:

oyuncu adına önemli karar vermez,
oyuncu adına güçlü duygu iddia etmez,
oyuncu adına istemediği söz vermez,
seçimden önce eylemi tamamlamaz.
51. Controlled player avatar narration

Uygun:

Lumi feneri biraz daha yukarı kaldırdı.

Eğer bu mikro eylem planner tarafından otomatik kabul edilmişse kullanılabilir.

Uygun olmayan:

Lumi, bir daha asla ormana dönmemeye karar verdi.

Bu büyük bir karar ve oyuncuya ait olmalıdır.

52. Micro-actions

Narrative akışı için bazı küçük eylemler otomatik olabilir.

Örnek:

kapıya bakmak,
bir adım yaklaşmak,
selam vermek,
eşyayı dikkatlice tutmak.
type NarrativeMicroActionPolicy = {
  allowedActionTypes: string[]
  maximumWorldImpact: number
  requiresCanonicalEvent: boolean
}

Kanonik sonucu değiştirmeyen mikro eylemler presentation-level olabilir.

53. Canonical micro-action sınırı

Bir mikro eylem:

location değiştirmemeli,
item ownership değiştirmemeli,
quest ilerletmemeli,
önemli bilgi keşfetmemeli,
relationship outcome üretmemelidir.

Bunlardan birini yapıyorsa command ve event gerekir.

54. Choice Presentation Engine

Seçenekler yalnızca metin dizisi değildir.

type ChoiceSetPresentation = {
  choiceSetId: string

  promptText: string
  options: ChoicePresentationOption[]

  maximumSelectableOptions: number
  allowMapInspection: boolean
  allowInventoryInspection: boolean

  basedOnWorldVersion: number
}
55. Choice Presentation Option
type ChoicePresentationOption = {
  choiceId: string

  label: string
  shortDescription?: string

  iconIntent?: string

  availability:
    | "available"
    | "unavailable"
    | "hidden"

  unavailabilityExplanationIntent?: string

  riskTone:
    | "safe"
    | "careful"
    | "uncertain"

  sourceActionId: string
}
56. Seçenek metinleri

Seçenekler:

birbirinden ayırt edilebilir,
sonucu tamamen açıklamayan,
gizli bilgiyi sızdırmayan,
kısa ve eylem odaklı

olmalıdır.

Uygun:

Taş yolu incele
Dere yolunu sor
Biraz daha bekle

Uygun olmayan:

Doğru yolu seç
Yanlış yolu seç
Gizli anahtarı bulacağın yolu seç
57. Sahte seçenek yasağı

Farklı görünen ama aynı sonucu üreten seçenekler sürekli kullanılmamalıdır.

Örnek:

Sola git
Sağa git

Her ikisi de aynı sahneyi açıyorsa bu yalnızca kozmetik seçimdir.

Kozmetik seçim kullanılabilir ama açıkça küçük tercih niteliğinde olmalıdır.

58. Choice diversity

Seçenek türleri çeşitlenebilir:

Action
Dialogue
Exploration
Item use
Ask for help
Wait
Return
Map inspection
Creative proposal

Her sahne yalnızca rota seçimi olmamalıdır.

59. Creative input

Çocuk hazır seçenek dışında kendi fikrini yazabilir veya söyleyebilir.

Akış:

Raw idea
↓
Intent extraction
↓
World feasibility
↓
Affordance evaluation
↓
Safety
↓
Canonical command proposal
↓
Narrative response

Narrative Engine çocuk fikrini doğrudan gerçekleşmiş gibi yazamaz.

60. Creative idea acknowledgement

Çocuğun fikri mümkün değilse sistem:

fikrin değerini tanır,
fiziksel nedeni açıklar,
yakın alternatif sunar.

Örnek:

Haritayla kapıyı açmayı denemek yaratıcı bir fikirdi. Harita anahtar gibi dönemiyordu ama üzerindeki semboller kapıdaki işaretlerle karşılaştırılabilirdi.

61. Choice overload

Yaşa göre seçenek sayısı sınırlandırılmalıdır.

4–5 yaş:
2 seçenek, bazen 3

6–7 yaş:
2–4 seçenek

8–10 yaş:
3–5 seçenek

“Başka bir fikir söyle” ayrı bir açık seçenek olabilir.

62. Narrative pacing

Pacing şu katmanlardan oluşur:

Scene pacing
Story pacing
Arc pacing
Emotional pacing
Choice pacing

Narrative Engine yalnızca cümle hızını değil, sunum temposunu yönetir.

63. Scene pacing profile
type ScenePacingProfile = {
  actionDensity: number
  dialogueDensity: number
  descriptionDensity: number
  reflectionDensity: number

  expectedChoiceDelayBlocks: number
}
64. Sürekli seçim problemi

Her paragraftan sonra seçim sunmak:

hikâye akışını böler,
çocuğu yorar,
kararların önemini azaltır.

Seçim yalnızca anlamlı agency noktalarında sunulmalıdır.

65. Choice pacing

Örnek:

Kurulum
↓
Kısa keşif
↓
Karakter tepkisi
↓
Anlamlı seçim
↓
Sonuç
↓
Recovery
66. Gerilim eğrisi

Sahne gerilimi çocuk profilini aşmamalıdır.

type NarrativeTensionState = {
  currentTension: number
  recentPeakTension: number

  recoveryRequired: boolean
  maximumAllowedTension: number
}
67. Gerilim dili

Aynı world event farklı profillerde farklı anlatılabilir.

Canonical olay:

Köprü sallandı.

Küçük yaş:

Köprü biraz hareket etti. Tilki hemen durdu ve güvenli tarafa geri adım attı.

Daha büyük yaş:

Tahtalar ayaklarının altında gıcırdadı. Tilki ağırlığını dikkatlice geriye verdi.

Gerçek aynı kalır.

Sunum değişir.

68. Safety redaction yerine safe framing

Riskli bir olayı yalnızca kelimeleri silerek güvenli hâle getirmek yeterli değildir.

Sahnenin yapısı da uyarlanmalıdır.

Örnek:

Fırtına

küçük yaş için:

güvenli iç mekân,
hazırlık,
sesleri dinleme,
birlikte çözüm üretme

üzerinden sunulur.

69. Emotional recovery scene

Yüksek gerilim sonrası:

güvenli mekân,
tanıdık karakter,
sakin konuşma,
sıcak içecek gibi fantastik güven unsurları,
küçük başarı hatırlatması

kullanılabilir.

Ancak her recovery aynı kalıba dönüşmemelidir.

70. Repetition management

Sistem tekrarları izlemelidir.

type NarrativeRepetitionTracker = {
  recentlyUsedOpeningPatterns: string[]
  recentlyUsedClosingPatterns: string[]

  recentlyUsedMetaphorIds: string[]
  recentlyUsedDialogueExpressionIds: string[]

  recentlyUsedSceneStructureIds: string[]
}
71. Tekrar türleri
aynı cümle başlangıçları,
aynı hava betimlemeleri,
aynı karakter tepkileri,
aynı seçim formatı,
aynı çözüm türleri,
aynı callback,
aynı cliffhanger.
72. Faydalı tekrar

Küçük çocuklar için bazı tekrarlar faydalıdır.

Örnek:

karakter adı,
güvenli rutin,
görev amacı,
önemli item,
basit kafiye.

Bu nedenle:

repetition

her zaman hata değildir.

Amaçlı ve destekleyici olmalıdır.

73. Callback Engine entegrasyonu

Geçmiş olaylara geri dönüş yapılabilir.

type NarrativeCallbackCandidate = {
  memoryId: string
  sourceEventId: string

  relevance: number
  emotionalValue: number
  novelty: number
  repetitionPenalty: number

  visibilityValid: boolean
}
74. Callback türleri
Location callback
Item callback
Relationship callback
Quest callback
World transformation callback
Promise callback
Humor callback
Learning callback
75. Callback doğruluğu

Geçen sefer burada Tilki’yi kurtarmıştın.

demeden önce:

gerçekten burada mıydı?
gerçekten oyuncu mu yardım etti?
olay oyuncunun bildiği geçmişte mi?
aynı callback yakın zamanda kullanıldı mı?

kontrol edilmelidir.

76. Recap ve callback ayrımı

Recap:

Hatırlatma amaçlı doğrudan özet.

Callback:

Yeni sahne içinde doğal geçmiş bağlantısı.

Her sahne recap ile başlamamalıdır.

77. Story opening

Açılış türleri:

Direct continuation
Location opening
Character moment
World event signal
Mystery hint
Calm routine

Açılış önceki checkpoint ile uyumlu olmalıdır.

78. Resume opening

Uzun aradan sonra:

kısa yönlendirme,
mevcut durum,
bekleyen hedef,
güvenli devam seçeneği

sunulabilir.

Örnek:

En son Kuzey Kulesi’nin kapısına ulaşmıştınız. Tilki mavi feneri taşıyor, Baykuş ise kapıdaki sembolleri inceliyordu. Şimdi ister sembollere yeniden bakabilir, ister çevrede başka bir giriş arayabilirsiniz.

79. Story ending modes
type SceneEndingMode =
  | "choice"
  | "safe_pause"
  | "resolution"
  | "curiosity"
  | "travel_checkpoint"
  | "rest"
80. Safe pause

Oturum süresi dolduğunda:

Lumi ve arkadaşları kule girişinin yanındaki kuru taş bölüme geçti. Harita ve fener güvendeydi. Bir sonraki adımı daha sonra seçebilirlerdi.

Dünya state’i gerçekten bu güvenli checkpoint ile uyumlu olmalıdır.

81. Curiosity ending

Merak sonu:

Haritanın kenarında, daha önce fark etmedikleri küçük bir ay sembolü vardı.

Bu sembol gerçekten discovered veya hinted state’e geçmiş olmalıdır.

Narrative kendi başına ipucu ekleyemez.

82. Story resolution

Görev tamamlandığında anlatı:

yapılan katkıyı,
karakterlerin rolünü,
dünya değişimini,
ödülü,
sonraki olası yönü

gösterebilir.

Ancak her görev aşırı kutlama ile bitmemelidir.

83. Contribution-aware resolution

Oyuncu, NPC ve grup katkıları ayrılmalıdır.

Örnek:

Senin bulduğun sağlam ipler, Baykuş’un çizdiği plan ve köylülerin taşıdığı tahtalar birleşince köprü yeniden kullanılabilir hâle geldi.

Bu, kanonik contribution event’lerinden türetilir.

84. Moral lesson yasağı

Her hikâye doğrudan:

Bu yüzden paylaşmanın çok önemli olduğunu öğrendiler.

gibi dersle bitmemelidir.

Öğrenme:

olaydan,
karakter davranışından,
sorudan,
kısa düşünme alanından

çıkmalıdır.

85. Reflection question

Hikâye sonunda yaşa uygun kısa sorular olabilir.

type ReflectionPrompt = {
  promptType:
    | "comprehension"
    | "emotion"
    | "perspective"
    | "creative"
    | "decision"

  text: string
  expectedAnswerMode: string
}
86. Reflection örnekleri
Comprehension

Tilki neden taş yoldan gitmek istemişti?

Emotion

Baykuşun yerinde olsaydın yağmur başladığında nasıl hissederdin?

Perspective

Sence Denizci neden hemen cevap vermedi?

Creative

Sen köprüye yeni bir isim verseydin ne koyardın?

87. Reflection sonucu world truth değildir

Çocuğun cevabı:

profile signal,
interest,
temporary preference,
story seed

olabilir.

Ama doğrudan world fact olmaz.

88. Multimodal Pipeline

Metin dışında şu sunumlar üretilebilir:

Illustration
Character portrait
Item image
Map visual
Ambient audio
Sound effect
Narrated voice
Music cue
Animation instruction

Hepsi aynı canonical presentation package üzerinden beslenmelidir.

89. Multimodal Scene Package
type MultimodalScenePackage = {
  sceneId: string
  basedOnWorldVersion: number

  narrativeSummary: string

  visibleCharacterIds: string[]
  visibleItemIds: string[]
  visibleLocationFeatureIds: string[]

  timeOfDay: DayPeriod
  weatherType?: string

  emotionalTone: string[]
  visualContinuityReferences: VisualReference[]

  forbiddenVisualFacts: string[]
  audioCueIntents: AudioCueIntent[]
}
90. Görsel üretim otoritesi

Görsel model:

kamera açısı,
ışık,
kompozisyon,
resim stili

konusunda yaratıcı olabilir.

Ama:

yeni karakter,
yanlış eşya,
gizli rota,
yanlış hava,
yanlış yaralanma,
yanlış kıyafet

ekleyemez.

91. Canonical Visual Definition

Önemli karakterler ve eşyalar için kalıcı görsel tanım gerekir.

type CanonicalVisualDefinition = {
  entityId: string
  entityType: string

  stableTraits: VisualTrait[]
  variableTraits: VisualTrait[]

  prohibitedTraits: VisualTrait[]

  referenceAssetIds: string[]
  styleCompatibilityTags: string[]
}
92. Stable visual traits

Karakter için:

tür,
temel renk,
yüz yapısı,
göz rengi,
ayırt edici işaret,
genel beden oranı.

Eşya için:

şekil,
malzeme,
temel renk,
sembol,
boyut sınıfı.

Bunlar sahneden sahneye değişmez.

93. Variable visual traits
kıyafet,
taşınan eşya,
duygusal ifade,
ıslaklık,
kir,
hafif yaralanma bandajı,
mevsim aksesuarı.

Bunlar canonical state’e göre değişir.

94. Visual continuity snapshot
type VisualContinuitySnapshot = {
  entityId: string

  currentVariantId: string

  equippedItemIds: string[]
  carriedVisibleItemIds: string[]

  currentConditionVisuals: string[]
  currentOutfitId?: string

  lastApprovedAssetId?: string
}
95. Karakter tutarlılığı

Bir görselde Tilki:

turuncu,
sol kulağında küçük beyaz iz,
mavi çanta

ile gösterildiyse sonraki sahnede sebepsiz:

gri,
izsiz,
kırmızı çantalı

olamaz.

96. Item görsel sahipliği

Mavi fener Tilki’ye verildiyse:

sonraki görselde Lumi’nin elinde olmamalı,
Tilki’nin elinde veya çantasında görünmeli,
sahnede görünmesi zorunlu değilse kaybolmuş sayılmamalıdır.
97. Görselde görünmeyen item

Bir eşya resimde görünmüyorsa canonical olarak kaybolmuş olmaz.

Görsel yalnızca sahnenin seçilmiş kadrajıdır.

Bu nedenle:

not visible

ile:

not present

ayrılmalıdır.

98. Görsel prompt yapısı
type IllustrationPromptPackage = {
  styleInstruction: string

  sceneComposition: string

  requiredEntityDescriptions: string[]
  requiredVisibleStates: string[]

  environmentalDescription: string

  forbiddenElements: string[]

  continuityReferenceInstructions: string[]

  outputAspectRatio: string
  outputPurpose: string
}
99. Görsel prompt’ta ID yerine tanım

Görsel model character-123 gibi ID’leri anlayamaz.

Prompt Builder:

Tilki karakteri

yerine canonical görsel tanımı üretir.

Ama ID bağlantısı metadata’da korunur.

100. Görsel doğrulama

Görsel üretildikten sonra kontrol edilmelidir:

Gerekli karakterler var mı?
Ekstra karakter var mı?
Eşyalar doğru kişide mi?
Karakter sayısı doğru mu?
Hava ve zaman doğru mu?
Gizli öğe görünmüş mü?
Yaralanma durumu doğru mu?
Kıyafet ve renk tutarlı mı?
101. Görsel validation result
type VisualValidationResult = {
  assetId: string

  status:
    | "approved"
    | "approved_with_crop"
    | "regenerate"
    | "reject"

  missingRequiredTraits: string[]
  contradictoryTraits: string[]
  leakedHiddenElements: string[]
}
102. Görsel yeniden üretim maliyeti

Her küçük hata için tam görsel yeniden üretilmemelidir.

Öncelik:

prompt öncesi güçlü structured validation,
uygun referans görseller,
düşük boyutlu preview,
onay sonrası final üretim.

Bu maliyet kontrolü sağlar.

103. Image budget
type StoryImageBudget = {
  maximumImages: number
  maximumTotalMegapixels: number

  priorityScenes:
    | "opening"
    | "discovery"
    | "choice"
    | "resolution" []

  reuseAllowed: boolean
}

Her sayfa için yeni görsel zorunlu değildir.

104. Görsel tekrar kullanımı

Aynı mekân görseli:

farklı crop,
hafif overlay,
karakter katmanı,
hava varyantı

ile tekrar kullanılabilir.

Ancak state değişmişse eski görsel yanlış bilgi vermemelidir.

105. Location visual variants
type LocationVisualVariant = {
  locationId: string

  conditionState: string
  dayPeriod: DayPeriod
  weatherType?: string
  seasonId?: string

  assetId: string
}

Örnek:

Eski Değirmen:
damaged / afternoon / clear

Eski Değirmen:
restored / evening / festival
106. Map visual consistency

Harita görseli de aynı pipeline’a bağlıdır.

Kontroller:

keşfedilmemiş bölge görünmüyor,
gizli rota çizilmiyor,
marker doğru yerde,
konum koordinatları kararlı,
kapalı rota uygun biçimde işaretli.
107. Ses katmanları
Narration voice
Character voice
Ambience
Sound effects
Music
Silence

Hepsi ayrı kontrol edilmelidir.

108. Audio Cue
type AudioCueIntent = {
  cueType:
    | "ambience"
    | "sound_effect"
    | "music"
    | "voice"
    | "silence"

  timing:
    | "scene_start"
    | "before_line"
    | "after_line"
    | "continuous"
    | "scene_end"

  intensity: number
  sourceEntityId?: string

  safetyTags: string[]
}
109. Ses işaretleri

Metin içinde geliştirici işaretleri kullanılabilir:

[Orman ambiyansı]
[Uzakta hafif gök gürültüsü]
[Taş kapıya hafif dokunma]

Ama kullanıcıya ham teknik etiket gösterilmemelidir.

Renderer bunları uygun ses katmanına dönüştürür.

110. Ses yoğunluğu

Her cümleye efekt eklemek:

yorucu,
dikkat dağıtıcı,
pahalı

olabilir.

Efektler yalnızca anlamlı anlarda kullanılmalıdır.

111. Korkutucu ses kontrolü

Küçük yaş profillerinde:

ani yüksek ses,
sert çarpma,
uzun çığlık,
yoğun karanlık ambiyans

sınırlandırılmalıdır.

Aynı dünya olayı daha yumuşak sesle sunulabilir.

112. Karakter sesi sentezi

Her karakter için:

tempo,
ton,
vurgu,
konuşma hızı

profili olabilir.

Ancak çocuk karakterin veya gerçek çocuğun sesi izinsiz taklit edilmemelidir.

113. Narration voice

Anlatıcı sesi:

sakin,
açık,
yaşa uygun hızda,
dramatik ama aşırı olmayan

olmalıdır.

Uyku modunda hız ve dinamik aralık azaltılabilir.

114. TTS maliyet kontrolü

Önce:

metin uzunluğu
karakter sesi sayısı
tahmini süre
tahmini maliyet

hesaplanabilir.

Ebeveyn isterse:

yalnızca anlatıcı,
anlatıcı + ana karakter,
tam seslendirme,
yalnızca belirli sayfalar

seçebilir.

115. Audio canonicality

Ses efektinde duyulan şey dünyada gerçekten bulunmalıdır.

Örnek:

at sesi

sahnede at yoksa kullanılmamalıdır.

Atmosferik kuş sesi biyoma uyumlu olmalıdır.

116. Music semantics

Müzik:

sahne duygusunu destekler,
gizli sonucu açıklamaz,
gerilimi çocuk profilinin üzerine taşımaz.

Aşırı “kötü karakter müziği” bir NPC hakkında erken hüküm oluşturabilir.

117. Multimodal synchronization

Metin:

Yağmur dinmişti.

Ama ses:

yoğun yağmur ambiyansı

olamaz.

Görsel:

parlak öğle

ama time:

gece

olamaz.

Bütün yüzeyler aynı scene package’tan türetilmelidir.

118. Multimodal parity matrix
type MultimodalParityCheck = {
  factId: string

  narrativeStatus: "match" | "missing" | "conflict"
  visualStatus: "match" | "not_shown" | "conflict"
  audioStatus: "match" | "not_used" | "conflict"
  choiceStatus: "match" | "not_applicable" | "conflict"
}
119. Presentation artifact registry
type PresentationArtifact = {
  id: string

  artifactType:
    | "text"
    | "image"
    | "audio"
    | "map"
    | "animation"

  storySessionId: string
  sceneId: string

  basedOnWorldVersion: number
  sourceFactIds: string[]
  sourceEventIds: string[]

  generationMetadata: GenerationMetadata
  validationStatus: string
}
120. Generation metadata
type GenerationMetadata = {
  generatorType:
    | "template"
    | "llm"
    | "image_model"
    | "tts"
    | "audio_library"

  provider?: string
  model?: string

  promptVersion?: string
  styleVersion?: string

  deterministicInputHash: string
}
121. Reproducibility

Creative output birebir aynı olmak zorunda değildir.

Ama yeniden üretimde şu gerçekler aynı kalmalıdır:

karakterler,
eşya sahipliği,
sahne sonucu,
konuşma niyeti,
seçimler,
gizli bilgi sınırı,
görsel traits.
122. Creative artifact persistence

Onaylanmış metin, görsel ve ses saklanmalıdır.

Aynı sayfa her açılışta yeniden üretilmemelidir.

Bu:

maliyeti,
tutarsızlığı,
gecikmeyi

azaltır.

123. Presentation invalidation

World state değişirse eski presentation bazı durumlarda geçersiz olabilir.

type PresentationInvalidationRule = {
  artifactType: string

  invalidatingEventTypes: string[]

  invalidationScope:
    | "scene"
    | "page"
    | "character"
    | "location"
    | "story_session"
}
124. Geçmiş sayfalar değişmemeli

Bir hikâye sayfası daha sonra world state değişti diye yeniden yazılmamalıdır.

Geçmiş presentation:

o anda geçerli olan world version’ın anlatımıdır.

Yeni sahneler güncel state’i kullanır.

125. Contradictory history

Eski görselde Tilki feneri taşımıyorsa, çünkü o anda henüz almamışsa bu doğrudur.

Yeni görselde taşıması gerekir.

Bu çelişki değil, zaman içindeki değişimdir.

126. Story history archive
type StoryPresentationArchive = {
  storySessionId: string

  startWorldVersion: number
  endWorldVersion: number

  pageIds: string[]
  committedEventIds: string[]

  canonicalSummaryId: string
}

Bu, geçmiş hikâyenin değişmeden yeniden okunmasını sağlar.

127. Localization

Narrative:

dil,
yaş düzeyi,
kültürel bağlam,
isim telaffuzu

açısından uyarlanabilir.

Ama çeviri canonical anlamı değiştirmemelidir.

128. Localization key ve generated text

Sabit UI ifadeleri localization key kullanır.

Hikâye metni ise hedef dilde üretilebilir veya çevrilebilir.

Her iki durumda da:

karakter adı,
item adı,
özel terimler,
konuşma üslubu

tutarlı kalmalıdır.

129. Canonical terminology registry
type CanonicalTerm = {
  entityId: string

  locale: string

  displayName: string
  shortName?: string
  pronunciationHint?: string

  knownStateVariants?: Record<string, string>
}

Örnek:

unknown:
Eski metal parça

identified:
Ay Anahtarı
130. Accessibility

Sunum seçenekleri:

büyük yazı,
yüksek kontrast,
satır aralığı,
resim odaklı mod,
sesli okuma,
kelime vurgulama,
altyazı,
efekt azaltma.

Bunlar world truth’u etkilemez.

131. Reading highlight

TTS sırasında kelime veya cümle vurgusu yapılabilir.

type NarrationTimingMap = {
  textBlockId: string

  segments: {
    textRange: string
    startMs: number
    endMs: number
  }[]
}
132. Reduced sensory mode

Bazı çocuklar için:

daha az animasyon,
daha az ses,
düşük müzik,
sabit görseller,
kısa geçişler

sunulabilir.

133. Parent presentation controls
type ParentPresentationControls = {
  maximumStoryLength?: NarrativeLength

  illustrationsEnabled: boolean
  narrationEnabled: boolean

  characterVoicesEnabled: boolean
  soundEffectsEnabled: boolean
  musicEnabled: boolean

  maximumTensionLevel?: number
  bedtimePresentationMode?: boolean
}
134. Story generation budget
type StoryGenerationBudget = {
  maximumLlmCalls: number
  maximumNarrativeTokens: number

  maximumImageGenerations: number
  maximumTtsCharacters: number

  retryBudget: number
}

Budget tükenirse fallback kullanılmalıdır.

135. Generation priority

Öncelik sırası:

1. Canonical correctness
2. Safety
3. Choice clarity
4. Narrative clarity
5. Character consistency
6. Visual consistency
7. Creative richness
8. Decorative variation

Maliyet veya hata durumunda listenin altından özellik azaltılır.

136. Streaming generation

Metin kullanıcıya parça parça gösterilecekse validation sorunu oluşabilir.

Güvenli yaklaşım:

küçük blok üret
↓
blok doğrula
↓
kullanıcıya göster

Tüm doğrulama bitmeden kontrolsüz token stream gösterilmemelidir.

137. Partial generation failure

İlk iki paragraf onaylandı, üçüncü paragraf hatalıysa:

ilk bloklar korunur,
yalnızca üçüncü blok yeniden üretilir,
continuity context verilir.
138. Narrative cache

Cache anahtarı:

scenePlanHash
+
worldVersion
+
childNarrativeProfileVersion
+
styleVersion
+
language

World version değişirse aynı cache körlemesine kullanılmaz.

139. Style presets
type NarrativeStylePreset = {
  id: string

  toneTags: string[]

  descriptionDensity: number
  dialogueDensity: number

  humorLevel: number
  poeticLanguageLevel: number

  suspenseLevel: number
  educationalExplanationLevel: number
}

Örnek:

Sakin Uyku
Neşeli Macera
Meraklı Keşif
Masalsı
Kısa ve Basit
140. Stil world truth’u değiştirmez

Aynı canonical sahne:

masalsı,
sade,
mizahi,
sakin

anlatılabilir.

Ama sonuç aynı kalır.

141. Humor Engine sınırları

Mizah:

karakteri küçük düşürmemeli,
korku yaşayan karakterle alay etmemeli,
fiziksel farklılıkları hedef almamalı,
tehlikeyi yanlış biçimde hafifletmemeli.
142. Educational integration

Bilgi öğretilecekse hikâyeye doğal bağlanmalıdır.

Örnek:

Baykuş, yosunun yalnızca kuzeyi göstermediğini açıkladı; ışık ve nem de büyüdüğü yeri etkileyebilirdi.

Bu tür bilgi current age profile’a göre sadeleştirilir.

143. Bilimsel iddia kontrolü

Gerçek dünya bilgisi içeren eğitim sahneleri ayrı fact validation gerektirir.

World fantasy fact ile real-world fact ayrılmalıdır.

type EducationalFact = {
  factId: string

  factDomain: string
  ageBand: string

  approvedExplanation: string
  sourceVersion: string
}
144. Fantastik ve gerçek bilgi ayrımı

Ay çiçekleri yalnızca dostluk şarkısı duyunca açılır.

Bu world rule olabilir.

Ama:

Gerçek çiçekler ses duyunca açılır.

gibi sunulmamalıdır.

Narrative işaretlemelidir:

LUMI dünyasındaki Ay Çiçekleri...

145. Story consistency memory

Aynı hikâye oturumunda geçen presentation ayrıntıları izlenmelidir.

Örnek:

Tilki bir sahnede kapının solunda durdu,
fener masaya bırakıldı,
Baykuş pencereye yöneldi.

Kısa süreli sahne continuity için tutulabilir.

type SceneContinuityState = {
  recentEntityPositions: Record<string, string>
  recentlyPlacedItemIds: Record<string, string>

  activeConversationTopicIds: string[]
  unresolvedNarrativeReferences: string[]
}
146. Presentation-only positioning

Bir karakterin “kapının solunda durması” world map state’i olmayabilir.

Bu scene-local presentation state’tir.

Sahne bittiğinde temizlenebilir.

Ancak sahne boyunca tutarlı kalmalıdır.

147. Unresolved references

Narrative:

“Onu burada bırakabiliriz,” dedi Tilki.

“Onu” hangi item?

Coreference belirsizliği küçük çocuklarda azaltılmalıdır.

Önemli entity adı gerektiğinde tekrar kullanılmalıdır.

148. Pronoun control

Sahnede aynı türden birden fazla karakter varsa zamir kullanımı sınırlandırılmalıdır.

Örnek:

Tilki Baykuş’a haritayı verdi. O da kapıya baktı.

Buradaki “O” belirsizdir.

Daha iyi:

Tilki haritayı Baykuş’a verdi. Baykuş da kapıya baktı.

149. Narrative self-consistency

Aynı sahne içinde:

hava değişmemeli,
item el değiştirmemeli,
konuşma sırası karışmamalı,
karakter bir anda başka yerde olmamalı,
açık kapı yeniden kilitli görünmemelidir.
150. Narrative delta

Her yeni blok presentation state’e küçük delta üretebilir.

type NarrativePresentationDelta = {
  sceneId: string

  mentionedEntityIds: string[]
  visibleEntityIds: string[]

  sceneLocalPositionChanges: Record<string, string>
  referencedFactIds: string[]

  unresolvedNarrativeThreads: string[]
}
151. Narrative thread

Küçük anlatısal konular izlenebilir.

Örnek:

Kapıdaki ay sembolü
Tilki’nin kaygısı
Baykuşun eksik hatırladığı rota

Bunlar quest olmak zorunda değildir.

Ama sahne içinde unutulmamalıdır.

152. Narrative thread lifecycle
type NarrativeThread = {
  id: string

  status:
    | "introduced"
    | "active"
    | "paused"
    | "resolved"
    | "discarded"

  canonicalSourceIds: string[]
  expectedResolutionScope: string
}

Narrative thread world truth üretmez; sunum takibidir.

153. Story Planner ile sınır

Story Planner:

ne olacak,
neden olacak,
hangi seçim sunulacak

kararını verir.

Narrative Renderer:

nasıl anlatılacak,
hangi cümle yapısı kullanılacak,
hangi metafor uygun,
diyalog nasıl ifade edilecek

kararını verir.

Bu iki görev karıştırılmamalıdır.

154. Renderer planı değiştiremez

Planner:

Tilki öneri sunacak.
Baykuş farklı görüş belirtecek.
Oyuncuya iki rota sunulacak.

dediyse renderer:

Baykuş tek başına karar verdi ve grup yola çıktı.

yazamaz.

155. Narrative event coverage

Scene plan’daki required event’lerin hepsi sunumda karşılanmalıdır.

type NarrativeCoverageResult = {
  requiredEventIds: string[]
  coveredEventIds: string[]
  missingEventIds: string[]

  coverageRatio: number
}
156. Aşırı event anlatımı

Her teknik event ayrı cümleye dönüşmemelidir.

Örnek event zinciri:

ITEM_RESERVED
ITEM_CONSUMED
CRAFT_OUTPUT_CREATED
QUEST_OBJECTIVE_UPDATED

Narrative:

Lumi, yaprakları ve ipi dikkatlice birleştirerek küçük bir yağmur örtüsü hazırladı.

Tek doğal sonuç cümlesi yeterlidir.

157. Event aggregation for narration
type NarrativeEventGroup = {
  groupType: string
  sourceEventIds: string[]

  narrativeIntent: string
  importance: number
}
158. Technical event suppression

Şunlar çocuk metnine doğrudan girmez:

version changed,
reservation released,
projection updated,
validation passed,
snapshot created.

Bunlar presentation context dışında kalır.

159. Narrative intent

LLM’ye doğrudan event listesi yerine narrative intent verilebilir.

type NarrativeIntent = {
  intentType:
    | "show_success"
    | "show_partial_success"
    | "show_discovery"
    | "show_waiting"
    | "offer_choice"
    | "show_world_change"
    | "show_character_reaction"

  subjectIds: string[]
  sourceEventIds: string[]

  requiredMeaning: string
  prohibitedImplications: string[]
}
160. Partial success anlatımı

System result:

crafting = partial
output = fragile umbrella

Narrative:

Yapraklar yağmurun çoğunu durduruyordu. Ama küçük örtü biraz hassastı; dikkatli taşınması gerekiyordu.

Narrative bunu tam başarı veya başarısızlık gibi göstermemelidir.

161. Fail Forward anlatımı

Başarısızlık:

çocuğu suçlamaz,
denemeyi değersizleştirmez,
yeni bilgi veya yol açar.

Örnek:

İp kısa kaldığı için örtü tam kapanmadı. Yine de hangi bölümün güçlendirilmesi gerektiğini artık biliyorlardı.

162. NPC reaction grounding

NPC’nin tepkisi:

emotion state,
relationship context,
belief,
kişilik

ile uyumlu olmalıdır.

Sistem yalnızca “hediye verildi” diye herkesin aşırı sevinmesini sağlamamalıdır.

163. Reaction intensity
type CharacterReactionProfile = {
  characterId: string

  eventId: string
  emotionVector: Record<string, number>

  expressionIntensity: number
  publicExpressionAllowed: boolean
}

Karakter duygusunu göstermeyebilir.

164. Subtle reaction

Denizci, eski pusulaya kısa bir süre baktı. Sonra onu iki eliyle dikkatlice aldı.

Bu, dramatik açıklama yapmadan duygusal anlam taşıyabilir.

Ancak altında gerçek memory veya emotional relevance olmalıdır.

165. Narrative ambiguity

Bazı durumlarda bilinmezlik bilinçli korunabilir.

Örnek:

Duvarın arkasından hafif bir ses geliyordu.

Bu:

gizli rota,
rüzgâr,
küçük hayvan

olabilir.

World truth bilinmesine rağmen player knowledge’a göre belirsiz sunulur.

166. Mystery fairness

Gizem için gerekli ipuçları:

önceden sunulmuş,
gözlemlenebilir,
yaşa uygun,
çözümü sonradan mantıklı kılan

olmalıdır.

Narrative finalde hiç gösterilmeyen bir ayrıntıyı çözüm olarak kullanmamalıdır.

167. Clue Registry
type NarrativeClue = {
  id: string

  targetMysteryId: string

  discoveryState:
    | "hidden"
    | "hinted"
    | "observed"
    | "understood"

  presentationForms: string[]

  sourceFactIds: string[]
}
168. Clue presentation variation

Aynı ipucu:

görsel,
diyalog,
ses,
item incelemesi,
harita sembolü

olarak sunulabilir.

Ama bir yüzeyde gösterilince discovery state güncellenmelidir.

169. Multimodal clue leak

Görsel model kapıdaki sembolü çok belirgin gösterirse, metinde karakterlerin henüz fark etmemiş olması tutarsız olabilir.

Görsel görünürlüğü de discovery event üretebilir veya görsel yeniden üretilmelidir.

170. Player observation authority

Ekranda açıkça görünen bir detay için:

player unknown

durumu korunamaz.

Bu nedenle görseller yalnızca dekor değildir; bilgi yüzeyidir.

171. Visual discovery policy
type VisualDiscoveryPolicy = {
  featureId: string

  visibilityInImage:
    | "hidden"
    | "background_ambiguous"
    | "visible"
    | "highlighted"

  triggersDiscoveryState?: string
}
172. Audio discovery

Bir ses de yeni bilgi verebilir.

Örnek:

Duvar arkasından su sesi

Bu route:

unknown → hinted

geçişi üretebilir.

Ses yalnızca atmosfer değil, kanonik gözlem olabilir.

173. Presentation-triggered command

Bir presentation artifact yeni gözlem sağlıyorsa doğrudan state değiştirmemelidir.

Akış:

Approved visual/audio contains discoverable feature
↓
OBSERVE_FEATURE command
↓
Discovery validation
↓
FEATURE_NOTICED event

Bu, sunum ve dünya state’ini tekrar eşitler.

174. Önceden commit edilmiş discovery

Daha basit ve güvenli yöntem:

Önce FEATURE_NOTICED commit edilir.
Sonra görsel ve metin bu keşfi sunar.

MVP için bu tercih edilmelidir.

175. LLM prompt assembly

Prompt tek büyük serbest metin olmamalıdır.

Bölümler:

Role
Scene objective
Canonical facts
Required events
Character voices
Player knowledge
Forbidden facts
Age and safety rules
Style
Length
Output schema
176. Structured output

Narrative model çıktısı JSON benzeri şemaya uymalıdır.

type GeneratedSceneDraft = {
  title?: string

  narrativeBlocks: {
    blockType: string
    text: string
    referencedFactIds: string[]
    referencedEventIds: string[]
  }[]

  dialogueTurns: {
    speakerCharacterId: string
    text: string
    referencedFactIds: string[]
  }[]

  endingMode: SceneEndingMode

  choicePresentation?: {
    choiceSetId: string
    optionLabels: Record<string, string>
  }
}
177. Serbest metin parsing riski

LLM yalnızca düz paragraf döndürürse:

konuşmacı ayırmak,
event grounding,
choice mapping,
block-level retry

zorlaşır.

Bu yüzden structured output önemlidir.

178. Output schema validation

Kontroller:

bilinmeyen character ID,
olmayan choice ID,
eksik required event,
boş metin,
yaş sınırını aşan uzunluk,
yasak ending mode.
179. Prompt injection sınırı

Çocuğun serbest metni doğrudan system prompt içine yerleştirilmemelidir.

Önce:

input normalization,
intent extraction,
safety classification,
entity resolution

uygulanmalıdır.

Raw input untrusted data olarak işaretlenmelidir.

180. Child input quotation

Çocuğun söylediği yaratıcı cümle hikâyeye eklenecekse:

anlamı korunur,
uygunsuz içerik filtrelenir,
karaktere yanlış atfedilmez,
canonical action sonucu ile uyumlu hâle getirilir.
181. Narrative style drift

Uzun hikâyede model stili değişebilir.

Bunu engellemek için:

style preset,
önceki onaylı sayfa örnekleri,
character voice summary,
sentence length metrics

kullanılabilir.

182. Style continuity state
type StoryStyleContinuity = {
  presetId: string

  averageSentenceLength: number
  dialogueRatio: number

  activeMetaphorStyleTags: string[]
  avoidedPatternIds: string[]

  narratorPerson: "first" | "second" | "third"
  narratorTense: string
}
183. Tense consistency

Aynı hikâye:

geçmiş zaman

ile başladıysa sebepsiz geniş zamana geçmemelidir.

Flashback gibi özel modlarda geçiş explicit olmalıdır.

184. Person consistency

Anlatıcı:

Lumi kapıya yaklaştı.

derken sonra:

Sen kapıya yaklaştın.

şeklinde sebepsiz değişmemelidir.

İkinci şahıs modu seçildiyse bütün hikâye buna göre üretilmelidir.

185. Character naming consistency

Karakter:

Yaşlı Denizci

olarak tanıtıldıysa bir sonraki sayfada:

Kaptan,
İhtiyar Adam,
Deniz Amca

şeklinde rastgele değişmemelidir.

Alias registry kullanılmalıdır.

186. Alias Registry
type EntityAlias = {
  entityId: string
  locale: string

  alias: string
  aliasType:
    | "primary"
    | "short"
    | "relationship_based"
    | "temporary"

  allowedSpeakerIds?: string[]
}

Örneğin yalnızca Tilki Denizci’ye “Kaptan Amca” diyebilir.

187. Name reveal

Bir karakterin gerçek adı henüz bilinmiyorsa narrator onu açıklamamalıdır.

Display state:

unknown:
Yaşlı Denizci

introduced:
Aras

relationship alias:
Kaptan Aras
188. Emotion words

Küçük yaşta duygular açıkça isimlendirilebilir.

Daha büyük yaşta davranışla gösterilebilir.

Ama emotion state yoksa güçlü duygu icat edilmemelidir.

189. Show and tell dengesi

Küçük yaş:

Tilki biraz endişelendi. Kulaklarını geriye doğru yatırdı.

Daha büyük yaş:

Tilki’nin kulakları geriye doğru indi. Kapıya yaklaşmadan önce bir kez daha çevresine baktı.

Her ikisi aynı emotion state’e dayanabilir.

190. Parent recap

Ebeveyn için ayrı narrative surface üretilebilir.

type ParentStorySummary = {
  storySessionId: string

  canonicalEventsSummary: string
  childChoiceSummary: string

  observedPreferenceSignals: string[]
  learningTopics: string[]

  unresolvedGoals: string[]
}

Bu özet çocuğa sunulan hikâye metni değildir.

191. Parent summary privacy

Çocuğun her cümlesi ebeveyn özetine taşınmamalıdır.

Yalnızca:

önemli seçimler,
genel ilgi sinyalleri,
öğrenme konuları,
açık güvenlik olayları

özetlenmelidir.

192. Narrative observability
type NarrativeGenerationTrace = {
  sceneId: string
  basedOnWorldVersion: number

  promptVersion: string
  modelId?: string

  requiredFactIds: string[]
  usedFactIds: string[]

  forbiddenFactChecks: string[]
  validationCodes: string[]

  retryCount: number
  fallbackUsed: boolean
}
193. Narrative quality metrics
Canonical Fact Accuracy
Required Event Coverage
Forbidden Knowledge Leak Rate
Character Voice Consistency
Age Suitability Pass Rate
Choice Clarity
Narrative Repetition Rate
Visual Continuity Pass Rate
Audio Parity Pass Rate
Fallback Rate
194. Human review tools

Geliştirici ekranında şu görünüm faydalıdır:

Sol:
canonical scene facts

Orta:
generated narrative

Sağ:
validation findings

Görseller için:

canonical visual traits,
produced image,
detected mismatch listesi.
195. Golden narrative tests

Belirli scene plan’lar için tek bir kesin metin beklemek doğru değildir.

Bunun yerine invariant test edilir:

Tilki kulede olmalı.
Fener Tilki’de olmalı.
Kapı açık denmemeli.
Gizli geçit açıklanmamalı.
İki geçerli seçenek sunulmalı.
Metin yaş profiline uygun olmalı.
196. Narrative property tests
Narrative, snapshot’ta olmayan karakteri içermez.
Konuşmacı sahnede bulunur.
Her choice ID geçerlidir.
Required canonical event en az bir blokta temsil edilir.
Forbidden fact hiçbir yüzeyde görünmez.
Player avatar oyuncu adına büyük karar vermez.
Visual prompt gizli entity içermez.
Audio cue active biome ve scene ile uyumludur.
197. Senaryo: Tilki’ye fener verme

Canonical events:

ITEM_TRANSFERRED
from = Lumi
to = Tilki

GIFT_INTERACTION_RECORDED

Narrative intent:

Transferi göster.
Tilki’nin tepkisini küçük ama anlamlı sun.
İlişkinin kesin arttığını söyleme.

Uygun anlatı:

Lumi mavi feneri Tilki’ye uzattı. Tilki feneri iki eliyle dikkatlice aldı.
“Kulede yolu birlikte aydınlatabiliriz,” dedi.

Uygun olmayan:

Tilki bu hediyeden sonra Lumi’ye sonsuza kadar güvenmeye karar verdi.

198. Senaryo: Gizli geçit ipucu

World truth:

hidden route exists
player discovery = hinted

Narrative:

Duvarın taşları arasından ince bir rüzgâr geliyordu.

Görsel:

duvar görünür,
kapı çizgisi açıkça görünmez,
birkaç yaprak hafifçe hareket edebilir.

Ses:

çok hafif rüzgâr.

Choice:

Duvarı incele
Baykuş’a sor
Önce haritaya bak
199. Senaryo: Yaralı Tilki iyileşti

Offline event:

CHARACTER_RECOVERED

Dönüş anlatısı:

Tilki artık patisine daha rahat basabiliyordu. Baykuşun hazırladığı yumuşak sargıyı hâlâ taşıyordu ama yürürken eskisi kadar yavaş değildi.

Görsel:

hafif sargı devam edebilir,
ağır yaralanma işareti olmamalı,
koşuyor gibi gösterilmemeli.
200. Senaryo: Köprü için partial success

Canonical result:

materials complete
design pending
quest stage not completed

Narrative:

Köprünün yanına yeterince tahta ve ip yığılmıştı. Köylüler hazırlığı tamamlamıştı, fakat iki farklı onarım planı vardı. Hangisinin kullanılacağına henüz karar verilmemişti.

Choice:

Sağlam taş destekli plan
Hafif ahşap geçit planı
Önce ikisini karşılaştır
201. Senaryo: Yaşa göre aynı sahne

Canonical event:

FALLEN_TREE_BLOCKED_ROUTE
5 yaş

Yolun önünde büyük bir ağaç vardı. Kimse zarar görmemişti ama yol kapanmıştı. Tilki ağacın çevresinde başka bir geçit aradı.

9 yaş

Fırtınada devrilen ağaç, patikanın tamamını kapatmıştı. Köklerin yanındaki toprak gevşek görünüyordu; ağacı hareket ettirmek yerine farklı bir yol bulmaları daha güvenli olabilirdi.

202. MVP Content Generation Engine

İlk sürüm için şu özellikler yeterlidir:

1. Canonical Narrative Input Package
2. Scene Plan tabanlı üretim
3. Required, supporting ve optional fact ayrımı
4. Forbidden knowledge listesi
5. Player-limited narrator
6. Yaş profiline göre dil ve uzunluk
7. Character Voice Profile
8. Character knowledge-aware dialogue
9. Player avatar agency koruması
10. Structured narrative output
11. Block-level grounding
12. Narrative claim validation
13. Choice presentation
14. Safe fallback templates
15. Canonical visual definitions
16. Structured illustration prompt
17. Visual continuity validation
18. Basit ambience ve sound effect cues
19. Multimodal parity validation
20. Approved presentation artifact persistence
203. MVP Narrative Input
type CoreNarrativeInput = {
  storySessionId: string
  sceneId: string

  basedOnWorldVersion: number

  sceneType: string
  scenePurpose: string

  requiredFacts: NarrativeFact[]
  supportingFacts: NarrativeFact[]

  participatingCharacterIds: string[]

  characterVoiceProfiles: CharacterVoiceProfile[]

  childNarrativeProfile: ChildNarrativeProfile

  forbiddenFacts: ForbiddenNarrativeFact[]

  choiceSetId?: string
}
204. MVP Narrative Output
type CoreNarrativeOutput = {
  sceneId: string
  basedOnWorldVersion: number

  blocks: {
    id: string
    type:
      | "narration"
      | "dialogue"
      | "transition"

    speakerCharacterId?: string
    text: string

    sourceFactIds: string[]
    sourceEventIds: string[]
  }[]

  choicePresentation?: ChoiceSetPresentation

  illustrationIntent?: IllustrationPromptPackage
  audioCueIntents?: AudioCueIntent[]

  validationStatus:
    | "pending"
    | "approved"
    | "rejected"
}
205. MVP ana işlemler
buildNarrativeInputPackage()

buildScenePlan()

filterVisibleFacts()

buildForbiddenKnowledgeSet()

resolveCharacterVoiceProfiles()

generateStructuredNarrativeDraft()

extractNarrativeClaims()

validateClaimGrounding()

validateCharacterKnowledge()

validatePlayerAgency()

validateAgeSuitability()

validateChoicePresentation()

buildIllustrationPrompt()

validateVisualContinuity()

buildAudioCues()

validateMultimodalParity()

persistApprovedPresentation()

buildFallbackNarrative()
206. Örnek orchestration
async function renderCommittedScene(
  sceneRequest: RenderSceneRequest
): Promise<CoreNarrativeOutput> {
  const snapshot =
    await loadStoryGenerationSnapshot({
      storySessionId: sceneRequest.storySessionId
    })

  const input = buildNarrativeInputPackage({
    snapshot,
    scenePlan: sceneRequest.scenePlan,
    committedEventIds:
      sceneRequest.committedEventIds
  })

  const draft =
    await generateStructuredNarrativeDraft(input)

  const findings = [
    ...validateOutputSchema(draft, input),
    ...validateRequiredFactCoverage(draft, input),
    ...validateNarrativeClaims(draft, input),
    ...validateForbiddenKnowledge(draft, input),
    ...validateCharacterVoices(draft, input),
    ...validateChildSuitability(draft, input),
    ...validateChoices(draft, input)
  ]

  if (hasBlockingFindings(findings)) {
    const revised =
      await reviseInvalidNarrativeBlocks({
        draft,
        findings,
        input
      })

    const revisedFindings =
      validateNarrativeOutput(revised, input)

    if (hasBlockingFindings(revisedFindings)) {
      return buildFallbackNarrative(input)
    }

    return persistApprovedNarrative(revised)
  }

  return persistApprovedNarrative(draft)
}
207. İlk sürümde yapılmaması gerekenler

Başlangıçta kaçınılması gerekenler:

LLM’ye bütün world state’i vermek,
“Bu olaylardan güzel bir hikâye yaz” şeklinde serbest prompt,
narrator’ın yeni dünya gerçeği üretmesi,
karakterlerin birbirinin bilgilerini otomatik bilmesi,
her sahnede bütün karakterleri konuşturmak,
çocuğun avatarına büyük kararlar verdirmek,
her paragraftan sonra seçim sunmak,
her sayfa için yeni görsel üretmek,
görsel modeli continuity referansı olmadan kullanmak,
gizli bilgileri yalnızca prompt uyarısıyla korumaya çalışmak,
TTS ve efektleri state’ten bağımsız üretmek,
geçmiş sayfaları world state değiştikçe yeniden yazmak,
validation olmadan token streaming yapmak,
teknik event’leri doğrudan çocuk metnine çevirmek.

MVP hedefi:

Kanonik olay doğru anlatılsın.
Karakterler kendileri gibi konuşsun.
Çocuk yalnızca bilmesi gerekenleri görsün.
Dil yaşa uygun olsun.
Seçenekler geçerli ve anlaşılır olsun.
Görsel, metin ve ses aynı dünyayı anlatsın.
Yaratıcı üretim başarısız olsa bile güvenli fallback bulunsun.
208. Content Generation, Narrative Rendering & Multimodal Consistency Engine temel ilkeleri
1. Yaratıcılık sunumda serbesttir; canonical gerçeklerde değildir.
2. Narrative Engine yalnızca commit edilmiş olayları anlatır.
3. Ham world state yerine filtrelenmiş Narrative Input Package kullanılır.
4. Required facts anlatıda kaybolamaz.
5. Forbidden knowledge metin, diyalog, seçim, görsel ve seste korunur.
6. Oyuncunun bildiği dünya ile sistemin bildiği dünya ayrıdır.
7. Karakter yalnızca bildiği veya inandığı şeyleri söyleyebilir.
8. Belief ve world truth dilde açıkça ayrılmalıdır.
9. Her karakterin tutarlı bir konuşma profili bulunmalıdır.
10. Character voice duyguyla değişebilir ama temel kimliğini korur.
11. Oyuncu avatarı oyuncu adına büyük karar veya güçlü duygu üretemez.
12. Presentation-level mikro eylemler world state’i değiştiremez.
13. Seçenekler canonical action ID’lerine bağlı olmalıdır.
14. Stale seçenekler uygulanmadan önce yeniden doğrulanır.
15. Yaşa uygunluk yalnızca kelime değil, olay ve yapı karmaşıklığıdır.
16. Gerilim child profile ve safety policy sınırında tutulur.
17. Yüksek gerilim sonrası recovery alanı sağlanır.
18. Faydalı tekrar ile yapay tekrar ayrılmalıdır.
19. Callback’ler gerçek memory ve event’lere dayanmalıdır.
20. Narrative claim’ler canonical facts ile doğrulanmalıdır.
21. Teknik domain event’leri doğal narrative intent gruplarına dönüştürülür.
22. Görsel modeller yeni karakter, eşya veya gizli bilgi ekleyemez.
23. Önemli entity’ler stable ve variable visual traits taşır.
24. Görselde görünmeyen item kaybolmuş sayılmaz.
25. Metin, görsel, ses ve seçim aynı scene package’a dayanmalıdır.
26. Görsel ve ses de bilgi sızıntısı üretebilir.
27. Onaylanmış presentation artifact’leri saklanır ve tekrar kullanılabilir.
28. Geçmiş hikâye sayfaları daha sonra yeniden yazılmaz.
29. Structured output, blok bazlı validation ve retry tercih edilir.
30. LLM başarısızlığında deterministic ve güvenli fallback kullanılmalıdır.

Content Generation, Narrative Rendering & Multimodal Consistency Engine’in kavramsal çekirdeği böylece tamamlandı.