# Command, Query ve CQRS Stratejisi

## Karar
LUMI’de tam kapsamlı CQRS başlangıçta kullanılmayacaktır. Ancak command ve query sorumlulukları kod seviyesinde ayrılacaktır.

## Command
Sistemin durumunu değiştirir.
- StartStorySession
- RecordChoice
- UpdateCharacterState
- AdvanceSimulation

## Query
Sadece okuma yapar.
- GetWorldOverview
- GetActiveStorySession
- ListCharacterInventory
- GetWorldNews

## Neden Hafif CQRS?
- Kod okunabilirliği artar.
- İleride yoğun okuma modelleri ayrıştırılabilir.
- Gereksiz event sourcing karmaşası oluşmaz.

## Event Sourcing Kararı
İlk sürümde event sourcing kullanılmayacaktır. Kritik değişiklikler audit log ve domain event kayıtlarıyla izlenecektir.
