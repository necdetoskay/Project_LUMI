Bölüm 4 — Regional Economy, Trade Networks, Specialization & Inter-Settlement Dependency System

Bu bölümde yerleşimlerin tek başına değil, birbiriyle bağlantılı ekonomik ağlar içinde nasıl yaşayacağını tanımlıyoruz.

Ana ilke:

Hiçbir yerleşim her şeyi üretmek zorunda değildir; fakat hiçbir yerleşim de tek bir kaynağa veya tek bir ticaret ortağına aşırı bağımlı hâle gelmemelidir.

172. Bölgesel ekonomi yaklaşımı

Bölgesel ekonomi, yalnızca yerleşimler arası mal alışverişi değildir.

Aşağıdaki akışların tamamını kapsar:

kaynak,
ürün,
iş gücü,
bilgi,
hizmet,
kültür,
ulaşım,
kredi ve güven,
yardım,
göç,
üretim araçları.
interface RegionalEconomyState {
  regionId: string;
  settlementIds: string[];

  resourceFlows: RegionalResourceFlow[];
  serviceFlows: RegionalServiceFlow[];
  laborFlows: RegionalLaborFlow[];
  knowledgeFlows: RegionalKnowledgeFlow[];

  tradeNetwork: TradeNetworkState;
  dependencyGraph: SettlementDependencyGraph;
  regionalResilience: RegionalResilienceVector;

  activeDisruptions: RegionalDisruption[];
  activeOpportunities: RegionalEconomicOpportunity[];
}
173. Bölgesel ekonomik roller

Yerleşimler zamanla belirli roller üstlenebilir.

type RegionalEconomicRole =
  | "food_producer"
  | "water_provider"
  | "craft_center"
  | "trade_hub"
  | "transport_hub"
  | "education_center"
  | "health_center"
  | "administrative_center"
  | "mining_settlement"
  | "forestry_settlement"
  | "fishing_settlement"
  | "cultural_center"
  | "storage_hub"
  | "processing_center"
  | "gateway_settlement"
  | "mixed_economy";

Bir yerleşim birden fazla role sahip olabilir.

Örneğin:

interface SettlementRegionalRoleProfile {
  settlementId: string;

  roles: Array<{
    role: RegionalEconomicRole;
    strength: number;
    regionalImportance: number;
    replaceability: number;
  }>;
}
174. Uzmanlaşma sistemi

Bir yerleşim belirli üretim alanlarında neden uzmanlaşır?

Yerel kaynaklar
+ Coğrafi avantaj
+ Tarihsel bilgi
+ Usta ve meslek dağılımı
+ Altyapı
+ Ticaret bağlantıları
+ Kültürel değerler
+ Geçmiş başarılar
= Uzmanlaşma eğilimi
interface SettlementSpecialization {
  specializationId: string;
  settlementId: string;

  activityType: string;
  maturity: number;
  productivityAdvantage: number;
  qualityAdvantage: number;
  knowledgeDepth: number;
  culturalImportance: number;

  regionalDemand: number;
  externalDependency: number;
  ecologicalCost: number;
}
175. Uzmanlaşma avantajları

Uzmanlaşmış yerleşimler:

daha kaliteli üretim yapabilir,
daha az kaynakla daha çok çıktı üretebilir,
belirli bir alanda bilgi biriktirebilir,
bölgesel itibar kazanabilir,
çırak ve tüccar çekebilir,
diğer yerleşimlerle güçlü ilişkiler kurabilir.

Örnek:

Kızıltaş
→ kaliteli taş işçiliği
→ köprü ve yapı ustalığı
→ bölgenin altyapı projelerinde merkezi rol
176. Uzmanlaşma riskleri

Aşırı uzmanlaşma kırılganlık yaratabilir.

interface SpecializationRiskVector {
  marketDependency: number;
  inputDependency: number;
  routeDependency: number;
  knowledgeConcentration: number;
  ecologicalOveruse: number;
  employmentConcentration: number;
  demandVolatility: number;
}

Örnek:

Bir kasaba yalnızca yün işliyorsa:

koyun hastalığı,
ticaret yolunun kapanması,
yün talebinin düşmesi,
boya maddesi kıtlığı

bütün ekonomiyi etkileyebilir.

177. Uzmanlaşma derinliği
type SpecializationDepth =
  | "emerging"
  | "established"
  | "dominant"
  | "overdependent"
  | "declining"
  | "transforming";

Uzmanlaşma bir anda oluşmaz.

Aşamalar:

Yeni beceri
→ Küçük üretim
→ Yerel talep
→ Bölgesel itibar
→ Altyapı yatırımı
→ Meslek kümelenmesi
→ Uzmanlaşmış ekonomi
178. Meslek kümelenmesi

Belirli meslekler birbirini destekleyebilir.

interface ProfessionCluster {
  id: string;
  professionIds: string[];

  sharedInputs: string[];
  sharedInfrastructure: string[];
  sharedKnowledge: string[];

  synergyStrength: number;
  clusterMaturity: number;
}

Örnek:

Yün üreticisi
+ iplikçi
+ dokumacı
+ boyacı
+ terzi
+ tüccar
= tekstil kümesi

Bir mesleğin gelişmesi diğerlerini de güçlendirebilir.

179. Ekonomik küme etkisi
interface ClusterEffect {
  productivityBonus: number;
  qualityBonus: number;
  trainingBonus: number;
  innovationBonus: number;
  employmentBonus: number;

  congestionPenalty: number;
  pollutionPenalty: number;
  dependencyPenalty: number;
}

Kümelenme hem avantaj hem baskı üretir.

Örneğin çok fazla atölye:

su tüketimini artırabilir,
mahallede gürültü oluşturabilir,
yangın riskini yükseltebilir,
işçi barınma baskısı yaratabilir.
180. Yerleşimin karşılaştırmalı avantajı

Bir yerleşimin belirli ürünü üretebilmesi, onu üretmesinin en doğru seçenek olduğu anlamına gelmez.

interface ComparativeAdvantageAssessment {
  settlementId: string;
  activityType: string;

  absoluteProductivity: number;
  opportunityCost: number;
  regionalScarcity: number;
  transportSuitability: number;
  knowledgeAdvantage: number;
  ecologicalSustainability: number;

  comparativeAdvantage: number;
}

Örneğin iki köy de tahıl yetiştirebilir.

Ancak:

biri düz ve verimli araziye,
diğeri güçlü arıcılık bilgisine

sahipse, ikinci köyün bütün alanını tahıla ayırması verimsiz olabilir.

181. Fırsat maliyeti

Bir üretim kararı başka neyin yapılamayacağını da belirler.

interface OpportunityCost {
  chosenActivityId: string;
  displacedActivityIds: string[];

  laborCost: number;
  landCost: number;
  infrastructureCost: number;
  ecologicalCost: number;
  socialCost: number;
}

Örnek:

Yeni üzüm bağları açılırsa:

tahıl alanı azalabilir,
orman kenarı daralabilir,
sulama suyu başka üretimden çekilebilir.

Ekonomik kararlar yalnızca doğrudan kazanca göre verilmemelidir.

182. Bölgesel talep
interface RegionalDemandState {
  resourceId: string;

  essentialDemand: number;
  productionDemand: number;
  culturalDemand: number;
  projectDemand: number;
  reserveDemand: number;

  totalAvailableSupply: number;
  unmetDemand: number;
  expectedDemandChange: number;
}

Talep şunlardan etkilenebilir:

nüfus değişimi,
mevsim,
festival,
yeni altyapı projeleri,
göç,
hastalık,
hava koşulları,
yeni üretim süreçleri.
183. Talep görünürlüğü

Yerleşimler bölgedeki bütün talebi anında bilmemelidir.

interface MarketInformationState {
  knownDemandAccuracy: number;
  knownSupplyAccuracy: number;
  routeInformationAccuracy: number;
  priceInformationDelay: number;
  rumorInfluence: number;
}

Yanlış veya eski bilgi:

aşırı üretime,
yetersiz üretime,
yanlış ticaret yolculuğuna,
fırsat kaçırmaya

neden olabilir.

184. Pazar bilgi kaynakları

Yerleşimler ekonomik bilgiyi şu kaynaklardan öğrenebilir:

tüccarlar,
yolcular,
haberciler,
loncalar,
yerel yönetimler,
pazar kayıtları,
komşu yerleşimler,
söylentiler,
çocuğun keşifleri.
interface MarketInformationSource {
  sourceType:
    | "merchant"
    | "traveler"
    | "guild"
    | "official"
    | "settlement"
    | "rumor"
    | "child_discovery";

  reliability: number;
  speed: number;
  bias: number;
  coverage: number;
}
185. Trade Network Graph

Ticaret ağı yönlü bir grafik olarak tutulmalıdır.

interface TradeNetworkState {
  nodes: TradeNode[];
  edges: TradeEdge[];

  networkDensity: number;
  centralization: number;
  redundancy: number;
  fragmentationRisk: number;
}
interface TradeNode {
  settlementId: string;

  storageCapacity: number;
  processingCapacity: number;
  tradeCapacity: number;
  marketInfluence: number;
}
186. Trade Edge
interface TradeEdge {
  id: string;

  originSettlementId: string;
  destinationSettlementId: string;
  routeIds: string[];

  tradedResourceIds: string[];
  averageFlowVolume: number;

  reliability: number;
  capacity: number;
  travelTime: number;
  seasonalAvailability: number;

  trust: number;
  dependencyStrength: number;
}

Ticaret ilişkisi yalnızca yol bağlantısı değildir.

Aynı yol üzerinde:

güçlü güven,
zayıf güven,
tek taraflı bağımlılık,
kültürel yakınlık,
geçmiş anlaşmazlık

bulunabilir.

187. Doğrudan ve dolaylı ticaret
Doğrudan ticaret

A yerleşimi ürünü B yerleşimine gönderir.

Dolaylı ticaret
A → Ticaret merkezi → B

Dolaylı ticaret:

daha çok yerleşime erişim sağlar,
depolama ve dağıtım kolaylığı yaratır,
fakat maliyet ve gecikmeyi artırabilir.
188. Ticaret merkezleri
interface TradeHubState {
  settlementId: string;

  incomingCapacity: number;
  outgoingCapacity: number;
  storageCapacity: number;
  sortingCapacity: number;
  marketCoordination: number;

  routeDiversity: number;
  dependencyOnHub: number;
}

Ticaret merkezleri bölgesel ekonomiyi güçlendirir.

Ancak tek bir merkeze aşırı bağımlılık risklidir.

Merkezde yaşanan:

yangın,
sel,
yönetim krizi,
yol kapanması

bütün bölgeyi etkileyebilir.

189. Network Centrality

Bir yerleşimin ağdaki önemi birkaç açıdan ölçülmelidir.

interface TradeCentralityVector {
  flowCentrality: number;
  routeCentrality: number;
  storageCentrality: number;
  informationCentrality: number;
  dependencyCentrality: number;
}

Örneğin küçük bir köy çok üretim yapmayabilir fakat iki büyük bölge arasındaki tek geçiş noktası olabilir.

Bu durumda stratejik önemi büyüktür.

190. Ağ kırılganlığı
interface NetworkVulnerability {
  criticalNodeIds: string[];
  criticalEdgeIds: string[];

  singlePointOfFailureCount: number;
  alternativeRouteCoverage: number;
  regionalStockCoverage: number;

  estimatedRecoveryTime: number;
}

Sistem şu soruları cevaplayabilmelidir:

Bu köprü yıkılırsa kim etkilenir?
Bu pazar kapanırsa hangi yerleşimler ürün alamaz?
Bu usta grubu ayrılırsa hangi projeler durur?
Hangi yerleşimin alternatifi yok?
191. Bağımlılık grafiği
interface SettlementDependencyGraph {
  dependencies: SettlementDependencyEdge[];
}
interface SettlementDependencyEdge {
  sourceSettlementId: string;
  targetSettlementId: string;

  dependencyType:
    | "resource"
    | "service"
    | "knowledge"
    | "labor"
    | "transport"
    | "storage"
    | "market_access";

  subjectId: string;
  dependencyStrength: number;

  alternatives: DependencyAlternative[];
  disruptionImpact: number;
  recoveryDifficulty: number;
}
192. Bağımlılık türleri
Kaynak bağımlılığı

Örnek: Şehir suyunu dağ köyünden alır.

Hizmet bağımlılığı

Örnek: Bölgedeki tek şifacı kasabadadır.

Bilgi bağımlılığı

Örnek: Köprü bakımını yalnızca belirli ustalar bilir.

Ulaşım bağımlılığı

Örnek: Bütün ticaret tek geçitten yapılır.

Depolama bağımlılığı

Örnek: Tahıl yalnızca merkezdeki büyük depoda saklanabilir.

Pazar bağımlılığı

Örnek: Üreticiler ürünlerini yalnızca tek şehirde satabilir.

193. Karşılıklı bağımlılık

Bağımlılık her zaman kötü değildir.

interface MutualDependencyState {
  settlementAId: string;
  settlementBId: string;

  balance: number;
  mutualBenefit: number;
  trust: number;
  replaceability: number;
  conflictRisk: number;
}

Örnek:

Dağ köyü:
- kereste sağlar

Nehir kasabası:
- tahıl ve taşımacılık sağlar

Her iki taraf da birbirine ihtiyaç duyuyorsa ilişki karşılıklı olabilir.

194. Asimetrik bağımlılık

Bir taraf diğerine çok daha fazla bağımlı olabilir.

interface DependencyAsymmetry {
  strongerDependentSettlementId: string;
  asymmetryLevel: number;
  exploitationRisk: number;
  negotiationImbalance: number;
}

Bu durum:

haksız ticaret koşulları,
siyasi baskı,
güvensizlik,
alternatif arayışı

üretebilir.

LUMI’de bu konular sömürü mekaniklerini ödüllendirmek için değil, adalet ve dayanışma hikâyeleri üretmek için kullanılmalıdır.

195. Dependency Health
interface DependencyHealthAssessment {
  dependencyId: string;

  necessity: number;
  benefit: number;
  balance: number;
  reliability: number;
  transparency: number;
  alternatives: number;
  fairness: number;

  status:
    | "healthy"
    | "manageable"
    | "fragile"
    | "unbalanced"
    | "critical";
}

Sağlıklı bağımlılık:

güvenilir,
karşılıklı faydalı,
şeffaf,
alternatifli,
adil

olmalıdır.

196. Bölgesel kaynak akışı
interface RegionalResourceFlow {
  resourceId: string;

  originSettlementId: string;
  destinationSettlementId: string;

  averageQuantityPerPeriod: number;
  flowReliability: number;
  seasonalVariation: number;
  transportLoss: number;

  strategicImportance: number;
}

Bu akışlar sürekli tek tek shipment olarak tutulmak zorunda değildir.

Arka plan simülasyonunda ortalama akış modeli kullanılabilir.

197. Akış simülasyonu seviyeleri
Foreground

Her sevkiyat ayrı nesne olarak simüle edilir.

Connected

Önemli sevkiyatlar ayrı, küçük akışlar toplu hesaplanır.

Background

Ortalama günlük veya haftalık akış kullanılır.

Dormant

Yalnızca önemli kesintiler veya büyük değişimler hesaplanır.

Bu, daha önce belirlediğimiz simülasyon katmanlarıyla uyumludur.

198. Bölgesel hizmet akışı

Yerleşimler yalnızca ürün değil hizmet de paylaşır.

interface RegionalServiceFlow {
  serviceType:
    | "healthcare"
    | "education"
    | "repair"
    | "administration"
    | "transport"
    | "communication"
    | "construction"
    | "ecological_management";

  providerSettlementId: string;
  recipientSettlementIds: string[];

  capacity: number;
  accessibility: number;
  reliability: number;
  travelRequirement: number;
}

Örnek:

gezici öğretmen,
seyyar şifacı,
bölgesel köprü ustası,
ortak haberci ağı.
199. Bilgi akışı
interface RegionalKnowledgeFlow {
  knowledgeId: string;

  originSettlementId: string;
  destinationSettlementId: string;

  transferMode:
    | "apprenticeship"
    | "traveling_expert"
    | "written_record"
    | "demonstration"
    | "cultural_exchange"
    | "shared_project";

  transferProgress: number;
  retentionProbability: number;
  adaptationLevel: number;
}

Bilgi taşındığında aynen kopyalanmak zorunda değildir.

Hedef yerleşim:

tekniği yerel malzemelere uyarlar,
farklı isim verir,
kendi gelenekleriyle birleştirir.
200. İş gücü hareketi

Bazı insanlar yerleşim değiştirmeden başka yerde çalışabilir.

interface RegionalLaborFlow {
  originSettlementId: string;
  destinationSettlementId: string;

  professionId: string;
  workerCount: number;

  flowType:
    | "daily"
    | "seasonal"
    | "project_based"
    | "rotational"
    | "temporary";

  economicBenefit: number;
  originLaborImpact: number;
  socialImpact: number;
}

Örneğin:

köprü ustaları bir aylığına komşu kasabaya gider,
çiftçiler hasat döneminde ovaya çıkar,
öğretmen haftanın bazı günleri iki köy arasında çalışır.
201. Yerel ekonomi ile bölgesel ekonomi dengesi

Yerleşim bütün ihtiyaçlarını dışarıdan karşılamamalıdır.

interface LocalRegionalBalance {
  localSelfSufficiency: number;
  regionalIntegration: number;
  externalDependency: number;
  strategicReserveCoverage: number;
}

İdeal değer sabit değildir.

İzole köy:

daha yüksek yerel yeterlilik ister.

Ticaret merkezi:

daha yüksek bölgesel entegrasyonla yaşayabilir.
202. Stratejik kaynaklar

Her kaynak aynı öneme sahip değildir.

interface StrategicResourceProfile {
  resourceId: string;

  essentiality: number;
  substitutability: number;
  storageDifficulty: number;
  transportDifficulty: number;
  productionConcentration: number;
  disruptionImpact: number;
}

Yüksek stratejik öneme sahip kaynaklar:

su,
temel yiyecek,
ilaç,
yakıt,
tohum,
kritik yapı malzemesi,
özel üretim aracı.
203. Kaynak çeşitlendirmesi
interface ResourceDiversificationState {
  resourceNeedId: string;

  localSources: string[];
  externalSources: string[];
  substituteResources: string[];

  sourceDiversity: number;
  routeDiversity: number;
  supplierDiversity: number;
}

Yerleşim bir kaynağı:

birden fazla üreticiden,
birden fazla yoldan,
farklı ikamelerle

sağlayabiliyorsa daha dayanıklıdır.

204. Üretim çeşitlendirmesi
interface EconomicDiversificationVector {
  sectorDiversity: number;
  professionDiversity: number;
  productDiversity: number;
  marketDiversity: number;
  inputDiversity: number;
}

Çeşitlilik arttıkça:

tek sektör şoklarına dayanıklılık artar,
fakat uzmanlaşma avantajı azalabilir.

Sistem bu ikisi arasında denge kurmalıdır.

205. Regional Resilience Vector
interface RegionalResilienceVector {
  supplyResilience: number;
  routeResilience: number;
  storageResilience: number;
  laborResilience: number;
  knowledgeResilience: number;
  ecologicalResilience: number;
  governanceCoordination: number;
  mutualAidCapacity: number;
}

Bölgesel dayanıklılık, yerleşim dayanıklılıklarının basit ortalaması değildir.

Birbirlerini destekleyebilen yerleşimler, tek tek değerlerinden daha güçlü olabilir.

206. Bölgesel stok sistemi

Bazı bölgelerde ortak stratejik depolar bulunabilir.

interface RegionalReserve {
  id: string;
  resourceId: string;

  storedQuantity: number;
  targetQuantity: number;
  storageSettlementId: string;

  contributorSettlementIds: string[];
  accessRules: ReserveAccessRule[];

  maintenanceQuality: number;
  governanceTrust: number;
}
207. Ortak stok sorunları

Ortak depolar güçlüdür fakat sorunlar doğurabilir:

kim ne kadar katkı yaptı,
kim ne zaman kullanabilir,
acil durumun tanımı nedir,
dağıtımı kim yönetir,
stok bozulursa sorumluluk kimde,
merkez yerleşim fazla kontrol sahibi mi?

Bu sorular bölgesel yönetişim sistemine bağlanmalıdır.

208. Ticaret anlaşmaları
interface TradeAgreement {
  id: string;
  participantSettlementIds: string[];

  coveredResources: string[];
  duration: number;

  minimumFlows: TradeCommitment[];
  priceOrExchangeRules: ExchangeRule[];
  emergencyClauses: EmergencyTradeClause[];

  trustRequirement: number;
  enforcementMechanism: string;
  fairnessAssessment: number;
}

Anlaşmalar:

sabit miktar,
öncelikli satış,
karşılıklı yardım,
ortak depo,
yol bakım sorumluluğu

içerebilir.

209. Anlaşma güvenilirliği
interface AgreementReliabilityState {
  agreementId: string;

  fulfillmentRate: number;
  disputeCount: number;
  transparency: number;
  flexibility: number;
  perceivedFairnessBySettlement: Record<string, number>;
}

Bir taraf anlaşmayı sürekli yerine getirmezse:

güven azalır,
alternatif tedarik aranır,
fiyat yükselir,
siyasi ilişki bozulabilir.
210. Hediye ve yardım ekonomisi

Bütün kaynak transferleri ticari olmamalıdır.

type TransferIntent =
  | "commercial_trade"
  | "gift"
  | "emergency_aid"
  | "mutual_support"
  | "debt_repayment"
  | "ceremonial_exchange"
  | "shared_project";

Hediye ekonomisi:

güven,
itibar,
karşılıklılık,
toplumsal bağ

üretebilir.

Ancak yardım alan yerleşim otomatik olarak borçlu veya aşağı konumda görülmemelidir.

211. Karşılıklılık hafızası
interface ReciprocityMemory {
  giverSettlementId: string;
  receiverSettlementId: string;

  transferredValue: number;
  context: string;
  expectationLevel: number;

  gratitude: number;
  perceivedObligation: number;
  relationshipImpact: number;
}

Bazı kültürler yardımı karşılıksız görürken, bazıları ileride karşılık bekleyebilir.

Yanlış beklentiler anlaşmazlık oluşturabilir.

212. Bölgesel ekonomik fırsat
interface RegionalEconomicOpportunity {
  id: string;

  opportunityType:
    | "new_route"
    | "new_market"
    | "resource_discovery"
    | "shared_infrastructure"
    | "knowledge_exchange"
    | "production_cluster"
    | "seasonal_event"
    | "unused_capacity";

  involvedSettlementIds: string[];
  expectedBenefits: SimulationEffect[];
  expectedCosts: SimulationEffect[];
  risks: SimulationRisk[];

  cooperationRequirement: number;
}

Örnek:

iki köy arasında ortak değirmen,
yeni nehir ulaşım hattı,
mevsimlik bölgesel pazar,
ortak eğitim merkezi.
213. Ortak altyapı
interface RegionalInfrastructure {
  id: string;
  infrastructureType:
    | "road"
    | "bridge"
    | "canal"
    | "warehouse"
    | "market"
    | "school"
    | "clinic"
    | "communication_tower"
    | "port";

  beneficiarySettlementIds: string[];
  ownerSettlementIds: string[];
  maintenanceResponsibility: MaintenanceShare[];

  condition: number;
  capacity: number;
  strategicImportance: number;
}
214. Ortak bakım problemi

Bir köprü herkes tarafından kullanılıp hiç kimse tarafından yeterince bakılmayabilir.

interface SharedMaintenanceState {
  infrastructureId: string;

  totalRequiredEffort: number;
  committedEffort: number;
  completedEffort: number;

  contributionFairness: number;
  freeRiderRisk: number;
  coordinationQuality: number;
}

Çözüm seçenekleri:

kullanım oranına göre katkı,
nüfusa göre katkı,
sabit görev dönüşümü,
ortak bakım günü,
bakım karşılığı geçiş ayrıcalığı.
215. Ekonomik şok sistemi
interface RegionalEconomicShock {
  id: string;

  shockType:
    | "route_disruption"
    | "harvest_failure"
    | "resource_depletion"
    | "labor_shortage"
    | "demand_collapse"
    | "demand_surge"
    | "infrastructure_failure"
    | "trade_conflict"
    | "ecological_event"
    | "migration_wave";

  originSettlementId?: string;
  originRegionId: string;

  severity: number;
  durationEstimate: number;
  propagationPotential: number;
}
216. Şok yayılımı
Başlangıç şoku
→ Doğrudan etkilenen akışlar
→ Bağımlı yerleşimler
→ Üretim azalması
→ Fiyat ve erişim değişimi
→ Sosyal ve siyasi etkiler
interface ShockPropagationStep {
  sourceNodeId: string;
  targetNodeId: string;

  channel:
    | "resource"
    | "trade"
    | "labor"
    | "information"
    | "confidence"
    | "migration";

  incomingMagnitude: number;
  mitigation: number;
  outgoingMagnitude: number;
}
217. Şok yayılım kuralları

Her şok bütün bölgeyi etkilememelidir.

Yayılım şu faktörlerle belirlenir:

Bağımlılık gücü
× Şok şiddeti
× Alternatif eksikliği
× Stok yetersizliği
× Bilgi gecikmesi
- Dayanıklılık
- Yardım kapasitesi

Küçük şoklar yerel kalabilir.

Büyük şoklar bölgesel hikâyelere dönüşebilir.

218. Örnek: Köprü kesintisi

Başlangıç:

Dağgeçidi Köprüsü:
- iki bölge arasındaki ana rota
- kapasite: yüksek
- alternatif yol: uzun ve mevsimsel

Fırtına sonrası köprü kapanır.

Birinci etkiler:

kereste sevkiyatı durur,
posta gecikir,
gezici şifacı karşıya geçemez.

İkinci etkiler:

marangoz atölyeleri üretimi azaltır,
inşaat projeleri gecikir,
bazı ilaçlar hedefe ulaşmaz.

Üçüncü etkiler:

alternatif yol kullanılmaya başlanır,
taşıma maliyeti artar,
yol üzerindeki küçük köyün ticareti canlanır,
köprü onarımı için ortak proje oluşur.

Aynı olay bazı yerleşimlerde sorun, bazılarında fırsat yaratabilir.

219. Ekonomik uyum tepkileri
type EconomicAdaptationResponse =
  | "use_reserve"
  | "activate_substitute"
  | "change_supplier"
  | "change_route"
  | "reduce_consumption"
  | "delay_project"
  | "shift_production"
  | "request_aid"
  | "share_resources"
  | "increase_local_production"
  | "develop_new_capability";

Yerleşimler şoklara pasif biçimde maruz kalmamalıdır.

Kimliklerine ve yeteneklerine göre karşılık vermelidir.

220. Bölgesel koordinasyon

Büyük kesintilerde yerleşimler ortak karar alabilir.

interface RegionalCoordinationState {
  participatingSettlementIds: string[];

  coordinationModel:
    | "council"
    | "rotating_leadership"
    | "lead_settlement"
    | "guild_network"
    | "informal_cooperation";

  trust: number;
  communicationQuality: number;
  decisionSpeed: number;
  fairness: number;
}

Koordinasyon zayıfsa:

aynı kaynak için rekabet,
gereksiz stoklama,
çelişkili kararlar,
yardımın yanlış yere gitmesi

görülebilir.

221. Panik stoklama

Kaynak kıtlığı söylentisi gerçek kıtlıktan önce sorun yaratabilir.

interface HoardingPressure {
  resourceId: string;

  publicFear: number;
  rumorStrength: number;
  trustInDistribution: number;
  expectedShortage: number;

  hoardingProbability: number;
}

Panik stoklama:

erişim eşitsizliği,
pazar boşalması,
fiyat artışı,
güvensizlik

oluşturabilir.

Çözüm yalnızca yasak koymak değildir.

Alternatifler:

doğru bilgilendirme,
adil dağıtım,
geçici satın alma sınırı,
ortak depoların açılması,
güvenilir lider açıklaması.
222. Fiyat simülasyonu

LUMI’de fiyat sistemi arka planda çalışabilir.

interface RegionalPriceState {
  resourceId: string;
  settlementId: string;

  baseValue: number;
  supplyPressure: number;
  demandPressure: number;
  transportCost: number;
  riskPremium: number;
  trustModifier: number;

  effectiveValue: number;
  narrativeBand: PriceNarrativeBand;
}

Basitleştirilmiş yaklaşım:

Etkin Değer =
Temel Değer
× Talep Baskısı
× Arz Kıtlığı
+ Taşıma Maliyeti
+ Risk

Fiyat sınırsız büyümemeli ve çocuk hikâyelerinde temel ihtiyaç erişimini aşırı sert şekilde bozmamalıdır.

223. Para dışı değişim değeri

Her toplum para kullanmayabilir.

interface ExchangeValueVector {
  materialValue: number;
  scarcityValue: number;
  laborValue: number;
  socialValue: number;
  symbolicValue: number;
  relationshipValue: number;
}

Örneğin:

nadir tohum,
bir ustanın eğitimi,
yolculuk rehberliği,
karşılıklı bakım sözü

ekonomik değer taşıyabilir.

224. Kredi ve güven ilişkisi

Yerleşimler kaynakları daha sonra geri verilmek üzere sağlayabilir.

interface SettlementCreditRelation {
  creditorSettlementId: string;
  debtorSettlementId: string;

  principalValue: number;
  expectedReturnValue: number;
  dueConditions: SimulationCondition[];

  trustBased: boolean;
  collateralType?: string;

  repaymentProgress: number;
  relationshipRisk: number;
}

Bu sistem modern banka simülasyonu olmak zorunda değildir.

Örnek:

“Hasattan sonra iki araba tahıl geri gönderme sözü.”

225. Borç güvenliği

Borç sistemi:

sonsuz borç döngüsü,
aşırı ceza,
toplulukların köleleştirilmesi,
çocuğa borç tahsil ettirme

gibi yönlere gitmemelidir.

Uygun çözüm seçenekleri:

vade uzatma,
farklı kaynakla ödeme,
ortak proje,
kısmi bağış,
topluluk desteği,
karşılıklı yeni anlaşma.
226. Bölgesel ekonomik adalet
interface RegionalEconomicFairnessVector {
  tradeFairness: number;
  accessFairness: number;
  bargainingBalance: number;
  infrastructureContributionFairness: number;
  crisisSupportFairness: number;
  informationFairness: number;
}

Ekonomik verimlilik yüksek olsa bile adalet düşük olabilir.

Örneğin:

merkez şehir bütün kazancı alır,
küçük köyler hammadde sağlar,
yolların bakım yükü köylere kalır,
kararları yalnızca merkez verir.

Bu yapı uzun vadede güvensizlik doğurur.

227. Economic Influence Vector

Yerleşimlerin ekonomik etkisi tek sayı olmamalıdır.

interface EconomicInfluenceVector {
  productionInfluence: number;
  marketInfluence: number;
  transportInfluence: number;
  financialInfluence: number;
  knowledgeInfluence: number;
  storageInfluence: number;
  employmentInfluence: number;
}

Büyük şehir pazar gücüne sahip olabilir.

Küçük bir dağ köyü ise nadir bir şifalı bitki bilgisi nedeniyle yüksek bilgi etkisine sahip olabilir.

228. Ekonomik güç kullanımı

Yerleşimler ekonomik etkilerini farklı biçimlerde kullanabilir:

type EconomicInfluenceAction =
  | "offer_incentive"
  | "restrict_trade"
  | "prioritize_partner"
  | "provide_aid"
  | "share_knowledge"
  | "coordinate_prices"
  | "fund_infrastructure"
  | "withhold_resource";

Bu eylemler yönetim, kültür ve ilişki sistemlerinden etkilenmelidir.

229. Ambargo ve ticaret kısıtlaması

Ticaret kısıtlamaları nadir ve önemli olaylar olmalıdır.

interface TradeRestriction {
  initiatorSettlementId: string;
  targetSettlementId: string;

  resourceIds: string[];
  reason:
    | "safety"
    | "dispute"
    | "resource_protection"
    | "ecological_protection"
    | "political_pressure"
    | "health_risk";

  severity: number;
  duration: number;
}

Çocuk odaklı dünyada amaç ekonomik cezalandırmayı oyunlaştırmak değil, anlaşmazlık ve uzlaşma alanı üretmektir.

230. Kaçak ve gayriresmî ticaret

Resmî yollar çalışmadığında gayriresmî ağlar oluşabilir.

interface InformalTradeNetwork {
  participantIds: string[];
  resourceIds: string[];

  visibility: number;
  reliability: number;
  fairness: number;
  safety: number;

  socialAcceptance: number;
}

Bu ağlar her zaman kötü değildir.

Örneğin kriz sırasında aileler arası paylaşım ağı olabilir.

Ancak:

güvensiz ürün,
haksız dağıtım,
manipülasyon

riski taşıyabilir.

231. Ekolojik maliyetin bölgesel dağılımı

Bir yerleşim ekonomik fayda sağlarken çevresel yük başka yerde oluşabilir.

interface ExternalizedEcologicalCost {
  sourceSettlementId: string;
  affectedRegionId: string;

  activityType: string;
  ecologicalCost: number;
  economicBenefit: number;

  awarenessLevel: number;
  accountabilityLevel: number;
}

Örnek:

şehir temiz su kullanır,
su kaynağının bulunduğu köy kuraklık yaşar,
maden ürünü başka yerde kullanılır,
kirlilik üretim bölgesinde kalır.

Bu ayrım sistem tarafından görünür olmalıdır.

232. Sürdürülebilir ticaret
interface SustainableTradeAssessment {
  flowId: string;

  economicBenefit: number;
  ecologicalCost: number;
  socialBenefit: number;
  dependencyRisk: number;
  fairness: number;
  regenerationCompatibility: number;

  sustainabilityStatus:
    | "sustainable"
    | "conditionally_sustainable"
    | "stressed"
    | "unsustainable";
}

Ticaret hacmi arttıkça otomatik başarı kabul edilmemelidir.

233. Bölgesel üretim sınırları

Ekoloji sistemi her üretim faaliyeti için yenilenme sınırı sağlayabilir.

interface RegionalExtractionLimit {
  resourceId: string;
  regionId: string;

  safeExtractionRate: number;
  currentExtractionRate: number;
  regenerationRate: number;

  stressLevel: number;
}

Sınır aşılırsa:

kısa vadeli üretim artar,
uzun vadeli kapasite düşer,
ekolojik baskı yükselir,
yeni düzenleme ihtiyacı oluşur.
234. Ekonomik dönüşüm

Bir uzmanlaşma sürdürülemez hâle geldiğinde yerleşim dönüşebilir.

interface EconomicTransitionPlan {
  settlementId: string;

  decliningSpecializationId: string;
  targetActivities: string[];

  retrainingNeeds: CapabilityRequirement[];
  infrastructureConversion: string[];
  temporarySupportNeeds: ResourceRequirement[];

  expectedDuration: number;
  socialResistance: number;
}

Örnek:

Aşırı ağaç kesimine dayalı ekonomi
→ orman koruma ve marangozluk dönüşümü
→ daha az ham odun
→ daha kaliteli ürün
→ orman bakım işleri
235. Meslek dönüşümü

Ekonomik dönüşümde insanlar anında yeni mesleğe geçmemelidir.

interface ProfessionTransition {
  sourceProfessionId: string;
  targetProfessionId: string;

  transferableSkills: number;
  trainingDuration: number;
  toolRequirement: number;
  culturalAcceptance: number;
  incomeTransitionRisk: number;
}

Çıraklık, eğitim ve deneyim süreci gerekir.

236. Yeni teknoloji veya bilgi etkisi

Yeni bilgi ekonomik dengeyi değiştirebilir.

Örneğin:

daha verimli değirmen,
su arıtma tekniği,
yeni tarım yöntemi,
hafif taşıma aracı.
interface EconomicInnovation {
  id: string;

  originSettlementId: string;
  affectedActivities: string[];

  productivityEffect: number;
  laborEffect: number;
  resourceEffect: number;
  ecologicalEffect: number;

  adoptionDifficulty: number;
  knowledgeRequirement: number;
}
237. Yenilik yayılımı
Keşif
→ Deneme
→ Yerel doğrulama
→ Komşuların fark etmesi
→ Bilgi transferi
→ Yerel uyarlama
→ Bölgesel dönüşüm

Her yerleşim yeniliği aynı hızda benimsememelidir.

Etkileyen faktörler:

değişime açıklık,
maliyet,
mevcut uzmanlık,
güven,
kültürel uyum,
başarısızlık riski.
238. Teknolojik iş kaybı yerine rol dönüşümü

Çocuk odaklı dünyada teknoloji yalnızca insanları gereksiz kılan bir güç gibi gösterilmemelidir.

Örnek:

Yeni değirmen:

daha az ağır iş gerektirir,
eski işçiler bakım, kalite veya taşıma rollerine geçebilir,
üretim artışı yeni fırınları destekleyebilir.

Sistem mümkün olduğunda role_transition üretmelidir.

239. Bölgesel ekonomik mevsimsellik
interface RegionalSeasonalEconomy {
  season: Season;

  productionChanges: Record<string, number>;
  demandChanges: Record<string, number>;
  routeChanges: Record<string, number>;
  laborChanges: Record<string, number>;

  seasonalEvents: string[];
}

Örnek:

hasat zamanı iş gücü talebi artar,
kışın dağ yolları kapanır,
yazın liman ticareti artar,
festival döneminde özel ürün talebi yükselir.
240. Mevsimsel stoklama

Yerleşimler gelecekteki mevsimi tahmin ederek hazırlık yapmalıdır.

interface SeasonalPreparationPlan {
  targetSeason: Season;

  targetStocks: ResourceQuantity[];
  routePreparations: string[];
  infrastructureMaintenance: string[];
  laborReservations: LaborAllocation[];

  confidence: number;
}

Geçmiş deneyim, hava tahmini ve kültürel bilgi bu planı etkileyebilir.

241. Bölgesel pazar etkinlikleri
interface RegionalMarketEvent {
  id: string;

  hostSettlementId: string;
  participantSettlementIds: string[];

  eventType:
    | "weekly_market"
    | "seasonal_fair"
    | "craft_festival"
    | "livestock_market"
    | "knowledge_exchange"
    | "emergency_distribution";

  expectedFlows: RegionalResourceFlow[];
  culturalImportance: number;
  narrativePotential: number;
}

Pazarlar yalnızca alışveriş alanı değildir.

Aynı zamanda:

bilgi,
söylenti,
kültür,
arkadaşlık,
meslek,
göç fırsatı

taşır.

242. Pazar başarısızlığı ve uyarlama

Bir pazar etkinliği:

kötü hava,
yol kapanması,
düşük katılım,
kaynak gecikmesi

nedeniyle aksayabilir.

Sistem seçenekleri:

tarih değiştirme,
küçük yerel pazarlara bölme,
gezici tüccar ağı kurma,
ürünleri depolama,
nehir yolunu kullanma.
243. Çocuğun bölgesel ekonomiye etkisi

Çocuk şunları yapabilir:

kayıp ticaret yolunu keşfetmek,
iki yerleşim arasındaki yanlış bilgiyi düzeltmek,
bir ustayı ihtiyaç duyulan yerleşimle tanıştırmak,
bölgesel pazarda farklı kültürleri bir araya getirmek,
ortak bakım projesine katılmak,
sürdürülemez kaynak kullanımını fark etmek,
unutulmuş bir üretim yöntemini bulmak.

Ancak çocuk:

bütün bölgenin ekonomisini tek başına yönetmemeli,
fiyatları belirlememeli,
yerleşimleri ticarete zorlamamalı,
yetişkinlerin borç ve anlaşma sorumluluğunu üstlenmemeli.
244. Ekonomik hikâye türleri
type RegionalEconomyStoryHookType =
  | "trade_route_blocked"
  | "missing_shipment"
  | "new_market_opportunity"
  | "unfair_trade_concern"
  | "shared_bridge_project"
  | "rare_skill_needed"
  | "resource_overuse_discovered"
  | "market_rumor"
  | "seasonal_shortage"
  | "regional_aid_effort"
  | "economic_transition"
  | "new_invention_spreads"
  | "specialization_at_risk";
245. Ekonomik anlatı soyutlama seviyeleri

Yaşa göre ekonomi farklı sunulmalıdır.

Küçük yaş
“Köyde yeterince un kalmamıştı.”
“Köprü kapandığı için arabalar gelemiyordu.”
“Herkes elindekini paylaşmaya başladı.”
Orta yaş
kaynak,
üretim,
ticaret,
adalet,
iş bölümü

daha açık anlatılabilir.

Büyük yaş
bağımlılık,
fırsat maliyeti,
sürdürülebilirlik,
eşitsizlik,
ortak yönetim

daha derin işlenebilir.

246. Regional Economy Narrative Snapshot

Story Engine’e ham ağ verisi verilmemelidir.

interface RegionalEconomyNarrativeSnapshot {
  regionId: string;

  majorFlows: NarrativeEconomicFlow[];
  visibleDisruptions: NarrativeEconomicDisruption[];
  hiddenRisks: NarrativeEconomicRisk[];

  cooperationOpportunities: NarrativeEconomicOpportunity[];
  fairnessConcerns: NarrativeFairnessConcern[];

  childRelevantConnections: NarrativeConnection[];
  storyHooks: SettlementStoryHook[];
}
247. Örnek bölgesel ekonomi

Yerleşimler:

Söğütpınar:
- tahıl ve meyve

Kızıltaş:
- taş ve yapı ustaları

Irmakşehir:
- ticaret ve depolama

Yüksekova:
- şifalı bitkiler ve hayvancılık

Akışlar:

Söğütpınar → Irmakşehir:
Tahıl

Kızıltaş → Söğütpınar:
Değirmen taşı ve köprü ustası

Yüksekova → Irmakşehir:
Şifalı bitkiler

Irmakşehir → tüm bölge:
Dağıtım ve pazar erişimi

Risk:

Irmakşehir tek büyük depolama merkezidir.

Bir sel durumunda bütün bölgenin ticaret akışı zayıflayabilir.

Çözüm adayı:

Söğütpınar’da küçük yedek depo,
Yüksekova’da kurutma tesisi,
alternatif nehir iskelesi.
248. Örnek şok yayılımı

Başlangıç olayı:

Irmakşehir deposunun çatısı zarar gördü.

Birinci derece etkiler:

tahıl depolama kapasitesi düştü,
bazı ürünler yağmur riski altında kaldı.

İkinci derece etkiler:

Söğütpınar daha az ürün gönderdi,
pazar arzı azaldı,
un pahalandı.

Üçüncü derece etkiler:

fırınlar daha küçük ekmek üretmeye başladı,
bazı aileler evde farklı tahıllar kullanmaya başladı,
Kızıltaş’taki işçiler çatı onarımı için çağrıldı.

Stabilizatörler:

yerel küçük depolar,
ortak yardım ağı,
iyi hava tahmini,
Kızıltaş ustalarının hızlı müdahalesi.

Sonuç:

Bölgesel kriz oluşmadan sorun orta düzeyde kontrol altına alınır.

249. Örnek ekonomik dönüşüm

Yerleşim:

Çamkoru
Ana gelir: ham kereste
Orman sağlığı: hızla düşüyor
İş gücü bağımlılığı: yüksek

Seçenekler:

Kesime devam et.
Yeni ormana taşın.
Üretimi azalt.
Mobilya ve onarım işine yönel.
Orman bakım hizmeti geliştir.
Bölgesel fidanlık kur.

Yerleşim kimliği:

zanaatkârlık yüksek,
uzun vadeli düşünce orta,
gelenek güçlü,
ekolojik bağlılık yükseliyor.

Karar:

Ham kereste üretimi azaltılır.
Marangozluk ve restorasyon geliştirilir.
Orman bakım ekibi kurulur.

Kısa vadede gelir azalabilir.

Uzun vadede:

ürün değeri artar,
orman iyileşir,
yeni meslekler oluşur,
bölgesel itibar değişir.
250. Sistem invariant’ları
- Kaynak akışlarında gönderilen ve alınan miktarlar tutarlı olmalıdır.
- Aynı sevkiyat iki kere hedefe ulaşamaz.
- Ticaret yolu kapalıysa normal akış devam edemez.
- Depolama kapasitesi aşılırsa fazla kaynak kayıp riski taşımalıdır.
- Bir yerleşim aynı kaynağı aynı anda bütün alıcılara vaat edemez.
- Stratejik rezervler normal ticarette izinsiz kullanılamaz.
- Bölgesel toplam kaynak fiziksel bir neden olmadan artamaz.
- Bilgi transferi kaynak nesnesi gibi tüketilmemelidir.
- Ekolojik üretim sınırları göz ardı edilmemelidir.
- Tek bir ekonomik şok değişim bütçesini aşarak bütün bölgeyi aniden çökertmemelidir.
- Büyük ekonomik yaptırımlar Story Safety ve Governance katmanından geçmelidir.
251. MVP kapsamı

İlk sürümde:

basit bölgesel ticaret grafiği,
3–5 ekonomik rol,
temel uzmanlaşma,
kaynak akışları,
ticaret yolu güvenilirliği,
basit bağımlılık analizi,
alternatif tedarik,
yol kesintisi şokları,
bölgesel anlatı özeti

yeterlidir.

252. İkinci aşama
ticaret merkezleri,
hizmet ve bilgi akışları,
ortak depolar,
ortak altyapı,
mevsimsel pazarlar,
ekonomik dönüşüm,
meslek kümeleri,
adalet değerlendirmesi.
253. İleri aşama
dinamik bölgesel fiyatlar,
kredi ve karşılıklılık ağları,
çok katmanlı pazar bilgisi,
karmaşık ticaret anlaşmaları,
ağ merkeziyeti analizi,
bölgesel planlama,
uzun vadeli ekonomik dönemler,
medeniyetler arası ekonomik sistemler.
254. Bu bölümden çıkan temel kararlar
Yerleşimler bölgesel ağlar içinde simüle edilecek.
Uzmanlaşma avantaj ve kırılganlık birlikte üretecek.
Ticaret yalnızca ürün değil, hizmet, bilgi ve iş gücü akışını da kapsayacak.
Bağımlılıklar yönlü ve çok boyutlu tutulacak.
Karşılıklı bağımlılık otomatik olarak olumsuz sayılmayacak.
Tek merkezli ekonomik ağlar kırılgan kabul edilecek.
Alternatif rota ve tedarikçiler dayanıklılığı artıracak.
Bölgesel şoklar bağımlılık grafiği üzerinden yayılacak.
Yerleşimler şoklara uyum tepkileri geliştirecek.
Hediye ve yardım ekonomisi ticaretten ayrı modellenebilecek.
Ekonomik adalet verimlilikten ayrı değerlendirilecek.
Ekolojik maliyet başka bölgelere görünmez biçimde aktarılamayacak.
Sürdürülemez uzmanlaşmalar dönüşüm süreci başlatabilecek.
Çocuk ekonomik sistemin yöneticisi değil, ilişki ve keşif kolaylaştırıcısı olacak.
Story Engine yalnızca anlatı için hazırlanmış ekonomik snapshot kullanacak.

Bir sonraki bölüm doğal olarak Governance, Law, Institutions & Collective Decision-Making System olacaktır. Burada yerleşimlerin kuralları nasıl oluşturduğu, kararların kimler tarafından alındığı, kurumların nasıl doğup güçlendiği veya zayıfladığı, anlaşmazlıkların nasıl çözüldüğü ve çocuğun bu sisteme nasıl güvenli biçimde dâhil olacağı tasarlanır.