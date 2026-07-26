# NPC Relationship Dynamics, Trust, Attachment, Conflict & Social Bond Evolution System

Bu sistem, LUMI'deki tüm sosyal bağların temelini oluşturur.

Amaç yalnızca "arkadaşlık puanı" tutmak değildir.

Her NPC, diğer karakterlerle yaşadığı deneyimlere göre zaman içinde gelişen, değişen ve geçmişini unutmayan ilişkiler kurmalıdır.

Temel ilke:

> İlişkiler tek bir sayı değildir; farklı duyguların, ortak anıların, güvenin, beklentilerin ve yaşanmış olayların birlikte oluşturduğu yaşayan sosyal bağlardır.

---

# 1. Relationship Vector

Her ilişki çok boyutlu bir vektör olarak tutulmalıdır.

```ts
type RelationshipVector = {
  trust: number;
  affection: number;
  respect: number;
  admiration: number;
  gratitude: number;
  protectiveness: number;
  loyalty: number;

  familiarity: number;
  comfort: number;

  fear: number;
  resentment: number;
  disappointment: number;
  suspicion: number;

  dependency: number;
  influence: number;
};
```

Böylece:

```text
Yüksek güven
+
Düşük sevgi

veya

Yüksek sevgi
+
Düşük güven

gibi gerçekçi kombinasyonlar mümkün olur.
```

---

# 2. İlişkiler asimetriktir

İki NPC'nin aynı ilişkiyi hissetmesi gerekmez.

```text
Mira
→ Çocuğa çok güveniyor.

Çocuk
→ Mira'yı seviyor
ama henüz tam güvenmiyor.
```

Her yön ayrı tutulmalıdır.

```text
A → B

B → A
```

---

# 3. Relationship Profile

```ts
type RelationshipProfile = {
  ownerId: string;
  targetId: string;

  vector: RelationshipVector;

  relationshipType:
    | "stranger"
    | "acquaintance"
    | "friend"
    | "close_friend"
    | "mentor"
    | "student"
    | "family"
    | "companion"
    | "ally";

  lastMeaningfulInteraction: WorldTime;
};
```

İlişki tipi, vektörlerden türetilen yüksek seviyeli etikettir.

---

# 4. Trust (Güven)

Güven;

* söz tutma,
* dürüstlük,
* tutarlılık,
* yardım,
* güvenilir bilgi

ile gelişir.

Azalmasına neden olanlar:

* yalan,
* sözünü tutmama,
* terk etme,
* ihanet,
* gereksiz risk.

Güven yavaş kazanılır, hızlı kaybedilebilir.

---

# 5. Affection (Sevgi)

Sevgi;

* birlikte zaman geçirmek,
* güzel anılar,
* ortak eğlence,
* destek görmek

ile artar.

Sevgi, güvenle aynı şey değildir.

---

# 6. Respect (Saygı)

Saygı;

* beceri,
* cesaret,
* bilgelik,
* sorumluluk

ile gelişebilir.

Bir NPC sevmediği birine yine de saygı duyabilir.

---

# 7. Admiration (Hayranlık)

Hayranlık:

```text
Kahramanca davranış
Zor bir problemi çözme
Yeni şeyler öğretme
```

gibi olaylarla oluşabilir.

Hayranlık zamanla ilham kaynağına dönüşebilir.

---

# 8. Gratitude (Minnettarlık)

Hayat kurtarmak ile küçük bir yardım aynı etkiyi oluşturmaz.

Minnettarlık:

```text
Yardımın büyüklüğü
Fedakârlık
Zamanlama
Alternatiflerin olup olmaması
```

ile hesaplanmalıdır.

---

# 9. Protectiveness

Bazı NPC'ler zamanla koruma isteği geliştirebilir.

Örneğin:

```text
Şifacı
→ Yaralı çocuğu korumak ister.

Tilki
→ Kendisini kurtaran çocuğu korumaya çalışır.
```

Koruma isteği aşırıya kaçmamalıdır.

---

# 10. Loyalty

Sadakat;

* uzun süreli güven,
* ortak hedefler,
* verilen sözler,
* ortak mücadele

ile oluşur.

Sadakat güvenle bağlantılıdır ancak aynı değildir.

---

# 11. Familiarity

Tanışıklık yalnızca geçirilen zamandır.

Bir NPC:

```text
Çok uzun süredir tanıdığı
ama hiç güvenmediği
```

bir karaktere sahip olabilir.

---

# 12. Comfort

Yanında rahat hissedebilme.

Bazı kişiler:

```text
Yakın arkadaş olmayabilir
ama yanında huzur verir.
```

Bu çocuk hikâyelerinde önemli bir sosyal his üretir.

---

# 13. Fear

Korku ilişki bileşenidir.

Korku;

* tehdit,
* öngörülemez davranış,
* geçmiş travma

ile oluşabilir.

Ancak çocuk dostu tasarım gereği korku istismar edilmemelidir.

---

# 14. Resentment

Kırgınlık;

```text
Unutulan söz
İhmal
Yanlış anlaşılma
```

gibi durumlarla oluşabilir.

Kırgınlık öfke değildir.

---

# 15. Disappointment

Hayal kırıklığı kısa vadeli olabilir.

Tek başına ilişkiyi bozmaz.

Ancak tekrar ederse güveni etkiler.

---

# 16. Suspicion

Şüphe;

* çelişkili bilgiler,
* gizli davranışlar,
* söylentiler

ile artabilir.

Doğrulanırsa güven azalır.

Yanlış çıkarsa güven tekrar artabilir.

---

# 17. Dependency

Bazı NPC'ler diğerlerine bağımlılık geliştirebilir.

Örneğin:

```text
Çırak
→ Ustasına.

Küçük ejderha
→ Çocuğa.
```

Bağımlılık tek başına olumlu değildir.

Sistem bunu dikkatli kullanmalıdır.

---

# 18. Influence

Bazı NPC'lerin fikirleri diğerlerini daha fazla etkiler.

Bu;

* güven,
* saygı,
* uzmanlık

ile ilişkilidir.

---

# 19. Shared Memories

İlişkileri asıl güçlendiren ortak anılardır.

```ts
type SharedMemory = {
  memoryId: string;

  participants: string[];

  emotionalWeight: number;
  narrativeImportance: number;

  summary: string;
};
```

---

# 20. Relationship Event

Her sosyal olay ilişkiyi doğrudan değiştirmez.

Önemli olaylar kayıt oluşturur.

```text
Birlikte köprü tamir edildi.

Tilki kurtarıldı.

Söz tutuldu.

Söz bozuldu.
```

---

# 21. Event Weight

İlişki değişimi:

```text
Küçük yardım
<
Büyük fedakârlık
<
Hayat kurtarma
```

şeklinde ölçeklenmelidir.

---

# 22. Repeated Actions

Tekrar eden küçük davranışlar da önemlidir.

```text
Her gün selam vermek.

Sürekli yardım etmek.

Her buluşmada sözünü tutmak.
```

Bunlar yavaş fakat kalıcı etki oluşturur.

---

# 23. Trust Recovery

Güven geri gelebilir.

Ancak:

```text
Özür
+
Tutarlı davranış
+
Zaman
```

gerektirir.

Tek konuşma yeterli değildir.

---

# 24. Forgiveness

Affetmek;

* güvenin tamamen geri geldiği

anlamına gelmez.

NPC:

```text
Affedebilir

ama

temkinli davranmaya devam edebilir.
```

---

# 25. Relationship Decay

Hiç iletişim olmayan ilişkiler zamanla zayıflayabilir.

Ancak:

```text
Çok güçlü bağlar

çok daha yavaş zayıflar.
```

---

# 26. Relationship Momentum

İlişkilerin ataleti olmalıdır.

Bir büyük olay:

```text
20 yıllık dostluğu

tek başına

tamamen yok etmemelidir.
```

Aynı şekilde:

İlk yardım eden biri hemen en yakın arkadaş olmaz.

---

# 27. Expectation Model

Yakın ilişki beklenti oluşturur.

```text
Arkadaş

haber vermeliydi.

Mentor

yardım etmeliydi.
```

Beklentiler karşılanmazsa kırgınlık oluşabilir.

---

# 28. Promise Memory

Tutulan ve tutulmayan sözler ayrı iz bırakmalıdır.

Bu kayıtlar güven hesaplamasında kullanılmalıdır.

---

# 29. Social Roles

İlişki türleri:

```text
Arkadaş

Mentor

Çırak

Kardeş

Koruyucu

Takım arkadaşı

Komşu
```

yalnızca etiket değildir.

Davranışı etkiler.

---

# 30. Relationship Stability

Bazı ilişkiler:

```text
çok hassastır.

Bazıları

çok dayanıklıdır.
```

Bu da kişiliğe bağlıdır.

---

# 31. Conflict Memory

Kavgalar unutulmaz.

Ancak zamanla:

```text
detay

unutulabilir,

duygu izi

kalabilir.
```

---

# 32. Positive Reinforcement

İyi deneyimler yalnızca negatifleri silmez.

Kendi başına pozitif bağ oluşturur.

---

# 33. Negative Reinforcement

Tekrarlanan hayal kırıklıkları:

```text
küçük

ama

biriken

hasar oluşturur.
```

---

# 34. Relationship Thresholds

Belirli eşikler yeni davranışlar açabilir.

Örneğin:

```text
Yüksek güven

↓

Gizli bilgi paylaşımı.

Yüksek sevgi

↓

Hediye hazırlama.

Yüksek koruma

↓

Tehlikede yardıma koşma.
```

---

# 35. Child–NPC Bond

Çocuk ile NPC bağı özel değerlendirilmelidir.

Çünkü bu bağ:

* hikâyeyi,
* rehberliği,
* duygusal tonu

doğrudan etkiler.

---

# 36. NPC–NPC Bonds

Oyuncu görmese bile NPC'ler kendi dostluklarını geliştirebilmelidir.

Böylece dünya gerçekten yaşayan bir sosyal ağ hissi verir.

---

# 37. Relationship Explainability

Her önemli değişiklik açıklanabilir olmalıdır.

```text
+8 Trust

Sebep:

Sözünü tuttu.

+5 Gratitude

Sebep:

Yaralıyken yardım etti.
```

---

# 38. Story Integration

İlişkiler yalnızca sayılar değildir.

Yeni hikâyeler üretir.

Örneğin:

```text
Eski dost yardım ister.

Kırgın arkadaş özür bekler.

Mentor yeni görev verir.
```

---

# 39. Offline Simulation

Oyuncu yokken:

* küçük ilişki güncellemeleri,
* ortak çalışmalar,
* sosyal temaslar

özet biçimde simüle edilir.

Ana ilişki kırılmaları oyuncu yokken gerçekleşmemelidir.

---

# 40. Sistem İlkeleri

1. İlişkiler tek sayı değildir.
2. Her ilişki asimetriktir.
3. Güven, sevgi ve saygı ayrı boyutlardır.
4. Ortak anılar ilişkilerin temelidir.
5. Küçük davranışlar zamanla büyük bağlar oluşturabilir.
6. Güven yavaş kazanılır.
7. Güven tek olayla tamamen geri gelmez.
8. Affetmek ile güvenmek aynı değildir.
9. Yanlış anlaşılmalar ilişkiyi etkileyebilir.
10. Oyuncu yokken büyük sosyal kırılmalar yaşatılmamalıdır.
11. İlişkiler yeni hikâyeler üretmelidir.
12. Her değişiklik açıklanabilir olmalıdır.

---

# 41. Backlog Kararları

### REL-01 — Çok boyutlu Relationship Vector

### REL-02 — Asimetrik ilişki modeli

### REL-03 — Shared Memory sistemi

### REL-04 — Event Weight hesaplaması

### REL-05 — Trust Recovery mekanizması

### REL-06 — Forgiveness modeli

### REL-07 — Relationship Momentum

### REL-08 — Beklenti (Expectation) sistemi

### REL-09 — Promise Memory entegrasyonu

### REL-10 — NPC–NPC sosyal bağları

### REL-11 — Child–NPC özel bağ modeli

### REL-12 — Explainable Relationship Changes

### REL-13 — Story Hook üretimi

### REL-14 — Offline Relationship Simulation

### REL-15 — Threshold tabanlı yeni davranışların açılması
