# Logging Standardı

JSON structured log kullanılmalıdır.

Zorunlu alanlar:
- timestamp
- level
- service
- module
- event_name
- correlation_id
- duration_ms
- result

Prompt, çocuk verisi ve hassas içerik ham olarak loglanmamalıdır.
