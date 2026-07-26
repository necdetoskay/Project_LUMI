# Project LUMI -- Paket 17.4

# AI Output Validation & Self-Repair Pipeline

## Amaç

Yapay zekâ tarafından üretilen tüm çıktıları sisteme kaydetmeden önce
doğrulamak, hataları otomatik düzeltmek ve yalnızca güvenilir sonuçların
Story Engine'e aktarılmasını sağlamak.

## Pipeline

AI Response ↓ Schema Validation ↓ Consistency Check ↓ Safety Validation
↓ Self-Repair ↓ Re-Validation ↓ Accept / Reject

## 1. Schema Validation

Kontroller: - JSON formatı - Zorunlu alanlar - Veri tipleri - Enum
doğrulamaları - Alan uzunlukları

## 2. Consistency Validation

-   Karakter isimleri
-   NPC referansları
-   Dünya durumu
-   Görev tutarlılığı
-   Envanter doğruluğu
-   Timeline kontrolü

## 3. Safety Validation

-   Çocuk dostu içerik
-   Zararlı yönlendirmeler
-   Yasaklı ifadeler
-   Uygunsuz dil filtreleri

## 4. Self-Repair Engine

Hafif hatalarda: - Eksik alan tamamlama - JSON düzeltme - Biçim onarma -
Metadata ekleme

Ağır hatalarda: - Yeniden üretim isteği - Alternatif modele
yönlendirme - Çıktının reddedilmesi

## Kabul Kriterleri

-   %100 geçerli şema
-   Kritik hata bulunmaması
-   Tutarlılık puanı eşik üzerinde
-   Güvenlik kontrollerinin tamamı başarılı

## Loglama

-   Validation ID
-   Error List
-   Repair Actions
-   Retry Count
-   Final Status

## Test Senaryoları

-   Bozuk JSON
-   Eksik alanlar
-   Hatalı NPC
-   Güvenlik ihlali
-   Self-repair başarısı
-   Self-repair başarısızlığı

## Çıktılar

-   Validation Report
-   Repair Report
-   Accepted Output
-   Rejected Output Archive
