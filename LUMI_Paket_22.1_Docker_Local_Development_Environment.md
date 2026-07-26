# Project LUMI -- Paket 22.1

# Docker & Local Development Environment

## Amaç

Geliştiricilerin LUMI projesini tek komutla ayağa kaldırabileceği,
tekrarlanabilir ve platformdan bağımsız yerel geliştirme ortamını
tanımlamak.

## Docker Mimarisi

Servisler:

-   Frontend
-   Backend API
-   PostgreSQL
-   Redis
-   AI Worker
-   Background Worker
-   Monitoring

## Docker Compose

Temel özellikler:

-   Tek komutla başlatma
-   Ortam değişkeni desteği
-   Servis bağımlılıkları
-   Health Check
-   Otomatik yeniden başlatma

## Ağ Yapısı

-   İzole Docker Network
-   Servis adıyla haberleşme
-   Dış erişim yalnızca gerekli portlar

## Volume Stratejisi

-   Veritabanı kalıcı verileri
-   Log dosyaları
-   Yüklenen medya
-   Geliştirme önbellekleri

## Yapılandırma

-   .env dosyaları
-   Ortama özel ayarlar
-   Secret referansları
-   Feature Flag desteği

## Geliştirici Deneyimi

-   Hot Reload
-   Debug desteği
-   Kod formatlama
-   Test komutları
-   Seed veri oluşturma

## Test Senaryoları

-   İlk kurulum
-   Servis yeniden başlatma
-   Volume kurtarma
-   Ağ bağlantısı doğrulaması
-   Ortam değişkeni doğrulaması

## Çıktılar

-   Docker Compose Specification
-   Local Development Guide
-   Network Topology
-   Volume Strategy
-   Developer Setup Checklist
