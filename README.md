# Project LUMI

Project LUMI, çocuklar için kalıcı hafızaya ve yaşayan bir dünyaya sahip
etkileşimli hikâye platformudur.

Bu depo ürün dokümantasyonunu, mimari kararları, uygulama kodunu, geliştirme
araçlarını ve teslimat kayıtlarını tek yerde tutan resmi proje deposudur.

## Başlangıç

```bash
pnpm install
pnpm dev
```

Web uygulaması `http://localhost:3000`, sağlık kontrolü ise
`http://localhost:3000/api/health` adresinde çalışır.

Yerel PostgreSQL ve Redis altyapısını Docker Desktop açıkken başlatmak için:

```bash
cp .env.example .env
pnpm infra:up
pnpm infra:status
```

PowerShell karşılığı:

```powershell
Copy-Item .env.example .env
pnpm infra:up
pnpm infra:status
```

## Depo Yapısı

| Yol         | Sorumluluk                                      |
| ----------- | ----------------------------------------------- |
| `apps/`     | Çalıştırılabilir kullanıcı uygulamaları         |
| `services/` | Bağımsız arka plan ve servis süreçleri          |
| `packages/` | Yeniden kullanılabilir çalışma zamanı paketleri |
| `tooling/`  | Ortak TypeScript, ESLint ve geliştirme araçları |
| `infra/`    | Yerel ve dağıtım altyapısı                      |
| `tests/`    | Depo seviyesindeki çapraz sistem testleri       |
| `docs/`     | Resmi proje ve mühendislik dokümantasyonu       |

## Dokümantasyon

Dokümantasyonun başlangıç noktası [`docs/README.md`](docs/README.md) dosyasıdır.
Belge otoritesi, durumları ve sınıflandırma kuralları bu indeks üzerinden
izlenir.

Temel tasarım belgeleri:

- [Ürün vizyonu](docs/02-product/foundation/000-LUMI-Project-Vision.md)
- [Yaşayan Evren Manifestosu](docs/02-product/foundation/001-Living-Universe-Manifesto.md)
- [Temel tasarım ilkeleri](docs/02-product/foundation/002-Core-Design-Principles.md)
- [Domain tasarım indeksi](docs/03-domain-design/README.md)
- [Mimari dokümantasyon](docs/04-architecture/README.md)
- [Aktif teslimat planları](docs/07-delivery/README.md)

## Mühendislik Otoritesi

LUMI, EOS-ASDS v1.0 kurallarını uygular. Öncelik sırası:

1. EOS Constitution
2. EOS Standards
3. EOS Templates
4. EOS Playbooks
5. LUMI proje belgeleri
6. Sprint ve görev belgeleri

EOS kaynakları [`docs/eos`](docs/eos) altında dondurulmuş olarak korunur.

## Kalite Komutları

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
