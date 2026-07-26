# Project LUMI -- Paket 23.1

# REST API Design Standards & OpenAPI Specification

## Amaç

LUMI platformundaki tüm REST API'lerin tutarlı, sürdürülebilir, güvenli
ve iyi dokümante edilmiş bir standartta geliştirilmesini sağlamak.

## REST İlkeleri

-   Kaynak (resource) odaklı tasarım
-   Tutarlı URL yapısı
-   HTTP metodlarının doğru kullanımı
-   Stateless istekler
-   JSON tabanlı veri alışverişi

## Endpoint Standartları

Örnek yapı:

-   /api/v1/stories
-   /api/v1/characters
-   /api/v1/worlds
-   /api/v1/users

## İstek / Yanıt Modeli

Standart alanlar:

-   data
-   meta
-   errors
-   pagination
-   requestId

## HTTP Durum Kodları

-   200 OK
-   201 Created
-   204 No Content
-   400 Bad Request
-   401 Unauthorized
-   403 Forbidden
-   404 Not Found
-   409 Conflict
-   422 Unprocessable Entity
-   500 Internal Server Error

## Hata Modeli

Her hata yanıtı:

-   Kod
-   Mesaj
-   Ayrıntı
-   requestId
-   Zaman damgası

## OpenAPI

Dokümantasyon:

-   Endpoint açıklamaları
-   Şema tanımları
-   Kimlik doğrulama
-   Örnek istekler
-   Örnek yanıtlar

## Versiyonlama

-   URI tabanlı sürümleme
-   Deprecation politikası
-   Geriye dönük uyumluluk

## Test Senaryoları

-   Şema doğrulama
-   Hata modeli doğrulama
-   OpenAPI doğruluğu
-   Sürüm uyumluluğu

## Çıktılar

-   REST API Standard
-   OpenAPI Specification
-   Error Model Guide
-   API Style Guide
-   API Validation Checklist
