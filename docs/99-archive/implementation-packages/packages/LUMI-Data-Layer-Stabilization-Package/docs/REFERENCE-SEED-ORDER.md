# Reference Seed Order

Reference seed sırası:

```text
1. identity roles
2. identity permissions
3. world biomes
4. character traits
5. character emotions
6. relationship dimensions
7. inventory item definitions
8. AI provider/model registry
9. feature flags
```

World'e bağlı seed'ler:

```text
10. default simulation policy
```

## Seed kuralları

- Seed işlemleri idempotent olmalıdır.
- Reference data silinmemelidir.
- Code alanları kalıcı kimlik olarak kullanılmalıdır.
- İsim değişiklikleri code değerini değiştirmemelidir.
