# LUMI — Identity Domain

## 1. Domainin Amacı

Kimlik doğrulama, kullanıcı hesapları, oturumlar, roller ve yetkiler.

Bu domain; **kullanıcı hesabı, kimlik sağlayıcı bağlantısı, oturum, rol, izin** yaşam döngüsünün tek sahibidir. Başka domainler bu verilere doğrudan yazmak yerine ilgili repository veya application service üzerinden erişir.

## 2. Neden Ayrı Bir Domain?

Bu ayrım şu faydaları sağlar:

- İş kurallarının tek yerde toplanması
- Foreign key ve transaction sınırlarının açık olması
- Migration değişikliklerinin kontrollü ilerlemesi
- Testlerin domain bazında yazılabilmesi
- Gelecekte servis ayrıştırmasına hazır bir yapı

## 3. Domain Bağımlılıkları

Doğrudan başka bir domain bağımlılığı yoktur.

Bağımlılık bulunması, veri sahipliğinin devredildiği anlamına gelmez. Her domain yalnızca kendi tablolarına yazma yetkisine sahiptir.

## 4. Çekirdek Tablolar

- `identity.users` — Ebeveyn ve yönetici kullanıcı hesapları
- `identity.accounts` — Harici veya yerel kimlik sağlayıcı bağlantıları
- `identity.sessions` — Aktif kullanıcı oturumları
- `identity.roles` — Sistem rol tanımları
- `identity.permissions` — İzin tanımları
- `identity.user_roles` — Kullanıcı–rol ilişkileri
- `identity.role_permissions` — Rol–izin ilişkileri

## 5. Veri Sahipliği

Bu domain aşağıdaki veri türlerinin otoriter kaynağıdır:

- Kullanıcı hesabı
Kimlik sağlayıcı bağlantısı
Oturum
Rol
Izin

Domain dışındaki kopyalar yalnızca okunabilir projection, cache veya raporlama amacıyla oluşturulabilir.

## 6. Primary Key Stratejisi

Tüm ana entity tablolarında:

```sql
id UUID PRIMARY KEY
```

kullanılır.

ID değerleri uygulama seviyesinde UUIDv7 olarak üretilir. Birleşim tablolarında doğal olarak iki foreign key’den oluşan composite primary key tercih edilebilir.

## 7. Foreign Key Stratejisi

- Güçlü sahiplik ilişkilerinde `ON DELETE CASCADE`
- Tarihsel kayıtların korunması gereken ilişkilerde `ON DELETE RESTRICT`
- Opsiyonel bağlarda `ON DELETE SET NULL`
- Yoğun kullanılan tüm foreign key kolonlarında ayrıca index

kullanılır.

## 8. Unique Kuralları

Unique kuralları domain iş kurallarını yansıtmalıdır.

Genel örnekler:

```text
parent_id + code
owner_id + type
scope + external_key
active entity + slug
```

Soft delete kullanılan tablolarda partial unique index tercih edilir:

```sql
CREATE UNIQUE INDEX ...
WHERE deleted_at IS NULL;
```

## 9. Check Constraint Stratejisi

Veritabanında korunabilecek sınırlar doğrudan constraint ile güvence altına alınır:

```text
oranlar: 0–1
vektör boyutları: -1–1
sayım değerleri: >= 0
durum alanları: izin verilen değer kümesi
başlangıç zamanı <= bitiş zamanı
```

Dinamik referans tablo sınırları application service seviyesinde doğrulanır.

## 10. İndeks Stratejisi

Asgari indeksler:

- Foreign key indeksleri
- Aktif kayıtlar için partial indeksler
- Zaman sıralı sorgular için birleşik indeksler
- Sık kullanılan durum alanları için seçici indeksler
- JSONB için yalnızca gerçek sorgu ihtiyacı varsa GIN indeksleri

İndeksler tahminle değil, sorgu kalıpları ve `EXPLAIN ANALYZE` sonuçlarıyla genişletilir.

## 11. Soft Delete Politikası

users

Soft delete kullanılan tablolarda `deleted_at TIMESTAMPTZ` alanı bulunur. Tarihsel ve finansal/operasyonel kayıtlar fiziksel silme yerine retention ve arşiv politikasıyla yönetilir.

## 12. Append-Only Kayıtlar

security_events

Append-only kayıtlar güncellenmez; gerekirse yeni düzeltme kaydı eklenir. Bu yaklaşım denetlenebilirliği ve olay geçmişini korur.

## 13. Drizzle ORM Organizasyonu

Önerilen dosya yapısı:

```text
src/db/schema/identity_domain/
├── index.ts
├── tables.ts veya tablo başına ayrı dosyalar
└── relations.ts
```

Her tablo `pgSchema()` üzerinden kendi PostgreSQL schema’sına bağlanır. Domain dışına yalnızca `index.ts` üzerinden export edilir.

## 14. Repository Sınırı

Örnek repository işlemleri:

- `findUserByEmail()`
- `createUser()`
- `assignRole()`
- `revokeSession()`

Repository yalnızca veri erişimini yönetir. İş kuralları application service veya use-case katmanında tutulur.

## 15. Transaction Kuralları

Aşağıdaki durumlarda transaction zorunludur:

- Birden fazla tabloyu birlikte değiştiren iş akışları
- Domain event/outbox kaydıyla birlikte veri yazımı
- Bir state değişikliğinin geçmiş kaydıyla beraber tutulması
- Idempotency korumalı komut işlemleri

Aynı use-case içinde kullanılan repository’ler aynı transaction executor’ı paylaşır.

## 16. Performans ve Ölçeklenme

Başlangıçta normal PostgreSQL tabloları kullanılacaktır. Partition yalnızca yüksek hacimli append-only tablolarda gerçek ihtiyaç oluştuğunda devreye alınır.

Performans ölçütleri:

```text
P95 sorgu süresi
index hit oranı
lock süresi
dead tuple oranı
tablo ve indeks büyümesi
```

## 17. Gelecekte Genişletme Stratejisi

Genişletmeler additive migration ile yapılır:

1. Yeni tablo veya nullable kolon eklenir.
2. Uygulama çift okuma/yazma dönemine alınır.
3. Backfill tamamlanır.
4. Constraint sıkılaştırılır.
5. Eski yapı sonraki migration’da kaldırılır.

Bu domain, LUMI’nin diğer domainleriyle contract tabanlı biçimde çalışır; veri sahipliği sınırı korunur.

## Kesin Karar Özeti

| Konu | Karar |
|---|---|
| PostgreSQL schema | `identity` |
| ID tipi | UUID, tercihen UUIDv7 |
| ORM | Drizzle ORM |
| Migration | Drizzle Kit + manuel SQL kontrolü |
| Veri sahipliği | Domain repository ve service katmanı |
| Transaction | Çok tablolu işlemlerde zorunlu |
| Event yayını | Transactional Outbox |
| Silme | Tablo türüne göre soft delete veya append-only |
| İndeks | Sorgu ve FK odaklı |
| Genişleme | Expand–migrate–contract |

---

## Sonraki Bağlantı

Bu domain tamamlandıktan sonra sıradaki domainin tabloları, foreign key’leri ve migration bağımlılıkları kesinleştirilir.
