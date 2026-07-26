# Event Bus & Dispatch

## Başlangıç Yaklaşımı
Modüler monolith içinde in-process dispatcher kullanılacaktır.

```mermaid
flowchart LR
  UC[Use Case] --> AGG[Aggregate]
  AGG --> DE[Domain Events]
  DE --> DISP[Dispatcher]
  DISP --> H1[Handler A]
  DISP --> H2[Handler B]
  DISP --> OUTBOX[Outbox Writer]
```

## Handler Kuralları
- Handler tek sorumluluk taşır.
- Handler doğrudan HTTP yanıtı üretmez.
- Handler başarısız olduğunda hata kayda alınır.
- Kritik yan etkiler outbox üzerinden yürütülür.
- Aynı event tekrar geldiğinde sonuç bozulmamalıdır.

## Senkron ve Asenkron Ayrımı
Senkron:
- Aynı transaction içindeki invariant kontrolleri.

Asenkron:
- Bildirim
- Görsel/TTS üretimi
- Analitik
- Uzun süreli dünya simülasyonu
