Memory Engine — Uygulanabilir Mimari

Burada amaç, NPC’nin yaşadığı her şeyi kaydetmek değil; gelecekte davranışını, ilişkilerini veya hikâyeyi etkileyebilecek olayları seçerek saklamaktır.

Temel ilke:

Memory Engine bir arşiv değildir.
Anlamlı deneyimlerin seçilmiş temsilidir.
1. Her olay hafızaya dönüşmemeli

Dünya sürekli olay üretirse bütün olayları saklamak mümkün değildir.

Örneğin:

Tilki ağacın yanından geçti.
Bir kuş öttü.
Yağmur kısa süre yağdı.
Tilki bir taş gördü.

Bunların çoğu uzun süreli hafızaya gerek duymaz.

Ancak:

Tilki kayboldu.
Lumi onu buldu.
Tilki ilk kez yardım istedi.
Eski haritanın bir parçası bulundu.

gibi olaylar kaydedilmeye değerdir.

Bir olayın kaydedilme puanı şöyle hesaplanabilir:

Encoding Score =
Emotional Intensity
+ Goal Relevance
+ Relationship Impact
+ Novelty
+ Consequence
+ Unresolved Importance

Eşik altındaki olaylar ya hiç saklanmaz ya da kısa süreli hafızada tutulur.

2. Temel hafıza türleri

Memory Engine’i dört ana katmanda tutabiliriz.

Anlık bağlam

Karakterin şu anki sahnede bildikleri:

type WorkingMemory = {
  currentLocationId: string
  visibleCharacters: string[]
  activeThreats: string[]
  recentActions: string[]
  immediateGoalIds: string[]
}

Bu veri sahne bitince büyük ölçüde silinir.

Yakın geçmiş

Son birkaç sahne veya hikâyedeki olaylar:

type RecentMemory = {
  eventId: string
  summary: string
  occurredAt: number
  relevance: number
}
Uzun süreli episodik hafıza

Belirli yaşanmış olaylar:

“Lumi beni nehirden kurtardı.”
Özetlenmiş anlamsal hafıza

Tek tek olaylardan çıkarılan genel sonuçlar:

“Lumi tehlike anında yardım eder.”

Episodik hafıza olaydır; anlamsal hafıza olaylardan çıkarılmış bilgidir.

3. Temel hafıza kaydı
type MemoryRecord = {
  id: string
  ownerCharacterId: string
  sourceEventId: string

  type:
    | "episodic"
    | "relationship"
    | "emotional"
    | "goal"
    | "discovery"
    | "warning"
    | "promise"
    | "loss"
    | "achievement"

  factualSummary: string
  subjectiveMeaning: string

  participants: string[]
  locationId?: string
  occurredAt: number

  significance: number
  emotionalIntensity: number
  confidence: number
  vividness: number
  accessibility: number

  unresolved: boolean
  activeGoalIds: string[]
  relationshipEffectIds: string[]
  beliefEffectIds: string[]

  tags: string[]
}

Buradaki en kritik ayrım:

factualSummary
≠
subjectiveMeaning

Örnek:

{
  factualSummary: "Mira kampı gece terk etti.",
  subjectiveMeaning: "Mira bizi tehlike anında yalnız bıraktı."
}

Daha sonra gerçeğin farklı olduğu ortaya çıkabilir.

4. Aynı olay, farklı hafızalar

Tek bir dünya olayı, her NPC için farklı hafıza üretmelidir.

Olay:

Köprü çöktü.

Lumi’nin hafızası:

“Tilkiyi zamanında çekip kurtardım.”

Tilkinin hafızası:

“Lumi elimi bırakmadı.”

Baykuşun hafızası:

“Köprünün eski olduğunu önceden söylemeliydim.”

Her hafıza şu bileşenlerden etkilenir:

karakterin konumu,
ne gördüğü,
ne bildiği,
o anki duygusu,
değerleri,
hedefleri,
olayla ilişkisi.

Bu nedenle Memory Engine dünya olayını doğrudan kopyalamamalıdır.

Önce karakter bakış açısına dönüştürmelidir.

5. Hafıza oluşturma akışı
World Event
↓
Perception Filter
↓
Character Appraisal
↓
Emotion Response
↓
Memory Encoding Score
↓
Memory Record

NPC’nin görmediği olay onun hafızasına girmemelidir.

Başkasından duyduğu bilgi ise doğrudan anı değil, tanıklık kaynaklı bir inanç olmalıdır.

Gördüm
→ episodik hafıza

Duydum
→ belief evidence

Çıkardım
→ inferred belief
6. Perception filtresi

NPC her olayın tamamını algılamaz.

type PerceivedEvent = {
  observerId: string
  sourceEventId: string

  visibleFacts: string[]
  inferredFacts: string[]
  missedFacts: string[]

  perceptionConfidence: number
}

Örneğin Mira kampı terk ediyor.

Lumi yalnızca şunu görüyor:

Mira sessizce uzaklaştı.

Ama şunu görmüyor:

Mira yardım bulmaya gidiyor.

Hafıza eksik bilgiyle oluşur.

Bu durum yanlış anlaşılmaların doğal kaynağıdır.

7. Hafıza önem puanı

Önem puanı sabit olmamalı; olayın karakter açısından anlamına bağlı olmalıdır.

type MemorySignificanceFactors = {
  emotionalIntensity: number
  personalGoalImpact: number
  relationshipImpact: number
  novelty: number
  danger: number
  moralImportance: number
  identityImpact: number
  unresolvedness: number
}

Örnek hesap:

significance =
emotionalIntensity × 0.20
+ goalImpact × 0.20
+ relationshipImpact × 0.20
+ novelty × 0.10
+ danger × 0.10
+ identityImpact × 0.10
+ unresolvedness × 0.10

Ağırlıklar karaktere göre değişebilir.

Korkak bir karakterde danger daha yüksek ağırlık alabilir.

Sadık bir karakterde relationshipImpact daha güçlü olabilir.

8. Kısa süreli hafızadan uzun süreliye geçiş

Bir olay önce yakın geçmişe kaydedilebilir.

Daha sonra şu koşullardan biri oluşursa uzun süreli hâle gelir:

tekrar hatırlanması,
güçlü duygu üretmesi,
önemli karar doğurması,
ilişkiyi değiştirmesi,
bir hedefe bağlanması,
daha sonraki olaylarla anlam kazanması.

Örneğin önemsiz görünen bir anahtar:

Tilki eski bir anahtar buldu.

Başlangıçta düşük önemlidir.

Daha sonra anahtar gizli kapıyı açarsa eski olayın önemi yükselir.

retroactive significance

Yani hafızanın önemi sonradan değişebilir.

9. Hafıza bağlantıları

Anılar bağımsız kayıtlar olarak kalmamalıdır.

type MemoryLink = {
  sourceMemoryId: string
  targetMemoryId: string

  relation:
    | "same_event"
    | "cause"
    | "consequence"
    | "contradiction"
    | "similarity"
    | "same_character"
    | "same_location"
    | "goal_chain"
    | "repair"
}

Örneğin:

Mira kampı terk etti.
↓ contradiction
Mira yardım getirdi.
↓ repair
Mira nedenini açıkladı.

Bu yapı hikâyenin gelişim zincirini korur.

10. Çözülmemiş anılar

Bazı anılar hikâyede tekrar kullanılmaya daha uygundur.

type UnresolvedMemoryState = {
  memoryId: string

  unresolvedQuestions: string[]
  emotionalResidue: number
  activeUntilResolved: boolean
  possibleResolutionTypes: string[]
}

Örnek:

“Yaşlı denizci haritayı neden sakladı?”

Bu anı:

merakı,
şüpheyi,
görevi,
diyaloğu

besleyebilir.

Çözülmemiş anılar retrieval sırasında öncelik almalıdır.

11. Hafıza çürümesi

Unutma, hafızayı tamamen silmek anlamına gelmemelidir.

Zamanla ayrı boyutlar azalabilir:

type MemoryDecayState = {
  factualDetail: number
  temporalDetail: number
  sensoryDetail: number
  emotionalCharge: number
  accessibility: number
  confidence: number
}

Örneğin yıllar sonra karakter:

“Lumi’nin beni kurtardığını hatırlıyorum.”

diyebilir ama:

hangi gün olduğunu,
nehirde ne söylediğini,
havanın nasıl olduğunu

hatırlamayabilir.

Temel anlam korunabilir:

“Lumi beni yalnız bırakmadı.”
12. Her hafıza aynı hızla unutulmamalı

Çürüme profili:

type MemoryDecayProfile = {
  factualDecayRate: number
  emotionalDecayRate: number
  accessibilityDecayRate: number
  meaningPersistence: number
}

Şunlar yavaş unutulur:

güçlü korku,
büyük kayıp,
önemli başarı,
ilk deneyimler,
ihanet,
hayat kurtarma,
verilen büyük sözler.

Şunlar hızlı unutulur:

sıradan yolculuklar,
önemsiz konuşmalar,
tekrar eden günlük faaliyetler.
13. Yeniden hatırlama hafızayı güçlendirir

Anı her hatırlandığında erişilebilirliği artabilir.

Recall
→ accessibility artar
→ decay yavaşlar

Ama aynı zamanda yeniden yorumlanabilir.

type MemoryRecall = {
  memoryId: string
  recalledAt: number
  triggerId?: string
  currentEmotion: Partial<EmotionVector>
  currentBeliefIds: string[]
  currentRelationshipStateId?: string
}

Karakter kızgınken eski bir olayı hatırlarsa olay daha olumsuz yorumlanabilir.

Sakinleştiğinde aynı anıya daha dengeli bakabilir.

14. Hafıza güncellenirken geçmiş silinmemeli

Bir anının yeni anlamı oluştuğunda eski anlamı kaybetmemeliyiz.

type MemoryRevision = {
  id: string
  memoryId: string

  previousMeaning: string
  revisedMeaning: string

  causeEventId: string
  confidenceBefore: number
  confidenceAfter: number

  revisedAt: number
}

Örnek:

İlk anlam:

“Mira bizi terk etti.”

Yeni bilgi sonrası:

“Mira yardım bulmak için gitti ama bunu açıklamadı.”

Son durum daha karmaşıktır:

terk edilme inancı azalır,
güven kısmen geri gelir,
iletişim eksikliği hâlâ sorun olabilir.
15. Yanlış hatırlama

Memory Engine kusursuz kayıt sistemi olmamalıdır.

Bazı karakterlerde:

ayrıntılar karışabilir,
zaman sırası bozulabilir,
duygu gerçeği renklendirebilir,
başkasının anlatısı kendi anısına karışabilir.
type MemoryDistortion = {
  memoryId: string

  omission: number
  exaggeration: number
  emotionalColoring: number
  sourceConfusion: number
  selfServingBias: number
}

Ancak bu sistem dikkatli kullanılmalıdır.

Çocuk hikâyesinde sürekli güvenilmez hafıza kafa karıştırabilir.

Bu nedenle yanlış hatırlama:

anlamlı hikâye durumlarında,
düşük sıklıkta,
açıklanabilir nedenlerle

kullanılmalıdır.

16. Hafıza tetikleyicileri

Bir anı şu tetikleyicilerle aktif olabilir:

aynı yer,
aynı kişi,
benzer olay,
aynı nesne,
aynı ses,
aynı duygu,
aynı hedef.
type MemoryTrigger = {
  type:
    | "character"
    | "location"
    | "object"
    | "event_pattern"
    | "emotion"
    | "dialogue_topic"
    | "goal"

  referenceId: string
  strength: number
}

Örnek:

Nehir sesi
→ kurtarılma anısı

Fakat her nehir sahnesinde aynı anı anlatılmamalıdır.

Trigger sadece retrieval puanını artırmalıdır.

17. İlgili hafızaların seçilmesi

Yeni hikâye oluşturulurken bütün hafıza LLM’ye verilmemelidir.

Memory Engine aday anıları puanlar:

Retrieval Score =
Current Event Similarity
+ Character Match
+ Location Match
+ Goal Relevance
+ Emotional Match
+ Relationship Relevance
+ Unresolved Bonus
+ Significance
+ Recency

Ardından ilk 3–5 anı seçilir.

type MemoryRetrievalQuery = {
  ownerCharacterId: string
  participantIds?: string[]
  locationId?: string
  activeGoalIds?: string[]
  currentEmotion?: Partial<EmotionVector>
  eventTags?: string[]
  limit: number
}

Bu seçim mekanizması LUMI için Memory Engine’in en önemli işlerinden biridir.

18. Çeşitlilik kuralı

En yüksek puanlı beş anının hepsi aynı olaya ait olabilir.

Bunu engellemek gerekir.

Örnek seçim:

1 ilişki anısı
1 aktif hedef anısı
1 mekân anısı
1 duygusal anı
1 son yaşanan önemli olay

Bu bir zorunluluk değil, çeşitlendirme kuralı olabilir.

relevance + diversity

Böylece prompt tek bir geçmiş olayın etrafında dönmez.

19. Hafıza bütçesi

Her NPC için sınırsız episodik kayıt tutulmamalıdır.

Örnek bütçe:

Çekirdek karakter:
100–300 önemli episodik hafıza

Destekleyici NPC:
20–80 hafıza

Arka plan NPC:
5–20 özet hafıza

Eski ve düşük değerli anılar:

birleştirilebilir,
özetlenebilir,
anlamsal inanca dönüştürülebilir,
arşive alınabilir.
20. Hafıza birleştirme

Benzer olaylar tek tek saklanmak yerine özetlenebilir.

Tekil kayıtlar:

Lumi birinci kez sözünü tuttu.
Lumi ikinci kez sözünü tuttu.
Lumi üçüncü kez sözünü tuttu.

Özet:

“Lumi verdiği sözleri genellikle tutar.”
type ConsolidatedMemory = {
  sourceMemoryIds: string[]
  patternSummary: string
  occurrenceCount: number
  confidence: number
  exceptions: string[]
}

Önemli tekil olaylar silinmek zorunda değildir.

Özet hafıza, retrieval için daha verimli olabilir.

21. Hikâye özeti ile NPC hafızası ayrılmalı

Sistem iki farklı hafıza türü tutmalıdır.

Dünya geçmişi

Nesnel olay kaydı:

Mira saat 22.00’de yardım bulmak için kampı terk etti.
NPC hafızası

Öznel deneyim:

Lumi, Mira’nın neden gittiğini bilmiyordu ve terk edildiğini düşündü.

Dünya geçmişi, sistemin gerçeğidir.

NPC hafızası, karakterin gerçeğidir.

Bu ayrım korunmazsa NPC’ler bilmemeleri gereken bilgileri kullanabilir.

22. Kullanıcı/çocuk hafızası

Çocuğun bildiği bilgiler de ayrı tutulabilir.

type PlayerKnowledgeState = {
  knownFactIds: string[]
  discoveredSecretIds: string[]
  witnessedEventIds: string[]
  unresolvedMysteryIds: string[]
}

Narrative Engine çocuğun bilmediği gerçeği yanlışlıkla açıklamamalıdır.

Örneğin çocuk Mira’nın neden gittiğini bilmiyorsa anlatıcı şunu söylememelidir:

Mira aslında yardım bulmaya gidiyordu.

Bunun yerine:

Mira karanlıkta gözden kayboldu.

denmelidir.

23. Kullanıcının gerçek hafızasını destekleme

Senin çevrimdışı simülasyon fikrin burada doğrudan önemli.

Sistem yalnızca NPC hafızasını değil, kullanıcının hikâyeyi hatırlama ihtimalini de düşünmelidir.

Uzun aradan sonra Context Builder şunları sunabilir:

En son:
- Lumi ve Tilki eski değirmene ulaştı.
- Haritanın bir parçası bulundu.
- Yaşlı denizci hakkında şüphe oluştu.
- Hikâye, gizli kapının önünde durdu.

Bu bir NPC hafızası değil, kullanıcıya yönelik devamlılık özetidir.

24. Çevrimdışı süreyle bağlantı

Az önce belirlediğimiz model Memory Engine’e de uygulanmalı.

1–3 gün

Yeni olaylar normal şekilde hafızaya işlenebilir.

4–7 gün

Yalnızca anlamlı ilişkisel veya hedef bağlantılı olaylar kaydedilir.

8–10 gün

Yalnızca küçük dünya değişimleri ve bekleyen gelişmeler saklanır.

10 günden sonra

Yeni simülasyon ve yeni hafıza oluşmaz.

Bu, hafızanın kontrolsüz büyümesini de önler.

25. Kritik anılar korunmalı

Bazı hafızalar otomatik olarak silinmemeli veya özet içinde kaybolmamalıdır.

type MemoryProtectionReason =
  | "main_story"
  | "relationship_milestone"
  | "identity_defining"
  | "unresolved_mystery"
  | "promise"
  | "major_loss"
  | "major_achievement"
  | "player_choice"

Özellikle çocuğun verdiği önemli kararlar korunmalıdır.

“Ejderhayı cezalandırmak yerine ona yardım etti.”

Bu karar gelecekte karakterin kimliği ve dünyanın tepkileri için önemli olabilir.

26. Oyuncu karar anıları
type PlayerChoiceMemory = {
  choiceId: string
  storyId: string

  selectedOption: string
  alternatives: string[]

  affectedCharacters: string[]
  moralDimensions: string[]
  immediateConsequences: string[]
  longTermConsequences: string[]

  significance: number
}

NPC’ler aynı kararı farklı yorumlayabilir.

Tilki:
“Lumi merhametli davrandı.”

Muhafız:
“Lumi gereksiz risk aldı.”

Ejderha:
“Lumi bana ikinci bir şans verdi.”
27. Hafıza ve karakter gelişimi

Memory Engine doğrudan karakter özelliği değiştirmemelidir.

Bunun yerine kanıt üretmelidir.

Memory
→ Self-belief evidence
→ Trait tendency
→ Decision bias

Örnek:

Tilki korkmasına rağmen mağaraya girdi.

Yeni benlik inancı:

“Korktuğumda da hareket edebilirim.”

Bu tekrarlandıkça cesaret eğilimi artabilir.

Tek bir olay kalıcı kişilik değişikliği yaratmamalıdır.

28. Hafıza ve Relationship Engine

İlişki değişimi hafıza kaynaklı açıklanabilir olmalıdır.

trust: 0.75

tek başına yeterli değildir.

Sistem gerektiğinde şunu söyleyebilmelidir:

Neden güveniyor?
- Lumi onu nehirden kurtardı.
- İki kez sözünü tuttu.
- Tehlikede yanında kaldı.

Bu nedenle ilişki vektörleri, önemli hafıza kimliklerine bağlanmalıdır.

29. Hafıza ve Belief Engine

Memory Engine:

“Yaşlı denizci haritayı sakladı.”

Belief Engine:

“Yaşlı denizci güvenilir değil.”

Bu ikisi aynı şey değildir.

Yeni bilgi geldiğinde inanç değişebilir ama olay hafızası kalır.

“Haritayı bizi korumak için sakladı.”

Bu durumda:

olay aynı kalır,
olayın anlamı değişir,
karakter hakkındaki inanç güncellenir.
30. Hafıza ve Story Context Builder

Story Context Builder’a ham hafıza kayıtları gitmemelidir.

Memory Engine seçilen anıları anlatısal yönergelere dönüştürür:

Relevant Past:
- Tilki, Lumi’nin onu nehirden kurtarmasını hâlâ önemli bir güven göstergesi olarak görüyor.
- Kuzey mağarası, Tilki’ye kayıp haritasını hatırlatıyor.
- Yaşlı denizcinin davranışına dair şüphesi henüz çözülmedi.

Davranış yönlendirmesi:

- Tilki tehlike sırasında Lumi’ye yakın davranabilir.
- Harita konusu açıldığında dikkati artar.
- Denizciye karşı kesin suçlayıcı değil, temkinli konuşur.
31. İlk uygulanabilir Memory Engine

İlk sürüm için çekirdek yapı:

type CoreMemory = {
  id: string
  ownerCharacterId: string
  sourceEventId: string

  summary: string
  meaning: string

  participants: string[]
  locationId?: string
  occurredAt: number

  type:
    | "event"
    | "relationship"
    | "goal"
    | "promise"
    | "discovery"
    | "loss"
    | "achievement"

  significance: number
  confidence: number
  accessibility: number
  emotionalCharge: number

  unresolved: boolean
  tags: string[]

  protected: boolean
}

Temel işlemler:

encodeMemory()
scoreSignificance()
retrieveRelevantMemories()
decayMemories()
reviseMemoryMeaning()
consolidateSimilarMemories()
protectCriticalMemory()
archiveLowValueMemory()
32. İlk sürümde yapılmaması gerekenler

Başlangıçta şunları aşırı karmaşıklaştırmamalıyız:

ayrıntılı nörolojik hafıza modeli,
her saniye hafıza çürümesi,
bütün NPC’lerde karmaşık yanlış hatırlama,
çok ağır vektör arama,
her konuşmanın kalıcı kaydı,
sınırsız olay grafiği,
LLM’ye yüzlerce anı gönderme.

İlk sürümün amacı:

Doğru olayları sakla.
Doğru zamanda birkaçını getir.
Geçmişi tutarlı biçimde hikâyeye yansıt.
33. Memory Engine temel ilkeleri
1. Her olay hafıza olmaz.
2. Dünya gerçeği ile NPC hafızası ayrıdır.
3. Aynı olay farklı NPC’lerde farklı anlam taşır.
4. NPC görmediği olayı hatırlayamaz.
5. Duyulan bilgi anı değil, inanç kanıtıdır.
6. Hafıza ayrıntıları zamanla azalabilir.
7. Hafızanın anlamı ayrıntıdan daha uzun yaşayabilir.
8. Önemli oyuncu kararları korunur.
9. Çözülmemiş anılar retrieval sırasında önceliklidir.
10. Bütün hafıza değil, en ilgili 3–5 anı kullanılır.
11. Benzer anılar zamanla özetlenebilir.
12. Hafıza kararları etkiler ama tek başına belirlemez.
13. Geçmiş, hikâyede açıklama yığını olarak değil davranışla gösterilir.