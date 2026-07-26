# NPC Planning, Task Decomposition & Multi-Step Action Execution System

Bu sistem, NPC’nin aktif bir hedefi yalnızca istemesini değil, onu **uygulanabilir bir plana dönüştürmesini** sağlar.

Önceki sistemde NPC’nin niyet ve hedef ürettiğini belirledik. Şimdi şu sorulara cevap veriyoruz:

```text
NPC hedefe ulaşmak için ne yapacak?
Hangi adımı önce gerçekleştirecek?
Neye ihtiyaç duyacak?
Plan bozulursa ne yapacak?
Ne zaman yardım isteyecek?
Ne zaman farklı bir yol deneyecek?
```

Temel akış şöyledir:

```text
Intent
→ Goal
→ Plan
→ Tasks
→ Actions
→ Observation
→ Plan Update
→ Result
```

Buradaki en önemli ilke şudur:

> NPC, geleceği kusursuz biçimde bilen bir planlayıcı değil; sınırlı bilgi, zaman, yetenek ve kaynaklarla karar veren bir karakterdir.

---

# 1. Goal ile Plan arasındaki fark

## Goal

NPC’nin ulaşmak istediği sonucu tanımlar.

```text
Kayıp keçiyi bul
Köprüyü onar
Arkadaşından özür dile
Eski gözlemevine ulaş
Hasta çocuğa ilaç götür
```

## Plan

NPC’nin bu sonuca ulaşmak için düşündüğü yolu tanımlar.

```text
Kayıp keçiyi bulmak için:

1. Son görüldüğü yeri öğren
2. İzleri kontrol et
3. Orman yolunu takip et
4. Çanın sesini dinle
5. Keçiyi güvenli biçimde geri getir
```

Aynı hedef için birden fazla plan olabilir.

```text
Goal:
Nehirden karşıya geç

Plan A:
Köprüyü kullan

Plan B:
Kayık bul

Plan C:
Sığ geçit ara

Plan D:
Köprünün onarılmasını bekle
```

NPC, şartlara göre bu planlardan birini seçer.

---

# 2. Plan yapısı

```ts
type NPCPlan = {
  planId: string;
  npcId: string;
  goalId: string;

  strategyType:
    | "direct"
    | "cautious"
    | "social"
    | "resource_based"
    | "exploratory"
    | "collaborative"
    | "avoidant"
    | "opportunistic";

  status:
    | "draft"
    | "ready"
    | "executing"
    | "paused"
    | "blocked"
    | "replanning"
    | "completed"
    | "failed"
    | "abandoned";

  taskIds: string[];
  currentTaskId?: string;

  expectedDuration: number;
  expectedCost: number;
  estimatedRisk: number;
  confidence: number;

  assumptions: PlanAssumption[];
  dependencies: PlanDependency[];
  fallbackPlanIds: string[];

  createdAt: WorldTime;
  lastUpdatedAt: WorldTime;
};
```

Plan yalnızca görev listesinden oluşmaz. Şunları da taşımalıdır:

* planın hangi varsayımlara dayandığı,
* ihtiyaç duyduğu kaynaklar,
* tahmini risk,
* NPC’nin başarı güveni,
* alternatif yollar,
* planın neden seçildiği.

---

# 3. Planlama kapsamı

Her hedef için ayrıntılı plan üretmek gereksizdir.

Planlama derinliği hedefin önemine göre belirlenir.

## Seviye 0 — Anlık eylem

Tek adımlı, düşük riskli işlerdir.

```text
Su iç
Kapıyı kapat
Masaya otur
Birine selam ver
```

Ayrı bir plan nesnesi gerektirmez.

---

## Seviye 1 — Basit plan

İki veya üç adımdan oluşur.

```text
Ekmek teslim et:

1. Ekmeği al
2. Komşunun evine git
3. Teslim et
```

---

## Seviye 2 — Çok adımlı plan

Kaynak, rota veya başka NPC’lerle etkileşim gerektirir.

```text
Köprüyü onar:

1. Hasarı incele
2. Gerekli tahtayı hesapla
3. Malzeme bul
4. Aletleri hazırla
5. Köprüyü onar
6. Güvenliğini test et
```

---

## Seviye 3 — Dinamik plan

Belirsizlik, keşif veya yüksek anlatı önemi içerir.

```text
Kayıp denizciyi bul:

1. Son görüldüğü yeri öğren
2. Olası rotaları çıkar
3. Tanıklarla konuş
4. Hava durumunu kontrol et
5. Tekne ve ekip hazırla
6. Arama bölgesini tara
7. Bulunan izlere göre rotayı değiştir
```

Bu seviyede plan yürütülürken yeniden planlama beklenir.

---

# 4. Task Decomposition

Büyük hedefler doğrudan gerçekleştirilemez.

Önce daha küçük görevlere ayrılır.

```ts
type NPCTask = {
  taskId: string;
  planId: string;

  taskType:
    | "move"
    | "observe"
    | "collect"
    | "communicate"
    | "use"
    | "repair"
    | "create"
    | "protect"
    | "wait"
    | "investigate"
    | "negotiate"
    | "request_help"
    | "verify"
    | "deliver";

  targetId?: string;
  locationId?: string;

  status:
    | "pending"
    | "available"
    | "executing"
    | "completed"
    | "failed"
    | "blocked"
    | "skipped"
    | "cancelled";

  prerequisites: TaskRequirement[];
  successConditions: TaskCondition[];
  failureConditions: TaskCondition[];

  estimatedDuration: number;
  estimatedEffort: number;
  risk: number;

  alternativeTaskIds?: string[];
};
```

---

# 5. İyi görev parçalama kuralları

Bir görev:

* tek bir anlaşılır sonuç üretmeli,
* başarı durumu ölçülebilir olmalı,
* gerekli kaynakları belirtmeli,
* başka görevlerle ilişkisi tanımlanmalı,
* çok büyük veya aşırı küçük olmamalıdır.

Yanlış parçalama:

```text
Görev:
Kayıp kişiyi bul ve her şeyi çöz
```

Daha doğru parçalama:

```text
1. Son görüldüğü yeri öğren
2. Yakındaki izleri incele
3. Olası rotaları belirle
4. Tanıklarla konuş
5. Yeni kanıtları karşılaştır
6. Arama bölgesi seç
```

Fakat görevleri aşırı küçültmek de doğru değildir.

Gereksiz parçalama:

```text
1. Sağ ayağını kaldır
2. Bir adım at
3. Sol ayağını kaldır
```

Bu ayrıntılar hareket sistemine bırakılmalıdır.

---

# 6. Hierarchical Task Network yaklaşımı

LUMI için en uygun planlama modeli, katmanlı görev ayrıştırmasıdır.

```text
Ana hedef
→ Ana görevler
→ Alt görevler
→ Gerçekleştirilebilir eylemler
```

Örnek:

```text
Goal:
Yaralı kuşa yardım et

Task:
Kuşu güvenli yere taşı

Subtasks:
- Kuşa yaklaş
- Korkutup korkutmadığını gözlemle
- Uygun taşıma bezi bul
- Kuşu dikkatlice kaldır
- Şifacıya götür
```

Bazı görevler birden fazla yöntemle çözülebilir.

```text
Task:
Kuşu şifacıya ulaştır

Method A:
Kendin taşı

Method B:
Sepet kullan

Method C:
Şifacıyı bulunduğu yere çağır

Method D:
Başka bir NPC’den yardım iste
```

Bu yapı sayesinde NPC yalnızca sabit görev listesi izlemez.

---

# 7. Planning Templates

Her hedef için yapay zekânın sıfırdan plan üretmesi gerekmez.

Sık kullanılan hedefler için plan şablonları bulunabilir.

```ts
type PlanTemplate = {
  templateId: string;
  supportedGoalTypes: string[];
  requiredRoles?: string[];
  taskPattern: TaskPattern[];
  defaultFallbacks: string[];
  safetyTier: number;
};
```

Örnek arama şablonu:

```text
SEARCH_TARGET

1. Hedef hakkında son bilgiyi topla
2. Son bilinen konumu belirle
3. Yakın çevreyi incele
4. İz veya tanık ara
5. Arama alanını genişlet
6. Sonucu doğrula
7. Hedefe güvenli biçimde yaklaş
```

Örnek onarım şablonu:

```text
REPAIR_OBJECT

1. Hasarı incele
2. Onarım mümkün mü değerlendir
3. Gerekli araçları belirle
4. Malzeme topla
5. Onarımı gerçekleştir
6. Sonucu test et
```

Şablonlar NPC kişiliği ve dünya durumuna göre uyarlanır.

---

# 8. Plan strategy seçimi

Aynı hedefe sahip NPC’ler aynı planı seçmemelidir.

Plan stratejisi şu vektörlerden etkilenir:

```text
Courage
Caution
Patience
Curiosity
Sociability
Independence
Resourcefulness
Responsibility
Trust
Experience
```

Örnek hedef:

```text
Ormandaki gizemli sesi araştır
```

Cesur NPC:

```text
Doğrudan sesin geldiği yöne ilerle
```

Temkinli NPC:

```text
Önce başkalarının da sesi duyup duymadığını öğren
Harita ve fener hazırla
Gündüz yola çık
```

Sosyal NPC:

```text
Bir ekip oluştur
Görevleri paylaş
Birlikte araştır
```

Meraklı fakat korkak NPC:

```text
Uzak bir noktadan gözlem yap
Notlar tut
Başkasından yaklaşmasını iste
```

---

# 9. Plan Utility Evaluation

Bir plan seçilirken yalnızca en kısa yol değerlendirilmez.

```text
Plan Utility
=
Goal Progress
+ Personality Compatibility
+ Safety
+ Resource Efficiency
+ Time Suitability
+ Relationship Benefit
+ Role Compatibility
+ Information Gain
- Risk
- Cost
- Conflict
- Narrative Restriction
```

Örneğin en hızlı plan, NPC’nin değerlerine aykırı olabilir.

```text
Hedef:
Kapalı depodan ilaç almak

En hızlı yöntem:
Kapıyı kırmak

Alternatif:
Depo görevlisini bulmak
```

Sorumluluk sahibi bir NPC ikinci planı tercih edebilir.

Acil durum çok yüksekse kapıyı kırmak yine mümkün olabilir. Ancak bu durumda NPC:

* neden yaptığını bilir,
* sonucu hafızaya alır,
* daha sonra özür dileme veya telafi etme hedefi oluşturabilir.

---

# 10. Plan assumptions

Her plan bazı varsayımlara dayanır.

```ts
type PlanAssumption = {
  assumptionId: string;
  description: string;
  confidence: number;
  validationRequired: boolean;
  invalidationEffect:
    | "minor"
    | "task_change"
    | "replan"
    | "plan_failure";
};
```

Örnek:

```text
Varsayım:
Köprü hâlâ kullanılabilir durumda

Varsayım:
Şifacı evinde olacak

Varsayım:
Keçi ormanın kuzey tarafına gitti

Varsayım:
Gerekli aletler depoda bulunuyor
```

NPC bu varsayımları kesin gerçek olarak görmemelidir.

Plan yürütülürken varsayımlar doğrulanabilir.

```text
Şifacı evde değilse:
Plan tamamen başarısız olmaz.

Yeni seçenekler:
- Nerede olduğunu sor
- Bekle
- Başka şifacı bul
- Mesaj bırak
```

---

# 11. Information confidence

NPC’nin planı, sahip olduğu bilginin doğruluğuna bağlıdır.

```ts
type InformationConfidence = {
  sourceType:
    | "direct_observation"
    | "trusted_person"
    | "rumor"
    | "memory"
    | "inference"
    | "written_record";

  confidence: number;
  age: number;
  contradictionCount: number;
};
```

Örneğin:

```text
“Keçi kuzeye gitti.”

Kaynak:
Bir çocuk uzaktan gördüğünü söylüyor.

Güven:
Orta
```

NPC önce bilgiyi doğrulamayı seçebilir.

```text
Task:
Kuzey yolunda ayak izi ara
```

Bu sayede söylenti, otomatik olarak gerçek dünya bilgisine dönüşmez.

---

# 12. Task prerequisites

Her görev başlamadan önce gereken şartlar kontrol edilir.

```text
Gerekli eşya
Gerekli bilgi
Gerekli beceri
Gerekli konum
Gerekli izin
Gerekli NPC
Uygun hava
Uygun zaman
Yeterli sağlık
Yeterli enerji
```

Örnek:

```text
Task:
Eski kuleye tırman

Requirements:
- Halat
- Yeterli fiziksel enerji
- Fırtına olmaması
- Tırmanış bilgisi veya yardımcı NPC
```

Şartlar karşılanmıyorsa görev `blocked` olur.

Ardından yeni destek görevleri üretilebilir:

```text
Halat bul
Tırmanmayı bilen birini bul
Havanın düzelmesini bekle
Alternatif giriş ara
```

---

# 13. Resource planning

NPC, hedef için gereken kaynakları önceden değerlendirebilir.

```ts
type PlanResourceRequirement = {
  resourceType:
    | "item"
    | "food"
    | "money"
    | "tool"
    | "knowledge"
    | "time"
    | "energy"
    | "social_support";

  resourceId?: string;
  requiredAmount: number;
  currentAmount: number;
  optional: boolean;
};
```

Kaynak planlaması sırasında NPC:

* sahip olduğu kaynakları kullanabilir,
* satın alabilir,
* ödünç isteyebilir,
* üretebilir,
* alternatif kaynak bulabilir,
* plandan çıkarabilir.

Örneğin fener bulunamazsa:

```text
Meşale hazırla
Gündüz git
Işıklı mantarları kullan
Başka NPC’den fener ödünç al
```

Alternatifin dünya kurallarıyla uyumlu olması gerekir.

---

# 14. Time planning

NPC planları zaman açısından değerlendirilmelidir.

```text
Görevin süresi
Günün saati
Hava durumu
NPC rutini
Hedefin son tarihi
Yolculuk süresi
Dinlenme ihtiyacı
Beklenen gecikmeler
```

Örnek:

```text
Orman yolculuğu:
4 saat

Gün batımına kalan süre:
2 saat
```

Temkinli NPC:

```text
Sabaha ertele
```

Acil durumda:

```text
Yakındaki kulübeye kadar ilerle
Orada geceyi geçir
Sabah devam et
```

Plansız biçimde sürekli yürümek yerine ara hedef oluşturulur.

---

# 15. Multi-Step Action Execution

Plan hazırlandıktan sonra görevler sırayla yürütülür.

```text
1. Uygun görevleri belirle
2. Öncelikli görevi seç
3. Ön şartları doğrula
4. Eylemi gerçekleştir
5. Sonucu gözlemle
6. Dünya durumunu güncelle
7. Planı yeniden değerlendir
8. Sonraki göreve geç
```

Her görev sonrası planın tamamen yeniden hesaplanması gerekmez.

Yalnızca anlamlı değişiklikler değerlendirilir.

```ts
type TaskExecutionResult = {
  taskId: string;

  result:
    | "success"
    | "partial_success"
    | "failure"
    | "blocked"
    | "interrupted"
    | "invalidated";

  progressDelta: number;
  observedChanges: WorldStateChange[];
  discoveredInformation: KnowledgeEntry[];
  consumedResources: ResourceChange[];
  producedResources: ResourceChange[];
  emotionalEffects: EmotionDelta[];
  relationshipEffects: RelationshipDelta[];
  requiresReplan: boolean;
};
```

---

# 16. Partial task success

Görevlerin tamamı ikili sonuç üretmemelidir.

Örnek görev:

```text
Kayıp keçinin izlerini bul
```

Sonuçlar:

```text
Tam başarı:
Taze izler bulundu

Kısmi başarı:
Eski izler bulundu fakat yön net değil

Başarısızlık:
Hiç iz bulunamadı

Yeni bilgi:
İzler yağmurdan silinmiş

Yan etki:
Başka bir hayvana ait iz bulundu
```

Kısmi başarı yeni görevler doğurabilir.

```text
Yüksek bir noktadan çevreyi gözlemle
Yakındaki çobana sor
Çanın sesini dinle
```

---

# 17. Execution interruption

NPC görevi yürütürken kesintiye uğrayabilir.

Kesinti kaynakları:

* dünya olayı,
* başka NPC’nin yardım çağrısı,
* tehlike,
* hava değişimi,
* sağlık sorunu,
* oyuncunun gelişi,
* daha acil bir hedef,
* kaynak kaybı,
* yolun kapanması.

```ts
type ActionInterruption = {
  sourceType:
    | "world_event"
    | "npc_request"
    | "danger"
    | "weather"
    | "health"
    | "player_arrival"
    | "priority_change"
    | "resource_loss";

  severity: number;
  temporary: boolean;
  requiresImmediateResponse: boolean;
};
```

Kesinti sonrası NPC şu seçeneklerden birini seçer:

```text
Göreve devam et
Görevi geçici durdur
Güvenli noktaya çekil
Yeni olaya müdahale et
Planı değiştir
Görevi başkasına devret
Hedefi terk et
```

---

# 18. Replanning System

Planın bazı parçaları geçersiz olduğunda NPC yeni plan oluşturur.

Yeniden planlama tetikleyicileri:

```text
Ana varsayım yanlış çıktı
Gerekli kaynak kayboldu
Rota kapandı
Hedef yer değiştirdi
Yeni bilgi bulundu
Risk beklenenden yüksek çıktı
Başka bir NPC plana katıldı
Hedefin önceliği değişti
Oyuncu farklı bir çözüm sundu
```

```ts
type ReplanTrigger = {
  triggerType:
    | "assumption_invalid"
    | "resource_unavailable"
    | "route_blocked"
    | "target_changed"
    | "new_information"
    | "risk_increase"
    | "new_actor"
    | "priority_change"
    | "player_input";

  severity: number;
  affectedTaskIds: string[];
};
```

---

# 19. Local repair ve full replan

Her sorun planın tamamını çöpe atmamalıdır.

## Local repair

Yalnızca ilgili görev değiştirilir.

```text
Sorun:
Şifacı evde değil

Düzeltme:
Şifacının nerede olduğunu sor
```

Diğer görevler korunur.

---

## Partial replan

Planın belirli bir bölümü yeniden oluşturulur.

```text
Sorun:
Kuzey yolu kapandı

Değiştirilen bölüm:
Rota görevleri

Korunan bölüm:
Hazırlık ve ekip görevleri
```

---

## Full replan

Ana strateji artık geçersizdir.

```text
Sorun:
Aranan kişinin denizde olmadığı öğrenildi

Eski plan:
Tekneyle kıyı araması

Yeni plan:
Karadaki eski yol güzergâhını araştır
```

Bu ayrım işlem maliyetini azaltır ve NPC’nin tutarlı görünmesini sağlar.

---

# 20. Plan inertia

NPC her küçük değişiklikte plan değiştirmemelidir.

Aksi hâlde kararsız ve rastgele görünür.

```ts
type PlanInertia = {
  commitment: number;
  progressMade: number;
  switchingCost: number;
  confidenceInCurrentPlan: number;
  toleranceForUncertainty: number;
};
```

NPC mevcut planı sürdürmeye daha yatkın olur:

* ilerleme sağladıysa,
* plana güveniyorsa,
* değiştirmenin maliyeti yüksekse,
* hedefe güçlü biçimde bağlıysa.

Fakat açıkça başarısız bir plana sırf başladığı için devam etmemelidir.

---

# 21. Failure learning

Bir görev başarısız olduğunda NPC yalnızca sonucu değil, sebebi de kaydetmelidir.

```text
Görev başarısız oldu:
Kapı açılamadı

Sebep:
Yanlış anahtar kullanıldı

Öğrenilen bilgi:
Anahtar demir kapıya ait değil

Sonraki plan etkisi:
Aynı anahtarı tekrar deneme
Kapı sahibini bul
Kapı üzerindeki sembolü araştır
```

```ts
type PlanningLesson = {
  contextSignature: string;
  failedMethod: string;
  failureReason: string;
  recommendedAdjustment?: string;
  confidence: number;
};
```

Bu öğrenme kalıcı veya geçici olabilir.

NPC’nin deneyimine dönüşebilir.

---

# 22. Planning memory

NPC daha önce benzer hedefleri gerçekleştirdiyse eski planlardan yararlanabilir.

```text
Geçmiş deneyim:
Kayıp koyunu bulurken dere kenarındaki izleri takip etmişti

Yeni olay:
Başka bir hayvan kayboldu

Plan etkisi:
Su kaynaklarını erken kontrol et
```

Ancak eski yöntem her durumda otomatik uygulanmamalıdır.

```text
Geçmişte işe yaradı
≠
Her zaman doğru yöntem
```

Bağlam benzerliği değerlendirilmelidir:

```text
Hedef türü
Bölge
Hava
Mevsim
NPC yetenekleri
Kaybolan hedefin davranışı
Tehlike seviyesi
```

---

# 23. Collaboration planning

Bir plan birden fazla NPC gerektiriyorsa görev dağılımı yapılır.

```ts
type CollaborativePlan = {
  planId: string;
  participants: PlanParticipant[];
  coordinationMethod:
    | "leader_directed"
    | "shared_decision"
    | "role_based"
    | "informal";
};

type PlanParticipant = {
  actorId: string;
  assignedTaskIds: string[];
  reliabilityEstimate: number;
  skillFit: number;
  relationshipTrust: number;
};
```

Örnek:

```text
Köprü onarımı

Marangoz:
Hasarı inceler ve tahtaları yerleştirir

Bekçi:
Yolu geçici olarak kapatır

Tüccar:
Malzeme getirir

Çocuk:
Akıntıya düşen alet çantasını güvenli yoldan bulabilir
```

Görevler karakter becerilerine göre dağıtılır.

---

# 24. Coordination failures

Ortak planlar her zaman kusursuz işlemez.

Sorunlar:

* NPC gecikir,
* görevi yanlış anlar,
* kaynağı getiremez,
* başka bir hedefe yönelir,
* iletişim kopar,
* güven problemi çıkar.

Bu durumda plan:

```text
Görevi yeniden dağıtabilir
Bekleyebilir
Yedek katılımcı çağırabilir
Kapsamı küçültebilir
Oyuncudan yardım isteyebilir
```

Fakat her koordinasyon sorunu dramatik çatışmaya dönüşmemelidir.

Bazen yalnızca küçük bir gecikme olur.

---

# 25. Delegation quality

NPC, görev devrederken şu faktörleri değerlendirmelidir:

```text
Beceri uyumu
Güvenilirlik
Mevcut yük
Konuma yakınlık
İlişki
Risk
Görevin gizliliği
Yetki
```

Örnek:

```text
Gizli mektubu teslim et
```

NPC en hızlı kişiyi değil, en güvenilir kişiyi seçebilir.

```text
Ağır sandığı taşı
```

Burada güvenilirlik kadar fiziksel yeterlilik önemlidir.

---

# 26. Player-inclusive plans

Bazı planlar oyuncunun katılımına açık olabilir.

Ancak oyuncu gelmeden NPC bütün görevleri boşta bekletmemelidir.

Doğru yapı:

```text
NPC’nin yapabileceği hazırlıklar:
- Haritayı bul
- Malzemeleri hazırla
- Giriş yolunu belirle
- Güvenli kamp alanı oluştur

Oyuncuya bırakılan görev:
- Mağaraya birlikte gir
- Ana bilmeciyi çöz
- Önemli ahlaki kararı ver
```

Bu sayede NPC aktif kalır, fakat ana deneyim korunur.

---

# 27. Player dependency

Bazı görevler bilinçli olarak oyuncuya bağımlı olabilir.

```ts
type PlayerDependency = {
  dependencyType:
    | "presence"
    | "choice"
    | "special_item"
    | "relationship"
    | "knowledge"
    | "story_authority";

  reason: string;
  waitMode:
    | "hold_position"
    | "prepare"
    | "continue_side_tasks"
    | "send_request";
};
```

Örnek:

```text
Eski kapı yalnızca çocuğun taşıdığı yıldız anahtarıyla açılıyor.
```

NPC kapıda sonsuza kadar hareketsiz beklemez.

Bu sırada:

* çevreyi araştırabilir,
* kamp kurabilir,
* ek bilgi toplayabilir,
* güvenli dönüş yolu hazırlayabilir.

---

# 28. Plan execution budget

Tüm NPC planları aynı ayrıntıda simüle edilmemelidir.

```text
Yüksek önemde NPC:
Görev bazlı yürütme

Orta önemde NPC:
Plan aşaması bazlı yürütme

Düşük önemde NPC:
Tahmini sonuç simülasyonu

Çok uzak NPC:
Toplu durum güncellemesi
```

Örnek:

```text
Yakındaki ana NPC:
Her görevi ayrı çalıştır

Uzak köydeki marangoz:
“Gerekli tahtaları iki gün içinde hazırladı.”
```

Bu, hesaplama maliyetini düşürür.

---

# 29. Offline progression ile plan yürütme

Oyuncu uzun süre yokken planlar tam ayrıntıyla çalıştırılmamalıdır.

## Kısa yokluk

```text
Görevler ayrıntılı yürütülebilir
Küçük sonuçlar uygulanabilir
```

## Orta yokluk

```text
Plan aşamaları özetlenir
Yalnızca önemli görev sonuçları saklanır
```

## Uzun yokluk

```text
Hazırlık ve güvenli ilerleme uygulanır
Ana anlatı eşiğinde plan durdurulur
```

Örnek:

```text
NPC gözlemevine ulaşabilir.
Kapıyı inceleyebilir.
Gerekli mekanizmayı keşfedebilir.

Ancak oyuncu olmadan kapıyı açıp ana gizemi çözmez.
```

---

# 30. Plan safety limits

NPC planları oluşturulurken güvenlik sınırları uygulanmalıdır.

```text
Yüksek riskli eylemler otomatik seçilmez
Geri döndürülemez sonuçlar sınırlandırılır
Çocuk dostu anlatı tonu korunur
Ana karakterlerin kalıcı kaybı otomatik gerçekleşmez
NPC oyuncu görevlerini tüketmez
Tehlike gerektiğinde hazırlık aşamasında durdurulur
```

Tier 3 ve Tier 4 sonuçlar planın son görevi olamaz; anlatı kontrol kapısına bağlanır.

```ts
type NarrativeGate = {
  gateType:
    | "player_presence"
    | "player_choice"
    | "story_session"
    | "parental_rule"
    | "authored_event";

  blockedTaskId: string;
};
```

---

# 31. Explainable planning

Önemli NPC kararları açıklanabilir olmalıdır.

Sistem şu sorulara cevap verebilmelidir:

```text
NPC neden bu planı seçti?
Neden diğer planı seçmedi?
Neden yardım istedi?
Neden görevi erteledi?
Neden rotayı değiştirdi?
Neden hedeften vazgeçti?
```

Örnek karar kaydı:

```json
{
  "goal": "yaralı_kuşu_iyileştir",
  "selectedPlan": "şifacıyı_buraya_getir",
  "reasons": [
    "Kuşun taşınması riskli",
    "NPC'nin taşıma becerisi düşük",
    "Şifacı yakın bölgede",
    "Kuşun durumu acil fakat stabil"
  ],
  "rejectedPlans": [
    {
      "plan": "kuşu_kendin_taşı",
      "reason": "Yaralanmayı kötüleştirme riski"
    }
  ]
}
```

Bu kayıt geliştirici araçlarında görülebilir.

Oyuncuya teknik biçimde gösterilmesi gerekmez.

---

# 32. Planning state machine

```text
Goal Activated
      ↓
Plan Candidate Generation
      ↓
Plan Evaluation
      ↓
Plan Selected
      ↓
Task Decomposition
      ↓
Ready
      ↓
Executing
      ↓
Task Result
  ↙    ↓     ↘
Next  Repair  Replan
Task  Task
      ↓
Goal Completion Check
  ↙             ↘
Complete       Continue
```

Engel durumunda:

```text
Executing
→ Blocked
→ Wait / Acquire Resource / Ask Help / Replan
→ Executing
```

---

# 33. Örnek uçtan uca senaryo

## NPC

Mira, genç köy şifacısı.

Özellikleri:

```text
Care: yüksek
Responsibility: yüksek
Courage: orta
Caution: yüksek
Social confidence: orta
```

## Goal

```text
Yaralı tilkiye yardım et
```

## Plan adayları

### Plan A

Tilkiyi yakalayıp kliniğe götür.

```text
Hızlı
Taşıma riski yüksek
Tilkinin korkma ihtimali yüksek
```

### Plan B

Tilkinin yanında geçici tedavi alanı oluştur.

```text
Daha yavaş
Daha güvenli
Ek malzeme gerekir
```

### Plan C

Başka bir şifacı çağır.

```text
Güvenli
Fakat yardım uzakta
```

## Seçilen plan

Plan B.

Sebep:

```text
Tilki taşınamayacak kadar ürkek.
Durumu acil fakat hemen ölümcül değil.
Mira güvenliği hızdan daha önemli görüyor.
```

## Task decomposition

```text
1. Tilkiyi uzaktan gözlemle
2. Yaralanma türünü değerlendir
3. Temiz bez ve su getir
4. Yaklaşmak için güven oluştur
5. Yarayı temizle
6. Güvenli geçici barınak hazırla
7. Ertesi gün tekrar kontrol et
```

## İlk kesinti

Mira temiz bez bulamaz.

```text
Task blocked:
Gerekli kaynak eksik
```

## Local repair

```text
Yeni task:
Eski fakat temizlenebilir kumaş bul

Yeni task:
Kumaşı kaynatıp temizle
```

Planın tamamı değişmez.

## İkinci gelişme

Tilki Mira’ya yaklaşmıyor.

```text
Task partial failure:
Güven yetersiz
```

## Replan

```text
Doğrudan yaklaşma görevini kaldır

Yeni görevler:
- Yiyeceği yakına bırak
- Bir süre uzaklaş
- Tilkinin sakinleşmesini bekle
```

## Oyuncunun dönüşü

Çocuk geldiğinde tilki geçici barınaktadır fakat hâlâ tam iyileşmemiştir.

Mira şöyle der:

```text
“Yarasını temizleyebildim ama bana hâlâ tam güvenmiyor.
Daha önce ona yardım ettiğin için seni hatırlayabilir.
Birlikte yaklaşmayı deneyebiliriz.”
```

NPC planı ilerletmiştir.

Fakat anlamlı ilişki ve hikâye anı oyuncuya bırakılmıştır.

---

# 34. Teknik servis ayrımı

Bu sistemi birkaç bağımsız servis şeklinde tasarlayabiliriz.

```text
Goal Planner
→ Hedef için plan adayları üretir

Plan Evaluator
→ Planları puanlar ve seçer

Task Decomposer
→ Planı görevlere ayırır

Task Scheduler
→ Görevlerin yürütme sırasını belirler

Action Executor
→ Seçilen görevi dünya üzerinde uygular

Plan Monitor
→ Sonuçları ve değişiklikleri takip eder

Replanner
→ Bozulan planı onarır veya yeniden oluşturur

Planning Memory
→ Geçmiş plan ve başarısızlıkları saklar
```

Bu ayrım sistemin test edilmesini kolaylaştırır.

---

# 35. Deterministik ve üretken planlama

Planlama tamamen üretken modele bırakılmamalıdır.

En sağlıklı hibrit yapı:

```text
Kurallı plan şablonları
+
Dünya durumuna dayalı görev üretimi
+
Utility değerlendirmesi
+
Gerektiğinde LLM destekli zenginleştirme
```

Kurallı sistem:

* güvenli sonuç verir,
* test edilebilir,
* tekrar üretilebilir,
* maliyeti düşüktür.

LLM desteği:

* sıra dışı durumlarda alternatif plan üretir,
* açıklamaları doğallaştırır,
* görev adlarını ve anlatı özetlerini geliştirir.

LLM doğrudan dünya state’ini değiştirmez.

Yalnızca yapılandırılmış plan önerisi üretir.

---

# 36. Plan validation

Üretilen her plan yürütülmeden önce doğrulanmalıdır.

```text
Görevler dünya kurallarına uyuyor mu?
Kaynaklar gerçekten mevcut mu?
Konumlar erişilebilir mi?
NPC gerekli beceriye sahip mi?
Plan başka bir önemli state ile çelişiyor mu?
Görevler doğru sırada mı?
Plan oyuncunun hikâyesini tüketiyor mu?
Sonuç yaş grubuna uygun mu?
```

```ts
type PlanValidationResult = {
  valid: boolean;
  errors: PlanValidationIssue[];
  warnings: PlanValidationIssue[];
  requiredNarrativeGates: NarrativeGate[];
};
```

Geçersiz plan uygulanmaz.

Gerekirse tekrar üretilir.

---

# 37. Test senaryoları

Sistem için temel testler:

## Test 1 — Kaynak eksikliği

```text
NPC köprüyü onarmak istiyor.
Tahta yok.
```

Beklenen:

```text
Onarım görevi bloke olur.
Tahta bulma veya isteme görevi üretilir.
```

## Test 2 — Rota kapanması

```text
NPC şifacıya gidiyor.
Sel yolu kapatıyor.
```

Beklenen:

```text
Alternatif rota değerlendirilir.
Gerekirse hedef geçici olarak duraklatılır.
```

## Test 3 — Yanlış bilgi

```text
NPC kayıp hedefin kuzeye gittiğini sanıyor.
Yeni kanıt güneye gittiğini gösteriyor.
```

Beklenen:

```text
Eski rota görevleri iptal edilir.
Kısmi yeniden planlama yapılır.
```

## Test 4 — Oyuncu bağımlılığı

```text
Kapı yalnızca oyuncunun anahtarıyla açılıyor.
```

Beklenen:

```text
NPC hazırlık görevlerini tamamlar.
Kapıyı açma görevinde bekler.
Ana keşif gerçekleşmez.
```

## Test 5 — Tekrarlanan başarısızlık

```text
NPC aynı kilidi üç kez açmayı deniyor.
```

Beklenen:

```text
Aynı eylem sınırsız tekrarlanmaz.
Yeni yöntem veya yardım hedefi üretilir.
```

## Test 6 — Düşük önem NPC

```text
Uzak köydeki çiftçi hasat planı yürütüyor.
```

Beklenen:

```text
Her görev ayrı çalıştırılmaz.
Toplu plan sonucu uygulanır.
```

---

# 38. Sistem ilkeleri

1. NPC hedefi doğrudan eyleme dönüştürmeden önce uygulanabilir bir plan oluşturmalıdır.
2. Büyük hedefler ölçülebilir görevlere ayrılmalıdır.
3. Aynı hedef için birden fazla plan yolu bulunabilmelidir.
4. Plan seçimi kişilik, rol, kaynak, risk ve ilişki vektörlerinden etkilenmelidir.
5. NPC yalnızca doğru bilgiye değil, doğru olduğuna inandığı bilgiye göre plan yapmalıdır.
6. Yanlış varsayımlar görev sırasında ortaya çıkabilmelidir.
7. Her başarısızlık tam plan değişimi gerektirmemelidir.
8. Yerel düzeltme, kısmi yeniden planlama ve tam yeniden planlama ayrılmalıdır.
9. NPC aynı başarısız yöntemi anlamsız biçimde tekrarlamamalıdır.
10. Planlar oyuncunun hikâyesini tüketmemeli, oyuncu için hazırlanmış fırsatlar oluşturmalıdır.
11. Uzak NPC planları özetlenmiş biçimde yürütülmelidir.
12. Önemli plan kararları geliştirici açısından açıklanabilir olmalıdır.
13. LLM plan önerebilir fakat dünya state’ini doğrudan değiştiremez.
14. Her plan uygulanmadan önce kurallı doğrulamadan geçmelidir.
15. NPC planlama yeteneği bilgi, deneyim ve karakter gelişimiyle değişebilmelidir.

---

# 39. Backlog kararları

### PLN-01 — Goal-to-plan ayrımı

Hedef ile hedefe ulaşmak için seçilen strateji farklı varlıklar olarak tutulacak.

### PLN-02 — Katmanlı görev ayrıştırması

Planlar ana görev, alt görev ve uygulanabilir eylem seviyelerine ayrılabilecek.

### PLN-03 — Plan templates

Sık kullanılan hedefler için doğrulanmış plan şablonları hazırlanacak.

### PLN-04 — Çoklu plan adayları

Önemli hedeflerde en az birkaç alternatif plan değerlendirilebilecek.

### PLN-05 — Plan assumptions

Planların dayandığı belirsiz varsayımlar açık biçimde saklanacak.

### PLN-06 — Task prerequisites

Her görevin bilgi, kaynak, beceri, konum ve zaman ön şartları tanımlanabilecek.

### PLN-07 — Partial task success

Görevler başarı ve başarısızlığın yanında kısmi sonuçlar üretebilecek.

### PLN-08 — Local plan repair

Küçük engellerde planın tamamı yerine yalnızca ilgili görev değiştirilecek.

### PLN-09 — Partial and full replanning

Plan onarımı, kısmi yeniden planlama ve tam yeniden planlama ayrı süreçler olacak.

### PLN-10 — Failure learning

NPC başarısız yöntemleri ve nedenlerini planlama hafızasında tutacak.

### PLN-11 — Collaboration planning

Ortak hedeflerde görevler NPC yetenekleri ve güven ilişkilerine göre dağıtılacak.

### PLN-12 — Player dependency gate

Oyuncu katılımı gereken görevler anlatı kapılarıyla durdurulacak.

### PLN-13 — Simulation detail scaling

Plan yürütme ayrıntısı NPC’nin anlatısal ve mekânsal önemine göre ölçeklenecek.

### PLN-14 — Plan validation

Tüm planlar uygulanmadan önce dünya kuralları, güvenlik ve anlatı sınırlarına göre doğrulanacak.

### PLN-15 — Hybrid planning

Plan şablonları, utility değerlendirmesi ve kontrollü LLM desteği birlikte kullanılacak.

### PLN-16 — Explainable planning

Önemli plan seçimleri ve reddedilen alternatifler geliştirici araçlarında açıklanabilir olacak.
