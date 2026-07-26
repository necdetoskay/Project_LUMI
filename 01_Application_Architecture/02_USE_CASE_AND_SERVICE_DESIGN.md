# Use Case ve Service Tasarımı

## 1. Use Case İlkesi
Her kullanıcı veya sistem aksiyonu tek bir açık use case ile temsil edilir.

Örnekler:
- CreateChildProfile
- StartStorySession
- SubmitStoryChoice
- GenerateNextStorySegment
- AdvanceWorldSimulation
- AddItemToInventory
- RequestStoryImage

## 2. Application Service Sorumlulukları
- Girdi doğrulama
- Yetki kontrolü
- Repository çağrıları
- Transaction başlatma
- Domain davranışını tetikleme
- Event yayınlama
- Sonuç DTO’su üretme

Application Service doğrudan iş kuralı üretmez; kurallar domain katmanında kalır.

## 3. Domain Service Ne Zaman Kullanılır?
Bir davranış tek bir entity’ye doğal biçimde ait değilse domain service kullanılır.

Örnekler:
- StoryContinuityEvaluator
- NPCInfluenceCalculator
- WorldTimeImpactResolver
- ChoiceConsequenceResolver

## 4. DTO Kuralları
- API DTO ile domain modeli ayrılmalıdır.
- Entity doğrudan API’ye döndürülmemelidir.
- Versionable response contract kullanılmalıdır.
