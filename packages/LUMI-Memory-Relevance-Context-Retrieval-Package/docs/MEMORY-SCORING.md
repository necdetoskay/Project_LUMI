# Memory Scoring

Final relevance skoru aşağıdaki boyutlardan oluşur:

```text
semantic similarity      30%
subject relevance        20%
recency                   15%
importance                15%
emotional salience        10%
consequence weight        10%
```

Bu oranlar başlangıç varsayılanıdır ve deneylerle değiştirilebilir.

## Recency

Recency exponential half-life yaklaşımı kullanır.

Örnek:

```text
halfLifeDays = 30
```

30 günlük hafıza güncellik skorunun yaklaşık yarısını korur.

## Emotional salience

Aşağıdaki sinyaller kullanılır:

- Emotion intensity
- Relationship impact
- Surprise
- Persistence

## Consequence weight

Aşağıdaki sinyaller kullanılır:

- World state impact
- Character state impact
- Relationship impact
- Future story potential
