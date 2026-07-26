Bu motorun görevi, üst katmanlarda planlanan anlatıyı gerçek kullanıcı içeriğine dönüştürmektir.

Üst motorlar şunları belirliyordu:

hangi arc ilerleyecek,
sahnenin amacı ne olacak,
hangi beat’ler gerçekleşecek,
hangi karakterler sahnede bulunacak,
hangi bilgi açıklanacak,
hangi seçim sunulacak.

Bu motor ise şu soruya cevap verir:

“Bütün bunlar çocuğa hangi kelimelerle, hangi anlatım biçimiyle ve karakterlerin kendine özgü sesleri korunarak nasıl aktarılacak?”

Bu nedenle motor yalnızca bir “metin üretici” değildir. Aynı zamanda:

dil seviyesi denetleyicisi,
karakter sesi koruyucusu,
diyalog düzenleyicisi,
anlatıcı biçemi yöneticisi,
tekrar önleyici,
okunabilirlik doğrulayıcısı,
duygusal ton dönüştürücüsü

olarak çalışmalıdır.

1. Plan ile metin ayrımı

Scene Planner şunu üretir:

Beat amacı:
Tilki, Lila’yı kırık köprü konusunda uyarmalı.

Duygusal durum:
Tilki endişeli ama panik içinde değil.

Bilgi:
Köprünün ortasındaki iki tahta çürümüş.

İlişki amacı:
Tilkinin Lila’yı korumaya çalıştığı hissedilmeli.

Narrative Generation Engine bunu gerçek içeriğe dönüştürür:

Tilki birden Lila’nın önüne geçti.
“Bir dakika,” dedi ve burnunu köprüye doğru uzattı. “Ortadaki tahtalar sağlam görünmüyor.”

Plan ile metni ayırmak önemlidir. Çünkü aynı plan:

farklı yaş gruplarına,
farklı anlatım tonlarına,
farklı uzunluklara,
sesli veya sessiz kullanım biçimlerine

göre başka şekilde ifade edilebilir.

2. Motorun ana çıktı türleri

Bu motor yalnızca anlatı paragrafı üretmez.

type GeneratedNarrativeContent =
  | "NARRATION"
  | "CHARACTER_DIALOGUE"
  | "INTERNAL_THOUGHT"
  | "INTERACTION_PROMPT"
  | "CHOICE_LABEL"
  | "CHOICE_DESCRIPTION"
  | "TRANSITION_TEXT"
  | "RECAP"
  | "STORY_SUMMARY"
  | "REFLECTION_QUESTION"
  | "COMPREHENSION_QUESTION"
  | "PARENT_GUIDANCE"
  | "ITEM_DESCRIPTION"
  | "LOCATION_DESCRIPTION"
  | "CHARACTER_INTRODUCTION"
  | "SYSTEM_RECOVERY_TEXT";

Her çıktı türünün kendi dil kuralları olmalıdır.

Örneğin bir seçim etiketi kısa olmalıdır:

Tilkiye yardım et

Ama seçim açıklaması biraz daha ayrıntılı olabilir:

Lila önce tilkinin yarasına bakar ve yolculuğa sonra devam eder.
3. Generation Request modeli

Narrative Engine’e doğrudan “bir sahne yaz” denmemelidir.

Yapılandırılmış bir üretim isteği verilmelidir.

interface NarrativeGenerationRequest {
  requestId: string;

  storyId: string;
  storyRunId: string;
  sceneId: string;
  beatId?: string;

  contentType: GeneratedNarrativeContent;

  narrativeIntent: NarrativeIntent;
  contextBundle: NarrativeContextBundle;

  audienceProfile: AudienceLanguageProfile;
  styleProfile: NarrativeStyleProfile;

  characterVoiceProfiles: CharacterVoiceProfile[];

  lengthBudget: LengthBudget;
  continuityConstraints: ContinuityConstraint[];
  safetyConstraints: SafetyConstraint[];

  forbiddenContent: string[];
  requiredContent: string[];

  outputFormat: NarrativeOutputFormat;
}

Bu yapı üretimin kontrol edilebilir ve doğrulanabilir olmasını sağlar.

4. Narrative Intent

Metnin ne anlatacağı kadar ne işe yarayacağı da belirtilmelidir.

interface NarrativeIntent {
  primaryPurpose:
    | "INFORM"
    | "BUILD_CURIOSITY"
    | "BUILD_TENSION"
    | "REASSURE"
    | "DEVELOP_RELATIONSHIP"
    | "REVEAL_INFORMATION"
    | "PREPARE_CHOICE"
    | "SHOW_CONSEQUENCE"
    | "CREATE_HUMOR"
    | "SUPPORT_REFLECTION"
    | "TRANSITION"
    | "CLOSE_SCENE";

  emotionalDirection: string;
  expectedChildUnderstanding: string;

  requiredStateChange?: string;
  requiredInformation?: string[];

  avoidExplicitExplanation?: boolean;
  showThroughAction?: boolean;
}

Örneğin:

{
  "primaryPurpose": "DEVELOP_RELATIONSHIP",
  "emotionalDirection": "Tilkinin Lila'yı koruduğunu sıcak biçimde göster",
  "expectedChildUnderstanding": "Tilki Lila'yı önemsiyor",
  "showThroughAction": true,
  "avoidExplicitExplanation": true
}

Motorun şunu yazması istenmez:

Tilki Lila’yı önemsiyordu.

Bunun yerine davranışla göstermesi istenir:

Tilki, sallanan tahtaya önce kendi patisini uzattı. Sonra Lila’ya dönüp başını iki yana salladı.

Bu, daha doğal ve güçlü bir anlatımdır.

5. Narrative Context Bundle

Metin üreticisine sınırsız dünya hafızası verilmemelidir.

Yalnızca ilgili bağlam sunulmalıdır.

interface NarrativeContextBundle {
  currentScene: SceneContext;
  currentBeat: BeatContext;

  recentNarrative: RecentNarrativeContext;

  activeCharacters: CharacterNarrativeContext[];
  relevantRelationships: RelationshipNarrativeContext[];

  relevantWorldFacts: WorldFact[];
  relevantMemories: MemoryReference[];

  activeHooks: NarrativeHookContext[];
  activePromises: NarrativePromiseContext[];

  currentInventory: ItemNarrativeContext[];

  childRelevantPreferences: string[];

  knownFactsByCharacter: CharacterKnowledgeContext[];

  forbiddenKnowledgeByCharacter: CharacterKnowledgeRestriction[];
}

Bu yaklaşım hem maliyeti hem de hata riskini azaltır.

6. Karakter bilgisi sınırı

Her karakter yalnızca bildiği şeylere göre konuşmalıdır.

Örneğin sistem biliyor olabilir:

Eski fener, gizli su yollarını gösteriyor.

Ancak tilki bunu henüz bilmiyorsa şöyle konuşamaz:

“Bu fener kesinlikle eski su yollarını gösteriyor.”

Bunun yerine:

“Fener suya yaklaştığımızda daha parlak yanıyor olabilir,” dedi tilki.

Bu nedenle her karakter için bilgi erişimi ayrı tutulmalıdır.

interface CharacterKnowledgeContext {
  characterId: string;

  confirmedKnowledge: string[];
  suspectedKnowledge: string[];
  misunderstoodKnowledge: string[];
  secretsKnown: string[];
  forbiddenReveals: string[];
}
7. Audience Language Profile

Yaşa uygunluk yalnızca kelime sayısı değildir.

interface AudienceLanguageProfile {
  ageRange: {
    minimum: number;
    maximum: number;
  };

  readingLevel:
    | "PRE_READER"
    | "EARLY_READER"
    | "DEVELOPING_READER"
    | "INDEPENDENT_READER"
    | "ADVANCED_READER";

  vocabularyComplexity: number;
  sentenceComplexity: number;
  conceptComplexity: number;

  preferredSentenceLength: {
    minimumWords: number;
    targetWords: number;
    maximumWords: number;
  };

  maximumNewConceptsPerScene: number;

  allowFigurativeLanguage: boolean;
  metaphorDensity: number;

  repetitionSupportLevel: number;
  dialoguePreference: number;

  narrationToDialogueRatio: number;

  explanationDirectness: number;
}
8. Yaşa uygun dil katmanları
4–6 yaş

Özellikler:

kısa cümleler,
somut ifadeler,
açık eylemler,
az karakter,
sınırlı yeni kelime,
sık ama doğal tekrar,
duyguların anlaşılır gösterimi.

Örnek:

Köprü sallandı.
Lila hemen durdu.
Tilki, “Yavaş,” dedi. “Tahtalar eski olabilir.”

7–9 yaş

Özellikler:

biraz daha uzun cümleler,
sebep-sonuç bağlantıları,
daha çok duygu ayrıntısı,
kontrollü benzetmeler,
daha karmaşık seçimler.

Örnek:

Lila ilk adımını attığında köprü hafifçe gıcırdadı. Tilki kulaklarını dikti ve tahtaların arasına dikkatle baktı.

10 yaş ve üzeri

Özellikler:

daha çok içsel düşünce,
dolaylı anlatım,
çok katmanlı motivasyon,
daha gelişmiş metaforlar,
daha uzun diyalog dönüşleri.

Ancak yaş yükseldikçe dil otomatik olarak ağırlaşmamalıdır. Hikâyenin tonu ve çocuğun bireysel tercihleri de önemlidir.

9. Basitleştirme, çocuklaştırma değildir

Yaşa uygunluk adına metni anlamsız derecede basitleştirmemeliyiz.

Yanlış:

Lila gitti. Tilki geldi. Köprü kötüydü. Korktular.

Daha iyi:

Lila köprüye yaklaştı. Tahtalardan biri eğilmişti. Tilki sessizce onun önüne geçti.

İkinci metin hâlâ basittir ama atmosfer ve ilişki taşır.

10. Vocabulary Policy

Her hikâyede az sayıda yeni kelime bulunabilir.

interface VocabularyPolicy {
  familiarWordRatio: number;
  maximumNewWordsPerScene: number;

  allowContextualLearning: boolean;
  repeatNewWordsAcrossStory: boolean;

  explainNewWordsDirectly: boolean;
  explainThroughContext: boolean;

  avoidWords: string[];
  preferredWords: string[];
}

Örneğin yeni kelime:

pusula

Doğrudan sözlük gibi açıklamak yerine bağlamla öğretilebilir:

Denizci küçük pusulayı avucuna aldı. İğne her döndüğünde yeniden kuzeyi gösteriyordu.

Çocuk anlamı sahneden çıkarabilir.

11. Character Voice Profile

Her önemli karakterin kendine özgü konuşma biçimi olmalıdır.

interface CharacterVoiceProfile {
  characterId: string;

  speechStyle:
    | "DIRECT"
    | "GENTLE"
    | "PLAYFUL"
    | "FORMAL"
    | "CURIOUS"
    | "CAUTIOUS"
    | "WISE"
    | "ENERGETIC"
    | "RESERVED";

  sentenceLengthPreference: number;
  vocabularyLevel: number;

  humorStyle?: string;
  metaphorPreference?: number;

  emotionalExpressiveness: number;
  directness: number;
  politeness: number;
  confidence: number;

  recurringSpeechPatterns: string[];
  prohibitedSpeechPatterns: string[];

  commonAddressTerms: string[];

  asksQuestionsOften: boolean;
  interruptsOthers: boolean;
  speaksInCompleteSentences: boolean;

  dialectPolicy?: DialectPolicy;

  voiceExamples: VoiceExample[];
}
12. Voice Profile örneği

Tilki:

{
  "speechStyle": "CAUTIOUS",
  "sentenceLengthPreference": 0.35,
  "vocabularyLevel": 0.40,
  "emotionalExpressiveness": 0.45,
  "directness": 0.70,
  "politeness": 0.65,
  "confidence": 0.60,
  "recurringSpeechPatterns": [
    "Önce çevreyi kontrol eder",
    "Kesin konuşmak yerine ihtimal belirtir",
    "Tehlike olduğunda kısa cümleler kurar"
  ],
  "prohibitedSpeechPatterns": [
    "Uzun şiirsel konuşmalar",
    "Bilmediği konularda kesin ifadeler",
    "Çocuğu küçümseyen ifadeler"
  ],
  "asksQuestionsOften": false,
  "interruptsOthers": false,
  "speaksInCompleteSentences": true
}

Lila:

{
  "speechStyle": "CURIOUS",
  "sentenceLengthPreference": 0.45,
  "vocabularyLevel": 0.45,
  "emotionalExpressiveness": 0.75,
  "directness": 0.65,
  "politeness": 0.70,
  "confidence": 0.55,
  "recurringSpeechPatterns": [
    "Merak ettiğinde doğrudan soru sorar",
    "Yeni fikirleri yüksek sesle düşünür",
    "Korktuğunda bunu tamamen saklayamaz"
  ],
  "asksQuestionsOften": true
}
13. Ses tutarlılığı örneği

Aynı olay karşısında karakterler farklı konuşmalıdır.

Lila

“Belki aşağıda başka bir yol vardır. Biraz bakabiliriz, değil mi?”

Tilki

“Olabilir. Ama önce taşların sağlam olup olmadığını kontrol edelim.”

Enerjik kuş karakteri

“Aşağı mı? Harika! Ben yukarıdan bakarım, siz de aşağıdan bakarsınız!”

Aynı bilgiyi taşısalar bile sesleri farklıdır.

14. Voice Fingerprint

Karakter sesi yalnızca birkaç sıfatla korunamayabilir.

Bu nedenle örnek konuşmalardan bir ses parmak izi çıkarılabilir.

interface VoiceFingerprint {
  averageSentenceLength: number;
  questionFrequency: number;
  exclamationFrequency: number;

  preferredVerbTypes: string[];
  preferredEmotionWords: string[];

  certaintyLanguageFrequency: number;
  hedgingLanguageFrequency: number;

  humorFrequency: number;
  metaphorFrequency: number;

  firstPersonFrequency: number;
  addressFrequency: number;

  characteristicPhrases: string[];
}

Bu profil üretim sonrası doğrulamada kullanılabilir.

15. Karakterlerin sloganlaşmasını önleme

Tekrarlanan konuşma alışkanlıkları karakteri tanınır kılabilir. Ancak çok sık kullanılırsa karakter bir slogana dönüşür.

Örneğin bir karakterin her sahnede:

“Bence önce düşünmeliyiz.”

demesi yapay hissettirir.

Bu nedenle tekrar eden ifadeler için kullanım sınırı gerekir.

interface SignaturePhrasePolicy {
  phrase: string;
  minimumScenesBetweenUses: number;
  maximumUsesPerStory: number;
  contextRequired: string[];
}
16. Dialogue Function

Her diyalog cümlesinin bir anlatısal işlevi olmalıdır.

type DialogueFunction =
  | "INFORM"
  | "QUESTION"
  | "REACT"
  | "REASSURE"
  | "CHALLENGE"
  | "DISAGREE"
  | "REVEAL"
  | "HIDE"
  | "DEFLECT"
  | "HUMOR"
  | "CONNECT"
  | "REQUEST"
  | "WARN"
  | "REFLECT"
  | "DECIDE";

Bir diyalog dönüşü yalnızca bilgi tekrarı yapıyorsa gereksiz olabilir.

Yanlış:

“Köprü kırık,” dedi Lila.
“Evet, köprü kırık,” dedi tilki.

Daha iyi:

“Köprü kırık,” dedi Lila.
Tilki aşağıdaki dereyi işaret etti. “O zaman başka bir yol bulmalıyız.”

İkinci karakter konuşmayı ilerletir.

17. Dialogue Turn modeli
interface DialogueTurn {
  id: string;

  speakerCharacterId: string;
  listenerCharacterIds: string[];

  function: DialogueFunction;

  intendedMeaning: string;
  hiddenMeaning?: string;

  emotionalState: EmotionVector;

  knowledgeUsed: string[];

  text: string;

  interruptionPolicy?: string;
  followUpExpectation?: string;

  voiceConsistencyScore?: number;
}
18. Alt metin

Daha büyük çocuklara yönelik hikâyelerde karakter her şeyi açıkça söylemeyebilir.

Örneğin tilki:

“Ben eski kuleye gitmesek daha iyi olur diye düşünmüştüm.”

Görünen anlam:

Kuleye gitmek istemiyor.

Alt anlam:

Kuleyle ilgili geçmişinden dolayı korkuyor.
interface SubtextLayer {
  surfaceMeaning: string;
  actualMeaning: string;

  intendedChildAwareness: number;
  revealLater: boolean;
}

Küçük yaşlarda alt metin daha hafif ve anlaşılır olmalıdır.

19. Dialogue Balance

Bir sahne yalnızca konuşmalardan oluşmamalıdır.

Diyaloglar arasında şunlar bulunmalıdır:

hareket,
mimik,
çevre tepkisi,
sessizlik,
küçük fiziksel davranış,
içsel tepki.

Örnek:

“Buradan geçebiliriz,” dedi Lila.
Tilki cevap vermedi. Ön patisini tahtaya bastırdı. Tahta hemen aşağı doğru eğildi.
“Belki de geçemeyiz,” dedi Lila.

Burada ikinci cümle söylemeden gösterir.

20. Dialogue Tag Policy

Sürekli “dedi” kullanımı monoton olabilir. Ancak her cümlede süslü konuşma fiilleri kullanmak da yapaydır.

Doğal dağılım:

dedi
sordu
fısıldadı
seslendi
karşılık verdi

Fakat konuşma fiili yerine eylem de kullanılabilir:

Lila feneri yukarı kaldırdı. “Işık bu tarafta daha güçlü.”

Bu yöntem sahneyi canlı tutar.

21. Anlatıcı sesi

Anlatıcının da bir ses profili olmalıdır.

interface NarratorVoiceProfile {
  perspective: NarrativePerspective;

  warmth: number;
  playfulness: number;
  poeticness: number;
  directness: number;
  suspenseLevel: number;
  emotionalDistance: number;

  addressesChildDirectly: boolean;
  explainsCharacterEmotions: boolean;
  asksRhetoricalQuestions: boolean;

  descriptionDensity: number;
  sensoryDetailDensity: number;

  prohibitedNarratorBehaviors: string[];
}
22. Anlatıcının görev sınırı

Anlatıcı her şeyi açıklamamalıdır.

Yanlış:

Lila korkmuştu çünkü köprü kırılabilirdi ve tilkiye güvenip güvenemeyeceğini bilmiyordu.

Daha iyi:

Köprü gıcırdadığında Lila’nın eli fenerin sapında sıkılaştı. Tilkiye baktı ama ilk adımı atmadı.

İkinci örnek duyguyu davranışla gösterir.

Ancak küçük çocuklarda tamamen dolaylı anlatım da karışıklık yaratabilir.

Dengeli sürüm:

Köprü gıcırdadığında Lila biraz korktu. Fenerin sapını sıkıca tuttu ve tilkiye baktı.

Bu nedenle gösterme ve açıklama oranı yaşa göre ayarlanmalıdır.

23. Show–Tell Balance
interface ShowTellProfile {
  showThroughAction: number;
  explainDirectly: number;
  inferEmotion: number;
  labelEmotion: number;
}

Örnek:

Küçük çocuk
labelEmotion: yüksek
showThroughAction: orta

Lila endişelendi. Tilkinin yanına biraz daha yaklaştı.

Daha büyük çocuk
labelEmotion: düşük
showThroughAction: yüksek

Lila konuşmadan tilkinin yanına geçti ve adımlarını onun adımlarına uydurdu.

24. Duygusal dil

Duygular yalnızca mutlu, üzgün, korkmuş biçiminde yazılmamalıdır.

Motor daha ayrıntılı ama yaşa uygun duygusal ifadeler kullanabilir:

meraklı
kararsız
rahatlamış
gururlu
şaşırmış
utangaç
hayal kırıklığına uğramış
tedirgin
yalnız hissetmiş
umutlu

Ancak çocuğa psikolojik teşhis dili kullanılmamalıdır.

Yanlış:

Lila travmatik bir tepki verdi.

Doğru:

Lila ani sesten sonra bir süre konuşamadı ve tilkinin yanından ayrılmadı.

25. Emotional Continuity

Karakterin duygusu bir cümlede aniden değişmemelidir.

Yanlış:

Lila çok korktu.
Bir sonraki cümlede neşeyle şarkı söyledi.

Arada duygusal geçiş gerekir:

Lila çok korktu.
Tilki gizli geçidin güvenli olduğunu gösterdi.
Lila derin bir nefes aldı.
Biraz sonra yürürken eski şarkısını mırıldanmaya başladı.
interface EmotionalTransitionRequirement {
  fromEmotion: EmotionVector;
  toEmotion: EmotionVector;

  requiredBridgeIntensity: number;
  minimumTransitionBeats: number;
}
26. Ton profili

Her sahnenin bir ton profili olabilir.

interface ToneProfile {
  primaryTone:
    | "WARM"
    | "ADVENTUROUS"
    | "MYSTERIOUS"
    | "PLAYFUL"
    | "CALM"
    | "HOPEFUL"
    | "REFLECTIVE"
    | "TENSE"
    | "MELANCHOLIC";

  secondaryTones: string[];

  maximumFearIntensity: number;
  maximumSadnessIntensity: number;

  humorFrequency: number;
  reassuranceFrequency: number;

  endingTone: string;
}

Motor sahne boyunca tonun sınırlarını korumalıdır.

27. Ton kayması kontrolü

LLM üretiminde metin bazen istemeden ton değiştirebilir.

Örneğin sıcak bir macera sahnesi bir anda:

aşırı karanlık,
alaycı,
yetişkinlere yönelik,
korku türüne yakın

hale gelebilir.

Bu nedenle her çıktı için ton doğrulaması yapılmalıdır.

interface ToneConsistencyVector {
  warmth: number;
  danger: number;
  humor: number;
  mystery: number;
  sadness: number;
  hope: number;
  ageSuitability: number;
}
28. Korku dili politikası

Çocuk hikâyelerinde gerilim olabilir fakat yoğun korku dili kontrollü olmalıdır.

Kaçınılması gerekenler:

uzun süreli çaresizlik,
grafik yaralanma,
kaçışsız tehdit,
karakterin terk edilmesi korkusunun yoğun kullanımı,
karanlıkta uzun süre yalnız kalma,
ağır ölüm tehdidi.

Bunun yerine:

merak,
bilinmezlik,
kısa süreli tedirginlik,
çözüm ihtimali,
yanında güvenilir karakter,
görünür kaçış yolu

kullanılabilir.

Yanlış:

Karanlığın içinden korkunç bir yaratık çıkıp onları sonsuza kadar orada tutmak istedi.

Daha uygun:

Mağaranın içinden büyük bir gölge geçti. Tilki hemen Lila’nın yanına geldi. Gölgenin ne olduğunu anlamak için biraz daha ışığa ihtiyaçları vardı.

29. Mizah motoru

Mizah rastgele şaka eklemek değildir.

Mizah türleri:

type HumorType =
  | "CHARACTER_BEHAVIOR"
  | "WORDPLAY"
  | "SURPRISE"
  | "GENTLE_EXAGGERATION"
  | "MISUNDERSTANDING"
  | "VISUAL_HUMOR"
  | "CALLBACK";

Çocuk hikâyelerinde güvenli mizah:

karakterin sakarlığı,
hayvan davranışı,
beklenmedik ama zararsız sonuç,
daha önceki olaya küçük gönderme

olabilir.

Kaçınılması gerekenler:

utandırma,
dış görünüşle alay,
korkuyla dalga geçme,
başarısızlığı küçümseme,
başka karakteri aptal gösterme.
30. Callback Dialogue

Eski olaylara küçük göndermeler karakter bağını güçlendirebilir.

Örnek:

Daha önce tilki yağmurdan kaçarken çamura düşmüş olsun.

Sonraki hikâyede:

Tilki çamurlu patikaya baktı. “Bu yolu daha önce denedim,” dedi. “Patika beni pek sevmiyor.”

Bu hem mizah hem de hafıza hissi oluşturur.

31. Metin uzunluk bütçesi

Her içerik türü ayrı uzunluk sınırına sahip olmalıdır.

interface LengthBudget {
  minimumWords?: number;
  targetWords?: number;
  maximumWords?: number;

  maximumSentences?: number;
  maximumParagraphs?: number;

  maximumDialogueTurns?: number;
  maximumCharactersPerChoiceLabel?: number;
}

Örnek:

Beat anlatımı:
20–80 kelime

Karakter diyaloğu:
1–3 cümle

Seçim etiketi:
2–7 kelime

Seçim açıklaması:
1 kısa cümle

Recap:
30–100 kelime
32. Playback için yazma

Ekranda okunacak metin ile sesli okunacak metin aynı olmak zorunda değildir.

Sesli anlatım için:

uzun iç içe cümlelerden kaçınılmalı,
telaffuzu zor özel isimler sınırlandırılmalı,
konuşmacı değişimleri net olmalı,
duraklama noktaları doğru yerleştirilmeli,
görsele bağımlı belirsiz ifadeler azaltılmalı.

Örneğin ekran üzerinde:

Lila onu işaret etti.

Sesli anlatımda daha açık olması gerekebilir:

Lila, köprünün altındaki taş geçidi işaret etti.

33. Display Text ve Spoken Text
interface NarrativeOutput {
  displayText: string;
  spokenText?: string;

  speakerId?: string;

  pronunciationHints?: PronunciationHint[];
  pauseMarkers?: PauseMarker[];

  emphasisMarkers?: EmphasisMarker[];

  visualReferences?: string[];
}

Bu ayrım TTS entegrasyonunda faydalı olur.

34. Pronunciation Dictionary

Özel isimler ve fantastik kelimeler için telaffuz bilgisi gerekebilir.

interface PronunciationHint {
  term: string;
  phoneticForm: string;
  language: string;
}

Örneğin:

LUMI
Lumira
Aelora
Zefir Vadisi

TTS sağlayıcısı değişse bile aynı telaffuz sözlüğü kullanılabilir.

35. Dialogue Timing Metadata

Diyalog üretimi yalnızca metin döndürmemelidir.

interface DialoguePlaybackMetadata {
  estimatedDurationMs: number;

  pauseBeforeMs: number;
  pauseAfterMs: number;

  interruptible: boolean;

  emotionalDelivery:
    | "NEUTRAL"
    | "WARM"
    | "EXCITED"
    | "CAUTIOUS"
    | "WHISPERED"
    | "SAD"
    | "RELIEVED";

  overlapAllowed: boolean;
}

Bu bilgiler Playback Orchestrator tarafından kullanılabilir.

36. Interaction Prompt dili

Etkileşim soruları form dili gibi görünmemelidir.

Zayıf:

Bir seçenek belirleyiniz.

Daha doğal:

Lila şimdi ne yapmalı?

Ya da:

Sence önce köprüyü mü inceleyelim, yoksa aşağıdaki yolu mu?

Prompt çocuğa karar alanı açmalı fakat baskı kurmamalıdır.

37. Seçim etiketi kuralları

Seçenekler:

kısa,
olumlu eylem biçiminde,
birbirinden açıkça farklı,
yargılamayan,
olası sonucu aşırı gizlemeyen

olmalıdır.

Yanlış:

Doğru olanı yap
Bencil davran

Bu seçenekler çocuğu yönlendirir ve yargılar.

Daha iyi:

Tilkiye yardım et
Önce köye haber ver

Her iki seçeneğin de makul bir nedeni olabilir.

38. Seçimlerin dilsel simetrisi

Seçeneklerden biri çok sıcak, diğeri soğuk yazılırsa seçim manipüle edilir.

Yanlış:

Yaralı ve yalnız tilkiye sevgiyle yardım et
Yoluna devam et

Daha dengeli:

Tilkiye yardım etmek için dur
Önce köye ulaşmayı seç

Her iki seçeneğin dili benzer ağırlıkta olmalıdır.

39. Consequence Text

Seçim sonucu yalnızca teknik sonucu söylememelidir.

Zayıf:

Tilki güveni 10 arttı.

Kullanıcıya gösterilecek anlatı:

Tilki önce şaşkınlıkla Lila’ya baktı. Sonra başını yavaşça onun eline yaklaştırdı.

Teknik durum arka planda uygulanır.

40. Immediate Feedback

Her önemli seçimden sonra çocuğun kararının fark edildiği gösterilmelidir.

Bu geri bildirim üç katmanlı olabilir:

1. Görsel tepki
2. Karakter tepkisi
3. Anlatısal sonuç

Örnek:

Tilkinin kulakları doğrulur.
“Gerçekten kalacak mısın?” diye sorar.
Lila çantasından temiz mendili çıkarır.

Bu, seçimin etkili olduğu hissini verir.

41. Narrative Recovery Text

Teknik bir sorun veya tutarsızlık olduğunda sistem doğal metin üretmelidir.

Örnek durum:

uygulama yarıda kapandı,
aynı cümle tekrar oynatılacak,
seçenek artık geçersiz,
karakter sahnede bulunmuyor.

Kullanıcıya:

Bir hata oluştu. Kod: 409.

gösterilmemelidir.

Doğal kurtarma:

Lila bir an durup çevresine yeniden baktı. Az önce düşündüğü yol artık açık görünmüyordu. Başka bir yol seçmesi gerekecekti.

Bu metin teknik durumu anlatıya bağlar.

42. Recap üretimi

Recap, eski metnin kısaltılması değildir.

İyi recap şunları seçer:

ana hedef,
önemli seçim,
ilişki değişimi,
kazanılan veya kaybedilen eşya,
şu anki konum,
açık soru.
interface RecapIntent {
  targetLength: number;

  includeGoal: boolean;
  includeImportantChoices: boolean;
  includeRelationshipChanges: boolean;
  includeInventoryChanges: boolean;
  includeOpenHook: boolean;

  emotionalTone: string;
}

Örnek:

Geçen sefer Lila, yaralı tilkiye yardım etmişti. Tilki de ona sisli köprünün altındaki gizli yolu göstermişti. Şimdi ikisi, parlayan fenerin onları neden eski değirmene götürdüğünü anlamaya çalışıyor.

43. Tekrar anlatım çeşitliliği

Aynı recap her oturumda birebir tekrar edilmemelidir.

Ancak bilgi de değişmemelidir.

Versiyonlar:

Geçen maceramızda...
En son Lila...
Hatırlıyor musun? Lila ve tilki...

Bu yüzey çeşitliliği sağlar.

Fakat özetin gerçekleri sabit kalmalıdır.

44. Reflection Questions

Hikâye sonu soruları sınav gibi görünmemelidir.

Türler:

type ReflectionQuestionType =
  | "EMOTION"
  | "PERSPECTIVE"
  | "CHOICE_REASONING"
  | "IMAGINATION"
  | "PERSONAL_CONNECTION"
  | "ALTERNATIVE_ACTION";

Örnek:

“Sence tilki neden önce konuşmak istemedi?”
“Lila’nın yerinde olsaydın hangi yolu seçerdin?”
“Tilki kendini daha güvende hissetmek için neye ihtiyaç duymuş olabilir?”
“Fener başka bir renk yansaydı sence neyi gösterirdi?”
45. Comprehension Questions

Anlama soruları doğrudan hikâyedeki bilgiyi kontrol eder.

Örnek:

“Köprünün neden güvenli olmadığını nasıl anladılar?”
“Tilki hangi yolu biliyordu?”
“Lila çantasından ne çıkardı?”

Bu soruların sayısı sınırlı tutulmalıdır.

Sistem her hikâyeyi teste dönüştürmemelidir.

46. Parent Guidance dili

Ebeveyn metinleri çocuk anlatısından farklı olmalıdır.

Çocuk için:

“Tilki biraz endişeli görünüyor. Sence ona ne söyleyebiliriz?”

Ebeveyn için:

“Bu sahne, çocuğunuzla yardım isteme ve güven duygusu hakkında konuşmak için kullanılabilir. Tek bir doğru cevap aramak yerine karakterlerin farklı ihtiyaçlarını konuşabilirsiniz.”

Parent Guidance:

yargılayıcı olmamalı,
teşhis koymamalı,
çocuğun cevabını sınıflandırmamalı,
açık uçlu konuşma önerileri sunmalıdır.
47. Narrative Canonicalization

Metin üretildikten sonra olayların kanonik anlamı çıkarılmalıdır.

Örneğin üretilen metin:

Tilki, Lila’nın uzattığı mendili kabul etti ve ilk kez ona yaklaşmasına izin verdi.

Canonical event:

{
  "eventType": "RELATIONSHIP_TRUST_SIGNAL",
  "actor": "fox",
  "target": "lila",
  "acceptedHelp": true,
  "trustDelta": 0.08
}

Metin ile dünya durumu çift yönlü doğrulanmalıdır.

Üretici metinde uygulama planında olmayan bir olay uydurmamalıdır.

48. Hallucinated Action Detection

Narrative Generator bazen planlanmayan eylemler ekleyebilir.

Örnek:

karaktere yeni eşya verir,
var olmayan karakteri sahneye sokar,
karakteri yaralar,
gizli bilgiyi açıklar,
bölgenin fiziksel durumunu değiştirir.

Bu nedenle metin sonrası olay çıkarımı yapılarak Scene Contract ile karşılaştırılmalıdır.

interface GeneratedActionValidation {
  extractedActions: NarrativeAction[];

  allowedActions: NarrativeAction[];
  unauthorizedActions: NarrativeAction[];

  requiresRegeneration: boolean;
}
49. Continuity Constraint
interface ContinuityConstraint {
  type:
    | "CHARACTER_LOCATION"
    | "CHARACTER_KNOWLEDGE"
    | "INVENTORY"
    | "RELATIONSHIP"
    | "WORLD_STATE"
    | "TIME"
    | "PHYSICAL_CONDITION"
    | "PROMISE"
    | "TONE";

  description: string;
  severity: "SOFT" | "HARD";
}

Hard constraint ihlal edilirse metin kabul edilmez.

Örnek:

Tilki yaralı bacağını kullanarak hızlıca ağaca tırmanamaz.

Soft constraint:

Tilki genellikle uzun konuşmaz.

Soft ihlal düzenlenebilir; hard ihlal yeniden üretim gerektirir.

50. Style Profile
interface NarrativeStyleProfile {
  proseStyle:
    | "CLEAR"
    | "LYRICAL"
    | "PLAYFUL"
    | "CINEMATIC"
    | "GENTLE"
    | "CONVERSATIONAL";

  descriptionDensity: number;
  dialogueDensity: number;
  actionDensity: number;

  sensoryDetailLevel: number;
  figurativeLanguageLevel: number;

  emotionalExplicitness: number;
  narrativeSpeed: number;

  paragraphLength: number;

  prohibitedStyleTraits: string[];
}

Bir hikâyede farklı sahneler aynı temel stil içinde farklı yoğunluklara sahip olabilir.

51. Style Drift

Uzun hikâyelerde modelin tarzı değişebilir.

Örneğin:

ilk bölüm kısa ve sıcak,
sonraki bölüm uzun ve ağır,
üçüncü bölüm teatral,
son bölüm ansiklopedik.

Style Drift Detector şunları kontrol edebilir:

Ortalama cümle uzunluğu
Diyalog oranı
Betimleme yoğunluğu
Metafor sıklığı
Anlatıcı sıcaklığı
Doğrudan çocuk hitabı
Paragraf uzunluğu
52. Repetition Memory

Sistem yalnızca aynı kelimeleri değil, tekrar eden ifadeleri de takip etmelidir.

Örnek tekrarlar:

kalbi hızlı hızlı attı
derin bir nefes aldı
gözleri parladı
bir anda
tam o sırada

Bu ifadeler yasak değildir fakat çok sık kullanılırsa metin yapaylaşır.

interface PhraseUsageMemory {
  phrase: string;
  usageCount: number;
  lastUsedSceneId: string;
  semanticCategory: string;
}
53. Semantic Repetition

Aynı anlamın farklı cümlelerle tekrarı da tespit edilmelidir.

Örnek:

Lila biraz korktu.
İçinde bir endişe vardı.
Kendini tedirgin hissediyordu.

Üçü aynı beat içinde gereksiz tekrardır.

Bu durumda tek güçlü ifade yeterlidir.

54. Exposition Control

Karakterler birbirlerinin zaten bildiği şeyleri sırf kullanıcı öğrensin diye anlatmamalıdır.

Yapay diyalog:

“Bildiğin gibi Lila, geçen hafta birlikte kuzey kulesine gitmiştik.”

Daha doğal:

“Kuzey kulesindeki sesi hatırlıyor musun?” diye sordu tilki.

Bilgi doğal bağlama yerleşir.

55. Lore Delivery

Dünya bilgisi uzun paragraflarla verilmemelidir.

Lore kaynakları:

çevresel ayrıntı,
karakter hatırası,
eşya yazısı,
kısa hikâye,
halk söylentisi,
şarkı,
çizim,
çocuğun bulduğu belge.

Uzun açıklama yerine parçalı öğrenme kullanılabilir.

56. Narrative Density

Her cümlede yeni bilgi verilirse çocuk yorulabilir.

interface NarrativeDensityProfile {
  factsPerParagraph: number;
  newEntitiesPerScene: number;
  newNamesPerScene: number;
  activeObjectsPerBeat: number;
  emotionalChangesPerBeat: number;
}

Bilgi yoğunluğu yaşa göre sınırlandırılmalıdır.

57. Sensory Language

Görsel üretim olsa bile anlatı yalnızca görmeye odaklanmamalıdır.

Duyular:

Görme
İşitme
Dokunma
Koku
Sıcaklık
Hareket
Denge

Örnek:

Islak taşlar ayaklarının altında serindi. Dereden gelen su sesi, sisin içinde olduğundan daha yakın duyuluyordu.

Ancak her paragrafta tüm duyular kullanılmamalıdır.

58. Visual-Narrative Coordination

Görselde açıkça görülen şey metinde uzun uzun tekrar edilmemelidir.

Görsel:

Lila ve tilki kırık köprünün önünde.

Metin:

Lila ve tilki kırık köprünün önünde duruyordu.

Bu bilgi gereksiz tekrar olabilir.

Daha iyi:

Köprünün ortasından gelen gıcırtı, Lila’nın ilk adımını atmadan durmasına yetti.

Metin görseli tamamlar.

59. Visual Grounding

Metin görselde olmayan bir ayrıntıya dayanıyorsa görsel üretim isteğine aktarılmalıdır.

Örneğin metin:

Tilkinin boynundaki gümüş rozet ay ışığında parladı.

Görsel sözleşmesinde:

fox_silver_badge_visible = true
moonlight_reflection = true

olmalıdır.

Aksi hâlde metin ve görsel çelişebilir.

60. Narrative Output Package

Motorun çıktısı yalnızca bir string olmamalıdır.

interface NarrativeOutputPackage {
  id: string;
  requestId: string;

  contentType: GeneratedNarrativeContent;

  displayText: string;
  spokenText?: string;

  speakerId?: string;

  canonicalMeaning: string[];
  extractedActions: NarrativeAction[];
  revealedFacts: string[];

  referencedCharacters: string[];
  referencedItems: string[];
  referencedLocations: string[];

  emotionalTone: ToneConsistencyVector;

  playbackMetadata?: DialoguePlaybackMetadata;

  visualRequirements: VisualRequirement[];
  soundRequirements: SoundRequirement[];

  validationResult: NarrativeValidationResult;

  version: number;
}
61. Narrative Validation Pipeline

Üretimden sonra metin doğrudan kullanıcıya gösterilmemelidir.

1. Şema doğrulaması
2. Uzunluk kontrolü
3. Yaş dili kontrolü
4. Karakter bilgisi kontrolü
5. Karakter sesi kontrolü
6. Dünya tutarlılığı kontrolü
7. Eşya ve konum kontrolü
8. Ton ve güvenlik kontrolü
9. Tekrar kontrolü
10. Planlanmayan eylem kontrolü
11. Görsel uyum kontrolü
12. Playback uygunluğu kontrolü
13. Son düzenleme
62. Validation Result
interface NarrativeValidationResult {
  valid: boolean;

  scores: {
    ageSuitability: number;
    readability: number;
    voiceConsistency: number;
    continuity: number;
    toneConsistency: number;
    narrativePurposeFit: number;
    dialogueNaturalness: number;
    safety: number;
  };

  hardViolations: NarrativeViolation[];
  softWarnings: NarrativeWarning[];

  recommendedAction:
    | "ACCEPT"
    | "EDIT"
    | "REGENERATE_SECTION"
    | "REGENERATE_FULL"
    | "ESCALATE";
}
63. Patch yerine tam yeniden üretim

Küçük hata varsa tüm sahneyi yeniden üretmek gereksizdir.

Örnek:

Karakter sesi biraz fazla resmi.

Sadece diyalog düzenlenebilir.

Ancak şu durumlarda tam yeniden üretim gerekir:

olay sırası yanlış,
gizli bilgi açıklandı,
var olmayan nesne kullanıldı,
güvenlik ihlali,
sahne amacı karşılanmadı.
64. Deterministic Editing Pass

Son düzenleme geçişi daha düşük maliyetli ve daha kontrollü olabilir.

Görevleri:

cümle uzunluklarını düzeltme,
tekrarı azaltma,
konuşmacıları netleştirme,
yaşa uygun olmayan kelimeleri değiştirme,
seçenekleri dilsel olarak dengeleme,
metni hedef uzunluğa getirme.

Bu katmanın yeni olay üretmesine izin verilmemelidir.

65. Generation Modes
type NarrativeGenerationMode =
  | "FRESH_GENERATION"
  | "CONSTRAINED_REWRITE"
  | "AGE_ADAPTATION"
  | "LENGTH_COMPRESSION"
  | "LENGTH_EXPANSION"
  | "VOICE_CORRECTION"
  | "TONE_CORRECTION"
  | "CONTINUITY_REPAIR"
  | "SPOKEN_TEXT_ADAPTATION";

Aynı model veya farklı modeller bu görevlerde kullanılabilir.

66. Model Routing

Her görev için en güçlü modeli kullanmak gerekmeyebilir.

Örnek:

Scene prose generation:
güçlü yaratıcı model

Age adaptation:
orta seviye model

Grammar and length correction:
düşük maliyetli model

Continuity validation:
kurallar + yapılandırılmış model

Choice label generation:
küçük model veya şablon

Recap:
orta seviye model

Bu maliyet açısından önemlidir.

67. Template + Generation dengesi

Her şey LLM tarafından üretilmemelidir.

Şablonla üretilebilecekler:

sistem kurtarma mesajları,
oturum devam metinleri,
standart seçim başlıkları,
tekrar dinleme düğmeleri,
ebeveyn ayar açıklamaları.

LLM gerektirebilecekler:

karakter diyaloğu,
sahne anlatımı,
duygusal sonuç,
recap,
açık uçlu soru.
68. Canonical Text ve Adaptive Render

Aynı olay için temel bir kanonik anlatı tutulabilir.

Canonical meaning:
Lila tilkiye yardım eder.
Tilkinin güveni artar.
Gizli yol bilgisi açılır.

Bunun farklı render’ları üretilebilir:

4–6 yaş
7–9 yaş
sesli anlatım
kısa oturum
uyku öncesi modu

Bu, farklı deneyimlerde olay tutarlılığını korur.

69. Localization hazırlığı

İlk dil Türkçe olsa bile model çok dilliliğe uygun tasarlanmalıdır.

Yerelleştirme yalnızca kelime çevirisi değildir.

Değişebilecek unsurlar:

hitap biçimi,
mizah,
deyim,
cümle yapısı,
ebeveyn dili,
seslenme sıklığı,
özel isimlerin telaffuzu,
kültürel çağrışımlar.
interface LocaleNarrativeProfile {
  locale: string;
  language: string;

  politenessStyle: string;
  childAddressStyle: string;

  idiomPolicy: string;
  culturalReferencePolicy: string;

  punctuationPolicy: string;
  dialogueFormattingPolicy: string;
}
70. Türkçe için özel hususlar

Türkçe anlatıda özellikle:

özne tekrarları,
zamir belirsizliği,
uzun ek zincirleri,
konuşma cümlelerinde doğal söz dizimi,
aynı fiilin sık tekrarı,
“bir anda”, “tam o sırada” gibi geçiş kalıplarının aşırı kullanımı

kontrol edilmelidir.

Örnek belirsizlik:

Lila tilkiye baktı. O geri çekildi.

Burada geri çekilenin kim olduğu belirsiz olabilir.

Daha açık:

Lila tilkiye baktığında tilki bir adım geri çekildi.

71. İsim ve zamir çözümlemesi

Sahnede çok karakter varsa “o” zamiri karışıklık yaratabilir.

Motor şu durumlarda karakter adını tekrar kullanmalıdır:

konuşmacı değiştiğinde,
aynı cinsiyette iki karakter olduğunda,
birkaç cümle boyunca isim kullanılmadığında,
eylemin sahibi belirsizleştiğinde.

Bu, özellikle sesli anlatımda önemlidir.

72. Dialogue Attribution

Konuşmacı görselde açık olsa bile sesli kullanım için metadata tutulmalıdır.

interface DialogueAttribution {
  speakerId: string;
  speakerDisplayName: string;

  explicitAttributionNeeded: boolean;
  reason?: string;
}

Örneğin:

“Buraya gel,” dedi tilki.

yerine bazen yalnızca:

“Buraya gel.”

yeterli olabilir.

Ama TTS sırasında konuşmacı sesleri benzerse açık attribution gerekebilir.

73. Narrative Memory

Üretilen her metin uzun vadeli hafızaya kaydedilmemelidir.

Kaydedilmesi gerekenler:

kanonik olay,
kalıcı bilgi açıklaması,
önemli diyalog sözü,
ilişki değişimi,
anlatısal promise,
karakterin anlamlı ifadesi,
çocuğun seçiminin sonucu.

Kaydedilmemesi gerekenler:

her sıfat,
her ortam betimlemesi,
geçici cümle varyasyonu,
TTS için yapılan yüzey düzenlemeleri.
74. Memorable Line

Bazı cümleler hikâyenin duygusal hafızası için önemli olabilir.

Örnek:

“Korkmak geri dönmek zorunda olduğun anlamına gelmez,” dedi tilki.

Bu cümle:

karakter ilişkisini,
temayı,
gelecekteki callback’i

destekleyebilir.

interface MemorableLine {
  lineId: string;
  speakerId: string;
  text: string;

  thematicTags: string[];
  emotionalImportance: number;

  callbackEligible: boolean;
}

Ancak sistem sürekli “ders veren” unutulmaz cümleler üretmemelidir.

75. Moralizing Detection

Çocuk hikâyesi her sahnede açık ders vermemelidir.

Yanlış:

Böylece Lila, arkadaşlara yardım etmenin her zaman doğru olduğunu öğrendi.

Daha doğal:

Tilki, Lila’nın yanında yürümeye başladı. Bu kez aralarında biraz daha az mesafe vardı.

Ders davranış ve sonuçla hissedilebilir.

Ebeveyn rehberinde tema açıkça belirtilebilir; çocuk anlatısında ise daha doğal kalmalıdır.

76. Theme Consistency

Hikâye teması metin boyunca korunabilir fakat sürekli tekrarlanmamalıdır.

interface ThemeProfile {
  primaryTheme: string;
  secondaryThemes: string[];

  explicitness: number;
  repetitionLimit: number;

  preferredExpressionModes:
    | "ACTION"
    | "DIALOGUE"
    | "CONSEQUENCE"
    | "SYMBOL"
    | "REFLECTION";
}
77. Narrative Quality Vector
interface NarrativeQualityVector {
  clarity: number;
  naturalness: number;
  emotionalResonance: number;
  voiceConsistency: number;
  ageSuitability: number;
  pacing: number;
  dialogueQuality: number;
  descriptiveBalance: number;
  continuity: number;
  originality: number;
  playbackSuitability: number;
}

Tek bir toplam puan yerine hangi alanın zayıf olduğu görülür.

78. Örnek üretim akışı
Girdi
Beat türü:
CHOICE_SETUP

Amaç:
Köprü ve dere yolu arasında seçim hazırlamak

Karakterler:
Lila, tilki

Yaş:
5

Ton:
Meraklı, hafif tedirgin ama güvenli

Bilgi:
Köprü hızlı ama kırık.
Dere yolu uzun ama sağlam.
Üretilen anlatı

Lila köprünün ilk tahtasına baktı. Tahta hafifçe aşağı eğildi.
Tilki, derenin kenarındaki taşları gösterdi.
“Oradan gitmek daha uzun sürer,” dedi. “Ama taşlar sağlam görünüyor.”

Etkileşim sorusu

Lila hangi yolu seçmeli?

Seçenekler
Köprüyü dikkatle geç
Dere kenarındaki yolu izle
79. Aynı beat’in yaşa göre uyarlanması
5 yaş

Köprü gıcırdadı. Tilki, aşağıdaki taş yolu gösterdi.
“Bu yol daha uzun,” dedi. “Ama daha sağlam olabilir.”

8 yaş

Lila köprüye adım atmadan önce tahtalardan birinin eğildiğini fark etti. Tilki, derenin kenarında uzanan taş yolu gösterdi. Daha uzun görünüyordu ama köprüden daha güvenli olabilirdi.

11 yaş

Köprü, kısa yolun her zaman kolay yol olmadığını hatırlatır gibi gıcırdadı. Tilki derenin kenarındaki taş geçidi gösterdi; yol uzundu, fakat en azından her adımın nereye basacağı belliydi.

Kanonik olay aynıdır, anlatım biçimi değişir.

80. Servis ayrımı
NarrativeGenerationService
DialogueGenerationService
NarratorVoiceService
CharacterVoiceManager
AudienceLanguageAdapter
VocabularyManager
ToneController
DialogueTurnPlanner
NarrativeContinuityValidator
VoiceConsistencyValidator
ReadabilityValidator
RepetitionDetector
NarrativeCanonicalizer
SpokenTextAdapter
RecapGenerator
QuestionGenerator
ParentGuidanceGenerator
NarrativeRepairService
81. Motorun sabit prensipleri
Narrative Generator olay planlamaz; planlanmış olayları ifade eder.
Plan ile yüzey metni ayrı tutulur.
Her karakter yalnızca bildiği şeylere göre konuşur.
Karakter sesi yapılandırılmış profil ve örneklerle korunur.
Yaşa uygunluk yalnızca kısa cümle kullanmak değildir.
Basit dil, zayıf dil anlamına gelmez.
Duygusal geçişler gerekçelendirilir.
Seçeneklerin dili dengeli ve yargısız olmalıdır.
Metin ile görsel birbirini tekrar etmek yerine tamamlamalıdır.
Display text ve spoken text ayrılabilir.
Üretim sonrası continuity, voice, tone ve safety doğrulaması yapılır.
Planlanmayan olaylar metinden çıkarılarak tespit edilir.
Kanonik olaylar ile metin varyasyonları birbirinden ayrılır.
Kabul edebileceğimiz karar seti
Narrative Generation Engine yapılandırılmış Generation Request alır.
Narrative Context Bundle yalnızca ilgili bağlamı taşır.
Audience Language Profile yaşa göre dil sınırlarını belirler.
Her önemli karakter Character Voice Profile ve Voice Fingerprint taşır.
Diyalogların anlatısal işlevi tanımlanır.
Narrator Voice ayrı bir profil olarak yönetilir.
Show–Tell dengesi yaşa göre ayarlanır.
Metin, konuşma ve playback metadata birlikte üretilebilir.
Üretim sonrası Narrative Validation Pipeline çalışır.
Canonical meaning, yüzey metninden ayrı tutulur.
Küçük hatalarda kontrollü edit, büyük ihlallerde yeniden üretim uygulanır.