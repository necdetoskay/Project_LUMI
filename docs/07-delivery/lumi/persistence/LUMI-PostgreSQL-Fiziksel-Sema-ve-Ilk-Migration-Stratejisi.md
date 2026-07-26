# PostgreSQL Fiziksel Şema Tasarımı, Tablo Grupları ve İlk Migration Stratejisi

## 1. Amaç

Bu doküman, Project LUMI için mantıksal veri modelinin PostgreSQL üzerinde fiziksel olarak nasıl kurulacağını tanımlar.

Temel yaklaşım:

> İlişkisel ve sorgulanabilir veriler normal PostgreSQL tablolarında, değişken ve motorlara özel küçük veri parçaları kontrollü `JSONB` alanlarında tutulacaktır.

Bu sayede:

- Güçlü veri bütünlüğü
- Transaction güvenliği
- Açık ilişkiler
- Sorgulanabilirlik
- Kontrollü esneklik
- İleride büyümeye uygun modüler yapı

elde edilir.

---

# 2. Fiziksel Şema Yaklaşımı

LUMI tek PostgreSQL veritabanı kullanacaktır. Ancak iş alanları PostgreSQL schema’larıyla ayrılacaktır.

Kullanılacak ana schema’lar:

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

Örnek tam tablo adları:

```sql
identity.users
profile.child_profiles
world.worlds
world.regions
character.characters
story.stories
story.sessions
simulation.world_events
memory.memory_records
inventory.items
audit.audit_logs
```

Bu yapı mikroservis mimarisi anlamına gelmez. Tek veritabanı içinde mantıksal domain ayrımı sağlar.

## Kesin karar

> LUMI’de PostgreSQL schema tabanlı modüler fiziksel veritabanı yapısı kullanılacaktır.

---

# 3. Ana Tablo Grupları

## 3.1 Identity ve Kullanıcı Yönetimi

Schema:

```text
identity
```

Temel tablolar:

```text
identity.users
identity.accounts
identity.sessions
identity.verification_tokens
identity.roles
identity.permissions
identity.user_roles
identity.role_permissions
```

### `identity.users`

Ebeveyn veya sistem kullanıcısını temsil eder.

```sql
CREATE TABLE identity.users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    display_name VARCHAR(120),
    password_hash TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

Aktif kullanıcılar için benzersiz e-posta indeksi:

```sql
CREATE UNIQUE INDEX users_email_unique_active
ON identity.users (lower(email))
WHERE deleted_at IS NULL;
```

### Temel ayrım

```text
Ebeveyn → giriş yapan kullanıcı
Çocuk → ebeveyne bağlı profil
```

Çocuk profilleri doğrudan kimlik doğrulama hesabı olmayacaktır.

---

## 3.2 Aile ve Çocuk Profilleri

Schema:

```text
profile
```

Tablolar:

```text
profile.households
profile.household_members
profile.child_profiles
profile.child_preferences
profile.child_interests
profile.parental_settings
profile.accessibility_settings
```

### `profile.households`

```sql
CREATE TABLE profile.households (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    name VARCHAR(120),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul',
    locale VARCHAR(16) NOT NULL DEFAULT 'tr-TR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_household_owner
        FOREIGN KEY (owner_user_id)
        REFERENCES identity.users(id)
);
```

### `profile.child_profiles`

```sql
CREATE TABLE profile.child_profiles (
    id UUID PRIMARY KEY,
    household_id UUID NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    birth_year SMALLINT,
    age_group VARCHAR(30),
    reading_level VARCHAR(30),
    preferred_language VARCHAR(16) NOT NULL DEFAULT 'tr-TR',
    avatar_media_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_child_household
        FOREIGN KEY (household_id)
        REFERENCES profile.households(id)
);
```

İlk sürümde tam doğum tarihi yerine yalnızca doğum yılı tutulması gizlilik açısından tercih edilebilir.

---

## 3.3 Dünya ve Evren Yapısı

Schema:

```text
world
```

Tablolar:

```text
world.universes
world.worlds
world.regions
world.locations
world.location_connections
world.biomes
world.location_biomes
world.world_states
world.region_states
world.location_states
world.world_rules
world.calendars
world.seasons
world.weather_states
```

Temel hiyerarşi:

```text
Universe
 └── World
      └── Region
           └── Location
```

Bu model aşağıdaki yapıları destekler:

```text
gezegenler
adalar
ormanlar
şehirler
köyler
mağaralar
deniz altı bölgeleri
uzay bölgeleri
portallar
```

### `world.worlds`

```sql
CREATE TABLE world.worlds (
    id UUID PRIMARY KEY,
    universe_id UUID NOT NULL,
    household_id UUID NOT NULL,
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT,
    world_type VARCHAR(40) NOT NULL DEFAULT 'story_world',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    current_world_time TIMESTAMPTZ,
    simulation_mode VARCHAR(30) NOT NULL DEFAULT 'normal',
    last_simulated_at TIMESTAMPTZ,
    simulation_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

### `world.regions`

```sql
CREATE TABLE world.regions (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    parent_region_id UUID,
    name VARCHAR(160) NOT NULL,
    region_type VARCHAR(50) NOT NULL,
    description TEXT,
    importance_score NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    simulation_priority NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_region_world
        FOREIGN KEY (world_id)
        REFERENCES world.worlds(id),

    CONSTRAINT fk_parent_region
        FOREIGN KEY (parent_region_id)
        REFERENCES world.regions(id),

    CONSTRAINT ck_region_importance
        CHECK (importance_score BETWEEN 0 AND 1),

    CONSTRAINT ck_region_simulation_priority
        CHECK (simulation_priority BETWEEN 0 AND 1)
);
```

### `world.locations`

```sql
CREATE TABLE world.locations (
    id UUID PRIMARY KEY,
    region_id UUID NOT NULL,
    parent_location_id UUID,
    name VARCHAR(160) NOT NULL,
    location_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_discovered BOOLEAN NOT NULL DEFAULT false,
    accessibility_state VARCHAR(30) NOT NULL DEFAULT 'open',
    coordinates JSONB,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_location_region
        FOREIGN KEY (region_id)
        REFERENCES world.regions(id),

    CONSTRAINT fk_parent_location
        FOREIGN KEY (parent_location_id)
        REFERENCES world.locations(id)
);
```

---

## 3.4 Karakter ve NPC Sistemi

Schema:

```text
character
```

Tablolar:

```text
character.characters
character.character_profiles
character.character_traits
character.trait_definitions
character.character_emotions
character.character_goals
character.character_relationships
character.character_roles
character.character_locations
character.character_conditions
character.character_routines
character.character_influence_vectors
character.character_time_sensitivity
```

### `character.characters`

```sql
CREATE TABLE character.characters (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    child_profile_id UUID,
    character_type VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    species VARCHAR(80),
    description TEXT,
    home_location_id UUID,
    current_location_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    importance_score NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    state_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

Karakter türü örnekleri:

```text
child_avatar
npc
animal
creature
visitor
companion
```

---

## 3.5 Trait Sistemi

Trait değerleri karakter tablosuna ayrı kolonlar olarak eklenmeyecektir.

Yanlış yaklaşım:

```text
courage
kindness
curiosity
patience
fear
honesty
```

Bu yaklaşım her yeni özellikte migration gerektirir.

Doğru yaklaşım:

```text
character.trait_definitions
character.character_traits
```

### `character.trait_definitions`

```sql
CREATE TABLE character.trait_definitions (
    id UUID PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60),
    minimum_value NUMERIC(8,4) NOT NULL DEFAULT 0,
    maximum_value NUMERIC(8,4) NOT NULL DEFAULT 1,
    default_value NUMERIC(8,4) NOT NULL DEFAULT 0.5,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `character.character_traits`

```sql
CREATE TABLE character.character_traits (
    character_id UUID NOT NULL,
    trait_definition_id UUID NOT NULL,
    value NUMERIC(8,4) NOT NULL,
    confidence NUMERIC(6,5) NOT NULL DEFAULT 1,
    last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_source VARCHAR(40),

    PRIMARY KEY (character_id, trait_definition_id)
);
```

---

## 3.6 Duygu ve Psikolojik Durum

Tablolar:

```text
character.emotion_definitions
character.character_emotions
character.emotion_transitions
character.character_conditions
```

Bir karakter aynı anda birden fazla duygu taşıyabilir:

```text
meraklı
biraz korkmuş
umutlu
yorgun
```

Bu nedenle duygular vektörel olarak tutulur.

```sql
CREATE TABLE character.character_emotions (
    character_id UUID NOT NULL,
    emotion_definition_id UUID NOT NULL,
    intensity NUMERIC(6,5) NOT NULL,
    decay_rate NUMERIC(8,6) NOT NULL DEFAULT 0,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    source_event_id UUID,

    PRIMARY KEY (character_id, emotion_definition_id),

    CHECK (intensity BETWEEN 0 AND 1)
);
```

---

## 3.7 İlişki ve Sosyal Bağ Sistemi

Tablolar:

```text
character.relationships
character.relationship_dimensions
character.relationship_events
```

İlişkiler tek bir sayı olmayacaktır.

Örnek boyutlar:

```text
trust
affection
respect
fear
rivalry
dependency
familiarity
gratitude
```

### `character.relationships`

```sql
CREATE TABLE character.relationships (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    source_character_id UUID NOT NULL,
    target_character_id UUID NOT NULL,
    relationship_type VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (source_character_id, target_character_id)
);
```

İlişkiler yönlüdür:

```text
A karakterinin B'ye güveni
B karakterinin A'ya güveninden farklı olabilir.
```

### `character.relationship_dimensions`

```sql
CREATE TABLE character.relationship_dimensions (
    relationship_id UUID NOT NULL,
    dimension_code VARCHAR(50) NOT NULL,
    value NUMERIC(6,5) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (relationship_id, dimension_code),
    CHECK (value BETWEEN -1 AND 1)
);
```

---

# 4. Hikâye Sistemi

Schema:

```text
story
```

Tablolar:

```text
story.stories
story.story_versions
story.story_sessions
story.story_participants
story.story_nodes
story.story_choices
story.story_choice_options
story.session_progress
story.session_decisions
story.story_outcomes
story.story_summaries
story.story_questions
story.story_answers
story.story_context_snapshots
```

## 4.1 Story ve Session Ayrımı

### Story

Üretilmiş hikâye içeriğidir.

### Story Session

Çocuğun hikâyeyi oynadığı veya okuduğu gerçek oturumdur.

Aynı hikâye:

```text
birden fazla çocuk tarafından
birden fazla kez
farklı seçimlerle
```

oynanabilir.

### `story.stories`

```sql
CREATE TABLE story.stories (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    child_profile_id UUID,
    title VARCHAR(240) NOT NULL,
    story_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    age_group VARCHAR(30),
    language VARCHAR(16) NOT NULL DEFAULT 'tr-TR',
    generation_source VARCHAR(40),
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

### `story.story_versions`

```sql
CREATE TABLE story.story_versions (
    id UUID PRIMARY KEY,
    story_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,
    generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    prompt_version VARCHAR(50),
    model_provider VARCHAR(80),
    model_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (story_id, version_number)
);
```

---

# 5. Simülasyon Sistemi

Schema:

```text
simulation
```

Tablolar:

```text
simulation.world_events
simulation.event_participants
simulation.event_effects
simulation.state_changes
simulation.simulation_runs
simulation.simulation_jobs
simulation.simulation_snapshots
simulation.background_actions
simulation.intent_records
simulation.decision_records
simulation.utility_evaluations
simulation.time_windows
```

## 5.1 Dünya Olayları

```sql
CREATE TABLE simulation.world_events (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    region_id UUID,
    location_id UUID,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(200),
    description TEXT,
    severity NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    visibility VARCHAR(30) NOT NULL DEFAULT 'local',
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    causation_event_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5.2 State Change Kayıtları

```sql
CREATE TABLE simulation.state_changes (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id UUID NOT NULL,
    field_path VARCHAR(240) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    change_reason VARCHAR(120),
    source_type VARCHAR(50),
    source_id UUID,
    simulation_run_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Bu tablo aşağıdaki amaçlarla kullanılır:

```text
debug
hikâye sürekliliği
geri izleme
AI bağlam üretimi
durum değişiminin açıklanması
```

Yüksek hacim nedeniyle ileride partition uygulanabilir.

---

# 6. Hafıza Sistemi

Schema:

```text
memory
```

Tablolar:

```text
memory.memory_records
memory.memory_entities
memory.memory_links
memory.memory_importance
memory.memory_access_log
memory.memory_summaries
memory.memory_embeddings
memory.memory_decay_states
```

### `memory.memory_records`

```sql
CREATE TABLE memory.memory_records (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    owner_type VARCHAR(40) NOT NULL,
    owner_id UUID NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    importance NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    emotional_weight NUMERIC(6,5) NOT NULL DEFAULT 0,
    confidence NUMERIC(6,5) NOT NULL DEFAULT 1,
    visibility VARCHAR(30) NOT NULL DEFAULT 'private',
    occurred_at TIMESTAMPTZ,
    remembered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_recalled_at TIMESTAMPTZ,
    recall_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`owner_type` örnekleri:

```text
character
child
world
region
settlement
household
```

İlk sürümde polymorphic ilişki kullanılabilir. Kritik bağlantılar ileride ayrı tablolarla normalleştirilebilir.

---

# 7. Envanter ve Öğeler

Schema:

```text
inventory
```

Tablolar:

```text
inventory.item_definitions
inventory.item_instances
inventory.inventories
inventory.inventory_entries
inventory.item_history
inventory.item_abilities
inventory.item_relationships
```

## Definition ve Instance Ayrımı

```text
item_definition:
    "Sihirli Pusula" türünün tanımı

item_instance:
    Elif'in hikâyede bulduğu gerçek pusula
```

### `inventory.item_instances`

```sql
CREATE TABLE inventory.item_instances (
    id UUID PRIMARY KEY,
    item_definition_id UUID NOT NULL,
    world_id UUID NOT NULL,
    owner_type VARCHAR(40),
    owner_id UUID,
    current_location_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'available',
    condition_score NUMERIC(6,5) NOT NULL DEFAULT 1,
    custom_name VARCHAR(120),
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    acquired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 8. Eğitim ve Değerlendirme Sistemi

Schema:

```text
education
```

Tablolar:

```text
education.learning_objectives
education.story_learning_objectives
education.question_templates
education.story_questions
education.child_answers
education.reflection_prompts
education.learning_observations
education.progress_snapshots
```

Amaç klasik sınav sistemi kurmak değildir.

İzlenecek alanlar:

```text
anlama
duygu tanıma
sebep-sonuç kurma
empati
yaratıcılık
kelime gelişimi
```

Veriler daha çok gözlemsel sinyaller olarak ele alınacaktır.

---

# 9. Medya Sistemi

Schema:

```text
media
```

Tablolar:

```text
media.assets
media.asset_variants
media.generation_jobs
media.generation_attempts
media.story_assets
media.character_assets
media.audio_tracks
media.tts_jobs
media.usage_records
```

Dosyalar PostgreSQL içinde tutulmayacaktır. Yalnızca metadata ve storage adresi saklanacaktır.

### `media.assets`

```sql
CREATE TABLE media.assets (
    id UUID PRIMARY KEY,
    household_id UUID,
    asset_type VARCHAR(40) NOT NULL,
    storage_provider VARCHAR(40) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(120),
    file_size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER,
    checksum VARCHAR(128),
    status VARCHAR(30) NOT NULL DEFAULT 'ready',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

---

# 10. AI Üretim ve Maliyet Kayıtları

Schema:

```text
ai
```

Tablolar:

```text
ai.providers
ai.models
ai.generation_requests
ai.generation_responses
ai.prompt_templates
ai.prompt_versions
ai.usage_records
ai.cost_records
ai.safety_evaluations
```

Bu yapı sayesinde aşağıdaki bilgiler izlenebilir:

```text
hangi hikâye hangi modelle üretildi
kaç token kullanıldı
kaç görsel üretildi
hangi prompt sürümü kullanıldı
üretim maliyeti ne oldu
başarısız deneme oldu mu
```

---

# 11. Audit ve Sistem Tabloları

Schema:

```text
audit
```

Tablolar:

```text
audit.audit_logs
audit.security_events
audit.data_access_logs
audit.admin_actions
audit.consent_records
audit.data_export_requests
audit.data_deletion_requests
```

Schema:

```text
system
```

Tablolar:

```text
system.feature_flags
system.app_settings
system.job_locks
system.outbox_events
system.idempotency_keys
system.schema_metadata
system.health_records
```

Özellikle `system.outbox_events`, ileride güvenilir event yayını için kullanılacaktır.

---

# 12. Ortak Kolon Standardı

Ana tablolarda genel standart:

```sql
id UUID PRIMARY KEY
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at TIMESTAMPTZ
```

## Kimlik Stratejisi

Kesin karar:

> Uygulama seviyesinde UUIDv7 üretilecektir.

UUIDv7 avantajları:

```text
dağıtık üretilebilir
tahmin edilmesi zor
zamana göre sıralanabilir
UUIDv4’e göre indeks dostudur
```

PostgreSQL veya ORM doğrudan UUIDv7 desteklemiyorsa geçici olarak UUIDv4 kullanılabilir. Veri tipi yine `UUID` olacaktır.

---

# 13. Soft Delete Stratejisi

Her tabloya otomatik olarak `deleted_at` eklenmeyecektir.

Soft delete uygulanacak tablolar:

```text
users
child_profiles
worlds
regions
locations
characters
stories
media assets
```

Soft delete uygulanmayacak tarihsel kayıtlar:

```text
audit logs
state changes
story decisions
usage records
cost records
simulation runs
```

Bu kayıtlar retention politikasıyla arşivlenecektir.

---

# 14. Enum Stratejisi

PostgreSQL native enum’ları sınırlı kullanılacaktır.

Sürekli gelişebilecek alanlar:

```text
character_type
event_type
location_type
story_type
memory_type
```

Varsayılan yaklaşım:

```text
VARCHAR + CHECK
```

veya referans tablosudur.

İlk migration’da native enum kullanımından kaçınılacaktır.

---

# 15. JSONB Kullanım Kuralları

## JSONB Kullanılabilecek Alanlar

```text
AI model metadata
dünya motoruna özel geçici state
esnek koordinat bilgileri
oluşturma parametreleri
görsel metadata
motor sürümüne bağlı detaylar
prompt ve model ayarları
```

## JSONB Kullanılmaması Gereken Alanlar

```text
kullanıcı ilişkileri
karakter ilişkileri
story-session bağlantıları
envanter sahipliği
dünya-bölge-konum hiyerarşisi
arama yapılan temel durumlar
raporlanacak sayısal değerler
```

Kural:

> Bir JSONB alanındaki veri düzenli olarak filtreleniyor, sıralanıyor, join ediliyor veya raporlanıyorsa gerçek kolona çıkarılmalıdır.

---

# 16. İndeks Stratejisi

Foreign key kolonları otomatik olarak indekslenmediği için yoğun kullanılan tüm foreign key alanları ayrıca indekslenecektir.

```sql
CREATE INDEX idx_regions_world_id
ON world.regions(world_id);

CREATE INDEX idx_locations_region_id
ON world.locations(region_id);

CREATE INDEX idx_characters_world_id
ON character.characters(world_id);

CREATE INDEX idx_stories_child_profile_id
ON story.stories(child_profile_id);

CREATE INDEX idx_world_events_world_time
ON simulation.world_events(world_id, starts_at);
```

## Partial Index

```sql
CREATE INDEX idx_active_characters_by_world
ON character.characters(world_id)
WHERE deleted_at IS NULL
  AND status = 'active';
```

## JSONB GIN Index

Her JSONB alanına otomatik GIN index eklenmeyecektir.

Gerçek sorgu ihtiyacı oluşursa:

```sql
CREATE INDEX idx_region_state_gin
ON world.regions
USING GIN(state);
```

## Zaman Serisi Index

```sql
CREATE INDEX idx_state_changes_entity_time
ON simulation.state_changes(entity_type, entity_id, occurred_at DESC);
```

---

# 17. Partition Stratejisi

İlk migration’da tüm tablolar partition edilmeyecektir.

Partition adayları:

```text
simulation.state_changes
simulation.world_events
audit.audit_logs
ai.usage_records
ai.cost_records
memory.memory_access_log
```

Kesin karar:

> MVP aşamasında normal tablolar kullanılacak; yüksek hacimli tablolar gelecekte partition’a geçişi engellemeyecek şekilde tasarlanacaktır.

---

# 18. Referential Action Kuralları

`ON DELETE CASCADE` sınırlı kullanılacaktır.

## CASCADE Kullanılabilecek İlişkiler

```text
story → story_versions
story_session → session_decisions
relationship → relationship_dimensions
inventory → inventory_entries
```

## RESTRICT Kullanılacak İlişkiler

```text
world → stories
child_profile → story_sessions
character → memories
world_event → state_changes
```

## SET NULL Kullanılabilecek İlişkiler

```text
character.current_location_id
story.created_by_user_id
memory.source_event_id
media.created_by_user_id
```

---

# 19. İlk Migration Stratejisi

İlk migration tek devasa dosya olmayacaktır.

Önerilen sıra:

```text
0001_extensions
0002_schemas
0003_identity
0004_profiles
0005_media_core
0006_world_core
0007_character_core
0008_inventory_core
0009_story_core
0010_simulation_core
0011_memory_core
0012_education_core
0013_ai_tracking
0014_audit_system
0015_indexes
0016_seed_reference_data
0017_constraints_and_validation
```

---

## 19.1 Migration 0001 — Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
```

İleride semantik arama kullanılacaksa:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

`pgvector`, ilk çalışma için zorunlu olmayacaktır.

---

## 19.2 Migration 0002 — Schema Oluşturma

```sql
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS profile;
CREATE SCHEMA IF NOT EXISTS world;
CREATE SCHEMA IF NOT EXISTS character;
CREATE SCHEMA IF NOT EXISTS story;
CREATE SCHEMA IF NOT EXISTS simulation;
CREATE SCHEMA IF NOT EXISTS memory;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS education;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS system;
```

---

## 19.3 Domain Tablolarının Oluşturulma Sırası

Bağımlılık sırası:

```text
identity.users
    ↓
profile.households
    ↓
profile.child_profiles
    ↓
world.universes
    ↓
world.worlds
    ↓
world.regions
    ↓
world.locations
    ↓
character.characters
    ↓
story.stories
    ↓
story.story_sessions
    ↓
simulation.world_events
    ↓
memory.memory_records
```

Circular dependency oluşursa önce tablolar oluşturulacak, foreign key’ler daha sonra `ALTER TABLE` ile eklenecektir.

---

# 20. Seed Data Stratejisi

Migration ve seed birbirinden ayrılacaktır.

## Migration İçine Girebilecek Sabit Referans Verileri

```text
temel rol kayıtları
sistem izinleri
varsayılan trait tanımları
temel emotion tanımları
desteklenen dil kodları
sistem feature flag kayıtları
```

## Migration İçine Girmeyecek İçerikler

```text
örnek dünya
demo hikâyeler
örnek NPC’ler
geliştirme kullanıcıları
test çocuk profilleri
```

Önerilen komutlar:

```bash
pnpm db:migrate
pnpm db:seed:reference
pnpm db:seed:development
pnpm db:reset
```

Production ortamında:

```bash
pnpm db:migrate
pnpm db:seed:reference
```

çalıştırılır.

---

# 21. Transaction Stratejisi

Bir iş akışındaki ilişkili tüm kayıtlar tek transaction içinde yazılacaktır.

Örneğin yeni dünya oluşturulurken:

```text
world
default region
starting location
child avatar
initial inventory
world state
initial simulation timestamp
```

aynı transaction içinde oluşturulur.

```sql
BEGIN;

INSERT INTO world.worlds ...;
INSERT INTO world.regions ...;
INSERT INTO world.locations ...;
INSERT INTO character.characters ...;
INSERT INTO inventory.inventories ...;

COMMIT;
```

Hata oluşursa:

```sql
ROLLBACK;
```

uygulanır.

---

# 22. Migration Güvenlik Kuralları

## 22.1 Yeni Kolonu Doğrudan NOT NULL Eklememe

Riskli:

```sql
ALTER TABLE story.stories
ADD COLUMN generation_mode VARCHAR(30) NOT NULL;
```

Güvenli:

```sql
ALTER TABLE story.stories
ADD COLUMN generation_mode VARCHAR(30);

UPDATE story.stories
SET generation_mode = 'standard'
WHERE generation_mode IS NULL;

ALTER TABLE story.stories
ALTER COLUMN generation_mode SET DEFAULT 'standard';

ALTER TABLE story.stories
ALTER COLUMN generation_mode SET NOT NULL;
```

## 22.2 Büyük Tablolarda Concurrent Index

Production ortamında:

```sql
CREATE INDEX CONCURRENTLY ...
```

kullanılacaktır.

## 22.3 Kolon Yeniden Adlandırma

Sıfır kesintili yaklaşım:

```text
yeni kolon eklenir
çift yazım başlatılır
veri taşınır
okuma yeni kolona geçirilir
eski kolon kaldırılır
```

Bu yaklaşım expand–migrate–contract modelidir.

---

# 23. ORM ve Migration Sahipliği

Değerlendirilen seçenekler:

```text
Drizzle ORM
Prisma
```

Kesin öneri:

> Drizzle ORM + drizzle-kit + gerektiğinde elle yazılmış SQL migration’ları.

Gerekçeler:

```text
PostgreSQL’e daha yakın olması
SQL yapısını gizlememesi
schema kullanımında güçlü olması
kompleks indeks ve constraint yönetimine uygun olması
JSONB ve pgvector kullanımında esneklik sağlaması
migration kontrolünü geliştirme ekibine bırakması
```

---

# 24. İlk Migration Kapsamı

İlk gerçek migration yüzlerce tablo oluşturmayacaktır.

Çekirdek tablolar:

```text
identity.users
profile.households
profile.child_profiles

world.universes
world.worlds
world.regions
world.locations
world.location_connections

character.characters
character.trait_definitions
character.character_traits
character.emotion_definitions
character.character_emotions
character.relationships
character.relationship_dimensions

inventory.item_definitions
inventory.item_instances
inventory.inventories
inventory.inventory_entries

story.stories
story.story_versions
story.story_sessions
story.story_participants
story.session_decisions

simulation.world_events
simulation.state_changes
simulation.simulation_runs

memory.memory_records

media.assets

system.outbox_events
system.idempotency_keys

audit.audit_logs
```

Bu çekirdek aşağıdaki akışları destekler:

```text
kullanıcı oluşturma
çocuk profili oluşturma
dünya oluşturma
karakter ekleme
hikâye oluşturma
hikâye oturumu başlatma
seçim kaydetme
dünya durumunu değiştirme
hafıza oluşturma
envanter öğesi kazanma
```

---

# 25. İlk Migration Sonrası Doğrulama Testleri

1. Kullanıcı ve household oluşturulabiliyor mu?
2. Aynı e-posta iki kez eklenemiyor mu?
3. Household’a çocuk profili eklenebiliyor mu?
4. Dünya, bölge ve konum hiyerarşisi kurulabiliyor mu?
5. Silinmiş dünya aktif sorgularda görünmüyor mu?
6. Karakter dünyaya ve konuma bağlanabiliyor mu?
7. Trait ve emotion değerleri sınır dışına çıkamıyor mu?
8. İki karakter arasında yönlü ilişki kurulabiliyor mu?
9. Hikâye ve hikâye session’ı ayrı tutuluyor mu?
10. Hikâye seçimi transaction içinde kaydediliyor mu?
11. Seçim sonucu state change oluşturuluyor mu?
12. Envantere aynı instance iki kez eklenemiyor mu?
13. Başarısız transaction yarım kayıt bırakıyor mu?
14. Audit kaydı üretilebiliyor mu?
15. Migration boş veritabanında baştan sona çalışıyor mu?
16. Migration ikinci kez uygulanmaya çalışıldığında güvenli davranıyor mu?
17. Rollback veya düzeltme migration’ı uygulanabiliyor mu?

---

# 26. Kesinleşen Fiziksel Veritabanı Kararları

| Konu | Karar |
|---|---|
| Veritabanı | PostgreSQL |
| ORM | Drizzle ORM |
| Migration aracı | Drizzle Kit + gerektiğinde manuel SQL |
| ID | UUID, tercihen UUIDv7 |
| Zaman tipi | `TIMESTAMPTZ` |
| Domain ayrımı | PostgreSQL schema’ları |
| Değişken yapı | Kontrollü `JSONB` |
| Trait yapısı | Normalize edilmiş vektör tabloları |
| Emotion yapısı | Çok boyutlu ilişki tablosu |
| İlişkiler | Yönlü ve çok boyutlu |
| Hikâye içeriği | Versiyonlu |
| Story / session | Ayrı tablolar |
| State geçmişi | Append-only değişim kayıtları |
| Dosyalar | Object storage, DB’de metadata |
| Soft delete | Seçili kullanıcı içeriklerinde |
| Audit | Silinmeyen tarihsel kayıtlar |
| Partition | İlk sürümde zorunlu değil, tasarım hazır |
| pgvector | Opsiyonel extension |
| İlk migration | Çekirdek tablolarla sınırlı |
| Seed | Referans ve development seed ayrımı |
| Production değişiklikleri | Expand–migrate–contract yaklaşımı |

---

# 27. Sonuç

Bu fiziksel şema tasarımı LUMI’yi ilk günden yüzlerce tabloyla ağırlaştırmaz. Bununla birlikte aşağıdaki sistemlerin tamamını ileride destekleyebilecek sağlam bir PostgreSQL temeli oluşturur:

```text
Decision Engine
Utility Evaluator
Emotion Engine
Memory Engine
World Simulation
NPC Autonomous Action
Ecology
Civilization
Culture
Politics
Education
AI generation tracking
```

Bir sonraki teknik aşama:

> Drizzle klasör yapısı, schema dosyalarının bölünmesi, entity sahipliği ve gerçek `0001_initial_core` migration içeriğinin hazırlanmasıdır.
