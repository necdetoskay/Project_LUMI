Quest, Goal & Progression Engine

Bu motor, hikâyelerdeki amaçları kalıcı ve doğrulanabilir dünya ilerlemesine dönüştürür.

Story Planner şunu belirler:

Bu hikâyede hangi amaç işlenecek?

Quest Engine ise şunları belirler:

Amaç gerçekten ilerledi mi?
Hangi koşul tamamlandı?
Görev hangi aşamaya geçti?
Hangi sonuçlar kalıcı oldu?
Ne açıldı?
Ne hâlâ bekliyor?

Temel ayrım:

Story:
Amacın anlatısal sunumu.

Quest:
Amacın sistem içindeki kanonik durumu.

Örneğin hikâyede karakterler kayıp haritadan konuşabilir.

Bu, görevin ilerlediği anlamına gelmez.

Görev ancak doğrulanmış bir olay gerçekleşirse ilerler:

Harita parçası bulundu.
Haritanın yeri öğrenildi.
Bir karakterden güvenilir ipucu alındı.
Yeni bölge keşfedildi.

Temel ilke:

Hikâyede söylenen değil, kanonik olarak gerçekleşen olay ilerleme üretir.

1. Sistemdeki yeri
World State
↓
Quest & Goal Engine
↓
Story Planner
↓
Decision Engine
↓
Action Resolution
↓
Canonical Events
↓
Quest Progress Evaluation
↓
State Commit
↓
New World Opportunities

Quest Engine iki yönde çalışır.

İlk yön:

Mevcut görevler
→ Story Planner’a hikâye fırsatları verir.

İkinci yön:

Gerçekleşen olaylar
→ Görevlerin ilerlemesini sağlar.
2. Quest, Goal ve Progression ayrımı

Bu üç kavram aynı şey değildir.

Goal

Bir aktörün ulaşmak istediği durumdur.

Tilki kuzey yolunu görmek istiyor.
Quest

Oyuncunun veya grubun takip edebileceği yapılandırılmış amaç dizisidir.

Kuzey yolunun sırrını araştır.
Progression

Görevlerden bağımsız olarak dünya, karakter veya oyuncu seviyesinde açılan kalıcı ilerlemedir.

Gözlem kulesi haritada açıldı.
Tilki ile güven seviyesi arttı.
Yeni envanter yuvası açıldı.
Yeni hikâye türü kullanılabilir oldu.
3. Goal veri modeli
type Goal = {
  id: string

  ownerType:
    | "player"
    | "character"
    | "group"
    | "world"
    | "system"

  ownerId: string
  description: string

  goalType:
    | "reach_state"
    | "obtain_item"
    | "learn_fact"
    | "help_character"
    | "repair"
    | "explore"
    | "protect"
    | "reconcile"
    | "prepare"
    | "maintain"

  status:
    | "inactive"
    | "active"
    | "blocked"
    | "completed"
    | "failed"
    | "abandoned"
    | "obsolete"

  priority: number
  urgency: number

  successConditions: GoalCondition[]
  failureConditions: GoalCondition[]

  parentGoalId?: string
  sourceEventId?: string
}
4. Goal Condition
type GoalCondition = {
  id: string

  conditionType:
    | "fact_exists"
    | "event_occurred"
    | "entity_state"
    | "item_owned"
    | "location_reached"
    | "relationship_threshold"
    | "knowledge_acquired"
    | "quest_stage"
    | "time_window"
    | "counter_threshold"

  parameters: Record<string, unknown>
}

Örnek:

{
  conditionType: "location_reached",
  parameters: {
    characterId: "lumi",
    locationId: "north_observation_tower"
  }
}
5. Goal sahipliği

Her hedef oyuncuya ait değildir.

Player Goal:
Haritanın parçasını bulmak.

NPC Goal:
Tilki güvenli bir geçit bulmak istiyor.

World Goal:
Köy ekibi köprüyü onarmaya çalışıyor.

Group Goal:
Lumi ve arkadaşları yaralı ejderhaya yardım etmek istiyor.

Bu sahiplik önemlidir.

Çünkü oyuncu NPC hedefini etkileyebilir ama doğrudan sahiplenemez.

6. Goal autonomy

Daha önce tanımladığımız goal autonomy burada uygulanır:

type GoalAutonomy =
  | "fully_autonomous"
  | "partially_autonomous"
  | "player_gated"
  | "player_owned"
Fully autonomous

NPC kendi başına ilerletebilir.

Denizci teknesini tamir ediyor.
Partially autonomous

NPC hazırlık yapabilir ama kritik aşama oyuncuyu bekler.

Tilki izleri araştırır ama mağaraya tek başına girmez.
Player gated

İlerleme kritik oyuncu kararı gerektirir.

Ejderhaya güvenilip güvenilmeyeceği.
Player owned

Kararı yalnızca oyuncu verir.

Hangi bölgeye gidileceği.
7. Quest veri modeli
type Quest = {
  id: string
  universeId: string

  title: string
  description: string

  questType:
    | "main"
    | "side"
    | "character"
    | "relationship"
    | "exploration"
    | "world"
    | "learning"
    | "repeatable"

  status:
    | "locked"
    | "available"
    | "active"
    | "paused"
    | "completed"
    | "partially_completed"
    | "failed"
    | "abandoned"
    | "obsolete"
    | "archived"

  ownerProfileId?: string

  stageIds: string[]
  currentStageId?: string

  prerequisiteIds: string[]
  dependencyQuestIds: string[]

  rewardIds: string[]
  failureOutcomeIds: string[]

  repeatPolicy?: QuestRepeatPolicy

  createdAt: number
  activatedAt?: number
  completedAt?: number
}
8. Quest türleri
Main Quest

Dünya veya büyük anlatı yayı için önemlidir.

Eski sembollerin kaynağını keşfet.
Side Quest

Ana hikâyeyi destekler ama zorunlu değildir.

Değirmenin kayıp çanını bul.
Character Quest

Bir karakterin kişisel hedefini işler.

Tilki’nin eski yuvasını bulmasına yardım et.
Relationship Quest

Karakterler arası ilişkiyi ilerletir.

Tilki ile Baykuşun birlikte çalışmasını sağla.
Exploration Quest

Yeni bölge veya dünya bilgisi açar.

Kuzey gözlem kulesine ulaş.
World Quest

Dünya durumunu kalıcı biçimde değiştirir.

Kırık köprüyü onar.
Learning Quest

Hikâye içine yerleştirilmiş öğrenme hedefidir.

Beş farklı yaprağı eşleştir.
Repeatable Quest

Farklı bağlamlarda tekrar yapılabilen küçük görevlerdir.

Bahçedeki kayıp eşyaları bul.
9. Ana görev ve ana hikâye aynı şey değildir

Bir ana görev birden fazla hikâyeye yayılabilir.

Quest:
Eski sembollerin kaynağını keşfet.

Alt hikâyeler:

1. Değirmenin İşareti
2. Kuzey Kulesi
3. Denizcinin Eski Defteri
4. Unutulmuş Ada

Her hikâye görevin bir aşamasını ilerletir.

Benzer şekilde tek hikâye birden fazla küçük görevi etkileyebilir.

Ancak bir hikâyede bir ana görev odak noktası olmalıdır.

10. Quest Stage
type QuestStage = {
  id: string
  questId: string

  name: string
  description: string

  order?: number

  status:
    | "locked"
    | "available"
    | "active"
    | "completed"
    | "skipped"
    | "failed"
    | "obsolete"

  entryConditions: GoalCondition[]
  completionConditions: GoalCondition[]

  allowedNextStageIds: string[]
  playerGate: boolean

  stageType:
    | "discover"
    | "prepare"
    | "travel"
    | "investigate"
    | "choose"
    | "act"
    | "resolve"
    | "recover"
}
11. Örnek görev aşamaları

Görev:

Kuzey Gözlem Kulesini Bul

Aşamalar:

1. Değirmendeki sembolü keşfet
2. Sembolün yönünü çöz
3. Kuzey yoluna ulaşmanın yöntemini seç
4. Geçidi hazırla
5. Gözlem kulesine ulaş
6. Kuleyi incele
7. Bulguları kaydet

Her aşama ayrı hikâye olmak zorunda değildir.

Bazıları aynı hikâyede tamamlanabilir.

12. Stage geçiş kuralları
type QuestStageTransition = {
  questId: string
  fromStageId: string
  toStageId: string

  requiredConditions: GoalCondition[]
  forbiddenConditions: GoalCondition[]

  transitionType:
    | "automatic"
    | "player_confirmed"
    | "story_triggered"
    | "system_reviewed"
}

Görev aşamaları serbestçe atlanmamalıdır.

Örnek:

Sembol henüz bulunmadı
↓
Kuleye yöneldi

Fiziksel olarak tesadüfen kule bulunabilir.

Ama bu durumda görev alternatif bir geçiş kullanmalıdır:

unexpected_discovery

Eski aşamalar:

tamamlandı sayılabilir,
atlandı olarak işaretlenebilir,
yeni bağlama göre yeniden kurulabilir.
13. Lineer ve dallanan görevler
Lineer görev
A → B → C → D

Küçük ve anlaşılır görevler için uygundur.

Dallanan görev
A
├─ B1
├─ B2
└─ B3
   ↓
   C

Örnek:

Kuzey yoluna ulaşmak için:

B1:
Köprüyü onar

B2:
Denizcinin teknesini kullan

B3:
Orman patikasını bul

Üç yöntem de görevin aynı sonraki aşamasına bağlanabilir.

Bu elastic branching yaklaşımıyla uyumludur.

14. Quest graph
type QuestGraph = {
  questId: string
  nodes: QuestStage[]
  edges: QuestStageTransition[]
}

Tamamen serbest grafik güçlüdür ama yönetimi zorlaştırır.

MVP için:

Ana omurga
+
birkaç alternatif yöntem

yeterlidir.

15. Prerequisite

Bir görev kullanılabilir olmadan önce gerekli koşullar olabilir.

type QuestPrerequisite = {
  type:
    | "quest_completed"
    | "quest_stage_completed"
    | "world_fact"
    | "relationship_threshold"
    | "character_available"
    | "item_owned"
    | "location_discovered"
    | "player_knowledge"
    | "arc_milestone"

  parameters: Record<string, unknown>
}

Örnek:

Ejderhayla İlk Temas

ön koşulları:

- Mağara bölgesi keşfedilmiş olmalı.
- Ejderhanın yalnızca tehdit olmadığına dair en az bir kanıt olmalı.
- Oyuncu ejderhanın varlığını bilmeli.
16. Gizli görevler

Bazı görevler oyuncu tarafından hemen görünmeyebilir.

type QuestVisibility =
  | "visible"
  | "hinted"
  | "hidden"

Örnek:

Denizcinin eski dostunu bulma görevi

world state içinde aday olarak bulunabilir.

Ancak oyuncu ilgili ipucunu keşfedene kadar görev listesinde görünmez.

17. Görev keşfi

Görev keşfi kanonik bir olay olmalıdır.

QUEST_DISCOVERED

Kaynakları:

NPC isteği,
yeni mekân,
eşya,
mektup,
world event,
oyuncunun kendi hedefi,
önceki seçimin sonucu.

Görev yalnızca anlatıcı bahsetti diye aktif olmamalıdır.

18. Quest availability
Locked:
Ön koşullar tamamlanmamış.

Available:
Başlatılabilir.

Active:
Oyuncu veya sistem tarafından takip ediliyor.

Paused:
Geçici olarak durdurulmuş.

Obsolete:
Dünya değişimi nedeniyle artık anlamlı değil.

Available olan her görev otomatik active yapılmamalıdır.

Bu, görev listesini gereksiz doldurur.

19. Aktif görev sınırı

Çocuğun aynı anda takip etmesi gereken görev sayısı sınırlı olmalıdır.

Öneri:

4–5 yaş:
1 ana + 1 küçük yan görev

6–7 yaş:
1 ana + 2 yan görev

8–10 yaş:
1–2 ana iplik + 2–4 yan görev

Dünya içinde daha fazla görev adayı bulunabilir ama arayüzde yalnızca ilgili olanlar gösterilir.

20. Quest focus
type QuestFocusState = {
  focusedQuestId?: string
  trackedQuestIds: string[]
  suggestedQuestIds: string[]
}

Story Planner varsayılan olarak odak görevini dikkate alır.

Ancak:

kritik world event,
doğrudan oyuncu isteği,
karakterin acil ihtiyacı

başka bir görevi geçici olarak öne çıkarabilir.

21. Player-created goals

Çocuk kendi hedefini söyleyebilir.

“Tilki’ye bir ev yapalım.”

Bu hemen tam görev olmak zorunda değildir.

Akış:

Player Intent
↓
Goal Candidate
↓
World Feasibility
↓
Scope Estimation
↓
Quest Proposal

Sonuç:

{
  questType: "character",
  title: "Tilki İçin Sıcak Bir Yuva",
  stages: [
    "Uygun yer seç",
    "Malzemeleri bul",
    "Tilki’nin fikrini sor",
    "Yuvayı inşa et"
  ]
}
22. Oyuncu hedefi NPC’ye zorla uygulanamaz

Çocuk:

“Tilki burada yaşasın.”

diyebilir.

Ancak Tilki’nin:

kendi evi,
tercihleri,
korkuları,
ilişkileri

vardır.

Doğru görev:

Tilki için bir yuva öner.
Onun ne istediğini öğren.
Birlikte karar ver.

Yanlış görev:

Tilki’yi burada yaşamaya zorla.
23. NPC Goal Engine entegrasyonu

NPC hedefleri Quest Engine için görev kaynağı olabilir.

Örnek:

Tilki Goal:
Yağmurdan korunacak bir yer bulmak.

Baykuş Goal:
Eski sembolleri araştırmak.

Denizci Goal:
Teknesini fırtınadan önce hazırlamak.

Bu hedefler:

kendi kendine ilerleyebilir,
oyuncudan yardım isteyebilir,
hikâye adayı oluşturabilir,
birbirleriyle çatışabilir.
24. NPC goal conflict

Örnek:

Baykuş:
Hemen kuzey yoluna gitmek istiyor.

Tilki:
Önce köprünün güvenli olduğundan emin olmak istiyor.

Bu bir görev hatası değildir.

Story Planner bunu:

diyalog,
yöntem seçimi,
iş birliği problemi

olarak kullanabilir.

Oyuncu hangi görüşü destekleyeceğini seçebilir.

NPC’ler yine de kendi kararlarını verir.

25. Group goal

Birden fazla karakterin ortak hedefi olabilir.

type GroupGoal = Goal & {
  participantIds: string[]

  contributionRequirements?: {
    participantId: string
    contributionType: string
  }[]
}

Örnek:

Köprüyü geçici olarak onar.

Katkılar:

Lumi:
Tahtaları seçer.

Tilki:
Güvenli destek noktalarını bulur.

Denizci:
İpi bağlar.

Bu, her karakterin becerisinin görünmesini sağlar.

26. Goal decomposition

Büyük hedefler küçük hedeflere bölünmelidir.

Ana hedef:
Gözlem kulesine ulaş.

Alt hedefler:
- Rotayı öğren.
- Geçiş yöntemi seç.
- Gerekli malzemeyi bul.
- Yolculuğu tamamla.
type GoalTree = {
  rootGoalId: string
  childGoalIds: Record<string, string[]>
}

Alt hedeflerin tamamı zorunlu olmayabilir.

27. Required ve optional objectives
type QuestObjective = {
  id: string
  questStageId: string

  description: string

  requirement:
    | "required"
    | "optional"
    | "bonus"
    | "alternative"

  completionConditions: GoalCondition[]
}

Örnek:

Required:
Kuzey yoluna ulaş.

Optional:
Baykuşun eski notunu bul.

Bonus:
Köprü onarımına yardım et.

Alternative:
Tekne veya orman yolundan birini kullan.
28. Objective visibility

Bazı bonus hedefler baştan görünmeyebilir.

Örnek:

Denizciye verdiğin sözü hatırla.

Bu görev sırasında doğal olarak açılabilir.

Ancak oyuncunun görmediği bir hedef tamamlanmadığı için cezalandırılmaması gerekir.

29. Progress event

Görev ilerlemesi yalnızca yapılandırılmış olaylardan hesaplanmalıdır.

type QuestProgressEvent = {
  id: string
  questId: string
  stageId?: string
  objectiveId?: string

  sourceDomainEventId: string

  progressType:
    | "condition_met"
    | "counter_increment"
    | "stage_completed"
    | "alternative_selected"
    | "blocked"
    | "failed"
    | "recovered"

  amount?: number
  createdAt: number
}
30. Progress counter

Bazı görevler sayısal ilerleme taşır.

type ProgressCounter = {
  id: string
  current: number
  required: number
  maximum?: number

  aggregation:
    | "sum"
    | "unique"
    | "consecutive"
    | "highest"
}

Örnek:

Beş farklı yaprak bul.

Burada yalnızca toplam beş nesne değil:

unique

sayımı kullanılmalıdır.

31. Progress yüzdesi

Her görevde yüzde göstermek uygun değildir.

3 / 5 tahta bulundu

açık ve faydalıdır.

Ama:

Ejderhanın güvenini %62 kazandın

yaşayan karakter hissini bozabilir.

Bu nedenle ilerleme görünürlüğü sınıflandırılmalıdır.

type ProgressVisibility =
  | "exact"
  | "approximate"
  | "stage_only"
  | "hidden"
32. Çocuğa gösterilen görev durumu

Mekanik sistem detayları sadeleştirilmelidir.

Sistem durumu:

Stage 3 of 7
2/3 conditions complete

Çocuk arayüzü:

Kuzey yoluna ulaşmanın bir yolunu bul.

Tamamlananlar:

✓ Sembolü buldun
✓ Sembolün kuzeyi gösterdiğini öğrendin
○ Kuzey yoluna ulaş
33. Progression türleri
type ProgressionType =
  | "world"
  | "map"
  | "character"
  | "relationship"
  | "knowledge"
  | "inventory"
  | "capability"
  | "story"
  | "cosmetic"
  | "learning"
34. World progression

Dünya durumundaki kalıcı gelişmelerdir.

Örnek:

köprü onarıldı,
değirmen yeniden çalışıyor,
köy bahçesi büyüdü,
fener kulesi tekrar yakıldı.

World progression görsel ve işlevsel olarak hissedilmelidir.

35. Map progression
type MapLocationProgress = {
  locationId: string

  state:
    | "unknown"
    | "rumored"
    | "visible"
    | "discovered"
    | "visited"
    | "mapped"
    | "mastered"

  discoveredByEventId?: string
  visitedAt?: number
}

Örnek:

Unknown:
Haritada görünmez.

Rumored:
“Denizin kuzeyinde bir kule olduğu söyleniyor.”

Visible:
Haritada sis içinde işaret görünür.

Discovered:
Konumu öğrenildi.

Visited:
Oyuncu bölgeye ulaştı.

Mapped:
Bölgedeki ana yollar öğrenildi.
36. Harita açılması

Bir bölge yalnızca hikâyede adı geçti diye keşfedilmiş sayılmamalıdır.

Örnek:

Denizci kuzeyde bir kule olduğunu söyledi.

Sonuç:

rumored

Kulenin koordinatları veya yolu öğrenilirse:

discovered

Oyuncu oraya giderse:

visited
37. Harita üzerindeki içerikler

Bir bölge açıldığında her şey hemen görünmemelidir.

Location
├─ Main landmark
├─ Hidden path
├─ Character home
├─ Resource area
└─ Mystery node

Kademeli keşif yaşayan dünya hissini artırır.

38. Character progression

Karakter ilerlemesi iki ayrı sistemdir:

Capability progression
Personality tendency progression
Capability

Öğrenilebilir beceriler:

yön bulma,
yüzme,
işaret okuma,
basit tamir,
hayvanlarla iletişim,
harita kullanma.
Personality tendency

Yavaş değişen eğilimler:

cesaret,
sabır,
yardımseverlik,
merak,
dürüstlük.

Bunlar klasik oyun seviyesi gibi hızlı artmamalıdır.

39. Capability modeli
type Capability = {
  id: string
  characterId: string

  capabilityType: string
  proficiency: number
  confidence: number

  evidenceEventIds: string[]
  unlockedAbilities: string[]
}

Örnek:

Harita okuma:
proficiency 0.35

Bir haritayı tek başına tam çözemez ama yön işaretlerini fark edebilir.

40. Beceri deneyimi

Bir beceriyi kullanmak her zaman gelişim sağlamamalıdır.

Experience Quality =
Challenge
× Active Participation
× Outcome Understanding

Karakter yalnızca başka birinin yaptığı işi izlediyse düşük deneyim kazanır.

Kendi katkısı olduysa daha yüksek kazanır.

41. Beceri kilit açma
type CapabilityUnlock = {
  id: string
  capabilityId: string

  requiredProficiency: number
  requiredEvidenceTypes: string[]

  unlockedActionType: string
}

Örnek:

Basit harita yönü okuma

açıldığında oyuncu şu eylemi daha güvenilir yapabilir:

Haritadaki ana yönü belirle.

Bu süper güç değildir.

Sadece yeni action candidate açar veya başarı ihtimalini artırır.

42. Player character progression

Oyuncu karakterinin gelişimi:

seçilmiş eylemler,
öğrenilmiş beceriler,
kazanılmış araçlar,
ilişkiler,
keşfedilmiş bölgeler

üzerinden oluşabilir.

Ancak çocuğun gerçek kişiliğiyle karıştırılmamalıdır.

Lumi karakteri harita okumada gelişti.

demek uygundur.

Çocuk artık stratejik düşünür.

gibi gerçek kişilik iddiası yapılmamalıdır.

43. Relationship progression

İlişkiler görev ödülü olarak doğrudan verilmemelidir.

Yanlış:

Görevi tamamladın:
Tilki güveni +20

Doğru:

Görev sırasında gerçekleşen yardım, bekleme, dinleme ve söz tutma olayları ilişki motorunu etkiler.

Görev tamamlanması yalnızca ilişki olaylarının bağlamını sağlar.

44. Knowledge progression
type KnowledgeProgress = {
  subjectId: string
  factId: string

  state:
    | "unknown"
    | "hinted"
    | "suspected"
    | "known"
    | "understood"

  sourceEventIds: string[]
}

Bir gerçeği duymak ile anlamak aynı şey değildir.

Örnek:

Known:
Kule kuzeyde.

Understood:
Kulenin sembol ağıyla bağlantılı olduğu anlaşıldı.
45. Inventory progression

Envanter ilerlemesi yalnızca daha fazla eşya toplamak değildir.

Şunları içerebilir:

yeni araç türü,
taşıma kapasitesi,
özel konteyner,
eşya yükseltme,
eşya hakkında yeni kullanım bilgisi.

Örnek:

Eski pusula bulundu.

İlk durumda yalnızca dekoratif olabilir.

Daha sonra kullanımı öğrenilir:

Pusula ay sembollerine tepki veriyor.
46. Capability ve item ilişkisi

Bazı eylemler hem beceri hem araç gerektirebilir.

Harita üzerinde rota çizmek:
- harita gerekli,
- temel harita okuma becerisi gerekli.

Araç tek başına otomatik başarı sağlamamalıdır.

Beceri de gerekli fiziksel araç yoksa yeterli olmayabilir.

47. Story progression

Story progression:

tamamlanan hikâyeler,
açık arc’lar,
çözülmüş büyük sorular,
açılmış yeni macera türleri

gibi anlatısal ilerlemedir.

type StoryProgressionState = {
  completedStoryIds: string[]
  activeArcIds: string[]
  completedMilestoneIds: string[]
  availableStorySeedIds: string[]
}
48. Reward Engine

Görev tamamlandığında ödüller kanonik ve anlamlı olmalıdır.

type QuestReward = {
  id: string

  rewardType:
    | "item"
    | "map_unlock"
    | "knowledge"
    | "capability"
    | "cosmetic"
    | "world_change"
    | "story_hook"
    | "badge"
    | "relationship_event"
    | "access"

  payload: Record<string, unknown>

  visibility:
    | "explicit"
    | "narrative"
    | "hidden_system"

  conditions?: GoalCondition[]
}
49. Ödül türleri
Item
Eski gözlem merceği.
Map unlock
Kuzey gözlem kulesi haritada açılır.
Knowledge
Ay sembolünün kuzey anlamına geldiği öğrenilir.
Capability
Basit sembol karşılaştırma eylemi açılır.
Cosmetic
Harita çıkartması veya karakter aksesuarı.
World change
Köprü kalıcı olarak kullanılabilir olur.
Story hook
Yeni ada hakkında mektup gelir.
Badge
Dikkatli Gözlemci.
Access
Değirmenin üst katı açılır.
50. Ödülün hikâyeden doğması

Ödül görev sonunda gökten düşmemelidir.

Yanlış:

Görevi tamamladın.
Birden altın anahtar kazandın.

Doğru:

Kulenin eski bekçisi, onarıma yardım ettikleri için depo anahtarını verdi.

Ödülün:

kaynağı,
nedeni,
dünyadaki yeri

anlaşılır olmalıdır.

51. Maddi olmayan ödüller

Her görev eşya vermemelidir.

Çocuk hikâyeleri için güçlü ödüller:

yeni arkadaşlık,
teşekkür,
yeni yer keşfi,
gizem cevabı,
karakter güveni,
dünya değişimi,
özel hikâye anısı,
yeni seçenek.

Bu ödüller envanter şişmesini engeller.

52. Reward budget
type RewardBudget = {
  maximumMajorRewards: number
  maximumMinorRewards: number

  itemRewardAllowed: boolean
  worldChangeAllowed: boolean
}

Küçük bir görev büyük nadir eşya vermemelidir.

Ödül büyüklüğü:

Görev önemi
+
zorluk
+
oyuncu katkısı
+
dünya etkisi

ile uyumlu olmalıdır.

53. Badge sistemi

Rozetler eylem desenlerini tanır.

type Badge = {
  id: string
  name: string
  description: string

  category:
    | "exploration"
    | "helping"
    | "observation"
    | "creativity"
    | "cooperation"
    | "learning"
    | "persistence"

  criteria: BadgeCriterion[]
  repeatable: boolean
}
54. Badge kriterleri
type BadgeCriterion = {
  eventType: string
  requiredCount: number

  uniqueContexts?: number
  minimumDifficulty?: number
  mustBePlayerChosen?: boolean
}

Örnek:

Dikkatli Gözlemci

Kriter:

Üç farklı hikâyede oyuncu tarafından seçilen inceleme eylemi.

Tek sahnede üç kez aynı nesneye bakmak yeterli olmamalıdır.

55. Rozet ve kişilik etiketi ayrımı

Rozet:

Bu hikâyelerde dikkatli gözlem eylemleri kullandın.

anlamına gelir.

Şu anlama gelmez:

Sen her zaman dikkatli bir insansın.

Rozet eylemi takdir eder, kimlik yargısı üretmez.

56. Kilit açma sistemi
type Unlockable = {
  id: string

  type:
    | "location"
    | "story_seed"
    | "character"
    | "activity"
    | "cosmetic"
    | "capability"
    | "interaction_mode"

  unlockConditions: GoalCondition[]
}

Kilit açmalar yalnızca “seviye 5 oldun” mantığına dayanmamalıdır.

Dünya mantığıyla ilişkili olmalıdır.

Örnek:

Deniz altı bölgesi:
- su altı kabuğu bulunmalı,
- denizci ile yeterli güven,
- ilgili hikâye tamamlanmalı.
57. Progression gate

Gate, içeriğe erişimi kontrol eder.

type ProgressionGate = {
  id: string
  targetId: string

  requiredConditions: GoalCondition[]
  alternativeConditionGroups?: GoalCondition[][]

  gateType:
    | "hard"
    | "soft"
    | "knowledge"
    | "safety"
    | "story"
}
Hard gate

Koşul tamamlanmadan mümkün değildir.

Kapıyı açmak için anahtar gerekli.
Soft gate

Alternatif yöntem mümkündür ama daha zordur.

Tekne yoksa orman yolu kullanılabilir.
Knowledge gate

Doğru bilgi olmadan eylem seçeneği görünmez.

Story gate

Büyük olay, arc aşaması gelmeden açılmaz.

Safety gate

Yaş veya ebeveyn ayarı nedeniyle belirli içerik açılmaz.

58. Gate görünürlüğü

Kapalı içerik her zaman gösterilmemelidir.

Hidden:
Çocuk varlığını bilmiyor.

Teased:
Haritada sisli bir işaret var.

Visible locked:
Kapı görülüyor ama açılamıyor.

Available:
Koşullar sağlandı.

Sürekli kilit simgeleri çocukta eksiklik hissi yaratmamalıdır.

59. Fail-forward

Görev başarısızlığı hikâyeyi ve dünyayı tamamen kilitlememelidir.

Failure
↓
Consequence
↓
New information or route
↓
Adjusted goal

Örnek:

Köprü onarımı tamamlanamadı.

Fail-forward:

- Geçici geçiş kurulamadı.
- Fakat nehrin aşağısında eski bir sal bulundu.
- Yeni yöntem açıldı.
60. Başarısızlık türleri
type QuestFailureType =
  | "temporary_setback"
  | "partial_failure"
  | "method_failure"
  | "time_window_missed"
  | "goal_changed"
  | "irrecoverable_failure"

Çocuk hikâyelerinde çoğu başarısızlık:

temporary_setback
method_failure
partial_failure

olmalıdır.

Irrecoverable failure çok sınırlı kullanılmalıdır.

61. Method failure

Amaç değil yöntem başarısız olabilir.

Amaç:
Kuzey yoluna ulaş.

Yöntem:
Köprüyü onar.

Sonuç:
Köprü yöntemi başarısız oldu.
Ama görev devam ediyor.

Bu ayrım çok önemlidir.

Aksi takdirde tek başarısız deneme bütün görevi bitirir.

62. Partial completion
type QuestCompletionResult = {
  level:
    | "full"
    | "partial"
    | "alternative"
    | "failed"

  completedObjectiveIds: string[]
  unresolvedObjectiveIds: string[]

  rewardsGranted: string[]
  followupQuestIds: string[]
}

Örnek:

Harita bulunamadı.
Ama konumu öğrenildi.

Görev:

partially_completed

olabilir.

Yeni görev:

Haritayı kuzey kulesinden getir.
63. Failure consequence sınırları

Başarısızlık şu sonuçları üretebilir:

zaman kaybı,
küçük kaynak tüketimi,
alternatif yol,
NPC’nin geçici hayal kırıklığı,
yeni bilgi,
geçici engel.

Kaçınılması gereken:

sevilen karakterin ağır zarar görmesi,
bütün ilerlemenin silinmesi,
çocuk suçlaması,
görev zincirinin tamamen kapanması,
aşırı kaynak kaybı.
64. Quest recovery

Başarısız veya durmuş görevlerin geri dönüş yolu olabilir.

type QuestRecoveryPath = {
  questId: string
  failureStateId: string

  recoveryConditions: GoalCondition[]
  recoveredStageId: string

  recoveryCost?: string[]
}

Örnek:

Denizci yardım etmeyi reddetti.

Recovery yolları:

güven kazanmak,
başka kanıt göstermek,
Baykuş aracılığıyla konuşmak,
alternatif rota bulmak.
65. Quest pause

Çocuk görevi bırakabilir.

active
→ paused

Pause durumunda:

aşama korunur,
kritik süre sınırı yoksa ceza oluşmaz,
NPC’ler düşük yoğunlukta kendi hedeflerini sürdürebilir,
hikâye daha sonra recap ile devam eder.
66. Süreli görevler

Zaman sınırı kullanılacaksa dikkatli olunmalıdır.

type QuestTimeConstraint = {
  startAt: number
  deadlineAt: number

  deadlineType:
    | "hard"
    | "soft"
    | "world_window"

  offlinePolicy:
    | "pause"
    | "advance_safely"
    | "convert_to_pending_player"
}

Çocuk uygulamaya girmedi diye görev otomatik başarısız olmamalıdır.

Varsayılan:

soft deadline
veya
offline pause

olmalıdır.

67. World window

Bazı olaylar belirli koşullarda daha uygundur.

Örnek:

Ay sembolü yalnızca dolunayda görünür.

Çocuk fırsatı kaçırırsa:

bir sonraki pencere gösterilebilir,
alternatif gözlem yöntemi açılabilir,
görev tamamen yok olmamalıdır.
68. Repeatable quests

Tekrarlanabilir görevler dünyayı canlı tutabilir.

Örnek:

bahçede kayıp araç bulmak,
köprü kontrolü,
hasat yardımı,
harita işaretleme,
karaktere küçük eşya götürme.

Ama mekanik tekrar hissi oluşmamalıdır.

69. Repeat policy
type QuestRepeatPolicy = {
  cooldownDays: number
  maximumRepeats?: number

  variationDimensions: string[]
  rewardDecay: boolean

  requiredWorldChanges?: string[]
}

Variation dimensions:

farklı mekân,
farklı karakter,
farklı nesne,
farklı yöntem,
farklı hava,
farklı öğrenme hedefi.
70. Tekrarlanabilir görevlerde kanonik sonuç

Aynı kayıp eşya görevi tekrar edilirse aynı benzersiz nesne yeniden kaybolmamalıdır.

Görev sistemi:

yeni instance,
yeni nesne,
yeni olay kaynağı

oluşturmalıdır.

type QuestInstance = {
  id: string
  questTemplateId: string

  instantiatedEntityIds: string[]
  instantiatedAt: number
}
71. Quest template
type QuestTemplate = {
  id: string
  questType: string

  requiredRoles: string[]
  requiredWorldConditions: GoalCondition[]

  variableSlots: {
    name: string
    allowedEntityTypes: string[]
  }[]

  stageTemplateIds: string[]
  rewardPolicyId: string
}

Örnek:

Kayıp Eşya Görevi

Owner NPC
Lost Item
Search Location
Helper Character

Her instance farklı kanonik öğelerle oluşturulur.

72. Quest generation

Yeni görevler üç biçimde oluşabilir:

Authored Quest
Systemic Quest
Hybrid Quest
Authored

Önceden tasarlanmış önemli görev.

Systemic

Dünya state’inden kurallarla oluşan küçük görev.

Hybrid

Önceden hazırlanmış şablon, dünya durumuna göre doldurulur.

MVP için hybrid yaklaşım güçlüdür.

73. Quest candidate scoring
Quest Score =
Player Interest
+ World Relevance
+ Active Arc Relevance
+ Character Goal Relevance
+ Novelty
+ Feasibility
+ Emotional Value
− Repetition
− Cognitive Load
− Safety Risk

Bu puan Story Planner’ın yeni hikâye seçimine girdi sağlar.

74. Görev önceliği ve aciliyet

Priority ile urgency aynı değildir.

Priority:
Görevin genel önemi.

Urgency:
Ne kadar kısa sürede ilgilenilmesi gerektiği.

Örnek:

Ana sembol gizemi:
yüksek priority,
düşük urgency.

Yaklaşan yağmurdan önce çatı kapatma:
orta priority,
yüksek urgency.
75. Aciliyetin çocuk üzerindeki etkisi

Aciliyet:

hikâye temposunu artırabilir,
belirli görevi öne çıkarabilir,
dünya olayını bekletmeyebilir.

Ama çocukta gerçek zamanlı baskı oluşturmamalıdır.

Kaçınılması gereken:

Bir saat içinde dönmezsen görev kaybolacak.

Daha iyi:

Hikâye içi zaman,
aktif oynama sırasında ilerler.
76. Quest dependency

Görevler birbirine bağlı olabilir.

type QuestDependency =
  | {
      type: "requires_completion"
      questId: string
    }
  | {
      type: "requires_stage"
      questId: string
      stageId: string
    }
  | {
      type: "excludes"
      questId: string
    }
  | {
      type: "modifies"
      questId: string
    }
77. Mutual exclusion

Bazı görev sonuçları diğer yolu kapatabilir.

Örnek:

Eski değirmeni müze yap

ve:

Eski değirmeni tekrar çalıştır

aynı anda tam olarak uygulanamayabilir.

Ancak küçük çocuk hikâyelerinde geri dönülmez dallar dikkatli kullanılmalıdır.

Tercih mümkünse:

açıklanmalı,
önceden sonuç sinyali vermeli,
tamamen olumsuz sunulmamalıdır.
78. Quest state machine
locked
↓
available
↓
active
├─ paused
├─ partially_completed
├─ completed
├─ failed
├─ abandoned
└─ obsolete

Geçişler kurallı olmalıdır.

Örnek:

completed
→ active

yalnızca repeatable quest için yeni instance ile mümkün olmalıdır.

79. Abandoned ve failed ayrımı
Abandoned:
Oyuncu veya grup görevi sürdürmemeyi seçti.

Failed:
Görevin belirli sonucu artık mevcut koşullarda gerçekleşemiyor.

Abandoned görev sonra yeniden açılabilir.

Failed görev:

recovery path,
alternatif görev,
dünya sonucu

üretebilir.

80. Obsolete görev

Dünya değiştiği için artık anlamsızdır.

Örnek:

Köprüyü onar

ama başka karakterler köprüyü zaten onardı.

Görev obsolete olur.

Ancak daha önce toplanan malzemeler:

iade edilir,
başka projeye aktarılır,
onarımda kullanılmış sayılır.

Oyuncu emeği tamamen yok sayılmamalıdır.

81. Quest journaling

Görev günlüğü çocuğa sade ve anlatısal olmalıdır.

type QuestJournalEntry = {
  questId: string

  shortSummary: string
  currentObjective: string

  completedSteps: string[]
  knownClues: string[]

  suggestedActions: string[]
  relatedCharacterIds: string[]
  relatedLocationIds: string[]
}
82. Günlük dili

Teknik:

Objective 3/7 complete.
Condition LOCATION_REACHED false.

Çocuğa uygun:

Şimdi kuzey yoluna ulaşmanın bir yolunu bulmalısınız.

Tamamlananlar:

✓ Eski sembolü buldunuz.
✓ Sembolün kuzeyi gösterdiğini öğrendiniz.
83. Görev özeti ve character knowledge

Görev günlüğü yalnızca oyuncunun bildiği bilgileri göstermelidir.

World truth:

Harita Denizci’nin sandığında.

Player knowledge:

Haritanın liman çevresinde olabileceği düşünülüyor.

Quest journal:

Liman çevresinde yeni bir ipucu arayın.

Gizli konumu açıklamamalıdır.

84. Quest hint sistemi
type QuestHint = {
  id: string
  questId: string
  stageId: string

  hintLevel:
    | "subtle"
    | "guided"
    | "direct"

  availabilityConditions: GoalCondition[]
  knowledgeRequirements: GoalCondition[]

  contentIntent: string
}
85. Hint seviyeleri
Subtle

Tilki, eski notun köşesindeki su lekesine yeniden baktı.

Guided

Notta limanla ilgili bir işaret olabilir.

Direct

Yaşlı denizcinin limandaki kulübesini inceleyebilirsiniz.

İpucu gizli gerçeği doğrudan açmamalıdır.

86. Hint ne zaman sunulur?

Sinyaller:

aynı aşamada uzun süre kalma,
birkaç başarısız yöntem,
oyuncunun yardım istemesi,
uzun aradan sonra geri dönüş,
yaş profili,
ebeveyn ayarı.

Sistem çocuk zorlanıyor diye otomatik başarısızlık etiketi üretmemelidir.

87. NPC yardımı

Bir NPC yardım sağlayabilir.

Ama:

bilgiye sahip olmalı,
yardım etmeye karar vermeli,
ilişki ve kişiliğine uygun davranmalı.

Quest Engine “ipucu gerekli” dedi diye herhangi bir NPC doğru cevabı bilmemelidir.

88. Quest ve Decision Engine ilişkisi

Görev aşaması NPC kararını zorunlu kılmamalıdır.

Yanlış:

Quest ilerlemeli.
→ Denizci mutlaka yardım eder.

Doğru:

Quest, Denizci’den bilgi alma fırsatı sunar.
Decision Engine:
- yardım,
- kısmi bilgi,
- karşılık isteme,
- reddetme
seçeneklerinden birini belirler.

Görev sistemi alternatif yollar sağlamalıdır.

89. Quest robustness

Kritik görev tek bir NPC’ye veya tek bir nesneye bağlı olmamalıdır.

Örnek zayıf görev:

Yalnızca Denizci doğru cevabı verebilir.

Denizci erişilemez olursa görev kilitlenir.

Daha güçlü:

Bilgi kaynakları:
- Denizci,
- Baykuşun notu,
- eski tabela,
- harita sembolü.

Hepsi aynı miktarda bilgi vermek zorunda değildir.

90. Alternative solution paths
type QuestSolutionPath = {
  id: string
  questId: string

  method:
    | "social"
    | "exploration"
    | "item"
    | "skill"
    | "cooperation"
    | "waiting"
    | "creative"

  requiredConditions: GoalCondition[]
  completionEffects: string[]
}

Çocuğun tercih ettiği oyun biçimine göre farklı yollar açılabilir.

Ama Personalization Engine sonucu otomatik seçmez; yalnızca uygun yolları öne çıkarabilir.

91. Creative solution

Çocuk beklenmeyen ama mantıklı çözüm sunabilir.

“Köprüyü onarmak yerine ipi iki ağaca bağlayıp malzemeleri karşıya geçirelim.”

Akış:

Intent
↓
Feasibility
↓
Safety
↓
Quest relevance
↓
Emergent solution path

Uygunsa görev yeni bir alternatif yol kazanabilir.

92. Emergent quest transition
type EmergentQuestTransition = {
  questId: string
  fromStageId: string

  playerIntentId: string
  generatedConditions: GoalCondition[]

  targetStageId:
    | string
    | "create_intermediate_stage"

  approvedByRuleSetVersion: string
}

Yeni yöntem kanonik olarak kaydedilir.

Böylece sistem daha sonra:

Köprü tamir edilmedi ama malzemeler karşıya geçirildi.

gerçeğini korur.

93. Görev tamamlama doğrulaması

Bir görev tamamlanmadan önce:

- bütün gerekli koşullar sağlandı mı?
- alternatif yol geçerli mi?
- player gate çözüldü mü?
- kanonik olaylar commit edildi mi?
- ödül koşulları sağlandı mı?
- dünya state’i sonuçla uyumlu mu?

kontrol edilir.

94. Quest completion transaction
BEGIN TRANSACTION

- final objective completion
- quest status update
- stage completion
- reward grants
- map unlocks
- world changes
- follow-up quest creation
- story progression update
- journal update
- domain events

COMMIT

Bir bölüm hata verirse rollback yapılmalıdır.

95. Completion event
type QuestCompletedEvent = {
  questId: string
  completionLevel: string

  completedStageIds: string[]
  chosenSolutionPathId?: string

  rewardIds: string[]
  worldStateVersion: number

  occurredAt: number
}

Memory, Relationship, Badge ve Story Arc sistemleri bu olayı dinleyebilir.

Ancak her biri kendi kurallarıyla etki hesaplar.

96. Quest reward validation

Kontroller:

- Aynı ödül iki kez veriliyor mu?
- Benzersiz nesne zaten başka yerde mi?
- Harita bölgesi zaten açık mı?
- Beceri ön koşulu gerçekten tamamlandı mı?
- Ödül görev büyüklüğüyle uyumlu mu?
- Ödül ebeveyn veya safety sınırına aykırı mı?
- Ödül hikâyede açıklanabilir mi?
97. Quest-chain

Bir görev tamamlandığında yeni görev zinciri açılabilir.

Değirmen İşareti
↓
Kuzey Kulesi
↓
Eski Gözcünün Defteri
↓
Unutulmuş Ada

Ancak bütün devam görevleri anında aktif olmamalıdır.

Bazıları:

hinted,
locked,
available

olarak kalabilir.

98. Arc milestone entegrasyonu

Görev tamamlanması Narrative Arc milestone ilerletebilir.

Quest Completed:
Kuzey Gözlem Kulesi

Arc Milestone:
Sembol ağının ikinci noktası keşfedildi.

Arc Engine sonraki büyük hikâyenin ne zaman uygun olduğunu belirler.

99. Görev ve dünya simülasyonu

NPC ve dünya bazı görevleri oyuncu yokken kısmen ilerletebilir.

Örnek:

Köylüler köprü için malzeme topluyor.

Offline ilerleyebilir.

Ama:

Köprünün hangi tasarımla yapılacağı,
eski taşların korunup korunmayacağı

oyuncu kapısı olabilir.

100. Offline quest policies
type QuestOfflinePolicy =
  | "freeze"
  | "prepare_only"
  | "safe_progress"
  | "npc_autonomous"
  | "convert_to_pending_player"
Freeze

Hiç ilerlemez.

Prepare only

Hazırlık yapılır, kritik aşama bekler.

Safe progress

Düşük riskli objectives tamamlanabilir.

NPC autonomous

NPC kendi görevini tamamlayabilir.

Pending player

Kritik karar hazır hâle gelir ve durur.

101. Offline örnek

Görev:

Köprüyü Onar

Oyuncu 6 gün yok.

Politika:

prepare_only

Olası sonuç:

tahtalar toplandı,
ipler hazırlandı,
hasarlı alan ölçüldü,
tasarım kararı oyuncuyu bekliyor.

Geri dönüş özeti:

Köylüler onarım için gereken malzemeleri hazırladı. Şimdi köprünün nasıl güçlendirileceğine karar vermek gerekiyor.

102. 10 günlük freeze kuralı

Quest Engine de genel offline politikasına uyar:

1–3 gün:
normal güvenli hazırlık

4–7 gün:
azaltılmış ilerleme

8–10 gün:
yalnızca küçük hazırlık

10 günden fazla:
dünya ve görev ilerlemesi donar

Bu süre ebeveyn veya sistem ayarıyla değiştirilebilir.

103. Progression ve içerik tüketimi

LUMI ilerlemesi yalnızca içerik tüketmeye bağlı olmamalıdır.

Yanlış:

20 hikâye oku → bölge aç.

Daha doğru:

İlgili dünya koşullarını tamamla,
gerekli bilgiye ulaş,
karakter veya araç hazır olsun.

Hikâye sayısı yalnızca bazı kozmetik veya katılım rozetlerinde kullanılabilir.

104. Grinding engeli

Aynı kolay görevi tekrar ederek büyük ilerleme kazanmak engellenmelidir.

Repeated low challenge
→ reduced progression value

Ancak çocuk sevdiği görevi tekrar oynadığı için cezalandırılmamalıdır.

Çözüm:

eğlence devam eder,
kozmetik veya küçük ödül olabilir,
büyük progression sınırlı kalır.
105. Progression pacing
type ProgressionPacingProfile = {
  targetStoriesPerMajorUnlock: number
  maximumMajorUnlocksPerStory: number

  minimumArcMilestonesPerUnlock: number
  rewardFrequency: number
}

Çok hızlı progression:

dünya kısa sürede tükenir,
ödüller değerini kaybeder.

Çok yavaş progression:

çaba görünmez hissedilir,
hikâyeler sonuçsuz görünür.
106. Küçük ilerleme sinyalleri

Her hikâye büyük unlock üretmek zorunda değildir.

Küçük ilerlemeler:

haritada yeni not,
karakter günlüğünde yeni cümle,
eşyanın yeni özelliği,
görev hazırlığı,
ilişki anısı,
yeni söylenti,
mekândaki küçük görsel değişim.

Bu sinyaller dünya sürekliliğini gösterir.

107. Progress recap

Hikâye sonunda sistem kısa ilerleme özeti verebilir.

Bu macerada:

✓ Eski sembolün kuzeyi gösterdiğini öğrendin.
✓ Köprü onarımına yardım ettin.
🗺️ Kuzey gözlem kulesi haritada açıldı.

İlişki ve duygu gibi iç sayılar gösterilmemelidir.

108. Progress feed

Dünya genelinde son değişiklikler:

Köprü:
Onarım başladı.

Kuzey Kulesi:
Konumu keşfedildi.

Tilki:
Yeni bir harita işaretini tanımayı öğrendi.

Bu liste çocuğa sade biçimde sunulabilir.

109. Görev geçmişi

Tamamlanan görevler silinmemelidir.

type QuestHistoryEntry = {
  questId: string
  title: string

  completionLevel: string
  completedAt: number

  chosenPathSummary: string
  keyEventIds: string[]

  rewardSummary: string[]
  worldChangeSummary: string[]
}

Bu kayıt:

recap,
callback,
character memory,
dünya kronolojisi

için kullanılabilir.

110. Aynı görevin farklı çocuklarda sonucu

Ayrı evrenlerde aynı görev farklı sonuçlanabilir.

Çocuk A:

Köprüyü onardı.

Çocuk B:

Tekne yolunu açtı.

İki evrenin progression state’i ayrıdır.

Paylaşılan aile evreninde ise ortak karar ve ownership politikası gerekir.

111. Shared quest mode
type SharedQuest = Quest & {
  participantProfileIds: string[]

  contributionRecords: {
    profileId: string
    eventIds: string[]
  }[]

  decisionPolicy:
    | "turn_based"
    | "consensus"
    | "parent_moderated"
}

Her çocuğun katkısı görünür olmalıdır.

Ancak ödül rekabeti yaratılmamalıdır.

112. Eğitim görevleri

Learning Quest, ana hikâyeyi kilitlememelidir.

Örnek:

Beş tahta say.

Sonuçlar:

Bağımsız başarı:
Tahtalar doğru sayılır.

Yardımlı başarı:
Tilki ile birlikte sayılır.

Atlama:
Denizci tahtaları sayar, hikâye devam eder.

Öğrenme kanıtı farklı olur, dünya sonucu aynı kalabilir.

113. Quest ve Child Safety

Görev adayları Safety Engine’den geçmelidir.

Kontroller:

amaç yaşa uygun mu?
başarısızlık ağır sonuç üretir mi?
görev çocuğu suçlar mı?
zaman baskısı manipülatif mi?
ödül baskısı var mı?
görev hassas temayı zorluyor mu?
114. Quest ve Personalization

Personalization Engine şunları etkileyebilir:

önerilen görev türü,
görev uzunluğu,
aktif karakter tercihi,
seçim karmaşıklığı,
öğrenme hedefi,
yardım yoğunluğu.

Ama şunları değiştiremez:

mevcut quest state,
tamamlanmış koşullar,
NPC kararları,
world truth,
ödül ön koşulları.
115. Quest Validation Engine

Temel kontroller:

- Geçerli stage transition mı?
- Completion condition gerçekten sağlandı mı?
- Görev iki kez tamamlandı mı?
- Ödül iki kez verildi mi?
- Quest world state ile çelişiyor mu?
- Player-gated stage offline tamamlandı mı?
- Gizli görev erken gösterildi mi?
- Başarısızlık oyuncuyu kilitliyor mu?
- Alternative path gerçekten uygulanabilir mi?
- Obsolete görev aktif görünüyor mu?
116. Quest-state parity

Hikâye:

Köprü artık güvenliydi.

Quest state:

Köprü onarımı: active

World state:

bridge.condition = damaged

Bu kritik tutarsızlıktır.

Üç katman uyumlu olmalıdır:

Narrative
Quest
World State
117. Quest completion görünürlüğü

Bazı görev tamamlamaları oyuncuya açıkça gösterilmelidir.

must_notify

Bazıları sessiz ilerleyebilir.

internal_progress

Örnek:

Köprü onarıldı:
must_notify

Tilki’nin araştırma hedefi %10 ilerledi:
internal
118. Domain events

Quest Engine şu olayları üretebilir:

QUEST_DISCOVERED
QUEST_AVAILABLE
QUEST_ACTIVATED
QUEST_STAGE_STARTED
QUEST_OBJECTIVE_COMPLETED
QUEST_STAGE_COMPLETED
QUEST_BLOCKED
QUEST_PAUSED
QUEST_RESUMED
QUEST_PARTIALLY_COMPLETED
QUEST_COMPLETED
QUEST_FAILED
QUEST_ABANDONED
QUEST_OBSOLETE
REWARD_GRANTED
LOCATION_UNLOCKED
CAPABILITY_UNLOCKED
BADGE_PROGRESS_UPDATED
BADGE_GRANTED
119. Event causation

Her ilerleme olayı kaynak event’e bağlanmalıdır.

type QuestDomainEvent = {
  id: string
  eventType: string

  questId: string
  stageId?: string
  objectiveId?: string

  causationId: string
  correlationId: string

  payload: unknown
  occurredAt: number
}

Böylece:

Bu görev neden tamamlandı?

sorusu kanonik olaylarla cevaplanabilir.

120. Idempotency

Aynı story request iki kez işlense bile:

objective iki kez tamamlanmamalı,
sayaç iki kez artmamalı,
ödül iki kez verilmemeli,
harita bölgesi iki kez açılmamalıdır.
type QuestProgressDeduplication = {
  questId: string
  sourceDomainEventId: string
  progressRuleId: string
}

Bu kombinasyon benzersiz olmalıdır.

121. Quest rule registry
type QuestRule = {
  id: string
  name: string

  appliesToQuestType?: string
  eventType: string

  conditionEvaluator: string
  progressEffect: string

  version: string
}

Örnek:

LOCATION_DISCOVERED
+
locationId = north_tower
→ objective “Kuleyi Bul” completed
122. Rule-based progression

Quest ilerlemesi mümkün olduğunca kurallı olmalıdır.

LLM şu işi yapabilir:

görev başlığı önerme,
açıklama yazma,
çocuk dostu günlük metni,
yaratıcı görev adayı.

Ama LLM şunu tek başına belirlememelidir:

Görev tamamlandı.

Bu karar koşul motoruna aittir.

123. LLM Quest Proposal
type QuestProposal = {
  premise: string
  proposedGoal: string

  proposedStages: string[]
  proposedRewards: string[]

  requiredWorldFacts: string[]
  claimedCharacterMotivations: string[]
}

Proposal akışı:

LLM önerisi
↓
World compatibility
↓
Goal validation
↓
NPC motivation validation
↓
Safety
↓
Scope budget
↓
Canonical quest creation
124. MVP Quest Engine

İlk sürümde şu yapı yeterlidir:

1. Main, side, character ve exploration quest türleri
2. Lineer aşamalar + sınırlı alternatif yollar
3. Kurallı prerequisite sistemi
4. Required ve optional objectives
5. Event tabanlı ilerleme
6. Player-gated stage koruması
7. Partial success ve fail-forward
8. Item, map, knowledge ve story-hook ödülleri
9. Quest journal
10. Offline prepare-only politikası
11. Idempotent reward ve progress
12. World/quest/narrative parity validation
125. MVP Quest modeli
type CoreQuest = {
  id: string
  title: string
  description: string

  questType:
    | "main"
    | "side"
    | "character"
    | "exploration"

  status:
    | "locked"
    | "available"
    | "active"
    | "paused"
    | "completed"
    | "partially_completed"
    | "failed"
    | "obsolete"

  stageIds: string[]
  currentStageId?: string

  prerequisiteIds: string[]
  rewardIds: string[]

  offlinePolicy:
    | "freeze"
    | "prepare_only"
    | "safe_progress"
}
126. MVP stage modeli
type CoreQuestStage = {
  id: string
  questId: string

  name: string
  stageType:
    | "discover"
    | "prepare"
    | "travel"
    | "investigate"
    | "choose"
    | "resolve"

  status:
    | "locked"
    | "available"
    | "active"
    | "completed"
    | "failed"

  objectiveIds: string[]
  allowedNextStageIds: string[]

  playerGate: boolean
}
127. MVP Objective
type CoreQuestObjective = {
  id: string
  questStageId: string

  description: string

  requirement:
    | "required"
    | "optional"
    | "alternative"

  condition: GoalCondition
  completed: boolean

  completedByEventId?: string
}
128. MVP ana işlemler
discoverQuest()

evaluateQuestAvailability()

activateQuest()

evaluateQuestProgress()

completeObjective()

advanceQuestStage()

pauseQuest()

resumeQuest()

completeQuest()

partiallyCompleteQuest()

failQuestWithRecovery()

markQuestObsolete()

grantQuestRewards()

unlockMapLocation()

unlockCapability()

buildQuestJournal()

validateQuestState()
129. Örnek Quest Engine akışı
async function processQuestProgress(
  domainEvent: DomainEvent
): Promise<void> {
  const relevantRules = findQuestRulesForEvent(
    domainEvent.eventType
  )

  const candidateQuests = findAffectedQuests(
    domainEvent,
    relevantRules
  )

  for (const quest of candidateQuests) {
    const progressChanges = evaluateQuestRules({
      quest,
      domainEvent,
      rules: relevantRules
    })

    if (progressChanges.length === 0) {
      continue
    }

    const validatedChanges = validateQuestProgressChanges({
      quest,
      domainEvent,
      changes: progressChanges
    })

    await commitQuestProgressTransaction({
      quest,
      sourceEvent: domainEvent,
      changes: validatedChanges
    })
  }
}
130. Örnek görev
Görev
Kuzey Gözlem Kulesi
Tür
Exploration Quest
Ön koşullar
- Değirmendeki sembol keşfedilmiş.
- Oyuncu sembolün kuzeyi gösterdiğini öğrenmiş.
Aşama 1
Kuzey yoluna ulaşmanın yöntemini seç.

Alternatif objective’ler:

- Köprüyü geçici onar
- Denizcinin teknesini kullan
- Orman patikasını keşfet

Bir tanesi yeterlidir.

Aşama 2
Kuleye ulaş.
Aşama 3
Kulenin ana salonunu incele.

Required:

Ay sembolünü bul.

Optional:

Eski merceği bul.
Aşama 4
Bulguları arkadaşlarla paylaş.
Ödüller
- Kuzey Kulesi haritada visited olur.
- Ay sembolü knowledge state: known.
- Eski mercek bulunduysa envantere eklenir.
- Yeni story hook: Unutulmuş Ada söylentisi.
131. Alternatif yol sonuçları
Köprü yolu
World progression:
Köprü kısmen onarılır.

Relationship opportunity:
Köylülerle iş birliği.

Resource effect:
Tahta ve ip kullanılır.
Tekne yolu
Relationship opportunity:
Denizci ile bağ.

Knowledge:
Nehir hakkında yeni bilgi.

Resource:
Tekne erişimi açılabilir.
Orman yolu
Map progression:
Yeni patika keşfedilir.

Character arc:
Tilki yön bulmada katkı sağlar.

Risk:
Daha uzun yol.

Ana görev aynı yere varır ama dünya sonucu farklıdır.

132. Görev tamamlandıktan sonra
Narrative:
Kule keşfedildi.

Quest:
completed

World:
tower.locationState = visited

Map:
north_tower = visited

Knowledge:
moon_symbol = known

Story Arc:
symbol_network milestone advanced

Story Planner:
yeni macera adayları oluşturabilir

Bütün sistemler aynı kanonik event zincirinden beslenir.

133. İlk sürümde yapılmaması gerekenler

Başlangıçta şunlardan kaçınmalıyız:

yüzlerce aktif görev,
karmaşık MMORPG görev ağacı,
rastgele görev üretiminde kontrolsüz LLM,
her küçük etkileşimi göreve dönüştürmek,
yoğun sayısal deneyim puanları,
karakter ilişkilerini doğrudan görev ödülü yapmak,
gerçek zamanlı görev kaçırma baskısı,
ağır başarısızlık cezaları,
hikâyeyi öğrenme görevleriyle kilitlemek,
aynı görevi tekrar ederek sınırsız ilerleme,
bütün kilitleri kullanıcıya göstermek,
görev metninden otomatik completion çıkarmak.

MVP hedefi:

Amaçlar anlaşılır olsun.
İlerleme kanonik olaylara dayansın.
Seçimler farklı yollar açsın.
Başarısızlık yeni yol üretsin.
Ödüller dünyadan doğsun.
Dünya değişimi görünür olsun.
134. Quest, Goal & Progression Engine temel ilkeleri
1. Goal, quest ve progression ayrı kavramlardır.
2. Hikâyede bir amaçtan bahsedilmesi görev ilerlemesi değildir.
3. İlerleme yalnızca kanonik olaylardan hesaplanır.
4. Her hedefin sahibi ve kontrol otoritesi açık olmalıdır.
5. NPC hedefleri oyuncu tarafından zorla tamamlanamaz.
6. Büyük görevler doğrulanabilir aşamalara bölünmelidir.
7. Görev aşamaları yalnızca izin verilen geçişlerle ilerler.
8. Oyuncu kapısı bulunan aşamalar otomatik tamamlanamaz.
9. Görevler alternatif çözüm yolları desteklemelidir.
10. Tek bir NPC veya nesne kritik görevi tamamen kilitlememelidir.
11. Yöntemin başarısız olması, ana hedefin başarısız olması değildir.
12. Fail-forward yeni bilgi, yol veya düzenlenmiş hedef üretmelidir.
13. Başarısızlık çocuğu suçlamamalı ve bütün ilerlemeyi silmemelidir.
14. Ödüller görevden ve dünya olaylarından doğal biçimde doğmalıdır.
15. İlişki değerleri doğrudan görev ödülü olarak verilmemelidir.
16. Harita ilerlemesi söylenti, keşif ve ziyaret aşamalarını ayırmalıdır.
17. Karakter becerileri yavaş ve kanıt temelli ilerlemelidir.
18. Kilit açmalar dünya mantığına ve ön koşullara dayanmalıdır.
19. Aynı kolay görev tekrar edilerek sınırsız büyük ilerleme kazanılamaz.
20. Offline görev ilerlemesi aktif oyundan daha sınırlıdır.
21. On günden sonra görev ilerlemesi genel dünya freeze kuralına uyar.
22. Görev, dünya ve anlatı durumları birbiriyle uyumlu olmalıdır.
23. Aynı event ilerlemeyi veya ödülü iki kez uygulayamaz.
24. LLM görev önerebilir ama completion kararını veremez.
25. Tamamlanan görevler kalıcı dünya geçmişinin bir parçasıdır.

Quest, Goal & Progression Engine’in kavramsal çekirdeği böylece tamamlandı.