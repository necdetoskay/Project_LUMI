# LUMI — Seed Verileri Stratejisi

## 1. Amaç

Seed verileri, sistemin çalışması için gereken sabit tanımları ve geliştirme ortamına özel örnek verileri kontrollü biçimde yükler.

---

## 2. Seed Türleri

```text
reference seed
development seed
test fixture
demo seed
```

Bunlar birbirinden ayrılır.

---

## 3. Reference Seed

Production’a uygulanabilir.

İçerik:

```text
roles
permissions
trait definitions
emotion definitions
relationship dimensions
supported locales
feature flags
system defaults
```

---

## 4. Development Seed

Yalnızca yerel geliştirme ortamında kullanılır.

İçerik:

```text
demo user
demo household
demo child profiles
demo world
demo characters
demo story
demo inventory
```

---

## 5. Test Fixture

Her testin kendi ihtiyacına göre minimal veri oluşturur.

Testler development seed’e bağımlı olmamalıdır.

---

## 6. Trait Seed Örnekleri

```text
courage
kindness
curiosity
patience
honesty
empathy
creativity
responsibility
cooperation
caution
```

Her kayıt için:

```text
code
localized name
category
minimum
maximum
default
metadata
```

---

## 7. Emotion Seed Örnekleri

```text
joy
sadness
fear
anger
surprise
curiosity
hope
trust
embarrassment
gratitude
```

---

## 8. Relationship Dimensions

```text
trust
affection
respect
fear
rivalry
familiarity
gratitude
dependency
```

---

## 9. Roller

```text
system_admin
parent
support_admin
content_reviewer
```

Çocuk profili auth rolü değildir.

---

## 10. İzinler

Örnek izinler:

```text
household.read
household.manage
child_profile.read
child_profile.manage
world.read
world.manage
story.generate
story.review
media.generate
audit.read
```

---

## 11. Feature Flags

Örnekler:

```text
interactive_story_enabled
world_simulation_enabled
image_generation_enabled
tts_enabled
education_module_enabled
npc_emergent_interaction_enabled
```

---

## 12. Idempotent Seed

Seed tekrar çalıştırıldığında duplicate oluşturmamalıdır.

```ts
await db
  .insert(traitDefinitions)
  .values(data)
  .onConflictDoUpdate({
    target: traitDefinitions.code,
    set: {
      name: data.name,
      metadata: data.metadata,
    },
  });
```

---

## 13. Seed Dosya Yapısı

```text
src/db/seeds/
├── reference/
│   ├── roles.seed.ts
│   ├── permissions.seed.ts
│   ├── traits.seed.ts
│   ├── emotions.seed.ts
│   ├── relationship-dimensions.seed.ts
│   └── feature-flags.seed.ts
├── development/
│   ├── demo-users.seed.ts
│   ├── demo-world.seed.ts
│   └── demo-story.seed.ts
└── index.ts
```

---

## 14. Çalıştırma Komutları

```bash
pnpm db:seed:reference
pnpm db:seed:development
pnpm db:seed:test
```

---

## 15. Güvenlik Kuralları

- Gerçek kişisel veri seed içine girmez.
- Production credential seed içine yazılmaz.
- Demo çocuk profilleri kurgu isimler kullanır.
- Secret değerler environment variable üzerinden alınır.
