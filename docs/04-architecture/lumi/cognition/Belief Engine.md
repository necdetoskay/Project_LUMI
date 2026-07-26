Belief Engine

Belief Engine, NPC’nin dünya hakkında doğru veya yanlış kabul ettiği bilgileri yönetecek.

Memory Engine:

“Ormanda bir kurt gördüm.”

Belief Engine:

“Ormanın kuzey kısmında kurtlar yaşıyor.”

Emotion Engine:

“Ormana girerken korkuyorum.”

Decision Engine:

“Kuzey yolundan gitmek yerine başka bir yol seçmeliyim.”

Bu motorlar birbirini besler ama aynı şeyi yapmaz.

1. Bilgi ile inanç aynı şey değildir

Dünya gerçekliği ile NPC’nin inandığı gerçeklik ayrı tutulmalıdır.

type WorldFact = {
  subjectId: string
  predicate: string
  objectId?: string
  value?: unknown
  truthStatus: "true" | "false" | "unknown"
}

Gerçek dünya durumu:

{
  subjectId: "northern_cave",
  predicate: "contains",
  objectId: "sleeping_dragon",
  truthStatus: "true"
}

Fakat NPC’nin inancı farklı olabilir:

{
  subjectId: "northern_cave",
  predicate: "contains",
  objectId: "treasure",
  confidence: 0.75
}

NPC bir şeyin doğru olduğuna inanabilir ama sistem bunun yanlış olduğunu bilir.

Bu ayrım LUMI için çok değerlidir çünkü:

yanlış anlaşılmalar,
söylentiler,
gizemler,
keşifler,
sürprizler,
fikir değişimleri

doğal olarak oluşabilir.

2. Temel inanç modeli
type Belief = {
  id: string
  ownerCharacterId: string

  subjectId: string
  predicate: string
  objectId?: string
  value?: unknown

  confidence: number
  importance: number

  sourceType:
    | "direct_observation"
    | "memory"
    | "testimony"
    | "rumor"
    | "inference"
    | "tradition"
    | "intuition"
    | "authority"

  sourceIds: string[]
  supportingEvidenceIds: string[]
  contradictingEvidenceIds: string[]

  createdAt: number
  lastUpdatedAt: number

  status:
    | "active"
    | "questioned"
    | "rejected"
    | "superseded"
    | "unknown"
}

Örnek:

{
  id: "belief_fox_lumi_reliable",
  ownerCharacterId: "fox",
  subjectId: "lumi",
  predicate: "is_reliable",
  value: true,

  confidence: 0.78,
  importance: 0.70,

  sourceType: "memory",
  sourceIds: [
    "river_rescue",
    "promise_kept_at_old_bridge"
  ],

  supportingEvidenceIds: [
    "evidence_rescue",
    "evidence_kept_promise"
  ],

  contradictingEvidenceIds: [
    "evidence_forgotten_map"
  ],

  status: "active"
}

Burada tilki Lumi’nin güvenilir olduğuna inanıyor ama bu inanç mutlak değil.

3. İnanç kategorileri

Bütün inançlar aynı yapıda olsa da kullanım açısından kategorilere ayrılmalıdır.

type BeliefCategory =
  | "world"
  | "character"
  | "self"
  | "relationship"
  | "causal"
  | "moral"
  | "social"
  | "future"
  | "procedural"
Dünya inancı
“Eski değirmenin altında gizli bir geçit var.”
Karakter inancı
“Yaşlı denizci bir şey saklıyor.”
Benlik inancı
“Tehlike anında sakin kalabilirim.”
İlişkisel inanç
“Lumi beni yalnız bırakmaz.”
Nedensel inanç
“Çan üç kez çalarsa fırtına başlar.”

Bu doğru veya batıl bir inanç olabilir.

Ahlaki inanç
“Verilen söz her durumda tutulmalıdır.”
Sosyal inanç
“Köylüler yabancılara güvenmez.”
Gelecek inancı
“Ejderha geri dönecek.”
Prosedürel inanç
“Bu kapıyı açmak için önce mavi taşı çevirmeliyim.”
4. Güven seviyesi kesinlik değildir

Bir NPC inancı tamamen doğru veya yanlış olarak saklamamalıdır.

confidence: 0.10 → zayıf ihtimal
confidence: 0.30 → şüphe
confidence: 0.50 → olabilir
confidence: 0.70 → büyük ihtimalle doğru
confidence: 0.90 → neredeyse emin
confidence: 1.00 → kesin kabul

Ancak NPC’nin konuşması karaktere göre değişebilir.

Aynı 0.70 güven seviyesi:

Temkinli NPC:

“Sanırım kuzey yolu güvenli olabilir.”

Kendinden emin NPC:

“Kuzey yolu güvenli.”

Yani ifade kesinliği ile içsel inanç güveni aynı olmayabilir.

5. İnancın önemi

NPC her yanlış inancını düzeltmek için aynı çabayı göstermemelidir.

type BeliefImportance = {
  goalRelevance: number
  identityRelevance: number
  emotionalRelevance: number
  relationshipRelevance: number
  survivalRelevance: number
}

Önemsiz inanç:

“Pazar salı günü açılıyor.”

Çok önemli inanç:

“Lumi beni terk etti.”

İkinci inanç:

ilişkiyi,
duyguları,
kararları,
gelecek beklentilerini

etkiler.

6. İnançların kaynakları

Bir NPC’nin bir şeye neden inandığını bilmeliyiz.

Doğrudan gözlem
“Kendi gözlerimle gördüm.”

Genellikle güçlü kanıt kabul edilir ama gözlem yanlış yorumlanabilir.

Başka bir karakterin sözü
“Baykuş bana söyledi.”

Etkisi kaynak güvenine bağlıdır.

Söylenti
“Köyde herkes mağaranın lanetli olduğunu söylüyor.”

Kanıt zayıf olabilir fakat sosyal tekrar inancı güçlendirebilir.

Çıkarım
“Kapı açık ve ayak izleri var; biri içeri girmiş olmalı.”
Gelenek
“Büyüklerimiz hep böyle anlatır.”
Duygusal sezgi
“Ona güvenmiyorum ama nedenini bilmiyorum.”

Bu düşük kanıtlı ama davranışa etkili olabilir.

7. Kaynak güveni

Yeni bilginin etkisi, söyleyen karaktere göre değişmelidir.

type BeliefSourceTrust = {
  sourceCharacterId: string
  honestyTrust: number
  expertiseTrust: number
  intentionTrust: number
  contextualTrust: number
}

Örneğin yaşlı denizci:

denizcilik konusunda uzman,
fakat sırlarını paylaşmıyor olabilir.
{
  honestyTrust: 0.55,
  expertiseTrust: 0.90,
  intentionTrust: 0.60,
  contextualTrust: 0.85
}

Denizle ilgili söylediği bilgi güçlü kabul edilir.

Ancak kayıp hazine hakkında söyledikleri daha şüpheli değerlendirilebilir.

8. Kanıt modeli
type BeliefEvidence = {
  id: string
  beliefId?: string

  claim: {
    subjectId: string
    predicate: string
    objectId?: string
    value?: unknown
  }

  supportsClaim: boolean
  strength: number
  reliability: number
  relevance: number

  sourceType: Belief["sourceType"]
  sourceId: string

  interpretationConfidence: number
}

Etkin kanıt gücü:

Effective Evidence =
Strength
× Reliability
× Relevance
× Interpretation Confidence
9. İnanç güncelleme

Yeni kanıt geldiğinde mevcut inanç doğrudan değiştirilmemelidir.

Updated Confidence =
Current Belief
+ Supporting Evidence
- Contradicting Evidence

Ancak şu faktörler de hesaba katılmalıdır:

Belief Revision =
Evidence Strength
× Source Trust
× Cognitive Flexibility
× Emotional Safety
× Existing Bias
× Identity Resistance

Örneğin tilki tüm insanların tehlikeli olduğuna inanıyorsa, Lumi’nin tek bir iyi davranışı bu inancı hemen yok etmez.

Ama tekrar eden güvenli deneyimler zamanla inancı değiştirebilir.

10. İnanç direnci

Bazı inançlar diğerlerinden daha zor değişir.

type BeliefResistance = {
  evidenceResistance: number
  identityAttachment: number
  emotionalAttachment: number
  socialReinforcement: number
  repetitionStrength: number
}

Bir inanç:

karakterin kimliğine bağlıysa,
güçlü duyguyla oluşmuşsa,
grup tarafından sürekli tekrar ediliyorsa,
yıllardır kabul ediliyorsa

değişmesi zorlaşır.

11. Yanlış inançlar hata değil, özellik olmalıdır

Belief Engine’in amacı bütün NPC’leri gerçeğe ulaştırmak değildir.

Yanlış inançlar hikâye üretir.

Örneğin:

Gerçek:
Mira yardım bulmak için kampı terk etti.

Lumi’nin inancı:
Mira bizi terk etti.

Tilkinin inancı:
Mira bir tehlike gördü fakat söylemedi.

Baykuşun inancı:
Mira gizli bir mesaj aldı.

Bu farklı inançlar:

farklı duygular,
farklı diyaloglar,
farklı kararlar

üretir.

12. İnanç çatışması

NPC aynı anda birbiriyle çelişen iki inanca sahip olabilir.

“Lumi güvenilir biridir.”
“Lumi verdiği sözü unuttu.”

Bu durumda sistem hemen birini silmemelidir.

type BeliefConflict = {
  beliefIds: string[]
  tension: number

  resolutionState:
    | "unnoticed"
    | "noticed"
    | "rationalized"
    | "investigating"
    | "resolved"
}

Karakter şöyle düşünebilir:

“Belki güvenilir ama bazen dikkatsiz.”

Bu şekilde daha ayrıntılı yeni bir inanç oluşabilir.

13. Bilişsel uyumsuzluk

Bir olay NPC’nin güçlü inancıyla çeliştiğinde duygusal baskı oluşabilir.

Strong Existing Belief
+ Strong Contradictory Evidence
→ Cognitive Dissonance

Olası tepkiler:

kanıtı reddetmek,
kaynağı suçlamak,
olayı istisna saymak,
inancı değiştirmek,
daha ayrıntılı yeni bir açıklama üretmek.

Örnek:

İnanç:
“Yaşlı denizci asla yalan söylemez.”

Kanıt:
Denizcinin haritayı sakladığı görülür.

NPC:

“Belki bunu bizi korumak için yaptı.”

Bu rasyonelleştirme olabilir veya gerçekten doğru olabilir.

14. Söylenti sistemi

Söylenti, doğruluğu kesinleşmemiş sosyal inanç paketidir.

type Rumor = {
  id: string
  claim: BeliefEvidence["claim"]

  originCharacterId?: string
  currentSpreaders: string[]

  credibility: number
  emotionalCharge: Partial<EmotionVector>
  novelty: number
  socialImportance: number

  distortionLevel: number
  spreadCount: number
}

Söylenti yayılırken değişebilir.

İlk anlatım:

“Ormanda büyük bir gölge görüldü.”

Sonraki:

“Ormanda dev bir yaratık yaşıyor.”

Daha sonra:

“Dev yaratık köye saldırmaya hazırlanıyor.”

Her aktarımda:

ayrıntı eklenebilir,
bazı ayrıntılar kaybolabilir,
anlatanın korkusu veya beklentisi söylentiye karışabilir.
15. Söylentinin yayılma ihtimali
Rumor Spread =
Novelty
× Emotional Charge
× Social Relevance
× Speaker Influence
× Listener Suggestibility

Ancak NPC her söylentiyi paylaşmamalıdır.

Şunlar da etkili olabilir:

sır tutma eğilimi,
doğruluk değeri,
dikkat çekme ihtiyacı,
grubun ruh hâli,
hedef karakterle ilişkisi.
16. Bilgi bozulması

Her NPC duyduğu bilgiyi aynı biçimde aktarmamalıdır.

type InformationTransmissionProfile = {
  memoryAccuracy: number
  exaggerationTendency: number
  simplificationTendency: number
  emotionalColoring: number
  selfServingDistortion: number
}

Bu yapı doğal “kulaktan kulağa” etkisi oluşturur.

17. Sırlar

Her bilgi herkese açık olmamalıdır.

type Secret = {
  id: string
  factId?: string
  beliefId?: string

  knownBy: string[]
  suspectedBy: string[]

  ownerCharacterId?: string
  sensitivity: number
  dangerIfRevealed: number

  sharingRules: {
    minimumTrust: number
    allowedRoles: RelationshipRole[]
    forbiddenCharacters: string[]
  }
}

Bir NPC sırrı paylaşmadan önce şunları değerlendirir:

karşı tarafa güveniyor mu?
sırrın sahibi kim?
paylaşmanın faydası nedir?
zarar riski nedir?
söz vermiş mi?
duygusal baskı altında mı?
18. Bilgi erişimi

Bir NPC’nin bildiği ile erişebildiği bilgi farklı olabilir.

Karakter bir şeyi biliyor olabilir fakat o anda hatırlamayabilir.

Stored Belief
≠ Active Belief

Aktif inanç seçimi:

Activation Score =
Current Event Relevance
+ Goal Relevance
+ Emotional Match
+ Recent Use
+ Source Trigger

Decision Engine sadece ilgili aktif inançları kullanmalıdır.

19. Benlik inançları

Karakterin kendisi hakkındaki inançları kararlarında çok güçlü olmalıdır.

type SelfBelief = {
  dimension:
    | "courage"
    | "kindness"
    | "competence"
    | "worthiness"
    | "reliability"
    | "independence"
    | "belonging"

  value: number
  confidence: number
  supportingMemoryIds: string[]
  contradictingMemoryIds: string[]
}

Örnek:

“Ben korksam da yardım edebilirim.”

Bu inanç gelecekte:

help action confidence +0.20
freeze bias -0.10

üretebilir.

20. Öğrenilmiş inançlar

Karakter kendi davranış sonuçlarından genellemeler çıkarabilir.

Olay:
Tilki yardım istedi ve Lumi geldi.

Yeni inanç:
“Yardım istersem yalnız kalmayabilirim.”

Tekrarlandığında:

“Başkalarından destek istemek güvenlidir.”

Bu, karakter gelişiminin mekanik karşılığıdır.

21. Gelecek hakkındaki inançlar

NPC olası gelecekler hakkında tahminlere sahip olabilir.

type FutureBelief = {
  outcomeId: string
  probability: number
  desirability: number
  confidence: number
  timeHorizon: number
}

Örnek:

“Fırtına gece başlamadan önce köye ulaşabiliriz.”

Bu inanç:

hope,
anxiety,
plan seçimi,
risk değerlendirmesi

üzerinde etkili olur.

22. Nedensel inançlar

NPC yalnızca ne olduğunu değil, neden olduğunu da yorumlamalıdır.

type CausalBelief = {
  causeId: string
  effectId: string
  strength: number
  confidence: number
}

Örnek:

“Göl kurudu çünkü dağın ruhu kızdı.”

Gerçek neden başka olabilir.

Yanlış nedensel inanç, yanlış çözümler üretir:

NPC dağın ruhunu yatıştırmaya çalışır.

Çocuk yeni kanıtlarla gerçek nedeni keşfedebilir.

23. Ahlaki inançlar ve değerler

Değer ile inanç ayrılmalıdır.

Değer:

“Dürüstlük benim için önemlidir.”

Ahlaki inanç:

“Bir arkadaşını korumak için bazen gerçeğin tamamı söylenmeyebilir.”

Bu ikisi çatışabilir.

type MoralBelief = {
  principle: string
  confidence: number
  contextualExceptions: string[]
  supportingExperiences: string[]
}

Bu yapı karakterlerin ahlaki olarak birbirinden farklı ama anlaşılabilir davranmasını sağlar.

24. Grup inançları

Köylerin, toplulukların ve grupların ortak inançları olabilir.

type CollectiveBelief = {
  groupId: string
  claim: BeliefEvidence["claim"]

  acceptanceRate: number
  authoritySupport: number
  traditionStrength: number
  dissentingCharacterIds: string[]
}

Örnek:

“Ormanın ötesine geçenler geri dönmez.”

Grubun çoğu buna inanabilir.

Ancak genç baykuş bunu sorgulayabilir.

Bu durum kuşak ve grup çatışması oluşturabilir.

25. İnanç yayılımı

NPC başka bir karakterin inancını şu nedenlerle benimseyebilir:

kaynağa güven,
grubun çoğunluğuna uyma,
kanıt görme,
korku,
hayranlık,
otorite,
tekrar.
Adoption Probability =
Evidence Strength
+ Source Trust
+ Social Pressure
+ Emotional Compatibility
- Existing Belief Resistance
26. İnanç ve Emotion Engine bağlantısı

Emotion Engine olayı değerlendirirken aktif inançları kullanır.

Örnek olay:

Mağaradan ses geldi.

NPC A’nın inancı:

“Mağarada dost bir ejderha yaşıyor.”

Sonuç:

curiosity +0.45
joy +0.15

NPC B’nin inancı:

“Mağaradaki yaratık avlanıyor.”

Sonuç:

fear +0.60
escape bias +0.35

Olay aynı, inanç farklıdır.

27. Belief Engine ve Decision Engine bağlantısı

Decision Engine nesnel dünyaya göre değil, NPC’nin bildiği ve inandığı dünyaya göre karar vermelidir.

Bu kritik bir ilkedir:

NPC, sahip olmadığı bilgiyle karar veremez.

type BeliefDecisionContext = {
  activeBeliefs: Belief[]
  uncertainBeliefs: Belief[]
  relevantConflicts: BeliefConflict[]
  knownUnknowns: string[]
}

NPC mağarada güvenli çıkış olduğunu bilmiyorsa, Decision Engine bu çıkışı seçenek olarak sunmamalıdır.

28. “Bilmiyorum” durumu

Sistem her boşluğu yanlış inançla doldurmamalıdır.

NPC şunu da bilebilmelidir:

“Bilmiyorum.”
type KnowledgeState =
  | "known"
  | "believed"
  | "suspected"
  | "unknown"
  | "misinformed"

Bu ayrım karakterin:

soru sormasını,
araştırmasını,
yardım istemesini,
dikkatli davranmasını

sağlar.

29. Bilinen bilinmezler

NPC bir şeyi bilmediğinin farkında olabilir.

“Haritanın nereye götürdüğünü bilmiyorum.”

Ya da bilmediğinin farkında olmayabilir.

NPC haritanın eksik olduğunu bilmiyor.

Bu ayrım:

type UnknownState = {
  topicId: string
  awareness:
    | "known_unknown"
    | "unknown_unknown"
}

şeklinde tutulabilir.

known_unknown, araştırma hedefi oluşturabilir.

30. İnanç doğrulama davranışları

NPC önemli ve belirsiz bir inancı test etmek isteyebilir.

type BeliefVerificationAction =
  | "ask_witness"
  | "inspect_location"
  | "search_memory"
  | "consult_expert"
  | "run_safe_test"
  | "compare_sources"
  | "wait_for_more_evidence"

Örnek:

“Yaşlı denizci haritayı saklıyor olabilir.”

Karakter seçenekleri:

doğrudan sormak,
odasını araştırmak,
başka bir tanığa danışmak,
davranışını gözlemlemek.

Hangi seçeneğin seçileceğini Decision Engine belirler.

31. Hikâye üretiminde kullanımı

Story Context Builder, Belief Engine verilerini kısa ve kullanışlı hâle getirir.

Tilkinin aktif inançları:
- Lumi’nin iyi niyetli olduğuna inanıyor.
- Yaşlı denizcinin harita hakkında bildiğinden fazlasını sakladığından şüpheleniyor.
- Kuzey mağarasının tehlikeli olduğunu düşünüyor fakat bunu hiç görmedi.
- Haritasını geri bulabileceğine dair umudu azalmış durumda.

Narrative Engine’e şu kurallar gönderilebilir:

- Tilki, kuzey mağarası hakkında kesin konuşmasın; korkulu bir söylentiden bahsetsin.
- Yaşlı denizcinin sözlerine dikkatle yaklaşsın.
- Lumi’nin önerilerine diğer karakterlerden daha açık olsun.
- Bilmediği bilgileri biliyormuş gibi kullanmasın.
32. İlk uygulanabilir Belief Engine

İlk sürüm için şu çekirdek yeterlidir:

type CoreBelief = {
  id: string
  ownerCharacterId: string

  subjectId: string
  predicate: string
  value: unknown

  category:
    | "world"
    | "character"
    | "self"
    | "relationship"
    | "causal"
    | "future"

  confidence: number
  importance: number

  sourceType:
    | "observation"
    | "memory"
    | "testimony"
    | "rumor"
    | "inference"

  sourceIds: string[]
  supportingEvidenceIds: string[]
  contradictingEvidenceIds: string[]

  status:
    | "active"
    | "questioned"
    | "rejected"
}

Temel işlemler:

createBelief()
addEvidence()
updateConfidence()
questionBelief()
rejectBelief()
replaceBelief()
retrieveRelevantBeliefs()
33. Belief Engine temel ilkeleri
1. Dünya gerçeği ile NPC inancı ayrıdır.
2. NPC yalnızca bildiği veya inandığı bilgiyle karar verir.
3. İnançlar kesin doğru/yanlış yerine güven seviyesine sahiptir.
4. İnançların kaynakları ve kanıtları izlenir.
5. Yanlış inançlar sistem hatası değil, anlatı aracıdır.
6. Yeni kanıt inancı anında değiştirmek zorunda değildir.
7. Güçlü duygular ve kimlik, inanç değişimini zorlaştırabilir.
8. NPC çelişkili inançları aynı anda taşıyabilir.
9. Söylentiler aktarım sırasında bozulabilir.
10. Bilinmeyen bilgi, otomatik olarak doldurulmaz.
11. İnançlar Emotion Engine’i ve Decision Engine’i etkiler.
12. Hikâyede inançlar davranış ve diyaloglarla gösterilir.