Relationship Engine

Emotion Engine, NPC’nin ne hissettiğini belirliyordu. Relationship Engine ise iki karakter arasındaki bağın neye dönüştüğünü belirleyecek.

Bu bağ tek sayı olmamalı.

Bir karakter başka birine aynı anda:

güvenebilir,
kızgın olabilir,
ona bağlı hissedebilir,
ondan korkabilir,
onu kıskanabilir,
ona karşı sorumluluk hissedebilir.

Bu nedenle ilişki de vektör olmalı.

1. Temel ilişki vektörü
type RelationshipVector = {
  familiarity: number
  trust: number
  affection: number
  respect: number
  loyalty: number
  attachment: number
  dependence: number

  fear: number
  anger: number
  resentment: number
  jealousy: number
  rivalry: number
  suspicion: number

  admiration: number
  gratitude: number
  protectiveness: number
  responsibility: number

  comfort: number
  openness: number
  influence: number
}

Değerler 0.0–1.0 arasında tutulabilir.

Örnek:

{
  familiarity: 0.90,
  trust: 0.75,
  affection: 0.65,
  respect: 0.55,
  loyalty: 0.40,
  attachment: 0.60,

  fear: 0.10,
  anger: 0.25,
  resentment: 0.05,
  jealousy: 0.00,
  rivalry: 0.15,
  suspicion: 0.20,

  admiration: 0.45,
  gratitude: 0.70,
  protectiveness: 0.30,
  responsibility: 0.20,

  comfort: 0.70,
  openness: 0.55,
  influence: 0.60
}

Bu ilişki:

olumlu,
güvene dayalı,
geçmiş yardımdan etkilenmiş,
fakat tamamen sorunsuz olmayan

bir bağdır.

2. İlişkiler çift yönlü ama simetrik olmamalı

Lumi tilkiye çok güvenebilir.

Tilki ise Lumi’ye daha az güvenebilir.

relationship[Lumi][Fox] !== relationship[Fox][Lumi]

Örnek:

Lumi → Tilki
trust: 0.85
protectiveness: 0.75
affection: 0.70

Tilki → Lumi
trust: 0.55
protectiveness: 0.20
affection: 0.45
suspicion: 0.25

Aynı ilişki iki tarafta farklı anlam taşır.

3. İlişki türü sabit etiket olmamalı

Karakterler doğrudan şu şekilde saklanmamalı:

relationshipType: "friend"

Çünkü “arkadaş” çok genel bir etikettir.

Bunun yerine ilişki türü vektörden türetilmeli.

yüksek trust
+ yüksek affection
+ yüksek comfort
→ close_friend

yüksek respect
+ yüksek admiration
+ düşük familiarity
→ respected_figure

yüksek attachment
+ yüksek dependence
+ düşük trust
→ unstable_attachment

yüksek rivalry
+ yüksek respect
→ friendly_rival

yüksek fear
+ yüksek dependence
→ coercive_relationship

Bu etiketler yalnızca kullanıcı arayüzü ve anlatı için üretilebilir.

İç sistem ilişki vektörünü kullanmalıdır.

4. İlişkinin oluşma kaynakları

Relationship Engine, ilişkiyi doğrudan olaydan güncellememeli.

Önce ilişkisel kanıtlar oluşmalı.

type RelationshipEvidence = {
  sourceEventId: string
  observerCharacterId: string
  targetCharacterId: string

  evidence: {
    trust?: number
    care?: number
    reliability?: number
    threat?: number
    betrayal?: number
    loyalty?: number
    competence?: number
    honesty?: number
    kindness?: number
    abandonment?: number
  }

  confidence: number
  significance: number
  context: string
}

Örnek:

Lumi tilkiyi kurtarıyor.

{
  evidence: {
    trust: 0.45,
    care: 0.60,
    reliability: 0.30,
    kindness: 0.55
  },
  confidence: 0.95,
  significance: 0.80
}

Relationship Engine bu kanıtı mevcut ilişkiyle birleştirir.

5. Tek olay ilişkiyi tamamen değiştirmemeli

Her olayın etkisi şunlara bağlı olmalı:

Relationship Change =
Evidence Strength
× Event Significance
× Memory Confidence
× Emotional Intensity
× Existing Relationship
× Character Sensitivity

Örnek:

Bir yabancının küçük yardımı:

trust +0.05
gratitude +0.10

Yakın arkadaşın hayat kurtarması:

trust +0.20
attachment +0.15
gratitude +0.35
loyalty +0.10

Yakın arkadaşın küçük bir yalanı:

trust -0.08
suspicion +0.10

Yabancının aynı yalanı:

trust -0.02
suspicion +0.05

Mevcut bağ, olayın anlamını değiştirir.

6. Güven tek boyutlu olmamalı

Bir karakter başka birine bazı konularda güvenip bazı konularda güvenmeyebilir.

type TrustVector = {
  honesty: number
  competence: number
  reliability: number
  benevolence: number
  confidentiality: number
  judgment: number
  loyalty: number
}

Örnek:

Bir karakter cesur ama dikkatsiz olabilir.

{
  honesty: 0.80,
  competence: 0.45,
  reliability: 0.40,
  benevolence: 0.85,
  confidentiality: 0.70,
  judgment: 0.35,
  loyalty: 0.75
}

Bu NPC hakkında şöyle denebilir:

İyi niyetlidir ama önemli kararları ona bırakmak risklidir.

Bu ayrım hikâyelerde çok işe yarar.

7. Güven ve sevgi birbirinden ayrılmalı

Bir karakter birini sevebilir ama ona güvenmeyebilir.

Örnek:

affection: 0.80
trust: 0.35

Bir kardeş diğerini çok seviyor fakat onun sır tutamadığını biliyor olabilir.

Tersi de mümkündür:

trust: 0.80
affection: 0.30

NPC birine güvenebilir ama onunla yakınlık hissetmeyebilir.

Örnek:

köy muhafızı,
ciddi öğretmen,
güvenilir tüccar.
8. Bağlılık ve bağımlılık ayrımı
attachment ≠ dependence
Bağlılık

Karakter diğerine duygusal yakınlık duyar.

Bağımlılık

Karakter güvenlik, yön, kaynak veya karar için diğerine ihtiyaç duyar.

type DependenceVector = {
  emotional: number
  physicalSafety: number
  resources: number
  socialAccess: number
  guidance: number
  identitySupport: number
}

Yüksek bağlılık sağlıklı olabilir.

Yüksek bağımlılık ise karakterin kararlarını güçlü biçimde etkileyebilir.

Lumi yoksa karar veremiyor.

Bu, ileride karakter gelişimi için kullanılabilir.

9. Yakınlık boyutları

Yakınlık tek değer olmamalı.

type ClosenessVector = {
  emotionalCloseness: number
  experientialCloseness: number
  ideologicalCloseness: number
  physicalProximity: number
  communicationFrequency: number
  sharedHistory: number
}

İki NPC:

uzun süredir birbirini tanıyor olabilir,
fakat duygusal olarak yakın olmayabilir.

Ya da:

yeni tanışmış olabilir,
ancak çok yoğun bir deneyim paylaşmış olabilir.
10. Paylaşılan deneyimler

İlişkilerin en güçlü kaynaklarından biri ortak yaşanmışlıklardır.

type SharedExperience = {
  eventId: string
  participants: string[]

  type:
    | "danger"
    | "success"
    | "loss"
    | "discovery"
    | "conflict"
    | "care"
    | "promise"
    | "secret"

  significance: number
  emotionalTone: Partial<EmotionVector>
  meaningByCharacter: Record<string, string>
}

Aynı deneyim iki karakter için farklı anlam taşıyabilir.

Örnek:

Bir mağarada mahsur kaldılar.

Lumi:

“Birlikte çıkmayı başardık.”

Tilki:

“Lumi beni yalnız bırakmadı.”

Bu iki anlam farklı ilişki boyutlarını güçlendirir.

11. Verilen sözler

Promise sistemi Relationship Engine içinde önemli olmalıdır.

type RelationshipPromise = {
  id: string
  giverId: string
  receiverId: string

  promise: string
  importance: number
  deadline?: number

  status:
    | "active"
    | "fulfilled"
    | "broken"
    | "partially_fulfilled"
    | "released"

  rememberedBy: string[]
}

Söz tutulduğunda:

trust +0.15
reliability +0.20
respect +0.08

Söz bozulduğunda:

trust -0.25
resentment +0.15
suspicion +0.20

Fakat sebep önemlidir.

Karakter elinden geleni yaptıysa:

trust kaybı daha düşük
sadness artabilir
respect korunabilir
12. Niyet ve sonuç ayrımı

İlişkiler yalnızca sonuca göre güncellenmemeli.

type RelationalOutcomeAppraisal = {
  intention: number
  effort: number
  outcome: number
  preventability: number
  transparency: number
}

Örnek:

Lumi yardım etmeye çalıştı ama başarısız oldu.

care evidence yüksek
competence evidence düşük
trust kısmen korunur

Lumi yardım edebilecekken etmedi.

care evidence negatif
loyalty evidence negatif
resentment artar

Bu ayrım ilişkileri daha doğal yapar.

13. İlişkisel beklentiler

Her ilişkide karakterlerin birbirinden beklentileri olmalı.

type RelationshipExpectation = {
  targetCharacterId: string

  expectedBehaviors: {
    behavior: string
    expectedProbability: number
    importance: number
  }[]
}

Örnek:

[
  {
    behavior: "help_when_in_danger",
    expectedProbability: 0.85,
    importance: 0.90
  },
  {
    behavior: "keep_secrets",
    expectedProbability: 0.60,
    importance: 0.75
  }
]

Beklenti bozulduğunda ilişki etkisi ortaya çıkar.

Relationship Impact =
Expectation Importance
× Expectation Violation
× Event Significance

Yakın arkadaşın yapmadığı küçük bir şey, yabancının yapmamasından daha çok etkileyebilir.

14. İlişki ihlalleri

Her olumsuz olay “ihanet” değildir.

Farklı ihlal türleri olmalı.

type RelationshipViolationType =
  | "dishonesty"
  | "abandonment"
  | "neglect"
  | "betrayal"
  | "disrespect"
  | "broken_promise"
  | "exclusion"
  | "unfairness"
  | "boundary_violation"
  | "failure_to_protect"

Her ihlal farklı boyutları etkiler.

Örnek:

Yalan
honestyTrust azalır
suspicion artar
Terk etme
attachmentSecurity azalır
fearOfLoss artar
resentment artabilir
Saygısızlık
respect azalır
anger artar
socialComfort azalır
15. İlişkisel yaraların kalıcılığı

Bazı ilişki ihlalleri tek özürle tamamen düzelmemeli.

type RelationshipWound = {
  id: string
  sourceEventId: string
  targetCharacterId: string

  type: RelationshipViolationType
  severity: number
  unresolved: boolean

  trustDamage: number
  emotionalResidue: Partial<EmotionVector>

  repairConditions: string[]
}

Örnek:

{
  type: "abandonment",
  severity: 0.75,
  trustDamage: 0.40,
  emotionalResidue: {
    sadness: 0.30,
    resentment: 0.25,
    fear: 0.20
  },
  repairConditions: [
    "explanation_received",
    "responsibility_accepted",
    "reliable_behavior_repeated"
  ]
}
16. Özür sistemi

Özür sadece diyalog değildir. Relationship Engine tarafından değerlendirilmelidir.

type ApologyAppraisal = {
  acknowledgment: number
  responsibilityAccepted: number
  empathyShown: number
  explanationQuality: number
  repairOffer: number
  sincerity: number
  behavioralFollowThrough: number
}

Etkili özür:

“Bunu yaptım.”
“Seni nasıl etkilediğini anlıyorum.”
“Bunun sorumluluğu bana ait.”
“Düzeltmek için şunu yapacağım.”

Zayıf özür:

“Üzüldüysen özür dilerim.”

Bu nedenle her özür aynı onarımı sağlamamalıdır.

17. Affetme ve güvenin geri gelmesi aynı şey değil

Karakter affedebilir ama henüz güvenmeyebilir.

forgiveness: 0.80
trustRestoration: 0.35

Affetme:

öfkenin azalması,
cezalandırma isteğinin azalması,
olayın sürekli taşınmaması.

Güvenin geri gelmesi:

tekrar tekrar güvenilir davranış,
sözlerin tutulması,
zaman,
şeffaflık.
type RepairState = {
  forgiveness: number
  trustRestoration: number
  emotionalClosure: number
  behavioralConfidence: number
}
18. İlişki onarımı

Onarım tek olayla değil, süreçle olmalı.

1. İhlalin fark edilmesi
2. Sorumluluk kabulü
3. Açıklama
4. Özür
5. Telafi
6. Tekrarlanmayan davranış
7. Zaman içinde güvenilirlik
type RelationshipRepairProcess = {
  woundId: string

  acknowledgmentComplete: boolean
  apologyQuality: number
  repairActionsCompleted: string[]
  repeatedReliability: number
  elapsedTime: number

  repairProgress: number
}
19. İlişki eşikleri

Belirli seviyeler yeni davranış olanakları açabilir.

trust > 0.35
→ basit iş birliği

trust > 0.55
→ yardım isteme

trust > 0.70
→ sır paylaşma

trust > 0.85
→ yüksek riskli güven

Benzer biçimde:

affection > 0.60
→ birlikte zaman geçirme eğilimi

protectiveness > 0.70
→ hedefi korumak için risk alma

resentment > 0.65
→ yüzleşme veya kaçınma

suspicion > 0.75
→ davranışları gizlice kontrol etme

Bu eşikler doğrudan eylem üretmez. Utility Evaluator’a seçenek ve bias sağlar.

20. İlişki temelli eylem eğilimleri
type RelationshipActionBiases = {
  help: number
  protect: number
  follow: number
  cooperate: number
  shareInformation: number
  forgive: number
  confront: number
  avoid: number
  deceive: number
  compete: number
}

Örnek:

{
  help: 0.55,
  protect: 0.40,
  follow: 0.20,
  cooperate: 0.60,
  shareInformation: 0.35,
  forgive: 0.25,
  confront: -0.05,
  avoid: -0.20,
  deceive: -0.40,
  compete: 0.10
}
21. İlişkinin bağlama göre değişmesi

Bir karakter başka birine genel olarak güvenebilir ama belirli konularda temkinli olabilir.

Örnek:

Lumi’ye tehlikede güveniyor.
Ama sır saklama konusunda güvenmiyor.
type ContextualRelationshipState = {
  context: string
  trustModifier: number
  comfortModifier: number
  cooperationModifier: number
}

Örnek:

[
  {
    context: "danger",
    trustModifier: 0.20,
    cooperationModifier: 0.30
  },
  {
    context: "secrets",
    trustModifier: -0.25,
    cooperationModifier: -0.10
  }
]
22. İlişki rolleri

Karakterler zamanla birbirlerinin hayatında roller üstlenebilir.

type RelationshipRole =
  | "friend"
  | "close_friend"
  | "protector"
  | "protected"
  | "mentor"
  | "student"
  | "rival"
  | "confidant"
  | "leader"
  | "follower"
  | "caregiver"
  | "family_like"

Bir ilişki aynı anda birden fazla role sahip olabilir.

roles: ["friend", "protector", "mentor"]

Roller sabit değildir.

Bir öğrenci zamanla öğretmenine yardım eden biri hâline gelebilir.

23. Güç dengesi

Her ilişki eşit güçte olmayabilir.

type RelationshipPowerVector = {
  decisionPower: number
  resourceControl: number
  socialInfluence: number
  emotionalInfluence: number
  knowledgeAdvantage: number
  physicalPower: number
}

Güç tek taraflı olmak zorunda değildir.

Örnek:

Yaşlı denizci daha fazla bilgiye sahip.
Lumi daha fazla sosyal etkiye sahip.
Tilki gizli yolları biliyor.

Bu nedenle ilişki içinde farklı güç kaynakları olabilir.

24. Influence vektörüyle bağlantı

Daha önce konuştuğumuz gibi influence tek sayı olmamalı.

Relationship Engine bunu bağlam bazlı tutabilir.

type InterpersonalInfluence = {
  emotional: number
  moral: number
  strategic: number
  social: number
  expertise: number
  authority: number
}

Örnek:

Tilki, Lumi’nin:

ahlaki kararlarından etkilenebilir,
fakat yön bulma kararlarında ona güvenmeyebilir.
{
  emotional: 0.70,
  moral: 0.65,
  strategic: 0.30,
  social: 0.55,
  expertise: 0.20,
  authority: 0.15
}
25. İlişki ağı

Relationship Engine yalnızca ikili bağları değil, ilişki ağını da değerlendirmeli.

A → B’yi seviyor
B → C’ye güveniyor
A → C’den şüpheleniyor

Bu yapı:

ittifaklar,
kıskançlık,
arabuluculuk,
grup çatışmaları,
söylentiler

üretebilir.

type RelationshipGraph = {
  nodes: CharacterId[]
  edges: RelationshipEdge[]
}
26. Üçüncü kişiler üzerinden ilişki değişimi

Bir NPC başka bir karakteri, güvendiği birinin görüşünden etkilenerek değerlendirebilir.

Lumi tilkiye güveniyor.
Mira Lumi’ye güveniyor.
Bu nedenle Mira tilkiye başlangıçta daha açık yaklaşabilir.

Fakat bu otomatik güven olmamalı.

Transferred Trust =
Source Trust
× Source Influence
× Target Uncertainty
× Social Suggestibility
27. İlişkisel kıskançlık

Kıskançlık yalnızca romantik olmamalı.

Çocuk hikâyelerinde şu biçimlerde olabilir:

en iyi arkadaşını paylaşamama,
öğretmenin ilgisini kıskanma,
yeni gelen karakterin gruptaki yerinden rahatsız olma,
kardeşler arası ilgi rekabeti.
type JealousyAppraisal = {
  valuedRelationshipThreat: number
  comparison: number
  exclusion: number
  insecurity: number
  perceivedReplaceability: number
}

Örnek:

Lumi yeni karakterle çok zaman geçiriyor.
Tilki kendini dışlanmış hissediyor.

Sonuç:

jealousy +0.30
sadness +0.20
attentionSeeking bias +0.25
withdraw bias +0.15

Karakter yapısına göre farklı tepki oluşabilir.

28. Rekabet

Rivalry her zaman düşmanlık değildir.

type RivalryVector = {
  competition: number
  hostility: number
  mutualRespect: number
  comparisonSensitivity: number
  desireToImprove: number
}
Sağlıklı rekabet
competition yüksek
mutualRespect yüksek
hostility düşük
Düşmanca rekabet
competition yüksek
hostility yüksek
respect düşük

Sağlıklı rakipler birbirlerinin gelişimini destekleyebilir.

29. Grup ilişkileri

Bir NPC’nin yalnızca bireylerle değil gruplarla da ilişkisi olabilir.

type GroupRelationship = {
  groupId: string

  belonging: number
  trust: number
  identification: number
  loyalty: number
  safety: number
  status: number
  alienation: number
}

Örnek:

Tilki köydeki bazı kişileri sevmesine rağmen köyün tamamına ait hissetmeyebilir.

individual relationships positive
group belonging low

Bu ayrım önemlidir.

30. Aidiyet

Aidiyet yalnızca “grup üyesi” olmak değildir.

type BelongingState = {
  accepted: number
  understood: number
  valued: number
  included: number
  safeToBeSelf: number
  contributionRecognized: number
}

Bir NPC teknik olarak grubun parçası olabilir ama kendini dışlanmış hissedebilir.

Bu durum hikâyelerde güçlü gelişim alanı yaratır.

31. İlişkisel davranış kalıpları

Karakterler ilişkiler içinde tekrar eden davranış biçimleri geliştirebilir.

type RelationshipPattern =
  | "approach"
  | "avoid"
  | "cling"
  | "test_trust"
  | "protect"
  | "compete"
  | "please"
  | "withdraw_after_conflict"
  | "seek_reassurance"

Örnek:

Tilki yeni birine güvenmeden önce küçük testler yapabilir.

Önce küçük bir sır paylaşır.
Sonucun ne olduğunu gözlemler.
Sonra daha fazla açılır.

Bu tür kalıplar karaktere özgü ilişki tarzı sağlar.

32. Relationship Engine ve Emotion Engine farkı
Emotion Engine
Şu anda ona kızgınım.
Relationship Engine
Ona genel olarak güveniyorum ama son davranışı güvenimi sarstı.

Duygu geçici olabilir.

İlişki daha uzun vadeli örüntüdür.

current anger: 0.70
long-term trust: 0.80

Karakter çok kızgın olmasına rağmen ilişkiyi bitirmek istemeyebilir.

33. Relationship Engine ve Memory Engine bağlantısı

Relationship Engine kanıtı kendisi saklamamalı.

Memory Engine önemli olayları tutar.

Relationship Engine ise onların özet etkisini tutar.

Memory Engine:
“Lumi tilkiyi nehirden kurtardı.”

Relationship Engine:
care evidence +0.60
trust +0.20
gratitude +0.35

Gerekirse ilişki değişiminin nedeni hafızadan açıklanabilir.

34. Relationship Engine ve Decision Engine bağlantısı

Decision Engine şu verileri alabilir:

type RelationshipDecisionContext = {
  targetId: string
  relationship: RelationshipVector
  activeWounds: RelationshipWound[]
  currentExpectations: RelationshipExpectation[]
  actionBiases: RelationshipActionBiases
  relevantRoles: RelationshipRole[]
}

Örneğin iki karakter tehlikedeyse:

yüksek protectiveness
→ diğerini koruma eylemi güçlenir

yüksek resentment
→ yardım isteği azalabilir

yüksek responsibility
→ yardım etme baskısı artar

yüksek dependence
→ ayrılma seçeneği zayıflar
35. Hikâye üretiminde kullanımı

Story Context Builder ilişki verisini kısa anlatısal yönlendirmelere dönüştürür.

Lumi ile Tilki arasındaki ilişki:
- Tilki Lumi’ye güvenir.
- Lumi’ye karşı güçlü minnettarlık hisseder.
- Tehlike anında onun yanında kalır.
- Fakat harita konusunda yaşanan olay yüzünden küçük bir kırgınlık taşır.
- Lumi bir söz verirse Tilki bunu ciddiye alır.

Narrative Engine’e davranış ipuçları gider:

- Tilki Lumi ile konuşurken rahat davranabilir.
- Tehlikede önce Lumi’nin tepkisine bakabilir.
- Kırgınlığını doğrudan söylemek yerine kısa cevaplarla gösterebilir.
- Lumi yardım ederse güveni görünür biçimde artabilir.
36. İlk uygulanabilir Relationship Engine

İlk sürüm için tüm bu yapıların tamamı gerekmez.

Temel çekirdek şu olabilir:

type CoreRelationshipState = {
  targetCharacterId: string

  trust: number
  affection: number
  respect: number
  attachment: number
  gratitude: number

  anger: number
  resentment: number
  suspicion: number
  fear: number

  protectiveness: number
  influence: number

  roles: RelationshipRole[]

  keyMemoryIds: string[]
  unresolvedIssues: string[]
}

İlk sürüm güncelleme girdisi:

type CoreRelationshipEvent = {
  targetCharacterId: string
  eventType:
    | "helped"
    | "protected"
    | "lied"
    | "abandoned"
    | "kept_promise"
    | "broke_promise"
    | "shared_secret"
    | "showed_kindness"
    | "caused_harm"

  significance: number
  intention: number
  outcome: number
}

Bu çekirdek bile hikâye tutarlılığı için oldukça güçlü olur.

37. Örnek ilişki gelişimi
İlk karşılaşma
familiarity: 0.10
trust: 0.15
affection: 0.05
suspicion: 0.30
Lumi yiyecek paylaşıyor
trust +0.10
affection +0.08
gratitude +0.15
suspicion -0.05
Lumi tilkiyi kurtarıyor
trust +0.25
attachment +0.15
gratitude +0.35
protectiveness +0.10
Lumi verdiği sözü unutuyor
trust -0.12
resentment +0.08
suspicion +0.05
Lumi hatasını kabul edip telafi ediyor
resentment -0.05
trust +0.06
respect +0.10

Son ilişki kusursuz değildir ama geçmişi olan, gelişmiş bir bağdır.

38. Relationship Engine temel ilkeleri

Relationship Engine şu kurallara uymalıdır:

1. İlişkiler tek sayı değildir.
2. İlişkiler çift yönlü ama simetrik değildir.
3. Duygu ile ilişki birbirinden ayrıdır.
4. Güven konuya göre değişebilir.
5. Niyet ve sonuç ayrı değerlendirilir.
6. Tek olay tüm ilişkiyi belirlemez.
7. Olumsuz izler onarım süreci gerektirir.
8. Affetmek ve yeniden güvenmek farklıdır.
9. İlişkiler kararları etkiler ama belirlemez.
10. İlişkiler hikâyede açıklanmak yerine davranışla gösterilir.