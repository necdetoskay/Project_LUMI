Bu sistem, LUMI evrenindeki NPC’lerin çocuk onları görmediği zamanlarda bile amaçları, alışkanlıkları ve sınırlı bir iradeleri varmış gibi davranmasını sağlar.

Ancak burada kritik hedef şudur:

NPC’ler arka planda yaşamalı, fakat hikâyeyi oyuncudan çalmamalıdır.

NPC’ler kendi kararlarını verir, günlük işlerini sürdürür, küçük değişimler yaratır ve bazı olaylara tepki gösterir. Buna rağmen büyük hikâye dönüşümleri, geri döndürülemez kayıplar veya çocuğun anlamlandıramayacağı gelişmeler kontrolsüz biçimde gerçekleşmez.

1. Sistemin temel sorumluluğu

Bu motor dört ana soruya cevap verir:

NPC şu anda ne istiyor?
Normalde gününü nasıl geçiriyor?
Dünyadaki değişikliklere nasıl tepki veriyor?
Çocuk orada değilken hangi eylemleri gerçekten gerçekleştirebilir?

Örneğin bir köy fırıncısı:

sabah erkenden fırını açar,
odun ve un ihtiyacını kontrol eder,
komşularıyla konuşur,
hasta birine ekmek bırakabilir,
un azaldığında değirmenciye gitmeyi planlayabilir,
fırtına başladığında dükkânını erken kapatabilir.

Fakat çocuk üç gün sonra döndüğünde fırıncının sebepsiz yere kral olmuş olması beklenmez.

2. Background Intent

Her NPC’nin yalnızca anlık bir görevi değil, arka planda taşıdığı niyetleri bulunur.

Bir NPC aynı anda birden fazla niyete sahip olabilir:

type BackgroundIntent = {
  intentId: string;
  category:
    | "survival"
    | "duty"
    | "relationship"
    | "curiosity"
    | "protection"
    | "growth"
    | "rest"
    | "repair"
    | "exploration"
    | "secret";

  targetId?: string;
  motivationVector: MotivationVector;
  urgency: number;
  commitment: number;
  visibility: "hidden" | "subtle" | "known";
  timeHorizon: "immediate" | "short" | "medium" | "long";
  status: "active" | "blocked" | "paused" | "completed" | "abandoned";
};

Örnek:

{
  "intentId": "intent_find_missing_goat",
  "category": "duty",
  "targetId": "goat_mavi",
  "motivationVector": {
    "care": 0.8,
    "responsibility": 0.9,
    "fear": 0.3,
    "curiosity": 0.1
  },
  "urgency": 0.7,
  "commitment": 0.85,
  "visibility": "known",
  "timeHorizon": "short",
  "status": "active"
}

Bu NPC’nin amacı yalnızca “keçiyi bul” değildir. Arka plandaki sebep de bellidir:

keçiyi önemsiyor,
kendisini sorumlu hissediyor,
başına kötü bir şey gelmesinden korkuyor.

Böylece farklı NPC’ler aynı hedef için farklı davranabilir.

3. Niyet türleri
3.1 Hayatta kalma niyetleri

Temel ihtiyaçlarla ilgilidir:

yemek bulmak,
dinlenmek,
yarasını iyileştirmek,
barınak aramak,
tehlikeden uzaklaşmak.

Bunlar genellikle yüksek önceliklidir ancak çocuk dostu evrende doğrudan sert sonuçlara dönüşmek zorunda değildir.

Örneğin yaralı bir tilki:

avlanmak yerine saklanabilir,
güvenli bir su kaynağı arayabilir,
yardım aldığı NPC’nin yakınına yaklaşabilir.
3.2 Görev ve sorumluluk niyetleri

NPC’nin rolünden doğar:

bekçinin kapıyı koruması,
öğretmenin ders hazırlaması,
çiftçinin ürünleri toplaması,
kaptanın gemiyi onarması,
şifacının ilaç hazırlaması.

Bu niyetler NPC’yi dünyada tutarlı yapar.

3.3 İlişki niyetleri

NPC’lerin birbirlerine yönelik hedefleridir:

birine teşekkür etmek,
özür dilemek,
arkadaşlık kurmak,
güven kazanmak,
birini korumak,
kırgınlığını gidermek,
kayıp birini aramak.

Bu niyetler hikâye devamlılığında çok değerlidir.

Çocuk bir NPC’ye yardım ettiyse, NPC sonraki günlerde:

çocuğu merak edebilir,
onun için küçük bir hediye hazırlayabilir,
başkalarına ondan iyi söz edebilir,
gerektiğinde çocuğa yardım etmeyi düşünebilir.
3.4 Merak ve keşif niyetleri

Bazı NPC’ler rutin dışına çıkabilir:

yeni açılan mağarayı incelemek,
gökyüzündeki ışığı araştırmak,
gizemli sesi takip etmek,
eski bir haritayı çözmek.

Bu niyetler yeni hikâye kancaları oluşturabilir.

Fakat NPC, çocuğun yerine büyük keşfi tamamlamamalıdır. Genellikle yalnızca:

ipucu bulur,
yaklaşır,
gözlem yapar,
geri döner,
yardım arar.
3.5 Gizli niyetler

Her niyet çocuğa açık olmayabilir.

Örneğin yaşlı denizci:

kayıp adayı bulmak istiyor olabilir,
geçmişte yaptığı bir hatayı düzeltmeye çalışıyor olabilir,
çocuğu tehlikeden korumak için bazı bilgileri saklıyor olabilir.

Gizli niyetler üç şekilde açığa çıkar:

Davranışlardan sezilir.
Güven arttıkça paylaşılır.
Hikâye olayı tarafından ortaya çıkarılır.
4. NPC Routine System

Niyet, NPC’nin ne istediğini söyler.

Rutin ise normal şartlarda nasıl yaşadığını söyler.

type NPCRoutine = {
  routineId: string;
  npcId: string;
  entries: RoutineEntry[];
  flexibility: number;
  disruptionSensitivity: number;
};

type RoutineEntry = {
  timeWindow: {
    startHour: number;
    endHour: number;
  };

  activityType:
    | "sleep"
    | "work"
    | "eat"
    | "travel"
    | "socialize"
    | "care"
    | "patrol"
    | "study"
    | "play"
    | "rest"
    | "personal";

  preferredLocationId?: string;
  alternativeLocations?: string[];
  relatedNpcIds?: string[];
  conditions?: RoutineCondition[];
  priority: number;
};

Örnek rutin:

Saat	Faaliyet	Konum
06.00–08.00	Fırını hazırlama	Köy fırını
08.00–12.00	Ekmek pişirme ve satış	Köy fırını
12.00–13.00	Yemek ve dinlenme	Fırının arka odası
13.00–16.00	Teslimatlar	Köy
16.00–18.00	Ertesi gün hazırlığı	Depo
18.00 sonrası	Aile ve dinlenme	Ev

Bu çizelge kesin bir senaryo değildir. Bir davranış eğilimidir.

5. Rutinlerin esnek olması

NPC her gün mekanik biçimde aynı şeyi yapmamalıdır.

Rutin şu unsurlardan etkilenir:

hava durumu,
sağlık,
yorgunluk,
kaynak durumu,
ilişkiler,
devam eden görevler,
yakın tehlike,
özel günler,
çocuğun önceki eylemleri,
dünya olayları.

Örneğin:

Normal rutin:
08.00 → Fırını aç

Ama:
Odun yoksa → Oduncuya git
Fırtına varsa → Fırını geç aç
Hasta ise → Çırağından yardım iste
Köprü yıkılmışsa → Teslimat rotasını değiştir
Çocuk yardım sözü verdiyse → Bir süre onu bekle

Burada rutin terk edilmez; koşullara göre uyarlanır.

6. Autonomous Action System

NPC’nin eylem seçimi üç temel kaynaktan beslenir:

Autonomous Action
=
Routine Pressure
+
Intent Pressure
+
World Reaction Pressure

Buna NPC’nin karakter özellikleri ve mevcut durumu da eklenir.

Action Score
=
Routine Fit
+ Intent Utility
+ Personality Fit
+ Emotional Fit
+ Relationship Effect
+ Environmental Feasibility
- Risk
- Cost
- Narrative Restriction

Örneğin köy bekçisi gece garip bir ışık görür.

Olası eylemler:

ışığı tek başına araştır,
kapıyı terk etme,
başka bir bekçiye haber ver,
köylüleri uyandır,
sabaha kadar gözlemle,
çocuğun gelmesini bekle.

Cesur ama sorumluluk sahibi bir bekçi için:

Tek başına gitmek:
Cesaret uyumu yüksek
Görev uyumu düşük
Risk yüksek

Kapıyı koruyup yardım çağırmak:
Cesaret uyumu orta
Görev uyumu yüksek
Risk düşük

Bu nedenle ikinci seçenek kazanabilir.

7. Eylem sınıfları

NPC eylemleri sonuç büyüklüğüne göre sınıflandırılmalıdır.

Tier 0 — Kozmetik eylemler

Dünya durumunu anlamlı ölçüde değiştirmez.

pencereyi açmak,
çay hazırlamak,
meydanda oturmak,
çiçek sulamak,
bir şarkı mırıldanmak.

Bunlar rahatlıkla arka planda simüle edilebilir.

Tier 1 — Küçük durum değişiklikleri

Yerel ve kolay geri döndürülebilir sonuçlar oluşturur.

başka bir yere gitmek,
küçük bir eşya üretmek,
bir NPC ile konuşmak,
yiyecek stoklamak,
bir alanı temizlemek,
küçük bir teslimat yapmak.

Bunlar çoğunlukla otomatik gerçekleşebilir.

Tier 2 — Anlamlı fakat kontrollü eylemler

Hikâyede fark edilebilir sonuçlar oluşturur.

kayıp hayvanı aramak,
bir ilişkiyi düzeltmeye çalışmak,
bir yapıyı onarmak,
küçük bir keşif yapmak,
bir grubu uyarmak,
bir NPC’ye yardım etmek.

Bunlar belirli koşullar ve sonuç sınırlarıyla yapılmalıdır.

Tier 3 — Büyük hikâye eylemleri

Çocuğun deneyimini doğrudan etkiler.

gizli geçidi açmak,
önemli karakteri kurtarmak,
büyük çatışmayı çözmek,
eşsiz bir nesneyi bulmak,
bölgesel liderliği değiştirmek,
ana gizemi çözmek.

NPC bunları tek başına tamamlamamalıdır.

Bunun yerine:

hazırlık yapabilir,
ipucu bulabilir,
yardım çağırabilir,
başarısız bir girişimde bulunabilir,
çocuğun katılacağı bir durum oluşturabilir.
Tier 4 — Geri döndürülemez dünya değişiklikleri
önemli NPC’nin kalıcı kaybı,
bir yerleşimin yok olması,
büyük savaş,
ana hikâyenin bitmesi,
eşsiz bölgelerin erişilemez hâle gelmesi.

Bu seviyedeki eylemler yalnızca:

tasarlanmış hikâye olayıyla,
ebeveyn ayarlarıyla,
açık oyuncu katılımıyla,
güçlü güvenlik kontrolleriyle

gerçekleşebilir.

8. NPC’ler çocuğun hikâyesini çalmamalı

Sistemin en önemli kurallarından biri:

NPC önemli bir problemi geliştirebilir ama oyuncunun yerine çözmemelidir.

Yanlış örnek:

Çocuk üç gün sonra köye döndü.
Bu sırada NPC mağaraya gitti, ejderhayı kurtardı,
hazineyi buldu ve laneti kaldırdı.

Doğru örnek:

Çocuk üç gün sonra köye döndüğünde köy bekçisi,
mağaranın girişine kadar gittiğini ve içeride yaralı
bir ejderhanın sesini duyduğunu anlattı.

Ancak taş kapı tek başına açılamamıştı.

NPC dünyayı ilerletmiştir fakat macerayı tamamlamamıştır.

9. Intent–Routine çatışması

Bazen NPC’nin rutini ile niyeti çelişir.

Örnek:

rutin: dükkânı açık tut,
niyet: kayıp kardeşini ara.

Motor bu çatışmayı değerlendirmelidir.

Urgency
Commitment
Responsibility
Relationship Strength
Risk
Available Alternatives

NPC şu çözümlerden birini seçebilir:

dükkânı erken kapatır,
çırağını dükkânda bırakır,
başka birinden yardım ister,
aramayı akşama erteler,
kısa bir arama turu yapar,
çocuğa görev önerir.

Bu, NPC’yi daha gerçekçi kılar çünkü davranış tek bir skora indirgenmez; sorumluluklar arasında denge kurulur.

10. Eylem girişimi ve başarısızlık

NPC’lerin her girişimi başarılı olmamalıdır.

type AutonomousActionResult = {
  actionId: string;
  outcome:
    | "success"
    | "partial_success"
    | "failed"
    | "interrupted"
    | "abandoned"
    | "deferred";

  progressDelta: number;
  resourceChanges: ResourceChange[];
  relationshipChanges: RelationshipChange[];
  knowledgeGained: KnowledgeEntry[];
  generatedHooks: StoryHook[];
};

Örneğin NPC kayıp keçiyi arar:

izleri bulabilir,
yanlış yöne gidebilir,
yağmur yüzünden izleri kaybedebilir,
yalnızca çanın sesini duyabilir,
keçiyi bulup eve getirebilir,
keçiyi bulur fakat uçurum nedeniyle ulaşamayabilir.

Özellikle son seçenek, çocuk için doğal bir hikâye başlangıcı oluşturur.

11. Arka plan simülasyon bütçesi

Her NPC aynı ayrıntıda çalıştırılmamalıdır.

NPC’lere simülasyon önemi atanır:

type SimulationRelevance = {
  narrativeRelevance: number;
  spatialRelevance: number;
  relationshipRelevance: number;
  unresolvedIntentRelevance: number;
  worldImpactPotential: number;
};

Buna göre:

Yüksek öneme sahip NPC
ayrıntılı niyet değerlendirmesi,
rutin simülasyonu,
ilişki değişimleri,
karar geçmişi,
eylem sonuçları.
Orta öneme sahip NPC
özet rutin,
yalnızca önemli niyetler,
birkaç arka plan eylemi.
Düşük öneme sahip NPC
toplu simülasyon,
durum etiketi güncellemesi,
yalnızca büyük olaylara tepki.

Örneğin uzak köydeki 40 NPC ayrı ayrı simüle edilmek yerine:

Köy yaşamı normal devam etti.
Pazar hazırlıkları başladı.
Yağmur nedeniyle tarla çalışmaları yavaşladı.

şeklinde toplu ilerletilebilir.

12. Uzun süreli yoklukla ilişkisi

Daha önce belirlediğimiz zaman sistemiyle uyumlu olarak:

kısa yokluklarda ayrıntılı simülasyon,
orta sürelerde özet simülasyon,
uzun sürelerde seçilmiş önemli olaylar,
10 günden sonra statik veya kontrollü dünya özeti

uygulanmalıdır.

NPC rutinleri on gün boyunca saat saat çalıştırılmaz.

Örneğin 7 günlük yokluk:

1. gün:
Detaylı rutin ve eylemler

2–3. gün:
Günlük özet simülasyonu

4–7. gün:
Yalnızca önemli niyet ve olay ilerlemeleri

On günden uzun bir yoklukta ise:

rutin davranışlar varsayılan dengeye döner,
küçük ihtiyaçlar otomatik çözülmüş kabul edilir,
büyük niyetler donmuş veya kontrollü ilerlemiş kalır,
geri döndürülemez olay oluşturulmaz.
13. Sistemin temel ilkeleri

Bu motor için şu kuralları sabitleyelim:

Her NPC’nin rutini olabilir, fakat her NPC’nin karmaşık amacı olmak zorunda değildir.
Niyetler vektörel motivasyonlarla desteklenir.
Rutinler koşullara göre esner.
NPC’ler küçük eylemleri bağımsız gerçekleştirebilir.
Büyük hikâye eylemleri oyuncuya bırakılır.
Başarısızlık ve kısmi başarı mümkündür.
Uzak ve önemsiz NPC’ler toplu simüle edilir.
NPC’ler yalnızca dünya durumuna değil, ilişkilerine ve anılarına göre davranır.
Arka plan eylemleri yeni hikâyeler üretmeli, hikâyeleri tüketmemelidir.
Uzun yokluklarda simülasyon giderek seyrekleşir ve sonunda güvenli biçimde donar.