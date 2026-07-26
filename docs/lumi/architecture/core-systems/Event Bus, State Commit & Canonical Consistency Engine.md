Event Bus, State Commit & Canonical Consistency Engine

Bu motor, LUMI’deki bütün domain motorlarının aynı dünya üzerinde çelişmeden çalışmasını sağlayan teknik omurgadır.

Temel sorusu şudur:

Bir olay gerçekleştiğinde hangi motor neyi değiştirebilir?
Bu değişiklikler hangi sırayla uygulanır?
Bir adım başarısız olursa dünya nasıl tutarlı kalır?
Aynı işlem iki kez gelirse ne olur?
Geçmiş state yeniden üretilebilir mi?

Temel ilke:

LUMI’de hiçbir anlatı, karar veya sistem sonucu doğrudan dünya state’ini değiştiremez. Her değişiklik doğrulanmış command, domain event ve canonical commit sürecinden geçer.

1. Sistemin görevi

Bu motor şunları yönetir:

command kabulü
command doğrulaması
domain event üretimi
event sıralaması
state ownership
cross-engine koordinasyon
transaction
saga
idempotency
version kontrolü
snapshot
event log
replay
rollback ve compensation
audit
canonical commit
2. Genel akış
User / System Intent
↓
Command
↓
Command Validation
↓
Domain Handler
↓
Proposed Events
↓
Cross-Engine Validation
↓
Commit Plan
↓
Atomic Domain Commits / Saga
↓
Canonical Event Log
↓
Projection Updates
↓
Snapshot
↓
Narrative Output

Önemli sıra:

Önce dünya değişir.
Sonra anlatı bu değişimi açıklar.

Narrative, canonical sonucu oluşturmaz.

Canonical sonucu sunar.

3. Command ve Event ayrımı
Command

Bir şeyin yapılması için gönderilen taleptir.

Tilki’ye feneri ver.
Kuzey Kulesi’ne git.
Köprüyü onarmaya başla.
Dünya zamanını 90 dakika ilerlet.

Command başarısız olabilir.

Domain Event

Gerçekleşmiş ve kanonikleşmiş sonucu temsil eder.

ITEM_TRANSFERRED
TRAVEL_COMPLETED
QUEST_STAGE_STARTED
WORLD_TIME_ADVANCED

Event geçmiş zamanla ifade edilir.

Command niyettir.

Event gerçektir.

4. Command modeli
type DomainCommand<TPayload = unknown> = {
  id: string
  commandType: string

  universeId: string
  aggregateType: string
  aggregateId: string

  actorType:
    | "player"
    | "character"
    | "system"
    | "parent"
    | "admin"

  actorId: string

  payload: TPayload

  expectedAggregateVersion?: number
  expectedWorldVersion?: number

  correlationId: string
  causationId?: string

  issuedAtRealTime: number
}
5. Domain Event modeli
type DomainEvent<TPayload = unknown> = {
  id: string
  eventType: string

  universeId: string
  aggregateType: string
  aggregateId: string

  aggregateVersion: number
  worldVersion: number

  payload: TPayload

  actorId?: string

  correlationId: string
  causationId: string

  occurredAtWorldMinute: number
  recordedAtRealTime: number

  ruleVersion: string
  schemaVersion: number
}
6. Aggregate nedir?

Aggregate, birlikte tutarlı değişmesi gereken domain sınırıdır.

Örnek aggregate’ler:

Character
Inventory
Quest
Location
TravelPlan
WorldEvent
RelationshipPair
StorySession
WorldClock

Bir aggregate kendi invariants kurallarını korur.

Örnek:

Inventory Aggregate:
aynı item iki owner’da bulunamaz.

Quest Aggregate:
completed quest tekrar active olamaz.

WorldClock Aggregate:
world time geriye gidemez.
7. Aggregate Root

Her aggregate tek giriş noktası üzerinden değiştirilmelidir.

interface AggregateRoot {
  id: string
  version: number

  handle(command: DomainCommand): DomainEvent[]
  apply(event: DomainEvent): void
}

handle() event önerir.

apply() event’i state’e uygular.

8. State ownership

Her kanonik state alanının tek otoriter sahibi olmalıdır.

Character location:
Map & Spatial Engine

Item ownership:
Inventory Engine

Quest progress:
Quest Engine

World time:
Time Engine

Emotion vector:
Emotion Engine

Relationship state:
Relationship Engine

Beliefs:
Belief Engine

Memories:
Memory Engine

World event lifecycle:
World Event Engine

Başka motorlar bu state’i doğrudan değiştiremez.

9. State ownership registry
type StateOwnershipRule = {
  statePath: string
  ownerDomain: string

  writableByCommands: string[]
  readableByDomains: string[]
}

Örnek:

statePath:
inventory.items.*.ownerId

ownerDomain:
inventory

writableByCommands:
TRANSFER_ITEM
STORE_ITEM
OBTAIN_ITEM
10. Cross-domain write yasağı

Yanlış:

Quest Engine:
item.quantity = item.quantity - 1

Doğru:

Quest Engine:
CONSUME_QUEST_ITEM command gönderir.

Inventory Engine:
doğrular ve ITEM_CONSUMED event’i üretir.

Bu ayrım domain sınırlarını korur.

11. Command Handler
type CommandHandler<TCommand, TResult> = {
  commandType: string

  validate(
    command: TCommand,
    context: CommandContext
  ): ValidationFinding[]

  execute(
    command: TCommand,
    context: CommandContext
  ): Promise<TResult>
}
12. Command Context
type CommandContext = {
  worldSnapshot: WorldSnapshot

  actorPermissions: string[]
  safetyProfileId: string

  activeRuleVersions: Record<string, string>

  idempotencyState: IdempotencyState
}
13. Command validation katmanları
1. Schema validation
2. Authorization validation
3. Aggregate version validation
4. Domain rule validation
5. Cross-engine feasibility
6. Safety validation
7. Player agency validation
8. Canonical consistency validation

Command ancak bütün zorunlu kontrollerden geçerse işlenir.

14. Validation Finding
type ValidationFinding = {
  code: string

  severity:
    | "info"
    | "warning"
    | "error"
    | "critical"

  domain: string
  entityIds: string[]

  message: string
  childFacingFallbackIntent?: string
}

error ve critical commit’i engeller.

15. Proposed Event

Handler doğrudan event log’a yazmamalıdır.

Önce proposed event üretir.

type ProposedDomainEvent = Omit<
  DomainEvent,
  | "id"
  | "aggregateVersion"
  | "worldVersion"
  | "recordedAtRealTime"
>

Proposed event henüz kanonik değildir.

16. Commit Plan

Bir command birden fazla aggregate’i etkileyebilir.

type CommitPlan = {
  id: string

  commandId: string
  correlationId: string

  aggregateOperations: AggregateCommitOperation[]

  proposedEvents: ProposedDomainEvent[]

  validationFindings: ValidationFinding[]

  commitMode:
    | "single_aggregate"
    | "atomic_multi_aggregate"
    | "saga"

  status:
    | "planned"
    | "validated"
    | "committing"
    | "committed"
    | "failed"
    | "compensated"
}
17. Single aggregate transaction

Örnek:

Bir item’in condition durumunu değiştirmek.

Yalnızca Inventory Aggregate etkileniyorsa tek transaction yeterlidir.

Akış:

load aggregate
↓
version check
↓
handle command
↓
validate events
↓
append events
↓
update projection
↓
commit
18. Multi-aggregate transaction

Örnek:

Lumi feneri Tilki’ye verdi.

Etkilenebilecek alanlar:

inventory transfer,
memory candidate,
relationship context,
quest progress.

Ancak hepsi aynı anda hard atomic olmak zorunda değildir.

Kritik canonical çekirdek:

Inventory transfer

atomik olmalıdır.

Diğer motorlar event üzerinden tepki verebilir.

19. Canonical core ve derived effects

Bir olayın etkilerini ikiye ayıralım.

Canonical core

Olayın gerçekleşmiş sayılması için zorunlu değişiklikler.

ITEM_TRANSFERRED
Derived effects

Bu olaydan sonra diğer motorların değerlendirdiği sonuçlar.

MEMORY_CANDIDATE_CREATED
RELATIONSHIP_EVIDENCE_RECORDED
QUEST_OBJECTIVE_EVALUATED

Derived effect başarısız olursa ana transfer geri alınmak zorunda olmayabilir.

Retry edilebilir.

20. Event reaction
type EventReactionHandler = {
  sourceEventType: string
  targetDomain: string

  reactionMode:
    | "synchronous_required"
    | "asynchronous_reliable"
    | "best_effort"

  handle(
    event: DomainEvent,
    context: ReactionContext
  ): Promise<ReactionResult>
}
21. Reaction mode
Synchronous required

Ana commit tamamlanmadan başarıyla uygulanmalıdır.

Örnek:

ITEM_TRANSFERRED
+
aynı item’in eski owner’dan çıkarılması

Aslında aynı Inventory transaction içinde olmalıdır.

Asynchronous reliable

Mutlaka işlenir ama retry yapılabilir.

Örnek:

Memory candidate oluşturma
Quest objective değerlendirme
Best effort

Başarısız olması world truth’u bozmaz.

Örnek:

analitik metriği
geliştirici telemetrisi
22. Event Bus
interface EventBus {
  publish(events: DomainEvent[]): Promise<void>

  subscribe(
    eventType: string,
    handler: EventReactionHandler
  ): void
}

Event Bus:

event sıralamasını,
delivery durumunu,
retry,
dead-letter,
handler idempotency

yönetmelidir.

23. Event Envelope
type EventEnvelope = {
  event: DomainEvent

  deliveryId: string
  partitionKey: string

  sequenceNumber: number

  attemptCount: number
  firstPublishedAt: number
  lastAttemptAt?: number
}
24. Partition key

Aynı aggregate’e ait event’ler sıralı işlenmelidir.

partitionKey =
universeId + aggregateType + aggregateId

Örnek:

universe-1:inventory:lumi

Bu partition içindeki event sırası korunur.

25. Event ordering

Global tek sıra zorunlu değildir.

Ama şu sıralar korunmalıdır:

aggregate event order
causation chain order
world version commit order

Örnek:

ITEM_OBTAINED
↓
ITEM_EQUIPPED

ters işlenemez.

26. Global World Version

Her canonical commit dünya version’ını ilerletebilir.

type WorldVersion = number

Örnek:

version 144
→ command işlendi
→ version 145

Bu, bütün sistemin hangi canonical snapshot’a ait olduğunu belirler.

27. Aggregate Version ve World Version ayrımı
Aggregate Version:
belirli entity kaç kez değişti?

World Version:
evren genelinde kaç canonical commit oldu?

Örnek:

Tilki Inventory Aggregate Version:
12

World Version:
2048
28. Optimistic locking

Command şu state üzerinden hazırlanmış olabilir:

expectedAggregateVersion = 12

Ama commit sırasında aggregate version 13 olmuşsa:

VERSION_CONFLICT

oluşur.

Eski state’e göre işlem uygulanmaz.

29. Version conflict çözümü

Seçenekler:

reload and reevaluate
reject with alternative
automatic merge
manual pending decision

Her command merge edilemez.

Örnek:

İki farklı kişi aynı elmayı kullanmak istiyor.

İkinci command yeniden değerlendirilmelidir.

30. Automatic merge sınırı

Güvenli merge örnekleri:

iki farklı player map note,
birbirinden bağımsız kozmetik preference,
ayrı character memory metadata.

Merge edilmemesi gerekenler:

item ownership,
quest stage,
character location,
world time,
unique reward.
31. Idempotency

Aynı command ağ retry nedeniyle tekrar gelebilir.

Aynı command ikinci kez yeni event üretmemelidir.

type IdempotencyRecord = {
  commandId: string
  commandType: string

  status:
    | "processing"
    | "completed"
    | "failed"

  resultingEventIds: string[]
  resultReferenceId?: string

  createdAt: number
}
32. Idempotency sonucu

Aynı commandId tekrar geldiğinde:

completed:
önceki sonuç döndürülür.

processing:
işlem sonucu bekleyen state döndürülür.

failed:
retry politikasına göre yeniden işlenir veya aynı hata döndürülür.
33. Semantic idempotency

Bazen farklı command ID ile aynı semantik işlem gelebilir.

Örnek:

Aynı quest reward iki farklı retry zincirinden verilmeye çalışılıyor.

Bunun için domain-level unique key gerekir.

type DomainUniquenessKey = {
  domain: string
  key: string
}

Örnek:

quest-reward:
questId + rewardId + completionEventId
34. Event deduplication

Event handler aynı event’i iki kez alabilir.

Her handler işlediği event’i kaydetmelidir.

type EventConsumptionRecord = {
  handlerId: string
  eventId: string
  processedAt: number
}

Aynı handler/event çifti tekrar state değiştirmez.

35. At-least-once delivery

Event Bus için pratik varsayım:

Event en az bir kez teslim edilir.

Tam bir kez teslim garantisi yerine:

idempotent handler
+
deduplication

kullanmak daha güvenlidir.

36. Outbox pattern

Database transaction ile event publish arasında boşluk oluşmamalıdır.

Yanlış:

state commit edildi
event publish başarısız oldu

Bunu önlemek için outbox kullanılır.

type OutboxRecord = {
  id: string
  event: DomainEvent

  status:
    | "pending"
    | "published"
    | "failed"

  attemptCount: number
}

State ve outbox aynı transaction’da yazılır.

37. Outbox akışı
BEGIN DB TRANSACTION

- aggregate events append
- canonical state update
- outbox records create
- world version update

COMMIT

↓

Outbox Publisher

↓

Event Bus

Böylece event kaybolmaz.

38. Inbox pattern

Consumer tarafında da inbox kullanılabilir.

type InboxRecord = {
  handlerId: string
  eventId: string

  status:
    | "received"
    | "processed"
    | "failed"
}

Bu, duplicate delivery’yi güvenli hâle getirir.

39. Saga nedir?

Bir işlem birden fazla bağımsız domain transaction gerektiriyorsa saga kullanılır.

Örnek:

Karakter seyahat ediyor,
beraberinde item taşıyor,
quest ilerliyor,
world time değişiyor.

Bu tek database transaction olmayabilir.

Saga, adımları ve başarısızlık telafisini yönetir.

40. Saga modeli
type SagaDefinition = {
  id: string
  sagaType: string

  steps: SagaStepDefinition[]
}
type SagaInstance = {
  id: string
  sagaType: string

  correlationId: string

  currentStepIndex: number

  status:
    | "planned"
    | "running"
    | "waiting"
    | "completed"
    | "compensating"
    | "compensated"
    | "failed"

  completedStepIds: string[]
  compensationStepIds: string[]
}
41. Saga Step
type SagaStepDefinition = {
  id: string

  commandType: string
  targetDomain: string

  required: boolean
  compensationCommandType?: string

  timeoutPolicy?: string
  retryPolicy?: string
}
42. Travel saga örneği
1. Validate route
2. Reserve travel resources
3. Advance world time
4. Move party
5. Transfer carried spatial context
6. Update exploration state
7. Evaluate quest progress
8. Emit arrival event
43. Travel saga failure örneği

Diyelim:

zaman ilerledi,
fakat destination state version conflict verdi.

Compensation gerekebilir:

- time advance geri alınmazsa ne olacak?

Bu yüzden kritik tasarım:

Zaman ilerlemesi ve location movement aynı canonical travel resolution içinde birlikte planlanmalıdır.

Mümkünse aynı domain transaction veya tek travel aggregate üzerinden commit edilmelidir.

44. Compensation nedir?

Compensation teknik rollback ile aynı şey değildir.

Rollback:

Transaction commit edilmeden geri alma.

Compensation:

Commit edilmiş bir sonucu yeni kanonik olaylarla telafi etme.

Örnek:

ITEM_RESERVED

sonrası crafting başarısız oldu.

Compensation:

ITEM_RESERVATION_RELEASED

event’idir.

Geçmiş silinmez.

45. Compensation kuralları

Her saga adımı için mümkünse şu tanımlanmalıdır:

Forward action
Compensation action
Compensation safety
Irreversibility
type CompensationPolicy = {
  forwardEventType: string
  compensationCommandType?: string

  reversible: boolean
  requiresManualReview: boolean
}
46. Geri döndürülemez işlemler

Bazı işlemler kolayca telafi edilemez:

benzersiz item tüketimi,
kalıcı world transformation,
önemli relationship confession,
ana quest completion,
yeni bölge kanonikleştirme.

Bu işlemler commit zincirinin sonunda yapılmalıdır.

Önce bütün hazırlıklar doğrulanmalıdır.

47. Irreversible step ordering
1. Read-only validation
2. Soft reservation
3. Reversible state changes
4. Cross-domain confirmation
5. Irreversible canonical change
6. Derived effects

Bu sıra failure riskini azaltır.

48. Reservation

Uzun işlem sırasında kaynaklar reserve edilebilir.

Örnek:

item,
rota,
quest reward,
player decision slot,
event capacity.
type CanonicalReservation = {
  id: string

  resourceType: string
  resourceId: string

  ownerOperationId: string

  status:
    | "active"
    | "consumed"
    | "released"
    | "expired"

  createdAtWorldMinute: number
}
49. Reservation timeout

Teknik hata nedeniyle reservation sonsuza kadar kalmamalıdır.

Ancak world time timeout ile gerçek time timeout ayrılmalıdır.

Teknik reservation için real-time lease kullanılabilir.

type ReservationLease = {
  expiresAtRealTime: number
  renewable: boolean
}
50. Event sourcing

Event sourcing yaklaşımında state’in ana kaynağı event log’dur.

Initial State
+
Event 1
+
Event 2
+
Event 3
=
Current State

Avantajları:

audit,
replay,
geçmiş açıklaması,
debugging,
deterministic test,
snapshot restore.
51. Tam event sourcing gerekli mi?

LUMI’de bütün sistem için yüzde yüz event sourcing zorunlu olmayabilir.

Önerilen hibrit yaklaşım:

Canonical domain events:
kalıcı ve otoriter.

Current state projections:
hızlı okuma için.

Snapshots:
hızlı restore için.

Bu, hem güvenilirlik hem performans sağlar.

52. Event Store
interface EventStore {
  append(
    streamId: string,
    expectedVersion: number,
    events: DomainEvent[]
  ): Promise<AppendResult>

  readStream(
    streamId: string,
    fromVersion?: number
  ): Promise<DomainEvent[]>

  readByCorrelationId(
    correlationId: string
  ): Promise<DomainEvent[]>
}
53. Event Stream

Örnek stream’ler:

world/{universeId}
character/{characterId}
inventory/{inventoryId}
quest/{questId}
location/{locationId}
world-event/{eventId}
54. Event schema versioning

Event yapıları zamanla değişecektir.

type EventSchemaMetadata = {
  eventType: string
  schemaVersion: number
}

Eski event’ler silinmez.

Upcaster ile yeni şekle dönüştürülür.

55. Event Upcaster
type EventUpcaster = {
  eventType: string
  fromVersion: number
  toVersion: number

  upcast(payload: unknown): unknown
}

Örnek:

Eski event:

{
  itemId,
  newOwnerId
}

Yeni event:

{
  itemInstanceId,
  fromOwner,
  toOwner,
  transferType
}
56. Rule versioning

Aynı event farklı kural sürümleriyle farklı sonuç üretmemelidir.

Bu nedenle event üzerinde:

ruleVersion

saklanmalıdır.

Replay sırasında historical rule version kullanılabilir veya migration uygulanabilir.

57. Projection

Projection, event’lerden oluşturulan okunabilir state görünümüdür.

Örnek:

CurrentCharacterView
CurrentInventoryView
QuestJournalView
MapView
ParentDashboardView
type ProjectionHandler = {
  projectionName: string
  handledEventTypes: string[]

  apply(
    currentProjection: unknown,
    event: DomainEvent
  ): unknown
}
58. Projection state kanonik midir?

Projection türetilmiş state’tir.

Bozulursa event log’dan yeniden oluşturulabilir.

Canonical kaynak:

event log + snapshot

Projection performans ve arayüz içindir.

59. Projection consistency

İki model kullanılabilir:

Strong consistency

Commit sonrası projection hemen güncellenir.

Kritik kullanıcı ekranları için uygundur.

Eventual consistency

Projection kısa gecikmeyle güncellenir.

Analytics veya secondary views için uygundur.

60. Çocuk arayüzünde consistency

Çocuk bir item verdiğinde arayüz hemen güncellenmelidir.

Şu durum olmamalıdır:

Hikâye:
Tilki’ye verdin.

Envanter:
item hâlâ sende.

Bu nedenle core player-facing projections synchronous güncellenmelidir.

61. Snapshot

Uzun event stream’leri her okumada baştan işlenmemelidir.

type AggregateSnapshot<TState = unknown> = {
  aggregateType: string
  aggregateId: string

  aggregateVersion: number
  worldVersion: number

  state: TState

  createdAtRealTime: number
  snapshotSchemaVersion: number
}
62. Snapshot sıklığı

Snapshot şu koşullarda alınabilir:

her 50 veya 100 event,
story checkpoint,
offline simulation commit,
büyük world event sonucu,
quest completion,
uygulama sürüm migration’ı öncesi.
63. World Snapshot

Bütün dünya için tek dev snapshot yerine domain snapshot’ları daha güvenlidir.

Ancak bir story generation için tutarlı birleşik snapshot gerekir.

type WorldSnapshot = {
  universeId: string
  worldVersion: number

  clock: WorldClock
  characters: CharacterState[]
  inventories: InventoryState[]
  quests: QuestState[]
  locations: LocationState[]
  activeWorldEvents: WorldEvent[]

  generatedAtRealTime: number
}

Bu snapshot aynı worldVersion sınırına ait olmalıdır.

64. Consistent snapshot read

Snapshot oluşturulurken:

World Version = 500

seçilir.

Bütün projection’lar en az 500’e kadar güncel olmalıdır.

Farklı version’lardan veri karıştırılmamalıdır.

65. Story generation snapshot

Story Planner ve Narrative Engine için immutable snapshot hazırlanır.

type StoryGenerationSnapshot = {
  worldVersion: number
  storySessionId: string

  canonicalContext: unknown
  playerKnowledgeContext: unknown
  forbiddenKnowledge: unknown

  expiresOnWorldVersionChange: boolean
}
66. Stale story output

Narrative üretilirken world version değişirse:

story output stale

olabilir.

Commit öncesi tekrar doğrulanmalıdır.

type StoryOutputValidation = {
  basedOnWorldVersion: number
  currentWorldVersion: number

  stillValid: boolean
  invalidatedFacts: string[]
}
67. Narrative commit ayrımı

Narrative metni iki türe ayrılabilir:

Pre-commit narrative proposal

Henüz gerçekleşmemiş eylemi anlatan taslak.

Post-commit canonical narrative

Commit edilmiş olayları anlatan kesin çıktı.

En güvenli yaklaşım:

Planner planı oluşturur
→ actions commit edilir
→ narrator committed events’i yazar
68. Seçim sahneleri

Oyuncuya seçim sunulurken henüz sonuç commit edilmez.

Choice Offered

event’i commit edilebilir.

Oyuncu seçince:

Choice Selected
↓
Action Command
↓
Canonical result

oluşur.

69. Choice event modeli
type ChoiceOfferedEventPayload = {
  choiceSetId: string

  optionIds: string[]
  playerGateId: string

  basedOnWorldVersion: number

  expiresOnStateChange: boolean
}
70. Stale choice

Oyuncu uzun süre sonra eski bir seçeneğe basabilir.

Örneğin:

Tekneyle git

ama tekne artık uygun değil.

Sistem:

command’i körlemesine uygulamaz,
world state’i yeniden kontrol eder,
seçimi uyarlayabilir,
yeni alternatif sunabilir.
71. Choice revalidation
type ChoiceRevalidationResult = {
  originalChoiceId: string

  status:
    | "valid"
    | "valid_with_adjustment"
    | "invalid"

  replacementChoiceIds: string[]
  explanationIntent?: string
}
72. Canonical consistency

Bir commit yalnızca kendi aggregate kurallarını değil, dünya çapındaki invariants kurallarını da korumalıdır.

Örnek:

Karakter location değişti.
Ama taşıdığı container eski location’da kaldı.

Aggregate’ler ayrı ayrı geçerli görünse de world consistency bozulur.

73. Cross-engine invariant registry
type CrossEngineInvariant = {
  id: string
  description: string

  involvedDomains: string[]

  validate(
    snapshot: WorldSnapshot,
    proposedDeltas: DomainDelta[]
  ): ValidationFinding[]
}
74. Temel cross-engine invariants
1. Karakter tek location zincirinde bulunur.
2. Item tek ownership zincirinde bulunur.
3. Character carried item location’ı character location’dan türetilir.
4. Completed quest reward bir kez verilir.
5. Player-gated event otomatik tamamlanmaz.
6. World time bütün event’lerden ileridedir veya eşittir.
7. Narrative-visible bilgi player knowledge ile uyumludur.
8. Destroyed item aktif quest requirement olamaz; recovery path gerekir.
9. NPC bulunduğu yerden erişemediği item’i kullanamaz.
10. Hidden route keşfedilmeden travel plan’da seçilemez.
75. Invariant severity

Bazı hatalar commit’i tamamen engeller.

critical:
item duplicate
character two locations
world time reverse

error:
quest reward duplicate
hidden knowledge leak

warning:
recap fazla ayrıntılı
story callback tekrar riski
76. Canonical Commit Engine
interface CanonicalCommitEngine {
  plan(
    command: DomainCommand,
    snapshot: WorldSnapshot
  ): Promise<CommitPlan>

  validate(
    plan: CommitPlan,
    snapshot: WorldSnapshot
  ): Promise<ValidationFinding[]>

  commit(
    plan: CommitPlan
  ): Promise<CanonicalCommitResult>
}
77. Canonical Commit Result
type CanonicalCommitResult = {
  commitId: string

  commandId: string
  correlationId: string

  previousWorldVersion: number
  resultingWorldVersion: number

  committedEventIds: string[]
  triggeredReactionIds: string[]

  status:
    | "committed"
    | "partially_committed"
    | "compensated"
    | "rejected"

  findings: ValidationFinding[]
}

partially_committed yalnızca canonical core başarılı, derived effect bekliyorsa kullanılmalıdır.

78. Commit phases
Phase 1:
Command acceptance

Phase 2:
Domain proposal

Phase 3:
Cross-engine validation

Phase 4:
Reservation

Phase 5:
Canonical core commit

Phase 6:
Outbox write

Phase 7:
Projection update

Phase 8:
Reliable reactions

Phase 9:
Narrative generation

Phase 10:
Audit and snapshot
79. Failed commit

Commit başarısız olursa:

proposed event’ler canonical sayılmaz,
narrative sonuç üretilmez,
reservation’lar serbest bırakılır,
retry uygunluğu değerlendirilir,
child-facing safe fallback hazırlanır.
80. Child-facing failure

Teknik hata:

OPTIMISTIC_LOCK_CONFLICT

çocuğa gösterilmemelidir.

Uygun fallback:

Tam o sırada durum biraz değişmişti. Lumi yeniden baktığında önünde iki güvenli seçenek vardı.

Sistem güncel state’e göre seçenekleri yeniden üretir.

81. Retry policy
type RetryPolicy = {
  maximumAttempts: number

  backoffType:
    | "fixed"
    | "exponential"

  retryableErrorCodes: string[]
}

Retry edilebilir:

geçici database hatası,
event bus erişim hatası,
projection gecikmesi.

Retry edilmemesi gereken:

domain rule violation,
safety rejection,
stale invalid choice,
duplicate unique reward.
82. Dead Letter Queue

Bir event tekrar tekrar işlenemiyorsa dead-letter queue’ya alınır.

type DeadLetterRecord = {
  eventId: string
  handlerId: string

  failureCode: string
  attemptCount: number

  lastFailureAt: number
  requiresManualReview: boolean
}

Canonical event kaybolmaz.

Derived effect daha sonra tekrar işlenebilir.

83. Failed derived effect

Örnek:

ITEM_GIFTED commit edildi.
Memory Engine geçici olarak çalışmadı.

Item transfer geri alınmaz.

MEMORY_CANDIDATE reaction retry edilir.

Bu, domainler arası gereksiz rollback’i engeller.

84. Failed critical reaction

Bazı reaction’lar kritik olabilir.

Örnek:

QUEST_COMPLETED

sonrasında unique reward reservation zorunluysa, reward planı quest completion commit’inden önce doğrulanmalıdır.

Kritik reaction sonradan bırakılmamalıdır.

85. Audit Trail

Her command ve commit zinciri açıklanabilir olmalıdır.

type AuditRecord = {
  id: string

  universeId: string

  commandId: string
  commitId?: string

  actorId: string
  actorType: string

  correlationId: string

  inputSummary: string
  decisionSummary: string

  evaluatedRuleIds: string[]
  validationFindingCodes: string[]

  resultingEventIds: string[]

  createdAtRealTime: number
}
86. Explainability

Geliştirici şu sorulara cevap verebilmelidir:

Bu item neden Tilki’de?
Quest neden tamamlandı?
NPC neden bu kararı verdi?
Festival neden başlamadı?
Bu seçenek neden reddedildi?
World version neden değişti?

Cevap causation chain üzerinden bulunur.

87. Causation chain
PLAYER_CHOICE_SELECTED
↓
TRANSFER_ITEM_COMMAND
↓
ITEM_TRANSFERRED
↓
QUEST_OBJECTIVE_EVALUATED
↓
QUEST_OBJECTIVE_COMPLETED
↓
MEMORY_CANDIDATE_CREATED

Tüm zincir aynı correlationId taşıyabilir.

88. Correlation ve causation ayrımı
Correlation ID:
aynı genel işlem zinciri.

Causation ID:
bu event’i doğrudan hangi command veya event oluşturdu?

Örnek:

Bir hikâye seçiminden doğan 12 event:
aynı correlationId

Her event:
kendi doğrudan causationId’sine sahip
89. Trace view
type CanonicalTrace = {
  correlationId: string

  commands: DomainCommand[]
  events: DomainEvent[]
  reactions: ReactionResult[]
  commits: CanonicalCommitResult[]

  orderedCausationGraph: unknown
}
90. Replay

Replay, belirli snapshot’tan sonraki event’leri tekrar uygulayarak state oluşturur.

Snapshot v400
+
events 401–475
=
State v475

Replay sırasında:

LLM çağrılmaz,
dış servis sonucu yeniden alınmaz,
onaylanmış structured result kullanılır,
deterministic rule version korunur.
91. External result persistence

Örnek:

LLM yeni item adı önerdi.

Canonical event içine yalnızca onaylanmış sonuç yazılır.

type ApprovedCreativeArtifact = {
  artifactType: string

  structuredCanonicalData: unknown
  presentationText?: string

  sourceModelMetadata?: {
    provider: string
    model: string
    promptVersion: string
  }
}

Replay sırasında LLM yeniden çağrılmaz.

92. Rebuild projections

Projection bozulduğunda:

pause projection consumer
↓
load snapshot
↓
replay events
↓
verify checksum
↓
swap projection
↓
resume

Canonical event stream değişmez.

93. State checksum

Replay doğrulaması için checksum kullanılabilir.

type StateChecksum = {
  worldVersion: number
  domain: string

  checksum: string
}

Aynı event’ler aynı state checksum üretmelidir.

94. Replay mismatch

Aynı snapshot ve event’ler farklı state üretirse:

determinism violation

oluşur.

Olası nedenler:

tarih/saat doğrudan kullanıldı,
seed’siz randomness,
rule version eksik,
unstable ordering,
dış servis tekrar çağrıldı,
mutable shared state.
95. Canonical history

Geçmiş event’ler normal kullanımda silinmemelidir.

Yanlış bir event oluştuysa:

düzeltme event’i,
compensation event’i,
migration event’i

eklenir.

Bu audit bütünlüğünü korur.

96. Event correction
type EventCorrection = {
  incorrectEventId: string

  correctionType:
    | "compensate"
    | "supersede"
    | "annotate"

  correctionEventId: string
  reason: string
}

Geçmiş gerçekliği yok etmek yerine düzeltme zinciri oluşturulur.

97. Parent intervention

Ebeveyn bazı state’leri değiştirebilir:

içerik sınırı,
karakteri gizleme,
hikâye sıfırlama,
world event’i duraklatma.

Bunlar doğrudan DB edit’i olmamalıdır.

Command ve event ile yapılmalıdır.

Örnek:

PARENT_CONTENT_RULE_UPDATED
WORLD_EVENT_PAUSED_BY_PARENT
98. Reset işlemleri

Tam dünya reset’i de event ve snapshot süreciyle yönetilmelidir.

Seçenekler:

new universe
branch from checkpoint
soft reset
archive old universe

Geçmişi sessizce silmek yerine yeni canonical branch açmak daha güvenlidir.

99. World branching

İleri sürümde farklı seçim yollarını test etmek için branch kullanılabilir.

type WorldBranch = {
  id: string
  parentBranchId?: string

  forkedFromWorldVersion: number

  status:
    | "active"
    | "preview"
    | "archived"
}

MVP için zorunlu değildir.

100. Preview branch

Story Planner bir seçeneğin sonucunu commit etmeden simüle etmek isterse preview branch kullanılabilir.

Ancak çocuk deneyiminde gelecek spoiler’ı gösterilmez.

Bu daha çok:

test,
validation,
developer tools

içindir.

101. Canonical ve non-canonical ayrımı

Her üretilen şey canonical değildir.

type Canonicality =
  | "proposal"
  | "preview"
  | "pending"
  | "canonical"
  | "superseded"
  | "rejected"

LLM çıktısı varsayılan olarak:

proposal

durumundadır.

102. Pending state

Bazı işlemler henüz tamamlanmamış olabilir.

Örnek:

Crafting inputs reserved
Craft result pending

Pending state canonical olarak var olabilir.

Ama final sonucu temsil etmez.

103. Canonical commit gate

Bir proposal’ın canonical olabilmesi için:

schema valid
domain valid
safety valid
agency valid
cross-engine valid
version valid
idempotency valid

olmalıdır.

104. Event authorization

Her actor her command’i çalıştıramaz.

type CommandAuthorizationRule = {
  commandType: string

  allowedActorTypes: string[]

  requiredPermissions: string[]
  ownershipConditions?: string[]
}

Örnek:

PLAYER:
kendi karakterinin loadout’unu seçebilir.

NPC:
kendi item’ini verebilir.

PARENT:
safety ayarı değiştirebilir.

LLM:
hiçbir canonical command’i doğrudan çalıştıramaz.
105. LLM authority sınırı

LLM yalnızca:

structured proposal,
narrative,
description,
naming,
optional alternatives

üretebilir.

LLM şunları yapamaz:

event log’a yazmak,
world version ilerletmek,
quest tamamlamak,
item transfer etmek,
NPC kararını kesinleştirmek,
safety rule atlamak.
106. Tool boundary

LLM’nin domain tool’ları çağırması gerekirse:

LLM proposal
↓
orchestrator command builder
↓
authorization
↓
validation
↓
domain command

LLM doğrudan database yazmaz.

107. Command origin
type CommandOrigin =
  | "player_input"
  | "npc_decision"
  | "story_planner"
  | "world_simulation"
  | "parent_control"
  | "system_recovery"
  | "admin_tool"

Her command origin audit’te saklanmalıdır.

108. Command priority

Aynı anda gelen command’ler için priority gerekir.

1. Safety commands
2. Parent controls
3. Active player commands
4. Canonical recovery
5. NPC decisions
6. Offline simulation
7. Background maintenance

Offline simulation aktif oyuncu command’ini geçmemelidir.

109. Command Queue
type CommandQueueItem = {
  command: DomainCommand

  priority: number
  enqueuedAt: number

  partitionKey: string
}

Aynı aggregate için sıralı işlenir.

110. Active session lock

Oyuncu aktif session başlattığında offline simulation commit’i engellenebilir.

type UniverseActivityLease = {
  universeId: string

  holderType:
    | "active_session"
    | "offline_simulation"
    | "maintenance"

  holderId: string
  expiresAtRealTime: number
}

Bu, çifte ilerlemeyi önler.

111. Lease tek başına yeterli değildir

Lease bozulabilir veya süresi bitebilir.

Bu nedenle yine:

world version,
optimistic locking,
idempotency

zorunludur.

112. Projection lag

Event commit edilmiş ama projection henüz güncellenmemiş olabilir.

Kritik UI işlemlerinde:

read-your-writes

garantisi sağlanmalıdır.

Kullanıcı kendi yaptığı işlemi hemen görmelidir.

113. Read-your-writes

Command sonucu:

type CommandExecutionResult = {
  resultingWorldVersion: number
  committedEvents: DomainEvent[]

  updatedCoreView?: unknown
}

UI gerekiyorsa doğrudan bu güncel core view’u kullanabilir.

114. Consistency levels
type ReadConsistency =
  | "eventual"
  | "session"
  | "strong"
  | "snapshot"
Eventual

Analytics.

Session

Kullanıcının kendi son işlemleri görünür.

Strong

Kritik command doğrulaması.

Snapshot

Story generation için sabit dünya görünümü.

115. Canonical error taxonomy
type CanonicalErrorCode =
  | "SCHEMA_INVALID"
  | "UNAUTHORIZED_COMMAND"
  | "DOMAIN_RULE_VIOLATION"
  | "SAFETY_REJECTED"
  | "PLAYER_AGENCY_VIOLATION"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "RESERVATION_CONFLICT"
  | "CROSS_ENGINE_INVARIANT_FAILED"
  | "EVENT_APPEND_FAILED"
  | "PROJECTION_UPDATE_FAILED"
  | "SAGA_FAILED"
  | "REPLAY_MISMATCH"
116. Error disposition
type ErrorDisposition =
  | "retry"
  | "replan"
  | "offer_alternative"
  | "compensate"
  | "pause_for_review"
  | "reject"
117. Safe degradation

Bir secondary subsystem çalışmıyorsa bütün hikâye durmak zorunda değildir.

Örnek:

Analytics çalışmıyor:
hikâye devam eder.

Memory projection gecikiyor:
canonical event saklanır, reaction retry edilir.

Inventory validation çalışmıyor:
item action commit edilmez.

Kritik ve ikincil sistem ayrımı açık olmalıdır.

118. Critical domain classification
type DomainCriticality =
  | "canonical_core"
  | "canonical_derived"
  | "presentation"
  | "observability"
Canonical core

Commit için zorunlu.

Canonical derived

Mutlaka eventual olarak işlenmeli.

Presentation

Yeniden üretilebilir.

Observability

Kaybı istenmez ama world truth’u etkilemez.

119. Canonical core örnekleri
WorldClock
Character location
Item ownership
Quest state
World event lifecycle
Player choice state
120. Presentation örnekleri
Narrative paragraph
Illustration prompt
Child-friendly recap wording
Map visual rendering
Audio cue

Presentation kaybolursa canonical event’lerden yeniden üretilebilir.

121. Audit privacy

Audit log:

gereksiz kişisel veri içermemeli,
çocuğun serbest metnini sınırsız saklamamalı,
güvenli structured intent tercih etmeli,
parent/admin erişimi ayrılmalı.
122. Data retention

Event log canonical history için uzun süre saklanabilir.

Ama:

ham LLM prompt’ları,
ses kayıtları,
kişisel giriş metinleri,
debug payload’ları

ayrı retention politikasına sahip olmalıdır.

123. Child input canonicalization

Çocuk:

“Tilkiye ışığı verelim.”

dediğinde ham metin doğrudan event olmaz.

Akış:

Raw input
↓
Intent extraction
↓
Entity resolution
↓
Structured command proposal
↓
Confirmation if materially ambiguous
↓
Domain command

Canonical event:

ITEM_TRANSFERRED

olur.

124. Ambiguity handling

Birden fazla “ışık” item’i varsa sistem tahmin ederek yanlış item seçmemelidir.

Ancak gereksiz soru da sormamalıdır.

Önce:

sahne context,
equipped item,
recent mention,
target relevance

ile çözüm aranır.

Yeterli güven yoksa seçenek sunulur.

125. Entity reference resolution
type EntityResolutionResult = {
  rawReference: string

  candidateEntityIds: string[]
  selectedEntityId?: string

  confidence: number

  requiresPlayerChoice: boolean
}
126. Canonical naming

Event içinde görünen isim yerine ID tutulur.

Yanlış:

itemName = "Mavi Anahtar"

Doğru:

itemInstanceId = item-194

İsim localization ve current knowledge state’e göre projection’dan üretilir.

127. Domain Event Registry
type DomainEventDefinition = {
  eventType: string
  ownerDomain: string

  schemaVersion: number

  canonicality:
    | "core"
    | "derived"

  allowedProducers: string[]
  expectedConsumers: string[]
}

Bu registry sistemin sözlüğüdür.

128. Command Registry
type CommandDefinition = {
  commandType: string

  ownerDomain: string
  handlerId: string

  schemaVersion: number

  authorizationRuleIds: string[]
  validationRuleIds: string[]

  idempotencyScope: string
}
129. Rule Registry entegrasyonu

Daha önce tanımladığımız bütün deterministic kurallar burada version’lanmalıdır.

type RuleExecutionRecord = {
  ruleId: string
  ruleVersion: string

  inputHash: string
  result:
    | "pass"
    | "fail"
    | "not_applicable"
}
130. Event migration

Sistem sürümü değiştiğinde:

eski event şeması korunabilir,
upcaster uygulanabilir,
projection baştan kurulabilir,
gerekirse migration event’i eklenebilir.

Event log üzerinde sessiz toplu rewrite risklidir.

131. Backward compatibility

Yeni consumer eski event sürümlerini okuyabilmelidir.

En az:

current version
+
önceki desteklenen event versions

için upcaster bulunmalıdır.

132. Canonical test harness

Bu motor için özel test ortamı gerekir.

type CanonicalScenario = {
  initialSnapshot: WorldSnapshot

  commands: DomainCommand[]

  expectedEvents: Partial<DomainEvent>[]
  expectedFinalState: unknown

  expectedRejectedCommands?: string[]
}
133. Golden event tests

Belirli command dizisi için beklenen event zinciri saklanabilir.

Örnek:

OBTAIN_ITEM
EQUIP_ITEM
TRANSFER_ITEM

sonucu expected event stream ile karşılaştırılır.

134. Property-based invariants
Aynı command ID iki kez yeni event üretmez.
Aggregate version yalnızca ardışık artar.
World version normal commit’lerde geriye gitmez.
Her event’in geçerli causationId’si vardır.
Unique reward yalnızca bir kez commit edilir.
Her item tek owner zincirindedir.
Her character tek location zincirindedir.
Player-gated state otomatik tamamlanmaz.
Replay sonucu checksum ile eşleşir.
135. Chaos tests

Şu hatalar simüle edilmelidir:

event bus geçici kesinti
projection consumer çökmesi
duplicate event delivery
database commit timeout
outbox publisher tekrar çalışması
saga ortasında hata
active session ve offline conflict
stale story choice
snapshot corruption
136. Example: item gift commit

Command:

GIVE_ITEM
actor = Lumi
item = Mavi Bileklik
target = Tilki

Akış:

1. Command schema valid.
2. Lumi item’i taşıyor mu?
3. Item reserved mı?
4. Transfer güvenli mi?
5. Item story-critical mı?
6. Tilki aynı konumda mı?
7. Aggregate version uygun mu?
8. ITEM_TRANSFERRED proposed event üretilir.
9. Inventory invariant doğrulanır.
10. Event append edilir.
11. World version artar.
12. Inventory projection güncellenir.
13. Outbox event publish eder.
14. Memory ve Relationship handlers çalışır.
15. Narrative committed olayı anlatır.
137. Example event chain
COMMAND:
GIVE_ITEM

EVENT:
ITEM_TRANSFERRED

REACTIONS:
GIFT_INTERACTION_RECORDED
MEMORY_CANDIDATE_CREATED
QUEST_OBJECTIVE_EVALUATED
VISUAL_ITEM_OWNER_CHANGED

Relationship Engine:

ilişki kesin arttı

değil,

hediye bağlamını değerlendir

event’i alır.

138. Example: quest completion

Quest objective tamamlandığında:

1. Objective condition re-evaluated.
2. QUEST_OBJECTIVE_COMPLETED proposed.
3. Stage conditions evaluated.
4. QUEST_STAGE_COMPLETED proposed.
5. Quest completion conditions evaluated.
6. Reward uniqueness reserved.
7. QUEST_COMPLETED committed.
8. REWARD_GRANTED committed.
9. Journal projection updated.
10. Story callback candidate created.

Reward reservation başarısızsa quest completion commit edilmemelidir.

139. Example: stale travel choice

Oyuncuya önce:

Tekneyle kuleye git

seçeneği sunuldu.

Daha sonra hava değişti ve tekne rotası kapandı.

Oyuncu eski seçeneğe bastı.

Akış:

CHOICE_SELECTED command
↓
basedOnWorldVersion eski
↓
choice revalidation
↓
tekne seçeneği invalid
↓
command reject
↓
güncel alternatifler:
köprüyü onar
orman geçidini araştır
yağmurun dinmesini bekle

Eski choice körlemesine uygulanmaz.

140. Example: crafting saga
1. Inputs reserve
2. Tool availability validate
3. Craft time plan
4. Safety validate
5. Inputs consume
6. Tool condition modify
7. Output create
8. Quest progress evaluate
9. Capability evidence emit
10. Reservation close

Output creation başarısız olursa:

transaction içindeyse rollback,
ayrı commit’lerse input compensation politikası uygulanır.

MVP’de input consume ve output create aynı Inventory transaction içinde olmalıdır.

141. Example: offline simulation conflict
Offline simulation:
world version 800 üzerinden planlandı.

Kullanıcı aktif hikâyeye girdi.
World version 804 oldu.

Offline commit:
expected 800
current 804

Sonuç:

VERSION_CONFLICT

- eski delta uygulanmaz,
- simulation yeniden planlanır,
- gerekirse yalnızca henüz işlenmemiş absence window değerlendirilir,
- çifte world time oluşmaz.
142. MVP Event Bus & Commit Engine

İlk sürümde şu özellikler yeterlidir:

1. Command ve event ayrımı
2. Domain aggregate sınırları
3. State ownership registry
4. Aggregate ve world version
5. Optimistic locking
6. Command idempotency
7. Event consumer deduplication
8. Transactional outbox
9. Core Event Bus
10. Single aggregate commit
11. Sınırlı saga desteği
12. Reservation ve compensation
13. Hybrid event sourcing
14. Current-state projections
15. Aggregate snapshots
16. Cross-engine invariant validation
17. Canonical commit plan
18. Audit ve causation chain
19. Deterministic replay
20. Story snapshot ve stale output kontrolü
143. MVP Command
type CoreCommand = {
  id: string
  commandType: string

  universeId: string

  aggregateType: string
  aggregateId: string

  actorId: string
  actorType: string

  payload: unknown

  expectedAggregateVersion?: number
  expectedWorldVersion?: number

  correlationId: string
}
144. MVP Event
type CoreDomainEvent = {
  id: string
  eventType: string

  universeId: string

  aggregateType: string
  aggregateId: string

  aggregateVersion: number
  worldVersion: number

  payload: unknown

  correlationId: string
  causationId: string

  occurredAtWorldMinute: number

  schemaVersion: number
  ruleVersion: string
}
145. MVP Commit Result
type CoreCommitResult = {
  commandId: string

  previousWorldVersion: number
  resultingWorldVersion: number

  committedEventIds: string[]

  status:
    | "committed"
    | "rejected"
    | "conflict"
    | "compensated"

  errorCodes: string[]
}
146. MVP ana işlemler
registerCommandHandler()

validateCommand()

authorizeCommand()

loadAggregate()

handleCommand()

buildCommitPlan()

validateAggregateEvents()

validateCrossEngineInvariants()

reserveCanonicalResources()

appendEvents()

updateWorldVersion()

writeOutbox()

publishOutboxEvents()

consumeEventIdempotently()

updateCoreProjection()

createSnapshot()

replayAggregate()

buildCanonicalTrace()
147. Örnek command execution
async function executeCommand(
  command: CoreCommand
): Promise<CoreCommitResult> {
  const existingResult =
    await findIdempotentCommandResult(command.id)

  if (existingResult) {
    return existingResult
  }

  const snapshot = await loadConsistentWorldSnapshot({
    universeId: command.universeId,
    expectedWorldVersion:
      command.expectedWorldVersion
  })

  const authorizationFindings =
    authorizeCommand(command, snapshot)

  if (hasBlockingFindings(authorizationFindings)) {
    return rejectCommand(
      command,
      authorizationFindings
    )
  }

  const aggregate = await loadAggregate({
    aggregateType: command.aggregateType,
    aggregateId: command.aggregateId
  })

  assertExpectedVersion({
    expected: command.expectedAggregateVersion,
    actual: aggregate.version
  })

  const proposedEvents = aggregate.handle(command)

  const plan = buildCommitPlan({
    command,
    proposedEvents,
    snapshot
  })

  const findings =
    await validateCommitPlan(plan, snapshot)

  if (hasBlockingFindings(findings)) {
    return rejectCommand(command, findings)
  }

  return commitCanonicalPlan({
    command,
    aggregate,
    plan,
    snapshot
  })
}
148. İlk sürümde yapılmaması gerekenler

Başlangıçta kaçınılması gerekenler:

bütün domainleri tek dev aggregate yapmak,
her şeyi tek global transaction’a almak,
LLM’nin doğrudan event üretmesi,
event’leri şemasız JSON olarak bırakmak,
event version saklamamak,
duplicate delivery’yi yok saymak,
idempotency olmadan retry yapmak,
projection’ı canonical source kabul etmek,
geçmiş event’leri sessizce değiştirmek,
her derived effect başarısızlığında ana işlemi rollback etmek,
stale story output’u commit etmek,
cross-engine invariants olmadan domain commit etmek,
event ordering’i rastgele bırakmak.

MVP hedefi:

Her değişiklik nereden geldiği belli olsun.
Aynı işlem iki kez uygulanmasın.
Motorlar birbirinin state’ini doğrudan değiştirmesin.
Başarısız işlemler dünyayı yarım bırakmasın.
Geçmiş replay edilebilsin.
Narrative yalnızca commit edilmiş gerçeği anlatsın.
149. Event Bus, State Commit & Canonical Consistency Engine temel ilkeleri
1. Command niyettir; event gerçekleşmiş gerçektir.
2. Hiçbir proposal doğrulanmadan canonical event olamaz.
3. Her state alanının tek otoriter domain sahibi vardır.
4. Domainler birbirlerinin state’ini doğrudan değiştiremez.
5. Her aggregate kendi invariants kurallarını korur.
6. Dünya çapındaki invariants ayrıca doğrulanır.
7. Aggregate version ve world version ayrı tutulur.
8. Optimistic locking stale state commit’lerini engeller.
9. Aynı command idempotent biçimde yalnızca bir kez uygulanır.
10. Event consumer’lar duplicate delivery’ye dayanıklı olmalıdır.
11. State ve outbox aynı transaction’da yazılır.
12. Event Bus en az bir kez delivery varsayımıyla çalışabilir.
13. Canonical core ile derived effects ayrılmalıdır.
14. Derived effect hatası her zaman ana canonical işlemi geri aldırmaz.
15. Birden fazla domaini kapsayan süreçler saga ile yönetilebilir.
16. Commit edilmiş sonucu silmek yerine compensation event’i üretilir.
17. Geri döndürülemez adımlar işlem zincirinin sonunda uygulanır.
18. Event log canonical history’nin temel kaynağıdır.
19. Projection’lar event’lerden yeniden üretilebilir.
20. Snapshot’lar replay maliyetini azaltır.
21. Story Planner ve Narrative Engine immutable world snapshot kullanır.
22. World version değişirse stale story çıktısı yeniden doğrulanır.
23. Choice’lar uygulanmadan önce güncel state’e göre tekrar kontrol edilir.
24. LLM yalnızca proposal ve presentation üretir; canonical commit yetkisi yoktur.
25. Her event schema ve rule version taşır.
26. Event causation ve correlation zinciri izlenebilir olmalıdır.
27. Replay sırasında LLM veya dış servis yeniden çağrılmaz.
28. Aynı snapshot ve event stream aynı state checksum’ını üretmelidir.
29. Teknik hatalar çocuğa güvenli ve hikâye uyumlu fallback olarak sunulur.
30. Narrative yalnızca commit edilmiş canonical dünya gerçeğini anlatır.

Event Bus, State Commit & Canonical Consistency Engine’in kavramsal çekirdeği böylece tamamlandı.

Sıradaki en mantıklı ana başlık:

Content Generation, Narrative Rendering & Multimodal Consistency Engine

Bu motorla şu konuları merkezi olarak tasarlayacağız:

planner çıktısından anlatı üretimi
kanonik olayların hikâyeye çevrilmesi
yaşa uygun dil
karakter sesleri
diyalog tutarlılığı
sahne ve sayfa yapısı
choice presentation
görsel üretim context’i
karakter ve item görsel devamlılığı
ses, ambiyans ve efekt işaretleri
forbidden knowledge filtresi
hallucination kontrolü
narrative-state parity
yeniden üretilebilir yaratıcı çıktılar