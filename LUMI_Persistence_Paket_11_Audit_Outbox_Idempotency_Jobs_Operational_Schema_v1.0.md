# Project LUMI — Persistence Implementation
# Paket 11 — Audit, Outbox, Idempotency, Jobs & Operational Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM
- **Bağımlılıklar:** Paket 01–10
- **Ana Aggregate'ler:** AuditRecord, OutboxMessage, InboxMessage, BackgroundJob, ScheduledTask, DataRepairCase
- **Kapsam:** Audit, transactional outbox, consumer deduplication, idempotency, retry, dead-letter queue, distributed lock, scheduler, operational health ve data repair

---

## 1. Paket Amacı

Bu paket, Project LUMI’nin güvenilir, denetlenebilir ve hata toleranslı çalışmasını sağlayacak operasyonel persistence katmanını tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- kullanıcı ve sistem işlemlerinin audit edilmesi;
- transaction ile birlikte güvenli event yayını;
- consumer tarafında tekrar işleme engeli;
- command idempotency;
- background job yönetimi;
- retry politikaları;
- dead-letter queue;
- distributed locking;
- scheduler ve zamanlanmış görevler;
- operasyonel health kayıtları;
- job recovery;
- veri tutarsızlığı tespiti;
- kontrollü data repair;
- event replay ve projection rebuild;
- bakım modu ve operasyonel müdahale kayıtları;
- failure analysis ve kalıcı hata geçmişi.

---

## 2. Temel Tasarım Kararları

1. Audit log append-only çalışır.
2. Transactional outbox, domain transaction ile aynı veritabanı transaction’ında yazılır.
3. Outbox mesajı yayınlandıktan sonra silinmez; durum güncellenir veya arşivlenir.
4. Inbox tablosu consumer deduplication için kullanılır.
5. Idempotency yalnızca HTTP seviyesinde değil command seviyesinde uygulanır.
6. Background job state machine ile yönetilir.
7. Retry politikaları job tipine göre sürümlenir.
8. Kalıcı hatalar dead-letter queue’ya taşınır.
9. Distributed lock süreli lease modeli kullanır.
10. Lock sahibi heartbeat ile lease yenileyebilir.
11. Scheduler tek kaynaklı görev tanımlarını kullanır.
12. Aynı scheduled task duplicate çalıştırılmamalıdır.
13. Data repair işlemleri doğrudan ve görünmez SQL değişikliği olarak yapılmaz.
14. Her repair plan, onay, execution ve verification kaydı taşır.
15. Projection replay kontrollü ve resumable olmalıdır.
16. Operasyonel tablolar domain source of truth değildir.
17. Hassas payload’lar audit ve outbox içinde maskelenmelidir.
18. Retry edilmeyecek hatalar açıkça sınıflandırılır.
19. Job worker’ları crash sonrası lease timeout ile işi yeniden alabilir.
20. Tüm kritik operasyonlar correlation ve causation kimliği taşır.

---

## 3. Aggregate Sınırları

### `AuditRecord`

Yönetir:

- kim işlem yaptı;
- hangi kaynak üzerinde yaptı;
- ne zaman yaptı;
- önceki ve sonraki durum özeti;
- güvenlik ve yetkilendirme bağlamı;
- operasyon sonucu.

### `OutboxMessage`

Yönetir:

- transaction içinde oluşturulan dış mesaj;
- yayın durumu;
- retry;
- broker teslim bilgisi;
- hata geçmişi.

### `BackgroundJob`

Yönetir:

- iş tipi;
- payload;
- durum;
- attempt;
- retry zamanı;
- worker lease;
- sonuç ve hata.

### `ScheduledTask`

Yönetir:

- tekrar kuralı;
- bir sonraki çalışma zamanı;
- concurrency politikası;
- son execution;
- pause durumu.

### `DataRepairCase`

Yönetir:

- tespit edilen veri problemi;
- etkilenen kayıtlar;
- repair plan;
- onay;
- uygulama;
- verification;
- rollback referansı.

---

## 4. Audit Log Modeli

### `ops.audit_records`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Audit kimliği |
| occurred_at | timestamptz | İşlem zamanı |
| actor_type | text | user, parent, child, admin, service, worker |
| actor_id | uuid | Aktör |
| impersonator_id | uuid | Varsa vekil aktör |
| action_type | text | create, update, delete, archive, login vb. |
| resource_type | text | Kaynak türü |
| resource_id | uuid | Kaynak |
| world_id | uuid | Dünya kapsamı |
| child_profile_id | uuid | Çocuk kapsamı |
| request_id | uuid | İstek kimliği |
| correlation_id | uuid | İşlem zinciri |
| causation_id | uuid | Nedensellik |
| source_ip_hash | text | Maskelenmiş IP özeti |
| user_agent_hash | text | User agent özeti |
| authorization_context | jsonb | Yetki bağlamı |
| before_summary | jsonb | Önceki durum özeti |
| after_summary | jsonb | Sonraki durum özeti |
| changed_fields | jsonb | Değişen alanlar |
| outcome | text | success, denied, failed |
| failure_code | text | Hata kodu |
| metadata | jsonb | Ek bilgiler |
| created_at | timestamptz | Kayıt zamanı |

Audit kaydı güncellenmez veya silinmez.

---

## 5. Audit Kapsamı

Audit edilmesi zorunlu işlemler:

```text
authentication_success
authentication_failure
authorization_denied
parent_profile_update
child_profile_update
world_create
world_archive
story_publish
story_session_override
item_transfer
item_delete_attempt
world_freeze
world_unfreeze
simulation_manual_run
data_repair
admin_override
privacy_export
privacy_delete
backup_restore
security_policy_change
```

Her domain event’in audit edilmesi gerekmez. Audit, insan veya operasyonel anlam taşıyan işlemler içindir.

---

## 6. Audit Veri Minimizasyonu

Audit içine doğrudan yazılmaması gerekenler:

```text
şifre
access token
refresh token
resume token
tam kişisel mesaj içeriği
ham ebeveyn notu
çocuk özel cevapları
provider secret
tam IP adresi
```

Bunun yerine:

- hash;
- masked value;
- field name;
- change category;
- reference id

kullanılmalıdır.

---

## 7. Transactional Outbox

### `messaging.outbox_messages`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Mesaj kimliği |
| aggregate_type | text | Kaynak aggregate |
| aggregate_id | uuid | Kaynak kimlik |
| message_type | text | Event veya command tipi |
| topic | text | Broker topic |
| partition_key | text | Partition anahtarı |
| payload | jsonb | Mesaj payload |
| headers | jsonb | Mesaj header |
| correlation_id | uuid | İşlem zinciri |
| causation_id | uuid | Nedensellik |
| idempotency_key | text | Mesaj tekilliği |
| status | text | pending, publishing, published, failed, dead_letter |
| available_at | timestamptz | Yayınlanabilir zaman |
| attempt_count | integer | Deneme |
| locked_by | text | Worker |
| lock_expires_at | timestamptz | Lease süresi |
| published_at | timestamptz | Yayın zamanı |
| broker_message_id | text | Broker kimliği |
| last_error_code | text | Son hata |
| last_error_message | text | Maskelenmiş hata |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (idempotency_key)
```

---

## 8. Outbox Yayın Akışı

```text
domain transaction starts
domain state changes
domain event inserted
outbox message inserted
transaction commits

publisher selects pending messages
publisher acquires lease
message sent to broker
broker acknowledgement received
message marked published
```

DB transaction commit edilmezse outbox kaydı da oluşmaz.

---

## 9. Outbox Claim Stratejisi

Önerilen sorgu yaklaşımı:

```sql
SELECT id
FROM messaging.outbox_messages
WHERE status = 'pending'
  AND available_at <= now()
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT :batch_size;
```

Bu yaklaşım birden fazla publisher worker’ın çakışmadan çalışmasını sağlar.

---

## 10. Outbox Attempt Geçmişi

### `messaging.outbox_delivery_attempts`

```text
id
outbox_message_id
attempt_number
worker_id
started_at
completed_at
status
broker_response
error_code
error_message
created_at
```

Her deneme append-only kaydedilir.

---

## 11. Inbox ve Consumer Deduplication

### `messaging.inbox_messages`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Inbox kaydı |
| consumer_name | text | Consumer |
| message_id | text | Broker mesaj kimliği |
| message_type | text | Mesaj tipi |
| payload_hash | text | Payload özeti |
| status | text | received, processing, processed, failed |
| received_at | timestamptz | Alınma |
| processed_at | timestamptz | İşlenme |
| retry_count | integer | Retry |
| last_error | text | Son hata |
| correlation_id | uuid | İşlem zinciri |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (consumer_name, message_id)
```

Consumer duplicate mesaj alırsa önceki başarılı kayıt döndürülür veya mesaj atlanır.

---

## 12. Inbox Processing Akışı

```text
receive message
insert inbox record
if unique conflict:
  load existing record
  if processed -> acknowledge and skip
  if processing and lease valid -> defer
process business action
mark processed
acknowledge broker
```

Business action ve inbox update mümkünse aynı transaction içinde yapılmalıdır.

---

## 13. Command Idempotency

### `ops.idempotency_records`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Kayıt |
| scope_type | text | api, command, job, consumer |
| scope_key | text | İşlem alanı |
| idempotency_key | text | Kullanıcı veya sistem anahtarı |
| actor_id | uuid | Aktör |
| request_hash | text | Girdi özeti |
| status | text | processing, completed, failed, expired |
| result_type | text | Sonuç türü |
| result_reference_id | uuid | Sonuç kaydı |
| response_snapshot | jsonb | Güvenli response özeti |
| locked_by | text | İşleyen node |
| lock_expires_at | timestamptz | Lease |
| expires_at | timestamptz | Saklama süresi |
| created_at | timestamptz | Oluşturulma |
| completed_at | timestamptz | Tamamlanma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (scope_type, scope_key, idempotency_key)
```

Aynı key farklı request hash ile gelirse conflict dönmelidir.

---

## 14. Idempotency Durumları

```text
processing
completed
failed_retryable
failed_terminal
expired
```

Tamamlanmış kaydın sonucu güvenli biçimde yeniden döndürülebilir.

---

## 15. Background Job Modeli

### `job.background_jobs`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Job kimliği |
| queue_name | text | Kuyruk |
| job_type | text | İş türü |
| priority | integer | Öncelik |
| payload | jsonb | İş payload |
| payload_schema_version | integer | Payload sürümü |
| status | text | queued, running, retry_wait, completed, failed, cancelled, dead_letter |
| available_at | timestamptz | Çalışma zamanı |
| attempt_count | integer | Deneme |
| max_attempts | integer | Maksimum deneme |
| timeout_seconds | integer | Timeout |
| worker_id | text | Worker |
| lease_expires_at | timestamptz | Lease |
| heartbeat_at | timestamptz | Heartbeat |
| idempotency_key | text | Tekillik |
| correlation_id | uuid | İşlem zinciri |
| causation_id | uuid | Nedensellik |
| result_payload | jsonb | Sonuç özeti |
| last_error_code | text | Son hata |
| last_error_message | text | Maskelenmiş hata |
| created_at | timestamptz | Oluşturulma |
| started_at | timestamptz | Başlangıç |
| completed_at | timestamptz | Tamamlanma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (queue_name, idempotency_key)
```

---

## 16. Job Türleri

Örnek job tipleri:

```text
generate_story_scene
generate_image
generate_tts
create_embedding
rebuild_projection
run_world_simulation
validate_story_outcome
commit_world_state
process_asset_variant
moderate_asset
send_parent_notification
archive_old_records
create_backup
verify_backup
repair_data
```

---

## 17. Job State Machine

Geçerli geçişler:

```text
queued -> running
running -> completed
running -> retry_wait
running -> failed
running -> dead_letter
retry_wait -> queued
queued -> cancelled
running -> cancelled
failed -> queued (manual retry)
dead_letter -> queued (manual replay)
```

Geçersiz state transition engellenmelidir.

---

## 18. Job Attempt Geçmişi

### `job.job_attempts`

```text
id
background_job_id
attempt_number
worker_id
started_at
completed_at
status
error_class
error_code
error_message
stack_trace_hash
result_summary
created_at
```

Tam stack trace hassas veya aşırı büyükse object storage veya merkezi log sistemine taşınmalıdır.

---

## 19. Retry Policy Modeli

### `job.retry_policies`

```text
id
policy_key
job_type
max_attempts
initial_delay_seconds
max_delay_seconds
backoff_multiplier
jitter_mode
retryable_error_codes
non_retryable_error_codes
created_at
updated_at
version
```

Örnek backoff:

```text
delay = min(
  initial_delay * backoff_multiplier ^ attempt,
  max_delay
) + jitter
```

---

## 20. Retry Sınıflandırması

Retry edilebilir:

```text
network_timeout
provider_rate_limit
temporary_database_unavailable
object_storage_timeout
broker_unavailable
external_service_5xx
lease_lost
```

Retry edilmemeli:

```text
invalid_payload
authorization_denied
schema_validation_failed
unsupported_model
unsafe_content
missing_required_entity
business_rule_violation
```

---

## 21. Dead-Letter Queue

### `job.dead_letter_jobs`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | DLQ kimliği |
| original_job_id | uuid | Kaynak job |
| queue_name | text | Kuyruk |
| job_type | text | İş türü |
| payload_snapshot | jsonb | Maskelenmiş payload |
| failure_class | text | Hata sınıfı |
| failure_summary | text | Özet |
| attempt_count | integer | Toplam deneme |
| requires_manual_review | boolean | Manuel inceleme |
| resolution_status | text | open, replayed, ignored, repaired |
| resolved_by | uuid | Çözen |
| resolved_at | timestamptz | Çözülme |
| created_at | timestamptz | Oluşturulma |

DLQ kaydı silinmez; çözüm durumu güncellenir.

---

## 22. Job Claim ve Lease

Worker job alırken:

```text
status = queued
available_at <= now
lease not active
```

Row lock ile claim edilir.

```text
status -> running
worker_id -> current worker
lease_expires_at -> now + lease duration
heartbeat_at -> now
```

Worker crash olursa lease süresi dolduktan sonra recovery worker işi yeniden kuyruğa alabilir.

---

## 23. Worker Heartbeat

### `ops.worker_heartbeats`

```text
id
worker_id
worker_type
instance_id
hostname_hash
version
status
active_job_count
last_heartbeat_at
started_at
metadata
```

Durumlar:

```text
starting
healthy
degraded
draining
offline
```

---

## 24. Distributed Lock

### `ops.distributed_locks`

| Alan | Tip | Açıklama |
|---|---|---|
| lock_key | text | Primary key |
| owner_id | text | Lock sahibi |
| lease_token | uuid | Güvenli lease token |
| acquired_at | timestamptz | Alınma |
| expires_at | timestamptz | Bitiş |
| heartbeat_at | timestamptz | Yenileme |
| metadata | jsonb | Ek bilgiler |

Lock işlemleri:

```text
acquire
renew
release
force_expire
```

Release sırasında owner ve lease token doğrulanmalıdır.

---

## 25. Distributed Lock Kullanım Alanları

```text
world simulation per world
projection rebuild
backup creation
scheduled archive
single active story generation pipeline
global migration operation
cost aggregation
data repair execution
```

Domain entity update’lerinde mümkünse optimistic concurrency tercih edilir; distributed lock yalnızca süreç seviyesinde kullanılmalıdır.

---

## 26. Scheduled Task Modeli

### `scheduler.scheduled_tasks`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Görev |
| task_key | text | Benzersiz anahtar |
| task_type | text | Görev türü |
| schedule_type | text | cron, interval, one_time |
| schedule_expression | text | Cron veya interval |
| timezone_id | text | Saat dilimi |
| payload | jsonb | Görev payload |
| concurrency_policy | text | allow, forbid, replace |
| misfire_policy | text | skip, run_once, catch_up |
| status | text | active, paused, completed, archived |
| next_run_at | timestamptz | Sonraki çalışma |
| last_run_at | timestamptz | Son çalışma |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (task_key)
```

---

## 27. Scheduled Execution

### `scheduler.scheduled_task_runs`

```text
id
scheduled_task_id
scheduled_for
triggered_at
background_job_id
status
misfire_detected
created_at
completed_at
```

```text
UNIQUE (scheduled_task_id, scheduled_for)
```

Bu unique constraint duplicate scheduler execution’ı engeller.

---

## 28. Misfire Politikası

### `skip`

Kaçırılan execution çalıştırılmaz.

### `run_once`

Kaçırılan tüm periyotlar için tek execution oluşturulur.

### `catch_up`

Her kaçırılan periyot için execution oluşturulur.

LUMI için çoğu bakım görevi `run_once` kullanmalıdır. Sınırsız catch-up önerilmez.

---

## 29. Operational Health Checks

### `ops.health_check_results`

```text
id
component_name
check_name
status
latency_ms
details
checked_at
expires_at
```

Durumlar:

```text
healthy
degraded
unhealthy
unknown
```

Kontrol örnekleri:

```text
database_connectivity
database_replication
outbox_lag
job_queue_lag
dead_letter_count
object_storage
ai_provider
embedding_provider
backup_freshness
projection_lag
```

---

## 30. Operational Metrics Snapshots

### `ops.operational_metric_snapshots`

```text
id
metric_key
scope_type
scope_id
numeric_value
unit
dimensions
captured_at
```

Örnek metrikler:

```text
outbox_pending_count
oldest_outbox_age_seconds
queued_job_count
running_job_count
dlq_open_count
projection_lag_events
simulation_failures
asset_generation_failures
```

Bu tablo uzun süreli observability sistemi yerine geçmez; operasyonel snapshot için kullanılır.

---

## 31. Maintenance Mode

### `ops.maintenance_windows`

```text
id
scope_type
scope_id
maintenance_type
status
starts_at
ends_at
reason
created_by
created_at
updated_at
```

Scope:

```text
global
world
feature
worker_type
```

Maintenance sırasında belirli job’lar pause edilebilir.

---

## 32. Data Consistency Issue Modeli

### `repair.data_consistency_issues`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Problem kimliği |
| issue_type | text | Problem türü |
| severity | text | info, warning, critical |
| world_id | uuid | Dünya |
| resource_type | text | Kaynak türü |
| resource_id | uuid | Kaynak |
| detection_source | text | validator, job, admin, migration |
| details | jsonb | Sorun özeti |
| status | text | open, investigating, repair_planned, repaired, ignored |
| detected_at | timestamptz | Tespit |
| resolved_at | timestamptz | Çözülme |
| created_at | timestamptz | Kayıt |

---

## 33. Data Repair Case

### `repair.data_repair_cases`

```text
id
consistency_issue_id
repair_type
status
risk_level
repair_plan
affected_record_count
requires_approval
approved_by
approved_at
execution_job_id
rollback_reference
verification_result
created_by
created_at
started_at
completed_at
```

Durumlar:

```text
draft
awaiting_approval
approved
running
verifying
completed
failed
rolled_back
cancelled
```

---

## 34. Data Repair Actions

### `repair.data_repair_actions`

```text
id
data_repair_case_id
action_sequence
action_type
target_type
target_id
expected_state_hash
requested_change
result_state_hash
status
error_message
created_at
completed_at
```

Her repair adımı denetlenebilir olmalıdır.

---

## 35. Repair Kuralları

- Production verisi doğrudan manuel SQL ile düzeltilmemelidir.
- Repair plan tekrar çalıştırılabilir olmalıdır.
- Beklenen state hash doğrulanmalıdır.
- Yüksek riskli repair onay gerektirir.
- Her repair audit kaydı üretir.
- Mümkünse rollback manifest oluşturulur.
- Repair sonrasında verification job çalışır.
- İlgili projection’lar rebuild edilebilir.

---

## 36. Projection Replay

### `ops.projection_rebuilds`

```text
id
projection_name
world_id
status
from_event_sequence
to_event_sequence
last_processed_sequence
batch_size
worker_id
lease_expires_at
failure_reason
started_at
completed_at
created_at
```

Replay resumable olmalıdır.

---

## 37. Event Replay Güvenliği

Replay sırasında:

- domain event yeniden üretilmez;
- yalnızca projection güncellenir;
- side-effect outbox üretimi varsayılan olarak kapalıdır;
- external provider çağrısı yapılmaz;
- mevcut projection version kontrol edilir;
- shadow table ile doğrulama yapılabilir.

---

## 38. Operational Incident Modeli

### `ops.operational_incidents`

```text
id
incident_key
severity
title
summary
status
affected_components
detected_at
acknowledged_at
resolved_at
root_cause
resolution_summary
created_at
updated_at
```

Durumlar:

```text
open
acknowledged
mitigating
resolved
postmortem
closed
```

---

## 39. Incident Event Timeline

### `ops.operational_incident_events`

```text
id
incident_id
event_type
summary
actor_type
actor_id
occurred_at
metadata
```

---

## 40. İndeks Stratejisi

### `audit_records`

```text
(resource_type, resource_id, occurred_at DESC)
(actor_type, actor_id, occurred_at DESC)
(world_id, occurred_at DESC)
(correlation_id)
```

### `outbox_messages`

```text
(status, available_at, created_at)
(lock_expires_at)
(aggregate_type, aggregate_id)
(correlation_id)
```

### `inbox_messages`

```text
(consumer_name, message_id)
(status, updated_at)
(correlation_id)
```

### `background_jobs`

```text
(queue_name, status, priority DESC, available_at)
(worker_id, status)
(lease_expires_at)
(correlation_id)
```

### `dead_letter_jobs`

```text
(resolution_status, created_at DESC)
(job_type, failure_class)
```

### `scheduled_tasks`

```text
(status, next_run_at)
(task_type, status)
```

### `data_consistency_issues`

```text
(status, severity, detected_at DESC)
(resource_type, resource_id)
(world_id, status)
```

---

## 41. Partitioning Adayları

Yüksek hacimli tablolar:

```text
audit_records
outbox_delivery_attempts
inbox_messages
job_attempts
health_check_results
operational_metric_snapshots
```

Partition seçenekleri:

```text
created_at by month
world_id hash
```

Audit retention politikasına göre arşiv partition’ları kullanılabilir.

---

## 42. Transaction Sınırları

### Domain Transaction + Outbox

```text
begin
update domain aggregate
insert domain event
insert audit record if required
insert outbox message
commit
```

### Consumer Processing

```text
begin
insert inbox record
apply business action
insert domain event
insert outbox
mark inbox processed
commit
acknowledge broker
```

### Job Completion

```text
begin
validate lease owner
persist result
mark job completed
insert audit if required
insert outbox
commit
```

### Retry

```text
begin
insert attempt record
calculate next retry
update job status retry_wait
clear lease
commit
```

---

## 43. Idempotency Matriksi

| İşlem | Idempotency Anahtarı |
|---|---|
| API command | actor + route + client key |
| Story generation | session + scene + generation version |
| World simulation | world + time window + ruleset |
| Asset generation | prompt hash + model + dimensions |
| Consumer message | consumer + broker message id |
| Scheduled task | task + scheduled time |
| Story outcome commit | outcome effect id |
| Data repair | repair case + action sequence |
| Projection rebuild | projection + world + target version |

---

## 44. Repository Tasarımı

### `AuditRepository`

```text
append
listForResource
listForActor
listForCorrelation
```

### `OutboxRepository`

```text
append
claimBatch
markPublished
markFailed
moveToDeadLetter
```

### `InboxRepository`

```text
tryBeginProcessing
markProcessed
markFailed
findExisting
```

### `IdempotencyRepository`

```text
tryAcquire
complete
fail
findCompletedResult
expire
```

### `BackgroundJobRepository`

```text
enqueue
claim
heartbeat
complete
retry
fail
cancel
moveToDeadLetter
```

### `SchedulerRepository`

```text
createTask
findDueTasks
recordRun
advanceNextRun
pause
resume
```

### `DataRepairRepository`

```text
createIssue
createRepairCase
approve
start
recordAction
verify
complete
rollback
```

---

## 45. Domain Events

Önerilen olaylar:

```text
AuditRecordCreated

OutboxMessageCreated
OutboxMessagePublished
OutboxMessageFailed
OutboxMessageDeadLettered

InboxMessageReceived
InboxMessageProcessed
InboxMessageRejected

IdempotencyRecordAcquired
IdempotentCommandCompleted
IdempotencyConflictDetected

BackgroundJobQueued
BackgroundJobStarted
BackgroundJobHeartbeat
BackgroundJobCompleted
BackgroundJobRetryScheduled
BackgroundJobFailed
BackgroundJobDeadLettered
BackgroundJobCancelled

ScheduledTaskCreated
ScheduledTaskTriggered
ScheduledTaskPaused
ScheduledTaskResumed
ScheduledTaskMisfireDetected

DistributedLockAcquired
DistributedLockRenewed
DistributedLockReleased
DistributedLockExpired

DataConsistencyIssueDetected
DataRepairPlanned
DataRepairApproved
DataRepairStarted
DataRepairCompleted
DataRepairFailed
DataRepairRolledBack

ProjectionRebuildStarted
ProjectionRebuildProgressed
ProjectionRebuildCompleted
ProjectionRebuildFailed

OperationalIncidentCreated
OperationalIncidentResolved
```

---

## 46. Outbox Kullanımları

Bu paketin kendi event’leri de outbox üzerinden dağıtılabilir:

- alert üretme;
- operasyon panelini güncelleme;
- incident oluşturma;
- DLQ bildirimi;
- backup doğrulama uyarısı;
- projection lag alarmı;
- job queue saturation alarmı;
- repair onay bildirimi.

---

## 47. Güvenlik

- Audit payload maskelenmelidir.
- Job payload içinde secret tutulmamalıdır.
- Outbox header içine access token yazılmamalıdır.
- DLQ payload hassas alanları redacted olmalıdır.
- Distributed lock force-release yalnızca yetkili operatörce yapılmalıdır.
- Data repair yüksek riskte çift onay gerektirebilir.
- Admin override audit olmadan çalışmamalıdır.
- Replay sırasında external side effect kapalı olmalıdır.
- Worker identity doğrulanmalıdır.
- Operational endpoint’ler child-facing API’den ayrılmalıdır.

---

## 48. Retention Politikası

Öneri:

```text
audit_records: uzun süreli, politika bazlı
outbox published: orta süreli
outbox failed/dlq: uzun süreli
inbox processed: deduplication penceresi boyunca
job_attempts: operasyonel analiz süresi boyunca
health checks: kısa/orta süreli
metric snapshots: aggregation sonrası arşivlenebilir
repair records: kalıcı
incident records: kalıcı
```

Retention değerleri ürün ve mevzuat paketinde kesinleştirilecektir.

---

## 49. Migration Planı

Migration adı:

```text
0010_operational_persistence.sql
```

Aşamalar:

1. `ops`, `messaging`, `job`, `scheduler`, `repair` şemalarını oluştur.
2. audit tablolarını oluştur.
3. outbox ve delivery attempts oluştur.
4. inbox tablolarını oluştur.
5. idempotency tablolarını oluştur.
6. background jobs ve attempts oluştur.
7. retry policies ve DLQ oluştur.
8. worker heartbeat ve distributed lock oluştur.
9. scheduled task tablolarını oluştur.
10. health, metrics ve maintenance tablolarını oluştur.
11. consistency issue ve repair tablolarını oluştur.
12. projection rebuild tablolarını oluştur.
13. incident tablolarını oluştur.
14. partial unique index ve check constraint’leri ekle.
15. seed retry policies ekle.
16. failure ve concurrency testlerini çalıştır.

---

## 50. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/ops/
├── audit-records.table.ts
├── idempotency-records.table.ts
├── worker-heartbeats.table.ts
├── distributed-locks.table.ts
├── health-check-results.table.ts
├── operational-metric-snapshots.table.ts
├── maintenance-windows.table.ts
├── projection-rebuilds.table.ts
├── operational-incidents.table.ts
├── operational-incident-events.table.ts
├── ops.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/messaging/
├── outbox-messages.table.ts
├── outbox-delivery-attempts.table.ts
├── inbox-messages.table.ts
├── messaging.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/job/
├── background-jobs.table.ts
├── job-attempts.table.ts
├── retry-policies.table.ts
├── dead-letter-jobs.table.ts
├── job.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/scheduler/
├── scheduled-tasks.table.ts
├── scheduled-task-runs.table.ts
├── scheduler.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/repair/
├── data-consistency-issues.table.ts
├── data-repair-cases.table.ts
├── data-repair-actions.table.ts
├── repair.relations.ts
└── index.ts
```

---

## 51. Test Gereksinimleri

Zorunlu testler:

- audit append-only;
- audit masking;
- domain transaction ve outbox atomikliği;
- outbox claim with skip locked;
- duplicate outbox idempotency;
- outbox retry;
- outbox dead letter;
- inbox consumer deduplication;
- duplicate broker message;
- idempotency same request replay;
- idempotency different request hash conflict;
- job enqueue;
- job claim;
- worker lease;
- heartbeat;
- worker crash recovery;
- retryable error;
- non-retryable error;
- exponential backoff;
- max attempt;
- DLQ move;
- manual replay;
- distributed lock acquire;
- lock renew;
- invalid release token;
- lock expiration;
- scheduled task uniqueness;
- misfire skip;
- misfire run once;
- concurrency forbid;
- health check record;
- consistency issue detection;
- repair approval;
- state hash conflict;
- repair rollback;
- projection rebuild resume;
- replay external side-effect suppression;
- incident timeline;
- concurrency altında duplicate job engeli.

---

## 52. Failure Injection Testleri

Aşağıdaki hata senaryoları kontrollü olarak test edilmelidir:

```text
DB commit sonrası broker unavailable
broker publish başarılı fakat status update başarısız
worker job ortasında kapanır
worker heartbeat kesilir
aynı job iki worker tarafından claim edilmeye çalışılır
consumer mesajı işledikten sonra ack gönderemez
scheduler aynı anda iki node’da çalışır
repair sırasında expected state değişir
projection rebuild sırasında worker restart olur
distributed lock sahibi erişilemez hale gelir
```

---

## 53. Acceptance Criteria

Paket 11 şu koşullarda tamamlanmış kabul edilir:

1. Audit append-only modellenmiştir.
2. Hassas audit alanları maskelenir.
3. Transactional outbox domain transaction ile atomiktir.
4. Outbox retry ve delivery attempt geçmişi vardır.
5. Inbox consumer deduplication desteklenir.
6. Command idempotency kalıcıdır.
7. Aynı key farklı payload ile kullanılırsa conflict oluşur.
8. Background job state machine tanımlıdır.
9. Job lease ve heartbeat desteklenir.
10. Worker crash recovery mümkündür.
11. Retry policy sürümlenebilir.
12. Retryable ve terminal hatalar ayrılır.
13. Dead-letter queue desteklenir.
14. Distributed lock lease token ile korunur.
15. Scheduled task ve duplicate execution engeli vardır.
16. Misfire politikaları desteklenir.
17. Operational health snapshot’ları tutulur.
18. Data consistency issue kaydı vardır.
19. Data repair planlı, onaylı ve denetlenebilirdir.
20. Projection replay resumable’dır.
21. Replay sırasında dış side effect engellenir.
22. Incident kayıtları ve timeline desteklenir.
23. Migration ve Drizzle dosya yapısı tanımlıdır.
24. Failure injection ve concurrency testleri tanımlıdır.
25. Audit, outbox, job ve repair operasyonları güvenlik sınırlarına uyar.

---

## 54. Paket 11 Özeti

Paket 11 ile LUMI’nin operasyonel güvenilirlik persistence katmanı kesinleşmiştir.

Bu tasarım sayesinde:

- önemli işlemler denetlenebilir;
- domain transaction ile event yayını arasında veri kaybı oluşmaz;
- duplicate mesaj ve command işlemleri engellenir;
- background işler kontrollü şekilde retry edilir;
- worker çökmesi sonrasında işler yeniden alınabilir;
- kalıcı hatalar DLQ’da görünür hale gelir;
- scheduler birden fazla node’da güvenli çalışabilir;
- kritik süreçler distributed lock ile korunabilir;
- veri tutarsızlıkları görünmez müdahaleler yerine planlı repair akışıyla çözülür;
- projection rebuild ve event replay güvenli biçimde yapılabilir;
- operasyonel incident’lar kayıt altına alınabilir;
- sistem hata anında toparlanabilir ve geçmişi açıklayabilir hale gelir.

---

## 55. Sonraki Paket

**Paket 12 — AI Generation, Prompt, Provider, Cost & Usage Persistence Schema**

Kapsam:

- AI providers;
- model catalog;
- prompt templates;
- prompt versions;
- generation requests;
- structured outputs;
- moderation;
- retries and fallbacks;
- token usage;
- image megapixel usage;
- TTS usage;
- provider costs;
- currency and exchange-rate snapshots;
- budgets;
- quotas;
- cost previews;
- cache and reuse;
- generation quality reviews.
