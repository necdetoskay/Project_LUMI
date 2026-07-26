Decision Engine’in LUMI’deki yeri

Akış kabaca şöyle ilerleyecek:

World State
   ↓
Perception Engine
   ↓
Relevant Memory Selection
   ↓
Decision Engine
   ↓
Intent / Action
   ↓
World Simulation
   ↓
Consequences
   ↓
Memory & Relationship Updates

Decision Engine doğrudan hikâye yazmaz. Şunları üretir:

NPC ne yapmak istiyor?
Neden yapmak istiyor?
Kime veya neye yönelik?
Ne kadar kararlı?
Hangi alternatifleri reddetti?
Kararın duygusal ve sosyal maliyeti nedir?

Örneğin:

actor: wounded_fox
intent: seek_help
target: village_healer
confidence: 0.68
urgency: 0.91
reason:
  - wound_severity
  - hunger
  - remembered_kindness
rejected_actions:
  - hide_in_forest
  - attack_nearby_traveler
Karar tek bir skorla verilmemeli

Daha önce konuştuğumuz “her şey vektör olsun” yaklaşımı burada çok güçlü çalışır.

Bir eylem tek bir açıdan iyi veya kötü değildir.

Örneğin köyden yardım istemek:

action: ask_village_for_help

effects:
  survival: +0.90
  safety: -0.20
  social_connection: +0.55
  pride: -0.65
  secrecy: -0.80
  trust: +0.30
  energy_cost: -0.25

Tilkinin mevcut ihtiyaç ve karakter vektörü:

decision_weights:
  survival: 0.95
  safety: 0.70
  social_connection: 0.20
  pride: 0.45
  secrecy: 0.75
  trust: 0.30
  energy_cost: 0.60

Decision Engine bu iki yapıyı karşılaştırır. Ancak yalnızca matematiksel olarak en yüksek sonucu seçmez.

Çünkü gerçekçi bir karakter:

yanlış karar verebilir,
korkusuna yenilebilir,
alışkanlıkla hareket edebilir,
eksik bilgiye dayanabilir,
birine güvenmediği için iyi seçeneği reddedebilir,
daha önce yaşadığı bir olay nedeniyle aşırı tepki verebilir.

Bu nedenle karar üretimini birkaç katmana ayırmalıyız.

Önerdiğim karar modeli
1. Candidate Generation

Karakterin yapabileceği olası eylemler oluşturulur.

candidates:
  - hide_in_forest
  - seek_help_from_village
  - follow_river
  - steal_food
  - wait_and_recover

Her NPC dünyadaki bütün eylemleri değerlendirmez. Yalnızca:

algılayabildiği,
bildiği,
fiziksel olarak yapabildiği,
karakterine tamamen yabancı olmayan,
mevcut durumuyla alakalı

eylemler aday olur.

Bu performans için de önemlidir.

2. Feasibility Evaluation

Eylem gerçekten yapılabilir mi?

seek_help_from_village:
  distance: 4.2
  required_energy: 0.55
  current_energy: 0.31
  path_known: true
  physical_possible: partially

Burada bazı eylemler tamamen elenir, bazıları ise riskli olarak kalır.

3. Motivation Match

Eylemin karakterin ihtiyaçlarıyla uyumu ölçülür.

Örnek ihtiyaç vektörü:

needs:
  survival: 0.94
  hunger: 0.76
  safety: 0.81
  belonging: 0.22
  curiosity: 0.13
  rest: 0.88

Yaralı tilki için dinlenmek ve hayatta kalmak öne çıkar. Fakat açlık da yükseliyorsa yalnızca saklanmak uzun vadede iyi bir karar olmayabilir.

4. Personality Filter

Aynı durumda iki NPC farklı karar verir.

personality:
  courage: 0.35
  caution: 0.82
  empathy: 0.61
  pride: 0.74
  curiosity: 0.28
  impulsivity: 0.19

Yüksek gurur, yardım isteme seçeneğini düşürür.

Yüksek ihtiyat, köye girme riskini büyütür.

Yüksek hayatta kalma dürtüsü ise bu direnci aşabilir.

5. Memory Influence

Kararlar yalnızca şimdiki durumdan çıkmaz.

Örneğin tilki daha önce:

köylüler tarafından kovalanmış,
çocuk tarafından beslenmiş,
köy yakınında tuzağa düşmüş,
şifacı tarafından kurtarılmış

olabilir.

Her anının karar üzerindeki etkisi farklıdır:

memory:
  event: healer_saved_fox
  relevance:
    trust: +0.75
    safety: +0.30
    gratitude: +0.55
  emotional_intensity: 0.68
  confidence: 0.92
  decay: 0.15

Önemli nokta: Karakter geçmişi tamamen doğru hatırlamak zorunda değildir.

memory_accuracy: 0.62
interpretation_bias:
  fear: 0.30
  distrust: 0.42

Böylece yanlış anlaşılmalar doğal şekilde oluşabilir.

6. Relationship Influence

Karar genel olarak “köy” hakkında değil, belirli kişiler hakkında farklı olabilir.

relationships:
  village_healer:
    trust: 0.78
    fear: 0.12
    gratitude: 0.63

  village_hunter:
    trust: -0.82
    fear: 0.91
    resentment: 0.44

Tilki köye gitmeye değil, özellikle şifacıya ulaşmaya karar verebilir.

Bu ayrım hikâye kalitesini ciddi biçimde artırır.

7. Social and Moral Evaluation

NPC’nin kararlarını yalnızca kişisel fayda yönlendirmemeli.

values:
  protect_family: 0.88
  keep_promises: 0.76
  obey_authority: 0.24
  avoid_harming_innocents: 0.69
  preserve_secrets: 0.53

Örneğin bir karakter kendisi için güvenli olan kaçma seçeneğini, arkadaşını yalnız bırakacağı için reddedebilir.

8. Risk and Uncertainty

NPC sonuçları kesin olarak bilmez.

Her aday eylemin beklenen sonucu vardır:

expected_outcomes:
  success_probability: 0.55
  perceived_danger: 0.62
  uncertainty: 0.48
  worst_case_severity: 0.81

Burada kritik ayrım şudur:

Gerçek risk ≠ NPC’nin algıladığı risk

Karanlıktan korkan karakter için mağara gerçekte güvenli olsa bile algılanan tehlike çok yüksek olabilir.

Uzayı seven bir çocuk için güneş tutulması merak üretirken başka bir karakterde korku üretebilir.

Karar skoru

İlk yaklaşım olarak her eylem için çok boyutlu bir sonuç üretilebilir:

Decision Utility Vector =
Need Satisfaction
+ Personality Alignment
+ Memory Influence
+ Relationship Influence
+ Value Alignment
- Risk
- Resource Cost
- Emotional Resistance

Fakat sonuç hemen tek sayıya indirgenmemeli.

Örneğin:

decision_evaluation:
  action: seek_help_from_village

  dimensions:
    survival_gain: 0.84
    emotional_cost: 0.71
    relationship_gain: 0.52
    physical_risk: 0.46
    moral_alignment: 0.63
    identity_alignment: 0.31

Son seçim aşamasında NPC’nin o anki ağırlık vektörü kullanılır.

current_priority_weights:
  survival_gain: 1.00
  emotional_cost: 0.35
  relationship_gain: 0.25
  physical_risk: 0.72
  moral_alignment: 0.30
  identity_alignment: 0.42

Yaralanma ağırlaştıkça survival_gain ağırlığı yükselir. Böylece normalde yardım istemeyen gururlu bir karakter, şartlar ağırlaştığında yardım isteyebilir.

Karar deterministik olmamalı

Her zaman en yüksek skorlu seçeneğin seçilmesi dünyayı mekanik hale getirir.

Bunun yerine üç alan belirleyebiliriz:

Dominant Choice
Plausible Choices
Rejected Choices

Örnek:

choices:
  seek_help:
    score: 0.73
    category: dominant

  hide:
    score: 0.69
    category: plausible

  steal_food:
    score: 0.44
    category: plausible

  attack_traveler:
    score: 0.11
    category: rejected

Seçim sırasında şu faktörler küçük sapmalar oluşturabilir:

yorgunluk,
stres,
panik,
acele,
dikkat dağınıklığı,
dürtüsellik,
yeni algılanan bir olay,
önceki kararın oluşturduğu kararlılık.

Ancak rastgelelik karakter tutarlılığını bozmamalı.

Commitment: Karara bağlılık

Bir NPC her simülasyon döngüsünde karar değiştirmemeli.

Bu nedenle kararın bir commitment değeri olmalı:

current_intent:
  action: reach_village_healer
  commitment: 0.74
  started_at: world_day_18_14_20
  reconsideration_triggers:
    - healer_unavailable
    - hunter_detected
    - wound_worsened
    - safe_shelter_found

Yeni bir seçenek biraz daha iyi diye karakter hemen yön değiştirmez.

Karar ancak:

önemli yeni bilgi geldiyse,
mevcut eylem başarısız olduysa,
ihtiyaçlar ciddi değiştiyse,
tehlike eşiği aşıldıysa,
hedef artık ulaşılamazsa

yeniden değerlendirilir.

Kararın açıklanabilir olması

Decision Engine mutlaka karar gerekçesi üretmeli.

Sadece:

selected_action: seek_help

yeterli değildir.

Şöyle bir çıktı daha kullanışlıdır:

decision:
  selected_action: seek_help_from_healer

  primary_reasons:
    - wound_is_worsening
    - healer_was_kind_before
    - remaining_energy_is_low

  internal_conflicts:
    - fear_of_village
    - reluctance_to_appear_weak

  rejected:
    hide_in_forest:
      reason: survival_probability_too_low

    steal_food:
      reason: physical_energy_insufficient

  confidence: 0.68
  commitment: 0.74

Bu yapı daha sonra:

hikâye anlatıcısına,
debug ekranına,
dünya simülasyonuna,
karakter iç sesi üretimine,
geliştirici araçlarına

aktarılabilir.

Decision Engine için ilk temel modüller

Bence motoru şu parçalara ayırmalıyız:

Decision Context Builder
Candidate Action Generator
Action Feasibility Evaluator
Need Evaluator
Personality Evaluator
Memory Influence Evaluator
Relationship Evaluator
Value & Moral Evaluator
Risk Perception Evaluator
Action Selector
Commitment Manager
Decision Explanation Generator
Decision Engine için sıradaki temel yapı Decision Context Vector olmalı.

Bu yapı, bir NPC karar vermeden hemen önce dünyadan, hafızadan, ilişkilerden ve kendi iç durumundan toplanan karar bağlamıdır.

Decision Context Vector nedir?

Decision Engine doğrudan tüm dünya verisini okumamalı. Bunun yerine yalnızca o karar için gerekli, filtrelenmiş bir bağlam almalı.

World State
   ↓
Context Builder
   ↓
Decision Context Vector
   ↓
Decision Engine

Örnek:

decision_context:
  actor_id: wounded_fox
  world_time: day_18_14_20

  internal_state:
    health: 0.31
    energy: 0.24
    hunger: 0.78
    pain: 0.82
    fear: 0.61

  perceived_environment:
    nearby_shelter: true
    village_distance: 4.2
    hunter_presence: uncertain
    weather: cold_rain

  active_relationships:
    - target: village_healer
      trust: 0.78
      fear: 0.12

  relevant_memories:
    - healer_saved_fox
    - hunter_set_trap

  active_goals:
    - survive
    - avoid_hunter
    - protect_den_location

Bu bağlam, karakterin gerçek dünyasını değil, karakterin algıladığı dünyayı temsil eder.

Gerçek durum ile algılanan durum ayrılmalı

LUMI için en kritik ayrımlardan biri bu:

Objective World State
Perceived World State
Believed World State
Objective World State

Dünyada gerçekten olanlar:

objective_state:
  hunter_distance: 12
  cave_safe: true
  healer_present: false
Perceived World State

Karakterin şu anda algıladığı şeyler:

perceived_state:
  hunter_tracks_detected: true
  cave_smell_unfamiliar: true
  healer_house_lights_visible: true
Believed World State

Karakterin algı ve geçmiş deneyimlerden çıkardığı inanç:

believed_state:
  hunter_nearby: 0.72
  cave_dangerous: 0.64
  healer_probably_available: 0.81

Karar bu üçüncü katmana göre verilmelidir.

Böylece NPC:

yanlış bilgiye inanabilir,
eksik gözlem yapabilir,
doğru işareti yanlış yorumlayabilir,
korku nedeniyle riski abartabilir,
güven nedeniyle tehlikeyi küçümseyebilir.
Decision Context Vector ana bölümleri

Önerdiğim ana yapı:

decision_context:
  identity:
  temporal_state:
  physical_state:
  emotional_state:
  cognitive_state:
  needs:
  goals:
  values:
  traits:
  perceived_environment:
  social_context:
  relevant_memories:
  resources:
  constraints:
  threats:
  opportunities:
  current_intent:
  uncertainty:

Şimdi bunları tek tek açalım.

1. Identity Context

Karakterin kim olduğunu ve hangi tür karar kurallarına tabi olduğunu belirtir.

identity:
  actor_id: fox_17
  actor_type: animal_npc
  species: fox
  age_stage: adult
  role:
    - forest_scavenger
    - den_protector
  simulation_tier: regional

simulation_tier, bu NPC için ne kadar detaylı karar hesabı yapılacağını belirleyebilir.

Örneğin:

Tier 0: dekoratif varlık
Tier 1: basit durum tabanlı NPC
Tier 2: yerel etkiye sahip NPC
Tier 3: hikâye açısından önemli NPC
Tier 4: ana karakter veya çekirdek NPC

Her NPC için aynı derinlikte karar hesabı yapmak gerekmez.

2. Temporal State

Karakterin zamanla ilişkili durumu:

temporal_state:
  current_world_time: day_18_14_20
  time_since_last_rest: 17h
  time_since_last_meal: 29h
  time_since_last_seen: 10d
  decision_deadline: 3h
  urgency: 0.88

Daha önce konuştuğumuz zaman etkisi burada devreye girer.

Her durum aynı hızla değişmez:

decay_models:
  hunger: fast
  injury: condition_dependent
  trust: very_slow
  fear: event_dependent
  curiosity: medium

Karakter 10 gün simüle edilmemiş olsa bile tüm vektörler tek tek hesaplanmaz. Yalnızca zamanla değişmesi anlamlı olan durumlar güncellenir.

3. Physical State
physical_state:
  health: 0.31
  stamina: 0.22
  mobility: 0.46
  hunger: 0.78
  thirst: 0.41
  pain: 0.82
  sleep_deprivation: 0.53

  conditions:
    - injured_left_leg
    - mild_infection

Bu bölüm aday eylemleri hem etkiler hem sınırlar.

Örneğin:

Koşmak mümkün değil.
Uzun mesafe yürümek riskli.
Dövüşmek fiziksel olarak mümkün ama mantıksız.
Saklanmak düşük maliyetli.
4. Emotional State

Duygular tek sayı olmamalı.

emotional_state:
  fear:
    intensity: 0.61
    target: village_hunter
    persistence: 0.72

  gratitude:
    intensity: 0.58
    target: village_healer

  shame:
    intensity: 0.44
    trigger: needing_help

  hope:
    intensity: 0.39

Duyguların hedefli olması önemli.

Karakter genel olarak korkmuş olmayabilir; belirli bir kişiden, mekândan veya durumdan korkabilir.

5. Cognitive State
cognitive_state:
  alertness: 0.42
  confusion: 0.26
  attention_capacity: 0.31
  planning_horizon: short
  impulse_control: 0.48
  reasoning_quality: 0.55

Yorgun, panik içindeki veya çocuk yaştaki karakterler uzun vadeli kararları daha kötü değerlendirebilir.

Bu, motorun “en iyi sonucu bulması” ile karakterin “bulabildiği sonucu seçmesi” arasındaki farktır.

6. Needs Vector
needs:
  survival: 0.96
  safety: 0.83
  food: 0.78
  rest: 0.89
  belonging: 0.17
  autonomy: 0.66
  dignity: 0.52
  curiosity: 0.08
  protect_offspring: 0.71

Buradaki değerler yalnızca ihtiyaç şiddeti değildir. İhtiyacın karar üzerindeki güncel baskısını gösterir.

7. Goals

İhtiyaç ile hedef aynı değildir.

İhtiyaç:

Güvende ol.

Hedef:

Gün batmadan güvenli bir barınak bul.

Örnek:

goals:
  - id: reach_safe_shelter
    priority: 0.82
    deadline: sunset
    progress: 0.15

  - id: avoid_hunter
    priority: 0.91
    persistence: high

  - id: preserve_den_secret
    priority: 0.63

Hedeflerin birbirleriyle çatışabilmesi gerekir.

8. Values
values:
  protect_family: 0.91
  avoid_unnecessary_harm: 0.68
  keep_promises: 0.27
  maintain_independence: 0.77
  repay_kindness: 0.54

Değerler yavaş değişir. Duygular hızlı değişir. Hedefler ise orta hızda değişir.

Bu zaman ölçeklerini ayrı tutmak karakter tutarlılığı için önemlidir.

9. Traits
traits:
  courage: 0.34
  caution: 0.83
  pride: 0.72
  curiosity: 0.24
  empathy: 0.51
  impulsivity: 0.18
  adaptability: 0.58

Trait ile emotional state arasındaki fark:

Trait: karakterin genel eğilimi
State: o anki geçici durumu

Cesur bir karakter şu anda korkmuş olabilir. Korkak bir karakter çaresizlik nedeniyle cesurca davranabilir.

10. Perceived Environment
perceived_environment:
  locations:
    forest_shelter:
      distance: near
      safety_estimate: 0.58
      familiarity: 0.91

    village:
      distance: medium
      safety_estimate: 0.39
      aid_probability: 0.66

  weather:
    cold: 0.73
    rain: 0.81
    visibility: 0.38

  signals:
    - distant_smoke
    - human_footprints
    - medicine_smell

Burada yalnızca karar açısından anlamlı çevre bilgisi bulunmalı.

11. Social Context
social_context:
  nearby_entities:
    - id: healer
      relation:
        trust: 0.78
        gratitude: 0.63
        fear: 0.12
      perceived_intent: helpful
      availability_confidence: 0.71

    - id: hunter
      relation:
        trust: -0.89
        fear: 0.91
      perceived_intent: hostile
      location_confidence: 0.42

Sosyal bağlamda yalnızca ilişki değil, karakterin karşı tarafın niyeti hakkındaki tahmini de yer almalı.

12. Relevant Memories

Decision Engine tüm hafızayı taramamalı.

Memory Engine, en alakalı birkaç anıyı seçip bağlama eklemeli.

relevant_memories:
  - id: mem_401
    event: healer_treated_injury
    relevance: 0.91
    emotional_weight: 0.68
    confidence: 0.94
    influence:
      trust_healer: +0.72
      seek_help: +0.61

  - id: mem_188
    event: hunter_set_trap_near_village
    relevance: 0.87
    emotional_weight: 0.84
    confidence: 0.79
    influence:
      village_risk: +0.67
      avoidance: +0.59

Aynı karar için birbiriyle çelişen anılar gelebilir. Bu istenen bir durumdur.

13. Resources
resources:
  inventory:
    - dried_food
    - torn_cloth

  abilities:
    tracking: 0.82
    climbing: 0.41
    stealth: 0.76

  allies:
    - young_owl

  known_locations:
    - old_tree_hollow
    - healer_garden

Kaynaklar yalnızca eşya değildir. Bilgi, bağlantı, beceri ve zaman da kaynaktır.

14. Constraints
constraints:
  physical:
    - cannot_run_long_distance

  social:
    - must_not_reveal_den_location

  moral:
    - avoid_harming_children

  temporal:
    - infection_worsens_after_sunset

Constraint ile düşük skor aynı şey değildir.

Bir seçenek:

mümkün ama istenmeyen olabilir,
yüksek maliyetli olabilir,
tamamen yasak olabilir.

Bu ayrımı tutmalıyız.

15. Threats
threats:
  - type: infection
    severity: 0.81
    immediacy: 0.72
    confidence: 0.91

  - type: hunter
    severity: 0.94
    immediacy: 0.38
    confidence: 0.42

Tehdit vektörü:

severity
immediacy
probability
detectability
avoidability
controllability

gibi boyutlara ayrılabilir.

16. Opportunities
opportunities:
  - type: healer_help
    potential_gain: 0.88
    accessibility: 0.46
    confidence: 0.69

  - type: empty_shed_shelter
    potential_gain: 0.52
    accessibility: 0.81
    confidence: 0.57

Decision Engine yalnızca tehditlerden kaçmaz. Fırsatları da değerlendirir.

17. Current Intent
current_intent:
  action: reach_old_tree_hollow
  commitment: 0.62
  progress: 0.24
  sunk_cost: 0.31
  expected_value: 0.51

  reconsideration_triggers:
    - health_below_0_25
    - shelter_destroyed
    - healer_detected_nearby

Bu veri olmadan NPC sürekli fikir değiştirir.

18. Uncertainty Vector

Belirsizlik tek bir değer olmamalı.

uncertainty:
  environment: 0.47
  social_intentions: 0.61
  outcome_prediction: 0.52
  memory_accuracy: 0.18
  self_assessment: 0.33

Bazı karakterler belirsizlikten kaçınır, bazıları merak nedeniyle belirsiz seçeneklere yaklaşır.

Context bütçesi

Her karar için tüm alanları maksimum detayla doldurmak pahalı olur.

Bu nedenle bağlamın bir bütçesi olmalı:

context_budget:
  max_memories: 8
  max_entities: 6
  max_locations: 5
  max_threats: 4
  max_opportunities: 4
  max_candidate_actions: 7

Bütçe NPC önem derecesine göre değişebilir:

simulation_profiles:
  background:
    max_candidates: 2
    memory_depth: 0
    reasoning_depth: shallow

  standard:
    max_candidates: 5
    memory_depth: 3
    reasoning_depth: normal

  narrative:
    max_candidates: 8
    memory_depth: 8
    reasoning_depth: deep
Context freshness

Her veri aynı anda güncel olmayabilir.

data_freshness:
  physical_state: current
  hunter_location: 2h_old
  healer_availability: 1d_old
  village_risk_estimate: 14d_old

Eski bilgiye güven azaltılmalı:

Effective confidence =
Base confidence
× freshness factor
× source reliability
× perception quality
Context Builder çalışma sırası
1. Karar tetikleyicisini belirle
2. Aktörün güncel iç durumunu yükle
3. Aktif ihtiyaç ve hedefleri seç
4. Yakın çevreyi filtrele
5. İlgili sosyal varlıkları seç
6. Memory Engine’den alakalı anıları çek
7. Tehdit ve fırsatları çıkar
8. Mevcut niyet ve bağlılığı yükle
9. Belirsizlik ve veri tazeliğini hesapla
10. Bağlam bütçesine göre kırp
11. Decision Engine’e gönder
Örnek tam Decision Context
decision_context:
  actor:
    id: wounded_fox
    simulation_tier: narrative

  trigger:
    type: health_threshold_crossed
    source: infection_progression
    urgency: 0.84

  temporal_state:
    world_time: day_18_14_20
    time_to_sunset: 2h40m
    time_since_last_meal: 29h

  physical_state:
    health: 0.31
    energy: 0.24
    mobility: 0.46
    pain: 0.82
    infection: 0.67

  emotional_state:
    fear_village: 0.61
    fear_hunter: 0.91
    gratitude_healer: 0.58
    shame_needing_help: 0.44
    hope: 0.39

  cognitive_state:
    alertness: 0.42
    planning_horizon: short
    reasoning_quality: 0.55

  needs:
    survival: 0.96
    rest: 0.89
    food: 0.78
    safety: 0.83
    autonomy: 0.66

  active_goals:
    - survive_infection
    - avoid_hunter
    - preserve_den_secret

  perceived_environment:
    village:
      distance: 4.2
      safety: 0.39
      aid_probability: 0.66

    old_tree_hollow:
      distance: 1.1
      safety: 0.58
      medical_aid: 0.02

  social_context:
    healer:
      trust: 0.78
      perceived_helpfulness: 0.81
      availability_confidence: 0.71

    hunter:
      fear: 0.91
      perceived_hostility: 0.94
      location_confidence: 0.42

  relevant_memories:
    - healer_treated_injury
    - hunter_set_trap_near_village

  resources:
    stealth: 0.76
    tracking: 0.82
    dried_food: 1

  constraints:
    - cannot_run_long_distance
    - must_not_reveal_den_location

  current_intent:
    action: reach_old_tree_hollow
    commitment: 0.62
    progress: 0.24

  uncertainty:
    healer_availability: 0.29
    hunter_location: 0.58
    village_safety: 0.43

Bu yapı kurulduğunda Decision Engine artık anlamlı şekilde aday eylem üretebilir.

Sıradaki mantıklı parça Candidate Action Generation olur. Burada NPC’nin hangi eylemleri düşünebildiğini, yeni eylemleri nasıl oluşturduğunu ve anlamsız seçeneklerin nasıl elendiğini tasarlamalıyız.

Candidate Action Generation

Decision Engine’in bir sonraki kritik parçası, NPC’nin “hangi eylemleri düşünebildiğini” belirleyen Candidate Action Generator olacaktır.

Buradaki temel prensip:

NPC dünyadaki mümkün olan tüm eylemleri değerlendirmez; yalnızca algılayabildiği, bildiği, hatırlayabildiği ve kendi kapasitesi içinde düşünebildiği eylemleri aday olarak üretir.

Bu sayede hem performans korunur hem de karakterler birbirinden farklı düşünür.

1. Eylem adayı nedir?

Bir eylem adayı yalnızca fiil değildir.

action_candidate:
  type: seek_help
  actor: wounded_fox
  target: village_healer
  destination: healer_garden
  method: approach_secretly
  urgency: 0.84

Aynı temel eylem farklı biçimlerde üretilebilir:

- seek_help_from_healer_directly
- leave_sign_for_healer
- wait_near_healer_garden
- ask_owl_to_contact_healer

Dolayısıyla eylem şu bileşenlerden oluşmalıdır:

Action Type
Target
Object
Location
Method
Timing
Conditions
Expected Outcome
2. Candidate Action kaynakları

Eylemler tek bir listeden gelmemeli. Birden fazla kaynaktan üretilmeli.

Needs
Goals
Perception
Memory
Relationships
Habits
Roles
Opportunities
Threats
Current Intent
World Affordances

Her kaynak farklı türde adaylar üretir.

2.1 Need-driven Actions

Aktif ihtiyaçlar doğrudan eylem adayları oluşturabilir.

need: hunger
possible_actions:
  - search_for_food
  - consume_inventory_food
  - ask_for_food
  - steal_food
  - hunt
  - ignore_hunger_temporarily

Fakat bütün karakterler bütün seçenekleri üretmez.

Örneğin gururlu bir karakter:

ask_for_food:
  generation_probability: low

Ahlaki sınırları güçlü bir karakter:

steal_food:
  generation_probability: very_low
2.2 Goal-driven Actions

Aktif hedefler, hedefi ilerleten eylemler üretir.

goal:
  id: reach_safe_shelter
  progress: 0.22

generated_actions:
  - move_to_old_tree
  - search_for_nearer_shelter
  - ask_ally_for_guidance
  - abandon_goal

Burada “hedefi bırakmak” da geçerli bir eylem olmalıdır.

2.3 Perception-driven Actions

Karakterin algıladığı olaylar anlık tepkiler oluşturur.

perception:
  type: sudden_noise
  source_direction: north
  threat_estimate: 0.68

Üretilebilecek adaylar:

- investigate_noise
- hide
- flee_south
- freeze
- alert_companion
- ignore_noise

Karakterin korku ve merak vektörleri hangi adayların üretileceğini etkiler.

2.4 Threat-driven Actions

Tehditler şu sınıflarda eylem üretir:

Avoid
Escape
Hide
Defend
Confront
Call for Help
Distract
Negotiate
Observe
Prepare

Örnek:

threat:
  type: hunter
  severity: 0.93
  immediacy: 0.41

Adaylar:

- hide_tracks
- move_away_from_village
- warn_den_members
- observe_hunter_from_distance
- ask_owl_to_scout
2.5 Opportunity-driven Actions

Fırsatlar, sadece ihtiyaç karşılamaz; yeni hedefler de doğurabilir.

opportunity:
  type: unattended_food
  accessibility: 0.82
  risk: 0.37

Adaylar:

- take_food
- inspect_food
- wait_for_owner
- alert_hungry_companion
- ignore
2.6 Memory-driven Actions

Anılar bazen doğrudan eylem üretir.

memory:
  event: healer_helped_before
  relevance: 0.91

Aday:

- seek_healer_help_again

Başka bir anı:

memory:
  event: hunter_trap_near_bridge

Adaylar:

- avoid_bridge
- inspect_bridge_for_traps
- warn_others_about_bridge

Bu sistem, geçmişin aktif biçimde geleceği şekillendirmesini sağlar.

2.7 Relationship-driven Actions

İlişkiler hedefe özgü eylemler üretir.

relationship:
  target: young_owl
  trust: 0.81
  affection: 0.64
  obligation: 0.52

Adaylar:

- ask_owl_for_help
- protect_owl
- share_food_with_owl
- warn_owl
- hide_information_from_owl

Negatif ilişkiler de eylem üretir:

relationship:
  target: hunter
  fear: 0.91
  resentment: 0.57

Adaylar:

- avoid_hunter
- mislead_hunter
- expose_hunter_to_villagers
- sabotage_trap
2.8 Habit-driven Actions

Karakterler her zaman yeniden düşünmez. Alışkanlıklar güçlü adaylar üretir.

habit:
  trigger: danger_detected
  usual_response: hide_in_bushes
  strength: 0.78

Bu durumda otomatik olarak:

- hide_in_nearest_bush

adayı oluşur.

Alışkanlıkların avantajı:

hızlıdır,
düşük bilişsel maliyetlidir,
karakter tutarlılığı sağlar.

Dezavantajı:

yanlış durumda tekrar edilebilir,
değişen dünyaya uyumsuz olabilir.
2.9 Role-driven Actions

Karakterin toplumsal veya dünyasal rolü adayları etkiler.

roles:
  - village_healer
  - elder

Olası adaylar:

- treat_injured_entity
- gather_medicine
- calm_panicked_villagers
- delegate_task
- inspect_symptoms

Aynı olayda bir muhafız farklı adaylar üretir:

- secure_area
- question_witnesses
- block_access
- pursue_suspect
2.10 Ability-driven Actions

Karakter yalnızca bildiği veya yapabildiği yöntemleri düşünebilmelidir.

abilities:
  tracking: 0.82
  stealth: 0.76
  negotiation: 0.12
  medicine: 0.03

Bu durumda:

track_hunter:
  generated: true

negotiate_with_hunter:
  generated: possible_but_weak

treat_infection:
  generated: false

Ancak karakter yanlış biçimde kendini yeterli sanıyorsa aday üretilebilir.

self_assessment:
  medicine: 0.55
actual_skill:
  medicine: 0.03

Bu, hatalı kararlar doğurur.

3. World Affordance sistemi

Candidate Generator yalnızca karakter verisine bakmamalı; çevrede hangi eylemlerin mümkün olduğunu da bilmelidir.

Bir nesnenin veya mekânın sunduğu eylemlere affordance diyebiliriz.

Örnek:

entity:
  type: locked_door

affordances:
  - knock
  - inspect
  - unlock_with_key
  - force_open
  - wait
  - search_for_alternate_route

Başka örnek:

entity:
  type: river

affordances:
  - drink
  - cross
  - follow
  - fish
  - hide_tracks
  - float_object

NPC’nin özellikleri bu affordance’ları filtreler.

can_swim: false

ise:

cross_by_swimming:
  feasibility: false
4. Action Template sistemi

Eylemler tamamen serbest üretilmemeli. Aksi halde sistem kontrol edilemez hale gelir.

Bunun yerine temel eylem şablonları kullanılmalı.

action_template:
  id: seek_help

  required:
    - target

  optional:
    - location
    - intermediary
    - method

  preconditions:
    - actor_can_communicate_or_signal
    - target_is_known_or_detectable

  effects:
    - may_increase_support
    - may_reduce_autonomy
    - may_change_relationship

Başka bir şablon:

action_template:
  id: hide

  required:
    - hiding_place

  preconditions:
    - hiding_place_accessible

  effects:
    - visibility_reduced
    - movement_restricted
    - threat_detection_reduced

Bu yapı sayesinde eylemler:

doğrulanabilir,
simüle edilebilir,
loglanabilir,
açıklanabilir,
test edilebilir.
5. Parametrik eylem üretimi

Şablon tek başına yeterli değildir. Parametrelerle somutlaştırılmalıdır.

template: move_to

Olası somut adaylar:

- move_to_old_tree
- move_to_village
- move_to_river
- move_to_den

Sonra yöntem eklenebilir:

- move_to_village_secretly
- move_to_village_via_river
- move_to_village_with_owl

Bu kombinasyon patlamasını önlemek için bir sınır gerekir.

generation_limits:
  max_targets_per_template: 3
  max_methods_per_action: 2
  max_variants_per_action: 4
6. Candidate Action katmanları

Bütün eylemler aynı ayrıntı düzeyinde üretilmemeli.

Önerilen üç katman:

Strategic Action
Tactical Action
Atomic Action
Strategic

Uzun vadeli niyet:

seek_medical_help
Tactical

Nasıl yapılacağı:

approach_healer_without_being_seen
Atomic

Dünya motorunun uygulayacağı küçük adımlar:

- move_to_bush
- observe_path
- cross_road
- approach_garden

Decision Engine çoğunlukla stratejik ve taktik seviyede karar vermeli.

Atomic eylemleri Action Planner üretmelidir.

7. Reactive ve deliberative eylemler

İki ayrı eylem üretim modu olmalıdır.

Reactive Mode

Ani tehlikelerde kullanılır.

trigger:
  type: immediate_threat
  response_window: 2s

Aday sayısı azdır:

- flee
- hide
- freeze
- defend

Hafıza ve uzun vadeli hedefler daha az dikkate alınır.

Deliberative Mode

Zaman olduğunda kullanılır.

trigger:
  type: strategic_reassessment
  response_window: 30m

Adaylar daha karmaşıktır:

- seek_healer_help
- ask_owl_to_scout
- wait_until_dark
- move_to_safe_shelter
8. Karakterin düşünemediği eylemler

Çok önemli bir konu:

Bir eylem dünyada mümkün olsa bile NPC’nin zihninde aday olarak oluşmayabilir.

Nedenleri:

Bilgi eksikliği
Deneyim eksikliği
Kültürel yabancılık
Düşük yaratıcılık
Panik
Yorgunluk
Bilişsel kapasite
Korku
Önyargı
Kendine güvensizlik

Örnek:

Köprüyü kullanmak mümkün olabilir; fakat NPC köprünün varlığını bilmiyorsa aday üretilmez.

known_locations:
  bridge: false

Bir çocuk karakter, karmaşık diplomatik çözümü düşünemeyebilir.

planning_horizon: short
social_reasoning: developing
9. Creativity Vector

Bazı karakterler mevcut seçeneklerden seçim yapar. Bazıları yeni yöntemler üretir.

creativity:
  recombination: 0.72
  experimentation: 0.44
  rule_breaking: 0.31
  analogy_use: 0.67

Yüksek yaratıcılık:

known_actions:
  - distract_hunter
  - use_bell

Yeni aday:

- use_bell_to_lure_hunter_away

Düşük yaratıcılık ise bilinen şablonlarla sınırlı kalır.

10. Candidate Diversity

Üretilen adaylar birbirinin küçük varyasyonları olmamalı.

Kötü örnek:

- go_to_village_fast
- go_to_village_slowly
- go_to_village_carefully
- go_to_village_quietly

Daha iyi aday kümesi:

- seek_healer_help
- hide_and_rest
- ask_owl_for_help
- search_for_herbs
- abandon_area

Adayların farklı strateji ailelerinden gelmesini sağlamalıyız.

strategy_families:
  - approach
  - avoid
  - delegate
  - wait
  - investigate
  - confront
  - deceive
  - cooperate
11. Null Action

“Hiçbir şey yapmamak” mutlaka aday olmalıdır.

action:
  type: wait

Fakat beklemek de farklı olabilir:

- wait_and_observe
- wait_and_recover
- pretend_to_be_asleep
- delay_decision

Bu önemli çünkü bazı durumlarda en gerçekçi karar hiçbir şey yapmamaktır.

12. Continue Current Intent

Mevcut kararı sürdürmek ayrı aday olarak üretilmelidir.

candidate:
  type: continue_current_intent
  current_action: reach_old_tree_hollow
  commitment_bonus: 0.62

Aksi halde motor her döngüde yeni eylemlere gereğinden fazla ağırlık verir.

13. Abandon veya Reconsider

Bir eylemi bırakmak da aktif karardır.

- abandon_current_goal
- pause_current_goal
- switch_target
- seek_more_information

Örneğin:

current_intent: reach_old_tree
new_information: tree_destroyed

Doğru aday:

abandon_reach_old_tree
14. Candidate üretim boru hattı

Önerilen akış:

1. Trigger’ı analiz et
2. Aktif ihtiyaçlardan aday üret
3. Aktif hedeflerden aday üret
4. Algılanan tehdit ve fırsatlardan aday üret
5. İlişki ve anılardan aday üret
6. Alışkanlık ve rol adaylarını ekle
7. World affordance’larını ekle
8. Mevcut niyeti sürdürme adayını ekle
9. Bekleme adayını ekle
10. Yaratıcı kombinasyonlar üret
11. İmkânsız adayları sil
12. Yinelenen adayları birleştir
13. Stratejik çeşitlilik uygula
14. Aday bütçesine göre sırala
15. İlk aday skoru

Bu aşamadaki skor nihai karar skoru değildir.

Sadece hangi adayların değerlendirme aşamasına geçeceğini belirler.

candidate_relevance_score:
  trigger_match: 0.91
  need_match: 0.83
  goal_match: 0.72
  memory_activation: 0.61
  habit_strength: 0.12
  feasibility_hint: 0.67

Sonuç:

generation_score: 0.76

Düşük skorlu adaylar detaylı değerlendirmeye alınmaz.

16. Candidate Budget
candidate_budget:
  background_npc: 2
  standard_npc: 5
  narrative_npc: 8
  protagonist: 12

Acil durumda:

reactive_budget: 3

Stratejik karar durumunda:

deliberative_budget: 8
17. Yaralı tilki örneği

Context Builder şu durumu üretmiş olsun:

trigger:
  type: infection_worsened

needs:
  survival: 0.96
  rest: 0.89
  safety: 0.83

goals:
  - survive_infection
  - avoid_hunter

memories:
  - healer_helped_before
  - hunter_trap_near_village

relationships:
  healer:
    trust: 0.78

resources:
  owl_ally: true
  stealth: 0.76

Candidate Generator şunları üretir:

candidates:
  - id: c1
    action: seek_help
    target: healer
    method: approach_secretly
    sources:
      - survival_need
      - healer_memory
      - healer_relationship

  - id: c2
    action: ask_for_help
    target: owl
    method: send_message_to_healer
    sources:
      - ally_resource
      - avoid_hunter_goal

  - id: c3
    action: move_to_shelter
    target: old_tree_hollow
    sources:
      - rest_need
      - current_intent

  - id: c4
    action: search_for_medicine
    target: nearby_herbs
    sources:
      - survival_need
      - known_location

  - id: c5
    action: hide_and_wait
    target: dense_bushes
    sources:
      - fear
      - habit

  - id: c6
    action: continue_current_intent
    target: old_tree_hollow
    sources:
      - commitment

  - id: c7
    action: wait_and_observe
    sources:
      - uncertainty

Bu adaylar henüz seçilmez. Sonraki aşamada ayrıntılı olarak değerlendirilir.

18. Candidate Action veri modeli
action_candidate:
  id: candidate_001

  action:
    template: seek_help
    actor: fox_17
    target: healer_01
    location: healer_garden
    method: approach_secretly

  source_signals:
    needs:
      survival: 0.96

    goals:
      survive_infection: 0.91

    memories:
      healer_helped_before: 0.84

    relationships:
      healer_trust: 0.78

  generation:
    mode: deliberative
    novelty: 0.32
    familiarity: 0.73
    cognitive_cost: 0.41

  initial_estimates:
    feasibility: 0.52
    risk: 0.46
    expected_gain: 0.84
    uncertainty: 0.39

  tags:
    - cooperative
    - social
    - survival
    - high_emotional_cost
19. Candidate Generator’ın yapmaması gerekenler

Candidate Generator:

nihai kararı vermemeli,
gerçek sonucu kesin biliyormuş gibi davranmamalı,
tüm dünya verisini taramamalı,
sınırsız varyasyon üretmemeli,
NPC’nin bilmediği bilgiyi kullanmamalı,
karakterin yapamayacağı eylemleri normal aday gibi sunmamalı,
hikâyeyi doğrudan yazmamalı.

Görevi sadece:

Karakterin bu anda makul biçimde düşünebileceği eylem seçeneklerini üretmek.

Sonraki aşama

Şimdi sırada Action Feasibility Evaluator var.

Bu bileşen her aday için şunları cevaplayacak:

Bu eylem fiziksel olarak mümkün mü?
Karakter bunu yapmayı biliyor mu?
Gerekli kaynaklara sahip mi?
Zaman yeterli mi?
Hedef erişilebilir mi?
Eylem hangi şartlarda başarısız olur?
Tamamen imkânsız mı, yoksa sadece zor mu?

Bu ayrım kritik olacak; çünkü LUMI’de “zor”, “riskli”, “bilinmeyen” ve “imkânsız” aynı şey olmamalı.

devam edelim
Action Feasibility Evaluator

Candidate Action Generator, NPC’nin düşünebildiği eylemleri üretir. Action Feasibility Evaluator ise her aday için şu soruyu cevaplar:

Bu karakter, mevcut koşullar altında bu eylemi gerçekten gerçekleştirebilir mi?

Burada dört kavramı kesin olarak ayırmalıyız:

Impossible  → Yapılamaz
Blocked     → Şu anda yapılamaz, engel kaldırılırsa yapılabilir
Difficult   → Yapılabilir ama maliyetli veya başarısızlık ihtimali yüksek
Feasible    → Makul koşullarda gerçekleştirilebilir

Decision Engine açısından en büyük hatalardan biri, “zor” ile “imkânsız” olanı aynı şekilde elemek olur.

1. Feasibility tek bir sayı olmamalı

Bir eylem fiziksel olarak mümkün olabilir fakat karakter onu nasıl yapacağını bilmiyor olabilir.

Örneğin:

action: treat_infection

Değerlendirme:

feasibility:
  physical: 0.91
  knowledge: 0.08
  resource: 0.62
  temporal: 0.74
  environmental: 0.80
  social: 1.00

Burada karakter yarasına erişebilir, zamanı ve bazı malzemeleri olabilir; fakat tıbbi bilgisi yoktur.

Dolayısıyla:

overall_status: difficult
failure_risk: very_high

Daha doğru yaklaşım, uygulanabilirliği bir vektör olarak tutmaktır.

2. Feasibility Vector

Önerilen temel yapı:

feasibility_vector:
  physical:
  cognitive:
  skill:
  knowledge:
  resource:
  access:
  environmental:
  temporal:
  social:
  legal_or_rule:
  moral_boundary:
  coordination:
  information:
  dependency:

Her eylem bütün boyutları kullanmak zorunda değildir.

Örneğin kapıyı açmak için sosyal uygulanabilirlik önemsiz olabilir. Bir grubu ikna etmek için fiziksel güç neredeyse önemsizdir.

3. Physical Feasibility

Karakterin bedeni eylemi gerçekleştirebilir mi?

physical_feasibility:
  required:
    mobility: 0.55
    stamina: 0.42
    grip_strength: 0.20

  available:
    mobility: 0.46
    stamina: 0.24
    grip_strength: 0.71

Sonuç:

physical_result:
  status: difficult
  limiting_factors:
    - low_stamina
    - injured_leg

Fiziksel değerlendirmede yalnızca “yapabilir/yapamaz” olmamalı.

physical_capacity:
  start_action: true
  complete_action: uncertain
  repeat_action: false
  perform_under_pressure: low

Karakter eyleme başlayabilir ancak tamamlayamayabilir.

Bu çok önemlidir.

3.1 Yaralanmanın eyleme özel etkisi

Bir yaralanma her eylemi aynı düzeyde etkilemez.

condition:
  type: injured_left_leg

action_modifiers:
  running: -0.82
  walking: -0.41
  climbing: -0.67
  hiding: -0.05
  speaking: 0.00

Bu nedenle sağlık değeri tek başına yeterli değildir.

health = 0.40

bilgisi, karakterin konuşup konuşamayacağını söylemez.

4. Skill Feasibility

Karakter gerekli beceriye sahip mi?

action:
  template: climb_tree

skill_requirement:
  climbing:
    minimum: 0.35
    recommended: 0.60

actor_skill:
  climbing: 0.41

Sonuç:

skill_status: feasible_but_unreliable
success_probability_modifier: -0.18

Beceriler için üç eşik yararlı olabilir:

Minimum threshold
Reliable threshold
Mastery threshold

Örnek:

skill_thresholds:
  minimum: 0.30
  reliable: 0.60
  mastery: 0.85

Böylece karakter:

eylemi deneyebilir,
düzenli olarak başarabilir,
zorlu koşullarda da başarabilir.
5. Knowledge Feasibility

Karakter eylemi nasıl yapacağını biliyor mu?

action: prepare_healing_herb

required_knowledge:
  - identify_herb
  - safe_dosage
  - preparation_method

Karakterin bilgisi:

known:
  identify_herb: true
  safe_dosage: false
  preparation_method: partial

Sonuç:

knowledge_status: incomplete
hazard:
  type: incorrect_dosage
  severity: high

Burada önemli ayrım:

Skill ≠ Knowledge

Bir karakter ne yapılacağını bilebilir ama uygulayamayabilir.

Bir karakter becerikli olabilir fakat doğru yöntemi bilmiyor olabilir.

5.1 Yanlış bilgi

Karakter bir şeyi bildiğini düşünebilir ama bilgisi yanlış olabilir.

believed_knowledge:
  herb_is_safe: true
  confidence: 0.88

objective_knowledge:
  herb_is_toxic: true

Decision Engine karakterin inandığı uygulanabilirliği kullanır.

World Simulation ise gerçek uygulanabilirliği kullanır.

Bu nedenle iki ayrı sonuç tutulmalıdır:

feasibility:
  perceived: 0.81
  objective: 0.22

Bu ayrım LUMI için çok değerli olacaktır.

6. Resource Feasibility

Eylem için gereken kaynaklar mevcut mu?

requirements:
  items:
    - clean_cloth
    - medicinal_herb

  energy: 0.30
  time: 45m

Mevcut durum:

available:
  clean_cloth: false
  medicinal_herb: true
  energy: 0.24
  time: 2h

Sonuç:

resource_status: blocked
missing:
  - clean_cloth
  - energy_deficit

Fakat burada eylemi hemen elememeliyiz.

Eksik kaynağın elde edilip edilemeyeceğine bakılabilir:

resource_recovery_options:
  clean_cloth:
    - obtain_from_healer
    - tear_existing_bag
    - substitute_with_leaves

Böylece ana eylem:

blocked

olsa da yeni alt eylemler üretilebilir.

7. Access Feasibility

Hedefe veya konuma erişilebilir mi?

action:
  target: healer_house

access:
  route_known: true
  route_open: uncertain
  target_distance: 4.2
  target_inside_restricted_area: true

Erişim boyutları:

access_feasibility:
  spatial: 0.58
  visibility: 0.42
  permission: 0.18
  route_knowledge: 0.91
  target_availability: 0.71

Bir hedef yakın olabilir ancak erişilemez olabilir.

Bir hedef uzak olabilir ancak güvenli bir rota varsa uygulanabilir olabilir.

8. Environmental Feasibility

Çevre koşulları eylemi destekliyor mu?

environment:
  rain: 0.81
  visibility: 0.38
  temperature: cold
  terrain: muddy

Aynı çevre farklı eylemleri farklı etkiler:

modifiers:
  stealth:
    rain_noise_cover: +0.25
    mud_tracks: -0.31

  travel:
    movement_speed: -0.27
    injury_risk: +0.22

  fire_starting:
    success_probability: -0.74

Dolayısıyla çevre koşulları eyleme özel değerlendirilmelidir.

9. Temporal Feasibility

Eylem zamanında tamamlanabilir mi?

action:
  estimated_duration: 3h

constraints:
  time_to_sunset: 2h40m
  infection_critical_window: 4h

Sonuç:

temporal_status: partially_feasible
completion_before_sunset: false
completion_before_critical_window: likely

Zaman değerlendirmesinde şunlar yer alabilir:

Başlama zamanı
Tahmini süre
Son teslim anı
Kesintiye uğrama ihtimali
Bekleme süresi
Gecikmenin maliyeti

Örnek:

temporal_feasibility:
  can_start_now: true
  expected_duration: 2h50m
  deadline: 4h
  interruption_risk: 0.35
  delay_cost: 0.72
10. Social Feasibility

Eylem başkalarının iş birliğine bağlı mı?

action: ask_owl_to_contact_healer

Sosyal uygulanabilirlik:

social_feasibility:
  owl_nearby: true
  communication_possible: true
  relationship_trust: 0.81
  owl_willingness_estimate: 0.73
  social_cost: 0.22

Başka bir örnek:

action: convince_guard_to_open_gate
social_feasibility:
  persuasion_skill: 0.44
  guard_trust: 0.18
  guard_rule_strictness: 0.81
  evidence_available: false

Sonuç:

status: difficult

Sosyal eylemler doğrudan “mümkün” veya “imkânsız” olmamalıdır. Karşı taraf da kendi Decision Engine’iyle tepki verebilir.

11. Rule Feasibility

Dünya kuralları veya sistem kuralları eylemi engelliyor mu?

action: enter_sacred_grove

rules:
  physical_entry_possible: true
  cultural_permission: false
  magical_barrier: true

Sonuç:

rule_feasibility:
  cultural: blocked
  magical: impossible_without_key

Burada üç tür kural ayırabiliriz:

Hard rule
Soft rule
Social rule
Hard Rule

Motor düzeyinde yapılamaz.

cannot_breathe_underwater: true
Soft Rule

Yapılabilir ama sonuç doğurur.

entering_after_dark_is_forbidden: true
Social Rule

Başkaları izin vermeyebilir veya tepki gösterebilir.

only_elders_may_speak_at_council: true
12. Moral Boundary Feasibility

Burada dikkatli bir ayrım gerekir.

Bir eylem fiziksel olarak mümkün olabilir ama karakter için psikolojik olarak düşünülemez olabilir.

action: abandon_injured_friend

values:
  loyalty: 0.92
  protect_companions: 0.88

Sonuç:

moral_boundary:
  status: identity_conflict
  resistance: 0.91

Bu eylem teknik olarak uygulanabilir olduğu için tamamen silinmemelidir.

Çünkü aşırı korku, zorlama veya başka bir kriz bu sınırı aşabilir.

Bu nedenle:

Moral impossibility

yerine:

High identity resistance

kullanmak daha doğru olur.

13. Cognitive Feasibility

Karakter, eylemi planlayacak zihinsel kapasiteye sahip mi?

action:
  complexity: 0.74
  planning_steps: 8
  required_attention: 0.68

Karakter:

cognitive_state:
  alertness: 0.42
  confusion: 0.36
  attention_capacity: 0.31
  planning_horizon: short

Sonuç:

cognitive_status: difficult
likely_errors:
  - forget_intermediate_step
  - misjudge_timing
  - fail_to_update_plan

Karakter eylemi anlayabilir ama bütün adımları sürdüremeyebilir.

Bu durumda Action Planner planı basitleştirebilir:

adaptation:
  original_plan_steps: 8
  simplified_plan_steps: 3
14. Information Feasibility

Karar vermek veya eylemi gerçekleştirmek için yeterli bilgi var mı?

action: choose_safe_route

required_information:
  - hunter_location
  - bridge_condition
  - river_depth

Mevcut bilgi:

known:
  hunter_location:
    confidence: 0.42

  bridge_condition:
    confidence: 0.91

  river_depth:
    confidence: 0.18

Sonuç:

information_status: uncertain

Bu durumda yeni aday üretilebilir:

- scout_route
- ask_owl
- observe_tracks

Yani uygulanabilirlik değerlendirmesi yalnızca adayları elemez; bilgi toplama eylemleri de doğurur.

15. Coordination Feasibility

Eylem birden fazla aktör gerektiriyorsa koordinasyon değerlendirilmelidir.

action: distract_hunter_and_escape

participants:
  - fox
  - owl

Gereksinimler:

coordination_requirements:
  timing_precision: 0.71
  communication: 0.52
  mutual_trust: 0.68
  role_understanding: 0.60

Mevcut durum:

coordination_state:
  communication: 0.73
  mutual_trust: 0.81
  shared_plan: 0.32

Sonuç:

coordination_status: feasible_with_preparation

Gerekli ön eylem:

- explain_plan_to_owl
16. Dependency Graph

Karmaşık eylemler genellikle başka eylemlere bağlıdır.

goal_action: seek_healer_help

dependencies:
  - reach_village
  - avoid_hunter
  - locate_healer
  - establish_contact

Her bağımlılık ayrı değerlendirilir:

dependency_graph:
  reach_village:
    feasibility: 0.52

  avoid_hunter:
    feasibility: 0.61

  locate_healer:
    feasibility: 0.71

  establish_contact:
    feasibility: 0.82

Ana eylemin uygulanabilirliği en zayıf halkadan etkilenir.

Ancak doğrudan minimum değeri almak her zaman doğru değildir.

Bazı bağımlılıklar:

Required
Optional
Replaceable
Parallel
Sequential

olarak sınıflandırılmalıdır.

17. Preconditions

Her Action Template açık ön koşullara sahip olmalıdır.

action_template:
  id: ask_for_help

  preconditions:
    required:
      - target_known
      - communication_channel_available

    optional:
      - positive_relationship
      - target_nearby

    blockers:
      - target_hostile
      - actor_unconscious

Değerlendirici:

precondition_check:
  target_known: pass
  communication_channel_available: partial
  actor_unconscious: false

Sonuç:

precondition_status: partial
18. Hard Constraint ve Soft Constraint

Bu ayrım veri modelinde açık olmalıdır.

Hard Constraint

Karar motoru eylemi seçemez.

constraint:
  type: hard
  rule: cannot_fly
Soft Constraint

Eylem seçilebilir ancak cezası vardır.

constraint:
  type: soft
  rule: injured_leg
  effects:
    duration: +0.45
    pain: +0.32
    failure_risk: +0.21
Conditional Constraint

Sadece belirli durumda geçerlidir.

constraint:
  type: conditional
  rule: bridge_closed_during_storm
19. Substitution sistemi

Eksik kaynak veya beceri olduğunda sistem alternatif yöntemlere bakmalıdır.

action:
  light_fire

missing:
  - dry_wood

Alternatifler:

substitutions:
  - use_sheltered_branches
  - use_dried_cloth
  - ask_villager_for_embers

Başka örnek:

action:
  cross_river

blocked_method:
  swim

alternatives:
  - use_bridge
  - build_raft
  - follow_river_to_shallow_point
  - ask_large_animal_for_help

Bu sayede eylem şablonuyla yöntem birbirinden ayrılır.

Intent: Cross river
Method: Swim

Yöntem mümkün değilse intent hemen atılmaz; başka yöntem aranır.

20. Feasibility sonuç sınıfları

Önerilen durum kümesi:

feasibility_status:
  - impossible
  - blocked
  - feasible_with_preconditions
  - difficult
  - feasible
  - trivial
  - unknown
Impossible

Dünya kuralları veya fizik nedeniyle yapılamaz.

Blocked

Eksik kaynak, kapalı yol veya erişilemeyen hedef nedeniyle şu anda yapılamaz.

Feasible with Preconditions

Bir veya birkaç hazırlık eylemi sonrası yapılabilir.

Difficult

Mümkün ama yüksek maliyetli veya düşük başarı ihtimalli.

Feasible

Makul başarı ihtimaliyle yapılabilir.

Trivial

Karakter için neredeyse maliyetsizdir.

Unknown

Bilgi yetersizdir.

21. Perceived ve Objective Feasibility

LUMI’de bu iki sonucu mutlaka ayrı tutmalıyız.

feasibility:
  perceived:
    status: feasible
    confidence: 0.81

  objective:
    status: difficult
    confidence: 0.95

Decision Engine yalnızca perceived tarafını kullanır.

World Engine gerçek sonucu hesaplarken objective tarafını kullanır.

Örnek:

Karakter mağaranın güvenli olduğunu düşünüyor.
Gerçekte mağarada uyuyan bir ayı var.
perceived_feasibility:
  enter_cave: 0.86

objective_feasibility:
  enter_cave_safely: 0.19

Bu yapı sürpriz, hata, yanlış anlama ve gerilim üretir.

22. Başarı olasılığı ile feasibility aynı değildir

Bir eylem uygulanabilir olabilir ancak başarı ihtimali düşük olabilir.

action: persuade_guard

feasibility:
  can_attempt: true
  status: feasible

success_probability: 0.24

Başka bir eylem:

action: walk_to_shelter
feasibility:
  status: difficult

success_probability: 0.73

İlk eylem kolayca denenebilir ama başarısız olabilir.

İkinci eylem zor olabilir ama büyük olasılıkla tamamlanabilir.

Bu iki kavram ayrılmalıdır:

Attempt Feasibility
Completion Probability
Outcome Quality
23. Cost Vector

Feasibility Evaluator aynı zamanda yaklaşık maliyet üretmelidir.

cost_vector:
  energy: 0.63
  time: 0.52
  pain: 0.47
  resource_consumption: 0.18
  social_cost: 0.31
  reputation_risk: 0.22
  opportunity_cost: 0.39

Bu henüz eylemin faydasıyla karşılaştırılmaz. Sadece maliyet bilgisi hazırlanır.

24. Failure Modes

Her eylemin nasıl başarısız olabileceği belirtilmelidir.

action: reach_healer

failure_modes:
  - id: collapse_from_exhaustion
    probability: 0.21
    severity: 0.81

  - id: detected_by_hunter
    probability: 0.27
    severity: 0.92

  - id: healer_not_present
    probability: 0.29
    severity: 0.44

  - id: route_blocked
    probability: 0.16
    severity: 0.35

Bu bilgi daha sonra Risk Evaluator tarafından kullanılabilir.

25. Partial Success

Eylemler yalnızca başarı veya başarısızlıkla sonuçlanmamalıdır.

possible_outcomes:
  full_success:
    probability: 0.41

  partial_success:
    probability: 0.34

  failure:
    probability: 0.19

  catastrophic_failure:
    probability: 0.06

Örneğin tilki şifacıya ulaşamaz ama köyün kenarında bulunup yardım görebilir.

Bu, tam başarı değildir fakat hikâyeyi ilerleten kısmi sonuçtur.

26. Graceful Degradation

Karakter eylemi tam biçimde gerçekleştiremiyorsa daha düşük kaliteli bir versiyonunu yapabilir.

desired_action:
  travel_to_village_secretly

degraded_variants:
  - travel_to_village_slowly
  - reach_village_edge_only
  - signal_from_distance
  - send_owl_instead

Bu mekanizma motorun sürekli “eylem imkânsız” demesini önler.

27. Feasibility değerlendirme sırası

Performans için pahalı değerlendirmeleri en sona bırakmalıyız.

1. Hard rule check
2. Basic precondition check
3. Physical capability
4. Access and target availability
5. Resource check
6. Time check
7. Skill and knowledge check
8. Cognitive complexity
9. Social and coordination check
10. Dependency graph
11. Failure modes
12. Perceived/objective ayrımı

Bir eylem ilk adımda kesin olarak imkânsızsa kalan hesaplara gerek yoktur.

28. Feasibility bütçesi

Arka plan NPC’lerinde tüm ayrıntı gerekmez.

feasibility_profiles:
  background:
    checks:
      - hard_rules
      - distance
      - basic_resources

  standard:
    checks:
      - physical
      - skill
      - resources
      - access
      - time

  narrative:
    checks:
      - all_dimensions
      - perceived_objective_split
      - failure_modes
      - substitutions
29. Yaralı tilki adaylarının değerlendirilmesi
Aday 1: Şifacıya gizlice git
candidate:
  action: seek_help_from_healer
  method: approach_secretly
feasibility:
  physical: 0.46
  skill: 0.76
  knowledge: 0.91
  resource: 0.68
  access: 0.52
  environmental: 0.57
  temporal: 0.71
  social: 0.78

  status: difficult

  blockers: []

  limiting_factors:
    - injured_leg
    - low_energy
    - uncertain_healer_availability

  costs:
    energy: 0.72
    time: 0.63
    pain: 0.61

  success_probability:
    perceived: 0.64
    objective: 0.51
Aday 2: Baykuştan yardım iste
feasibility:
  physical: 0.96
  skill: 0.82
  communication: 0.73
  social: 0.81
  target_availability: 0.62

  status: feasible

  limiting_factors:
    - owl_may_not_find_healer

  costs:
    energy: 0.08
    time: 0.44
    autonomy: 0.31

  success_probability:
    perceived: 0.72
    objective: 0.68
Aday 3: Eski ağaca gitmeye devam et
feasibility:
  physical: 0.64
  access: 0.91
  temporal: 0.88
  resource: 0.94

  status: feasible

  costs:
    energy: 0.31
    time: 0.22
    medical_delay: 0.74

  success_probability:
    reach_shelter: 0.82
    survive_infection: 0.27

Burada eylem uygulanabilirdir fakat asıl ihtiyacı çözmez.

Bu ayrım daha sonra Utility Evaluator tarafından ele alınacaktır.

Aday 4: Bitkiyle kendi kendini tedavi et
feasibility:
  physical: 0.71
  knowledge: 0.24
  skill: 0.08
  resources: 0.59

  status: difficult

  perceived_success_probability: 0.52
  objective_success_probability: 0.13

  failure_modes:
    - wrong_herb
    - incorrect_dosage
    - infection_delay
Aday 5: Saklanıp bekle
feasibility:
  physical: 0.92
  access: 0.84
  environmental: 0.76
  temporal: 0.98

  status: trivial

  costs:
    energy: 0.04
    infection_progression: 0.79
    lost_time: 0.68

Kolay olması, iyi bir karar olduğu anlamına gelmez.

30. Önerilen veri modeli
action_feasibility_result:
  candidate_id: candidate_001

  status: difficult
  confidence: 0.84

  perceived:
    attempt_feasibility: 0.72
    completion_probability: 0.64

  objective:
    attempt_feasibility: 0.61
    completion_probability: 0.51

  dimensions:
    physical: 0.46
    cognitive: 0.68
    skill: 0.76
    knowledge: 0.91
    resource: 0.68
    access: 0.52
    environmental: 0.57
    temporal: 0.71
    social: 0.78
    coordination: 1.00

  preconditions:
    passed:
      - healer_location_known
      - route_known

    partial:
      - sufficient_energy

    failed: []

  constraints:
    hard: []
    soft:
      - injured_leg
      - cold_rain

  costs:
    energy: 0.72
    time: 0.63
    pain: 0.61
    social: 0.18
    opportunity: 0.27

  failure_modes:
    - type: exhaustion
      probability: 0.21
      severity: 0.81

    - type: hunter_detection
      probability: 0.27
      severity: 0.92

  substitutions:
    - send_owl_to_healer
    - signal_from_village_edge

  required_preparations:
    - rest_briefly
    - choose_low_visibility_route

  explanation:
    primary_limit: low_physical_capacity
    secondary_limit: uncertain_target_availability
31. Feasibility Evaluator’ın karar motoruna sağlayacağı çıktı

Her aday için Decision Engine şu bilgileri alır:

Eylem denenebilir mi?
Tamamlanma ihtimali nedir?
Hangi kaynaklar gerekir?
Ne kadar zaman alır?
Hangi bedensel ve zihinsel sınırlar vardır?
Hangi ön hazırlıklar gerekir?
Hangi başarısızlık biçimleri mümkündür?
Karakter uygulanabilirliği nasıl algılıyor?
Gerçek uygulanabilirlik nedir?
Alternatif yöntem var mı?

Bu aşamadan sonra elimizde şunlar olur:

Decision Context
Candidate Actions
Feasibility Results

Sıradaki temel bileşen Action Outcome Predictor olmalıdır.