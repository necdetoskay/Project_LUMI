# Event Replay & Recovery

## Replay Kullanım Alanları
- Projection yeniden oluşturma
- Analitik tablosu yenileme
- Hatalı consumer sonrası telafi
- Test ortamında deterministik senaryo

## Güvenlik
- Replay production'da yetkili operasyon gerektirir.
- External side effect handler'ları replay modunda devre dışı bırakılır.
- Her replay bir operation id ile loglanır.
- Başlangıç ve bitiş offset'i kaydedilir.

## Not
LUMI event sourcing kullanmayacaktır. Replay yalnızca saklanan integration event'ler için kontrollü destek olacaktır.
