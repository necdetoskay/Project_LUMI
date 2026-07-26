# Project LUMI — Persistence Implementation
# Paket 08 — World State, Time & Simulation Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM
- **Bağımlılıklar:** Paket 01–07
- **Ana Aggregate'ler:** WorldState, WorldClock, SimulationRun, WorldEvent
- **Kapsam:** Dünya durumu, zaman akışı, bölgesel durumlar, çevresel değişimler, arka plan yaşamı ve simülasyon kayıtları

---

## 1. Paket Amacı

Bu paket, Project LUMI evreninin çocuk uygulamada aktif olmasa bile kontrollü biçimde yaşamaya devam etmesini sağlayan kalıcı veri modelini tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- dünya saatinin kalıcı tutulması;
- gerçek zaman ile dünya zamanı arasındaki ilişkinin yönetilmesi;
- dünya, bölge ve konum durumlarının saklanması;
- çevresel ve ekolojik değişimlerin kaydedilmesi;
- arka plan simülasyon çalıştırmalarının izlenmesi;
- uzak ve ilgisiz varlıkların düşük yoğunlukta işlenmesi;
- yakın ve önemli varlıkların daha yüksek ayrıntıda simüle edilmesi;
- en fazla 10 günlük yoğunluğu azalan ilerleme;
- 10 günden sonra evrenin kontrollü biçimde dondurulması;
- simülasyon sonuçlarının event olarak uygulanması;
- snapshot, checkpoint ve recovery;
- world event üretimi ve yayılımı;
- story outcome commit sistemiyle gelecekteki entegrasyon;
- idempotent ve conflict-safe dünya güncellemeleri.

---

## 2. Temel Tasarım Kararları

1. Dünya zamanı gerçek zamandan bağımsız bir domain kavramıdır.
2. Her dünya kendi saatine ve zaman politikasına sahiptir.
3. Dünya durumu tek büyük JSONB nesnesi olarak tutulmaz.
4. Güncel durum ve tarihçe birbirinden ayrılır.
5. Simülasyon her varlık için aynı yoğunlukta çalışmaz.
6. Simülasyon önceliği; yakınlık, aktif hikâye bağlantısı, yaralanma, hedef, ilişki ve olay önemine göre belirlenir.
7. Kullanıcının son girişinden sonraki en fazla 10 gün değerlendirilir.
8. 10 günlük aralık boyunca simülasyon yoğunluğu kademeli azalır.
9. 10 günü aşan süre için dünya otomatik olarak sınırsız ilerletilmez.
10. Uzun aradan sonra kullanıcıyı şaşırtacak aşırı değişimlerden kaçınılır.
11. Her simulation run deterministik bir giriş özeti ve idempotency anahtarı taşır.
12. Dünya değişiklikleri append-only event ve state projection yaklaşımıyla kaydedilir.
13. Snapshot, event geçmişinin yerine geçmez.
14. Kritik world state değişiklikleri optimistic concurrency ile korunur.
15. Hikâye sonuçları doğrudan dünya tablolarını değiştirmez; doğrulanmış commit süreci kullanır.
16. Simülasyon sırasında üretilen etkiler validation katmanından geçer.
17. Çevre, toplum, NPC ve olay simülasyonları ayrı domain modülleri olabilir; ancak ortak simulation run altında koordine edilir.

---

## 3. Aggregate Sınırları

### `WorldState` Aggregate

Şunları yönetir:

- güncel dünya durumu;
- aktif mevsim;
- genel çevresel göstergeler;
- ana politikalar;
- durum sürümü;
- son simülasyon zamanı;
- aktif snapshot referansı;
- concurrency sürümü.

### `WorldClock` Aggregate

Şunları yönetir:

- dünya içi tarih ve saat;
- zaman ölçeği;
- pause/freeze durumu;
- son gerçek zaman referansı;
- maksimum ilerleme politikası;
- yoğunluk azaltma profili.

### `SimulationRun` Aggregate

Şunları yönetir:

- simülasyon başlangıcı;
- kapsanan gerçek zaman aralığı;
- kapsanan dünya zamanı aralığı;
- seçilen varlıklar;
- uygulanan simülasyon yoğunluğu;
- üretilen etkiler;
- başarı veya hata;
- recovery bilgisi;
- idempotency.

### `WorldEvent` Aggregate

Şunları yönetir:

- dünyada gerçekleşen olay;
- kapsam;
- önem;
- başlangıç ve bitiş;
- etki vektörü;
- yayılım;
- görünürlük;
- hikâye fırsatı üretimi.

---

## 4. Ana Dünya Durumu Tablosu

### `world.world_states`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| id | uuid | evet | World state kimliği |
| world_id | uuid | evet | Dünya |
| state_schema_version | integer | evet | Durum şeması sürümü |
| lifecycle_status | text | evet | active, paused, frozen, archived |
| season_key | text | hayır | Aktif mevsim |
| global_condition_vector | jsonb | evet | Genel dünya koşulları |
| active_snapshot_id | uuid | hayır | Güncel snapshot |
| last_simulation_run_id | uuid | hayır | Son başarılı simülasyon |
| last_simulated_world_time | timestamptz | hayır | Son dünya zamanı |
| last_simulated_real_time | timestamptz | hayır | Son gerçek zaman |
| freeze_reason | text | hayır | Dondurma nedeni |
| metadata | jsonb | evet | Sürümlemeli ek bilgiler |
| created_at | timestamptz | evet | Oluşturulma |
| updated_at | timestamptz | evet | Güncelleme |
| archived_at | timestamptz | hayır | Arşiv |
| version | integer | evet | Optimistic concurrency |

```text
UNIQUE (world_id)
```

`global_condition_vector` örnek alanları:

```text
stability
danger
prosperity
hope
tension
mystery
ecological_balance
social_cohesion
resource_pressure
```

---

## 5. Dünya Saati

### `world.world_clocks`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Saat kimliği |
| world_id | uuid | Dünya |
| current_world_time | timestamptz | Güncel dünya zamanı |
| last_real_time_anchor | timestamptz | Son gerçek zaman referansı |
| time_scale | numeric | Gerçek zaman / dünya zamanı oranı |
| progression_mode | text | realtime, session_based, manual, frozen |
| is_paused | boolean | Duraklatılmış mı |
| max_catchup_days | smallint | Maksimum telafi günü |
| freeze_after_days | smallint | Otomatik dondurma eşiği |
| decay_profile | jsonb | Yoğunluk azaltma profili |
| timezone_id | text | Dünya içi saat dilimi |
| calendar_schema_version | integer | Takvim şeması |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (world_id)
```

Varsayılan politika:

```text
max_catchup_days = 10
freeze_after_days = 10
```

---

## 6. 10 Günlük Yoğunluğu Azalan İlerleme Politikası

Kullanıcının son etkileşimi ile mevcut giriş arasındaki süre hesaplanır.

Önerilen yoğunluk profili:

| Gün Aralığı | Simülasyon Yoğunluğu | Açıklama |
|---|---:|---|
| 0–1 gün | 1.00 | Yüksek ayrıntı |
| 1–3 gün | 0.75 | Yakın ve önemli varlıklar |
| 3–5 gün | 0.50 | Önemli olaylar ve hedefler |
| 5–7 gün | 0.30 | Yalnızca kritik değişimler |
| 7–10 gün | 0.15 | Özet düzeyde ilerleme |
| 10+ gün | 0.00 | Dünya dondurulur |

Bu değerler yapılandırılabilir olmalıdır.

Amaç:

- dünya tamamen statik görünmesin;
- kullanıcı dönüşünde aşırı yabancılaşma oluşmasın;
- binlerce gereksiz arka plan hesaplaması yapılmasın;
- önemli yaralanma, söz, tehlike ve aktif olaylar unutulmasın.

---

## 7. Zaman İlerleme Kayıtları

### `world.world_time_advancements`

Append-only tablo:

```text
id
world_id
simulation_run_id
from_world_time
to_world_time
real_elapsed_seconds
world_elapsed_seconds
applied_catchup_days
discarded_elapsed_days
progression_mode
decay_profile_used
created_at
```

`discarded_elapsed_days`, 10 günlük eşik sonrasında ilerletilmeyen süreyi gösterir.

---

## 8. Bölge Durumu

### `world.region_states`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Bölge durum kimliği |
| world_id | uuid | Dünya |
| region_id | uuid | Bölge |
| state_schema_version | integer | Şema sürümü |
| accessibility_status | text | open, restricted, blocked, dangerous |
| environment_vector | jsonb | Çevresel durum |
| social_vector | jsonb | Sosyal durum |
| economic_vector | jsonb | Ekonomik durum |
| danger_vector | jsonb | Tehlike durumu |
| discovery_status | text | unknown, rumored, discovered, explored |
| active_event_count | integer | Aktif olay sayısı |
| last_changed_at | timestamptz | Son anlamlı değişim |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (region_id)
```

---

## 9. Konum Durumu

### `world.location_states`

```text
id
world_id
location_id
region_id
accessibility_status
occupancy_level
safety_level
resource_level
weather_state
environment_state
social_state
active_event_count
discovery_status
last_visited_at
last_simulated_at
updated_at
version
```

Örnek kullanım:

- köprü yıkılmış;
- mağara yolu kapanmış;
- köy pazarı kurulmuş;
- liman sisli;
- ormanda yangın riski artmış;
- festival hazırlıkları başlamış.

---

## 10. Çevresel Durum Modeli

### `world.environmental_states`

```text
id
world_id
scope_type
scope_id
climate_vector
weather_vector
ecology_vector
resource_vector
hazard_vector
effective_from
effective_until
source_event_id
updated_at
version
```

Scope türleri:

```text
world
region
location
biome
```

Örnek boyutlar:

```text
temperature
humidity
wind
rainfall
visibility
vegetation_health
water_level
animal_activity
pollution
fire_risk
flood_risk
```

---

## 11. Mevsim ve Takvim

### `world.world_seasons`

```text
id
world_id
season_key
display_name
start_rule
end_rule
environment_modifiers
cultural_modifiers
ecology_modifiers
is_active
created_at
updated_at
```

### `world.world_calendar_events`

```text
id
world_id
calendar_event_type
title
recurrence_rule
region_id
location_id
starts_at_world_time
ends_at_world_time
visibility
event_template
created_at
updated_at
```

Örnekler:

- hasat festivali;
- meteor yağmuru;
- deniz kaplumbağalarının göçü;
- uzun gece;
- çiçeklenme dönemi.

---

## 12. Simulation Run Tablosu

### `simulation.simulation_runs`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Run kimliği |
| world_id | uuid | Dünya |
| trigger_type | text | login, scheduled, story_commit, manual, recovery |
| status | text | created, planning, running, validating, committed, failed |
| real_time_from | timestamptz | Gerçek zaman başlangıcı |
| real_time_to | timestamptz | Gerçek zaman bitişi |
| world_time_from | timestamptz | Dünya zamanı başlangıcı |
| world_time_to | timestamptz | Dünya zamanı bitişi |
| requested_elapsed_days | numeric | Talep edilen süre |
| applied_elapsed_days | numeric | Uygulanan süre |
| simulation_intensity | numeric | Genel yoğunluk |
| planner_version | text | Planlayıcı sürümü |
| ruleset_version | text | Kural seti |
| random_seed | bigint | Deterministik seed |
| input_hash | text | Girdi özeti |
| idempotency_key | text | Tekrarlı run koruması |
| result_summary | jsonb | Sonuç özeti |
| failure_reason | text | Hata |
| started_at | timestamptz | Başlangıç |
| completed_at | timestamptz | Tamamlanma |
| created_at | timestamptz | Oluşturulma |

```text
UNIQUE (world_id, idempotency_key)
```

---

## 13. Simülasyon Planı

### `simulation.simulation_plans`

```text
id
simulation_run_id
plan_version
entity_selection_summary
priority_bands
time_slices
planned_modules
estimated_operation_count
estimated_cost
created_at
```

Plan şunları belirler:

- hangi karakterler simüle edilecek;
- hangi bölgeler değerlendirilecek;
- hangi aktif olaylar ilerletilecek;
- hangi hedefler kontrol edilecek;
- hangi çevresel modeller çalıştırılacak;
- hangi zaman diliminde hangi yoğunluk kullanılacak.

---

## 14. Simülasyon Varlık Seçimi

### `simulation.simulation_targets`

```text
id
simulation_run_id
target_type
target_id
priority_score
relevance_score
proximity_score
urgency_score
time_sensitivity_score
story_connection_score
selected_detail_level
selection_reason
status
created_at
```

Detail seviyeleri:

```text
skip
summary
light
standard
detailed
critical
```

Örnek:

- uzak ve sağlıklı tilki: `skip` veya `summary`;
- yaralı tilki: `critical`;
- çocuğun dedesi ve aktif söylenti: `detailed`;
- alakasız uzak esnaf: `light` veya `skip`.

---

## 15. Simülasyon Modülleri

Önerilen modüller:

```text
character_state
npc_intention
routine_progression
relationship_decay
memory_reinforcement
environment
ecology
settlement
economy
culture
calendar
world_event
rumor_propagation
condition_progression
```

### `simulation.simulation_module_runs`

```text
id
simulation_run_id
module_key
module_version
status
input_hash
output_hash
operation_count
started_at
completed_at
failure_reason
result_summary
```

Bu yapı modül bazında recovery sağlar.

---

## 16. Simülasyon Etkileri

### `simulation.simulation_effects`

```text
id
simulation_run_id
module_run_id
effect_key
effect_type
target_type
target_id
operation
requested_payload
resolved_payload
priority
confidence
validation_status
application_status
conflict_policy
source_reference
created_at
updated_at
```

Durumlar:

```text
generated
validated
rejected
queued
applied
failed
```

Effect örnekleri:

- karakter duygusunu güncelle;
- yaralanma şiddetini artır;
- rutin durumunu değiştir;
- bölge güvenliğini azalt;
- çevresel durumu değiştir;
- söylenti üret;
- dünya olayı başlat;
- aktif hedefi ilerlet;
- etkinlik hazırlığını artır.

---

## 17. Effect Validation

### `simulation.simulation_effect_validations`

```text
id
simulation_effect_id
validator_key
status
severity
message
details
created_at
```

Validation türleri:

```text
schema
ownership
world_scope
time_consistency
business_rule
safety
conflict
novelty
continuity
```

Bir effect validation başarısız olursa:

- effect reddedilebilir;
- daha düşük şiddete indirilebilir;
- manual review kuyruğuna alınabilir;
- alternatif effect üretilebilir.

---

## 18. World State Event Store

### `world.world_state_events`

Append-only tablo:

```text
id
world_id
event_sequence
event_type
aggregate_type
aggregate_id
payload
metadata
source_type
source_id
correlation_id
causation_id
effective_world_time
recorded_at
idempotency_key
```

```text
UNIQUE (world_id, event_sequence)
UNIQUE (world_id, idempotency_key)
```

Bu tablo:

- audit;
- projection rebuild;
- simulation recovery;
- story outcome commit;
- conflict analysis;
- temporal debugging

amaçlarıyla kullanılır.

---

## 19. World Event Modeli

### `world.world_events`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Olay kimliği |
| world_id | uuid | Dünya |
| event_type | text | ecology, social, danger, discovery, culture vb. |
| title | text | Başlık |
| summary | text | Özet |
| scope_type | text | world, region, location, character_group |
| scope_id | uuid | Kapsam |
| importance | numeric | Önem |
| urgency | numeric | Aciliyet |
| visibility | text | hidden, rumored, known, public |
| lifecycle_status | text | planned, active, resolved, expired, cancelled |
| effect_vector | jsonb | Etki boyutları |
| starts_at_world_time | timestamptz | Başlangıç |
| ends_at_world_time | timestamptz | Bitiş |
| source_type | text | simulation, story, calendar, admin |
| source_id | uuid | Kaynak |
| story_opportunity_score | numeric | Hikâye fırsatı |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

---

## 20. Olay Yayılımı

### `world.world_event_propagations`

```text
id
world_event_id
from_scope_type
from_scope_id
to_scope_type
to_scope_id
propagation_type
intensity
delay_seconds
status
scheduled_at
applied_at
created_at
```

Örnek:

- fırtına kıyıdan iç bölgeye ilerler;
- söylenti köyden pazara yayılır;
- festival yakın köylere duyurulur;
- su seviyesi aşağı vadide artar;
- dağ geçidindeki çökme ticareti etkiler.

---

## 21. Arka Plan Yaşamı

### `simulation.background_life_states`

```text
id
world_id
scope_type
scope_id
activity_vector
social_activity
economic_activity
ecological_activity
danger_activity
story_opportunity_activity
last_updated_at
version
```

Bu tablo ayrıntılı entity state yerine bölgesel özet taşır.

Düşük öncelikli bölgeler için tam simülasyon yerine bu özet güncellenebilir.

---

## 22. Relevance-Based Simulation

Relevance score önerilen bileşenleri:

```text
proximity_weight
active_story_weight
relationship_weight
injury_weight
goal_weight
event_weight
memory_weight
time_sensitivity_weight
narrative_importance_weight
```

Örnek formül:

```text
relevance_score =
  proximity * 0.20 +
  active_story * 0.20 +
  relationship * 0.15 +
  injury * 0.15 +
  goal * 0.10 +
  event * 0.10 +
  memory * 0.05 +
  narrative_importance * 0.05
```

Bu formül sürümlenmeli ve yapılandırılabilir olmalıdır.

---

## 23. Simülasyon Checkpoint'leri

### `simulation.simulation_checkpoints`

```text
id
simulation_run_id
checkpoint_sequence
module_key
world_time
state_projection_hash
last_applied_effect_id
status
created_at
```

Checkpoint:

- uzun run recovery;
- modül hatası sonrası devam;
- duplicate effect engelleme;
- partial commit kontrolü

için kullanılır.

---

## 24. World Snapshot Modeli

### `world.world_state_snapshots`

```text
id
world_id
snapshot_sequence
world_time
state_schema_version
world_state_payload
region_state_payload
location_state_payload
active_event_payload
projection_version
checksum
created_at
```

Snapshot:

- hızlı world load;
- recovery;
- projection rebuild başlangıç noktası;
- migration;
- test fixture

için kullanılır.

Snapshot kaynak gerçek değildir.

---

## 25. Freeze Politikası

Dünya şu durumlarda dondurulabilir:

```text
user_absence_threshold
manual_parent_pause
maintenance
migration
simulation_failure
consistency_violation
safety_intervention
```

### `world.world_freeze_records`

```text
id
world_id
freeze_reason
started_at_real_time
started_at_world_time
ended_at_real_time
ended_at_world_time
initiated_by_type
initiated_by_id
metadata
created_at
```

Freeze sırasında:

- dünya saati ilerlemez;
- rutinler ilerletilmez;
- geçici durumlar bozulmaz;
- kullanıcı döndüğünde bağlam korunur;
- aktif hikâye oturumları ayrı kurallarla yönetilebilir.

---

## 26. Story Outcome Commit Entegrasyonu

Story outcome, dünya değişikliği talebi üretir.

Akış:

```text
story outcome validated
create world commit request
validate world version
resolve target entities
detect conflicts
convert outcome effects to world state events
append events
update projections
create outbox records
commit
```

Bu paket yalnızca gerekli kalıcı altyapıyı tanımlar.

Tam commit orkestrasyonu backlog’daki **Story Outcome & World State Commit System** kapsamında ayrıca ele alınacaktır.

---

## 27. World Commit Request

### `world.world_commit_requests`

```text
id
world_id
source_type
source_id
requested_world_version
status
effect_manifest
validation_report
conflict_report
commit_batch_id
idempotency_key
created_at
validated_at
committed_at
failed_at
failure_reason
```

Durumlar:

```text
created
validating
ready
committing
committed
rejected
conflicted
failed
```

---

## 28. Conflict Detection

Conflict örnekleri:

- aynı karakter durumu iki farklı işlemde güncelleniyor;
- bir location hem açılmış hem kapanmış;
- aynı eşya iki farklı karaktere veriliyor;
- aynı event hem resolved hem extended ediliyor;
- story outcome eski world version üzerinden uygulanıyor.

### `world.world_commit_conflicts`

```text
id
world_commit_request_id
conflict_type
target_type
target_id
existing_state
requested_state
resolution_policy
resolution_status
resolved_payload
created_at
resolved_at
```

Resolution policy:

```text
reject
merge
append
priority_wins
newer_wins
manual_review
domain_specific
```

---

## 29. İndeks Stratejisi

### `world_states`

```text
(world_id)
(lifecycle_status)
(last_simulated_real_time)
```

### `world_clocks`

```text
(world_id)
(last_real_time_anchor)
```

### `region_states`

```text
(world_id, accessibility_status)
(world_id, discovery_status)
(last_changed_at)
```

### `location_states`

```text
(world_id, region_id)
(accessibility_status)
(last_simulated_at)
```

### `simulation_runs`

```text
(world_id, created_at DESC)
(world_id, status)
(idempotency_key)
```

### `simulation_targets`

```text
(simulation_run_id, priority_score DESC)
(target_type, target_id)
```

### `world_events`

```text
(world_id, lifecycle_status, starts_at_world_time)
(scope_type, scope_id, lifecycle_status)
(story_opportunity_score DESC)
```

### `world_state_events`

```text
(world_id, event_sequence)
(aggregate_type, aggregate_id, recorded_at DESC)
(correlation_id)
(source_type, source_id)
```

---

## 30. Partitioning Adayları

Yüksek hacimli tablolar:

```text
world_state_events
simulation_runs
simulation_effects
simulation_module_runs
world_event_propagations
world_state_snapshots
```

Partition seçenekleri:

```text
created_at by month
world_id hash partition
```

İlk sürümde zorunlu değildir.

---

## 31. Transaction Sınırları

### Simulation Run Oluşturma

```text
load world clock
calculate elapsed time
apply 10-day cap
create simulation run
create plan
select targets
create module runs
insert domain event
commit
```

### Simulation Effect Uygulama

```text
lock target aggregate
validate expected version
validate effect
append world state event
update projection
mark effect applied
create outbox message
commit
```

### Simulation Run Tamamlama

```text
verify all mandatory modules
verify no unresolved critical effect
advance world clock
update world state
create snapshot if needed
mark simulation run committed
insert domain events
insert outbox messages
commit
```

### Freeze

```text
lock world clock
set paused/frozen
create freeze record
update world state
insert event
commit
```

---

## 32. Idempotency

İdempotency gerektiren işlemler:

- simulation run creation;
- module execution;
- effect generation;
- effect application;
- snapshot creation;
- world clock advancement;
- story outcome commit;
- world event propagation.

Önerilen anahtarlar:

```text
world_id + trigger_type + time_window
simulation_run_id + module_key
simulation_effect_id
world_commit_request_id
world_event_id + target_scope
```

---

## 33. Optimistic Concurrency

Concurrency uygulanacak başlıca tablolar:

```text
world_states
world_clocks
region_states
location_states
world_events
world_commit_requests
```

Örnek:

```sql
UPDATE world.world_clocks
SET
  current_world_time = :new_time,
  last_real_time_anchor = :real_anchor,
  version = version + 1,
  updated_at = now()
WHERE world_id = :world_id
  AND version = :expected_version;
```

---

## 34. Repository Tasarımı

### `WorldStateRepository`

```text
findByWorldId
updateWithExpectedVersion
freeze
unfreeze
setActiveSnapshot
setLastSimulationRun
```

### `WorldClockRepository`

```text
findByWorldId
calculateCatchupWindow
advance
pause
resume
updateWithExpectedVersion
```

### `SimulationRunRepository`

```text
createRun
findById
findByIdempotencyKey
markRunning
markValidating
markCommitted
markFailed
```

### `WorldEventRepository`

```text
createEvent
findActiveByScope
updateWithExpectedVersion
resolveEvent
expireEvent
```

### Uzman Repository'ler

```text
RegionStateRepository
LocationStateRepository
EnvironmentalStateRepository
SimulationEffectRepository
SimulationCheckpointRepository
WorldSnapshotRepository
WorldCommitRepository
```

---

## 35. Domain Events

Önerilen olaylar:

```text
WorldStateCreated
WorldStateChanged
WorldFrozen
WorldUnfrozen

WorldClockCreated
WorldTimeAdvanced
WorldTimeCatchupCapped
WorldTimeProgressionPaused

SimulationRunCreated
SimulationRunPlanned
SimulationRunStarted
SimulationRunValidated
SimulationRunCommitted
SimulationRunFailed

SimulationTargetSelected
SimulationModuleCompleted
SimulationEffectGenerated
SimulationEffectValidated
SimulationEffectApplied
SimulationEffectRejected

RegionStateChanged
LocationStateChanged
EnvironmentalStateChanged

WorldEventCreated
WorldEventActivated
WorldEventPropagated
WorldEventResolved
WorldEventExpired

WorldSnapshotCreated
WorldCommitRequested
WorldCommitValidated
WorldCommitConflicted
WorldCommitCompleted
WorldCommitRejected
```

---

## 36. Outbox Kullanımları

Transaction sonrası işler:

- world news özeti üretme;
- NPC intention değerlendirme;
- story opportunity üretme;
- ebeveyn özeti üretme;
- harita görünümünü güncelleme;
- embedding üretme;
- notification hazırlama;
- TTS veya görsel kuyruğu oluşturma;
- analytics gönderme;
- simulation anomaly analizi.

---

## 37. Güvenlik ve Tutarlılık

- Tüm world state sorguları world scope ile filtrelenir.
- Story outcome başka dünyaya uygulanamaz.
- Region ve location world sahipliği doğrulanır.
- Simulation effect raw SQL içeremez.
- Effect payload yalnızca izinli domain operation’larını kullanır.
- Random seed audit için saklanır.
- Safety validator kritik event üretimini engelleyebilir.
- Manual override audit log’a yazılır.
- Kullanıcıya ham simulation skorları gösterilmez.
- Çocuk deneyimini bozacak aşırı değişimler sınırlandırılır.

---

## 38. Migration Planı

Migration adı:

```text
0007_world_simulation.sql
```

Aşamalar:

1. `world` ve `simulation` şemalarını oluştur.
2. world state ve clock tablolarını oluştur.
3. time advancement tablolarını oluştur.
4. region ve location state tablolarını oluştur.
5. environmental ve calendar tablolarını oluştur.
6. simulation runs ve plans tablolarını oluştur.
7. targets, modules ve effects tablolarını oluştur.
8. validation ve checkpoints tablolarını oluştur.
9. world state event store oluştur.
10. world events ve propagation tablolarını oluştur.
11. snapshots ve freeze records oluştur.
12. world commit tablolarını oluştur.
13. constraint ve indeksleri ekle.
14. seed data ekle.
15. integration ve concurrency testlerini çalıştır.

---

## 39. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/world/
├── world-states.table.ts
├── world-clocks.table.ts
├── world-time-advancements.table.ts
├── region-states.table.ts
├── location-states.table.ts
├── environmental-states.table.ts
├── world-seasons.table.ts
├── world-calendar-events.table.ts
├── world-state-events.table.ts
├── world-events.table.ts
├── world-event-propagations.table.ts
├── world-state-snapshots.table.ts
├── world-freeze-records.table.ts
├── world-commit-requests.table.ts
├── world-commit-conflicts.table.ts
├── world.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/simulation/
├── simulation-runs.table.ts
├── simulation-plans.table.ts
├── simulation-targets.table.ts
├── simulation-module-runs.table.ts
├── simulation-effects.table.ts
├── simulation-effect-validations.table.ts
├── simulation-checkpoints.table.ts
├── background-life-states.table.ts
├── simulation.relations.ts
└── index.ts
```

---

## 40. Test Gereksinimleri

Zorunlu testler:

- world state oluşturma;
- world clock oluşturma;
- 10 günlük catchup cap;
- 10 gün sonrası freeze davranışı;
- decay profile hesaplama;
- aynı run için idempotency;
- deterministik random seed;
- simulation target selection;
- yaralı karakterin yüksek öncelik alması;
- uzak ilgisiz NPC’nin skip edilmesi;
- region state güncelleme;
- location accessibility değişimi;
- environmental state progression;
- simulation effect validation;
- invalid world scope reddi;
- effect conflict;
- optimistic concurrency conflict;
- partial module failure recovery;
- checkpoint resume;
- snapshot checksum;
- world event propagation;
- event expiration;
- story outcome world commit request;
- eski world version ile commit conflict;
- freeze ve unfreeze;
- domain event ve outbox atomikliği;
- event store sequence tekilliği.

---

## 41. Acceptance Criteria

Paket 08 şu koşullarda tamamlanmış kabul edilir:

1. Dünya zamanı kalıcı ve bağımsız modellenmiştir.
2. Dünya başına tek clock bulunur.
3. 10 günlük catchup sınırı uygulanır.
4. Yoğunluk zamanla kademeli azalır.
5. 10 gün sonrasında otomatik sınırsız ilerleme yapılmaz.
6. Dünya, bölge ve konum durumları ayrıdır.
7. Çevresel durumlar kapsam bazlı modellenir.
8. Simulation run ve module run izlenebilir.
9. Varlık seçimi relevance skoruna göre yapılır.
10. Simülasyon effect’leri validation’dan geçer.
11. World state event’leri append-only tutulur.
12. Snapshot ve checkpoint recovery için kullanılır.
13. World event ve propagation desteklenir.
14. Freeze politikası kalıcıdır.
15. Story outcome commit talebi modellenmiştir.
16. Conflict detection altyapısı vardır.
17. Optimistic concurrency uygulanır.
18. Idempotency kritik işlemlerde korunur.
19. Domain event ve outbox atomik çalışır.
20. Migration ve Drizzle dosya yapısı tanımlıdır.
21. Integration, recovery ve concurrency testleri tanımlıdır.
22. Kullanıcı dönüşünde aşırı ve anlamsız dünya değişimi engellenir.

---

## 42. Paket 08 Özeti

Paket 08 ile LUMI’nin yaşayan dünya kalıcılık altyapısı kesinleşmiştir.

Bu tasarım sayesinde:

- dünya kullanıcı yokken kontrollü biçimde ilerler;
- her varlık aynı maliyetle simüle edilmez;
- önemli, yakın, yaralı veya hikâyeyle ilişkili varlıklar öncelik kazanır;
- uzak ve ilgisiz varlıklar özet veya skip seviyesinde tutulur;
- en fazla 10 günlük zaman hesaplanır;
- uzun aralarda dünya dondurularak kullanıcı bağlamı korunur;
- çevre, bölgeler, konumlar ve dünya olayları kalıcı biçimde değişebilir;
- simulation run’lar denetlenebilir ve tekrar üretilebilir olur;
- story outcome etkileri güvenli world commit sürecine hazırlanır;
- snapshot, event store ve checkpoint ile recovery mümkün hale gelir.

---

## 43. Sonraki Paket

**Paket 09 — Inventory, Items, Ownership & Asset Persistence Schema**

Kapsam:

- item definitions;
- item instances;
- ownership;
- inventory containers;
- equipping;
- item state;
- durability;
- story item selection;
- transfers;
- reservations;
- discoveries;
- item memories;
- generated images and media assets;
- asset reuse and cost metadata.
