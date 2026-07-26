# Media Cost Rules

## Görsel maliyeti

Megapiksel bazlı modeller için:

```text
megapixel = width × height / 1,000,000
estimated TRY = megapixel × USD/MP × USD/TRY
```

Örnek kur politikası:

- Kur sabit kodlanmaz.
- Cost preview sırasında aktif fiyatlandırma snapshot'ı kullanılır.
- Gerçek maliyet provider kullanım verisinden mutabık hale getirilir.

## TTS maliyeti

Karakter bazlı sağlayıcılar için:

```text
estimated TRY =
characters / 1,000,000
× USD per million characters
× USD/TRY
```

## Ebeveyn görünürlüğü

Üretim öncesinde:

- Tahmini görsel maliyeti
- Tahmini ses maliyeti
- Toplam tahmini maliyet

Türk lirası olarak gösterilir.
