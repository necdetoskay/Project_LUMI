# Project LUMI — Persistence Implementation
# Paket 13 — Analytics, Telemetry, Product Metrics & Observability Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM
- **Bağımlılıklar:** Paket 01–12
- **Ana Aggregate'ler:** ProductEvent, MetricDefinition, MetricSnapshot, Funnel, Cohort, AlertRule, TraceReference
- **Kapsam:** Ürün analitiği, hikâye etkileşimi, seçim analizi, ebeveyn dashboard metrikleri, feature usage, cost analytics, telemetry, alerting, privacy-aware measurement ve retention

---

## 1. Paket Amacı

Bu paket, Project LUMI’nin ürün davranışını, hikâye deneyimini, sistem sağlığını, maliyet yapısını ve kullanıcı etkileşimlerini güvenli ve ölçülebilir biçimde takip etmek için gereken persistence modelini tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- ürün event’leri;
- hikâye başlatma, sürdürme ve tamamlama davranışları;
- seçim noktası etkileşimleri;
- anlatı terk oranları;
- oturum süresi;
- ebeveyn dashboard metrikleri;
- yaşa uygun öğrenme ve yansıtma metrikleri;
- feature adoption;
- funnel ve cohort analizi;
- retention ölçümü;
- AI maliyet analitiği;
- operasyonel telemetry;
- metric aggregation;
- trace ve span referansları;
- alert rule persistence;
- privacy-aware analytics;
- sampling;
- data minimization;
- anonimleştirme;
- veri saklama ve arşivleme.

---

## 2. Temel Tasarım Kararları

1. Product analytics ile operational telemetry ayrı şemalarda tutulur.
2. Analytics event’leri domain source of truth değildir.
3. Event payload’ları minimum veri prensibine uyar.
4. Çocuk profili için ham kişisel veri analytics tablosuna kopyalanmaz.
5. Analytics kimlikleri pseudonymous olmalıdır.
6. Ebeveyn dashboard metrikleri çocukları karşılaştırmak için kullanılmaz.
7. Öğrenme metrikleri tanı veya akademik teşhis amacı taşımaz.
8. Ürün event’leri append-only çalışır.
9. Metric definition sürümlenir.
10. Aggregation sonucu ham event’ten ayrıdır.
11. Maliyet analitiği Paket 12’deki cost records üzerinden beslenir.
12. Operational metric’ler merkezi monitoring sisteminin yerine geçmez.
13. Trace ve span gövdeleri DB’de tutulmaz; referansları tutulur.
14. Alert rule değerlendirmeleri audit edilebilir.
15. Sampling oranı event türüne göre yönetilir.
16. Hassas event’ler için tam payload yerine sınıflandırılmış metadata tutulur.
17. Funnel ve cohort tanımları sürümlenir.
18. Retention ölçümü kullanıcı mahremiyetine uygun şekilde yapılır.
19. Analytics export ve deletion işlemleri privacy policy ile entegredir.
20. Sistem metrikleri ve ürün metrikleri aynı dashboard’da gösterilebilir ancak aynı veri anlamına gelmez.

---

## 3. Şema Ayrımı

Önerilen PostgreSQL şemaları:

```text
analytics
telemetry
observability
```

### `analytics`

Ürün davranışı ve kullanıcı etkileşimleri.

### `telemetry`

Sistem bileşenleri, performans, kuyruk ve kullanım ölçümleri.

### `observability`

Alert, incident, trace ve değerlendirme kayıtları.

---

## 4. Product Event Modeli

### `analytics.product_events`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Event kimliği |
| event_name | text | Event adı |
| event_version | integer | Şema sürümü |
| occurred_at | timestamptz | Olay zamanı |
| received_at | timestamptz | Sisteme geliş |
| user_pseudonym | text | Pseudonymous kullanıcı |
| child_profile_pseudonym | text | Pseudonymous çocuk profili |
| world_id | uuid | Dünya |
| story_session_id | uuid | Hikâye oturumu |
| story_id | uuid | Hikâye |
| scene_id | uuid | Sahne |
| choice_id | uuid | Seçim |
| feature_key | text | Feature |
| platform | text | web, mobile, tablet |
| app_version | text | Uygulama sürümü |
| locale | text | Dil |
| session_id | uuid | Ürün oturumu |
| correlation_id | uuid | İşlem zinciri |
| event_properties | jsonb | Minimum özellikler |
| sampling_rate | numeric | Örnekleme oranı |
| privacy_class | text | Veri sınıfı |
| created_at | timestamptz | Kayıt zamanı |

---

## 5. Product Event Kategorileri

```text
session
story
scene
choice
inventory
map
character
audio
image
parent_dashboard
learning_prompt
feature_usage
generation
cost
error
notification
```

---

## 6. Temel Ürün Event’leri

Önerilen event isimleri:

```text
app_opened
session_started
session_ended

story_creation_started
story_creation_completed
story_opened
story_started
story_paused
story_resumed
story_completed
story_abandoned

scene_opened
scene_completed
scene_replayed

choice_presented
choice_selected
choice_changed
choice_skipped
choice_timeout

inventory_opened
item_selected_for_story
item_used
item_removed

world_map_opened
region_selected
location_selected
world_news_opened

audio_started
audio_paused
audio_completed

parent_dashboard_opened
parent_summary_viewed
parent_setting_changed

reflection_question_presented
reflection_answered
reflection_skipped

generation_started
generation_completed
generation_failed

feature_discovered
feature_first_used
feature_reused
```

---

## 7. Event Property Kuralları

Event property içinde:

- açık metin çocuk cevabı;
- tam hikâye metni;
- ebeveyn notu;
- kişisel isim;
- tam prompt;
- secret;
- provider token;
- tam cihaz bilgisi

tutulmamalıdır.

Bunun yerine:

```text
answer_length
answer_category
story_length_bucket
choice_category
age_band
device_class
model_tier
cost_bucket
```

gibi sınıflandırılmış alanlar kullanılmalıdır.

---

## 8. Analytics Identity Modeli

### `analytics.analytics_identities`

```text
id
identity_type
pseudonym
source_scope
source_reference_hash
created_at
rotated_at
expires_at
status
```

Kimlik türleri:

```text
user
child_profile
device
anonymous_session
```

Analytics tablosu gerçek kullanıcı kimliğini doğrudan içermez.

---

## 9. Pseudonym Rotation

Pseudonym:

- privacy policy değişiminde;
- hesap silme işleminde;
- güvenlik olayı sonrasında;
- belirli retention periyotlarında

yenilenebilir.

Eski ve yeni pseudonym arasında doğrudan public ilişki tutulmamalıdır.

---

## 10. Story Engagement Session

### `analytics.story_engagement_sessions`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Engagement kaydı |
| story_session_id | uuid | Story session |
| child_profile_pseudonym | text | Pseudonym |
| started_at | timestamptz | Başlangıç |
| completed_at | timestamptz | Bitiş |
| active_duration_seconds | integer | Aktif süre |
| idle_duration_seconds | integer | Boşta süre |
| scenes_viewed | integer | Görülen sahne |
| scenes_completed | integer | Tamamlanan |
| choices_presented | integer | Sunulan seçim |
| choices_selected | integer | Seçilen |
| replay_count | integer | Tekrar |
| pause_count | integer | Duraklatma |
| completion_status | text | completed, abandoned, paused, expired |
| abandonment_scene_id | uuid | Terk sahnesi |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

---

## 11. Engagement Metrikleri

Önerilen metrikler:

```text
story_start_rate
story_completion_rate
story_abandonment_rate
average_active_duration
average_scene_duration
choice_participation_rate
scene_replay_rate
audio_completion_rate
reflection_answer_rate
return_to_world_rate
continue_story_rate
```

---

## 12. Story Abandonment Analizi

Abandonment nedeni doğrudan varsayılmamalıdır.

Saklanabilecek sinyaller:

```text
last_scene_type
last_interaction_type
generation_latency_bucket
error_present
audio_enabled
choice_count_before_exit
session_idle_before_exit
```

Sebep analizi inference olarak işaretlenmelidir.

---

## 13. Choice Analytics

### `analytics.choice_interactions`

```text
id
story_session_id
scene_id
choice_set_id
choice_id
child_profile_pseudonym
presented_at
selected_at
decision_duration_ms
selection_order
was_changed
preview_shown
hint_shown
consequence_preview_shown
result_category
created_at
```

---

## 14. Choice Metrikleri

```text
choice_selection_distribution
average_decision_time
choice_change_rate
hint_usage_rate
preview_usage_rate
choice_skip_rate
choice_consequence_followup_rate
```

Bu metrikler çocuk kişiliği veya karakteri hakkında kesin hüküm üretmek için kullanılmaz.

---

## 15. Reflection ve Learning Metrics

### `analytics.reflection_interactions`

```text
id
story_session_id
question_id
question_type
child_profile_pseudonym
presented_at
answered_at
response_mode
response_length
answer_category
skipped
parent_visible
created_at
```

Question type:

```text
comprehension
emotion
prediction
cause_effect
ethical_reflection
creative_extension
```

---

## 16. Öğrenme Metrikleri Sınırları

Bu metrikler:

- çocuğa tanı koymaz;
- zekâ skoru üretmez;
- okul başarısı tahmini yapmaz;
- kardeşler veya diğer çocuklarla kıyaslama yapmaz;
- ebeveyne kesin gelişim yargısı sunmaz.

Kullanım amacı:

- hangi soru türlerinin ilgi çektiğini görmek;
- yaşa uygun içerik tasarımını iyileştirmek;
- ebeveyne hikâye deneyimi özeti sunmak;
- tekrar eden ilgi alanlarını gözlemlemek.

---

## 17. Parent Dashboard Metrics

### `analytics.parent_dashboard_metric_snapshots`

```text
id
parent_user_pseudonym
child_profile_pseudonym
period_start
period_end
stories_started
stories_completed
active_story_minutes
favorite_story_categories
most_used_characters
most_selected_regions
reflection_participation_rate
audio_usage_rate
cost_amount_try
generated_at
```

Metrikler açıklayıcıdır; performans puanı değildir.

---

## 18. Feature Usage

### `analytics.feature_usage_daily`

```text
id
usage_date
feature_key
user_pseudonym
child_profile_pseudonym
first_used_at
last_used_at
usage_count
active_duration_seconds
success_count
failure_count
created_at
updated_at
```

---

## 19. Feature Adoption Metrikleri

```text
discovery_rate
first_use_rate
repeat_use_rate
seven_day_reuse_rate
feature_success_rate
feature_failure_rate
time_to_first_use
```

---

## 20. Funnel Definition

### `analytics.funnel_definitions`

```text
id
funnel_key
display_name
version_number
scope_type
step_definitions
status
created_at
updated_at
```

Örnek funnel:

```text
app_opened
-> world_selected
-> story_started
-> first_scene_completed
-> first_choice_selected
-> story_completed
```

---

## 21. Funnel Run

### `analytics.funnel_runs`

```text
id
funnel_definition_id
period_start
period_end
segment_definition
total_entries
step_results
conversion_rate
generated_at
```

---

## 22. Funnel Step Result

### `analytics.funnel_step_results`

```text
id
funnel_run_id
step_order
step_key
entered_count
completed_count
dropoff_count
conversion_from_previous
conversion_from_start
created_at
```

---

## 23. Cohort Definition

### `analytics.cohort_definitions`

```text
id
cohort_key
display_name
version_number
entry_condition
segment_definition
status
created_at
updated_at
```

Örnek cohort’lar:

```text
first_story_completed_week
first_world_created_month
first_audio_story_used_week
first_interactive_story_completed
```

---

## 24. Cohort Membership

### `analytics.cohort_memberships`

```text
id
cohort_definition_id
user_pseudonym
child_profile_pseudonym
cohort_period
entered_at
created_at
```

---

## 25. Retention Metric

### `analytics.retention_snapshots`

```text
id
cohort_definition_id
cohort_period
retention_day
eligible_count
returned_count
retention_rate
generated_at
```

Retention yalnızca ürün kullanım davranışını gösterir.

---

## 26. Metric Definition

### `analytics.metric_definitions`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Metric |
| metric_key | text | Anahtar |
| display_name | text | İsim |
| description | text | Açıklama |
| metric_type | text | counter, gauge, ratio, duration, currency |
| source_type | text | event, table, derived |
| calculation_expression | jsonb | Hesap |
| aggregation_type | text | sum, avg, min, max, percentile, distinct |
| dimensions | jsonb | Boyutlar |
| privacy_class | text | Veri sınıfı |
| version_number | integer | Sürüm |
| status | text | draft, active, retired |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (metric_key, version_number)
```

---

## 27. Metric Snapshot

### `analytics.metric_snapshots`

```text
id
metric_definition_id
period_start
period_end
scope_type
scope_id
dimension_values
numeric_value
numerator
denominator
sample_count
sampling_rate
generated_at
```

---

## 28. Metric Aggregation Job

### `analytics.metric_aggregation_runs`

```text
id
aggregation_key
period_start
period_end
status
source_watermark
processed_event_count
output_snapshot_count
started_at
completed_at
failure_reason
created_at
```

---

## 29. Aggregation Watermark

### `analytics.aggregation_watermarks`

```text
id
aggregation_key
last_event_occurred_at
last_event_id
updated_at
```

Aggregation resumable olmalıdır.

---

## 30. Cost Analytics

Paket 12’deki:

```text
ai_cost_records
ai_usage_records
cost_previews
budget_consumptions
```

tablolarından üretilir.

### `analytics.cost_metric_snapshots`

```text
id
period_start
period_end
scope_type
scope_id
generation_type
model_id
provider_id
request_count
actual_cost_try
estimated_cost_try
cost_variance_try
cache_savings_try
reuse_savings_try
average_cost_per_story_try
generated_at
```

---

## 31. Cost Metrikleri

```text
daily_ai_cost_try
monthly_ai_cost_try
average_story_cost_try
average_image_cost_try
average_tts_cost_try
cost_per_completed_story_try
cache_savings_try
fallback_cost_impact_try
premium_model_usage_rate
preview_accuracy_rate
```

---

## 32. Operational Telemetry Event

### `telemetry.telemetry_events`

```text
id
component_name
event_name
severity
occurred_at
trace_id
span_id
correlation_id
world_id
operation_name
duration_ms
status
error_class
attributes
sampling_rate
created_at
```

---

## 33. Operational Metric Series

### `telemetry.metric_series`

```text
id
metric_key
component_name
scope_type
scope_id
dimensions
unit
metric_kind
created_at
```

Metric kind:

```text
counter
gauge
histogram
summary
```

---

## 34. Operational Metric Point

### `telemetry.metric_points`

```text
id
metric_series_id
numeric_value
bucket_values
count_value
sum_value
captured_at
created_at
```

Yüksek hacimde zaman serisi veritabanı veya monitoring platformu tercih edilebilir.

PostgreSQL kısa süreli persistence ve audit amacıyla kullanılabilir.

---

## 35. Temel Operasyonel Metrikler

```text
api_request_count
api_error_rate
api_latency_p50
api_latency_p95
api_latency_p99
db_query_latency
db_connection_usage
outbox_lag_seconds
job_queue_depth
job_oldest_age_seconds
job_failure_rate
dlq_open_count
generation_latency
generation_failure_rate
provider_rate_limit_count
simulation_duration
projection_lag
cache_hit_rate
backup_age_seconds
```

---

## 36. Trace Reference

### `observability.trace_references`

```text
id
trace_id
root_span_id
correlation_id
operation_name
component_name
status
started_at
completed_at
duration_ms
external_trace_url
retention_until
created_at
```

DB’de tam trace body tutulmaz.

---

## 37. Span Reference

### `observability.span_references`

```text
id
trace_reference_id
span_id
parent_span_id
operation_name
component_name
status
duration_ms
external_span_url
created_at
```

---

## 38. Error Occurrence

### `observability.error_occurrences`

```text
id
error_fingerprint
error_class
error_code
component_name
operation_name
severity
trace_id
correlation_id
world_id
message_template
occurrence_count
first_seen_at
last_seen_at
status
created_at
updated_at
```

Aynı hata fingerprint altında gruplanabilir.

---

## 39. Error Sample

### `observability.error_samples`

```text
id
error_occurrence_id
trace_id
sanitized_context
stack_trace_reference
occurred_at
created_at
```

Hassas context sanitize edilmelidir.

---

## 40. Alert Rule

### `observability.alert_rules`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Alert |
| alert_key | text | Teknik anahtar |
| display_name | text | İsim |
| metric_key | text | Metric |
| condition_operator | text | gt, gte, lt, lte, equals, absent |
| threshold_value | numeric | Eşik |
| evaluation_window_seconds | integer | Pencere |
| minimum_sample_count | integer | Min örnek |
| severity | text | info, warning, critical |
| cooldown_seconds | integer | Cooldown |
| scope_filter | jsonb | Scope |
| status | text | active, paused, retired |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

---

## 41. Alert Evaluation

### `observability.alert_evaluations`

```text
id
alert_rule_id
window_start
window_end
observed_value
threshold_value
evaluation_result
sample_count
evaluated_at
created_at
```

---

## 42. Alert Instance

### `observability.alert_instances`

```text
id
alert_rule_id
deduplication_key
status
severity
first_triggered_at
last_triggered_at
resolved_at
acknowledged_by
acknowledged_at
occurrence_count
linked_incident_id
created_at
updated_at
```

Durumlar:

```text
open
acknowledged
suppressed
resolved
closed
```

---

## 43. Alert Delivery

### `observability.alert_deliveries`

```text
id
alert_instance_id
channel_type
destination_reference
status
attempt_count
last_error
sent_at
created_at
```

Kanallar:

```text
email
push
telegram
webhook
admin_dashboard
```

Webhook desteği ürün altyapısı izin verirse kullanılır.

---

## 44. Sampling Policy

### `telemetry.sampling_policies`

```text
id
policy_key
event_type
component_name
base_sampling_rate
error_sampling_rate
slow_request_sampling_rate
slow_request_threshold_ms
status
created_at
updated_at
```

Öneri:

- kritik error event: %100;
- security event: %100;
- normal request: düşük oran;
- yüksek gecikme: yükseltilmiş oran;
- health check: agregasyon bazlı.

---

## 45. Privacy Classification

Önerilen sınıflar:

```text
public
internal
pseudonymous
child_sensitive
parent_private
security_sensitive
```

Analytics event’leri varsayılan olarak:

```text
pseudonymous
```

olmalıdır.

---

## 46. Privacy Consent State

### `analytics.analytics_consent_states`

```text
id
user_id
consent_type
status
policy_version
granted_at
withdrawn_at
created_at
updated_at
```

Consent type:

```text
essential_analytics
product_improvement
personalized_insights
research_export
```

Zorunlu olmayan analytics, consent durumuna göre filtrelenir.

---

## 47. Analytics Deletion Request

### `analytics.analytics_deletion_requests`

```text
id
user_id
requested_at
status
affected_pseudonyms
processing_job_id
completed_at
verification_result
created_at
```

---

## 48. Analytics Export Request

### `analytics.analytics_export_requests`

```text
id
user_id
requested_at
status
export_scope
storage_reference
expires_at
completed_at
created_at
```

---

## 49. Data Minimization Rules

- raw story text event property’ye yazılmaz;
- raw reflection answer tutulmaz;
- gerçek çocuk adı analytics’e yazılmaz;
- device fingerprint oluşturulmaz;
- precise location tutulmaz;
- IP analytics’e taşınmaz;
- parent-private not analytics’e girmez;
- provider secret telemetry’ye girmez;
- prompt body telemetry’ye girmez;
- stack trace sanitize edilmeden DB’ye yazılmaz.

---

## 50. Retention Policy

Önerilen retention:

```text
raw product events: kısa/orta süreli
aggregated metrics: uzun süreli
trace references: kısa süreli
error occurrences: orta/uzun süreli
error samples: kısa süreli
alert history: uzun süreli
funnel and cohort snapshots: uzun süreli
consent and deletion records: politika bazlı uzun süreli
```

---

## 51. Retention Job

### `analytics.analytics_retention_runs`

```text
id
policy_key
cutoff_at
status
candidate_count
deleted_count
anonymized_count
archived_count
started_at
completed_at
created_at
```

---

## 52. Metric Backfill

### `analytics.metric_backfill_jobs`

```text
id
metric_definition_id
period_start
period_end
status
source_version
target_version
last_processed_at
created_at
started_at
completed_at
failure_reason
```

Backfill mevcut snapshot’ı overwrite etmek yerine version veya replacement kaydı üretmelidir.

---

## 53. Dashboard Definition

### `analytics.dashboard_definitions`

```text
id
dashboard_key
display_name
audience_type
layout_definition
metric_keys
status
version_number
created_at
updated_at
```

Audience type:

```text
parent
product
operations
finance
engineering
```

---

## 54. Dashboard Snapshot

### `analytics.dashboard_snapshots`

```text
id
dashboard_definition_id
scope_type
scope_id
period_start
period_end
snapshot_payload
generated_at
expires_at
```

---

## 55. Transaction Sınırları

### Product Event Ingestion

```text
begin
validate schema
apply privacy filter
resolve pseudonym
insert product event
update ingestion watermark
commit
```

### Metric Aggregation

```text
begin
load watermark
aggregate event window
insert metric snapshots
advance watermark
record aggregation run
commit
```

### Alert Evaluation

```text
begin
load active alert rule
evaluate metric window
insert evaluation
create or update alert instance
insert outbox notification
commit
```

### Analytics Deletion

```text
begin
resolve affected pseudonyms
mark deletion request processing
enqueue deletion job
commit
```

---

## 56. Idempotency

İdempotency gerektiren işlemler:

```text
product event ingestion
metric aggregation
funnel run
cohort membership
retention snapshot
alert evaluation
alert delivery
dashboard snapshot
analytics deletion
analytics export
metric backfill
```

Örnek anahtarlar:

```text
event_source_id + event_name + occurred_at
metric_key + scope + period
alert_rule + evaluation_window
dashboard + scope + period
deletion_request_id + processing_stage
```

---

## 57. İndeks Stratejisi

### `product_events`

```text
(event_name, occurred_at DESC)
(user_pseudonym, occurred_at DESC)
(child_profile_pseudonym, occurred_at DESC)
(story_session_id, occurred_at)
(feature_key, occurred_at DESC)
(correlation_id)
```

### `story_engagement_sessions`

```text
(child_profile_pseudonym, started_at DESC)
(completion_status, started_at DESC)
(story_session_id)
```

### `choice_interactions`

```text
(choice_id, selected_at)
(story_session_id, presented_at)
(child_profile_pseudonym, created_at DESC)
```

### `metric_snapshots`

```text
(metric_definition_id, period_start, period_end)
(scope_type, scope_id, period_start)
```

### `telemetry_events`

```text
(component_name, occurred_at DESC)
(severity, occurred_at DESC)
(trace_id)
(correlation_id)
```

### `alert_instances`

```text
(status, severity, last_triggered_at DESC)
(alert_rule_id, status)
(deduplication_key)
```

---

## 58. Partitioning Adayları

Yüksek hacimli tablolar:

```text
product_events
telemetry_events
metric_points
choice_interactions
reflection_interactions
error_samples
alert_evaluations
```

Partition seçenekleri:

```text
occurred_at by month
captured_at by day
hash by pseudonym
```

---

## 59. Repository Tasarımı

### `ProductEventRepository`

```text
append
appendBatch
findBySession
findByFeature
```

### `EngagementRepository`

```text
startSession
updateProgress
completeSession
abandonSession
```

### `MetricRepository`

```text
createDefinition
createSnapshot
findSnapshots
runAggregation
```

### `FunnelRepository`

```text
createDefinition
runFunnel
findLatestRun
```

### `CohortRepository`

```text
createDefinition
addMembership
createRetentionSnapshot
```

### `TelemetryRepository`

```text
appendEvent
createSeries
appendPoint
```

### `AlertRepository`

```text
createRule
evaluate
openAlert
acknowledge
resolve
recordDelivery
```

### `PrivacyAnalyticsRepository`

```text
recordConsent
requestDeletion
requestExport
completeDeletion
```

---

## 60. Domain Events

Önerilen olaylar:

```text
ProductEventRecorded
StoryEngagementStarted
StoryEngagementCompleted
StoryEngagementAbandoned
ChoiceInteractionRecorded
ReflectionInteractionRecorded

MetricDefinitionCreated
MetricSnapshotCreated
MetricAggregationCompleted
MetricAggregationFailed
MetricBackfillStarted
MetricBackfillCompleted

FunnelDefinitionCreated
FunnelRunCompleted
CohortMembershipCreated
RetentionSnapshotCreated

TelemetryEventRecorded
OperationalMetricPointRecorded
ErrorOccurrenceCreated
ErrorOccurrenceUpdated

AlertRuleCreated
AlertTriggered
AlertAcknowledged
AlertResolved
AlertDeliveryFailed

AnalyticsConsentGranted
AnalyticsConsentWithdrawn
AnalyticsDeletionRequested
AnalyticsDeletionCompleted
AnalyticsExportRequested
AnalyticsExportCompleted
```

---

## 61. Outbox Kullanımları

- metric aggregation job;
- alert notification;
- dashboard refresh;
- parent summary refresh;
- cost anomaly detection;
- feature adoption report;
- retention report;
- deletion processing;
- export processing;
- incident oluşturma;
- telemetry escalation.

---

## 62. Güvenlik ve Gizlilik

- Pseudonymous kimlik zorunludur.
- Child-sensitive event’ler minimum payload taşır.
- Parent-private veri analytics’e kopyalanmaz.
- Raw answer ve raw story analytics event’inde tutulmaz.
- Consent olmadan nonessential analytics çalışmaz.
- Analytics export yetki kontrolü gerektirir.
- Deletion workflow audit edilmelidir.
- Alert payload’larında hassas içerik maskelenir.
- Error context sanitize edilir.
- Trace URL erişimi yetkilendirilir.
- Dashboard audience sınırları korunur.
- Çocuk metrikleri kıyaslama veya puanlama amacıyla kullanılmaz.

---

## 63. Migration Planı

Migration adı:

```text
0012_analytics_telemetry_observability.sql
```

Aşamalar:

1. `analytics`, `telemetry`, `observability` şemalarını oluştur.
2. product event ve identity tablolarını oluştur.
3. engagement, choice ve reflection tablolarını oluştur.
4. parent dashboard ve feature usage tablolarını oluştur.
5. funnel ve cohort tablolarını oluştur.
6. metric definition, snapshot, aggregation ve watermark tablolarını oluştur.
7. cost analytics tablolarını oluştur.
8. telemetry event, series ve point tablolarını oluştur.
9. trace, span ve error tablolarını oluştur.
10. alert rule, evaluation, instance ve delivery tablolarını oluştur.
11. sampling policy tablolarını oluştur.
12. consent, deletion ve export tablolarını oluştur.
13. retention ve backfill tablolarını oluştur.
14. dashboard definition ve snapshot tablolarını oluştur.
15. index ve constraint’leri ekle.
16. seed metric ve alert tanımlarını ekle.
17. privacy, aggregation ve alert testlerini çalıştır.

---

## 64. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/analytics/
├── product-events.table.ts
├── analytics-identities.table.ts
├── story-engagement-sessions.table.ts
├── choice-interactions.table.ts
├── reflection-interactions.table.ts
├── parent-dashboard-metric-snapshots.table.ts
├── feature-usage-daily.table.ts
├── funnel-definitions.table.ts
├── funnel-runs.table.ts
├── funnel-step-results.table.ts
├── cohort-definitions.table.ts
├── cohort-memberships.table.ts
├── retention-snapshots.table.ts
├── metric-definitions.table.ts
├── metric-snapshots.table.ts
├── metric-aggregation-runs.table.ts
├── aggregation-watermarks.table.ts
├── cost-metric-snapshots.table.ts
├── analytics-consent-states.table.ts
├── analytics-deletion-requests.table.ts
├── analytics-export-requests.table.ts
├── analytics-retention-runs.table.ts
├── metric-backfill-jobs.table.ts
├── dashboard-definitions.table.ts
├── dashboard-snapshots.table.ts
├── analytics.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/telemetry/
├── telemetry-events.table.ts
├── metric-series.table.ts
├── metric-points.table.ts
├── sampling-policies.table.ts
├── telemetry.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/observability/
├── trace-references.table.ts
├── span-references.table.ts
├── error-occurrences.table.ts
├── error-samples.table.ts
├── alert-rules.table.ts
├── alert-evaluations.table.ts
├── alert-instances.table.ts
├── alert-deliveries.table.ts
├── observability.relations.ts
└── index.ts
```

---

## 65. Test Gereksinimleri

Zorunlu testler:

- product event append-only;
- event schema version;
- pseudonymization;
- raw child data rejection;
- consent filter;
- story engagement start;
- story completion;
- abandonment;
- active duration calculation;
- choice selection;
- choice change;
- reflection skip;
- parent dashboard snapshot;
- feature first-use;
- feature repeat-use;
- funnel conversion;
- cohort membership;
- retention calculation;
- metric definition version;
- metric aggregation watermark;
- aggregation retry;
- cost metric calculation;
- average story cost calculation;
- telemetry event;
- metric series uniqueness;
- alert threshold;
- alert cooldown;
- alert deduplication;
- alert acknowledge;
- error fingerprint grouping;
- sampling policy;
- analytics deletion;
- analytics export;
- retention run;
- metric backfill;
- dashboard audience isolation;
- outbox atomikliği.

---

## 66. Failure Injection Testleri

```text
event ingestion sırasında duplicate event gelir
aggregation ortasında worker kapanır
watermark ilerler fakat snapshot yazılamaz
alert notification gönderilemez
metric definition değiştirilir
trace provider unavailable olur
analytics deletion job yarıda kalır
pseudonym rotation sırasında eski event bulunur
cost snapshot eksik veriyle üretilir
telemetry point yüksek hacimde gecikir
```

---

## 67. Acceptance Criteria

Paket 13 şu koşullarda tamamlanmış kabul edilir:

1. Product analytics ve telemetry ayrılmıştır.
2. Product event append-only çalışır.
3. Analytics kimlikleri pseudonymous’tur.
4. Raw child-sensitive içerik event payload’ına yazılmaz.
5. Story engagement ölçülebilir.
6. Choice interaction ölçülebilir.
7. Reflection participation güvenli biçimde ölçülür.
8. Parent dashboard metrikleri tanımlıdır.
9. Feature adoption ölçülür.
10. Funnel ve cohort persistence vardır.
11. Retention snapshot desteklenir.
12. Metric definition sürümlenir.
13. Aggregation watermark ile resumable çalışır.
14. AI cost analytics TL bazında desteklenir.
15. Operational telemetry ve metric series desteklenir.
16. Trace ve span referansları tutulur.
17. Error fingerprint gruplaması vardır.
18. Alert rule, evaluation ve instance desteklenir.
19. Alert deduplication ve cooldown vardır.
20. Sampling policy desteklenir.
21. Consent state dikkate alınır.
22. Analytics deletion ve export workflow vardır.
23. Retention ve backfill desteklenir.
24. Dashboard audience sınırları tanımlıdır.
25. Migration ve Drizzle dosya yapısı tanımlıdır.
26. Privacy, aggregation, alert ve failure testleri tanımlıdır.
27. Çocuk metrikleri performans puanı veya tanı amacıyla kullanılmaz.

---

## 68. Paket 13 Özeti

Paket 13 ile LUMI’nin ürün analitiği ve observability persistence katmanı kesinleşmiştir.

Bu tasarım sayesinde:

- hikâyelerin gerçekten tamamlanıp tamamlanmadığı görülebilir;
- hangi sahnelerde kullanıcıların ayrıldığı ölçülebilir;
- seçim mekaniklerinin kullanım oranı analiz edilebilir;
- ebeveyn dashboard’u anlamlı ve açıklayıcı metriklerle beslenebilir;
- reflection ve learning etkileşimleri güvenli sınırlar içinde ölçülebilir;
- feature adoption ve retention takip edilebilir;
- AI maliyetleri hikâye, model ve provider bazında analiz edilebilir;
- sistem gecikmeleri, job queue sorunları ve provider hataları izlenebilir;
- alert’ler tekrar üretmeden ve cooldown ile yönetilebilir;
- telemetry ile product analytics birbirine karıştırılmaz;
- privacy, consent, pseudonymization ve retention ilkeleri korunur;
- çocuklar puanlanmadan veya kıyaslanmadan ürün deneyimi geliştirilebilir.

---

## 69. Sonraki Paket

**Paket 14 — Security, Privacy, Consent & Compliance Persistence Schema**

Kapsam:

- authentication security records;
- sessions and device trust;
- authorization policies;
- consent;
- parental control;
- privacy requests;
- data classification;
- encryption metadata;
- key rotation references;
- access reviews;
- security incidents;
- suspicious activity;
- child safety controls;
- retention and legal hold;
- compliance evidence.
