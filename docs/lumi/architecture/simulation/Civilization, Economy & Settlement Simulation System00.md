Bu sistem, LUMI evrenindeki köylerin, kasabaların, şehirlerin, toplulukların ve ekonomik ilişkilerin hikâyeden bağımsız fakat hikâyeyi besleyen şekilde yaşamasını sağlar.

Amaç bir şehir kurma oyunu üretmek değildir. Amaç şudur:

Çocuk bir yerleşime tekrar döndüğünde, orası yalnızca bıraktığı sahnenin dekoru olarak kalmamalı; geçen zaman, ihtiyaçlar, NPC kararları, çevre koşulları ve önceki olaylar doğrultusunda anlamlı biçimde değişmiş olmalıdır.

Örneğin çocuk daha önce küçük bir balıkçı köyünü ziyaret ettiyse, birkaç hikâye sonra geri döndüğünde:

köy iskelesi onarılmış,
balık miktarı azalmış,
bazı aileler başka bölgelere taşınmış,
yeni bir pazar kurulmuş,
kurtarılan denizci köyün liderlerinden biri olmuş,
köy halkı çocuğu hâlâ hatırlıyor

olabilir.

Bu değişimler rastgele değil, evrenin mevcut durumundan türetilmelidir.

1. Sistemin temel sorumlulukları

Civilization, Economy & Settlement Simulation System şu alanlardan sorumludur:

Yerleşimler
kamp,
çiftlik,
küçük topluluk,
köy,
kasaba,
liman,
şehir,
kale yerleşimi,
göçebe topluluğu,
su altı yerleşimi,
fantastik medeniyet merkezi.
Topluluklar
aileler,
meslek grupları,
loncalar,
kabileler,
akademiler,
tüccar birlikleri,
koruyucu topluluklar,
farklı türlerden oluşan karma topluluklar.
Ekonomi
üretim,
tüketim,
kaynak akışı,
ticaret,
kıtlık,
bolluk,
iş gücü,
depolama,
taşımacılık,
zanaat,
hizmetler,
takas ve para sistemleri.
Medeniyet gelişimi
bilgi birikimi,
teknoloji veya zanaat seviyesi,
altyapı,
toplumsal güven,
yönetim biçimi,
kültürel kimlik,
dış ilişki,
krizlere dayanıklılık.

Bu sistem doğrudan hikâye anlatmaz. Hikâye motoruna anlatılmaya değer durumlar üretir.

2. Yerleşim bir nesne değil, yaşayan bir aktör olmalıdır

Her yerleşimin yalnızca nüfus ve kaynak sayılarından oluşması yeterli değildir.

Yerleşim, kendi karakteri bulunan bir dünya aktörü gibi ele alınmalıdır.

interface SettlementState {
  id: string;
  identity: SettlementIdentity;
  location: SpatialReference;

  population: PopulationState;
  economy: EconomyState;
  infrastructure: InfrastructureState;
  governance: GovernanceState;
  culture: CultureState;
  socialState: SocialState;

  environmentDependency: EnvironmentDependencyVector;
  externalRelations: SettlementRelation[];
  activePressures: SettlementPressure[];
  ongoingProjects: SettlementProject[];

  memory: SettlementMemory;
  narrativePotential: NarrativePotentialState;

  simulationProfile: SettlementSimulationProfile;
}

Yerleşimin durumunu tek bir “gelişmişlik seviyesi” ile açıklamayacağız.

Daha önce konuştuğumuz her şeyi vektörlerle temsil etme yaklaşımı burada da kullanılmalıdır.

3. Settlement Identity Vector

Her yerleşimin değişime daha dirençli olan bir kimliği bulunur.

interface SettlementIdentityVector {
  hospitality: number;
  isolationism: number;
  adaptability: number;
  traditionCommitment: number;
  curiosity: number;
  collectiveResponsibility: number;
  competitiveness: number;
  spirituality: number;
  natureAffinity: number;
  craftsmanship: number;
  tradeOrientation: number;
  conflictAversion: number;
}

Örneğin iki köy aynı ekonomik krizi farklı biçimde karşılayabilir.

Dayanışmacı köy
ortak depoları açar,
kaynakları paylaşır,
yaşlıları ve çocukları korur,
dışarıdan yardım ister.
Rekabetçi köy
aileler kendi stoklarını korur,
fiyatlar yükselir,
güçlü tüccarlar daha etkili hâle gelir,
toplumsal huzursuzluk büyür.
Gelenekçi köy
eski yöntemlere döner,
atalarının çözümlerini araştırır,
dışarıdan gelen yeni fikirlere şüpheyle yaklaşır.
Meraklı ve uyarlanabilir köy
yeni tarım teknikleri dener,
başka topluluklarla iş birliği kurar,
farklı türlerin bilgilerinden yararlanır.

Dolayısıyla aynı olay, her yerleşimde aynı sonucu üretmez.

4. Yerleşim ölçeği

Yerleşimlerin mutlaka doğrusal biçimde kamp → köy → kasaba → şehir şeklinde ilerlemesi gerekmez.

type SettlementScale =
  | "temporary_camp"
  | "isolated_homestead"
  | "hamlet"
  | "village"
  | "town"
  | "city"
  | "metropolis"
  | "distributed_community"
  | "nomadic_community"
  | "special_settlement";

Bir yerleşim küçülmesine rağmen daha sağlıklı olabilir.

Örneğin:

800 kişilik kalabalık ve huzursuz bir kasaba,
250 kişilik dengeli ve üretken bir köye dönüşebilir.

Bu durum sistem tarafından “gerileme” olarak değerlendirilmemelidir.

Başarı yalnızca nüfus artışı değildir.

Yerleşim başarısı çok boyutlu ölçülmelidir:

interface SettlementWellbeingVector {
  foodSecurity: number;
  shelterSecurity: number;
  health: number;
  safety: number;
  socialTrust: number;
  personalFreedom: number;
  ecologicalBalance: number;
  culturalContinuity: number;
  knowledgeAccess: number;
  futureConfidence: number;
}
5. Nüfus modeli

Her NPC’yi sürekli simüle etmek yerine nüfus iki katmanda ele alınmalıdır.

5.1. Önemli bireyler

Hikâyede veya yerleşim yaşamında etkisi bulunan NPC’ler tek tek simüle edilir:

lider,
fırıncı,
şifacı,
çocuk karakter,
liman sorumlusu,
tüccar,
öğretmen,
hikâyede tanışılmış kişiler,
yüksek etki vektörüne sahip NPC’ler.
5.2. Nüfus grupları

Arka plandaki nüfus topluluk kümeleri halinde simüle edilir:

interface PopulationCohort {
  id: string;
  approximateSize: number;

  ageDistribution: AgeDistribution;
  professionDistribution: ProfessionDistribution;
  speciesDistribution?: SpeciesDistribution;

  wellbeing: PopulationWellbeingVector;
  needs: PopulationNeedVector;
  sentiment: CollectiveSentimentVector;

  mobility: number;
  productivity: number;
  vulnerability: number;
  cohesion: number;
}

Örnek gruplar:

balıkçı aileleri,
çiftçiler,
çocuklar,
yaşlılar,
liman çalışanları,
yakın zamanda göç etmiş aileler,
orman canlılarıyla birlikte yaşayan halk,
gezgin tüccarlar.

Bu yaklaşım sayesinde yüzlerce NPC’yi ayrı ayrı hesaplamadan yaşayan bir nüfus hissi oluşturabiliriz.

6. Nüfus değişimi

Nüfus yalnızca doğum ve ölüm üzerinden değişmemelidir.

PopulationChange =
  births
  - deaths
  + immigration
  - emigration
  + temporaryVisitors
  - departingVisitors
  + magicalOrSpecialTransformations

Ancak çocuk odaklı LUMI evreninde nüfus değişimleri dikkatli ele alınmalıdır.

Özellikle ölüm:

varsayılan ve sık kullanılan bir simülasyon sonucu olmamalı,
doğrudan gösterilmek zorunda olmamalı,
yaş grubuna uygun biçimde soyutlanabilmeli,
çoğu durumda ayrılma, kaybolma, göç, hastalık veya emeklilik gibi daha yumuşak sonuçlarla temsil edilebilmelidir.

Nüfus değişimini etkileyen faktörler:

yiyecek güvenliği,
barınma,
güvenlik,
ekonomik fırsatlar,
çevresel koşullar,
başka yerleşimlerin çekiciliği,
aile ve sosyal bağlar,
kültürel uyum,
önceki hikâye olayları.
7. İhtiyaç sistemi

Yerleşimin ihtiyaçları yalnızca açlık veya para eksikliği değildir.

interface SettlementNeedVector {
  food: number;
  cleanWater: number;
  shelter: number;
  warmth: number;
  healthcare: number;
  safety: number;
  tools: number;
  transportation: number;
  education: number;
  socialConnection: number;
  culturalExpression: number;
  leadership: number;
  environmentalStability: number;
  hope: number;
}

Her değer “ne kadar kaynak bulunduğunu” değil, ilgili ihtiyacın ne ölçüde karşılanmadığını gösterebilir.

Örneğin:

food: 0.15
cleanWater: 0.75
socialConnection: 0.40
hope: 0.65

Bu yerleşimde yiyecek sorunu küçük, temiz su sorunu ciddi, gelecek umudu ise zayıf olabilir.

Böylece hikâye yalnızca “köyün yiyeceği kalmadı” türü görevler üretmez.

Şunlar da üretilebilir:

kasaba halkı birbirine güvenmiyor,
çocukların oynayabileceği güvenli alan kalmamış,
yaşlı ustaların bilgisi yeni kuşağa aktarılmıyor,
köy ekonomik olarak iyi olsa da kültürünü kaybetmeye başlamış,
herkes çalışıyor fakat hiç kimse geleceğe umutla bakmıyor.
8. Ekonomi modeli

LUMI ekonomisi gerçek dünya ekonomisinin ayrıntılı muhasebe simülasyonu olmamalıdır.

Sistem:

anlaşılır,
nedensel,
hikâye üretmeye uygun,
hesaplama açısından verimli

olmalıdır.

Ekonomi beş temel akış üzerinden çalışabilir:

Kaynak → Üretim → Depolama → Dağıtım → Tüketim

Buna ticaret ve kayıp katmanları eklenir:

Dışarıdan Giriş
       ↓
Kaynak → Üretim → Depolama → Dağıtım → Tüketim
  ↓        ↓          ↓           ↓
Kayıp    Atık      Bozulma     Eşitsizlik
       ↑
Dışarıya Çıkış
9. Kaynak türleri

Kaynaklar yalnızca fiziksel nesnelerden oluşmamalıdır.

Maddi kaynaklar
yiyecek,
temiz su,
odun,
taş,
metal,
kumaş,
ilaç,
tohum,
araç ve gereçler,
yakıt veya fantastik enerji kaynakları.
İnsan kaynakları
iş gücü,
ustalık,
liderlik,
öğretmenlik,
şifacılık,
keşif yeteneği,
taşıma kapasitesi.
Bilgi kaynakları
tarifler,
haritalar,
üretim teknikleri,
hava gözlemleri,
tarihsel bilgi,
büyü veya doğa bilgisi.
Sosyal kaynaklar
güven,
dayanışma,
itibar,
ortak amaç,
başka topluluklarla iyi ilişkiler.
Ekolojik kaynaklar
verimli toprak,
temiz nehir,
sağlıklı orman,
balık popülasyonu,
tozlaşma,
doğal koruma alanları.

Bu nedenle bir köyün çok miktarda altına sahip olması, onun gerçekten zengin olduğu anlamına gelmez.

10. Kaynak tanımı
interface ResourceDefinition {
  id: string;
  category:
    | "material"
    | "food"
    | "energy"
    | "knowledge"
    | "labor"
    | "social"
    | "ecological"
    | "special";

  renewability: number;
  perishability: number;
  transportDifficulty: number;
  storageDifficulty: number;
  ecologicalSensitivity: number;

  substitutionOptions: ResourceSubstitution[];
  productionRequirements: ResourceRequirement[];
  usageEffects: ResourceEffect[];
}

Bir kaynağın yalnızca miktarı değil, kalitesi ve erişilebilirliği de önemlidir.

interface ResourceStock {
  resourceId: string;
  quantity: number;
  quality: number;
  accessibility: number;
  reservedQuantity: number;
  expectedLossRate: number;
}

Örneğin köyün yeterli suyu bulunabilir fakat:

su kirli olabilir,
kuyuya ulaşmak tehlikeli olabilir,
suyun bir kısmı tarıma ayrılmış olabilir,
kuraklık nedeniyle kayıp oranı artmış olabilir.
11. Üretim sistemi

Üretim sabit bir dönüşüm tarifi değildir.

interface ProductionProcess {
  id: string;
  inputs: ResourceRequirement[];
  outputs: ResourceOutput[];

  laborRequirements: LaborRequirement[];
  infrastructureRequirements: InfrastructureRequirement[];
  knowledgeRequirements: KnowledgeRequirement[];

  environmentalConditions: ConditionRequirement[];
  sideEffects: ProductionSideEffect[];

  baseDuration: number;
  resilience: number;
  scalability: number;
}

Örneğin ekmek üretimi için yalnızca tahıl yeterli değildir:

tahıl,
temiz su,
değirmen,
fırın,
yakıt,
fırıncı bilgisi,
taşıma,
zaman

gerekebilir.

Bu zincirin herhangi bir halkası bozulduğunda üretim tamamen durmak zorunda değildir.

Sistem alternatif çözüm arayabilir:

başka köyden un alınması,
ortak fırın kurulması,
farklı bir yiyecek üretilmesi,
eski bir tarifin kullanılması,
çocuğun daha önce verdiği sihirli öğütme taşının devreye girmesi.
12. Meslekler ve roller

NPC meslekleri dekoratif etiketler olmamalıdır.

interface ProfessionDefinition {
  id: string;
  producedCapabilities: CapabilityVector;
  requiredSkills: SkillRequirement[];
  requiredTools: ResourceRequirement[];

  socialImportance: number;
  economicImportance: number;
  emergencyImportance: number;

  successionDifficulty: number;
  knowledgeTransferRate: number;
}

Bir yerleşimde tek şifacı varsa ve şifacı ayrılırsa:

sağlık hizmeti zayıflar,
halkın güven duygusu azalabilir,
bitki uzmanı onun görevlerinin bir kısmını üstlenebilir,
başka yerleşimden şifacı aranabilir,
genç bir çırak yetiştirilmeye başlanabilir.

Burada önemli olan yalnızca “şifacı yok” durumu değildir.

Yerleşimin bu eksikliğe nasıl tepki verdiği medeniyet simülasyonunun asıl parçasıdır.

13. Para, takas ve değer sistemleri

Her topluluğun para kullanması gerekmez.

type ExchangeSystem =
  | "gift_economy"
  | "barter"
  | "favor_exchange"
  | "shared_storage"
  | "token_currency"
  | "coin_currency"
  | "mixed";
Hediye ekonomisi

Topluluk üyeleri karşılık beklemeden katkıda bulunur; karşılık uzun vadeli sosyal güven üzerinden oluşur.

Takas

Kaynaklar doğrudan değiştirilir.

İyilik ve güven ekonomisi

“Bana yardım etti, daha sonra ben de ona yardım etmeliyim.”

Ortak depo

Üretim ortak depoya gider ve ihtiyaçlara göre dağıtılır.

Para sistemi

Fiyat, biriktirme, ticaret ve eşitsizlik gibi mekanikler daha görünür hâle gelir.

Sistemin para kullanmadığı yerlerde bile “değer” bulunur.

interface PerceivedValueVector {
  survivalValue: number;
  scarcityValue: number;
  culturalValue: number;
  emotionalValue: number;
  prestigeValue: number;
  tradeValue: number;
  futureValue: number;
}

Çocuğun verdiği küçük bir deniz kabuğu ekonomik olarak değersiz, fakat köy için duygusal ve kültürel olarak çok değerli olabilir.

14. Fiyat sistemi

Para kullanılan yerleşimlerde fiyat yalnızca arz ve talepten oluşmamalıdır.

Algılanan Fiyat =
Temel Değer
× Kıtlık Etkisi
× İhtiyaç Aciliyeti
× Taşıma Zorluğu
× Risk
× Satıcı Davranışı
× Kültürel Değer
× Yerleşim Güveni

Ancak LUMI’de fiyat simülasyonu ayrıntılı ekonomik tablo olarak kullanıcıya gösterilmek zorunda değildir.

Arka planda yapılan hesap hikâyeye şöyle yansıyabilir:

“Bu yıl elmalar çok bol olduğu için pazarda herkes birbirine elmalı çörek ikram ediyordu.”
“Dağ yolu kapandığından tuz bulmak zorlaşmıştı.”
“Bazı tüccarlar kıtlığı fırsata çevirmeye çalışıyordu.”
“Köy halkı parası olmayanlara da yiyecek vermeye karar verdi.”
15. Ticaret ağı

Yerleşimler birbirlerinden bağımsız ekonomik adalar değildir.

interface TradeRoute {
  id: string;
  originSettlementId: string;
  destinationSettlementId: string;

  transportedResources: TradeResourceFlow[];
  travelTime: number;
  capacity: number;
  reliability: number;
  dangerLevel: number;
  seasonalAccessibility: number;

  relationshipDependency: number;
  infrastructureDependency: number;
}

Bir ticaret yolunun çalışmasını etkileyenler:

hava koşulları,
yol durumu,
köprüler,
nehir seviyesi,
hayvan göçleri,
siyasi ilişkiler,
tüccar güveni,
korsan veya haydut riski,
büyülü anomaliler,
çocuğun önceki kararları.

Bir köprü yıkıldığında yalnızca ulaşım sorunu oluşmaz.

Zincirleme etkiler doğabilir:

Köprü yıkıldı
→ Ticaret gecikti
→ Tuz ve ilaç azaldı
→ Fiyatlar yükseldi
→ Halk endişelendi
→ Kasaba yönetimi baskı altında kaldı
→ Alternatif dağ yolu araştırıldı
→ Yeni hikâye fırsatı oluştu
16. Altyapı sistemi
interface InfrastructureState {
  roads: InfrastructureComponentState;
  bridges: InfrastructureComponentState;
  waterSystems: InfrastructureComponentState;
  sanitation: InfrastructureComponentState;
  storage: InfrastructureComponentState;
  housing: InfrastructureComponentState;
  workshops: InfrastructureComponentState;
  marketplaces: InfrastructureComponentState;
  schools: InfrastructureComponentState;
  healthcare: InfrastructureComponentState;
  defenses: InfrastructureComponentState;
  communication: InfrastructureComponentState;
}

Her altyapı bileşeni:

interface InfrastructureComponentState {
  capacity: number;
  condition: number;
  coverage: number;
  reliability: number;
  maintenanceNeed: number;
  environmentalImpact: number;
  accessibility: number;
}

değerlerine sahip olabilir.

Bir yapının var olması yeterli değildir.

Örneğin okul bulunabilir fakat:

öğretmeni olmayabilir,
yalnızca bazı çocuklar erişebiliyor olabilir,
bina hasarlı olabilir,
kitap bulunmayabilir,
halk eğitimi önemsemiyor olabilir.
17. Yerleşim projeleri

Topluluklar uzun vadeli işler başlatabilmelidir.

interface SettlementProject {
  id: string;
  type: SettlementProjectType;
  initiatorIds: string[];

  motivation: ProjectMotivationVector;
  requiredResources: ResourceRequirement[];
  requiredLabor: LaborRequirement[];
  requiredKnowledge: KnowledgeRequirement[];

  progress: number;
  priority: number;
  publicSupport: number;
  opposition: number;

  expectedBenefits: ProjectEffect[];
  possibleRisks: ProjectRisk[];

  status:
    | "proposed"
    | "approved"
    | "gathering_resources"
    | "active"
    | "paused"
    | "completed"
    | "abandoned"
    | "transformed";
}

Örnek projeler:

yeni kuyu açılması,
köprü yapılması,
okul kurulması,
ortak bostan oluşturulması,
ormanın yeniden canlandırılması,
limanın genişletilmesi,
eski gözlemevinin onarılması,
yeni göçmen aileler için ev yapılması.

Projeler otomatik olarak tamamlanmamalıdır.

Kaynak, iş gücü, destek ve çevresel koşullara göre ilerlemelidir.

18. Yönetim sistemi

Yerleşimin kararları “şehir karar verdi” şeklinde soyut kalmamalıdır.

type GovernanceModel =
  | "elder_council"
  | "elected_council"
  | "single_leader"
  | "guild_council"
  | "family_council"
  | "collective_consensus"
  | "rotating_leadership"
  | "guardian_entity"
  | "informal_community"
  | "mixed";

Yönetim özellikleri:

interface GovernanceState {
  model: GovernanceModel;
  legitimacy: number;
  effectiveness: number;
  transparency: number;
  fairness: number;
  flexibility: number;
  publicParticipation: number;
  corruptionRisk: number;
  internalConflict: number;
}

Aynı soruna farklı yönetimler farklı tepki verir.

Örneğin su kıtlığında:

tek lider hızlı fakat adaletsiz karar verebilir,
konsey daha yavaş fakat dengeli çözüm üretebilir,
uzlaşma topluluğu herkes kabul edene kadar bekleyebilir,
lonca yönetimi üreticilerin çıkarını önceliklendirebilir.
19. Toplumsal gruplar ve çıkarlar

Yerleşim halkı tek bir düşünceye sahip olmamalıdır.

interface SocialGroup {
  id: string;
  memberCohortIds: string[];

  values: ValueVector;
  interests: InterestVector;
  influence: InfluenceVector;

  trustTowardGovernance: number;
  satisfaction: number;
  cohesion: number;

  currentConcerns: SocialConcern[];
}

Örnek gruplar:

çiftçiler,
balıkçılar,
tüccarlar,
zanaatkârlar,
gençler,
yaşlılar,
yeni gelen aileler,
orman koruyucuları,
büyü kullanıcıları,
büyüden çekinenler.

Bir baraj projesi:

çiftçilerin su ihtiyacını çözebilir,
balıkçıları olumsuz etkileyebilir,
orman koruyucularını endişelendirebilir,
tüccarların desteğini alabilir.

Bu durum basit “iyi karar/kötü karar” yaklaşımının önüne geçer.

20. Toplumsal güven ağı

Güven tek bir sayı değildir.

interface SocialTrustVector {
  interpersonalTrust: number;
  trustInLeadership: number;
  trustInOutsiders: number;
  trustInInstitutions: number;
  trustBetweenGroups: number;
  trustInFuture: number;
}

Yerleşim ekonomik olarak güçlenirken sosyal açıdan zayıflayabilir.

Örneğin ticaret büyür fakat:

zenginlik adaletsiz dağılır,
eski komşuluk ilişkileri kaybolur,
dışarıdan gelenlere karşı önyargı oluşur,
halk yönetime güvenmez.

Bu durum yeni hikâye temaları doğurabilir:

paylaşmak,
adalet,
önyargı,
farklılıklarla birlikte yaşamak,
güveni yeniden kurmak.
21. Kültür sistemi

Kültür yalnızca yerleşimin görsel teması değildir.

interface CultureState {
  values: CulturalValueVector;
  traditions: TraditionState[];
  stories: SharedStory[];
  celebrations: CelebrationState[];
  taboos: CulturalTaboo[];
  symbols: CulturalSymbol[];
  knowledgeTransmission: number;
  opennessToChange: number;
  culturalConfidence: number;
  culturalFragmentation: number;
}

Kültür zamanla değişebilir.

Çocuğun eylemleri bile kültüre karışabilir.

Örneğin çocuk yıllar önce köyü büyük bir fırtınadan kurtardıysa, ileride:

her yıl “Fener Gecesi” düzenlenebilir,
çocuk hakkında şarkı söylenebilir,
kullandığı fener köyün sembolüne dönüşebilir,
olay zamanla yanlış hatırlanabilir,
farklı gruplar hikâyeyi farklı anlatabilir.

Böylece hikâye, yerleşimin kolektif hafızasına dönüşür.

22. Medeniyet bilgi ve teknoloji sistemi

Teknoloji doğrusal bir çağ ağacı şeklinde ilerlememelidir.

interface CivilizationCapabilityVector {
  agriculture: number;
  construction: number;
  medicine: number;
  navigation: number;
  metallurgy: number;
  ecology: number;
  astronomy: number;
  communication: number;
  education: number;
  logistics: number;
  magicUnderstanding: number;
  conflictResolution: number;
}

Bir topluluk:

gelişmiş astronomiye,
basit tarıma,
güçlü ekolojik bilgiye,
zayıf metal işçiliğine

sahip olabilir.

Bilgi şu yollarla gelişebilir:

deneyim,
keşif,
öğretim,
başka topluluklardan öğrenme,
eski kalıntıların bulunması,
çocuğun getirdiği bilgi veya eşya,
NPC’lerin araştırmaları,
kriz sırasında ortaya çıkan yenilikler.
23. Bilginin kaybolması

Bilgi edinildiğinde sonsuza kadar otomatik olarak korunmamalıdır.

Bilgi kaybına neden olabilecek durumlar:

ustanın ayrılması,
kayıtların zarar görmesi,
öğretimin kesilmesi,
toplumun bilgiye değer vermemesi,
dil değişimi,
bilgiye sahip grubun izole olması.
KnowledgeRetention =
  documentation
  × numberOfPractitioners
  × teachingRate
  × culturalImportance
  × institutionalSupport

Bu nedenle çocuğun bir köye öğrettiği çözüm, bir kez kullanılıp unutulabilir veya kuşaklar boyunca yaşatılabilir.

24. Yerleşim baskıları

Yerleşimdeki sorunları tek tek olay olarak değil, zaman içinde biriken baskılar olarak modelleyebiliriz.

interface SettlementPressure {
  id: string;
  type:
    | "resource_shortage"
    | "population_change"
    | "environmental"
    | "economic"
    | "social"
    | "political"
    | "cultural"
    | "infrastructure"
    | "external_threat"
    | "knowledge_loss";

  intensity: number;
  growthRate: number;
  visibility: number;
  urgency: number;

  affectedSystems: string[];
  affectedGroups: string[];

  adaptationProgress: number;
  narrativePotential: number;
}

Baskılar bir eşik aştığında kriz oluşabilir.

Fakat her baskı krize dönüşmez.

Yerleşim:

uyum sağlayabilir,
alternatif kaynak bulabilir,
yardım isteyebilir,
davranış değiştirebilir,
sorunu geçici olarak bastırabilir,
sorunu başka bir gruba aktarabilir.
25. Krizler ve zincirleme etkiler
interface SettlementCrisis {
  sourcePressureIds: string[];
  severity: number;
  duration: number;
  affectedPopulation: number;

  immediateEffects: SimulationEffect[];
  secondaryEffects: SimulationEffect[];
  longTermRisks: SimulationRisk[];

  responseOptions: CrisisResponse[];
}

Örneğin kuraklık:

Kuraklık
→ Su azaldı
→ Tarımsal üretim düştü
→ Yiyecek stoku azaldı
→ Fiyatlar yükseldi
→ Bazı aileler göç etmeyi düşündü
→ Köy içinde su paylaşımı tartışması başladı
→ Eski yeraltı kuyusu hatırlandı

Story Engine bu zincirin tamamını anlatmak zorunda değildir.

Çocuğun yaşına ve hikâye bağlamına göre yalnızca uygun kısmını seçer.

26. Yerleşimin otonom karar vermesi

Yerleşim kararları tek bir merkezi AI çağrısıyla verilmemelidir.

Kararlar şu katmanlardan çıkmalıdır:

İhtiyaçlar
+ Baskılar
+ Kaynaklar
+ Kültür
+ Yönetim
+ Sosyal gruplar
+ Önemli NPC kararları
+ Geçmiş tecrübeler
= Yerleşim eylem adayları

Ardından Utility Evaluator her seçeneği değerlendirir.

interface SettlementActionCandidate {
  actionType: string;

  expectedNeedReduction: number;
  resourceCost: number;
  laborCost: number;
  socialSupport: number;
  politicalFeasibility: number;
  culturalCompatibility: number;
  environmentalImpact: number;
  longTermBenefit: number;
  risk: number;
  reversibility: number;
}

Yerleşim her zaman en matematiksel olarak verimli seçeneği seçmez.

Kimliği, kültürü, liderliği ve geçmiş kararları sonucu etkiler.

27. Yerleşim karar hafızası

Yerleşimler geçmişte aldıkları kararlardan öğrenmelidir.

interface SettlementDecisionMemory {
  situationSignature: string;
  selectedAction: string;
  expectedOutcome: OutcomeVector;
  actualOutcome: OutcomeVector;

  publicReaction: CollectiveReaction;
  lessonsLearned: LessonVector;
  confidenceAdjustment: number;
}

Örneğin köy daha önce dışarıdan gelen bir tüccara güvenmiş ve aldatılmışsa:

yabancı tüccarlara karşı güven azalabilir,
yeni ticaret anlaşmaları daha zor kabul edilebilir,
bazı NPC’ler yine de herkesi geçmişteki biriyle yargılamamak gerektiğini savunabilir.

Bu durum kalıcı önyargıya dönüşebilir; fakat hikâye aracılığıyla iyileştirilebilir.

28. Çocuğun ekonomik etkisi

Çocuğun her sorunu doğrudan büyük miktarda kaynak vererek çözmesi doğru değildir.

Aksi hâlde yerleşim kendi iradesini kaybeder.

Çocuğun etkileri şu kategorilerde olmalıdır:

type ChildSettlementContribution =
  | "resource_contribution"
  | "knowledge_contribution"
  | "relationship_mediation"
  | "discovery"
  | "inspiration"
  | "labor_assistance"
  | "symbolic_action"
  | "decision_influence";

En değerli katkı her zaman maddi katkı olmayabilir.

Örneğin çocuk:

iki topluluk arasında güven kurabilir,
kayıp su yolunu keşfedebilir,
unutulmuş bir tarifi bulabilir,
insanları birlikte çalışmaya teşvik edebilir,
bir liderin başka bir bakış açısını görmesini sağlayabilir.

Böylece “kahraman her şeyi tek başına çözdü” yerine:

Çocuk, topluluğun kendi çözümünü bulmasına yardımcı oldu.

anlayışı korunur.

29. Çocuk tarafından sağlanan kaynakların dengelenmesi

Çocuğun sonsuz kaynak üretmesi engellenmelidir.

Örneğin envanterindeki tek bir sihirli tohum:

tüm kıtlığı anında bitirmemeli,
küçük bir örnek bahçe oluşturmalı,
halkın yeni tohumları yetiştirmeyi öğrenmesini sağlamalı,
uzun vadeli bir proje başlatmalıdır.
Çocuk katkısı
→ İlk fırsatı oluşturur
→ Yerleşim kendi emeğini ekler
→ Bilgi gelişir
→ Sonuç zaman içinde ortaya çıkar

Bu yaklaşım hem çocuğun etkisini anlamlı tutar hem de dünyanın bağımsızlığını korur.

30. Ekonomik eşitsizlik

Eşitsizlik doğrudan “zenginler kötüdür” biçiminde işlenmemelidir.

interface DistributionState {
  resourceAccessEquality: number;
  opportunityEquality: number;
  decisionParticipationEquality: number;
  burdenDistributionFairness: number;
  emergencySupportCoverage: number;
}

Sorular şunlar olabilir:

Kaynaklara kim erişebiliyor?
Kriz yükünü kim taşıyor?
Karar verirken kimlerin sesi duyuluyor?
Yardım gerçekten ihtiyacı olana ulaşıyor mu?
Bazı gruplar istemeden dışarıda mı kalıyor?

Bu sistem çocuklara adalet, paylaşım ve empati temalarını doğal olaylar üzerinden sunabilir.

31. Çevre-ekonomi bağlantısı

Ekonomi, World Ecology System’den ayrı çalışmamalıdır.

Orman sağlığı
→ Odun üretimi
→ Hayvan yaşam alanı
→ Su tutma kapasitesi
→ Sel riski
→ Tarım verimi
→ Yerleşim ekonomisi

Örneğin ağaçların hızla kesilmesi:

kısa vadede odun bolluğu,
yapılaşma artışı,
ekonomik rahatlama

sağlayabilir.

Ancak uzun vadede:

erozyon,
hayvan göçü,
su kalitesinin düşmesi,
sel riski,
kültürel kayıp

oluşturabilir.

Bu sonuçlar anında gerçekleşmemelidir. Etkiler farklı zaman ölçeklerinde yayılmalıdır.

32. Yerleşim evreleri

Yerleşimler zaman içinde farklı durumlara geçebilir:

type SettlementPhase =
  | "founding"
  | "stabilizing"
  | "growing"
  | "prosperous"
  | "stagnating"
  | "under_pressure"
  | "in_crisis"
  | "recovering"
  | "transforming"
  | "declining"
  | "dispersing"
  | "abandoned"
  | "rediscovered";

Bu evreler yalnızca nüfus veya ekonomi tarafından belirlenmemelidir.

Örneğin bir yerleşim ekonomik olarak küçülürken kültürel olarak yeniden canlanabilir. Bu durumda declining yerine transforming daha doğru olabilir.

33. Terk edilmiş yerleşimler

Bir yerleşim boşaldığında sistemden silinmemelidir.

Terk edilmiş yerleşim:

kalıntıya,
doğa alanına,
hayvan yuvasına,
gizli sığınağa,
tarihî hafıza mekânına,
gelecekte yeniden kurulabilecek bir bölgeye

dönüşebilir.

interface AbandonedSettlementState {
  formerSettlementId: string;
  abandonmentReasons: string[];

  remainingStructures: StructureRemnant[];
  preservedResources: ResourceStock[];
  ecologicalSuccession: EcologyState;

  culturalMemoryStrength: number;
  rediscoveryPotential: number;
  resettlementPotential: number;
}

Böylece dünya geçmişini kaybetmez.

34. Yerleşimler arası ilişkiler
interface SettlementRelation {
  targetSettlementId: string;

  trust: number;
  tradeDependency: number;
  culturalAffinity: number;
  politicalAlignment: number;
  historicalTension: number;
  mutualAid: number;
  knowledgeExchange: number;
  migrationFlow: number;
}

İlişkiler tek bir dostluk değeriyle tutulmamalıdır.

İki şehir:

yoğun ticaret yapabilir,
birbirine güvenmeyebilir,
kültürel olarak yakın olabilir,
siyasi olarak rekabet edebilir,
kriz anında yine de yardımlaşabilir.

Bu çok boyutluluk daha gerçekçi hikâyeler üretir.

35. Medeniyetler arası etkileşim

Farklı medeniyetler karşılaştığında sistem yalnızca savaş veya ticaret üretmemelidir.

Olası etkileşimler:

bilgi alışverişi,
ortak kutlama,
dil öğrenimi,
karma aileler,
ortak yapı projeleri,
kaynak paylaşımı,
kültürel yanlış anlaşılma,
farklı değerlerin çatışması,
birlikte geliştirilen yeni gelenekler.

Çocuk, bu etkileşimlerde arabulucu veya meraklı bir gözlemci olabilir.

36. Settlement Narrative Potential

Her yerleşim durumu hikâye olmamalıdır.

Sistem hikâye potansiyelini hesaplamalıdır.

interface NarrativePotentialState {
  unresolvedNeeds: number;
  emotionalTension: number;
  moralComplexity: number;
  childAgencyOpportunity: number;
  discoveryPotential: number;
  relationshipPotential: number;
  visibleChangePotential: number;
  ageAppropriateness: number;
  repetitionRisk: number;
}

Örneğin küçük bir un eksikliği düşük hikâye potansiyeline sahip olabilir.

Ancak:

un eksikliğinin nedeni kırık değirmen,
değirmeni onarabilecek yaşlı usta ile genç çırağın küs olması,
yaklaşan festival,
çocuğun geçmişte iki karakteri de tanımış olması

durumunda yüksek hikâye potansiyeli oluşur.

37. Simülasyon yoğunluğu

Tüm yerleşimler aynı ayrıntıyla hesaplanmamalıdır.

type SettlementSimulationTier =
  | "foreground"
  | "nearby"
  | "connected"
  | "background"
  | "dormant";
Foreground

Çocuğun bulunduğu veya aktif hikâyenin geçtiği yerleşim.

ayrıntılı NPC kararları,
kaynak akışları,
projeler,
sosyal tepkiler.
Nearby

Yakındaki ve hikâyeyi etkileyebilecek yerleşimler.

önemli üretim ve ticaret değişimleri,
kritik NPC kararları,
çevresel etkiler.
Connected

Ticaret, göç veya ilişki ağıyla bağlı yerleşimler.

özet ekonomik değişimler,
ticaret ve büyük olaylar.
Background

Uzak yerleşimler.

dönemsel toplu hesaplama,
yalnızca büyük değişimler.
Dormant

Uzun süredir ilgisiz yerleşimler.

ayrıntılı simülasyon yapılmaz,
geri dönüldüğünde kontrollü durum uzlaştırması uygulanır.
38. Uzun çevrimdışı süre yaklaşımı

Daha önce belirlediğimiz prensip burada da geçerli olmalıdır:

Kullanıcı uzun süre uygulamaya girmediyse dünya sınırsız biçimde ilerlememelidir.

Önerdiğimiz yoğunluk eğrisi:

0–1 gün: Ayrıntılı simülasyon
2–3 gün: Orta yoğunluk
4–7 gün: Özet simülasyon
8–10 gün: Yalnızca önemli dönüşümler
10 gün sonrası: Dünya durumu dondurulur

Ancak ekonomik süreçler tamamen rastgele atlanmamalıdır.

Örneğin ekmek stoğu 3 günde bitecekse, 10 gün sonunda sistem köyü otomatik olarak yok etmemelidir.

Yerleşim kendi uyum mekanizmalarını kullanmalıdır:

tüketimi azaltma,
alternatif yiyecek,
ticaret,
ortak stok,
göç,
acil üretim.

Sonuç, “matematiksel olarak 7 gün sonra herkes aç kaldı” şeklinde olmamalıdır.

39. Simülasyon uzlaştırması

Çocuk uzun süre sonra yerleşime döndüğünde sistem şu sırayla çalışmalıdır:

1. Son bilinen durum alınır
2. Geçen zaman belirlenir
3. Kritik süreçler bulunur
4. Yerleşimin uyum kapasitesi hesaplanır
5. En olası önemli değişimler seçilir
6. Aşırı veya çelişkili sonuçlar sınırlandırılır
7. Yeni durum oluşturulur
8. Çocuğa anlaşılır bir “dönüş özeti” hazırlanır

Örnek:

“Sen yokken köylüler eski kuyuyu temizlemeyi başardı. Yağmurlar az olduğu için bahçeler küçülmüş ama kimse susuz kalmamış. Mira, çocuklara suyu dikkatli kullanmayı öğreten küçük bir kulüp kurmuş.”

Bu özet hem değişimi anlatır hem de kullanıcıyı bilgi bombardımanına tutmaz.

40. Temel mimari
World State
   │
   ├── Ecology System
   ├── Weather & Environment
   ├── NPC Autonomous Action System
   ├── Time Progression System
   └── Historical Memory
            │
            ▼
Settlement Observation Builder
            │
            ▼
Needs & Pressure Analyzer
            │
            ▼
Economy Simulation
            │
            ├── Production
            ├── Consumption
            ├── Storage
            ├── Trade
            └── Distribution
            │
            ▼
Social & Governance Simulation
            │
            ▼
Settlement Decision Generator
            │
            ▼
Utility Evaluator
            │
            ▼
Settlement Actions & Projects
            │
            ▼
World State Changes
            │
            ▼
Narrative Potential Evaluator
            │
            ▼
Story Engine Candidates
41. Bu sistemin ana tasarım ilkeleri
Yerleşimler dekor değil, aktördür.
Ekonomi para simülasyonundan daha geniştir.
Kaynaklar maddi, sosyal, bilgi temelli ve ekolojik olabilir.
Nüfus yalnızca sayılardan oluşmaz.
Topluluklar tek bir ortak düşünceye sahip değildir.
Her gelişim büyüme anlamına gelmez.
Krizler tek olay değil, birikmiş baskıların sonucudur.
Çocuğun katkısı yerleşimin iradesini yok etmemelidir.
Yerleşimler sorunlara kendi kimliklerine göre tepki vermelidir.
Geçmiş kararlar gelecekteki davranışları değiştirmelidir.
Çevre ve ekonomi birbirinden ayrı hesaplanmamalıdır.
Her simülasyon sonucu hikâyeye dönüştürülmemelidir.
Uzak yerleşimler düşük maliyetli toplu yöntemlerle hesaplanmalıdır.
Uzun çevrimdışı sürelerde dünya sınırsız ilerlememelidir.
Tüm sonuçlar çocuk yaş grubuna uygun şekilde anlatılmalıdır.
Sonuç

Bu sistem sayesinde LUMI evrenindeki yerleşimler:

ihtiyaç hisseden,
üretim yapan,
kaynak paylaşan,
ticaret kuran,
bilgi geliştiren,
hata yapan,
geçmişten öğrenen,
kültür oluşturan,
çevresine uyum sağlayan,
çocuğun eylemlerini hatırlayan

yaşayan topluluklara dönüşecektir.

Bir yerleşime geri dönmek yalnızca eski bir mekânı tekrar ziyaret etmek olmayacaktır.

Çocuk, geçmişte dokunduğu bir topluluğun zaman içinde nasıl değiştiğini görebilecektir.