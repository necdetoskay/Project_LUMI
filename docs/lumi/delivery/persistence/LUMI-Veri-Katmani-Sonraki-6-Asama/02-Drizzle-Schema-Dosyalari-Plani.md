# LUMI — Drizzle Schema Dosyaları Planı

## 1. Amaç

Bu doküman, ER modelinin Drizzle ORM dosya yapısına nasıl çevrileceğini tanımlar.

---

## 2. Klasör Yapısı

```text
src/db/
├── client.ts
├── index.ts
├── transaction.ts
├── schema/
│   ├── common.ts
│   ├── identity/
│   ├── profile/
│   ├── world/
│   ├── character/
│   ├── story/
│   ├── simulation/
│   ├── memory/
│   ├── inventory/
│   ├── education/
│   ├── media/
│   ├── ai/
│   ├── audit/
│   └── system/
└── relations/
```

---

## 3. Dosya Standartları

Her tablo ayrı dosyada tutulur:

```text
users.ts
households.ts
child-profiles.ts
worlds.ts
characters.ts
stories.ts
```

Her domain bir `index.ts` ile export edilir.

---

## 4. Common Tanımlar

```ts
import { pgSchema } from "drizzle-orm/pg-core";

export const identitySchema = pgSchema("identity");
export const profileSchema = pgSchema("profile");
export const worldSchema = pgSchema("world");
export const characterSchema = pgSchema("character");
export const storySchema = pgSchema("story");
export const simulationSchema = pgSchema("simulation");
export const memorySchema = pgSchema("memory");
export const inventorySchema = pgSchema("inventory");
export const educationSchema = pgSchema("education");
export const mediaSchema = pgSchema("media");
export const aiSchema = pgSchema("ai");
export const auditSchema = pgSchema("audit");
export const systemSchema = pgSchema("system");
```

---

## 5. Tablo Dosyası Şablonu

```ts
import {
  index,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { worldSchema } from "../common";

export const worlds = worldSchema.table(
  "worlds",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    index("worlds_name_idx").on(table.name),
  ],
);
```

---

## 6. İsimlendirme

TypeScript:

```text
camelCase
```

PostgreSQL:

```text
snake_case
```

Tablo isimleri çoğul, entity tipleri tekil olacaktır.

---

## 7. Infer Tipleri

Her dosyada gerekli tipler export edilebilir:

```ts
export type World = typeof worlds.$inferSelect;
export type NewWorld = typeof worlds.$inferInsert;
```

Ancak domain DTO’ları doğrudan ORM tiplerine bağımlı hale getirilmemelidir.

---

## 8. Relations Dosyaları

Drizzle relations sorgu kolaylığı sağlar; foreign key’in yerini almaz.

```ts
export const worldsRelations = relations(worlds, ({ many }) => ({
  regions: many(regions),
}));
```

Gerçek veri bütünlüğü PostgreSQL foreign key ile korunur.

---

## 9. JSONB Tipleri

JSONB alanlarında bilinmeyen `any` kullanılmamalıdır.

```ts
type WorldState = {
  daylight?: number;
  weatherCode?: string;
  activeEventIds?: string[];
};
```

```ts
state: jsonb("state").$type<WorldState>()
```

---

## 10. Numeric Alanları

Para ve hassas değerler `numeric` olarak tutulur.

```ts
numeric("cost_amount", {
  precision: 14,
  scale: 6,
})
```

Float kullanımından kaçınılır.

---

## 11. Check Constraint Örneği

```ts
check(
  "emotion_intensity_check",
  sql`${table.intensity} BETWEEN 0 AND 1`,
)
```

---

## 12. Composite Primary Key

```ts
primaryKey({
  columns: [
    table.characterId,
    table.traitDefinitionId,
  ],
})
```

---

## 13. Partial Index

```ts
uniqueIndex("users_email_unique_active")
  .on(sql`lower(${table.email})`)
  .where(sql`${table.deletedAt} IS NULL`)
```

---

## 14. Schema Export

```ts
export * from "./users";
export * from "./accounts";
export * from "./sessions";
```

Ana index:

```ts
export * from "./identity";
export * from "./profile";
export * from "./world";
```

---

## 15. İlk Kodlama Sırası

```text
1. common.ts
2. identity
3. profile
4. media
5. world
6. character
7. inventory
8. story
9. simulation
10. memory
11. education
12. ai
13. audit
14. system
```

---

## 16. Schema Dosyası Başarı Kriterleri

- TypeScript build başarılı olmalı.
- Drizzle generate hata vermemeli.
- FK döngüleri çözülmüş olmalı.
- SQL isimleri standarda uygun olmalı.
- Tüm index ve check constraint’ler görünür olmalı.
- Hiçbir tablo `public` schema altında oluşmamalı.
