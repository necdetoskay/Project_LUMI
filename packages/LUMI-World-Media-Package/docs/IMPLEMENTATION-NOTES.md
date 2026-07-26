# World + Media Implementation Notes

## 1. Self-reference foreign key

`regions.parent_region_id` ve `locations.parent_location_id` Drizzle tarafında ayrı relation yardımcılarıyla genişletilebilir. SQL migration gerçek self-reference foreign key'i içerir.

## 2. World state

`world.world_states` append-only yaklaşımıyla çalışır. Güncel state, en son `effective_at` kaydı üzerinden okunur.

## 3. Media storage

Dosya binary içeriği PostgreSQL içinde saklanmaz. DB yalnızca metadata, storage provider, bucket ve key tutar.

## 4. Asset yaşam döngüsü

Asset soft delete kullanır. Fiziksel storage temizliği ayrı worker ve retention politikasıyla yapılmalıdır.

## 5. Child avatar foreign key

Önceki pakette nullable bırakılan `child_profiles.avatar_asset_id`, bu pakette additive migration ile `media.assets` tablosuna bağlanır.

## 6. Directed connections

Location connection yönlüdür. İki yönlü yol için iki ayrı satır yazılır.

## 7. World calendar

Başlangıç sürümünde world başına tek calendar kaydı vardır. Gelecekte çoklu calendar ihtiyacı doğarsa composite key modeline expand migration ile geçilebilir.

## 8. JSONB sınırı

World, region ve location metadata alanları esneklik sağlar; ancak ilişki, sahiplik veya sık filtrelenen alanlar JSONB içine taşınmamalıdır.
