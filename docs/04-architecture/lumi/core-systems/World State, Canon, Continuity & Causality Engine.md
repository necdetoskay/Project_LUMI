Bu motor LUMI evreninin gerçeklik çekirdeğidir.

Narrative Planner olabilecek gelişmeleri planlar.
Narrative Generator bunları anlatı metnine dönüştürür.
Decision Engine karakterlerin ne yapmak isteyeceğini hesaplar.

Fakat şu soruların kesin cevabını yalnızca bu motor vermelidir:

Gerçekte ne oldu?
Şu anda dünya hangi durumda?
Hangi bilgi doğrudur?
Bir olay neden gerçekleşti?
Bu olayın hangi sonuçları doğdu?
Bir karakter bunu biliyor mu?
Geçmiş artık değiştirilebilir mi?

Bu motor olmadan LUMI, devamlı hikâyeler anlatan fakat kendi geçmişini gerçekten koruyamayan bir sistem olur.

1. Dört temel kavram

İlk olarak şu kavramları ayırmalıyız:

World State

Dünyanın belirli bir andaki gerçek durumu.

Örnek:

Köprü kırık.
Tilki yaralı.
Fener Lila'nın çantasında.
Nehir seviyesi düşük.
Canon

Evren içinde gerçekten yaşanmış ve geçerli kabul edilen olayların bütünü.

Örnek:

Lila tilkiye yardım etti.
Tilki gizli yolu gösterdi.
Fener eski değirmende bulundu.
Continuity

Geçmişteki gerçeklerin sonraki olaylarla çelişmemesini sağlayan tutarlılık sistemi.

Örnek:

Tilki hâlâ yaralıysa sonraki sahnede hızlı koşmamalı.
Causality

Olayların neden gerçekleştiğini ve neye yol açtığını takip eden neden-sonuç ağı.

Örnek:

Fırtına
→ köprü hasarı
→ köye giden yol kapandı
→ köylüler alternatif yolu kullanmaya başladı
→ orman patikası daha kalabalık hale geldi
2. Tek gerçeklik kaynağı

LUMI’de bir olayın gerçekleşmiş sayılması için yalnızca anlatı metninde geçmesi yeterli olmamalıdır.

Örneğin model yanlışlıkla şöyle yazabilir:

Lila cebinden gümüş anahtarı çıkardı.

Ancak Lila’nın envanterinde böyle bir anahtar yoksa bu cümle otomatik olarak kanon olmamalıdır.

Temel ilke:

Metin dünya durumunu belirlemez. Onaylanmış kanonik olaylar dünya durumunu belirler.

Doğru akış:

Planlanan olay
↓
Doğrulama
↓
Kanonik olay kaydı
↓
World State güncellemesi
↓
Anlatı metni

Bazı durumlarda anlatı önce üretilse bile, dünya state’i yalnızca doğrulanan olaylar üzerinden değiştirilmelidir.

3. Canonical Event

Dünyadaki her anlamlı değişiklik yapılandırılmış bir olay olarak tutulmalıdır.

interface CanonicalEvent {
  id: string;

  worldId: string;
  timelineId: string;

  storyId?: string;
  storyRunId?: string;
  sessionId?: string;
  sceneId?: string;
  beatId?: string;

  eventType: CanonicalEventType;

  actorIds: string[];
  targetIds: string[];

  locationId?: string;

  occurredAtWorldTime: string;
  recordedAtSystemTime: string;

  causes: EventCauseReference[];
  effects: CanonicalEffect[];

  preconditions: StateCondition[];
  postconditions: StateCondition[];

  directness:
    | "DIRECT"
    | "DERIVED"
    | "INFERRED"
    | "SIMULATED";

  permanence:
    | "EPHEMERAL"
    | "TEMPORARY"
    | "PERSISTENT"
    | "IRREVERSIBLE";

  visibility: EventVisibility;

  confidence: number;

  canonStatus:
    | "PROPOSED"
    | "VALIDATED"
    | "COMMITTED"
    | "REJECTED"
    | "REVERTED"
    | "SUPERSEDED";

  version: number;
}
4. Canonical Event Type
type CanonicalEventType =
  | "CHARACTER_MOVED"
  | "CHARACTER_MET"
  | "CHARACTER_HELPED"
  | "CHARACTER_HARMED"
  | "CHARACTER_RECOVERED"
  | "CHARACTER_LEARNED"
  | "CHARACTER_DISCOVERED"
  | "RELATIONSHIP_CHANGED"
  | "ITEM_CREATED"
  | "ITEM_ACQUIRED"
  | "ITEM_USED"
  | "ITEM_TRANSFERRED"
  | "ITEM_LOST"
  | "ITEM_DESTROYED"
  | "LOCATION_DISCOVERED"
  | "LOCATION_CHANGED"
  | "WORLD_CONDITION_CHANGED"
  | "PROMISE_MADE"
  | "PROMISE_FULFILLED"
  | "GOAL_CREATED"
  | "GOAL_COMPLETED"
  | "CHOICE_COMMITTED"
  | "TIME_ADVANCED"
  | "ARC_ADVANCED"
  | "CUSTOM";

Bu liste genişletilebilir fakat olay türleri mümkün olduğunca anlamlı ve sınırlı tutulmalıdır.

5. Event ile State ayrımı

Olay ve state aynı şey değildir.

Event
Lila feneri aldı.
State
Fenerin sahibi Lila.
Fener Lila'nın çantasında.

Event geçmişteki değişimi kaydeder.

State ise olaylar uygulandıktan sonra dünyanın güncel halidir.

Bu ayrım şu nedenle önemlidir:

Fener şu anda kimde?

sorusu için güncel state kullanılır.

Fener Lila’ya nasıl geçti?

sorusu için event geçmişi kullanılır.

6. Event Sourcing yaklaşımı

LUMI için en güçlü yaklaşımlardan biri kontrollü event sourcing modelidir.

Dünya state’i:

Başlangıç durumu
+
Kanonik olaylar
=
Güncel dünya durumu

Örnek:

Event 1:
Fener eski değirmende.

Event 2:
Lila feneri buldu.

Event 3:
Lila feneri çantasına koydu.

Event 4:
Lila feneri yaşlı bekçiye verdi.

Güncel sonuç:

Fener yaşlı bekçide.

Avantajları:

geçmiş izlenebilir,
hata kaynağı bulunabilir,
replay ayrıştırılabilir,
state yeniden oluşturulabilir,
neden-sonuç zinciri görülebilir.

Ancak her küçük anlatı ayrıntısı event olmamalıdır.

7. Event Granularity

Aşırı detaylı kayıt:

Lila sol ayağını kaldırdı.
Lila ayağını yere koydu.
Lila başını çevirdi.

gereksizdir.

Aşırı genel kayıt:

Macera tamamlandı.

ise yetersizdir.

Kanonik olay şu koşullardan en az birini taşımalıdır:

dünya durumunu değiştiriyor,
karakter durumunu değiştiriyor,
ilişkiyi etkiliyor,
bilgi durumunu değiştiriyor,
gelecekte sonuç doğurabilir,
anlatısal promise oluşturuyor veya kapatıyor,
önemli seçim sonucu oluşuyor.
8. World State Entity modeli

Dünyadaki her önemli unsur bir state entity olabilir.

interface WorldEntityState {
  entityId: string;
  entityType:
    | "CHARACTER"
    | "LOCATION"
    | "ITEM"
    | "CREATURE"
    | "GROUP"
    | "STRUCTURE"
    | "REGION"
    | "WORLD_SYSTEM";

  worldId: string;
  timelineId: string;

  properties: Record<string, StateValue>;

  status:
    | "ACTIVE"
    | "INACTIVE"
    | "MISSING"
    | "DESTROYED"
    | "UNKNOWN"
    | "ARCHIVED";

  currentLocationId?: string;

  lastUpdatedByEventId: string;
  lastUpdatedAtWorldTime: string;

  version: number;
}
9. State Value

Her değer aynı biçimde tutulmamalıdır.

type StateValue =
  | BooleanStateValue
  | NumericStateValue
  | TextStateValue
  | VectorStateValue
  | ReferenceStateValue
  | CollectionStateValue
  | TemporalStateValue
  | UnknownStateValue;

Örnek:

{
  "injury": {
    "type": "VECTOR",
    "value": {
      "severity": 0.3,
      "pain": 0.2,
      "mobilityImpact": 0.35,
      "healingProgress": 0.45
    }
  }
}
10. Objective State ve Subjective State

Dünyanın gerçek durumu ile karakterlerin algıladığı durum ayrılmalıdır.

Objective State

Gerçekte olan:

Kulenin kapısı kilitli değil.
Kapı nem nedeniyle sıkışmış.
Subjective State

Lila’nın düşündüğü:

Kapının büyüyle kilitlendiğini düşünüyor.

Tilkinin düşündüğü:

Kapının arkasında biri olduğunu sanıyor.

Bu ayrım gizem, yanlış anlaşılma ve karakter kararları için kritiktir.

11. Truth Layer

Her bilgi bir doğruluk katmanında tutulabilir.

type TruthStatus =
  | "OBJECTIVE_FACT"
  | "CHARACTER_BELIEF"
  | "CHARACTER_SUSPICION"
  | "RUMOR"
  | "MISUNDERSTANDING"
  | "DECEPTION"
  | "UNKNOWN"
  | "DISPUTED";
interface TruthRecord {
  id: string;

  statement: string;
  subjectEntityIds: string[];

  truthStatus: TruthStatus;

  objectiveTruthValue?: boolean;
  confidence: number;

  believerCharacterIds: string[];
  disbelieverCharacterIds: string[];

  sourceEventIds: string[];

  validFrom: string;
  validUntil?: string;
}
12. Canon ile Lore ayrımı
Canon

Gerçekten gerçekleşmiş olaylar ve mevcut gerçeklerdir.

Lore

Evrenin geçmişi, kültürü, mitleri ve dünya bilgisidir.

Lore içindeki her bilgi doğru olmak zorunda değildir.

Örneğin köylülerin söylediği:

Kuzey ormanına giren herkes yolunu kaybeder.

bir halk inanışı olabilir.

Gerçek durum:

Ormandaki manyetik taşlar pusulaları etkiliyor.

Bu nedenle lore kayıtları da kaynak ve güvenilirlik taşımalıdır.

13. Lore Record
interface LoreRecord {
  id: string;

  title: string;
  content: string;

  category:
    | "HISTORY"
    | "MYTH"
    | "CULTURE"
    | "RELIGION"
    | "GEOGRAPHY"
    | "SCIENCE"
    | "MAGIC"
    | "RUMOR"
    | "LEGEND";

  truthStatus: TruthStatus;

  sourceEntityIds: string[];
  sourceReliability: number;

  knownByCharacters: string[];
  knownByGroups: string[];

  revealedToChild: number;

  canonDependencies: string[];
}
14. Temporal State

Dünya state’i zaman boyutu taşır.

Şu sorulara cevap verilmelidir:

Köprü ne zaman kırıldı?
Tilkinin yarası kaç gündür var?
Nehir seviyesi ne zamandır düşüyor?
Fener en son ne zaman kullanıldı?

Her state özelliği için gerekirse:

interface TemporalStateMetadata {
  becameValidAt: string;
  lastConfirmedAt: string;
  expectedExpiryAt?: string;

  decayPolicy?: StateDecayPolicy;
}
15. State Decay

Bazı durumlar zamanla kendiliğinden değişir.

Örnek:

yara iyileşir,
çamur kurur,
meyve bozulur,
korku azalabilir,
izler silinir,
hava değişir.
interface StateDecayPolicy {
  type:
    | "LINEAR"
    | "EXPONENTIAL"
    | "STEP"
    | "CONDITIONAL"
    | "EVENT_DRIVEN"
    | "NONE";

  rate?: number;
  conditions?: StateCondition[];
  minimumValue?: number;
  maximumValue?: number;
}

Ancak bu değişimler her entity için sürekli hesaplanmamalıdır.

Daha önce belirlediğimiz önem filtresi uygulanmalıdır.

16. Relevance-Based Simulation

Her zaman atlamasında tüm evren simüle edilmez.

Öncelik faktörleri:

interface SimulationRelevanceVector {
  narrativeRelevance: number;
  proximityToPlayer: number;
  causalDependency: number;
  timeSensitivity: number;
  characterImportance: number;
  unresolvedConditionSeverity: number;
  worldImpactPotential: number;
}

Yüksek değerli entity’ler daha ayrıntılı simüle edilir.

Düşük öncelikli entity’ler:

özet simülasyon,
yaklaşık state ilerlemesi,
hiç hesaplamama

yöntemlerinden biriyle ele alınır.

17. Offline Time Policy

Daha önce kabul ettiğimiz ilke burada uygulanır.

Örnek zaman yoğunluğu:

0–24 saat:
yüksek ayrıntılı simülasyon

1–3 gün:
orta ayrıntılı simülasyon

3–7 gün:
özet simülasyon

7–10 gün:
yalnızca kritik değişimler

10 günden fazla:
dünya statik kalır

Bu sınırlar yapılandırılabilir.

Temel amaç:

Kullanıcı geri döndüğünde dünya tanınmayacak kadar değişmemelidir.

18. Dünya saatleri

Tek bir zaman bilgisi yeterli olmayabilir.

interface WorldClock {
  worldTime: string;
  calendarId: string;

  dayPhase:
    | "DAWN"
    | "MORNING"
    | "NOON"
    | "AFTERNOON"
    | "EVENING"
    | "NIGHT";

  season?: string;
  weatherStateId?: string;

  elapsedSinceLastSessionMs: number;
  simulatedElapsedMs: number;
  frozenElapsedMs: number;
}

frozenElapsedMs, gerçek dünyada geçen fakat evrende simüle edilmeyen süreyi temsil edebilir.

19. Time Compression

Hikâye süresi ile dünya süresi aynı değildir.

Örnek:

5 dakikalık anlatım
=
Dünya içinde 3 saatlik yürüyüş

Ya da:

10 dakikalık hikâye
=
Dünya içinde 2 gün

Bu nedenle sahne geçişlerinde zaman etkisi açıkça belirtilmelidir.

interface NarrativeTimeAdvance {
  realPlaybackDurationMs: number;
  worldTimeAdvanceMs: number;

  mode:
    | "REALTIME"
    | "COMPRESSED"
    | "MONTAGE"
    | "TIME_SKIP"
    | "PAUSED";
}
20. State Transaction

Birden fazla state değişikliği tek bir işlem olarak uygulanmalıdır.

Örnek:

Lila tilkiye yardım ettiğinde:

Mendil envanterden kullanılır.
Tilkinin yara durumu iyileşir.
Tilkinin güveni artar.
Yeni ilişki hafızası oluşur.
Gizli yol bilgisi açılır.

Bunlardan bazıları uygulanıp bazıları başarısız olursa dünya tutarsız hale gelir.

interface WorldStateTransaction {
  transactionId: string;

  sourceEventId: string;

  preconditions: StateCondition[];
  mutations: StateMutation[];

  validationRules: StateValidationRule[];

  status:
    | "PREPARED"
    | "VALIDATED"
    | "COMMITTED"
    | "ROLLED_BACK"
    | "FAILED";

  committedAt?: string;
}
21. Preconditions

Her olay gerçekleşmeden önce gerekli koşullar kontrol edilmelidir.

Örnek:

Lila feneri kullanacaksa:
- fener Lila'nın envanterinde olmalı,
- fener yok edilmemiş olmalı,
- fener kullanılabilir durumda olmalı,
- Lila fenerin kullanımını biliyor olmalı veya deniyor olmalı.
interface StateCondition {
  entityId: string;
  path: string;

  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "CONTAINS"
    | "EXISTS"
    | "NOT_EXISTS"
    | "IN_RANGE";

  expectedValue?: unknown;
}
22. Mutation
interface StateMutation {
  entityId: string;
  path: string;

  operation:
    | "SET"
    | "INCREMENT"
    | "DECREMENT"
    | "ADD"
    | "REMOVE"
    | "MERGE"
    | "TRANSFER"
    | "INVALIDATE";

  value?: unknown;

  permanence:
    | "TEMPORARY"
    | "PERSISTENT"
    | "IRREVERSIBLE";
}
23. Derived State

Bazı değerler doğrudan tutulmak yerine diğer state’lerden hesaplanabilir.

Örnek:

Köprü kullanılabilir mi?

Şunlara bağlı olabilir:

yapısal hasar,
hava,
taşıma kapasitesi,
geçici onarım,
su seviyesi.
interface DerivedStateDefinition {
  id: string;

  outputEntityId: string;
  outputPath: string;

  dependencies: StateReference[];

  evaluationRule: string;

  recomputePolicy:
    | "ON_DEPENDENCY_CHANGE"
    | "ON_READ"
    | "SCHEDULED";
}

Bu sayede aynı gerçek farklı yerlerde kopyalanmaz.

24. State Invariant

Bazı kurallar her zaman doğru olmalıdır.

Örnek:

Bir fiziksel eşya aynı anda iki farklı gerçek konumda bulunamaz.
Yok edilmiş karakter aktif sahnede görünemez.
Bir karakter aynı anda iki uzak bölgede olamaz.
Bir item'ın sahibi varsa item o sahibin erişilebilir envanterinde veya tanımlı saklama alanında olmalıdır.
interface WorldInvariant {
  id: string;
  description: string;

  severity:
    | "WARNING"
    | "ERROR"
    | "CRITICAL";

  validationExpression: string;

  recoveryStrategy:
    | "REJECT_TRANSACTION"
    | "ROLLBACK"
    | "AUTO_REPAIR"
    | "MANUAL_REVIEW";
}
25. Location Continuity

Karakterlerin ve nesnelerin konumu özellikle önemlidir.

Bir karakterin hareketi:

Başlangıç konumu
→ rota
→ seyahat süresi
→ varış konumu

şeklinde ele alınmalıdır.

Karakter bir anda sahneye ışınlanmamalıdır; ancak evrende ışınlanma kuralı varsa bu ayrı bir olaydır.

interface MovementEvent {
  actorId: string;

  originLocationId: string;
  destinationLocationId: string;

  routeId?: string;
  movementMethod: string;

  departureTime: string;
  arrivalTime: string;

  interrupted: boolean;
}
26. Spatial Containment

Konumlar hiyerarşik olabilir.

Dünya
└── Kuzey Bölgesi
    └── Sisli Orman
        └── Eski Değirmen
            └── Alt Oda
                └── Sandık

Bir item için:

Fener
→ sandığın içinde
→ alt odada
→ eski değirmende
→ sisli ormanda

Bu yapı konumsal sorguları kolaylaştırır.

27. Spatial State modeli
interface SpatialState {
  entityId: string;

  immediateContainerId?: string;
  locationPath: string[];

  positionType:
    | "EXACT"
    | "APPROXIMATE"
    | "REGION_ONLY"
    | "UNKNOWN";

  accessibility:
    | "VISIBLE"
    | "HIDDEN"
    | "LOCKED"
    | "INACCESSIBLE"
    | "REACHABLE";

  lastConfirmedAt: string;
}
28. Unknown Location

Sistem bilmediği konumu uydurmamalıdır.

Örneğin tilki sis içinde kaybolduysa:

currentLocation = UNKNOWN
lastKnownLocation = Sisli Köprü
possibleRegions = [Kuzey Patikası, Dere Yolu]

Bu, “tilki kesin değirmene gitti” demekten daha doğrudur.

29. Physical State Continuity

Karakter fiziksel durumu vektör olarak izlenebilir.

interface PhysicalStateVector {
  health: number;
  energy: number;
  mobility: number;
  hunger: number;
  thirst: number;
  warmth: number;
  cleanliness: number;
  pain: number;
  fatigue: number;
}

Ancak LUMI bir hayatta kalma simülasyonuna dönüşmemelidir.

Yalnızca anlatısal olarak anlamlı boyutlar aktif tutulmalıdır.

Örneğin:

Uzun yolculukta yorgunluk anlamlı.
Normal bir köy sahnesinde susuzluk hesaplanmayabilir.
30. Narrative Relevance Mask

Her entity için tüm state alanlarını her zaman güncellemek yerine o an ilgili olan boyutlar işaretlenebilir.

interface StateRelevanceMask {
  entityId: string;

  activeDimensions: string[];
  passiveDimensions: string[];
  ignoredDimensions: string[];

  reason: string;
  expiresAt?: string;
}

Örnek:

Yaralı tilki için:

active:
injury, mobility, trust, location

passive:
hunger, sleep

ignored:
clothing, wealth
31. Character State
interface CharacterWorldState {
  characterId: string;

  spatialState: SpatialState;
  physicalState: PhysicalStateVector;

  emotionStateId: string;
  memoryStateId: string;
  goalStateId: string;

  inventoryId: string;

  currentActivity?: string;
  currentIntent?: string;

  availability:
    | "AVAILABLE"
    | "BUSY"
    | "TRAVELING"
    | "RESTING"
    | "MISSING"
    | "INACCESSIBLE";

  lastCanonicalEventId: string;
}

Bu model diğer motorların state referanslarını birleştirir ama o motorların detaylarını kopyalamaz.

32. Inventory Continuity

Envanter sistemi yalnızca item listesi değildir.

Her item için:

sahiplik,
fiziksel konum,
kullanılabilirlik,
miktar,
dayanıklılık,
bilinen özellikler,
gizli özellikler

tutulabilir.

interface ItemState {
  itemId: string;

  ownerId?: string;
  containerId?: string;
  locationId?: string;

  quantity: number;
  durability?: number;

  condition:
    | "NEW"
    | "GOOD"
    | "WORN"
    | "DAMAGED"
    | "BROKEN"
    | "DESTROYED";

  visibleProperties: string[];
  hiddenProperties: string[];

  activeEffects: string[];

  lastUsedAt?: string;
}
33. Ownership ve Possession ayrımı

Bir item’ın sahibi ile onu o anda taşıyan karakter farklı olabilir.

Örnek:

Haritanın sahibi:
Yaşlı denizci

Haritayı şu anda taşıyan:
Lila

Bu nedenle:

legalOwnerId
currentHolderId
currentContainerId

gibi alanlar ayrılmalıdır.

34. Item Provenance

Önemli eşyaların geçmişi tutulmalıdır.

interface ItemProvenance {
  itemId: string;

  createdByEventId?: string;
  previousOwnerIds: string[];
  transferEventIds: string[];

  discoveredAtEventId?: string;

  knownHistoryFacts: string[];
  hiddenHistoryFacts: string[];
}

Bu, eşyaların hikâyede anlam kazanmasını sağlar.

Örneğin fener yalnızca bir araç değil, geçmişi olan bir nesne olabilir.

35. Relationship State Continuity

Relationship Engine ilişki vektörlerini yönetir. Canon Engine ise hangi olayların ilişki değişimine neden olduğunu saklar.

Örnek:

Tilkinin güveni +0.08

tek başına yeterli değildir.

Sebep de tutulmalıdır:

Lila yaralı tilkiye yardım etti.
Tilki yardımı gönüllü olarak kabul etti.
interface RelationshipStateChange {
  relationshipId: string;

  sourceEventId: string;

  beforeVector: RelationshipVector;
  deltaVector: Partial<RelationshipVector>;
  afterVector: RelationshipVector;

  perceivedByParticipants: boolean;
}
36. Knowledge State

Her karakter için bilgi durumu ayrı izlenmelidir.

interface CharacterKnowledgeState {
  characterId: string;

  knownFacts: KnowledgeEntry[];
  suspectedFacts: KnowledgeEntry[];
  falseBeliefs: KnowledgeEntry[];
  forgottenFacts: KnowledgeEntry[];

  secrets: KnowledgeEntry[];
}
interface KnowledgeEntry {
  factId: string;

  acquiredByEventId?: string;
  sourceCharacterId?: string;

  confidence: number;
  freshness: number;

  directObservation: boolean;
  trustedSource: boolean;

  lastRecalledAt?: string;
}
37. Knowledge Propagation

Bir olayın gerçekleşmesi herkesin bunu bildiği anlamına gelmez.

Örnek:

Köprü gece kırıldı.

Bunu yalnızca:

köprü yakınındaki karakterler,
sabah görenler,
birinden haber alanlar

bilebilir.

interface KnowledgePropagationRule {
  sourceEventId: string;

  propagationType:
    | "DIRECT_OBSERVATION"
    | "DIALOGUE"
    | "RUMOR"
    | "PUBLIC_ANNOUNCEMENT"
    | "DOCUMENT"
    | "MAGICAL_LINK";

  reach: string[];
  distortionProbability: number;
  propagationDelay: number;
}
38. Rumor Distortion

Bilgi aktarılırken değişebilir.

Gerçek:

Tilki eski kuleyi tanıyor.

Söylenti 1:

Tilki kulede yaşamış.

Söylenti 2:

Tilki kuleyi koruyor.

Söylenti 3:

Tilki kulenin sahibi.

Bunlar farklı TruthRecord olarak tutulabilir.

39. Canon Commit aşamaları

Bir olay doğrudan COMMITTED olmamalıdır.

Önerilen yaşam döngüsü:

PROPOSED
↓
PRECONDITION_CHECKED
↓
CONTINUITY_VALIDATED
↓
SAFETY_VALIDATED
↓
COMMITTED
↓
STATE_APPLIED
↓
CONSEQUENCES_SCHEDULED

Bu işlem mümkün olduğunca atomik olmalıdır.

40. Pending Event ve Committed Event

Daha önce konuştuğumuz Pending Effect modeli burada tamamlanır.

Pending Event

Çocuk henüz seçimini tamamlamadı veya sahne sonucu kesinleşmedi.

Lila tilkiye yardım etmeyi düşünüyor.
Committed Event

Seçim kesinleşti.

Lila tilkiye yardım etti.

Pending event’ler canonical history’ye yazılmamalıdır.

41. Canon Boundary

Bir olayın ne zaman kesinleştiğini belirleyen sınırdır.

Örnek:

Seçenek gösterildi:
Kanon değil.

Çocuk seçeneğe dokundu:
Henüz kanon olmayabilir.

Onaylandı ve işlem başladı:
Pending.

Sonuç sahnesi başarılı tamamlandı:
Committed.

Bu sınır kesinti ve geri dönüş davranışlarını etkiler.

42. Commit Timing Policy

Bazı seçimlerde sonuç hemen commit edilebilir.

Örnek:

Hangi patikadan gidilsin?

Bazılarında sonuç sahnenin sonunda commit edilmelidir.

Örnek:

Tilkiye ilaç vermeye çalış.

İlacın gerçekten verilip verilmediği sahne sonucuna bağlı olabilir.

type CommitPolicy =
  | "ON_SELECTION"
  | "ON_ACTION_START"
  | "ON_ACTION_SUCCESS"
  | "ON_SCENE_END"
  | "ON_STORY_END";
43. Causal Link

Her önemli olay başka olaylarla ilişkilendirilebilir.

interface CausalLink {
  id: string;

  causeEventId: string;
  effectEventId: string;

  relation:
    | "DIRECT_CAUSE"
    | "CONTRIBUTING_CAUSE"
    | "ENABLING_CONDITION"
    | "PREVENTING_CONDITION"
    | "TRIGGER"
    | "CORRELATION"
    | "NARRATIVE_ATTRIBUTION";

  strength: number;
  necessary: boolean;
  sufficient: boolean;

  delayMs?: number;
}
44. Necessary ve Sufficient Cause

Bir olayın nedeni tek bir şey olmayabilir.

Örnek:

Köprü çöktü.

Nedenler:

tahtalar eskiydi,
önceki fırtına hasar verdi,
nehir seviyesi yükseldi,
ağır araba geçti.

Bunlardan hiçbiri tek başına yeterli olmayabilir.

Bu ayrım dünyayı daha doğal yapar.

45. Causality Graph

Olaylar grafik olarak tutulabilir.

Fırtına başladı
├── Nehir yükseldi
│   └── Köprü ayakları zayıfladı
├── Ağaç devrildi
│   └── Kuzey yolu kapandı
└── Köylüler güney yolunu kullandı
    └── Tilki yolu kalabalık buldu

Bu grafik:

sonuç açıklamalarında,
NPC kararlarında,
recap üretiminde,
world simulation’da

kullanılabilir.

46. Consequence Scheduler

Her sonuç anında gerçekleşmeyebilir.

Örnek:

Lila köyün su kapısını açtı.

Anlık sonuç:

Su akmaya başladı.

Gecikmiş sonuç:

Saatler sonra alt bahçe sulandı.

Uzun vadeli sonuç:

Birkaç gün sonra kuruyan çiçekler toparlandı.
interface ScheduledConsequence {
  id: string;

  sourceEventId: string;

  expectedAtWorldTime?: string;
  triggerConditions?: StateCondition[];

  effectTemplate: CanonicalEffect[];

  status:
    | "SCHEDULED"
    | "ELIGIBLE"
    | "APPLIED"
    | "CANCELLED"
    | "EXPIRED";

  relevanceRequired: boolean;
}
47. Conditional Consequence

Bazı sonuçlar yalnızca başka koşullar gerçekleşirse oluşur.

Örnek:

Tilki Lila'ya güvenmeye başladı.

Bu doğrudan gizli yolu göstermesi anlamına gelmez.

Koşullar:

trust > 0.6
location = kuzey ormanı
currentRisk düşük
tilki başka görevde değil

Karşılandığında sonuç tetiklenebilir.

48. Prevented Consequence

Sistem gerçekleşmeyen sonuçları da gerektiğinde açıklayabilmelidir.

Örnek:

Fırtına köprüyü yıkabilirdi.
Ama köylüler köprüyü önceden güçlendirdi.

Bu durumda:

Potential Event:
Bridge collapse

Prevented by:
Repair event

Bu bilgi çocuğun seçimlerinin etkisini göstermek için değerlidir.

49. Counterfactual kayıt

Her ihtimal kanona yazılmamalıdır.

Ancak önemli kaçırılmış olasılıklar ayrı bir alanda tutulabilir.

interface CounterfactualOutcome {
  sourceChoiceId: string;
  selectedOptionId: string;
  alternativeOptionId: string;

  possibleOutcomeSummary: string;

  canonical: false;
  usableForReplay: boolean;
  usableForPlannerAnalysis: boolean;
}

Counterfactual içerik karakter hafızasına veya dünya state’ine karışmamalıdır.

50. Replay Timeline

Replay için ayrı timeline kullanılmalıdır.

interface Timeline {
  id: string;

  worldId: string;

  type:
    | "CANONICAL"
    | "REPLAY"
    | "PREVIEW"
    | "SIMULATION"
    | "TEST";

  parentTimelineId?: string;
  branchEventId?: string;

  canonAuthority: boolean;

  createdAt: string;
}

Varsayılan replay:

type = REPLAY
canonAuthority = false

Replay sırasında oluşan değişiklikler ana dünyaya uygulanmaz.

51. Alternate Timeline Promotion

İleride ebeveyn veya çocuk replay sonucunu ana hikâye yapmak isterse özel bir işlem gerekebilir.

Bu otomatik olmamalıdır.

Replay sonucu seçildi
↓
Uyumluluk analizi
↓
Ana timeline üzerindeki çelişkiler bulunur
↓
Yeni canonical branch oluşturulur
↓
Önceki timeline arşivlenir veya korunur

Bu özellik ilk sürümde gerekli değildir; backlog olarak tutulabilir.

52. Canon Authority

Her veri kaynağı eşit yetkiye sahip değildir.

Örnek öncelik:

1. Committed canonical event
2. Validated current state
3. World rules
4. Character memory
5. Narrative text
6. Generated summary
7. Model inference

Bir summary, canonical event ile çelişirse summary yanlıştır.

53. Source of Truth Registry
interface CanonAuthorityRule {
  domain:
    | "WORLD_STATE"
    | "CHARACTER_STATE"
    | "RELATIONSHIP"
    | "MEMORY"
    | "INVENTORY"
    | "ARC"
    | "KNOWLEDGE";

  authoritativeService: string;
  fallbackServices: string[];

  conflictResolutionPolicy: string;
}

Örnek:

Inventory ownership:
Inventory Service authoritative.

Character emotion:
Emotion Engine authoritative.

Canonical event history:
Canon Service authoritative.
54. Cross-Engine Consistency

Motorlar aynı bilginin farklı yorumlarını taşıyabilir.

Örnek:

Canon:
Tilki yaralı.

Physical State:
Mobility 0.65.

Decision Engine:
Uzun koşu seçeneğini düşük utility görüyor.

Narrative Planner:
Takip sahnesi planlamıyor.

Narrative Generator:
Tilki yavaş yürüyor.

Bu tutarlı bir zincirdir.

Bir motor:

Tilki hızla koştu.

üretirse continuity validator bunu yakalamalıdır.

55. Continuity Constraint Registry

Tüm aktif kısıtlar merkezi olarak görülebilmelidir.

interface ContinuityConstraintRecord {
  id: string;

  entityIds: string[];

  type:
    | "PHYSICAL"
    | "SPATIAL"
    | "TEMPORAL"
    | "KNOWLEDGE"
    | "RELATIONSHIP"
    | "INVENTORY"
    | "WORLD_RULE"
    | "NARRATIVE_PROMISE";

  condition: string;

  severity:
    | "SOFT"
    | "HARD"
    | "CRITICAL";

  validFrom: string;
  validUntil?: string;

  sourceEventId?: string;
}
56. Hard ve Soft Continuity
Hard Continuity

İhlal edilmemelidir.

Yok edilmiş anahtar kullanılamaz.
Karakter aynı anda iki yerde olamaz.
Bilmediği sırrı açıklayamaz.
Soft Continuity

Normalde korunmalıdır ama gerekçeyle esneyebilir.

Tilki genellikle erken kalkar.
Lila çoğu zaman önce soru sorar.
Köy pazarı genellikle kalabalıktır.

Soft ihlal gerekçeli ise kabul edilebilir.

57. Continuity Window

Her üretimde tüm geçmiş yüklenmemelidir.

İlgili continuity bilgileri seçilmelidir:

Current Scene Constraints
Recent Story Constraints
Active Arc Constraints
Entity-Specific Long-Term Constraints
Critical World Rules

Bu, bağlam maliyetini azaltır.

58. Continuity Retrieval
interface ContinuityQuery {
  activeEntityIds: string[];
  locationIds: string[];

  worldTimeRange?: {
    from: string;
    to: string;
  };

  domains: string[];

  includeHardConstraints: boolean;
  includeSoftConstraints: boolean;

  maximumRecords: number;
}

Sonuç yalnızca o sahne için gerekli bilgileri döndürmelidir.

59. Contradiction Detection

Çelişkiler birkaç türe ayrılabilir.

type ContradictionType =
  | "STATE_CONTRADICTION"
  | "TEMPORAL_CONTRADICTION"
  | "SPATIAL_CONTRADICTION"
  | "KNOWLEDGE_CONTRADICTION"
  | "IDENTITY_CONTRADICTION"
  | "CAUSAL_CONTRADICTION"
  | "RULE_CONTRADICTION"
  | "NARRATIVE_CONTRADICTION";

Örnekler:

State:
Köprü hem sağlam hem yıkık.

Temporal:
Karakter olaydan önce sonucu hatırlıyor.

Spatial:
Lila aynı anda köyde ve mağarada.

Knowledge:
Tilki henüz öğrenmediği sırrı biliyor.

Causal:
Nehir, fırtınadan önce fırtına nedeniyle yükselmiş.
60. Conflict Resolution

Çelişki bulunduğunda her zaman son kayıt doğru kabul edilmemelidir.

Önerilen öncelik:

Authority
+
Commit Status
+
Timestamp
+
Confidence
+
Source Reliability
+
Causal Compatibility
interface CanonConflictResolution {
  conflictId: string;

  competingClaims: CanonClaim[];

  winningClaimId?: string;

  resolution:
    | "KEEP_EXISTING"
    | "ACCEPT_NEW"
    | "MERGE"
    | "MARK_UNKNOWN"
    | "REVERT_EVENT"
    | "REQUIRE_REPAIR_EVENT";

  explanation: string;
}
61. Unknown kullanımı

Sistem emin olmadığı durumda gerçek uydurmak yerine UNKNOWN kullanabilmelidir.

Örnek:

Tilkinin nerede olduğu bilinmiyor.
Kapının neden kapalı olduğu bilinmiyor.
Fenerin kaç yıllık olduğu bilinmiyor.

Bilinmezlik hata değil, anlatısal bir state olabilir.

62. Canon Repair

Geçmişte bir tutarsızlık oluşmuşsa sessizce veri değiştirmek yerine gerekirse repair event oluşturulmalıdır.

Örnek hata:

Fener iki farklı karakterin envanterinde görünüyor.

Repair:

Son güvenilir transfer event’i bulunur.
Yanlış envanter kaydı kaldırılır.
CanonRepairEvent oluşturulur.
interface CanonRepairEvent {
  id: string;

  repairedDomain: string;
  affectedEntityIds: string[];

  detectedContradictionIds: string[];

  repairAction: string;

  preservesNarrativeHistory: boolean;
  userVisible: boolean;
}
63. Diegetic Repair

Bazı tutarsızlıklar anlatı içinde doğal biçimde düzeltilebilir.

Örnek:

Önceki hikâyede fenerin mavi olduğu, sonra yeşil anlatıldığı varsayalım.

Teknik düzeltme yerine:

Lila feneri çevirdiğinde camın bir yüzünün mavi, diğer yüzünün yeşil olduğunu fark etti.

Bu yalnızca dünya kurallarına uygunsa kullanılmalıdır.

Her hata rastgele yeni lore eklenerek kapatılmamalıdır.

64. Non-Diegetic Repair

Kullanıcının görmediği küçük teknik çelişkiler arka planda düzeltilebilir.

Örnek:

Item container ID yanlış fakat anlatıda hiç gösterilmedi.

Bu durumda teknik state düzeltilebilir.

Fakat kullanıcının gördüğü geçmiş değiştirilmemelidir.

65. Retcon Policy

Retcon, geçmişteki bir gerçeğin sonradan değiştirilmesidir.

LUMI’de varsayılan olarak kaçınılmalıdır.

İzin verilebilecek durumlar:

açık teknik hata,
kullanıcı tarafından onaylanan hikâye düzenlemesi,
yanlış anlaşılan bilginin açıklanması,
güvenilir olmayan anlatıcı kullanımı,
alternatif timeline.
type RetconType =
  | "ERROR_CORRECTION"
  | "REINTERPRETATION"
  | "UNRELIABLE_SOURCE_REVEAL"
  | "USER_APPROVED_CHANGE"
  | "TIMELINE_BRANCH";
66. Reinterpretation Retcon değildir

Örnek:

İlk bilgi:

Herkes fenerin büyülü olduğunu düşünüyor.

Sonraki açıklama:

Fener eski kristal teknolojisiyle çalışıyor.

İlk kayıt bir inançsa çelişki yoktur.

Ancak sistem ilk kaydı objective fact olarak kaydetmişse sorun oluşur.

Bu nedenle truth katmanları baştan doğru tutulmalıdır.

67. Causal Consistency Validation

Yeni bir olay şu sorularla doğrulanmalıdır:

Bu olayın nedeni var mı?
Önkoşulları karşılanıyor mu?
Karakterin bunu yapma imkânı var mı?
Olay mevcut dünya kurallarına uygun mu?
Sonuçlar yeterli mi?
Gereken yan etkiler oluşturuldu mu?
Olay daha önce gerçekleşmiş bir sonucu imkânsızlaştırıyor mu?
68. World Rules

Evrenin fizik, sihir ve toplum kuralları açıkça tutulmalıdır.

interface WorldRule {
  id: string;

  domain:
    | "PHYSICS"
    | "MAGIC"
    | "BIOLOGY"
    | "TIME"
    | "SOCIAL"
    | "ECONOMY"
    | "TRAVEL"
    | "ITEM";

  description: string;

  conditions: StateCondition[];
  consequences: CanonicalEffect[];

  exceptions: WorldRuleException[];

  authorityLevel:
    | "ABSOLUTE"
    | "STRONG"
    | "DEFAULT"
    | "CULTURAL_BELIEF";
}
69. Magic Cost and Limits

Sihir sınırsız olursa nedensellik anlamsızlaşır.

Örneğin fener:

Her problemi çözemez.
Yalnızca eski su yollarına yakınken parlar.
Uzun süre kullanılırsa ışığı zayıflar.
Kapalı taş kapıları açamaz.

Bu sınırlar world rule olarak tanımlanmalıdır.

Aksi halde Narrative Generator ihtiyaç duyduğu her anda yeni güç uydurabilir.

70. Capability Registry

Her karakterin ne yapabileceği kaydedilmelidir.

interface Capability {
  id: string;

  entityId: string;

  capabilityType:
    | "PHYSICAL"
    | "MENTAL"
    | "SOCIAL"
    | "MAGICAL"
    | "KNOWLEDGE"
    | "ITEM_GRANTED";

  name: string;

  proficiency: number;

  conditions: StateCondition[];
  limitations: string[];

  sourceEventId?: string;
}

Bu, karakterlerin ihtiyaç olduğunda sebepsiz yeni yetenekler kazanmasını engeller.

71. Capability Availability

Bir karakter bir yeteneğe sahip olsa bile o anda kullanamayabilir.

Örnek:

Tilki hızlı koşabilir.
Ama yaralı olduğunda kullanamaz.
interface CapabilityAvailability {
  capabilityId: string;

  currentlyAvailable: boolean;
  limitingFactors: string[];

  effectiveProficiency: number;
}
72. Identity Continuity

Karakterlerin kimlik bilgileri ve değişmeyen temel özellikleri korunmalıdır.

interface IdentityState {
  entityId: string;

  canonicalName: string;
  aliases: string[];

  species?: string;
  ageBand?: string;

  stableTraits: string[];
  mutableTraits: string[];

  originFacts: string[];
  identitySecrets: string[];
}

Bir karakterin temel kimliği ancak açık arc ve canonical event ile değişebilir.

73. Versioned State

Her state değişikliği version artırmalıdır.

Tilki State v12
→ yara işlendi
→ Tilki State v13

Bir işlem eski version üzerinden değişiklik yapmak isterse çakışma tespit edilir.

Bu özellikle paralel motorların aynı entity üzerinde karar verdiği durumlarda önemlidir.

74. Optimistic Concurrency

Örnek:

Decision Engine tilkinin ormanda olduğunu okudu.
Bu sırada World Engine tilkiyi köye taşıdı.
Decision Engine eski state’e göre mağara eylemi uygulamak istedi.

Expected version uyuşmazsa işlem reddedilmeli ve yeniden değerlendirilmelidir.

interface VersionedMutation {
  entityId: string;
  expectedVersion: number;
  mutation: StateMutation;
}
75. Snapshot

Tüm event geçmişini her sorguda yeniden oynatmak pahalı olabilir.

Belirli aralıklarla snapshot alınabilir.

interface WorldSnapshot {
  id: string;

  worldId: string;
  timelineId: string;

  worldTime: string;

  lastIncludedEventId: string;

  entityStates: WorldEntityState[];

  checksum: string;
  version: number;
}

Güncel state:

Son snapshot
+
Snapshot sonrası event’ler

ile oluşturulur.

76. Snapshot Frequency

Snapshot şu durumlarda alınabilir:

hikâye sonunda,
önemli arc tamamlandığında,
büyük dünya değişiminden sonra,
belirli event sayısından sonra,
sistem güncellemesinden önce.

Her beat sonunda snapshot gereksizdir.

77. Resume Anchor ilişkisi

Resume Anchor, oturumun kullanıcı deneyimi noktasını saklar.

World Snapshot ise evren state’ini saklar.

Bunlar aynı değildir.

Resume Anchor:
Çocuk seçim ekranındaydı.

World Snapshot:
Seçim öncesindeki committed dünya state’i.

Pending seçim varsa snapshot’a dahil edilmemelidir.

78. Save Consistency

Kaydetme işleminde şu veriler uyumlu olmalıdır:

World Snapshot
Session State
Resume Anchor
Pending Effects
Committed Events
Playback Position

Bunların farklı zamanlara ait olması kullanıcı geri geldiğinde tutarsızlığa yol açabilir.

79. Save Barrier

Belirli kritik noktalarda atomik save barrier kullanılabilir.

interface SaveBarrier {
  id: string;

  requiredComponents: string[];

  status:
    | "OPEN"
    | "READY"
    | "COMMITTED"
    | "FAILED";

  targetCanonicalEventId?: string;
}

Örneğin önemli seçim sonrası:

Event committed
World state updated
Session state advanced
Resume anchor moved

hep birlikte tamamlanmalıdır.

80. Canon Query Engine

Diğer motorlar kanonik gerçekleri yapılandırılmış olarak sorgulamalıdır.

Örnek sorgular:

Tilki şu anda nerede?
Fener kimin elinde?
Lila köprünün kırık olduğunu biliyor mu?
Köprü neden kırıldı?
Köprüden geçmek şu anda mümkün mü?
Tilki ile Lila en son ne zaman görüştü?
interface CanonQuery {
  queryType:
    | "CURRENT_STATE"
    | "EVENT_HISTORY"
    | "CAUSAL_CHAIN"
    | "KNOWLEDGE_STATE"
    | "ENTITY_LOCATION"
    | "OWNERSHIP"
    | "TIMELINE";

  entityIds: string[];
  atWorldTime?: string;

  maximumDepth?: number;
}
81. Causal Explanation

Çocuğa veya ebeveyne gösterilecek açıklamalar ham causal graph olmamalıdır.

Örnek teknik zincir:

storm_event_12
→ river_level_delta
→ bridge_support_damage
→ bridge_accessibility_false

Çocuk anlatımı:

Geceki fırtına nehri yükseltmişti. Güçlü su, köprünün eski ayaklarını zayıflatmıştı.

Ebeveyn özeti:

Fırtına nedeniyle köprü geçici olarak kullanılamaz hale geldi.

82. Explanation Depth
interface CausalExplanationRequest {
  targetAudience:
    | "CHILD"
    | "PARENT"
    | "NARRATIVE_ENGINE"
    | "DEBUG";

  depth: number;
  maximumCauses: number;

  includeIndirectCauses: boolean;
  includePreventedOutcomes: boolean;
}
83. Canonical Summary

Uzun event geçmişi belirli aralıklarla kanonik özete dönüştürülebilir.

Ancak özet event geçmişinin yerine geçmemelidir.

interface CanonicalSummary {
  id: string;

  scope:
    | "CHARACTER"
    | "RELATIONSHIP"
    | "LOCATION"
    | "ITEM"
    | "ARC"
    | "STORY";

  sourceEventIds: string[];

  summaryText: string;
  structuredFacts: string[];

  validUntilEventId: string;

  generatedVersion: number;
}
84. Summary Drift

Zamanla özetler gerçeklerden uzaklaşabilir.

Bu nedenle:

hangi event’lerden üretildiği,
hangi noktaya kadar geçerli olduğu,
daha yeni event’lerle çelişip çelişmediği

kontrol edilmelidir.

Özet, authoritative source değildir.

85. Canonical Fact Registry

Sık sorgulanan önemli gerçekler ayrı bir indeks halinde tutulabilir.

interface CanonicalFact {
  id: string;

  subjectId: string;
  predicate: string;
  object: unknown;

  validFrom: string;
  validUntil?: string;

  sourceEventIds: string[];

  truthStatus: TruthStatus;
  confidence: number;

  supersedesFactId?: string;
}

Örnek:

subject: fox
predicate: current_injury_state
object: mild_paw_injury
86. Fact Supersession

Gerçekler zamanla değişebilir.

Fact 1:
Köprü sağlam.
validUntil: fırtına zamanı

Fact 2:
Köprü hasarlı.
validFrom: fırtına sonrası

Fact 3:
Köprü onarıldı.
validFrom: onarım sonrası

Eski fact silinmez; geçerlilik süresi kapanır.

87. History Preservation

Dünya state’i değiştiğinde geçmiş yeniden yazılmamalıdır.

Örnek:

Tilki artık iyileşti.

Bu, tilkinin geçmişte yaralı olmadığı anlamına gelmez.

Event history korunur:

Yaralandı
→ bakım gördü
→ iyileşti
88. Permanent ve Reversible State

Bazı değişiklikler kolayca geri alınabilir.

Kapı açık.
Karakter yorgun.
Hava yağmurlu.

Bazıları kalıcıdır.

Köprü tamamen yıkıldı.
Önemli eşya yok edildi.
Karakter büyük sırrı öğrendi.

Her mutation geri dönüş özellikleri taşımalıdır.

interface ReversibilityPolicy {
  reversible: boolean;

  reversalRequiresEvent: boolean;
  reversalConditions?: StateCondition[];

  originalStateRecoverable: boolean;
}
89. Knowledge irreversibility

Bir karakterin öğrendiği bilgi normalde silinemez.

Ancak:

unutma,
hafıza kaybı,
yanlış bilginin düzeltilmesi,
büyülü etki

gibi açık olaylarla değişebilir.

Sistem kolaylık için karakteri tekrar bilgisiz yapmamalıdır.

90. Emotional State ve Canon

Duygular tamamen objective fact değildir.

Örneğin:

Tilki üzgün.

yerine:

Emotion Engine:
sadness 0.62

Canonical evidence:
Tilki sessiz kaldı.
Tilki kuleden uzak durdu.

Duygu state’i değişkendir; gözlenmiş davranışlar event olarak saklanabilir.

91. Hidden State

Bazı state’ler kullanıcıya veya diğer karakterlere görünmez.

Örnek:

karakterin gizli hedefi,
eşyanın bilinmeyen gücü,
yaklaşan dünya olayı,
bir karakterin sakladığı bilgi.
interface StateVisibility {
  systemVisible: boolean;
  childVisible: boolean;

  visibleToCharacterIds: string[];
  visibleToGroupIds: string[];

  revealConditions?: StateCondition[];
}
92. Spoiler-safe Query

Narrative Generator veya recap sistemi yalnızca çocuğun bilmesi gereken gerçeklere erişmelidir.

interface PerspectiveBoundQuery {
  viewerType:
    | "CHILD"
    | "CHARACTER"
    | "PARENT"
    | "SYSTEM";

  viewerId?: string;

  includeHiddenFacts: boolean;
  includeSuspicions: boolean;
  includeMisunderstandings: boolean;
}

Aksi takdirde özet sistemi yanlışlıkla gizemi açığa çıkarabilir.

93. Parent Visibility

Ebeveyn ekranında da her gizli olay açıklanmak zorunda değildir.

Ayarlar olabilir:

Spoilersız özet
Tam ebeveyn özeti
Sadece içerik güvenliği özeti

Bu, kullanıcı deneyimi kararıdır.

94. World State Lifecycle
Initial World Definition
↓
Canonical Event
↓
Transaction Validation
↓
State Mutation
↓
Derived State Recalculation
↓
Causal Consequence Scheduling
↓
Continuity Validation
↓
Snapshot
↓
Query & Narrative Use
95. Ana işlem hattı

Bir seçim sonrası örnek:

1. Çocuk “Tilkiye yardım et” seçeneğini seçer.
2. Interaction Engine seçimi doğrular.
3. Pending Choice oluşturulur.
4. Decision/Scene Engine yardım eylemini planlar.
5. Preconditions kontrol edilir.
6. Safety doğrulanır.
7. Yardım sahnesi oynatılır.
8. Eylemin başarı durumu belirlenir.
9. Canonical Event hazırlanır.
10. World State Transaction oluşturulur.
11. Envanter, yara, ilişki ve bilgi state’leri güncellenir.
12. Event COMMITTED yapılır.
13. Gecikmiş sonuçlar schedule edilir.
14. Resume Anchor ilerletilir.
15. Yeni snapshot gerekirse alınır.
96. Tam örnek: Tilkiye yardım
Başlangıç state’i
Lila:
location = Sisli Köprü
inventory = [temiz mendil, fener]

Tilki:
location = Sisli Köprü
pawInjurySeverity = 0.35
trustToLila = 0.25

Fener:
holder = Lila
Seçim
Lila tilkiye yardım eder.
Preconditions
Tilki sahnede mi? Evet.
Tilki yaralı mı? Evet.
Lila'nın kullanılabilir mendili var mı? Evet.
Tilki yardımı kabul etmeye açık mı? Evet.
Canonical Event
{
  "eventType": "CHARACTER_HELPED",
  "actorIds": ["lila"],
  "targetIds": ["fox"],
  "effects": [
    {
      "domain": "INVENTORY",
      "operation": "USE_ITEM",
      "itemId": "clean_cloth"
    },
    {
      "domain": "PHYSICAL_STATE",
      "path": "fox.injury.healingProgress",
      "delta": 0.15
    },
    {
      "domain": "RELATIONSHIP",
      "path": "fox_to_lila.trust",
      "delta": 0.08
    }
  ]
}
Sonuç state’i
Mendil kullanıldı.
Tilkinin yarası hâlâ var ama iyileşme başladı.
Tilkinin Lila’ya güveni arttı.
Tilki yardım olayını hatırlayabilir.
Gizli yol paylaşma koşuluna biraz daha yaklaşıldı.
97. Örnek: Köprü onarımı
Başlangıç
bridge.condition = damaged
bridge.accessible = false
Olaylar
Lila köyden yardım istedi.
Köylüler malzeme getirdi.
Köprü onarıldı.
Sonuçlar
bridge.condition = repaired
bridge.accessible = true
village_north_route = available
travel_time_to_forest = reduced
merchant_route_usage = increased

Burada tek bir köprü onarımı dünya davranışını etkiler.

98. World Impact Scope

Her event’in etki kapsamı tutulmalıdır.

type WorldImpactScope =
  | "ENTITY"
  | "RELATIONSHIP"
  | "LOCATION"
  | "LOCAL_REGION"
  | "MULTI_REGION"
  | "WORLD";

Çoğu çocuk seçimi:

ENTITY
RELATIONSHIP
LOCATION

düzeyinde olmalıdır.

Dünya çapında sonuçlar nadir ve uzun arc sonucunda oluşmalıdır.

99. Causal Propagation Limit

Bir event’in sınırsız domino etkisi yaratması sistem maliyetini artırır.

Bu nedenle yayılım sınırı gerekir.

interface CausalPropagationPolicy {
  maximumDepth: number;
  minimumEffectStrength: number;
  maximumScheduledConsequences: number;

  stopAtDormantRegions: boolean;
  summarizeLowImpactBranches: boolean;
}

Düşük etkili sonuçlar toplu bir özet değişime dönüştürülebilir.

100. Narrative Impact Threshold

Her teknik state değişikliği hikâyede görünmemelidir.

Örnek:

Nehir seviyesi %0.5 azaldı.

Bu anlatısal olarak gösterilmeyebilir.

Ama:

Nehir seviyesi kritik eşiğin altına düştü.

görünür bir dünya olayı oluşturabilir.

interface NarrativeImpactRule {
  statePath: string;

  threshold: number;
  eventTemplate: string;

  visibility:
    | "BACKGROUND"
    | "NOTICEABLE"
    | "STORY_RELEVANT"
    | "URGENT";
}
101. World State ile Narrative Planner ilişkisi

Planner:

“Ormandaki su sorunu ilerlesin.”

diyebilir.

Ancak sonucu doğrudan belirlememelidir.

World Engine şu soruları kontrol eder:

Su gerçekten azalıyor mu?
Buna neden olan süreç devam ediyor mu?
Başka karakterler müdahale etti mi?
Hava yağışı durumu değiştirdi mi?

Planner anlatı ihtiyacını bildirir, World Engine gerçekliği korur.

102. Narrative Opportunity

World State bazı değişimleri Narrative Planner’a fırsat olarak sunabilir.

Örnek:

Köprü üç gündür kapalı.
Tilki kuzey yoluna ulaşamıyor.
Pazar malzemeleri gecikiyor.

World Engine fırsat üretir:

interface NarrativeOpportunity {
  id: string;

  sourceStateIds: string[];
  sourceEventIds: string[];

  opportunityType:
    | "PROBLEM"
    | "DISCOVERY"
    | "RELATIONSHIP"
    | "RECOVERY"
    | "WORLD_CHANGE"
    | "MYSTERY";

  urgency: number;
  relevance: number;

  eligibleCharacters: string[];
  eligibleLocations: string[];
}

Narrative Planner bunu kullanmak zorunda değildir.

103. Canonical Event ile Narrative Event ayrımı

Bir olay kanonik olarak tek bir event olabilir fakat anlatıda birden fazla beat halinde gösterilebilir.

Canonical event:

Lila feneri buldu.

Narrative beats:

Işığı fark etti.
Sandığı açtı.
Feneri gördü.
Fenere dokundu.
Fener parladı.
Feneri aldı.

Bu ayrım, anlatı ayrıntısıyla state değişimini karıştırmamayı sağlar.

104. Event Aggregation

Birden fazla küçük kanonik olay daha büyük event altında gruplanabilir.

interface EventAggregate {
  id: string;

  aggregateType:
    | "SCENE_OUTCOME"
    | "CHOICE_OUTCOME"
    | "QUEST_STEP"
    | "WORLD_UPDATE";

  childEventIds: string[];

  summary: string;
}

Recap ve planner bu aggregate’leri kullanabilir.

105. Event Idempotency

Aynı işlem teknik hata nedeniyle iki kez uygulanmamalıdır.

Örnek:

Tilkiye yardım event’i iki kez commit edilirse:
trust +0.16 olabilir.

Bunu önlemek için idempotency key kullanılmalıdır.

interface EventCommitRequest {
  idempotencyKey: string;
  event: CanonicalEvent;
}

Aynı key ikinci kez gelirse işlem tekrarlanmaz.

106. Auditability

Her state değerinin mümkünse şu soruya cevabı olmalıdır:

Bu değer neden böyle?

Örnek:

Tilki güveni = 0.61

Destekleyen olaylar:

+0.08 yardım etti
+0.05 sırrını korudu
-0.04 sözünü tutmadı
+0.07 geri döndü

Bu yalnızca debugging için değil, karakter davranışlarının açıklanabilirliği için de değerlidir.

107. State Explainability
interface StateExplanation {
  entityId: string;
  statePath: string;

  currentValue: unknown;

  contributingEvents: {
    eventId: string;
    contribution: unknown;
    explanation: string;
  }[];

  derivedFromRules: string[];
}
108. Canon Pruning yapılmamalı

Eski kanonik olaylar sırf veri büyüdü diye silinmemelidir.

Bunun yerine:

archive,
cold storage,
summary index,
snapshot,
compact event representation

kullanılabilir.

Çünkü yıllar sonra eski bir karar yeni hikâyede anlam kazanabilir.

109. Event Importance
interface EventImportanceVector {
  worldImpact: number;
  characterImpact: number;
  relationshipImpact: number;
  narrativeImpact: number;
  memoryImportance: number;
  futureCausalityPotential: number;
}

Düşük öneme sahip event’ler sıkıştırılabilir ama tamamen yok edilmek zorunda değildir.

110. Canon Layers

Veriyi katmanlara ayırabiliriz.

Core Canon
Important Canon
Local Canon
Ephemeral State
Presentation Detail
Core Canon

Ana karakter, büyük dünya değişimi, önemli seçimler.

Important Canon

İlişki değişimleri, önemli eşyalar, keşifler.

Local Canon

Belirli bölgedeki küçük olaylar.

Ephemeral State

Hava, geçici yorgunluk, kısa süreli aktiviteler.

Presentation Detail

Metin varyasyonu, görsel açı, konuşma ritmi.

Presentation Detail dünya kanonuna yazılmaz.

111. Canon Scope

Her event’in hangi kullanıcı profiline ait olduğu da belirlenmelidir.

LUMI’de birden fazla çocuk profili varsa şu seçenekler vardır:

Shared World Canon
Per-Child Canon
Per-Story Canon
Household Canon

Bu kritik bir ürün kararıdır.

112. Önerilen çoklu profil modeli

En güvenli yaklaşım:

World Template
↓
Child World Instance
↓
Canonical Timeline

Her çocuk varsayılan olarak kendi dünya instance’ına sahip olur.

Böylece bir çocuğun seçimi diğer çocuğun hikâyesini istemeden değiştirmez.

İsteğe bağlı ortak macera için:

Shared Story Run

oluşturulabilir.

113. Shared Canon

Kardeşlerin ortak hikâyesinde:

seçim yetkisi,
ortak envanter,
ayrı karakter ilişkileri,
ortak dünya sonuçları

ayrıştırılmalıdır.

Örnek:

Köprü onarıldı:
Ortak canonical event.

Tilkinin Ayşe’ye güveni:
Ayşe’ye özel relationship state.

Tilkinin Elif’e güveni:
Elif’e özel relationship state.
114. Canon Ownership
interface CanonScope {
  worldInstanceId: string;

  ownerType:
    | "CHILD_PROFILE"
    | "HOUSEHOLD"
    | "SHARED_SESSION"
    | "SYSTEM_TEMPLATE";

  ownerIds: string[];

  inheritancePolicy:
    | "COPY_ON_CREATE"
    | "SHARED_REFERENCE"
    | "MERGE_ALLOWED"
    | "ISOLATED";
}
115. Template Canon

Başlangıç dünyasında tanımlı gerçekler:

Köy kuzey ormanının güneyindedir.
Yaşlı değirmen uzun süredir kullanılmıyor.
Tilki orman yollarını iyi bilir.

Bunlar world template’te bulunabilir.

Çocuk dünyası oluşturulurken kopyalanır.

Sonraki değişimler child world instance içinde gerçekleşir.

116. Dynamic Canon

Kullanıcı seçimleriyle oluşan gerçekler:

Lila tilkiyle arkadaş oldu.
Köprü onarıldı.
Fener yaşlı bekçiye verildi.

Template güncellenmez; yalnızca ilgili dünya instance’ı değişir.

117. Canon Migration

Sistem modeli veya world rules değiştiğinde eski dünyalar bozulmamalıdır.

interface CanonMigration {
  fromSchemaVersion: number;
  toSchemaVersion: number;

  transformations: CanonMigrationStep[];

  preservesEventHistory: boolean;
  rollbackSupported: boolean;
}

Migration yeni olay uydurmamalı; mevcut gerçekleri yeni şemaya taşımalıdır.

118. Deterministic Simulation

Aynı başlangıç state’i ve aynı girdiler mümkün olduğunca aynı sonucu vermelidir.

Özellikle:

state transition,
decay,
consequence scheduling,
invariant validation

deterministik olmalıdır.

Yaratıcı LLM çıktısı state’in kendisini doğrudan belirlememelidir.

119. Randomness kayıtları

Dünya simülasyonunda rastlantı kullanılacaksa seed veya sonuç kaydedilmelidir.

interface RandomOutcomeRecord {
  eventId: string;
  randomSeed: string;
  ruleId: string;
  result: unknown;
}

Böylece aynı olay yeniden değerlendirildiğinde farklı sonuç çıkmaz.

120. Probability ile Canon ayrımı

Önceden:

Yağmur ihtimali %60.

Olay gerçekleştiğinde:

Yağmur başladı.

Artık bu kanonik gerçektir.

Olasılık yalnızca karar öncesi state’tir; sonuç commit edildikten sonra belirsizlik kalmaz.

121. World State Validation Pipeline
1. Event proposal alınır
2. Timeline authority kontrol edilir
3. Entity version’ları kontrol edilir
4. Preconditions değerlendirilir
5. World rules doğrulanır
6. Capability kontrol edilir
7. Spatial continuity doğrulanır
8. Temporal continuity doğrulanır
9. Knowledge continuity doğrulanır
10. Invariant’lar kontrol edilir
11. Mutations hazırlanır
12. Derived state’ler hesaplanır
13. Causal consequences oluşturulur
14. Transaction atomik commit edilir
15. Event kanona yazılır
16. İlgili motorlara bildirim gönderilir
122. Event Notification

Commit sonrası ilgili motorlar bilgilendirilir.

Memory Engine:
Lila'nın yardım olayı

Emotion Engine:
Tilkinin aldığı yardım

Relationship Engine:
Güven artışı

Narrative Planner:
Gizli yol arc koşulu yaklaştı

World Simulation:
Tilkinin iyileşme süreci başladı

Playback:
Anlık tepki göster

Ancak bu motorlar event’i değiştiremez; yalnızca kendi alanlarında işler.

123. Event Bus ve Canon ayrımı

Event Bus üzerinden geçen her teknik mesaj kanonik olay değildir.

Teknik event:

audio_playback_finished
button_hovered
scene_asset_loaded

Canonical event:

Lila chose the river path
fox accepted help
bridge repaired

Bu iki event sistemi ayrı tutulmalıdır.

124. World State servisleri

Önerilen servis ayrımı:

CanonEventService
WorldStateService
WorldStateTransactionService
CanonAuthorityRegistry
TimelineService
CausalityGraphService
ConsequenceScheduler
ContinuityConstraintService
ContradictionDetectionService
CanonRepairService
WorldRuleService
CapabilityRegistryService
KnowledgeStateService
SpatialStateService
InventoryContinuityService
SnapshotService
CanonQueryService
WorldSimulationCoordinator
NarrativeOpportunityService
125. Veri modeli özeti

Ana yapı:

WorldInstance
├── Timeline
├── CanonicalEvents
├── EntityStates
├── CanonicalFacts
├── TruthRecords
├── WorldRules
├── ContinuityConstraints
├── CausalLinks
├── ScheduledConsequences
├── Snapshots
└── NarrativeOpportunities
126. Motor sınırları

Bu motor:

karakter adına karar vermez,
hikâyeyi planlamaz,
anlatı metni yazmaz,
duyguyu tek başına hesaplamaz,
hangi arc’ın işleneceğini seçmez.

Bu motor:

gerçekliği saklar,
state değişikliklerini doğrular,
olayları commit eder,
neden-sonuçları takip eder,
çelişkileri tespit eder,
timeline’ları ayırır,
diğer motorlara güvenilir state sağlar.
127. Sabit prensipler
Anlatı metni tek başına kanon oluşturmaz.
Kanon yalnızca doğrulanmış ve commit edilmiş olaylardan oluşur.
Event geçmişi ile güncel state ayrı tutulur.
Objective truth ile karakter inancı ayrıdır.
Her önemli state değişiminin bir kaynağı olmalıdır.
Bir olay gerçekleşmeden önce precondition ve world rule kontrolü yapılır.
Bir transaction ya tamamen uygulanır ya hiç uygulanmaz.
Replay varsayılan olarak canonical timeline’ı değiştirmez.
Bilinmeyen bilgi uydurulmaz; UNKNOWN olarak tutulabilir.
Eski gerçekler silinmez, geçerlilik süreleri kapanır.
World state vektörlü ve zamana bağlı olabilir.
Tüm evren sürekli simüle edilmez; relevance-based simulation kullanılır.
On günden sonra varsayılan olarak dünya statik kalır.
Her motor kendi alanının authoritative kaynağıdır.
128. Kabul edebileceğimiz karar seti
World State, Canon, Continuity ve Causality tek gerçeklik çekirdeği altında koordine edilir.
Kanonik olaylar event-sourced bir yapıda tutulur.
World State, olaylardan türetilen güncel durumdur.
Objective Fact, Belief, Suspicion, Rumor ve Misunderstanding ayrı truth türleridir.
State değişiklikleri atomik transaction ile uygulanır.
Precondition, invariant, world rule ve capability doğrulamaları zorunludur.
Causal Graph ve Consequence Scheduler gecikmiş sonuçları yönetir.
Canonical ve Replay timeline’ları birbirinden ayrılır.
Snapshot sistemi hızlı state yeniden oluşturmayı sağlar.
Her çocuk profili varsayılan olarak ayrı bir World Instance kullanır.
Shared story’lerde ortak dünya olayları ile kişisel ilişkiler ayrılır.
Narrative Planner dünyaya emir vermez; dünya state’inden fırsat alır.