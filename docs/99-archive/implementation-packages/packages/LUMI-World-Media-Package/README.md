# LUMI — World Domain + Media Assets Package

Bu paket, Project LUMI'nin yaşayan evren, dünya, bölge, konum ve temel medya varlığı veri katmanını kurar.

## Paket kapsamı

### World Domain

```text
world.universes
world.worlds
world.regions
world.locations
world.location_connections
world.biomes
world.world_states
world.world_calendars
```

### Media Domain

```text
media.assets
media.asset_variants
```

## Temel iş kuralları

1. Bir universe birden fazla world içerebilir.
2. Bir world yalnızca bir universe'e bağlıdır.
3. Region ve location hiyerarşik olabilir.
4. Location connection yönlüdür.
5. Aynı source-target bağlantısı duplicate olamaz.
6. Dünya state verileri esnek alanlar için JSONB kullanabilir.
7. Media dosyalarının kendisi PostgreSQL içinde tutulmaz.
8. Asset storage key benzersizdir.
9. Asset variant ana asset'e bağlıdır.
10. Child profile avatar bağlantısı additive migration ile media.assets tablosuna bağlanır.

## Ön koşul

Bu paket aşağıdaki paketlerin üzerine uygulanmalıdır:

```text
LUMI-Database-Foundation-Package
LUMI-Identity-Profile-Package
```

## Sonraki paket

```text
Paket 4 — Character + Inventory Domain
```
