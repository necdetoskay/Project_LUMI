# Migration Order

Migration sırası değiştirilmemelidir.

```text
0001_foundation.sql
0002_identity_and_profile.sql
0003_world_and_media.sql
0004_character_and_inventory.sql
0005_story_and_education.sql
0006_simulation_and_memory.sql
0007_ai_audit_system.sql
0008_data_layer_stabilization.sql
```

## Kurallar

- Migration dosyaları geriye dönük değiştirilmez.
- Yayınlanmış migration yeniden yazılmaz.
- Düzeltme için yeni additive migration oluşturulur.
- Production ortamında destructive migration doğrudan çalıştırılmaz.
- Expand → migrate data → contract yaklaşımı uygulanır.
