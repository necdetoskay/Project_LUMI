# Saga & Workflow

## Kullanım Alanları
- Hikâye üretimi → görsel üretimi → TTS → yayınlama
- Ebeveyn onayı gerektiren içerik
- Provider fallback zinciri
- Uzun süreli world simulation işlemleri

## Process Manager State
- workflow_id
- workflow_type
- status
- current_step
- retry_count
- context_json
- created_at
- updated_at

## Örnek Akış

```mermaid
stateDiagram-v2
  [*] --> Requested
  Requested --> StoryGenerated
  StoryGenerated --> ImagesGenerated
  ImagesGenerated --> AudioGenerated
  AudioGenerated --> Published
  StoryGenerated --> Failed
  ImagesGenerated --> Failed
  AudioGenerated --> Failed
  Failed --> Retrying
  Retrying --> StoryGenerated
```

## Kural
Saga yalnızca çok adımlı ve geri kazanım gerektiren süreçlerde kullanılır; basit use case'lerde kullanılmaz.
