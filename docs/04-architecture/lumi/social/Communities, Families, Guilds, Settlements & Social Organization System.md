# Communities, Families, Guilds, Settlements & Social Organization System

Bu sistem, tek tek NPC'lerden daha büyük sosyal yapıları yönetir.

Amaç yalnızca "köy listesi" oluşturmak değildir.

LUMI'de her topluluk;

* ortak kurallara,
* ortak hafızaya,
* kültüre,
* geleneklere,
* ekonomiye,
* sosyal rollere,
* liderliğe,
* iç ilişkilere

sahip yaşayan bir organizma gibi davranmalıdır.

Temel ilke:

> Dünya yalnızca bireylerden oluşmaz. Bireyler aileleri oluşturur, aileler toplulukları oluşturur, topluluklar ise dünyanın yaşayan sosyal dokusunu oluşturur.

---

# 1. Social Organization Hierarchy

Toplumsal yapı katmanlı olmalıdır.

```text
Character
↓
Family
↓
Household
↓
Neighborhood
↓
Village
↓
Region
↓
Kingdom / Civilization
```

Her katman kendi kurallarına sahiptir.

---

# 2. Social Entity

Her sosyal yapı ayrı bir varlık olarak tutulmalıdır.

```ts
type SocialEntity = {
  entityId: string;
  entityType:
    | "family"
    | "household"
    | "guild"
    | "village"
    | "tribe"
    | "school"
    | "team"
    | "community";

  name: string;

  members: string[];

  reputation: number;

  cultureId: string;

  leaderIds: string[];
};
```

---

# 3. Membership

Bir NPC aynı anda birçok grubun üyesi olabilir.

Örneğin:

```text
Mira

↓

Ailesi

↓

Şifacılar Birliği

↓

Köy

↓

Festival Komitesi
```

Her üyelik farklı sorumluluk getirir.

---

# 4. Membership Role

```ts
type MembershipRole =
  | "leader"
  | "elder"
  | "member"
  | "student"
  | "mentor"
  | "guest"
  | "temporary";
```

Rol davranışı doğrudan etkiler.

---

# 5. Family System

Aile yalnızca akrabalık değildir.

Aile;

* ortak sorumluluk,
* güven,
* bakım,
* gelenek

üretir.

---

# 6. Household

Aynı evde yaşamak ile aile aynı değildir.

Örneğin:

```text
Mentor
+
Çırak

aynı evde yaşayabilir.
```

Household günlük yaşamı etkiler.

---

# 7. Community Identity

Her topluluğun kendi kimliği vardır.

```text
Dağ köyü

↓

Dayanışmacı

Sessiz

Doğaya saygılı
```

Başka bir köy:

```text
Ticaret odaklı

Daha hareketli

Yabancılara açık
```

---

# 8. Cultural Profile

```ts
type CultureProfile = {
  hospitality: number;
  curiosity: number;
  bravery: number;
  tradition: number;
  cooperation: number;
  innovation: number;
  environmentalRespect: number;
};
```

Bu değerler NPC davranışını hafifçe etkiler.

---

# 9. Traditions

Toplulukların gelenekleri olmalıdır.

Örneğin:

```text
İlkbahar Festivali

Hasat Şenliği

Yıldız Gecesi

Orman Teşekkür Günü
```

---

# 10. Rituals

Bazı gelenekler tören içerir.

```text
Yeni üye karşılama

Teşekkür ağacı

Birlikte şarkı söyleme

Fidan dikme
```

Bunlar dünya atmosferini güçlendirir.

---

# 11. Shared Values

Topluluk ortak değerleri:

```text
Doğayı koru

Sözünü tut

Yardımlaş

Misafire saygı göster
```

NPC kararlarını etkileyebilir.

---

# 12. Community Memory

Toplulukların ortak hafızası vardır.

```text
Geçen yıl büyük sel oldu.

Eski köprü birlikte yapıldı.

Ejderha köyü korudu.
```

Bu hafıza bireysel hafızadan ayrıdır.

---

# 13. Local Stories

Her yerleşimin kendi küçük hikâyeleri olur.

```text
Eski değirmen

Kayıp çan

Gizemli mağara

Yaşlı meşe ağacı
```

Bu hikâyeler NPC sohbetlerinde yaşar.

---

# 14. Reputation

NPC'nin yalnızca bireysel itibarı yoktur.

Topluluk itibarı da bulunur.

Örneğin:

```text
Şifacılar Birliği

çok güvenilir.

↓

Yeni üye de başlangıçta biraz güven kazanır.
```

---

# 15. Family Reputation

Bazı aileler:

```text
Çok yardımsever

Çok çalışkan

İyi marangoz

Cesur
```

olarak tanınabilir.

Bu önyargı değil, sosyal beklentidir.

---

# 16. Community Reputation

Bir köy:

```text
Misafirperver

veya

İçe kapanık
```

olarak bilinebilir.

Bu, yabancı NPC davranışını etkiler.

---

# 17. Leadership

Liderlik yalnızca emir vermek değildir.

Lider:

* organize eder,
* arabuluculuk yapar,
* kriz yönetir,
* temsil eder.

---

# 18. Leadership Style

```ts
type LeadershipStyle =
  | "supportive"
  | "democratic"
  | "protective"
  | "traditional"
  | "visionary";
```

Her stil topluluğun havasını etkiler.

---

# 19. Decision Process

Topluluk kararları:

```text
Lider

↓

Yaşlılar

↓

Ortak toplantı

↓

Uzman görüşü
```

gibi farklı yollarla alınabilir.

---

# 20. Community Meetings

Toplantılar;

* festival,
* güvenlik,
* ortak çalışma,
* sorun çözme

amaçlı olabilir.

Oyuncu isterse katılabilir.

---

# 21. Social Duties

Her üyenin sorumluluğu olabilir.

Örneğin:

```text
Bekçi

Nöbet

Şifacı

İlaç hazırlama

Marangoz

Tamirat
```

---

# 22. Voluntary Help

Bazı NPC'ler görevleri olmasa bile yardım eder.

Bu kişilik ve ilişkilere bağlıdır.

---

# 23. Shared Resources

Topluluk ortak kaynaklara sahip olabilir.

```text
Depo

Su kuyusu

Tohum sandığı

Kütüphane
```

---

# 24. Resource Responsibility

Kaynaklar sahipsiz değildir.

Kim ilgileniyor?

Kim tamir ediyor?

Kim dağıtıyor?

Takip edilir.

---

# 25. Community Projects

Toplu hedefler oluşabilir.

```text
Yeni köprü

Yeni bahçe

Festival hazırlığı

Kütüphane onarımı
```

NPC'ler katkıda bulunabilir.

---

# 26. Volunteer Participation

Katılım;

* zaman,
* beceri,
* motivasyon

ile belirlenir.

Kimse otomatik katılmaz.

---

# 27. Social Events

Topluluk yaşamı:

```text
Festival

Pazar

Konser

Yarışma

Kutlama
```

gibi etkinliklerle canlı tutulur.

---

# 28. Festivals

Festival yalnızca dekor değildir.

NPC rutinleri değişebilir.

Yeni konuşmalar oluşabilir.

Yeni görevler çıkabilir.

---

# 29. Daily Social Life

Her gün büyük olay olmaz.

NPC'ler:

```text
Sohbet eder.

Çay içer.

Birlikte çalışır.

Selamlaşır.
```

Bu küçük davranışlar dünyayı canlı gösterir.

---

# 30. Social Networks

Topluluk içindeki iletişim ağı ayrı tutulmalıdır.

Kim kiminle sık görüşüyor?

Kim haber taşıyor?

Kim herkesi tanıyor?

---

# 31. Local Influence

Bazı NPC'ler resmî lider değildir.

Ama herkes onları dinler.

Bu sosyal etki ayrı hesaplanmalıdır.

---

# 32. Community Conflict

Topluluk içinde fikir ayrılıkları olabilir.

Ancak çocuk dostu yapıda:

* çözülebilir,
* öğretici,
* ölçülü

olmalıdır.

---

# 33. Mediation

Bazı NPC'ler arabulucu rolü üstlenebilir.

Bu ilişki sistemini güçlendirir.

---

# 34. Community Recovery

Yangın

Sel

Fırtına

gibi olaylardan sonra topluluk birlikte toparlanabilir.

Bu süreç yeni hikâyeler oluşturur.

---

# 35. Welcoming New Members

Yeni gelen NPC hemen tam üye sayılmaz.

Topluluk onu zamanla tanır.

---

# 36. Guest System

Misafir NPC'ler:

* sınırlı bilgiye erişir,
* bazı etkinliklere katılır,
* kalıcı karar vermez.

---

# 37. Community Secrets

Her topluluğun küçük sırları olabilir.

Örneğin:

```text
Eski tünel

Gizli bahçe

Unutulmuş kütüphane
```

Bunlar hikâye ilerledikçe açılır.

---

# 38. Shared Goals

Topluluk hedefleri:

```text
Ormanı koru

Köprüyü onar

Festivali hazırla

Yeni fidan dik
```

NPC'leri ortak çalışmaya yönlendirir.

---

# 39. Inter-Community Relations

Topluluklar birbirleriyle ilişki kurabilir.

```text
Komşu köy

Dağ kabilesi

Liman kasabası
```

İlişkiler:

* dostça,
* tarafsız,
* mesafeli

olabilir.

---

# 40. System Principles

1. Topluluklar yaşayan organizmalardır.
2. NPC aynı anda birçok grubun üyesi olabilir.
3. Ortak hafıza bireysel hafızadan ayrıdır.
4. Gelenekler ve kültür günlük yaşamı etkiler.
5. Festival ve etkinlikler yeni hikâyeler üretir.
6. Topluluk projeleri NPC iş birliğini artırır.
7. Liderlik yalnızca emir verme değildir.
8. Arka planda toplumsal yaşam devam eder.
9. Oyuncu yokken büyük toplumsal değişimler yaşatılmaz.
10. Her topluluk kendine özgü hissettirmelidir.

---

# 41. Backlog Kararları

### SOC-01 — Çok katmanlı sosyal organizasyon

### SOC-02 — Family ve Household ayrımı

### SOC-03 — Culture Profile sistemi

### SOC-04 — Community Memory

### SOC-05 — Shared Values

### SOC-06 — Festival ve günlük sosyal yaşam

### SOC-07 — Community Projects

### SOC-08 — Reputation katmanları

### SOC-09 — Leadership modeli

### SOC-10 — Social Network haritası

### SOC-11 — Inter-Community Relations

### SOC-12 — Community Secrets

### SOC-13 — Ortak kaynak yönetimi

### SOC-14 — Gönüllü katkı sistemi

### SOC-15 — Açıklanabilir topluluk kararları
