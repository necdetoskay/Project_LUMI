# Story Generation Pipeline Flow

## 1. Request intake

`story.generation.requested` outbox event'i generation worker tarafından alınır.

## 2. Context builder

Yalnızca ilgili veriler yüklenir:

- Current world state
- Child interests and preferences
- Selected participants
- Character traits
- Character emotions
- Active conditions
- Current location
- Selected inventory item
- Relevant memories
- Recent simulation events

## 3. Prompt rendering

Context, deterministic JSON payload olarak prompt'a dönüştürülür.

## 4. Model fallback

Model zinciri priority sırasıyla denenir.

Her aday:

- Provider code
- Model code
- Max attempts
- Enabled state
- Priority

alanlarını taşır.

## 5. Structured output

Provider'dan JSON schema uyumlu çıktı istenir.

## 6. Validation

- Zod schema validation
- Start node validation
- Ending node validation
- Choice target validation
- Reachability validation

## 7. Safety review

Çocuklara uygun olmayan içerik publish edilmez.

## 8. Persistence

Tek transaction içinde:

- Story
- Story version
- Nodes
- Choices
- Questions
- Safety review
- Audit
- Outbox

oluşturulur.

## 9. Reconciliation

Token usage, latency ve gerçek maliyet attempt seviyesinde kaydedilir.
