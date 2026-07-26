Living World Simulation Loop

Ancak bunu artık soyut olarak değil, somut bir örnek üzerinden tasarlamalıyız:

Çocuk uygulamayı kapatıyor. Köyde 10 gün geçiyor. Uygulamayı yeniden açıp “hazine macerası istiyorum” diyor.

Bu tek senaryo üzerinden:

zaman nasıl ilerler,
NPC’ler ne yapar,
aileler nasıl etkilenir,
canlı grupları nasıl güncellenir,
olaylar nasıl oluşur,
macera adayları nasıl çıkar,
agentler hangi sırayla çalışır,
hikâye nasıl başlar,
state nasıl kaydedilir

adım adım belirlenebilir.

Bu senaryo LUMI’nin tüm kalp atışını görünür hâle getirecek.

devam edelim

O zaman somut senaryoyu çalıştıralım:

Çocuk uygulamayı kapattı.
Köyde 10 gün geçti.
Uygulamayı tekrar açtı ve “Bir hazine macerası istiyorum.” dedi.

Bu senaryo üzerinden Living World Simulation Loop ortaya çıkacak.

1. Uygulama kapanırken alınan dünya görüntüsü

Sistem bütün veritabanını kopyalamaz. Son güvenilir durumu ve zaman damgasını saklar:

world_time:
  day: 184
  season: spring
  hour: 19

player:
  character_id: ela
  location: home
  last_active_day: 184

village:
  food_supply: 0.71
  morale: 0.66
  security: 0.81

active_events:
  - forest_key_found
  - bridge_repair
  - low_river_level

open_threads:
  - old_map_missing_corner
  - unknown_key_owner

Önemli NPC’lerin de son durumları vardır:

hasan:
  occupation: retired_cartographer
  health: 0.74
  energy: 0.48
  curiosity: 0.62
  protectiveness: 0.91
  current_goal: examine_old_map
  location: home

mina:
  occupation: apprentice_teacher
  curiosity: 0.88
  patience: 0.42
  current_goal: identify_forest_key
  location: school

Burada hikâye metni değil, dünya gerçeği saklanır.

2. Çocuk 10 gün sonra geri gelir

Sistem zaman farkını hesaplar:

Current world day: 194
Last simulated day: 184
Elapsed time: 10 days

Bu noktada doğrudan hikâye üretimine geçilmez.

Önce dünya ilerletilir.

3. Offline Simulation Scope belirlenir

Bütün evren aynı ayrıntıyla hesaplanmaz.

Sistem hangi varlıkların önemli olduğunu seçer.

Tam simülasyon
Çocuğun ailesi
Yakın arkadaşları
Aktif hikâye NPC’leri
Açık olaylarla ilişkili NPC’ler
Çocuğun bulunduğu köy
Özet simülasyon
Köydeki ikincil NPC’ler
Yakın hayvan grupları
Yerel ekonomi
Köy dışındaki yakın bölgeler
İstatistiksel simülasyon
Uzak şehirler
Büyük canlı popülasyonları
Oyuncuyla ilişkisi olmayan NPC’ler

Bu seçimi Simulation Scope Resolver yapar.

4. Zaman doğrudan 10 gün atlamaz

Ama her saat de hesaplanmaz.

Zaman, anlamlı dilimlere bölünür:

10 days
↓
3 simulation windows

Örneğin:

Days 185–187
Days 188–191
Days 192–194

Her pencere içinde yalnızca önemli değişiklikler hesaplanır.

Kısa sürelerde daha ayrıntılı, uzun sürelerde daha özetli simülasyon yapılır.

5. Önce çevresel sistemler ilerler

Simülasyon sırasının önemli olduğunu düşünüyorum.

İlk önce karakterleri değil, onları etkileyen dünya koşullarını güncellemeliyiz.

Time
↓
Weather
↓
Ecology
↓
Resources
↓
Economy
↓
Society
↓
NPCs

Örneğimizde:

Son 10 günde az yağmur yağdı
↓
Nehir seviyesi düştü
↓
Balık popülasyonu kıyıdan uzaklaştı
↓
Balıkçıların avı azaldı
↓
Balık fiyatları yükseldi
↓
Köyde hafif ekonomik endişe oluştu

Bu zincirin büyük kısmı deterministik olabilir.

6. Canlı grupları güncellenir

Nehirdeki her balık tek tek hesaplanmaz.

river_trout_population:
  previous_population: 420
  current_population: 401
  accessible_density: 0.46
  migration_pressure: 0.31
  food_availability: 0.58

Kuzey ormanındaki tilki grubu:

north_fox_group:
  population: 14
  hunger: 0.61
  human_proximity: 0.24

Açlık yükseldiği için bir tilkinin köye yaklaşma ihtimali artabilir.

Bu daha sonra bir olay tohumu oluşturabilir.

7. Toplum durumu güncellenir

Köyde son 10 günün etkileri bir araya getirilir:

village_state:
  morale: 0.66 -> 0.62
  food_supply: 0.71 -> 0.65
  market_prices: 0.48 -> 0.56
  curiosity: 0.58 -> 0.69

Merak neden arttı?

Çünkü ormanda bulunan anahtar hakkında söylenti yayılmış olabilir.

8. NPC kararları hesaplanır

Şimdi her önemli NPC için durum vektörü ele alınır.

Karar modeli kabaca şöyle çalışır:

Personality
+
Needs
+
Goals
+
Relationships
+
Knowledge
+
Current Events
+
Available Actions
+
Random Variation
=
Action Score

Hasan için olası eylemler:

Eski haritayı incele       0.82
Köprü tamirine yardım et   0.54
Pazara git                 0.41
Dinlen                     0.68
Mina ile konuş             0.77

Hasan yaşlı ve enerjisi düşük olduğu için her gün büyük işler yapmaz.

İlk günlerde dinlenebilir, sonra haritayı inceleyebilir, Mina’dan anahtarı göstermesini isteyebilir.

9. NPC’ler arası etkileşim oluşur

Hasan ile Mina’nın etkileşimi:

Mina anahtarı Hasan’a gösterdi.
Hasan sembolün eski haritadaki işarete benzediğini fark etti.
Hasan bundan hemen emin olamadı.

Bu olaydan sonra durum değişir:

hasan:
  knowledge:
    suspected_key_map_connection: confidence_0.68

mina:
  trust_toward_hasan: 0.74 -> 0.77
  curiosity: 0.88 -> 0.91

open_thread:
  key_map_connection:
    status: suspected
    confidence: 0.68

Burada henüz kesin gerçek oluşmadı.

Yalnızca karakterlerin inancı oluştu.

10. Söylenti yayılımı hesaplanır

Mina öğretmenle konuşur.

Öğretmen pazarda birine bahseder.

Söylenti değişebilir:

Başlangıç:
“Ormanda eski bir anahtar bulundu.”

Birinci yayılım:
“Hasan anahtarın eski bir yere ait olduğunu düşünüyor.”

İkinci yayılım:
“Anahtarın eski bir hazine odasını açtığı söyleniyor.”

Son cümle canon değildir.

Toplum söylentisidir.

Bu ayrım çok önemli:

truth:
  key_origin: unknown

hasan_belief:
  related_to_old_map: probable

village_rumor:
  opens_treasure_room: unverified
11. Life Progression güncellenir

Bu on gün içinde NPC’lerin kendi yaşamları da devam eder.

Örneğin:

Mina okulda iki yeni öğrenciye yardım etti.
Fırıncı un tedariki için başka köyle görüştü.
Marangoz köprünün korkuluklarını tamamladı.
Hasan eski haritanın eksik köşesini aradı.
Balıkçı, nehirde parlak taşlar gördüğünü söyledi.

Her olay hikâye değeri taşımaz.

Çoğu sadece state değiştirir.

Sistem yalnızca önemli olanları Event Log’a dönüştürür.

12. Event Emergence aşaması

On günlük simülasyonun sonunda olaylar değerlendirilir.

Olası olay tohumları:

event_candidates:
  - id: key_map_connection
    novelty: 0.86
    relevance_to_player: 0.79
    urgency: 0.44
    story_potential: 0.91

  - id: fish_migration
    novelty: 0.55
    relevance_to_player: 0.41
    urgency: 0.38
    story_potential: 0.52

  - id: fox_near_village
    novelty: 0.63
    relevance_to_player: 0.47
    urgency: 0.61
    story_potential: 0.58

  - id: bridge_completed
    novelty: 0.36
    relevance_to_player: 0.52
    urgency: 0.10
    story_potential: 0.31

Burada henüz LLM’ye gerek yok.

Skorlar kurallarla hesaplanabilir.

13. Çocuk “Hazine macerası istiyorum” der

Şimdi Child Intent Parser devreye girer.

intent:
  category: adventure
  theme: treasure
  preferred_mode: interactive
  explicit_companions: none
  urgency: immediate

Ardından Adventure Formation Engine çocuğun isteğini mevcut dünya ile eşleştirir.

Treasure intent
+
Old map thread
+
Unknown key
+
Hasan’s suspicion
+
Village rumor
+
Available forest location
=
Strong adventure candidate

Bu nedenle sistem sıfırdan rastgele bir hazine oluşturmaz.

Var olan dünya malzemesini kullanır.

14. Macera adayları üretilir

Örneğin üç aday:

Aday 1 — Eski anahtar

Mina’nın bulduğu anahtar, Hasan’ın eski haritasındaki sembolle bağlantılı olabilir.

Aday 2 — Nehirdeki parlak taşlar

Balıkçının gördüğü taşlar, eski bir sandığın işareti olabilir.

Aday 3 — Eksik harita köşesi

Hasan’ın haritasının kayıp parçası eski okul arşivinde olabilir.

Bunlar skorlanır:

World consistency
Player relevance
Novelty
Age suitability
Available NPCs
Learning opportunity
Emotional suitability
Story potential

İlk aday kazanır.

15. Çocuğa doğal bir öneri sunulur

Sistem teknik kayıtları göstermez.

Narrative Layer şöyle söyleyebilir:

“Sen yokken köyde ilginç bir şey olmuş. Mina ormanda eski bir anahtar bulmuş. Dede Hasan, anahtarın kendi eski haritasındaki bir sembole benzediğini düşünüyor. Belki de aradığımız hazine macerası tam burada başlıyordur.”

Bu cümlede:

Gerçek olay kullanılıyor.
Hasan’ın kesin bilmediği bir şey kesinmiş gibi söylenmiyor.
Çocuğun isteği dünyaya bağlanıyor.
Hikâye doğal şekilde başlıyor.
16. Hikâye başlamadan Context Pack hazırlanır

Storyteller bütün veritabanını görmez.

Ona şunlar verilir:

current_world:
  day: 194
  season: spring
  weather: cloudy

player:
  name: Ela
  age_group: 5-6
  known_npcs:
    hasan: trusted
    mina: friend

relevant_events:
  - forest_key_found
  - hasan_suspects_map_connection

relevant_objects:
  - old_key
  - incomplete_map

knowledge_limits:
  ela:
    knows_key_found: false
    knows_map_exists: true
  mina:
    knows_key_found: true
  hasan:
    suspects_connection: true

tone:
  adventurous
  warm
  low_fear

learning_target:
  colors_and_shapes

Böylece Storyteller kontrollü bir yaratıcı alanda çalışır.

17. Eğitim etkileşimi hikâyeye gömülür

Diyelim çocuk 5 yaşında.

Kapının üzerinde üç sembol var:

Kırmızı elma
Mavi yıldız
Sarı ay

Hasan şöyle sorabilir:

“Haritada mavi yıldız işaretlenmişti. Sence hangi sembole dokunmalıyız?”

Çocuk doğru cevabı verirse kapı açılır.

Yanlış cevabın sonucu cezalandırma değildir:

“Bu sembol hafifçe parladı ama kapı açılmadı. Haritadaki işarete bir kez daha bakalım.”

Çocuk başarısız hissetmez.

Sistem destek verir.

18. Agentler nasıl çalışır?

Bu senaryoda önerdiğim akış:

Orchestrator
↓
Intent Interpreter
↓
World Director
↓
Adventure Formation Engine
↓
Learning Designer
↓
Narrative Planner
↓
Storyteller
↓
Continuity & Safety Reviewer
↓
State Committer

Ancak bunların hepsi mutlaka ayrı çalışan bağımsız agent olmak zorunda değildir.

İlk sürümde bazıları aynı model çağrısındaki farklı aşamalar olabilir.

Örneğin:

World Director + Narrative Planner
= Tek planlama çağrısı

Safety + Continuity
= Tek inceleme çağrısı

Böylece agent mimarisi korunur ama maliyet ve karmaşıklık sınırlanır.

19. Hikâye sırasında state nasıl değişir?

Çocuk anahtarı alırsa Storyteller doğrudan veritabanını değiştiremez.

Yapılandırılmış değişiklik önerir:

proposed_changes:
  - type: item_transfer
    item_id: forest_key
    from: village_archive
    to: ela

  - type: knowledge_gain
    character_id: ela
    knowledge_id: key_map_possible_connection

  - type: relationship_delta
    from: hasan
    to: ela
    dimension: trust
    amount: 0.02

Validator şunları kontrol eder:

Anahtar gerçekten arşivde mi?
Hasan bunu vermeye yetkili mi?
Ela bu bilgiyi sahnede öğrendi mi?
İlişki artışı makul mü?

Sonra State Committer uygular.

20. Simülasyon döngüsünün temel formu

Ortaya çıkan ana döngü şu:

Load Last State
↓
Calculate Elapsed Time
↓
Resolve Simulation Scope
↓
Advance Environment
↓
Advance Ecology and Resources
↓
Advance Society
↓
Advance NPCs
↓
Resolve Interactions
↓
Update Relationships and Knowledge
↓
Generate Emergent Events
↓
Rank Story-Relevant Changes
↓
Receive Child Intent
↓
Form Adventure Candidates
↓
Build Context
↓
Generate Narrative
↓
Validate
↓
Commit State and Memory