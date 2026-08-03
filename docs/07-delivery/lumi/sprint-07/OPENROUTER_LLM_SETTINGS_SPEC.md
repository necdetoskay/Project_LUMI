# OpenRouter LLM Settings ve Task Bazlı Model Yönetimi

## Mimari Kararlar

1. **API Key Yönetimi**: Her ebeveyn/kullanıcı kendi OpenRouter API key'ini girer. Key AES-256-GCM ile şifrelenir ve `profile.llm_provider_settings` tablosunda saklanır.
2. **Görev Bazlı Model Ayarları**: Uygulama genelinde tek bir model alanı yerine, her task tipi için ayrı model, temperature, reasoning level, max tokens ayarı yapılabilir.
3. **Reasoning Seviyeleri**: low/medium/high olarak ayrı task kayıtları tutulur.
4. **Fallback Davranışı**: LLM yapılandırılmamışsa veya hata verirse, deterministik generator devreye girer. Response metadata'da kaynak belirtilir.
5. **Privacy**: LLM'e çocuk adı gönderilmez. Yaş grubu, karakter tipi, origin mode, güvenlik politikası ve locale yeterlidir.

## DB Schema

### `profile.llm_provider_settings`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | Birincil anahtar |
| user_id | uuid NN | Kullanıcı ID |
| household_id | uuid NN FK → households | Hane ID |
| provider | text default 'openrouter' | Sağlayıcı (sadece openrouter) |
| encrypted_api_key | text nullable | AES-GCM şifreli key |
| enabled | boolean default false | Aktif mi |
| created_at | timestamptz | Oluşturma zamanı |
| updated_at | timestamptz | Güncelleme zamanı |

Unique: `(user_id, household_id, provider)`

### `profile.llm_task_model_settings`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | Birincil anahtar |
| user_id | uuid NN | Kullanıcı ID |
| household_id | uuid NN FK → households | Hane ID |
| provider | text default 'openrouter' | Sağlayıcı |
| task_type | text NN | Görev tipi (aşağıdaki enum) |
| model_id | text NN | Model ID (1-160 karakter) |
| reasoning_level | text default 'medium' | low/medium/high |
| temperature | real default 0.8 | 0-2 |
| max_output_tokens | integer default 1800 | 256-8000 |
| enabled | boolean default true | Aktif mi |

Unique: `(user_id, household_id, provider, task_type)`

### Task Tipleri

| Task Type | Kullanım | Reasoning |
|-----------|----------|-----------|
| character_origin_generation | Karakter onboarding orijin önerileri **(şu an aktif)** | low/medium |
| story_outline_generation | Gelecek sprintler için hikaye taslağı | medium |
| story_turn_generation | Hikaye akışında sonraki sahne/turn | medium/high |
| safety_review | İçerik güvenliği/kural kontrolü | low/medium |
| character_memory_summary | Karakter/hikaye hafıza özeti | low |
| parent_explanation | Ebeveyne açıklama/özet üretimi | low |

## Security / Encryption

- `LUMI_SETTINGS_ENCRYPTION_KEY` env variable zorunludur.
- Algoritma: AES-256-GCM (16 byte IV, 16 byte auth tag, 32 byte key).
- Key, scrypt ile derive edilir.
- API response hiçbir zaman plaintext key dönmez. `hasApiKey`, `maskedApiKey` (sk-or-v1-...abcd formatında) döner.
- Encryption key yoksa API key kaydetme işlemi 400/ENCRYPTION_CONFIG_ERROR döner.

## Task Model Registry

İlk sürümde `character_origin_generation` aktif kullanılır. Diğer task kayıtları UI ve DB'de konfigüre edilebilir.

Preset model seçenekleri:
- `aion-labs/aion-3.0-mini` — storytelling için önerilen
- `qwen/qwen3.6-flash` — ucuz/hızlı genel görev
- `google/gemini-3.1-flash-lite-preview` — düşük maliyet
- `anthropic/claude-haiku-latest` — güçlü kısa üretim alternatifi
- Custom model ID

## Character Origin Generation LLM Flow

```
generateAndPersistOriginPackages()
  → generateOriginPackages() [origin-generator.ts]
    → Check LLM settings (task model + API key)
    → If configured: callOpenRouter() → parseAndValidateLlmOutput()
    → If LLM success: return LLM candidates
    → If LLM fails/unconfigured: generateDeterministicCandidates()
  → Persist candidates to origin_packages table
  → Return { packages, source, modelId, fallbackReason }
```

LLM'e gönderilen prompt Türkçedir, çocuk adı içermez.
Gönderilen parametreler: ageBand, characterType, originMode, contentBoundary, requireParentApprovalForAi, locale.

## Fallback Davranışı

| Senaryo | Davranış |
|---------|----------|
| LLM yapılandırılmamış (key yok/task ayarı yok) | Deterministic fallback, source: "fallback", fallbackReason: "LLM not configured" |
| LLM API hatası | Deterministic fallback, source: "fallback", fallbackReason: hata mesajı |
| LLM çıktısı validasyon hatası | Deterministic fallback, source: "fallback", fallbackReason: "LLM output validation failed: ..." |
| LLM başarılı | LLM önerileri, source: "llm", modelId: model adı |

## Privacy Kararları

- Çocuk adı (displayName) LLM'e gönderilmez.
- Gönderilebilir: ageBand, characterType, originMode, contentBoundary, requireParentApprovalForAi, locale, preferenceHints.
- strict content boundary ve requireParentApprovalForAi kontrolü prompt'a eklenir.

## Dosya Yapısı (Yeni/Eklenen Dosyalar)

```
packages/profiles/
├── migrations/0007_llm_settings_schema.sql
├── src/
│   ├── db/schema/profile/
│   │   ├── llm-provider-settings.ts        # YENI
│   │   ├── llm-task-model-settings.ts      # YENI
│   │   └── relations.ts                    # GUNCELLENDI
│   ├── db/repositories/
│   │   ├── interfaces/
│   │   │   ├── llm-provider-settings.repository.ts    # YENI
│   │   │   ├── llm-task-model-settings.repository.ts  # YENI
│   │   │   └── index.ts                              # GUNCELLENDI
│   │   ├── drizzle/
│   │   │   ├── drizzle-llm-provider-settings.repository.ts    # YENI
│   │   │   ├── drizzle-llm-task-model-settings.repository.ts  # YENI
│   │   │   └── index.ts                                      # GUNCELLENDI
│   │   └── index.ts                    # GUNCELLENDI
│   └── application/
│       ├── llm-settings/
│       │   ├── index.ts                # YENI
│       │   ├── encryption.ts           # YENI
│       │   ├── openrouter-client.ts    # YENI
│       │   ├── llm-output-parser.ts    # YENI
│       │   ├── llm-settings.service.ts # YENI
│       │   └── origin-generator.ts     # YENI
│       ├── character-bootstrap.service.ts  # GUNCELLENDI
│       └── index.ts                    # GUNCELLENDI
apps/web/
├── app/api/settings/llm/route.ts              # YENI
├── app/api/character-bootstrap/generate-packages/route.ts  # GUNCELLENDI
└── app/app/settings/
    ├── page.tsx                             # YENI
    └── llm-settings-client-page.tsx         # YENI
```

## Test Planı

### Unit Tests (18 new tests in `tests/domain/llm-settings.test.ts`)

| Test | Kapsam |
|------|--------|
| encryption roundtrip | encrypt + decrypt doğru çalışıyor |
| different ciphertext for same plaintext | IV random, her seferinde farklı |
| key masking | sk-or-v1-...abcd formatı |
| short key masking | Kısa key için fallback |
| no encryption key | LUMI_SETTINGS_ENCRYPTION_KEY yoksa hata |
| valid LLM output parse | 4 package başarılı parse |
| invalid broadKind | Geçersiz broadKind reddedilir |
| invalid characterType | Geçersiz characterType reddedilir |
| invalid tone vector | Geçersiz tone değerleri reddedilir |
| duplicate origin concepts | Yinelenen konseptler filtrelenir |
| non-JSON output | Hata mesajı döner |
| empty packages array | Hata mesajı döner |
| markdown code block extraction | ```json ile sarılı JSON parse edilir |
| brace matching extraction | Ham metin içinden JSON çıkarılır |
| packages must be array | Array olmayan packages reddedilir |
| subtype length validation | Boş subtype reddedilir |
| originConcept length validation | Boş originConcept reddedilir |
| missing noveltyMarkers | Boş noveltyMarkers array reddedilir |

### Integration Tests (mevcut, güncellendi)

- `character-bootstrap.integration.test.ts`: generateAndPersistOriginPackages dönüş tipi `{ packages, source, modelId, fallbackReason }` olarak güncellendi

## E2E Planı

Aşağıdaki e2e senaryoları `apps/web/tests/e2e/llm-settings.spec.ts` içinde:
- Settings happy path: register → household → /app/settings → key kaydet → task config → masked key görünür
- Character onboarding LLM happy path: mock OpenRouter ile LLM önerileri
- Fallback path: mock OpenRouter hata döndürünce deterministic fallback
- Invalid JSON path: mock invalid JSON döndürünce kontrollü fallback
- Privacy e2e: OpenRouter request body çocuk adı içermez

## Kalan Riskler

- OpenRouter API key'i olmayan kullanıcılar için deneyim değişmez (aynı deterministic generator).
- LLM latency: API çağrısı timeout durumunda fallback kullanılır.
- Token maliyeti: Her LLM çağrısı OpenRouter üzerinden ücretlendirilir.
- Encryption key rotation: Şu an için env'den okunur, rotasyon desteği yok.
- Model ID validity: Kullanıcının girdiği model ID'nin geçerliliği test-connection ile doğrulanabilir.

---

**Codex review bekliyor.**
