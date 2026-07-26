# Project LUMI -- Paket 16.3

## Story Outcome & World State Commit System

### Amaç

Hikâye tamamlandıktan sonra oluşan tüm etkilerin kontrollü,
doğrulanabilir ve geri alınabilir şekilde dünya durumuna işlenmesini
sağlamak.

## Kapsam

-   Story Outcome Manifest üretimi
-   World State Diff hesaplama
-   Commit Pipeline
-   Validation katmanı
-   Conflict Resolution
-   Rollback desteği
-   Event Propagation
-   Audit Log

## İş Akışı

1.  Hikâye tamamlanır.
2.  Outcome Manifest oluşturulur.
3.  Dünya Snapshot alınır.
4.  Değişiklikler hesaplanır.
5.  Validation çalışır.
6.  Conflict kontrolü yapılır.
7.  Commit uygulanır.
8.  Event'ler yayınlanır.
9.  Yeni Snapshot oluşturulur.

## Validation Kuralları

-   Geçersiz NPC referansı bulunamaz.
-   Silinen envanter tekrar eklenemez.
-   Negatif kaynak oluşamaz.
-   Aynı olay ikinci kez uygulanamaz (idempotent).

## Rollback

Her commit benzersiz Commit ID ile saklanır. Rollback yalnızca
doğrulanmış snapshot üzerinden yapılır.

## Audit

Her commit için: - Commit ID - Story ID - Character ID - Timestamp -
Changed Entities - Validation Result - Duration

## Test Senaryoları

-   Tek NPC değişimi
-   Çoklu NPC güncellemesi
-   Envanter değişimi
-   Görev tamamlanması
-   Çakışan iki hikâye
-   Rollback testi
-   Snapshot karşılaştırması

## Teslim Çıktıları

-   Outcome Manifest
-   Validation Report
-   Commit Log
-   Updated World Snapshot
