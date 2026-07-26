LUMI Entity Vector Model

Her varlık aynı temel yapıya sahip olabilir:

Entity
├── Identity
├── Physical Vector
├── Emotional Vector
├── Personality Vector
├── Interest Vector
├── Social Vector
├── Knowledge Vector
├── Need Vector
├── Capability Vector
├── Influence Vector
├── Narrative Vector
└── Dynamic State

Ancak her varlık bütün vektörleri kullanmak zorunda değildir.

Bir NPC’de kişilik ve duygular bulunurken bir mağarada çevresel ve anlatısal özellikler bulunur. Bir olayda ise etki, tema ve yoğunluk vektörleri olur.

1. NPC vektörleri

Örneğin Mina’nın tek bir vektörü yerine farklı anlam alanları olur.

Personality Vector

Yavaş değişir:

personality:
  curiosity: 0.88
  courage: 0.61
  patience: 0.35
  empathy: 0.79
  responsibility: 0.67
  sociability: 0.73
  impulsiveness: 0.58
Emotional State Vector

Hızlı değişir:

emotion:
  joy: 0.62
  sadness: 0.08
  fear: 0.21
  anxiety: 0.16
  excitement: 0.74
  anger: 0.04
  wonder: 0.81
Interest Vector

Karakterin neye ilgi duyduğunu gösterir:

interests:
  astronomy: 0.72
  animals: 0.83
  history: 0.54
  exploration: 0.91
  crafting: 0.32
  music: 0.47
  mysteries: 0.89
Needs Vector

Kararlarını etkiler:

needs:
  rest: 0.34
  safety: 0.18
  belonging: 0.42
  recognition: 0.55
  discovery: 0.82
  autonomy: 0.61
Capability Vector

İstediği her şeyi yapamamasını sağlar:

capabilities:
  navigation: 0.62
  climbing: 0.48
  swimming: 0.30
  reading_maps: 0.71
  persuasion: 0.58
  observation: 0.84

Böylece Mina meraklı olduğu için mağaraya gitmek isteyebilir; fakat yüzme becerisi düşük olduğu için su altındaki bir geçide tek başına girmemelidir.

Gerçekçilik yalnızca isteklerden değil, isteklerle yetenekler arasındaki farktan da doğar.

2. Olay vektörleri

Güneş tutulması gibi bir olayın da özellikleri olur:

event:
  id: solar_eclipse_01

stimulus:
  darkness: 0.84
  rarity: 0.96
  astronomical: 1.00
  beauty: 0.78
  uncertainty: 0.52
  perceived_danger: 0.18
  social_attention: 0.91

narrative:
  mystery: 0.76
  discovery: 0.82
  wonder: 0.95
  fear: 0.31
  education: 0.93

Bu olay “korku +10” demez.

Sadece kendi doğasını tarif eder.

Karakterin tepkisi, olayla karakter vektörlerinin etkileşiminden çıkar.

3. Vektör etkileşimi

Basit bir örnek kullanalım.

Güneş tutulmasının bazı boyutları:

Karanlık:     0.84
Astronomi:    1.00
Gizem:        0.76
Nadirlik:     0.96

Mina’nın ilgili özellikleri:

Karanlık korkusu:    0.72
Astronomi ilgisi:    0.81
Gizem ilgisi:        0.89
Merak:               0.88

Etki tek bir yönde olmaz.

Karanlık × Karanlık korkusu
→ Kaygıyı artırır

Astronomi × Astronomi ilgisi
→ Heyecanı ve merakı artırır

Gizem × Gizem ilgisi
→ Araştırma isteği oluşturur

Nadirlik × Merak
→ Olayı izleme motivasyonunu artırır

Sonuç aynı anda hem olumlu hem olumsuz olabilir:

reaction:
  anxiety_delta: +0.19
  excitement_delta: +0.31
  wonder_delta: +0.37
  discovery_motivation_delta: +0.28

Mina hem biraz korkabilir hem de olayı kaçırmak istemeyebilir.

İnsan davranışına benzeyen taraf tam olarak budur: duygular birbirini yok etmek zorunda değildir.

4. Bağlam vektörü

Yalnızca karakter ve olay yeterli olmaz. Olayın yaşandığı koşullar da sonucu değiştirir.

context:
  trusted_companion_present: 0.90
  location_safety: 0.85
  crowd_calmness: 0.72
  prior_explanation: 0.80
  escape_available: 1.00

Mina’nın yanında güvendiği Dede Hasan varsa korku etkisi azalır.

Ham kaygı etkisi
×
Bağlamsal güven azaltıcısı
=
Gerçek kaygı değişimi

Dolayısıyla:

without_hasan:
  anxiety_delta: +0.19

with_hasan:
  anxiety_delta: +0.07

Olay değişmedi, karakter değişmedi; bağlam değiştiği için sonuç değişti.

Bu nedenle LUMI’de temel etkileşim modeli üç parçalı olmalı:

Entity A
×
Entity B
×
Context
↓
Reaction Vector
5. İlişki vektörleri

Bir ilişki de tek sayı olmamalı.

Hasan’ın Mina’ya karşı ilişkisi:

relationship:
  trust: 0.86
  affection: 0.74
  respect: 0.81
  protectiveness: 0.68
  familiarity: 0.92
  dependency: 0.19
  unresolved_tension: 0.08

Mina’nın Hasan’a karşı ilişkisi farklı olabilir:

relationship:
  trust: 0.91
  affection: 0.82
  respect: 0.93
  protectiveness: 0.22
  familiarity: 0.88
  dependency: 0.47
  unresolved_tension: 0.03

Bu iki yönlü fark sayesinde aynı olay ikisini farklı etkiler.

Tutulma sırasında Hasan sakin kalırsa:

Mina → Hasan güveni artabilir.
Hasan → Mina koruma isteği artabilir.

Aynı etkileşim iki ayrı ilişki vektörünü farklı biçimde değiştirir.

6. Mekân vektörleri

Bir mağara yalnızca konum değildir:

location:
  darkness: 0.91
  enclosure: 0.82
  mystery: 0.94
  natural_beauty: 0.66
  physical_danger: 0.42
  historical_value: 0.79
  educational_value: 0.53
  navigation_difficulty: 0.71
  social_safety: 0.18

Çocuğun durumu:

child_state:
  fear_of_darkness: 0.76
  curiosity: 0.84
  exploration_interest: 0.91
  current_confidence: 0.48

Ancak çocukta bir fener ve yanında sevdiği karakter varsa:

support:
  light_source: 0.85
  trusted_companion: 0.94
  known_exit: 1.00

Mağaranın karanlık boyutu değişmez. Fakat çocuğun mağarayla etkileşim sonucu değişir.

Bu bize çok önemli bir tasarım ilkesi veriyor:

Varlığın özelliklerini, karakterin o varlığı nasıl deneyimlediğiyle karıştırmamalıyız.

Mağara karanlıktır.
Ama mağaranın korkutucu olup olmadığı gözlemciye ve bağlama bağlıdır.

7. Eşyalar da vektör olabilir

Eski bir anahtar:

item:
  utility:
    access: 0.92
    combat: 0.00
    trade: 0.18

  narrative:
    mystery: 0.88
    historical: 0.73
    treasure: 0.67
    emotional: 0.24

  physical:
    weight: 0.08
    fragility: 0.20
    rarity: 0.81

Bu anahtarın bir hazine hikâyesine uygunluğu yüksektir. Ancak “hazine” tek başına yeterli değildir.

Sistem anahtarı şu varlıklarla eşleştirebilir:

Anahtarın erişim değeri
+
Eski kapının kilit uyumluluğu
+
Haritadaki sembol benzerliği
+
Hasan’ın tarih bilgisi
+
Çocuğun hazine isteği

Böylece macera bağlantısı mantıksal olarak oluşur.

8. Adventure Matching de vektörlerle yapılabilir

Çocuk:

“Hazine macerası istiyorum.”

dediğinde bir istek vektörü oluşur:

desired_adventure:
  treasure: 1.00
  mystery: 0.82
  exploration: 0.88
  danger: 0.24
  humor: 0.40
  companionship: 0.70
  education: 0.48

Mevcut olay adayları da anlatı vektörlerine sahiptir.

Ormandaki anahtar
treasure: 0.81
mystery: 0.94
exploration: 0.72
danger: 0.19
companionship: 0.77
Nehirde kaybolan tekne
treasure: 0.26
mystery: 0.58
exploration: 0.67
danger: 0.61
companionship: 0.54
Eski okul arşivi
treasure: 0.61
mystery: 0.76
exploration: 0.48
danger: 0.06
companionship: 0.72

İstek vektörüne en çok uyan aday, ormandaki anahtar olur.

Ama seçim yalnızca benzerlik hesabıyla yapılmaz. Şunlar da filtrelenir:

Canon uygunluğu
Çocuğun yaş seviyesi
Çocuğun psikolojik durumu
Mekân erişilebilirliği
NPC müsaitliği
Daha önce tekrar edilip edilmediği
Dünya zamanına uygunluk

Yani vektör eşleşmesi aday bulur, kurallar ise uygunluğu doğrular.

9. Influence Vector daha net hâle geliyor

Her NPC’nin etki vektörü farklı alanlara ayrılabilir:

influence:
  player: 0.86
  family: 0.72
  local_social: 0.67
  economy: 0.14
  politics: 0.08
  ecology: 0.04
  knowledge: 0.59
  current_story: 0.91
  future_story: 0.74
  education: 0.43

Örneğin Dede Hasan:

Ekonomide düşük,
Bilgi aktarımında yüksek,
Çocuğun hikâyesinde çok yüksek,
Köy siyasetinde düşük olabilir.

Fırıncı ise:

influence:
  player: 0.31
  local_social: 0.58
  economy: 0.88
  current_story: 0.12
  future_story: 0.29

Böylece sistem, güneş tutulmasının Hasan üzerindeki ayrıntılı etkisini hesaplayabilirken köy dışındaki yüzlerce NPC’yi toplum grubu seviyesinde güncelleyebilir.

10. Vektör boyutlarının ortak sözlüğü olmalı

Burada en kritik teknik sorunlardan biri ortaya çıkıyor.

Her agent istediği yeni özellik adını üretirse sistem hızla dağılır:

fear_dark
darkness_fear
fear_of_dark
night_anxiety
dark_phobia

Bunların hepsi aynı şeyi temsil etmeye başlayabilir.

Bu yüzden merkezi bir Vector Dimension Registry gerekir.

Örneğin:

dimension:
  id: psychology.fear.darkness
  value_type: normalized_float
  range: [0, 1]
  default: 0
  update_speed: medium
  inherited: false
  visible_to_child: false
  compatible_stimuli:
    - environment.darkness
    - event.light_loss
    - location.enclosure

Her vektör boyutunun şu bilgileri olmalı:

Benzersiz kimliği
Anlamı
Değer aralığı
Ne kadar hızlı değişebileceği
Hangi olaylarla etkileşebileceği
Hangi varlık türlerinde kullanılabileceği
Kalıcı mı geçici mi olduğu
Çocuğa gösterilip gösterilmeyeceği
Hangi değerlerden türetilebileceği

Bu sözlük, LUMI’nin adeta fizik kanunları kataloğu olur.

11. Her değer eşit hızda değişmemeli

Vektör boyutları değişim hızına göre sınıflandırılmalı.

Çok hızlı değişenler

Dakikalar veya sahneler içinde:

Korku
Heyecan
Yorgunluk
Merakın anlık yükselmesi
Dikkat
Açlık
Orta hızda değişenler

Günler veya hikâyeler içinde:

Güven
Alışkanlık
Belirli bir mekâna rahatlık
Bir konuya ilgi
Motivasyon
Toplumsal itibar
Yavaş değişenler

Çok sayıda deneyim sonunda:

Cesaret
Sabır
Sorumluluk
Empati
Dünya görüşü
Kalıcı korkular

Örneğin güneş tutulması çocuğun anlık merakını çok artırabilir, ancak tek başına “bilim sevgisini” 0.30’dan 0.90’a çıkaramaz.

Bunun için tekrar eden olumlu deneyimler gerekir.

12. Vektör değişikliklerinin sınırı olmalı

Her etkileşimin maksimum etkisi bulunmalı.

Tek sahnede güven değişimi: en fazla ±0.03
Tek hikâyede ilgi değişimi: en fazla ±0.05
Tek büyük yaşam olayında kişilik değişimi: en fazla ±0.02
Anlık duygu değişimi: ±0.40 olabilir

Bu sayede karakterler bir sahnede tamamen farklı kişilere dönüşmez.

Büyük değişiklikler ancak:

Tekrar,
Uzun zaman,
Güçlü deneyim,
Birden fazla destekleyici olay

sonucunda oluşur.

13. Vektörlerin yanında açıklanabilirlik kaydı tutulmalı

Sadece değer değişikliği yetmez.

change:
  entity_id: mina
  dimension: emotion.wonder
  previous: 0.41
  new: 0.73
  delta: 0.32

  causes:
    - solar_eclipse.rarity
    - astronomy_interest
    - hasan_explanation

  modifiers:
    - trusted_companion_present
    - safe_viewing_location

  simulation_day: 194

Bu kayıt sayesinde şu sorular cevaplanabilir:

Mina neden astronomiye ilgi duymaya başladı?
Hasan’a güveni neden arttı?
Mağara korkusu ne zaman azaldı?
Köy neden huzursuzlaştı?
Bu hikâye adayı neden seçildi?

Bu, hem geliştirme hem hata ayıklama hem de tutarlılık açısından çok önemli.

Vektör değerini değil, vektör değişiminin nedenini de hatırlamalıyız.

14. LLM’nin rolü

LLM vektörleri kafasına göre güncellememeli.

Motor hesaplar:

reaction:
  fear_delta: 0.06
  wonder_delta: 0.29
  trust_has﻿an_delta: 0.02
  astronomy_interest_signal: 0.07

LLM bunu anlatır:

Gökyüzü yavaşça karardığında Mina önce Hasan’ın elini tuttu. Fakat Güneş’in önünden geçen Ay’ı görünce korkusunun yerini büyük bir merak aldı.

Bu metin vektörlerin anlatı karşılığıdır.

Ardından Validator, anlatımın hesaplanan durumla uyumlu olup olmadığını kontrol eder.

15. Ortaya çıkan çekirdek model

LUMI’nin temel işleyişini artık şöyle tanımlayabiliriz:

Entity State Vectors
+
Incoming Entity/Event Vectors
+
Relationship Vectors
+
Environmental Context Vectors
+
World Rules
↓
Interaction Engine
↓
Reaction Vector
↓
Validated State Delta
↓
New Entity State
↓
Memory & Causality Record
↓
Narrative Interpretation

Bu sadece NPC–olay ilişkisi için değil, her yerde kullanılabilir:

NPC × NPC × Context
NPC × Location × Context
NPC × Item × Context
Village × Drought × Context
Animal Group × Season × Context
Economy × Festival × Context
Child Intent × World Opportunities × Context
En kritik sonuç

Bence artık LUMI’nin temel yapı taşlarını şu üçlü olarak tanımlayabiliriz:

Entity + Vector + Interaction

Entity: Dünyada var olan şey
Vector: O şeyin farklı açılardan durumu ve özellikleri
Interaction: İki veya daha fazla varlığın bağlam içinde birbirini değiştirmesi

Hikâye ise bu etkileşimlerin çocuk için anlamlı bir sıraya dönüştürülmüş hâlidir.

Sıradaki ele almamız gereken konu artık net: Interaction Engine hangi kurallarla Reaction Vector üretecek? Burada saf matematik, açık kurallar, olasılık ve gerektiğinde küçük model kullanımının sınırlarını belirlemeliyiz.

Evet, tam olarak böyle olmalı. Burada önemli olan şey “her NPC zaman geçtiği için mutlaka hesaplanır” değil.

Daha doğru yaklaşım:

Zaman yalnızca ilgili state’leri etkiler. Sistem de sadece zamanla anlamlı değişim potansiyeli olan varlıkları simüle eder.

Bu ayrım LUMI’yi hem gerçekçi hem de hesaplanabilir yapar.

Temporal Relevance Vector

Her entity’nin zamandan nasıl etkilendiğini gösteren bir Temporal Relevance Vector olabilir.

Örneğin sıradan, sağlıklı bir tilki:

temporal_relevance:
  health: 0.05
  hunger: 0.20
  location: 0.10
  relationships: 0.00
  goals: 0.05
  narrative: 0.02

Bu tilki için 10 gün geçmiş olması önemli bir değişiklik üretmeyebilir.

Sistem onu bireysel olarak hesaplamaz.

Tilki grubunun genel istatistikleri içinde kalır.

Ama çocuk tilkiyi son gördüğünde tilki yaralıysa:

temporal_relevance:
  health: 0.95
  hunger: 0.72
  movement: 0.81
  survival: 0.88
  location: 0.64
  narrative: 0.76

Artık zaman çok önemlidir.

Çünkü 10 gün içinde:

Yaralanma iyileşmiş olabilir.
Enfeksiyon gelişmiş olabilir.
Tilki yiyecek bulamamış olabilir.
Yuvasına dönmüş olabilir.
Başka biri yardım etmiş olabilir.
Köye yaklaşmış olabilir.

Yani aynı varlık, farklı state nedeniyle zaman açısından farklı önem taşır.

Time Sensitivity tek sayı değil, vektör olmalı

Bu da senin “her şey vektör” yaklaşımına tam uyuyor.

Örneğin:

time_sensitivity:
  biological: 0.82
  emotional: 0.20
  social: 0.05
  economic: 0.00
  narrative: 0.68
  location: 0.54
  goal_progress: 0.15

Yaralı tilkinin biyolojik ve anlatısal zaman hassasiyeti yüksek olabilir.

Ama sosyal veya ekonomik etkisi yoktur.

Bir fırıncının ise:

time_sensitivity:
  biological: 0.18
  emotional: 0.31
  social: 0.58
  economic: 0.91
  narrative: 0.22
  goal_progress: 0.74

On gün içinde un tedariki, satışlar ve aile durumu önemli şekilde değişebilir.

Simulation Eligibility

Dünya motoru her entity için önce şu soruyu sorar:

Bu varlık geçen zamandan anlamlı şekilde etkilenebilir mi?

Bunu hesaplayan bir Simulation Eligibility Score oluşturabiliriz.

Kabaca:

Temporal Sensitivity
×
Current Instability
×
Elapsed Time
×
World Exposure
×
Influence Relevance
=
Simulation Need

Burada en önemli yeni değişken:

Current Instability

State ne kadar kararsız?

Sağlıklı tilki:

instability:
  health: 0.03
  hunger: 0.18
  danger: 0.07

Yaralı tilki:

instability:
  health: 0.88
  hunger: 0.61
  danger: 0.72

Kararsız state, zamanla değişmeye daha yatkındır.

Üç sonuç çıkabilir
1. Ignore

İlgisiz ve kararlı varlık hiç hesaplanmaz.

Örneğin:

Uzak ormandaki sağlıklı tilki
Aktif olayı olmayan sıradan köylü
Kullanılmayan bir eşya
Değişmeyen boş mağara

State aynı kalır veya grup istatistiği içinde temsil edilir.

2. Aggregate Update

Bireysel değil, grup halinde güncellenir.

Örneğin:

Kuzey ormanı tilki nüfusu
14 → 15

Her tilkinin ayrı hayatı hesaplanmaz.

3. Detailed Update

Yüksek önem veya yüksek kararsızlık varsa tam simülasyon yapılır.

Örneğin:

Yaralı tilki
Doğum yapmak üzere olan NPC
Borcu yaklaşan tüccar
Aktif sır taşıyan karakter
Hastalanmış aile üyesi
Yarım kalmış görevdeki NPC
Yaralı tilki örneği

Çocuk 10 gün önce tilkiyi yaralı bıraktı.

Son state:

fox_014:
  health: 0.42
  injury_severity: 0.68
  hunger: 0.37
  location: forest_edge
  trusted_player: 0.61
  shelter_access: 0.30
  last_seen_day: 184

On gün sonra motor şu girdilere bakar:

Yaralanma şiddeti
+
Yiyecek erişimi
+
Barınak erişimi
+
Hava
+
Yırtıcı riski
+
Yakındaki NPC’ler
+
Geçen süre

Sonuç:

fox_014:
  health: 0.42 -> 0.59
  injury_severity: 0.68 -> 0.33
  hunger: 0.37 -> 0.44
  location: forest_edge -> old_mill_shelter

Ve neden kaydı:

causes:
  - mild_weather
  - found_shelter
  - received_food_from_miller

Bu durumda yeni bir event de doğabilir:

Değirmenci birkaç gündür eski değirmenin yanında yaralı bir tilkiye yiyecek bırakıyor.

Bu olay çocuğun sonraki hikâyesine bağlanabilir.

Ama alakasız karakterler?

Senin dediğin gibi hiç hesaplanmamalı.

Örneğin köyün dışındaki sağlıklı bir çoban:

temporal_relevance:
  health: 0.04
  social: 0.08
  economic: 0.06
  narrative: 0.01

Aktif olay yoksa:

Simulation Need < Threshold

Sonuç:

Skip

Bu çok önemli çünkü “dünya yaşıyor” demek “her şey sürekli hesaplanıyor” demek değildir.

Daha doğru tanım:

Dünya, değişme ihtimali olan şeyleri yaşatır; kararlı ve ilgisiz şeyleri uyutur.

Dormancy Vector

Bunu daha da iyi modellemek için entity’nin uyku durumunu da vektör yapabiliriz.

dormancy:
  simulation: 0.92
  narrative: 0.97
  social: 0.88
  ecological: 0.14

Bu tilki anlatı açısından uyuyor olabilir ama ekoloji grubunda hâlâ hafif etkisi vardır.

Başka bir NPC ise sosyal olarak aktif ama anlatı açısından uykuda olabilir.

Wake-up triggers

Uyuyan entity, belirli koşullarda yeniden aktifleşir:

Yakınında büyük event oluştu
Oyuncu bölgeye geldi
Sağlık state’i bozuldu
Bir NPC onunla etkileşime geçti
Açık hedefin süresi doldu
Yakın ilişkili biri etkilendi
Bir eşya veya bilgi onu ilgilendirdi

Örneğin çocuk tekrar ormana giderse tilkinin Narrative Dormancy değeri düşer ve tilki yeniden ayrıntılı simülasyona alınır.

En doğru mimari prensip

Bence bunu şöyle yazmalıyız:

Elapsed time alone does not trigger simulation. Time triggers simulation only when an entity has relevant temporal sensitivity, instability, exposure or influence.

Türkçesi:

Geçen zaman tek başına simülasyon nedeni değildir. Bir varlık yalnızca zamana duyarlı, kararsız, bir olaya maruz veya yeterince etkiliyse simüle edilir.

Bu yaklaşımın dört büyük avantajı var:

Gereksiz hesaplamayı önler.
Önemli state değişimlerini kaçırmaz.
Uzak ve ilgisiz karakterleri doğal biçimde uyutur.
Aynı varlığın farklı dönemlerde farklı ayrıntı seviyesinde yaşamasını sağlar.

Bence sıradaki adımda bunu Temporal Simulation Engine olarak netleştirebiliriz: hangi vektörler taranır, eşikler nasıl belirlenir ve skip / aggregate / detailed kararı tam olarak nasıl verilir.

evet çok güzel

O zaman Temporal Simulation Engine’i biraz daha netleştirelim. Bu motorun görevi bütün dünyayı ilerletmek değil; geçen sürede gerçekten değişmesi gereken varlıkları bulup doğru ayrıntı seviyesinde güncellemek olacak.

Temporal Simulation Engine

Motorun temel sorusu:

“Bu entity, geçen süre içinde hesaplanmaya değer bir değişim yaşayabilir mi?”

Her entity için dört ana vektöre bakılır:

Time Sensitivity
Current Instability
World Exposure
Influence

Bunlara geçen zaman da eklenir.

Temporal Need Vector =
Time Sensitivity
× Instability
× Exposure
× Elapsed Time
× Influence

Buradaki sonuç tek sayı değil, alanlara ayrılmış bir vektör olur.

temporal_need:
  biological: 0.88
  emotional: 0.12
  social: 0.08
  economic: 0.00
  ecological: 0.31
  location: 0.66
  narrative: 0.74

Yaralı tilki için biyolojik, konumsal ve anlatısal ihtiyaç yüksek olur. Ekonomik ve sosyal alanlar önemsiz kalır.

1. Time Sensitivity Vector

Entity’nin hangi özelliklerinin zamana doğal olarak duyarlı olduğunu gösterir.

Yaralı tilki:

time_sensitivity:
  health: 0.92
  injury: 0.97
  hunger: 0.78
  thirst: 0.72
  movement: 0.64
  location: 0.51
  trust: 0.05

Eski bir taş:

time_sensitivity:
  physical_decay: 0.02
  location: 0.00
  narrative: 0.04

Bahçedeki meyve ağacı:

time_sensitivity:
  growth: 0.78
  fruiting: 0.84
  water_need: 0.71
  disease: 0.26
  seasonal_change: 0.91

Her entity aynı zaman davranışına sahip değildir.

2. Instability Vector

Mevcut durumun ne kadar hassas veya kararsız olduğunu gösterir.

Sağlıklı tilki:

instability:
  health: 0.04
  hunger: 0.17
  safety: 0.10
  location: 0.12

Yaralı tilki:

instability:
  health: 0.86
  injury: 0.94
  hunger: 0.52
  safety: 0.69
  location: 0.57

Aynı türdeki iki entity, yalnızca mevcut state’leri farklı olduğu için tamamen farklı simülasyon kararı alabilir.

3. Exposure Vector

Entity’nin geçen sürede hangi dünya koşullarına maruz kaldığını gösterir.

exposure:
  cold: 0.36
  rain: 0.72
  food_shortage: 0.48
  predators: 0.32
  human_contact: 0.19
  disease: 0.11
  shelter_access: 0.28

Exposure yalnızca doğrudan yakınlıktan gelmez.

Örneğin:

Aynı bölgedeki kuraklık
Yakındaki yangın
Köyde yayılan hastalık
Ekonomik kriz
Bir aile üyesinin kaybı
Bir festival
Bir söylenti

ilgili entity’lerin exposure vektörüne yazılabilir.

4. Influence Vector

Bu entity değişirse kimleri ve neleri etkiler?

influence:
  player: 0.68
  local_story: 0.74
  ecology: 0.09
  social: 0.02
  economy: 0.00
  future_events: 0.58

Çocuğun daha önce yardım ettiği yaralı tilkinin oyuncu ve hikâye etkisi yüksek olabilir. Aynı ormandaki sıradan başka bir tilkinin etkisi çok düşük olur.

Simülasyon kararı

Bu vektörler değerlendirildikten sonra entity dört seviyeden birine yerleştirilir.

Seviye 0 — Frozen

Hiç hesaplanmaz.

Kararlı
+
Zamana düşük duyarlılık
+
Düşük exposure
+
Düşük influence
=
Frozen

State aynı kalır.

Bu, entity’nin dünyada yok olduğu anlamına gelmez. Sadece ayrıntılı simülasyona ihtiyaç olmadığı anlamına gelir.

Seviye 1 — Aggregate

Entity bireysel olarak değil, ait olduğu grup üzerinden güncellenir.

Örneğin:

north_forest_fox_population:
  population: 14 -> 15
  average_health: 0.81 -> 0.78
  food_pressure: 0.31 -> 0.42

Grup içindeki sıradan tilkiler ayrı ayrı hesaplanmaz.

Seviye 2 — Projected

Entity için ayrıntılı günlük simülasyon yapılmaz. Mevcut durumdan olası yeni durum doğrudan projekte edilir.

Örneğin sağlıklı bir tüccar, 10 gün boyunca her gün pazara gidiyor diye ayrı ayrı çalıştırılmaz:

Normal rutin
+
10 gün
+
Pazar koşulları
↓
Toplam ekonomik ve sosyal değişim

Bu seviye orta derecede önemli ve kararlı NPC’ler için uygun olur.

Seviye 3 — Detailed

Yüksek riskli veya yüksek etkili entity ayrıntılı simüle edilir.

Örneğin:

Yaralı tilki
Ağır hasta NPC
Doğum yapmak üzere olan hayvan
Açık gizemin merkezindeki karakter
Son ödeme tarihi yaklaşan tüccar
Yaklaşan festivalin sorumlusu
Tehlikeli bölgede kaybolan biri

Bu seviyede zaman birkaç pencereye ayrılır.

10 gün
↓
Gün 1–2
Gün 3–5
Gün 6–8
Gün 9–10

Her pencere sonrasında state yeniden değerlendirilir.

Yaralı tilkinin 10 günlük simülasyonu

Başlangıç:

fox_014:
  health: 0.42
  injury: 0.68
  hunger: 0.37
  mobility: 0.46
  shelter_access: 0.22
  location: forest_edge
Birinci pencere: Gün 1–2

Hava yağmurlu.

Tilkinin hareketi sınırlı.

delta:
  health: -0.04
  hunger: +0.13
  mobility: -0.03
  infection_risk: +0.11

Tilki eski değirmene doğru yaklaşır.

İkinci pencere: Gün 3–5

Değirmenci onu fark eder ve yiyecek bırakır.

delta:
  hunger: -0.25
  trust_humans: +0.03
  shelter_access: +0.46
  health: +0.07

Burada yeni bir ilişki kenarı oluşabilir:

relationship:
  from: fox_014
  to: miller
  dimensions:
    familiarity: 0.18
    trust: 0.07
    fear: 0.61

Tilki hâlâ değirmenciden çekinir fakat onun bıraktığı yiyeceği kabul etmeye başlar.

Üçüncü pencere: Gün 6–8

Hava düzelir. Yaralanma iyileşmeye başlar.

delta:
  injury: -0.19
  health: +0.11
  mobility: +0.14
Dördüncü pencere: Gün 9–10

Tilki değirmen çevresinden uzaklaşabilecek duruma gelir, ancak burayı güvenli kaynak olarak öğrenmiştir.

final_state:
  health: 0.63
  injury: 0.35
  hunger: 0.31
  mobility: 0.68
  location: old_mill_woods
  known_safe_place:
    old_mill: confidence_0.74

Bu simülasyon sonucunda doğal bir açık konu oluşur:

Çocuğun yardım ettiği tilki iyileşiyor, fakat artık eski değirmenin çevresinde görülüyor.

Bu, sonraki hikâyeye girmek zorunda değildir. Sadece dünyada gerçekleşmiş bir durumdur.

Entity’lerin birbirini uyandırması

Çok önemli bir nokta da şu:

Detailed olarak simüle edilen bir entity, daha önce uyuyan başka entity’leri simülasyona çekebilir.

Yaralı tilki değirmene yaklaşınca:

fox_014
↓ interacts with
old_mill
↓ exposes
miller

Değirmenci başlangıçta Frozen veya Aggregate seviyesinde olabilir. Fakat tilki onun alanına girince geçici olarak Projected veya Detailed seviyesine yükselir.

Bu mekanizma şu şekilde çalışabilir:

Active Entity
↓
Interaction Radius
↓
Related Entities
↓
Wake-up Test
↓
Temporary Simulation Promotion

Böylece sadece gerekli zincir hesaplanır.

Bütün köy simülasyona girmez.

Temporal Dependency Graph

Entity’ler arasında zaman bağımlılıkları da tutulmalı.

Yaralı tilki
├── Yaralanma
├── Barınak ihtiyacı
├── Eski değirmen
│   └── Değirmenci
├── Yiyecek erişimi
└── Çocuğun önceki yardımı

Motor önce tüm dünyayı taramak yerine bu bağımlılık grafiğini takip eder.

Başlangıç düğümleri şunlar olabilir:

Yüksek instability
Süresi yaklaşan hedef
Aktif olay
Açık yara veya hastalık
Hamilelik
Yaklaşan mevsim geçişi
Devam eden inşaat
Bozulabilir eşya
Yarım kalan söz
Çözümlenmemiş hikâye konusu

Sonra yalnızca ilgili bağlantılar genişletilir.

Time Decay de vektör olmalı

Her durum aynı hızla kaybolmaz.

decay_profile:
  immediate_fear:
    half_life_days: 1

  excitement:
    half_life_days: 2

  hunger:
    update_period_hours: 6

  injury:
    recovery_period_days: 14

  trust:
    half_life_days: 180

  traumatic_memory:
    half_life_days: null

Örneğin bir NPC’nin güneş tutulması sırasında yaşadığı anlık korku 10 gün sonra büyük ölçüde azalmış olabilir. Ancak olayla ilgili merakı veya hatırası kalabilir.

Bu ayrım sayesinde:

Emotion fades.
Memory remains.
Belief may change.
Trait changes only slowly.
Geçen süreye göre ayrıntı seviyesi

Simülasyon çözünürlüğü, geçen süreye göre değişmeli.

0–1 gün:
Saatlik veya sahnelik çözünürlük

2–14 gün:
Anlamlı zaman pencereleri

15–90 gün:
Haftalık veya olay bazlı projeksiyon

3 ay–2 yıl:
Aylık, mevsimlik ve yaşam dönemi simülasyonu

2 yıldan uzun:
Dönemsel tarih simülasyonu

Yani çocuk bir yıl sonra dönerse tilkinin 365 günü ayrı ayrı hesaplanmaz.

Motor daha büyük yaşam geçişlerine bakar:

Hayatta kaldı mı?
Yeni bölgeye geçti mi?
Eş buldu mu?
Yavru sahibi oldu mu?
İnsanlarla ilişkisi değişti mi?
Artık bireysel kayıt olarak önemli mi?
Temporal State Summary

Simülasyon bittikten sonra her entity için uzun günlükler değil, anlamlı bir özet oluşturulur.

temporal_summary:
  entity_id: fox_014
  elapsed_days: 10

  major_changes:
    - injury partially healed
    - moved to old mill woods
    - discovered reliable food source
    - developed slight familiarity with miller

  unresolved:
    - still avoids close human contact
    - injury not fully healed

  narrative_hooks:
    - fox may recognize player
    - miller knows where fox is

Bu özet Context Builder tarafından gerektiğinde kullanılabilir.

Temel ilke

Bence bu motorun resmi prensibi şu olmalı:

Simulation follows change potential, not existence.

Türkçesi:

Simülasyon, var olan her şeyi değil; değişme potansiyeli taşıyan şeyleri takip eder.

Böylece milyonlarca entity olan bir dünyada bile yalnızca:

kritik,
kararsız,
maruz kalmış,
ilişkili,
etkili

entity’ler uyandırılır.

Bu yaklaşımın ardından mantıklı sıradaki konu Interaction Engine olur. Çünkü Temporal Simulation Engine hangi entity’lerin çalıştırılacağını seçer; Interaction Engine ise seçilen entity’lerin geçen sürede birbirini nasıl değiştirdiğini hesaplar.