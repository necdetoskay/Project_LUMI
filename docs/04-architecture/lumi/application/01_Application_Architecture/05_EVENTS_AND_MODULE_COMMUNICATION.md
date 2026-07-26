# Event Sistemi ve Modüller Arası İletişim

## Domain Event
Aynı uygulama içindeki iş anlamlı değişiklikleri temsil eder.

Örnekler:
- StoryChoiceRecorded
- CharacterTraitChanged
- ItemDiscovered
- WorldEventTriggered

## Integration Event
Queue veya worker üzerinden başka modül/servislerin tüketebileceği olaydır.

Örnekler:
- StoryImageRequested
- TTSGenerationRequested
- CostLimitExceeded

## İletişim Kuralları
- Bir modül başka modülün tablosuna doğrudan erişmez.
- Senkron ihtiyaçlarda application interface kullanılır.
- Asenkron ve gevşek bağlı ihtiyaçlarda event kullanılır.
- Event payload’ları versionlanır.
