# Project LUMI — Persistence Implementation
# Paket 10 — Event, Memory, Knowledge & Embedding Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM + pgvector
- **Bağımlılıklar:** Paket 01–09
- **Ana Aggregate'ler:** DomainEvent, MemoryRecord, KnowledgeRecord, Rumor, EmbeddingDocument
- **Kapsam:** Olaylar, hafızalar, bilgiler, söylentiler, doğruluk, çelişki, provenance, embedding ve context retrieval

---

## 1. Paket Amacı

Bu paket, Project LUMI içindeki olayların, karakter ve dünya hafızalarının, bilinen gerçeklerin, söylentilerin ve semantik arama kayıtlarının kalıcı veri modelini tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- domain event geçmişi;
- dünya ve hikâye olaylarının bilgiye dönüşmesi;
- karakter bazlı kişisel hafıza;
- ortak veya toplumsal hafıza;
- kısa, orta ve uzun süreli hafıza;
- duygusal yoğunluk ve unutulma;
- söylenti üretimi ve yayılması;
- doğru, yanlış, belirsiz veya çelişkili bilgi;
- kaynak ve provenance takibi;
- aynı olayın farklı karakterlerce farklı yorumlanması;
- context builder için ilgili kayıt seçimi;
- embedding üretimi ve pgvector ile semantik retrieval;
- relevance, recency, proximity ve narrative importance skorlaması;
- hikâye üretiminde bağlam bütçesi yönetimi;
- arşivleme, retention ve yeniden indeksleme;
- Story Outcome & World State Commit entegrasyonu.

---

## 2. Temel Tasarım Kararları

1. Domain event, hafıza ve bilgi aynı kavram değildir.
2. Event gerçekleşen şeyi; memory öznenin hatırladığı şeyi; knowledge doğrulanabilir bilgiyi temsil eder.
3. Aynı event birden çok karakterde farklı memory oluşturabilir.
4. Memory öznel olabilir ve yanlış olabilir.
5. Knowledge record kaynak, güven ve doğruluk seviyesi taşır.
6. Rumor, doğrulanmamış ve yayılabilir bilgi olarak ayrı modellenir.
7. Embedding tablosu domain kayıtlarının yerine geçmez.
8. Embedding sadece retrieval projection’dır.
9. Her embedding kaynak kayda ve sürüme bağlıdır.
10. Çelişkili bilgiler silinmez; contradiction ilişkisiyle tutulur.
11. Context builder tüm veriyi LLM’e göndermez.
12. Retrieval relevance, proximity, recency, importance ve continuity üzerinden yapılır.
13. Hassas ebeveyn notları ve güvenlik kayıtları çocuk context’ine dahil edilmez.
14. Event store append-only çalışır.
15. Memory strength zamanla azalabilir; ancak kritik ve continuity bağlı hafızalar korunabilir.
16. Rumor propagation kontrollü ve scope bazlıdır.
17. Provenance zinciri kırılmamalıdır.
18. Embedding model sürümü değişirse yeniden indeksleme desteklenmelidir.
19. pgvector kullanımı opsiyonel feature flag ile açılıp kapatılabilir.
20. Ham LLM context’i kalıcı source of truth olarak kabul edilmez.

---

## 3. Kavramsal Ayrım

### Event

Gerçekleşen domain olayı:

```text
Ejderha kurtarıldı.
Anahtar mağarada kullanıldı.
Köprü yıkıldı.
Festival başladı.
```

### Memory

Bir öznenin olayı nasıl hatırladığı:

```text
Çocuk ejderhanın korktuğunu hatırlıyor.
NPC kendisinin yardım ettiğini düşünüyor.
Bir karakter mağarada yalnız kaldığını hatırlıyor.
```

### Knowledge

Dünya içinde doğru veya doğrulanabilir kabul edilen bilgi:

```text
Kuzey geçidi kapalıdır.
Anahtar artık kullanılmamaktadır.
Festival üç gün sürecektir.
```

### Rumor

Doğruluğu belirsiz yayılan bilgi:

```text
Dağın içinde uyuyan bir dev varmış.
Deniz fenerinde gizli bir harita bulunmuş.
```

---

## 4. Domain Event Store

### `event.domain_events`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Event kimliği |
| world_id | uuid | Dünya |
| event_sequence | bigint | Dünya bazlı sıra |
| aggregate_type | text | Aggregate türü |
| aggregate_id | uuid | Aggregate kimliği |
| aggregate_version | integer | Aggregate sürümü |
| event_type | text | Event adı |
| payload | jsonb | Event verisi |
| metadata | jsonb | Teknik metadata |
| source_type | text | story, simulation, admin, system |
| source_id | uuid | Kaynak |
| actor_type | text | child, parent, npc, system |
| actor_id | uuid | Aktör |
| correlation_id | uuid | İşlem zinciri |
| causation_id | uuid | Nedensellik |
| idempotency_key | text | Tekrarlı kayıt koruması |
| occurred_at_world_time | timestamptz | Dünya zamanı |
| recorded_at | timestamptz | DB zamanı |
| schema_version | integer | Event şeması |

```text
UNIQUE (world_id, event_sequence)
UNIQUE (world_id, idempotency_key)
```

---

## 5. Event Metadata

Önerilen metadata alanları:

```text
trace_id
request_id
session_id
story_session_id
simulation_run_id
commit_batch_id
service_name
service_version
user_agent
locale
safety_status
```

Bu metadata domain payload’dan ayrılmalıdır.

---

## 6. Event Projection Durumu

### `event.event_projection_offsets`

```text
id
projection_name
world_id
last_event_sequence
projection_version
status
updated_at
```

Projection örnekleri:

```text
character_memory_projection
world_knowledge_projection
rumor_projection
embedding_projection
context_index_projection
analytics_projection
```

---

## 7. Event İşleme Hataları

### `event.event_processing_failures`

```text
id
projection_name
domain_event_id
failure_type
failure_reason
retry_count
next_retry_at
status
created_at
updated_at
```

Durumlar:

```text
pending
retrying
resolved
dead_letter
ignored
```

---

## 8. Memory Record Modeli

### `memory.memory_records`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Hafıza kimliği |
| world_id | uuid | Dünya |
| subject_type | text | character, child_profile, community, location |
| subject_id | uuid | Hatırlayan özne |
| memory_type | text | episodic, semantic, emotional, social, procedural |
| title | text | Kısa başlık |
| summary | text | Hafıza özeti |
| content | text | Detaylı içerik |
| source_event_id | uuid | Kaynak event |
| source_story_session_id | uuid | Kaynak hikâye |
| source_memory_id | uuid | Başka hafızadan türediyse |
| perspective | text | first_person, observed, told, inferred |
| truth_status | text | true, false, uncertain, subjective |
| importance | numeric | Önem |
| emotional_intensity | numeric | Duygusal yoğunluk |
| confidence | numeric | Hatırlama güveni |
| memory_strength | numeric | Hafıza gücü |
| recall_count | integer | Hatırlanma sayısı |
| last_recalled_at | timestamptz | Son hatırlama |
| occurred_at_world_time | timestamptz | Olay zamanı |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| archived_at | timestamptz | Arşiv |
| version | integer | Concurrency |
| metadata | jsonb | Ek bilgiler |

---

## 9. Hafıza Türleri

### Episodic Memory

Belirli bir olay:

```text
Mağaraya ilk kez girdi.
Dedesi ona haritayı verdi.
```

### Semantic Memory

Genel bilgi:

```text
Kuzey ormanı sisli olur.
Balıkçı sabah erken kalkar.
```

### Emotional Memory

Duygusal iz:

```text
Fırtına sırasında korktu.
Ejderhayı kurtarınca gurur duydu.
```

### Social Memory

İlişki temelli:

```text
Mira sözünü tuttu.
Tüccar daha önce yardım etmedi.
```

### Procedural Memory

Nasıl yapılacağını bilme:

```text
Eski kapı üç sembolle açılır.
Kayıp patika taş işaretleriyle bulunur.
```

---

## 10. Memory Links

### `memory.memory_links`

```text
id
source_memory_id
target_memory_id
link_type
strength
created_at
```

Türler:

```text
caused_by
supports
contradicts
reminds_of
same_event
same_character
same_location
continuation
```

---

## 11. Memory Participants

### `memory.memory_participants`

```text
id
memory_id
participant_type
participant_id
participant_role
salience
created_at
```

Bu tablo hafızanın ilgili karakter, eşya ve konumlarını normalize eder.

---

## 12. Memory Decay

### `memory.memory_decay_profiles`

```text
id
profile_key
base_decay_rate
importance_modifier
emotion_modifier
recall_modifier
continuity_modifier
minimum_strength
created_at
updated_at
```

Önerilen mantık:

```text
new_strength =
old_strength
- base_decay
+ importance_modifier
+ emotional_modifier
+ recall_modifier
+ continuity_modifier
```

Kritik hafızalar:

- sözler;
- yaralanmalar;
- kayıp eşya;
- unresolved goal;
- continuation marker;
- güven veya ihanet;
- aile bağlantıları

otomatik olarak tamamen unutulmamalıdır.

---

## 13. Memory Reinforcement

### `memory.memory_reinforcements`

```text
id
memory_id
reinforcement_type
source_type
source_id
strength_delta
reason
created_at
```

Türler:

```text
recalled
mentioned
repeated_event
emotional_trigger
story_callback
relationship_interaction
parent_review
```

---

## 14. Memory Distortion

### `memory.memory_distortions`

```text
id
memory_id
distortion_type
original_payload
distorted_payload
confidence_delta
source_type
source_id
created_at
```

Distortion türleri:

```text
omission
exaggeration
misattribution
emotional_bias
rumor_influence
time_decay
```

Bu yapı yanlış hafızayı destekler; ancak çocuk deneyiminde dikkatli ve yaşa uygun kullanılmalıdır.

---

## 15. Knowledge Record Modeli

### `knowledge.knowledge_records`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Bilgi kimliği |
| world_id | uuid | Dünya |
| subject_type | text | Konu türü |
| subject_id | uuid | Konu |
| predicate | text | İlişki veya özellik |
| object_type | text | Nesne türü |
| object_id | uuid | Nesne |
| object_value | jsonb | Değer |
| statement_text | text | İnsan okunur ifade |
| knowledge_type | text | fact, rule, belief, observation, inference |
| truth_status | text | verified, probable, uncertain, false, disputed |
| confidence | numeric | Güven |
| importance | numeric | Önem |
| visibility | text | private, limited, public, hidden |
| valid_from_world_time | timestamptz | Geçerlilik başlangıcı |
| valid_until_world_time | timestamptz | Geçerlilik sonu |
| source_type | text | event, memory, rumor, admin, simulation |
| source_id | uuid | Kaynak |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| superseded_at | timestamptz | Geçersizleşme |
| version | integer | Concurrency |
| metadata | jsonb | Ek bilgiler |

---

## 16. Knowledge Statement Örnekleri

```text
subject: northern_pass
predicate: accessibility_status
object_value: blocked
truth_status: verified
```

```text
subject: old_key
predicate: opens
object: cave_gate
truth_status: probable
```

```text
subject: lighthouse_keeper
predicate: knows_location_of
object: hidden_map
truth_status: disputed
```

---

## 17. Knowledge Sources

### `knowledge.knowledge_sources`

```text
id
knowledge_record_id
source_type
source_id
source_reliability
supports_or_refutes
evidence_summary
created_at
```

Bir knowledge record birden fazla kaynağa sahip olabilir.

---

## 18. Contradiction Modeli

### `knowledge.knowledge_contradictions`

```text
id
knowledge_record_id
conflicting_knowledge_record_id
contradiction_type
severity
resolution_status
resolution_reason
resolved_knowledge_record_id
created_at
resolved_at
```

Türler:

```text
direct
temporal
perspective
scope
source_disagreement
```

Çelişki durumunda kayıt silinmez.

---

## 19. Knowledge Supersession

Eski bilgi geçersizleştiğinde:

```text
old record -> superseded_at set
new record -> active
link -> supersedes
```

Örnek:

```text
Köprü kapalıydı.
Köprü onarıldı.
```

Bu iki bilgi zaman aralıklarıyla birlikte doğru olabilir.

---

## 20. Belief Modeli

### `knowledge.subject_beliefs`

```text
id
world_id
believer_type
believer_id
knowledge_record_id
belief_status
confidence
source_type
source_id
acquired_at
updated_at
```

Bir NPC yanlış bir knowledge record’a inanabilir.

Bu sayede:

- farklı karakterler farklı şeyler bilir;
- yanlış söylentiler davranışları etkiler;
- bilgi dağılımı gerçekçi olur;
- LLM tüm karakterleri her şeyi bilen varlıklar gibi yazmaz.

---

## 21. Rumor Modeli

### `rumor.rumors`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Söylenti kimliği |
| world_id | uuid | Dünya |
| rumor_key | text | Teknik anahtar |
| statement_text | text | Söylenti |
| subject_type | text | Konu türü |
| subject_id | uuid | Konu |
| truth_status | text | unknown, true, false, mixed |
| confidence | numeric | Genel güven |
| sensationality | numeric | Dikkat çekicilik |
| emotional_vector | jsonb | Duygusal etki |
| origin_type | text | character, event, memory, system |
| origin_id | uuid | Kaynak |
| lifecycle_status | text | active, fading, resolved, disproven, archived |
| created_at_world_time | timestamptz | Dünya zamanı |
| resolved_at_world_time | timestamptz | Çözülme |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

---

## 22. Rumor Propagation

### `rumor.rumor_propagations`

```text
id
rumor_id
from_subject_type
from_subject_id
to_subject_type
to_subject_id
channel_type
transmission_strength
distortion_payload
transmitted_at_world_time
created_at
```

Kanallar:

```text
conversation
market
family
festival
traveler
letter
story
observation
```

---

## 23. Rumor Exposure

### `rumor.rumor_exposures`

```text
id
rumor_id
subject_type
subject_id
exposure_count
belief_probability
last_exposed_at
status
created_at
updated_at
```

Durumlar:

```text
heard
ignored
believed
doubted
verified
disproved
```

---

## 24. Rumor Resolution

Bir söylenti:

- doğru çıkabilir;
- yanlışlanabilir;
- kısmen doğru olabilir;
- belirsiz kalabilir;
- story opportunity oluşturabilir.

Resolution sonucu knowledge record oluşturabilir veya mevcut kaydı güncelleyebilir.

---

## 25. Embedding Document Modeli

### `embedding.embedding_documents`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Doküman kimliği |
| world_id | uuid | Dünya |
| source_type | text | memory, knowledge, event, story, rumor, item |
| source_id | uuid | Kaynak |
| source_version | integer | Kaynak sürümü |
| chunk_index | integer | Parça sırası |
| content_text | text | Embed edilen metin |
| content_hash | text | İçerik özeti |
| embedding_model | text | Model |
| embedding_dimensions | integer | Boyut |
| embedding | vector | pgvector alanı |
| language | text | Dil |
| visibility_scope | text | Retrieval görünürlüğü |
| quality_status | text | pending, active, stale, failed |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

```text
UNIQUE (source_type, source_id, source_version, chunk_index, embedding_model)
```

---

## 26. pgvector Stratejisi

Önerilen indeks:

```text
HNSW
```

Alternatif:

```text
IVFFlat
```

Seçim veri hacmi ve sorgu desenine göre benchmark ile yapılmalıdır.

İlk aşamada:

```text
vector_cosine_ops
```

önerilir.

---

## 27. Embedding Job Modeli

### `embedding.embedding_jobs`

```text
id
world_id
source_type
source_id
source_version
status
embedding_model
attempt_count
idempotency_key
failure_reason
created_at
started_at
completed_at
```

Durumlar:

```text
queued
running
completed
failed
cancelled
```

---

## 28. Embedding Staleness

Kaynak kayıt değişirse:

```text
existing embedding -> stale
new embedding job -> queued
```

Eski embedding hemen silinmeyebilir; yeni embedding aktif olunca arşivlenir.

---

## 29. Retrieval Query Log

### `embedding.retrieval_queries`

```text
id
world_id
query_type
query_text_hash
query_embedding_model
filter_payload
result_count
latency_ms
story_session_id
created_at
```

Hassas sorgu metni zorunlu değilse düz metin tutulmamalıdır.

---

## 30. Retrieval Result Log

### `embedding.retrieval_results`

```text
id
retrieval_query_id
embedding_document_id
vector_score
relevance_score
recency_score
proximity_score
importance_score
continuity_score
final_score
rank
included_in_context
created_at
```

---

## 31. Context Relevance Skoru

Önerilen bileşenler:

```text
semantic_similarity
recency
importance
emotional_salience
character_proximity
location_proximity
story_continuity
active_goal_connection
current_event_connection
novelty_penalty
duplication_penalty
```

Örnek formül:

```text
final_score =
semantic_similarity * 0.35 +
importance * 0.15 +
recency * 0.10 +
character_proximity * 0.10 +
location_proximity * 0.10 +
story_continuity * 0.10 +
active_goal_connection * 0.05 +
emotional_salience * 0.05
```

Formül sürümlenmeli ve ayarlanabilir olmalıdır.

---

## 32. Context Builder Projection

### `context.context_candidates`

```text
id
world_id
candidate_type
candidate_id
subject_type
subject_id
region_id
location_id
importance
recency
visibility
continuity_score
active_from
active_until
projection_payload
updated_at
```

Bu tablo hızlı filtreleme için kullanılır.

---

## 33. Context Assembly

### `context.context_assemblies`

```text
id
story_session_id
assembly_type
context_budget_tokens
selected_candidate_count
selected_embedding_count
excluded_count
assembly_hash
ruleset_version
created_at
```

### `context.context_assembly_items`

```text
id
context_assembly_id
source_type
source_id
selection_reason
score
token_estimate
sort_order
created_at
```

Bu kayıtlar LLM’e hangi bağlamın neden gönderildiğini denetlenebilir hale getirir.

---

## 34. Context Budget Stratejisi

Örnek dağılım:

```text
active story state: %25
main characters: %20
current location and region: %15
recent relevant memories: %15
active events and goals: %10
important world knowledge: %10
novelty and safety rules: %5
```

Dağılım hikâye tipine göre değişebilir.

---

## 35. Visibility ve Access Scope

Önerilen visibility değerleri:

```text
system_only
parent_only
child_safe
character_private
community
world_public
story_session_only
```

Context builder:

- `parent_only` kayıtları çocuk hikâye üretimine dahil etmez;
- karakter özel hafızasını yalnızca uygun perspektifte kullanır;
- gizli world knowledge’ı child-facing anlatıya doğrudan sızdırmaz.

---

## 36. Provenance Zinciri

Her türetilmiş kaydın kaynağı izlenmelidir.

Örnek zincir:

```text
DomainEvent
-> CharacterMemory
-> Rumor
-> SubjectBelief
-> StoryContext
-> GeneratedStoryScene
```

Provenance olmadan üretilen kritik bilgi validation’da reddedilebilir.

---

## 37. Story Outcome Entegrasyonu

Story outcome şu kayıtları üretebilir:

```text
create_memory
reinforce_memory
distort_memory
create_knowledge
supersede_knowledge
create_rumor
resolve_rumor
create_belief
remove_belief
queue_embedding
```

Outcome effect idempotent olmalıdır.

---

## 38. World Simulation Entegrasyonu

Simulation şu etkileri üretebilir:

- memory decay;
- memory reinforcement;
- rumor propagation;
- rumor distortion;
- knowledge expiry;
- belief confidence change;
- active event knowledge update;
- embedding refresh;
- context projection update.

Kritik continuity memory’leri düşük yoğunluklu simulation ile silinemez.

---

## 39. İndeks Stratejisi

### `domain_events`

```text
(world_id, event_sequence)
(aggregate_type, aggregate_id, aggregate_version)
(correlation_id)
(source_type, source_id)
(recorded_at)
```

### `memory_records`

```text
(world_id, subject_type, subject_id)
(source_event_id)
(source_story_session_id)
(importance DESC)
(last_recalled_at DESC)
```

### `knowledge_records`

```text
(world_id, subject_type, subject_id, predicate)
(truth_status, confidence DESC)
(valid_from_world_time, valid_until_world_time)
(source_type, source_id)
```

### `rumors`

```text
(world_id, lifecycle_status)
(subject_type, subject_id)
(sensationality DESC)
(created_at_world_time DESC)
```

### `embedding_documents`

```text
(world_id, source_type)
(source_type, source_id, source_version)
(quality_status)
```

Vector index ayrıca oluşturulur.

---

## 40. Partitioning Adayları

Yüksek hacimli tablolar:

```text
domain_events
memory_records
memory_reinforcements
rumor_propagations
embedding_documents
retrieval_queries
retrieval_results
context_assemblies
```

Partition seçenekleri:

```text
recorded_at by month
world_id hash partition
```

İlk sürümde zorunlu değildir.

---

## 41. Transaction Sınırları

### Event Append

```text
lock aggregate or sequence allocator
validate aggregate version
insert domain event
insert projection outbox
commit
```

### Memory Oluşturma

```text
validate source event
validate subject scope
insert memory
insert participants
insert links
queue embedding job
create domain event
create outbox message
commit
```

### Knowledge Güncelleme

```text
load active knowledge
detect contradiction
supersede old record if required
insert new knowledge
insert sources
insert contradiction links
queue embedding
commit
```

### Rumor Yayılımı

```text
validate rumor active
validate channel and subjects
create propagation
update exposure
optionally create belief
create domain event
commit
```

---

## 42. Idempotency

İdempotency gerektiren işlemler:

- event append;
- memory creation from event;
- knowledge projection;
- rumor propagation;
- belief creation;
- embedding job;
- context assembly;
- story outcome memory commit.

Anahtar örnekleri:

```text
domain_event_id + projection_name
story_outcome_effect_id
rumor_id + target_subject_id + time_window
source_id + source_version + embedding_model
story_session_id + assembly_type + state_version
```

---

## 43. Repository Tasarımı

### `DomainEventRepository`

```text
append
findByAggregate
findByWorldSequence
findByCorrelationId
```

### `MemoryRepository`

```text
createMemory
findById
listForSubject
reinforce
applyDecay
archive
```

### `KnowledgeRepository`

```text
createKnowledge
findActiveStatement
findBySubject
supersede
linkContradiction
resolveContradiction
```

### `RumorRepository`

```text
createRumor
propagate
recordExposure
resolve
archive
```

### `EmbeddingRepository`

```text
upsertDocument
markStale
searchSimilar
queueJob
completeJob
```

### `ContextRepository`

```text
findCandidates
createAssembly
addAssemblyItems
findLatestForSession
```

---

## 44. Domain Events

Önerilen olaylar:

```text
DomainEventAppended
ProjectionAdvanced
ProjectionFailed

MemoryCreated
MemoryReinforced
MemoryDecayed
MemoryDistorted
MemoryArchived
MemoryRecalled

KnowledgeCreated
KnowledgeSuperseded
KnowledgeDisputed
KnowledgeVerified
KnowledgeExpired
KnowledgeContradictionDetected
KnowledgeContradictionResolved

BeliefCreated
BeliefUpdated
BeliefRejected

RumorCreated
RumorPropagated
RumorDistorted
RumorBelieved
RumorDoubted
RumorResolved
RumorDisproven

EmbeddingQueued
EmbeddingCreated
EmbeddingMarkedStale
EmbeddingFailed

ContextAssemblyCreated
ContextCandidateSelected
ContextCandidateExcluded
```

---

## 45. Outbox Kullanımları

Transaction sonrasında:

- embedding üretme;
- context projection güncelleme;
- memory summary üretme;
- rumor text varyasyonu üretme;
- contradiction analysis;
- safety filtering;
- analytics event gönderme;
- story opportunity üretme;
- parent-facing özet hazırlama;
- stale embedding temizliği.

---

## 46. Güvenlik ve Tutarlılık

- Parent-only kayıtlar child context’ine sızdırılmaz.
- Karakter özel hafızaları perspektif kontrolü olmadan paylaşılmaz.
- Rumor gerçekmiş gibi işaretlenmez.
- Truth status ile belief status ayrıdır.
- LLM çıktısı provenance olmadan verified knowledge olamaz.
- Embedding source kaydı olmadan oluşturulamaz.
- Retrieval log hassas ham içeriği zorunlu olarak saklamaz.
- Context assembly içeriği authorization scope ile filtrelenir.
- Silinen child profile için retention ve anonymization politikası uygulanır.
- Memory distortion yaşa uygun ve güvenli sınırlar içinde tutulur.
- Safety-critical knowledge otomatik olarak yanlış söylentiye dönüşemez.

---

## 47. Retention ve Arşivleme

### Kalıcı Tutulması Önerilenler

```text
domain events
critical memories
continuity memories
verified knowledge
resolved contradiction history
story-linked rumors
context assembly audit
```

### Arşivlenebilecekler

```text
low-importance decayed memories
expired rumors
stale embeddings
old retrieval logs
failed temporary context jobs
```

### Silinebilecekler

Yalnızca politika izin verirse:

```text
orphaned temporary embeddings
expired retry payloads
nonessential telemetry
duplicate generated summaries
```

---

## 48. Reindex ve Migration

Embedding model değişiminde:

```text
mark current embeddings stale
queue reindex jobs
generate new embeddings
validate dimension
switch active model
archive old embeddings
```

Memory veya knowledge schema değişiminde:

```text
migrate source records
increment source version
queue new embedding
rebuild context projection
```

---

## 49. Migration Planı

Migration adı:

```text
0009_event_memory_knowledge_embedding.sql
```

Aşamalar:

1. `event`, `memory`, `knowledge`, `rumor`, `embedding`, `context` şemalarını oluştur.
2. domain event store oluştur.
3. projection offset ve failure tablolarını oluştur.
4. memory tablolarını oluştur.
5. knowledge ve contradiction tablolarını oluştur.
6. belief tablolarını oluştur.
7. rumor tablolarını oluştur.
8. pgvector extension kontrolü yap.
9. embedding tablolarını oluştur.
10. retrieval log tablolarını oluştur.
11. context candidate ve assembly tablolarını oluştur.
12. constraint ve index’leri ekle.
13. vector index oluştur.
14. seed data ekle.
15. integration, retrieval ve concurrency testlerini çalıştır.

---

## 50. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/event/
├── domain-events.table.ts
├── event-projection-offsets.table.ts
├── event-processing-failures.table.ts
├── event.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/memory/
├── memory-records.table.ts
├── memory-links.table.ts
├── memory-participants.table.ts
├── memory-decay-profiles.table.ts
├── memory-reinforcements.table.ts
├── memory-distortions.table.ts
├── memory.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/knowledge/
├── knowledge-records.table.ts
├── knowledge-sources.table.ts
├── knowledge-contradictions.table.ts
├── subject-beliefs.table.ts
├── knowledge.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/rumor/
├── rumors.table.ts
├── rumor-propagations.table.ts
├── rumor-exposures.table.ts
├── rumor.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/embedding/
├── embedding-documents.table.ts
├── embedding-jobs.table.ts
├── retrieval-queries.table.ts
├── retrieval-results.table.ts
├── embedding.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/context/
├── context-candidates.table.ts
├── context-assemblies.table.ts
├── context-assembly-items.table.ts
├── context.relations.ts
└── index.ts
```

---

## 51. Test Gereksinimleri

Zorunlu testler:

- event sequence tekilliği;
- event idempotency;
- aggregate version kontrolü;
- event projection offset;
- projection failure retry;
- memory creation from event;
- aynı event’ten farklı karakter memory’leri;
- memory reinforcement;
- memory decay;
- critical memory retention;
- memory distortion;
- knowledge creation;
- temporal supersession;
- contradiction detection;
- contradiction resolution;
- subject belief;
- yanlış belief’in korunması;
- rumor creation;
- rumor propagation;
- rumor distortion;
- rumor resolution;
- embedding uniqueness;
- stale embedding;
- reindex;
- semantic similarity search;
- visibility scope filtering;
- context candidate scoring;
- token budget enforcement;
- parent-only context exclusion;
- provenance chain validation;
- optimistic concurrency conflict;
- domain event ve outbox atomikliği.

---

## 52. Acceptance Criteria

Paket 10 şu koşullarda tamamlanmış kabul edilir:

1. Event, memory, knowledge ve rumor kavramları ayrılmıştır.
2. Domain event store append-only çalışır.
3. Event sequence dünya bazında benzersizdir.
4. Karakter bazlı öznel hafıza desteklenir.
5. Memory importance, confidence ve strength saklanır.
6. Memory decay ve reinforcement desteklenir.
7. Kritik continuity hafızaları korunabilir.
8. Knowledge provenance saklanır.
9. Truth status ve belief status ayrıdır.
10. Çelişkili bilgiler silinmeden modellenir.
11. Temporal supersession desteklenir.
12. Rumor lifecycle ve propagation desteklenir.
13. Embedding kaynak kayda bağlıdır.
14. Stale embedding ve reindex desteği vardır.
15. pgvector retrieval desteklenir.
16. Retrieval skorları çok bileşenli hesaplanır.
17. Context builder projection ve assembly audit edilir.
18. Token budget uygulanır.
19. Visibility scope korunur.
20. Story outcome ve simulation entegrasyonu tanımlıdır.
21. Idempotency ve optimistic concurrency uygulanır.
22. Migration ve Drizzle dosya yapısı tanımlıdır.
23. Integration, retrieval ve safety testleri tanımlıdır.
24. Parent-only ve character-private bilgi sızıntısı engellenir.

---

## 53. Paket 10 Özeti

Paket 10 ile LUMI’nin olay, hafıza, bilgi ve semantik bağlam altyapısı kesinleşmiştir.

Bu tasarım sayesinde:

- dünyada gerçekleşen her önemli olay izlenebilir;
- farklı karakterler aynı olayı farklı biçimde hatırlayabilir;
- karakterler her şeyi bilen varlıklar gibi davranmaz;
- doğru bilgi, inanç ve söylenti birbirinden ayrılır;
- çelişkiler silinmeden ve kaynaklarıyla birlikte korunur;
- hafızalar zamanla zayıflayabilir veya yeniden güçlenebilir;
- söylentiler karakterler, aileler, pazarlar ve bölgeler arasında yayılabilir;
- embedding yalnızca retrieval projection olarak kullanılır;
- context builder yalnızca ilgili, görünür ve yüksek değerli kayıtları seçer;
- LLM bağlamı token bütçesi içinde denetlenebilir şekilde hazırlanır;
- Story Outcome ve World Simulation etkileri bilgi katmanına güvenle uygulanabilir.

---

## 54. Sonraki Paket

**Paket 11 — Audit, Outbox, Idempotency, Jobs & Operational Persistence Schema**

Kapsam:

- audit logs;
- transactional outbox;
- inbox and consumer deduplication;
- background jobs;
- retries;
- dead-letter queue;
- command idempotency;
- distributed locks;
- scheduled tasks;
- operational health records;
- data repair workflows.
