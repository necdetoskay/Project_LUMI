Narrative Engine

Narrative Engine, LUMI’nin simülasyon sonucu ürettiği gerçekleri çocuk için okunabilir, tutarlı ve ilgi çekici bir hikâyeye dönüştüren katmandır.

Temel ilke:

Narrative Engine olayları belirlemez.
Belirlenmiş olayları anlatır.

Yani Narrative Engine:

NPC kararlarını değiştirmez,
dünya durumunu keyfine göre değiştirmez,
oyuncunun seçimini yapmaz,
gizli bilgileri açıklamaz,
simülasyon sonucu oluşmamış olayları gerçek kabul etmez.

Onun görevi şudur:

Sistem gerçeği
↓
Anlatısal sahne
↓
Çocuk için doğal hikâye
1. Narrative Engine’in sistemdeki yeri

Tam akış:

World State
↓
Memory Engine
↓
Belief Engine
↓
Emotion Engine
↓
Relationship Engine
↓
Decision Engine
↓
Story Context Builder
↓
Narrative Engine
↓
Narrative Validator
↓
Story Output

Narrative Engine zincirin sonunda bulunur.

Çünkü hikâyeyi yazmadan önce sistem şunları zaten belirlemiş olmalıdır:

kim nerede,
kim ne biliyor,
kim ne hissediyor,
kim kime güveniyor,
hangi karakter hangi kararı verdi,
hangi olay gerçekleşebilir,
hangi bilgi gizli kalmalıdır,
hikâye hangi noktada durmalıdır.
2. Narrative Engine’in yetki sınırı

Narrative Engine’in serbest olduğu ve olmadığı alanları kesin ayırmalıyız.

Serbest olduğu alanlar

Narrative Engine şunları yaratabilir:

betimleme biçimi,
cümle yapısı,
diyalog ifadeleri,
küçük jestler,
atmosferik ayrıntılar,
ses ve çevre tasvirleri,
sahne geçişleri,
benzetmeler,
ritim,
anlatıcı tonu,
aynı kararı farklı anlatma yolları.
Serbest olmadığı alanlar

Narrative Engine şunları belirleyemez:

karakterin temel eylemi,
kritik olay sonucu,
ilişki puanı değişimi,
yeni dünya gerçeği,
görev başarısı veya başarısızlığı,
önemli nesnenin bulunup bulunmadığı,
gizli gerçeğin açığa çıkması,
oyuncunun yapacağı seçim,
NPC’nin bilmediği bilgi,
kalıcı karakter gelişimi.

Örnek:

Decision Engine çıktısı:

Tilki mağaraya girmemeye,
önce çevrede iz aramaya karar verdi.

Narrative Engine şunları yazabilir:

Tilki mağaranın karanlık girişine baktı. Sonra burnunu toprağa yaklaştırdı.
“Önce burada neler geçtiğine bakalım,” dedi.

Ama şunu yazamaz:

Tilki birden cesaretini topladı ve mağaranın içine koştu.

Çünkü bu sistem kararını değiştirir.

3. Narrative Contract

Story Context Builder ile Narrative Engine arasında açık bir sözleşme olmalıdır.

type NarrativeContract = {
  worldFacts: string[]
  fixedCharacterActions: string[]
  allowedNarrativeFreedom: string[]
  forbiddenChanges: string[]
  hiddenFacts: string[]
  requiredSceneBeats: string[]
  reservedPlayerDecision?: string
  stoppingCondition: string
}

Bu sözleşme üretim sırasında ihlal edilemez.

Örnek:

Kesin gerçek:
- Gizli kapı kilitli.

Karakter kararı:
- Tilki önce çevreyi araştıracak.

Serbest alan:
- Tilkinin arama biçimi.
- Lumi ile kuracağı kısa diyalog.
- Çevre betimlemeleri.

Yasak:
- Kapının açılması.
- Mağaraya girilmesi.
- Anahtarın bulunması.

Durma noktası:
- Çocuğa üç seçenek sunulduktan sonra hikâye bitecek.
4. Narrative Engine modları

Tek bir hikâye üretim modu yeterli değildir.

type NarrativeMode =
  | "opening"
  | "continuation"
  | "scene"
  | "transition"
  | "choice"
  | "resolution"
  | "reflection"
  | "offline_summary"
  | "character_moment"
  | "world_update"
Opening

Yeni maceranın başlangıcı.

Görevi:

ortamı kurmak,
karakterleri tanıtmak,
ilk hedefi göstermek,
merak uyandırmak.
Continuation

Önceki hikâyenin kaldığı yerden devam eder.

Görevi:

kısa hatırlatma yapmak,
mevcut sahneye hızlı dönmek,
tekrar bilgi yığını oluşturmamak.
Scene

Normal aktif hikâye sahnesi.

Transition

Bir yerden başka yere geçiş veya zaman atlaması.

Choice

Çocuk karar vermeden hemen önceki sahne.

Resolution

Bir olayın sonucunu anlatır.

Reflection

Hikâye sonrası düşünme, soru-cevap veya karakterin yaşananları değerlendirmesi.

Offline Summary

“Sen yokken” özeti.

Character Moment

Ana olaydan bağımsız küçük ilişki veya karakter gelişimi sahnesi.

World Update

Dünyadaki küçük değişiklikleri anlatan kısa bölüm.

5. Sahne tabanlı üretim

Uzun hikâyeyi tek LLM çağrısında üretmek risklidir.

Çünkü uzun üretimde model:

bağlamı unutabilir,
karakterleri karıştırabilir,
gizli bilgileri açabilir,
oyuncu seçimini kendisi çözebilir,
hikâyeyi plansız uzatabilir.

Bu nedenle LUMI sahne tabanlı üretim kullanmalıdır.

Story
├── Scene 1
├── Scene 2
├── Choice Scene
├── Scene 3
└── Resolution

Her sahne ayrı doğrulanabilir.

6. Sahne veri modeli
type NarrativeScenePlan = {
  sceneId: string
  storyId: string

  mode: NarrativeMode
  locationId: string
  activeCharacterIds: string[]

  openingState: string[]
  requiredBeats: NarrativeBeat[]
  fixedActions: string[]
  optionalDetails: string[]

  tensionStart: number
  tensionEnd: number

  maximumLength: number
  stoppingCondition: string
}
7. Narrative Beat

Bir sahne tamamen serbest bırakılmamalıdır.

Temel anlatı vuruşları önceden belirlenmelidir.

type NarrativeBeat = {
  id: string

  purpose:
    | "setup"
    | "discovery"
    | "reaction"
    | "dialogue"
    | "action"
    | "tension"
    | "choice"
    | "resolution"
    | "reflection"

  requiredOutcome: string
  participatingCharacters: string[]
  order: number

  mandatory: boolean
}

Örnek:

Beat 1 — Setup
Lumi ve Tilki değirmen çevresine gelir.

Beat 2 — Discovery
Tilki taş üzerindeki yeni işareti fark eder.

Beat 3 — Reaction
Tilki işaretin haritayla ilgili olabileceğini düşünür.

Beat 4 — Dialogue
Lumi ve Tilki ne yapacaklarını konuşur.

Beat 5 — Choice
Çocuğa üç seçenek sunulur.

Narrative Engine bu vuruşların arasındaki anlatımı özgürce oluşturabilir.

8. Beat ve olay farkı

Beat, yeni bir dünya olayı değildir.

Beat yalnızca belirlenmiş olayın anlatısal sunumudur.

Örneğin sistem olayı:

Tilki değirmenin yanında bir sembol buldu.

Narrative Beat:

Sembolün doğal biçimde fark edilmesi.

Narrative Engine:

Tilki birden durdu. Islak taşların arasındaki ince çizgiler, daha önce gördüğü harita işaretlerine benziyordu.

Burada yeni gerçek yaratılmamıştır.

9. Hikâye uzunluğu kontrolü

Çocuğun yaşına göre uzunluk belirlenmelidir.

type StoryLengthProfile = {
  ageRange: string

  targetSceneWords: number
  targetStoryWords: number

  maximumParagraphLength: number
  maximumSentenceLength: number
  dialogueRatio: number
}

Örnek başlangıç değerleri:

4–5 yaş:
Sahne: 120–250 kelime
Tam hikâye: 400–700 kelime

6–7 yaş:
Sahne: 200–350 kelime
Tam hikâye: 700–1.200 kelime

8–10 yaş:
Sahne: 300–600 kelime
Tam hikâye: 1.200–2.500 kelime

Bunlar kesin sınırlar değil, hedef aralıklardır.

10. Cümle karmaşıklığı

Yaşa göre yalnızca kelime sayısı değil, cümle yapısı da değişmelidir.

Küçük yaş
Kısa cümleler.
Tek olaylı yapılar.
Somut betimlemeler.
Az sayıda karakter.

Örnek:

Yağmur yavaşça yağıyordu.
Tilki taşın yanında durdu.
“Burada bir işaret var,” dedi.

Büyük yaş
Daha uzun cümleler.
Neden-sonuç ilişkileri.
Daha karmaşık karakter düşünceleri.
Daha fazla alt metin.

Örnek:

Tilki, yağmurun yarısını sildiği sembole dikkatle baktı; çizgilerin rastgele olmadığından neredeyse emindi.

11. Anlatı perspektifi

Narrative Engine her hikâyede perspektifi korumalıdır.

Önerilen ana seçenekler:

Third-person limited
Second-person interactive
Üçüncü şahıs sınırlı
Lumi kapıya yaklaştı.
İçeriden gelen sesi duyunca durdu.

Avantajı:

karakter odaklıdır,
gizem korunur,
doğal masal tonu verir.
İkinci şahıs
Kapıya yaklaştığında içeriden ince bir ses duydun.

Avantajı:

çocuk hikâyenin içine daha doğrudan girer,
seçimli hikâyelerde etkileşimi artırır.

Ancak perspektif hikâye ortasında değiştirilmemelidir.

12. Anlatıcı bilgi sınırı

Anlatıcı her şeyi biliyor olsa bile yalnızca izin verilen bilgileri söylemelidir.

Narrator Knowledge
≠
Narrator Revelation

Örnek gizli gerçek:

Mağaradaki ejderha yaralıdır.

Çocuk bunu bilmiyor.

Yanlış anlatım:

Mağaranın içinde yaralı ve korkmuş bir ejderha onları bekliyordu.

Doğru anlatım:

Mağaranın derinliklerinden yavaş, ağır bir nefes sesi geldi.

Narrative Engine ipucu verebilir ama gerçeği açıklayamaz.

13. Göster, açıklama

Sistem durumu mümkün olduğunca davranışla gösterilmelidir.

Emotion Engine:

Tilki hafif korkuyor.

Zayıf anlatım:

Tilki korkmuştu.

Daha güçlü anlatım:

Tilki kulaklarını dikti. Bir adım ilerledi, sonra durup karanlık girişe yeniden baktı.

İlişki durumu:

Tilki Lumi’ye güveniyor.

Zayıf anlatım:

Tilki Lumi’ye çok güveniyordu.

Daha güçlü anlatım:

Tilki, kaygan taşa basmadan önce Lumi’nin uzattığı eli hiç tereddüt etmeden tuttu.

14. Ancak her şeyi örtük anlatmamalıyız

Küçük çocuklar için tamamen dolaylı anlatım bazen anlaşılmaz olabilir.

Bu nedenle denge gerekir.

Davranış
+
gerektiğinde kısa açıklama

Örnek:

Tilki Lumi’nin yanına sokuldu. Karanlık tünel onu biraz ürkütmüştü.

Bu yapı hem gösterir hem anlaşılır kılar.

15. Karakter sesi

Her karakterin konuşma biçimi tutarlı olmalıdır.

type CharacterVoiceProfile = {
  characterId: string

  vocabularyLevel: string
  sentencePattern: string
  directness: number
  politeness: number
  humorStyle?: string

  preferredExpressions: string[]
  avoidedExpressions: string[]
  emotionalSpeechChanges: Record<string, string>
}

Örnek:

Tilki:
- Kısa konuşur.
- Endişelendiğinde soru sorar.
- Fazla büyük sözler söylemez.
- Şaka yaparken hafif iğneleyicidir.

Diyalog:

“Bu kapının gerçekten açılmasını istiyor muyuz?” dedi Tilki.

Karaktere uymayan diyalog:

“Kanaatimce mevcut riskleri analitik olarak değerlendirmemiz gerekiyor.”

16. Karakter sesi gelişebilir

Karakter sesi tamamen sabit olmamalıdır.

İlişki ve gelişim, konuşma biçimini küçük ölçüde etkileyebilir.

Örnek:

Başlangıçta Tilki:

“Belki… ben burada beklesem?”

Daha sonra cesareti geliştiğinde:

“Korkuyorum ama seninle gelebilirim.”

Ancak bir hikâyede aniden şuna dönüşmemelidir:

“Hiçbir şeyden korkmuyorum!”

17. Diyalog üretim kuralları

Diyalogların her zaman bilgi aktarması gerekmez.

Diyalog şu işlevlerden birini taşımalıdır:

karakter göstermek,
ilişki göstermek,
hedef açıklamak,
çatışma oluşturmak,
bilgi paylaşmak,
duygu göstermek,
seçim hazırlamak.

Gereksiz diyaloglardan kaçınılmalıdır.

Zayıf:

“Yağmur yağıyor,” dedi Tilki.
“Evet, yağmur yağıyor,” dedi Lumi.

Daha işlevsel:

“Yağmur bu izleri silmeden karar vermeliyiz,” dedi Tilki.

18. Diyalogda bilgi sınırı

Karakter yalnızca bildiği şeyleri söyleyebilir.

Tilki ejderhanın dost olduğunu bilmiyorsa:

“Merak etme, içerideki ejderha bize zarar vermez.”

diyemez.

Ama şunu diyebilir:

“Belki düşündüğümüz kadar tehlikeli değildir.”

Bu, bir tahmin veya umut olarak sunulabilir.

19. İç düşünceler

İç düşünceler yalnızca perspektif izin veriyorsa kullanılmalıdır.

Üçüncü şahıs sınırlı, odak Lumi ise:

Lumi’nin düşünceleri anlatılabilir,
Tilki’nin gizli düşünceleri doğrudan anlatılamaz.

Yanlış:

Tilki, Lumi’ye güvenmediğini düşündü.

Eğer odak Lumi ise doğru biçim:

Tilki cevap vermeden önce gözlerini kaçırdı. Lumi, onun hâlâ ikna olmadığını düşündü.

20. Duygusal yoğunluk

Narrative Engine duyguyu yaşa uygun seviyede anlatmalıdır.

type EmotionalNarrativeLimits = {
  maximumFearIntensity: number
  maximumSadnessDuration: number
  recoverySignalRequired: boolean
  safeCharacterPresenceRequired: boolean
}

Özellikle küçük çocuklarda:

gerilim uzun sürmemeli,
çaresizlik baskın kalmamalı,
güvenli bir çıkış ihtimali görünmeli,
korku ayrıntılı fiziksel dehşete dönüşmemeli.
21. Tehlike anlatımı

Tehlike hikâyeden tamamen çıkarılmamalıdır.

Çünkü:

merak,
cesaret,
problem çözme,
dayanışma

için kontrollü gerilim gerekir.

Ancak çocuk hikâyesinde tehlike:

Anlaşılır
Sınırlı
Çözülebilir
Geri döndürülebilir

olmalıdır.

Örnek:

Tahta köprü gıcırdadı ve Tilki hemen geri çekildi.

Aşırı anlatım:

Köprü korkunç bir gürültüyle parçalandı ve herkes uçurumun karanlığına doğru savruldu.

Bu ancak daha büyük yaş profili ve güvenli sonuç bağlamında düşünülmelidir.

22. Şiddet sınırı

LUMI’nin ana deneyimi çatışma olabilir fakat şiddet merkezli olmamalıdır.

Tercih sırası:

Kaçınma
İletişim
Problem çözme
Yardımlaşma
Korunma
Savunma
Fiziksel çatışma

Narrative Engine sistemin belirlemediği saldırıları eklememelidir.

Özellikle:

ayrıntılı yaralanma,
kan,
işkence,
kalıcı zarar

çocuk profiline göre engellenmelidir.

23. Yanlış seçimi cezalandırmama

Oyuncunun seçimi hikâyeyi değiştirmelidir ama cezalandırıcı olmamalıdır.

Örneğin çocuk yanlış yolu seçtiğinde:

Yanlış yaklaşım:

Yanlış yolu seçtin.
Haritayı sonsuza kadar kaybettin.

Daha uygun yaklaşım:

Seçilen yol daha uzun çıktı.
Karakterler yeni bir ipucu buldu.
Ana hedefe başka bir yoldan devam edilebilir.

Seçimler:

farklı deneyimler üretmeli,
anlamlı sonuçlar doğurmalı,
fakat çocuğu uygulamaya dönmediğine veya yanlış düşündüğüne pişman etmemelidir.
24. Seçim sahnesi

Seçim sahnesi şu yapıyı izleyebilir:

Durum
↓
Karakter tepkileri
↓
Seçeneklerin doğal biçimde görünmesi
↓
Seçim sorusu
↓
Hikâye durur

Örnek:

Tilki taş üzerindeki işareti gösterdi.
Baykuşun bıraktığı not hâlâ Lumi’nin cebindeydi. Uzakta ise yaşlı denizcinin feneri görünüyordu.

Şimdi ne yapmalılar?

Taş işaretlerini incelemek
Baykuşun notunu açmak
Yaşlı denizciyle konuşmak
25. Seçeneklerin kalite kuralları

Seçenekler:

birbirinden gerçekten farklı olmalı,
aynı cevabın farklı cümleleri olmamalı,
çocuk tarafından anlaşılmalı,
sistem açısından uygulanabilir olmalı,
gizli doğru cevabı belli etmemeli,
yaşa göre en fazla 2–4 seçenek içermeli.

Kötü seçenekler:

1. Mağaraya git
2. Mağaraya doğru ilerle
3. Mağaranın içine bak

İyi seçenekler:

1. Mağara girişini araştır
2. Denizciye soru sor
3. Baykuşun notunu aç
26. Sahte seçimden kaçınma

Çocuk hangi seçeneği seçerse seçsin aynı olay oluyorsa bu sahte seçimdir.

Örnek:

Seçenek A → yine mağaraya git
Seçenek B → yine mağaraya git
Seçenek C → yine mağaraya git

Bunun yerine seçenekler en az şu alanlardan birini değiştirmelidir:

kullanılan yöntem,
görülen bilgi,
katılan karakter,
ilişki etkisi,
alınan risk,
gidilen mekân,
hikâye sırası.

Ana hikâyenin zamanla birleşmesi sorun değildir; yolun farklı hissedilmesi gerekir.

27. Oyuncu seçimini anlatıya uygulama

Oyuncu karar verdiğinde süreç:

Player Choice
↓
Choice Validator
↓
World State Update
↓
NPC Reactions
↓
Decision Engine
↓
Story Context Builder
↓
Narrative Engine

Narrative Engine seçimin sonucunu kendi başına belirlememelidir.

Örneğin çocuk:

Baykuşun notunu aç.

dediğinde önce sistem:

notun varlığını,
içeriğini,
kimlerin orada olduğunu,
notun görev etkisini

hesaplar.

Daha sonra Narrative Engine bunu anlatır.

28. Oyuncunun serbest metin seçimi

Çocuk hazır seçeneklerden farklı bir şey söyleyebilir.

Örnek:

Tilki taşa bakarken Lumi denizciyi çağırsın.

Bunun için Narrative Engine doğrudan cevap üretmemelidir.

Önce bir Player Intent Interpreter gerekir.

Serbest metin
↓
Niyet çıkarımı
↓
Dünya uygunluğu kontrolü
↓
Uygulanabilir eyleme dönüştürme
↓
Sistem simülasyonu
↓
Anlatı

Örnek niyet:

{
  actor: "Lumi",
  action: "call",
  target: "old_sailor",
  while: "Fox examines the stone"
}
29. Uygulanamaz oyuncu eylemi

Çocuk:

Lumi uçup dağın tepesine gitsin.

derse ama Lumi uçamıyorsa sistem bunu doğrudan gerçekleştirmemelidir.

Narrative Engine doğal şekilde sınır koyabilir:

Lumi gökyüzüne baktı. Uçabilseydi tepeye hemen ulaşabilirdi.
“Belki Baykuş bize yukarıdan bakabilir,” dedi.

Böylece:

çocuk sert biçimde reddedilmez,
dünya kuralları bozulmaz,
alternatif sunulur.
30. Çocuk yaratıcılığına alan bırakma

Her uygunsuz fikir reddedilmemelidir.

Sistem şu ayrımı yapmalıdır:

Dünya kurallarına aykırı
vs.
Daha önce tanımlanmamış ama mümkün

Çocuk:

Tilki yapraklardan küçük bir şemsiye yapsın.

derse, dünyada yeterli yaprak ve zaman varsa bu yaratıcı eylem kabul edilebilir.

Yeni eylem:

kritik gerçek yaratmıyorsa,
dünya kurallarına uyuyorsa,
oyuncunun imkanları dahilindeyse

sisteme eklenebilir.

31. Anlatısal ayrıntı üretimi

Narrative Engine küçük ayrıntılar üretebilir.

Örnek:

su damlalarının sesi,
çamurdaki ayak izleri,
fenerin sallanması,
Tilki’nin kuyruğunu silkmesi.

Ancak bu ayrıntılar daha sonra gerçek sistem verisi gibi kullanılmamalıdır.

Bu nedenle ayrıntılar iki sınıfa ayrılmalıdır:

Ephemeral Narrative Detail
Persistent Narrative Fact
32. Geçici anlatı ayrıntısı
type EphemeralNarrativeDetail = {
  text: string
  sceneId: string
  persistence: "scene_only"
}

Örnek:

Uzakta bir kurbağa ses çıkardı.

Bu ayrıntının veritabanına kalıcı dünya gerçeği olarak yazılması gerekmez.

33. Kalıcı anlatı gerçeği

Bazı üretilen ayrıntılar sonraki hikâyelerde önemli olabilir.

Örnek:

Lumi mavi taşı Tilki’ye verdi.

Bu bir:

envanter değişimi,
ilişki olayı,
hafıza kaydı

oluşturur.

Ancak Narrative Engine böyle bir gerçeği kendi başına ekleyemez.

Önce sistem olayı olarak onaylanmalıdır.

Proposed Narrative Fact
↓
Validator
↓
World State Commit
34. Narrative Proposal sistemi

Narrative Engine bazen hikâyeyi zenginleştirmek için küçük kalıcı öneriler sunabilir.

type NarrativeProposal = {
  type:
    | "minor_object"
    | "ambient_character"
    | "visual_detail"
    | "minor_location_feature"

  description: string
  persistenceRequested: boolean
  risk: number
}

Örnek:

Değirmen duvarında küçük bir kuş yuvası bulunması.

Sistem bunu:

kabul edebilir,
sadece sahnelik bırakabilir,
reddedebilir.

Ana hikâye gerçekleri için bu mekanizma kullanılmamalıdır.

35. Hikâyede tutarlılık

Narrative Engine üretim sırasında şu tutarlılıkları korumalıdır:

karakter isimleri,
fiziksel özellikler,
mekân yapısı,
nesne sahipliği,
sahnedeki konumlar,
yaralanmalar,
konuşma sırası,
zaman,
hava,
hedefler,
bilinen ve bilinmeyen bilgiler.

Örnek hata:

Başlangıç:
Tilki’nin haritası yok.

Sahne ortası:
Tilki haritasını cebinden çıkardı.

Bu hata validator tarafından yakalanmalıdır.

36. Sahne içi durum takibi

Her paragraf sonrası bütün sistemi yeniden çalıştırmak gerekmez.

Fakat sahne içi basit durum tutulmalıdır.

type SceneRuntimeState = {
  characterLocations: Record<string, string>
  heldObjects: Record<string, string[]>
  visibleObjects: string[]
  openQuestions: string[]
  completedBeats: string[]
  currentTension: number
}

Bu yapı özellikle uzun sahnelerde tutarlılığı artırır.

37. Story Output ile State Delta ayrımı

Narrative Engine iki çıktı üretebilir:

type NarrativeEngineOutput = {
  storyText: string
  proposedStateDelta: ProposedStateDelta
  usedContextItems: string[]
  unresolvedThreads: string[]
}

storyText çocuk için hikâyedir.

proposedStateDelta sistemin doğrulaması gereken değişikliklerdir.

type ProposedStateDelta = {
  objectChanges: unknown[]
  locationChanges: unknown[]
  relationshipEvents: unknown[]
  memoryCandidates: unknown[]
  beliefEvidenceCandidates: unknown[]
}

Fakat ideal yapıda temel state değişimleri Narrative Engine’den önce belirlenmiş olur.

Bu alan daha çok:

küçük ayrıntılar,
diyalogda ortaya çıkan bilgi aktarımı,
anlatısal mikro sonuçlar

içindir.

38. İki aşamalı anlatı üretimi

Narrative Engine’i iki aşamalı çalıştırabiliriz.

Aşama 1 — Structured Narrative Draft

LLM önce yapısal çıktı üretir:

{
  "beats": [
    {
      "beatId": "beat-1",
      "summary": "Lumi and Fox approach the mill."
    },
    {
      "beatId": "beat-2",
      "summary": "Fox notices the symbol."
    }
  ],
  "dialogueIntent": [
    {
      "speaker": "fox",
      "intent": "express caution"
    }
  ],
  "ending": "player_choice"
}
Aşama 2 — Prose Rendering

Yapı doğrulandıktan sonra doğal hikâyeye çevrilir.

Avantajı:

olay hataları erken yakalanır,
beat atlama azalır,
oyuncu seçiminin çözülmesi engellenir,
metin kalitesi ayrı optimize edilir.
39. Tek aşamalı üretim

MVP’de maliyeti azaltmak için tek aşamalı üretim yapılabilir.

Ancak LLM’den yine yapılandırılmış çıktı istenebilir:

{
  "story": "...",
  "usedBeats": ["beat-1", "beat-2"],
  "revealedFacts": [],
  "proposedPersistentFacts": []
}

Bu çıktı validator tarafından incelenir.

40. Model seçimi

Her Narrative Engine işlemi için en güçlü model gerekli olmayabilir.

Örnek katmanlama:

Ana hikâye sahnesi:
yüksek kaliteli model

Kısa geçiş:
ekonomik model

“Sen yokken” özeti:
ekonomik model

Dil sadeleştirme:
küçük model

Doğrulama:
kurallı sistem + küçük model

Böylece maliyet kontrol edilir.

41. Prompt yapısı

Narrative Engine prompt’u katmanlı olmalıdır.

SYSTEM ROLE
NARRATIVE CONTRACT
WORLD FACTS
PLAYER KNOWLEDGE
CHARACTER CONTEXT
FIXED ACTIONS
SCENE BEATS
STYLE PROFILE
AGE RULES
FORBIDDEN CONTENT
OUTPUT FORMAT

En kritik talimatlar başta ve sonda tekrarlanabilir.

Ancak prompt gereksiz tekrarlarla şişirilmemelidir.

42. Örnek Narrative Engine talimatı
You are the Narrative Engine for LUMI.

You do not decide events.
You narrate only the supplied world state, decisions, and scene beats.

Never:
- change a fixed character decision,
- reveal hidden facts,
- resolve the reserved player choice,
- create irreversible world changes,
- give characters knowledge they do not possess.

Write for a five-year-old child.
Use short, clear sentences.
Keep tension mild and temporary.
Show emotions through simple actions.
End immediately after presenting the three provided choices.

Asıl üretim dili Türkçe olabilir; model talimatları teknik tercihe göre Türkçe veya İngilizce yazılabilir.

43. Hikâye stil profili

Her hikâyede aynı genel kalite korunmalı ancak tekdüze olmamalıdır.

type NarrativeStyleProfile = {
  tone:
    | "warm"
    | "adventurous"
    | "mysterious"
    | "playful"
    | "calm"
    | "emotional"

  descriptionDensity: number
  dialogueDensity: number
  humorDensity: number
  tensionLevel: number
  repetitionLevel: number
  sensoryDetailLevel: number
}

Örnek:

Ton:
Sıcak ve merak uyandırıcı

Betimleme:
Hafif

Diyalog:
Orta

Gerilim:
Düşük-orta

Mizah:
Hafif
44. Ton ile olayın ayrılması

Ton olay sonucunu değiştirmemelidir.

Aynı olay:

Tilki kilitli bir kapı bulur.

Gizemli ton:

Kapının üzerinde ay ışığında parlayan ince çizgiler vardı.

Eğlenceli ton:

Kapı o kadar eskiydi ki açılmadan önce uzun bir esneme yapacakmış gibi görünüyordu.

Olay aynıdır; anlatım değişir.

45. Hikâye tekrarı önleme

Narrative Engine daha önce kullandığı kalıpları bilmelidir.

Örnek sık tekrarlar:

“Birden bir ses duyuldu.”
“Tilki kulaklarını dikti.”
“Lumi derin bir nefes aldı.”
“Tam o sırada…”

Bu ifadeler yasaklanmak zorunda değildir, fakat tekrar puanı takip edilmelidir.

type NarrativePatternUsage = {
  pattern: string
  usageCount: number
  lastUsedStoryId: string
  cooldownStories: number
}
46. Olay kalıbı tekrarları

Sadece cümleler değil, hikâye yapıları da tekrar edebilir.

Örnek:

Her hikâyede:
ses duyulur
→ gizli kapı bulunur
→ üç yol çıkar

Bu nedenle Narrative Engine veya Story Planner şu kalıpların kullanım geçmişini tutmalıdır:

kayıp eşya,
gizli kapı,
yanlış anlaşılan karakter,
fırtına,
yardım çağrısı,
yarış,
bulmaca,
dostluk tartışması.

Ama bu, ileride Story Planning katmanında daha ayrıntılı ele alınmalıdır.

47. Motif kullanımı

Daha önce belirlenen motifler doğal biçimde kullanılabilir.

Örnek:

Mavi bileklik
→ verilen söz

Eski pusula
→ kayıp yol

Fener
→ güvenli dönüş

Narrative Engine motifin anlamını her seferinde açıklamamalıdır.

Zayıf:

Lumi mavi bilekliğe baktı. Bu bileklik verdiği sözü temsil ediyordu.

Doğal:

Lumi, bileğindeki mavi ipi düzeltti. “Seni burada bırakmayacağım,” dedi.

48. Ses efektleri ve ambiyans etiketleri

LUMI’de sesli okuma veya ses tasarımı kullanılacaksa anlatı içinde yapılandırılmış işaretler üretilebilir.

type AudioCue = {
  type:
    | "ambience"
    | "sound_effect"
    | "music"
    | "voice_direction"

  cue: string
  startAfterSentence?: number
  durationHint?: number
}

Örnek:

[AMBIENCE: Hafif yağmur]
[SFX: Ahşap gıcırtısı]
[VOICE_TILKI: Sessiz ve temkinli]

Ancak bunlar çocuk tarafından okunan metne doğrudan karışmamalıdır.

Story output ve production metadata ayrı tutulmalıdır.

49. Görsel sahne işaretleri

Sayfa görselleri üretilecekse Narrative Engine görsel sahne tanımları da oluşturabilir.

type IllustrationCue = {
  sceneId: string
  moment: string
  visibleCharacters: string[]
  locationId: string
  requiredObjects: string[]
  mood: string
  forbiddenElements: string[]
}

Örnek:

An:
Tilki taş üzerindeki sembolü gösteriyor.

Karakterler:
Lumi ve Tilki.

Mekân:
Eski değirmenin yağmurlu bahçesi.

Zorunlu nesneler:
Taş sembol, mavi bileklik, eski değirmen kapısı.

Gösterilmemeli:
Ejderha, Mira, açık gizli kapı.

Bu, görsel tutarlılık için önemlidir.

50. Hikâye sayfalarına bölme

Uzun hikâye görselli sunulacaksa sayfa veya ekran bloklarına ayrılmalıdır.

type StoryPage = {
  pageNumber: number
  text: string
  illustrationCue?: IllustrationCue
  audioCues?: AudioCue[]
}

Sayfa bölümü şu kriterlere göre yapılabilir:

sahne değişimi,
önemli keşif,
duygusal an,
seçim,
görsel kompozisyon.

Cümlenin ortasında veya doğal olmayan yerde bölünmemelidir.

51. Hikâye sonunda soru-cevap

Hikâye sonunda isteğe bağlı düşünme soruları üretilebilir.

Bunlar yalnızca okuduğunu anlama sorusu olmamalıdır.

Kategoriler:

Hatırlama
Duygu
Neden-sonuç
Empati
Yaratıcılık
Kişisel bağlantı

Örnek:

Hatırlama:
Tilki taşın üzerinde ne buldu?

Duygu:
Sence Tilki mağaraya bakınca ne hissetti?

Empati:
Tilki’ye yardım etmek için sen ne söylerdin?

Yaratıcılık:
Baykuşun notunda başka ne yazabilirdi?
52. Soruların hikâyeyi sınava çevirmemesi

Her hikâyede çok sayıda soru sunmak yorucu olabilir.

Öneri:

Kısa hikâye:
1–2 soru

Orta hikâye:
2–3 soru

Uzun hikâye:
3–4 soru

Sorular isteğe bağlı olabilir.

Ebeveyn ayarında:

Hikâye sonu soruları:
Kapalı
Kısa
Standart
53. Hikâye sonu özetleme

Hikâye bittiğinde sistem için nesnel bir özet çıkarılmalıdır.

Bu, çocuğa gösterilen özetten farklıdır.

type StoryCanonicalSummary = {
  confirmedEvents: string[]
  playerChoices: string[]
  characterDecisions: string[]
  worldStateChanges: string[]
  relationshipEvents: string[]
  beliefEvidence: string[]
  memoryCandidates: string[]
  unresolvedThreads: string[]
}

Bu özet Memory ve diğer motorlara gönderilir.

54. Kanonik olay çıkarımı

Narrative Engine metninden olay çıkarmak risklidir.

Çünkü doğal dil belirsiz olabilir.

Bu nedenle kanonik olaylar mümkün olduğunca üretimden önce bilinmelidir.

System Events
→ Narrative Text

Metinden geriye doğru:

Narrative Text
→ Guess System Events

yaklaşımı ana yöntem olmamalıdır.

Yalnızca küçük anlatısal eklemeler için kullanılabilir.

55. Narrative Validator

Narrative Engine’den sonra mutlaka bir doğrulama katmanı olmalıdır.

type NarrativeValidationResult = {
  valid: boolean
  violations: NarrativeViolation[]
  correctedText?: string
}
type NarrativeViolation = {
  type:
    | "world_fact_conflict"
    | "knowledge_leak"
    | "decision_override"
    | "player_choice_resolved"
    | "character_voice_break"
    | "age_inappropriate"
    | "continuity_error"
    | "missing_required_beat"
    | "forbidden_event"
    | "length_violation"

  severity: "low" | "medium" | "high" | "critical"
  explanation: string
  textSpan?: string
}
56. Validator kontrol listesi
- Bütün zorunlu beat’ler kullanıldı mı?
- Sabit NPC kararları korundu mu?
- Gizli bilgi açığa çıktı mı?
- Karakter bilmediği bilgiyle konuştu mu?
- Dünya gerçeği değiştirildi mi?
- Oyuncu seçimi otomatik çözüldü mü?
- Olmayan nesne kullanıldı mı?
- Karakter sahne içinde ışınlandı mı?
- Yaşa uygun olmayan içerik var mı?
- Hikâye belirtilen durma noktasında bitti mi?
- Seçenekler doğru biçimde sunuldu mu?
- Metin uzunluk sınırına uyuyor mu?
57. Kural tabanlı doğrulama

Her doğrulama için LLM kullanmak gerekmez.

Kurallı sistem şunları kontrol edebilir:

karakter isimleri,
yasak kelimeler,
gizli gerçek ifadeleri,
seçim seçeneklerinin bulunması,
metin uzunluğu,
sahne karakterlerinin dışındaki isimler,
zorunlu nesneler,
yasak eylemler.

Bu daha ucuz ve güvenilirdir.

58. Model tabanlı doğrulama

Bazı kontroller semantiktir:

karakter gerçekten kararını değiştirdi mi?
gizli bilgi dolaylı olarak fazla açıklandı mı?
ton yaşa uygun mu?
ilişki davranışı tutarlı mı?
hikâye geçmişi doğal mı kullandı?

Bunlar küçük veya ekonomik bir LLM ile değerlendirilebilir.

59. Otomatik düzeltme

Küçük hatalar otomatik düzeltilebilir.

Örnek:

Hata:
Hikâye 50 kelime fazla.

Çözüm:
Betimlemeyi kısalt.
Hata:
Tilki’nin cümlesi karakter sesine uymuyor.

Çözüm:
Diyaloğu daha kısa ve temkinli yap.

Ancak kritik hata varsa:

Gizli gerçek açığa çıktı.
Oyuncu seçimi çözüldü.
Dünya gerçeği değiştirildi.

bütün sahne yeniden üretilmelidir.

60. Yeniden üretim sınırı

Sonsuz üretim döngüsü olmamalıdır.

type NarrativeRetryPolicy = {
  maxRetries: number
  retryOnSeverity: string[]
  fallbackTemplateEnabled: boolean
}

Örnek:

Maksimum tekrar:
2

İki denemede de başarısızsa:
kurallı güvenli anlatı şablonu kullan

Bu üretim güvenilirliğini artırır.

61. Güvenli fallback anlatı

LLM başarısız olduğunda sistem tamamen durmamalıdır.

Örnek şablon:

Lumi ve Tilki [MEKÂN] çevresine geldi.

Tilki [BULGU] fark etti.

“[KARAKTERE UYGUN KISA DİYALOG],” dedi.

Şimdi ne yapmalılar?

1. [SEÇENEK 1]
2. [SEÇENEK 2]
3. [SEÇENEK 3]

Kalitesi daha düşük olabilir ama sistem kurallarını bozmaz.

62. Akışlı üretim

Hikâye kullanıcıya token token gösterilebilir.

Ancak doğrulama açısından risklidir.

Çünkü metnin başı gösterildikten sonra sonradan kritik hata bulunabilir.

Daha güvenli yaklaşım:

Generate full scene
↓
Validate
↓
Show to user

Algılanan beklemeyi azaltmak için:

kısa animasyon,
dünya yükleniyor gösterimi,
karakterin hazırlık hareketi

kullanılabilir.

Ama metin doğrulanmadan gösterilmemelidir.

63. Hikâye önizleme ve maliyet

Görsel veya ses üretimi varsa önce metin doğrulanmalıdır.

Akış:

Narrative Text
↓
Validation
↓
User/Parent Preview
↓
Illustration Generation
↓
Optional TTS

Böylece hatalı hikâye için görsel ve ses maliyeti oluşmaz.

64. Çok dilli anlatı

LUMI ileride çok dilli çalışırsa dünya state’i dil bağımsız tutulmalıdır.

Yanlış:

summary: "Tilki köprüden korkuyor."

Daha sağlam yapı:

{
  concept: "fear_of_bridge",
  subjectId: "fox",
  objectId: "old_bridge",
  intensity: 0.6
}

Narrative Engine hedef dilde üretir.

Hikâye metinleri çevrilebilir ama kanonik dünya gerçekleri dile bağlı olmamalıdır.

65. Çeviri mi yeniden anlatım mı?

Çocuk hikâyelerinde düz çeviri her zaman ideal değildir.

Çünkü:

cümle uzunluğu,
ritim,
kültürel ifade,
yaşa uygun kelime

dillere göre değişebilir.

Bu nedenle:

Canonical Story Plan
→ Language-specific narration

yaklaşımı daha güçlüdür.

Aynı plan Türkçe ve İngilizce olarak ayrı anlatılabilir.

66. Ebeveyn kontrolü

Ebeveyn ayarları Narrative Engine’i etkileyebilir.

type ParentNarrativeSettings = {
  preferredTone: string
  maximumTension: number
  humorLevel: number
  storyLength: string

  allowMagic: boolean
  allowMildConflict: boolean
  allowSadThemes: boolean

  includeReflectionQuestions: boolean
  includeLearningElements: boolean
}

Ancak ebeveyn ayarları dünya kurallarını doğrudan değiştirmemelidir.

67. Eğitim içeriği

Narrative Engine gerektiğinde öğrenme unsurlarını doğal şekilde ekleyebilir.

Örnek alanlar:

sayılar,
renkler,
doğa,
empati,
problem çözme,
dil gelişimi.

Ancak hikâye ders metnine dönüşmemelidir.

Zayıf:

Tilki üç taş gördü. Üç sayısı ikiden sonra gelir.

Daha doğal:

Tilki yerde üç yuvarlak taş buldu. Birini Lumi’ye verdi, ikisini cebinde tuttu.

68. Eğitim hedefi sistem kararı olmalı

Narrative Engine kendi kendine ders eklememelidir.

Story Context Builder açıkça belirtmelidir:

Öğrenme hedefi:
1’den 5’e kadar sayma.

Doğal kullanım:
Karakterlerin bulduğu taşları sayması.

Narrative Engine yalnızca bunu hikâyeye uygular.

69. Duygu öğretimi

LUMI’nin önemli özelliklerinden biri duyguları isimlendirmeye yardımcı olabilir.

Örnek:

Tilki’nin içi biraz sıkıştı. Bu, korkuyla merakın birbirine karıştığı bir histi.

Ama her sahne duygusal eğitim cümlesi içermemelidir.

Bu:

çocuğun yaşına,
hikâye amacına,
ebeveyn ayarına

bağlı olmalıdır.

70. Narrative Engine çıktısı

İlk kapsamlı çıktı modeli şöyle olabilir:

type NarrativeOutput = {
  storyId: string
  sceneId: string
  mode: NarrativeMode

  title?: string
  storyText: string

  pages?: StoryPage[]
  choicePrompt?: {
    question: string
    options: {
      id: string
      label: string
    }[]
  }

  illustrationCues: IllustrationCue[]
  audioCues: AudioCue[]

  canonicalEventIds: string[]
  proposedStateDelta?: ProposedStateDelta

  unresolvedThreads: string[]
  validationMetadata: {
    contextVersion: string
    modelId: string
    promptVersion: string
  }
}
71. Prompt ve model sürümleme

Hikâye kalitesindeki değişimleri takip etmek için:

type NarrativeGenerationRecord = {
  id: string

  modelProvider: string
  modelId: string
  promptVersion: string
  styleProfileVersion: string
  contextBuilderVersion: string

  inputTokenCount: number
  outputTokenCount: number
  generationCost: number

  validationResultId: string
  createdAt: number
}

Bu yapı:

kalite karşılaştırma,
maliyet takibi,
hata analizi,
A/B testleri

için değerlidir.

72. Kullanıcı geri bildirimi

Hikâye sonrası basit geri bildirim alınabilir:

Bu hikâyeyi sevdin mi?
😊 Evet
😐 Biraz
🙁 Hayır

Ebeveyn için daha ayrıntılı:

çok uzun,
fazla korkutucu,
tekrar ediyor,
karakter tutarsız,
seçimler ilginç değil,
dil zor.

Bu geri bildirim kişiselleştirmeyi etkileyebilir.

Ancak tek bir düşük puanla bütün anlatım tarzı değiştirilmemelidir.

73. Geri bildirim ile dünya gerçeği ayrımı

Çocuk hikâyeyi sevmedi diye dünya olayları geri alınmamalıdır.

Geri bildirim şunları etkileyebilir:

anlatım uzunluğu,
ton,
diyalog yoğunluğu,
gerilim seviyesi,
mizah,
seçim türleri.

Şunları doğrudan etkilememelidir:

mevcut dünya gerçeği,
NPC hafızası,
geçmiş kararlar,
ilişkisel sonuçlar.
74. İlk uygulanabilir Narrative Engine

MVP için şu parçalar yeterlidir:

1. Scene plan input
2. Fixed world facts
3. Character behavior guidance
4. Player knowledge boundaries
5. Required narrative beats
6. Age and tone profile
7. Choice stopping rule
8. Structured LLM output
9. Rule-based validation
10. One retry + fallback

Temel işlemler:

buildNarrativePrompt()
generateScene()
parseNarrativeOutput()
validateRequiredBeats()
validateKnowledgeBoundaries()
validateFixedDecisions()
validatePlayerChoiceBoundary()
validateAgeProfile()
repairMinorIssues()
regenerateCriticalFailure()
formatStoryOutput()
75. MVP Narrative Input
type CoreNarrativeInput = {
  mode: NarrativeMode
  language: string

  sceneGoal: string
  worldFacts: string[]

  characters: {
    id: string
    name: string
    role: string
    currentState: string[]
    behaviorGuidance: string[]
    voiceGuidance: string[]
  }[]

  fixedActions: string[]
  relevantHistory: string[]

  playerKnownFacts: string[]
  hiddenFacts: string[]

  requiredBeats: string[]
  mustNotInclude: string[]

  age: number
  tone: string
  targetWordCount: number

  choiceOptions?: {
    id: string
    label: string
  }[]
}
76. MVP Narrative Output
type CoreNarrativeOutput = {
  title?: string
  story: string

  choice?: {
    question: string
    options: {
      id: string
      label: string
    }[]
  }

  usedRequiredBeats: string[]
  proposedPersistentFacts: string[]
  hiddenFactsRevealed: string[]
}

Son iki alan kullanıcıya gösterilmez; doğrulama içindir.

77. İlk sürümde yapılmaması gerekenler

Başlangıçta şunları aşırı karmaşıklaştırmamalıyız:

tek seferde çok uzun roman üretmek,
çok sayıda anlatıcı stili,
her paragrafta model değiştirmek,
ağır edebî analiz,
sınırsız serbest oyuncu girdisi,
metinden tüm dünya state’ini tekrar çıkarmak,
anlatıcının yeni ana olaylar icat etmesi,
aynı anda çok dilli üretim,
gerçek zamanlı doğrulanmamış streaming,
her üretimde görsel ve ses oluşturmak.

İlk hedef:

Sistem kararlarına sadık,
çocuğa uygun,
tutarlı,
kısa ve ilgi çekici sahneler üretmek.
78. Narrative Engine temel ilkeleri
1. Narrative Engine olayları seçmez, anlatır.
2. Dünya gerçeğini değiştiremez.
3. NPC kararlarını değiştiremez.
4. Oyuncunun seçimini otomatik çözemez.
5. Karakterler yalnızca bildikleri bilgilerle konuşur.
6. Gizli gerçekler izin verilmeden açıklanmaz.
7. Hikâye sahne ve beat tabanlı üretilir.
8. Duygular mümkün olduğunca davranışla gösterilir.
9. Dil ve gerilim çocuk yaşına uyarlanır.
10. Seçenekler gerçek ve farklı sonuç yolları sunar.
11. Geçici anlatı ayrıntıları dünya gerçeğine dönüşmez.
12. Kalıcı değişiklikler sistem onayı olmadan kaydedilmez.
13. Metin kullanıcıya gösterilmeden önce doğrulanır.
14. Kritik hata varsa sahne yeniden üretilir.
15. LLM başarısız olursa güvenli fallback kullanılır.
16. Hikâye sonrası kanonik sistem özeti tutulur.
17. Prompt, model ve maliyet sürümlenir.
18. Anlatı kalitesi dünya mantığından üstün değildir.

Narrative Engine’in kavramsal çekirdeği bu şekilde tamamlandı.