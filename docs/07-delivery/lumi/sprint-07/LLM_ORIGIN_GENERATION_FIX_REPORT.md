# LLM Origin Generation Fix Report

## Kök Neden

Karakter Başlangıç Akışı (Character Bootstrap Flow) AI/OpenRouter entegrasyonu iki temel nedenden dolayı çalışmıyordu:

1. **Eksik task varsayılanı**: Kullanıcı OpenRouter API key'ini kaydettiğinde `character_origin_generation` task ayarı otomatik oluşturulmuyordu. `origin-generator.ts` içindeki koşul (`llmSettings?.enabled && llmSettings.modelId && providerSettings?.encryptedApiKey`) sağlanamadığı için her zaman deterministic fallback havuzu kullanılıyordu.

2. **Sessiz fallback**: LLM yapılandırılmış olsa bile OpenRouter çağrısı başarısız olduğunda (decrypt hatası, network hatası, validation hatası) hata sessizce yutuluyor ve deterministic fallback önerileri "AI önerisi" gibi sunuluyordu. UI tarafında `source`, `modelId`, `fallbackReason` alanları hiç kullanılmıyordu.

## Değişen Dosyalar

### `packages/profiles/src/application/llm-settings/llm-settings.service.ts`
- `ensureDefaultLlmTaskSettings(userId, householdId)` fonksiyonu eklendi
- `upsertOpenRouterKey` sonunda otomatik olarak çağrılıyor
- Varsayılan task: `character_origin_generation`, model: `aion-labs/aion-3.0-mini`, enabled: true, reasoningLevel: `medium`, temperature: 0.85, maxTokens: 1800

### `packages/profiles/src/application/llm-settings/index.ts`
- `ensureDefaultLlmTaskSettings` export edildi
- `LlmGenerationError` export edildi

### `packages/profiles/src/application/llm-settings/origin-generator.ts`
- `LlmGenerationError` sınıfı eklendi
- LLM yapılandırılmışken hata oluşursa (decrypt hatası, API hatası, validation hatası) sessiz fallback yerine `LlmGenerationError` fırlatılıyor
- LLM yapılandırılmamışsa hala `source: "fallback"` + `fallbackReason` ile deterministic fallback dönülüyor

### `apps/web/app/api/character-bootstrap/generate-packages/route.ts`
- `LlmGenerationError` import edildi
- `LlmGenerationError` yakalandığında 200 status ile `source: "llm_error"`, `fallbackReason`, boş `packages` dönülüyor

### `apps/web/app/app/character-onboarding/character-onboarding-client-page.tsx`
- `genSource` state'i eklendi (`source`, `modelId`, `fallbackReason`)
- `generatePackages` cevabından source metadata'sı state'e alınıyor
- LLM başarılı: "AI önerileri: {modelId}" bilgisi gösteriliyor
- LLM hatası: kırmızı uyarı kutusu gösteriliyor
- Fallback: gri uyarı kutusu + ayarlar sayfasına link gösteriliyor

### `packages/profiles/tests/domain/origin-generator.test.ts` (yeni)
- `callOpenRouter` mock'u ile 10 test
- LLM başarılı: benzersiz paket isimleri (`Ay Işığı Kütüphanecisi`, `Bulut Tamircisi`, `Zaman Bahçecisi`) dönüyor
- LLM yapılandırılmamış: fallback + `fallbackReason` dolu
- LLM yapılandırılmış ama hata: `LlmGenerationError` fırlatılıyor
- Fallback havuzundaki aynı öneriler testten geçemiyor

## AI/Fallback Davranış Politikası

| Durum | Davranış | source | UI Gösterimi |
|-------|----------|--------|--------------|
| LLM yapılandırılmış + API başarılı | LLM'den paketler | `llm` | "AI önerileri: {modelId}" |
| LLM yapılandırılmamış (key/task yok) | Deterministic fallback | `fallback` | "AI önerisi kullanılamadı, geçici öneriler gösteriliyor: {reason}" + ayarlar linki |
| LLM yapılandırılmış ama hata | `LlmGenerationError` fırlat, route yakala | `llm_error` | "AI önerisi başarısız oldu: {reason}" |
| Key decrypt hatası | `LlmGenerationError` fırlat | `llm_error` | "AI önerisi başarısız oldu: API key decryption failed" |
| LLM validation hatası | `LlmGenerationError` fırlat | `llm_error` | "AI önerisi başarısız oldu: LLM output validation failed: ..." |

## Çalıştırılan Test Komutları ve Sonuçları

```sh
pnpm --filter @lumi/profiles typecheck
# Pass: çıktı yok (başarılı)

pnpm --filter @lumi/profiles test
# 10 test file, 207 passed, 59 skipped (integration tests DB yok)
# Yeni: origin-generator.test.ts - 10/10 passed

pnpm --filter @lumi/web typecheck
# Pass: çıktı yok (başarılı)

pnpm --filter @lumi/web lint
# Pass: çıktı yok (başarılı)

pnpm --filter @lumi/web test
# 12 test file, 85 passed
```

`pnpm --filter @lumi/web test:e2e` çalıştırılmadı (Playwright e2e testleri için running server + browser gerekli).

## Kalan Riskler

1. **E2E test örtüsü**: OpenRouter key kaydetme → task default oluşma → AI paketleri gösterme flow'u e2e testi yok. Manuel doğrulama gerekiyor.
2. **`ensureDefaultLlmTaskSettings` sadece `upsertOpenRouterKey` sonrası çağrılıyor**: Eğer kullanıcı key'i manuel DB sorgusu ile kaydederse task oluşmaz. `generateOriginPackages` öncesi de çağrılması kabul edilebilir (opsiyonel).
3. **Deterministic fallback hala deterministic**: Aynı input aynı önerileri döndürür. LLM olmayan ortamlarda test için yeterli, prod'da AI beklentisini karşılamaz.
4. **`LlmGenerationError` route'da 200 dönüyor**: HTTP semantiği olarak hata 500 olmalı, ancak UI'ın yapısal hatayı ayırt edebilmesi için 200 + `source: "llm_error"` tercih edildi.

Codex review bekliyor.
