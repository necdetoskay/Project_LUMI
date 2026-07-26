# Project LUMI -- Paket 17

# AI Prompt Orchestration & Generation Pipeline

## Amaç

LUMI'nin tüm yapay zekâ üretim süreçlerini tek ve standart bir
orkestrasyon katmanı üzerinden yönetmek.

## Mimari

1.  Context Builder

-   Dünya durumu
-   Karakterler
-   NPC hafızaları
-   Aktif görevler
-   Son olaylar

2.  Prompt Composer

-   System Prompt
-   Developer Prompt
-   Runtime Context
-   Kullanıcı seçimi
-   Güvenlik kuralları

3.  Model Router

-   Hikâye üretimi
-   Görsel üretimi
-   Başlık üretimi
-   Özet üretimi
-   Soru üretimi

4.  Output Validator

-   JSON doğrulama
-   Şema kontrolü
-   Güvenlik filtreleri
-   Tutarlılık analizi

5.  Retry Strategy

-   Otomatik yeniden deneme
-   Fallback model
-   Kısmi yeniden üretim

## Prompt Yaşam Döngüsü

Context → Prompt → AI Model → Validation → Repair → Persist → Story
Engine

## Loglama

-   Prompt ID
-   Model
-   Token kullanımı
-   Süre
-   Hata kayıtları

## Testler

-   Boş context
-   Büyük context
-   Model değişimi
-   Retry senaryoları
-   Validation başarısızlığı

## Çıktılar

-   Final Prompt
-   AI Response
-   Validation Report
-   Prompt Audit Log
