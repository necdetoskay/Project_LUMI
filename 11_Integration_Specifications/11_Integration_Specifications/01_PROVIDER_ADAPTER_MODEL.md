# Provider Adapter Model

```ts
interface TextGenerationProvider {
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>
  healthCheck(): Promise<ProviderHealth>
}
```

## İlkeler
- Uygulama provider SDK'sına doğrudan bağımlı olmaz.
- Timeout, retry ve circuit breaker adapter katmanında uygulanır.
- Provider response normalize edilir.
- Maliyet ve token kullanımı ortak formata çevrilir.
