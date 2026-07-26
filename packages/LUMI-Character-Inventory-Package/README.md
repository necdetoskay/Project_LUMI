# LUMI — Character + Inventory Domain Package

Bu paket, Project LUMI'nin karakter ve envanter veri katmanını kurar.

## Kapsam

### Character

- characters
- trait_definitions
- character_traits
- emotion_definitions
- character_emotions
- relationships
- relationship_dimensions
- relationship_values
- character_goals
- character_conditions

### Inventory

- item_definitions
- item_instances
- inventories
- inventory_entries
- item_history

## Temel kurallar

- Karakterler world'e bağlıdır.
- Child avatar, child profile ile ilişkilendirilebilir.
- Trait ve emotion değerleri normalize edilmiş vektörlerdir.
- İlişkiler yönlüdür.
- Bir item instance aynı anda yalnızca bir inventory içinde bulunabilir.
- Transferler transaction içinde yapılır.
- Item history append-only tutulur.

## Ön koşullar

- Database Foundation
- Identity + Profile
- World + Media

## Sonraki paket

Paket 5 — Story + Education Domain
