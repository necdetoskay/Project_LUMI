# LUMI — İlk Migration Paketi

## 1. Amaç

İlk migration paketi, LUMI’nin çekirdek PostgreSQL altyapısını güvenli ve tekrar üretilebilir biçimde kurar.

---

## 2. Migration Dosyaları

```text
0001_extensions_and_schemas.sql
0002_initial_core_tables.sql
0003_initial_core_indexes.sql
0004_reference_seed.sql
0005_initial_constraints.sql
```

---

## 3. 0001 — Extensions and Schemas

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

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

`vector` extension ayrı migration olarak tutulur.

---

## 4. 0002 — Initial Core Tables

Önerilen sıra:

```text
identity.users
identity.accounts
identity.sessions
identity.roles
identity.permissions
identity.user_roles
identity.role_permissions

profile.households
profile.household_members
profile.child_profiles
profile.child_preferences

media.assets

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

simulation.simulation_runs
simulation.world_events
simulation.state_changes

memory.memory_records

education.questions
education.answers

ai.providers
ai.models
ai.prompt_templates
ai.prompt_versions
ai.generation_requests
ai.cost_records

audit.audit_logs
audit.security_events

system.outbox_events
system.idempotency_keys
system.feature_flags
```

---

## 5. 0003 — Indexes

Bu migration’da:

- Foreign key indexleri
- Partial unique indexler
- Zaman bazlı indexler
- Aktif kayıt indexleri
- Idempotency unique indexi

oluşturulur.

Production’da büyük tablolar için `CREATE INDEX CONCURRENTLY` ayrı migration olarak uygulanır.

---

## 6. 0004 — Reference Seed

Sadece sabit referans verileri eklenir:

- Roller
- İzinler
- Trait definitions
- Emotion definitions
- Relationship dimensions
- Feature flags
- Desteklenen dil kodları

Demo kullanıcı veya demo dünya bu migration’a girmez.

---

## 7. 0005 — Initial Constraints

Sonradan eklenmesi gereken cross-domain foreign key’ler, check constraint’ler ve validation kuralları bu migration’da tamamlanır.

---

## 8. Migration Kuralları

- Uygulanmış migration değiştirilmez.
- Yeni ihtiyaç için yeni migration yazılır.
- Production’da destructive migration tek adımda yapılmaz.
- Expand–migrate–contract uygulanır.
- Migration dosyaları code review olmadan uygulanmaz.
- Her migration CI ortamında boş DB üzerinde test edilir.

---

## 9. Rollback Yaklaşımı

Production’da otomatik down migration yerine forward fix tercih edilir.

Örnek:

```text
0008 yanlış kolon ekledi
0009 düzeltme migration’ı ile doğru kolon oluşturulur
```

---

## 10. Migration Doğrulama

```bash
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm db:test
```

Ek doğrulamalar:

```text
schema diff
foreign key listesi
index listesi
constraint listesi
seed tekrar çalıştırma testi
```

---

## 11. Başarı Kriterleri

- Sıfırdan kurulum çalışmalı.
- Migration tekrar uygulanmamalı.
- Reference seed idempotent olmalı.
- Tablolar doğru schema altında oluşmalı.
- Foreign key sırası hata vermemeli.
- Test veritabanı ve production aynı migration zincirini kullanmalı.
