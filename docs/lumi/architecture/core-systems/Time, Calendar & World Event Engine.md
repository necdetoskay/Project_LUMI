Time, Calendar & World Event Engine

Bu motor, LUMI evreninde zamanın bütün sistemler tarafından aynı şekilde anlaşılmasını sağlar.

Amaç yalnızca “şu an saat kaç?” sorusunu cevaplamak değildir.

Asıl görevleri:

Dünya ne kadar ilerledi?
Hikâyede ne kadar zaman geçti?
Oyuncu ne kadar süre yoktu?
Hangi olay artık başlayabilir?
Hangi NPC rutinini uygulamalı?
Hangi görev beklemeli?
Hangi olay oyuncu gelmeden tamamlanmamalı?
On günlük offline sınırı nasıl uygulanmalı?

Temel ilke:

LUMI’de zaman tek bir sayaç değildir; farklı amaçlar için kullanılan ama birbirine açık kurallarla bağlanan zaman katmanlarından oluşur.

1. Zaman katmanları

LUMI’de en az dört ayrı zaman türü bulunmalıdır.

Real Time
Session Time
Story Time
World Time
Real Time

Kullanıcının gerçek dünyadaki zamanı.

24 Temmuz 2026, 19:20
Session Time

Kullanıcının uygulamada geçirdiği süre.

Bu oturumda 18 dakika geçti.
Story Time

Aktif hikâye içinde geçen anlatısal süre.

Lumi ve Tilki iki saat yürüdü.
World Time

Kanonik evrenin ortak zamanı.

Dünya takviminde 42. gün, akşam.

Bu katmanlar birbirine eşit olmak zorunda değildir.

2. Neden ayrı tutulmalılar?

Çocuk gerçek dünyada 20 dakika hikâye okuyabilir.

Ama hikâyede:

bir sabah,
üç saatlik yolculuk,
akşam kampı

yaşanabilir.

Aynı şekilde çocuk 7 gün uygulamaya girmeyebilir.

Bu, dünyada tam 7 günün aynı ayrıntıyla simüle edilmesi anlamına gelmez.

3. Temel zaman modeli
type WorldClock = {
  worldDay: number
  minuteOfDay: number

  seasonId: string
  calendarId: string

  worldTimeVersion: number
}

Örnek:

worldDay = 42
minuteOfDay = 1020

Bu yaklaşık:

17:00

anlamına gelebilir.

Ancak çocuk arayüzünde doğrudan dakika göstermek zorunlu değildir.

4. Günün dönemleri
type DayPeriod =
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "evening"
  | "night"

Önerilen varsayılan aralık:

Şafak:
05:00–07:00

Sabah:
07:00–11:00

Öğle:
11:00–14:00

Öğleden sonra:
14:00–18:00

Akşam:
18:00–21:00

Gece:
21:00–05:00

Bu aralıklar evren veya bölgeye göre değişebilir.

5. World Calendar
type WorldCalendarDefinition = {
  id: string
  name: string

  daysPerSeason: number
  seasons: string[]

  dayPeriods: {
    id: DayPeriod
    startMinute: number
    endMinute: number
  }[]

  specialDateDefinitions: string[]
}

LUMI’nin dünya takvimi gerçek takvime birebir bağlı olmak zorunda değildir.

Bu, kaçırma baskısını azaltır.

6. Gerçek zamanla bağ

Gerçek zaman yalnızca şu amaçlarla kullanılabilir:

son giriş süresini hesaplamak,
ebeveyn ayarlarını uygulamak,
uyku modu önermek,
sezonluk ama kaçırılmayan içerik göstermek,
bildirim zamanlamak.

Dünya zamanı doğrudan gerçek zamanla aynı hızda akmamalıdır.

7. Zaman ilerleme kaynakları

World Time şu kaynaklarla ilerleyebilir:

Story scene duration
Travel duration
Explicit waiting
Crafting duration
Rest
Safe offline simulation
World event progression

Her işlem zaman delta üretir.

type TimeAdvanceRequest = {
  sourceType:
    | "scene"
    | "travel"
    | "crafting"
    | "rest"
    | "waiting"
    | "offline"
    | "world_event"

  requestedMinutes: number
  causationId: string
}
8. Zaman ilerletme otoritesi

Narrative Engine zamanı tek başına ilerletemez.

Yanlış:

Üç gün sonra kuleye ulaştılar.

Ama state’te zaman ilerlememiş.

Doğru akış:

Story Planner:
üç günlük yolculuk önerir

↓

Time Engine:
geçerli süreyi hesaplar

↓

World Simulation:
bu süre içindeki etkileri değerlendirir

↓

State commit

↓

Narrative:
üç günlük yolculuğu anlatır
9. Scene duration

Her sahne yaklaşık bir süre taşıyabilir.

type SceneTimeProfile = {
  sceneId: string

  minimumMinutes: number
  expectedMinutes: number
  maximumMinutes: number

  timeMode:
    | "realistic"
    | "compressed"
    | "montage"
    | "instant"
}

Örnek:

Kısa konuşma:
5–10 dakika

Ormanı geçme:
45–90 dakika

Köprü onarımı:
2–4 saat

Uyku:
6–9 saat
10. Anlatısal zaman sıkıştırma

Her dakika ayrı simüle edilmemelidir.

Compressed time:
Uzun ama düşük etkili süre özetlenir.

Detailed time:
Karar veya olay açısından önemli süre sahneleştirilir.

Örnek:

Sabah boyunca tahta topladılar.

Bu dört saatlik süreyi tek paragrafta geçebilir.

Ancak bu süre yine world time’a eklenir.

11. Time compression policy
type TimeCompressionPolicy = {
  maximumDetailedMinutes: number

  compressLowImpactPeriods: boolean
  preserveCriticalEvents: boolean
  preservePlayerGates: boolean
}

Kritik olaylar zaman sıkıştırması sırasında atlanamaz.

12. Hikâye zamanı ve dünya zamanı

Story Time, World Time’ın bir alt görünümü olabilir.

Çoğu durumda:

Story Time ilerlemesi
→ World Time ilerlemesi

üretir.

Ancak bazı anlatı teknikleri farklıdır.

Örnek:

Flashback
Dream
Vision
Hypothetical sequence
Story recap

Bunlar world time ilerletmez.

13. Temporal narrative mode
type NarrativeTimeMode =
  | "present"
  | "flashback"
  | "memory"
  | "dream"
  | "vision"
  | "hypothetical"
  | "recap"

Yalnızca present modundaki olaylar varsayılan olarak kanonik zaman ilerlemesi üretir.

14. Flashback güvenliği

Flashback yeni world event commit etmez.

Yalnızca:

geçmiş event’leri yeniden anlatır,
character memory’yi gösterir,
yeni bir yorum veya belief oluşturabilir.

Geçmiş world state geriye dönük değiştirilmez.

15. Bekleme eylemi

Oyuncu zaman geçmesini seçebilir.

Sabaha kadar bekleyelim.
Yağmurun dinmesini bekleyelim.
Denizci dönene kadar burada kalalım.

Akış:

Wait Intent
↓
Time Window Evaluation
↓
Safety
↓
World Events During Wait
↓
Resulting Time
16. Waiting policy
type WaitingPolicy = {
  maximumDirectWaitMinutes: number
  allowOvernight: boolean
  requireSafeLocation: boolean

  interruptOnCriticalEvent: boolean
}

Örneğin geceyi açık ormanda geçirmek yerine güvenli konum gerekebilir.

17. Rest ve sleep
type RestType =
  | "short_rest"
  | "meal_break"
  | "overnight_sleep"
  | "recovery_rest"

Rest:

zaman ilerletir,
bazı emotion veya fatigue durumlarını etkileyebilir,
ancak ilgili motorların kurallarıyla işlenir.

Time Engine yalnızca sürenin çerçevesini yönetir.

18. Zaman ve enerji

Time Engine doğrudan enerji puanı hesaplamak zorunda değildir.

Ama şu event’leri üretir:

LONG_TRAVEL_COMPLETED
OVERNIGHT_REST_COMPLETED
EXTENDED_ACTIVITY_COMPLETED

Character State veya Capability sistemleri bunları değerlendirebilir.

19. Offline süre

Offline süre:

current_real_time
− last_active_real_time

ile hesaplanır.

Ancak bu fark doğrudan world time’a eklenmez.

Önce offline policy uygulanır.

20. Offline zaman profili

Daha önce birlikte kabul ettiğimiz yaklaşım:

0–3 gün:
normal ama düşük yoğunluklu güvenli simülasyon

4–7 gün:
azaltılmış simülasyon

8–10 gün:
yalnızca küçük hazırlık ve düşük etkili gelişmeler

10 günden fazla:
dünya statik kalır

Bu sistem artık merkezi olarak Time Engine tarafından yönetilmelidir.

21. Offline simulation window
type OfflineSimulationWindow = {
  realAbsenceMinutes: number

  simulatedWorldMinutes: number

  intensity:
    | "none"
    | "minimal"
    | "reduced"
    | "normal_safe"

  freezeApplied: boolean
}

Örnek:

14 günlük gerçek yokluk

simulated:
yalnızca ilk 10 güne karşılık gelen sınırlı dünya ilerlemesi

sonraki 4 gün:
freeze
22. Gerçek gün ile dünya günü eşit olmak zorunda değildir

Örneğin 7 günlük yokluk:

7 world day

üretmek zorunda değildir.

Yoğunluk azaltmak için:

1–3 gerçek gün:
0.75 dünya günü / gerçek gün

4–7 gerçek gün:
0.35 dünya günü / gerçek gün

8–10 gerçek gün:
0.10 dünya günü / gerçek gün

gibi sıkıştırılmış dönüşüm kullanılabilir.

Bu sayılar ayarlanabilir.

23. Örnek offline dönüşüm
Gerçek yokluk:
8 gün

Örnek simülasyon:

İlk 3 gün:
2.25 dünya günü

Sonraki 4 gün:
1.40 dünya günü

8. gün:
0.10 dünya günü

Toplam:
3.75 dünya günü

Böylece dünya biraz ilerler ama kullanıcı çok şey kaçırmaz.

24. Offline intensity curve
type OfflineIntensitySegment = {
  fromRealDay: number
  toRealDay: number

  worldTimeMultiplier: number
  allowedEventClasses: string[]
}

Örnek:

[
  {
    fromRealDay: 0,
    toRealDay: 3,
    worldTimeMultiplier: 0.75,
    allowedEventClasses: [
      "routine",
      "preparation",
      "recovery",
      "minor_world_change"
    ]
  },
  {
    fromRealDay: 3,
    toRealDay: 7,
    worldTimeMultiplier: 0.35,
    allowedEventClasses: [
      "routine",
      "preparation",
      "recovery"
    ]
  },
  {
    fromRealDay: 7,
    toRealDay: 10,
    worldTimeMultiplier: 0.10,
    allowedEventClasses: [
      "minimal_preparation",
      "safe_recovery"
    ]
  }
]
25. Freeze sonrası durum

10 günü aşan sürede:

- NPC rutinleri ilerlemez,
- görevler ilerlemez,
- hava zinciri ilerlemez,
- eşya decay işlemez,
- ilişki değişmez,
- yeni event oluşmaz.

Dünya son güvenli snapshot’ta kalır.

26. Neden freeze gerekli?

Bu karar kullanıcı deneyimini korur.

Aksi hâlde kullanıcı geri geldiğinde:

NPC’ler taşınmış,
görevler kapanmış,
mevsim değişmiş,
eşyalar bozulmuş,
harita dönüşmüş

olabilir.

Bu da:

Ben en son ne yapıyordum, bunlar neden oldu?

hissine yol açar.

Freeze bu karmaşayı engeller.

27. Offline simülasyon yasakları

Oyuncu yokken şu olaylar tamamlanmamalıdır:

ana karakter ölümü,
sevilen NPC’nin ağır yaralanması,
ana görevin başarısız olması,
kritik seçim yapılması,
büyük yerleşim yıkımı,
geri döndürülemez ilişki kopuşu,
benzersiz eşya kaybı,
büyük gizemin çözülmesi,
oyuncuya ait kararın NPC tarafından verilmesi.
28. Offline izinli olaylar

İzinli örnekler:

hafif yaralanmanın iyileşmesi,
basit tamir hazırlığı,
kaynak toplama,
NPC rutinleri,
mektup bırakılması,
hava değişikliği,
küçük dekoratif dünya değişimi,
görev için ön hazırlık,
güvenli konuma dönme.
29. Pending player event

Bir olay kritik aşamaya geldiğinde durmalıdır.

type PendingPlayerEvent = {
  id: string

  sourceEventId: string
  description: string

  waitingDecisionType: string
  availableChoiceIds: string[]

  createdAtWorldTime: number
  expires: false
}

Örnek:

Köprü malzemeleri hazırlandı.
Ama hangi tasarımın kullanılacağı oyuncuyu bekliyor.
30. Pending event baskı oluşturmamalıdır

Yanlış:

Hemen karar vermezsen köprü çökecek.

Doğru:

Köylüler iki güvenli yöntem hazırladı. Ne zaman isterseniz birini seçebilirsiniz.

Varsayılan pending event süresiz bekler.

31. World Event nedir?

World Event, belirli bir başlangıcı, yaşam döngüsü ve etkileri olan kanonik dünya olayıdır.

Örnek:

festival,
fırtına,
göç,
köprü onarımı,
ay tutulması,
pazar günü,
limana gelen gemi,
mevsim dönüşü,
büyülü çiçeklenme.
32. World Event modeli
type WorldEvent = {
  id: string
  eventType: string

  scopeType:
    | "world"
    | "region"
    | "location"
    | "route"
    | "character_group"

  scopeId: string

  status:
    | "scheduled"
    | "announced"
    | "preparing"
    | "active"
    | "paused"
    | "resolved"
    | "cancelled"
    | "expired"

  startConditionIds: string[]
  resolutionConditionIds: string[]

  scheduledWorldTime?: number
  expectedDurationMinutes?: number

  offlinePolicy: WorldEventOfflinePolicy
  playerGate: boolean

  effectIds: string[]
  participantIds: string[]
}
33. World Event lifecycle
Scheduled
↓
Announced
↓
Preparing
↓
Active
↓
Resolved

Alternatif geçişler:

Preparing → Paused
Active → Paused
Scheduled → Cancelled
Active → Cancelled
34. Scheduled event

Henüz başlamamış ama zamanı veya koşulu belirli olaydır.

Örnek:

Ay Işığı Festivali:
Dünya günü 50, akşam.

Bu event hemen hikâyeye girmez.

35. Announced event

Karakterler olayın yaklaştığını biliyor olabilir.

Festival üç gün sonra.

Bu bilgi:

NPC diyaloglarında,
haritada,
görevlerde,
hazırlık faaliyetlerinde

görünebilir.

36. Preparing state

Hazırlık dönemi yaşayan dünya hissi verir.

Örnek:

süslemeler asılır,
NPC’ler malzeme toplar,
sahne kurulur,
görevler açılır.

Oyuncu isterse katkı sağlayabilir.

37. Active state

Olay aktifken:

konum affordance’ları değişebilir,
NPC rutinleri değişebilir,
yeni hikâye fırsatları açılabilir,
özel görseller ve sesler kullanılabilir.
38. Resolved state

Olay bittikten sonra sonuçları kalır.

Örnek:

Festival bitti.
Ama meydanda yeni bir arkadaşlık ağacı dikildi.

Event kaybolmaz; history kaydına geçer.

39. Event scheduling
type EventSchedule = {
  scheduleType:
    | "absolute_world_time"
    | "relative_world_time"
    | "condition_based"
    | "recurring"
    | "story_triggered"

  scheduledAt?: number
  delayMinutes?: number

  conditionIds?: string[]
  recurrenceRuleId?: string
}
40. Condition-based event

Bazı event’ler belirli tarihte değil, koşulla başlar.

Örnek:

Köprü malzemelerinin tamamı toplandığında onarım hazırlığı başlar.

Bu zaman tabanlı değil, state tabanlıdır.

41. Recurring event

Tekrarlayan olaylar:

pazar günü,
mevsimsel kuş göçü,
gece parlayan çiçekler,
haftalık liman teknesi.
type RecurrenceRule = {
  frequency:
    | "daily"
    | "weekly"
    | "seasonal"
    | "custom"

  interval: number
  allowedDayPeriods?: DayPeriod[]
}
42. Recurring event ve kaçırma baskısı

Çocuk olayı kaçırdığı için cezalandırılmamalıdır.

Çözümler:

olay tekrar eder,
özel sürüm daha sonra açılır,
offline iken kritik kısmı başlamaz,
event pending player durumuna alınır,
hikâye içi takvim kullanıcıya göre esnetilir.
43. Event window
type WorldEventWindow = {
  opensAtWorldTime: number
  closesAtWorldTime?: number

  windowType:
    | "hard"
    | "soft"
    | "repeatable"
    | "player_preserved"
}
Hard

Dünya kuralı gereği gerçekten kapanır.

Çok sınırlı kullanılmalıdır.

Soft

En uygun zaman geçer ama alternatif yol kalır.

Repeatable

Sonraki döngüde tekrar gelir.

Player preserved

Oyuncu katılana kadar kritik aşama bekler.

44. Player-preserved event

LUMI için güçlü varsayılanlardan biridir.

Örnek:

İlk Ay Festivali

Oyuncu 6 gün yoksa:

hazırlık yapılabilir,
meydan süslenebilir,
NPC’ler bekleyebilir,
festivalin ana anı oyuncu gelene kadar başlamaz.

Bu, dünya durmadı hissini korurken kaçırma korkusunu engeller.

45. Aciliyet ve zaman baskısı

Aciliyet hikâyesel olabilir.

Ama gerçek zaman baskısı yaratmamalıdır.

Hikâye içi aciliyet:
Yağmur başlamadan çatı örtülmeli.

Gerçek zaman baskısı:
Uygulamaya bir saat içinde dönmezsen görev biter.

İkinci yaklaşım kullanılmamalıdır.

46. Urgency modeli
type EventUrgency = {
  level:
    | "none"
    | "low"
    | "moderate"
    | "high"

  basis:
    | "world_condition"
    | "character_need"
    | "weather"
    | "story_arc"

  advancesOnlyDuringActivePlay: boolean
}

Varsayılan olarak yüksek aciliyet bile aktif oyun sırasında ilerlemelidir.

47. Countdown görünürlüğü

Çocuk arayüzünde:

2 saat 14 dakika kaldı

gibi sayaçlar kullanılmamalıdır.

Daha uygun:

Yağmur yaklaşmadan önce
Akşam olmadan
Bir sonraki gelgitten önce

Bunlar hikâye içi zaman ifadeleridir.

48. Zaman pencereli erişim

Örnek:

Ay Bahçesi yalnızca gece görünür.

Çocuk öğlen gitmek isterse:

geceyi bekleyebilir,
başka hazırlık yapabilir,
geceye kadar yan görev oynayabilir.

Bu dead end olmamalıdır.

49. NPC routine scheduling

NPC rutinleri Time Engine’den günün dönemini alır.

type ScheduledNpcActivity = {
  characterId: string
  dayPeriod: DayPeriod

  preferredLocationId: string
  activityType: string

  priority: number
  interruptible: boolean
}

Decision Engine, rutini hedefler ve olaylarla birlikte değerlendirir.

50. Rutinin deterministik olması

Aynı state ve aynı random seed ile NPC aynı rutini seçmelidir.

Bu replayability için önemlidir.

Rastgele varyasyonlar seed’e bağlı olmalıdır.

51. Routine conflict

Bir NPC’nin aynı zamanda:

festival hazırlığı,
kişisel görev,
normal rutin

adayı olabilir.

Decision Engine bunları önceliklendirir.

Time Engine yalnızca zaman uygunluğunu bildirir.

52. Time-aware NPC decision context
type TimeDecisionContext = {
  currentWorldTime: number
  currentDayPeriod: DayPeriod
  currentSeason: string

  upcomingEventIds: string[]
  activeEventIds: string[]

  availableTimeWindowMinutes: number
}
53. NPC gecikmeleri

NPC her programa tam zamanında uymak zorunda değildir.

Küçük gecikmeler doğal olabilir.

Ama gecikme:

goal,
event,
hava,
ilişki,
önceki eylem

ile açıklanmalıdır.

54. Event participant availability

World Event başlamadan önce katılımcılar doğrulanmalıdır.

Örnek:

Denizci festivalde konuşma yapacak.

Ama Denizci başka bölgede veya yaralıysa event planı değişebilir.

Alternatif:

başka konuşmacı,
mektup,
event gecikmesi,
program değişikliği.
55. Event preparation goals

World Event kendi alt hedeflerini oluşturabilir.

Festival için:
- ışıkları yerleştir,
- sahneyi hazırla,
- müziği seç,
- karakterleri davet et.

Bu hedefler Quest Engine’e gönderilir.

Time Engine yalnızca hazırlık penceresini yönetir.

56. Event ve quest ayrımı
World Event:
Festival gerçekleşiyor.

Quest:
Festival ışıklarını hazırlamaya yardım et.

Oyuncu görevi yapmasa bile festival farklı biçimde gerçekleşebilir.

Ancak önemli oyuncu katkısı state’te görünmelidir.

57. Event effect
type WorldEventEffect = {
  id: string

  targetType:
    | "location"
    | "route"
    | "character"
    | "weather"
    | "quest"
    | "affordance"
    | "map_marker"

  targetId: string

  effectType:
    | "add"
    | "remove"
    | "modify"
    | "schedule"
    | "unlock"
    | "block"

  payload: Record<string, unknown>
}
58. Geçici ve kalıcı event etkileri
Geçici
meydan kalabalık,
pazar açık,
rota yoğun,
özel müzik.
Kalıcı
yeni landmark,
ilişki hatırası,
onarılmış yapı,
açılmış rota,
dikilmiş ağaç.

Her effect’in süresi açık olmalıdır.

59. Event effect duration
type EffectDuration =
  | {
      type: "instant"
    }
  | {
      type: "until_event_resolved"
    }
  | {
      type: "world_minutes"
      duration: number
    }
  | {
      type: "permanent"
    }
60. Event çakışması

Aynı konumda iki event çakışabilir.

Örnek:

Festival
+
şiddetli yağmur

Sistem şu seçenekleri değerlendirebilir:

festival içeri alınır,
ertelenir,
hava temalı alternatif oluşur,
hazırlık uzar.

Event’ler birbirini yok saymamalıdır.

61. Event conflict resolution
type EventConflictResolution = {
  eventIds: string[]

  resolutionType:
    | "merge"
    | "delay"
    | "prioritize"
    | "transform"
    | "cancel_lower_priority"

  resultingEventIds: string[]
}
62. Event merge

Örnek:

Yağmur
+
Fener Festivali

dönüşebilir:

Kapalı Değirmen Fener Buluşması

Bu yeni event, iki olayın kanonik etkilerini korur.

63. Event priority
Event Priority =
World Importance
+ Story Relevance
+ Character Relevance
+ Player Commitment
+ Safety
− Conflict Cost

Oyuncunun aktif olarak hazırladığı event kolayca iptal edilmemelidir.

64. Seasonal events

Mevsimsel olaylar:

çiçeklenme,
yaprak dökümü,
ilk kar,
göç,
hasat,
deniz ışıkları.

Bunlar hikâye fırsatı üretir.

Ancak gerçek dünya mevsimine bağlı olmak zorunda değildir.

65. Özel günler

LUMI kendi evrenine özgü özel günler taşıyabilir.

Örnek:

Ay Işığı Gecesi
İlk Rüzgâr Bayramı
Harita Günü
Dostluk Fenerleri

Bu günler:

kanonik tarih,
hazırlık,
gelenek,
NPC davranışı

taşır.

66. Kültürel varsayım sınırı

Gerçek dünyadaki bayram ve gelenekler otomatik olarak çocuğun profiline atanmaz.

Yalnızca:

ebeveyn seçimi,
açık kullanıcı tercihi,
genel fantastik dünya kültürü

üzerinden kullanılmalıdır.

67. Event discovery

Oyuncu her event’i baştan bilmeyebilir.

type EventKnowledgeState =
  | "unknown"
  | "rumored"
  | "announced"
  | "observed"
  | "participated"

World Event mevcut olabilir ama oyuncunun journal’ında görünmeyebilir.

68. Event notification

Kullanıcıya uygulama dışında bildirim gönderilecekse:

suçluluk oluşturmaz,
aciliyet baskısı kurmaz,
karakteri çaresiz göstermez,
satın alma çağrısı içermez.

Uygun:

Ay Işığı Festivali için hazırlıklar tamamlandı. Döndüğünde kaldığın yerden devam edebilirsin.

Uygun olmayan:

Tilki seni bekliyor. Hemen dönmezsen festival bitecek.

69. Bildirim ve kanonik state

Bildirim yalnızca gerçekten oluşmuş veya planlanmış world event’e dayanmalıdır.

Pazarlama amacıyla sahte aciliyet üretilmemelidir.

70. Story session boundary

Bir oturum sona ererken Time Engine güvenli bir durak noktası belirlemelidir.

type TemporalCheckpoint = {
  worldTime: number
  storyId: string

  checkpointType:
    | "scene_end"
    | "safe_location"
    | "travel_stop"
    | "overnight_rest"
    | "pending_decision"

  resumable: boolean
}
71. Güvenli oturum sonu

Oturum:

aktif tehlikenin ortasında,
çözülmemiş ağır gerilimde,
karakter düşerken,
kritik seçim sonucu belirlenmeden

bitmemelidir.

Gerekirse kısa safe closure eklenir.

72. Cliffhanger politikası

Cliffhanger kullanılabilir ama yaş ve mod sınırlarına uyar.

Uyku modunda:

açık tehlike cliffhanger yok

Normal modda:

merak cliffhanger olabilir

Örnek:

Haritanın arkasında daha önce görmedikleri küçük bir sembol vardı.

Bu güvenli bir merak sonudur.

73. Resume context

Dönüşte sistem şunları bilmelidir:

- world time,
- story checkpoint,
- son güvenli konum,
- pending events,
- active quests,
- yakın yaklaşan event’ler,
- offline simülasyon özeti.
74. Return recap

Uzun aradan sonra özet:

En son:
Kuzey yolunun sembolünü bulmuştunuz.

Bu sırada:
Köylüler köprü için tahtaları hazırladı.
Tilki’nin patisi iyileşti.

Bekleyen:
Köprünün nasıl onarılacağına karar vermeniz gerekiyor.

Bu özet yalnızca kanonik değişiklikleri içerir.

75. Offline recap bütçesi

Çok fazla küçük olay listelenmemelidir.

Öncelik:

Player relevance
Quest relevance
Character relevance
World visibility

Düşük değerli rutinler özetlenir veya atlanır.

76. Temporal consistency

Aşağıdaki çelişkiler engellenmelidir:

- gece olan sahnede güneşli öğle anlatımı,
- karakter aynı saatte iki etkinlikte,
- festival başlamadan bitti olarak görünmesi,
- üç saatlik yolculuğun beş dakikada tamamlanması,
- dünya günü geri gitmesi,
- henüz başlamamış event’in ödül vermesi,
- 10 günlük freeze sonrası ilerleme oluşması.
77. Time monotonicity

Normal kanonik akışta world time geriye gidemez.

newWorldTime >= previousWorldTime

İstisnalar:

flashback,
memory replay,
dream,
simulation preview.

Bunlar ayrı temporal context kullanır.

78. Event temporal invariant
scheduledAt <= activeAt <= resolvedAt

Varsa:

announcedAt <= activeAt
preparingAt <= activeAt

olmalıdır.

79. Time transaction
BEGIN TRANSACTION

- validate requested time advance
- determine crossed time boundaries
- activate scheduled events
- evaluate event progress
- evaluate NPC routines
- run safe world simulation
- apply quest and location time effects
- create pending player events
- update world clock
- generate temporal recap entries

COMMIT
80. Crossed boundary evaluation

Zaman ilerlerken şu sınırlar kontrol edilir:

gün dönümü,
day period değişimi,
mevsim değişimi,
event başlangıcı,
event bitişi,
NPC routine slot’u,
temporal access window,
item expiry,
quest soft deadline.
81. Büyük zaman sıçraması

Örneğin 48 saatlik zaman ilerlemesi tek adımda uygulanmamalıdır.

İçeride uygun checkpoint’lere bölünmelidir.

Akşam
↓
Gece
↓
Yeni gün
↓
Sabah event’i
↓
Öğleden sonra

Bu, event kaçırmayı engeller.

82. Temporal stepping
type TemporalStepPolicy = {
  maximumStepMinutes: number
  splitAtDayPeriodBoundaries: boolean
  splitAtScheduledEvents: boolean
  splitAtPlayerGates: boolean
}
83. Deterministic event ordering

Aynı world time’da birden fazla olay varsa sıralama kurallı olmalıdır.

Örnek sıra:

1. Hard safety events
2. Clock boundary
3. Scheduled world events
4. Active quest events
5. NPC routines
6. Environmental updates
7. Cosmetic events

Aynı priority’de stable ID sırası veya deterministic seed kullanılabilir.

84. Event queue
type ScheduledWorldEventQueueItem = {
  eventId: string
  scheduledWorldTime: number

  priority: number
  insertionOrder: number
}

Queue deterministik olmalıdır.

85. Cancelled events

Event iptal edildiğinde neden kaydedilmelidir.

type EventCancellation = {
  eventId: string

  reasonType:
    | "world_condition_changed"
    | "safety"
    | "conflict"
    | "story_obsolete"
    | "manual_parent_action"

  replacementEventId?: string
}

Oyuncunun katkısı varsa mümkünse alternatif event oluşturulmalıdır.

86. Expired ve cancelled ayrımı
Cancelled:
Olay artık gerçekleşmeyecek.

Expired:
Olayın doğal zaman penceresi geçti.

Player-preserved event’ler varsayılan olarak expire olmamalıdır.

87. Event rollback

Commit edilmiş büyük event normal akışta geri alınmamalıdır.

Teknik hata durumunda event sourcing ile replay yapılabilir.

Kullanıcı tercihi değişti diye geçmiş festival silinmez.

88. Event history
type WorldEventHistoryEntry = {
  eventId: string
  eventType: string

  startedAtWorldTime?: number
  resolvedAtWorldTime?: number

  participantIds: string[]
  playerContributionEventIds: string[]

  resultingWorldChangeIds: string[]
}

Bu history:

recap,
callback,
map changes,
memory,
anniversary-like story hooks

için kullanılabilir.

89. Yıldönümü benzeri callback

Dünya takviminde önceki olaylara referans verilebilir.

Örnek:

Geçen Ay Işığı Gecesi’nde dikilen küçük ağaç artık büyümüştü.

Bu gerçek dünya yılına bağlı olmak zorunda değildir.

90. Event callback cooldown

Aynı geçmiş event çok sık anılmamalıdır.

Story Planner callback cooldown kullanmalıdır.

91. Zaman ve Memory Engine

Time Engine şu bilgileri sağlar:

olay ne zaman oldu,
üzerinden ne kadar dünya zamanı geçti,
olayın sırası,
yakın veya uzak geçmiş.

Memory Engine unutma ve salience hesabında bunu kullanır.

92. Zaman ve Emotion Engine

Emotion decay veya recovery zaman üzerinden hesaplanabilir.

Ancak:

Time Engine yalnızca geçen süreyi verir,
Emotion Engine kendi decay eğrisini uygular.
93. Zaman ve Relationship Engine

İlişkiler yalnızca süre geçti diye otomatik düşmemelidir.

Time Engine:

last interaction’dan beri geçen süre

bilgisini sağlar.

Relationship Engine bağlama göre etkiler.

94. Zaman ve Quest Engine

Quest Engine şu temporal verileri kullanır:

aktif zaman penceresi,
soft deadline,
offline policy,
stage wait duration,
hazırlık tamamlanma zamanı.

Time Engine görev sonucunu tek başına belirlemez.

95. Zaman ve Inventory Engine

Inventory Engine:

geçici item expiry,
recharge,
kuruma,
bozulma,
crafting duration

için zamanı kullanabilir.

Ancak 10 günlük freeze sonrasında decay işlemez.

96. Zaman ve Map Engine

Map Engine:

günün zamanı,
hava,
gelgit,
sezon,
rota penceresi

için Time Engine’e bağımlıdır.

97. Zaman ve Story Planner

Story Planner şu bağlamı almalıdır:

type TemporalPlannerContext = {
  currentWorldTime: number
  dayPeriod: DayPeriod
  seasonId: string

  availableStoryTimeMinutes: number

  upcomingEventIds: string[]
  activeEventIds: string[]
  pendingPlayerEventIds: string[]

  safeCheckpointRequired: boolean
}
98. Available story time

Ebeveyn veya mod:

10 dakikalık hızlı hikâye
20 dakikalık normal hikâye
uyku hikâyesi

seçebilir.

Bu gerçek oturum bütçesidir.

Planner bunu story time ile eşleştirir.

Örnek:

10 dakikalık okuma
→ dünya içinde bir sabahı kapsayabilir.
99. Story duration budget
type StoryDurationBudget = {
  realReadingMinutes: number
  expectedWorldMinutes: number

  maximumScenes: number
  requireSafeEnding: boolean
}
100. Hikâye süresi dolduğunda

Planner:

kritik kararı yarım bırakmamalı,
güvenli checkpoint oluşturmalı,
event’i pending yapmalı,
kısa recap üretmelidir.
101. Bedtime temporal policy

Uyku modunda:

dünya zamanı gece olmak zorunda değildir,
ama anlatı temposu sakinleşir,
uzun travel yapılmaz,
kritik world event başlatılmaz,
açık gerilimle bitirilmez,
güvenli dinlenme veya durak noktası tercih edilir.
102. Ebeveyn zaman kontrolleri
type ParentTimeControls = {
  maximumSessionMinutes?: number

  allowedUsageWindows?: {
    startLocalTime: string
    endLocalTime: string
  }[]

  bedtimeModeAfter?: string

  offlineSimulationEnabled: boolean
  offlineSimulationMaxDays: number
}

Bu kontroller real time katmanına aittir.

103. Kullanım süresi ve karakter tepkisi

Kullanım süresi dolduğunda karakter:

çocuğu suçlamamalı,
“gitme” dememeli,
bağımlılık dili kullanmamalıdır.

Uygun:

Lumi ve Tilki güvenli bir yerde durdu. Maceraya başka bir zaman devam edebilirlerdi.

104. Event generator

Yeni world event adayları şu kaynaklardan doğabilir:

dünya durumu,
mevsim,
NPC hedefleri,
tamamlanan görev,
konum dönüşümü,
story arc,
authored schedule,
çocuk fikri.
105. Event candidate
type WorldEventCandidate = {
  eventType: string
  scopeId: string

  triggerReason: string
  storyValue: number
  worldValue: number
  characterValue: number

  urgency: number
  safetyRisk: number
  repetitionRisk: number

  proposedSchedule: EventSchedule
}
106. Event candidate scoring
Event Score =
World Relevance
+ Character Relevance
+ Story Arc Relevance
+ Player Interest
+ Seasonal Fit
+ Novelty
− Repetition
− Safety Risk
− Active Event Load
107. Event load

Aynı anda çok fazla aktif world event olmamalıdır.

type WorldEventLoadBudget = {
  maximumActiveMajorEvents: number
  maximumActiveMinorEvents: number
  maximumPreparingEvents: number
}

MVP için örnek:

1 büyük event
2–3 küçük event
108. Event density

Çok sık event:

dünyayı kaotik yapar,
görevleri böler,
önemli olayları değersizleştirir.

Az event:

dünya statik hissedilir.

Denge:

rutin değişimler
+
az sayıda anlamlı event
+
görünür hazırlık

olmalıdır.

109. Quiet world periods

Dünya her zaman büyük olay yaşamamalıdır.

Sessiz dönemlerde:

NPC rutinleri,
küçük tamirler,
sakin keşif,
ilişki sahneleri,
öğrenme hikâyeleri

öne çıkabilir.

110. Event chain

Bazı event’ler zincir oluşturabilir.

Nehir yükseliyor
↓
Köprü kontrolü
↓
Geçici rota planı
↓
Yağmur sonrası onarım

Her aşama ayrı event olabilir.

Ama bu zincir çocuğu sürekli kriz içinde bırakmamalıdır.

111. Event escalation
type EventEscalationStage = {
  eventId: string

  level:
    | "signal"
    | "preparation"
    | "active_problem"
    | "critical"
    | "recovery"

  entryConditions: GoalCondition[]
}

Safety profile küçük yaşta critical aşamayı engelleyebilir veya yumuşatabilir.

112. Recovery phase

Büyük event’ten sonra recovery gerekir.

Örnek:

Fırtına bitti
↓
hasar kontrolü
↓
birlikte temizlik
↓
güvenli kutlama veya dinlenme

Dünya hemen yeni krize geçmemelidir.

113. Temporal safety debt

Zaman içinde art arda yüksek gerilimli event’ler oluşursa safety debt artar.

Time Engine aktif event takvimini Safety Engine’e verir.

Planner yeni yoğun event eklemeyi geciktirebilir.

114. Event ve child absence

Çocuk bir event hazırlığına başladıktan sonra uzun süre yoksa:

hazırlık korunur,
NPC’ler küçük işler yapabilir,
ana an oyuncuyu bekler,
event unutulmaz,
çocuk geri geldiğinde recap verilir.
115. Abandoned event yok

Kullanıcı yokluğu tek başına şu sonucu üretmemelidir:

Festival iptal edildi çünkü gelmedin.

Bu suçluluk yaratır.

Event iptal olacaksa dünya içi bağımsız ve açık nedeni olmalıdır.

116. Time versioning
type VersionedWorldClock = {
  worldTimeVersion: number
  worldMinute: number
}

Her time advance işlemi beklenen version ile yapılır.

Bu concurrency hatalarını önler.

117. Temporal snapshot

Story generation öncesi zaman snapshot’ı alınır.

type TemporalSnapshot = {
  worldTimeVersion: number

  worldMinute: number
  dayPeriod: DayPeriod
  seasonId: string

  activeEventIds: string[]
  upcomingEventIds: string[]
  pendingPlayerEventIds: string[]
}

Narrative oluşturulurken zaman state’i değişirse sonuç yeniden doğrulanmalıdır.

118. Time delta
type TimeStateDelta = {
  previousWorldMinute: number
  resultingWorldMinute: number

  crossedDayPeriodIds: DayPeriod[]
  activatedEventIds: string[]
  progressedEventIds: string[]
  resolvedEventIds: string[]

  createdPendingEventIds: string[]
}
119. Time advance validation

Kontroller:

- negatif zaman ilerlemesi var mı?
- requested duration izinli mi?
- player gate atlanıyor mu?
- event başlangıç sınırı geçiliyor mu?
- 10 günlük freeze ihlal ediliyor mu?
- çocuk güvenliği açısından ağır event otomatik ilerliyor mu?
- başka transaction aynı world time version’ı değiştirdi mi?
120. Time and narrative parity

Narrative:

Ertesi sabah...

Ama world state:

aynı gün, öğleden sonra

olamaz.

Narrative Context açık zaman bilgisi taşımalıdır.

121. Relative time language

Çocuğa gösterilen dil:

biraz sonra
akşam olduğunda
ertesi sabah
iki gün sonra

olabilir.

Ama bunlar kanonik world time delta’dan türetilmelidir.

122. Belirsiz süreler

Narrative:

Uzun bir süre yürüdüler.

Bu ifadenin arkasında yaklaşık kanonik süre olmalıdır.

Örneğin:

75 dakika

Narrative kesin sayıyı söylemek zorunda değildir.

123. Event observability
type TemporalTrace = {
  traceId: string
  correlationId: string

  previousWorldTime: number
  requestedAdvanceMinutes: number
  appliedAdvanceMinutes: number

  activatedEventIds: string[]
  blockedEventIds: string[]

  offlinePolicySegmentIds: string[]
  freezeApplied: boolean

  validationFindings: string[]
}
124. Time domain events
WORLD_TIME_ADVANCED
DAY_PERIOD_CHANGED
WORLD_DAY_CHANGED
SEASON_CHANGED

OFFLINE_SIMULATION_STARTED
OFFLINE_SIMULATION_COMPLETED
OFFLINE_FREEZE_APPLIED

WORLD_EVENT_SCHEDULED
WORLD_EVENT_ANNOUNCED
WORLD_EVENT_PREPARATION_STARTED
WORLD_EVENT_ACTIVATED
WORLD_EVENT_PAUSED
WORLD_EVENT_RESUMED
WORLD_EVENT_RESOLVED
WORLD_EVENT_CANCELLED

PLAYER_EVENT_PENDING
TEMPORAL_CHECKPOINT_CREATED
125. Idempotency

Aynı time advance request iki kez uygulanmamalıdır.

type TemporalOperationKey = {
  requestId: string
  sourceType: string
}

Aynı offline return işlemi tekrar çalışırsa dünya bir kez daha ilerlememelidir.

126. Offline simulation idempotency
type OfflineSimulationRecord = {
  profileId: string

  absenceStartedAtRealTime: number
  simulationProcessedUntilRealTime: number

  resultingWorldTimeVersion: number
}

Böylece uygulama yeniden açılırsa aynı süre tekrar simüle edilmez.

127. Çoklu çocuk profili

Ayrı evrenlerde her profil ayrı world clock taşıyabilir.

Paylaşılan evrende tek world clock bulunur.

Ancak çocuklar farklı zamanlarda giriş yaptığında:

event ownership,
pending decisions,
shared story checkpoints

dikkatle yönetilmelidir.

128. Shared universe time
type SharedUniverseTimePolicy =
  | "active_session_only"
  | "host_profile_driven"
  | "shared_safe_offline"

MVP için en güvenlisi:

active_session_only

veya çok sınırlı shared_safe_offline olabilir.

129. Gerçek dünyadaki saat dilimi

Parent controls ve bildirimler için kullanıcı saat dilimi gerekir.

Ama dünya takvimi bundan bağımsızdır.

Local Time:
Europe/Istanbul

World Time:
LUMI Day 42, Evening
130. Yaz saati ve zaman değişiklikleri

Gerçek saat değişiklikleri world time’ı bozmaz.

Offline süre hesaplanırken güvenilir UTC timestamp kullanılmalıdır.

131. LLM rolü

LLM şunları önerebilir:

event adı,
festival atmosferi,
zaman geçişi anlatımı,
child-friendly recap,
event fikri.

Ama şunları belirleyemez:

world clock değeri,
event’in gerçekten başlayıp başlamadığı,
offline simülasyon süresi,
player gate sonucu,
season transition,
event resolution.
132. MVP Time Engine

İlk sürümde şu özellikler yeterlidir:

1. Real, session, story ve world time ayrımı
2. Merkezi WorldClock
3. Day period sistemi
4. Scene ve travel duration
5. Time compression
6. Explicit waiting ve rest
7. Dört kademeli offline policy
8. 10 günden sonra freeze
9. Scheduled ve condition-based world events
10. Player-preserved event
11. Pending player event
12. NPC routine time context
13. Temporal checkpoint
14. Return recap
15. Time, event ve narrative parity validation
16. Idempotent time advance
133. MVP WorldClock
type CoreWorldClock = {
  universeId: string

  worldMinute: number
  dayPeriod: DayPeriod
  seasonId: string

  version: number
}
134. MVP World Event
type CoreWorldEvent = {
  id: string
  eventType: string

  scopeId: string

  status:
    | "scheduled"
    | "preparing"
    | "active"
    | "paused"
    | "resolved"
    | "cancelled"

  scheduledWorldMinute?: number

  playerGate: boolean

  offlinePolicy:
    | "freeze"
    | "prepare_only"
    | "safe_progress"
    | "player_preserved"

  effectIds: string[]
}
135. MVP offline profile
type CoreOfflinePolicy = {
  segments: {
    maximumRealDays: number
    worldTimeMultiplier: number
    allowedEventClasses: string[]
  }[]

  absoluteFreezeAfterRealDays: number
}

Önerilen varsayılan:

{
  segments: [
    {
      maximumRealDays: 3,
      worldTimeMultiplier: 0.75,
      allowedEventClasses: [
        "routine",
        "preparation",
        "recovery",
        "minor"
      ]
    },
    {
      maximumRealDays: 7,
      worldTimeMultiplier: 0.35,
      allowedEventClasses: [
        "routine",
        "preparation",
        "recovery"
      ]
    },
    {
      maximumRealDays: 10,
      worldTimeMultiplier: 0.10,
      allowedEventClasses: [
        "minimal_preparation",
        "safe_recovery"
      ]
    }
  ],

  absoluteFreezeAfterRealDays: 10
}
136. MVP ana işlemler
loadWorldClock()

requestTimeAdvance()

splitTemporalSteps()

advanceWorldTime()

calculateDayPeriod()

evaluateScheduledEvents()

evaluateConditionBasedEvents()

progressWorldEvents()

createPendingPlayerEvent()

resolvePendingPlayerEvent()

runOfflineSimulation()

applyOfflineFreeze()

createTemporalCheckpoint()

buildReturnRecap()

validateTemporalState()
137. Örnek aktif zaman akışı

Başlangıç:

Dünya:
42. gün, öğleden sonra

Görev:
Kuzey Kulesi’ne git

Yolculuk:
90 dakika

Akış:

Travel request
↓
90 dakika doğrulandı
↓
akşam sınırı geçildi
↓
evening event’leri değerlendirildi
↓
Baykuş rutini güncellendi
↓
kuleye varış commit edildi

Sonuç:

Dünya:
42. gün, akşam

Baykuş:
kütüphaneye geçti

Kule:
gece affordance’ları aktif

Narrative:
Akşam ışığı kule taşlarının üzerine düşerken oraya ulaştılar.
138. Örnek offline akış

Başlangıç:

Son giriş:
12 gün önce

Aktif görev:
Köprü onarımı

Tilki:
hafif yaralı

Festival:
hazırlık aşamasında
player_preserved

Sonuç:

- İlk 10 güne sınırlı simülasyon uygulanır.
- Sonraki 2 gün freeze edilir.
- Tilki iyileşir.
- Köprü malzemeleri hazırlanır.
- Tasarım kararı pending player olur.
- Festival ana aşamaya geçmez.
- Büyük dünya değişimi oluşmaz.

Dönüş özeti:

Sen yokken Tilki dinlenip iyileşti. Köylüler köprü için gerekli tahtaları hazırladı. Festival süslemeleri de tamamlandı. Şimdi köprü için iki güvenli yöntemden birini seçebilirsiniz.

139. Örnek player-preserved event

Event:

Ay Işığı Festivali

Durum:

scheduled → preparing

Oyuncu 5 gün yok.

Offline sonuç:

- fenerler hazırlandı,
- meydan süslendi,
- karakterler davet edildi,
- festivalin ana gecesi başlamadı.

Oyuncu döndüğünde:

pending_player_event

aktif olur.

140. Örnek zaman penceresi

Konum:

Ay Bahçesi

Kural:

yalnızca gece visible

Oyuncu öğleden sonra gitmek ister.

Sistem:

Şu anda bahçe görünmüyor.

Alternatifler:

1. Geceye kadar değirmende yardım et
2. Yakındaki gölü keşfet
3. Güvenli yerde bekle
141. Örnek event çakışması

Aktif adaylar:

Köy festivali
Şiddetli yağmur

Sistem değerlendirmesi:

Açık alan festivali güvenli değil.

Dönüşüm:

Değirmen İçinde Fener Buluşması

State etkileri:

meydan etkinliği kaldırılır,
değirmen occupancy artar,
özel iç mekân affordance’ları açılır,
festival iptal edilmez,
yağmur event’i korunur.
142. Testler
World clock unit tests
Day-period boundary tests
Time compression tests
Offline segmentation tests
10-day freeze tests
Player-preserved event tests
Event lifecycle tests
Event conflict tests
NPC routine timing tests
Temporal checkpoint tests
Narrative parity tests
Idempotency tests
Concurrency tests
143. Property-based testler
World time normal akışta geriye gitmez.
Aynı offline süre iki kez işlenmez.
10 günlük sınırdan sonra yeni event oluşmaz.
Resolved event tekrar active olamaz.
Player-gated event offline tamamlanamaz.
Event active olmadan resolve edilemez.
Time advance sonunda bütün character location state’leri tek zamana aittir.
144. Senaryo testi

Başlangıç:

Dünya:
49. gün, akşam

Festival:
50. gün, akşam
player_preserved

Oyuncu:
3 gün yok

Beklenen:

- Festival hazırlığı ilerler.
- Ana etkinlik başlamaz.
- World time güvenli sınıra kadar ilerler.
- Oyuncu geri geldiğinde festival hazırdır.
- Çocuk “kaçırdın” diliyle karşılaşmaz.
145. İlk sürümde yapılmaması gerekenler

Başlangıçta kaçınmamız gerekenler:

gerçek zamanla birebir akan dünya,
saniye bazlı sürekli simülasyon,
karmaşık astronomi sistemi,
çok ayrıntılı takvim,
gerçek zamanlı kaçırılabilir görevler,
çocuk yokken büyük krizler,
event spam’i,
her NPC için dakika dakika program,
bütün item’ler için decay,
ağır deadline mekanikleri,
LLM’nin event zamanını belirlemesi,
zaman sıkıştırması sırasında kritik olayları atlamak.

MVP hedefi:

Zaman tutarlı aksın.
Dünya biraz ilerlesin ama kullanıcı çok şey kaçırmasın.
Kritik kararlar oyuncuyu beklesin.
Uzun yoklukta dünya güvenli biçimde donsun.
Olaylar hazırlık, aktiflik ve sonuç aşamalarından geçsin.
146. Time, Calendar & World Event Engine temel ilkeleri
1. Real time, session time, story time ve world time ayrı tutulur.
2. Narrative Engine zamanı tek başına ilerletemez.
3. Her kanonik zaman ilerlemesi doğrulanmış bir TimeStateDelta üretir.
4. Flashback ve dream world time’ı ilerletmez.
5. Uzun süreler sıkıştırılabilir ama kritik olaylar atlanamaz.
6. Offline süre doğrudan world time’a eşitlenmez.
7. Offline simülasyon zaman geçtikçe giderek zayıflar.
8. On günden sonra dünya tamamen donar.
9. Freeze sonrası görev, event, NPC, hava ve item decay ilerlemez.
10. Oyuncu yokken kritik ve geri döndürülemez olaylar tamamlanamaz.
11. Player-gated olaylar pending player durumunda bekler.
12. World event’ler açık bir yaşam döngüsüne sahip olmalıdır.
13. Player-preserved event’ler çocuk dönmeden ana aşamaya geçmez.
14. Gerçek zamanlı kaçırma baskısı kullanılmaz.
15. Aciliyet hikâye içi zamanla ifade edilir.
16. NPC rutinleri zaman bağlamını kullanır ama son kararı Decision Engine verir.
17. Aynı anda çok fazla büyük world event aktif olmamalıdır.
18. Büyük event’lerden sonra recovery dönemi bulunmalıdır.
19. Event çakışmaları merge, delay veya transform ile çözülmelidir.
20. Kullanıcı yokluğu event iptal nedeni olarak suçlayıcı biçimde kullanılmaz.
21. Story session güvenli temporal checkpoint’te kapanmalıdır.
22. Dönüş özeti yalnızca kanonik ve önemli değişiklikleri göstermelidir.
23. Time advance işlemleri idempotent ve version kontrollü olmalıdır.
24. Narrative, world clock ve event state aynı zamanı anlatmalıdır.
25. LLM zaman ve event fikirleri önerebilir ama kanonik zaman kararını veremez.