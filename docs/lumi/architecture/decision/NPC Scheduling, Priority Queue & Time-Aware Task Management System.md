# NPC Scheduling, Priority Queue & Time-Aware Task Management System

Bu sistem, NPC’nin aynı anda sahip olduğu rutinleri, hedefleri, görevleri, ilişkisel sorumlulukları ve beklenmedik olayları **zaman içinde düzenlemesini** sağlar.

Önceki bölümlerde NPC’nin:

* niyet ürettiğini,
* hedef belirlediğini,
* plan oluşturduğunu,
* planı görevlere böldüğünü

tanımladık.

Şimdi şu sorulara cevap veriyoruz:

```text
NPC hangi görevi ne zaman yapacak?
Acil bir olay çıktığında mevcut işini bırakacak mı?
Rutin ile hedef çakışırsa hangisini seçecek?
Geciken işler nasıl ele alınacak?
NPC aynı gün içine ne kadar iş sığdırabilir?
Bekleme süreleri nasıl yönetilecek?
Bir görev ne zaman ertelenecek, iptal edilecek veya devredilecek?
```

Temel ilke:

> NPC’nin zamanı sınırsız değildir. Her karar, başka bir işi ertelemek veya iptal etmek anlamına gelebilir.

---

# 1. Zaman yönetiminin temel bileşenleri

NPC zaman sistemi beş ana bileşenden oluşur:

```text
Routine Calendar
Task Queue
Priority Evaluator
Time Budget
Interrupt Manager
```

Bunların birleşimiyle yürütme akışı oluşur:

```text
Mevcut zaman
→ Uygun görevleri bul
→ Ön şartları kontrol et
→ Öncelikleri hesapla
→ Zaman bütçesini kontrol et
→ Görevi seç
→ Yürüt
→ Sonucu işle
→ Takvimi güncelle
```

---

# 2. NPC Schedule yapısı

```ts
type NPCSchedule = {
  npcId: string;
  worldDate: string;
  timezoneId: string;

  routineBlocks: ScheduleBlock[];
  plannedBlocks: ScheduleBlock[];
  dynamicBlocks: ScheduleBlock[];

  flexibleTimeWindows: TimeWindow[];
  restWindows: TimeWindow[];
  unavailableWindows: TimeWindow[];

  dailyEnergyBudget: number;
  dailyAttentionBudget: number;
  dailyTravelBudget: number;

  scheduleStatus:
    | "normal"
    | "compressed"
    | "overloaded"
    | "disrupted"
    | "emergency";
};
```

Takvim yalnızca sabit saatleri tutmaz.

Şunları da içerir:

* esnek zaman aralıkları,
* dinlenme zamanı,
* yolculuk bütçesi,
* dikkat kapasitesi,
* günün ne kadar dolu olduğu,
* acil durum seviyesi.

---

# 3. Schedule Block

```ts
type ScheduleBlock = {
  blockId: string;

  sourceType:
    | "routine"
    | "goal"
    | "task"
    | "relationship"
    | "event"
    | "rest"
    | "travel"
    | "buffer";

  sourceId?: string;

  startTime: WorldTime;
  endTime: WorldTime;

  flexibility:
    | "fixed"
    | "semi_fixed"
    | "flexible"
    | "opportunistic";

  interruptibility:
    | "non_interruptible"
    | "high_cost"
    | "interruptible"
    | "freely_interruptible";

  priorityClass:
    | "critical"
    | "high"
    | "normal"
    | "low"
    | "background";

  locationId?: string;
  requiredActorIds?: string[];

  status:
    | "scheduled"
    | "active"
    | "completed"
    | "interrupted"
    | "missed"
    | "rescheduled"
    | "cancelled";
};
```

---

# 4. Sabit ve esnek zaman blokları

Her görev aynı katılıkta olmamalıdır.

## Fixed

Kesin zamanlı işlerdir.

```text
Güneş batmadan köy kapısını kapatmak
Belirli saatte nöbet değişimi
Bir törene katılmak
Teknenin gelme saatini karşılamak
```

Bu görevlerin ertelenmesi zor veya imkânsızdır.

---

## Semi-fixed

Belirli bir zaman aralığında yapılmalıdır.

```text
Sabah pazarı açmak
Öğleden önce ilaç teslim etmek
Gün batmadan hayvanları toplamak
```

Saat değişebilir ama zaman penceresi korunmalıdır.

---

## Flexible

Gün içinde uygun bir zamanda yapılabilir.

```text
Komşuyu ziyaret etmek
Aletleri temizlemek
Yeni haritayı incelemek
```

---

## Opportunistic

Yalnızca uygun fırsat ortaya çıktığında gerçekleştirilir.

```text
Tüccar köye gelirse onunla konuş
Yağmur dinerken otları topla
Çocuk limana uğrarsa ona mektubu ver
```

Bu görevler takvime kesin olarak yerleştirilmez.

Bir fırsat tetikleyicisiyle aktive edilir.

---

# 5. Task Queue yapısı

NPC’nin gerçekleştirebileceği görevler bir öncelik kuyruğunda tutulur.

```ts
type ScheduledTaskEntry = {
  taskId: string;
  npcId: string;

  earliestStartTime?: WorldTime;
  latestStartTime?: WorldTime;
  deadline?: WorldTime;

  estimatedDuration: number;
  minimumExecutionWindow: number;

  basePriority: number;
  urgency: number;
  importance: number;

  interruptCost: number;
  delayCost: number;
  failureCost: number;

  energyCost: number;
  attentionCost: number;
  travelCost: number;

  locationId?: string;
  prerequisiteTaskIds: string[];

  status:
    | "queued"
    | "ready"
    | "blocked"
    | "scheduled"
    | "executing"
    | "deferred"
    | "expired"
    | "completed"
    | "cancelled";
};
```

---

# 6. Ready Queue ve Blocked Queue

Görevler iki temel gruba ayrılır.

## Ready Queue

Şu anda yapılabilecek görevlerdir.

```text
Ön şartları tamam
Zaman penceresi açık
Gerekli kaynak mevcut
NPC uygun konumda veya ulaşabilir
```

## Blocked Queue

Henüz yapılamayan görevlerdir.

```text
Başka görevin bitmesi bekleniyor
Bir NPC’nin gelmesi bekleniyor
Hava koşulu uygun değil
Gerekli eşya eksik
Oyuncu katılımı gerekiyor
```

Blocked görev her değerlendirmede boş yere puanlanmamalıdır.

Yalnızca blokaj durumu değiştiğinde tekrar Ready Queue’ya alınır.

---

# 7. Priority sınıfları

Öncelik yalnızca tek bir sayı değildir.

Görevler önce geniş sınıflara ayrılır.

## Critical

Gecikmesi ciddi sonuç doğurur.

```text
Yangın uyarısı
Yaralı birine acil yardım
Çocuk için yakın tehlike
Sel kapaklarını kapatma
```

## High

Kısa sürede yapılması önemlidir.

```text
İlaç teslim etmek
Kaybolan çocuğu aramak
Fırtına öncesi hazırlık yapmak
```

## Normal

Standart hedef ve rutin görevleridir.

```text
Fırını açmak
Malzeme toplamak
Bir NPC ile konuşmak
```

## Low

Ertelenebilir görevlerdir.

```text
Depoyu düzenlemek
Mektup yazmak
Eski haritayı incelemek
```

## Background

Boş zamanda gerçekleştirilen küçük işlerdir.

```text
Bahçeyi sulamak
Notları düzenlemek
Kıyafet onarmak
```

---

# 8. Dynamic Priority Score

Aynı sınıftaki görevler dinamik olarak puanlanır.

```text
Dynamic Priority
=
Base Priority
+ Urgency
+ Deadline Pressure
+ Intent Commitment
+ Role Responsibility
+ Relationship Importance
+ World Relevance
+ Opportunity Bonus
+ Continuity Bonus
- Energy Cost
- Travel Cost
- Risk
- Switching Cost
- Narrative Restriction
```

Örnek:

```text
Görev A:
Depoyu düzenle

Görev B:
Şifacıya ilaç götür

Normal durumda:
B daha öncelikli

Fakat:
İlaç teslim süresi yarım saat içinde doluyorsa
deadline pressure hızla yükselir.
```

---

# 9. Deadline Pressure

Son tarih yaklaştıkça görev önceliği yükselmelidir.

Basit doğrusal artış yerine kademeli yapı kullanılabilir.

```text
Deadline çok uzakta:
Düşük baskı

Zaman penceresinin ortası:
Orta baskı

Son bölüme girildi:
Yüksek baskı

Artık tamamlanması zor:
Kritik baskı
```

```ts
type DeadlineProfile = {
  warningThreshold: number;
  urgentThreshold: number;
  criticalThreshold: number;
  expiryBehavior:
    | "fail"
    | "reschedule"
    | "transform"
    | "cancel"
    | "late_complete";
};
```

Örneğin:

```text
Pazar kapanmadan ürün sat
```

Son tarih geçerse görev:

* başarısız olabilir,
* ertesi güne taşınabilir,
* başka bir hedefe dönüşebilir,
* elde kalan ürünleri saklama görevine dönüşebilir.

---

# 10. Delay Cost

Her gecikmenin maliyeti aynı değildir.

```text
Çiçek sulamayı bir saat geciktirmek:
Düşük maliyet

İlacı bir saat geciktirmek:
Yüksek maliyet

Gün batımından sonra kapıyı kapatmak:
Çok yüksek maliyet
```

```ts
type DelayCostProfile = {
  costPerTimeUnit: number;
  escalationType:
    | "linear"
    | "step"
    | "exponential"
    | "threshold";

  maximumDelay?: number;
};
```

---

# 11. Importance ve urgency ayrımı

Bir iş önemli olabilir fakat acil olmayabilir.

```text
Önemli ama acil değil:
Köprüyü güçlendirmek

Acil ama düşük önem:
Rüzgârın uçurduğu birkaç kâğıdı toplamak

Hem önemli hem acil:
Yaralı birine yardım etmek

Ne önemli ne acil:
Depodaki eski kutuları sıralamak
```

Bu ayrım NPC’nin sadece en yakın problemi çözmesini engeller.

---

# 12. Time Windows

Her görevin uygun olduğu zaman aralıkları bulunabilir.

```ts
type TaskTimeWindow = {
  earliestStart?: WorldTime;
  latestStart?: WorldTime;
  preferredWindows?: TimeWindow[];
  forbiddenWindows?: TimeWindow[];
  recurringRule?: string;
};
```

Örnek:

```text
Şifalı bitki toplamak:
Sabah erken saatler tercih edilir

Baykuşu gözlemlemek:
Gece yapılabilir

Pazar alışverişi:
Pazar açıkken yapılabilir

Çatıyı onarmak:
Şiddetli yağmurda yapılamaz
```

---

# 13. Contextual Task Availability

Bir görev yalnızca zaman yüzünden değil, bağlam yüzünden de kullanılabilir olabilir.

```text
Konum
Hava
Işık seviyesi
Kalabalık durumu
Hedef NPC’nin varlığı
Gerekli eşyanın erişilebilirliği
Dünya olayı
```

Örnek:

```text
Bir NPC ile özel konuşma
```

Şu koşullarda uygun olabilir:

```text
NPC yalnızsa
Ortam güvenliyse
Yeterli zaman varsa
İlişki gerilimi çok yüksek değilse
```

---

# 14. Daily Time Budget

NPC’nin gün içinde kullanabileceği zaman sınırlıdır.

```ts
type DailyTimeBudget = {
  totalAwakeMinutes: number;
  reservedRoutineMinutes: number;
  reservedRestMinutes: number;
  availableGoalMinutes: number;
  travelMinutes: number;
  emergencyReserveMinutes: number;
};
```

Tüm uyanık zamanı görevlerle doldurmamak gerekir.

Takvimde boşluk bırakılmalıdır.

```text
Buffer Time
Emergency Reserve
Unplanned Social Time
Transition Time
```

Aksi hâlde her küçük olay tüm günü bozar.

---

# 15. Buffer Time

Görevler arasına küçük tampon süreler konulmalıdır.

Bunlar:

* yolculuk gecikmesi,
* kısa konuşmalar,
* hazırlık,
* eşya toplama,
* beklenmedik küçük olaylar

için kullanılır.

```text
Görev süresi:
30 dakika

Takvimde ayrılan blok:
40 dakika
```

Bu, NPC planlarını daha gerçekçi ve dayanıklı yapar.

---

# 16. Transition Cost

Bir görevden diğerine geçmek bedelsiz değildir.

Geçiş maliyeti şunlara bağlıdır:

```text
Konum değişimi
Ekipman değişimi
Zihinsel odak değişimi
Sosyal bağlam değişimi
Hazırlık süresi
```

Örnek:

```text
Tarlada çalışırken:
Yakındaki çiti onarmak kolay geçiştir

Tarlada çalışırken:
Kütüphanede eski kayıt araştırmak yüksek geçiş maliyetidir
```

```ts
type TaskSwitchCost = {
  travelTime: number;
  preparationTime: number;
  attentionResetCost: number;
  equipmentChangeCost: number;
};
```

---

# 17. Task Batching

Benzer veya aynı konumdaki işler birlikte yapılabilir.

```text
Pazara git:
- Un al
- Mektup teslim et
- Tüccarla konuş
- Kayıp kişi hakkında soru sor
```

Bu görevlerin tek yolculukta birleştirilmesi:

* zaman kazandırır,
* seyahat maliyetini azaltır,
* NPC davranışını doğal gösterir.

```ts
type TaskBatch = {
  batchId: string;
  locationId?: string;
  taskIds: string[];
  sharedSetupCost: number;
  estimatedSavings: number;
};
```

---

# 18. Route-Aware Scheduling

Takvim, görevleri yalnızca önceliğe göre değil, konuma göre de sıralamalıdır.

Yanlış sıra:

```text
Ev
→ Liman
→ Ev
→ Pazar
→ Liman
```

Daha iyi sıra:

```text
Ev
→ Pazar
→ Liman
→ Ev
```

Ancak rota optimizasyonu kritik görevleri geciktirmemelidir.

```text
En kısa rota
≠
Her zaman en doğru görev sırası
```

---

# 19. Energy Budget

NPC zaman bulsa bile enerjisi yetmeyebilir.

```ts
type NPCEnergyState = {
  physicalEnergy: number;
  mentalEnergy: number;
  socialEnergy: number;
  recoveryRate: number;
};
```

Görevler farklı enerji türleri tüketir.

```text
Ağır sandık taşımak:
Yüksek fiziksel enerji

Eski yazıları incelemek:
Yüksek zihinsel enerji

Kalabalık toplantı yönetmek:
Yüksek sosyal enerji
```

---

# 20. Energy-aware scheduling

Zor görevler uygun enerji seviyelerine yerleştirilebilir.

```text
Sabah:
Yüksek dikkat gerektiren araştırma

Öğleden sonra:
Fiziksel teslimatlar

Akşam:
Hafif sosyal veya bakım görevleri
```

Ancak bu herkes için aynı değildir.

Bir gece bekçisi akşam daha enerjik olabilir.

Enerji eğrisi NPC’ye özgü olmalıdır.

```ts
type EnergyRhythm = {
  timeSegment: "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";
  physicalModifier: number;
  mentalModifier: number;
  socialModifier: number;
};
```

---

# 21. Attention Budget

NPC aynı anda çok fazla karmaşık hedef taşıyamaz.

```text
Düşük dikkat gerektiren:
Bahçeyi sulamak

Orta dikkat:
Teslimat rotası takip etmek

Yüksek dikkat:
Gizem çözmek
İlaç hazırlamak
Zor bir ilişki konuşması yapmak
```

Yüksek dikkat gerektiren görevler arka arkaya planlanırsa performans düşebilir.

---

# 22. Rest scheduling

Dinlenme yalnızca boş zaman kalırsa yapılan bir görev olmamalıdır.

Dinlenme zamanları aktif olarak korunmalıdır.

```text
Uyku
Yemek molası
Sessiz dinlenme
Sosyal rahatlama
Yaralanma iyileşmesi
```

NPC sürekli acil işler nedeniyle dinlenmeyi ertelerse:

* enerji düşer,
* hata ihtimali artar,
* sabır azalır,
* duygusal hassasiyet yükselir,
* sonraki günün kapasitesi düşer.

---

# 23. Overwork ve schedule overload

NPC’nin takvimi kapasitesini aşabilir.

```ts
type ScheduleLoad = {
  scheduledMinutes: number;
  availableMinutes: number;
  taskCount: number;
  highPriorityTaskCount: number;
  overloadRatio: number;
};
```

Durumlar:

```text
Normal:
Yük uygun

Compressed:
Az tampon kaldı

Overloaded:
Tüm görevlerin tamamlanması gerçekçi değil

Critical overload:
Acil görevler bile çakışıyor
```

---

# 24. Overload resolution

Takvim aşırı doluysa NPC şu yöntemleri kullanabilir:

```text
Düşük öncelikli işi ertele
Görevi kısalt
Görevi birleştir
Başkasına devret
Yardım iste
Rutin görevini atla
Hedefi duraklat
Plan kapsamını küçült
```

NPC her şeyi yapmaya çalışmamalıdır.

---

# 25. Priority inheritance

Bazı destek görevleri normalde düşük öncelikli olabilir fakat kritik bir hedefi bloke ediyorsa önceliği yükselmelidir.

Örnek:

```text
Ana hedef:
Yaralıya ilaç götür

Bloke eden görev:
Depodan çantayı almak
```

Çantayı alma görevi tek başına düşük önemlidir.

Fakat kritik hedef için gerekliyse geçici olarak yüksek öncelik kazanır.

```text
Inherited Priority
=
Dependent Goal Priority
- Dependency Distance Penalty
```

---

# 26. Interrupt System

NPC aktif görevi sırasında yeni bir olayla karşılaşabilir.

Kesinti değerlendirmesi şu soruyu sorar:

```text
Yeni olay, mevcut işi bırakmaya değer mi?
```

```ts
type InterruptCandidate = {
  sourceId: string;
  sourceType:
    | "danger"
    | "request"
    | "world_event"
    | "relationship"
    | "player"
    | "new_information";

  urgency: number;
  importance: number;
  responseWindow: number;
  expectedImpact: number;
};
```

---

# 27. Interrupt Threshold

Mevcut görev hemen bırakılmamalıdır.

```text
Interrupt Score
=
New Event Priority
+ Immediate Risk
+ Relationship Weight
+ Role Duty
+ Opportunity Expiry
- Current Task Completion Proximity
- Current Task Interrupt Cost
- Switching Cost
```

Yeni olay skoru belirli eşiği aşarsa görev kesilir.

---

# 28. Interruptibility

Her görev aynı şekilde kesilemez.

## Non-interruptible

Kesilmesi ciddi zarar doğurur.

```text
İlaç karışımının kritik aşaması
Kayığın fırtınada yönlendirilmesi
Ağır bir nesnenin kaldırılması
```

## High-cost interruption

Kesilebilir ama önemli ilerleme kaybolur.

```text
Uzun bir ritüelin hazırlığı
Hassas bir onarım
Zor bir müzakere
```

## Interruptible

Güvenli noktada durdurulabilir.

```text
Harita inceleme
Bahçe temizleme
Yolculuk
```

## Freely interruptible

Anında bırakılabilir.

```text
Meydanı gözlemleme
Boş zamanda sohbet
Notları düzenleme
```

---

# 29. Safe interruption points

Uzun görevler güvenli duraklama noktalarına bölünmelidir.

```text
Köprü onarımı:

Aşama 1:
Hasarlı tahtaları kaldır

Aşama 2:
Destekleri sabitle

Aşama 3:
Yeni tahtaları yerleştir

Aşama 4:
Test et
```

NPC mümkünse aşamalar arasında kesinti yapar.

Bu sayede iş yarım ve tehlikeli durumda bırakılmaz.

---

# 30. Resume State

Kesilen görev yeniden başlatılırken tüm ilerleme kaybolmamalıdır.

```ts
type TaskResumeState = {
  taskId: string;
  lastCheckpointId?: string;
  progress: number;
  remainingDuration: number;
  preservedResources: ResourceState[];
  lostResources: ResourceState[];
  restartCost: number;
};
```

Örnek:

```text
NPC haritanın yarısını incelemişti.
Kesinti sonrası sıfırdan başlamaz.
```

Ancak bazı görevlerde yeniden hazırlık gerekebilir.

---

# 31. Preemption türleri

## Immediate preemption

Görev hemen bırakılır.

```text
Yangın başladı
Yakında biri yardım çağırdı
```

## Deferred preemption

NPC mevcut güvenli aşamayı tamamlar, sonra yeni olaya geçer.

```text
İlaç şişesini kapat
Sonra dışarı çık
```

## Conditional preemption

Yeni olay doğrulanırsa görev bırakılır.

```text
Uzaktan bir çığlık duyuldu
Önce sesin gerçek olup olmadığını kontrol et
```

## Rejected interruption

Yeni olay yeterince önemli değildir.

```text
NPC acil ilaç hazırlarken
biri sohbet etmek ister
```

---

# 32. Player arrival as interruption

Oyuncunun gelişi her NPC görevini otomatik olarak durdurmamalıdır.

NPC:

* görevi hemen bırakabilir,
* kısa süre sonra konuşabilir,
* çalışırken konuşabilir,
* yalnızca selam verebilir,
* oyuncudan yardım isteyebilir,
* müsait olmadığını açıklayabilir.

Bu karar:

```text
İlişki gücü
Görevin önemi
Görevin kesilebilirliği
Oyuncunun geliş amacı
Mevcut tehlike
```

ile değerlendirilir.

Bu, NPC’lerin oyuncuyu bekleyen sabit karakterler gibi görünmesini engeller.

---

# 33. Social commitments

NPC’nin ilişkisel sözleri takvime işlenmelidir.

```text
“Akşam seni limanda bekleyeceğim.”
“Yarın sana kitabı getireceğim.”
“Fırtına başlamadan çocukları eve götüreceğim.”
```

```ts
type SocialCommitment = {
  commitmentId: string;
  actorId: string;
  targetActorId: string;

  promisedAction: string;
  dueWindow: TimeWindow;

  importance: number;
  relationshipImpactOnFailure: number;
  moralWeight: number;

  status:
    | "planned"
    | "fulfilled"
    | "late"
    | "broken"
    | "renegotiated";
};
```

---

# 34. Broken commitments

NPC verdiği sözü yerine getiremezse sonuç üretilmelidir.

```text
Unutma
Gecikme
Acil durum
Bilinçli vazgeçme
Yanlış anlaşılma
```

Sonuçlar:

* güven azalması,
* suçluluk,
* açıklama yapma hedefi,
* özür dileme niyeti,
* telafi görevi,
* ilişkinin değişmesi.

Fakat NPC her zaman kötü niyetli sayılmamalıdır.

Sebep hafızaya kaydedilir.

---

# 35. Schedule negotiation

Birden fazla NPC’nin ortak görevi varsa uygun zaman bulunmalıdır.

```text
Müsait zaman aralıklarını karşılaştır
Sabit görevleri koru
Yolculuk süresini ekle
Ortak zaman penceresi bul
```

```ts
type SharedScheduleRequest = {
  participantIds: string[];
  requiredDuration: number;
  earliestStart: WorldTime;
  latestEnd: WorldTime;
  locationId?: string;
  priority: number;
};
```

Ortak zaman bulunamazsa:

```text
Bir katılımcı değiştirilebilir
Görev bölünebilir
Zaman uzatılabilir
Plan değiştirilebilir
Oyuncu katılımı beklenebilir
```

---

# 36. Waiting Tasks

Bazı görevler bekleme gerektirir.

```text
Yağmurun dinmesini bekle
NPC’nin gelmesini bekle
Hamurun kabarmasını bekle
Gece olmasını bekle
```

Bekleme sırasında NPC tamamen pasif kalmamalıdır.

```text
Beklerken yapılabilecek görevler:
Aletleri temizle
Notları incele
Kısa konuşma yap
Dinlen
Yakın çevreyi gözlemle
```

```ts
type WaitTask = {
  waitCondition: TaskCondition;
  expectedDuration?: number;
  canRunParallelTasks: boolean;
  allowedParallelTaskTypes: string[];
};
```

---

# 37. Parallel task handling

Bazı görevler aynı anda ilerleyebilir.

```text
Hamur kabarırken:
Fırını temizle

Suyun kaynamasını beklerken:
Bitkileri hazırla

Bir NPC’yi beklerken:
Haritayı incele
```

Ancak gerçek paralellik sınırlıdır.

```text
Ağır bir sandık taşırken:
Aynı anda mektup yazılamaz
```

Sistem görevleri şu şekilde sınıflandırabilir:

```ts
type ParallelismType =
  | "exclusive"
  | "passive_background"
  | "light_parallel"
  | "fully_parallel_external";
```

---

# 38. External-progress tasks

Bazı görevler NPC doğrudan çalışmasa da ilerler.

```text
Hamurun mayalanması
Bir yapının kuruması
Gönderilen mektubun ulaşması
Bir bitkinin büyümesi
Başka NPC’nin devraldığı görev
```

Bu görevler zaman olaylarıyla güncellenir.

NPC’nin aktif görev kuyruğunu sürekli meşgul etmez.

---

# 39. Event-driven scheduling

Takvim sürekli her NPC için yeniden hesaplanmamalıdır.

Yeniden değerlendirme olay tabanlı çalışmalıdır.

Tetikleyiciler:

```text
Görev tamamlandı
Yeni kritik olay oluştu
Zaman penceresi açıldı
Son tarih yaklaştı
Kaynak kullanılabilir oldu
Hedef NPC geldi
Hava değişti
Oyuncu bölgeye girdi
Enerji seviyesi kritik düştü
```

Bu yapı hesaplama maliyetini azaltır.

---

# 40. Schedule reevaluation levels

## Minor refresh

Sadece hazır görevler yeniden sıralanır.

```text
Bir görev tamamlandı
Yeni düşük öncelikli görev geldi
```

## Partial reschedule

Günün kalan kısmı yeniden düzenlenir.

```text
Görev beklenenden uzun sürdü
Bir yol kapandı
NPC gecikti
```

## Full daily reschedule

Takvimin büyük bölümü yeniden oluşturulur.

```text
Fırtına başladı
Köy acil duruma geçti
NPC yaralandı
Büyük bir dünya olayı gerçekleşti
```

---

# 41. Schedule inertia

Takvim her küçük puan değişiminde bozulmamalıdır.

Daha önce yerleştirilen görevlerin korunması için takvim ataleti uygulanır.

```text
Schedule Inertia
=
Preparation Already Done
+ Travel Already Made
+ Social Commitment
+ Task Progress
+ Switching Cost
```

Yeni görev açık biçimde daha önemli değilse mevcut sıra korunur.

---

# 42. Missed task handling

Bir görev zamanında yapılamadıysa sistem nedeni değerlendirir.

```ts
type MissedTaskReason =
  | "overload"
  | "interruption"
  | "resource_missing"
  | "travel_delay"
  | "forgotten"
  | "priority_change"
  | "world_event"
  | "intent_abandoned";
```

Ardından davranış seçilir:

```text
Aynı gün yeniden planla
Ertesi güne taşı
Hedefi güncelle
Özür veya açıklama üret
Görevi iptal et
Başkasına devret
Başarısızlık sonucu uygula
```

---

# 43. Late completion

Bazı görevler son tarihten sonra da tamamlanabilir.

```text
Mektubu geç teslim etmek
Bir toplantıya geç katılmak
Gecikmiş ödeme yapmak
```

Böyle durumlarda:

```text
Görev completed olur
Ama late flag taşır
Ek ilişki veya dünya sonucu oluşur
```

```ts
type LateCompletion = {
  latenessDuration: number;
  qualityPenalty: number;
  relationshipPenalty: number;
  worldEffect?: WorldStateChange;
};
```

---

# 44. Recurring task management

Rutin görevler tekrar eden takvim kurallarıyla tanımlanabilir.

```text
Her sabah fırını aç
Her üç günde bir köprüyü kontrol et
Her akşam hayvanları say
Her hafta pazara git
```

```ts
type RecurringTaskRule = {
  frequency:
    | "daily"
    | "weekly"
    | "interval"
    | "world_event_based";

  interval?: number;
  preferredTimeWindow?: TimeWindow;
  skipPolicy:
    | "skip"
    | "reschedule"
    | "catch_up"
    | "escalate";
};
```

---

# 45. Catch-up behavior

Kaçırılan tekrarlı görevlerin hepsi birikmemelidir.

Örnek:

```text
NPC üç gün bahçeyi sulamadı.
```

Dönüşte üç ayrı sulama görevi yapılmaz.

Tek bir güncel görev oluşturulur:

```text
Bahçenin durumunu kontrol et
Gerekli miktarda su ver
```

Ancak bazı görevler birikebilir:

```text
Üç mektup teslim edilmediyse
üç ayrı teslimat hâlâ anlamlı olabilir.
```

---

# 46. Routine protection

Dinamik hedefler, NPC’nin temel yaşam düzenini tamamen yok etmemelidir.

Korunan rutinler:

```text
Uyku
Yemek
Temel sağlık
Kritik rol sorumlulukları
Bakmakla yükümlü olduğu kişiler
```

Yüksek acil durumlar kısa süreli ihlal oluşturabilir.

Ancak uzun süre devam ederse sonuç üretmelidir.

---

# 47. Routine disruption memory

Bir NPC’nin rutini sık sık bozuluyorsa bu davranışına yansıyabilir.

```text
Sürekli uykusuz kalıyor
→ daha erken dinlenme niyeti

Teslimatlar sürekli gecikiyor
→ rota planlama değişikliği

Pazar işi sürekli bölünüyor
→ yardımcı arama hedefi
```

Sistem, tekrarlanan takvim problemlerini yalnızca günlük hata olarak görmemelidir.

Bunlardan yeni intent ve hedefler doğabilir.

---

# 48. NPC punctuality trait

NPC’ler zaman konusunda aynı davranmamalıdır.

```ts
type TimeBehaviorVector = {
  punctuality: number;
  planningDiscipline: number;
  flexibility: number;
  procrastination: number;
  patience: number;
  urgencySensitivity: number;
  interruptionTolerance: number;
};
```

Dakik NPC:

* erken hazırlanır,
* tampon süre bırakır,
* gecikmeyi önemli görür.

Rahat NPC:

* esnek zaman pencerelerini daha çok kullanır,
* düşük önemli görevleri erteleyebilir,
* küçük gecikmelerden rahatsız olmaz.

Dağınık NPC:

* görevleri unutabilir,
* kötü süre tahmini yapabilir,
* aşırı yüklenebilir.

Bu özellikler karakter gelişimiyle değişebilir.

---

# 49. Duration estimation

NPC görev sürelerini kusursuz tahmin etmemelidir.

```ts
type DurationEstimate = {
  expectedDuration: number;
  uncertainty: number;
  optimismBias: number;
  experienceModifier: number;
};
```

Tecrübeli NPC:

* benzer işleri daha doğru tahmin eder.

Acemi veya aşırı iyimser NPC:

* görevin kısa süreceğini sanabilir,
* sonraki görevlerini geciktirebilir.

Bu durum karaktere uygun küçük aksaklıklar üretir.

---

# 50. Schedule learning

NPC geçmiş planlama hatalarından öğrenebilir.

```text
Pazara gitmek beklenenden uzun sürdü
→ sonraki sefer daha fazla süre ayır

Yağmurda kuzey yolu yavaşladı
→ kötü havada alternatif rota seç

Sabah erken şifacı evde olmadı
→ önce çalışma saatini doğrula
```

```ts
type SchedulingLesson = {
  contextSignature: string;
  estimatedDurationBefore: number;
  actualDuration: number;
  delayReason?: string;
  learnedAdjustment: number;
  confidence: number;
};
```

---

# 51. Offline scheduling

Oyuncu oyunda değilken takvim ayrıntısı zaman aralığına göre azaltılır.

## Kısa yokluk

```text
Görevler blok bazında yürütülür
Kesintiler ve gecikmeler hesaplanabilir
```

## Orta yokluk

```text
Günlük ana sonuçlar hesaplanır
Düşük öncelikli görevler özetlenir
Rutin görevler varsayılan biçimde tamamlanır
```

## Uzun yokluk

```text
Yalnızca yüksek önem taşıyan hedefler ilerletilir
Küçük takvim sorunları dengelenmiş kabul edilir
Ana anlatı kapılarında ilerleme durur
```

NPC’nin on günlük programı dakika dakika çalıştırılmaz.

---

# 52. Simulation relevance scaling

Takvim ayrıntısı NPC önemine göre ölçeklenir.

## Yüksek önem

```text
Gerçek zaman blokları
Görev öncelik kuyruğu
Kesinti ve yeniden planlama
Enerji takibi
```

## Orta önem

```text
Günün bölümleri
Ana görev sonuçları
Basitleştirilmiş kesinti
```

## Düşük önem

```text
Günlük veya çok günlük özet
Rutin başarı varsayımı
Yalnızca büyük başarısızlıklar
```

## Toplu NPC grubu

```text
“Köylüler fırtına öncesi hazırlık yaptı.”
```

---

# 53. Story-session interaction

Aktif hikâye oturumu başladığında arka plan takvimi tamamen durmak zorunda değildir.

NPC’ler üç gruba ayrılabilir:

```text
Scene Participants
Nearby Active NPCs
Background NPCs
```

## Scene Participants

Hikâye orkestrasyon sistemi tarafından yönetilir.

## Nearby Active NPCs

Sınırlı arka plan görevlerine devam edebilir.

## Background NPCs

Özet zaman ilerlemesiyle çalışır.

Aynı NPC hem hikâye sahnesinde hem arka plan görevinde aynı anda bulunamaz.

---

# 54. Scene reservation

Bir NPC hikâye sahnesi için ayrıldığında takvimine rezervasyon eklenir.

```ts
type SceneReservation = {
  npcId: string;
  sceneId: string;
  startWindow: TimeWindow;
  expectedDuration: number;
  preparationTime: number;
  travelTime: number;
  releasePolicy:
    | "on_scene_end"
    | "on_actor_exit"
    | "manual";
};
```

Bu rezervasyon, NPC’nin aynı saate başka görev yerleştirmesini engeller.

---

# 55. Narrative schedule gates

Bazı görevler uygun zaman gelse bile hikâye nedeniyle başlamamalıdır.

```text
Ana karakter henüz gerçeği öğrenmedi
Oyuncu gerekli bölgeyi açmadı
Bir sahne oynatılmadan sonuç uygulanmamalı
```

Bu görevler:

```text
Time-ready
but
Narrative-blocked
```

durumunda tutulur.

---

# 56. Explainable scheduling

Önemli takvim kararları açıklanabilir olmalıdır.

Örnek:

```json
{
  "selectedTask": "deliver_medicine",
  "reasons": [
    "Görevin son tarihi 40 dakika içinde",
    "İlişkisel önemi yüksek",
    "NPC gerekli ilaca sahip",
    "Hedef konum mevcut rotaya yakın"
  ],
  "deferredTasks": [
    {
      "task": "organize_storage",
      "reason": "Düşük gecikme maliyeti"
    },
    {
      "task": "visit_friend",
      "reason": "Esnek zaman penceresi"
    }
  ]
}
```

Bu açıklama geliştirici araçlarında kullanılabilir.

---

# 57. Uçtan uca örnek

## NPC

Arin, köy postacısı.

Özellikleri:

```text
Punctuality: yüksek
Responsibility: yüksek
Social energy: orta
Physical energy: orta
Flexibility: orta
```

## Sabah takvimi

```text
07.00–08.00:
Mektupları sırala

08.00–10.00:
Kuzey mahalle teslimatları

10.00–11.00:
Pazar teslimatları

11.00–12.00:
Dinlenme ve yemek

13.00:
Yaşlı denizciyle görüşme
```

## Yeni olay

Saat 08.20’de şifacı acil ilaç paketi verir.

```text
Yeni görev:
İlacı orman kulübesine götür

Priority:
High

Deadline:
10.00
```

## Değerlendirme

Mevcut görev:

```text
Kuzey mahallesine standart mektup teslimi
```

Yeni görev:

```text
İlaç teslimi
```

Sistem sonucu:

```text
İlaç görevi daha yüksek gecikme maliyetine sahip.
Mevcut mektup teslimleri esnek.
Orman kulübesi mevcut rotaya yakın.
```

## Yeni sıra

```text
1. Yakındaki iki mektubu teslim et
2. Orman kulübesine ilacı götür
3. Kuzey teslimatlarına devam et
4. Pazar teslimatını 20 dakika geciktir
```

Burada mevcut görev tamamen çöpe atılmaz.

Rota ve öncelik birlikte optimize edilir.

## İkinci kesinti

Yolda küçük bir köprü hasarı görülür.

Arin köprüyü onaramaz.

Fakat rol ve güvenlik nedeniyle:

```text
- Köprüyü tehlikeli olarak işaretler
- Yakındaki bekçiye haber verme görevi oluşturur
- İlaç teslimine devam eder
```

Köprü olayı ilaç görevini gereksiz yere tüketmez.

## Gün sonu sonucu

```text
İlaç zamanında ulaştı
Kuzey mektupları hafif gecikti
Pazar teslimatı tamamlandı
Denizci görüşmesi 30 dakika ertelendi
Köprü için bekçiye uyarı verildi
```

## İlişki sonucu

Arin denizciyle görüşmeye geç kaldığı için açıklama yapar.

Denizci acil teslimat sebebini öğrenince olumsuz ilişki etkisi uygulanmaz.

Bu sayede sistem yalnızca gecikmeyi değil, gecikmenin nedenini de değerlendirir.

---

# 58. Teknik servis ayrımı

```text
Schedule Builder
→ Rutinleri ve görevleri zaman bloklarına dönüştürür

Priority Queue Manager
→ Hazır görevleri sıralar

Time Window Evaluator
→ Görevlerin zaman uygunluğunu kontrol eder

Resource & Energy Budgeter
→ Günlük kapasiteyi takip eder

Interrupt Manager
→ Yeni olayların mevcut görevi kesip kesmeyeceğine karar verir

Task Batch Optimizer
→ Benzer ve aynı konumdaki işleri birleştirir

Route Scheduler
→ Yolculuk sırasını optimize eder

Rescheduler
→ Gecikme ve olaylar sonrası takvimi düzenler

Schedule Memory
→ Süre tahminlerini ve geçmiş gecikmeleri saklar
```

---

# 59. Deterministik ve üretken zamanlama

Ana zamanlama motoru kurallı ve deterministik olmalıdır.

```text
Priority rules
Deadline rules
Time windows
Energy budgets
Travel calculations
Interrupt thresholds
```

LLM yalnızca şu alanlarda destek olabilir:

* NPC’nin gecikmeyi nasıl açıklayacağı,
* gün sonu özetinin doğal dile çevrilmesi,
* sıra dışı sosyal çakışmalara alternatif çözüm önerileri,
* karaktere uygun takvim tercihi açıklaması.

LLM doğrudan takvimi değiştirmez.

Ürettiği öneri doğrulama katmanından geçer.

---

# 60. Temel güvenlik ve anlatı kuralları

1. NPC bir güne gerçekçi olmayan sayıda görev yerleştiremez.
2. Temel uyku, sağlık ve bakım rutinleri sürekli ihmal edilemez.
3. Kritik görevler düşük öncelikli işlerle geciktirilemez.
4. Her yeni olay mevcut görevi otomatik olarak kesmez.
5. Görev kesintileri güvenli duraklama noktalarında yapılır.
6. Oyuncunun gelişi tüm NPC’leri anında boşta bırakmaz.
7. NPC verdiği zaman sözlerini takvimde taşır.
8. Kaçırılan görevlerin nedeni ve sonucu kaydedilir.
9. Tekrarlayan gecikmeler karakter öğrenimine dönüşür.
10. Ana hikâye görevleri anlatı kapılarını geçmeden otomatik tamamlanamaz.
11. Uzun yokluklarda takvim ayrıntısı azaltılır.
12. Düşük önemli NPC’ler dakika bazında simüle edilmez.
13. Zaman optimizasyonu karakter kişiliğini yok sayamaz.
14. Aynı konumdaki görevler anlamlıysa gruplanır.
15. NPC’nin enerji ve dikkat kapasitesi zaman kadar önemlidir.

---

# 61. Backlog kararları

### SCH-01 — Katı ve esnek zaman blokları

Görevler fixed, semi-fixed, flexible ve opportunistic olarak sınıflandırılacak.

### SCH-02 — Dinamik öncelik kuyruğu

Görev sırası aciliyet, önem, son tarih, ilişki, rol ve maliyet vektörleriyle hesaplanacak.

### SCH-03 — Deadline pressure

Son tarih yaklaştıkça görev önceliği kademeli biçimde artacak.

### SCH-04 — Delay cost

Her görev için gecikme maliyeti ayrı tanımlanabilecek.

### SCH-05 — Time and energy budgets

NPC’nin günlük zamanı, fiziksel enerjisi, zihinsel dikkati ve sosyal kapasitesi sınırlı tutulacak.

### SCH-06 — Buffer windows

Görevler arasında geçiş ve beklenmeyen olaylar için tampon süre bırakılacak.

### SCH-07 — Transition cost

Görev değiştirme maliyetine yolculuk, hazırlık ve dikkat değişimi dâhil edilecek.

### SCH-08 — Task batching

Aynı konumda veya aynı hazırlığı kullanan işler gruplanabilecek.

### SCH-09 — Route-aware scheduling

Görev sırası konum ve seyahat maliyetini hesaba katacak.

### SCH-10 — Priority inheritance

Yüksek öncelikli hedefi bloke eden alt görevler geçici öncelik kazanacak.

### SCH-11 — Interrupt thresholds

Yeni olaylar mevcut görev önemi ve kesinti maliyetiyle karşılaştırılacak.

### SCH-12 — Safe interruption points

Uzun görevler güvenli kesinti noktalarına sahip olacak.

### SCH-13 — Resume state

Kesilen görevler mümkün olduğunda kaldığı yerden devam edecek.

### SCH-14 — Social commitments

NPC’nin verdiği zaman ve buluşma sözleri takvim girdisi olarak tutulacak.

### SCH-15 — Waiting-task parallelism

Bekleme sırasında uygun küçük görevler çalıştırılabilecek.

### SCH-16 — External-progress tasks

NPC’nin aktif katılımı olmadan ilerleyen görevler ayrı zaman olaylarıyla yönetilecek.

### SCH-17 — Event-driven rescheduling

Takvim yalnızca anlamlı olaylarda yeniden değerlendirilecek.

### SCH-18 — Routine protection

Uyku, sağlık ve temel sorumluluklar uzun süreli dinamik görevler tarafından ezilemeyecek.

### SCH-19 — Duration learning

NPC geçmiş gerçek sürelerden gelecekteki zaman tahminlerini geliştirecek.

### SCH-20 — Simulation relevance scaling

Takvim ayrıntısı NPC’nin anlatısal ve mekânsal önemine göre ölçeklenecek.

### SCH-21 — Scene reservations

Hikâye sahnesine katılacak NPC’lerin zamanları önceden rezerve edilecek.

### SCH-22 — Explainable scheduling

Önemli görev seçimi, erteleme ve kesinti kararları geliştirici araçlarında açıklanabilir olacak.
