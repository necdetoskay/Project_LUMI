# Doküman Sınıflandırma Standardı

## Yerleştirme Kuralları

| Belge türü | Hedef |
| --- | --- |
| Proje bağlamı ve güncel durum | `00-project/` |
| LUMI yönetişimi ve belge kuralları | `01-governance/` |
| Vizyon, manifesto ve ürün deneyimi | `02-product/` |
| Dünya, karakter, NPC, hikâye ve simülasyon tasarımı | `03-domain-design/` |
| Sistem, veri, güvenlik, AI ve entegrasyon mimarisi | `04-architecture/` |
| Kodlama, test, kalite, DevOps ve dokümantasyon uygulamaları | `05-engineering/` |
| Bağlayıcı teknik/işlevsel specification | `06-specifications/` |
| Sprint, görev, uygulama planı ve release kaydı | `07-delivery/` |
| Ertelenmiş ve onaylanmamış fikir | `08-backlog/` |
| Hukuki ve yardımcı başvuru kaynağı | `09-reference/` |
| Eski sürüm, kopya, ham teslimat veya prototip | `99-archive/` |

## Adlandırma

- Yeni dosyalar `kebab-case.md` kullanır.
- Mevcut numaralı temel tasarım serisi izlenebilirlik için mevcut adını korur.
- `README.md` her bölümün giriş ve navigasyon dosyasıdır.
- `Bible` terimi kullanılmaz; `Engineering Handbook`, `Design Specification`,
  `Project Documentation` veya `Reference` kullanılır.

## Taşıma ve Arşivleme

- Taşımalarda Git geçmişi korunur.
- Aynı içeriğin aktif ve arşiv kopyaları varsa aktif olan canonical kabul
  edilir; arşiv kopyasına yeni bağlantı verilmez.
- Arşiv dosyaları salt okunur tarihsel kanıttır.
- İçerik kaybına yol açan birleştirme veya silme ayrı inceleme olmadan yapılmaz.
