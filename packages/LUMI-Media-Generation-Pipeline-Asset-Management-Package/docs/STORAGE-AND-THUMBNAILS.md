# Storage and Thumbnails

Storage abstraction desteklenen hedeflerin değiştirilebilmesini sağlar:

- Local filesystem
- S3-compatible object storage
- Cloud provider storage

İlk geliştirme ortamında local storage kullanılabilir.

Thumbnail kuralları:

- Orijinal asset korunur
- Küçük liste görünümü için thumbnail oluşturulur
- Thumbnail ayrı media asset olarak kaydedilir
- Orijinal ve thumbnail ilişkisi metadata içinde tutulur
