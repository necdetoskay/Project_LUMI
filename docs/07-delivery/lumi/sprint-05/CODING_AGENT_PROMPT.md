# Sprint 05 Coding Agent Prompt

Bu promptu farklı bir kod ajanına ver. Amaç Sprint 05'i uygulamak; kapsam dışı ürün özelliği ekleme.

## Görev

Project LUMI reposunda Sprint 05 - Observability and Operations Baseline kapsamını uygula.

Önce şu dosyaları oku:

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-05/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-04/COMPLETION_REPORT.md`
- Mevcut API ve altyapı dosyaları: `apps/web/app/api`, `apps/web/lib/auth/audit.ts`, `apps/web/lib/readiness.ts`, `apps/web/tests`, `packages/profiles`

## Mevcut repo gerçekleri

- Monorepo pnpm workspace kullanıyor.
- Web uygulaması `apps/web` altında Next.js App Router.
- Şu anda workspace package olarak yalnızca `packages/profiles` var; Sprint 05 için yeni paket gerekiyorsa küçük ve net kapsamlı ekle.
- Mevcut API route'ları `apps/web/app/api` altında.
- Mevcut readiness kodu `apps/web/lib/readiness.ts` ve endpoint `apps/web/app/api/readiness/route.ts`.
- Mevcut auth audit logging `apps/web/lib/auth/audit.ts` içinde `console.warn(JSON.stringify(...))` kullanıyor.
- Kapanış kanıtı: `@lumi/web` lint, typecheck, Vitest 29/29 ve Playwright 25/25 geçiyor. Bu yeşil durumu bozma.

## Sprint 05 kapsamı

Task ID'lerine bağlı ilerle:

- S05-T01: `packages/logger` altında structured JSON logger ve redaction altyapısı.
- S05-T02: HTTP/API/application/database sınırlarında correlation ID üretimi, doğrulaması ve propagation.
- S05-T03: liveness, readiness ve version/build endpointleri.
- S05-T04: vendor-neutral metrics ve error reporting adapter.
- S05-T05: `infra/observability` altında dashboard/alert baseline config ve doğrulama testi.
- S05-T06: incident/troubleshooting runbook dokümanları.

## P0 güvenlik kuralları

- Password, token, cookie, secret, session id, authorization header, reset token, raw prompt, story content, child personal data veya child behavior profiling datası loglanamaz.
- Redaction allowlist/denylist test fixture'larıyla kanıtlanmalı.
- Public health/readiness responses iç hata detayını sızdırmamalı.
- Dışarıdan gelen correlation ID kabul edilecekse format/uzunluk doğrulanmalı; geçersizse yeni server ID üret.
- Metrics düşük kardinaliteli olmalı; user id, child id, email, profile name gibi değerler label olarak kullanılmamalı.
- Observability adapter failure ana business transaction'ı bozmamalı.

## Beklenen uygulama detayları

1. `packages/logger` package oluştur.
   - TypeScript strict çalışmalı.
   - `createLogger`, `redact`, `withCorrelation`, `safeError` benzeri küçük API tasarla.
   - JSON log formatı en az `timestamp`, `level`, `event`, `message`, `correlationId`, `context` alanlarını desteklesin.
   - Auth audit logging bu paketi kullanacak şekilde taşınsın veya wrap edilsin.

2. Correlation altyapısı ekle.
   - HTTP request header olarak `x-correlation-id` oku.
   - Geçerliyse kullan, değilse server üret.
   - Response header'a `x-correlation-id` yaz.
   - API route handler'larında merkezi helper kullan; route bazlı copy-paste'i minimum tut.
   - DB/outbox tarafı henüz tam ortak platform değilse en azından repository/application çağrılarına correlation context taşıyacak sözleşme ve test ekle.

3. Health/version endpointlerini düzenle.
   - Liveness dependency kontrol etmemeli.
   - Readiness PostgreSQL gibi dependency'leri timeout ile kontrol etmeli.
   - Public response detay sızdırmamalı; iç loglar correlation ID ile yeterli tanı bilgisi taşımalı.
   - Version endpoint commit/build metadata döndürmeli; secret/env dump yapmamalı.

4. Metrics/error adapter ekle.
   - Vendor lock-in yapma.
   - No-op/default adapter ile uygulama çalışmaya devam etmeli.
   - HTTP latency/error counter gibi düşük kardinaliteli eventleri destekle.
   - Adapter hata verirse uygulama request'i fail etmemeli.

5. Observability config ekle.
   - `infra/observability` altında alert/dashboard baseline config oluştur.
   - Error rate, latency ve readiness degraded durumları için kural tanımla.
   - Config schema/validation testi yaz.

6. Runbook yaz.
   - Startup failure
   - DB bağlantı/readiness failure
   - migration failure
   - high error rate
   - high latency
   - missing/invalid correlation ID
   - observability adapter failure

## Test beklentisi

En az şu testleri ekle veya güncelle:

- Logger/redaction unit tests: secret/PII/child data maskeleniyor.
- Correlation unit/integration tests: geçerli ID korunuyor, geçersiz ID yenileniyor, response header set ediliyor.
- Health/version contract tests: liveness dependency çağırmıyor, readiness timeout/degraded response güvenli, version secret sızdırmıyor.
- Metrics/error adapter tests: no-op güvenli, adapter failure business flow'u bozmuyor, label kardinalitesi güvenli.
- Config validation tests: `infra/observability` alert/dashboard config geçerli.

## Çalıştırılacak komutlar

En az:

```powershell
pnpm --filter @lumi/web lint
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test
pnpm --filter @lumi/web test:e2e
pnpm lint
pnpm typecheck
pnpm test
```

Yeni package eklersen ilgili `pnpm --filter @lumi/logger ...` kontrollerini de çalıştır.

## Review için üretilecek çıktı

İş bitince `docs/07-delivery/lumi/sprint-05/IMPLEMENTATION_REPORT.md` oluştur ve şunları yaz:

- Tamamlanan Task ID'leri
- Değişen dosyalar
- API endpoint değişiklikleri
- Logger/redaction davranışı
- Correlation propagation kanıtı
- Health/version/readiness contract kanıtı
- Metrics/error adapter davranışı
- Alert/dashboard config doğrulaması
- Çalıştırılan komutlar ve sonuçları
- Acceptance criteria traceability tablosu
- Bilinen riskler ve rollback planı

Kod ajanı işi bitirdikten sonra bu rapor ve değişiklikler Codex review aşamasına gönderilecek.
