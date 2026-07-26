# Project LUMI Dokümantasyonu

Bu dizin Project LUMI'nin resmi dokümantasyon giriş noktasıdır. Yeni bir konu
araştırılırken önce bu indeks, ardından ilgili canonical belge okunmalıdır.

## Otorite

EOS-ASDS v1.0 proje üzerindeki en yüksek mühendislik otoritesidir. Ayrıntılı
sıralama için [Doküman Otoritesi](01-governance/DOCUMENT_AUTHORITY.md) belgesine
bakın.

## Ana Bölümler

| Bölüm | İçerik | Durum |
| --- | --- | --- |
| [`eos/`](eos/) | Constitution, standartlar, şablonlar ve playbook'lar | Frozen / Authoritative |
| [`00-project/`](00-project/) | Proje bağlamı, durum ve çalışma kuralları | Canonical |
| [`01-governance/`](01-governance/) | LUMI belge ve karar yönetişimi | Canonical |
| [`02-product/`](02-product/) | Vizyon, manifesto, ürün ilkeleri ve deneyim | Canonical |
| [`03-domain-design/`](03-domain-design/) | Yaşayan dünya ve hikâye domain tasarımı | Canonical |
| [`04-architecture/`](04-architecture/) | Sistem, uygulama, veri, AI ve entegrasyon mimarisi | Canonical + Reference |
| [`05-engineering/`](05-engineering/) | Geliştirme, test, kalite, DevOps ve dokümantasyon | Canonical + Reference |
| [`06-specifications/`](06-specifications/) | Sprint dışı bağlayıcı teknik ve işlevsel specification'lar | Canonical |
| [`07-delivery/`](07-delivery/) | Sprintler, görevler, release ve uygulama planları | Active / Historical |
| [`08-backlog/`](08-backlog/) | Onaylanmamış veya ertelenmiş fikirler | Backlog |
| [`09-reference/`](09-reference/) | Hukuki ve yardımcı başvuru kaynakları | Reference |
| [`99-archive/`](99-archive/) | Eski teslimatlar, kopyalar ve prototip paketler | Archived / Read-only |

## Belge Durumları

- **Authoritative:** Çelişki halinde öncelikli kaynaktır.
- **Canonical:** İlgili LUMI alanının güncel resmi tanımıdır.
- **Reference:** Karar vermeyi destekler fakat tek başına bağlayıcı değildir.
- **Delivery:** Belirli sprint, görev veya release kapsamına aittir.
- **Backlog:** Henüz tasarım veya uygulama kapsamına alınmamıştır.
- **Archived:** Geçmişi korur; yeni uygulama kararları için kullanılmaz.

Sınıflandırma ayrıntıları:
[Doküman Sınıflandırma Standardı](01-governance/DOCUMENT_CLASSIFICATION.md).

## Hızlı Başlangıç Okuma Sırası

1. [Proje bağlamı](00-project/context/PROJECT_CONTEXT.md)
2. [Güncel durum](00-project/context/CURRENT_STATUS.md)
3. [Ürün vizyonu](02-product/foundation/000-LUMI-Project-Vision.md)
4. [Yaşayan Evren Manifestosu](02-product/foundation/001-Living-Universe-Manifesto.md)
5. [Temel tasarım ilkeleri](02-product/foundation/002-Core-Design-Principles.md)
6. [Domain tasarım indeksi](03-domain-design/README.md)
7. [Mimari indeks](04-architecture/README.md)
8. [Aktif teslimat indeksi](07-delivery/README.md)

## Koruma Kuralları

- İçerik silinmez; eski sürümler arşivlenir.
- Arşiv belgeleri güncel belgelerin yerine kullanılamaz.
- Aynı konu için birden fazla güncel belge varsa canonical olan açıkça
  işaretlenir.
- Yeni belgeler `kebab-case` adıyla ve ilgili bölümün README indeksine eklenerek
  oluşturulur.
- Kamuya açık her modül README, mimari not, API açıklaması ve değişiklik
  geçmişine sahip olmalıdır.
