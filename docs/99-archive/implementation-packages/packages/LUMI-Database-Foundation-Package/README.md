# LUMI — Database Foundation Package

Bu paket, Project LUMI veri katmanının temel PostgreSQL + Drizzle ORM altyapısını kurar.

## Paket kapsamı

- Drizzle Kit yapılandırması
- PostgreSQL bağlantı istemcisi
- Transaction executor tipi ve yardımcıları
- Domain PostgreSQL schema tanımları
- UUIDv7 üretim yardımcıları
- Ortak timestamp ve soft-delete kolonları
- Merkezi schema export yapısı
- İlk extension ve schema migration'ı
- Environment doğrulaması
- Temel bağlantı testi
- Migration smoke testi
- `.env.example`
- Örnek npm script'leri

## Önerilen teknoloji sürümleri

- Node.js 22 veya üzeri
- TypeScript 5.7 veya üzeri
- PostgreSQL 16 veya üzeri
- Drizzle ORM
- Drizzle Kit
- postgres.js
- Zod
- uuid

## Kurulum

```bash
pnpm add drizzle-orm postgres zod uuid
pnpm add -D drizzle-kit tsx typescript vitest @types/node
```

## Environment

`.env.example` dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

## Veritabanı komutları

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:studio
pnpm db:test
```

## Dosya yapısı

```text
.
├── drizzle.config.ts
├── migrations/
│   └── 0001_extensions_and_schemas.sql
├── src/
│   ├── config/
│   │   └── env.ts
│   └── db/
│       ├── client.ts
│       ├── index.ts
│       ├── transaction.ts
│       ├── uuid.ts
│       ├── migrate.ts
│       ├── schema/
│       │   ├── common.ts
│       │   ├── index.ts
│       │   └── schemas.ts
│       └── tests/
│           ├── connection.test.ts
│           └── migration.test.ts
└── .env.example
```

## Mimari kararlar

1. Tüm domain tabloları `public` yerine ayrı PostgreSQL schema'larında tutulur.
2. UUID değerleri uygulama katmanında UUIDv7 olarak üretilir.
3. Tüm zaman alanları `TIMESTAMPTZ` kullanır.
4. Transaction gerektiren use-case'ler aynı executor üzerinden çalışır.
5. Soft-delete yalnızca ihtiyaç olan entity'lerde uygulanır.
6. Migration dosyaları bir kez uygulandıktan sonra değiştirilmez.
7. Production ortamında forward-fix yaklaşımı kullanılır.
8. Schema drift CI aşamasında kontrol edilir.

## Sonraki paket

Bu foundation paketi doğrulandıktan sonra sıradaki uygulama paketi:

```text
Identity + Profile Domain
```

olacaktır.
