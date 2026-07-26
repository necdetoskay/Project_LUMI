# Project LUMI -- Paket 18

# AI Image Generation & Visual Consistency System

## Amaç

LUMI evreninde üretilen tüm görsellerin karakter, dünya ve sanat stili
açısından tutarlı olmasını sağlarken maliyet ve performansı optimize
eden merkezi görsel üretim sistemini tanımlamak.

## Mimari

### 1. Image Request Manager

-   Görsel isteğini alır
-   Öncelik seviyesini belirler
-   Cache kontrolü yapar

### 2. Character Consistency Engine

-   Karakter kimliği
-   Yüz özellikleri
-   Kıyafet
-   Renk paleti
-   Aksesuarlar

### 3. Style Manager

Desteklenen stiller: - Storybook - Watercolor - Cartoon - Pixel Art -
Anime (opsiyonel)

### 4. Prompt Builder

Bileşenler: - Karakter açıklaması - Dünya bağlamı - Sahne açıklaması -
Stil - Negatif prompt - Kalite ayarları

### 5. Image Cache

Tekrar üretilmesini önlemek için: - Prompt Hash - Style Version -
Character Version - Image ID

## Kalite Kontrolleri

-   Karakter tutarlılığı
-   Stil uyumu
-   Çözünürlük
-   Güvenlik filtresi
-   Dosya doğrulaması

## Maliyet Optimizasyonu

-   Küçük çözünürlük önizleme
-   Gerektiğinde yüksek kalite
-   Cache önceliği
-   Batch üretim desteği

## Test Senaryoları

-   Aynı karakter farklı sahneler
-   Aynı sahne farklı stiller
-   Cache isabet testi
-   Bozuk çıktı
-   Yeniden üretim

## Çıktılar

-   Image Prompt
-   Image Metadata
-   Cache Record
-   Quality Report
-   Cost Report
