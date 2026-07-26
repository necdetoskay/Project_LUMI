# Architecture

Project LUMI'nin uygulama ve sistem mimarisini içerir.

- [`lumi/`](lumi/) — uygulama, olay, frontend ve domain engine mimarileri
- [`data/`](data/) — PostgreSQL, Drizzle, şemalar ve persistence kararları
- [`ai/`](ai/) — prompt ve AI orchestration kaynakları
- [`media/`](media/) — görüntü ve ses üretim mimarisi
- [`security/`](security/) — kimlik, yetkilendirme, gizlilik ve çocuk güvenliği
- [`integrations/`](integrations/) — API ve dış sağlayıcı entegrasyonları

`reference-packages/` dizinleri geçmiş kapsamlı paket teslimatlarını korur.
Yeni kararlar doğrudan bu paketlerden değil, canonical mimari ve
specification'lardan türetilir.
