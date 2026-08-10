# Project LUMI

**Project LUMI**, çocukların yalnızca bir hikâye okumadığı; karakterlerin, ilişkilerin,
hatıraların ve dünyanın zaman içinde yaşamaya devam ettiği yapay zekâ destekli bir
**Living Universe** platformudur.

LUMI'nin temel hedefi, her oturumu birbirinden bağımsız içerikler üretmek yerine,
çocuğun kararlarını hatırlayan ve bu kararların gelecekte anlamlı sonuçlar doğurduğu
güvenli, tutarlı ve uzun ömürlü bir dijital evren oluşturmaktır.

> **Durum:** Aktif geliştirme / pre-release. Mimari, domain modeli, yaşayan dünya
> motorları, kalıcı hafıza, hikâye sürekliliği, NPC davranışları, demo deneyimi ve
> görsel üretim altyapısı aşamalı sprintlerle geliştirilmektedir.

## LUMI'yi Farklı Kılan Nedir?

- **Yaşayan evren:** Dünya yalnızca kullanıcı ekrandayken var olan statik bir sahne
  değildir; kontrollü zaman ilerlemesi ve arka plan yaşamı desteklenir.
- **Kalıcı karakterler ve ilişkiler:** Karakterler, NPC'ler, ilişkiler ve önemli dünya
  durumları sonraki oturumlara taşınır.
- **Hafıza ve sonuç sürekliliği:** Çocuğun seçimleri yalnızca mevcut sahneyi değil,
  gelecekteki hikâyeleri ve dünya durumunu etkileyebilir.
- **Otonom NPC yaşamı:** NPC'ler niyetler, rutinler, duygular, hafıza ve etki
  vektörleri üzerinden hikâye fırsatları oluşturabilir.
- **AI sağlayıcı bağımsızlığı:** Model ve altyapı entegrasyonları mümkün olduğunca
  domain katmanından ayrılır; sağlayıcı değiştirmek ürün modelini değiştirmemelidir.
- **Yönetilen görsel varlıklar:** Karakter ve dünya görselleri üretilebilir, saklanabilir
  ve yeniden kullanılabilir. Yerel depolama ile S3 uyumlu nesne depolama desteklenir.
- **Test edilebilir AI davranışı:** ULTEF test sistemi; deterministik kontratlardan
  uzun dönem süreklilik, provider ve üretim senaryolarına kadar sistemi katmanlı
  olarak doğrular.

## Ürün İlkesi

LUMI'de çocuk dünyanın sahibi değil, **yaşayan bir dünyanın ziyaretçisidir**.
Dünya çocuğu bekleyen boş bir dekor olmak yerine kendi karakterleri, olayları,
hatıraları ve fırsatları olan bir yer olarak tasarlanır. Yapay zekâ bu dünyanın
kurallarının yerine geçmez; bu kurallar içinde hikâye ve deneyim üretir.

## Mimari Yaklaşım

Project LUMI bir `pnpm` + Turborepo monorepo olarak geliştirilir. Domain ve
application katmanları altyapı sağlayıcılarından ayrıştırılır; PostgreSQL kalıcı
verinin, Redis geçici/operasyonel işlerin temel altyapısını oluşturur.

| Alan | Yaklaşım |
| --- | --- |
| Web | Next.js + TypeScript |
| Monorepo | pnpm + Turborepo |
| Kalıcı veri | PostgreSQL |
| Operasyonel veri | Redis |
| AI | Provider-neutral port/adapter mimarisi |
| Görsel depolama | Local + S3-compatible object storage |
| Test | Vitest + ULTEF katmanlı doğrulama sistemi |
| Altyapı | Docker Compose + taşınabilir managed-service yaklaşımı |

## Depo Yapısı

| Yol | Sorumluluk |
| --- | --- |
| `apps/` | Çalıştırılabilir kullanıcı uygulamaları |
| `services/` | Bağımsız arka plan ve servis süreçleri |
| `packages/` | Domain, application ve yeniden kullanılabilir runtime paketleri |
| `tooling/` | ULTEF, TypeScript, ESLint ve geliştirme araçları |
| `infra/` | Yerel ve dağıtım altyapısı |
| `tests/` | Depo seviyesindeki çapraz sistem testleri |
| `docs/` | Kanonik ürün, domain, mimari ve teslimat dokümantasyonu |

## Hızlı Başlangıç

### Gereksinimler

- Node.js `>=22 <25`
- pnpm `11.7.0`
- Docker Desktop veya uyumlu Docker Engine

Bağımlılıkları yükleyin:

```bash
pnpm install
```

Yerel ortam dosyasını oluşturup PostgreSQL ve Redis'i başlatın:

```bash
cp .env.example .env
pnpm infra:up
pnpm infra:status
```

PowerShell:

```powershell
Copy-Item .env.example .env
pnpm infra:up
pnpm infra:status
```

Uygulamayı başlatın:

```bash
pnpm dev
```

Web uygulaması varsayılan olarak `http://localhost:3000`, sağlık kontrolü ise
`http://localhost:3000/api/health` adresinde çalışır.

Compose varsayılan olarak PostgreSQL'i `15432`, Redis'i `16379` host portundan
yayınlar. Docker context uzak bir sunucuyu gösteriyorsa portlar Docker host üzerinde
kullanılır. Çakışma durumunda `.env` içindeki ilgili port ve bağlantı değerleri
birlikte güncellenmelidir.

## Demo Ortamı

Demo verisini oluşturmak, durumunu görmek veya sıfırlamak için:

```bash
pnpm demo:seed
pnpm demo:status
pnpm demo:reset
```

Demo sistemi geliştirme ve kabul testleri içindir; üretim verisi yerine kullanılmaz.

## Kalite ve Test

Standart depo kontrolleri:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

ULTEF temel giriş noktaları:

```bash
pnpm ultef:selftest
pnpm ultef:integration
pnpm ultef:L0
pnpm ultef:L1
pnpm ultef:L2
pnpm ultef:L3
pnpm ultef:L9
```

ULTEF yalnızca klasik unit/integration testlerinin yerine geçmez. LUMI'nin hafıza,
süreklilik, dünya sonucu, provider davranışı ve uzun dönem senaryoları gibi AI
sistemlerine özgü özelliklerini ayrıca doğrulamak için kullanılır.

## Dokümantasyon

Dokümantasyonun başlangıç noktası [`docs/README.md`](docs/README.md) dosyasıdır.
Belge otoritesi, durumları ve sınıflandırma kuralları bu indeks üzerinden izlenir.

Temel belgeler:

- [Ürün vizyonu](docs/02-product/foundation/000-LUMI-Project-Vision.md)
- [Yaşayan Evren Manifestosu](docs/02-product/foundation/001-Living-Universe-Manifesto.md)
- [Temel tasarım ilkeleri](docs/02-product/foundation/002-Core-Design-Principles.md)
- [Domain tasarım indeksi](docs/03-domain-design/README.md)
- [Mimari dokümantasyon](docs/04-architecture/README.md)
- [Aktif teslimat planları](docs/07-delivery/README.md)

## Mühendislik Yönetişimi

LUMI, EOS-ASDS v1.0 kurallarını uygular. Belge otoritesi sırası:

1. EOS Constitution
2. EOS Standards
3. EOS Templates
4. EOS Playbooks
5. LUMI proje belgeleri
6. Sprint ve görev belgeleri

EOS kaynakları [`docs/eos`](docs/eos) altında dondurulmuş olarak korunur.

## Güvenlik ve Çocuk Odaklı Tasarım

LUMI çocuklara yönelik bir ürün olarak tasarlandığı için güvenlik, ebeveyn kontrolü,
içerik uygunluğu, veri minimizasyonu ve üretken AI sınırları ürün mimarisinin temel
parçalarıdır. Bu alanlar sonradan eklenen filtreler değil, domain ve uygulama
kontratlarının parçası olarak ele alınır.

## Lisans

Project LUMI için nihai lisans modeli henüz belirlenmemiştir. Lisans kararı verilene
kadar bu depodaki kaynak kodun açık kaynak kullanım, değiştirme veya yeniden dağıtım
izni verdiği varsayılmamalıdır.

Lisans seçimi; projenin açık kaynak katkı modeli, ticari kullanım hedefleri ve LUMI'nin
ürün/IP stratejisi birlikte değerlendirilerek ayrıca belirlenecektir.
