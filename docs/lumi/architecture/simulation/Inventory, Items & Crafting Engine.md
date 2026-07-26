Inventory, Items & Crafting Engine

Bu motor, LUMI evrenindeki bütün fiziksel nesnelerin kanonik durumunu yönetir.

Sorumluluk alanı:

Nesne nedir?
Nerede?
Kimin elinde?
Kaç tane?
Hangi durumda?
Kim kullanabilir?
Ne işe yarar?
Tüketildi mi?
Kırıldı mı?
Birleştirilebilir mi?
Hikâyede nasıl görünmeli?

Inventory Engine yalnızca “çanta listesi” değildir.

Aynı zamanda:

dünya tutarlılığı,
görev ilerlemesi,
yaratıcı problem çözme,
görsel devamlılık,
karakter becerileri,
eşya hafızası,
crafting,
kaynak yönetimi

için merkezi bir motordur.

Temel ilke:

Bir nesnenin hikâyede görünmesi, kullanılması veya el değiştirmesi yalnızca anlatı metnine değil, kanonik envanter durumuna dayanmalıdır.

1. Sistemdeki yeri
World State
↓
Inventory Engine
↓
Story Planner
↓
Player Action
↓
Feasibility Check
↓
Action Resolution
↓
Inventory State Delta
↓
Narrative
↓
Validation
↓
Commit

Crafting akışı:

Crafting Intent
↓
Recipe / Emergent Combination Evaluation
↓
Tool and Skill Check
↓
Safety Check
↓
Resource Reservation
↓
Craft Resolution
↓
Inventory Delta
↓
Narrative
↓
Commit
2. Item ve Inventory ayrımı
Item Definition

Bir nesne türünün genel tanımıdır.

İp
Elma
Mavi anahtar
Eski harita parçası
Item Instance

Dünya içindeki belirli nesnedir.

Tilki’nin bulduğu mavi anahtar.
Inventory

Bir karakterin, grubun veya konteynerin taşıdığı nesne koleksiyonudur.

Bu ayrım önemlidir.

Çünkü iki nesne aynı türden olsa bile farklı geçmiş ve durum taşıyabilir.

3. Item Definition
type ItemDefinition = {
  id: string
  name: string
  description: string

  category:
    | "tool"
    | "consumable"
    | "material"
    | "quest"
    | "key"
    | "container"
    | "document"
    | "wearable"
    | "collectible"
    | "cosmetic"
    | "environmental"
    | "crafted"

  uniqueness:
    | "unique"
    | "limited"
    | "stackable"

  portable: boolean
  stackLimit?: number

  baseProperties: ItemProperty[]
  allowedActionTypes: string[]

  defaultCondition: ItemCondition
  visualDefinitionId?: string

  safetyTags: string[]
}
4. Item Instance
type ItemInstance = {
  id: string
  definitionId: string

  ownerType:
    | "character"
    | "group"
    | "location"
    | "container"
    | "world"

  ownerId: string

  quantity: number
  condition: ItemCondition

  customProperties: ItemProperty[]
  discoveredProperties: string[]

  createdByEventId: string
  lastMovedByEventId?: string

  provenance: ItemProvenance
  status:
    | "active"
    | "reserved"
    | "consumed"
    | "destroyed"
    | "lost"
    | "archived"
}
5. Item condition
type ItemCondition =
  | "new"
  | "good"
  | "used"
  | "worn"
  | "damaged"
  | "broken"
  | "wet"
  | "dirty"
  | "empty"
  | "sealed"
  | "unknown"

Her kategori aynı condition değerlerini kullanmak zorunda değildir.

Örneğin:

Elma:
fresh, bruised, spoiled

Fener:
full, low_charge, empty, broken

Harita:
whole, torn, wet, unreadable

Bu nedenle domain-specific durumlar da desteklenebilir.

6. Item property
type ItemProperty = {
  key: string
  value: unknown

  visibility:
    | "public"
    | "discovered"
    | "hidden"
    | "system_only"

  sourceEventId?: string
}

Örnek:

Mavi anahtar

Public:
metal
small

Discovered:
glows_in_moonlight

Hidden:
opens_north_tower_archive

Çocuk nesnenin bütün kullanım alanlarını baştan bilmemelidir.

7. Benzersiz nesneler

Benzersiz nesnelerin aynı anda yalnızca bir aktif instance’ı bulunmalıdır.

Örnek:

Eski Kraliyet Pusulası

Şunlar engellenmelidir:

iki karakterde aynı anda görünmesi,
tüketildikten sonra kendiliğinden geri gelmesi,
kaybolduktan sonra açıklamasız tekrar ortaya çıkması,
aynı görev ödülünün iki kez verilmesi.
type UniqueItemConstraint = {
  definitionId: string
  maximumActiveInstances: number
}

Genellikle:

maximumActiveInstances = 1
8. Stackable items

Yığınlanabilir nesneler miktarla tutulur.

Örnek:

Elma × 4
Tahta × 7
Taş × 12

Kurallar:

quantity >= 0
quantity <= stackLimit

Miktar sıfır olduğunda:

instance silinebilir,
consumed durumuna geçebilir,
audit için arşivlenebilir.
9. Limited items

Bazı nesneler benzersiz değildir ama yığınlanamaz.

Örnek:

Üç ayrı fener
İki ayrı ip makarası

Her biri ayrı condition taşıyabilir.

Fener A:
full

Fener B:
broken

Bunlar tek yığında tutulmamalıdır.

10. Sahiplik modeli

Bir nesnenin tek aktif fiziksel sahibi olmalıdır.

type ItemOwnership = {
  itemInstanceId: string

  ownerType:
    | "character"
    | "group"
    | "location"
    | "container"

  ownerId: string
  sinceEventId: string
}

owner kelimesi her zaman mülkiyet anlamına gelmez.

Bazen:

holder
custodian
current location

anlamındadır.

Örneğin eski harita köye ait olabilir ama geçici olarak Lumi taşıyabilir.

11. Ownership ve possession ayrımı

İleri sürümde iki alan ayırmak yararlı olabilir:

type ItemCustody = {
  legalOwnerId?: string
  currentHolderId?: string
  currentContainerId?: string
  currentLocationId: string
}

Örnek:

Harita:
Köye ait.
Lumi taşıyor.
Çantasının içinde.
Kuzey yolunda.

MVP’de tek ownerType/ownerId yeterli olabilir.

12. Group inventory

Bazı eşyalar ortak gruba ait olabilir.

Ortak harita
Kamp ipi
Tamir kutusu
type GroupInventory = {
  groupId: string
  memberIds: string[]
  itemInstanceIds: string[]

  accessPolicy:
    | "shared"
    | "leader_managed"
    | "permission_required"
}

Çocuk bir grup eşyasını kullanırken başka NPC’lerin onayı gerekebilir.

13. Container sistemi

Konteynerler envanter içinde envanter taşıyabilir.

Örnek:

çanta,
sandık,
kutu,
şişe,
harita tüpü,
depo.
type ContainerState = {
  itemInstanceId: string

  capacitySlots?: number
  capacityWeight?: number

  allowedCategories?: string[]
  sealed: boolean
  locked: boolean

  containedItemIds: string[]
}
14. Nested container sınırı

Sınırsız iç içe konteyner karmaşıklık yaratır.

MVP için:

Karakter
→ Çanta
→ Eşya

yeterlidir.

Şu yapı başlangıçta desteklenmeyebilir:

Çanta
→ Kutu
→ Şişe
→ Küçük kese
→ Anahtar

Öneri:

maximumContainerDepth = 2
15. Capacity

Envanter kapasitesi sert oyun cezasına dönüşmemelidir.

Kapasite türleri:

slot
weight
size
special category

Çocuk hikâyesi için en anlaşılır olan:

slot tabanlı kapasite

olabilir.

Örnek:

Çanta:
6 normal eşya
1 harita bölmesi
16. Aşırı kapasite

Çanta doluysa çocuk hemen eşya kaybetmek zorunda bırakılmamalıdır.

Alternatifler:

bir eşyayı gruba vermek,
güvenli yerde bırakmak,
sandığa koymak,
mevcut eşyayı kullanmak,
büyük eşyayı taşıyamamak,
NPC’den yardım istemek.

Yanlış:

Çanta dolu olduğu için eski anahtar yok oldu.
17. Item size
type ItemSize =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "immovable"

Örnek:

Anahtar:
tiny

Fener:
small

Tahta:
large

Köprü taşı:
immovable

immovable nesneler envantere alınamaz ama görev kaynağı veya çevresel araç olabilir.

18. Environmental items

Her kullanılabilir nesne envantere girmek zorunda değildir.

Örnek:

kaldıraç olarak kullanılabilecek dal,
sabit çan,
duvardaki kol,
köprü halatı,
büyük taş.
type EnvironmentalItemState = {
  entityId: string
  locationId: string

  usableActions: string[]
  movable: boolean
  condition: string
}

Bu nesneler Action Resolution tarafından kullanılabilir.

19. Item action
type ItemActionDefinition = {
  id: string
  itemDefinitionId: string

  actionType:
    | "use"
    | "consume"
    | "equip"
    | "open"
    | "read"
    | "inspect"
    | "combine"
    | "repair"
    | "give"
    | "place"
    | "activate"

  preconditions: ItemActionCondition[]
  effects: string[]

  consumesQuantity?: number
  conditionChange?: string
}
20. Item action preconditions
type ItemActionCondition = {
  type:
    | "ownership"
    | "proximity"
    | "item_condition"
    | "capability"
    | "knowledge"
    | "location"
    | "target_state"
    | "safety"
    | "quest_stage"

  parameters: Record<string, unknown>
}

Örnek:

Mavi anahtarı kullan:

- anahtar karakterde olmalı,
- hedef kapıya yakın olunmalı,
- anahtar kırık olmamalı,
- doğru kilit hedeflenmeli.
21. Item feasibility

Çocuk:

“Harita ile kapıyı açalım.”

diyebilir.

Sistem üç olasılığı değerlendirmelidir:

Literal use:
Harita anahtar değildir.

Creative use:
Harita kilitteki sembol sırasını gösterebilir.

Impossible use:
Haritayı doğrudan kilide sokup kapıyı açmak mümkün değil.

Doğru yaklaşım:

Harita kapıyı doğrudan açamazdı. Ama üzerindeki semboller kilidin sırasını çözmeye yardımcı olabilirdi.

22. Creative item use

LUMI’nin önemli özelliklerinden biri, çocuğun nesneleri yaratıcı biçimde kullanabilmesidir.

Akış:

Player proposes use
↓
Intent extraction
↓
Item affordance analysis
↓
World physics and rules
↓
Safety
↓
Utility
↓
Resolution
type CreativeItemUseProposal = {
  itemInstanceIds: string[]
  targetEntityId?: string

  intendedOutcome: string
  proposedMechanism: string

  feasibility:
    | "valid"
    | "valid_with_adjustment"
    | "uncertain"
    | "invalid"

  requiredSupport: string[]
}
23. Affordance sistemi

Her nesnenin yalnızca tek önceden tanımlı kullanım alanı olmamalıdır.

type ItemAffordance = {
  affordanceType:
    | "cut"
    | "tie"
    | "cover"
    | "carry"
    | "reflect"
    | "illuminate"
    | "mark"
    | "float"
    | "wedge"
    | "signal"
    | "contain"
    | "measure"

  strength: number
  conditions: string[]
}

Örnek:

İp:
tie, pull, measure, secure

Ayna parçası:
reflect, signal, inspect_corner

Yaprak:
cover, wrap, mark, collect_water

Bu yapı yaratıcı çözümleri daha kolay doğrular.

24. Emergent item interaction

Örnek:

Çocuk:
“Yapraklardan şemsiye yapalım.”

Değerlendirme:

Yaprak:
cover

Dal:
support

İp:
tie

Yağmur:
hafif

Sonuç:

Geçici yaprak şemsiyesi yapılabilir.

Bu önceden yazılmış tarif olmak zorunda değildir.

Affordance kombinasyonuyla emergent crafting yapılabilir.

25. Sabit recipe ve emergent crafting
Fixed recipe

Önceden tanımlanmış güvenilir tarif.

Basit fener:
kavanoz + ışık taşı + ip
Emergent crafting

Çocuğun önerdiği yaratıcı birleşim.

Yaprak + dal + ip
→ geçici yağmur koruması

MVP’de ikisi birlikte kullanılabilir.

26. Crafting recipe
type CraftingRecipe = {
  id: string
  name: string

  inputRequirements: CraftingIngredient[]
  toolRequirements: string[]
  capabilityRequirements: string[]

  locationRequirements?: string[]
  timeCostMinutes: number

  outputDefinitions: {
    definitionId: string
    quantity: number
  }[]

  byproducts?: {
    definitionId: string
    quantity: number
  }[]

  failurePolicy:
    | "no_loss"
    | "partial_loss"
    | "damaged_output"
}
27. Crafting ingredient
type CraftingIngredient = {
  definitionId?: string
  category?: string
  requiredAffordance?: string

  quantity: number
  consumed: boolean

  minimumCondition?: string
}

Bu sayede tarif yalnızca belirli bir nesneye bağlı olmak zorunda değildir.

Örnek:

1 adet bağlayıcı malzeme

şunlardan biri olabilir:

ip,
sarmaşık,
bez şerit.
28. Tool requirement

Araçlar crafting sırasında tüketilmez ama condition kaybedebilir.

Örnek:

Makas
Çekiç
İğne
Küçük bıçak

Çocuk güvenliği nedeniyle bazı araçlar:

yalnızca yetişkin veya NPC ile,
doğrudan adım adım anlatılmadan,
güvenli bağlamda

kullanılabilir.

29. Crafting safety

Crafting Engine, Safety Engine’den bağımsız çalışmamalıdır.

Kontroller:

kesici araç,
ateş,
kimyasal madde,
ağır nesne,
gerçek dünyada taklit edilebilir tehlikeli yöntem,
yaş profili,
destek karakteri.

Örnek:

Çocuk:
“Benzinle fener yapalım.”

Sonuç:

redirect

Güvenli alternatif:

ışık taşı + kavanoz
30. Crafting intent ve gerçek dünya talimatı

Hikâyede crafting olabilir fakat sistem gerçek dünyada tehlikeli bir yapım kılavuzu sunmamalıdır.

Narrative Engine:

Denizci güvenli araçları kullanarak kırık parçayı sabitledi.

Bu uygundur.

Ancak çocuk için tehlikeli araçlarla ayrıntılı uygulama adımları verilmemelidir.

31. Crafting session
type CraftingSession = {
  id: string

  crafterIds: string[]
  recipeId?: string

  selectedInputItemIds: string[]
  reservedItemIds: string[]

  targetOutputDefinitionId?: string

  status:
    | "planned"
    | "reserved"
    | "in_progress"
    | "completed"
    | "failed"
    | "cancelled"

  startedByRequestId: string
}
32. Resource reservation

Craft başlamadan malzemeler reserved yapılmalıdır.

Böylece aynı ip:

aynı anda köprü onarımında,
ve yaprak şemsiyesinde

kullanılamaz.

Available
↓
Reserved
↓
Consumed / Released

Craft başarısız olursa tarife göre rezervasyon kaldırılır veya kısmi kayıp uygulanır.

33. Atomic crafting transaction
BEGIN TRANSACTION

- input reservation validation
- ingredient consumption
- tool condition update
- output creation
- byproduct creation
- quest progress
- capability evidence
- domain events

COMMIT

Herhangi bir aşama hata verirse rollback gerekir.

34. Crafting başarı seviyeleri
type CraftingResultLevel =
  | "failure"
  | "partial"
  | "success"
  | "excellent"
Failure

Ürün oluşmaz.

Çocuk hikâyelerinde mümkünse malzeme tamamen yok olmaz.

Partial

Geçici veya daha düşük kaliteli ürün oluşur.

Success

Tarif beklenen sonucu verir.

Excellent

Ek dayanıklılık veya küçük kozmetik fark oluşabilir.

Bu sonuç çocuğun gerçek becerisine değil, hikâye karakteri ve koşullara aittir.

35. Fail-forward crafting

Örnek:

Yaprak şemsiyesi tam dayanmadı.

Fail-forward:

- Şiddetli yağmurda yetersiz.
- Hafif yağmurda işe yarıyor.
- Tilki daha geniş yaprak gerektiğini öğrendi.

Ürün:

temporary_leaf_cover
condition = fragile

olarak oluşabilir.

36. Item quality
type ItemQuality =
  | "fragile"
  | "basic"
  | "reliable"
  | "fine"
  | "special"

Kalite:

dayanıklılık,
kullanım sayısı,
başarı bonusu,
görünüm

üzerinde etkili olabilir.

Ancak karmaşık RPG kalite sistemi başlangıçta gerekli değildir.

37. Durability

Her nesneye dayanıklılık vermek gereksizdir.

Dayanıklılık yalnızca anlamlı kategorilerde kullanılmalıdır:

araç,
geçici crafted item,
tamir edilebilir özel nesne.
type DurabilityState = {
  current: number
  maximum: number

  degradationPolicy:
    | "per_use"
    | "on_failure"
    | "event_based"
}
38. Durability görünürlüğü

Çocuk arayüzünde:

Dayanıklılık: 43/100

yerine:

Sağlam
Biraz yıpranmış
Onarılması gerekiyor

gibi durumlar daha uygundur.

Kesin sayılar geliştirici state’inde kalabilir.

39. Item degradation

Bir eşya her kullanıldığında otomatik zarar görmemelidir.

Örnek:

Harita okumak

haritayı yıpratmaz.

Ama:

Haritayı yağmurda açık tutmak

condition değiştirebilir.

Degradation olay bazlı olmalıdır.

40. Item repair
type RepairDefinition = {
  targetCondition: string
  allowedCurrentConditions: string[]

  materialRequirements: CraftingIngredient[]
  toolRequirements: string[]
  capabilityRequirements: string[]

  resultingCondition: string
}

Örnek:

Yırtık harita
+
kâğıt şerit
+
yapıştırıcı
→ onarılmış harita

Ancak eksik harita parçası yeniden oluşturulamaz.

Onarım world truth’u değiştirmemelidir.

41. Repair ve restore ayrımı
Repair:
İşlevi geri getirir.

Restore:
Görünümü veya özgün durumu iyileştirir.

Örnek:

Eski pusula çalışıyor ama yüzeyi çizik.

Repair gerekmez.

Restore kozmetik olabilir.

42. Tüketilebilir nesneler
type ConsumableEffect = {
  itemDefinitionId: string

  effectType:
    | "restore"
    | "temporary_capability"
    | "reveal"
    | "clean"
    | "feed"
    | "quest_progress"

  effectPayload: Record<string, unknown>
}

Örnek:

yiyecek,
su,
boya,
tohum,
ışık kapsülü.

Tüketim:

quantity azalır
veya
instance consumed olur.
43. Yiyecek sistemi

Yiyecekleri ağır açlık mekaniğine çevirmemek daha uygundur.

Kullanımlar:

paylaşma,
dinlenme sahnesi,
karakter tercihi,
küçük toparlanma,
yolculuk hazırlığı.

Çocuk uygulamaya dönmedi diye karakterler aç bırakılmamalıdır.

44. Item knowledge

Bir karakter bir eşyaya sahip olabilir ama ne işe yaradığını bilmeyebilir.

type ItemKnowledge = {
  characterId: string
  itemDefinitionId: string

  knowledgeState:
    | "unknown"
    | "recognizes"
    | "knows_basic_use"
    | "knows_advanced_use"
    | "understands_origin"

  learnedByEventIds: string[]
}

Örnek:

Lumi mavi anahtarı taşıyor.
Ama hangi kapıyı açtığını bilmiyor.
45. Hidden item property discovery
Mavi anahtarın ay ışığında parlaması

şu olaylardan biriyle keşfedilebilir:

gece elde tutulması,
ay sembolünün yanında kullanılması,
bir NPC’nin anlatması,
eski notun okunması.

Keşif gerçekleşmeden kullanıcı arayüzünde bu özellik gösterilmemelidir.

46. Identification

Bazı nesneler ilk başta belirsiz olabilir.

Eski metal parça

Daha sonra:

Gözlem kulesinin mercek yuvası

olarak tanımlanabilir.

type ItemIdentificationState =
  | "unknown_object"
  | "partially_identified"
  | "identified"

Definition değişmek zorunda değildir; görünen isim değişebilir.

47. Item provenance

Her önemli nesne geçmiş taşımalıdır.

type ItemProvenance = {
  originType:
    | "world_spawn"
    | "quest_reward"
    | "crafted"
    | "gift"
    | "found"
    | "inherited"
    | "traded"

  originEventId: string

  previousOwnerIds: string[]
  importantEventIds: string[]
}

Bu, nesneleri sıradan menü öğesinden yaşayan dünya parçasına dönüştürür.

48. Sentimental items

Bazı nesnelerin mekanik değeri düşük ama duygusal değeri yüksek olabilir.

Örnek:

Tilki’nin verdiği mavi bileklik
type SentimentalValue = {
  relatedCharacterIds: string[]
  relatedMemoryIds: string[]

  emotionalDimensions: Record<string, number>
}

Böyle bir eşya:

callback tetikleyebilir,
ilişki sahnesi açabilir,
karaktere güven verebilir,
hediye olarak anlam taşıyabilir.
49. Story-critical items
type StoryCriticality =
  | "normal"
  | "important"
  | "quest_required"
  | "world_critical"

quest_required veya world_critical nesneler:

rastgele tüketilemez,
açıklamasız kaybedilemez,
satılamaz,
tehlikeli crafting malzemesi olarak kullanılamaz.
50. Critical item protection

Çocuk:

“Harita parçasını ateşe atalım.”

diyebilir.

Sistem:

güvenliği,
story-critical durumunu,
niyeti

değerlendirir.

Olası yönlendirme:

Harita parçası ateşe atılırsa üzerindeki işaretler kaybolabilirdi. Lumi onu yakmak yerine ışığa tutup gizli çizgiler aramayı düşündü.

Bu yalnızca ret değil, yaratıcı güvenli alternatif sunar.

51. Item loss

Nesneler kaybolabilir.

Ama kayıp:

kanonik olayla,
anlaşılır nedenle,
recovery path ile,
nesnenin önemine uygun şekilde

gerçekleşmelidir.

type ItemLossState = {
  itemInstanceId: string

  lossType:
    | "misplaced"
    | "dropped"
    | "stolen"
    | "left_behind"
    | "unreachable"

  lastKnownLocationId: string
  recoverable: boolean

  recoveryQuestId?: string
}
52. Çevrimdışı eşya kaybı

Offline simülasyonda önemli eşya kaybolmamalıdır.

Güvenli offline değişiklikler:

depoya kaldırılması,
NPC tarafından korunması,
condition’ın hafif değişmesi,
tamir hazırlığı.

Güvensiz:

benzersiz anahtarın kaybolması,
görev nesnesinin çalınması,
önemli hediyenin yok olması.
53. Item theft

Hırsızlık teması çocuk profiline göre hassas olabilir.

Kullanılacaksa:

ağır tehdit olmadan,
geri alınabilir,
karakterin güvenliği korunarak,
suçluluk yaratmadan

işlenmelidir.

Alternatif olarak:

yanlışlıkla alınmış
karışmış
ödünç alınmış

gibi daha yumuşak durumlar kullanılabilir.

54. Item transfer
type ItemTransfer = {
  itemInstanceId: string

  fromOwnerType: string
  fromOwnerId: string

  toOwnerType: string
  toOwnerId: string

  transferType:
    | "give"
    | "lend"
    | "return"
    | "trade"
    | "place"
    | "take"
    | "reward"

  sourceEventId: string
}
55. Lending

Ödünç verilen eşya mülkiyetini kaybetmez.

type LendingState = {
  itemInstanceId: string

  lenderId: string
  borrowerId: string

  expectedReturnCondition?: string
  dueQuestStageId?: string

  status:
    | "active"
    | "returned"
    | "lost"
    | "converted_to_gift"
}

Bu yapı ilişki ve görev hikâyeleri için değerlidir.

56. Gift system

Hediye verme yalnızca inventory transfer değildir.

Etkileyebileceği sistemler:

Inventory
Relationship
Memory
Belief
Emotion
Story callback

Ama ilişki etkisini Inventory Engine hesaplamaz.

Inventory yalnızca transfer event’i üretir.

Relationship Engine bağlama göre etkiyi değerlendirir.

57. Trade

Çocuk hikâyelerinde ticaret basit tutulmalıdır.

type TradeProposal = {
  offeredItemIds: string[]
  requestedItemIds: string[]

  proposerId: string
  receiverId: string

  fairnessAssessment?: string
}

NPC teklifi kabul etmek zorunda değildir.

Decision Engine:

ihtiyacı,
ilişkiyi,
eşya değerini,
kişiliği

değerlendirir.

58. Item value

Tek bir parasal değer yeterli değildir.

type ItemValueVector = {
  practical: number
  rarity: number
  emotional: number
  quest: number
  cultural: number
  personal: number
}

Örnek:

Tilki’nin bilekliği

practical: düşük
rarity: orta
emotional: yüksek
personal: çok yüksek

NPC bunu sıradan bir taşla takas etmeyebilir.

59. Equip system

Bazı nesneler takılabilir veya hazırlanabilir.

type EquipmentSlot =
  | "head"
  | "body"
  | "back"
  | "hand"
  | "accessory"
  | "tool"

type EquippedItem = {
  characterId: string
  slot: EquipmentSlot
  itemInstanceId: string
}

MVP’de yalnızca:

aksesuar,
eldeki araç,
çanta

yeterli olabilir.

60. Equipped vs carried

Bir fener çantada olabilir ama aktif kullanılmıyor olabilir.

Carried:
Çantada.

Equipped:
Elde ve hazır.

Bazı eylemler için equip gerekir.

Ancak her kullanımda gereksiz mikro yönetim yapılmamalıdır.

Story Planner veya sistem basit hazırlık eylemlerini otomatik yapabilir:

Lumi çantasından feneri çıkardı.

Bu kritik oyuncu kararı değildir.

61. Item use authority

Bazı eşyalar:

oyuncu tarafından,
NPC tarafından,
birlikte,
yalnızca sistemsel mikro eylemle

kullanılabilir.

type ItemUseAuthority =
  | "player"
  | "npc"
  | "shared"
  | "system_micro_action"

Örnek:

Hangi özel anahtarın kullanılacağı:
player

Tilki’nin kendi mendilini kullanması:
npc

Ağır sandığı birlikte kaldırmak:
shared

Seçilen feneri çantadan çıkarmak:
system_micro_action
62. Inventory UI visibility

Her nesne her zaman envanter ekranında gösterilmeyebilir.

type ItemUiVisibility =
  | "visible"
  | "hidden_until_discovered"
  | "quest_only"
  | "developer_only"

Örnek:

çantadaki anahtar görünür,
anahtarın gizli özelliği görünmez,
sistem içi story token görünmez.
63. Item naming

Bir nesnenin görünen adı bilgi seviyesine göre değişebilir.

Unknown:
Parlak metal parça

Partially identified:
Eski bir anahtar

Identified:
Ay Anahtarı

Bu adlar gerçek definition’ı değiştirmez.

64. Item description generation

Item açıklaması şu kaynaklardan oluşmalıdır:

Canonical properties
+
Discovered properties
+
Condition
+
Relevant provenance
+
Age-appropriate wording

Narrative Engine gizli özelliği açıklamamalıdır.

65. Item visual consistency

Her önemli nesne için kanonik görsel tanım tutulmalıdır.

type ItemVisualDefinition = {
  itemDefinitionId: string

  shape: string
  primaryMaterials: string[]
  baseColors: string[]

  distinctiveFeatures: string[]
  sizeRelativeToCharacter: string

  conditionVariants: Record<string, string>
}

Örnek:

Mavi Anahtar:
- küçük
- koyu mavi metal
- yuvarlak ay sembollü sap
- üç dişli
- hafif çizik
66. Görsel prompt üretimi

Illustration cue, envanter state’inden oluşturulmalıdır.

Tilki anahtarı taşıyorsa:
anahtar Tilki’de görünmeli.

Anahtar çantadaysa:
elde görünmemeli.

Anahtar gizli özellik taşıyorsa:
özellik keşfedilmediyse parlamamalı.
67. Item-state parity

Narrative:

Lumi feneri Tilki’ye verdi.

Inventory delta:

holder = Lumi

Bu kritik hatadır.

Aynı şekilde:

Narrative:

Elma yenildi.

Inventory:

quantity değişmedi

geçersizdir.

68. Narrative visibility

Her inventory değişimi metinde aynı ayrıntıyla anlatılmak zorunda değildir.

type ItemChangeVisibility =
  | "must_narrate"
  | "may_imply"
  | "internal_only"

Örnek:

Anahtar el değiştirdi:
must_narrate

Çekiç durability -1:
internal_only

Çanta iç düzeni değişti:
may_imply
69. Quest integration

Quest Engine, inventory olaylarını dinleyebilir.

Örnek:

ITEM_OBTAINED:
north_map_fragment

↓

Objective:
Harita parçasını bul
completed

Ancak eşyanın yalnızca görüntüde görünmesi objective completion sağlamaz.

Kanonik ownership gerekir.

70. Quest item reservation

Görev için gerekli eşya başka crafting işleminde tüketilmemelidir.

type QuestItemReservation = {
  itemInstanceId: string
  questId: string

  reservationType:
    | "hard"
    | "warning"
}
Hard

Tüketim engellenir.

Warning

Çocuk bilgilendirilir ve alternatif sunulur.

Çocuk arayüzünde teknik uyarı yerine:

Bu ip, köprü onarımı için ayrılmıştı. İstersen başka bir bağlayıcı bulabiliriz.

71. Multiple quest conflict

Aynı tahta iki görevde gerekebilir.

Köprü onarımı
ve
Tilki’nin yuvası

Sistem:

aynı kaynağı iki kez saymamalı,
çocuğa anlamlı seçim sunabilir,
alternatif malzeme yolları açabilir.

Bu gerçek bir kaynak kararı olabilir.

72. Resource scarcity

Kaynak kıtlığı hafif ve çözülebilir olmalıdır.

Örnek:

Yeterli ip yok.

Alternatifler:

sarmaşık kullan,
Denizci’den ödünç al,
eski ağı çöz,
görevi başka yöntemle tamamla.

Kıtlık hikâyeyi kilitlememelidir.

73. Item duplication

Bazı crafted veya stackable eşyalar çoğaltılabilir.

Ama benzersiz görev nesnesi recipe ile kopyalanamaz.

type DuplicationPolicy =
  | "allowed"
  | "limited"
  | "forbidden"

Örnek:

Kâğıt fener:
allowed

Ay Anahtarı:
forbidden
74. Item transformation

Crafting her zaman yeni item üretmek zorunda değildir.

Bir item başka forma dönüşebilir.

Kırık fener
→ onarılmış fener

Boş kavanoz
→ ışık kavanozu

Uzun ip
→ iki kısa ip
type ItemTransformation = {
  sourceItemIds: string[]
  consumedSourceIds: string[]

  createdItemIds: string[]
  modifiedItemIds: string[]
}
75. Reversible crafting

Bazı birleşimler geri ayrılabilir.

Örnek:

İpe bağlanmış fener

daha sonra:

ip + fener

olarak ayrılabilir.

type CraftReversibility =
  | "reversible"
  | "partially_reversible"
  | "irreversible"

Çocuk önemli eşyayı geri döndürülemez biçimde kaybetmeden önce sonuç sinyali görmelidir.

76. Temporary items

Geçici crafted nesneler zamanla bozulabilir.

Örnek:

Yaprak şemsiyesi
Geçici sal
Çamur işareti
type TemporaryItemPolicy = {
  expiresAfterUses?: number
  expiresAfterWorldHours?: number
  invalidatedByConditions?: string[]
}

Offline sürede geçici nesne yok olabilir ama dönüş özetinde açıklanmalıdır.

Önemli görev nesnesi geçici yapılmamalıdır.

77. Item decay offline

Offline decay yalnızca uygun nesnelerde çalışmalıdır.

Örnek:

yiyecek bayatlayabilir,
ıslak bez kuruyabilir,
geçici yaprak yapı bozulabilir.

Ama 10 günlük freeze kuralından sonra yeni decay hesaplanmamalıdır.

78. Perishable items
type PerishableState = {
  freshUntil: number
  spoiledAt?: number

  offlineDecayPolicy:
    | "normal"
    | "reduced"
    | "frozen_after_limit"
}

MVP’de perishables gerekli olmayabilir.

Karmaşıklık yaratır ve çocuk yokken kaynak kaybı hissi oluşturabilir.

79. Item discovery

Bir nesne dünyada mevcut olabilir ama oyuncu tarafından bilinmiyor olabilir.

type ItemDiscoveryState =
  | "unknown"
  | "noticed"
  | "inspected"
  | "identified"
  | "owned"

Örnek:

Sandıkta anahtar var:
unknown

Sandık açıldı, metal parça görüldü:
noticed

İncelendi:
identified

Alındı:
owned
80. Search action

Arama eylemi sonuçları:

nothing_found
partial_clue
item_noticed
item_found
hidden_compartment_found

Arama otomatik olarak bütün gizli eşyaları açmamalıdır.

Başarı:

karakter becerisi,
dikkat,
doğru hedef,
çevresel koşullar

ile ilişkili olabilir.

81. Item ownership knowledge

World truth:

Anahtar Denizci’nin sandığında.

Player knowledge:

Anahtarın nerede olduğu bilinmiyor.

Inventory Engine gerçek konumu bilir.

Quest journal ve narrative yalnızca oyuncu bilgisini kullanır.

82. Lost item quest

Bir item kaybolduğunda otomatik görev oluşabilir.

Tilki’nin bilekliği kayıp.

Quest candidate:

Mavi Bilekliği Bul

Ancak küçük, önemsiz her eşya için görev üretilmemelidir.

Puanlama:

duygusal değer,
görev önemi,
geri kazanılabilirlik,
oyuncu ilgisi.
83. Item memory

Önemli item olayları Memory Engine’e event gönderir:

ITEM_RECEIVED
ITEM_GIFTED
ITEM_LOST
ITEM_RECOVERED
ITEM_BROKEN
ITEM_REPAIRED
ITEM_USED_IN_CRITICAL_EVENT

Memory Engine hangi karakterin olayı hatırlayacağını kendi kurallarıyla belirler.

84. Item relationship effect

Örnek:

Lumi Tilki’nin verdiği bilekliği kaybetti.

Bu otomatik olarak ilişki düşüşü demek değildir.

Tilki:

anlayış gösterebilir,
üzülebilir,
yardım edebilir,
önemsemeyebilir.

Relationship ve Decision Engine bağlama göre sonucu belirler.

85. Symbolic use

Bazı nesneler fiziksel değil, sembolik işlev görür.

Örnek:

söz bilekliği,
eski fotoğraf,
arkadaşlık taşı,
kulüp rozeti.

Story Planner bunları:

duygusal callback,
güven işareti,
hatırlatma,
karakter gelişimi

için kullanabilir.

86. Item cooldown

Aynı özel nesne her problemi çözmemelidir.

type NarrativeItemUsageHistory = {
  itemDefinitionId: string

  recentStoryUseCount: number
  recentCriticalUseCount: number

  lastUsedStoryId?: string
}

Story Planner kullanım tekrar cezası uygulayabilir.

87.万能 item sorunu

Tek bir büyülü eşya:

bütün kapıları açıyor,
bütün dilleri çeviriyor,
herkesi iyileştiriyor,
her yeri gösteriyor

ise diğer sistemleri anlamsızlaştırır.

Özel eşyaların:

açık sınırları,
belirli koşulları,
maliyeti,
bilinmeyen yönleri

olmalıdır.

88. Magic item rules
type MagicItemRule = {
  itemDefinitionId: string

  activationConditions: GoalCondition[]
  allowedEffects: string[]
  forbiddenEffects: string[]

  costType?:
    | "charge"
    | "cooldown"
    | "environment"
    | "relationship_permission"

  visibleToCharacters: boolean
}

Büyü de deterministic kurallara bağlı olmalıdır.

89. Item charge
type ChargeState = {
  current: number
  maximum: number

  rechargeConditions: GoalCondition[]
}

Örnek:

Ay feneri:
3 kullanım
Ay ışığında şarj olur

Ama küçük yaşta bunu karmaşık sayılar yerine görsel göstermek daha uygundur.

90. Item permission

Bazı nesneleri herkes kullanamaz.

Nedenleri:

sahip izin vermedi,
karakter becerisi yetersiz,
nesne belirli karaktere bağlı,
güvenlik,
kültürel veya hikâyesel kural.
type ItemPermissionRule = {
  itemDefinitionId: string
  allowedCharacterIds?: string[]
  requiredRelationshipThreshold?: number
  requiredCapabilityId?: string
}
91. Character-bound items

Bazı eşyalar belirli karakterle anlamlıdır.

Örnek:

Denizci’nin eski pusulası

Lumi bunu ödünç alabilir ama sahiplik otomatik geçmez.

Karakterin izni ve transfer olayı gerekir.

92. Inventory personalization

Personalization Engine:

favori ödül türlerini,
görsel aksesuar tercihlerini,
inventory UI biçimini,
kullanılabilir yaratıcı seçenekleri

etkileyebilir.

Ama:

mevcut item quantity,
hidden property,
ownership,
quest reservation

değiştiremez.

93. Çocuk için eşya önerisi

Sistem sahne sonunda uygun eşyaları seçenek olarak sunabilir:

Çantandaki kullanılabilir eşyalar:

- Fener
- İp
- Mavi bileklik

Ancak her item gösterilmemelidir.

Öneri puanı:

Relevance
+ Feasibility
+ Novelty
+ Child Preference
− Repetition
− Safety Risk
94. Item suggestion leak

Sistem bir item önererek gizli çözümü açık edebilir.

Örnek:

Gizli mekanizma ay ışığıyla çalışıyor.

Çocuğa doğrudan:

Ay Anahtarını kullan

önerisi verilirse bilgi sızıntısı olabilir.

Öneri yalnızca oyuncunun mevcut bilgisine dayanmalıdır.

95. Inventory action menu
type AvailableItemAction = {
  itemInstanceId: string
  actionType: string
  targetIds: string[]

  availability:
    | "available"
    | "known_but_unavailable"
    | "hidden"

  unavailableReason?: string
}

known_but_unavailable örneği:

Fener var ama şarjı yok.

hidden örneği:

Anahtarın gizli ay ışığı işlevi.
96. Known but unavailable

Çocuğa teknik neden yerine hikâye dili kullanılabilir.

Fener şu anda yanmıyor. Onu yeniden çalıştırmanın bir yolunu bulmanız gerekiyor.

Bu yeni bir goal candidate oluşturabilir.

97. Item action failure

Bir eşya kullanımı başarısız olabilir.

Nedenler:

yanlış hedef,
condition bozuk,
gerekli bilgi yok,
yetersiz güç,
çevre uygun değil.

Fail-forward:

yeni ipucu,
condition hakkında bilgi,
alternatif kullanım,
yardım ihtiyacı.
98. Item use result
type ItemUseResult = {
  resultLevel:
    | "invalid"
    | "failure"
    | "partial"
    | "success"
    | "exceptional"

  canonicalEvents: DomainEvent[]
  inventoryDelta: InventoryStateDelta

  discoveredProperties: string[]
  followupActionIds: string[]
}
99. Inventory State Delta
type InventoryStateDelta = {
  createdItems: ItemInstance[]
  updatedItems: {
    itemInstanceId: string
    changes: Record<string, unknown>
  }[]

  transferredItems: ItemTransfer[]
  consumedItems: string[]
  destroyedItems: string[]

  containerChanges: {
    containerId: string
    addedItemIds: string[]
    removedItemIds: string[]
  }[]
}
100. Inventory validation

Temel kontroller:

- quantity negatif mi?
- stack limit aşıldı mı?
- unique item iki kez var mı?
- item aynı anda iki owner’da mı?
- consumed item aktif mi?
- destroyed item kullanılmaya çalışılıyor mu?
- container capacity aşıldı mı?
- circular container oluştu mu?
- quest-critical item yanlışlıkla tüketiliyor mu?
- reserved item başka işlemde kullanılıyor mu?
- transfer kaynağında item gerçekten var mı?
101. Circular container

Şu tür yapı engellenmelidir:

Çanta A
→ Kutu B
→ Çanta A

Bu veri döngüsüdür.

assertNoContainerCycle()

kritik invariant olmalıdır.

102. Item location invariant

Bir item için tek fiziksel zincir bulunmalıdır:

Character
→ Container
→ Item

Şu geçersizdir:

Item owner = Tilki
ve
location = Kule sandığı

Eğer item Tilki’nin çantasındaysa:

item owner = container
container owner = Tilki

şeklinde açık zincir gerekir.

103. Crafting validation
- bütün malzemeler mevcut mu?
- malzemeler rezerve edilebilir mi?
- aynı item iki ingredient yerine sayılıyor mu?
- gerekli araç var mı?
- capability koşulu sağlanıyor mu?
- safety uygun mu?
- output unique constraint’i bozuyor mu?
- recipe sonucu world rule ile uyumlu mu?
- quest-critical item tüketiliyor mu?
104. Narrative-crafting parity

Narrative:

Lumi ipi ikiye böldü.

State:

1 uzun ip

olarak kalamaz.

Doğru delta:

uzun ip consumed/transformed
2 kısa ip created

Ya da gerçek koşullara göre:

1 kısa ip
1 orta ip
105. Crafting and capability evidence

Craft tamamlandığında Capability Engine’e kanıt event’i gönderilebilir.

CRAFT_COMPLETED
CRAFT_COMPLETED_WITH_HELP
CRAFT_FAILED_WITH_LEARNING

Yardımlı üretim ile bağımsız üretim farklı ağırlıkta olabilir.

106. Crafting and relationship

Birlikte crafting:

iş birliği,
sabır,
güven,
görev paylaşımı

için ilişki olayları oluşturabilir.

Ama Inventory Engine ilişki puanı vermez.

Yalnızca:

CHARACTERS_CRAFTED_TOGETHER

event’i üretir.

107. Crafting and story pacing

Her crafting işlemi uzun anlatılmamalıdır.

Story Planner crafting sahnesini şu amaçlarla kullanabilir:

problem çözme,
karakter iş birliği,
öğrenme hedefi,
hazırlık,
kısa sakin sahne.

Basit recipe hızlı geçilebilir.

Önemli yaratıcı çözüm daha ayrıntılı anlatılabilir.

108. Quick crafting
type CraftingPresentationMode =
  | "instant"
  | "short_scene"
  | "interactive_steps"
Instant

Basit ve bilinen tarif.

Short scene

Karakter etkileşimi veya küçük problem içerir.

Interactive steps

Önemli görev veya öğrenme hedefi.

Her crafting mini oyuna dönüşmemelidir.

109. Crafting mini-game sınırı

Mini-game kullanılacaksa:

hikâyeyi kilitlememeli,
başarısızlık fail-forward olmalı,
yaşa uygun olmalı,
tehlikeli gerçek araçları taklit etmemeli,
birkaç kısa adımdan oluşmalı.
110. Item lifecycle
Created
↓
Discovered
↓
Owned / Stored
↓
Used / Equipped / Transferred
↓
Damaged / Transformed
↓
Repaired / Consumed / Lost / Destroyed
↓
Archived

Her önemli geçiş domain event üretir.

111. Item domain events
ITEM_CREATED
ITEM_DISCOVERED
ITEM_IDENTIFIED
ITEM_OBTAINED
ITEM_STORED
ITEM_EQUIPPED
ITEM_UNEQUIPPED
ITEM_USED
ITEM_CONSUMED
ITEM_TRANSFERRED
ITEM_GIFTED
ITEM_LENT
ITEM_RETURNED
ITEM_LOST
ITEM_RECOVERED
ITEM_DAMAGED
ITEM_BROKEN
ITEM_REPAIRED
ITEM_TRANSFORMED
ITEM_DESTROYED
ITEM_PROPERTY_DISCOVERED

CRAFT_STARTED
CRAFT_INPUT_RESERVED
CRAFT_COMPLETED
CRAFT_PARTIALLY_COMPLETED
CRAFT_FAILED
CRAFT_CANCELLED
112. Event causation
type InventoryDomainEvent = {
  id: string
  eventType: string

  itemInstanceIds: string[]
  actorIds: string[]
  targetIds: string[]

  causationId: string
  correlationId: string

  payload: unknown
  occurredAt: number
}

Böylece:

Bu anahtar neden Tilki’de?

sorusu cevaplanabilir.

113. Inventory audit

Commit sonrası şu kontroller yapılabilir:

- item count doğru mu?
- ownership zinciri geçerli mi?
- event ve state uyumlu mu?
- unique item constraint korunmuş mu?
- reservation temizlendi mi?
- consumed inputs artık aktif değil mi?
- crafted output doğru owner’da mı?
114. Idempotency

Aynı item kullanımı iki kez uygulanmamalıdır.

Örnek:

Tek elma

aynı request retry olduğunda iki kez tüketilmemelidir.

Benzersiz kayıt:

type InventoryOperationKey = {
  requestId: string
  operationType: string
  itemInstanceId: string
}
115. Concurrency

Aynı item iki eşzamanlı request’te kullanılabilir.

Örnek:

İpi köprü için kullan
ve
ipi şemsiye için kullan

Çözüm:

optimistic version,
reservation,
transaction lock.

İlk başarılı işlem item version’ı değiştirir.

İkinci işlem yeniden değerlendirilir.

116. Item version
type VersionedItemState = {
  itemInstanceId: string
  version: number
}

Update sırasında:

expectedVersion

kontrol edilir.

117. Inventory snapshot

Story generation sırasında envanter snapshot’ı dondurulmalıdır.

type InventorySnapshot = {
  inventoryVersion: number
  itemStates: ItemInstance[]
  availableActionIds: string[]
}

Narrative generation sırasında item state değişirse eski çıktı commit edilmemelidir.

118. Cache

Cache edilebilecek veriler:

item definitions,
visual definitions,
recipe definitions,
affordances,
localization.

Cache edilmemesi veya version kontrolü gerekenler:

ownership,
quantity,
condition,
reservations,
hidden property discovery.
119. Item localization
type LocalizedItemText = {
  itemDefinitionId: string
  language: string

  name: string
  shortDescription: string
  conditionLabels: Record<string, string>
}

Kanonik item id dil değişiminden etkilenmez.

120. Item accessibility

Inventory arayüzünde:

büyük ikon,
sesli isim,
basit condition göstergesi,
kategori filtresi,
kullanılabilir eşya vurgusu

olabilir.

Ama gizli kullanım alanı erişilebilirlik nedeniyle açıklanmamalıdır.

121. Çoklu çocuk profili

Ayrı evrenlerde envanter tamamen ayrıdır.

Paylaşılan aile evreninde:

kişisel item,
ortak item,
ödünç item

ayrımı gerekir.

type ItemScope =
  | "personal"
  | "shared_group"
  | "world"
122. Shared item conflict

İki çocuk aynı ortak item’i kullanmak isterse:

turn-based,
ortak karar,
alternatif item,
story-level resolution

kullanılabilir.

Sistem sessizce iki kopya oluşturmamalıdır.

123. Eşya ve ebeveyn ayarları

Ebeveyn bazı eşya türlerini sınırlandırabilir:

silah benzeri nesneler,
ateş temalı araçlar,
korkutucu büyülü nesneler,
ödeme bağlantılı kozmetikler.

Bu sınırlar:

item generation,
quest reward,
crafting recipe,
visual output

aşamalarında uygulanmalıdır.

124. Weapon-like items

LUMI’de silah kategorisini merkezî progression sistemi yapmak uygun değildir.

Fantastik veya araç benzeri nesneler:

savunma,
koruma,
engel kaldırma,
sinyal verme

amaçlarıyla kullanılabilir.

Örnek:

Tahta kılıç

varsa anlatı bunu saldırı optimizasyonuna dönüştürmemelidir.

MVP’de ayrı weapon stat sistemi kurmamak en doğrusudur.

125. Item generation

Yeni eşya üç kaynaktan gelir:

Authored item
Procedural item instance
Crafted item

LLM:

isim,
kısa açıklama,
görsel varyasyon

önerebilir.

Ama şu alanlar deterministic olmalıdır:

category,
uniqueness,
allowed actions,
hidden properties,
recipe role,
quest criticality,
safety tags.
126. LLM item proposal
type ItemProposal = {
  proposedName: string
  proposedDescription: string

  proposedCategory: string
  proposedAffordances: string[]
  proposedVisualFeatures: string[]

  claimedStoryUse: string
}

Akış:

LLM proposal
↓
Definition rule validation
↓
Uniqueness check
↓
Safety
↓
World compatibility
↓
Canonical definition creation
127. Procedural item variation

Aynı item definition farklı görsel veya küçük özellik varyasyonları taşıyabilir.

Örnek:

Orman taşı

- yuvarlak gri
- düz yeşilimsi
- beyaz çizgili

Ama affordance ve mekanik özellikleri aynı kalabilir.

128. Inventory and Story Planner

Story Planner envanteri şu amaçlarla kullanır:

uygun çözüm yolları,
callback,
item-based choice,
preparation scene,
crafting opportunity,
quest conflict,
ödül planı.

Ama sırf item var diye her sahnede kullanılmamalıdır.

129. Item relevance score
Item Relevance =
Goal Fit
+ Affordance Fit
+ Emotional Relevance
+ Quest Relevance
+ Novelty
− Recent Use
− Safety Risk

Yüksek puanlı item sahne adayı olabilir.

130. Inventory recap

Uzun aradan sonra:

Çantanda şunlar vardı:

- Fener
- Mavi anahtar
- Tilki’nin bilekliği

Ancak bütün düşük değerli malzemeleri listelemek gereksiz olabilir.

Recap önceliği:

quest relevance
emotional relevance
recent use
131. Inventory cleanup

Envanter zamanla şişebilir.

Çözüm:

ev deposu,
koleksiyon rafı,
malzeme sandığı,
otomatik kategori,
arşivlenmiş kozmetik.

Item sessizce silinmemelidir.

132. Home storage
type StorageLocation = {
  id: string
  locationId: string

  storageType:
    | "personal_chest"
    | "shared_shelf"
    | "material_storage"
    | "display_case"

  itemInstanceIds: string[]
  accessPolicy: string
}

Çocuk aktif maceraya çıkarken yalnızca ilgili eşyaları seçebilir.

133. Loadout
type AdventureLoadout = {
  storyId: string
  characterId: string

  selectedItemIds: string[]
  requiredItemIds: string[]
  maximumSlots: number
}

Bu, daha önce konuştuğumuz:

Çocuk sonraki hikâye için envanterden eşya seçsin.

fikrini destekler.

134. Loadout safety

Story-critical ve zorunlu eşya otomatik eklenebilir.

Çocuk zorunlu olmayan eşyaları seçer.

Çanta kapasitesi aşılırsa sistem:

önemli eşyaları gösterir,
alternatifler sunar,
gerekirse grup çantasını kullanır.
135. Unselected items

Seçilmeyen eşya yok olmaz.

Depoda kalır.

Story Planner yalnızca loadout içindeki item’leri doğrudan erişilebilir sayar.

Ancak hikâye evde veya depo yakınında geçiyorsa erişim değişebilir.

136. Forgotten item

Çocuk gerekli olmayan ama faydalı eşyayı almadıysa:

hikâye yine ilerler,
alternatif yol açılır,
NPC yardımı gelebilir,
daha zor yöntem kullanılabilir.

Yanlış:

Feneri seçmedin, görev bitti.

Doğru:

Fener yoksa ışık böceklerini takip etme veya geri dönme yolu.
137. Inventory progression

Envanter ilerlemesi:

daha fazla slot,
özel bölme,
yeni araç tipi,
item bilgi artışı,
depo açılması,
crafting erişimi

ile sağlanabilir.

Sadece daha güçlü eşya biriktirmek zorunda değildir.

138. Çanta yükseltme
Eski çanta:
4 slot

Yeni bölmeli çanta:
6 slot + harita bölmesi

Bu ödül dünyadan doğal biçimde gelmelidir.

Örneğin:

Denizci, uzun yolculuklar için eski ama sağlam çantasını Lumi’ye verdi.

139. Crafting progression

Yeni tarifler şu yollarla açılabilir:

gözlem,
NPC öğretimi,
kitap,
başarılı emergent crafting,
capability threshold,
dünya keşfi.
type RecipeKnowledgeState =
  | "unknown"
  | "hinted"
  | "learned"
  | "mastered"
140. Recipe discovery

Çocuk yaratıcı biçimde geçerli bir ürün yaparsa tarif sonradan kaydedilebilir.

Yaprak + dal + ip
→ Yaprak Şemsiyesi

Sistem:

Yeni bir yapım fikri öğrendiniz.

diyebilir.

Ancak her rastgele kombinasyon kalıcı recipe olmamalıdır.

141. Emergent recipe promotion

Bir emergent sonuç şu koşullarda recipe’ye dönüşebilir:

güvenli,
tekrarlanabilir,
dünya kurallarına uygun,
yeterli affordance uyumu,
net output,
en az bir başarılı kullanım.
type EmergentRecipeCandidate = {
  sourceCraftSessionId: string
  reproducibilityScore: number
  safetyApproved: boolean
  approvedDefinitionId?: string
}
142. Crafting knowledge by character

Tarifi çocuk oyuncu profili değil, karakter öğrenir.

Lumi yaprak şemsiyesi yapmayı öğrendi.

Başka karakter bunu otomatik bilmez.

Bilgi paylaşılırsa onlar da öğrenebilir.

143. NPC crafting

NPC’ler kendi bilgi ve hedeflerine göre crafting yapabilir.

Örnek:

Denizci tekne yamasını hazırlar.
Tilki basit yaprak işaretleri yapar.
Baykuş harita kopyası çıkarır.

Offline crafting yalnızca düşük riskli ve player-gate olmayan durumlarda ilerlemelidir.

144. NPC item autonomy

NPC kendi eşyasını:

kullanabilir,
saklayabilir,
ödünç verebilir,
tamir edebilir,
hediye edebilir.

Ama oyuncuya ait önemli item’i izinsiz tüketmemelidir.

type NpcInventoryAuthority = {
  personalItems: "full"
  groupItems: "policy_based"
  playerItems: "permission_required"
}
145. Item permission memory

NPC daha önce verilen izni hatırlayabilir.

Örnek:

“Feneri gerektiğinde kullanabilirsin.”

Bu izin:

tek kullanımlık,
görev süresince,
kalıcı

olabilir.

type ItemPermissionGrant = {
  itemInstanceId: string
  grantorId: string
  granteeId: string

  scope:
    | "single_use"
    | "quest"
    | "temporary"
    | "permanent"
}
146. Item secrecy

Bazı karakterler sahip oldukları nesneyi saklayabilir.

World truth:

Denizci haritayı sandığında saklıyor.

Player inventory bunu göstermez.

Karakter knowledge ve belief sistemleri yalnızca uygun kanıtla güncellenir.

147. Item inspection
type ItemInspectionResult = {
  visibleProperties: ItemProperty[]
  newlyDiscoveredProperties: ItemProperty[]

  conditionAssessment: string
  possibleActionHints: string[]
}

İnceleme başarı seviyesi:

karakter capability,
ışık,
araç,
item condition

ile değişebilir.

148. Item clue

Nesneler hikâye ipucu taşıyabilir.

type ItemClue = {
  itemInstanceId: string
  factId: string

  discoveryCondition: GoalCondition[]
  knowledgeGainLevel:
    | "hinted"
    | "suspected"
    | "known"
}

Örnek:

Islak harita parçasında soluk ay sembolü.

Kurutmadan tam görünmeyebilir.

149. Document items

Mektup, harita, günlük ve notlar ayrı özelliklere sahiptir.

type DocumentItemState = {
  itemInstanceId: string

  readable: boolean
  languageId?: string
  damagedSections: string[]

  knownContentFactIds: string[]
  hiddenContentFactIds: string[]
}

Belgeyi envantere almak, içeriğini bilmek anlamına gelmez.

Okuma eylemi gerekir.

150. Map item ve world map ayrımı

Fiziksel harita nesnesi:

Item

Uygulamadaki dünya haritası:

Map Progression State

Fiziksel haritada yeni yer keşfedilebilir ve dijital dünya haritasına işlenebilir.

Ama ikisi aynı veri değildir.

151. Key items

Anahtarlar yalnızca kapı açma nesnesi olmak zorunda değildir.

Türler:

fiziksel anahtar,
sembol dizisi,
bilgi anahtarı,
ilişki izni,
büyülü nesne.

Quest Engine gate koşulunu belirler.

Inventory Engine yalnızca fiziksel veya taşınabilir bileşeni yönetir.

152. Key consumption

Anahtar kullanıldığında genellikle tüketilmez.

Ama:

mühür kırılır,
tek kullanımlık token,
eriyen büyülü anahtar

gibi istisnalar olabilir.

Bu davranış item definition içinde açık olmalıdır.

153. Collection items

Toplanabilir nesneler:

yapraklar,
taşlar,
yıldız çıkartmaları,
harita pulları.

Ama koleksiyon sistemi aşırı tüketim ve tamamlama baskısı yaratmamalıdır.

Eksik koleksiyon çocuğu suçlamamalı veya süre baskısı yapmamalıdır.

154. Cosmetic items

Kozmetik item:

oyuncu karakter görünümü,
oda dekoru,
harita çıkartması,
çanta süsü

olabilir.

Kozmetik eşya world state’in görsel devamlılığına eklenmelidir.

Takılan aksesuar görsellerde korunmalıdır.

155. Item safety tags
type ItemSafetyTag =
  | "sharp"
  | "fire"
  | "heavy"
  | "toxic"
  | "frightening"
  | "adult_supervision"
  | "real_world_hazard"

Bu tag’ler:

crafting,
item action,
narrative,
visual

aşamalarında değerlendirilir.

156. Inventory privacy

Çocuğun gerçek dünyada sahip olduğu eşyalar otomatik olarak profil veya dünya envanterine eklenmemelidir.

“Benim evde gerçek bıçağım var.”

gibi serbest girdiler:

kişisel veri olarak saklanmamalı,
hikâye envanterine otomatik eklenmemeli,
güvenli biçimde yönlendirilmelidir.
157. Inventory errors
type InventoryError =
  | "ITEM_NOT_FOUND"
  | "ITEM_NOT_OWNED"
  | "INSUFFICIENT_QUANTITY"
  | "INVALID_CONDITION"
  | "ITEM_RESERVED"
  | "CONTAINER_FULL"
  | "UNIQUE_ITEM_CONFLICT"
  | "INVALID_TRANSFER"
  | "CRAFT_REQUIREMENT_MISSING"
  | "SAFETY_RESTRICTION"
  | "VERSION_CONFLICT"

Çocuğa teknik hata gösterilmez.

158. Child-facing fallback

Örnek:

ITEM_NOT_OWNED

Teknik yerine:

Bu eşya şu anda yanlarında değildi. Ama aynı işi yapabilecek başka bir şey arayabilirlerdi.

159. Inventory observability
type InventoryTrace = {
  traceId: string
  correlationId: string

  operationType: string
  itemInstanceIds: string[]

  previousVersions: number[]
  resultingVersions: number[]

  ruleIds: string[]
  validationFindings: string[]

  durationMs: number
}
160. Inventory testleri
Unit tests
Ownership tests
Quantity property tests
Unique item tests
Container cycle tests
Crafting transaction tests
Quest reservation tests
Narrative parity tests
Offline decay tests
Creative use scenario tests
Visual consistency tests
161. Property-based test örnekleri
Hiçbir item quantity negatif olmaz.
Unique item birden fazla aktif instance taşımaz.
Consumed item aktif owner taşımaz.
Container kendi içinde bulunamaz.
Aynı item iki crafting session’da reserved olamaz.
Transfer sonrası eski owner item’i taşımaz.
Craft input toplamı mevcut miktarı aşmaz.
162. Scenario test örneği

Başlangıç:

Lumi:
1 uzun ip

Tilki:
0 ip

Quest:
Köprü onarımı için ip gerekli.

Çocuk:
İpi ikiye bölüp yarısını Tilki’ye verelim.

Beklenen:

- Uzun ip transform edilir.
- İki kısa ip oluşturulur.
- Biri Lumi’de, biri Tilki’de olur.
- Quest tam tamamlanmaz; miktar hâlâ yetersiz olabilir.
- Transfer narrative’de görünür.
- Aynı uzun ip state’te kalmaz.
163. Creative crafting scenario

Başlangıç:

3 büyük yaprak
2 ince dal
1 kısa ip
hafif yağmur

Çocuk:

“Tilki için şemsiye yapalım.”

Beklenen:

- Affordance uyumu geçerli.
- Güvenlik sorunu yok.
- Malzemeler reserve edilir.
- Geçici yaprak şemsiyesi oluşturulur.
- Malzemeler tüketilir.
- Ürün fragile quality taşır.
- Tilki’nin kullanımı narrative’de görünür.
- Crafting event’i memory ve capability adayları üretir.
164. Quest-critical item scenario

Başlangıç:

Ay Anahtarı:
quest_required

Çocuk:
Anahtarı eritip yeni bir kolye yapalım.

Beklenen:

- Crafting engellenir.
- Çocuk azarlanmaz.
- Anahtarın görev için önemli olduğu biliniyorsa açıklanır.
- Kolye için güvenli alternatif malzeme önerilir.
- State değişmez.
165. Offline inventory scenario

Başlangıç:

Tilki’nin yaprak şemsiyesi:
temporary
fragile

Kullanıcı:
12 gün yok.

Beklenen:

- İlk 10 gün sınırı içinde uygun decay uygulanabilir.
- 10 günden sonrası simüle edilmez.
- Şemsiye bozulduysa dönüş özetinde açıklanır.
- Kalıcı önemli eşyalar etkilenmez.
- Çocuk yokluğu nedeniyle suçlanmaz.
166. MVP Inventory Engine

İlk sürümde şu özellikler yeterlidir:

1. Item definition ve item instance ayrımı
2. Unique, limited ve stackable item türleri
3. Tek owner/location invariant
4. Quantity ve condition
5. Basit container ve çanta kapasitesi
6. Item use precondition sistemi
7. Item transfer, give, lend ve store
8. Quest-critical item koruması
9. Item knowledge ve hidden property
10. Fixed recipe crafting
11. Sınırlı affordance tabanlı creative use
12. Resource reservation
13. Atomic crafting transaction
14. Quest ve narrative parity
15. Görsel item tutarlılığı
16. Offline önemli eşya koruması
167. MVP Item Definition
type CoreItemDefinition = {
  id: string
  name: string

  category:
    | "tool"
    | "consumable"
    | "material"
    | "quest"
    | "key"
    | "container"
    | "document"
    | "wearable"
    | "crafted"

  uniqueness:
    | "unique"
    | "limited"
    | "stackable"

  portable: boolean
  stackLimit?: number

  affordances: string[]
  storyCriticality:
    | "normal"
    | "important"
    | "quest_required"
    | "world_critical"
}
168. MVP Item Instance
type CoreItemInstance = {
  id: string
  definitionId: string

  ownerType:
    | "character"
    | "group"
    | "location"
    | "container"

  ownerId: string

  quantity: number
  condition: string

  discoveredPropertyIds: string[]

  status:
    | "active"
    | "reserved"
    | "consumed"
    | "destroyed"
    | "lost"

  version: number
}
169. MVP Recipe
type CoreCraftingRecipe = {
  id: string
  name: string

  inputs: {
    definitionId?: string
    affordance?: string
    quantity: number
    consumed: boolean
  }[]

  requiredCapabilityIds: string[]
  requiredToolDefinitionIds: string[]

  outputDefinitionId: string
  outputQuantity: number

  safetyLevel: string
}
170. MVP ana işlemler
createItemInstance()

obtainItem()

transferItem()

storeItem()

removeItemFromContainer()

consumeItem()

damageItem()

repairItem()

loseItem()

recoverItem()

discoverItemProperty()

evaluateItemUse()

useItem()

reserveCraftingInputs()

validateCraftingRecipe()

resolveCrafting()

commitCraftingTransaction()

buildInventoryView()

buildAvailableItemActions()

validateInventoryState()
171. Örnek item use akışı
async function useInventoryItem(
  request: ItemUseRequest
): Promise<ItemUseResult> {
  const snapshot = loadInventorySnapshot(
    request.characterId
  )

  const item = findItemInstance(
    snapshot,
    request.itemInstanceId
  )

  const feasibility = evaluateItemUse({
    item,
    targetId: request.targetId,
    intendedOutcome: request.intendedOutcome,
    worldState: request.worldState,
    characterState: request.characterState
  })

  if (feasibility.level === "invalid") {
    return buildSafeAlternativeItemResult(
      feasibility
    )
  }

  const resolution = resolveItemAction({
    item,
    feasibility,
    request
  })

  validateInventoryDelta(
    snapshot,
    resolution.inventoryDelta
  )

  return resolution
}
172. Örnek crafting akışı
async function craftItem(
  request: CraftingRequest
): Promise<CraftingResult> {
  const recipe = resolveRecipeOrEmergentProposal(
    request
  )

  const validation = validateCraftingAttempt({
    recipe,
    selectedItemIds: request.itemIds,
    crafterIds: request.crafterIds,
    worldState: request.worldState
  })

  if (!validation.valid) {
    return buildCraftingAlternative(validation)
  }

  const session = reserveCraftingResources({
    recipe,
    request
  })

  const outcome = resolveCraftingOutcome({
    recipe,
    session,
    characterCapabilities: request.capabilities
  })

  const delta = buildCraftingInventoryDelta(
    session,
    outcome
  )

  validateInventoryDelta(
    request.inventorySnapshot,
    delta
  )

  return {
    session,
    outcome,
    delta
  }
}
173. İlk sürümde yapılmaması gerekenler

Başlangıçta şunlardan kaçınmalıyız:

karmaşık ağırlık simülasyonu,
her item için ayrıntılı durability,
yüzlerce recipe,
sınırsız container nesting,
gerçekçi açlık ve susuzluk sistemi,
her item için ekonomik fiyat,
gelişmiş ticaret ekonomisi,
silah hasar sistemi,
her kombinasyonu LLM’ye çözdürmek,
önemli eşyaların rastgele kaybı,
çocuk yokken kaynakların yoğun bozulması,
crafting için uzun ve tehlikeli gerçek dünya talimatları,
aynı özel eşyanın her problemi çözmesi.

MVP hedefi:

Eşyalar gerçekten var olsun.
Nerede oldukları belli olsun.
Geçmişleri korunsun.
Yaratıcı biçimde kullanılabilsin.
Crafting anlaşılır ve güvenli olsun.
Hikâye ile envanter aynı gerçeği anlatsın.
174. Inventory, Items & Crafting Engine temel ilkeleri
1. Item definition ile item instance ayrı tutulur.
2. Her aktif fiziksel nesnenin tek bir sahiplik veya konum zinciri vardır.
3. Benzersiz nesneler aynı anda çoğaltılamaz.
4. Yığın miktarı hiçbir zaman negatif olamaz.
5. Hikâyede kullanılan eşya gerçekten erişilebilir olmalıdır.
6. Item possession, item knowledge anlamına gelmez.
7. Gizli kullanım alanları keşfedilmeden gösterilmez.
8. Nesneler yalnızca sabit komutlarla değil, affordance’larla yaratıcı biçimde kullanılabilir.
9. Yaratıcı kullanım yine dünya kuralları ve güvenlikten geçer.
10. Crafting başlamadan kaynaklar reserve edilir.
11. Aynı malzeme iki eşzamanlı işlemde kullanılamaz.
12. Crafting işlemi atomik olmalıdır.
13. Başarısız crafting mümkünse fail-forward üretmelidir.
14. Görev için kritik nesneler yanlışlıkla tüketilemez.
15. Eşya kaybı kanonik, açıklanabilir ve önemine uygun olmalıdır.
16. Önemli eşyalar offline simülasyonda rastgele kaybolmaz.
17. Envanter transferleri ilişki ve hafıza motorlarına olay gönderir ama etkilerini kendisi hesaplamaz.
18. Fiziksel harita nesnesi ile dünya haritası ilerlemesi ayrı tutulur.
19. Görseller item sahipliği, condition ve keşfedilmiş özelliklerle uyumlu olmalıdır.
20. Narrative ile inventory delta aynı olayı yansıtmalıdır.
21. Kişiselleştirme envanter gerçeğini değiştiremez.
22. Çocuk tehlikeli crafting istediğinde niyet güvenli alternatife yönlendirilir.
23. Eşya sistemi çocuğu aşırı mikro yönetime zorlamamalıdır.
24. Depolama ve loadout sistemi envanter şişmesini yönetmelidir.
25. Eşyaların geçmişi ve duygusal değeri yaşayan dünya hissinin parçasıdır.

Inventory, Items & Crafting Engine’in kavramsal çekirdeği böylece tamamlandı.