# LUMI — Domain ER Modeli

## 1. Amaç

Bu doküman, LUMI veri katmanındaki ana domainlerin entity–relationship yapısını tanımlar. Amaç; tabloları, cardinality ilişkilerini, sahiplik sınırlarını, foreign key yönlerini ve temel constraint kararlarını kesinleştirmektir.

---

## 2. Ana Domainler

```text
identity
profile
world
character
story
simulation
memory
inventory
education
media
ai
audit
system
```

---

## 3. Üst Seviye İlişki Haritası

```text
identity.users
  └── profile.households
       └── profile.child_profiles
            ├── world.worlds
            │    ├── world.regions
            │    │    └── world.locations
            │    ├── character.characters
            │    ├── story.stories
            │    ├── simulation.world_events
            │    └── memory.memory_records
            └── education.learning_progress
```

---

## 4. Identity ER Modeli

```text
users 1 ─── N accounts
users 1 ─── N sessions
users N ─── N roles
roles N ─── N permissions
```

Ara tablolar:

```text
identity.user_roles
identity.role_permissions
```

Temel kurallar:

- Bir kullanıcı birden fazla role sahip olabilir.
- Bir rol birden fazla izin taşıyabilir.
- Kullanıcı silindiğinde aktif session kayıtları iptal edilir.
- Güvenlik ve audit kayıtları silinmez.

---

## 5. Profile ER Modeli

```text
users 1 ─── N household_members
households 1 ─── N household_members
households 1 ─── N child_profiles
child_profiles 1 ─── 1 child_preferences
child_profiles 1 ─── N child_interests
households 1 ─── 1 parental_settings
```

Temel kurallar:

- Bir household en az bir owner üyeye sahip olmalıdır.
- Bir child profile doğrudan login hesabı değildir.
- Çocuk tercihleri profil tablosuna gömülmez; ayrı tabloda tutulur.
- Ebeveyn ayarları household seviyesinde yönetilir.

---

## 6. World ER Modeli

```text
universes 1 ─── N worlds
worlds 1 ─── N regions
regions 1 ─── N locations
regions 1 ─── N child_regions
locations N ─── N locations
worlds 1 ─── N world_states
worlds 1 ─── N world_rules
```

Konum bağlantısı:

```text
world.location_connections
source_location_id
target_location_id
```

Temel kurallar:

- Region hiyerarşisi `parent_region_id` ile self-reference kurar.
- Location hiyerarşisi `parent_location_id` ile kurulabilir.
- Location bağlantıları yönlüdür.
- World silme işlemi restrict veya soft delete ile yönetilir.

---

## 7. Character ER Modeli

```text
worlds 1 ─── N characters
child_profiles 1 ─── N characters
characters N ─── N trait_definitions
characters N ─── N emotion_definitions
characters N ─── N characters
characters 1 ─── N goals
characters 1 ─── N conditions
```

Ara tablolar:

```text
character.character_traits
character.character_emotions
character.relationships
character.relationship_dimensions
```

Temel kurallar:

- Trait ve emotion değerleri vektörel tutulur.
- İlişkiler yönlüdür.
- `source_character_id + target_character_id` unique olmalıdır.
- Aynı karakter kendisiyle ilişki kuramaz.
- Trait confidence 0–1 aralığındadır.
- Relationship dimensions -1 ile 1 aralığındadır.

---

## 8. Story ER Modeli

```text
worlds 1 ─── N stories
stories 1 ─── N story_versions
stories 1 ─── N story_sessions
story_sessions N ─── N characters
story_sessions 1 ─── N session_decisions
stories 1 ─── N story_outcomes
```

Temel kurallar:

- Story içerik tanımıdır.
- Story session gerçek kullanıcı deneyimidir.
- Aynı story birden fazla session tarafından kullanılabilir.
- Story version append-only çalışır.
- Session decision kayıtları sonradan değiştirilmez.

---

## 9. Simulation ER Modeli

```text
worlds 1 ─── N simulation_runs
simulation_runs 1 ─── N state_changes
simulation_runs 1 ─── N background_actions
worlds 1 ─── N world_events
world_events 1 ─── N event_effects
```

Temel kurallar:

- Bir simulation run belirli bir zaman aralığını kapsar.
- State change append-only tutulur.
- Background action bir NPC, region veya world entity’sine bağlanabilir.
- Aynı idempotency key ile ikinci simulation run başlatılamaz.

---

## 10. Memory ER Modeli

```text
worlds 1 ─── N memory_records
characters 1 ─── N memory_records
memory_records N ─── N memory_records
memory_records 1 ─── N memory_embeddings
```

Temel kurallar:

- Memory owner polymorphic olabilir.
- Kritik ilişkiler için ayrı bağlantı tabloları tercih edilir.
- Embedding kaydı memory içeriğinin türetilmiş verisidir.
- Memory record silinmek yerine arşivlenebilir.

---

## 11. Inventory ER Modeli

```text
item_definitions 1 ─── N item_instances
inventories 1 ─── N inventory_entries
item_instances 1 ─── N item_history
characters 1 ─── N inventories
```

Temel kurallar:

- Definition ile instance ayrıdır.
- Aynı item instance aynı anda yalnızca bir aktif inventory entry’de bulunabilir.
- Transfer işlemi transaction içinde yapılır.
- Item history append-only tutulur.

---

## 12. Education ER Modeli

```text
stories 1 ─── N questions
questions 1 ─── N answers
child_profiles 1 ─── N answers
child_profiles 1 ─── N learning_progress
story_sessions 1 ─── N reflections
```

Temel kurallar:

- Learning progress kesin hüküm değil, gözlemsel sinyal olarak tutulur.
- Cevaplar sonradan overwrite edilmez; yeni attempt kaydı eklenir.
- Reflection kayıtları kullanıcı içeriği olarak korunur.

---

## 13. Media ER Modeli

```text
assets 1 ─── N asset_variants
assets 1 ─── N story_assets
assets 1 ─── N character_assets
tts_jobs 1 ─── 0..1 assets
image_jobs 1 ─── 0..1 assets
```

Temel kurallar:

- Dosya DB içinde tutulmaz.
- Storage key unique olmalıdır.
- Job kayıtları append-only yaşam döngüsü izler.
- Asset soft delete destekler.

---

## 14. AI ER Modeli

```text
providers 1 ─── N models
prompt_templates 1 ─── N prompt_versions
generation_requests 1 ─── N generation_responses
generation_requests 1 ─── N cost_records
models 1 ─── N generation_requests
```

Temel kurallar:

- Prompt version immutable tutulur.
- Generation request/response kayıtları tarihsel veridir.
- Cost record append-only tutulur.
- Provider silinmez; pasif hale getirilir.

---

## 15. Audit ve System ER Modeli

```text
audit_logs
security_events
outbox_events
idempotency_keys
feature_flags
```

Temel kurallar:

- Audit log append-only’dir.
- Outbox event, iş transaction’ı ile aynı transaction içinde eklenir.
- Idempotency key scope + key olarak unique olmalıdır.
- Feature flag soft delete yerine aktif/pasif durumuyla yönetilir.

---

## 16. Cardinality Özeti

| İlişki | Cardinality |
|---|---|
| User → Household Membership | 1-N |
| Household → Child Profiles | 1-N |
| Universe → Worlds | 1-N |
| World → Regions | 1-N |
| Region → Locations | 1-N |
| World → Characters | 1-N |
| Character → Traits | N-N |
| Character → Emotions | N-N |
| Character → Character | N-N, yönlü |
| Story → Versions | 1-N |
| Story → Sessions | 1-N |
| Session → Decisions | 1-N |
| Simulation Run → State Changes | 1-N |
| Item Definition → Instances | 1-N |
| Inventory → Entries | 1-N |
| Prompt Template → Versions | 1-N |

---

## 17. Kesinleşen ER Kararları

- Domain sahipliği kesindir.
- Çapraz domain foreign key kullanılabilir.
- Çapraz domain doğrudan write yasaktır.
- Append-only tablolar güncellenmez.
- Soft delete yalnızca kullanıcıya dönük ana entity’lerde kullanılır.
- N-N ilişkiler explicit junction tablolarla kurulur.
- Polymorphic relation yalnızca gerekli yerlerde ve kontrollü biçimde kullanılır.
- Story, session ve version birbirinden kesin olarak ayrıdır.
