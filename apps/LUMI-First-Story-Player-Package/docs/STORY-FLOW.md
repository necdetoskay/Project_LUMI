# First Story Flow

## 1. Story creation

Ebeveyn veya çocuk için uygun ayarları yapan ebeveyn:

- Hikâye türünü seçer
- Başlık fikri ekler
- Tema belirtir
- Katılımcıları seçer
- İsteğe bağlı envanter eşyası seçer
- Görsel ve ses seçeneklerini belirler

## 2. Cost preview

Üretim başlamadan önce tahmini maliyet Türk lirası olarak gösterilir.

Maliyet bileşenleri:

- Metin
- Görsel
- Seslendirme

## 3. Generation request

İstek `ai.generation_requests` tablosuna kaydedilir ve outbox event üretilir.

## 4. Story player

- Narrative node gösterilir
- Ambience etiketleri gösterilir
- Choice card'lar gösterilir
- Seçim hint ve consequence preview içerebilir

## 5. Decision

Seçim append-only decision history olarak kaydedilir.

## 6. Completion

Ending node sonrası story session tamamlanır.

## 7. Education

Yaşa uygun comprehension ve reflection soruları gösterilir.

## 8. History

Tamamlanan hikâye tekrar okunabilir.
