# Event Schema Standard

## Zarf Yapısı

```json
{
  "eventId": "uuid",
  "eventType": "StoryChoiceSelected",
  "eventVersion": 1,
  "occurredAt": "2026-07-25T12:00:00Z",
  "aggregateType": "StorySession",
  "aggregateId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "tenantId": "uuid-or-null",
  "actor": {
    "type": "child_profile",
    "id": "uuid"
  },
  "payload": {}
}
```

## Kurallar
- `eventId` global benzersizdir.
- `occurredAt` UTC tutulur.
- `correlationId` bir iş akışını uçtan uca izler.
- `causationId` event'i doğuran komut veya event'i gösterir.
- Payload yalnızca gerekli alanları içerir.
- Hassas çocuk verileri event içine gömülmez.
- Event şeması immutable kabul edilir.
