# Implementation Notes

## 1. Migration klasörü

Bu pakette iki migration yaklaşımı birlikte gösterilmiştir:

- `migrations/0001_extensions_and_schemas.sql`: İnsan tarafından okunabilir foundation SQL'i
- `drizzle/`: Drizzle Kit tarafından üretilecek migration zinciri

Projede tek otoriter migration zinciri seçilmelidir. Önerilen yaklaşım:

1. Foundation SQL'i Drizzle custom migration içine alın.
2. Sonraki tablo migration'larını Drizzle Kit ile üretin.
3. Üretilen SQL'i manuel olarak inceleyin.
4. Uygulanmış migration dosyalarını değiştirmeyin.

## 2. `updated_at`

PostgreSQL `updated_at` alanını kendiliğinden güncellemez.

İki seçenek vardır:

- Repository update işlemlerinde açıkça `updatedAt: new Date()` yazmak
- Veritabanı trigger'ı kullanmak

LUMI için başlangıçta uygulama katmanında açık güncelleme önerilir. Kritik ve çok kaynaklı write senaryoları oluşursa trigger değerlendirilebilir.

## 3. UUIDv7

UUIDv7 uygulama katmanında üretilir. Böylece:

- Transaction başlamadan ID üretilebilir.
- Outbox event aggregate ID önceden bilinir.
- Test verisi deterministik şekilde kurulabilir.
- Zaman sıralı index locality iyileşir.

## 4. Connection pool

API ve worker süreçleri farklı pool ayarları kullanabilir.

Örnek:

```text
web/API: 10 connection
worker: 5 connection
migration: 1 connection
```

Toplam bağlantı sayısı PostgreSQL `max_connections` sınırına göre hesaplanmalıdır.

## 5. Production güvenliği

Production'da:

- DB kullanıcısı superuser olmamalı.
- Migration ve runtime kullanıcıları ayrılabilir.
- Runtime kullanıcısı schema oluşturma yetkisine sahip olmamalı.
- TLS bağlantısı zorunlu hale getirilebilir.
- Secret değerler `.env` dosyasında repoya yazılmamalıdır.
