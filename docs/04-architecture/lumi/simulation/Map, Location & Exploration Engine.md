Map, Location & Exploration Engine

Temel felsefe:

Dünya bir sahne listesi değildir; karakterlerin içinde yaşadığı, keşfettiği ve zamanla değişen gerçek bir coğrafyadır.

LLM hiçbir zaman "rastgele yeni bir mağara" oluşturmaz.

Önce dünya motoru karar verir:

Böyle bir mağara gerçekten var mı?
Oyuncu daha önce burayı keşfetti mi?
Buraya ulaşılabilir mi?
Yol açık mı?
Hikâyede görünmesi uygun mu?

Sonra Narrative Engine bunu anlatır.

1. Dünya Katmanları

Dünyayı tek seviyeli tutmak yerine hiyerarşik tasarlayalım.

World
│
├── Continent
│
├── Region
│
├── Area
│
├── Location
│
└── SubLocation

Örnek:

LUMI Dünyası

↓

Kuzey Toprakları

↓

Sis Ormanı

↓

Eski Gözlem Kulesi

↓

Kütüphane

↓

Gizli Oda

Bu yapı sayesinde Story Planner farklı ölçeklerde çalışabilir.

2. Location Kimliği

Her konum benzersiz olmalıdır.

LocationId

Örneğin:

region.north_forest

location.old_watchtower

room.library

room.secret_archive

Hikâyeler isimle değil ID ile çalışır.

3. Location Tanımı

Her konumun değişmeyen özellikleri vardır.

isim

kategori

iklim

görünüm

kapasite

bağlantılar

varsayılan NPC'ler

çevresel affordance

tehlikeler

müzik

ambiyans

görsel referans

Bunlar statik veridir.

4. Dynamic Location State

Bunun yanında değişen durum bulunur.

Örneğin:

kapı açık

köprü yıkık

nehir taşmış

gece

kar yağıyor

festival var

ejderha burada

sandık açıldı

kamp kuruldu

Statik tanım değişmez.

State değişir.

5. Dünya = Grafik

Harita aslında graph olmalıdır.

Village
│
├── Forest
│
│   ├── Cave
│   └── Lake
│
└── Harbor

Her bağlantının özellikleri bulunur.

6. Connection

Bağlantılar yalnızca "var" değildir.

Örneğin:

Forest → Cave

distance

difficulty

blocked

secret

requires_item

requires_story_progress
7. Gizli Bağlantılar

Çok önemli.

Bir bağlantı:

exists

olabilir ama

discovered = false

olabilir.

Bu sayede:

Oyuncu mağaranın varlığını bilmez.

Ama dünya bilir.

8. Discovery State

Her konum için keşif durumu tutulmalıdır.

Unknown

Seen

Visited

Explored

Mastered

Bu ayrım ileride çok işimize yarayacak.

9. Unknown

Oyuncu varlığını bilmiyor.

Haritada görünmez.

10. Seen

Uzaktan görüldü.

İsmi bilinmeyebilir.

Örneğin:

Ormanın içinde eski taş bir kule görünüyordu.

11. Visited

İlk kez gidildi.

12. Explored

Ana noktaları incelendi.

NPC'ler tanındı.

13. Mastered

Bütün önemli noktalar keşfedildi.

Artık Story Planner aynı yeri farklı amaçlarla kullanabilir.

14. Fog of World

Biz daha önce dünya haritasından bahsetmiştik.

Buna "Fog of World" ekleyelim.

Harita:

■■■■■■

□□■■■■

□□□□■■

şeklinde açılmaz.

Çünkü bu bir RTS değildir.

Bunun yerine bölgesel keşif yapılır.

15. Bölgesel Keşif

Örneğin:

✓ Sis Ormanı

?

Kayıp Vadi

?

Batık Liman
16. İlgi Noktaları

Her bölge onlarca detay içerebilir.

Ama çocuk yalnızca önemli noktaları görür.

Örneğin:

değirmen
kule
göl
mağara
17. Landmark

Her önemli yer bir Landmark olabilir.

Örneğin:

Ay Ağacı

Kristal Şelale

Eski Deniz Feneri

Bunlar:

haritada görünür,
callback üretir,
duygusal hafıza oluşturur.
18. Landmark Callback

Örneğin:

Burası geçen yıl Tilki ile tanıştığın göldü.

Bu tamamen Memory Engine sayesinde oluşur.

19. Location Importance

Her konum aynı ağırlıkta değildir.

background

normal

important

critical

Story Planner bunu kullanır.

20. Travel

En önemli konulardan biri.

Bir yerden başka yere geçmek:

"Teleport"

olmamalıdır.

Her yolun süresi vardır.

21. Travel Cost

Yol:

uzunluk

hava

eşya

NPC

enerji

hikâye durumu

ile hesaplanabilir.

22. Travel Mode

Örneğin:

Yürüyerek

Tekne

Ejderha

At

Balon

Sihirli Kapı

Her biri farklı graph kullanabilir.

23. Story Planner

Planner:

Orman

↓

Kule

↓

Köy

şeklinde rota oluşturabilir.

Narrative bunu yolculuk sahnesine dönüştürür.

24. Yolculuk = Hikâye

Bizim sistemde seyahat:

Loading screen

değildir.

Yeni olaylar üretebilir.

Örneğin:

sincap
yağmur
kayıp harita
eski arkadaş
mantar toplama
25. Travel Events

Travel Event Engine daha sonra ayrı tasarlanabilir.

Her yolculuk:

0-N

event üretebilir.

26. Dünya Durmuyor

Çok önemli.

Oyuncu köydeyken:

orman yaşamaya devam eder.

Ama daha önce konuştuğumuz gibi:

10 günlük simülasyon sınırı uygulanır.

Sonrasında dünya "donmuş" durumda bekler.

27. NPC Position

Her NPC'nin gerçek konumu bulunmalıdır.

Örneğin:

Baykuş

↓

Eski Kule

Narrative:

"Baykuş ormandaydı."

diyemez.

Önce World Engine taşımalıdır.

28. NPC Movement

NPC hareketleri:

Routine

Goal

Quest

Emergency

Random Variation

ile belirlenebilir.

29. Dünya Tutarlılığı

Bir NPC aynı anda:

Liman

ve

Mağara

olamaz.

Bu Validation Engine tarafından doğrulanır.

30. Exploration Engine'in Temel İlkeleri

İlk sürüm için şu kuralları belirleyelim:

Dünya hiyerarşik bir coğrafyadır; sahne listesi değildir.
Her konumun statik tanımı ve dinamik durumu ayrıdır.
Harita bir graph yapısıyla modellenir.
Gizli bölgeler dünya tarafından bilinir, oyuncu tarafından keşfedilir.
Keşif seviyeleri (Unknown → Seen → Visited → Explored → Mastered) ayrı tutulur.
Seyahat fiziksel olarak anlamlıdır; anlık ışınlanma varsayılmaz.
Yolculuklar yeni hikâyeler üretebilen aktif süreçlerdir.
NPC'lerin gerçek konumları dünya durumunda saklanır.
Offline simülasyon mevcut 10 günlük sınır kuralına uyar.
Narrative yalnızca World State'in doğruladığı konumları anlatır.

Bence bu motorun henüz yaklaşık %20-25'ini tamamladık. Bundan sonra çok daha ilginç kısmına geçeceğiz:

procedural dünya üretimi,
biyom sistemi,
çevresel affordance'lar,
dinamik hava ve mevsimler,
keşif tabanlı hikâye üretimi,
çocuk seçimlerine göre dünyanın organik evrimi.

Burası LUMI'nin gerçekten "yaşayan evren" hissini oluşturacak en güçlü bölümlerden biri olacaktır.