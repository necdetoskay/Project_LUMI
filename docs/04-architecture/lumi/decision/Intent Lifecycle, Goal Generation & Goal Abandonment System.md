# Intent Lifecycle, Goal Generation & Goal Abandonment System

Bu sistem, NPC’lerin niyetlerinin ve hedeflerinin nasıl ortaya çıktığını, zamanla nasıl değiştiğini, hangi koşullarda güçlendiğini ve ne zaman terk edildiğini yönetir.

Bir NPC’nin hedefi yalnızca sistem tarafından atanmış sabit bir görev olmamalıdır.

> Hedefler; ihtiyaçlardan, duygulardan, ilişkilerden, anılardan, dünya olaylarından ve NPC’nin kişiliğinden doğmalıdır.

Bu sayede NPC davranışı şu yapıya dönüşür:

```text
Algı
→ Yorumlama
→ İhtiyaç veya motivasyon oluşumu
→ Niyet
→ Hedef
→ Plan
→ Eylem
→ Sonuç
→ Hafıza ve karakter değişimi
```

---

## 1. Intent ve Goal ayrımı

LUMI içinde **intent** ile **goal** aynı şey değildir.

### Intent

NPC’nin genel yönelimidir.

```text
Birini korumak
Bir sırrı öğrenmek
Kendini kanıtlamak
Bir hatayı düzeltmek
Güvende kalmak
Arkadaşlık kurmak
```

### Goal

Bu niyetin somut, ölçülebilir ve uygulanabilir hâlidir.

```text
Intent:
Kayıp kardeşimi bulmak

Goal:
Ormanın kuzey yolundaki izleri araştırmak
```

Bir intent aynı anda birden fazla goal üretebilir.

```text
Intent: Köyü yaklaşan fırtınadan korumak

Goal 1: Evleri uyarmak
Goal 2: Hayvanları ağıla toplamak
Goal 3: Köprüdeki gevşek tahtaları sabitlemek
Goal 4: Çocuğun dışarıda olup olmadığını kontrol etmek
```

Bu ayrım sayesinde bir hedef başarısız olsa bile temel niyet yaşamaya devam edebilir.

---

# 2. Intent Lifecycle

Bir niyet aşağıdaki yaşam döngüsünden geçer:

```text
Latent
→ Emerging
→ Active
→ Pursuing
→ Blocked / Paused
→ Fulfilled / Abandoned / Transformed
→ Archived
```

```ts
type IntentStatus =
  | "latent"
  | "emerging"
  | "active"
  | "pursuing"
  | "blocked"
  | "paused"
  | "fulfilled"
  | "abandoned"
  | "transformed"
  | "archived";
```

---

## 2.1 Latent Intent

Henüz aktif olmayan fakat NPC’nin içinde potansiyel olarak bulunan yönelimdir.

Örneğin:

* meraklı bir NPC’nin bilinmeyen yerleri keşfetme eğilimi,
* koruyucu bir NPC’nin çocuğu savunma eğilimi,
* yalnız bir NPC’nin arkadaş edinme arzusu,
* suçluluk taşıyan bir NPC’nin hatasını düzeltme ihtiyacı.

Latent intent sürekli hesaplanmaz. Uygun bir tetikleyici geldiğinde uyanır.

```text
Latent intent:
Eski denizlere dönme arzusu

Tetikleyici:
NPC eski kaptanına ait pusulayı görür

Sonuç:
Intent emerging durumuna geçer
```

---

## 2.2 Emerging Intent

Niyet oluşmaya başlamıştır fakat NPC henüz onu açıkça benimsememiştir.

Bu aşamada NPC:

* bir konu hakkında daha sık düşünür,
* bazı işaretlere dikkat etmeye başlar,
* küçük duygusal tepkiler verir,
* ilgili bilgi arar,
* henüz belirgin bir eylem gerçekleştirmez.

Örnek:

```text
Bir köylü, ormanda geceleri ışıklar görüldüğünü duyar.

İlk aşamada:
Merak eder fakat araştırmaya karar vermez.

Sonraki gün:
Başka bir NPC de aynı ışıkları gördüğünü söyler.

Intent güçlenir:
Işıkların kaynağını öğrenme arzusu oluşur.
```

Bu aşama, NPC’nin davranışının bir anda değişmesini engeller.

---

## 2.3 Active Intent

NPC artık bu isteği bilinçli şekilde taşımaktadır.

```text
“Ormandaki ışıkların ne olduğunu öğrenmek istiyorum.”
```

Ancak aktif niyet hemen eyleme dönüşmeyebilir.

NPC şu nedenlerle bekleyebilir:

* daha acil sorumlulukları vardır,
* yeterli bilgiye sahip değildir,
* korkuyordur,
* uygun zamanı bekliyordur,
* yardım arıyordur,
* gerekli eşyası yoktur.

Aktif intent, hedef üretmeye hazırdır.

---

## 2.4 Pursuing Intent

NPC, niyet doğrultusunda en az bir aktif hedef yürütmektedir.

```text
Intent:
Ormandaki ışıkları araştırmak

Active goals:
- Işıkları görenlerle konuş
- Güvenli bir rota öğren
- Fener bul
- Orman sınırına git
```

Bu aşamada intent, otonom aksiyon sistemi tarafından düzenli olarak değerlendirilir.

---

## 2.5 Blocked Intent

Niyet devam eder fakat mevcut hedefler gerçekleştirilemiyordur.

Engeller şunlar olabilir:

* fiziksel engel,
* bilgi eksikliği,
* kaynak eksikliği,
* başka bir NPC’nin direnci,
* korku,
* yaralanma,
* hava koşulu,
* zaman yetersizliği,
* çocuğun kararının beklenmesi.

```ts
type IntentBlocker = {
  blockerType:
    | "resource"
    | "knowledge"
    | "location"
    | "relationship"
    | "fear"
    | "health"
    | "time"
    | "world_state"
    | "player_dependency";

  sourceId?: string;
  severity: number;
  resolvable: boolean;
};
```

Blocked durumundaki intent şu sonuçları üretebilir:

* yeni hedef oluşturma,
* yardım isteme,
* alternatif plan geliştirme,
* geçici olarak bekleme,
* çocuğa görev önerme.

---

## 2.6 Paused Intent

Blocked ve paused aynı değildir.

### Blocked

NPC devam etmek ister fakat engellenmiştir.

### Paused

NPC bilinçli olarak niyeti geçici biçimde geri plana almıştır.

Örneğin:

```text
NPC kayıp haritayı aramak istiyor.
Ancak köyde sel başladığı için aramayı bırakıp insanlara yardım ediyor.
```

Burada niyet kaybolmaz. Daha acil bir niyet nedeniyle duraklatılır.

---

## 2.7 Fulfilled Intent

Niyet tatmin edici biçimde tamamlanmıştır.

Bu yalnızca teknik hedefin gerçekleşmesi anlamına gelmez.

```text
Intent:
Arkadaşımla barışmak

Goal:
Özür dilemek
```

NPC özür dilemiş olabilir fakat karşı taraf affetmemişse intent tamamlanmış sayılmayabilir.

Fulfillment değerlendirmesi şunlara bakar:

* ana ihtiyacın karşılanması,
* duygusal çözülme,
* ilişki sonucu,
* NPC’nin sonucu kabul etmesi,
* kalan açık hedefler,
* yeni bir devam niyetinin oluşup oluşmaması.

---

## 2.8 Abandoned Intent

NPC niyeti sürdürmekten vazgeçmiştir.

Ancak terk etme keyfî olmamalıdır.

Olası nedenler:

* hedefin artık anlamlı olmaması,
* maliyetin çok yükselmesi,
* motivasyonun azalması,
* başka bir değerin öncelik kazanması,
* tekrar eden başarısızlık,
* yeni bilgiyle hedefin yanlış olduğunun anlaşılması,
* ilişki değişimi,
* NPC’nin karakter gelişimi.

Örneğin:

```text
NPC, köyden ayrılan arkadaşını geri getirmek istiyor.

Daha sonra arkadaşının kendi isteğiyle
başka bir yerde mutlu olduğunu öğreniyor.

Intent terk edilir.
```

Bu başarısızlık değildir. NPC’nin anlayışının değişmesidir.

---

## 2.9 Transformed Intent

Bazı niyetler tamamlanmaz veya terk edilmez; başka bir niyete dönüşür.

```text
Eski intent:
Ejderhayı yakalamak

Yeni bilgi:
Ejderhanın köyü koruduğu anlaşılır

Yeni intent:
Ejderhayı avcılardan korumak
```

Intent dönüşümü, karakter gelişiminin en güçlü araçlarından biridir.

```ts
type IntentTransformation = {
  previousIntentId: string;
  newIntentId: string;
  reason:
    | "new_information"
    | "emotional_change"
    | "relationship_change"
    | "moral_realization"
    | "world_event"
    | "failure"
    | "player_influence";
};
```

---

# 3. Intent Generation

Yeni niyetler doğrudan rastgele üretilmemelidir.

Niyet üretimi şu kaynaklardan beslenir:

```text
Need
+ Emotion
+ Memory
+ Personality
+ Relationship
+ Role
+ World Event
+ Perception
+ Opportunity
```

---

## 3.1 İhtiyaç kaynaklı niyetler

NPC’nin fiziksel, sosyal veya psikolojik ihtiyacından doğar.

```text
Açlık
→ Yiyecek bul

Yorgunluk
→ Dinlen

Yalnızlık
→ Birisiyle zaman geçir

Güvensizlik
→ Güvenli bir yer bul

Merak
→ Bilgi topla

Suçluluk
→ Hatayı telafi et
```

İhtiyaçlar vektörel tutulabilir:

```ts
type NeedVector = {
  safety: number;
  rest: number;
  food: number;
  belonging: number;
  recognition: number;
  autonomy: number;
  curiosity: number;
  purpose: number;
  repair: number;
};
```

Her ihtiyaç doğrudan niyet oluşturmaz. Belirli bir eşik aşılmalıdır.

---

## 3.2 Duygu kaynaklı niyetler

Yoğun duygular geçici veya kalıcı hedefler doğurabilir.

```text
Korku
→ Saklan
→ Yardım iste
→ Tehlikeyi araştır
→ Birini koru

Öfke
→ Yüzleş
→ Uzaklaş
→ Adalet ara
→ Kendini kanıtla

Üzüntü
→ Yalnız kal
→ Teselli ara
→ Hatıra oluştur
→ Kaybı telafi et

Sevinç
→ Paylaş
→ Kutlama yap
→ Hediye hazırla
```

Aynı duygu, kişilik özelliklerine göre farklı niyet üretir.

Örneğin korku:

* cesur NPC’de: tehlikeyi araştır,
* temkinli NPC’de: yardım çağır,
* koruyucu NPC’de: başkalarını güvene al,
* çekingen NPC’de: saklan.

---

## 3.3 Hafıza kaynaklı niyetler

NPC geçmişte yaşadığı olaylardan yeni niyetler çıkarabilir.

```text
Çocuk NPC’ye yardım etti
→ Çocuğa karşılık verme niyeti

NPC daha önce kandırıldı
→ Yeni yabancıları test etme niyeti

Bir köprü daha önce çöktü
→ Köprüyü düzenli kontrol etme niyeti

NPC verdiği sözü tutamadı
→ Sözü telafi etme niyeti
```

Hafızanın niyet üretmesi için yalnızca olay kaydı yeterli değildir.

Şu değerler de değerlendirilmelidir:

* olayın önemi,
* duygusal yoğunluğu,
* NPC’nin yorum biçimi,
* üzerinden geçen süre,
* benzer olayların tekrarı,
* mevcut dünya durumu.

---

## 3.4 İlişki kaynaklı niyetler

İlişkiler doğrudan hedef üretir.

```text
Yüksek güven:
Yardım et
Sır paylaş
Birlikte hareket et

Düşük güven:
Gözlemle
Bilgiyi doğrula
Mesafeyi koru

Kırgınlık:
Açıklama iste
Uzak dur
Özür bekle

Minnettarlık:
Hediye ver
Destek ol
İyi söz söyle

Koruma bağı:
Tehlikeyi önceden bildir
Yakınında kal
Riskli işi üstlen
```

İlişki niyetleri tek taraflı olabilir.

Bir NPC çocuğu arkadaşı olarak görürken çocuk henüz NPC’ye güvenmiyor olabilir.

---

## 3.5 Rol kaynaklı niyetler

NPC’nin mesleği, konumu veya toplumsal sorumluluğu hedef üretir.

```text
Bekçi:
Kapıyı koru
Şüpheli hareketleri araştır
Köyü uyar

Şifacı:
Yaralıları iyileştir
Bitki topla
İlaç hazırla

Öğretmen:
Çocuklara bilgi ver
Ders hazırlığı yap
Merakı destekle

Kaptan:
Gemiyi güvenli tut
Rotayı planla
Mürettebatı koru
```

Rol kaynaklı hedefler karakter kişiliğiyle değiştirilmelidir.

İki bekçi aynı olaya aynı tepkiyi vermek zorunda değildir.

---

## 3.6 Dünya olayı kaynaklı niyetler

Dünya olayları NPC’lere toplu veya bireysel niyetler verebilir.

Örneğin güneş tutulması:

```text
Bilgin NPC:
Nedenini araştır

Karanlıktan korkan NPC:
Güvenli bir yere git

Tüccar:
Dükkânı erken kapat

Çocukları koruyan NPC:
Herkesi eve çağır

Gökyüzü meraklısı NPC:
Tutulmayı izlemek için tepeye çık
```

Burada tek olay, farklı NPC’lerde farklı intent vektörleri oluşturur.

---

# 4. Intent Candidate Generation

Sistem bir NPC için doğrudan tek niyet üretmez.

Önce birkaç aday oluşturur:

```ts
type IntentCandidate = {
  category: string;
  targetId?: string;
  triggerIds: string[];
  motivationVector: MotivationVector;
  expectedValue: number;
  emotionalSupport: number;
  personalityFit: number;
  roleFit: number;
  relationshipFit: number;
  urgency: number;
  costEstimate: number;
  riskEstimate: number;
};
```

Örnek:

```text
Olay:
Köyün yakınında yaralı bir kuş bulundu.

Aday niyetler:
1. Kuşu iyileştir
2. Kuşun sahibini bul
3. Kuştan uzak dur
4. Şifacıya haber ver
5. Kuşun nereden geldiğini araştır
```

NPC’nin özelliklerine göre adaylar puanlanır.

---

# 5. Intent Activation Score

Bir niyetin aktifleşmesi için örnek değerlendirme:

```text
Intent Activation Score
=
Need Pressure
+ Emotional Intensity
+ Personality Fit
+ Role Responsibility
+ Relationship Relevance
+ Memory Reinforcement
+ Opportunity
- Risk Avoidance
- Resource Cost
- Competing Intent Pressure
```

Bu skor tek başına yeterli değildir.

Ek güvenlik filtreleri uygulanmalıdır:

* yaş uygunluğu,
* anlatı sınırları,
* geri döndürülemezlik riski,
* oyuncunun hikâyesini tüketme riski,
* mevcut simülasyon bütçesi.

---

# 6. Goal Generation

Aktif intent, doğrudan eyleme geçmek yerine hedeflere ayrılır.

```ts
type NPCGoal = {
  goalId: string;
  intentId: string;
  goalType:
    | "acquire"
    | "reach"
    | "protect"
    | "repair"
    | "learn"
    | "communicate"
    | "avoid"
    | "create"
    | "help"
    | "observe"
    | "prepare";

  targetId?: string;
  successConditions: GoalCondition[];
  failureConditions: GoalCondition[];
  prerequisites: GoalCondition[];
  priority: number;
  progress: number;
  deadline?: WorldTime;
  retryPolicy: RetryPolicy;
  status: GoalStatus;
};
```

---

## 6.1 Hedefler ölçülebilir olmalıdır

Yanlış hedef:

```text
Daha iyi biri ol
```

Doğru hedefler:

```text
Kırdığı oyuncağı tamir et
Arkadaşından özür dile
Bir gün boyunca verdiği sözü tut
Korktuğu mağaranın girişine kadar git
```

Soyut gelişim intent olabilir; goal somut olmalıdır.

---

## 6.2 Hedef parçalama

Büyük hedefler küçük hedeflere ayrılır.

```text
Intent:
Kayıp denizciyi bul

Ana goal:
Denizcinin yerini belirle

Alt hedefler:
- Son görüldüğü yeri öğren
- Liman kayıtlarını incele
- Eski mürettebatla konuş
- Kullanılan rotayı belirle
- Gerekli haritayı bul
```

NPC tüm alt hedefleri kendisi tamamlamak zorunda değildir.

Bazıları çocuğa hikâye görevi olarak sunulabilir.

---

# 7. Goal Dependency Graph

Hedefler doğrusal olmak zorunda değildir.

```text
Haritayı bul
      ↓
Rotayı öğren
      ↓
Tekneyi hazırla
     ↙ ↘
Yiyecek al   Mürettebat bul
      \       /
       Yolculuğa başla
```

```ts
type GoalDependency = {
  goalId: string;
  requiresGoalIds: string[];
  unlocksGoalIds: string[];
  dependencyType:
    | "hard"
    | "soft"
    | "optional"
    | "alternative";
};
```

### Hard dependency

Gerçekleşmeden hedef başlayamaz.

### Soft dependency

Gerçekleşirse başarı ihtimalini artırır.

### Alternative dependency

Birden fazla yoldan biri yeterlidir.

```text
Kapıyı açmak için:

Anahtarı bul
VEYA
Kapı sahibinden izin al
VEYA
Gizli mekanizmayı öğren
```

---

# 8. Competing Intent System

NPC aynı anda sınırsız niyet takip edemez.

Her NPC’nin bir intent kapasitesi olmalıdır.

```ts
type IntentCapacity = {
  activeIntentLimit: number;
  highCommitmentLimit: number;
  backgroundIntentLimit: number;
};
```

Örnek:

```text
Aktif yüksek öncelikli niyetler:
- Hasta annesine ilaç bul
- Köy görevini sürdür

Arka plan niyetleri:
- Eski arkadaşını ziyaret et
- Yeni bir çalgı öğren
```

Yeni ve çok acil bir niyet geldiğinde sistem şunlardan birini yapar:

* mevcut niyeti duraklatır,
* düşük öncelikli niyeti terk eder,
* iki hedefi birleştirir,
* yardım ister,
* zaman planını değiştirir.

---

# 9. Goal Merging

Bazı hedefler tek eylem zincirinde birleştirilebilir.

```text
Goal 1:
Şifacıya git

Goal 2:
Şifacıya kayıp çocuk hakkında soru sor

Goal 3:
Şifacıdan ilaç al
```

NPC bunları tek ziyaret planında gerçekleştirebilir.

Bu sistem:

* gereksiz simülasyonu azaltır,
* NPC davranışını doğal kılar,
* dünya hareketlerini daha tutarlı yapar.

---

# 10. Goal Conflict

Bazı hedefler doğrudan çelişebilir.

```text
Goal A:
Sırrı sakla

Goal B:
Arkadaşına tamamen dürüst ol
```

Çatışma çözümünde NPC değerleri kullanılır:

```text
Loyalty
Honesty
Safety
Responsibility
Care
Courage
Curiosity
Self-interest
```

Bu değerler tek sayı olmamalıdır.

Bağlama göre vektörel değerlendirme yapılmalıdır.

Örneğin NPC genel olarak dürüst olabilir fakat arkadaşını korumak amacıyla geçici olarak bilgiyi saklayabilir.

---

# 11. Goal Commitment

Her hedef aynı güçte takip edilmez.

```ts
type GoalCommitment = {
  emotionalCommitment: number;
  moralCommitment: number;
  socialCommitment: number;
  roleCommitment: number;
  sunkCost: number;
  identityAlignment: number;
};
```

Örneğin:

```text
“Pazardan elma almak”
→ düşük bağlılık

“Verdiğim sözü tutmak”
→ yüksek ahlaki bağlılık

“Kayıp kardeşimi bulmak”
→ yüksek duygusal bağlılık
```

Bağlılık seviyesi, başarısızlıktan sonra tekrar deneme ihtimalini belirler.

---

# 12. Goal Retry Policy

NPC her başarısızlıkta aynı şeyi tekrar etmemelidir.

```ts
type RetryPolicy = {
  maxAttempts?: number;
  retryDelay: number;
  changeStrategyAfterFailure: boolean;
  seekHelpAfterAttempts?: number;
  abandonThreshold: number;
};
```

Örnek:

```text
İlk deneme:
Kapıyı anahtarla aç

Başarısızlık:
Anahtar uymuyor

İkinci deneme:
Kapının sahibini bul

Başarısızlık:
Sahibi kayıp

Üçüncü yaklaşım:
Çocuktan gizli mekanizmayı araştırmasını iste
```

Bu, NPC’nin başarısızlığı fark edip strateji değiştirmesini sağlar.

---

# 13. Goal Progress

Hedefler yalnızca başarılı veya başarısız olmamalıdır.

```text
0.00 → Başlamadı
0.20 → İlk bilgi bulundu
0.45 → Gerekli araçlar hazır
0.70 → Konuma ulaşıldı
0.90 → Son engel kaldı
1.00 → Tamamlandı
```

Kısmi ilerleme hikâyeye dönüştürülebilir.

Örneğin çocuk döndüğünde:

```text
“Denizciyi henüz bulamadık ama gemisinin kırık
yelken parçası kuzey kıyısında bulundu.”
```

Bu, dünyanın durmuş görünmesini engeller fakat ana çözümü oyuncuya bırakır.

---

# 14. Goal Failure

Bir hedefin başarısız olması intent’in sona erdiği anlamına gelmez.

Başarısızlık türleri:

```ts
type GoalFailureType =
  | "temporary"
  | "strategy_failure"
  | "resource_failure"
  | "knowledge_failure"
  | "relationship_failure"
  | "timing_failure"
  | "world_state_change"
  | "permanent_impossibility"
  | "moral_rejection";
```

### Temporary failure

Daha sonra tekrar denenebilir.

### Strategy failure

Hedef doğru, yöntem yanlıştır.

### Permanent impossibility

Hedef artık gerçekleştirilemez.

### Moral rejection

NPC hedefin kendi değerleriyle uyuşmadığını fark eder.

---

# 15. Goal Abandonment

NPC’nin hedefi terk etmesi için abandonment skoru hesaplanabilir.

```text
Abandonment Pressure
=
Repeated Failure
+ Resource Drain
+ Emotional Exhaustion
+ Reduced Relevance
+ Competing Priorities
+ Low Success Probability
+ Changed Beliefs
- Commitment
- Relationship Importance
- Moral Obligation
- Progress Already Made
```

Ancak burada `sunk cost` etkisi kontrollü kullanılmalıdır.

NPC yalnızca çok emek verdiği için anlamsız bir hedefi sonsuza kadar sürdürmemelidir.

---

## 15.1 Terk etme türleri

```ts
type GoalAbandonmentReason =
  | "no_longer_relevant"
  | "too_risky"
  | "too_costly"
  | "impossible"
  | "conflicting_values"
  | "new_information"
  | "higher_priority_goal"
  | "emotional_exhaustion"
  | "relationship_change"
  | "fulfilled_by_other_means";
```

---

## 15.2 Sessiz terk etme olmamalı

Önemli bir hedef terk edildiğinde sistem nedenini kaydetmelidir.

```json
{
  "goalId": "goal_find_old_map",
  "status": "abandoned",
  "reason": "new_information",
  "explanation": "Haritanın aslında köyü tehlikeye atacak bir geçidi gösterdiği öğrenildi.",
  "emotionalImpact": {
    "disappointment": 0.5,
    "relief": 0.3,
    "fear": 0.2
  }
}
```

Bu kayıt daha sonra:

* NPC diyaloğunda,
* hafıza sisteminde,
* karakter gelişiminde,
* yeni intent üretiminde

kullanılabilir.

---

# 16. Goal Delegation

NPC bazı hedefleri başkasına devredebilir.

```text
Bekçi köy kapısını terk edemez.
Ancak ormandaki sesi araştırmak istiyor.

Çözüm:
Başka bir bekçiden yardım ister
veya
çocuğa güvenli bir araştırma görevi sunar.
```

```ts
type GoalDelegation = {
  goalId: string;
  delegatorNpcId: string;
  delegateeId: string;
  trustRequired: number;
  rewardPromise?: Reward;
  monitoringLevel: number;
  fallbackPlan?: string;
};
```

NPC’nin çocuğa verdiği her görev gerçekçi olmalıdır.

NPC, yapabileceği basit işleri sürekli çocuğa yüklememelidir.

---

# 17. Shared Goals

Birden fazla NPC aynı hedefi paylaşabilir.

```text
Köprüyü onarma hedefi:

Marangoz:
Tahtaları hazırlar

Bekçi:
Yolu güvenli tutar

Tüccar:
Malzeme sağlar

Çocuk:
Kayıp alet çantasını bulabilir
```

Ortak hedef içinde roller tanımlanmalıdır.

```ts
type SharedGoalRole = {
  actorId: string;
  role:
    | "leader"
    | "executor"
    | "support"
    | "observer"
    | "resource_provider"
    | "protector";
  contributionWeight: number;
};
```

Bu sayede dünya olayları tek bir karakterin işi gibi görünmez.

---

# 18. Player Influence on Intent

Çocuğun eylemleri NPC niyetlerini etkileyebilir.

```text
Çocuk yardım etti:
NPC’nin güven ve minnettarlık niyeti güçlenir

Çocuk sözünü tutmadı:
NPC’nin temkinli davranma niyeti güçlenir

Çocuk korkan NPC’yi cesaretlendirdi:
NPC’nin keşif niyeti aktifleşebilir

Çocuk alternatif çözüm gösterdi:
NPC eski hedefini dönüştürebilir
```

Ancak çocuk NPC’yi doğrudan programlamamalıdır.

```text
“Artık korkma.”
```

demek NPC’nin korkusunu anında silmez.

Bunun yerine:

* duygusal destek sağlar,
* güven artırır,
* risk algısını düşürür,
* yeni davranış seçeneklerini mümkün kılar.

---

# 19. Intent Persistence

Niyetin kalıcılığı şu unsurlara bağlıdır:

```text
Emotional Weight
Identity Alignment
Relationship Importance
Moral Responsibility
Memory Reinforcement
Repeated Triggers
Unresolved Tension
```

Örneğin:

```text
Geçici intent:
Bugün sıcak çorba içmek

Kalıcı intent:
Kayıp ailesini bulmak

Karakter intent’i:
Korkularına rağmen cesur biri olmak
```

Kalıcı intent’ler uzun süreli karakter arklarının temelidir.

---

# 20. Intent Decay

Bazı niyetler zamanla zayıflar.

```ts
type IntentDecayProfile = {
  decayRate: number;
  pausesWhenBlocked: boolean;
  reinforcedByMemory: boolean;
  reinforcedByTriggers: boolean;
  minimumPersistence: number;
};
```

Örneğin:

```text
Pazardaki garip sesi araştırma merakı
→ birkaç gün içinde azalabilir

Verilen sözü tutma niyeti
→ kolayca azalmaz

Kayıp kardeşi bulma niyeti
→ zamanla biçim değiştirebilir ama yok olmaz
```

---

# 21. Intent Reinforcement

Niyet tekrar eden olaylarla güçlenebilir.

```text
Bir kez gizemli ışık görmek:
Düşük merak

Üç gece üst üste görmek:
Güçlü merak

Işığın kayıp arkadaşla bağlantılı olduğunu öğrenmek:
Yüksek duygusal bağlılık
```

Takviye kaynakları:

* tekrar eden algılar,
* konuşmalar,
* yeni kanıtlar,
* ilişkisel bağ,
* başarısız girişimler,
* çocuğun desteği,
* rol sorumluluğu.

---

# 22. Intent Suppression

Bazı niyetler aktif olsa da bastırılabilir.

Örneğin NPC:

* korktuğu için merakını bastırabilir,
* görev duygusu nedeniyle dinlenme ihtiyacını erteleyebilir,
* arkadaşını üzmemek için öfkesini saklayabilir,
* gizli bir sözü nedeniyle bilgi verme isteğini bastırabilir.

Bastırılmış intent yok olmuş sayılmaz.

Uzun süre bastırılırsa:

* duygusal gerilim,
* davranışsal tutarsızlık,
* ani karar,
* itiraf,
* kaçınma davranışı

oluşturabilir.

---

# 23. Intent Memory

Tamamlanan veya terk edilen niyetler silinmemelidir.

Arşivlenmelidir.

```ts
type ArchivedIntent = {
  intentId: string;
  originalMotivation: MotivationVector;
  finalStatus: "fulfilled" | "abandoned" | "transformed";
  outcomeSummary: string;
  emotionalOutcome: EmotionVector;
  lessonsLearned: string[];
  relatedNpcIds: string[];
  relatedPlayerActions: string[];
};
```

Bu kayıtlar gelecekte NPC’nin kararlarını etkiler.

```text
NPC geçmişte tek başına hareket edip başarısız oldu
→ Gelecekte daha erken yardım isteyebilir

NPC çocuğa güvendi ve başarılı oldu
→ Yeni ortak hedefler üretmeye daha yatkın olur
```

---

# 24. Narrative Safety Rules

Intent ve goal sistemi şu sınırları korumalıdır:

1. NPC’ler ana hikâyeyi oyuncu olmadan tamamlamamalıdır.
2. Büyük hedefler çocuk geri dönene kadar son aşamada bekleyebilir.
3. Arka plan hedefleri yeni hikâye alanları açmalıdır.
4. NPC’ler sebepsiz biçimde kişilik değiştirmemelidir.
5. Kalıcı travmatik sonuçlar otomatik simülasyonla üretilmemelidir.
6. Başarısızlık cezadan çok yeni seçenek üretmelidir.
7. Çocuğun önceki seçimleri NPC davranışlarında görünür olmalıdır.
8. NPC hedefleri dünya gerçekleriyle uyumlu olmalıdır.
9. Çok fazla eş zamanlı hedef üretilmemelidir.
10. Hedef terkleri açıklanabilir ve hafızaya alınabilir olmalıdır.

---

# 25. Örnek uçtan uca akış

## Başlangıç durumu

NPC: Mina
Rol: Genç haritacı
Kişilik:

```text
Curiosity: yüksek
Courage: orta
Responsibility: yüksek
Risk tolerance: düşük
```

Dünya olayı:

```text
Kuzey tepelerinde bilinmeyen bir ışık görüldü.
```

## Intent üretimi

Adaylar:

```text
Işığı araştır
Köyü uyar
Bilginle konuş
Olayı görmezden gel
```

Değerlendirme sonucu:

```text
Ana intent:
Işığın kaynağını öğrenmek

İkincil intent:
Köylüleri olası tehlikeden korumak
```

## Goal üretimi

```text
Goal 1:
Işığı gören NPC’lerle konuş

Goal 2:
Kuzey tepelerinin eski haritasını bul

Goal 3:
Güvenli gözlem noktası belirle

Goal 4:
Tek başına gitmek yerine bir yol arkadaşı bul
```

## İlk başarısızlık

Mina eski haritayı bulamaz.

Sonuç:

```text
Goal failed:
Knowledge failure

Yeni goal:
Yaşlı kütüphaneciye danış
```

## Yeni bilgi

Kütüphaneci, ışığın eski bir gözlemevinden geldiğini söyler.

Intent dönüşür:

```text
Eski intent:
Işığın kaynağını öğren

Yeni intent:
Terk edilmiş gözlemevini yeniden keşfet
```

## Oyuncu hikâye kancası

Çocuk köye döndüğünde Mina şöyle der:

```text
“Kuzey tepesindeki ışığın nereden geldiğini buldum.
Eski gözlemevinden geliyor. Fakat kapı yalnızca iki kişi
aynı anda taş halkaları çevirdiğinde açılıyormuş.”
```

NPC ilerleme sağlamıştır.

Ancak ana keşif oyuncuya bırakılmıştır.

---

# 26. Sistem özeti

Bu motorun temel formülü şöyledir:

```text
Trigger
→ Intent Candidate
→ Intent Activation
→ Goal Generation
→ Goal Planning
→ Autonomous Action
→ Progress or Failure
→ Retry, Transformation or Abandonment
→ Memory
```

Bu yapıyla NPC’ler:

* amaç sahibi görünür,
* geçmişlerinden etkilenir,
* başarısızlıktan öğrenir,
* fikir değiştirebilir,
* yardım isteyebilir,
* hedeflerinden vazgeçebilir,
* yeni hedefler geliştirebilir,
* çocuğun davranışlarını hatırlayabilir.

Ancak bütün bunları yaparken hikâyenin merkezini çocuktan almazlar.

---

# 27. Backlog kararları

Bu başlık altında şu kararları backlog’a ekleyelim:

### INT-01 — Intent ve goal ayrımı

Genel motivasyon ile somut hedef farklı varlıklar olarak tutulacak.

### INT-02 — Intent lifecycle

Niyetler latent aşamadan başlayarak tamamlanma, terk edilme veya dönüşüm durumlarına kadar izlenecek.

### INT-03 — Çok kaynaklı intent üretimi

Niyetler ihtiyaç, duygu, hafıza, rol, ilişki ve dünya olaylarından üretilecek.

### INT-04 — Hedef bağımlılık grafiği

Büyük hedefler alt hedeflere ve alternatif yollara ayrılabilecek.

### INT-05 — Goal abandonment açıklaması

Önemli hedeflerin neden terk edildiği kaydedilecek.

### INT-06 — Intent transformation

Yeni bilgi veya karakter gelişimiyle bir niyet başka bir niyete dönüşebilecek.

### INT-07 — Oyuncu merkezli anlatı sınırı

NPC hedefleri Tier 3 ve üzerindeki ana hikâye sonuçlarını oyuncu olmadan tamamlayamayacak.

### INT-08 — Başarısızlık sonrası strateji değişimi

NPC aynı başarısız eylemi sınırsız biçimde tekrarlamayacak.

### INT-09 — Intent kapasitesi

Her NPC aynı anda sınırlı sayıda aktif ve yüksek bağlılıklı niyet taşıyacak.

### INT-10 — Intent arşivi

Tamamlanan, terk edilen ve dönüşen niyetler karakter hafızasında saklanacak.
