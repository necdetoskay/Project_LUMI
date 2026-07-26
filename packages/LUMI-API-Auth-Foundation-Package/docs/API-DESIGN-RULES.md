# API Design Rules

## Versioning

Tüm public endpointler `/api/v1` altında olmalıdır.

## Response envelope

Başarılı cevap:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Hata cevabı:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek doğrulanamadı.",
    "details": []
  },
  "meta": {
    "requestId": "..."
  }
}
```

## Idempotency

Create endpointleri `Idempotency-Key` header'ını desteklemelidir.

## Authorization

- Authentication route seviyesinde doğrulanır.
- Household ownership application service içinde tekrar doğrulanır.
- Child ve world erişimi yalnızca parent household membership üzerinden verilir.
- Admin rolü ayrı policy ile ele alınır.

## Pagination

Liste endpointleri cursor-based pagination kullanmalıdır.

## Dates

Tüm tarih/saat değerleri ISO 8601 UTC olarak döndürülür.
