# Character + Inventory Implementation Notes

## Vektörel model

Trait, emotion ve relationship dimension değerleri ayrı satırlar halinde tutulur. Bu yapı, yeni boyut eklemeyi kolon migration'ı gerektirmeden mümkün kılar.

## İlişki yönü

A karakterinin B karakterine güveni ile B karakterinin A karakterine güveni farklı olabilir. Bu nedenle relationship kaydı yönlüdür.

## Inventory item tekilliği

`inventory_entries.item_instance_id` unique constraint ile bir item instance'ın aynı anda birden fazla inventory'de bulunması engellenir.

## Stackable item

İlk sürümde her item instance tekil kabul edilir. Stackable item için quantity alanı korunmuştur; gerçek stacking davranışı daha sonra netleştirilebilir.

## Item history

Item history append-only tutulur. Transfer, kazanma, kaybetme, tüketme ve yok olma olayları ayrı event olarak eklenir.

## Serializable transfer

Item transfer use-case'i concurrency çakışmalarını azaltmak için serializable transaction içinde çalışır.
