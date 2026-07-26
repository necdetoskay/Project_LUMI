# Klasör ve Kod Organizasyonu

```text
src/
  modules/
    story-session/
      domain/
      application/
      infrastructure/
      interface/
    world-simulation/
    characters/
    inventory/
    media-generation/
  shared/
    domain/
    application/
    infrastructure/
  workers/
  bootstrap/
```

## Kurallar
- Shared klasörü kontrolsüz ortak kod deposuna dönüşmemelidir.
- Her modül kendi repository interface’ini tanımlar.
- Infrastructure implementasyonu dependency injection ile bağlanır.
- Circular dependency yasaktır.
