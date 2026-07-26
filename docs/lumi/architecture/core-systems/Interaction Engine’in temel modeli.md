Interaction Engine’in temel modeli

Her etkileşim en az üç girdi alır:

Source Entity
+
Target Entity
+
Context
↓
Reaction Vector
↓
State Delta

Örnekler:

Güneş tutulması × Mina × Güvenli gözlem alanı
Tilki × Değirmenci × Eski değirmen
Kuraklık × Köy × Yaz mevsimi
Çocuk × Mağara × Dede yanında
NPC × Söylenti × Güvenilir kaynak

Burada Source her zaman aktif bir karakter olmak zorunda değildir. Olay, mekân, hava, eşya veya toplumsal durum da kaynak olabilir.

1. Interaction Signature

Her entity, hangi tür etkileşimlere katılabileceğini tanımlayan bir imzaya sahip olur.

Yaralı tilki:

interaction_signature:
  can_receive:
    - food
    - shelter
    - medical_aid
    - threat
    - weather
    - social_contact

  can_emit:
    - fear_signal
    - trust_signal
    - ecological_presence
    - narrative_interest

Değirmenci:

interaction_signature:
  can_receive:
    - animal_presence
    - social_request
    - economic_event
    - weather

  can_emit:
    - food_support
    - shelter_access
    - information
    - social_rumor

Bu sayede motor, anlamsız etkileşimleri daha başlamadan eler.

Örneğin:

Tilki × Vergi belgesi

arasında tanımlı bir etkileşim yoksa hesap yapılmaz.

2. Compatibility Vector

İki entity arasında hangi boyutların eşleştiği bulunur.

Yaralı tilkinin ihtiyaçları:

needs:
  food: 0.78
  shelter: 0.82
  safety: 0.73
  healing: 0.91

Değirmencinin sağlayabilecekleri:

capabilities:
  provide_food: 0.69
  provide_shelter: 0.52
  medical_knowledge: 0.08
  patience_with_animals: 0.74

Eşleşme:

Tilkinin food ihtiyacı
×
Değirmencinin provide_food yeteneği
=
Yüksek uyumluluk

Fakat:

Tilkinin healing ihtiyacı
×
Değirmencinin medical_knowledge değeri
=
Düşük uyumluluk

Bu nedenle değirmenci tilkiyi tamamen tedavi edemez ama yiyecek ve güvenli alan sağlayabilir.

3. Affordance kavramı

Bir entity diğerine yalnızca etkide bulunmaz; ona bazı olanaklar açar.

Mağara:

affordances:
  explore: 0.91
  hide: 0.76
  discover_history: 0.83
  face_darkness: 0.88
  collect_minerals: 0.42

Eski anahtar:

affordances:
  unlock: 0.96
  investigate: 0.84
  trade: 0.14
  trigger_memory: 0.57

Hasan:

affordances:
  ask_for_guidance: 0.88
  learn_history: 0.91
  receive_protection: 0.72
  inspect_map: 0.86

Interaction Engine yalnızca “ne oldu?” sorusuna değil, şu soruya da cevap verir:

Bu etkileşimden sonra hangi yeni eylemler mümkün oldu?

Örneğin çocuk anahtarı bulunca:

Yeni affordance:
Eski kapıyı dene

Hasan sembolü tanıyınca:

Yeni affordance:
Haritayla karşılaştır

Bu yaklaşım maceraların doğal oluşmasına yardımcı olur.

4. Interaction sonucunun katmanları

Tek bir etkileşim yalnızca bir state değişikliği üretmemeli. Birden fazla katmanda sonuç doğurabilir.

Örneğin değirmenci tilkiye yiyecek bıraktı.

Fiziksel sonuç
physical_delta:
  fox.hunger: -0.24
  fox.energy: +0.08
Duygusal sonuç
emotional_delta:
  fox.fear_of_miller: -0.05
  miller.concern: +0.07
İlişki sonucu
relationship_delta:
  fox_to_miller:
    familiarity: +0.10
    trust: +0.03

  miller_to_fox:
    care: +0.12
    responsibility: +0.06
Bilgi sonucu
knowledge_delta:
  fox:
    old_mill_has_food: confidence_0.68

  miller:
    fox_returns_at_dusk: confidence_0.52
Anlatısal sonuç
narrative_delta:
  fox_miller_thread: +0.41
  future_player_relevance: +0.18

Bu katmanlar aynı anda oluşabilir.

5. Reaction Vector nasıl hesaplanmalı?

Burada yalnızca düz vektör çarpımı yeterli olmaz. Çünkü bazı etkiler doğrusal değildir.

Örnek:

Karanlık korkusu 0.10 olan biriyle 0.80 olan biri arasındaki fark yalnızca sekiz kat olmayabilir. Belirli bir eşiğin üstünde panik etkisi hızla artabilir.

Bu nedenle hibrit model gerekir:

Vector Similarity
+
Weighted Interaction
+
Threshold Rules
+
Context Modifiers
+
Random Variation
+
Hard Constraints
=
Reaction Vector
Vektör benzerliği

İlgili boyutları bulur.

Ağırlıklı etkileşim

Hangi boyutun ne kadar güçlü etkili olduğunu hesaplar.

Eşik kuralları

Belirli değerlerde davranışı değiştirir.

Context modifiers

Yanında güvenilir biri bulunması gibi etkileri uygular.

Kontrollü rastlantısallık

Aynı karakterin her seferinde mekanik biçimde aynı tepkiyi vermesini engeller.

Hard constraints

İmkânsız sonuçları engeller.

6. Örnek: Güneş tutulması

Olay:

solar_eclipse:
  darkness: 0.84
  astronomy: 1.00
  rarity: 0.96
  uncertainty: 0.53
  beauty: 0.76

Karakter:

mina:
  fear_of_darkness: 0.72
  astronomy_interest: 0.81
  curiosity: 0.88
  emotional_stability: 0.61

Bağlam:

context:
  trusted_companion: 0.93
  prior_explanation: 0.74
  location_safety: 0.89
  crowd_panic: 0.06

Ham etkiler:

Darkness × fear_of_darkness
→ fear signal

Astronomy × astronomy_interest
→ excitement signal

Rarity × curiosity
→ wonder signal

Bağlam bunları değiştirir:

Trusted companion
→ fear azaltır

Prior explanation
→ uncertainty azaltır

Safe location
→ panic riskini azaltır

Sonuç:

reaction:
  fear: +0.08
  anxiety: +0.04
  excitement: +0.29
  wonder: +0.35
  astronomy_interest_signal: +0.07
  seek_companion: +0.11

Mina hem Hasan’ın elini tutabilir hem de gökyüzünü heyecanla izleyebilir.

7. Aynı olay, farklı karakter

Başka bir NPC:

omer:
  fear_of_darkness: 0.12
  astronomy_interest: 0.18
  superstition: 0.84
  social_susceptibility: 0.77

Aynı tutulma onda şunları üretebilir:

reaction:
  fear: +0.16
  wonder: +0.06
  suspicion: +0.27
  rumor_creation_probability: +0.31

Ömer olayı bilimsel merakla değil, kötüye işaret olarak yorumlayabilir.

Böylece tek olaydan:

Mina’da öğrenme isteği,
Hasan’da açıklama yapma motivasyonu,
Ömer’de söylenti,
köyde toplumsal konuşma

doğabilir.

8. Interaction chain

Bir etkileşim başka etkileşimleri tetikleyebilir.

Güneş tutulması
↓
Ömer korkar
↓
Ömer söylenti üretir
↓
Söylenti pazarda yayılır
↓
Bazı NPC’ler kaygılanır
↓
Muhtar açıklama toplantısı düzenler
↓
Hasan çocuklara gökyüzünü anlatır

Ancak bu zincir sonsuza kadar ilerlememeli.

Bu nedenle her etkileşim bir Propagation Energy taşımalı.

interaction_result:
  propagation:
    social: 0.72
    narrative: 0.61
    economic: 0.05
    ecological: 0.00

Her adımda enerji azalır:

0.72
↓
0.48
↓
0.21
↓
0.07
↓
Threshold altı: dur

Böylece küçük bir olay bütün dünyayı gereksiz yere uyandırmaz.

9. Etki mesafesi vektörü

Her etkileşim farklı ağlar üzerinden yayılabilir.

reach:
  physical: 0.10
  social: 0.86
  economic: 0.12
  ecological: 0.00
  knowledge: 0.91
  emotional: 0.54
  narrative: 0.68

Bir söylenti fiziksel olarak uzağa gitmez ama sosyal ve bilgi ağında güçlü yayılır.

Bir orman yangını ise:

reach:
  physical: 0.91
  ecological: 0.96
  economic: 0.61
  social: 0.58
  knowledge: 0.43

Bu vektör, hangi ilişki grafiğinin takip edileceğini belirler.

10. Interaction Graph

Dünya tek bir ilişki ağı olmamalı.

Ayrı grafikler gerekir:

Physical Proximity Graph
Social Relationship Graph
Family Graph
Economic Dependency Graph
Knowledge Communication Graph
Ecological Dependency Graph
Narrative Relevance Graph

Bir olayın reach vector değerleri hangi grafikte ilerleyeceğini belirler.

Örneğin kuraklık:

Ecological graph
↓
Agricultural graph
↓
Economic graph
↓
Social graph

Söylenti:

Knowledge graph
↓
Social graph

Yaralı tilki:

Physical proximity graph
↓
Narrative relevance graph
11. Karar üretimi

Interaction Engine yalnızca otomatik etkileri hesaplamaz. NPC’ye yeni eylem adayları da verebilir.

Örneğin değirmenci yaralı tilkiyi gördü.

Interaction sonucu:

action_candidates:
  - leave_food
  - observe_from_distance
  - chase_away
  - tell_someone
  - do_nothing

Bu seçeneklerin skorları NPC vektörleriyle hesaplanır:

Empathy
+
Available Food
+
Fear of Wild Animals
+
Time Availability
+
Past Experience
+
Social Norms
↓
Action Scores

Örneğin:

scores:
  leave_food: 0.76
  observe_from_distance: 0.63
  tell_someone: 0.41
  chase_away: 0.09
  do_nothing: 0.27

En yüksek skor her zaman otomatik seçilmek zorunda değildir. Kontrollü olasılık kullanılabilir.

En yüksek aday: güçlü ihtimal
İkinci aday: düşük ama mümkün
Çok düşük aday: elenir

Bu, karakterlerin hem tutarlı hem de tamamen tahmin edilebilir olmamasını sağlar.

12. Karakter tutarlılığı

Rastlantı, kişiliği bozmamalı.

Empatisi 0.95 olan ve hayvanlardan korkmayan bir NPC’nin yaralı tilkiyi sebepsiz yere kovması mümkün olmamalı.

Bu nedenle eylemler üç gruba ayrılır:

Allowed
Unlikely
Forbidden

Örnek:

action_constraints:
  leave_food: allowed
  observe: allowed
  chase_away: unlikely
  harm_animal: forbidden

Forbidden, yalnızca güçlü bir state değişikliği veya özel olay varsa açılabilir.

13. Grup etkileşimleri

Her etkileşim bire bir değildir.

Event × NPC Group
Event × Society
Event × Animal Population
Society × Society
Weather × Region

Örneğin tutulmanın köye etkisi:

village_reaction:
  collective_wonder: +0.24
  collective_anxiety: +0.08
  astronomy_interest: +0.11
  rumor_activity: +0.19

Sonra yalnızca yüksek hassasiyetli bireyler grup etkisinden ayrıştırılarak ayrıca hesaplanır.

Toplum düzeyinde güncelle
↓
Aşırı farklı tepki potansiyeli olan NPC’leri bul
↓
Bireysel simülasyona yükselt

Böylece 500 köylünün tutulma tepkisini ayrı ayrı hesaplamak gerekmez.

14. Interaction memory

Her küçük etkileşim kalıcı hafızaya yazılmamalı.

Önem skoruna göre ayrılmalı:

Ephemeral

Kısa süreli, kaydedilmez veya hızla silinir.

Pazarda selamlaştılar.

State-relevant

State değişikliğinin nedeni olarak tutulur.

Değirmenci tilkiye üç gün boyunca yiyecek bıraktı.

Relationship-relevant

İlişkiyi değiştirdiği için saklanır.

Mina korktuğunda Hasan onu sakinleştirdi.

Canonical

Dünya tarihinin önemli parçası olur.

Güneş tutulması sırasında eski kule yeniden çalıştı.

Narrative hook

Daha sonra hikâyeye dönüşebilir.

Tutulma sırasında ormandaki taş kapı kısa süreliğine parladı.

15. Interaction Engine’in çıktı sözleşmesi

Motor serbest metin üretmemeli. Yapılandırılmış çıktı vermeli:

interaction_result:
  interaction_id: int_8472

  participants:
    - fox_014
    - miller_01

  context:
    location: old_mill
    world_day: 188

  state_deltas:
    - entity: fox_014
      dimension: needs.hunger
      delta: -0.24

    - entity: fox_014
      dimension: relationship.miller.trust
      delta: +0.03

  knowledge_updates:
    - entity: fox_014
      fact: old_mill_food_source
      confidence: 0.68

  new_affordances:
    - return_to_old_mill
    - observe_miller

  action_outcomes:
    selected_action: leave_food

  propagation:
    narrative: 0.18
    social: 0.06

  memory_class:
    state_relevant

  explanations:
    - fox was hungry
    - miller had available food
    - miller has high empathy
    - fox remained cautious

Sonra State Committer bunu doğrulayıp uygular.

Interaction Engine’in temel ilkeleri

Bu motor için bence şu kurallar kesin olmalı:

Aynı olay herkesi aynı şekilde etkilemez.

Etki yalnızca olaydan değil, entity state’i ve bağlamdan doğar.

Etkileşimler yalnızca state değiştirmez; yeni olanaklar ve eylemler de açar.

Etki zincirleri grafikler üzerinden yayılır ama enerji kaybederek sonlanır.

Rastlantısallık karakter tutarlılığının sınırları içinde kalır.

Her değişiklik açıklanabilir neden kaydı taşır.

Agentler etkileşim sonucu önerir; deterministic sistem doğrular ve uygular.

Bu noktada LUMI’nin simülasyon çekirdeği üç parçaya ayrılmış oluyor:

Temporal Simulation Engine
→ Kim simüle edilecek?

Interaction Engine
→ Birbirlerini nasıl etkileyecekler?

Decision Engine
→ Ortaya çıkan durumda ne yapacaklar?

Sıradaki doğal konu Decision Engine. Burada NPC’lerin hedef, ihtiyaç, kişilik, ilişki, bilgi, risk ve fırsatlar arasında nasıl seçim yaptığını netleştirmeliyiz.