# Project LUMI -- Paket 20.2

# Story & World Simulation Testing Framework

## Amaç

Story Engine, World Simulation, NPC davranışları ve dünya durumunun
binlerce otomatik senaryoyla doğrulanmasını sağlayan test altyapısını
tanımlamak.

## Test Kapsamı

### Story Engine

-   Hikâye üretimi
-   Seçim dallanmaları
-   Sonuç tutarlılığı
-   Hafıza aktarımı

### World Simulation

-   Zaman ilerlemesi
-   Bölgesel olaylar
-   Ekonomi değişimleri
-   Hava durumu

### NPC Simulation

-   Günlük rutinler
-   Karar mekanizması
-   İlişki değişimleri
-   Hedef güncellemeleri

## Test Türleri

-   Senaryo Testleri
-   Rastgele Simülasyonlar
-   Uzun Süreli Simülasyonlar
-   Regresyon Testleri
-   Snapshot Karşılaştırmaları

## Snapshot Doğrulaması

Her testte: - World State - NPC State - Inventory - Quest State -
Relationship Graph

önceki beklenen durum ile karşılaştırılır.

## Başarı Kriterleri

-   Tutarlı dünya durumu
-   Beklenen hikâye akışı
-   Veri bütünlüğü
-   Performans sınırları
-   Deterministik sonuçlar

## Telemetri

-   Simülasyon süresi
-   İşlenen NPC sayısı
-   Oluşan olay sayısı
-   Commit sayısı
-   Hata oranı

## Test Senaryoları

-   Tek oyuncu
-   Çok sayıda NPC
-   Uzun zaman atlaması
-   Çoklu hikâye etkileri
-   Rollback sonrası doğrulama
-   Aynı senaryonun tekrar çalıştırılması

## Çıktılar

-   Simulation Report
-   Snapshot Diff Report
-   Consistency Report
-   Performance Metrics
-   Regression Summary
