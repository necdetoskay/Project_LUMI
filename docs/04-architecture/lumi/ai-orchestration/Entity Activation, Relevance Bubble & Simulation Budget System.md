# Entity Activation, Relevance Bubble & Simulation Budget System

Bu sistemin görevi, dünya simülasyonu sırasında **hangi varlıkların gerçekten aktif olarak hesaplanacağını** belirlemektir.

LUMI evreninde binlerce potansiyel varlık bulunabilir:

* NPC’ler,
* hayvanlar,
* bölgeler,
* binalar,
* görevler,
* söylentiler,
* hava olayları,
* eşyalar,
* ilişkiler,
* topluluklar,
* devam eden planlar,
* yaklaşan tehditler.

Bunların tamamını her zaman simüle etmek hem gereksiz maliyet oluşturur hem de anlatı kontrolünü zorlaştırır.

Temel ilkemiz:

> Dünya bütünüyle yaşıyor gibi görünmelidir; fakat yalnızca hikâye açısından anlamlı parçaları gerçekten hesaplanmalıdır.

---

## 1. Aktivasyon sistemi nedir?

Her dünya varlığı sürekli aktif olmaz.

Bir varlık şu durumlarda simülasyona alınabilir:

* Oyuncuya fiziksel olarak yakınsa,
* Aktif bir hikâye hattına bağlıysa,
* Çocuğun güçlü bir duygusal bağı varsa,
* Devam eden bir ihtiyacı veya tehlikesi varsa,
* Başka önemli bir olayın bağımlılığıysa,
* Yakın zamanda çocuk tarafından hatırlandıysa,
* Durumu zaman geçtikçe değişmek zorundaysa,
* Değişimi çocuğun geri dönüşünde fark edilecekse.

Bu koşulların hiçbiri yoksa varlık:

```text
dormant
```

durumunda kalabilir.

Dormant olmak, varlığın silindiği veya unutulduğu anlamına gelmez. Yalnızca o anda ayrıntılı hesaplanmadığı anlamına gelir.

---

# 2. Aktivasyon seviyeleri

Tek bir “aktif veya pasif” ayrımı yeterli değildir. Beş seviyeli bir sistem daha uygundur.

## 2.1 Level 0 — Dormant

Varlık tamamen uyku durumundadır.

Örnekler:

* Henüz keşfedilmemiş bir kıtadaki sıradan NPC,
* Oyuncuyla hiçbir bağı olmayan uzak bir tüccar,
* Hikâyede kullanılmayan dekoratif bir bina,
* Yıllardır değişmeyen antik bir heykel.

Bu varlıklar için:

* Zaman ilerletilmez.
* Davranış üretilmez.
* LLM çağrısı yapılmaz.
* Ayrıntılı durum güncellenmez.

Yalnızca temel kayıtları saklanır.

---

## 2.2 Level 1 — Background Aware

Varlık aktif olarak simüle edilmez ancak dünyanın genel değişimlerinden haberdar olabilir.

Örneğin:

* Uzak limandaki tüccarlar, büyük bir fırtına nedeniyle ticaret azalmasından etkilenebilir.
* Dağ köyü, bölgesel kış koşullarına geçebilir.
* Bir topluluk, krallık çapındaki festival hazırlığına dahil olabilir.

Bu seviyede bireysel davranış yerine toplu veya şablon tabanlı değişimler uygulanır.

```text
Liman ticaret yoğunluğu:
normal → düşük
```

Tek tek tüccarların ne yaptığı hesaplanmaz.

---

## 2.3 Level 2 — Macro Simulated

Varlık makro düzeyde ilerletilir.

Örneğin:

* Köprü inşaatı yüzde 30’dan yüzde 45’e çıkar.
* Bir NPC’nin iyileşme durumu “zayıf”tan “iyileşiyor”a geçer.
* Bir topluluğun korku seviyesi hafifçe azalır.
* Yağmur bulutları komşu bölgeye hareket eder.

Bu seviyede sonuç üretilir fakat ayrıntılı sahneler oluşturulmaz.

---

## 2.4 Level 3 — Context Simulated

Varlık, mevcut hikâye bağlamına uygun biçimde daha ayrıntılı hesaplanır.

Örneğin:

* NPC’nin ihtiyacı,
* duygusu,
* kısa vadeli planı,
* yakın çevresi,
* diğer aktif NPC’lerle ilişkisi,
* aldığı yeni bilgi

değerlendirilir.

Bu seviye çoğunlukla oyuncunun bulunduğu bölge veya aktif görevler için kullanılır.

---

## 2.5 Level 4 — Fully Active

Varlık sahne düzeyinde aktiftir.

Bu seviyede:

* Karar alabilir,
* konuşabilir,
* hareket edebilir,
* çevreyle etkileşebilir,
* olay başlatabilir,
* çocuğun davranışlarına tepki verebilir.

Aktif hikâye sahnesindeki karakterler genellikle bu seviyededir.

Ancak Level 4 bile sınırsız özgürlük anlamına gelmez. NPC’nin yapabilecekleri hâlâ:

* karakter profili,
* bilgi sınırı,
* konum,
* duygusal durum,
* fiziksel kapasite,
* anlatısal güvenlik

tarafından sınırlandırılır.

---

# 3. Relevance Bubble yapısı

Relevance Bubble, oyuncu ve aktif hikâye çevresinde oluşan dinamik simülasyon alanıdır.

Bu balon yalnızca coğrafi yakınlığa göre oluşmaz. Üç temel katmanı vardır:

```text
Spatial Bubble
Narrative Bubble
Emotional Bubble
```

---

## 3.1 Spatial Bubble

Fiziksel yakınlığa göre belirlenir.

Örnek:

```text
Aynı sahne        → çok yüksek yakınlık
Aynı bina         → yüksek yakınlık
Aynı köy          → orta yakınlık
Komşu bölge       → düşük yakınlık
Uzak kıta         → çok düşük yakınlık
```

Ancak fiziksel yakınlık tek başına yeterli değildir.

Köy meydanındaki sıradan bir güvercin, yüzlerce kilometre uzaktaki çocuğun çok sevdiği ejderhadan daha düşük anlatısal öneme sahip olabilir.

---

## 3.2 Narrative Bubble

Aktif hikâye bağlantılarına göre oluşur.

Şu varlıklar anlatısal balona girer:

* Aktif görevin hedefi,
* Görevin başlatıcısı,
* Çözülmemiş bir gizemin parçası,
* Yaklaşan olayın sorumlusu,
* Ana karakterin geçmişiyle bağlantılı biri,
* Çocuğun verdiği kararın etkilediği bir varlık,
* Bir sonraki hikâyeye hazırlanan unsur.

Örneğin çocuk ormandayken uzak limandaki bir denizci fiziksel olarak uzak olabilir. Fakat bulunan haritanın sırrını bilen tek kişi oysa anlatısal önemi yüksektir.

---

## 3.3 Emotional Bubble

Çocuğun bağ kurduğu karakter ve unsurlardan oluşur.

Bu balon için şu sinyaller kullanılabilir:

* Çocuğun karakteri kaç kez seçtiği,
* Karakterle geçirdiği hikâye sayısı,
* Verdiği yardım kararları,
* Karakter hakkında sorduğu sorular,
* Onu tekrar görmek istemesi,
* Ona eşya vermesi,
* Onunla ilgili duygusal tepki göstermesi,
* Hikâye sonunda karakteri hatırlaması.

Örneğin çocuk küçük tilkiyi çok seviyorsa tilki uzak bir bölgede olsa bile tamamen dondurulmamalıdır.

Fakat duygusal balon sistem tarafından zorla oluşturulmamalıdır. Bir karakterin çocuk tarafından gerçekten benimsendiğine dair gözlemlenebilir sinyaller bulunmalıdır.

---

# 4. Relevance Vector

Her varlık için tek bir önem sayısı yerine bir vektör kullanılmalıdır.

```ts
interface RelevanceVector {
  spatial: number;
  narrative: number;
  emotional: number;
  temporal: number;
  causal: number;
  danger: number;
  dependency: number;
  attention: number;
  novelty: number;
  continuity: number;
}
```

## Spatial

Oyuncuya fiziksel yakınlık.

## Narrative

Mevcut hikâye hattıyla bağlantı.

## Emotional

Çocuğun varlıkla kurduğu bağ.

## Temporal

Geçen zamanın varlık üzerinde değişim yaratma zorunluluğu.

## Causal

Varlığın başka önemli olayları etkileyebilme gücü.

## Danger

Müdahale edilmezse risk yaratma potansiyeli.

## Dependency

Başka bir aktif olayın bu varlığa bağımlı olması.

## Attention

Çocuğun yakın zamanda bu varlığa gösterdiği ilgi.

## Novelty

Varlığın yeni veya henüz yeterince keşfedilmemiş olması.

## Continuity

Önceki hikâyelerdeki süreklilik açısından önemi.

Bu değerler her varlık türünde aynı ağırlıkta kullanılmaz.

---

# 5. Varlık türüne göre ağırlıklar

Örneğin bir NPC için duygusal ve anlatısal bağ yüksek ağırlık taşıyabilir.

```text
NPC:
Emotional     %25
Narrative     %20
Continuity    %15
Spatial       %10
Temporal      %10
Dependency    %10
Attention     %10
```

Bir hava olayı için farklı ağırlıklar gerekir:

```text
Weather Event:
Spatial       %25
Temporal      %25
Danger        %20
Causal        %20
Narrative     %10
```

Bir eşya için:

```text
Item:
Narrative     %25
Dependency    %20
Attention     %15
Continuity    %15
Spatial       %10
Emotional     %10
Temporal       %5
```

Bu nedenle sistemde tek bir genel formül yerine varlık tipine göre aktivasyon profili kullanılmalıdır.

---

# 6. Activation Score

Vektör, varlığın activation score değerine dönüştürülür.

```text
Activation Score =
weighted relevance
× state urgency
× simulation eligibility
× time tier modifier
× world budget modifier
```

Örnek:

```text
Yaralı tilki:
Relevance          0.88
State urgency      0.80
Eligibility        1.00
Time modifier      0.70
Budget modifier    0.90

Final activation:
0.443
```

Bu değer doğrudan düşük görünse bile diğer varlıklarla karşılaştırmalı olarak yüksek olabilir.

Aktivasyon kararında mutlak eşik yerine sıralama da kullanılmalıdır.

---

# 7. Hard Activation Triggers

Bazı durumlarda normal puanlama beklenmeden varlık otomatik olarak aktif hale gelir.

Örnek tetikleyiciler:

* Oyuncuyla aynı sahnede bulunmak,
* Oyuncuya doğrudan soru sormak,
* Kritik bir zamanlayıcının sona ermesi,
* Aktif bir tehlikenin hedefi olmak,
* Önemli bir görev için zorunlu olmak,
* Oyuncunun ismini açıkça söylemesi,
* Çocuğun “Tilki şimdi nerede?” diye sorması,
* Bir önceki hikâyenin cliffhanger unsurunu taşımak,
* Sistem tutarsızlığı tespit edilmesi.

```ts
interface ActivationTrigger {
  type: string;
  entityId: string;
  priority: number;
  expiresAt?: string;
  bypassBudget?: boolean;
}
```

Kritik tetikleyiciler bütçe sınırını geçici olarak aşabilir.

---

# 8. Deactivation sistemi

Bir varlık aktif olduğu için sonsuza kadar aktif kalmamalıdır.

Deactivation koşulları:

* Aktif olay sona erdi,
* Oyuncu bölgeden uzaklaştı,
* Duygusal veya anlatısal bağ zayıfladı,
* Devam eden ihtiyaç çözüldü,
* Başka bir varlık rolü devraldı,
* Varlık uzun süredir hiçbir anlamlı değişim üretmedi,
* Simülasyon bütçesi daha önemli varlıklara ayrılmalı.

Ancak aktivasyon ile deaktivasyon arasında sürekli gidip gelmeyi önlemek için hysteresis uygulanmalıdır.

Örneğin:

```text
Aktivasyon eşiği:   0.60
Deaktivasyon eşiği: 0.35
```

Varlık 0.59’a düştüğünde hemen kapanmaz. Ancak 0.35’in altına indiğinde uykuya alınır.

Bu, simülasyonun kararlı kalmasını sağlar.

---

# 9. Warm State ve Cold State

Deaktive edilen varlık doğrudan tamamen unutulmamalıdır.

## Warm State

Yakın zamanda aktif olmuş varlıklar için kullanılır.

Saklanan bilgiler:

* Son hedef,
* Son duygu,
* Son konuşma konusu,
* Son önemli karar,
* Bekleyen ihtiyaç,
* Yakın ilişkiler,
* Son bilinen konum.

Warm State sayesinde varlık tekrar aktif olduğunda doğal biçimde devam eder.

## Cold State

Uzun süredir kullanılmayan varlıklarda yalnızca özet bilgi tutulur.

Örneğin:

```json
{
  "npcId": "npc_miller_01",
  "summary": "Orman Köyü değirmencisi. Çocuk daha önce kayıp çantasını bulmasına yardım etti. Çocuğa karşı minnettar.",
  "lastKnownState": "safe",
  "relationship": "friendly",
  "unresolvedThreads": []
}
```

Varlık yeniden etkinleştirildiğinde bu özetten ayrıntılı çalışma durumu yeniden oluşturulur.

---

# 10. Simulation Budget

Simülasyon bütçesi yalnızca para veya token maliyeti değildir.

Bütçe birden fazla kaynağı kapsar:

```ts
interface SimulationBudget {
  cpuBudget: number;
  databaseBudget: number;
  llmTokenBudget: number;
  narrativeComplexityBudget: number;
  activeEntityLimit: number;
  eventGenerationLimit: number;
  mutationLimit: number;
}
```

## CPU Budget

Kural motoru, vektör hesaplamaları ve durum çözümleme maliyeti.

## Database Budget

Okunacak ve yazılacak kayıt sayısı.

## LLM Token Budget

LLM’ye gönderilecek bağlam ve üretilecek çıktı miktarı.

## Narrative Complexity Budget

Çocuğun takip edebileceği aktif hikâye öğesi sayısı.

Bu son bütçe özellikle önemlidir.

Teknik sistem yüzlerce karakteri takip edebilse bile çocuk aynı anda bunları takip edemeyebilir.

> Anlatısal sadelik, teknik kapasiteden daha önemlidir.

---

# 11. Çocuk yaşına göre anlatısal bütçe

Aktif unsur sayısı yaşa göre sınırlandırılabilir.

Örnek başlangıç değerleri:

```text
4–6 yaş:
2–3 aktif önemli NPC
1 ana hedef
1 küçük yan olay
1 yaklaşan olay

7–9 yaş:
3–5 aktif önemli NPC
1–2 ana hedef
2 yan olay
1–2 yaklaşan olay

10–12 yaş:
5–8 aktif önemli NPC
2–3 hedef
3 yan olay
daha karmaşık nedensel bağlantılar
```

Bu sınırlar katı değildir ancak varsayılan karmaşıklık kontrolü sağlar.

Dünya çok büyük olabilir fakat çocuğun önüne yalnızca takip edilebilir bir kısmı çıkarılır.

---

# 12. Budget Allocation

Toplam bütçe, varlık kategorilerine dağıtılabilir.

Örnek:

```text
Oyuncuya eşlik eden karakterler     %30
Aktif görev varlıkları              %25
Yakın çevre                         %15
Duygusal bağ kurulan karakterler    %15
Yaklaşan olaylar                    %10
Dünya atmosferi                      %5
```

Ancak bu oranlar sabit olmak zorunda değildir.

Örneğin tehlikeli bir sahnede:

```text
Aktif tehditler                     %35
Oyuncuya eşlik eden karakterler     %30
Çevresel koşullar                   %20
Diğer unsurlar                      %15
```

Sakin bir köy sahnesinde:

```text
NPC ilişkileri                      %35
Günlük yaşam                        %25
Küçük keşifler                      %20
Dünya atmosferi                     %20
```

---

# 13. Budget Competition

Varlıklar bütçe için rekabet eder.

Örnek aktif adaylar:

```text
Yaralı tilki          0.91
Yaklaşan fırtına      0.87
Kayıp değirmenci      0.81
Köy fırıncısı         0.46
Uzak liman tüccarı    0.28
Dağ keçisi            0.11
```

Aktif varlık limiti 4 ise:

```text
Level 4:
Yaralı tilki
Yaklaşan fırtına

Level 3:
Kayıp değirmenci

Level 2:
Köy fırıncısı

Dormant:
Uzak liman tüccarı
Dağ keçisi
```

Bu seçim sabit bir sıralama olmamalıdır. Çeşitlilik ve tekrar önleme mekanizmaları da eklenmelidir.

Aksi halde aynı yüksek puanlı karakterler sürekli öne çıkabilir.

---

# 14. Fairness ve Rotation sistemi

Bazı düşük öncelikli varlıklar zaman zaman görünürlük kazanmalıdır.

Bunun için:

```text
neglect bonus
```

kullanılabilir.

Bir varlık uzun süredir uygun olmasına rağmen seçilmediyse activation score değerine küçük bir bonus eklenir.

```text
Final Score =
Base Score
+ Neglect Bonus
+ Novelty Bonus
- Repetition Penalty
```

Örneğin:

```text
Fırıncı üç hikâyedir uygun ama görünmedi:
Neglect Bonus +0.12

Tilki son iki hikâyede çok fazla kullanıldı:
Repetition Penalty -0.10
```

Bu yaklaşım dünyayı daha çeşitli ve doğal hissettirir.

Ancak çocuğun sevdiği karakterleri sırf tekrar oldu diye zorla sahneden uzaklaştırmamalıyız. Tekrar cezası, duygusal bağın önüne geçmemelidir.

---

# 15. Dependency Graph

Aktivasyon yalnızca bireysel puanlarla belirlenemez. Varlıklar birbirine bağlı olabilir.

Örneğin:

```text
Kayıp değirmenci görevi
    ↓
Değirmencinin çantası
    ↓
Eski harita
    ↓
Liman denizcisi
    ↓
Sisli Ada
```

Çocuk eski haritayı bulduysa liman denizcisinin relevance değeri artmalıdır.

Bu nedenle sistem bir bağımlılık grafiği tutmalıdır.

```ts
interface EntityDependency {
  sourceEntityId: string;
  targetEntityId: string;
  relationship:
    | "requires"
    | "influences"
    | "reveals"
    | "blocks"
    | "protects"
    | "threatens"
    | "remembers";
  strength: number;
  direction: "one_way" | "two_way";
}
```

Bir varlık aktive edildiğinde doğrudan bağlantılı varlıklar da düşük çözünürlükte uyandırılabilir.

---

# 16. Activation Propagation

Aktivasyon grafikte yayılabilir ancak sınırsız yayılmamalıdır.

Örneğin:

```text
Çocuk → Yaralı Tilki → Orman Şifacısı → Şifalı Bitki Vadisi
```

Çocuk tilkiyi sorarsa:

* Tilki Level 4 olabilir.
* Şifacı Level 3 olabilir.
* Şifalı Bitki Vadisi Level 2 olabilir.
* Vadideki tüm bitkiler aktive edilmez.

Her graf geçişinde sinyal zayıflatılır.

```text
propagated relevance =
source relevance
× relation strength
× propagation decay
```

Örnek:

```text
Tilki relevance:              0.90
Şifacı bağlantı gücü:         0.80
Decay:                        0.70

Şifacı propagated relevance:
0.90 × 0.80 × 0.70 = 0.504
```

Sonraki bağlantıda değer daha da düşer.

---

# 17. Bölgesel aktivasyon

Tek tek varlıklardan önce bölge düzeyinde aktivasyon yapılabilir.

```ts
interface RegionActivationState {
  regionId: string;
  activationLevel: number;
  activeEntityQuota: number;
  environmentalSimulationLevel: number;
  socialSimulationLevel: number;
  eventSimulationLevel: number;
}
```

Örneğin:

```text
Orman Köyü:
Activation Level 4
NPC quota: 8
Environment: detailed
Social life: contextual
Events: active

Kuzey Limanı:
Activation Level 2
NPC quota: 2
Environment: macro
Social life: summary
Events: limited

Uzak Çöl:
Activation Level 0
NPC quota: 0
Environment: frozen
Social life: frozen
Events: frozen
```

Böylece önce hangi bölgelerin canlı tutulacağı, sonra o bölgelerde hangi varlıkların seçileceği belirlenir.

---

# 18. Event Slot sistemi

Arka plan motoru sınırsız olay üretememelidir.

Her simülasyon turunda olay slotları bulunur.

Örnek:

```text
Major Event Slots:       0–1
Minor Event Slots:       1–3
Ambient Change Slots:    1–4
Relationship Shift:      0–2
Discovery Preparation:   0–1
```

Bu slotlar olay üretimini sınırlar.

Örneğin sistem aynı anda:

* fırtına,
* kayıp çocuk,
* festival,
* ejderha saldırısı,
* gizemli kapı,
* krallık savaşı

başlatmamalıdır.

Dünya canlı görünürken anlatı kaotik hale gelmemelidir.

---

# 19. Mutation Budget

Bir simülasyon turunda kaç durum değişikliğine izin verileceği de sınırlandırılmalıdır.

Örnek:

```text
Detailed tier:
En fazla 20 küçük değişiklik
En fazla 5 orta değişiklik
En fazla 1 büyük öneri

Macro tier:
En fazla 8 küçük değişiklik
En fazla 3 orta değişiklik
Büyük kalıcı değişiklik yok

Frozen tier:
Kalıcı değişiklik yok
Yalnızca dönüş özeti ve zaman kaydı
```

Bu sınır özellikle uzun süreli catch-up simülasyonunda önemlidir.

On gün sonra yüzlerce değişiklik üretmek yerine birkaç anlamlı değişiklik seçilir.

---

# 20. LLM kullanım sınırı

Her varlık için ayrı LLM çağrısı yapılmamalıdır.

Önerilen model:

## Kural tabanlı aşama

Şunlar deterministik hesaplanır:

* zaman geçişi,
* iyileşme,
* açlık,
* hava hareketi,
* rutin ilerleme,
* görev sayaçları,
* relevance score,
* aktivasyon seviyesi,
* güvenlik kuralları.

## Paketleme aşaması

Benzer varlıklar gruplandırılır.

```text
Orman Köyü sosyal grubu
Yakın hayvanlar grubu
Aktif görev grubu
Bölgesel hava grubu
```

## LLM aşaması

LLM yalnızca şu görevlerde kullanılır:

* Uygun arka plan niyetleri önermek,
* Çelişkili teklifleri yorumlamak,
* Dönüş özetini doğal dile çevirmek,
* NPC davranışına anlatısal çeşitlilik eklemek,
* Hazır durumdan sahneye geçiş üretmek.

LLM dünya durumunu doğrudan ve kontrolsüz biçimde değiştiremez.

---

# 21. Öneri ve doğrulama modeli

Simülasyon iki aşamalı çalışmalıdır.

## Aşama 1 — Proposal

Motor veya LLM değişiklik önerir.

```json
{
  "entityId": "npc_fox_01",
  "proposedChange": {
    "mobility": "improving",
    "trustTowardPlayer": 0.04
  },
  "reason": "Tilki güvenli yerde dinlendi ve daha önce oyuncudan yardım aldı."
}
```

## Aşama 2 — Validation

Öneri şu kontrollerden geçer:

* Varlığın kapasitesine uygun mu?
* Geçen süre yeterli mi?
* Başka durumlarla çelişiyor mu?
* Oyuncu iradesini ihlal ediyor mu?
* Kalıcı veya geri döndürülemez mi?
* Çocuğun yaşına uygun mu?
* Aktif bütçeyi aşıyor mu?
* Önceki olayların sonucuyla tutarlı mı?

Sadece doğrulanan değişiklikler world state’e yazılır.

---

# 22. Activation Snapshot

Her simülasyon turunun sonunda hangi varlıkların neden aktif olduğu kaydedilmelidir.

```ts
interface ActivationSnapshot {
  generatedAt: string;
  simulationTier: string;
  totalCandidates: number;
  selectedEntities: ActivatedEntityRecord[];
  rejectedEntities: RejectedEntityRecord[];
  budgetUsage: SimulationBudgetUsage;
}
```

```ts
interface ActivatedEntityRecord {
  entityId: string;
  activationLevel: number;
  activationScore: number;
  primaryReasons: string[];
  allocatedBudget: number;
}
```

Bu kayıtlar şu amaçlarla kullanılır:

* Hata ayıklama,
* Tutarsızlık inceleme,
* Neden aynı karakterin sürekli seçildiğini anlama,
* Maliyet analizi,
* Ebeveyn kontrol paneli,
* Simülasyon kalitesi ölçümü.

---

# 23. Açıklanabilir aktivasyon

Sistem gerektiğinde bir varlığın neden aktif olduğunu açıklayabilmelidir.

Örnek:

```text
Yaralı tilki aktive edildi çünkü:
- Çocukla güçlü duygusal bağı var.
- Sağlık durumu zamana duyarlı.
- Son hikâyede açık bir durum bırakıldı.
- Çocuk aynı bölgede bulunuyor.
```

Başka bir varlık:

```text
Uzak liman tüccarı aktive edilmedi çünkü:
- Aktif görevle bağlantısı yok.
- Oyuncuya uzak.
- Zamana duyarlı bir durumu bulunmuyor.
- Mevcut bütçede daha önemli varlıklar var.
```

Bu açıklama çocuğa gösterilmek zorunda değildir. Sistem gözlemlenebilirliği için kullanılır.

---

# 24. Örnek simülasyon

Çocuk hikâyeyi şu durumda bırakmış olsun:

```text
Konum: Orman Köyü

Aktif unsurlar:
- Yaralı tilki köyde dinleniyor.
- Değirmenci kayıp.
- Yaklaşan fırtına var.
- Eski harita bulundu.
- Haritanın limandaki bir denizciyle bağlantısı var.
```

Çocuk üç gün sonra geri dönüyor.

## Adaylar

```text
Yaralı tilki
Köy şifacısı
Kayıp değirmenci
Değirmencinin çantası
Yaklaşan fırtına
Köy evleri
Köy fırıncısı
Liman denizcisi
Sisli Ada
Uzak kral
Orman hayvanları
```

## Aktivasyon sonucu

```text
Yaralı tilki          Level 3
Köy şifacısı          Level 2
Kayıp değirmenci      Level 3
Yaklaşan fırtına      Level 4
Köy evleri            Level 2
Liman denizcisi       Level 1
Sisli Ada             Level 0
Uzak kral             Level 0
Orman hayvanları      Group Level 1
```

## Uygulanan değişiklikler

* Tilki biraz iyileşti.
* Şifacı tilkinin yarasını temizledi.
* Köylüler fırtına için bazı çatıları güçlendirdi.
* Değirmenciye ait yeni bir ayak izi bulundu.
* Fırtına köye yaklaştı ancak çocuk gelmeden büyük hasar oluşmadı.
* Liman denizcisi yalnızca bağlantılı bir bilgi düğümü olarak sıcak durumda tutuldu.

## Bloke edilen değişiklikler

* Değirmencinin tek başına bulunması,
* Fırtınanın köyü yıkması,
* Haritanın sırrının çözülmesi,
* Sisli Ada’ya bir grubun gitmesi.

Bunlar oyuncu katılımını gerektirir.

---

# 25. Önerilen çalışma sırası

Aktivasyon motorunun işlem zinciri:

```text
1. Dünya ve zaman durumunu yükle
2. Bölgesel adayları belirle
3. Relevance vector değerlerini hesapla
4. Hard trigger’ları uygula
5. Dependency propagation çalıştır
6. Repetition ve neglect düzeltmelerini ekle
7. Bölgesel bütçeleri belirle
8. Varlıkları aktivasyon seviyelerine sırala
9. Anlatısal karmaşıklık sınırını uygula
10. Event slot ve mutation budget ayır
11. Simülasyon tekliflerini üret
12. Güvenlik doğrulamasından geçir
13. Değişiklikleri uygula
14. Activation Snapshot kaydet
15. Dönüş özetini üret
```

---

# 26. Temel veri modeli

```ts
type ActivationLevel = 0 | 1 | 2 | 3 | 4;

interface ActivationProfile {
  entityId: string;
  entityType: string;
  relevanceVector: RelevanceVector;
  activationScore: number;
  currentLevel: ActivationLevel;
  previousLevel: ActivationLevel;
  hardTriggers: ActivationTrigger[];
  activationReasons: string[];
  deactivationReasons: string[];
  warmStateExpiresAt?: string;
}

interface SimulationCandidate {
  entityId: string;
  regionId: string;
  entityType: string;
  activationProfile: ActivationProfile;
  estimatedCost: {
    cpu: number;
    database: number;
    tokens: number;
    narrativeComplexity: number;
  };
  expectedValue: {
    continuity: number;
    emotionalImpact: number;
    narrativeUtility: number;
    worldBelievability: number;
  };
}
```

Aday seçimi kabaca şu mantıkla yapılabilir:

```text
Selection Utility =
Expected Narrative Value
÷ Estimated Simulation Cost
```

Ancak düşük maliyetli diye anlamsız varlıklar seçilmemelidir. Önce asgari relevance eşiği uygulanmalıdır.

---

# 27. Ana tasarım ilkeleri

Bu sistem için kabul edeceğimiz ilkeler:

1. **Her varlık her zaman yaşamaz.**
   Yalnızca anlamlı olanlar aktif edilir.

2. **Yakınlık yalnızca fiziksel değildir.**
   Anlatısal ve duygusal yakınlık da belirleyicidir.

3. **Aktivasyon kademelidir.**
   Aktif veya pasif yerine beş çözünürlük seviyesi kullanılır.

4. **Bütçe yalnızca teknik değildir.**
   Çocuğun takip edebileceği anlatısal karmaşıklık da bütçedir.

5. **Büyük dünya, küçük odak.**
   Evren geniş olabilir fakat hikâye odağı anlaşılır kalmalıdır.

6. **LLM karar vermez, önerir.**
   Kalıcı değişiklikler deterministik güvenlik kontrollerinden geçer.

7. **Aktivasyon açıklanabilir olmalıdır.**
   Her seçimin nedeni kaydedilmelidir.

8. **Düşük öncelikli varlıklar tamamen unutulmaz.**
   Warm State ve Cold State ile süreklilik korunur.

9. **Aynı karakterler dünyayı ele geçirmemelidir.**
   Rotation, neglect bonus ve repetition penalty uygulanır.

10. **Oyuncunun ilgisi en güçlü sinyallerden biridir.**
    Çocuğun sorduğu, sevdiği ve takip ettiği şeyler öncelik kazanır.

---

# 28. Nihai prensip

> LUMI bütün evreni hesaplamaya çalışmaz. Çocuğun hikâyesi için anlam taşıyan parçaları doğru anda uyandırır.

Bu sayede dünya:

* büyük,
* bağlantılı,
* devamlı,
* canlı,
* sürprizli

hissedilirken sistem:

* kontrollü,
* ekonomik,
* anlaşılır,
* güvenli,
* test edilebilir

kalır.
