# Project LUMI -- Paket 17.3

# Model Router & AI Provider Management

## Amaç

LUMI içerisinde kullanılan tüm yapay zekâ sağlayıcılarını merkezi bir
katmandan yönetmek, her görev için en uygun modeli seçmek ve hata
durumlarında otomatik geçiş (fallback) sağlayarak kesintisiz hizmet
sunmak.

## Mimari

### 1. Request Analyzer

-   İstek türünü belirler
-   Karmaşıklık seviyesini hesaplar
-   Tahmini token kullanımını çıkarır

### 2. Model Router

Her görev için en uygun modeli seçer.

Örnek görevler: - Hikâye üretimi - NPC diyalogları - Görsel prompt
üretimi - Hikâye özeti - Eğitim soruları - Dünya haberleri

### 3. Provider Manager

Desteklenen sağlayıcılar: - OpenRouter - Yerel LLM - Gelecekte eklenecek
sağlayıcılar

## Model Seçim Kriterleri

-   Kalite
-   Maliyet
-   Yanıt süresi
-   Maksimum context uzunluğu
-   Güvenilirlik
-   Başarı oranı

## Fallback Zinciri

Primary Model ↓ Secondary Model ↓ Backup Model ↓ Error Handler

## Retry Politikası

-   Geçici ağ hataları
-   Rate limit
-   Timeout
-   Bozuk çıktı
-   Şema doğrulama hatası

## Telemetri

Her istek için: - Request ID - Provider - Model - Süre - Token
Kullanımı - Başarı Durumu - Retry Sayısı

## Performans Hedefleri

-   Minimum gecikme
-   Maksimum başarı oranı
-   Dengeli maliyet
-   Yüksek kullanılabilirlik

## Test Senaryoları

-   Sağlayıcı kesintisi
-   Timeout
-   Rate limit
-   Geçersiz çıktı
-   Otomatik fallback
-   Paralel istek yükü

## Çıktılar

-   Routing Report
-   Provider Log
-   Retry Log
-   Performance Metrics
