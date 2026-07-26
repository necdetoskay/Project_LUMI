Consistency & Validation Engine

Consistency & Validation Engine, LUMI’nin dünya durumunu, hikâye akışını ve motor çıktılarının birbirleriyle uyumunu denetleyen merkezi güvenlik katmanıdır.

Narrative Validator yalnızca üretilen metni kontrol eder.

Consistency & Validation Engine ise daha geniştir:

Dünya durumu
Karakter durumu
Zaman çizelgesi
Görevler
Envanter
Hafızalar
İnançlar
İlişkiler
Kararlar
Olay sonuçları
Anlatı metni

birlikte değerlendirilir.

Temel ilke:

Hiçbir motorun çıktısı, diğer motorlardan bağımsız biçimde doğru kabul edilmez.

1. Sistemdeki konumu

Validation Engine tek bir yerde çalışan son kontrol olmamalıdır.

Pipeline boyunca birkaç aşamada devreye girmelidir:

Kullanıcı isteği
↓
Input Validation

Sahne planı
↓
Plan Validation

NPC kararları
↓
Decision Validation

State Delta
↓
State Transition Validation

Narrative Context
↓
Context Validation

Üretilen hikâye
↓
Narrative Validation

Commit öncesi
↓
Global Consistency Validation

Commit sonrası
↓
Integrity Audit

Böylece hata yalnızca en sonda değil, oluştuğu aşamaya yakın yakalanır.

2. Validation seviyeleri
type ValidationLayer =
  | "input"
  | "plan"
  | "decision"
  | "state_transition"
  | "context"
  | "narrative"
  | "commit"
  | "post_commit"

Her seviye farklı türde kurallar çalıştırır.

Örneğin:

Input Validation:
Kullanıcı geçerli bir seçenek mi seçti?

Decision Validation:
NPC bilmediği bilgiye göre mi karar verdi?

State Transition Validation:
Bir nesne aynı anda iki karaktere mi verildi?

Narrative Validation:
Gizli bilgi metinde açıklandı mı?

Commit Validation:
Dünya sürümü işlem sırasında değişti mi?
3. Kural türleri
type ConsistencyRuleType =
  | "hard_invariant"
  | "domain_rule"
  | "continuity_rule"
  | "knowledge_rule"
  | "temporal_rule"
  | "spatial_rule"
  | "inventory_rule"
  | "relationship_rule"
  | "memory_rule"
  | "story_rule"
  | "safety_rule"
  | "quality_rule"
Hard invariant

Hiçbir koşulda bozulmaması gereken kurallar.

Bir karakter aynı anda iki yerde bulunamaz.
Aynı benzersiz nesnenin iki sahibi olamaz.
Ölü bir karakter normal eylem yapamaz.
Domain rule

LUMI evreninin özel kuralları.

Tilki uçamaz.
Mavi anahtar yalnızca ay ışığında çalışır.
Kapalı geçitten geçmek için anahtar gerekir.
Continuity rule

Önceki olaylarla tutarlılık.

Kırılmış nesne onarılmadan kullanılamaz.
Ayrılan karakter geri dönme olayı olmadan sahnede görünemez.
Knowledge rule

Karakterin sahip olduğu bilgi sınırı.

Karakter görmediği olayı biliyormuş gibi davranamaz.
Temporal rule

Zamanla ilgili tutarlılık.

Sonucu sebebinden önce gerçekleşemez.
Bir yolculuk gerekli süreden kısa olamaz.
4. Hard invariant sistemi

Hard invariant ihlali olursa işlem devam etmemelidir.

type HardInvariant = {
  id: string
  description: string
  appliesTo: string[]
  severity: "critical"
  recovery:
    | "reject"
    | "rollback"
    | "rebuild"
}

Örnekler:

INV-001
Bir karakter aynı anda yalnızca bir fiziksel konumda olabilir.

INV-002
Benzersiz bir nesnenin aynı anda yalnızca bir sahibi olabilir.

INV-003
Oyuncu kapısı bulunan kritik olay otomatik çözülemez.

INV-004
World State sürümü doğrulanmadan commit yapılamaz.

INV-005
Gizli gerçek player knowledge’a açık olay olmadan eklenemez.
5. Dünya gerçekleri

Validation Engine, dünya gerçeğinin tek bir kanonik kaynaktan gelmesini sağlamalıdır.

type CanonicalFact = {
  id: string
  subjectId: string
  predicate: string
  objectValue: unknown

  validFrom: number
  validUntil?: number

  sourceEventId: string
  worldStateVersion: number
}

Örnek:

Subject:
old_bridge

Predicate:
accessibility

Value:
closed

Hikâye metni dünya gerçeği kaynağı değildir.

Gerçek kaynak:

Canonical Event
→ State Delta
→ World State
6. Dünya gerçeği çakışması

Örnek:

Fact A:
Köprü kapalı.

Fact B:
Köprü tamamen kullanılabilir.

Validation Engine önce bunların kapsamını kontrol eder.

Belki gerçek çelişki değildir:

Köprü araçlara kapalı.
Yayalara açık.

Bu nedenle gerçekler yeterince yapılandırılmış olmalıdır.

Zayıf veri:

bridge = closed

Daha doğru veri:

{
  entityId: "old_bridge",
  traversalMode: "pedestrian",
  accessibility: "restricted"
}
7. Kaynak otoritesi

Aynı konuda birden fazla bilgi varsa kaynak önceliği uygulanmalıdır.

1. Current canonical world state
2. Committed domain events
3. Active scene runtime state
4. Story plan
5. Character perception
6. Character belief
7. Character memory
8. Generated narrative detail

Örnek:

World State:
Mira adadan ayrıldı.

Tilki’nin inancı:
Mira hâlâ değirmende.

Narrative:
Tilki Mira’yı değirmende arayabilir.
Mira fiziksel olarak orada gösterilemez.

Burada belief geçerlidir ama world truth değildir.

8. Scope kontrolü

Her bilgi bir kapsam taşımalıdır.

type FactScope =
  | "world_truth"
  | "character_perception"
  | "character_memory"
  | "character_belief"
  | "player_knowledge"
  | "narrator_reveal"
  | "scene_detail"

Aynı ifade farklı kapsamda bulunabilir.

World truth:
Denizci haritayı sakladı.

Tilki belief:
Denizci haritayı saklamış olabilir.

Player knowledge:
Denizcinin bir şey sakladığından şüpheleniyor.

Validation Engine kapsamların birbirine dönüşmesini denetler.

9. Bilgi sızıntısı

Gizli bilgi birkaç yolla sızabilir:

anlatıcı doğrudan söyler,
karakter bilmediği şeyi söyler,
seçim metni doğru cevabı açık eder,
görsel gizli unsuru gösterir,
başlık sırrı açıklar,
hikâye sonu sorusu gerçeği belli eder,
“Sen yokken” özeti gizemi çözer.

Bu nedenle knowledge validation yalnızca hikâye paragrafını kontrol etmemelidir.

Kontrol edilen çıktılar:

Başlık
Hikâye metni
Seçenekler
İllüstrasyon talimatı
Ses işaretleri
Özet
Sorular
Bildirim metni
10. Character Knowledge Matrix

Her aktif karakter için bilgi matrisi tutulabilir.

type CharacterKnowledgeEntry = {
  characterId: string
  factId: string

  knowledgeState:
    | "known"
    | "suspected"
    | "believed"
    | "disbelieved"
    | "unknown"

  confidence: number
  source:
    | "observed"
    | "heard"
    | "inferred"
    | "remembered"

  learnedAt: number
}

Bir karakterin diyalogu ve kararı bu matrisle doğrulanır.

11. Algı doğrulaması

Bir olay gerçekleştikten sonra herkes otomatik olarak olayı bilmemelidir.

World Event
↓
Perception Conditions
↓
Perceiving Characters
↓
Knowledge Update

Kontroller:

- Karakter olay yerinde miydi?
- Görüş hattı var mıydı?
- Olay duyulabilir miydi?
- Karakter dikkat ediyor muydu?
- Bilgi başka biri tarafından aktarıldı mı?

Örnek:

Denizci gizli kapıyı gece açtı.

Tilki başka bir bölgede.

Tilki bu olayı episodik hafıza olarak alamaz.

Ancak daha sonra Baykuş anlatırsa:

heard information

olarak belief evidence alabilir.

12. Hafıza doğrulaması

Memory Engine için temel kontroller:

- Karakter olayı algıladı mı?
- Olay gerçekten gerçekleşti mi?
- Hafıza türü doğru mu?
- Hearsay yanlışlıkla episodic memory oldu mu?
- Aynı olay iki kez kaydedildi mi?
- Hafıza gelecekte gerçekleşecek bir olayı içeriyor mu?
- Korunan hafıza yanlışlıkla silindi mi?

Örnek hata:

Tilki, Mira’nın yardım aramaya gittiğini hatırlıyor.

Ama Tilki bunu görmedi veya öğrenmedi.

Bu hafıza geçersizdir.

Doğru yapı:

Tilki, Mira’nın kamptan ayrıldığını hatırlıyor.
Tilki, onun kendilerini terk ettiğine inanıyor.
13. Belief doğrulaması

Belief Engine yanlış inançlar üretebilir; bu hata değildir.

Ama inancın kaynağı olmalıdır.

type BeliefValidation = {
  hasEvidence: boolean
  evidenceStrengthValid: boolean
  confidenceChangeValid: boolean
  contradictsKnownFact: boolean
  contradictionAllowed: boolean
}

Örnek:

Belief:
Denizci güvenilmez.

Evidence:
Denizci bilgi vermeyi reddetti.
Gece gizlice limana gitti.

Bu geçerlidir.

Ama kanıtsız şekilde:

Denizci kesinlikle kötü biri.

inancı oluşuyorsa sistem kontrol edilmelidir.

14. Bilinen gerçeğe aykırı belief

Karakter kesin bir gerçeği öğrendiğinde eski inancı hemen tamamen kaybolmak zorunda değildir.

Örnek:

Eski belief:
Mira bizi terk etti.

Yeni fact:
Mira yardım getirmek için ayrıldı.

Karakter:

gerçeği kabul edebilir,
şüphe duyabilir,
anlamı yeniden yorumlayabilir.

Validation Engine şunu zorlamamalıdır:

Fact geldi → belief anında silindi

Bunun yerine şu kontrol edilir:

Karakter yeni gerçeği algıladı mı?
Belief confidence uygun yönde değişti mi?
Çelişki geçici olarak açıklanabilir mi?
15. Duygu doğrulaması

Duygu hesaplamalarının tamamen serbest değişmesi engellenmelidir.

Kontroller:

- Duygunun tetikleyici olayı var mı?
- Değişim karakterin appraisal sonucuyla uyumlu mu?
- Duygu yoğunluğu olayla orantılı mı?
- Aynı anda çelişkili duygular destekleniyor mu?
- Duygu kalıcı trait gibi kaydedilmiş mi?

Örnek:

Tilki küçük bir not buldu.

Sonuç:

fear +0.90

oluyorsa aşırı olabilir.

Ama not üzerinde tehdit sembolü varsa anlamlı olabilir.

16. Duygu ile davranış ayrımı

Validation Engine şu hatayı yakalamalıdır:

Emotion:
Tilki korkuyor.

Narrative:
Tilki korkusuzca tek başına mağaraya koştu.

Bu davranış tamamen imkânsız olmayabilir.

Tilki başka güçlü motivasyona sahip olabilir.

Bu nedenle kontrol:

Duygu ile davranış farklı mı?

değil:

Davranış için yeterli karşı motivasyon var mı?

olmalıdır.

Örnek:

Korku yüksek
+
Arkadaşını kurtarma hedefi çok yüksek
+
Cesaret değeri yüksek

→ mağaraya girmesi tutarlı olabilir.

17. Decision Validation

Decision Engine’in seçtiği karar şu yönlerden kontrol edilir:

- Eylem erişilebilir mi?
- Karakter gerekli bilgiye sahip mi?
- Eylem karakterin kontrol alanında mı?
- Ön koşullar sağlanıyor mu?
- Utility hesaplamasında eksik kritik faktör var mı?
- Seçim oyuncuya ait bir alanı ihlal ediyor mu?
- Karar dünya kuralına aykırı mı?
type DecisionValidationResult = {
  valid: boolean
  invalidReasons: string[]
  missingConstraints: string[]
  alternativeActionIds: string[]
}
18. Oyuncu kontrol alanı

Her karakterin kontrol sahibi tanımlanmalıdır.

type ControlAuthority =
  | "player"
  | "npc_engine"
  | "system"
  | "shared"

Örnek:

Lumi’nin ana rota seçimi:
player

Tilki’nin tepkisi:
npc_engine

Düşerken karakterin dengesini korumaya çalışması:
system

Birlikte taşınacak nesnenin seçimi:
shared

Validation Engine NPC motorunun oyuncuya ait kararı almasını engeller.

19. Shared control

Bazı eylemler birlikte karar gerektirir.

Örnek:

Lumi ve Tilki ağır kapıyı birlikte açacak.

Oyuncu:

Kapıyı açmayı deneyelim.

diyebilir.

Tilki ise:

yardım etmeyi kabul edebilir,
önce güvenlik kontrolü isteyebilir,
korkusu nedeniyle reddedebilir.

Oyuncu Tilki’nin kararını doğrudan sahiplenemez.

20. Zaman çizelgesi doğrulaması

Her önemli olayın zamanı olmalıdır.

type TimelineEvent = {
  eventId: string
  startAt: number
  endAt?: number

  causedBy?: string[]
  requiredPredecessors: string[]
}

Kontroller:

- Olay ön koşul olayından sonra mı?
- Karakter yolculuğu için yeterli zaman geçti mi?
- Aynı karakter eşzamanlı iki uzun eylem yaptı mı?
- Gece olması gereken olay gündüz mü gerçekleşti?
- Offline simulation sınırı aşıldı mı?
21. Yolculuk süresi

Mekânlar arası mesafe ve erişim süresi tutulmalıdır.

type TravelRule = {
  fromLocationId: string
  toLocationId: string
  baseDurationMinutes: number

  allowedMethods: string[]
  weatherMultiplier: number
  hazardMultiplier: number
}

Örnek hata:

Tilki ormandaydı.
Bir dakika sonra uzak adadaki limanda göründü.

Bir teleport yeteneği yoksa geçersizdir.

22. Temporal granularity

Her küçük eylem için kesin saat gerekmeyebilir.

Zaman çözünürlüğü sahneye göre değişebilir:

Scene mode:
dakika

Between scenes:
saat

Offline simulation:
gün

World history:
tarih aralığı

Validation Engine farklı çözünürlükleri doğrudan karşılaştırırken tolerans kullanmalıdır.

23. Mekânsal tutarlılık
type SpatialState = {
  entityId: string
  locationId: string
  subLocationId?: string
  positionState?: string
  validFrom: number
}

Kontroller:

- Karakter doğru mekânda mı?
- Görünen nesne gerçekten sahnede mi?
- Kapalı odadaki nesne dışarıdan görülebilir mi?
- Karakterin konuşmayı duyabileceği mesafe uygun mu?
- Mekân erişilebilir mi?
24. Sahne içi konum

Aynı sahne içinde mikro konumlar önem kazanabilir.

Örnek:

Lumi:
kapının yanında

Tilki:
taş işaretin yanında

Denizci:
bahçenin dışında

Narrative Engine bir anda Tilki’nin kapıyı açtığını anlatırsa:

önce hareket etmesi,
kapıya ulaşması

gerekir.

Her küçük hareket state’e yazılmayabilir ama anlatısal geçiş bulunmalıdır.

25. Envanter doğrulaması

Kontroller:

- Nesne gerçekten envanterde mi?
- Nesnenin sahibi kim?
- Nesne tüketildi mi?
- Nesne kırık mı?
- Aynı benzersiz nesne iki yerde mi?
- Kullanım yeteneği var mı?
- Nesne başka bir kapalı konteyner içinde mi?
type InventoryItemState = {
  itemId: string
  ownerId?: string
  locationId?: string
  containerItemId?: string

  condition: string
  quantity: number
  consumable: boolean
}
26. Nesne transferi

Bir nesne el değiştirdiğinde tek olay birkaç sistemi etkiler:

Inventory:
owner değişir

Relationship:
hediye etkisi olabilir

Memory:
önemliyse anı oluşur

Player Knowledge:
çocuk transferi gördüyse güncellenir

Narrative:
verme davranışı anlatılır

Validation Engine bütün bu etkilerin aynı temel olaya bağlı olduğunu doğrular.

27. Quantity kontrolü

Yığınlanabilir nesnelerde negatif miktar oluşmamalıdır.

3 elma var.
4 elma kullanıldı.

geçersizdir.

Ancak anlatı şöyle diyorsa:

Dördüncü elmayı aradılar ama bulamadılar.

bu geçerlidir; kullanım olayı değildir.

28. Görev doğrulaması
type QuestValidationRule = {
  questId: string
  validStages: string[]
  allowedTransitions: Record<string, string[]>
  requiredConditionsByTransition: Record<string, string[]>
}

Örnek geçiş:

not_started
→ active
→ clue_found
→ location_discovered
→ confrontation_ready
→ resolved

Geçersiz:

not_started
→ resolved

gerekli olaylar yaşanmadan olmamalıdır.

29. Görev ile hikâye ayrımı

Hikâyede bir görev hakkında konuşulması, görevin ilerlediği anlamına gelmez.

Örnek:

Tilki kayıp haritayı düşündü.

Bu:

quest progress

değildir.

Ama:

Tilki haritanın kuzey yolunu gösteren parçasını buldu.

kanonik olay olarak doğrulanmışsa görev ilerlemesi olabilir.

30. İlişki doğrulaması

Relationship Engine değerleri yalnızca geçerli ilişki olaylarıyla değişmelidir.

Kontroller:

- İlişki değişiminin sebebi var mı?
- Etki olayın büyüklüğüyle uyumlu mu?
- Aynı olay iki kez işlendi mi?
- İlişki vektörünün bütün alanları aynı yönde gereksiz değişti mi?
- Karakter olayı algıladı mı?

Örnek:

Lumi Tilki’ye küçük bir taş verdi.

trust +0.50
loyalty +0.60
affection +0.70

aşırı olabilir.

Daha makul:

warmth +0.03
appreciation +0.04

Taş özel bir sözün sembolüyse etkiler daha yüksek olabilir.

31. Asimetrik ilişkiler

İlişki iki yönlü ama aynı olmak zorunda değildir.

Lumi → Tilki trust: 0.75
Tilki → Lumi trust: 0.92

Validation Engine ilişki değerlerini otomatik eşitlememelidir.

Aynı olayın iki karakter üzerindeki etkileri de farklı olabilir.

32. İlişki açıklanabilirliği

Her yüksek ilişki değeri için en azından özet nedenler bulunmalıdır.

type RelationshipEvidence = {
  relationId: string
  eventId: string
  dimension: string
  effect: number
  timestamp: number
}

Bu kayıtlar sayesinde:

Tilki neden Lumi’ye güveniyor?

sorusu cevaplanabilir.

33. Karakter trait doğrulaması

Trait’ler tek olayla aşırı değişmemelidir.

Bir kez cesur davrandı
→ courage +0.40

yanlış olabilir.

Daha doğru akış:

Cesur eylem
↓
Trait evidence
↓
Repeated pattern
↓
Small trait tendency update

Validation Engine trait değişiminin:

yeterli kanıt sayısı,
zaman aralığı,
olay çeşitliliği

olup olmadığını kontrol edebilir.

34. Kimlik ve geçici durum ayrımı
Tilki korkuyor.

geçici durumdur.

Tilki korkak biridir.

kimlik veya trait yorumudur.

Narrative Engine geçici duyguyu kalıcı kimlik olarak sunmamalıdır.

Özellikle çocuk hikâyesinde karakterlere olumsuz etiket yapıştırmamak önemlidir.

35. Story Plan doğrulaması

Narrative üretiminden önce plan kontrol edilir.

- Sahnenin amacı açık mı?
- Başlangıç durumu mevcut world state’e uyuyor mu?
- Beat sırası mantıklı mı?
- Her beat uygulanabilir mi?
- Sahne çok fazla kritik olay içeriyor mu?
- Oyuncu seçimi korunuyor mu?
- Sahne belirtilen uzunlukta anlatılabilir mi?
- Aktif karakter sayısı bütçeyi aşıyor mu?
36. Beat bağımlılıkları
type BeatDependency = {
  beatId: string
  requiresBeatIds: string[]
  requiredFacts: string[]
}

Örnek:

Beat:
Tilki sembolü yorumlar.

Requires:
Tilki sembolü fark etti.
Tilki sembolü görebilecek mesafede.

Yorumlama beat’i keşif beat’inden önce gelemez.

37. Story Context doğrulaması

Context Builder çıktısı Narrative Engine’e gitmeden kontrol edilir.

- Aynı gerçek iki farklı şekilde çelişiyor mu?
- Gizli bilgi yanlış bölüme girdi mi?
- Karakter bilmediği bilgi behavior guidance’a taşındı mı?
- Düşük öncelikli veri kritik bilgiyi prompt’tan çıkardı mı?
- Token bütçesi aşıldı mı?
- Aktif karakterlerden biri unutuldu mu?
- Decision Engine kararı bağlama eklendi mi?
38. Context coverage

Her sahne planı öğesinin context içinde gerekli dayanağı olmalıdır.

Örnek:

Plan:
Tilki eski sembolü tanıyacak.

Context:
Tilki’nin daha önce bu sembolü gördüğüne dair bilgi yok.

Bu durumda ya:

plan geçersizdir,
eksik hafıza bağlama alınmalıdır,
tanıma yerine benzerlik şüphesi kullanılmalıdır.
39. Narrative doğrulaması

Narrative Validator, genel Validation Engine’in bir alt modülüdür.

Kontroller:

Kanonik doğruluk
Bilgi sınırı
Karakter sesi
Yaş uygunluğu
Sahne beat’leri
Seçim sınırı
Devamlılık
Uzunluk
Tekrar
Gizli içerik

Ama yalnızca metin üzerinde karar vermek yerine, diğer motorların verilerine dayanır.

40. Metin içindeki iddialar

Narrative Engine’den yapılandırılmış claimedFacts alanı istemek faydalıdır.

type NarrativeClaim = {
  subjectId: string
  predicate: string
  value: unknown
  claimType:
    | "fact"
    | "belief"
    | "dialogue_claim"
    | "sensory_observation"
    | "metaphor"
}

Örnek:

Tilki kapının kilitli olduğunu gördü.

Claim:

sensory observation:
door is locked

Tilki, kapının arkasında bir canavar olduğuna emindi.

Claim:

character belief:
monster behind door

Bu ikisi aynı şekilde doğrulanmamalıdır.

41. Metaforların yanlış gerçek olarak algılanması

Örnek:

Rüzgâr kapıyı çağırıyormuş gibiydi.

Bu bir metafordur.

Validation Engine bunu:

Kapı karakterleri gerçekten çağırıyor.

şeklinde kanonik gerçek saymamalıdır.

Bu nedenle metin iddialarının türleri önemlidir.

42. Görsel doğrulama

Illustration Cue de doğrulanmalıdır.

Kontroller:

- Görselde yalnızca sahnedeki karakterler var mı?
- Karakter görünümü doğru mu?
- Envanter nesneleri doğru kişide mi?
- Gizli karakter veya yaratık gösteriliyor mu?
- Mekânın mevcut durumu doğru mu?
- Gece sahnesi gündüz olarak mı tanımlandı?
- Yaralanma veya duygu durumu görsele uygun mu?

Örnek:

Ejderha henüz keşfedilmedi.

İllüstrasyon prompt’unda ejderha görünmemelidir.

Sadece:

mağaradan gelen belirsiz bir gölge

izinli olabilir.

43. Ses doğrulaması

Audio Cue’larda da tutarlılık gerekir.

- Konuşmayan karaktere ses satırı verildi mi?
- Gizli karakterin sesi duyuluyor mu?
- Ortam sesi mekâna uygun mu?
- Yaşa uygun olmayan korkutucu ses talimatı var mı?
- Konuşma tonu emotion state ile tamamen çelişiyor mu?
44. Player choice doğrulaması

Seçenekler için:

- Seçenek gerçekten uygulanabilir mi?
- Açık dünya durumuyla çelişiyor mu?
- İki seçenek aslında aynı mı?
- Seçenek oyuncunun bilmediği bilgiye dayanıyor mu?
- Gizli doğru cevap açıkça belli mi?
- Seçenek yaşa uygun biçimde anlaşılır mı?
- NPC’nin kendi kararını zorla sahipleniyor mu?
45. Sahte seçim tespiti

Seçeneklerin olası sonuç yolları karşılaştırılır.

type ChoiceOutcomeSignature = {
  choiceId: string
  destinationId?: string
  method: string
  informationGain: string[]
  relationshipTargets: string[]
  riskBand: string
}

Üç seçeneğin tüm imzaları aynıysa seçim sahte olabilir.

Ancak sonunda aynı ana hedefe dönmeleri tek başına sorun değildir.

46. Çocuk güvenliği doğrulaması

Bu katman yalnızca yasak kelimeleri aramamalıdır.

Semantik kontroller:

- Uzun süreli çaresizlik var mı?
- Çocuk karakter yalnız bırakılıyor mu?
- Geri döndürülemez ağır sonuç var mı?
- Yoğun korku güvenli çözüm sinyali olmadan sürüyor mu?
- Oyuncu suçlanıyor mu?
- Yanlış seçim cezalandırıcı mı?
- Karaktere aşağılayıcı kalıcı etiket veriliyor mu?

Örnek uygunsuz ifade:

Sen yanlış yolu seçtiğin için Tilki kayboldu.

Daha güvenli:

Seçtikleri yol beklediklerinden daha uzundu. Şimdi geri dönmenin başka bir yolunu bulmaları gerekiyordu.

47. Yaş profili doğrulaması
type AgeValidationProfile = {
  maxSentenceWords: number
  maxParagraphSentences: number
  maxActiveCharacters: number
  maxChoiceCount: number

  vocabularyBand: string
  maxTension: number

  abstractConceptLimit: number
}

Yaş doğrulaması mekanik sınırların yanında anlamsal değerlendirme de kullanmalıdır.

48. Ton tutarlılığı

Aynı sahne içinde ton aşırı sıçramamalıdır.

Örnek:

Sıcak ve eğlenceli sahne
↓
bir anda ağır varoluşsal ölüm konuşması

planlanmadıysa tutarsızdır.

Ama kontrollü ton değişimi mümkündür:

Merak
→ hafif gerilim
→ rahatlama
49. Tekrar doğrulaması

Üç farklı tekrar türü:

Lexical repetition
Narrative behavior repetition
Story structure repetition
Lexical

Aynı cümlenin veya kalıbın sık kullanılması.

Narrative behavior

Karakterin duyguyu sürekli aynı jestle göstermesi.

Story structure

Her maceranın aynı olay dizisine sahip olması.

Validation Engine tekrarları hata değil kalite uyarısı olarak işaretleyebilir.

50. Validation sonucu
type ValidationResult = {
  valid: boolean

  violations: ValidationViolation[]
  warnings: ValidationWarning[]

  requiredAction:
    | "accept"
    | "accept_with_warning"
    | "repair"
    | "regenerate"
    | "reject"
    | "rollback"

  validatedStateVersion?: number
}
51. İhlal modeli
type ValidationViolation = {
  ruleId: string
  layer: ValidationLayer
  type: ConsistencyRuleType

  severity:
    | "info"
    | "low"
    | "medium"
    | "high"
    | "critical"

  entityIds: string[]
  eventIds: string[]

  description: string
  evidence: unknown

  repairable: boolean
  suggestedRepair?: string
}
52. Severity politikası
Info:
İzleme amaçlı.

Low:
Kalite sorunu, üretim kullanılabilir.

Medium:
Yerel düzeltme gerekir.

High:
İlgili bölüm yeniden üretilmeli.

Critical:
İşlem durmalı veya rollback yapılmalı.

Örnek:

Aynı ifade üç kez kullanılmış:
low

Karakter sesi belirgin şekilde yanlış:
medium

Gizli bilgi açılmış:
high

Oyuncu kararı otomatik commit edilmiş:
critical
53. Otomatik onarım türleri
type RepairStrategy =
  | "remove_invalid_detail"
  | "replace_with_canonical_fact"
  | "downgrade_fact_to_belief"
  | "insert_missing_transition"
  | "restore_player_choice"
  | "rewrite_dialogue"
  | "rebuild_context"
  | "recompute_decision"
  | "regenerate_scene"
  | "rollback_transaction"
54. Fact’i belief’e düşürme

Örnek metin:

Tilki kapının arkasında bir ejderha olduğunu biliyordu.

Tilki yalnızca ses duyduysa düzeltme:

Tilki, kapının arkasında büyük bir yaratık olabileceğini düşündü.

Burada:

known fact
→ uncertain belief

dönüşümü yapılır.

Bu güçlü bir otomatik onarım yöntemidir.

55. Eksik geçiş onarımı

Metin:

Tilki taşın yanında duruyordu. Bir anda kapının kolunu tuttu.

Sahne konumlarına göre arada hareket gerekebilir.

Onarım:

Tilki taştan ayrılıp kapıya yaklaştı. Sonra kolu dikkatle tuttu.

Bu değişiklik kanonik sonucu değiştirmez.

56. Yeniden hesaplama gerektiren hatalar

Her hata metin onarımıyla çözülemez.

Örnek:

Decision Engine, Tilki’nin bilmediği bir bilgiye göre karar verdi.

Bu durumda yalnızca hikâyeyi düzeltmek yetmez.

Gerekir:

Kararı yeniden hesapla
↓
Action Resolution’ı yeniden çalıştır
↓
State Delta’yı yenile
↓
Context’i yeniden kur
↓
Narrative’i yeniden üret
57. Validation dependency graph

Bir hata hangi aşamalara geri dönülmesi gerektiğini belirlemelidir.

Narrative style hatası
→ Narrative repair

Context knowledge leak
→ Context rebuild + Narrative regenerate

Decision knowledge error
→ Decision recompute + downstream rebuild

World state invariant error
→ Reject/Rollback

Bu sayede gereksiz yere bütün pipeline tekrar çalıştırılmaz.

58. Commit öncesi global validation

En kritik kontrol burada yapılır.

Girdiler:

Current State
Proposed State Delta
Story Plan
Decisions
Narrative Output
Expected Domain Events

Kontroller:

- State delta anlatılan olayla aynı mı?
- Anlatılan kalıcı değişiklik delta’da mevcut mu?
- Delta’da olup metinde görünmesi gereken olay atlandı mı?
- Bütün precondition’lar hâlâ geçerli mi?
- Dünya sürümü aynı mı?
- Hard invariant ihlali var mı?
59. Narrative-state parity

Hikâye ile state arasında eşitlik korunmalıdır.

Örnek hata:

Narrative:

Lumi anahtarı Tilki’ye verdi.

State delta:

Anahtar hâlâ Lumi’de.

Validation Engine bunu kritik hata saymalıdır.

Tersi de sorun:

State delta:

Anahtar Tilki’ye geçti.

Narrative:

Transfer hiç anlatılmadı.

Bu, oyuncunun anlamadığı bir dünya değişimi yaratabilir.

60. Görünür ve görünmez state değişiklikleri

Her state değişikliği hikâyede açıkça anlatılmak zorunda değildir.

Örnek:

relationshipTrust +0.03

metinde sayısal olarak gösterilmez.

Ama dayanak olay anlatılmalıdır:

Tilki, Lumi’nin onu beklemesine küçük bir gülümsemeyle karşılık verdi.

Bu nedenle state delta alanları sınıflandırılmalıdır:

type StateChangeVisibility =
  | "must_be_narrated"
  | "may_be_inferred"
  | "internal_only"
61. Commit sonrası audit

Transaction başarıyla commit edildikten sonra hafif bir bütünlük kontrolü yapılabilir.

- Beklenen world state version oluştu mu?
- Bütün domain event’ler kaydedildi mi?
- Hikâye kaydı ve scene kaydı bağlı mı?
- Idempotency kaydı tamamlandı mı?
- Kritik memory candidate işlendi mi?

Bu aşamada hata bulunursa sistem:

otomatik repair job,
rollback,
world repair record

oluşturabilir.

62. World Repair sistemi

Uzun ömürlü evrenlerde zaman zaman tutarsızlık oluşabilir.

Manuel veya otomatik onarım kaydı gerekir.

type WorldRepairRecord = {
  id: string
  detectedViolationId: string

  previousStateVersion: number
  repairedStateVersion: number

  repairType:
    | "automatic"
    | "manual"
    | "rollback"
    | "data_migration"

  description: string
  createdAt: number
}

Onarım geçmişi silinmemelidir.

63. Onarım hikâyeyi yeniden yazmalı mı?

Genellikle hayır.

Eğer çocuk daha önce bir hikâyeyi okuduysa metni sessizce değiştirmek risklidir.

Daha iyi yaklaşım:

Kanonik geçmiş korunur.
Dünya state’i mümkün olan en az değişiklikle uyumlandırılır.

Ancak henüz gösterilmemiş taslak hikâye serbestçe düzeltilebilir.

64. Contradiction registry

Bütün çelişkiler hata değildir.

Bazıları bilinçli anlatı unsurlarıdır.

type ContradictionRecord = {
  id: string

  statementA: string
  statementB: string

  type:
    | "system_error"
    | "character_disagreement"
    | "false_memory"
    | "uncertain_belief"
    | "mystery"
    | "outdated_information"

  allowed: boolean
  resolutionStatus:
    | "open"
    | "explained"
    | "resolved"
}

Örnek:

Tilki:
Denizci haritayı çaldı.

Denizci:
Haritayı korumak için sakladım.

Bu sistem çelişkisi değil, karakter anlaşmazlığıdır.

65. Intentional mystery

Bazı gerçekler kasıtlı olarak belirsiz kalabilir.

Ormandaki ışığın kaynağı bilinmiyor.

Validation Engine bunu veri eksikliği olarak düzeltmemelidir.

Belirsizlik açıkça işaretlenmelidir:

{
  factStatus: "intentionally_unresolved"
}
66. Truth status
type TruthStatus =
  | "confirmed"
  | "disputed"
  | "unknown"
  | "hidden"
  | "false"
  | "outdated"
  | "intentionally_unresolved"

Bu durumlar hikâye ve belief sistemlerinin aynı bilgiyi farklı yorumlamasını kolaylaştırır.

67. Validation rule registry

Kurallar kod içine dağılmamalıdır.

type ValidationRule = {
  id: string
  name: string

  layer: ValidationLayer
  type: ConsistencyRuleType

  enabled: boolean
  severity: string
  version: string

  appliesWhen: unknown
  evaluator: string

  repairStrategy?: RepairStrategy
}

Bu sayede:

kurallar sürümlenir,
test edilir,
belirli evrenler için açılıp kapatılır,
yaş profiline göre uyarlanır.
68. Kuralların kaynakları

Kurallar birkaç yerden gelebilir:

Global LUMI rules
Universe rules
Location rules
Character abilities
Item rules
Quest rules
Parent settings
Age safety profile
Story-specific constraints

Öncelik:

Global hard invariants
↓
Child safety
↓
Universe rules
↓
Story-specific rules
↓
Character preferences
↓
Narrative style preferences

Stil tercihi hard invariant’ı geçersiz kılamaz.

69. Validation DSL

İleride kuralları küçük bir alan diliyle tanımlamak faydalı olabilir.

id: INVENTORY_UNIQUE_OWNER
layer: state_transition
severity: critical

when:
  entity.type: unique_item

assert:
  owner.count: 1

repair:
  strategy: reject

Başka örnek:

id: PLAYER_CHOICE_NOT_AUTO_RESOLVED
layer: plan
severity: critical

when:
  event.requiresPlayer: true

assert:
  event.status: pending_player

MVP’de basit TypeScript kuralları yeterlidir.

70. Kurallı ve LLM tabanlı validation
Kurallı doğrulama

Şunlar için tercih edilmelidir:

kimlikler,
state sürümleri,
envanter,
zaman,
mekân,
görev geçişleri,
hard invariant’lar,
zorunlu beat’ler,
seçenek sayısı,
kelime sınırı.
LLM tabanlı doğrulama

Şunlarda yardımcı olabilir:

karakter sesi,
örtük bilgi sızıntısı,
duygusal tutarlılık,
yaşa uygunluk,
sahte seçim,
fazla açıklama,
doğal anlatım.

LLM validator tek otorite olmamalıdır.

71. Validator modelinin yetki sınırı

LLM validator:

ihlal önerir

ama doğrudan world state değiştirmez.

Çıktısı:

type SemanticValidationSuggestion = {
  suspectedViolation: string
  confidence: number
  evidenceSpan: string
  recommendedAction: string
}

Kritik işlem kurallı sistem tarafından onaylanmalıdır.

72. False positive yönetimi

Semantik validator zaman zaman yanlış ihlal bulabilir.

Bu nedenle:

confidence < threshold
→ warning

confidence yüksek + hard evidence
→ repair/regenerate

Ayrıca aynı kuralın sürekli yanlış alarm üretmesi izlenmelidir.

73. Validation maliyet kontrolü

Her sahnede tam LLM validation pahalı olabilir.

Önerilen akış:

Rule-based validation
↓
Risk score
↓
Gerekirse semantic validation

Semantic validator yalnızca şu durumlarda çağrılabilir:

gizli bilgi yoğunluğu yüksek,
birden fazla yanlış belief var,
serbest metin oyuncu girişi kullanıldı,
yüksek önem seviyeli sahne,
ilk kurallar uyarı üretti,
yeni prompt veya model sürümü test ediliyor.
74. Validation risk score
type ValidationRiskScore = {
  total: number

  hiddenFactRisk: number
  stateChangeRisk: number
  characterCountRisk: number
  freeformInputRisk: number
  criticalEventRisk: number
  narrativeComplexityRisk: number
}

Düşük riskli sahne:

Tilki ve Lumi bahçede üç taş sayıyor.

Tam semantik denetim gerektirmeyebilir.

Yüksek riskli sahne:

Mira’nın gerçek amacının açıklanmasına yaklaşan yüzleşme.

daha kapsamlı doğrulanmalıdır.

75. Test yaklaşımı

Validation Engine için farklı test seviyeleri gerekir.

Unit tests
Rule integration tests
Scenario tests
Property-based tests
Golden world tests
Regression tests
76. Property-based test örnekleri

Rastlantısal dünya durumları üretip şu invariant’lar test edilebilir:

Hiçbir benzersiz nesnenin iki sahibi olmaz.
Hiçbir karakter aynı anda iki konumda olmaz.
Quest stage yalnızca izin verilen geçişleri yapar.
Player-gated event resolved olamaz.
Inventory quantity negatif olamaz.

Bu, çok sayıda kenar durumunu yakalar.

77. Scenario test örneği

Başlangıç:

Mira adadan ayrıldı.
Tilki bunu gördü.
Tilki Mira’nın yardım aradığını bilmiyor.

Beklenen:

Tilki Mira’nın ayrıldığını hatırlayabilir.
Tilki terk edildiğine inanabilir.
Narrative, Mira’nın yardım aradığını açıklayamaz.
Tilki Mira’yı adada fiziksel olarak göremez.
78. Regression testleri

Daha önce bulunan her hata için kalıcı test eklenmelidir.

Örnek hata:

Narrative Engine gizli ejderhayı illüstrasyon prompt’unda gösterdi.

Regression testi:

hidden entity
→ illustration cue içinde görünmemeli
79. Golden world snapshot

Belirli karmaşık dünya durumları saklanabilir.

Golden Snapshot 01:
Kırık köprü
Kayıp harita
Mira’nın gizli amacı
Tilki’nin yanlış belief’i
Açık oyuncu seçimi

Bütün engine sürümleri bu snapshot üzerinde test edilir.

Amaç birebir aynı hikâye değil, aynı kuralların korunmasıdır.

80. Observability

Her ihlal loglanmalıdır.

type ValidationTrace = {
  validationRunId: string
  correlationId: string

  ruleVersionSet: string
  checkedRuleIds: string[]

  violations: ValidationViolation[]
  durationMs: number

  finalAction: string
}

Bu loglar:

en sık bozulan kuralları,
hangi modelin daha çok hata yaptığını,
hangi prompt sürümünün riskli olduğunu,
validation maliyetini

gösterir.

81. Kullanıcıya hata gösterimi

Çocuğa teknik validation hatası gösterilmez.

Sistem:

otomatik onarır,
yeniden üretir,
fallback kullanır.

Ebeveyn arayüzünde bile çoğu teknik detay gereksizdir.

Geliştirici panelinde:

Knowledge leak detected
Rule: KNOWLEDGE-014
Scene regenerated successfully

görülebilir.

82. Validation başarısızlığı halinde davranış
Low/medium kalite sorunu:
onar veya kabul et

High narrative sorunu:
yeniden üret

Critical pre-commit sorunu:
işlemi durdur

Critical post-commit sorunu:
rollback veya world repair

Kullanıcıya geçersiz sahne gösterilmemelidir.

83. Safe fallback state

Pipeline tamamen başarısız olduğunda state değiştirmeyen bir sahne kullanılabilir.

Örnek:

Lumi ve Tilki, taşın üzerindeki işarete dikkatle baktı. Henüz ne anlama geldiğinden emin değillerdi. Biraz daha düşünmeye karar verdiler.

Ardından mevcut seçimler tekrar sunulabilir.

Bu sahne:

ana olayı ilerletmez,
world state’i değiştirmez,
gizli bilgi açıklamaz,
kullanıcı deneyimini tamamen kesmez.
84. MVP Consistency & Validation Engine

İlk sürümde şu kontroller yeterlidir:

1. World state version
2. Character location uniqueness
3. Unique item ownership
4. Inventory quantity
5. Quest stage transitions
6. Player-gated event protection
7. Character knowledge boundaries
8. Hidden fact protection
9. Fixed NPC decision preservation
10. Required scene beat coverage
11. Narrative-state parity
12. Age and tension limits
13. Choice existence and feasibility
14. Atomic commit validation
15. Idempotency control
85. MVP veri modeli
type CoreValidationContext = {
  requestId: string
  worldStateVersion: number

  currentState: unknown
  proposedStateDelta?: unknown

  storyPlan?: StoryPlan
  decisions?: PipelineCharacterDecision[]
  narrativeContext?: FrozenNarrativeContext
  narrativeOutput?: RawNarrativeResult

  playerKnowledgeFactIds: string[]
  hiddenFactIds: string[]

  activeRuleIds: string[]
}
86. MVP ana işlemler
validateRequest()

validateWorldInvariants()

validateCharacterLocations()

validateInventoryState()

validateQuestTransitions()

validatePlayerControlBoundaries()

validateCharacterKnowledge()

validateStoryPlan()

validateNarrativeContext()

validateNarrativeClaims()

validateNarrativeStateParity()

validateCommitPreconditions()

auditCommittedState()
87. MVP validator akışı
async function validateStoryTransaction(
  context: CoreValidationContext
): Promise<ValidationResult> {
  const violations: ValidationViolation[] = []

  violations.push(
    ...validateWorldInvariants(context)
  )

  violations.push(
    ...validatePlayerControlBoundaries(context)
  )

  violations.push(
    ...validateCharacterKnowledge(context)
  )

  violations.push(
    ...validateInventoryState(context)
  )

  violations.push(
    ...validateQuestTransitions(context)
  )

  if (context.storyPlan) {
    violations.push(
      ...validateStoryPlan(context)
    )
  }

  if (context.narrativeOutput) {
    violations.push(
      ...validateNarrativeClaims(context),
      ...validateNarrativeStateParity(context)
    )
  }

  return classifyValidationResult(violations)
}
88. İlk sürümde yapılmaması gerekenler

Başlangıçta şunları aşırı karmaşıklaştırmamalıyız:

bütün doğal dili formel mantığa çevirmek,
her cümleden otomatik dünya gerçeği çıkarmak,
tam fizik simülasyonu,
her duygu değişimini matematiksel olarak kanıtlamak,
her sahnede pahalı LLM validator kullanmak,
tüm çelişkileri otomatik çözmek,
bütün geçmişi her validasyonda taramak,
yüzlerce kuralı ilk günden uygulamak.

Öncelik:

Dünya kırılmasın.
Oyuncu kontrolü korunabilsin.
Gizli bilgiler sızmasın.
Hikâye ile state aynı şeyi söylesin.
89. Consistency & Validation Engine temel ilkeleri
1. Validation yalnızca hikâye sonunda çalışmaz; pipeline boyunca çalışır.
2. Dünya gerçeği kanonik state’ten gelir.
3. Karakter belief’i dünya gerçeği değildir.
4. Her bilgi açık bir scope taşımalıdır.
5. Karakter yalnızca algıladığı veya öğrendiği bilgiyi kullanabilir.
6. Yanlış belief ve false memory sistem hatası olmak zorunda değildir.
7. Oyuncuya ait kararlar NPC veya anlatıcı tarafından alınamaz.
8. Benzersiz nesnelerin tek sahibi olur.
9. Karakter aynı anda yalnızca bir fiziksel yerde bulunur.
10. Görevler yalnızca izin verilen aşamalar arasında ilerler.
11. Hikâye ile kalıcı state değişiklikleri birbirine uymalıdır.
12. Gizli bilgiler metin, görsel, ses, özet ve seçimlerde korunur.
13. Kritik ihlalde işlem commit edilmez.
14. Commit sonrası bütünlük ayrıca denetlenir.
15. Bütün çelişkiler hata değildir; bazıları gizem veya karakter anlaşmazlığıdır.
16. Otomatik onarım yalnızca kanonik sonucu değiştirmiyorsa yapılır.
17. Motor hatası varsa yalnızca metin değil, ilgili hesaplama yeniden çalıştırılır.
18. Kurallı validation ana otoritedir; LLM semantik yardımcıdır.
19. Kurallar sürümlenmeli ve test edilmelidir.
20. Kullanıcıya geçersiz veya state ile uyumsuz hikâye gösterilmemelidir.

Consistency & Validation Engine’in kavramsal çekirdeği böylece tamamlandı.