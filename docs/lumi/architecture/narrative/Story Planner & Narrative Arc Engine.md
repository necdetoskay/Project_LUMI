Story Planner & Narrative Arc Engine

Bu motor, tek bir sahnenin doğru yazılmasından değil, bir maceranın baştan sona anlamlı biçimde ilerlemesinden sorumludur.

Narrative Engine sahneyi anlatır.

Story Planner ise şunları belirler:

Bu sahnede ne olmalı?
Neden şimdi olmalı?
Hangi hikâye ipliği ilerlemeli?
Ne kadar bilgi açığa çıkmalı?
Hikâye nerede durmalı?
Sıradaki sahneye ne bırakılmalı?

Narrative Arc Engine ise daha uzun vadeyi yönetir:

Bir macera nasıl gelişir?
Karakter zaman içinde nasıl değişir?
Gizem ne zaman çözülür?
Gerilim nasıl yükselir ve düşer?
Hikâye ne zaman tamamlanır?

Temel ayrım:

Story Planner
→ Sıradaki sahneyi planlar.

Narrative Arc Engine
→ Maceranın uzun vadeli yönünü korur.
1. Sistemdeki yeri
Player Request
↓
Story Intent
↓
Narrative Arc Engine
↓
Story Planner
↓
Decision Engine
↓
Action Resolution
↓
Story Context Builder
↓
Narrative Engine

Narrative Arc Engine, Story Planner’a sınırlar ve hedefler verir.

Örneğin:

Macera şu anda keşif aşamasında.
Ana sır henüz açıklanmamalı.
Tilki’nin cesaret gelişimi küçük bir adım ilerlemeli.
Sahne sonunda oyuncuya yön seçimi sunulmalı.

Story Planner bu talimatlardan gerçek bir sahne planı oluşturur.

2. Neden ayrı bir Story Planner gerekir?

Narrative Engine doğrudan dünya durumuna bakıp sahne yazarsa zamanla şu sorunlar oluşabilir:

her sahne aynı yapıya benzer,
olaylar gereksiz uzar,
ana görev unutulur,
yan karakterler kaybolur,
gizem çok erken çözülür,
karakter gelişimi bir anda gerçekleşir,
sürekli seçim sunulur,
hiçbir sahne gerçek sonuç üretmez,
hikâye doğal bir sona ulaşamaz.

Story Planner bu sorunları önceden kontrol eder.

Temel ilke:

Anlatı özgür olabilir; hikâye ilerlemesi plansız olmamalıdır.

3. Hikâye katmanları

LUMI’de anlatıyı dört farklı ölçekte düşünmeliyiz:

Beat
↓
Scene
↓
Story
↓
World Arc
Beat

Tek anlatısal hareket.

Örnek:

Tilki sembolü fark eder.
Scene

Bir amaç etrafında birleşmiş beat dizisi.

Örnek:

Değirmen çevresinde sembolün araştırılması.
Story

Başlangıç, gelişme ve sonuç içeren tek macera.

Örnek:

Kayıp haritanın ilk parçasını bulma macerası.
World Arc

Birden fazla hikâyeye yayılan büyük gelişme.

Örnek:

Ejderhanın geçmişinin ve adadaki eski sırrın keşfedilmesi.
4. Story veri modeli
type Story = {
  id: string
  universeId: string
  playerProfileId: string

  title?: string
  premise: string
  primaryGoalId: string

  status:
    | "planned"
    | "active"
    | "paused"
    | "completed"
    | "abandoned"
    | "archived"

  arcId?: string
  currentPhase: StoryPhase

  activeThreadIds: string[]
  resolvedThreadIds: string[]

  startedAt?: number
  completedAt?: number

  targetSceneCount: number
  minimumSceneCount: number
  maximumSceneCount: number
}
5. Hikâye fazları

MVP için şu fazlar yeterlidir:

type StoryPhase =
  | "setup"
  | "engagement"
  | "exploration"
  | "complication"
  | "decision"
  | "climax"
  | "resolution"
  | "aftermath"

Bu fazlar katı bir senaryo kalıbı değil, yön gösterici aşamalardır.

Setup

Hikâyenin başlangıç durumunu kurar.

mekân,
karakterler,
mevcut normal durum,
ilk merak unsuru.

Örnek:

Lumi ve Tilki, değirmenin yakınındaki köprü onarımını görmeye gider.
Engagement

Ana sorun veya merak belirginleşir.

Eski taşta haritadakine benzeyen bir sembol bulunur.

Oyuncu artık hikâyenin içinde neden ilerlediğini anlar.

Exploration

Karakterler bilgi toplar ve farklı yolları dener.

konuşmalar,
mekân inceleme,
küçük seçimler,
araç kullanımı,
ipucu toplama.
Complication

İlk beklenti yetersiz kalır veya yeni bir sorun ortaya çıkar.

Sembol kuzey yolunu gösteriyor gibi görünür fakat yol yağmur nedeniyle kapanmıştır.

Complication cezalandırıcı olmak zorunda değildir.

Ama hikâyenin düz bir çizgi hâlinde ilerlemesini engeller.

Decision

Oyuncunun anlamlı bir karar vermesi gerekir.

- Eski patikayı kullanmak
- Denizciden yardım istemek
- Köprünün onarılmasını beklemek
Climax

Hikâyenin en önemli yüzleşmesi veya problemi çözme anıdır.

Çocuk hikâyelerinde climax mutlaka savaş değildir.

Şunlardan biri olabilir:

bir sırrı anlamak,
korkuya rağmen yardım etmek,
iki karakteri barıştırmak,
doğru aracı kullanmak,
zor bir seçim yapmak.
Resolution

Ana hikâye sorusu cevaplanır.

Haritanın ilk parçasının yeri bulunur.

Fakat bütün dünya gizemleri çözülmek zorunda değildir.

Aftermath

Karakterler yaşananların sonucunu hisseder.

duygusal kapanış,
ilişki değişimi,
yeni nesne,
küçük kutlama,
sonraki hikâyeye hafif kanca.
6. Fazlar her hikâyede aynı uzunlukta olmaz

Kısa hikâye:

Setup
→ Engagement
→ Decision
→ Resolution

Orta hikâye:

Setup
→ Engagement
→ Exploration
→ Complication
→ Decision
→ Resolution

Uzun hikâye:

Setup
→ Engagement
→ Exploration
→ Complication
→ Exploration
→ Decision
→ Climax
→ Resolution
→ Aftermath

Story Planner sahne sayısını çocuğun yaşına, dikkat süresine ve hikâye türüne göre ayarlamalıdır.

7. Hikâyenin temel amacı

Her hikâyenin tek bir ana amacı olmalıdır.

type StoryGoal = {
  id: string
  description: string

  goalType:
    | "discover"
    | "rescue"
    | "repair"
    | "understand"
    | "reconcile"
    | "deliver"
    | "protect"
    | "explore"
    | "prepare"
    | "return"

  successConditions: string[]
  partialSuccessConditions: string[]
  failureAlternatives: string[]

  requiresPlayerChoice: boolean
}

Örnek:

Ana amaç:
Değirmendeki sembolün neyi gösterdiğini öğrenmek.

Yan amaçlar:

Tilki’nin korkusuna rağmen araştırmaya katılması.
Baykuş ile iş birliğinin güçlenmesi.
Köprü onarımının hikâyede görünmesi.

Yan amaçlar ana hikâyeyi bastırmamalıdır.

8. Hikâye vaadi

Her hikâye başlangıçta oyuncuya örtük veya açık bir vaat verir.

Örnek:

Değirmende gizemli bir sembol bulundu.

Hikâyenin vaadi:

Bu sembol hakkında anlamlı bir şey öğreneceğiz.

Hikâye sonunda hiçbir cevap verilmezse oyuncu tatminsiz hissedebilir.

Ancak bütün gizem çözülmek zorunda değildir.

Doğru çözüm:

Sembolün kuzey yolunu gösterdiği öğrenilir.
Ama neden haritada yer aldığı henüz bilinmez.

Yani:

Yerel soru cevaplanır.
Büyük soru açık kalabilir.
9. Story Question

Her hikâyenin bir ana sorusu tutulabilir.

type StoryQuestion = {
  id: string
  question: string

  answerType:
    | "confirmed_answer"
    | "partial_answer"
    | "character_choice"
    | "emotional_resolution"

  mustResolveByEnd: boolean
}

Örnek:

Bu sembol nereye işaret ediyor?

World Arc sorusu ise:

Bu sembolleri kim bıraktı?

İlk hikâye ilk soruyu cevaplayabilir; ikinci soru uzun vadeli kalır.

10. Hikâye iplikleri

Hikâye içindeki devam eden unsurlara Story Thread diyebiliriz.

type StoryThread = {
  id: string

  type:
    | "main_plot"
    | "mystery"
    | "relationship"
    | "character_growth"
    | "world_change"
    | "quest"
    | "promise"
    | "object_motif"

  description: string
  status:
    | "introduced"
    | "active"
    | "progressing"
    | "blocked"
    | "ready_to_resolve"
    | "resolved"
    | "dormant"

  importance: number
  urgency: number
  playerAwareness: number

  lastAdvancedSceneId?: string
  scenesSinceProgress: number

  minimumResolutionScene?: number
  maximumDormantScenes?: number
}
11. Ana ve yan iplik dengesi

Bir sahne çok fazla hikâye ipliğini aynı anda ilerletmemelidir.

Öneri:

Bir sahnede:

1 ana iplik
+
0–2 yan iplik

Örnek:

Ana iplik:

Sembolün anlamını araştırmak.

Yan iplik:

Tilki’nin Baykuş’a güvenmeye başlaması.

Motif:

Mavi bilekliğin verilen sözü hatırlatması.

Beş farklı görev aynı sahnede ilerlerse sahne dağılır.

12. Thread starvation

Bir hikâye ipliği çok uzun süre unutulmamalıdır.

Mira’nın kayboluşu tanıtıldı.
Sekiz sahne boyunca hiç anılmadı.

Bu kasıtlı değilse sorun olabilir.

type ThreadHealth = {
  threadId: string
  scenesSinceProgress: number
  urgencyGrowth: number

  state:
    | "healthy"
    | "cooling"
    | "neglected"
    | "overdue"
}

Story Planner ihmal edilmiş önemli ipliği:

ilerletebilir,
kısaca hatırlatabilir,
bilinçli şekilde dormant duruma alabilir.

Her sahnede tekrar etmek zorunda değildir.

13. Thread overload

Tersi de mümkündür.

Aynı iplik her sahnede görünürse hikâye tekdüze olur.

Her sahnede kayıp harita konuşuluyor.

Story Planner dinlenme sahneleri veya farklı yan amaçlar kullanmalıdır.

type ThreadUsagePolicy = {
  minimumCooldownScenes: number
  maximumConsecutiveScenes: number
}
14. Açık döngüler

Her açık hikâye ipliği oyuncunun zihninde bir beklenti oluşturur.

Bu nedenle açık döngü sayısı sınırlandırılmalıdır.

Öneri:

Küçük çocuk:
2–3 aktif açık döngü

Daha büyük çocuk:
3–5 aktif açık döngü

Örnek aktif döngüler:

- Değirmen sembolü ne gösteriyor?
- Denizci neden gece limana gidiyor?
- Baykuşun notunda ne yazıyor?

Aynı anda on gizem sunmak takip etmeyi zorlaştırır.

15. Hikâyenin ilerleme ölçüsü

Sahne üretildi diye hikâye ilerlemiş sayılmamalıdır.

type StoryProgressDelta = {
  informationGain: number
  goalProgress: number
  relationshipProgress: number
  characterArcProgress: number
  worldChange: number
  decisionImpact: number
}

Bir sahne en az bir alanda anlamlı ilerleme üretmelidir.

İstisna:

nefes alma sahnesi,
ilişki anı,
kısa atmosfer geçişi.

Ancak arka arkaya çok sayıda sıfır ilerlemeli sahne olmamalıdır.

16. Sahne amacı

Her sahnenin tek cümlelik bir amacı olmalıdır.

type ScenePurpose =
  | "introduce_problem"
  | "reveal_clue"
  | "test_assumption"
  | "deepen_relationship"
  | "create_complication"
  | "resolve_choice"
  | "prepare_climax"
  | "resolve_story"
  | "recover"
  | "transition"

Örnek:

Bu sahnenin amacı:
Baykuşun notundan kuzey yolunun öğrenilmesi ve sıradaki yöntemin oyuncuya bırakılması.

Amaç net değilse sahne muhtemelen gereksizdir.

17. Scene Planner girdisi
type ScenePlannerInput = {
  storyId: string
  currentPhase: StoryPhase

  primaryGoal: StoryGoal
  activeThreads: StoryThread[]
  unresolvedQuestions: StoryQuestion[]

  currentWorldState: unknown
  activeCharacters: unknown[]

  playerLastAction?: PlayerIntent
  pendingEvents: unknown[]

  recentScenePurposes: ScenePurpose[]
  recentPatterns: string[]

  ageProfile: string
  pacingProfile: PacingProfile
}
18. Scene Planner çıktısı
type PlannedScene = {
  id: string
  phase: StoryPhase

  purpose: ScenePurpose
  primaryThreadId: string
  secondaryThreadIds: string[]

  openingState: string[]
  plannedEvents: PlannedCanonicalEvent[]
  requiredBeats: NarrativeBeat[]

  informationToReveal: string[]
  informationToWithhold: string[]

  characterArcOpportunities: CharacterArcOpportunity[]
  choicePlan?: PlannedChoice

  expectedProgress: StoryProgressDelta

  endingType:
    | "choice"
    | "discovery"
    | "emotional_beat"
    | "transition"
    | "resolution"

  nextPhaseRecommendation?: StoryPhase
}
19. Faz geçişi

Story Planner her sahne sonunda mevcut fazın tamamlanıp tamamlanmadığını kontrol eder.

type PhaseTransitionRule = {
  from: StoryPhase
  to: StoryPhase
  requiredConditions: string[]
  optionalConditions: string[]
}

Örnek:

Engagement → Exploration

Gerekli:
- Ana sorun oyuncu tarafından anlaşılmış.
- En az bir uygulanabilir araştırma yolu açılmış.
Decision → Climax

Gerekli:
- Oyuncu ana yöntem veya taraf seçimini yapmış.
- Kritik sahne için ön koşullar hazır.
20. Faz atlama

Bazı hikâyeler faz atlayabilir.

Örnek kısa hikâye:

Setup
→ Engagement
→ Decision
→ Resolution

Ancak bu bilinçli olmalıdır.

Geçersiz atlama örneği:

Setup
→ Climax

Karakter ve problem henüz kurulmadıysa climax anlamsız olur.

21. Fazda takılı kalma

Hikâye sürekli exploration aşamasında kalabilir:

Yeni ipucu
Yeni ipucu
Yeni ipucu
Yeni ipucu

ama hiçbir karar veya sonuç yoktur.

Bu nedenle fazlar için yumuşak sahne bütçesi olmalıdır.

type PhaseBudget = {
  phase: StoryPhase
  minimumScenes: number
  targetScenes: number
  maximumScenes: number
}

Örnek orta hikâye:

Setup: 1
Engagement: 1
Exploration: 1–3
Complication: 1
Decision: 1
Climax: 1
Resolution: 1
Aftermath: 0–1
22. Hikâye süresi bütçesi
type StoryLengthBudget = {
  targetScenes: number
  maximumScenes: number
  targetWords: number

  currentSceneCount: number
  currentWordCount: number

  remainingProgressRequired: number
}

Story Planner hikâyenin sona yaklaşmasını buna göre ayarlar.

Örneğin maksimum sahne sayısına yaklaşıldıysa:

yeni büyük gizem açmamalı,
gereksiz yan görev başlatmamalı,
mevcut ana amacı çözmeye yönelmelidir.
23. Scope creep engelleme

Hikâye sırasında sürekli yeni sorun eklenirse macera tamamlanamaz.

Örnek:

Haritayı ararken köprü bozuldu.
Köprüyü düzeltirken Tilki kayboldu.
Tilki’yi ararken köyde yangın çıktı.
Yangını söndürürken ejderha kaçırıldı.

Bu kontrolsüz genişlemedir.

Story Planner şu kuralı kullanabilir:

Yeni complication:
Ana hedefle nedensel veya tematik olarak ilişkili olmalı.

Ayrıca:

Climax hazırlığından sonra yeni ana problem açılamaz.
24. Complication bütçesi
type ComplicationBudget = {
  maximumMajorComplications: number
  maximumMinorComplications: number

  usedMajorComplications: number
  usedMinorComplications: number
}

Kısa çocuk hikâyesi için:

1 ana komplikasyon
+
0–2 küçük engel

yeterli olabilir.

25. Zorluk artışı

Zorluk yalnızca fiziksel tehlike değildir.

Şu boyutlarda artabilir:

Bilgi zorluğu
Duygusal zorluk
İş birliği zorluğu
Kaynak zorluğu
Zaman baskısı
Mekânsal zorluk
Ahlaki belirsizlik

Küçük yaşta aynı anda bir veya iki zorluk boyutu yeterlidir.

26. Gerilim eğrisi
type TensionPoint = {
  sceneIndex: number
  targetTension: number
}

Örnek orta hikâye:

Setup: 0.15
Engagement: 0.30
Exploration: 0.40
Complication: 0.60
Decision: 0.65
Climax: 0.75
Resolution: 0.25
Aftermath: 0.10

Gerilim sürekli yükselmemelidir.

Küçük rahatlama anları gerekir.

27. Gerilim kaynakları

Story Planner sahneye uygun gerilim kaynağını seçer:

- bilinmeyen ses,
- zamanla silinen iz,
- karakterler arası görüş ayrılığı,
- erişilemeyen yol,
- yanlış anlaşılma,
- sınırlı kaynak,
- güven sorunu,
- seçim belirsizliği.

Ancak geçmiş sahnelerde sık kullanılan kaynaklar tekrar edilmemelidir.

28. Nefes alma sahneleri

Uzun hikâyelerde climax öncesinde veya complication sonrasında kısa dinlenme sahnesi kullanılabilir.

Amaçları:

karakterleri konuşturmak,
duyguyu işlemek,
çocuğa bilgiyi sindirme fırsatı vermek,
ilişki gelişimini göstermek,
gerilimi kısa süre azaltmak.

Nefes alma sahnesi ilerlemesiz olmak zorunda değildir.

Örnek:

Tilki ve Lumi fenerin yanında dinlenirken Tilki neden korktuğunu açıklar.

Bu sahne ilişki ipliğini ilerletir.

29. Karakter yayları

Karakter yayı, karakterin tek olayda tamamen değişmesi değildir.

type CharacterArc = {
  id: string
  characterId: string

  arcType:
    | "courage"
    | "trust"
    | "honesty"
    | "patience"
    | "independence"
    | "cooperation"
    | "self_acceptance"
    | "responsibility"

  startingPattern: string
  desiredDirection: string

  currentStage:
    | "unaware"
    | "challenged"
    | "experimenting"
    | "progressing"
    | "tested"
    | "integrated"
    | "regressed"

  evidenceEventIds: string[]
  maximumProgressPerStory: number
}
30. Karakter yayının örneği

Tilki’nin yayı:

Başlangıç:
Tehlike karşısında geri çekiliyor ve başkalarının karar vermesini bekliyor.

Yön:
Korkusunu inkâr etmeden küçük sorumluluklar alabilmek.

Tek hikâyede gerçekleşebilecek ilerleme:

- korktuğunu söylemesi,
- yine de çevreyi araştırmayı kabul etmesi,
- küçük bir konuda öneri sunması.

Tek hikâyede olmaması gereken:

- tamamen korkusuz hâle gelmesi,
- her tehlikeye tek başına atılması,
- eski davranışlarının tamamen yok olması.
31. Arc opportunity

Story Planner karakter gelişimini zorla sahneye eklememelidir.

Dünya olayı doğal bir fırsat sunmalıdır.

type CharacterArcOpportunity = {
  characterArcId: string
  triggerSituation: string

  possibleProgress: string
  possibleRegression: string

  mandatory: boolean
}

Örnek:

Durum:
Mağara girişinde bilinmeyen ses var.

Fırsat:
Tilki korkusunu açıkça söyleyebilir ve araştırmaya küçük bir katkı sunabilir.
32. Gelişim ve gerileme

Karakter yayları düz çizgi değildir.

Bazen karakter eski davranışına dönebilir.

Tilki önceki hikâyede cesur davrandı.
Yeni ve daha zor durumda tekrar geri çekildi.

Bu başarısızlık değildir.

Validation Engine şunu kontrol etmelidir:

Gerileme mevcut koşullarla açıklanabilir mi?

Gerileme sonrası karakterin bütün gelişimi silinmemelidir.

33. Arc saturation

Aynı karakter özelliği her hikâyede merkezde olmamalıdır.

Tilki her hikâyede korkusunu yeniyor.

Bir süre sonra tekrar eder.

Story Planner karakter yayları arasında rotasyon yapabilir:

Bir hikâye:
cesaret

Sonraki:
iş birliği

Sonraki:
merak ve sabır

Ana yay arka planda devam edebilir.

34. İlişki yayları

Karakter çiftleri için uzun vadeli ilişki yayları tutulabilir.

type RelationshipArc = {
  id: string
  characterAId: string
  characterBId: string

  theme:
    | "building_trust"
    | "repairing_hurt"
    | "learning_cooperation"
    | "healthy_independence"
    | "misunderstanding"
    | "shared_responsibility"

  currentStage: string
  activeTensions: string[]
  positiveEvidenceIds: string[]
  unresolvedEventIds: string[]
}

Örnek:

Tilki ve Baykuş başlangıçta birbirlerinin yöntemlerini sevmiyor.
Zamanla farklı güçlerinin birlikte işe yaradığını öğreniyorlar.
35. İlişki çatışmasının kullanımı

Her ilişki sahnesi tartışma olmak zorunda değildir.

İlişki ilerlemesi şu yollarla olabilir:

küçük yardım,
birlikte problem çözme,
özür,
dinleme,
alan tanıma,
güvenme,
paylaşma,
birbirinin becerisini fark etme.

Story Planner aynı çatışmayı sürekli tekrar etmemelidir.

36. Gizem yayları
type MysteryArc = {
  id: string
  centralQuestion: string

  truthFactIds: string[]
  revealStages: MysteryRevealStage[]

  currentStage: number
  minimumStoriesBeforeResolution: number
  maximumStoriesBeforeResolution?: number

  redHerringsAllowed: boolean
  playerTheoryIds: string[]
}
37. Gizem açığa çıkarma aşamaları
type MysteryRevealStage = {
  stage: number
  revealType:
    | "atmospheric_hint"
    | "ambiguous_clue"
    | "corroborating_clue"
    | "contradiction"
    | "partial_truth"
    | "full_reveal"

  allowedFactIds: string[]
  forbiddenFactIds: string[]
}

Örnek:

Aşama 1:
Mağaradan nefes sesi gelir.

Aşama 2:
Büyük pençe izi bulunur.

Aşama 3:
Yanmış ama eski bir bez parçası bulunur.

Aşama 4:
Yaratığın saldırmaktan çok saklandığı anlaşılır.

Aşama 5:
Ejderhanın yaralı olduğu öğrenilir.

Aşama 6:
Ejderhanın neden saklandığı açıklanır.
38. Gizem çözüm hızının kontrolü

Story Planner şu hataları engellemelidir:

İlk ipucu
→ hemen tam gerçek

ve:

On hikâye boyunca hiçbir anlamlı ilerleme yok

Gizem her ilgili hikâyede en azından şu işlevlerden birini sağlamalıdır:

yeni ipucu,
eski ipucunun yeni yorumu,
yanlış varsayımın zayıflaması,
şüphelilerin daralması,
kısmi gerçek,
duygusal anlam.
39. Kırmızı ringa balığı yerine çocuk uyumlu yanlış yönlendirme

Çocuk hikâyelerinde bilinçli kandırma dikkatli kullanılmalıdır.

Daha iyi yaklaşım:

Eksik bilgi nedeniyle makul ama yanlış yorum.

Örnek:

Tilki pençe izlerini görünce büyük bir canavar düşündü.
Sonra izlerin yaralı bir ejderhaya ait olduğu anlaşıldı.

Bu, oyuncuyu hileyle kandırmak yerine bilgiyle birlikte yorumu geliştirir.

40. Oyuncu teorileri

Çocuk gizem hakkında kendi fikrini söyleyebilir.

“Bence içerideki yaratık kötü değil.”

Bu teori world truth’a dönüşmez.

type PlayerTheory = {
  id: string
  playerProfileId: string
  mysteryArcId: string

  statement: string
  confidence?: number

  status:
    | "open"
    | "supported"
    | "weakened"
    | "confirmed"
    | "disproved"
}

Story Planner ileride bu teoriyi hatırlayabilir:

Lumi, daha önce yaratığın kötü olmayabileceğini düşündüğünü hatırladı.

Ancak sistem sonucu teoriye göre değiştirmek zorunda değildir.

41. Kehanet gibi zorunlu sonlardan kaçınma

Uzun vadeli plan dünya geleceğini katı biçimde kilitlememelidir.

Zayıf yapı:

Beş hikâye sonra ejderha kesinlikle köyü kurtaracak.

Daha iyi:

Ejderhanın köyle ilişki kurma ihtimali için koşullar hazırlanabilir.
Sonuç, oyuncu seçimlerine ve ilişkilere bağlıdır.

Arc Engine:

olası yönler

planlamalıdır; her ayrıntıyı önceden zorunlu kılmamalıdır.

42. Arc milestone

Uzun yaylar için ara hedefler kullanılabilir.

type ArcMilestone = {
  id: string
  arcId: string

  description: string
  prerequisites: string[]
  completionConditions: string[]

  playerGate: boolean
  status:
    | "locked"
    | "available"
    | "in_progress"
    | "completed"
}

Ejderha yayı örneği:

1. Varlığın izlerini keşfet
2. Tehlikeli olmadığından şüphelen
3. Yaralı olduğunu öğren
4. İlk güvenli teması kur
5. Geçmişini öğren
6. Köyle ilişkisi hakkında karar ver
43. Hikâye seçimi ile arc yönü

Oyuncu seçimleri arc’ı etkileyebilir.

Örneğin ejderhaya yaklaşım:

Merak ve yardım
→ trust-building rotası

Temkinli gözlem
→ slow discovery rotası

Köyden yardım isteme
→ community involvement rotası

Bunlar tamamen farklı evrenler oluşturmak zorunda değildir.

Ama:

görülen sahneler,
ilişki hızı,
bilgi açığa çıkma yöntemi,
katılan karakterler

değişebilir.

44. Branch sistemi

Tam dallanan hikâye ağacı hızla kontrolsüz büyür.

Bu nedenle LUMI için önerilen yapı:

Elastic Branching

Yani:

seçimler kısa ve orta vadede gerçek farklılıklar yaratır,
bazı yollar daha sonra ortak bir ana düğümde birleşebilir,
birleşme sırasında önceki seçimlerin etkileri korunur.

Örnek:

Denizciye git
→ bilgiyi ondan öğren

Baykuşu takip et
→ aynı bilgiyi eski tabeladan öğren

Köprüyü onar
→ kuzey yoluna doğrudan ulaş

Üç yol da kuzey yoluna çıkabilir.

Ama:

ilişkiler,
kullanılan kaynaklar,
öğrenilen ek bilgiler,
zaman,
karakter hafızaları

farklı olur.

45. Seçim sonuç katmanları

Her anlamlı seçim en az bir sonuç katmanını etkilemelidir.

type ChoiceImpact = {
  immediateOutcome: string[]
  shortTermEffects: string[]
  longTermSignals: string[]

  affectedThreads: string[]
  affectedRelationships: string[]
  affectedResources: string[]
  newKnowledge: string[]
}

Bütün seçimlerin uzun vadeli devasa etkisi olması gerekmez.

Ama seçim görünmez olmamalıdır.

46. Soft consequence

Çocuk hikâyeleri için birçok seçim sonucu yumuşak olabilir.

Örnek:

Önce denizciyle konuşmak
→ daha fazla bilgi
→ daha az risk
→ daha yavaş ilerleme

Doğrudan yolu araştırmak
→ daha hızlı keşif
→ daha az bilgi
→ küçük sürprizler

Hiçbiri açıkça “yanlış” değildir.

47. Seçim hafızası

Önemli seçimler gelecekte anılabilir.

type StoryChoiceRecord = {
  id: string
  storyId: string
  sceneId: string

  choiceId?: string
  freeformIntent?: PlayerIntent

  immediateEffects: string[]
  longTermTagIds: string[]
}

Örnek:

Lumi daha önce Tilki’nin hazır olmasını bekledi.

Gelecekte:

Tilki’nin güvenini etkileyebilir,
bir diyalogda hatırlanabilir,
benzer durumda Tilki daha açık konuşabilir.
48. Callback kullanımı

Geçmiş hikâyelere küçük geri çağrılar yaşayan dünya hissini güçlendirir.

Tilki eski mavi bilekliği gördü.
“Bunu köprüde verdiğin günü hatırlıyorum,” dedi.

Ancak callback kullanımı sınırlı olmalıdır.

Her sahne geçmiş referanslarla dolmamalıdır.

type CallbackCandidate = {
  sourceEventId: string
  relevance: number
  emotionalValue: number
  lastReferencedAt?: number
}
49. Foreshadowing

Gelecek olaylar küçük işaretlerle hazırlanabilir.

type ForeshadowingElement = {
  id: string
  targetArcId: string

  clue: string
  subtlety: number
  minimumRevealDistance: number

  status:
    | "planned"
    | "used"
    | "paid_off"
    | "abandoned"
}

Örnek:

Denizcinin çantasında eski bir pusula kısa süre görünür.

Üç hikâye sonra bu pusula önem kazanabilir.

50. Foreshadowing ödeme zorunluluğu

Her küçük atmosfer detayı ileride önemli olmak zorunda değildir.

Ama özellikle işaretlenmiş foreshadowing unsurları unutulmamalıdır.

Story Planner şunları takip eder:

Kullanıldı mı?
Oyuncu fark etti mi?
İleride anlam kazandı mı?
Artık geçersizse kapatıldı mı?

Uzun süre karşılığı verilmeyen çok sayıda işaret güveni azaltır.

51. Hikâye kancaları

Bir hikâye sonunda yeni macera ihtimali bırakılabilir.

Ama her final cliffhanger olmamalıdır.

Kanca türleri:

- yeni nesne,
- kısa mesaj,
- haritada yeni bölge,
- çözülmemiş küçük soru,
- karakter daveti,
- çevresel değişim.

Örnek:

Harita parçasının arkasında küçük bir ay sembolü vardı.

Ana hikâye tamamlanmıştır; yeni olasılık doğmuştur.

52. Kapanış türleri
type StoryEndingType =
  | "complete_closure"
  | "soft_hook"
  | "arc_progress"
  | "character_resolution"
  | "world_change"
Complete closure

Kısa bağımsız hikâyeler için.

Soft hook

Ana sorun çözülür, hafif merak kalır.

Arc progress

Büyük hikâye yayı bir aşama ilerler.

Character resolution

Asıl sonuç duygusal veya ilişkisel gelişimdir.

World change

Yeni bölge veya durum açılır.

53. Hikâye ne zaman bitmeli?

Hikâye yalnızca sahne sayısı dolduğu için bitmemelidir.

Aşağıdaki koşullar değerlendirilir:

- Ana story question cevaplandı mı?
- Primary goal yeterli sonuca ulaştı mı?
- Oyuncunun kritik seçimi sonucu işlendi mi?
- Climax etkisi görüldü mü?
- Duygusal kapanış sağlandı mı?
- Yeni büyük problem açılmadan durulabilir mi?
54. Zorunlu başarı yerine anlamlı sonuç

Hikâye sonunda ana hedef tamamen başarılamayabilir.

Örnek:

Harita parçası bulunamadı.
Ama sembolün kuzey yolunu gösterdiği öğrenildi.

Bu bir partial resolution olabilir.

type StoryResolutionLevel =
  | "full_success"
  | "partial_success"
  | "changed_goal"
  | "temporary_setback"
  | "emotional_resolution"

Ancak sonuç oyuncunun çabasını boşa çıkarmamalıdır.

55. Başarısız hikâye sonu

Çocuk hikâyesinde geçici başarısızlık olabilir.

Ama şu yapı tercih edilmelidir:

Amaç başarılamadı
+
bir şey öğrenildi
+
yeni yol açıldı
+
karakter desteği korundu

Örnek:

Kapı açılmadı. Ama Tilki, kilidin ay ışığında parladığını fark etti. Artık ne zaman geri gelmeleri gerektiğini biliyorlardı.

56. Tema sistemi

Her hikâyenin bir tema odağı olabilir.

type StoryTheme =
  | "courage"
  | "friendship"
  | "curiosity"
  | "patience"
  | "honesty"
  | "empathy"
  | "cooperation"
  | "responsibility"
  | "accepting_difference"

Tema açık ders cümlesi değildir.

Hikâyenin:

seçimleri,
komplikasyonu,
karakter tepkileri,
sonucu

aynı düşünce etrafında hafifçe bağlanır.

57. Tema ile olayın birleşmesi

Tema:

Sabır

Doğal hikâye mekanizması:

Yağmur nedeniyle izler hemen takip edilemiyor.
Karakterler işaretleri koruyup doğru zamanı bekliyor.

Zayıf kullanım:

Sabırlı olmak önemlidir, dedi Baykuş.

Bu tür cümleler bazen kullanılabilir ama tema yalnızca açıklanarak taşınmamalıdır.

58. Tema tekrarı

Aynı tema art arda kullanılmamalıdır.

type ThemeUsageHistory = {
  theme: StoryTheme
  recentStoryCount: number
  lastUsedStoryId: string
}

Çocuğun ilgilerine göre bazı temalar daha sık kullanılabilir, ancak çeşitlilik korunmalıdır.

59. Hikâye türleri
type StoryGenre =
  | "exploration"
  | "mystery"
  | "rescue"
  | "social"
  | "construction"
  | "journey"
  | "celebration"
  | "nature"
  | "puzzle"
  | "character_drama"

Tür, mevcut dünya durumundan ve aktif hikâye ipliklerinden seçilmelidir.

Rastgele tür değişimi yapılmamalıdır.

60. Story pattern

Her tür için olası yapı kalıpları bulunabilir.

Örnek mystery:

Unusual sign
→ initial theory
→ investigation
→ contradictory clue
→ revised theory
→ partial reveal

Örnek repair:

Damage discovered
→ needs assessed
→ materials gathered
→ obstacle
→ cooperation
→ repair result

Bunlar şablondur, birebir metin değildir.

61. Pattern tekrar önleme
type StoryPatternUsage = {
  patternId: string
  timesUsed: number
  lastUsedAt: number
  cooldownStories: number
}

Story Planner:

son kullanılan yapıyı tekrar seçmemeli,
aynı tür içinde farklı kalıplar kullanmalı,
karakter ve mekân kombinasyonlarını çeşitlendirmelidir.
62. Çeşitlilik boyutları

Hikâye çeşitliliği yalnızca konu değişimi değildir.

Mekân
Aktif karakterler
Ana problem
Çözüm yöntemi
Tema
Hikâye türü
Seçim biçimi
Gerilim kaynağı
Kullanılan eşya
Ana duygu

Story Planner yakın geçmişteki kombinasyonlarla benzerliği ölçebilir.

63. Novelty score
type StoryNoveltyScore = {
  locationNovelty: number
  characterCombinationNovelty: number
  problemNovelty: number
  resolutionNovelty: number
  structuralNovelty: number

  total: number
}

Ancak yüksek yenilik her zaman iyi değildir.

Çocuğun tanıdığı unsurlar da korunmalıdır.

Doğru denge:

Tanıdık karakter
+
yeni problem
+
kısmen yeni mekân veya yöntem
64. Familiarity anchor

Her hikâyede en az bir tanıdık dayanak bulunabilir:

sevilen karakter,
bilinen mekân,
eski nesne,
tanıdık rutin,
önceki bir ilişki.

Bu, yaşayan dünya sürekliliğini korur.

Tamamen yeni karakter, yeni mekân ve yeni kurallar aynı anda sunulursa bilişsel yük artabilir.

65. Yeni öğe bütçesi
type IntroductionBudget = {
  maxNewCharacters: number
  maxNewLocations: number
  maxNewConcepts: number
  maxNewImportantItems: number
}

Küçük çocuk için bir hikâyede örneğin:

1 yeni önemli karakter
1 yeni mekân
1 yeni özel nesne

yeterli olabilir.

66. Karakter kadrosu seçimi

Story Planner aktif karakterleri şu puanlarla seçebilir:

Story relevance
Relationship relevance
Arc opportunity
Skill relevance
Recent absence
Combination novelty
Player preference

Ama her hikâyede bütün sevilen karakterleri kullanmak doğru değildir.

Öneri:

Ana oyuncu karakteri
+
1 ana yol arkadaşı
+
0–2 destek karakter
67. Spotlight dengesi

Aynı karakter sürekli merkezde kalmamalıdır.

type CharacterSpotlightHistory = {
  characterId: string

  leadStoryCount: number
  supportStoryCount: number
  recentSceneCount: number
  lastLeadStoryId?: string
}

Ancak çocuğun açıkça sevdiği ana karakterler daha sık kullanılabilir.

68. NPC uygunluğu

Bir karakter yalnızca becerisi işe yaradığı için sahneye ışınlanmamalıdır.

Baykuş yukarıdan görebiliyor.

ama Baykuş şu anda uzak bir bölgede ise:

çağrılması,
mesaj gönderilmesi,
daha sonra gelmesi

gerekir.

Story Planner karakter seçiminde mekânsal ve zamansal uygunluğu kontrol eder.

69. Nesne ve envanter fırsatları

Daha önce alınmış nesneler unutulmamalıdır.

type ItemNarrativeOpportunity = {
  itemId: string
  relevanceToGoal: number
  lastUsedStoryId?: string
  symbolicValue: number
  mechanicalValue: number
}

Story Planner uygun olduğunda envanter nesnelerini seçenek olarak açabilir.

Ama her sorunun çözümü aynı özel nesne olmamalıdır.

70. Chekhov yükümlülüğü

Hikâyede özel şekilde vurgulanan nesne beklenti yaratır.

Örnek:

Parlayan mavi anahtar

önemli biçimde tanıtıldıysa:

bu hikâyede,
yakın bir hikâyede,
veya açıkça geleceğe bırakılan bir arc içinde

işlev kazanmalıdır.

Her dekor nesnesi için bu zorunlu değildir.

71. Görev üretimi

Story Planner mevcut dünya durumundan yeni görev adayları çıkarabilir.

Kaynaklar:

- NPC hedefleri,
- bekleyen dünya olayları,
- keşfedilmemiş mekânlar,
- eksik kaynaklar,
- ilişki sorunları,
- gizem arc’ları,
- oyuncunun geçmiş seçimleri,
- mevsimsel veya çevresel değişimler.
type QuestCandidate = {
  sourceType: string
  premise: string
  primaryGoal: StoryGoal

  relevantCharacterIds: string[]
  locationIds: string[]

  urgency: number
  emotionalValue: number
  novelty: number
  feasibility: number
}
72. Görev seçimi
Quest Score =
Player Interest
+ World Relevance
+ Character Arc Opportunity
+ Open Thread Value
+ Novelty
+ Feasibility
− Repetition
− Cognitive Load

En yüksek puan otomatik seçilmek zorunda değildir.

Çocuğa bazen harita veya görev panosu üzerinden birkaç macera seçeneği sunulabilir.

73. Hikâye başlatma türleri

Yeni hikâye şu biçimlerde başlayabilir:

Reactive:
Dünya olayı gerçekleşti.

Proactive:
Karakter bir hedef önerdi.

Exploratory:
Haritada yeni yer açıldı.

Relational:
Bir karakter konuşmak veya yardım istemek istiyor.

Player-led:
Çocuk doğrudan bir fikir söyledi.

Continuation:
Eski açık iplik yeniden aktif oldu.

Bu başlangıç biçimleri dönüşümlü kullanılmalıdır.

74. Oyuncunun kendi hikâye fikri

Çocuk:

“Bu kez denizin altına gidelim.”

diyebilir.

Story Planner bu isteği:

dünya kuralları,
mevcut kaynaklar,
açık hikâye iplikleri,
yaş profili

ile birleştirir.

Örnek:

Deniz altına doğrudan gidilemiyor.
Ama yaşlı denizci, su altında nefes sağlayan eski bir kabuktan söz edebilir.

Bu fikir yeni hikâye arc’ına dönüştürülebilir.

75. Player-led premise sınırı

Çocuğun fikri mümkünse korunmalıdır.

Ancak sistem:

kritik world truth’u bozmaz,
karakter güçlerini aniden değiştirmez,
geçmişi silmez,
güvenlik sınırlarını aşmaz.

Yani:

Çocuğun yaratıcı amacı korunur.
Uygulama biçimi evrene uyarlanır.
76. Plan deterministik mi olmalı?

Story Planner tamamen deterministik olmak zorunda değildir.

Aynı dünya durumunda birkaç geçerli sahne olabilir.

Kontrollü çeşitlilik için:

Uygun sahne adayları oluştur
↓
Kurallarla filtrele
↓
Puanla
↓
En iyi birkaç adaydan seed ile seç

Bu sayede:

test edilebilirlik,
tekrar üretilebilirlik,
çeşitlilik

birlikte korunur.

77. Scene candidate
type SceneCandidate = {
  id: string

  purpose: ScenePurpose
  primaryThreadId: string

  plannedEvents: PlannedCanonicalEvent[]
  expectedProgress: StoryProgressDelta

  tensionTarget: number
  noveltyScore: number
  feasibilityScore: number
  continuityScore: number
  repetitionPenalty: number

  totalScore: number
}
78. Sahne adaylarının reddedilme nedenleri

Bir sahne adayı şu durumlarda reddedilir:

- oyuncu kapısını ihlal ediyor,
- gerekli karakter erişilebilir değil,
- gizemi erken çözüyor,
- aynı yapı yakın zamanda kullanıldı,
- hikâye fazına uygun değil,
- sahne bütçesini aşıyor,
- yeni gereksiz iplik açıyor,
- ana hedefe hiç katkı sağlamıyor,
- yaş için fazla karmaşık,
- mevcut dünya gerçeğiyle çelişiyor.
79. Story Planner’da LLM kullanımı

Story Planner tamamen LLM’ye bırakılmamalıdır.

Önerilen yapı:

Kurallı planlama:
- faz,
- aktif thread,
- bütçe,
- player gate,
- olay uygunluğu,
- bilgi sınırı.

LLM yardımcı olabilir:
- yaratıcı sahne adayları,
- farklı complication fikirleri,
- doğal tema bağlantıları,
- tekrar etmeyen küçük hikâye kancaları.

LLM’nin önerdiği her aday kurallı sistem tarafından doğrulanmalıdır.

80. Planner Proposal modeli
type PlannerProposal = {
  scenePurpose: string
  proposedEvents: string[]
  proposedComplication?: string
  proposedChoiceTypes: string[]

  rationaleSummary: string
  claimedRequiredFacts: string[]
}

Bu öneri doğrudan kanonik plan olmaz.

Akış:

LLM Proposal
↓
World Compatibility Check
↓
Arc Check
↓
Safety Check
↓
Canonical Scene Plan
81. MVP’de kurallı planlama

İlk sürüm için LLM Planner gerekli değildir.

Kurallı planlayıcı şu mantıkla çalışabilir:

1. Aktif hikâye fazını al.
2. Ana thread’i seç.
3. Faz için uygun scene purpose seç.
4. Uygun kanonik olay adaylarını getir.
5. NPC karar gerektirenleri işaretle.
6. Bilgi açığa çıkarma sınırını uygula.
7. Sahne sonu türünü belirle.
8. Gerekirse seçim adayları oluştur.
9. Beklenen progress delta’yı hesapla.
10. Planı doğrula.
82. Faz tabanlı MVP kararları
Setup
Tanıdık ortam + yeni sorun.
Engagement
Ana sorun netleşir.
Exploration
Bir ipucu veya yöntem seçilir.
Complication
Ana hedefle ilişkili tek engel oluşur.
Decision
Gerçekten farklı 2–3 seçenek sunulur.
Climax
Oyuncunun önceki seçimi ve NPC kararları birlikte sonucu şekillendirir.
Resolution
Ana story question cevaplanır.
Aftermath
Duygusal kapanış + isteğe bağlı yumuşak kanca.
83. Hikâye planının saklanması

Bütün hikâyeyi baştan ayrıntılı planlamak gerekmez.

İki seviyeli plan daha uygundur:

Arc Outline:
Uzun vadeli yön.

Rolling Scene Plan:
Sadece sıradaki 1–2 sahne ayrıntılı.

Bu sayede oyuncu seçimlerine uyum sağlanır.

84. Rolling planning
type RollingStoryPlan = {
  currentScenePlan: PlannedScene
  nextSceneCandidates: SceneCandidate[]
  futureMilestones: ArcMilestone[]
}

Bir sahne tamamlandığında:

Dünya ve karakter state’i güncellenir
↓
Eski gelecek adayları yeniden değerlendirilir
↓
Yeni sıradaki sahne planlanır

Oyuncu seçimi nedeniyle eski plan geçersiz olabilir.

85. Plan invalidation

Plan şu durumlarda yeniden kurulmalıdır:

- oyuncu beklenmeyen serbest eylem yaptı,
- NPC kararı beklenmedik sonuç üretti,
- kritik world event oluştu,
- oyuncu farklı görev seçti,
- envanter durumu değişti,
- ilişkisel eşik aşıldı,
- planlanan karakter artık erişilebilir değil.

Eski plan zorla uygulanmamalıdır.

86. Plan stabilitesi

Öte yandan her küçük değişiklik bütün arc’ı bozmamalıdır.

Küçük state değişimi
→ yalnızca sahne düzeyi yeniden planlama

Büyük seçim
→ story düzeyi yeniden planlama

Arc milestone değişimi
→ arc düzeyi yeniden planlama
87. Hikâye terk etme

Çocuk aktif hikâyeyi bırakıp başka yere gitmek isteyebilir.

“Haritayı bırakıp köye dönelim.”

Sistem bunu engellememelidir.

Story durumu:

active
→ paused

Açık iplikler korunur.

NPC’ler ve dünya uygun şekilde tepki verebilir.

Daha sonra hikâye devam ettirilebilir.

88. Paused story
type PausedStoryState = {
  storyId: string
  pauseReason:
    | "player_choice"
    | "new_priority"
    | "world_event"
    | "manual_pause"

  resumableFromStateVersion: number
  unresolvedThreadIds: string[]
  requiredRecapFacts: string[]
}

Uzun süre sonra devam edilirse dünya değişmiş olabilir.

Bu nedenle eski sahne doğrudan devam ettirilmeyebilir; önce yeniden bağlama oturtulur.

89. Hikâyenin geçersiz hâle gelmesi

Bazı dünya değişimleri eski görevi anlamsızlaştırabilir.

Örnek:

Köprüyü onarma görevi açık.
Başka bir hikâyede köprü tamamen yeniden yapılmış.

Eski görev:

obsolete

olmalıdır.

Ancak oyuncunun geçmiş emeği silinmemelidir.

Görev özeti:

Köprü başka bir ekibin yardımıyla tamamlandı.
Lumi’nin daha önce topladığı malzemeler de kullanıldı.
90. Story retirement

Bazı açık iplikler artık değerli olmayabilir.

type ThreadRetirementReason =
  | "resolved_elsewhere"
  | "world_changed"
  | "low_relevance"
  | "duplicate"
  | "player_disinterest"
  | "safety_change"

Thread sessizce silinmemelidir.

Kanonik geçmişte arşivlenir.

91. Oyuncu ilgisi

Çocuğun seçimleri hangi hikâye türlerini sevdiğine dair sinyal verebilir.

type PlayerStoryPreference = {
  exploration: number
  mystery: number
  social: number
  puzzle: number
  characterFocus: number
  tensionTolerance: number
}

Bu değerler:

açık tercih,
seçilen yollar,
yarım bırakılan hikâyeler,
geri bildirim

üzerinden yavaşça güncellenebilir.

Tek bir seçim kesin tercih sayılmamalıdır.

92. Tercih ve çeşitlilik dengesi

Çocuk sürekli gizem seçiyorsa sistem daha çok gizem sunabilir.

Ama yalnızca gizem üretmemelidir.

Preference bias
+
controlled exploration

Örneğin:

%60 sevilen türler
%25 komşu türler
%15 yeni deneyimler

Kesin oranlar testle ayarlanmalıdır.

93. Yaşa göre plan karmaşıklığı
4–5 yaş
- tek ana amaç,
- az karakter,
- kısa neden-sonuç zinciri,
- 2–3 seçenek,
- açık duygusal sinyaller,
- kısa gizem.
6–7 yaş
- bir ana ve bir yan iplik,
- birkaç aşamalı görev,
- daha belirgin karakter motivasyonu,
- 3 seçenek,
- basit yanlış varsayım.
8–10 yaş
- birkaç aktif iplik,
- daha uzun gizem,
- ilişkisel çatışma,
- kaynak ve strateji seçimi,
- daha karmaşık sonuçlar.
94. Hikâye planı ve ebeveyn ayarları

Ebeveyn ayarları şunları etkileyebilir:

hikâye uzunluğu,
maksimum gerilim,
izin verilen temalar,
seçim karmaşıklığı,
eğitim hedefleri,
üzücü temaların kullanımı,
serbest eylem genişliği.

Ancak ebeveyn ayarları:

geçmiş dünya gerçeğini,
karakter hafızasını,
önceki seçimleri

geriye dönük değiştirmemelidir.

95. Story Planner çıktısının doğrulanması

Plan Narrative Engine’e gitmeden şu kontroller yapılmalıdır:

- Ana sahne amacı var mı?
- Ana story thread ilerliyor mu?
- Faz için uygun mu?
- Oyuncu kontrolü korunuyor mu?
- Gerekli dünya koşulları mevcut mu?
- Gizem reveal aşaması aşılmıyor mu?
- Karakter arc ilerlemesi fazla hızlı mı?
- Yeni açık döngü bütçesi aşılıyor mu?
- Complication ana hedefle ilgili mi?
- Sahne seçimle bitecekse seçenekler gerçekten farklı mı?
- Hikâye maksimum sahne sayısına yaklaşıyorsa sonuca yöneliyor mu?
96. Story Planner hata örnekleri
Erken çözüm
İlk sahnede ejderhanın bütün geçmişinin açıklanması.
Sahte ilerleme
Karakterler aynı bilgiyi farklı cümlelerle tekrar konuşuyor.
Arc sıçraması
Tilki tek cesur eylemle artık tamamen korkusuz.
Scope creep
Ana görevle ilgisiz üç yeni sorun açılması.
Thread unutma
Ana ipucu birkaç sahne boyunca kayboluyor.
Aşırı seçim
Her sahnenin sonunda çocuk karar vermek zorunda.
97. Seçim sıklığı

Her sahnede seçim sunmak yorucu olabilir.

type ChoiceCadence = {
  minimumScenesBetweenMajorChoices: number
  allowMinorChoiceInBetween: boolean
}

Seçimler iki sınıfa ayrılabilir:

Major choice:
Hikâye yolunu değiştirir.

Minor choice:
Yöntem, araç veya diyalog biçimini değiştirir.

Bazı sahneler yalnızca kararın sonucunu ve karakter tepkisini göstermelidir.

98. Oyuncu ajansı ölçüsü
type PlayerAgencyScore = {
  meaningfulChoices: number
  recognizedFreeformActions: number
  rememberedConsequences: number
  forcedOutcomes: number
}

Hikâye çok uzun süre oyuncu katkısı olmadan ilerlememelidir.

Ama sürekli seçim ekranına dönüşmemelidir.

Denge:

Oku
→ keşfet
→ küçük etkileşim
→ anlamlı seçim
→ sonucu gör
99. Hikâye ritmi

Story Planner şu ritim türlerini dönüşümlü kullanabilir:

Action
Discovery
Dialogue
Reflection
Choice
Consequence
Transition

Örnek:

Keşif sahnesi
→ karakter diyaloğu
→ seçim
→ hareketli sonuç
→ sakin kapanış

Arka arkaya üç uzun diyalog veya üç keşif sahnesi tekdüzelik yaratabilir.

100. Örnek tam hikâye planı
Hikâye
Eski Değirmenin İşareti
Ana soru
Taş üzerindeki sembol nereye işaret ediyor?
Büyük arc sorusu
Bu sembolleri kim bıraktı?
Ana tema
Merak ile dikkat arasındaki denge.
Karakter yayı
Tilki korkusunu saklamak yerine açıkça söyleyip araştırmaya katkı sunacak.
Sahne 1 — Setup

Amaç:

Köprü onarımı ve değirmen çevresini kurmak.

Olaylar:

- Lumi ve Tilki köprüye gelir.
- Onarım başladığını görür.
- Değirmenin yanında alışılmadık iz fark edilir.

Bitiş:

Yumuşak keşif kancası.
Sahne 2 — Engagement

Amaç:

Sembolü bulmak ve ana soruyu oluşturmak.

Olaylar:

- Tilki taşın üzerindeki sembolü fark eder.
- Sembolün eski haritadaki çizgilere benzediği anlaşılır.
- Tam anlamı bilinmez.

Bitiş:

Oyuncu hangi kaynağa bakacağını seçer.

Seçenekler:

1. Baykuşun notunu aç
2. Denizciye sor
3. Harita parçasıyla karşılaştır
Sahne 3 — Exploration

Oyuncu Baykuşun notunu açtı.

Olaylar:

- Notta kuzey yolundaki eski işaretten söz edilir.
- Tilki işaretlerin bağlantılı olabileceğini düşünür.
- Ana gerçek hâlâ çözülmez.

Yan iplik:

Baykuşun daha önce tek başına araştırma yaptığı anlaşılır.
Sahne 4 — Complication

Amaç:

Kuzey yolunun erişilemez olduğunu göstermek.

Olaylar:

- Yağmur küçük patikayı kapatmıştır.
- Köprü henüz tam kullanılabilir değildir.
- Doğrudan ilerleme mümkün değildir.

Tilki yayı:

Tilki korktuğunu söyler ama geri dönmek yerine alternatif aramayı önerir.
Sahne 5 — Decision

Seçenekler:

1. Köprü onarımına yardım et
2. Denizcinin küçük teknesini iste
3. Ormandaki eski dolambaçlı yolu araştır

Her seçenek:

farklı yöntem,
farklı karakter etkileşimi,
farklı küçük sonuç

üretir.

Sahne 6 — Climax

Çocuk köprü onarımına yardım etti.

Olaylar:

- Toplanan eski tahtalar kullanılır.
- Tilki güvenli destek noktalarını bulur.
- Köprü geçici olarak yayalara açılır.
- Karakterler kuzey işaretine ulaşır.

Keşif:

Sembolün eski gözlem kulesini gösterdiği anlaşılır.
Sahne 7 — Resolution

Ana soru cevaplanır:

Sembol kuzeydeki gözlem kulesini gösteriyor.

Büyük soru açık kalır:

İşaretleri kimin bıraktığı bilinmiyor.

Duygusal kapanış:

Tilki korkmasına rağmen çözümün bir parçası olduğunu fark eder.

Ödül:

Haritada gözlem kulesi bölgesi açılır.

Yumuşak kanca:

Kulenin sembolü haritadakinden biraz farklıdır.
101. MVP Story Planner veri modeli
type CoreStoryPlan = {
  storyId: string
  premise: string

  primaryGoal: StoryGoal
  currentPhase: StoryPhase

  activeThreadIds: string[]
  primaryThreadId: string

  storyQuestion: string
  targetSceneCount: number
  maximumSceneCount: number

  tensionTarget: number
  theme?: StoryTheme

  currentCharacterArcOpportunities: CharacterArcOpportunity[]

  nextScene: PlannedScene
}
102. MVP ana işlemler
selectPrimaryStoryThread()

determineCurrentStoryPhase()

selectScenePurpose()

generateCanonicalEventCandidates()

filterEventsByWorldState()

applyMysteryRevealLimits()

applyCharacterArcLimits()

applyStoryLengthBudget()

applyRepetitionPenalty()

buildSceneCandidates()

scoreSceneCandidates()

selectSceneCandidate()

buildNarrativeBeats()

buildChoicePlan()

validateStoryPlan()

advanceStoryPhase()

resolveOrPauseStoryThreads()
103. Örnek MVP planlayıcı
function planNextScene(
  input: ScenePlannerInput
): PlannedScene {
  const primaryThread = selectPrimaryStoryThread(
    input.activeThreads
  )

  const purpose = selectScenePurpose({
    phase: input.currentPhase,
    primaryThread,
    recentPurposes: input.recentScenePurposes
  })

  const eventCandidates = generateCanonicalEventCandidates({
    purpose,
    primaryThread,
    worldState: input.currentWorldState
  })

  const validEvents = eventCandidates
    .filter(filterByWorldCompatibility)
    .filter(filterByPlayerControl)
    .filter(filterByRevealLimits)
    .filter(filterByStoryBudget)

  const scoredCandidates = buildAndScoreSceneCandidates({
    events: validEvents,
    input
  })

  const selected = selectSeededCandidate(scoredCandidates)

  return buildAndValidatePlannedScene(selected, input)
}
104. İlk sürümde yapılmaması gerekenler

Başlangıçta şunları kurmamalıyız:

yüzlerce dallı önceden yazılmış hikâye ağacı,
bütün dünya geleceğini baştan planlamak,
sınırsız aktif arc,
aynı anda çok sayıda ana görev,
tamamen LLM tabanlı planlama,
her seçime benzersiz sonsuz dal,
aşırı karmaşık dramatik teori modelleri,
her karakter için aynı anda birkaç aktif gelişim yayı,
uzun süre çözülmeyen onlarca gizem.

MVP hedefi:

Her sahne anlamlı ilerlesin.
Her hikâye doğal bir sona ulaşsın.
Karakterler yavaşça gelişsin.
Oyuncu seçimleri hissedilsin.
Hikâyeler birbirinin kopyası olmasın.
105. Story Planner & Narrative Arc Engine temel ilkeleri
1. Story Planner sahneyi planlar; Narrative Engine sahneyi anlatır.
2. Her hikâyenin tek bir ana amacı ve ana sorusu olmalıdır.
3. Yerel hikâye sorusu cevaplanabilir; büyük dünya gizemi açık kalabilir.
4. Hikâye fazları ilerlemeyi yönlendirir fakat katı kalıp değildir.
5. Her sahnenin açık bir amacı olmalıdır.
6. Bir sahne bir ana ve en fazla birkaç yan ipliği ilerletmelidir.
7. Açık hikâye iplikleri unutulmamalı ama sürekli tekrarlanmamalıdır.
8. Hikâyeler faz veya exploration aşamasında süresiz kalmamalıdır.
9. Yeni komplikasyonlar ana hedefle ilişkili olmalıdır.
10. Hikâye kapsamı kontrolsüz büyümemelidir.
11. Karakter gelişimi küçük ve kanıtlanabilir adımlarla ilerlemelidir.
12. Gelişim düz bir çizgi olmak zorunda değildir.
13. Gizemler aşamalı ve kontrollü şekilde açılmalıdır.
14. Oyuncu teorileri world truth değildir.
15. Seçimler kısa veya uzun vadede gerçek fark yaratmalıdır.
16. Tam dallanma yerine elastic branching tercih edilmelidir.
17. Hikâye sonunda oyuncunun çabası anlamlı bir sonuç üretmelidir.
18. Her hikâye cliffhanger ile bitmemelidir.
19. Tema olayların içinde gösterilmeli, ders olarak anlatılmamalıdır.
20. Hikâye yapıları, karakter kombinasyonları ve çözüm yolları çeşitlendirilmelidir.
21. Tanıdık unsurlar ile yeni unsurlar dengelenmelidir.
22. Bütün hikâye baştan kilitlenmemeli; rolling planning kullanılmalıdır.
23. Oyuncu beklenmeyen bir yön seçtiğinde plan yeniden kurulabilmelidir.
24. Hikâye bırakılabilir, duraklatılabilir ve daha sonra yeniden bağlama oturtulabilir.
25. LLM yaratıcı öneri sunabilir ama kanonik planın otoritesi değildir.

Story Planner & Narrative Arc Engine’in kavramsal çekirdeği böylece tamamlandı.