# Project LUMI -- Paket 16.4

# Story State Validation & Consistency Framework

## Amaç

World State Commit işleminden önce ve sonra evren durumunun
tutarlılığını otomatik olarak doğrulayan merkezi doğrulama katmanını
tanımlamak.

## Hedefler

-   Veri bütünlüğünü korumak
-   Mantıksal çelişkileri engellemek
-   Idempotent çalışmayı garanti etmek
-   Hatalı commit'leri reddetmek

## Doğrulama Katmanları

### 1. Entity Validation

-   NPC mevcut mu?
-   Item mevcut mu?
-   Görev tanımlı mı?

### 2. Relationship Validation

-   Aile ilişkileri
-   Arkadaşlık
-   Düşmanlık
-   Sahiplik ilişkileri

### 3. World Rule Validation

-   Aynı NPC iki farklı yerde olamaz.
-   Aynı eşya aynı anda iki kişide bulunamaz.
-   Ölmüş karakter aktif görev alamaz.

### 4. Economy Validation

-   Kaynaklar negatif olamaz.
-   Üretim/tüketim dengesi korunmalıdır.

### 5. Timeline Validation

-   Olaylar kronolojik sırayı bozamaz.
-   Gelecekte gerçekleşmiş olay geçmişe yazılamaz.

## Tutarlılık Raporu

Her doğrulama sonunda: - Başarılı kontroller - Uyarılar - Hatalar -
Engellenen commit nedenleri

## Performans

-   Kademeli doğrulama
-   Paralel kontrol
-   Cache destekli tekrar doğrulama

## Test Senaryoları

-   Geçersiz NPC
-   Yinelenen Item
-   Bozuk ilişki grafı
-   Zaman çakışması
-   Ekonomi ihlali

## Çıktılar

-   Validation Report
-   Error List
-   Warning List
-   Consistency Score
