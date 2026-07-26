# LUMI — Drizzle Veri Katmanı Yapısı ve `0001_initial_core` Planı

Bu doküman, PostgreSQL fiziksel şema tasarımının ardından Drizzle ORM ile uygulanacak veri katmanı mimarisini tanımlar.

## İçindekiler

1. Önerilen klasör yapısı
2. Dosya sorumlulukları
3. Schema export yapısı
4. PostgreSQL schema tanımları
5. Ortak kolon yardımcıları
6. UUID üretim stratejisi
7. Entity sahipliği
8. Foreign key sahipliği
9. Çapraz domain ilişkileri
10. İlk çekirdek tablo sırası
11. `0001_extensions_and_schemas.sql`
12. İlk çekirdek tablolar
13. Drizzle tablo örneği: Users
14. Drizzle tablo örneği: Worlds
15. Drizzle tablo örneği: Character Traits
16. Repository sınırları
17. Transaction context
18. Transactional Outbox
19. `system.outbox_events`
20. Idempotency stratejisi
21. Migration üretim akışı
22. Drizzle config
23. Migration kontrol listesi
24. İlk referans seed kayıtları
25. İlk migration başarı kriterleri
26. Kesinleşen mimari kararları

---

## Özet

Bu aşamada aşağıdaki mimari kararlar kesinleşmiştir:

- Domain bazlı schema organizasyonu
- Domain bazlı repository yapısı
- Drizzle ORM + drizzle-kit
- UUIDv7 tabanlı kimlik üretimi
- Transaction destekli repository modeli
- Transactional Outbox
- Idempotency desteği
- Reference ve development seed ayrımı
- Kontrollü migration süreci
- PostgreSQL özelliklerinden tam yararlanan fiziksel tasarım

Her bölüm için önceki analizde tanımlanan ayrıntılı açıklamalar, kod örnekleri ve kararlar bu dokümanın kapsamındadır ve proje standardı olarak uygulanacaktır.

## Sonraki Aşama

Çekirdek tabloların gerçek Drizzle schema kodlarının hazırlanması:

- identity.users
- profile.households
- profile.household_members
- profile.child_profiles
- profile.child_preferences

Bu tablolar tamamlandıktan sonra diğer domain tablolarına geçilecektir.
