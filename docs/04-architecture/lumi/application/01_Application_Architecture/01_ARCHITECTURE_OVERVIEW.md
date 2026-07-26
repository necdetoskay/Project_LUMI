# Application Architecture Overview

## 1. Mimari Hedef
LUMI; hikâye üretimi, yaşayan dünya simülasyonu, çocuk profilleri, karakterler, envanter, karar geçmişi ve medya üretimi gibi çok sayıda alt sistemi içerir. Mimari; bu sistemleri tek bir büyük kod yığınına dönüştürmeden yönetebilmelidir.

## 2. Önerilen Yaklaşım: Modüler Monolith
İlk aşamada mikroservis yerine modüler monolith tercih edilir.

### Neden?
- Dağıtık transaction karmaşası oluşmaz.
- Geliştirme ve debug süreçleri daha hızlıdır.
- Tek deployment ile operasyon yükü düşer.
- Modül sınırları korunursa ileride servis ayrıştırması mümkündür.

## 3. Katmanlar
### Domain Layer
Entity, value object, aggregate, domain rule ve domain event’leri içerir.

### Application Layer
Use case, command/query handler, orchestration ve transaction sınırlarını yönetir.

### Infrastructure Layer
PostgreSQL, cache, queue, dosya depolama, harici AI sağlayıcıları ve observability adaptörlerini içerir.

### Interface Layer
REST API, SSE/WebSocket, admin arayüzü ve background worker giriş noktalarını içerir.

## 4. Önerilen Ana Modüller
- Identity & Access
- Child Profiles
- Characters
- Worlds & Regions
- Story Sessions
- Narrative Generation
- Simulation
- NPC & Relationships
- Inventory & Items
- Education & Reflection
- Media Generation
- Billing & Cost Control
- Notifications
- Audit & Observability
