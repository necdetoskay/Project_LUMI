# IMPLEMENTATION_STANDARD.md

Version: 1.0.0
Status: Approved
Classification: Standard

# Implementation Standard

## Purpose

Bu standart, Task Specification onaylandıktan sonra geliştirme sürecinin
nasıl yürütüleceğini tanımlar.

## Preconditions

Geliştirmeye başlamadan önce aşağıdaki koşullar sağlanmalıdır:

- Onaylı Task Specification
- Definition of Ready tamamlandı
- Mimari onaylar alındı
- Gerekli bağımlılıklar belirlendi

## Implementation Rules

1. Yalnızca görev kapsamındaki değişiklikler yapılmalıdır.
2. Gereksiz refactoring yapılmamalıdır.
3. Kod proje standartlarına uygun olmalıdır.
4. Yeni kod test edilebilir olmalıdır.
5. Dokümantasyon gerektiğinde güncellenmelidir.

## Coding Workflow

1. Task okunur.
2. Uygulama planı hazırlanır.
3. Kod geliştirilir.
4. Self review yapılır.
5. Testler çalıştırılır.
6. Dokümantasyon güncellenir.
7. Review'a gönderilir.

## Error Handling

- Hatalar anlamlı mesajlarla raporlanmalıdır.
- Beklenmeyen durumlar loglanmalıdır.
- Sessiz hata yutulmamalıdır.

## Performance

- Gereksiz sorgulardan kaçınılmalıdır.
- Büyük işlemler optimize edilmelidir.
- Performans etkisi değerlendirilmelidir.

## Security

- Gizli bilgiler koda gömülmez.
- Girdi doğrulaması zorunludur.
- Yetkilendirme kuralları korunmalıdır.

## Completion Checklist

- [ ] Kod tamamlandı
- [ ] Kod derleniyor
- [ ] Testler başarılı
- [ ] Dokümantasyon güncellendi
- [ ] Review hazır

END OF DOCUMENT
