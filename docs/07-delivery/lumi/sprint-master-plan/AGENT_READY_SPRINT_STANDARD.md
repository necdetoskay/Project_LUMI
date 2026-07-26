# Project LUMI Agent-Ready Sprint Standard

**Version:** 1.0.0

**Status:** Approved

**Last Updated:** 2026-07-26

## Purpose

Bu standart Sprint 02–20 specification'larının bir coding agent tarafından
doğrudan uygulanabilmesi için ortak çalışma sözleşmesini tanımlar. Sprint
dosyaları bu belgeyle birlikte okunur.

## Activation Rule

- Yalnızca `Active` olarak işaretlenen sprint uygulanabilir.
- `Planned / Agent-ready` statüsü belgenin hazır olduğunu, uygulama yetkisi
  verildiğini göstermez.
- Önceki sprintin exit gate'i kapanmadan sonraki sprint başlatılamaz.
- Backlog belgeleri açık insan onayı olmadan sprint kapsamına alınamaz.
- Mimari değişiklik ADR gerektirir.

## Required Agent Workflow

1. EOS Constitution, Standards, Templates ve ilgili Playbook'ları oku.
2. `docs/00-project/context/CURRENT_STATUS.md` ve aktif sprint spec'ini oku.
3. İlgili canonical ürün, domain ve mimari belgeleri oku.
4. Repoyu ve mevcut değişiklikleri incele; kullanıcı değişikliklerini koru.
5. Sprint görev kimliklerine bağlı kısa bir uygulama planı oluştur.
6. Görevleri bağımlılık sırasıyla, küçük ve incelenebilir commit'ler halinde
   uygula.
7. Her davranışla birlikte testini ekle.
8. Format, lint, typecheck, unit, integration ve build kontrollerini çalıştır.
9. Acceptance Criteria → dosya → test → kanıt eşlemesini raporla.
10. İnsan onayı olmadan merge veya kapsam genişletme yapma.

## Architecture Rules

- PostgreSQL authoritative business datastore'dur.
- JSONB yalnızca esnek, şeması doğrulanan profil veya metadata alanlarında
  kullanılır.
- pgvector yalnızca semantic retrieval gereken alanlarda kullanılır.
- Redis kalıcı business state değildir; cache, rate limit ve job coordination
  içindir.
- Büyük medya dosyaları object storage'da tutulur.
- Route handler veya React component doğrudan ORM kullanamaz.
- Domain → application → infrastructure bağımlılık yönü korunur.
- Önemli state değişiklikleri immutable domain event ve transactional outbox
  üzerinden izlenir.
- LLM canonical state'i doğrudan değiştiremez.

## Security Rules

- Her sorgu server-side Family Space ve Child Profile scope uygular.
- Client tarafından gönderilen `familySpaceId` yetki kanıtı sayılmaz.
- Parent/guardian/child/support/admin rolleri RBAC + ABAC + ownership +
  policy kontrolleriyle uygulanır.
- Secret, token, çocuk verisi ve ham prompt/log içeriği loglanamaz.
- Background job payload'ları Family Space scope taşır.
- Parent policy ve child safety, AI ve içerik kararlarının önündedir.

## Task Contract

Her sprint görevi en az şunları taşır:

- benzersiz Task ID;
- ölçülebilir objective;
- scope ve out of scope;
- hedef modül/dosya alanı;
- data ve API etkisi;
- güvenlik etkisi;
- zorunlu testler;
- acceptance evidence;
- rollback yaklaşımı.

Sprint dosyasındaki görev tablosu bu sözleşmenin kısa biçimidir. Uygulama
başlamadan önce coding agent her görevi EOS Task Specification Standard'a göre
ayrıntılandırır; yeni ürün kararı ekleyemez.

## Universal Definition of Done

- Tüm P0/P1 acceptance kriterleri kanıtla karşılanır.
- Yeni/etkilenen davranışlar için unit ve integration testleri geçer.
- Gerekli E2E veya smoke senaryosu geçer.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` ve
  `pnpm build` başarılıdır.
- Migration'lar temiz veritabanında ve mevcut veriden yükseltmede doğrulanır.
- Family Space/Child Profile izolasyon testleri ilgili sprintlerde geçer.
- API, veri modeli, mimari ve operasyon belgeleri günceldir.
- Secret veya gerçek `.env` commit edilmez.
- Açık P0/P1 kusur yoktur.
- Completion report acceptance evidence içerir.
- İnsan review/onayı alınır.

## Completion Output

Coding agent şu çıktıları verir:

1. tamamlanan Task ID'leri;
2. değişen dosya özeti;
3. migration ve API sözleşmesi değişiklikleri;
4. çalıştırılan komutlar ve sonuçları;
5. acceptance traceability;
6. güvenlik ve veri izolasyonu kanıtları;
7. bilinen sınırlamalar;
8. rollback ve yerel çalıştırma talimatları.

