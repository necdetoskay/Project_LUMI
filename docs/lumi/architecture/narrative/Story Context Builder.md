Story Context Builder

Story Context Builder, LUMI’nin farklı motorlarından gelen verileri tek bir üretim bağlamına dönüştüren katmandır.

Bu katman olmadan:

Memory Engine ayrı konuşur,
Emotion Engine ayrı konuşur,
Relationship Engine ayrı konuşur,
Belief Engine ayrı konuşur,
World Engine ayrı konuşur.

LLM’ye bunların tamamı ham biçimde verilirse prompt büyür, çelişkiler oluşur ve hikâye mekanikleşir.

Story Context Builder’ın görevi şudur:

Ham sistem durumu
→ seçilmiş anlatısal gerçekler
→ davranış yönlendirmeleri
→ hikâye üretim bağlamı

En temel ilke:

Story Context Builder hikâye yazmaz. Hikâyenin doğru yazılabilmesi için gerekli bağlamı hazırlar.

1. Girdi kaynakları

Story Context Builder şu motorlardan veri alır:

World State
Character State
Memory Engine
Emotion Engine
Relationship Engine
Belief Engine
Goal System
Decision Engine
Player Knowledge
Story History
Parent Settings
Narrative Constraints

Bunların her biri farklı türde bilgi verir.

Örnek:

World State
Eski köprü kırık.
Kuzey mağarası açık.
Fırtına yaklaşmakta.
Emotion Engine
Tilki temkinli ve hafif kaygılı.
Relationship Engine
Tilki Lumi’ye güveniyor.
Yaşlı denizciye karşı şüpheli.
Belief Engine
Tilki mağarada tehlikeli bir yaratık olduğuna inanıyor.
Memory Engine
Tilki daha önce nehirde mahsur kaldı.
Lumi onu kurtardı.
Goal System
Tilkinin aktif hedefi haritanın eksik parçasını bulmak.
Player Knowledge
Çocuk, Mira’nın yardım aramaya gittiğini henüz bilmiyor.

Bütün bu veriler birlikte değerlendirilmelidir.

2. Ham veri doğrudan LLM’ye gitmemeli

Aşağıdaki gibi bir prompt kötü olur:

{
  "trust": 0.78,
  "fear": 0.36,
  "resentment": 0.11,
  "belief_confidence": 0.64,
  "memory_significance": 0.82,
  "goal_priority": 0.71
}

LLM bu değerleri yorumlayabilir ama anlatıda:

fazla mekanik davranabilir,
sayılara aşırı bağlı kalabilir,
gereksiz açıklama yapabilir,
karakteri tutarsız kullanabilir.

Bunun yerine Story Context Builder sayısal durumu anlatısal yönlendirmeye dönüştürmelidir:

Tilki Lumi’ye güvenir ve tehlikede ona yakın durur.
Ancak kuzey mağarası konusunda huzursuzdur.
Yaşlı denizcinin bazı bilgileri sakladığını düşünür.
3. Story Context katmanları

Bence Story Context tek metin bloğu olmamalı.

Birkaç ayrı katmana bölünmelidir.

type StoryContext = {
  immutableFacts: string[]
  currentWorldState: string[]
  activeCharacters: CharacterStoryContext[]
  activeGoals: StoryGoalContext[]
  relevantHistory: string[]
  pendingEvents: string[]
  playerKnowledge: PlayerKnowledgeContext
  narrativeInstructions: string[]
  forbiddenKnowledge: string[]
  safetyConstraints: string[]
  generationBudget: ContextBudget
}

Bu ayrım, hangi bilginin ne amaçla kullanılacağını netleştirir.

4. Değişmez gerçekler

Bazı bilgiler hikâyede kesinlikle değişmemelidir.

type ImmutableFact = {
  fact: string
  sourceId: string
  priority: "critical" | "high" | "normal"
}

Örnek:

- Lumi’nin sağ kolunda mavi bir bileklik vardır.
- Tilki uçamaz.
- Köprü şu anda kullanılamaz.
- Mira bu sahnede adada değildir.

Bu gerçekler LLM’nin hikâyeyi kolaylaştırmak için gerçekliği değiştirmesini önler.

Örneğin LLM şunu yapmamalı:

Tilki kanatlarını açıp karşı kıyıya uçtu.

Eğer tilkinin uçma yeteneği yoksa bu yasaktır.

5. Güncel dünya durumu

World State’in tamamı bağlama eklenmemelidir.

Yalnızca mevcut hikâyeyi etkileyen kısmı seçilmelidir.

type RelevantWorldState = {
  locationId: string
  timeOfDay: string
  weather?: string
  activeHazards: string[]
  availableResources: string[]
  visibleChanges: string[]
  inaccessibleAreas: string[]
}

Örnek:

Mekân: Eski Değirmen Çevresi
Zaman: Akşamüstü
Hava: Hafif yağmurlu
Aktif durum:
- Değirmenin altındaki kapı kilitli.
- Yakında su seviyesi yükseliyor.
- Kuzey yolu çamurlu fakat geçilebilir.

Bütün evren haritası gönderilmez.

6. Aktif karakter bağlamı

Her karakter için ayrı, kısa ve kullanılabilir bağlam oluşturulmalıdır.

type CharacterStoryContext = {
  characterId: string
  roleInScene: string

  currentState: string[]
  dominantEmotions: string[]
  activeGoals: string[]
  relevantBeliefs: string[]
  relevantMemories: string[]
  relationshipNotes: string[]

  likelyBehaviors: string[]
  unlikelyBehaviors: string[]
  voiceGuidance: string[]
}

Örnek:

Karakter: Tilki
Sahnedeki rolü: Lumi’nin yol arkadaşı

Güncel durumu:
- Yorgun ama dikkatli.
- Islak zeminde yavaş hareket ediyor.

Baskın duygular:
- Mağara konusunda temkinli.
- Harita parçası nedeniyle umutlu.

Aktif hedef:
- Eksik harita parçasını bulmak.

İlgili inançlar:
- Yaşlı denizcinin mağara hakkında bilgi sakladığını düşünüyor.
- Lumi’nin tehlike anında yardım edeceğine inanıyor.

İlgili geçmiş:
- Lumi daha önce onu nehirden kurtardı.
- Karanlık sulardan hâlâ rahatsız oluyor.

Davranış ipuçları:
- Tehlikede Lumi’ye yakın durabilir.
- Mağaraya hemen girmek yerine çevreyi kontrol etmeyi önerebilir.
- Harita gördüğünde heyecanı artar.

Konuşma biçimi:
- Kısa ve dikkatli cümleler kullanır.
- Endişesini doğrudan “korkuyorum” diyerek söylemek yerine soru sorarak gösterir.

Bu blok doğrudan hikâye yazımında kullanılabilir.

7. Her karakter için aynı miktarda bağlam verilmemeli

Ana karakter ile arka plan NPC aynı detay seviyesinde olmamalıdır.

Ana karakter:
yüksek ayrıntı

Aktif destek karakter:
orta ayrıntı

Sahne NPC’si:
düşük ayrıntı

Arka plan karakter:
yalnızca rol ve temel davranış

Örnek bütçe:

Ana karakter: 250–400 token
Destek karakter: 120–220 token
Küçük NPC: 40–80 token

Bu sayede prompt büyümesi kontrol edilir.

8. İlgili anı seçimi

Memory Engine 3–5 anı getirmiş olabilir.

Story Context Builder bunların hepsini ham olarak yazmamalıdır.

Örneğin Memory Engine:

- Lumi tilkiyi nehirden kurtardı.
- Tilki o sırada haritasını kaybetti.
- Yaşlı denizci yardım etmeyi reddetti.
- Tilki daha sonra eski bir pusula buldu.

Story Context Builder bunu şöyle sıkıştırabilir:

Tilki nehir olayından beri Lumi’ye güveniyor, fakat kayıp haritası onun için hâlâ çözülmemiş bir mesele. Yaşlı denizcinin o gün yardım etmemesi nedeniyle ona mesafeli.

Yani:

4 kayıt
→ 2 anlatısal yönlendirme
9. Hafıza açıklama yığınına dönüşmemeli

Story Generator’a şu uyarı verilmelidir:

Geçmiş bilgileri doğrudan özet halinde açıklama.
Yalnızca mevcut sahne doğal biçimde tetikliyorsa davranış, diyalog veya kısa hatırlama olarak kullan.

Aksi hâlde her hikâye şöyle başlar:

Tilki, Lumi’nin onu daha önce nehirden kurtardığını hatırladı. Ayrıca haritasını kaybettiğini düşündü. Yaşlı denizciye güvenmediğini de biliyordu.

Bu yapay olur.

Doğal kullanım:

Suyun sesi duyulunca Tilki adımlarını yavaşlattı ve Lumi’ye biraz daha yaklaştı.

Geçmiş açıklanmadı ama etkisi görüldü.

10. Duyguları davranışa dönüştürme

Emotion Engine’den gelen değer doğrudan kullanılmamalıdır.

fear: 0.63

Story Context Builder bunu davranış olasılığına dönüştürür:

- Karanlık girişe yaklaşırken duraksayabilir.
- Sesini biraz alçaltabilir.
- Çevreyi kontrol etmeyi önerebilir.
- Tamamen kaçmaz; Lumi yanındaysa ilerleyebilir.

Bu çok önemlidir.

Çünkü:

Emotion
≠
tek davranış

Aynı korku farklı karakterlerde farklı görünür.

Bir karakter:

geri çekilir,

diğeri:

çok konuşur,

başkası:

şaka yapar,

başkası:

öfkeli görünür.

Story Context Builder bunu kişilikle birleştirmelidir.

11. İlişkileri davranışa dönüştürme

Relationship Engine:

trust: 0.80
affection: 0.65
resentment: 0.15

Story Context Builder:

- Tilki Lumi’nin önerilerini ciddiye alır.
- Tehlikede onun yanında kalmaya eğilimlidir.
- Küçük kırgınlığını tamamen açıkça söylemeyebilir.
- Lumi söz verirse bunu önemli kabul eder.

Bu bağlam hikâyede ilişkiyi görünür kılar.

12. İnançları gerçek gibi sunmama

Belief Engine’deki bir bilgi yanlış olabilir.

Bu yüzden Story Context Builder şu ayrımı korumalıdır:

Dünya gerçeği
Mağarada dost bir ejderha var.
Tilkinin inancı
Tilki mağarada tehlikeli bir yaratık olduğuna inanıyor.

Prompt’ta açıkça ayrılmalıdır:

Gerçek dünya bilgisi:
- Mağaradaki ejderha saldırgan değildir.

Tilkinin bildiği:
- Tilki ejderhanın saldırgan olabileceğini düşünüyor.

Anlatı kuralı:
- Tilki gerçeği biliyormuş gibi davranmamalı.
- Gerçek, çocuk keşfetmeden açıklanmamalı.
13. Oyuncu bilgisi ve spoiler kontrolü

LUMI için en kritik katmanlardan biri budur.

type PlayerKnowledgeContext = {
  knownFacts: string[]
  suspectedFacts: string[]
  unknownFacts: string[]
  hiddenTruths: string[]
}

Örnek:

Çocuğun bildiği:
- Mira gece kampı terk etti.

Çocuğun şüphelendiği:
- Mira bir şey saklıyor olabilir.

Çocuğun bilmediği:
- Mira yardım getirmeye gitti.

Anlatı kuralı:
- Mira’nın gerçek amacı doğrudan açıklanmayacak.

Bu yapılmazsa Narrative Engine gizemi yanlışlıkla bozabilir.

14. Bilgi kapsamı

Her sahne için üç bilgi alanı tutulmalıdır.

Narrator Knowledge
Character Knowledge
Player Knowledge

Narrator her şeyi biliyor olabilir.

Ancak her şeyi söylememelidir.

type KnowledgeScope = {
  narratorCanKnow: string[]
  narratorCanReveal: string[]
  activeCharacterCanKnow: Record<string, string[]>
  playerCanKnow: string[]
}

Bu sayede anlatıcı bilinmeyen gerçeği yalnızca betimsel ipuçlarıyla gösterebilir.

Örneğin:

Mira uzaklaşırken cebindeki küçük metal parça hafifçe parladı.

Ama:

Mira aslında yardım çağıran işareti takip ediyordu.

dememelidir.

15. Aktif hedefler

Goal System’den gelen bütün hedefler gönderilmemelidir.

Sadece sahneyle ilgili olanlar seçilmelidir.

type StoryGoalContext = {
  goalId: string
  ownerId: string
  summary: string
  priority: number
  progressState: string
  blockedBy?: string[]
  canAdvanceInScene: boolean
}

Örnek:

Lumi:
- Gizli kapıyı açmak.
- Tilkinin harita parçasını bulmasına yardım etmek.

Tilki:
- Harita parçasının gerçek olup olmadığını doğrulamak.

Yaşlı denizci:
- Kapının hemen açılmasını engellemek.

Burada doğal çatışma oluşur.

16. Hedefler doğrudan sonuca dönüşmemeli

Story Context Builder yalnızca hedefleri söyler.

Sonucu Decision Engine veya oyuncu seçimi belirler.

Yanlış:

Tilki sonunda haritayı bulur.

Doğru:

Tilki harita parçasını bulmaya odaklıdır.
Bu sahnede ona dair bir ipucu fark edebilir.

Story Context Builder geleceği yazmamalıdır.

17. Decision Engine çıktısı

Bir sahnede NPC kararları önceden verildiyse, Story Context Builder bunu açıkça taşımalıdır.

type CharacterDecisionContext = {
  characterId: string
  selectedAction: string
  intention: string
  visibleBehavior: string
  hiddenReason?: string
  confidence: number
}

Örnek:

Tilkinin kararı:
- Mağaraya hemen girmek yerine çevrede iz aramak.

Niyeti:
- Tehlikeyi azaltmak ve harita işaretlerini kontrol etmek.

Hikâyede göster:
- Tilki girişin çevresindeki toprağı incelesin.
- Lumi’ye doğrudan emir vermek yerine bir işaret görebileceğini söylesin.

LLM bu kararı değiştirmemelidir.

18. Karar ve diyalog ayrımı

Decision Engine:

Tilki Mira’ya güvenmemeye karar verdi.

Narrative Engine bunu farklı şekillerde ifade edebilir:

“Bize her şeyi anlattığından emin misin?”

veya:

Tilki Mira’nın çantasına kısa bir bakış attı ama hiçbir şey söylemedi.

Story Context Builder kararı verir; anlatım biçimini serbest bırakır.

19. Bekleyen olaylar

Az önce tasarladığımız çevrimdışı simülasyon modelinde önemli olaylar tamamlanmadan bekletilebilir.

type PendingStoryEvent = {
  id: string
  summary: string
  waitingFor: string
  urgency: number
  relatedCharacters: string[]
  expirationPolicy: "none" | "soft" | "hard"
}

Örnek:

Tilki eski değirmende yeni bir iz buldu.
İzi tek başına takip etmedi.
Lumi döndüğünde birlikte araştırmayı bekliyor.

Story Context Builder bunu yeni hikâyeye doğal giriş olarak kullanabilir.

20. “Sen yokken” özetiyle bağlantı

Offline progression sonrası iki farklı bağlam oluşturulmalıdır.

Kullanıcı özeti
Sen yokken:
- Köprü onarılmaya başlandı.
- Tilki değirmende yeni bir işaret buldu.
- Baykuş sana bir not bıraktı.
Hikâye üretim bağlamı
- Tilki bulduğu işareti henüz araştırmadı.
- Lumi’nin dönüşünü bekledi.
- Baykuşun notu açılmadı.

Kullanıcı özeti ile üretim bağlamı aynı şey değildir.

21. Çelişki çözümü

Farklı motorlar aynı konuda çelişkili veri üretebilir.

Örnek:

World State:
Mira adada değil.

Memory Engine:
Tilki Mira’yı değirmende gördüğünü hatırlıyor.

Belief Engine:
Tilki Mira’nın hâlâ adada olduğuna inanıyor.

Bunlar sistem hatası olmayabilir.

Story Context Builder şu ayrımı yapar:

Gerçek:
- Mira adadan ayrıldı.

Tilkinin inancı:
- Mira’nın değirmen çevresinde olduğuna inanıyor.

Anlatı:
- Tilki Mira’yı arayabilir.
- Mira fiziksel olarak görünmemeli.

Çelişki çözmek her zaman bir veriyi silmek değildir.

Bazen çelişki anlatının kendisidir.

22. Gerçek sistem çelişkileri

Bazı çelişkiler ise gerçekten veri hatasıdır.

Örnek:

World State:
Kapı açık.

Scene State:
Kapı kilitli.

Recent Event:
Kapı henüz hiç açılmadı.

Bu durumda öncelik sırası gerekir.

1. Current authoritative world state
2. Confirmed recent events
3. Story continuity state
4. Character beliefs
5. Character memories
6. Generated descriptive details

Karakter inancı gerçekliği geçersiz kılamaz.

23. Kaynak otoritesi

Her bağlam maddesi kaynak ve güven seviyesi taşımalıdır.

type ContextFact = {
  text: string
  sourceEngine: string
  authority: number
  confidence: number
  scope:
    | "world_truth"
    | "character_belief"
    | "player_knowledge"
    | "narrative_instruction"
}

Bu yapı çelişki çözümünde kullanılır.

24. Bağlam öncelikleri

Her bilgi aynı öneme sahip değildir.

P0 — Kesinlikle korunmalı
P1 — Sahne için kritik
P2 — Karakter tutarlılığı için önemli
P3 — Atmosferi zenginleştirir
P4 — Yer varsa kullanılabilir

Örnek:

P0
Çocuk Mira’nın gerçek amacını bilmiyor.
P1
Köprü geçilemez durumda.
P2
Tilki Lumi’ye güveniyor.
P3
Hafif yağmur yağıyor.
P4
Uzakta kurbağa sesleri duyuluyor.

Token bütçesi daralırsa P4 ve P3 önce çıkarılır.

25. Token bütçesi

Story Context Builder sınırsız prompt üretmemelidir.

type ContextBudget = {
  totalTokens: number
  fixedRulesTokens: number
  worldStateTokens: number
  characterTokens: number
  memoryTokens: number
  narrativeTokens: number
}

Örnek dağılım:

Toplam bağlam: 4.000 token

Sistem ve güvenlik kuralları: 700
Dünya durumu: 500
Karakter bağlamı: 1.400
Geçmiş ve hafıza: 600
Hedefler ve kararlar: 400
Anlatı talimatları: 400

Bu değerler modele ve hikâye uzunluğuna göre değişebilir.

26. Bağlam sıkıştırma

Bağlam büyürse şu sırayla sıkıştırılmalıdır:

1. Tekrarlanan bilgiler birleştirilir.
2. Düşük öncelikli atmosfer bilgileri çıkarılır.
3. Benzer anılar özetlenir.
4. Küçük NPC bağlamları azaltılır.
5. Eski çözülmüş olaylar çıkarılır.
6. Yalnızca aktif hedefler tutulur.
7. Sayısal veriler anlatısal cümleye dönüştürülür.

Kritik gerçekler ve spoiler kuralları asla çıkarılmamalıdır.

27. Tekrarlama önleme

Aynı bilgi birden fazla motordan gelebilir.

Örnek:

Memory:
Lumi tilkiyi kurtardı.

Relationship:
Tilki Lumi’ye güveniyor çünkü onu kurtardı.

Belief:
Tilki Lumi’nin güvenilir olduğuna inanıyor.

Bunları üç ayrı cümle olarak göndermek gereksizdir.

Birleştirilmiş bağlam:

Tilki, Lumi’nin onu nehirde kurtarmasından beri ona güçlü biçimde güveniyor.

Bu tek cümle üç motorun bilgisini taşır.

28. Nedensel bağlam

Bağlam sadece durumları değil, önemli nedenleri de taşımalıdır.

Zayıf bağlam:

Tilki korkuyor.

Güçlü bağlam:

Tilki, önceki nehir kazası nedeniyle hızlı akan sudan çekiniyor; Lumi yanındaysa korkusuna rağmen ilerleyebilir.

Burada:

duygu,
hafıza,
ilişki,
davranış olasılığı

tek cümlede birleşir.

29. Karakterin değişim yönü

Sadece mevcut durum değil, karakterin gelişim yönü de verilmelidir.

type CharacterArcContext = {
  currentPattern: string
  growthDirection: string
  regressionRisk: string
  recentEvidence: string[]
}

Örnek:

Tilki yardım istemekte zorlanıyor.
Son olaylarda Lumi’ye daha açık davranmaya başladı.
Bu sahnede küçük bir yardım talebi gelişim açısından uygundur.
Tamamen bağımlı davranması uygun değildir.

Bu, karakter gelişimini kontrollü tutar.

30. Karakter gelişimi bir sahnede tamamlanmamalı

Story Context Builder LLM’ye şu sınırı vermelidir:

Karakter değişimini küçük ve kademeli göster.
Tek bir konuşmayla kalıcı korkuyu tamamen çözme.
Tek bir özürle bütün güven sorunlarını kapatma.

Aksi hâlde LLM dramatik çözümü fazla hızlı verir.

31. Anlatı kısıtları
type NarrativeConstraint = {
  type:
    | "must_include"
    | "may_include"
    | "must_not_include"
    | "tone"
    | "pacing"
    | "age_safety"
    | "continuity"

  instruction: string
  priority: number
}

Örnek:

Must include:
- Değirmendeki yeni işaret fark edilmeli.
- Tilkinin temkinli davranışı görünmeli.

May include:
- Kısa bir yağmur sahnesi.
- Baykuşun notuna gönderme.

Must not include:
- Gizli kapının arkasındaki gerçek yaratık açıklanmamalı.
- Tilki tek başına mağaraya koşmamalı.
- Kullanıcı kararı gerektiren seçim otomatik yapılmamalı.
32. Oyuncu seçim alanı korunmalı

Story Context Builder bazı olayları özellikle açık bırakmalıdır.

Bu sahnenin sonunda çocuk şu kararı verecek:
- Mağaraya girmek
- Denizciyle konuşmak
- Harita izini takip etmek

Narrative Engine bu seçeneklerden birini otomatik seçmemelidir.

type ReservedPlayerDecision = {
  decisionId: string
  options: string[]
  storyMustStopBeforeResolution: boolean
}

Bu, interaktif yapının korunması için kritiktir.

33. Hikâye amaçları

Her üretimde açık bir anlatısal amaç olmalıdır.

type StoryGenerationIntent = {
  mode:
    | "new_adventure"
    | "continuation"
    | "bridge_scene"
    | "choice_scene"
    | "resolution"
    | "world_update"
    | "character_moment"

  primaryPurpose: string
  secondaryPurposes: string[]
}

Örnek:

Mod: continuation

Ana amaç:
- Değirmende bulunan işareti incelemek.

İkincil amaçlar:
- Tilkinin Lumi’ye güvenini davranışla göstermek.
- Yaşlı denizci hakkındaki şüpheyi artırmak.
- Çocuğa üç anlamlı seçenek sunmak.

Bu amaç olmadan LLM sahneyi dağıtabilir.

34. Tempo bağlamı

Story Context Builder sahnenin ritmini de yönlendirebilir.

type PacingContext = {
  targetPace: "calm" | "balanced" | "tense" | "fast"
  tensionStart: number
  tensionEnd: number
  reflectionAllowed: boolean
  choiceAtEnd: boolean
}

Örnek:

Tempo:
- Sahne sakin merakla başlasın.
- Ortada küçük bir gerilim yükselsin.
- Büyük çatışma yaşanmasın.
- Sonunda araştırma yönüyle ilgili seçim sunulsun.
35. Yaşa uygunluk

Parent Settings ve çocuk profili bağlamın parçası olmalıdır.

type AgeAdaptationContext = {
  childAge: number
  sentenceComplexity: string
  allowedTension: number
  forbiddenThemes: string[]
  explanationStyle: string
  choiceComplexity: number
}

Örnek:

Yaş: 5

- Kısa ve anlaşılır cümleler kullan.
- En fazla üç seçim sun.
- Gerilimi uzun sürdürme.
- Fiziksel zarar ayrıntısı verme.
- Korkutucu unsurları güvenli bir çıkışla dengele.
36. Duygusal güvenlik

Hikâye gerilim içerebilir ama çocukta çaresizlik hissi oluşturmamalıdır.

Story Context Builder şu kontrolleri ekleyebilir:

- Güvenilir en az bir karakter sahnede mevcut.
- Tehlikenin anlaşılır bir çözüm yolu var.
- Çocuğun seçimi anlamlı ama cezalandırıcı değil.
- Yanlış seçim geri döndürülemez felaket üretmez.
- Karakter çatışmaları onarılabilir düzeyde kalır.
37. Anlatıcı biçimi

Story Context Builder anlatıcı perspektifini belirlemelidir.

type NarrationContext = {
  perspective:
    | "third_person_limited"
    | "third_person_omniscient"
    | "second_person"
    | "first_person"

  focalCharacterId?: string
  tense: "past" | "present"
  narratorTone: string
}

LUMI için çoğu durumda:

third_person_limited

veya çocuk doğrudan karakterse:

second_person

kullanılabilir.

38. Perspektif bilgi sınırı

Üçüncü şahıs sınırlı anlatımda anlatıcı yalnızca odak karakterin algılayabildiğini açıklamalıdır.

Focal character: Lumi

Lumi bilmiyorsa anlatıcı açıklamaz.

Bu, gizem ve tutarlılık için önemlidir.

39. Diyalog rehberi

Her karakterin konuşma tarzı kısa bir rehberle aktarılabilir.

type VoiceContext = {
  vocabularyLevel: string
  sentenceLength: string
  directness: number
  humorStyle?: string
  recurringSpeechPatterns: string[]
  forbiddenSpeechPatterns: string[]
}

Örnek:

Tilki:
- Kısa cümleler kullanır.
- Doğrudan itiraz etmek yerine soru sorar.
- Çok korktuğunda hızlı konuşur.
- “Ben zaten biliyordum” gibi kibirli ifadeler kullanmaz.

Bu, karakter sesinin hikâyeler arasında korunmasını sağlar.

40. Aynı davranışı sürekli tekrar etmeme

Karakterin bir özelliği her sahnede aynı biçimde gösterilmemelidir.

Örneğin tilkinin korkusu her seferinde:

Tilki Lumi’nin arkasına saklandı.

şeklinde anlatılırsa karakter tek boyutlu olur.

Story Context Builder davranış çeşitliliği sunabilir:

Korku ifade seçenekleri:
- Sessizleşme
- Çevreyi kontrol etme
- Alternatif rota önerme
- Lumi’ye yaklaşma
- Şaka yaparak rahatlamaya çalışma

Son kullanılan:
- Lumi’ye yaklaşma

Bu sahnede farklı bir ifade tercih et.

Bu çok değerli bir kalite katmanıdır.

41. Tekrar geçmişi
type NarrativeUsageHistory = {
  recentlyUsedMemories: string[]
  recentlyUsedDescriptions: string[]
  recentlyUsedConflictPatterns: string[]
  recentlyUsedEmotionExpressions: string[]
}

Story Context Builder bunları kullanarak tekrarları azaltabilir.

42. Motif ve semboller

Bazı anılar veya ilişkiler sembolik nesnelerle gösterilebilir.

Örnek:

Mavi bileklik
→ Lumi’nin verdiği söz

Eski pusula
→ Tilkinin kayıp haritası

Fener
→ güvenli dönüş
type NarrativeMotif = {
  objectId: string
  symbolicMeaning: string
  relatedCharacters: string[]
  usageCount: number
  lastUsedAt: number
}

Bu motifler anlatıya derinlik kazandırır ama fazla tekrar edilmemelidir.

43. Context Builder iş akışı
1. Hikâye üretim amacını belirle
2. Aktif sahneyi ve karakterleri seç
3. Yetkili dünya gerçeklerini getir
4. Karakter başına ilgili:
   - duyguları
   - ilişkileri
   - inançları
   - hedefleri
   - anıları getir
5. Player Knowledge sınırlarını uygula
6. Decision Engine kararlarını ekle
7. Çelişkileri sınıflandır
8. Tekrarlanan bilgileri birleştir
9. Bilgileri önceliklendir
10. Token bütçesine göre sıkıştır
11. Anlatısal davranış yönergelerine çevir
12. Yasaklar ve seçim sınırlarını ekle
13. Son tutarlılık kontrolünü çalıştır
14. Narrative Engine’e gönder
44. Context derleyici yaklaşımı

Bence Story Context Builder bir nevi derleyici gibi düşünülmelidir.

Motor verileri
→ normalize et
→ doğrula
→ çelişki kontrolü
→ önceliklendir
→ sıkıştır
→ üretim formatına çevir

Bu nedenle adı teknik olarak şu da olabilir:

Narrative Context Compiler

Ama ürün mimarisinde Story Context Builder daha anlaşılırdır.

45. Örnek tam bağlam
HİKÂYE MODU
Devam hikâyesi. Sahne sonunda oyuncu seçimi sunulacak.

ODAK
Lumi ve Tilki, eski değirmenin altındaki işareti araştırıyor.

KESİN DÜNYA GERÇEKLERİ
- Değirmenin altındaki kapı kilitli.
- Anahtar henüz bulunmadı.
- Mira adada değil.
- Mağaradaki ejderha saldırgan değildir ancak karakterler bunu bilmiyor.

OYUNCUNUN BİLDİKLERİ
- Tilki değirmende haritaya benzeyen bir işaret buldu.
- Yaşlı denizci mağaraya gitmelerini istemiyor.
- Mira gece kampı terk etti.

OYUNCUNUN BİLMEDİĞİ
- Mira yardım aramaya gitti.
- Ejderha yaralı ve saklanıyor.

LUMI
- Meraklı fakat Tilki’nin endişesini önemsiyor.
- Tilki’ye karşı koruyucu.
- Kapıyı zorlamak yerine önce çevreyi araştırmaya açık.

TİLKİ
- Lumi’ye güçlü biçimde güveniyor.
- Nehir kazası nedeniyle karanlık ve ıslak geçitlerde temkinli.
- Yaşlı denizcinin bilgi sakladığını düşünüyor.
- Harita parçasını bulmak istiyor.
- Korkusunu doğrudan söylemek yerine soru sorarak gösterir.

İLGİLİ GEÇMİŞ
- Lumi daha önce Tilki’yi nehirden kurtardı.
- Tilki o olay sırasında haritasını kaybetti.
- Denizci o gün yardım etmeyi reddetti.

AKTİF HEDEFLER
- İşaretin haritayla bağlantısını doğrulamak.
- Kilitli kapının nasıl açıldığını öğrenmek.
- Denizcinin neden onları durdurduğunu anlamak.

KARARLAR
- Tilki mağaraya hemen girmeyecek.
- Önce değirmenin çevresinde iz arayacak.
- Lumi oyuncu kararına kadar kesin rota seçmeyecek.

ANLATI TALİMATLARI
- Geçmişi açıklama yığını olarak verme.
- Tilki’nin korkusunu küçük davranışlarla göster.
- Gizli gerçekleri açıklama.
- Gerilimi orta seviyede tut.
- Sahne sonunda üç seçenek sun:
  1. Değirmenin çevresini araştırmak
  2. Yaşlı denizciyle konuşmak
  3. Baykuşun bıraktığı notu açmak

YASAKLAR
- Kapı bu sahnede kendiliğinden açılmamalı.
- Mira geri dönmemeli.
- Ejderhanın gerçek durumu açıklanmamalı.
- Oyuncunun seçimi otomatik yapılmamalı.

Bu bağlam Narrative Engine için oldukça güçlü ve temizdir.

46. İlk uygulanabilir Story Context Builder

İlk sürüm için şu yapı yeterlidir:

type CoreStoryContext = {
  mode: string
  sceneGoal: string

  worldFacts: string[]
  activeCharacterContexts: {
    characterId: string
    currentState: string[]
    activeGoal: string
    relevantMemories: string[]
    relationshipNotes: string[]
    beliefNotes: string[]
    behaviorGuidance: string[]
  }[]

  playerKnownFacts: string[]
  hiddenFacts: string[]

  pendingEvents: string[]
  fixedDecisions: string[]

  mustInclude: string[]
  mustNotInclude: string[]

  tone: string
  ageGuidance: string[]
  choiceOptions?: string[]
}

Temel işlemler:

collectContext()
resolveContextConflicts()
rankContextItems()
deduplicateContext()
compressContext()
translateStateToBehavior()
applyKnowledgeBoundaries()
applyNarrativeConstraints()
validateContext()
buildGenerationPrompt()
47. Context doğrulama

Narrative Engine’e göndermeden önce otomatik kontroller yapılmalıdır.

- Bir karakter bilmediği bilgiye sahip mi?
- Dünya gerçekleri kendi içinde çelişiyor mu?
- Ölü veya uzakta olan karakter sahnede görünüyor mu?
- Oyuncu kararı önceden çözülmüş mü?
- Gizli bilgi yanlışlıkla açık bağlama girmiş mi?
- Karakterin kararı Decision Engine çıktısıyla çelişiyor mu?
- Kritik geçmiş göz ardı edilmiş mi?
- Bağlam token bütçesini aşıyor mu?
48. Story Context Builder temel ilkeleri
1. Ham motor verileri doğrudan LLM’ye verilmez.
2. Dünya gerçeği, NPC inancı ve oyuncu bilgisi ayrılır.
3. Yalnızca sahneyle ilgili bilgi seçilir.
4. Sayısal durumlar davranış yönergesine dönüştürülür.
5. Tekrarlanan bilgiler birleştirilir.
6. Kritik gerçekler düşük öncelikli detaylardan önce gelir.
7. Geçmiş, açıklama olarak değil davranış etkisi olarak kullanılır.
8. Karakter kararları LLM tarafından değiştirilmez.
9. Oyuncuya ait seçimler açık bırakılır.
10. Gizli bilgi spoiler olarak açığa çıkmaz.
11. Bağlam token bütçesine göre sıkıştırılır.
12. Karakter gelişimi kademeli tutulur.
13. Anlatı kalitesi için tekrar geçmişi dikkate alınır.
14. Son bağlam üretimden önce doğrulanır.