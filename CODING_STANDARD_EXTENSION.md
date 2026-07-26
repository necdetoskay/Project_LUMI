# CODING_STANDARD_EXTENSION.md

Version: 1.0.0
Status: Approved
Classification: Standard

# Coding Standard Extension

## Purpose

Bu standart, proje genelindeki kodlama kurallarını ve AI Coding Agent'larının
uyması gereken ek yazılım geliştirme ilkelerini tanımlar.

## General Principles

- Okunabilirlik, kısalıktan önce gelir.
- Açık ve anlamlı isimlendirme kullanılmalıdır.
- Tek sorumluluk ilkesi gözetilmelidir.
- Tekrarlanan koddan kaçınılmalıdır.
- Gereksiz karmaşıklık oluşturulmamalıdır.

## Naming Standards

### Files
- kebab-case tercih edilir.

### Classes
- PascalCase

### Functions
- camelCase

### Constants
- UPPER_SNAKE_CASE

## Folder Structure

- Özellik bazlı (feature-based) organizasyon tercih edilir.
- Ortak bileşenler merkezi dizinlerde tutulur.
- Testler ilgili modüle yakın konumlandırılır.

## Code Quality Rules

- Magic number kullanılmamalıdır.
- Açıklayıcı yorumlar yalnızca gerekli olduğunda eklenmelidir.
- Ölü kod bırakılmamalıdır.
- Kullanılmayan importlar kaldırılmalıdır.

## AI Coding Agent Rules

AI Coding Agent:

- Mevcut proje stilini korur.
- Kapsam dışına çıkmaz.
- Gereksiz dosya oluşturmaz.
- Kod tekrarını azaltmaya çalışır.
- Büyük refactoring işlemlerini öneri olarak raporlar.

## Error Handling

- Beklenen hatalar uygun şekilde yönetilir.
- Sessiz hata yakalama yapılmaz.
- Hata mesajları geliştiriciye yardımcı olacak şekilde yazılır.

## Documentation

- Public API'ler dokümante edilmelidir.
- Karmaşık algoritmalar kısa teknik açıklamalar içermelidir.

## Completion Criteria

- Kod standartlara uygundur.
- Lint hatası yoktur.
- Kullanılmayan kod bulunmaz.
- Kod okunabilir ve sürdürülebilirdir.

END OF DOCUMENT
