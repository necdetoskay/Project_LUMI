# Distributed Tracing

Trace zinciri:
API request → use case → DB → outbox → worker → AI provider → storage

Harici sağlayıcı çağrılarında model, provider ve latency metadata olarak eklenir; prompt içeriği eklenmez.
