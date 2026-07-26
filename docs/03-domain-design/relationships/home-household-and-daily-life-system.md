# Home, Household and Daily Life System

**Version:** 1.0.0  
**Status:** Canonical  
**Last Updated:** 2026-07-26  
**Owner:** Project LUMI

## Purpose

Bu belge LUMI evrenindeki ev, yuva, hane ve gündelik yaşam modelini tanımlar.
Amaç, karakterlerin yalnızca hikâye başladığında görünen figürler değil; ait
oldukları yerlerde yaşayan, sorumlulukları, alışkanlıkları ve birbirleriyle
paylaştıkları bir hayatı olan bireyler gibi davranmasını sağlamaktır.

Ev yalnızca fiziksel bir bina değildir. Güven, aidiyet, bakım, aile tarihi,
kişisel eşyalar, gündelik ritüeller ve ortak hafızanın birleştiği yaşayan bir
domain alanıdır.

## Scope

Bu sistem şunları kapsar:

- hane ve ev üyeliği;
- karakterlerin ikamet ve aidiyet bağları;
- ev içindeki odalar, ortak alanlar ve anlamlı nesneler;
- günlük ve haftalık rutinler;
- bakım, paylaşım ve küçük sorumluluklar;
- aile, koruyucu, mentor ve seçilmiş aile ilişkileri;
- misafirlik, komşuluk ve yakın çevre etkileşimleri;
- evde gerçekleşen küçük olaylar ve hazırlıklar;
- ev, karakter, hafıza, ilişki ve dünya durumu arasındaki bağlantılar;
- çocuğun yokluğunda güvenli ve sınırlı gündelik yaşam ilerlemesi.

Ekonomi, yerleşim yönetimi, ayrıntılı bina simülasyonu ve hikâye sonrası
transaction yönetimi bu belgenin doğrudan kapsamı dışındadır. Bunlar ilgili
mimari ve backlog belgelerinde tanımlanır.

## Core Concepts

### Home

Bir veya daha fazla karakterin yaşadığı, döndüğü ya da kendini ait hissettiği
yer. Bir karakterin kalıcı evi, geçici konaklama yeri veya güvenli sığınağı
olabilir.

### Household

Bir yaşam alanını, kaynakları ve sorumlulukları paylaşan karakter topluluğu.
Household biyolojik aileyle sınırlı değildir; koruyucu, büyükanne ve
büyükbabalar, evlat edinilmiş üyeler, seçilmiş aile ve uzun süreli misafirler
dahil olabilir.

### Residence

Bir karakterin belirli zaman aralığında fiilen kaldığı konumdur. `Home`
aidiyeti, `Residence` ise fiziksel bulunmayı temsil eder. Bir karakter aynı anda
yalnızca tek aktif Location içinde bulunabilir.

### Daily Routine

Karakterin uyuma, uyanma, yemek, çalışma, öğrenme, bakım, dinlenme, ziyaret ve
kişisel uğraş gibi tekrar eden faaliyetleridir. Rutin kesin bir senaryo değil,
karakterin ihtiyaçları ve koşullarına göre değişebilen bir eğilimdir.

### Domestic Event

Ev ve hane içinde anlamlı bir değişiklik oluşturan olaydır. Örneğin:

- ailece yemek hazırlanması;
- bir odanın onarılması;
- hasta bir hayvanın bakılması;
- komşudan haber gelmesi;
- eski bir eşyanın bulunması;
- misafir için hazırlık yapılması;
- küçük bir anlaşmazlık ve uzlaşma;
- bir aile geleneğinin kutlanması.

Anlamlı değişiklikler immutable bir domain event olarak kaydedilir.

## Household Model

Bir household en az aşağıdaki bilgileri taşır:

```ts
type Household = {
  id: string;
  worldId: string;
  homeLocationId: string;
  memberIds: string[];
  guestIds: string[];
  sharedItemIds: string[];
  routineProfileId: string;
  traditionIds: string[];
  activeDomesticEventIds: string[];
  stateVersion: number;
};
```

Bu model kavramsaldır; fiziksel PostgreSQL şeması ayrı persistence
specification'ında kesinleştirilir.

## Membership and Roles

Household rolleri sabit karakter sınıfları değildir. Aynı karakter birden fazla
rol taşıyabilir:

- çocuk;
- ebeveyn veya koruyucu;
- büyükanne/büyükbaba;
- kardeş;
- akraba;
- mentor;
- bakım veren;
- uzun süreli misafir;
- seçilmiş aile üyesi.

Roller güç hiyerarşisi oluşturmak için değil, sorumluluk ve ilişki bağlamı
sağlamak için kullanılır. Çocuk güvenliği ve ebeveyn politikaları her zaman
household anlatısının üzerindedir.

## Daily Life

Gündelik yaşam karakteri görünür kılan küçük, inandırıcı hareketlerden oluşur:

- yemek hazırlama ve paylaşma;
- evi veya bahçeyi düzenleme;
- okul, iş, zanaat ve öğrenme;
- hayvanlarla ilgilenme;
- dinlenme ve kişisel zaman;
- komşu veya arkadaş ziyareti;
- eşya onarma ve hazırlık yapma;
- aile üyelerini merak etme veya onlara yardım etme;
- mevsime ve hava durumuna göre günlük planı değiştirme.

Her rutin; karakter ihtiyaçları, hedefleri, kişilik vektörü, duygu durumu,
ilişkileri, yaşı, sağlığı, konumu, mevsim ve aktif dünya olaylarıyla
değerlendirilir. Rutinler karakteri sonsuz tekrar döngüsüne hapsetmez.

## Home State

Home state yalnızca dekorasyon bilgisinden oluşmaz. En az şu katmanları
destekler:

- erişilebilirlik ve güvenlik;
- bakım ve onarım durumu;
- ortak ve kişisel alanlar;
- anlamlı nesnelerin konumu;
- mevsimsel hazırlıklar;
- misafirlik durumu;
- aktif küçük ihtiyaçlar;
- household mood özeti;
- son önemli domestic event;
- son güvenli snapshot ve state version.

World State tek gerçek kaynaktır. Hikâye metni veya LLM home state'i doğrudan
değiştiremez.

## Memories, Traditions and Meaningful Objects

Evler zaman içinde hafıza taşır. Bir masa yalnızca mobilya değil, birlikte
yapılan yemeklerin; bir bahçe aile emeğinin; eski bir harita geçmiş bir
maceranın izi olabilir.

Sistem:

- önemli ev olaylarından seçici hafıza üretebilir;
- ortak ve kişisel hafızayı birbirinden ayırır;
- aile geleneklerini geçmiş event'lere bağlar;
- eşyaların sahiplik ve konum geçmişini korur;
- düşük önem taşıyan rutinleri tek tek saklamak yerine özetleyebilir.

## Relationship Effects

Gündelik yaşam ilişkileri küçük fakat birikimli biçimde etkiler. Birlikte yemek
yapmak yakınlığı, verilen sözü tutmak güveni, sürekli sorumluluktan kaçınmak
güvenilirlik algısını değiştirebilir.

İlişki değişiklikleri:

- yönlüdür;
- tek bir sevgi puanına indirgenmez;
- güven, yakınlık, bakım, saygı ve gerilim gibi boyutlarla temsil edilir;
- yalnızca kanıtlanan olaylardan türetilir;
- tek bir küçük olayla aşırı sıçrama yapmaz.

## World and Seasonal Integration

Ev yaşamı dünyadan bağımsız değildir:

- yağmur dış mekân rutinlerini içeri taşıyabilir;
- kış yakacak ve yiyecek hazırlığını etkileyebilir;
- hasat dönemi household sorumluluklarını değiştirebilir;
- festival dönemleri misafirlik ve gelenekleri etkinleştirebilir;
- yerel krizler güvenli hazırlık event'leri oluşturabilir.

Mevsim ve hava koşulları hikâye dekoru değil, günlük davranış girdileridir.

## Offline Progression

Çocuk uygulamada değilken household yaşamı yalnızca güvenli sınırlar içinde
ilerler:

- 1–3 gün: normal fakat düşük riskli gündelik gelişmeler;
- 4–7 gün: azaltılmış yoğunluk ve daha fazla özetleme;
- 8–10 gün: yalnızca küçük, güvenli ve geri dönüşte anlaşılabilir hazırlıklar;
- 10 günden sonra: household ve dünya son güvenli snapshot'ta donar.

Çocuğun karakteri onun yokluğunda yeni seçim yapmaz. Kritik aile olayları,
kalıcı ayrılıklar, ağır kayıplar, taşınma ve çocuğun katılımını gerektiren
kararlar otomatik tamamlanmaz; `player-preserved` veya `pending` durumda
bekletilir.

Dönüşte önemli değişiklikler “Sen yokken…” özetiyle açıklanır.

## Story Opportunities

Gündelik yaşam doğal hikâye tohumları üretir:

- komşunun getirdiği söylenti;
- dedenin verdiği eski bir eşya;
- bir aile üyesinin hazırladığı sürpriz;
- kaybolan küçük bir evcil hayvan;
- yaklaşan mevsim için yapılan hazırlık;
- evde bulunan geçmişe ait bir mektup;
- yarım kalan kişisel veya ortak proje.

Bu fırsatlar zorunlu görev değildir. Çocuk kabul edebilir, erteleyebilir veya
başka bir macera seçebilir.

## Safety and Privacy

- Gerçek aile verileri yalnızca ilgili Family Space ve Child Profile kapsamında
  erişilebilir olmalıdır.
- Bir household içindeki bilgi başka aile alanına sızdırılamaz.
- NPC'ler ebeveyn veya sistem otoritesini taklit edemez.
- Ev içi çatışmalar yaşa uygun, umutlu ve onarılabilir biçimde ele alınır.
- Korku, suçluluk veya terk edilme baskısı etkileşim aracı olarak kullanılamaz.
- Ebeveyn politikaları bütün gündelik yaşam ve hikâye fırsatlarına uygulanır.

## Invariants

1. Bir karakter aynı anda yalnızca tek aktif Location içinde bulunur.
2. Household üyeliği ile fiziksel residence aynı kavram değildir.
3. World State yalnızca doğrulanmış event ve transaction üzerinden değişir.
4. Geçmiş household event'leri sessizce yeniden yazılamaz.
5. Çocuğun yokluğunda onun adına seçim yapılamaz.
6. Kritik domestic event çocuk dönmeden tamamlanamaz.
7. On günlük offline sınırı household simülasyonu için de geçerlidir.
8. Küçük rutinler kontrolsüz event ve hafıza büyümesine yol açamaz.

## System Relationships

- [Family, Kinship and Generations](027-Family-Kinship-and-Generations.md)
- [NPC Autonomy and Independent Life](../characters/013-NPC-Autonomy-and-Independent-Life.md)
- [Relationship Engine](025-Relationship-Engine.md)
- [World Simulation Engine](../world/004-World-Simulation-Engine.md)
- [Time and Offline Progression](../world/005-Time-and-Offline-Progression.md)
- [Objects, Items and World Persistence](../world/046-Objects-Items-and-World-Persistence.md)
- [Weather, Seasons and Environmental Effects](../world/048-Weather-Seasons-and-Environmental-Effects.md)

## Acceptance Criteria

- Bir NPC'nin evi, household üyeliği, aktif konumu ve rutin bağlamı birbirinden
  ayrılabilir.
- Mevsim, hava, ihtiyaç, duygu ve ilişki girdileri günlük rutin seçimini
  etkileyebilir.
- Anlamlı domestic event'ler event geçmişi ve world-state version ile
  izlenebilir.
- Çocuğun yokluğunda kritik olaylar durur ve küçük gelişmeler özetlenir.
- On günden sonra household durumu ilerlemez.
- Dönüş özeti, görünen değişiklikleri kanıtlayan event'lere bağlanabilir.
- Gerçek aile verileri Family Space ve Child Profile sınırlarının dışına çıkmaz.

