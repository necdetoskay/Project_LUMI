Action Outcome Predictor

Action Outcome Predictor, her uygulanabilir aday için şu soruya cevap verir:

Karakter bu eylemi seçerse, kendince ne olacağını düşünüyor?

Bu bileşen geleceği kesin olarak hesaplamaz. Karakterin bilgisine, deneyimine, algısına ve önyargılarına dayanarak olası sonuçlar üretir.

Temel ayrım:

Feasibility:
Bu eylem yapılabilir mi?

Outcome Prediction:
Bu eylem yapılırsa ne olabilir?

Utility Evaluation:
Bu sonuçlar karakter için ne kadar iyi veya kötü?
1. Tek sonuç yerine sonuç dağılımı

Bir eylemin yalnızca tek beklenen sonucu olmamalıdır.

action: seek_help_from_healer

predicted_outcomes:
  - type: healer_provides_treatment
    probability: 0.46

  - type: healer_not_available
    probability: 0.23

  - type: hunter_detects_fox
    probability: 0.17

  - type: another_villager_finds_fox
    probability: 0.14

Böylece Decision Engine sadece “başarır mı?” sorusunu değil, farklı gelecek dallarını değerlendirebilir.

2. Outcome Vector

Her sonuç çok boyutlu olmalıdır.

outcome_vector:
  survival:
  health:
  safety:
  energy:
  time:
  emotional_state:
  relationships:
  reputation:
  knowledge:
  inventory:
  goal_progress:
  autonomy:
  future_options:
  world_impact:

Örneğin şifacıdan yardım almak:

outcome:
  health: +0.72
  survival: +0.84
  safety: +0.31
  energy: -0.48
  autonomy: -0.22
  trust_healer: +0.41
  fear_village: -0.18
  den_secrecy: -0.09
  future_options: +0.63

Aynı sonuç bazı boyutlarda olumlu, bazılarında olumsuz olabilir.

3. Perceived ve Objective Outcome

Feasibility’de olduğu gibi sonuç tahmininde de iki ayrı gerçeklik tutulmalıdır.

predicted_outcome:
  perceived:
    healer_help_probability: 0.72
    hunter_detection_probability: 0.18

  objective:
    healer_help_probability: 0.51
    hunter_detection_probability: 0.29

Decision Engine yalnızca karakterin algıladığı sonucu kullanır.

World Simulation gerçek sonuca göre ilerler.

Bu sayede:

karakter yanlış umut besleyebilir,
gereksiz yere korkabilir,
kötü bir planı iyi sanabilir,
güvenilir bir seçeneği reddedebilir,
geçmiş deneyimini yanlış genelleyebilir.
4. Sonuç zaman ufukları

Bir eylemin anlık ve uzun vadeli etkileri farklı olabilir.

time_horizons:
  immediate:
    health: 0.00
    energy: -0.30
    safety: -0.12

  short_term:
    health: +0.65
    safety: +0.41

  medium_term:
    healer_trust: +0.36
    village_visibility: +0.27

  long_term:
    human_contact_probability: +0.42
    independence: -0.18

Örneğin yardım istemek kısa vadede utanç verici, uzun vadede hayat kurtarıcı olabilir.

Karakterin planlama ufku hangi zaman dilimlerinin dikkate alınacağını belirler:

planning_horizon:
  immediate_weight: 1.00
  short_term_weight: 0.78
  medium_term_weight: 0.31
  long_term_weight: 0.08

Çocuk, panik içindeki veya dürtüsel karakterler uzun vadeyi daha az hesaba katabilir.

5. Sonuç kaynakları

Outcome Predictor tahminlerini birkaç kaynaktan üretmelidir.

Action Template
World Rules
Actor Experience
Relevant Memories
Observed Evidence
Relationship Model
Other Actor Models
Cultural Knowledge
Simulation History
Causal Models
5.1 Action Template etkileri

Her eylem şablonunda temel sonuç beklentileri bulunabilir.

action_template:
  id: ask_for_help

default_outcomes:
  support_probability: medium
  autonomy_loss: low
  social_exposure: medium
  relationship_change: possible

Bunlar karakter ve bağlama göre özelleştirilir.

5.2 Geçmiş deneyim

Karakter daha önce aynı veya benzer eylemi yaptıysa tahmin bundan etkilenir.

experience:
  action_family: ask_healer_for_help
  attempts: 2
  successes: 2

Tahmin:

predicted_success: 0.81

Fakat örnek sayısı azsa aşırı güven oluşabilir.

sample_size: low
confidence: 0.46
5.3 Benzerlik yoluyla tahmin

Karakter aynı durumu yaşamamış olabilir ama benzer bir deneyimi kullanabilir.

past_event:
  asked_owl_for_food
  outcome: successful

current_action:
  ask_owl_to_contact_healer

Benzerlik:

analogy:
  social_target_similarity: 0.91
  action_similarity: 0.54
  context_similarity: 0.48

Bu nedenle önceki başarı yeni eyleme kısmen aktarılır.

6. Causal Model

Outcome Predictor yalnızca geçmiş istatistiğine dayanmamalı. Basit neden-sonuç zincirleri kurabilmelidir.

causal_chain:
  action: travel_to_village

  causes:
    - energy_consumption
    - village_exposure
    - proximity_to_healer

  possible_effects:
    - exhaustion
    - hunter_detection
    - medical_help

Daha karmaşık örnek:

Tilki köye yaklaşır
→ İz bırakır
→ Avcı izi görebilir
→ İn yeri hakkında çıkarım yapabilir
→ Yavrular uzun vadede risk altına girebilir
causal_chain:
  action: approach_village

  steps:
    - leaves_tracks
    - hunter_may_detect_tracks
    - hunter_may_follow_direction
    - den_secrecy_may_decline

Bu zincirin her halkası belirsizlik taşır.

7. Outcome Branching

Sonuçlar ağaç biçiminde modellenebilir.

outcome_tree:
  action: ask_owl_for_help

  branches:
    owl_accepts:
      probability: 0.74

      branches:
        healer_found:
          probability: 0.68

        healer_not_found:
          probability: 0.32

    owl_refuses:
      probability: 0.11

    owl_unavailable:
      probability: 0.15

Toplam sonuç olasılıkları:

Owl accepts × healer found
0.74 × 0.68 = 0.5032

Ancak çok derin ağaçlar pahalı olur. Bu nedenle derinlik sınırı gerekir.

prediction_budget:
  max_depth: 3
  max_branches_per_node: 4
  min_branch_probability: 0.08
8. Other Actor Response Prediction

Sosyal eylemlerin sonucu başka karakterlerin vereceği kararlara bağlıdır.

Örneğin:

action:
  type: request_help
  target: healer

Outcome Predictor, şifacının yaklaşık modelini kullanır:

target_model:
  empathy: 0.88
  duty_to_help: 0.91
  fear_of_wild_animals: 0.24
  current_workload: 0.63
  relationship_to_fox: 0.72

Tahmini tepki:

predicted_response:
  help_immediately: 0.54
  help_cautiously: 0.31
  refuse: 0.05
  call_someone_else: 0.10

Burada dikkat:

NPC diğer karakterin gerçek iç durumunu değil, onun hakkındaki zihinsel modelini kullanır.

fox_believes_healer:
  empathy: 0.92

actual_healer:
  empathy: 0.76
9. Theory of Mind seviyesi

Her NPC başkalarının niyetlerini aynı derinlikte modellememelidir.

social_reasoning_tier:
  0: no_model
  1: simple_disposition
  2: current_intent_estimate
  3: beliefs_and_goals
  4: recursive_reasoning
Tier 0
Avcı tehlikelidir.
Tier 1
Avcı genellikle tilkilere zarar verir.
Tier 2
Avcı şu anda beni arıyor olabilir.
Tier 3
Avcı izleri görürse inime gittiğimi düşünebilir.
Tier 4
Avcı, benim onu yanlış yönlendirmeye çalışacağımı düşünebilir.

Çoğu NPC için Tier 1–2 yeterlidir. Derin karşılıklı tahmin yalnızca önemli sahnelerde kullanılmalıdır.

10. Emotional Outcome Prediction

Karakterler yalnızca dış sonuçları değil, nasıl hissedeceklerini de tahmin eder.

action: ask_for_help

predicted_emotions:
  shame: +0.42
  hope: +0.51
  fear: +0.19
  relief: +0.66

Fakat insanlar ve NPC’ler duygularını her zaman doğru tahmin edemez.

predicted_shame: 0.71
actual_shame_after_action: 0.34

Bu fark karakter gelişimi yaratabilir.

Örneğin karakter yardım istemenin sandığı kadar kötü olmadığını öğrenir.

11. Identity Outcome

Bazı eylemler karakterin kendisi hakkındaki algısını değiştirir.

action: abandon_friend

identity_effects:
  self_respect: -0.73
  self_image_as_loyal: -0.81
  guilt: +0.77

Başka örnek:

action: confront_fear

identity_effects:
  self_efficacy: +0.48
  courage_identity: +0.35

Karakter yalnızca dünyayı değiştirmez; kendisini de değiştirir.

12. Relationship Outcomes

İlişki değişimleri tek bir “relationship score” olmamalıdır.

relationship_effect:
  target: healer

  trust: +0.22
  gratitude: +0.47
  dependency: +0.19
  familiarity: +0.31
  obligation: +0.28
  fear: -0.12

Bir olay güveni artırıp bağımlılık hissini de artırabilir.

Bir karakter bundan memnun olmayabilir.

13. Reputation Outcomes

Eylemin yalnızca doğrudan hedefle değil, gözlemcilerle de etkisi olabilir.

action: steal_food

observers:
  - child
  - shopkeeper
  - hidden_guard

Tahmini itibar etkileri:

reputation_effects:
  villagers:
    honesty: -0.42
    danger: +0.21

  hungry_animals:
    resourcefulness: +0.18

Aynı eylem farklı gruplarda farklı anlam kazanır.

14. Information Outcomes

Bazı eylemler doğrudan hedefi çözmez ama bilgi üretir.

action: observe_village_from_distance

outcomes:
  hunter_location_knowledge: +0.52
  healer_availability_knowledge: +0.43
  time_cost: -0.24
  detection_risk: -0.12

Bilgi kazanımı, gelecekteki kararların kalitesini artırır.

Bu nedenle bilgi eylemleri için şu boyut önemlidir:

information_value:
  uncertainty_reduction: 0.61
  decision_relevance: 0.83
  freshness: 0.94
15. Future Option Value

Bir eylem mevcut hedefi çözmese bile gelecekteki seçenekleri artırabilir.

action: move_to_village_edge

future_options:
  - contact_healer
  - hide_in_shed
  - retreat_to_forest
  - ask_child_for_help

Başka bir eylem seçenekleri daraltabilir:

action: enter_dead_end_cave

future_option_effect:
  mobility_options: -0.72
  escape_routes: -0.81

Bu boyuta optionality diyebiliriz.

optionality_effect:
  future_action_diversity: +0.44
  reversibility: +0.61
16. Reversibility

Kararların geri alınabilirliği değerlendirilmelidir.

action: wait_and_observe
reversibility: 0.94
action: reveal_den_location
reversibility: 0.08

Belirsizlik yüksek olduğunda ihtiyatlı karakterler geri alınabilir kararları tercih edebilir.

preference:
  uncertainty_sensitivity: 0.81
  reversibility_weight: 0.72
17. Irreversible Outcomes

Bazı sonuçlar kalıcıdır:

Ölüm
Kalıcı yaralanma
Bir sırrın açığa çıkması
Bir köprünün yıkılması
Bir ilişkinin geri dönülmez biçimde bozulması
Bir yeminin ihlal edilmesi
irreversibility:
  probability: 0.18
  severity: 0.89

Düşük ihtimalli ama geri döndürülemez sonuçlar ayrıca değerlendirilmelidir.

18. Outcome Uncertainty

Her tahminin güven derecesi bulunmalıdır.

outcome_prediction:
  result: healer_will_help
  probability: 0.68
  confidence: 0.47

Olasılık ile güven farklıdır.

Probability:
Sonucun gerçekleşeceğine dair tahmin.

Confidence:
Bu tahminin ne kadar güvenilir olduğu.

Örneğin:

probability: 0.80
confidence: 0.22

Karakter sonucun muhtemel olduğunu düşünüyor ama bunu destekleyen çok az bilgisi var.

19. Unknown Outcomes

Karakter bazı sonuçları hiç öngöremeyebilir.

hidden_outcome:
  cave_contains_sleeping_bear

Karakterin tahmininde bu dal yoktur.

perceived_branches:
  - cave_safe
  - cave_empty
  - cave_blocked

World Engine ise gizli sonucu bilir.

Bu, doğal sürprizler yaratır.

20. Black Swan Events

Çok düşük olasılıklı olayları her karar için hesaplamak gerekmez.

rare_events:
  inclusion_threshold: 0.03

Ancak sonuç çok ağırsa dahil edilebilir:

event:
  probability: 0.02
  severity: 1.00
  irreversible: true

Risk duyarlılığı yüksek karakterler bunu dikkate alabilir.

21. Expected Outcome değil Outcome Set

Sadece ortalama sonuç kullanmak hatalı olabilir.

İki seçenek düşünelim:

action_a:
  guaranteed_health_gain: +0.40
action_b:
  50_percent:
    health_gain: +0.90

  50_percent:
    health_gain: -0.30

İkisinin ortalaması benzer olabilir ama risk profilleri farklıdır.

Bu nedenle Predictor şu bilgileri tutmalıdır:

outcome_distribution:
  expected_value:
  variance:
  downside:
  upside:
  worst_case:
  best_case:
22. Risk profile

Her eylemin sonuç dağılımı özetlenebilir.

risk_profile:
  expected_health_change: +0.41
  variance: 0.52
  downside_probability: 0.34
  catastrophic_probability: 0.08
  best_case_gain: 0.91
  worst_case_loss: -0.74

Bu veriyi daha sonra Risk Evaluator yorumlar.

23. Opportunity Cost

Bir eylem seçildiğinde diğer seçeneklerden vazgeçilir.

action: wait_for_healer

opportunity_cost:
  cannot_reach_shelter_before_dark: 0.62
  loses_time_to_find_food: 0.47

Opportunity cost sadece kaynak kaybı değildir; kaçırılan alternatiflerdir.

opportunity_cost_vector:
  lost_time:
  lost_information:
  lost_relationship_chance:
  lost_resource:
  lost_goal_progress:
24. Side Effects

Ana hedef dışındaki sonuçlar mutlaka üretilmelidir.

action: ask_owl_for_help

primary_effect:
  contact_healer: +0.68

side_effects:
  owl_exposure_to_hunter: +0.19
  debt_to_owl: +0.31
  delay: +0.27

Yan etkiler hikâyenin zenginliğini oluşturur.

25. Cascading Outcomes

Bazı etkiler başka olayları tetikler.

action: steal_food

cascade:
  food_owner_notices_loss:
    probability: 0.72

  owner_sets_trap:
    probability_given_notice: 0.43

  other_animals_affected:
    probability_given_trap: 0.38

Bu zincirlerin hepsi Decision Engine’de derin hesaplanmamalıdır. Ancak önemli etkiler özetlenebilir:

cascade_summary:
  future_area_risk: +0.34
26. World Impact

Önemli NPC’lerin kararları dünyayı değiştirebilir.

world_impact:
  village_alertness: +0.21
  forest_human_activity: +0.18
  healer_awareness_of_injured_animals: +0.44

Arka plan NPC’lerinde bu boyut çoğunlukla sıfır veya çok küçük olabilir.

27. Outcome Prediction derinlikleri

Her NPC için aynı ayrıntı kullanılmamalıdır.

prediction_profiles:
  reactive:
    horizons:
      - immediate
    max_branches: 3
    causal_depth: 1

  standard:
    horizons:
      - immediate
      - short_term
    max_branches: 5
    causal_depth: 2

  narrative:
    horizons:
      - immediate
      - short_term
      - medium_term
    max_branches: 8
    causal_depth: 3

  protagonist:
    horizons:
      - immediate
      - short_term
      - medium_term
      - long_term
    max_branches: 12
    causal_depth: 4
28. Prediction accuracy karakter özelliği

Her karakter geleceği aynı kalitede tahmin etmemelidir.

prediction_capabilities:
  physical_reasoning: 0.71
  social_reasoning: 0.42
  risk_estimation: 0.58
  long_term_planning: 0.31
  self_prediction: 0.27

Bir karakter fiziksel sonuçları iyi, sosyal sonuçları kötü tahmin edebilir.

Örneğin:

Köprünün çökeceğini doğru tahmin eder.
Şifacının kendisine kızacağını yanlış tahmin eder.
29. Bias katmanı

Tahminler karakterin bilişsel önyargılarından etkilenmelidir.

biases:
  optimism: 0.21
  pessimism: 0.64
  loss_aversion: 0.78
  confirmation_bias: 0.42
  familiarity_bias: 0.53
  recency_bias: 0.69
  trauma_bias: 0.81
29.1 Optimism bias
objective_success_probability: 0.48
perceived_success_probability: 0.67
29.2 Loss aversion

Karakter kayıpları eşdeğer kazançlardan daha güçlü hisseder.

gain: +0.50
loss: -0.50

Psikolojik etkisi:

weighted_gain: +0.50
weighted_loss: -0.82
29.3 Recency bias

Son yaşanan olay fazla ağırlık kazanır.

recent_event:
  hunter_seen_near_village

Karakter avcının hâlâ yakın olma ihtimalini abartabilir.

29.4 Trauma bias

Geçmiş travma belirli sonuçları aşırı büyütebilir.

trauma:
  type: trapped_near_bridge

Tahmin:

bridge_danger:
  objective: 0.22
  perceived: 0.74
30. Prediction öğrenmesi

Karakter eylemi yaptıktan sonra tahminiyle gerçek sonucu karşılaştırmalıdır.

prediction:
  healer_help_probability: 0.31

actual:
  healer_helped: true

Prediction error:

prediction_error:
  dimension: social_trust
  magnitude: 0.69

Bu hata gelecekteki modelini günceller:

model_update:
  healer_reliability: +0.18
  asking_for_help_success: +0.12

Böylece NPC zamanla öğrenir.

31. Attribution hatası

Karakter gerçek sonucu doğru sebeple açıklamayabilir.

actual_reason:
  healer_was_busy

actor_interpretation:
  healer_does_not_care

Bu yanlış yorum ilişkiyi bozabilir.

relationship_update:
  trust: -0.21
  resentment: +0.17

Dolayısıyla şu ikisi ayrılmalı:

Observed Outcome
Interpreted Cause
32. Outcome model veri yapısı
action_outcome_prediction:
  candidate_id: candidate_001

  prediction_mode: deliberative
  actor_model_version: fox_17_v12

  branches:
    - id: outcome_1
      label: healer_treats_fox

      probability:
        perceived: 0.46
        confidence: 0.61

      time_horizon:
        immediate:
          energy: -0.52
          fear: +0.18

        short_term:
          health: +0.72
          survival: +0.84
          relief: +0.63

        medium_term:
          healer_trust: +0.31
          village_visibility: +0.18

      goal_effects:
        survive_infection: +0.88
        avoid_hunter: -0.14

      relationship_effects:
        healer:
          trust: +0.21
          gratitude: +0.42
          dependency: +0.17

      identity_effects:
        autonomy: -0.16
        self_respect: -0.07

      reversibility: 0.74
      hidden_unknowns: high

    - id: outcome_2
      label: healer_unavailable

      probability:
        perceived: 0.23
        confidence: 0.48

      effects:
        energy: -0.61
        time: -0.58
        health: -0.19
        hope: -0.33

      future_options:
        village_shelter: +0.24
        return_to_forest: -0.31

    - id: outcome_3
      label: hunter_detects_fox

      probability:
        perceived: 0.17
        confidence: 0.43

      effects:
        safety: -0.81
        den_secrecy: -0.62
        fear: +0.73

      irreversibility: 0.68
      catastrophic_potential: 0.84

  distribution_summary:
    expected:
      survival: +0.41
      health: +0.32
      safety: -0.12
      energy: -0.54
      healer_trust: +0.14

    variance:
      survival: 0.44
      safety: 0.61

    best_case:
      survival: +0.91

    worst_case:
      survival: -0.82

    catastrophic_probability: 0.08

  prediction_quality:
    evidence_strength: 0.57
    memory_support: 0.71
    causal_model_quality: 0.54
    social_model_quality: 0.63
    overall_confidence: 0.59
33. Yaralı tilki seçeneklerinin tahmini
Aday 1: Şifacıya git
expected_effects:
  survival: +0.41
  health: +0.32
  energy: -0.54
  safety: -0.12
  trust_healer: +0.14

risk:
  variance: high
  catastrophic_probability: 0.08

optionality:
  future_options: +0.37
Aday 2: Baykuştan yardım iste
expected_effects:
  survival: +0.38
  health: +0.27
  energy: -0.07
  time: -0.31
  owl_obligation: +0.24
  autonomy: -0.18

risk:
  variance: medium
  catastrophic_probability: 0.02

optionality:
  future_options: +0.52
Aday 3: Eski ağaca devam et
expected_effects:
  immediate_safety: +0.44
  energy: -0.27
  rest: +0.51
  infection: -0.42
  survival: -0.18

risk:
  variance: low
  long_term_decline: high

Burada kısa vadeli güvenli fakat uzun vadeli kötü bir seçenek vardır.

Aday 4: Kendi kendini tedavi et
perceived_effects:
  health: +0.29
  autonomy: +0.41

objective_effects:
  health: -0.11
  infection_delay: -0.38

risk:
  toxic_herb_probability: 0.22
  false_confidence: high
Aday 5: Saklanıp bekle
expected_effects:
  energy: +0.14
  immediate_safety: +0.36
  infection: -0.57
  future_options: -0.44

risk:
  immediate: low
  delayed: high
34. Predictor’ın yapmaması gerekenler

Action Outcome Predictor:

kesin gelecek üretmemeli,
NPC’nin bilmediği bilgiyi algılanan tahmine katmamalı,
tüm dünya simülasyonunu çalıştırmamalı,
nihai karar vermemeli,
yalnızca ortalama sonucu kullanmamalı,
yan etkileri yok saymamalı,
başka karakterlerin davranışını kesin kabul etmemeli,
tahmin güvenini olasılıkla karıştırmamalı.

Görevi:

Eylemin karakter açısından muhtemel gelecek dallarını ve bu dalların çok boyutlu etkilerini üretmek.

Decision Engine’de mevcut zincir

Artık elimizde şu akış var:

Decision Context Builder
        ↓
Candidate Action Generator
        ↓
Action Feasibility Evaluator
        ↓
Action Outcome Predictor

Sıradaki bileşen Utility Evaluator olmalı.

Bu bileşen şu soruya cevap verecek:

Tahmin edilen bu sonuçlar, bu karakter için şu anda ne kadar değerli veya zararlı?

Burada ihtiyaçlar, hedefler, duygular, değerler, kişilik, ilişkiler, zaman tercihi, risk eğilimi ve kimlik çatışmaları birlikte değerlendirilecek.