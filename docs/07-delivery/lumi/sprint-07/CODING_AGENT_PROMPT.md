# Sprint 07 Coding Agent Prompt

Bu promptu farkli bir kod ajanina ver. Amac Sprint 07 - Inventory and Persistent Objects kapsaminda kalici item, inventory, ownership, transfer/use/archive ve audit temelini kurmak. Economy, crafting, Story Outcome Commit veya NPC autonomy kapsam disidir.

## Gorev

Project LUMI reposunda Sprint 07 Inventory and Persistent Objects kapsamını uygula.

Once su dosyalari oku:

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-07/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-06/IMPLEMENTATION_REPORT.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_09_Inventory_Items_Ownership_Asset_Schema_v1.0.md`
- `docs/04-architecture/data/persistence/reference-packages/LUMI_Persistence_Paket_11_Audit_Outbox_Idempotency_Jobs_Operational_Schema_v1.0.md`
- `docs/08-backlog/story-outcome-world-state-validation-test-plan.md` sadece inventory transaction risklerini anlamak icin; Story Outcome Commit'i uygulama.
- Existing Sprint 03-06 code under `packages/profiles/src/application`, `packages/profiles/src/domain`, `packages/profiles/src/db`, and web API route patterns under `apps/web/app/api`.

## Mevcut repo gercekleri

- PostgreSQL authoritative datastore.
- Sprint 04-06 character/bootstrap/domain foundation `packages/profiles` icinde yasiyor.
- Sprint 05 observability wrapper'lari API routes icin zorunlu: yeni route'lar `observeHandler` / mevcut auth wrapper pattern'ini korumali.
- Sprint 06 character domain artik Complete: character scope, optimistic version, domain events ve audit pattern'leri ornek alinabilir.
- Root `pnpm lint` pre-existing `@lumi/profiles` lint borcu nedeniyle temiz olmayabilir; bu sprintin kendi gate'lerini ve yeni kod etkisini net raporla.

## Sprint 07 scope

Task ID'leri uygula:

- S07-T01: Inventory/item domain.
- S07-T02: Schema and ownership constraints.
- S07-T03: Transfer/use/archive services.
- S07-T04: Inventory APIs.
- S07-T05: Provenance/events/audit.
- S07-T06: Inventory docs and examples.

## P0 kurallar

- Unique item ayni anda birden fazla owner/location tasiyamaz.
- Transfer kaynak sahipligi, hedef kapasitesi ve Family Space scope dogrulamasi yapmali.
- Ownership history append-only olmali.
- Story text dogrudan inventory state degistiremez.
- Archive fiziksel delete degildir.
- Meaningful metadata schema validation olmadan JSONB'ye yazilamaz.
- Duplicate request idempotent sonuc vermeli; ikinci cagri state'i tekrar degistirmemeli.
- Basarisiz transfer hicbir kismi kayit birakmamali.
- Ilgisiz inventory, character ve household state'i degismemeli.

## Beklenen implementation

1. Domain:
   - Item definition, item instance, inventory, inventory entry, ownership, ownership history, transfer/use/archive event modelleri.
   - Owner target tipleri en az `household`, `child_profile`, `character`, `location` olarak modellenmeli.
   - Quantity/unique item ayrimi, capacity mode/value, transferable/useable/archive rules.
   - Meaningful metadata icin typed validation; raw unknown JSONB kabul etme.

2. Persistence:
   - Additive migration. Tercihen yeni inventory schema veya mevcut profile schema icinde net prefix; repo pattern'iyle uyumlu ol.
   - Item definition, item instance, inventory, inventory entry, ownership history, transfer/idempotency, item events/audit tablolari.
   - Unique active ownership invariant'i DB constraint/index ile destekle.
   - Archive soft-state olarak tutulmali; physical delete yok.

3. Application/use cases:
   - Acquire item.
   - Transfer item.
   - Consume/use item.
   - Archive item.
   - List/get inventory and item history.
   - Tum write operasyonlari transaction-scoped repo kullanmali.
   - Idempotency key desteklenmeli; duplicate request ayni sonucu donmeli.

4. APIs:
   - Parent-authenticated route'lar ekle.
   - Missing householdId -> 400, unauthorized -> 401/403, not found -> 404, validation -> 400, conflict/idempotency/concurrency -> 409 veya mevcut domain mapping ile tutarli status.
   - Tum yeni API route'lar observability wrapper ile sarilmali.

5. Events/audit:
   - Acquire, transfer, use/consume, archive icin immutable event/audit kaydi.
   - Payload safe metadata icermeli; raw story text veya child-sensitive content loglama.

6. Documentation:
   - `docs/07-delivery/lumi/sprint-07/IMPLEMENTATION_REPORT.md` olustur.
   - Task completion, changed files, migration summary, API contracts, invariant evidence, idempotency/concurrency evidence, command results, known risks ve rollback plan ekle.

## Required tests

Minimum testler:

- Domain unit: unique item, quantity, capacity, transferability, metadata validation, archive/use constraints.
- PostgreSQL integration: schema/repository CRUD, active ownership uniqueness, append-only ownership history, idempotency ledger.
- Transaction/concurrency: concurrent transfer ayni item'i iki owner'a veremez; failed transfer rollback.
- API contract: auth, missing householdId, cross-family denial, validation, not found, conflict/idempotent replay.
- Isolation: cross-family ve cross-child/character item transferleri reddedilir.
- Audit: acquire/transfer/use/archive eventleri dogru aggregate/version/idempotency metadata ile yazilir.

## Commands to run

```powershell
pnpm --filter @lumi/web lint
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test
pnpm --filter @lumi/logger typecheck
pnpm --filter @lumi/logger test
pnpm --filter @lumi/profiles typecheck
pnpm --filter @lumi/profiles test
pnpm build
```

DB-gated test eklenirse gerekli env flag'leri ve gercek run/skip durumunu rapora yaz. DB-gated testi run etmediysen "PASS" diye iddia etme.

## Review output required

Is bitince `docs/07-delivery/lumi/sprint-07/IMPLEMENTATION_REPORT.md` uret:

- Completed Task IDs.
- Changed files.
- Migration summary and rollback notes.
- API contract changes.
- Inventory invariant evidence.
- Scope/isolation evidence.
- Idempotency/concurrency evidence.
- Domain event/audit evidence.
- Commands run and exact results.
- Acceptance criteria traceability.
- Known risks/deferred work.

Sonra Codex review yapacak ve gerekirse takip duzeltme promptlari yazacak.