# Pagination, Filtering ve Versioning

Cursor pagination önerilir.

Örnek:
`GET /api/v1/world-events?world_id=...&status=active&limit=20&cursor=...`

Response:
- data
- next_cursor
- has_more

Breaking değişiklikler `/api/v2` gerektirir. Ek alanlar backward-compatible kabul edilir.
