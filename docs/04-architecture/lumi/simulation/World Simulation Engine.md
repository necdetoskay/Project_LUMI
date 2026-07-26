World Simulation Engine

World Simulation Engine, LUMI evreninin oyuncu doğrudan hikâye üretmiyorken de tutarlı biçimde ilerlemesini sağlayan katmandır.

Ancak amacı sürekli ve ağır bir dünya simülasyonu çalıştırmak değildir.

Temel amacı şudur:

Dünya canlı görünmeli,
fakat oyuncunun kontrolünü elinden almamalı.

Bu motor:

zamanın geçişini,
NPC hareketlerini,
küçük dünya değişimlerini,
bekleyen görevleri,
çevresel olayları,
ilişkisel ve duygusal etkileri

hesaplar.

Fakat büyük hikâye kararlarını oyuncu yerine vermez.

1. Simülasyonun temel ilkesi

LUMI’de dünya tamamen statik olmamalıdır.

Oyuncu birkaç gün sonra geri döndüğünde küçük değişiklikler görmelidir:

- Köprü onarımına başlanmış olabilir.
- Tilki yeni bir iz bulmuş olabilir.
- Yağmur durmuş olabilir.
- Baykuş bir not bırakmış olabilir.
- Bir tüccar köye gelmiş olabilir.

Ama oyuncu döndüğünde şunları görmemelidir:

- Ana görev tamamlandı.
- En yakın arkadaşı öldü.
- Köy yok oldu.
- Ejderha sonsuza kadar ayrıldı.
- Oyuncu adına kritik bir ahlaki seçim yapıldı.

Bu nedenle dünya ilerlemesi iki sınıfa ayrılmalıdır:

Safe Progression
Critical Progression
2. Güvenli ilerleme

Güvenli ilerleme, oyuncu yokken tamamlanabilecek olaylardır.

Örnekler:

NPC günlük rutinleri
küçük seyahatler
hava değişimi
bitkilerin büyümesi
dükkân stoklarının yenilenmesi
küçük tamiratlar
önemsiz sosyal konuşmalar
keşif için hazırlık yapılması
düşük riskli görev adımları
bir ipucunun bulunması
bir karakterin oyuncuyu beklemeye karar vermesi

Bu olaylar dünyayı değiştirir ama hikâyeyi geri döndürülemez biçimde kapatmaz.

3. Kritik ilerleme

Kritik ilerleme oyuncu yokken otomatik tamamlanmamalıdır.

Örnekler:

önemli karakter ölümü
kalıcı ayrılık
ana görevin başarısız olması
büyük ihanet
köyün veya önemli mekânın yok olması
kullanıcı karakterinin ahlaki karar vermesi
ana düşmanla yüzleşme
önemli sırrın açığa çıkması
kalıcı ilişki kopuşu
geri dönüşü olmayan dünya değişimi

Bu olaylar oluşmaya yaklaşabilir ama tamamlanmadan beklemeye alınmalıdır.

Critical Event
↓
Preparation Phase
↓
Pending Player Event
↓
Player Returns
↓
Resolution
4. Zaman modeli

World Simulation Engine gerçek zamanı birebir simüle etmek zorunda değildir.

Gerçek zaman ile dünya zamanı arasında bir dönüşüm kullanılabilir.

type WorldTimeConfig = {
  realHourToWorldHour: number
  maxOfflineSimulationDays: number
  timezone: string
  pauseWhenInactive: boolean
}

Örnek:

{
  realHourToWorldHour: 1,
  maxOfflineSimulationDays: 10,
  timezone: "Europe/Istanbul",
  pauseWhenInactive: false
}

Ancak çocuk hikâyesinde zaman aşırı hızlı ilerlememelidir.

Bir hafta gerçek zaman geçtiğinde hikâye evreninde aylar geçmiş gibi hissettirmek uygun olmaz.

5. Simülasyon yoğunluğu

Daha önce verdiğimiz kararın merkezde olması gerekir:

1–3 gün:
normal simülasyon

4–7 gün:
azaltılmış simülasyon

8–10 gün:
yalnızca güvenli ve küçük ilerleme

10 günden sonra:
dünya dondurulur

Bunu sayısal yoğunluk katsayısına çevirebiliriz.

type SimulationIntensity = {
  dayRange: string
  intensityMultiplier: number
  allowedEventRisk: number
  activeEntityRatio: number
}

Örnek:

[
  {
    dayRange: "1-3",
    intensityMultiplier: 1.0,
    allowedEventRisk: 0.45,
    activeEntityRatio: 0.70
  },
  {
    dayRange: "4-7",
    intensityMultiplier: 0.50,
    allowedEventRisk: 0.25,
    activeEntityRatio: 0.35
  },
  {
    dayRange: "8-10",
    intensityMultiplier: 0.20,
    allowedEventRisk: 0.10,
    activeEntityRatio: 0.15
  }
]

Buradaki önemli nokta:

Yoğunluk azalması yalnızca olay sayısını değil,
olayların önem seviyesini de düşürmelidir.
6. Simülasyon gün gün çalışmak zorunda değildir

Küçük dünyalarda her günü tek tek hesaplamak mümkün olabilir.

Ama daha büyük evrende bu gereksiz maliyet yaratır.

Bunun yerine zaman parçaları kullanılabilir.

0–24 saat:
detaylı güncelleme

1–3 gün:
günlük bloklar

4–7 gün:
iki günlük bloklar

8–10 gün:
özet blok

Örnek:

type SimulationStep = {
  startTime: number
  endTime: number
  granularity:
    | "hour"
    | "day"
    | "multi_day"
    | "summary"
}

Bu, maliyeti azaltır.

7. Aktif varlık seçimi

Dünyadaki her NPC, nesne ve mekân aynı anda simüle edilmemelidir.

Önce aktif varlıklar seçilmelidir.

Active Entity Score =
Player Relevance
+ Story Relevance
+ Goal Activity
+ Relationship Relevance
+ Nearby Event Relevance
+ Unresolved Event Relevance

Yüksek puanlı varlıklar simülasyona girer.

8. Varlık katmanları
type SimulationTier =
  | "core"
  | "active"
  | "background"
  | "dormant"
Core

Ana karakterler ve ana hikâyeyle ilişkili NPC’ler.

Sık güncellenir.

Active

Yakın zamanda kullanılan karakterler ve mekânlar.

Orta yoğunlukta güncellenir.

Background

Dünyada var ama mevcut hikâyeye uzak.

Yalnızca özet durum tutulur.

Dormant

Uzun süredir kullanılmayan varlıklar.

Yeni bir olay tetiklenmedikçe hesaplanmaz.

9. Örnek aktiflik modeli
type SimulationEntityState = {
  entityId: string
  tier: SimulationTier

  storyRelevance: number
  playerRelationship: number
  activeGoalCount: number
  unresolvedEventCount: number
  lastInteractionAt: number

  simulationPriority: number
}

Örneğin:

Tilki:
core

Yaşlı denizci:
active

Uzak adadaki tüccar:
background

Üç hikâyedir görünmeyen madenci:
dormant
10. NPC simülasyonu

NPC’ler tamamen rastgele hareket etmemelidir.

Her NPC için şu kaynaklar kullanılmalıdır:

Current Goals
Needs
Location
Relationships
Beliefs
Emotions
Obligations
Available Actions
World Constraints

Akış:

NPC seç
↓
Aktif hedeflerini getir
↓
Dünya koşullarını kontrol et
↓
Uygun eylemleri üret
↓
Decision Engine ile eylem seç
↓
Risk kontrolü uygula
↓
Sonucu dünya durumuna işle

Burada yine temel kural geçerlidir:

LLM, NPC’nin eylemini seçmez.

11. NPC günlük planı

Her NPC için ayrıntılı saatlik takvim gerekli değildir.

Basit zaman blokları yeterli olabilir.

type DailyRoutineBlock = {
  timeBlock:
    | "morning"
    | "midday"
    | "evening"
    | "night"

  preferredActivities: string[]
  preferredLocations: string[]
  interruptionTolerance: number
}

Örnek:

Yaşlı denizci

Sabah:
limanı kontrol eder

Öğle:
ağları tamir eder

Akşam:
hanın önünde oturur

Gece:
genellikle evindedir

Bu rutinler dünya tutarlılığı sağlar.

12. Rutinler kesin senaryo değildir

NPC rutinleri gerektiğinde bozulmalıdır.

Örneğin:

Fırtına başladı
→ denizci limana gider

Tilki kayboldu
→ Baykuş onu aramaya çıkar

Köprü çöktü
→ marangoz onarım ekibine katılır

Rutin kırılma puanı:

Routine Interruption =
Event Urgency
× Goal Relevance
× Relationship Importance
× Responsibility
13. Hedef ilerlemesi

NPC hedefleri oyuncu yokken sınırlı biçimde ilerleyebilir.

type SimulatedGoal = {
  goalId: string
  ownerId: string
  progress: number
  autonomyLevel: number
  riskLevel: number
  requiresPlayer: boolean
  criticalResolution: boolean
}

Örnek:

Hedef:
Köprüyü onarmak

Oyuncu yokken:
- malzeme toplanabilir
- ekip kurulabilir
- hasar incelenebilir
- onarım başlayabilir

Oyuncu gerekiyorsa:
- köprünün hangi şekilde onarılacağı seçilebilir
- gizli geçidin kapatılıp kapatılmayacağına karar verilebilir
14. Otonomi seviyesi

Her görev aynı ölçüde otomatik ilerlememelidir.

type GoalAutonomy =
  | "fully_autonomous"
  | "partially_autonomous"
  | "player_gated"
  | "player_owned"
Fully autonomous
Bahçeyi sulamak
Dükkân stoklamak
Küçük tamirat yapmak
Partially autonomous
Köprü onarımına hazırlanmak
Bir izi araştırmaya başlamak
Yolculuk planlamak
Player gated
Gizli kapıyı açmak
Önemli karakterle yüzleşmek
Bir tarafa destek vermek
Player owned
Ahlaki seçim yapmak
Ana rotayı seçmek
Bir karakteri affetmek
15. Olay sistemi

World Simulation Engine olay tabanlı çalışmalıdır.

type WorldEvent = {
  id: string
  type: string

  participants: string[]
  locationId: string

  startAt: number
  resolvedAt?: number

  importance: number
  risk: number
  reversibility: number
  playerRelevance: number

  status:
    | "candidate"
    | "active"
    | "resolved"
    | "pending_player"
    | "cancelled"
}
16. Olay adayları

Olaylar birkaç kaynaktan gelebilir:

- NPC hedefleri
- çevresel koşullar
- ilişki gerilimleri
- tamamlanmamış görevler
- dünya zamanlayıcıları
- rastlantısal düşük riskli olaylar
- oyuncunun önceki seçimlerinin gecikmiş sonuçları

Örnek:

Yağmur + eski köprü
→ köprüde ek hasar oluşma ihtimali

Tilki + kayıp harita hedefi + değirmen
→ yeni bir işaret bulma ihtimali

Baykuş + Lumi ile güçlü ilişki
→ Lumi’ye not bırakma ihtimali
17. Olay uygunluk kontrolü

Her aday olay çalıştırılmamalıdır.

Event Eligibility =
World Compatibility
× Character Availability
× Goal Relevance
× Time Suitability
× Risk Permission
× Story Continuity

Aşağıdaki kontroller gerekir:

- Karakter doğru yerde mi?
- Gerekli nesne mevcut mu?
- Olay başka bir kesin gerçekle çelişiyor mu?
- Oyuncu yokken çözülebilir mi?
- Sonuç geri döndürülebilir mi?
- Aynı olay yakın zamanda kullanıldı mı?
18. Risk sınıfları
type EventRiskClass =
  | "ambient"
  | "minor"
  | "moderate"
  | "major"
  | "critical"
Ambient
Hava değişimi
Kuşların göç etmesi
Pazarın kurulması
Minor
Küçük bir nesnenin bulunması
Bir NPC’nin not bırakması
Ufak bir tartışma
Moderate
Bir görevin ara aşamasının tamamlanması
Geçici yol kapanması
Karakterin hafif yaralanması
Major
Kalıcı ilişki kopuşu
Büyük mekân hasarı
Önemli kayıp
Critical
Ana karakter ölümü
Ana görev kapanışı
Dünyanın büyük ölçüde değişmesi

Oyuncu yokken:

1–3 gün:
ambient + minor + sınırlı moderate

4–7 gün:
ambient + minor

8–10 gün:
ambient + çok düşük etkili minor

10+ gün:
hiçbiri
19. Geri döndürülebilirlik

Bir olayın otomatik tamamlanıp tamamlanamayacağında yalnızca risk değil, geri döndürülebilirlik de önemlidir.

type Reversibility =
  | "fully_reversible"
  | "mostly_reversible"
  | "costly_to_reverse"
  | "irreversible"

Örnek:

Yağmur başladı:
fully_reversible

Köprü geçici kapandı:
mostly_reversible

NPC köyden ayrıldı:
costly_to_reverse

NPC öldü:
irreversible

Oyuncu yokken irreversible olaylar engellenmelidir.

20. Oyuncu kapısı

Kritik olaylar için bir oyuncu kapısı kullanılmalıdır.

type PlayerGate = {
  eventId: string

  gateReason:
    | "major_choice"
    | "relationship_decision"
    | "story_climax"
    | "irreversible_change"
    | "secret_reveal"

  preparedState: string
  resolutionOptions: string[]
}

Örnek:

Event:
Ejderha adayı terk etmeyi düşünüyor.

Prepared state:
Ejderha eşyalarını topladı ve Lumi ile konuşmayı bekliyor.

Resolution:
- Gitmesine izin ver
- Kalmasını iste
- Birlikte yeni bir yer bulmayı öner
21. Bekleyen olayların bozulmaması

Bekleyen olaylar sonsuza kadar aynı şekilde kalırsa yapay görünebilir.

Bu nedenle beklerken yalnızca çevresel durumları değişebilir.

Örnek:

İlk gün:
Tilki iz buldu.

Üçüncü gün:
İzin yağmurda silinmemesi için taşlarla işaretledi.

Yedinci gün:
İz hâlâ araştırılmadı, Tilki Lumi’yi bekliyor.

Ana karar çözülmez ama dünya tamamen donmuş da görünmez.

22. Mekân simülasyonu

Mekânların da durumları olmalıdır.

type LocationSimulationState = {
  locationId: string

  condition: number
  accessibility: number
  safety: number
  activityLevel: number

  resourceStates: Record<string, number>
  activeHazards: string[]
  ongoingProjects: string[]
  residentIds: string[]
}

Örnek:

Eski Köprü

condition: 0.35
accessibility: 0.20
safety: 0.30
ongoingProjects:
- ahşap desteklerin hazırlanması
23. Mekân değişimleri

Oyuncu yokken yapılabilecek güvenli mekân değişimleri:

temizlik
bakım
hava etkisi
bitki büyümesi
küçük hasar
küçük onarım
dekorasyon
stok değişimi
mevsimsel değişim

Kritik mekân değişimleri:

köyün yok olması
ana kalenin çökmesi
önemli geçidin sonsuza kadar kapanması
büyük yangın
adanın terk edilmesi

Bunlar oyuncuyu beklemelidir.

24. Kaynak simülasyonu

Dünyadaki bütün kaynakları tek tek saymak gereksizdir.

Kaynaklar kümeler hâlinde tutulabilir.

type ResourcePool = {
  resourceType: string
  locationId: string

  amount: number
  regenerationRate: number
  consumptionRate: number
  scarcity: number
}

Örnek:

Köy odunu:
amount: 0.65

Şifalı bitki:
amount: 0.30

Balık:
amount: 0.80

Bu değerler hikâye üretiminde kullanılabilir ama çok ayrıntılı ekonomi simülasyonuna dönüşmemelidir.

25. Kaynakların hikâyeye etkisi

Kaynak durumu doğrudan görev ve olay adayları üretebilir.

Odun az
→ köprü tamiri yavaşlar

Şifalı bitki az
→ şifacı yeni bölge araştırmak ister

Balık bol
→ köy pazarı canlanır

Ama çocuk hikâyesi için bu etkiler sade tutulmalıdır.

26. Çevresel simülasyon

Çevresel sistemler:

hava durumu
gün/gece
mevsim
su seviyesi
bitki büyümesi
hayvan hareketleri
doğal tehlikeler
type EnvironmentState = {
  weather: string
  temperatureBand: string
  timeOfDay: string
  season: string

  waterLevel: number
  visibility: number
  travelDifficulty: number
}
27. Hava durumu anlatı aracı olmalıdır

Hava yalnızca dekor değildir.

Örnek:

Yoğun yağmur
→ izleri silebilir
→ köprüyü tehlikeli yapabilir
→ NPC’leri kapalı mekâna yöneltebilir
→ korku veya rahatlık duygusunu etkileyebilir

Ancak hava sürekli dramatik olay üretmemelidir.

28. Dünya olay zincirleri

Bazı olaylar zincir hâlinde ilerleyebilir.

Yağmur başladı
↓
Nehir seviyesi yükseldi
↓
Köprü hasar gördü
↓
Yol kapandı
↓
Marangoz tamir hazırlığı yaptı

Bu zincirler açıklanabilir olmalıdır.

type EventCausalLink = {
  causeEventId: string
  effectEventId: string
  strength: number
}

Böylece sistem dünya değişiminin nedenini takip edebilir.

29. Zincir sınırları

Olay zincirleri kontrolsüz büyümemelidir.

Bir simülasyon çalışmasında:

Maksimum zincir derinliği:
3 veya 4

Maksimum kritik olmayan olay sayısı:
dünya boyutuna göre sınırlı

Kritik olaya ulaştığında:
pending_player

Örnek:

Yağmur
→ nehir yükseldi
→ köprü tehlikeli oldu
→ köprü tamamen yıkılmak üzere

Burada dur.

Oyuncu geldiğinde müdahale edebilir.

30. İlişki simülasyonu

Oyuncu yokken NPC’ler birbirleriyle etkileşebilir.

Ama bu etkileşimler genellikle düşük veya orta etkili olmalıdır.

Örnek:

sohbet etmek
yardım etmek
küçük tartışma
birlikte çalışmak
bilgi paylaşmak
plan yapmak
type SimulatedSocialInteraction = {
  actorId: string
  targetId: string

  interactionType: string
  emotionalImpact: number
  relationshipImpact: number

  critical: boolean
}
31. İlişkiler otomatik kırılmamalı

Oyuncu yokken:

small trust increase:
olabilir

small irritation:
olabilir

major betrayal:
olamaz

relationship break:
olamaz

Örnek:

Tilki ve Baykuş birlikte işaretleri inceledi.
→ familiarity +0.04
→ cooperationTrust +0.03

Ama:

Tilki Baykuş ile kavga etti ve bir daha konuşmamaya karar verdi.

oyuncu yokken fazla kritik olabilir.

32. Duygu simülasyonu

Duygular zamanla değişebilir.

Ancak her saat yeniden hesaplanmamalıdır.

type OfflineEmotionUpdate = {
  characterId: string
  baselineReturn: number
  unresolvedEventImpact: number
  socialInteractionImpact: number
  environmentImpact: number
}

Örneğin:

Öfke zamanla azalabilir.
Kaygı, çözülmemiş tehdit varsa sürebilir.
Umut, hazırlık ilerledikçe artabilir.
33. Duyguların aşırı değişmesi engellenmeli

Oyuncu ayrılırken:

Tilki çok üzgün

Oyuncu üç gün sonra geldiğinde:

Tilki tamamen neşeli ve konuyu unutmuş

olmamalıdır.

Bunun yerine:

Tilki sakinleşmiş ama hâlâ biraz kırgın.

Bu, duygusal devamlılığı korur.

34. Hafıza üretimi

Simülasyonda gerçekleşen her olay hafızaya dönüşmemelidir.

Memory Engine’in önem eşiği burada da kullanılır.

Simülasyon olayı
↓
Karakter algıladı mı?
↓
Olay önemli mi?
↓
Hafıza oluştur

Örnek:

Tilki üç gün boyunca her sabah yürüdü.

ayrı ayrı üç anı oluşturmaz.

Bunun yerine:

Tilki son günlerde değirmen çevresini sık sık kontrol etti.

şeklinde özetlenebilir.

35. İnanç güncellemeleri

Simülasyon sırasında yeni gözlemler inançları etkileyebilir.

Örnek:

Tilki:
Denizcinin gece limana gittiğini gördü.

Yeni şüphe:
Denizci gizli bir görüşme yapıyor olabilir.

Ancak oyuncu yokken önemli gizemler tamamen çözülmemelidir.

İpucu bulunabilir.
Kesin gerçek açığa çıkmaz.
36. Görev simülasyonu

Görevler aşamalı durumlara sahip olmalıdır.

type QuestSimulationState = {
  questId: string

  stage: string
  progress: number

  autonomousSteps: string[]
  playerRequiredSteps: string[]

  blockedReason?: string
  pendingDiscovery?: string
}

Örnek:

Görev:
Kayıp haritanın izini bul

Oyuncu yokken:
- Tilki eski kayıtları inceledi.
- Değirmende bir sembol buldu.
- Sembolün kopyasını çıkardı.

Oyuncu gerekiyor:
- Sembolün hangi rotayı gösterdiğini seçmek.
- Mağaraya gidip gitmemeye karar vermek.
37. Görev başarısızlığı

Oyuncu yokken görev başarısızlığı çok dikkatli kullanılmalıdır.

Şu görevler otomatik başarısız olmamalıdır:

ana hikâye görevleri
önemli ilişki görevleri
oyuncunun seçimine bağlı görevler
çocuk için önemli keşif görevleri

Düşük önem seviyeli görevler süre aşımı yaşayabilir.

Örnek:

Gezgin tüccar iki gün köyde kaldı ve sonra ayrıldı.

Bu kabul edilebilir.

Ama dönüşte oyuncuya açıkça anlatılmalıdır.

38. Oyuncu yokken fırsat kaybı

LUMI’nin ana yaklaşımı cezalandırıcı olmamalıdır.

Bu nedenle:

Oyuncu birkaç gün uygulamaya girmedi
→ önemli içerik kaybetmemeli

Geçici fırsatlar:

tekrar gelebilir,
alternatif biçimde sunulabilir,
küçük yan içerik olarak kaybolabilir.

Ama ana deneyim zarar görmemelidir.

39. Simülasyon bütçesi

Her simülasyon çalışması sınırlı olmalıdır.

type SimulationBudget = {
  maxActiveCharacters: number
  maxActiveLocations: number
  maxResolvedEvents: number
  maxPendingEvents: number
  maxCausalDepth: number
}

Örnek:

{
  maxActiveCharacters: 8,
  maxActiveLocations: 5,
  maxResolvedEvents: 12,
  maxPendingEvents: 4,
  maxCausalDepth: 3
}

Bu değerler dünya büyüklüğüne göre değişebilir.

40. Deterministik ve rastlantısal simülasyon

Simülasyon tamamen rastgele olmamalıdır.

Aynı dünya durumu aynı koşullarda benzer sonuçlar üretmelidir.

Ama küçük çeşitlilik için kontrollü rastlantı kullanılabilir.

Deterministik bölüm:
- hedefler
- ilişkiler
- dünya kuralları
- olay uygunluğu

Rastlantısal bölüm:
- küçük çevre detayları
- düşük riskli sosyal karşılaşmalar
- atmosferik olaylar
41. Seed kullanımı

Tekrarlanabilirlik için simülasyon seed değeri kullanılabilir.

type SimulationRun = {
  id: string
  seed: string
  startedAt: number
  endedAt: number
  simulatedDuration: number
}

Bu:

hata ayıklama,
test,
aynı sonucu yeniden üretme

açısından faydalıdır.

42. Simülasyon işlemsel olmalıdır

Bir simülasyon çalışması yarıda kesilirse dünya bozulmamalıdır.

Current World State
↓
Create Simulation Snapshot
↓
Run Candidate Events
↓
Validate Results
↓
Commit All

Bir hata olursa:

Rollback

Bu nedenle simülasyon sonuçları tek tek doğrudan veritabanına yazılmamalıdır.

43. Simülasyon snapshot’ı
type SimulationSnapshot = {
  worldStateVersion: string
  entityStates: Record<string, unknown>
  activeGoals: string[]
  activeEvents: string[]
  createdAt: number
}

Simülasyon bu kopya üzerinde çalışır.

Sonuç doğrulandıktan sonra gerçek dünyaya uygulanır.

44. Simülasyon doğrulama

Commit öncesinde şu kontroller yapılmalıdır:

- Aynı karakter aynı anda iki yerde mi?
- Ölü veya pasif karakter eylem yaptı mı?
- Gerekli nesne olmadan görev ilerledi mi?
- Kritik olay yanlışlıkla tamamlandı mı?
- Oyuncuya ait karar otomatik verildi mi?
- Dünya gerçeği kendi içinde çelişti mi?
- Olay zinciri risk sınırını aştı mı?
- Simülasyon 10 günlük sınırı geçti mi?
45. Dünya sürümleme

Her başarılı simülasyon sonrası dünya durumu sürümlenebilir.

type WorldStateVersion = {
  version: number
  createdAt: number
  source:
    | "player_action"
    | "story_event"
    | "offline_simulation"
    | "manual_repair"

  simulationRunId?: string
}

Bu sayede:

önceki dünya durumu incelenebilir,
hatalı simülasyon geri alınabilir,
olayların kaynağı görülebilir.
46. Çevrimdışı simülasyon akışı
1. Son aktif zamanı al
2. Geçen süreyi hesapla
3. Süreyi en fazla 10 günle sınırla
4. Gün aralıklarına göre yoğunluğu belirle
5. Aktif karakterleri ve mekânları seç
6. Rutin ve hedef tabanlı olay adayları üret
7. Risk ve oyuncu kapısı kontrolü yap
8. Güvenli olayları çöz
9. Kritik olayları pending durumuna al
10. Dünya durumunu snapshot üzerinde güncelle
11. Emotion, Memory, Belief ve Relationship etkilerini üret
12. Sonuçları doğrula
13. Dünya sürümünü commit et
14. “Sen yokken” özetini üret
15. Son simülasyon zamanını güncelle
47. Günlere göre örnek simülasyon

Oyuncu 9 gün boyunca gelmedi.

1–3. gün
- Tilki değirmen çevresini araştırdı.
- Baykuşla birlikte eski taş işaretlerini inceledi.
- Köprü onarımı için malzeme toplandı.
- Hafif yağmur başladı.
4–7. gün
- Köprü onarımına başlandı.
- Tilki yeni bir sembol buldu.
- Baykuş Lumi’ye bir not hazırladı.
- Denizci limanda daha uzun süre kalmaya başladı.
8–9. gün
- Tilki sembolü tek başına araştırmak yerine Lumi’yi bekledi.
- Baykuş notu kamp alanına bıraktı.
- Köprü onarımı yavaşça devam etti.

Gerçekleşmeyenler:

- Gizli kapı açılmadı.
- Mağaraya girilmedi.
- Denizcinin sırrı çözülmedi.
- Ana görev ilerlemedi.
48. “Sen yokken” özeti

Kullanıcıya bütün simülasyon günlüğü verilmemelidir.

Özet:

Sen yokken...

Tilki eski değirmenin yakınında yeni bir sembol buldu.

Köylüler kırık köprüyü onarmaya başladı.

Baykuş sana küçük bir not bıraktı.

Tilki sembolü tek başına araştırmadı. Dönmeni bekledi.

Bu özet:

kısa,
anlaşılır,
hikâyeyi hatırlatıcı,
merak uyandırıcı

olmalıdır.

49. Özet önem sırası

Özete şu sırayla olay seçilebilir:

1. Oyuncuyla doğrudan ilişkili olaylar
2. Bekleyen kritik olaylar
3. Aktif görev ilerlemeleri
4. Önemli NPC değişimleri
5. Mekân değişimleri
6. Atmosferik detaylar

En fazla 3–6 madde yeterlidir.

50. Özet anlatım biçimi

Beş yaşındaki çocuk için:

Tilki seni bekledi.
Baykuş sana bir not bıraktı.
Köprü biraz daha onarıldı.

Daha büyük çocuk için:

Tilki değirmendeki sembolü araştırmaya başladı fakat gizli geçide tek başına girmedi. Baykuş bulduklarını sana anlatmak için bir not bıraktı.

Çocuk profiline göre anlatım uyarlanmalıdır.

51. Ebeveyn ayarları
type OfflineSimulationSettings = {
  enabled: boolean
  maxDays: 0 | 3 | 7 | 10
  allowNpcSocialProgress: boolean
  allowMinorQuestProgress: boolean
  allowEnvironmentalChanges: boolean
  showReturnSummary: boolean
}

Seçenekler:

Dünya ilerlemesin

En fazla 3 gün

En fazla 7 gün

En fazla 10 gün

Varsayılan:

10 gün, azalan yoğunluk
52. Kullanıcı aktifken simülasyon

World Simulation Engine yalnızca çevrimdışı çalışmamalıdır.

Aktif hikâye sırasında da kullanılabilir.

Örneğin çocuk bir seçim yaptığında:

“Önce denizciyle konuş.”

Bu sırada:

Tilki ne yapar?
Baykuş nerede kalır?
hava nasıl değişir?
başka NPC’ler ne yapar?

simüle edilebilir.

Ancak aktif sahne simülasyonu daha ayrıntılı ve kısa zaman aralıklı olur.

53. Aktif ve çevrimdışı simülasyon farkı
Aktif simülasyon:
yüksek ayrıntı
dakika veya saat ölçeği
oyuncuya yakın
anında anlatı üretir

Çevrimdışı simülasyon:
düşük ayrıntı
gün ölçeği
özet sonuç
kritik olayları durdurur

Aynı motor farklı modlarda çalışabilir.

54. Simülasyon modları
type SimulationMode =
  | "scene"
  | "between_scenes"
  | "offline"
  | "world_maintenance"
Scene

Aktif hikâye içi kısa simülasyon.

Between scenes

Bir sahne ile diğeri arasındaki saatlik veya günlük geçiş.

Offline

Uygulama kullanılmazken azalan yoğunlukta ilerleme.

World maintenance

Eski verileri özetleme, arşivleme ve konsolidasyon.

55. World maintenance

Dünya büyüdükçe bazı temizlik işlemleri gerekir.

- çözülmüş olayları arşivle
- benzer küçük olayları birleştir
- eski düşük etkili durumları özetle
- pasif NPC’leri dormant moda al
- eski görev loglarını sıkıştır
- kullanılmayan geçici nesneleri temizle

Bu, simülasyonun uzun vadede ağırlaşmasını önler.

56. Simülasyon ve LLM ilişkisi

World Simulation Engine temel kararlar için LLM kullanmamalıdır.

LLM şu alanlarda kullanılabilir:

dönüş özetini doğal dile çevirmek,
düşük riskli atmosfer ayrıntısı önermek,
olay açıklamasını çocuk diline uyarlamak.

Ancak LLM şu kararları vermemelidir:

hangi NPC ne yapacak,
kritik olay tamamlanacak mı,
ilişki ne kadar değişecek,
görev başarıya ulaştı mı,
hangi dünya gerçeği değişti.
57. Simülasyon kayıtları
type SimulationEventLog = {
  id: string
  simulationRunId: string

  eventType: string
  actorIds: string[]
  locationId?: string

  previousState: unknown
  resultingState: unknown

  riskClass: EventRiskClass
  autoResolved: boolean
  pendingPlayer: boolean

  createdAt: number
}

Bu loglar:

hata ayıklama,
kullanıcı özeti,
Memory Engine,
dünya geçmişi

için kullanılabilir.

58. İlk uygulanabilir World Simulation Engine

İlk sürüm için şu yapı yeterlidir:

type CoreSimulationConfig = {
  maxOfflineDays: number
  intensityByDayRange: {
    fromDay: number
    toDay: number
    intensity: number
    maxRisk: number
  }[]

  maxActiveCharacters: number
  maxActiveLocations: number
  maxEventsPerRun: number
}

Temel nesneler:

type CoreWorldEvent = {
  id: string
  type: string
  actorIds: string[]
  locationId?: string

  importance: number
  risk: number
  reversibility: number
  requiresPlayer: boolean

  status:
    | "candidate"
    | "resolved"
    | "pending_player"
    | "rejected"
}

Temel işlemler:

calculateOfflineDuration()
selectSimulationIntensity()
selectActiveEntities()
generateEventCandidates()
evaluateEventEligibility()
resolveSafeEvents()
pauseCriticalEvents()
applySimulationEffects()
validateSimulationResult()
commitWorldState()
buildReturnSummary()
59. İlk sürümde yapılmaması gerekenler

Başlangıçta şunlardan kaçınmalıyız:

bütün NPC’leri saat saat simüle etmek,
ayrıntılı ekonomi sistemi,
karmaşık savaş simülasyonu,
tam mevsim ve ekoloji modeli,
her çevrimdışı saatte LLM çağırmak,
büyük rastlantısal felaketler,
oyuncu yokken ana hikâyeyi ilerletmek,
sınırsız olay zincirleri,
her NPC için yüzlerce günlük aktivite kaydı.

İlk sürümün amacı:

Dünyayı canlı hissettir.
Önemli olayları koru.
Kullanıcı döndüğünde dünyayı tanınabilir bırak.
60. World Simulation Engine temel ilkeleri
1. Dünya canlı ilerler ama oyuncunun yerine karar vermez.
2. Çevrimdışı simülasyon en fazla 10 gün sürer.
3. Simülasyon yoğunluğu zamanla azalır.
4. Bütün varlıklar değil, yalnızca ilgili varlıklar simüle edilir.
5. Geri döndürülemez olaylar otomatik tamamlanmaz.
6. Kritik olaylar oyuncuyu bekleyen duruma alınır.
7. Ana görevler oyuncu yokken kapanmaz.
8. NPC’ler kendi hedefleri ve bilgileriyle hareket eder.
9. Simülasyon olay tabanlı ve bütçeli çalışır.
10. Dünya değişiklikleri nedensel olarak açıklanabilir olmalıdır.
11. Simülasyon snapshot üzerinde çalışır ve doğrulandıktan sonra commit edilir.
12. Her simülasyon olayı hafızaya dönüşmez.
13. Kullanıcı dönüşünde kısa ve anlaşılır bir özet gösterilir.
14. On günden sonra dünya statik kalır.
15. LLM simülasyon kararlarını değil, yalnızca anlatımını üretir.