Bölüm 3 — Settlement Growth, Migration, Founding & Abandonment System

Bu bölümde yerleşimlerin nasıl büyüdüğünü, küçüldüğünü, bölündüğünü, yeni yerleşimler kurduğunu, nüfus hareketlerinden nasıl etkilendiğini ve terk edilmiş alanların dünya hafızasında nasıl yaşamaya devam ettiğini tanımlıyoruz.

Ana ilke:

Yerleşim gelişimi yalnızca nüfus artışı değildir; bazen büyümek, bazen küçülmek, bazen taşınmak, bazen birleşmek ve bazen de eski biçimini bırakıp başka bir toplumsal yapıya dönüşmek daha sağlıklı olabilir.

96. Yerleşim değişim türleri

Bir yerleşim yalnızca “büyür” veya “küçülür” şeklinde ele alınmamalıdır.

type SettlementTransformationType =
  | "population_growth"
  | "population_decline"
  | "spatial_expansion"
  | "densification"
  | "specialization"
  | "diversification"
  | "administrative_upgrade"
  | "administrative_downgrade"
  | "fragmentation"
  | "merger"
  | "relocation"
  | "seasonal_shift"
  | "cultural_transformation"
  | "economic_transformation"
  | "ecological_adaptation"
  | "partial_abandonment"
  | "full_abandonment"
  | "resettlement";

Örneğin bir köy:

nüfusu artmadan daha üretken olabilir,
fiziksel olarak büyümeden eğitim merkezi olabilir,
ticaret yerleşiminden kültür merkezine dönüşebilir,
sel riski nedeniyle tamamıyla başka yere taşınabilir,
iki mahalleye bölünebilir,
yakın bir göçebe toplulukla birleşebilir.
97. Growth Pressure Vector

Büyüme bir ödül gibi değil, yerleşim üzerinde oluşan çok boyutlu baskı olarak ele alınmalıdır.

interface GrowthPressureVector {
  housingPressure: number;
  landPressure: number;
  infrastructurePressure: number;
  foodPressure: number;
  waterPressure: number;
  laborPressure: number;
  governancePressure: number;
  socialIntegrationPressure: number;
  ecologicalPressure: number;
  servicePressure: number;
}

Nüfus artışı olumlu görünse bile:

ev yetersizliği,
su sıkıntısı,
eğitim kapasitesi,
trafik veya taşıma sorunu,
mahalleler arası gerilim,
orman alanının daralması

gibi sonuçlar doğurabilir.

Bu nedenle büyüme, ayrı bir yönetim problemi oluşturmalıdır.

98. Settlement Carrying Capacity

Bir yerleşimin taşıma kapasitesi tek bir sayı olmamalıdır.

interface SettlementCarryingCapacityVector {
  foodCapacity: number;
  waterCapacity: number;
  housingCapacity: number;
  laborAbsorptionCapacity: number;
  infrastructureCapacity: number;
  governanceCapacity: number;
  ecologicalCapacity: number;
  socialIntegrationCapacity: number;
  healthcareCapacity: number;
  educationCapacity: number;
}

Etkin taşıma kapasitesi:

Etkin Kapasite =
Fiziksel Kapasite
× Erişilebilirlik
× Yönetim Verimliliği
× Dağıtım Başarısı
× Mevsimsel Koşullar
× Ekolojik Dayanıklılık

Bir yerleşimde boş evlerin bulunması, yeni nüfus için gerçekten yeterli kapasite olduğu anlamına gelmeyebilir.

Çünkü:

evler sağlıksız olabilir,
su sistemi yetersizdir,
iş imkânı yoktur,
yeni gelenlere karşı sosyal direnç vardır,
okul veya sağlık hizmeti yetersizdir.
99. Büyüme kapasitesi ile büyüme isteği ayrımı

Yerleşim büyüyebiliyor olabilir fakat büyümek istemeyebilir.

interface GrowthAttitudeVector {
  desireForPopulationGrowth: number;
  desireForEconomicGrowth: number;
  desireForInfluenceGrowth: number;
  desireForTerritorialGrowth: number;
  opennessToNewcomers: number;
  preservationPreference: number;
  densityTolerance: number;
  changeTolerance: number;
}

Örneğin doğayla uyumlu küçük bir köy:

ekonomik güvenlik isteyebilir,
daha fazla nüfus istemeyebilir,
fiziksel genişlemeyi reddedebilir,
yeni aileleri yakın bir uydu yerleşime yönlendirebilir.

Bu karar sistem tarafından başarısızlık olarak görülmemelidir.

100. Settlement Growth Readiness

Bir yerleşimin sağlıklı büyüyebilmesi için hazırlık seviyesi hesaplanmalıdır.

interface GrowthReadinessVector {
  housingReadiness: number;
  resourceReadiness: number;
  infrastructureReadiness: number;
  laborReadiness: number;
  governanceReadiness: number;
  socialReadiness: number;
  ecologicalReadiness: number;
  culturalReadiness: number;
}

Büyüme yalnızca şu koşullarda hızlanmalıdır:

yeterli barınma,
sürdürülebilir kaynak,
iş gücü için anlamlı roller,
yeni gelenleri kabul edebilecek sosyal yapı,
genişlemeyi kaldırabilecek çevre,
karar alabilecek yönetim kapasitesi.

Aksi durumda büyüme, yeni baskılar üretir.

101. Settlement Growth Score kullanılmamalıdır

Yerleşime tek bir “büyüme skoru” vermek sistemi aşırı basitleştirir.

Bunun yerine büyüme değerlendirmesi şu sorulara cevap vermelidir:

Nüfus artabilir mi?
Nüfus artmalı mı?
Fiziksel genişleme mümkün mü?
Fiziksel genişleme doğru mu?
Hizmet kapasitesi yeterli mi?
Yeni gelenlerin toplumla bütünleşmesi mümkün mü?
Büyüme çevreyi bozacak mı?
Yerleşim başka bir yapıya mı dönüşmeli?

Sonuç:

interface GrowthAssessment {
  canGrow: boolean;
  shouldGrow: boolean;
  recommendedMode:
    | "none"
    | "controlled_growth"
    | "densification"
    | "satellite_settlement"
    | "specialization"
    | "temporary_expansion"
    | "relocation"
    | "transformation";

  limitingFactors: GrowthConstraint[];
  enablingFactors: GrowthEnabler[];
}
102. Büyüme biçimleri
102.1. Yatay genişleme

Yerleşim çevresindeki yeni alanlara yayılır.

Riskleri:

tarım alanı kaybı,
orman baskısı,
yol ve su maliyeti,
yerleşim bütünlüğünün bozulması.
102.2. Yoğunlaşma

Aynı alan içinde daha fazla barınma ve hizmet oluşturulur.

Riskleri:

kalabalıklaşma,
ortak alan kaybı,
altyapı yükü,
yaşam kalitesinde düşüş.
102.3. Uydu yerleşim

Yakında yeni ve bağlı bir küçük yerleşim kurulur.

Avantajları:

ana yerleşimin baskısı azalır,
yeni ekonomik uzmanlaşma oluşabilir,
bölgesel ağ güçlenir.

Riskleri:

kaynak bölünmesi,
ulaşım bağımlılığı,
yeni yönetim sorunu,
kimlik çatışması.
102.4. Mevsimsel genişleme

Yerleşim yılın belirli dönemlerinde büyür.

Örnek:

yaz pazarı,
kış kampı,
balıkçılık mevsimi,
göç yolu konaklama noktası.
102.5. İşlevsel büyüme

Nüfus artmadan yerleşimin etkisi artar.

Örneğin:

eğitim merkezi,
sağlık merkezi,
liman,
festival merkezi,
gözlemevi,
ticaret durağı.
103. Mahalle ve alt-yerleşim modeli

Büyük yerleşimler tek bir homojen nesne olarak tutulmamalıdır.

interface SettlementDistrict {
  id: string;
  settlementId: string;

  identity: DistrictIdentity;
  population: PopulationState;
  resourceAccess: ResourceAccessState[];
  infrastructure: Partial<InfrastructureState>;

  dominantGroups: string[];
  localNeeds: SettlementNeedVector;
  localMood: CollectiveSentimentVector;

  connectionStrengthToCenter: number;
  autonomyLevel: number;
}

Örnek mahalleler:

liman mahallesi,
eski yerleşim,
yeni evler bölgesi,
zanaatkârlar sokağı,
bahçe bölgesi,
göçmen mahallesi,
yüksek tepeler,
su kenarı.

Bir sorun bütün şehri değil, yalnızca belirli mahalleyi etkileyebilir.

Bu ayrım özellikle dağıtım ve eşitsizlik sisteminde önemlidir.

104. Merkez-çevre ilişkisi

Yerleşim büyüdükçe merkez ve çevre arasında farklılık oluşabilir.

interface CenterPeripheryState {
  resourceAccessGap: number;
  serviceAccessGap: number;
  politicalVoiceGap: number;
  infrastructureGap: number;
  culturalDistance: number;
  economicDependency: number;
}

Örneğin:

merkezde su sistemi iyi,
dış mahallelerde kuyular yetersiz,
pazar merkezdedir,
uzak aileler karar süreçlerine katılamıyordur.

Bu durum sistem tarafından görünmez bırakılmamalıdır.

105. Migration System temel yaklaşımı

Göç yalnızca nüfusun bir yerden diğerine aktarılması değildir.

Göç:

ihtiyaç,
umut,
korku,
fırsat,
ilişki,
kültür,
çevre,
zorunluluk

gibi etkenlerin birleşimidir.

interface MigrationIntent {
  sourcePopulationCohortId: string;
  sourceSettlementId: string;
  preferredDestinationIds: string[];

  pushFactors: MigrationFactorVector;
  pullFactors: MigrationFactorVector;

  willingness: number;
  urgency: number;
  preparationLevel: number;
  mobilityCapacity: number;

  desiredMigrationType: MigrationType;
}
106. Migration Type
type MigrationType =
  | "individual"
  | "family"
  | "small_group"
  | "cohort"
  | "seasonal"
  | "temporary"
  | "educational"
  | "economic"
  | "environmental"
  | "emergency"
  | "return"
  | "circular"
  | "nomadic_shift"
  | "resettlement";

Göç kalıcı olmak zorunda değildir.

Örneğin:

bir genç eğitim için şehre gider,
çiftçiler mevsimlik olarak yüksek ovaya çıkar,
aileler fırtına dönemi boyunca geçici taşınır,
tüccarlar sürekli iki şehir arasında yaşar,
eski sakinler yıllar sonra geri döner.
107. Göç itici faktörleri
interface MigrationPushVector {
  resourceShortage: number;
  unemployment: number;
  housingShortage: number;
  safetyConcern: number;
  environmentalStress: number;
  socialExclusion: number;
  governanceDistrust: number;
  culturalConflict: number;
  lackOfOpportunity: number;
  familySeparation: number;
  infrastructureFailure: number;
  lossOfHope: number;
}

İnsanlar yalnızca açlık yüzünden göç etmez.

Örneğin bir NPC:

yeteneğini geliştiremediği,
kendini kabul edilmiş hissetmediği,
ailesine yakın olmak istediği,
yeni yerler görmek istediği

için de ayrılabilir.

108. Göç çekici faktörleri
interface MigrationPullVector {
  employmentOpportunity: number;
  housingAvailability: number;
  safety: number;
  educationOpportunity: number;
  familyConnections: number;
  culturalCompatibility: number;
  socialAcceptance: number;
  resourceSecurity: number;
  perceivedProsperity: number;
  adventureAppeal: number;
  reputation: number;
}

Burada perceivedProsperity, gerçek durumdan farklı olabilir.

Bir şehir dışarıdan çok zengin görünebilir fakat:

ev bulmak zordur,
yeni gelenler dışlanır,
iş imkânları abartılmıştır.

Bu nedenle göç kararında algı ve gerçek ayrı tutulmalıdır.

109. Migration Decision Utility
interface MigrationUtilityVector {
  expectedSafety: number;
  expectedWellbeing: number;
  economicOpportunity: number;
  familyBenefit: number;
  culturalComfort: number;
  personalGrowth: number;
  journeyRisk: number;
  uncertainty: number;
  attachmentCost: number;
  socialLoss: number;
}

Göç kararı:

Gitme Faydası
- Yol Riski
- Belirsizlik
- Geride Bırakma Maliyeti
+ Gelecek Umudu

şeklinde değerlendirilir.

Ancak herkes aynı kararı vermez.

yaşlı biri bağlarına daha çok önem verebilir,
genç biri fırsatı daha değerli görebilir,
çocuklu aile güvenlik ve eğitim arayabilir,
maceracı NPC belirsizlikten daha az çekinebilir.
110. Hane ve aile temelli göç

Nüfus grupları soyut biçimde hareket edebilir, ancak aile bağları korunmalıdır.

interface MigrationHousehold {
  householdId: string;
  memberNpcIds: string[];
  dependentCount: number;

  sharedResources: ResourceQuantity[];
  mobility: number;
  cohesion: number;

  internalAgreement: number;
  destinationPreference: string[];
}

Bir aile içinde herkes aynı fikirde olmayabilir.

Örneğin:

ebeveyn taşınmak ister,
çocuk arkadaşlarından ayrılmak istemez,
büyükanne köyde kalmak ister,
genç kardeş yeni şehirde eğitim görmek ister.

Bu anlaşmazlıklar yüksek anlatı potansiyeli taşıyabilir.

111. Göç hazırlığı

Göç kararı verildiğinde nüfus anında taşınmamalıdır.

interface MigrationPlan {
  id: string;
  householdIds: string[];

  originSettlementId: string;
  destinationSettlementId?: string;

  status:
    | "considering"
    | "preparing"
    | "waiting"
    | "departing"
    | "in_transit"
    | "arrived"
    | "integrating"
    | "cancelled"
    | "redirected";

  requiredResources: ResourceRequirement[];
  routeOptions: string[];

  departureReadiness: number;
  expectedDepartureTime?: WorldTime;
}

Hazırlık aşamasında:

eşya toplanır,
yol araştırılır,
ev aranır,
akrabalarla iletişim kurulur,
ulaşım ayarlanır,
bazı kaynaklar satılır veya dağıtılır.

Bu süreç geri döndürülebilir olabilir.

112. Yolculuk ve göç güvenliği

Göç yolculukları ticaret sevkiyatlarına benzese de farklı ihtiyaçlara sahiptir.

interface MigrationJourney {
  planId: string;
  routeId: string;

  travelerCount: number;
  dependentCount: number;
  journeyProgress: number;

  foodCoverage: number;
  waterCoverage: number;
  healthState: number;
  morale: number;
  safety: number;

  currentNeeds: JourneyNeed[];
}

Çocuk odaklı sistemde göç yolculuğu otomatik olarak ağır felaketlere dönüşmemelidir.

Daha uygun zorluklar:

yolun kapanması,
yanlış yola sapma,
yorulan taşıma hayvanı,
kaybolan eşya,
beklenmeyen konaklama,
başka yolcularla yardımlaşma.
113. Hedef yerleşim değerlendirmesi

Bir yerleşim yeni gelenleri kabul etmeden önce kapasitesini değerlendirmelidir.

interface MigrationReceptionAssessment {
  availableHousing: number;
  foodCapacity: number;
  waterCapacity: number;
  laborDemand: number;
  serviceCapacity: number;

  culturalCompatibility: number;
  publicAcceptance: number;
  governanceSupport: number;
  integrationCapacity: number;

  recommendedAdmission:
    | "accept"
    | "accept_with_support"
    | "temporary_acceptance"
    | "limited_acceptance"
    | "redirect"
    | "cannot_accept";
}

Bu sistem ayrımcılığı normalleştirmek için değil, gerçek kapasite ve toplumsal davranışları anlamlı biçimde modellemek için kullanılmalıdır.

Önyargı oluşabilir, ancak sistem bunu nötr bir gerçek veya doğru davranış gibi sunmamalıdır.

114. Integration System

Yeni gelenlerin yerleşime ulaşması göç sürecinin sonu değildir.

interface IntegrationState {
  migrantCohortId: string;
  hostSettlementId: string;

  housingIntegration: number;
  economicIntegration: number;
  socialIntegration: number;
  culturalIntegration: number;
  institutionalAccess: number;
  languageIntegration: number;

  hostAcceptance: number;
  newcomerBelonging: number;
  identityPreservation: number;

  integrationStress: number;
}

Başarılı entegrasyon:

yeni gelenlerin eski kimliğini tamamen silmek değildir,
ev sahibi kültürün tamamen değişmesi değildir,
iki tarafın güvenli ve anlamlı ilişki geliştirmesidir.
115. Entegrasyon modelleri
type IntegrationModel =
  | "assimilation"
  | "parallel_coexistence"
  | "mutual_adaptation"
  | "cultural_exchange"
  | "temporary_hosting"
  | "segregated"
  | "conflicted";

LUMI’nin tercih ettiği sağlıklı model genellikle:

mutual_adaptation
veya
cultural_exchange

olmalıdır.

Ancak sistem bazen sorunlu modeller üretebilir; bunlar çözülmesi gereken toplumsal mesele olarak görülmelidir.

116. Yeni gelenlerin katkıları

Göç yalnızca kaynak yükü oluşturmamalıdır.

Yeni gelenler şu değerleri getirebilir:

iş gücü,
yeni meslek,
üretim tekniği,
dil,
müzik,
yemek,
farklı çevre bilgisi,
ticaret bağlantısı,
yeni hikâyeler,
yeni bakış açıları.
interface MigrantContributionVector {
  laborContribution: number;
  skillContribution: number;
  knowledgeContribution: number;
  tradeConnectionContribution: number;
  culturalContribution: number;
  socialContribution: number;
  innovationContribution: number;
}
117. Yeni gelenlerin ihtiyaçları

Katkı sağlıyor olmaları, desteğe ihtiyaç duymadıkları anlamına gelmez.

interface NewcomerNeedVector {
  immediateShelter: number;
  foodAndWater: number;
  orientation: number;
  languageSupport: number;
  employmentSupport: number;
  healthcare: number;
  education: number;
  socialConnection: number;
  identitySafety: number;
}

Bu ihtiyaçlar karşılanmazsa:

entegrasyon yavaşlar,
güvensizlik artar,
ayrışma oluşabilir,
göçmen grup başka yere hareket edebilir.
118. Return Migration

Daha önce ayrılmış NPC’ler geri dönebilir.

interface ReturnMigrationMotivation {
  familyAttachment: number;
  nostalgia: number;
  improvedConditions: number;
  failedMigrationOutcome: number;
  responsibility: number;
  newOpportunity: number;
  culturalConnection: number;
}

Geri dönen NPC aynı kişi gibi davranmamalıdır.

Yanında şunları getirebilir:

yeni beceri,
yeni görüş,
başka kültürden alışkanlık,
yeni ilişki,
hayal kırıklığı,
özlem,
değişmiş kişilik.

Bu durum yerleşimin kültürünü dönüştürebilir.

119. Brain Drain ve Knowledge Return

Yetenekli NPC’lerin ayrılması yerleşimi etkileyebilir.

interface KnowledgeMobilityEffect {
  departedCapabilities: CapabilityVector;
  remainingRedundancy: number;
  apprenticeCoverage: number;
  documentationCoverage: number;

  externalNetworkGain: number;
  returnKnowledgePotential: number;
}

Bir genç şifacı eğitim için ayrıldığında kısa vadede kapasite azalabilir.

Fakat ileride:

yeni bilgiyle dönebilir,
iki şehir arasında sağlık ağı kurabilir,
uzaktan tavsiye verebilir,
başka bir çırağı gönderebilir.

Göç her zaman kalıcı kayıp değildir.

120. Settlement Founding System

Yeni yerleşimler yalnızca rastgele oluşturulmamalıdır.

Bir yerleşimin kurulması için bir kurucu motivasyon bulunmalıdır.

type FoundingMotivation =
  | "resource_access"
  | "trade_location"
  | "safety"
  | "population_pressure"
  | "cultural_independence"
  | "exploration"
  | "religious_or_spiritual"
  | "ecological_adaptation"
  | "strategic_location"
  | "refuge"
  | "project_site"
  | "seasonal_use"
  | "community_split";
121. Kuruluş aday bölgesi
interface SettlementSiteCandidate {
  regionId: string;

  waterAccess: number;
  foodPotential: number;
  shelterPotential: number;
  constructionMaterialAccess: number;

  routeConnectivity: number;
  defensePotential: number;
  environmentalStability: number;
  ecologicalSensitivity: number;

  culturalImportance: number;
  existingClaims: SettlementClaim[];
  knownRisks: SiteRisk[];

  suitabilityBySettlementType: Record<string, number>;
}

Bir alan kaynak açısından çok iyi olabilir fakat:

kutsal kabul ediliyor,
hassas ekosisteme sahip,
sel riski taşıyor,
başka topluluğun mevsimsel kullanım alanı,
önemli hayvan göç yolu üzerinde bulunuyor

olabilir.

Kuruluş kararı yalnızca kaynak verimliliğine göre verilmemelidir.

122. Arazi hakkı ve kullanım ilişkileri

Boş görünen alan gerçekten sahipsiz olmayabilir.

interface SettlementClaim {
  claimantType:
    | "settlement"
    | "community"
    | "nomadic_group"
    | "family"
    | "guardian_entity"
    | "ecological_protection";

  claimantId: string;
  claimType:
    | "ownership"
    | "seasonal_use"
    | "cultural"
    | "spiritual"
    | "resource_use"
    | "historical"
    | "protective";

  strength: number;
  compatibilityWithNewSettlement: number;
}

Bu model, yeni yerleşim kurmayı “boş araziyi ele geçirmek” kadar basit olmaktan çıkarır.

Çözümler:

izin istemek,
ortak kullanım anlaşması,
başka alan seçmek,
mevsimsel paylaşım,
alanı koruyarak sınırlı yerleşim,
ortak proje.
123. Kurucu grup
interface FoundingGroup {
  memberCohortIds: string[];
  leaderNpcIds: string[];

  populationSize: number;
  skillCoverage: CapabilityVector;
  availableResources: ResourceQuantity[];

  cohesion: number;
  sharedVision: number;
  adaptability: number;
  conflictLevel: number;
}

Yeni yerleşimin başarısını yalnızca kaynaklar değil, grubun beceri dengesi de belirler.

Örneğin yalnızca madencilerden oluşan bir grup:

maden üretiminde güçlü,
tarımda zayıf,
sağlık hizmetinde kırılgan,
dış ticarete bağımlı

olabilir.

124. Minimum viable settlement

Yeni yerleşim için gerekli temel işlevler:

interface MinimumSettlementRequirements {
  waterAccess: number;
  foodCoverageDays: number;
  shelterCoverage: number;
  basicHealthcareCapability: number;
  maintenanceCapability: number;
  governanceCapability: number;
  emergencyCommunication: number;
}

Bunlar sağlanmıyorsa alan kalıcı yerleşim yerine:

geçici kamp,
mevsimlik istasyon,
keşif noktası,
ticaret durağı

olarak başlamalıdır.

125. Kuruluş aşamaları
type SettlementFoundingPhase =
  | "idea"
  | "exploration"
  | "site_selection"
  | "agreement"
  | "preparation"
  | "temporary_camp"
  | "initial_construction"
  | "stabilization"
  | "recognized_settlement"
  | "failed"
  | "relocated";

Bu süreç haftalar veya aylar sürebilir.

Çocuk bir yerleşimin kuruluşuna farklı aşamalarda tanık olabilir.

Örneğin:

yer seçimi tartışmasına katılır,
ilk kuyunun bulunmasına yardım eder,
iki topluluk arasında kullanım anlaşması kurar,
yeni yerleşimin isminin belirlenmesine katılır.
126. Yerleşim ismi ve kimliğinin oluşması

Yeni yerleşimin kimliği önceden tam olarak belirlenmemelidir.

Kimlik şu kaynaklardan gelişebilir:

Kurucu grubun kültürü
+ Kuruluş motivasyonu
+ Bölgenin özellikleri
+ İlk krizler
+ İlk başarılar
+ Komşu topluluklarla ilişkiler
+ Önemli karakterlerin etkisi
= Yerleşim kimliği

Örneğin selden kaçan ailelerin kurduğu yerleşim:

güvenli yapılaşmaya çok önem verebilir,
suya karşı hem saygı hem korku geliştirebilir,
her yıl yüksek su anma günü düzenleyebilir.
127. Kuruluş hafızası
interface FoundingMemory {
  foundingMotivations: FoundingMotivation[];
  foundingNpcIds: string[];
  foundingCohortIds: string[];

  initialChallenges: string[];
  firstMajorSuccess: string;
  firstSharedDecision: string;

  symbolicObjects: string[];
  foundingStories: SharedStory[];
}

Yerleşimin kuruluş hikâyesi zamanla kültürel hafızaya dönüşür.

Ancak nesiller içinde:

bazı ayrıntılar unutulabilir,
kurucular idealize edilebilir,
farklı gruplar kuruluşu farklı anlatabilir.
128. Settlement Fragmentation

Bir yerleşim iki veya daha fazla yapıya bölünebilir.

Nedenler:

nüfus baskısı,
coğrafi ayrım,
yönetim anlaşmazlığı,
kültürel farklılık,
ekonomik uzmanlaşma,
çevresel değişim,
kaynak erişimi,
planlı uydu yerleşim.
interface SettlementFragmentationPlan {
  sourceSettlementId: string;
  emergingSettlementCandidates: EmergingSettlement[];

  sharedAssets: SharedAssetAllocation[];
  populationAllocation: PopulationAllocation[];
  governanceTransition: GovernanceTransition;

  relationshipAfterSplit: SettlementRelation;
}

Bölünme mutlaka düşmanlık anlamına gelmez.

İki kardeş yerleşim:

ortak pazar kullanabilir,
ayrı yönetimlere sahip olabilir,
aynı festivali kutlayabilir,
farklı üretim alanlarında uzmanlaşabilir.
129. Barışçıl ve çatışmalı bölünme
type FragmentationTone =
  | "planned"
  | "cooperative"
  | "reluctant"
  | "competitive"
  | "conflicted";

Barışçıl bölünmede:

kaynaklar konuşularak paylaşılır,
yollar ve depolar ortak kullanılabilir,
karşılıklı yardım anlaşması yapılır.

Çatışmalı bölünmede:

mülkiyet tartışması,
kültürel kırgınlık,
liderlik rekabeti,
ticaret engeli

oluşabilir.

Çocuk odaklı anlatıda çatışmalı bölünme bile doğrudan şiddet yerine uzlaşma ve iletişim alanı üretmelidir.

130. Settlement Merger

İki yerleşim birleşebilir.

interface SettlementMergerCandidate {
  settlementIds: string[];

  economicCompatibility: number;
  culturalCompatibility: number;
  geographicCompatibility: number;
  governanceCompatibility: number;
  relationshipTrust: number;

  sharedBenefits: MergerBenefit[];
  expectedConflicts: MergerConflict[];
}

Birleşme nedenleri:

ortak kriz,
ekonomik bağımlılık,
fiziksel olarak iç içe büyüme,
yönetim kolaylığı,
dış tehdit,
ortak kültür,
nüfus azalması.
131. Birleşme sonrası kimlik

Birleşme, küçük yerleşimin kimliğinin silinmesi anlamına gelmemelidir.

interface MergerIdentityPlan {
  newSettlementName?: string;
  preservedDistrictNames: string[];
  preservedTraditions: string[];
  sharedSymbols: string[];
  governanceRepresentationRules: RepresentationRule[];
}

Örneğin iki köy birleştiğinde:

iki eski isim mahalle adı olarak korunabilir,
her iki köyün festivalleri devam edebilir,
ortak konseyde dengeli temsil sağlanabilir.
132. Settlement Relocation

Bazen yerleşimin tamamı veya bir kısmı taşınmalıdır.

interface SettlementRelocationPlan {
  sourceSettlementId: string;
  destinationSiteId: string;

  reason:
    | "environmental_risk"
    | "resource_depletion"
    | "infrastructure_failure"
    | "planned_transformation"
    | "safety"
    | "cultural_choice";

  populationScope: number;
  infrastructureToMove: string[];
  infrastructureToAbandon: string[];

  culturalAssetsToPreserve: string[];
  memoryPreservationPlan: MemoryPreservationPlan;
}

Taşınma yalnızca lojistik değil, duygusal bir süreçtir.

İnsanlar:

evlerini,
mezarlıklarını,
anılarını,
tanıdık manzarayı,
kültürel mekânlarını

geride bırakabilir.

Çocuk yaş grubuna göre bu konu kayıp ve değişim üzerinden hassas biçimde anlatılabilir.

133. Planned Retreat

Çevresel risk altındaki yerleşimlerde son ana kadar beklemek yerine kontrollü geri çekilme yapılabilir.

interface PlannedRetreatState {
  identifiedRisk: SiteRisk;
  riskHorizon: number;
  publicAwareness: number;
  acceptanceLevel: number;

  destinationPreparedness: number;
  relocationProgress: number;

  preservationProgress: number;
}

Örnek:

nehir kıyısı sürekli aşınıyor,
köy yüksek bölgeye yavaşça taşınıyor,
eski köy bahçe ve anı alanına dönüşüyor.

Bu bir başarısızlık değil, ekolojik uyum olabilir.

134. Seasonal Settlement System

Bazı yerleşimler yıl boyunca aynı biçimde yaşamaz.

interface SeasonalSettlementProfile {
  activeSeasons: Season[];
  peakPopulationBySeason: Record<Season, number>;

  seasonalActivities: SeasonalActivity[];
  seasonalInfrastructure: string[];
  seasonalRisks: SiteRisk[];

  offSeasonState:
    | "reduced_population"
    | "caretaker_only"
    | "empty"
    | "different_community_use";
}

Örneğin:

yazın balıkçı kasabası,
kışın küçük bakım topluluğu,
ilkbaharda göçmen kuş gözlem merkezi,
sonbaharda büyük pazar alanı.
135. Göçebe topluluklarla ilişki

Göçebe topluluklar “henüz yerleşememiş toplumlar” olarak görülmemelidir.

Onlar farklı bir yaşam modeli benimsemiş olabilir.

interface NomadicCommunityState {
  routeNetwork: string[];
  seasonalDestinations: string[];

  mobilityPurpose:
    | "resource_cycle"
    | "herding"
    | "trade"
    | "cultural"
    | "ecological"
    | "exploration";

  mobileInfrastructure: MobileInfrastructureState;
  routeKnowledge: number;
  settlementRelations: SettlementRelation[];
}

Göçebe toplulukların güçlü yanları:

çevresel uyum,
rota bilgisi,
ticaret ağı,
hızlı hareket,
farklı kültürlerle bağlantı.
136. Göçebe ve yerleşik topluluk çatışmaları

Olası sorunlar:

su kullanımı,
otlak paylaşımı,
geçiş yollarının kapanması,
yanlış anlaşılma,
sınır algısı,
mevsimsel pazar kullanımı.

Çözümler:

geçiş koridoru,
ortak takvim,
mevsimsel kullanım anlaşması,
karşılıklı ticaret,
ortak bakım sorumluluğu.

Bu sistem farklı yaşam tarzlarından birini üstün göstermemelidir.

137. Settlement Decline

Yerleşim küçülmesi otomatik olarak çöküş anlamına gelmez.

interface SettlementDeclineVector {
  populationDecline: number;
  economicDecline: number;
  infrastructureDecline: number;
  serviceDecline: number;
  culturalDecline: number;
  socialDecline: number;
  ecologicalDecline: number;
  politicalDecline: number;
}

Bir yerleşim nüfus kaybederken:

ekolojik olarak iyileşebilir,
toplumsal bağlarını güçlendirebilir,
küçük ama sürdürülebilir topluluğa dönüşebilir.

Bu nedenle düşüş vektörleri ayrı tutulmalıdır.

138. Shrinkage Adaptation

Yerleşim küçülmeye uyum sağlayabilir.

interface ShrinkageAdaptationOption {
  type:
    | "consolidate_housing"
    | "close_unused_infrastructure"
    | "merge_services"
    | "repurpose_buildings"
    | "invite_new_residents"
    | "specialize_economy"
    | "restore_ecology"
    | "merge_with_neighbor"
    | "seasonalize";

  expectedBenefit: number;
  cost: number;
  socialAcceptance: number;
}

Örneğin nüfusu azalan bir köy:

boş okulu topluluk merkezine çevirebilir,
evleri merkeze yakınlaştırabilir,
büyük tarlaların bir kısmını ormana bırakabilir,
sanatçı veya araştırmacıları davet edebilir.
139. Abandonment Pressure

Bir yerleşimin terk edilmesi tek olayla oluşmamalıdır.

interface AbandonmentPressureVector {
  resourceUnsustainability: number;
  environmentalRisk: number;
  infrastructureFailure: number;
  economicIsolation: number;
  populationLoss: number;
  governanceCollapse: number;
  culturalDisconnection: number;
  safetyConcern: number;
  lossOfHope: number;
}

Terk edilme, bu baskıların uzun süre karşılanamaması sonucu oluşmalıdır.

140. Abandonment Decision

Yerleşim sakinleri genellikle şu seçenekleri değerlendirir:

- Kal ve uyum sağla
- Yerleşimi küçült
- Bazı mahalleleri terk et
- Geçici olarak ayrıl
- Yakın yerleşimle birleş
- Yeni yere taşın
- Yerleşimi mevsimsel kullan
- Tamamen terk et
interface AbandonmentAssessment {
  survivalFeasibility: number;
  recoveryFeasibility: number;
  relocationFeasibility: number;
  culturalCostOfLeaving: number;
  riskOfStaying: number;

  recommendedAction:
    | "remain"
    | "adapt"
    | "partial_retreat"
    | "temporary_evacuate"
    | "relocate"
    | "abandon";
}
141. Partial Abandonment

Bir şehrin tamamı değil, belirli bölümleri terk edilebilir.

Örnek:

sel alanındaki mahalle,
maden kapandıktan sonra işçi bölgesi,
eski liman,
suyu tükenen yüksek mahalle.

Terk edilen bölge:

yeniden doğaya bırakılabilir,
depo alanı olabilir,
anı mekânına dönüşebilir,
ileride başka amaçla kullanılabilir.
142. Yerleşimin tamamen terk edilmesi

Tam terk edilme nadir ve büyük bir dünya olayı olmalıdır.

Aşamalar:

1. Uzun süreli baskılar
2. Çözüm girişimleri
3. Uyum veya yardım arayışı
4. Kısmi göç
5. Kritik hizmetlerin kapanması
6. Son sakinlerin ayrılması
7. Yerleşimin yeni statüye geçmesi

Bu süreç bir tick içinde gerçekleşmemelidir.

143. Son sakinler

Terk edilen yerleşimlerde bazı NPC’ler daha uzun süre kalabilir.

Nedenleri:

duygusal bağ,
bakım sorumluluğu,
değişime direnç,
geride kalanları koruma,
araştırma,
kutsal görev,
geri dönüş umudu.

Bu karakterler yüksek anlatı potansiyeli taşıyabilir.

Ancak sistem onları otomatik olarak trajik sonuca sürüklememelidir.

144. Abandoned Settlement Lifecycle

Terk edilmiş alanlar da zamanla değişir.

type AbandonedSettlementPhase =
  | "recently_abandoned"
  | "deteriorating"
  | "reclaimed_by_nature"
  | "partially_reused"
  | "historical_site"
  | "rediscovered"
  | "resettled"
  | "lost";
145. Doğanın geri dönüşü

Ecology System terk edilmiş yerleşimde devreye girer.

İnsan etkinliği azalır
→ Gürültü azalır
→ Bitkiler yapılara yayılır
→ Küçük hayvanlar geri döner
→ Su yolları değişebilir
→ Bazı yapılar yeni habitat olur

Ancak:

kirlilik,
maden atıkları,
bozuk barajlar,
büyülü kalıntılar

doğanın iyileşmesini engelleyebilir.

146. Harabe yerine yaşayan hafıza

Terk edilmiş yerleşim yalnızca korkutucu harabe olarak kullanılmamalıdır.

Alternatif kullanımlar:

doğa araştırma alanı,
eski meyve bahçesi,
hayvan koruma alanı,
kültürel anma yeri,
açık hava okulu,
yolcular için sığınak,
festival alanı,
geçmişi anlatan müze.

Bu yaklaşım LUMI’nin tonuyla daha uyumludur.

147. Settlement Memory Persistence

Yerleşim terk edilse bile hafızası kaybolmamalıdır.

interface SettlementLegacy {
  formerResidents: string[];
  descendantCommunities: string[];

  preservedTraditions: TraditionState[];
  survivingStories: SharedStory[];
  preservedObjects: string[];
  rememberedPlaces: string[];

  reputation: SettlementReputationVector;
  historicalImportance: number;
  emotionalImportance: number;
}

Eski yerleşimin kültürü başka yerlerde yaşamaya devam edebilir.

Örneğin:

tarifler,
şarkılar,
mimari,
soyadları,
kutlamalar,
sözler,
üretim teknikleri.
148. Resettlement System

Terk edilmiş yerleşim daha sonra yeniden kullanılabilir.

interface ResettlementAssessment {
  siteSafety: number;
  remainingInfrastructure: number;
  ecologicalCompatibility: number;
  resourceAvailability: number;

  historicalClaimComplexity: number;
  culturalSensitivity: number;
  restorationCost: number;

  recommendedUse:
    | "permanent_settlement"
    | "small_community"
    | "seasonal_use"
    | "research_site"
    | "heritage_site"
    | "ecological_preserve"
    | "do_not_resettle";
}

Yeni gelenler eski yerleşimi aynen canlandırmak zorunda değildir.

Örneğin eski maden kasabası:

ekolojik araştırma köyüne,
sanatçı topluluğuna,
küçük eğitim merkezine

dönüşebilir.

149. Eski sakinlerin hakları

Yeniden yerleşimde eski sakinlerin veya onların topluluklarının hafızası dikkate alınmalıdır.

Sorular:

Eski sakinler geri dönmek istiyor mu?
Yerleşimin kültürel önemi var mı?
Kalan yapılar nasıl korunmalı?
Yeni yerleşim eski adı kullanmalı mı?
Eski sakinler kararlara katılmalı mı?

Bu alan güçlü etik ve duygusal hikâyeler üretebilir.

150. Settlement Succession

Bir yerleşim yok olsa bile onun ardılı bulunabilir.

interface SettlementSuccessionRelation {
  predecessorSettlementId: string;
  successorSettlementId: string;

  continuityType:
    | "population"
    | "cultural"
    | "administrative"
    | "geographic"
    | "symbolic"
    | "economic";

  continuityStrength: number;
}

Örneğin yeni kurulan Tepeyurt:

eski Dereyurt halkının çoğunu,
geleneklerini,
yönetim kurulunu,
bazı yapı malzemelerini

taşıyorsa onun ardılı sayılabilir.

151. Bölgesel yerleşim ağı

Yerleşimler tek tek değil, bölgesel ağ içinde değerlendirilmelidir.

interface RegionalSettlementNetwork {
  settlementIds: string[];

  sharedResources: RegionalResourceFlow[];
  sharedInfrastructure: RegionalInfrastructure[];
  migrationFlows: MigrationFlow[];
  tradeFlows: TradeResourceFlow[];

  regionalNeeds: SettlementNeedVector;
  regionalResilience: SettlementResilienceVector;
}

Bölgesel düzeyde:

bir şehir eğitim merkezi,
bir köy tarım merkezi,
bir liman ticaret kapısı,
bir göçebe topluluk taşıma ve rota uzmanı

olabilir.

Her yerleşimin kendi içinde her hizmeti üretmesi gerekmez.

152. Dependency Risk

Uzmanlaşma verimlilik sağlar fakat bağımlılık oluşturur.

interface SettlementDependency {
  targetSettlementId: string;
  dependencyType:
    | "food"
    | "water"
    | "medicine"
    | "education"
    | "trade"
    | "transport"
    | "knowledge"
    | "security";

  dependencyStrength: number;
  substitutionAvailability: number;
  disruptionRisk: number;
}

Bir yerleşim tek bir şehre aşırı bağımlıysa yol kapanması büyük kriz oluşturabilir.

Bu nedenle bölgesel dayanıklılık:

alternatif yollar,
yedek üreticiler,
ortak stoklar,
karşılıklı yardım

ile güçlendirilebilir.

153. Urban Attraction Effect

Büyük şehirler çevredeki nüfusu ve kaynakları çekebilir.

interface UrbanAttractionVector {
  employmentAttraction: number;
  educationAttraction: number;
  serviceAttraction: number;
  culturalAttraction: number;
  tradeAttraction: number;
  prestigeAttraction: number;
}

Bu çekim:

genç nüfusun köylerden ayrılmasına,
küçük yerleşimlerde meslek kaybına,
şehirde konut baskısına,
kültürel karışıma

neden olabilir.

Şehirleşme otomatik olarak iyi veya kötü değildir.

154. Rural Renewal

Küçük yerleşimler tekrar canlanabilir.

Nedenler:

yeni ulaşım,
uzaktan çalışma benzeri büyülü veya teknolojik imkân,
yeni üretim alanı,
ekolojik iyileşme,
kültürel ilgi,
geri dönen gençler,
eğitim veya sanat merkezi kurulması.
interface RenewalPotential {
  availableHousing: number;
  ecologicalQuality: number;
  culturalAppeal: number;
  newEconomicOpportunity: number;
  connectivity: number;
  welcomingCapacity: number;
}
155. Settlement Reputation

Göç, ticaret ve kuruluş kararlarını yerleşimin itibarı etkiler.

interface SettlementReputationVector {
  safety: number;
  fairness: number;
  prosperity: number;
  hospitality: number;
  craftsmanship: number;
  learning: number;
  environmentalHarmony: number;
  reliability: number;
  mystery: number;
}

İtibar tamamen gerçeğe eşit olmayabilir.

Söylentiler:

abartılabilir,
eski bilgiye dayanabilir,
belirli bir grubun bakışını yansıtabilir.
156. Söylentiye dayalı göç dalgası

Örneğin bir kasaba hakkında:

“Orada herkese ücretsiz ev veriliyor.”

söylentisi yayılabilir.

Gerçekte:

yalnızca belirli mesleklere ev desteği vardır,
ev sayısı sınırlıdır,
bilgi eski olabilir.

Bu durum beklenmedik nüfus baskısı yaratabilir.

Simülasyon, bilgi kalitesi ile göç niyetini birbirine bağlamalıdır.

157. Population Forecast

Yerleşim kısa ve orta vadeli nüfus tahmini yapabilir.

interface PopulationForecast {
  horizonDays: number;

  expectedBirths: number;
  expectedDeaths: number;
  expectedImmigration: number;
  expectedEmigration: number;
  expectedTemporaryPopulation: number;

  confidence: number;
  majorUncertainties: string[];
}

Bu tahmin kesin sonuç değil, yönetim kararlarına yardımcı olan araçtır.

Örneğin:

yeni ev planı,
okul kapasitesi,
su deposu,
pazar büyüklüğü

bu tahmine göre değerlendirilebilir.

158. Growth Planning
interface SettlementGrowthPlan {
  horizon: "short" | "medium" | "long";

  expectedPopulationChange: number;
  chosenGrowthMode: GrowthAssessment["recommendedMode"];

  housingActions: string[];
  infrastructureActions: string[];
  ecologicalProtections: string[];
  integrationActions: string[];

  reviewConditions: SimulationCondition[];
}

Yerleşim planları zamanla başarısız veya geçersiz olabilir.

Bu nedenle belirli koşullarda yeniden değerlendirilmelidir.

159. Plansız büyüme

Yerleşim planlama kapasitesi düşükse büyüme dağınık olabilir.

Sonuçlar:

düzensiz evler,
yetersiz yollar,
su erişim farkı,
hizmet dışı mahalleler,
yangın veya sel riski,
merkez-çevre gerilimi.

Ancak plansız alanlarda da güçlü mahalle dayanışması veya yaratıcı çözümler doğabilir.

160. Çocuğun büyüme ve göç sistemine etkisi

Çocuk şu yollarla etkide bulunabilir:

yeni yerleşim alanı keşfetmek,
iki topluluk arasında anlaşma sağlamak,
göç eden aileye yolculukta yardım etmek,
yeni gelen çocukları tanıştırmak,
eski köyün hatıralarını taşımak,
terk edilmiş alanın yeni kullanımını önermek,
su yolu veya güvenli rota bulmak,
yanlış söylentiyi düzeltmek.

Çocuk doğrudan:

bütün nüfusu nereye taşınacağına zorlamamalı,
tek başına şehir kurmamalı,
insanların evlerini terk etmesine karar vermemeli.

Kararlar topluluğa ait kalmalıdır.

161. Çocuk perspektifinden göç anlatımı

Göç hikâyelerinde soyut ekonomik kavramlar yerine gözlemlenebilir detaylar kullanılmalıdır.

Örneğin:

boşalan evin penceresi,
kutulara konan oyuncaklar,
vedalaşan arkadaşlar,
yeni okul korkusu,
yeni komşuların getirdiği farklı yemek,
eski köyden taşınan küçük bir fidan.

Bu detaylar değişim, aidiyet ve umut temalarını işler.

162. Hikâye güvenlik kuralları

Göç ve terk edilme konuları hassas olabilir.

Kurallar:

göç edenler “sorun” olarak gösterilmemeli,
yeni gelenlerin kültürü küçümsenmemeli,
terk edilme gereksiz korku üretmemeli,
aile ayrılığı yaş grubuna göre işlenmeli,
topluluk kaybı yalnızca dramatik araç olarak kullanılmamalı,
çocuğa yetişkin sorumluluğu yüklenmemeli,
sorunların tüm çözümü çocuktan beklenmemeli.
163. Growth & Migration Narrative Hooks
type GrowthMigrationStoryHookType =
  | "new_family_arrives"
  | "friend_moves_away"
  | "returning_npc"
  | "new_settlement_site"
  | "founding_ceremony"
  | "integration_challenge"
  | "shared_resource_agreement"
  | "seasonal_migration"
  | "settlement_split"
  | "settlement_merger"
  | "planned_relocation"
  | "abandoned_place_rediscovery"
  | "resettlement_project"
  | "rumor_causes_migration";
164. Örnek: Yeni ailelerin gelişi

Başlangıç:

Gümüşdere Köyü nüfusu: 142
Boş ev kapasitesi: 4 aile
Su kapasitesi: Yeterli
Okul kapasitesi: Sınırlı
Toplumsal kabul: Orta-yüksek

Yakındaki bölgede heyelan riski nedeniyle üç aile geçici barınma arar.

Simülasyon:

1. Köy geçici kabul seçeneğini değerlendirir.
2. Boş evlerin ikisi onarıma ihtiyaç duyar.
3. Okul kapasitesi yetersiz kalır.
4. Yeni gelen ailelerden biri marangozluk bilgisine sahiptir.
5. Ortak okul odasının genişletilmesi proje adayı olur.
6. Bazı köylüler suyun ileride yetmeyeceğinden endişelenir.

Hikâye potansiyeli:

Yeni gelen çocuklar ilk gün okul bahçesinde yalnız kalır. Çocuğun karakteri onları oyuna davet ederek ilk sosyal bağı kurabilir.

165. Örnek: Yerleşim kuruluşu

Başlangıç:

Ana köy nüfusu hızla artıyor.
Tarım alanı sınırlı.
Yakındaki yüksek ova yaz aylarında verimli.

Karar:

ovada kalıcı şehir kurulmaz,
önce mevsimlik tarım kampı oluşturulur.

İlk yıl:

küçük depo,
su toplama sistemi,
geçici barınak,
iki bakım görevlisi.

Üçüncü yıl:

bazı aileler daha uzun kalmaya başlar,
küçük okul odası açılır,
yerleşim yeni bir köye dönüşme adayı olur.

Bu dönüşüm bir anda değil, organik biçimde gerçekleşir.

166. Örnek: Kontrollü küçülme

Başlangıç:

Kavaklı Kasabası
Nüfus: 780 → 530
Boş yapı oranı: %28
Altyapı bakım maliyeti: Yüksek

Yerleşim seçenekleri:

Yeni nüfus çekmek için büyük kampanya.
Kullanılmayan mahalleleri kapatmak.
Boş evleri atölye ve bahçeye dönüştürmek.
Yakın köyle hizmetleri birleştirmek.
Kasabayı mevsimsel sanat ve pazar merkezine dönüştürmek.

Kasabanın kültürel kimliği:

zanaatkârlık yüksek,
değişime açıklık orta,
toplumsal dayanışma yüksek.

Karar:

Kasaba daha küçük fakat uzmanlaşmış bir zanaat ve eğitim merkezine dönüşür.

Bu, nüfus azalmasına rağmen başarılı bir dönüşümdür.

167. Örnek: Terk edilmiş köyün yeniden kullanımı

Eski köy:

Adı: Sisliova
Terk edilme nedeni: Sürekli taşkın
Son sakinlerin ayrılışı: 18 yıl önce
Doğa geri kazanımı: Yüksek
Kalan yapılar: Taş okul, köprü temelleri, meyve bahçeleri

Yeni değerlendirme:

kalıcı yerleşim için riskli,
araştırma ve mevsimlik eğitim kampı için uygun,
eski sakinlerin anıları güçlü.

Karar:

Sisliova yeniden köy yapılmaz. Eski okul onarılır ve taşkınları inceleyen küçük bir doğa öğrenme merkezine dönüştürülür.

Böylece geçmiş silinmeden yeni işlev oluşur.

168. Teknik olaylar

Bu sistem aşağıdaki domain event’lerini üretebilir:

type SettlementLifecycleEvent =
  | SettlementGrowthPressureChanged
  | SettlementGrowthPlanCreated
  | SettlementExpanded
  | DistrictCreated
  | MigrationIntentCreated
  | MigrationPlanStarted
  | MigrationJourneyStarted
  | MigrantsArrived
  | IntegrationStateChanged
  | ReturnMigrationOccurred
  | SettlementFoundingProposed
  | SettlementFoundingStarted
  | SettlementRecognized
  | SettlementFragmentationStarted
  | SettlementSplit
  | SettlementMergerStarted
  | SettlementsMerged
  | SettlementRelocationStarted
  | SettlementPartiallyAbandoned
  | SettlementAbandoned
  | AbandonedSettlementRepurposed
  | SettlementResettled;
169. Sınırlar ve invariant’lar

Sistem şu kuralları ihlal etmemelidir:

- Bir nüfus aynı anda iki yerleşimde kalıcı sakin olamaz.
- Göç yolculuğundaki nüfus kaynak yerleşimde aktif iş gücü sayılamaz.
- Yeni yerleşim, asgari su veya alternatif tedarik olmadan kalıcı statüye geçemez.
- Terk edilmiş yerleşim dünya durumundan silinemez.
- Yerleşim birleşmesinde eski hafıza kayıtları kaybolamaz.
- Bölünmede kaynak ve nüfus toplamı korunmalıdır.
- Göçmen katkısı ve göçmen ihtiyacı birlikte değerlendirilmelidir.
- Büyük göç ve terk edilme sonuçları güvenlik onayı olmadan aniden uygulanamaz.
- Mevcut aktif hikâye alanı simülasyon tarafından habersizce yok edilemez.
170. MVP sınırı

İlk sürümde tüm sistemin geliştirilmesi gerekmez.

MVP
bireysel NPC göçü,
aile göçü,
basit itici ve çekici faktörler,
hedef yerleşim kapasite kontrolü,
temel entegrasyon durumu,
küçük yerleşim kuruluşu,
kontrollü büyüme,
kısmi küçülme,
terk edilmiş yerleşim kaydı,
geri dönüş göçü.
Sonraki sürüm
mahalle sistemi,
toplu göç,
uydu yerleşimler,
yerleşim bölünmesi,
birleşme,
planlı taşınma,
mevsimsel yerleşim,
bölgesel nüfus tahmini.
İleri sürüm
çok kuşaklı göç ağları,
uzun vadeli şehirleşme,
kültürel birleşme ve ayrışma,
tarihsel ardıl yerleşimler,
karmaşık arazi kullanım hakları,
bölgesel planlama.
171. Bu bölümden çıkan temel kararlar
Yerleşim başarısı nüfus artışıyla ölçülmeyecek.
Büyüme kapasitesi ve büyüme isteği ayrı tutulacak.
Nüfus artışı yeni baskılar oluşturacak.
Göç itici ve çekici faktörlerle üretilecek.
Algılanan durum ile gerçek durum ayrılacak.
Göç anlık nüfus aktarımı olmayacak.
Yeni gelenlerin ihtiyaçları kadar katkıları da hesaplanacak.
Entegrasyon kimliğin silinmesi anlamına gelmeyecek.
Yeni yerleşimler aşamalı kurulacak.
Arazi kullanım hakları göz ardı edilmeyecek.
Göçebe topluluklar eksik yerleşimler olarak görülmeyecek.
Küçülme ve dönüşüm başarısızlık kabul edilmeyecek.
Terk edilmiş yerleşimler dünya hafızasında yaşamaya devam edecek.
Yeniden yerleşim eski sakinlerin hafızasını dikkate alacak.
Büyük nüfus hareketleri çocuk güvenliği ve anlatı kontrolünden geçecek.

Bir sonraki bölümde Regional Economy, Trade Networks, Specialization & Inter-Settlement Dependency System katmanına geçmeliyiz. Burada yerleşimlerin neden belirli üretim alanlarında uzmanlaştığını, bölgesel ticaret ağlarının nasıl oluştuğunu, ekonomik bağımlılığın ne zaman faydalı veya tehlikeli hâle geldiğini ve yol kesintilerinin bütün bölgeye nasıl yayıldığını tasarlayacağız.