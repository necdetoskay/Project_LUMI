# Project LUMI — Persistence Implementation
# Paket 12 — AI Generation, Prompt, Provider, Cost & Usage Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM
- **Bağımlılıklar:** Paket 01–11
- **Ana Aggregate'ler:** AIProvider, AIModel, PromptTemplate, GenerationRequest, UsageRecord, CostRecord, BudgetPolicy
- **Kapsam:** AI sağlayıcıları, model kataloğu, prompt sürümleri, üretim istekleri, structured output, moderation, fallback, kullanım, maliyet, bütçe, kota, cache ve kalite değerlendirmesi

---

## 1. Paket Amacı

Bu paket, Project LUMI’de kullanılan yapay zekâ servislerinin güvenli, ölçülebilir ve maliyet kontrollü biçimde yönetilmesi için gereken persistence modelini tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- birden fazla AI sağlayıcısı;
- text, image, embedding, TTS ve moderation modelleri;
- model özellikleri ve yetenekleri;
- prompt template ve prompt version yönetimi;
- runtime prompt assembly;
- generation request ve attempt geçmişi;
- structured output doğrulaması;
- retry ve fallback;
- provider hata sınıflandırması;
- token, görsel megapiksel ve ses süresi kullanımı;
- maliyet hesaplama;
- TL bazlı cost preview ve budget takibi;
- kota ve limitler;
- cache ve output reuse;
- kalite değerlendirmesi;
- moderation ve safety sonucu;
- ebeveyn onaylı içerik üretim politikaları;
- provider bağımlılığını azaltan soyutlama.

---

## 2. Temel Tasarım Kararları

1. AI provider ile AI model ayrı aggregate’lerdir.
2. Model kimliği provider’a bağlıdır.
3. Prompt template ile prompt version ayrıdır.
4. Çalıştırılan gerçek prompt immutable snapshot olarak saklanabilir.
5. Secret veya API key hiçbir persistence tablosunda düz metin tutulmaz.
6. Generation request ile provider attempt ayrıdır.
7. Bir request birden fazla fallback attempt içerebilir.
8. Structured output şeması sürümlenir.
9. Provider response doğrudan domain source of truth değildir.
10. AI çıktısı doğrulama ve moderation sonrasında kullanılabilir.
11. Token, megapiksel, ses süresi ve request bazlı kullanım ayrı ölçülür.
12. Maliyet kaydı sağlayıcının para birimiyle ve TL karşılığıyla saklanabilir.
13. Kullanılan kur ve tarih ayrıca tutulur.
14. Cost preview ile actual cost ayrı kayıtlardır.
15. Bütçe ve kota politikaları request öncesi değerlendirilir.
16. Cache key prompt hash, model, parametreler ve bağlam sürümünü içermelidir.
17. Reuse kararı kalite ve güvenlik sonucu olmadan yapılmaz.
18. Model fallback sırası merkezi policy ile yönetilir.
19. Provider rate limit bilgisi operational persistence ile entegredir.
20. AI üretimi audit, outbox ve job altyapısıyla birlikte çalışır.

---

## 3. Aggregate Sınırları

### `AIProvider`

Yönetir:

- sağlayıcı kimliği;
- endpoint türü;
- desteklenen modality;
- durum;
- bölge;
- rate limit politikası;
- operasyonel metadata.

### `AIModel`

Yönetir:

- model adı;
- provider bağlantısı;
- yetenekler;
- context limit;
- fiyatlandırma;
- desteklenen çıktı türleri;
- aktiflik ve deprecation.

### `PromptTemplate`

Yönetir:

- kullanım amacı;
- dil;
- rol;
- değişkenler;
- prompt version;
- safety ve output schema bağlantısı.

### `GenerationRequest`

Yönetir:

- istek amacı;
- giriş bağlamı;
- seçilen model/policy;
- attempt geçmişi;
- çıktı;
- doğrulama;
- moderation;
- kullanım ve maliyet.

### `BudgetPolicy`

Yönetir:

- kullanıcı, çocuk profili, dünya veya sistem bazlı bütçe;
- periyot;
- threshold;
- alert;
- hard/soft limit.

---

## 4. AI Provider Modeli

### `ai.ai_providers`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Provider kimliği |
| provider_key | text | Teknik anahtar |
| display_name | text | Görünen ad |
| provider_type | text | llm, image, tts, embedding, moderation, multi_modal |
| api_family | text | openai_compatible, custom, local |
| base_url_reference | text | Config referansı |
| credential_reference | text | Secret manager referansı |
| region | text | Çalışma bölgesi |
| lifecycle_status | text | active, degraded, disabled, retired |
| supports_streaming | boolean | Streaming desteği |
| supports_batch | boolean | Batch desteği |
| supports_tools | boolean | Tool calling |
| supports_structured_output | boolean | Structured output |
| metadata | jsonb | Ek bilgiler |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (provider_key)
```

---

## 5. Provider Secret Yönetimi

DB’de yalnızca:

```text
credential_reference
```

tutulur.

Secret aşağıdaki sistemlerden birinde saklanır:

```text
environment secret
Docker secret
Vault
cloud secret manager
deployment platform secret
```

DB backup içinde gerçek API anahtarı bulunmamalıdır.

---

## 6. AI Model Kataloğu

### `ai.ai_models`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Model kimliği |
| provider_id | uuid | Provider |
| model_key | text | Teknik anahtar |
| provider_model_name | text | Sağlayıcıdaki gerçek ad |
| display_name | text | Görünen ad |
| modality | text | text, image, tts, embedding, moderation, multimodal |
| capability_flags | jsonb | Yetenekler |
| lifecycle_status | text | active, preview, deprecated, retired |
| context_window_tokens | integer | Context limiti |
| max_output_tokens | integer | Output limiti |
| embedding_dimensions | integer | Embedding boyutu |
| supports_json_schema | boolean | JSON schema |
| supports_seed | boolean | Seed |
| supports_image_input | boolean | Görsel input |
| supports_audio_input | boolean | Ses input |
| quality_tier | text | economy, standard, premium |
| latency_tier | text | low, medium, high |
| recommended_use_cases | jsonb | Kullanım alanları |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (provider_id, model_key)
```

---

## 7. Model Capability Örnekleri

```text
story_generation
choice_generation
story_summary
image_generation
character_consistency
scene_illustration
small_icon_generation
tts_narration
embedding
moderation
structured_json
tool_calling
long_context
low_cost
```

---

## 8. Model Pricing

### `ai.ai_model_pricing`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Fiyat kaydı |
| ai_model_id | uuid | Model |
| pricing_version | text | Fiyat sürümü |
| currency_code | text | Para birimi |
| input_token_price_per_million | numeric | 1M input token |
| output_token_price_per_million | numeric | 1M output token |
| cached_input_price_per_million | numeric | Cache input |
| image_price_per_megapixel | numeric | MP fiyatı |
| image_price_per_request | numeric | Request fiyatı |
| tts_price_per_million_chars | numeric | 1M karakter |
| tts_price_per_minute | numeric | Dakika |
| embedding_price_per_million_tokens | numeric | Embedding |
| moderation_price_per_request | numeric | Moderation |
| minimum_charge | numeric | Minimum ücret |
| effective_from | timestamptz | Başlangıç |
| effective_until | timestamptz | Bitiş |
| source_reference | text | Fiyat kaynağı |
| created_at | timestamptz | Oluşturulma |

Aynı model için fiyat geçmişi korunur.

---

## 9. Model Routing Policy

### `ai.model_routing_policies`

```text
id
policy_key
generation_type
world_id
child_profile_id
primary_model_id
fallback_model_ids
quality_requirement
maximum_latency_ms
maximum_estimated_cost_try
allow_preview_models
allow_local_models
status
rules
created_at
updated_at
version
```

Fallback sırası `fallback_model_ids` içinde tutulabilir; daha karmaşık yapı için ayrı tablo önerilir.

---

## 10. Routing Policy Step

### `ai.model_routing_policy_steps`

```text
id
routing_policy_id
step_order
ai_model_id
condition_payload
timeout_ms
max_attempts
fallback_on_error_codes
created_at
```

---

## 11. Prompt Template Modeli

### `ai.prompt_templates`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Template kimliği |
| prompt_key | text | Teknik anahtar |
| display_name | text | Görünen ad |
| generation_type | text | story, scene, choice, summary, image vb. |
| role_type | text | system, developer, user, tool |
| language | text | Dil |
| lifecycle_status | text | draft, active, retired |
| owner_scope | text | global, project, world |
| owner_id | uuid | Scope kimliği |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (prompt_key, owner_scope, owner_id)
```

---

## 12. Prompt Version Modeli

### `ai.prompt_versions`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Version kimliği |
| prompt_template_id | uuid | Template |
| version_number | integer | Sürüm |
| content_template | text | Prompt içeriği |
| variable_schema | jsonb | Değişken şeması |
| output_schema_id | uuid | Structured output şeması |
| safety_policy_id | uuid | Safety policy |
| model_constraints | jsonb | Model kısıtları |
| token_estimate | integer | Yaklaşık token |
| change_summary | text | Değişiklik özeti |
| lifecycle_status | text | draft, active, retired |
| created_by | uuid | Oluşturan |
| created_at | timestamptz | Oluşturulma |
| activated_at | timestamptz | Aktivasyon |

```text
UNIQUE (prompt_template_id, version_number)
```

Aktif version immutable kabul edilmelidir.

---

## 13. Prompt Variables

### `ai.prompt_variables`

```text
id
prompt_version_id
variable_name
data_type
is_required
default_value
sensitivity_class
max_length
validation_rules
created_at
```

Sensitivity sınıfları:

```text
public
internal
child_personal
parent_private
system_secret
```

`system_secret` değişken prompt snapshot içinde düz metin tutulmaz.

---

## 14. Output Schema Modeli

### `ai.output_schemas`

```text
id
schema_key
version_number
generation_type
json_schema
strict_mode
lifecycle_status
created_at
```

Örnek generation type:

```text
story_outline
story_scene
choice_set
story_outcome_manifest
image_prompt
parent_summary
character_update
```

---

## 15. Safety Policy Modeli

### `ai.ai_safety_policies`

```text
id
policy_key
version_number
target_age_min
target_age_max
content_rules
blocked_categories
required_checks
fallback_behavior
lifecycle_status
created_at
```

---

## 16. Generation Request

### `ai.generation_requests`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Request kimliği |
| generation_type | text | Üretim türü |
| world_id | uuid | Dünya |
| child_profile_id | uuid | Çocuk profili |
| story_session_id | uuid | Hikâye oturumu |
| source_type | text | Kaynak aggregate |
| source_id | uuid | Kaynak |
| routing_policy_id | uuid | Routing policy |
| prompt_version_id | uuid | Prompt version |
| requested_model_id | uuid | Tercih edilen model |
| status | text | queued, running, validating, completed, failed, cancelled |
| priority | integer | Öncelik |
| idempotency_key | text | Tekillik |
| request_context_hash | text | Bağlam hash |
| requested_at | timestamptz | İstek |
| started_at | timestamptz | Başlangıç |
| completed_at | timestamptz | Tamamlanma |
| correlation_id | uuid | İşlem zinciri |
| causation_id | uuid | Nedensellik |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (idempotency_key)
```

---

## 17. Generation Input Snapshot

### `ai.generation_input_snapshots`

```text
id
generation_request_id
prompt_version_id
resolved_prompt
system_context
user_context
structured_variables
context_source_ids
input_hash
redaction_status
token_estimate
created_at
```

Hassas alanlar masked veya reference-based tutulmalıdır.

---

## 18. Generation Attempt

### `ai.generation_attempts`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Attempt |
| generation_request_id | uuid | Request |
| attempt_number | integer | Sıra |
| ai_provider_id | uuid | Provider |
| ai_model_id | uuid | Model |
| status | text | running, succeeded, failed, timed_out, rejected |
| provider_request_id | text | Provider kimliği |
| request_payload_hash | text | Payload hash |
| response_payload_reference | text | Büyük response referansı |
| finish_reason | text | Bitirme nedeni |
| error_class | text | Hata sınıfı |
| error_code | text | Hata kodu |
| error_message | text | Maskelenmiş mesaj |
| latency_ms | integer | Süre |
| started_at | timestamptz | Başlangıç |
| completed_at | timestamptz | Tamamlanma |
| created_at | timestamptz | Oluşturulma |

```text
UNIQUE (generation_request_id, attempt_number)
```

---

## 19. Generation Output

### `ai.generation_outputs`

```text
id
generation_request_id
generation_attempt_id
output_type
raw_output_reference
normalized_output
output_hash
language
validation_status
moderation_status
quality_status
accepted_at
created_at
```

Output type:

```text
text
json
image
audio
embedding
moderation_result
```

---

## 20. Structured Output Validation

### `ai.output_validations`

```text
id
generation_output_id
output_schema_id
validation_status
validation_errors
repair_attempted
repair_generation_request_id
validated_at
created_at
```

Durumlar:

```text
valid
invalid
repaired
rejected
```

---

## 21. Moderation Result

### `ai.moderation_results`

```text
id
generation_request_id
generation_output_id
moderation_model_id
policy_id
status
category_scores
flagged_categories
decision
review_required
created_at
```

Decision:

```text
allow
allow_with_changes
regenerate
block
manual_review
```

---

## 22. Human/Parent Review

### `ai.generation_reviews`

```text
id
generation_request_id
generation_output_id
reviewer_type
reviewer_id
review_type
status
rating
feedback
created_at
```

Review type:

```text
quality
safety
age_appropriateness
character_consistency
story_continuity
parent_approval
```

---

## 23. Usage Record

### `ai.ai_usage_records`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Usage kimliği |
| generation_request_id | uuid | Request |
| generation_attempt_id | uuid | Attempt |
| ai_model_id | uuid | Model |
| usage_type | text | text, image, tts, embedding, moderation |
| input_tokens | bigint | Input token |
| output_tokens | bigint | Output token |
| cached_input_tokens | bigint | Cache token |
| total_tokens | bigint | Toplam |
| image_count | integer | Görsel sayısı |
| image_width | integer | Genişlik |
| image_height | integer | Yükseklik |
| image_megapixels | numeric | MP |
| audio_duration_seconds | numeric | Ses süresi |
| character_count | bigint | TTS karakter |
| request_count | integer | Request |
| provider_usage_payload | jsonb | Provider kullanım bilgisi |
| recorded_at | timestamptz | Kayıt |

---

## 24. Görsel Megapiksel Hesabı

```text
megapixels = width × height ÷ 1,000,000
```

Örnek:

```text
768 × 768 = 0.589824 MP
```

Maliyet:

```text
actual_cost = megapixels × price_per_megapixel
```

Yuvarlama sağlayıcının fiyatlandırma politikasına göre yapılır.

---

## 25. Cost Record

### `ai.ai_cost_records`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Cost kimliği |
| generation_request_id | uuid | Request |
| generation_attempt_id | uuid | Attempt |
| usage_record_id | uuid | Usage |
| pricing_id | uuid | Kullanılan fiyat |
| cost_type | text | estimated, actual, adjustment, refunded |
| provider_currency | text | Sağlayıcı para birimi |
| provider_amount | numeric | Sağlayıcı tutarı |
| exchange_rate_snapshot_id | uuid | Kur |
| amount_try | numeric | TL karşılığı |
| calculation_details | jsonb | Hesap detayı |
| billing_status | text | unbilled, estimated, billed, reconciled |
| created_at | timestamptz | Oluşturulma |

---

## 26. Exchange Rate Snapshot

### `finance.exchange_rate_snapshots`

```text
id
base_currency
quote_currency
rate
source
effective_at
captured_at
```

Örnek:

```text
USD -> TRY
EUR -> TRY
```

Aynı cost kaydı sonradan farklı kurla yeniden hesaplanmamalıdır; kullanılan snapshot korunur.

---

## 27. Cost Preview

### `ai.cost_previews`

```text
id
generation_type
world_id
child_profile_id
routing_policy_id
estimated_model_id
estimated_usage
estimated_provider_currency
estimated_provider_amount
exchange_rate_snapshot_id
estimated_amount_try
confidence_level
expires_at
created_at
```

Preview ile actual cost farkı ayrıca analiz edilebilir.

---

## 28. Cost Preview Kuralları

Cost preview:

- prompt token tahmini;
- beklenen output token;
- görsel çözünürlüğü;
- görsel adedi;
- TTS karakter veya süre tahmini;
- fallback olasılığı;
- cache hit ihtimali

üzerinden hesaplanır.

Preview kullanıcıya TL olarak gösterilebilir.

---

## 29. Budget Policy

### `ai.budget_policies`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Policy |
| scope_type | text | system, user, child_profile, world, feature |
| scope_id | uuid | Scope |
| period_type | text | daily, weekly, monthly, story, custom |
| soft_limit_try | numeric | Uyarı limiti |
| hard_limit_try | numeric | Kesin limit |
| warning_threshold_percent | numeric | Uyarı yüzdesi |
| action_on_soft_limit | text | warn, downgrade, require_approval |
| action_on_hard_limit | text | block, downgrade, parent_approval |
| status | text | active, paused, archived |
| effective_from | timestamptz | Başlangıç |
| effective_until | timestamptz | Bitiş |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

---

## 30. Budget Consumption

### `ai.budget_consumptions`

```text
id
budget_policy_id
period_start
period_end
estimated_amount_try
actual_amount_try
reserved_amount_try
released_amount_try
updated_at
```

```text
UNIQUE (budget_policy_id, period_start, period_end)
```

---

## 31. Budget Reservation

Generation başlamadan önce tahmini maliyet reserve edilebilir.

### `ai.budget_reservations`

```text
id
budget_policy_id
generation_request_id
reserved_amount_try
status
reserved_at
released_at
committed_at
expires_at
```

Durumlar:

```text
active
committed
released
expired
```

---

## 32. Quota Policy

### `ai.quota_policies`

```text
id
scope_type
scope_id
quota_type
limit_value
period_type
action_on_exceed
status
created_at
updated_at
```

Quota türleri:

```text
generation_requests
input_tokens
output_tokens
images
image_megapixels
tts_seconds
embedding_tokens
premium_model_calls
```

---

## 33. Quota Consumption

### `ai.quota_consumptions`

```text
id
quota_policy_id
period_start
period_end
consumed_value
reserved_value
updated_at
```

---

## 34. AI Cache

### `ai.generation_cache_entries`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Cache |
| cache_key | text | Anahtar |
| generation_type | text | Tür |
| ai_model_id | uuid | Model |
| prompt_version_id | uuid | Prompt |
| input_hash | text | Input |
| parameter_hash | text | Parametre |
| context_version_hash | text | Bağlam |
| generation_output_id | uuid | Çıktı |
| safety_status | text | Safety |
| quality_status | text | Quality |
| hit_count | integer | Hit |
| last_hit_at | timestamptz | Son hit |
| expires_at | timestamptz | Süre |
| created_at | timestamptz | Oluşturulma |

```text
UNIQUE (cache_key)
```

---

## 35. Cache Kullanım Kuralları

Cache yalnızca şu koşullarda kullanılabilir:

- output safety approved;
- output schema valid;
- model ve prompt version uyumlu;
- context version değişmemiş;
- personalization boundary ihlal edilmiyor;
- child profile özel içeriği başka profile sızmıyor;
- story continuity açısından reuse güvenli.

---

## 36. Asset Reuse Entegrasyonu

Image generation output, Paket 09’daki asset tablolarına bağlanır.

Akış:

```text
generation output accepted
asset created
asset generation metadata linked
quality review completed
reuse eligibility calculated
cache entry created
```

---

## 37. Generation Reuse Record

### `ai.generation_reuse_records`

```text
id
source_generation_request_id
target_generation_request_id
generation_output_id
reuse_type
reuse_reason
estimated_cost_saved_try
quality_score
created_at
```

Reuse type:

```text
exact_cache
semantic_reuse
asset_reuse
prompt_fragment_reuse
voice_reuse
```

---

## 38. Fallback ve Retry

Fallback tetikleyicileri:

```text
provider_timeout
rate_limit
provider_5xx
unsupported_output_schema
quality_below_threshold
moderation_rejected
model_unavailable
budget_downgrade
```

Fallback tetiklenmemesi gereken durumlar:

```text
invalid_domain_input
authorization_failure
unsafe_user_request
hard_budget_limit
missing_required_context
```

---

## 39. Provider Error Mapping

### `ai.provider_error_mappings`

```text
id
provider_id
provider_error_code
normalized_error_class
retryable
fallback_allowed
default_retry_delay_seconds
created_at
updated_at
```

Normalized classes:

```text
rate_limited
temporarily_unavailable
invalid_request
authentication_failed
content_rejected
timeout
quota_exceeded
provider_internal_error
unknown
```

---

## 40. Generation Quality Score

### `ai.generation_quality_scores`

```text
id
generation_output_id
quality_dimension
score
evaluator_type
evaluator_id
evidence
created_at
```

Quality dimension:

```text
coherence
age_appropriateness
story_continuity
character_consistency
choice_quality
originality
visual_consistency
audio_quality
instruction_following
```

---

## 41. Generation Decision

### `ai.generation_decisions`

```text
id
generation_request_id
generation_output_id
decision
decision_reason
decided_by_type
decided_by_id
created_at
```

Decision:

```text
accepted
accepted_with_edits
regenerate
fallback
blocked
manual_review
```

---

## 42. Prompt Evaluation

### `ai.prompt_evaluations`

```text
id
prompt_version_id
ai_model_id
evaluation_suite
sample_count
average_quality_score
schema_success_rate
moderation_pass_rate
average_latency_ms
average_cost_try
status
evaluated_at
```

Bu tablo prompt veya model değişikliklerini karşılaştırmak için kullanılır.

---

## 43. Experiment Modeli

### `ai.ai_experiments`

```text
id
experiment_key
generation_type
status
allocation_strategy
starts_at
ends_at
created_at
```

### `ai.ai_experiment_variants`

```text
id
experiment_id
variant_key
prompt_version_id
ai_model_id
routing_policy_id
allocation_percent
created_at
```

Child safety ve parental expectations deney uğruna düşürülemez.

---

## 44. Request Lifecycle

```text
request created
budget checked
quota checked
budget reserved
job queued
routing policy resolved
attempt started
provider response received
usage recorded
cost calculated
output normalized
schema validated
moderation applied
quality reviewed
decision made
budget committed
request completed
outbox events published
```

---

## 45. Transaction Sınırları

### Generation Request Creation

```text
begin
validate policy
create generation request
reserve budget
reserve quota
enqueue background job
insert outbox
commit
```

### Attempt Completion

```text
begin
insert provider response metadata
insert usage record
insert estimated/actual cost
insert output
mark attempt succeeded
move request to validating
insert outbox
commit
```

### Output Acceptance

```text
begin
validate schema
validate moderation
record quality
mark output accepted
commit budget reservation
commit quota
mark request completed
create cache entry if eligible
insert outbox
commit
```

### Failure

```text
begin
record attempt failure
classify error
release or keep reservation
schedule retry or fallback
if terminal mark request failed
insert outbox
commit
```

---

## 46. Idempotency

İdempotency gerektiren işlemler:

- generation request;
- provider attempt submission;
- usage import;
- cost creation;
- output acceptance;
- budget reservation;
- quota reservation;
- cache insertion;
- asset creation;
- moderation request;
- TTS generation.

Örnek key:

```text
story_session_id + scene_id + generation_type + revision
prompt_hash + model + parameter_hash
provider_request_id
generation_request_id + attempt_number
```

---

## 47. İndeks Stratejisi

### `ai_models`

```text
(provider_id, lifecycle_status)
(modality, lifecycle_status)
(quality_tier, latency_tier)
```

### `prompt_versions`

```text
(prompt_template_id, version_number DESC)
(lifecycle_status)
```

### `generation_requests`

```text
(status, priority DESC, requested_at)
(world_id, requested_at DESC)
(child_profile_id, requested_at DESC)
(story_session_id)
(correlation_id)
```

### `generation_attempts`

```text
(generation_request_id, attempt_number)
(ai_model_id, status, started_at)
(provider_request_id)
```

### `ai_usage_records`

```text
(ai_model_id, recorded_at)
(generation_request_id)
(usage_type, recorded_at)
```

### `ai_cost_records`

```text
(generation_request_id)
(amount_try)
(created_at DESC)
(billing_status)
```

### `generation_cache_entries`

```text
(cache_key)
(generation_type, ai_model_id)
(expires_at)
```

---

## 48. Partitioning Adayları

Yüksek hacimli tablolar:

```text
generation_requests
generation_attempts
ai_usage_records
ai_cost_records
moderation_results
generation_quality_scores
```

Partition seçenekleri:

```text
created_at by month
world_id hash
```

İlk sürümde zorunlu değildir.

---

## 49. Repository Tasarımı

### `AIProviderRepository`

```text
createProvider
findByKey
updateStatus
listActive
```

### `AIModelRepository`

```text
createModel
findById
listByCapability
findActivePricing
deprecate
```

### `PromptRepository`

```text
createTemplate
createVersion
activateVersion
findActiveVersion
retireVersion
```

### `GenerationRepository`

```text
createRequest
createAttempt
completeAttempt
failAttempt
createOutput
completeRequest
failRequest
```

### `UsageCostRepository`

```text
recordUsage
createCost
reconcileCost
createPreview
```

### `BudgetRepository`

```text
evaluate
reserve
commit
release
getConsumption
```

### `CacheRepository`

```text
findEligible
createEntry
recordHit
expire
```

---

## 50. Domain Events

Önerilen olaylar:

```text
AIProviderCreated
AIProviderStatusChanged
AIModelRegistered
AIModelDeprecated
AIModelPricingUpdated

PromptTemplateCreated
PromptVersionCreated
PromptVersionActivated
PromptVersionRetired

GenerationRequested
GenerationStarted
GenerationAttemptStarted
GenerationAttemptSucceeded
GenerationAttemptFailed
GenerationFallbackSelected
GenerationCompleted
GenerationCancelled

OutputValidationSucceeded
OutputValidationFailed
ModerationPassed
ModerationRejected
GenerationAccepted
GenerationRejected

AIUsageRecorded
AICostEstimated
AICostRecorded
AICostReconciled

BudgetReserved
BudgetCommitted
BudgetReleased
BudgetSoftLimitReached
BudgetHardLimitReached

QuotaReserved
QuotaExceeded
QuotaReleased

GenerationCacheHit
GenerationCacheEntryCreated
GenerationOutputReused
GenerationQualityReviewed
```

---

## 51. Outbox Kullanımları

- generation job başlatma;
- provider request;
- moderation job;
- structured output repair;
- asset creation;
- TTS asset oluşturma;
- cost aggregation;
- budget warning;
- parent approval bildirimi;
- provider degradation alarmı;
- prompt evaluation;
- analytics event gönderme.

---

## 52. Güvenlik ve Gizlilik

- API key DB’de tutulmaz.
- Parent-private context maskelenir.
- Child profile verisi başka profile cache edilemez.
- Raw prompt ve output retention policy ile sınırlandırılır.
- Provider’a gönderilen veri minimum tutulur.
- Gereksiz kişisel tanımlayıcılar prompt’tan çıkarılır.
- Moderation sonucu atlanamaz.
- Unsafe output cache’e alınmaz.
- Output acceptance işlemi audit edilir.
- Model ve prompt değişikliği sürümlenir.
- Provider request loglarında secret header saklanmaz.
- Cost kayıtları çocuk ekranında detaylı provider verisiyle gösterilmez.

---

## 53. Retention

Öneri:

```text
provider/model catalog: kalıcı
prompt versions: kalıcı
generation metadata: uzun süreli
raw provider payload: kısa/orta süreli
accepted outputs: ürün retention politikasına göre
rejected unsafe outputs: minimize edilmiş metadata
usage and cost: finansal analiz süresince
cache: expiry bazlı
quality review: uzun süreli
```

---

## 54. Migration Planı

Migration adı:

```text
0011_ai_generation_cost_usage.sql
```

Aşamalar:

1. `ai` ve `finance` şemalarını oluştur.
2. provider tablolarını oluştur.
3. model ve pricing tablolarını oluştur.
4. routing policy tablolarını oluştur.
5. prompt, version, variable ve output schema tablolarını oluştur.
6. safety policy tablolarını oluştur.
7. generation request, input, attempt ve output tablolarını oluştur.
8. validation, moderation ve review tablolarını oluştur.
9. usage, cost ve exchange rate tablolarını oluştur.
10. preview, budget ve quota tablolarını oluştur.
11. cache ve reuse tablolarını oluştur.
12. provider error mapping tablolarını oluştur.
13. quality, decision, evaluation ve experiment tablolarını oluştur.
14. partial unique index ve check constraint’leri ekle.
15. seed provider capability ve policy kayıtlarını ekle.
16. integration, cost ve fallback testlerini çalıştır.

---

## 55. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/ai/
├── ai-providers.table.ts
├── ai-models.table.ts
├── ai-model-pricing.table.ts
├── model-routing-policies.table.ts
├── model-routing-policy-steps.table.ts
├── prompt-templates.table.ts
├── prompt-versions.table.ts
├── prompt-variables.table.ts
├── output-schemas.table.ts
├── ai-safety-policies.table.ts
├── generation-requests.table.ts
├── generation-input-snapshots.table.ts
├── generation-attempts.table.ts
├── generation-outputs.table.ts
├── output-validations.table.ts
├── moderation-results.table.ts
├── generation-reviews.table.ts
├── ai-usage-records.table.ts
├── ai-cost-records.table.ts
├── cost-previews.table.ts
├── budget-policies.table.ts
├── budget-consumptions.table.ts
├── budget-reservations.table.ts
├── quota-policies.table.ts
├── quota-consumptions.table.ts
├── generation-cache-entries.table.ts
├── generation-reuse-records.table.ts
├── provider-error-mappings.table.ts
├── generation-quality-scores.table.ts
├── generation-decisions.table.ts
├── prompt-evaluations.table.ts
├── ai-experiments.table.ts
├── ai-experiment-variants.table.ts
├── ai.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/finance/
├── exchange-rate-snapshots.table.ts
├── finance.relations.ts
└── index.ts
```

---

## 56. Test Gereksinimleri

Zorunlu testler:

- provider key unique;
- secret reference persistence;
- model capability filter;
- pricing effective date;
- prompt version immutability;
- active prompt resolution;
- variable schema validation;
- generation request idempotency;
- budget reservation;
- hard budget limit;
- soft limit downgrade;
- quota exceed;
- provider attempt;
- retryable error;
- non-retryable error;
- fallback model;
- provider timeout;
- structured output valid;
- structured output invalid;
- repair generation;
- moderation block;
- accepted output;
- token usage calculation;
- image megapixel calculation;
- TTS usage calculation;
- actual cost calculation;
- exchange-rate snapshot;
- TL cost preview;
- preview vs actual difference;
- cache exact hit;
- cache personalization isolation;
- unsafe output cache rejection;
- asset reuse;
- quality review;
- prompt evaluation;
- concurrent budget reservation;
- duplicate provider response;
- outbox atomikliği.

---

## 57. Failure Injection Testleri

```text
provider request sonrası timeout
provider response geldi fakat DB write başarısız
aynı provider request iki kez callback döner
pricing kaydı bulunamaz
exchange rate snapshot eksik
budget reservation yapılmışken job iptal olur
moderation provider unavailable
primary model rate limited
fallback model schema dışı sonuç döner
cache entry stale context ile eşleşir
provider actual usage estimate’den yüksek gelir
```

---

## 58. Acceptance Criteria

Paket 12 şu koşullarda tamamlanmış kabul edilir:

1. Provider ve model ayrı modellenmiştir.
2. API secret DB’de düz metin tutulmaz.
3. Model capability ve lifecycle desteklenir.
4. Fiyat geçmişi sürümlenir.
5. Prompt template ve immutable prompt version ayrıdır.
6. Structured output schema sürümlenir.
7. Generation request ve attempt ayrıdır.
8. Bir request birden fazla fallback attempt destekler.
9. Input snapshot ve output normalization vardır.
10. Validation ve moderation zorunlu aşamalardır.
11. Token, image MP, TTS ve request kullanımı ölçülür.
12. Estimated ve actual cost ayrıdır.
13. Sağlayıcı para birimi ve TL karşılığı saklanır.
14. Exchange-rate snapshot kullanılır.
15. Cost preview desteklenir.
16. Budget soft ve hard limitleri vardır.
17. Budget reservation desteklenir.
18. Quota policy desteklenir.
19. Cache personalization boundary korur.
20. Unsafe veya invalid output reuse edilmez.
21. Retry ve fallback policy merkezi olarak yönetilir.
22. Provider hata kodları normalize edilir.
23. Quality score ve review kayıtları vardır.
24. Asset persistence ile entegrasyon tanımlıdır.
25. Audit, outbox, job ve idempotency entegrasyonu tanımlıdır.
26. Migration ve Drizzle dosya yapısı tanımlıdır.
27. Cost, safety, fallback ve concurrency testleri tanımlıdır.

---

## 59. Paket 12 Özeti

Paket 12 ile LUMI’nin AI üretim ve maliyet yönetimi persistence katmanı kesinleşmiştir.

Bu tasarım sayesinde:

- farklı AI sağlayıcıları ve modelleri merkezi biçimde yönetilebilir;
- model değişiklikleri uygulama koduna yayılmaz;
- prompt’lar sürümlü ve denetlenebilir olur;
- her üretim isteği ve provider denemesi izlenebilir;
- structured output ve moderation hataları güvenle ele alınır;
- primary model başarısız olduğunda kontrollü fallback yapılır;
- token, görsel megapiksel ve TTS kullanımı ölçülür;
- maliyet sağlayıcı para birimi ve TL karşılığıyla saklanır;
- hikâye veya görsel üretiminden önce cost preview gösterilebilir;
- bütçe ve kota aşımları üretim öncesinde engellenebilir;
- güvenli ve kaliteli çıktılar cache veya asset reuse ile yeniden kullanılabilir;
- aynı içeriğin gereksiz tekrar üretimi ve maliyeti azaltılır;
- ebeveyn kontrolü, çocuk güvenliği ve finansal sınırlar birlikte korunur.

---

## 60. Sonraki Paket

**Paket 13 — Analytics, Telemetry, Product Metrics & Observability Persistence Schema**

Kapsam:

- product events;
- story engagement;
- choice analytics;
- child-safe learning metrics;
- parent dashboard metrics;
- funnels;
- cohorts;
- feature usage;
- cost analytics;
- operational telemetry;
- traces and spans references;
- alert rules;
- metric aggregation;
- privacy-aware analytics;
- retention and sampling.
