# Project LUMI — Persistence Implementation
# Paket 07 — Story, Scene, Choice & Session Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM
- **Bağımlılıklar:** Paket 01–06
- **Ana Aggregate'ler:** StoryDefinition, StoryVersion, StorySession
- **Kapsam:** Hikâye tanımı, sürümleme, sahneler, seçimler, oturumlar, checkpoint, sonuçlar ve devamlılık

---

## 1. Paket Amacı

Bu paket, Project LUMI içindeki hikâye üretimi, oynatımı, seçimleri, oturum ilerlemesini ve hikâye sonuçlarını kalıcı hale getiren PostgreSQL veri modelini tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- tekrar kullanılabilir hikâye tanımları;
- değiştirilemez hikâye sürümleri;
- bölüm ve sahne yapısı;
- sahne geçişleri;
- seçim noktaları ve seçenekler;
- çocuk bazlı hikâye oturumları;
- hikâyeye katılan karakterler;
- yapılan seçimlerin geri alınamaz kayıtları;
- seçim sonuçları;
- checkpoint ve kaldığı yerden devam;
- hikâye içi geçici durum;
- hikâyeler arası devamlılık;
- hikâye sonuç özeti;
- yansıtıcı sorular;
- ebeveyn notları;
- Story Outcome & World State Commit System ile gelecekteki entegrasyon.

---

## 2. Temel Tasarım Kararları

1. `StoryDefinition`, hikâyenin kavramsal kimliğini temsil eder.
2. `StoryVersion`, yayınlanmış içerik için immutable’dır.
3. Sahne ve seçim içerikleri doğrudan session içinde çoğaltılmaz; ilgili story version referanslanır.
4. Story session, oynatılan gerçek hikâye deneyiminin aggregate root’udur.
5. Kullanıcının yaptığı seçimler append-only olarak saklanır.
6. Checkpoint’ler geri dönme amacıyla değil, güvenli resume ve recovery amacıyla kullanılır.
7. Story state ile world state birbirinden ayrılır.
8. Hikâye sonucu doğrudan dünya tablolarını güncellemez; outcome manifest üretir.
9. Her önemli değişiklik domain event ve outbox ile atomik kaydedilir.
10. Hikâye sürümü yayınlandıktan sonra düzenlenmez; yeni sürüm oluşturulur.
11. Aynı story definition’ın birden çok sürümü olabilir.
12. Bir story session yalnızca tek story version üzerinden oynanır.
13. Interactive ve static hikâyeler aynı temel modelde temsil edilir.
14. Session snapshot, kaynak kayıtların yerine geçmez; türetilmiş toparlayıcı veridir.
15. Parent note ve reflection verileri çocuk deneyiminden ayrı erişim politikasıyla tutulur.

---

## 3. Aggregate Sınırları

### `StoryDefinition` Aggregate

Şunları yönetir:

- hikâye kimliği;
- tür;
- yaşam döngüsü;
- hedef yaş grubu;
- ana dünya veya dünya türü;
- üretim kaynağı;
- sürüm listesi;
- yayın durumu;
- varsayılan metadata.

### `StoryVersion` Aggregate

Şunları yönetir:

- immutable hikâye içeriği;
- sahneler;
- seçim noktaları;
- seçenekler;
- geçiş kuralları;
- sürüm checksum;
- içerik şeması;
- yayın zamanı.

### `StorySession` Aggregate

Şunları yönetir:

- oturum sahibi çocuk;
- katılımcılar;
- mevcut sahne;
- session state;
- seçim kayıtları;
- checkpoint;
- ilerleme;
- sonuç;
- tamamlanma;
- devamlılık bağlantısı.

---

## 4. Story Definition Tablosu

### `story.story_definitions`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| id | uuid | evet | UUIDv7 ana kimlik |
| world_id | uuid | hayır | Belirli bir dünyaya bağlıysa |
| owner_child_profile_id | uuid | hayır | Çocuğa özel hikâye ise |
| title | text | evet | Hikâye başlığı |
| slug | text | evet | Sabit teknik ad |
| story_type | text | evet | static, interactive, continuation, event_driven |
| generation_source | text | evet | ai, curated, hybrid, imported |
| target_age_min | smallint | hayır | Minimum yaş |
| target_age_max | smallint | hayır | Maksimum yaş |
| primary_theme | text | hayır | Ana tema |
| lifecycle_status | text | evet | draft, active, retired, archived |
| current_version_id | uuid | hayır | Aktif sürüm |
| default_locale | text | evet | İçerik dili |
| metadata | jsonb | evet | Sürümlemeli metadata |
| created_at | timestamptz | evet | Oluşturulma |
| updated_at | timestamptz | evet | Güncelleme |
| archived_at | timestamptz | hayır | Arşiv |
| version | integer | evet | Optimistic concurrency |

### Kısıtlar

```text
UNIQUE (world_id, slug)
```

```text
target_age_min >= 0
target_age_max >= target_age_min
version >= 1
```

`world_id` boş ise hikâye şablon veya dünya bağımsız olabilir.

---

## 5. Story Version Modeli

### `story.story_versions`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Sürüm kimliği |
| story_definition_id | uuid | Ana hikâye |
| version_number | integer | Artan sürüm numarası |
| content_schema_version | integer | İçerik şeması |
| status | text | draft, validated, published, deprecated |
| title | text | Sürüm başlığı |
| synopsis | text | Kısa özet |
| opening_text | text | Açılış metni |
| ending_strategy | text | fixed, branching, generated |
| estimated_duration_minutes | integer | Tahmini süre |
| estimated_scene_count | integer | Tahmini sahne sayısı |
| checksum | text | İçerik bütünlük özeti |
| generation_model | text | Üretici model bilgisi |
| generation_prompt_hash | text | Prompt özeti |
| published_at | timestamptz | Yayın zamanı |
| created_at | timestamptz | Oluşturulma |
| created_by | uuid | Oluşturan aktör |
| metadata | jsonb | Ek bilgiler |

```text
UNIQUE (story_definition_id, version_number)
```

Yayınlanmış sürümler immutable’dır.

Değişiklik gerektiğinde:

```text
clone version
apply modifications
validate
publish new version
update story_definition.current_version_id
```

---

## 6. Bölüm Modeli

### `story.story_chapters`

```text
id
story_version_id
chapter_number
title
summary
sort_order
entry_scene_id
completion_rule
metadata
created_at
```

```text
UNIQUE (story_version_id, chapter_number)
UNIQUE (story_version_id, sort_order)
```

Bölüm zorunlu değildir. Kısa hikâyeler doğrudan sahneler üzerinden çalışabilir.

---

## 7. Sahne Modeli

### `story.story_scenes`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Sahne kimliği |
| story_version_id | uuid | Hikâye sürümü |
| chapter_id | uuid | İsteğe bağlı bölüm |
| scene_key | text | Sürüm içinde benzersiz teknik ad |
| scene_type | text | narration, dialogue, choice, reflection, ending |
| title | text | Sahne başlığı |
| narrative_text | text | Ana anlatım |
| narrator_mode | text | narrator, character, mixed |
| location_id | uuid | Dünya konumu |
| scene_order | integer | Varsayılan sıra |
| is_entry_scene | boolean | Başlangıç sahnesi |
| is_terminal_scene | boolean | Bitiş sahnesi |
| requires_generation | boolean | Dinamik içerik gerekli mi |
| generation_contract | jsonb | LLM giriş/çıkış sözleşmesi |
| audiovisual_cues | jsonb | Görsel, ses ve ambiyans ipuçları |
| metadata | jsonb | Ek bilgiler |
| created_at | timestamptz | Oluşturulma |

```text
UNIQUE (story_version_id, scene_key)
```

---

## 8. Sahne Geçişleri

### `story.scene_transitions`

```text
id
story_version_id
from_scene_id
to_scene_id
transition_type
condition_expression
priority
is_default
transition_payload
created_at
```

Geçiş türleri:

```text
automatic
choice
condition
generated
chapter_end
session_end
```

Kurallar:

- Aynı `from_scene_id` için yalnızca bir default transition olabilir.
- Terminal sahnede çıkış transition bulunmamalıdır.
- `to_scene_id`, aynı story version içinde olmalıdır.
- Cycle olabilir; ancak validation aşamasında sonsuz döngü riski analiz edilir.

---

## 9. Choice Point Modeli

### `story.choice_points`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Seçim noktası |
| story_version_id | uuid | Hikâye sürümü |
| scene_id | uuid | Seçimin bulunduğu sahne |
| choice_key | text | Sürüm içinde benzersiz ad |
| prompt_text | text | Kullanıcıya sorulan metin |
| choice_mode | text | single, multiple, timed, generated |
| min_selections | smallint | Minimum seçim |
| max_selections | smallint | Maksimum seçim |
| timeout_seconds | integer | Süreli seçim |
| allow_hint | boolean | İpucu verilebilir mi |
| consequence_preview_mode | text | none, subtle, explicit |
| created_at | timestamptz | Oluşturulma |
| metadata | jsonb | Ek bilgiler |

```text
UNIQUE (story_version_id, choice_key)
```

---

## 10. Choice Option Modeli

### `story.choice_options`

```text
id
choice_point_id
option_key
label
description
hint_text
consequence_preview
target_scene_id
sort_order
is_enabled_by_default
condition_expression
effect_manifest_template
metadata
created_at
```

```text
UNIQUE (choice_point_id, option_key)
UNIQUE (choice_point_id, sort_order)
```

`effect_manifest_template`, seçimin olası etkilerini tanımlar; gerçek sonuç story session sırasında üretilir.

Örnek etki alanları:

```text
trait_deltas
emotion_deltas
relationship_deltas
inventory_changes
condition_changes
world_event_requests
memory_requests
goal_updates
continuity_markers
```

---

## 11. Story Session Tablosu

### `story.story_sessions`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Oturum kimliği |
| world_id | uuid | İlgili dünya |
| child_profile_id | uuid | Oturum sahibi çocuk |
| story_definition_id | uuid | Hikâye tanımı |
| story_version_id | uuid | Sabit sürüm |
| parent_session_id | uuid | Devam hikâyesi bağlantısı |
| session_type | text | first_run, continuation, replay, preview |
| status | text | created, active, paused, completed, abandoned, failed |
| current_scene_id | uuid | Mevcut sahne |
| current_chapter_id | uuid | Mevcut bölüm |
| progress_percent | numeric | İlerleme |
| started_at | timestamptz | Başlangıç |
| last_interaction_at | timestamptz | Son etkileşim |
| paused_at | timestamptz | Duraklama |
| completed_at | timestamptz | Tamamlanma |
| abandoned_at | timestamptz | Bırakılma |
| resume_token_hash | text | Güvenli resume |
| session_state | jsonb | Geçici hikâye durumu |
| session_schema_version | integer | State şema sürümü |
| version | integer | Optimistic concurrency |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

Kurallar:

```text
progress_percent BETWEEN 0 AND 100
```

- `story_version_id` session boyunca değişmez.
- `completed` durumda `completed_at` zorunludur.
- `abandoned` durumda `abandoned_at` zorunludur.
- `current_scene_id`, bağlı story version içinde olmalıdır.

---

## 12. Story Participants

### `story.story_session_participants`

```text
id
story_session_id
character_id
participant_role
join_order
joined_at
left_at
participation_status
session_alias
initial_state_snapshot
final_state_snapshot
metadata
```

Roller:

```text
protagonist
companion
guide
guest
npc
observer
antagonistic_force
```

Aynı karakter bir session içinde yalnızca bir aktif participant kaydına sahip olmalıdır.

---

## 13. Scene Visit Kayıtları

### `story.story_scene_visits`

Append-only yapı:

```text
id
story_session_id
scene_id
visit_sequence
entered_at
exited_at
entry_reason
exit_reason
generated_content_id
state_before
state_after
correlation_id
created_at
```

Bu kayıtlar:

- oynatma geçmişini;
- sahne tekrarlarını;
- resume doğrulamasını;
- hata analizini;
- anlatı akışı denetimini sağlar.

---

## 14. Committed Choices

### `story.story_committed_choices`

Append-only tablo:

```text
id
story_session_id
choice_point_id
selected_option_id
choice_sequence
selected_at
selected_by_type
selected_by_id
input_context
state_before
state_after
correlation_id
idempotency_key
created_at
```

```text
UNIQUE (story_session_id, choice_sequence)
UNIQUE (story_session_id, idempotency_key)
```

Seçim normal akışta güncellenmez veya silinmez.

Düzeltme gerekiyorsa ayrı bir correction event oluşturulur.

---

## 15. Choice Consequences

### `story.story_choice_consequences`

```text
id
committed_choice_id
consequence_type
target_type
target_id
requested_effect
resolved_effect
application_status
validation_status
failure_reason
created_at
updated_at
```

Durumlar:

```text
pending
validated
applied_to_session
queued_for_world_commit
committed
rejected
failed
```

Bu tablo story session içindeki sonucu ve gelecekteki world commit sürecini birbirine bağlar.

---

## 16. Story State Snapshot

### `story.story_session_snapshots`

```text
id
story_session_id
snapshot_sequence
scene_id
chapter_id
state_payload
participant_state
inventory_projection
continuity_projection
checksum
created_at
```

Snapshot şunlar için kullanılır:

- hızlı resume;
- recovery;
- debugging;
- session migration;
- içerik sürümü doğrulama.

Snapshot kaynak gerçek değildir. Kaynak gerçek:

- committed choices;
- scene visits;
- participant kayıtları;
- applied consequences;
- domain events.

---

## 17. Checkpoint Sistemi

### `story.story_checkpoints`

```text
id
story_session_id
checkpoint_type
scene_id
chapter_id
snapshot_id
label
is_auto_generated
is_resumable
created_at
expires_at
metadata
```

Checkpoint türleri:

```text
auto
chapter_start
before_choice
after_choice
manual_parent
recovery
```

Checkpoint geri sarma mekanizması olarak kullanılmaz.

Çocuğun yanlışlıkla uygulamayı kapatması veya bağlantı kesilmesi gibi durumlarda güvenli devam sağlar.

---

## 18. Resume Mekanizması

Resume akışı:

```text
load session
validate status
validate story version
load latest resumable checkpoint
load snapshot
replay records after snapshot
validate checksum
restore current scene
rotate resume token
update last_interaction_at
```

Resume işlemi idempotent olmalıdır.

Aynı oturum iki cihazda açılırsa optimistic concurrency ile çakışma yönetilir.

---

## 19. Generated Scene Content

Dinamik üretilen sahneler için:

### `story.generated_scene_contents`

```text
id
story_session_id
scene_id
generation_attempt
prompt_hash
model_name
provider_name
input_context_hash
content_text
structured_payload
safety_status
quality_status
latency_ms
token_usage
cost_metadata
created_at
```

Aynı üretim talebi idempotency hash ile tekrar kullanılabilir.

Hikâye sürümü immutable olsa da session'a özel generated content ayrı saklanır.

---

## 20. Hikâye Devamlılığı

### `story.story_continuity_links`

```text
id
source_story_session_id
target_story_session_id
continuity_type
continuity_payload
created_at
```

Türler:

```text
direct_continuation
same_world_followup
character_followup
item_followup
unresolved_event
memory_callback
alternate_path
```

### `story.story_continuity_markers`

```text
id
story_session_id
marker_key
marker_type
subject_type
subject_id
value_payload
importance
visibility
created_at
resolved_at
```

Örnek marker’lar:

- harita bulundu;
- ejderha kurtarıldı;
- anahtar henüz kullanılmadı;
- karakter söz verdi;
- NPC çocuktan yardım bekliyor;
- ses kaybı devam ediyor;
- mağara yolu keşfedildi.

---

## 21. Story Outcome Modeli

### `story.story_outcomes`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Sonuç kimliği |
| story_session_id | uuid | Hikâye oturumu |
| outcome_status | text | draft, validated, ready_to_commit, committed, rejected |
| ending_type | text | success, partial, open, reflective, interrupted |
| summary | text | Sonuç özeti |
| child_facing_summary | text | Çocuğa gösterilecek özet |
| parent_facing_summary | text | Ebeveyn özeti |
| outcome_manifest | jsonb | Dünya değişiklik talepleri |
| validation_report | jsonb | Doğrulama |
| commit_batch_id | uuid | Gelecekteki world commit bağlantısı |
| generated_at | timestamptz | Üretim |
| validated_at | timestamptz | Doğrulama |
| committed_at | timestamptz | Commit |
| version | integer | Concurrency |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |

`outcome_manifest` doğrudan DB update komutları içermez.

Bunun yerine domain etkileri taşır:

```text
character_trait_changes
character_emotion_changes
relationship_changes
memory_creations
goal_changes
condition_changes
inventory_changes
location_discoveries
world_event_requests
rumor_creations
continuity_markers
achievement_requests
```

Bu yapı gelecekteki **Story Outcome & World State Commit System** için temel sözleşmedir.

---

## 22. Outcome Manifest Kuralları

Her effect:

```text
effect_id
effect_type
target_type
target_id
operation
payload
reason
source_choice_id
source_scene_id
priority
confidence
requires_validation
conflict_policy
```

Conflict policy örnekleri:

```text
reject
merge
max
min
append
replace_if_newer
manual_review
```

Outcome manifest:

- deterministik kimliklere sahip olmalıdır;
- idempotent uygulanabilir olmalıdır;
- session sonrasında değiştirilemez hale gelmelidir;
- validation olmadan world state’e commit edilmemelidir.

---

## 23. Reflection Questions

### `story.story_reflection_questions`

```text
id
story_version_id
scene_id
question_type
question_text
age_min
age_max
sort_order
is_required
metadata
created_at
```

Türler:

```text
comprehension
emotion
ethics
imagination
memory
decision
parent_child
```

### `story.story_reflection_answers`

```text
id
story_session_id
question_id
answer_type
answer_text
selected_value
answered_by
answered_at
metadata
```

Yansıtıcı cevaplar puanlama amacıyla zorunlu değildir.

---

## 24. Parent Notes

### `story.story_parent_notes`

```text
id
story_session_id
note_type
title
content
visibility
priority
generated_by
created_at
acknowledged_at
archived_at
```

Türler:

```text
conversation_suggestion
emotional_observation
learning_opportunity
continuity_note
safety_note
achievement
```

Parent note, çocuk ekranında varsayılan olarak görünmez.

---

## 25. Story Metadata

Önerilen metadata alanları:

```text
themes
moods
educational_tags
biomes
required_characters
optional_characters
required_items
content_warnings
image_style
audio_style
reading_level
novelty_profile
safety_profile
generation_constraints
```

Sık sorgulanan alanlar normalize edilmelidir.

Nadir ve sürümlemeli alanlar JSONB içinde tutulabilir.

---

## 26. İndeks Stratejisi

### `story_definitions`

```text
(world_id, lifecycle_status)
(owner_child_profile_id, lifecycle_status)
(story_type, lifecycle_status)
(current_version_id)
```

### `story_versions`

```text
(story_definition_id, version_number DESC)
(status, published_at DESC)
(checksum)
```

### `story_scenes`

```text
(story_version_id, scene_order)
(story_version_id, scene_key)
(chapter_id, scene_order)
```

### `story_sessions`

```text
(child_profile_id, status, updated_at DESC)
(world_id, status)
(story_definition_id, status)
(story_version_id)
(parent_session_id)
(last_interaction_at)
```

### `story_committed_choices`

```text
(story_session_id, choice_sequence)
(choice_point_id)
(selected_option_id)
(created_at)
```

### `story_outcomes`

```text
(story_session_id)
(outcome_status, created_at)
(commit_batch_id)
```

### JSONB GIN

Sadece gerçek sorgu gereksinimi varsa:

```text
story_definitions.metadata
story_versions.metadata
story_sessions.session_state
story_outcomes.outcome_manifest
```

---

## 27. Partitioning Adayları

İlk sürümde zorunlu değildir.

Büyüme halinde partition adayları:

```text
story_scene_visits
story_committed_choices
story_session_snapshots
generated_scene_contents
story_reflection_answers
```

Önerilen partition anahtarı:

```text
created_at by month
```

veya yüksek tenant sayısında:

```text
hash(child_profile_id)
```

---

## 28. Transaction Sınırları

### Story Session Başlatma

```text
validate child/world/story access
insert story_session
insert participants
insert first scene visit
insert initial snapshot
insert checkpoint
insert domain event
insert outbox message
commit
```

### Seçim Yapma

```text
lock session by expected version
validate current choice point
validate option
insert committed choice
resolve session consequences
insert consequence records
close current scene visit
insert next scene visit
update session state/current scene
insert snapshot if required
insert checkpoint if required
insert domain events
insert outbox messages
commit
```

### Story Tamamlama

```text
lock session
validate terminal state
close final scene visit
build outcome draft
validate outcome manifest
insert story_outcome
update participants final snapshots
update session completed
insert continuity markers
insert reflection tasks
insert domain events
insert outbox messages
commit
```

---

## 29. Idempotency

İdempotency gerektiren işlemler:

- session creation;
- choice commit;
- generated content request;
- checkpoint creation;
- outcome generation;
- outcome commit request;
- reflection answer submission.

Her command için:

```text
command_id
idempotency_key
actor_id
request_hash
result_reference
created_at
expires_at
```

kullanılabilir.

---

## 30. Optimistic Concurrency

`story_sessions.version` her state değişiminde artırılır.

Update örneği:

```sql
UPDATE story.story_sessions
SET
  current_scene_id = :next_scene_id,
  session_state = :new_state,
  version = version + 1,
  updated_at = now()
WHERE id = :session_id
  AND version = :expected_version;
```

Etkilenen satır sayısı 0 ise conflict oluşur.

---

## 31. Repository Tasarımı

### `StoryDefinitionRepository`

```text
createDefinition
findById
findActiveBySlug
listForWorld
setCurrentVersion
archiveDefinition
```

### `StoryVersionRepository`

```text
createDraftVersion
findById
loadGraph
validateVersion
publishVersion
deprecateVersion
```

### `StorySessionRepository`

```text
createSession
findById
loadPlayableSession
updateWithExpectedVersion
pause
resume
complete
abandon
```

### Uzman Repository'ler

```text
StorySceneRepository
StoryChoiceRepository
StoryCheckpointRepository
StoryOutcomeRepository
StoryContinuityRepository
StoryReflectionRepository
```

Repository kuralları:

- ham Drizzle satırı döndürmez;
- transaction context alır;
- aggregate invariants uygular;
- immutable version kurallarını korur;
- child/world scope doğrular;
- append-only kayıtları güncellemez.

---

## 32. Domain Events

Önerilen olaylar:

```text
StoryDefinitionCreated
StoryVersionCreated
StoryVersionValidated
StoryVersionPublished
StoryVersionDeprecated

StorySessionCreated
StorySessionStarted
StorySessionPaused
StorySessionResumed
StorySessionAbandoned
StorySessionCompleted

StorySceneEntered
StorySceneExited
StoryChoicePresented
StoryChoiceCommitted
StoryChoiceConsequenceResolved

StoryCheckpointCreated
StorySnapshotCreated
GeneratedSceneContentCreated

StoryContinuityMarkerCreated
StoryContinuationRequested

StoryOutcomeGenerated
StoryOutcomeValidated
StoryOutcomeReadyForCommit
StoryOutcomeCommitted
StoryOutcomeRejected

StoryReflectionAnswered
StoryParentNoteCreated
```

---

## 33. Outbox Kullanımları

Transaction sonrasında asenkron yürütülebilecek işler:

- sahne görseli üretme;
- TTS üretme;
- güvenlik denetimi;
- dinamik sahne üretimi;
- hikâye özeti oluşturma;
- parent note üretme;
- reflection question seçme;
- outcome validation;
- world state commit talebi;
- continuity suggestion üretme;
- embedding oluşturma;
- analytics event gönderme.

---

## 34. Güvenlik ve Yetkilendirme

- Child profile yalnızca yetkili parent account üzerinden erişilir.
- Story session dünya ve çocuk kapsamıyla sorgulanır.
- Parent note çocuk erişiminden ayrıdır.
- Generated content güvenlik denetiminden geçmeden yayınlanmaz.
- Session resume token düz metin tutulmaz.
- Story version içeriği yayınlandıktan sonra değiştirilemez.
- Yönetici müdahaleleri audit log’a yazılır.
- Reflection cevapları hassas profil çıkarımı için doğrudan kullanılmaz.
- İç sistem prompt ve safety metadata çocuk arayüzüne açılmaz.

---

## 35. Veri Saklama

Önerilen yaklaşım:

- aktif ve tamamlanan story session’lar kalıcı tutulur;
- generated content saklama politikası yapılandırılabilir;
- teknik telemetry ayrı retention politikasına tabi olabilir;
- parent tarafından silinen çocuk profili için yasal/ürün politikasına göre anonymization uygulanabilir;
- immutable story versions referans bütünlüğü için korunur;
- outcome ve committed choice kayıtları audit niteliğinde tutulur.

---

## 36. Migration Planı

Migration adı:

```text
0006_story.sql
```

Aşamalar:

1. `story` schema oluştur.
2. story definitions ve versions tablolarını oluştur.
3. chapters, scenes, transitions oluştur.
4. choice points ve options oluştur.
5. sessions ve participants oluştur.
6. scene visits ve committed choices oluştur.
7. consequences, snapshots, checkpoints oluştur.
8. generated contents oluştur.
9. continuity tablolarını oluştur.
10. outcomes oluştur.
11. reflection ve parent note tablolarını oluştur.
12. FK ve check constraint’leri ekle.
13. indeksleri ekle.
14. trigger veya immutable enforcement uygula.
15. seed/fixture ekle.
16. integration testleri çalıştır.

---

## 37. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/story/
├── story-definitions.table.ts
├── story-versions.table.ts
├── story-chapters.table.ts
├── story-scenes.table.ts
├── scene-transitions.table.ts
├── choice-points.table.ts
├── choice-options.table.ts
├── story-sessions.table.ts
├── story-session-participants.table.ts
├── story-scene-visits.table.ts
├── story-committed-choices.table.ts
├── story-choice-consequences.table.ts
├── story-session-snapshots.table.ts
├── story-checkpoints.table.ts
├── generated-scene-contents.table.ts
├── story-continuity-links.table.ts
├── story-continuity-markers.table.ts
├── story-outcomes.table.ts
├── story-reflection-questions.table.ts
├── story-reflection-answers.table.ts
├── story-parent-notes.table.ts
├── story.relations.ts
└── index.ts
```

Repository:

```text
src/infrastructure/database/repositories/story/
├── drizzle-story-definition.repository.ts
├── drizzle-story-version.repository.ts
├── drizzle-story-session.repository.ts
├── drizzle-story-outcome.repository.ts
├── drizzle-story-continuity.repository.ts
└── mappers/
```

---

## 38. Test Gereksinimleri

Zorunlu testler:

- story definition oluşturma;
- aynı world içinde benzersiz slug;
- story version numarası benzersizliği;
- published version immutable davranışı;
- scene graph validation;
- terminal scene transition engeli;
- default transition tekilliği;
- choice min/max validation;
- session version sabitliği;
- yanlış world/story erişiminin reddi;
- participant ekleme;
- committed choice append-only davranışı;
- aynı idempotency key ile tekrar seçimin engellenmesi;
- choice consequence oluşturma;
- snapshot checksum doğrulaması;
- checkpoint resume;
- optimistic concurrency conflict;
- aynı session’ın iki cihazda açılması;
- generated content idempotency;
- terminal scene completion;
- outcome manifest generation;
- outcome validation failure;
- continuity marker oluşturma;
- parent note erişim izolasyonu;
- domain event ve outbox atomikliği;
- session archive sonrası geçmişin korunması.

---

## 39. Acceptance Criteria

Paket 07 şu koşullarda tamamlanmış kabul edilir:

1. Story definition ve story version ayrılmıştır.
2. Published story version immutable’dır.
3. Scene graph kalıcı olarak modellenmiştir.
4. Choice point ve option yapısı desteklenir.
5. Static ve interactive hikâyeler aynı modelde çalışabilir.
6. Story session tek bir version’a sabitlenir.
7. Participants kalıcı olarak saklanır.
8. Scene visit geçmişi izlenebilir.
9. Committed choices append-only’dir.
10. Consequences ayrı ve doğrulanabilir kayıtlardır.
11. Resume için checkpoint ve snapshot altyapısı vardır.
12. Session state ile world state ayrılmıştır.
13. Continuity marker ve continuation link desteklenir.
14. Story outcome manifest üretilir.
15. World commit öncesi validation aşaması bulunur.
16. Reflection ve parent note desteklenir.
17. Optimistic concurrency uygulanır.
18. Idempotency kritik command’lerde korunur.
19. Domain event ve outbox atomik çalışır.
20. Drizzle schema ve migration planı tanımlıdır.
21. Integration ve concurrency test kapsamı tanımlıdır.
22. Child/world authorization boundary korunur.

---

## 40. Paket 07 Özeti

Paket 07 ile LUMI’nin hikâye veri modeli kesinleşmiştir.

Bu tasarım sayesinde:

- hikâyeler güvenli şekilde sürümlenir;
- yayınlanan içerik sonradan bozulmaz;
- sahneler ve seçimler izlenebilir bir graph oluşturur;
- çocuk kaldığı yerden güvenle devam edebilir;
- yapılan seçimler audit edilebilir;
- hikâye sonuçları doğrudan ve kontrolsüz biçimde dünyaya yazılmaz;
- outcome manifest ile güvenli commit süreci hazırlanır;
- karakter, eşya, hafıza ve dünya etkileri ileride tek transaction zinciriyle uygulanabilir;
- devam hikâyeleri önceki seçimleri ve keşifleri kullanabilir;
- parent ve reflection katmanı çocuk deneyiminden ayrı yönetilebilir.

---

## 41. Sonraki Paket

**Paket 08 — World State, Time & Simulation Persistence Schema**

Kapsam:

- world state snapshots;
- world clock;
- simulation runs;
- region and location states;
- environmental conditions;
- background events;
- time progression;
- relevance-based simulation;
- 10 günlük yoğunluğu azalan ilerleme;
- freeze-after-threshold politikası;
- simulation checkpoints;
- conflict-safe world updates;
- world event propagation.
