# Project LUMI — SaaS Foundation Implementation Roadmap

Status: **Implementation Roadmap**
Date: 2026-08-10
Depends on: `docs/04-architecture/platform/saas-provider-portability-and-localization.md`

## Goal

Turn the canonical provider-portability and multilingual-SaaS decisions into executable infrastructure without destabilizing the current playable system.

The roadmap deliberately preserves local PostgreSQL/Redis and deterministic CI while making shared cloud development the normal path.

## Phase 0 — Baseline and guardrails

Deliverables:

- inventory all current database clients, `DATABASE_URL` consumers, migrations and provider assumptions;
- inventory current hard-coded Turkish UI/content strings;
- inventory current binary/visual asset persistence paths;
- define portability forbidden-pattern checks for provider SDK leakage into domain/application packages;
- record baseline ULTEF/integration/E2E results before migration.

Acceptance:

- current application behavior is reproducibly green before infrastructure changes;
- all DB entry points and migration entry points are documented.

## Phase 1 — Database connection portability

Deliverables:

- introduce canonical runtime/direct connection configuration;
- `DATABASE_URL` for runtime;
- `DATABASE_DIRECT_URL` for migrations/admin with safe fallback for local development;
- centralize PostgreSQL client configuration where practical;
- audit current per-package `max: 5` pools and prevent uncontrolled connection multiplication;
- ensure no Neon SDK is required by application code.

Acceptance:

- local PostgreSQL continues to work;
- canonical migrations work through direct connection configuration;
- runtime repositories work through normal/pooled configuration;
- existing transaction/idempotency tests remain green.

## Phase 2 — Neon compatibility spike

Provision a disposable Neon PostgreSQL 17 project/branch in an EU region suitable for the application deployment plan.

Deliverables/tests:

- apply every canonical auth/profile/world/NPC/story migration to a blank Neon database;
- verify `pgcrypto`, UUID defaults, custom schemas, partial indexes, foreign keys/cascades and transactions;
- prepare demo seed/data;
- run representative login → household → profile → character → world → story → memory flow;
- test worker DB access;
- capture latency/cold-start observations;
- document restore/export procedure.

Acceptance:

- zero canonical schema rewrites required solely for Neon;
- full demo preparation succeeds from a blank DB;
- representative LUMI transaction flows pass.

Rollback: retain Docker PostgreSQL as the default until this phase is green.

## Phase 3 — Shared development DB

Deliverables:

- make Neon the preferred shared development PostgreSQL provider;
- keep Docker PostgreSQL as explicit local/offline/destructive-test fallback;
- document secret setup without committing credentials;
- establish branch naming/lifecycle policy for DB experiments;
- destructive migration experiments use temporary DB branches rather than the shared canonical development branch.

Suggested branch policy:

- shared/reference development branch: stable development state;
- `agent-*`, `migration-*`, `experiment-*`: disposable branches;
- temporary branches should expire/be deleted after validation.

Acceptance:

- two independent application environments can point at the same shared development state;
- destructive tests cannot accidentally mutate the reference branch under the normal workflow.

## Phase 4 — Object-storage port and R2 adapter

Deliverables:

- define minimal `ObjectStorage` port;
- implement S3-compatible adapter;
- configure Cloudflare R2 as initial shared-development provider;
- implement MinIO configuration/adapter path for local and integration use;
- add provider-independent logical storage keys;
- add object-storage contract tests.

Minimum contract tests:

- put;
- read/get;
- head/exists;
- delete;
- signed read URL;
- signed upload URL;
- content type/metadata;
- overwrite behavior;
- Unicode and representative nested keys.

Acceptance:

- same application service passes against R2 and MinIO without application/domain changes;
- no R2 URL is used as canonical asset identity.

## Phase 5 — Asset Management integration

Deliverables:

- persist generated image/audio binaries through `ObjectStorage`;
- DB stores only metadata/logical keys;
- integrate image-generation provider abstraction;
- record generation provider/model/prompt version/cost metadata;
- support grid-generation outputs and derived/cropped assets;
- add orphan detection/cleanup policy;
- add lifecycle rules for failed/temporary generation artifacts.

Acceptance:

- generating an asset produces an object + metadata transaction/workflow with recoverable failure behavior;
- changing S3 provider requires configuration/adapter changes, not Asset Management business logic.

## Phase 6 — UI internationalization foundation

Deliverables:

- choose/standardize Next.js i18n library/pattern;
- create `tr-TR` and `en-US` locale resources;
- migrate shared navigation, auth, errors and parent-facing common components first;
- migrate child-facing/story-reader UI;
- locale-aware date/number/plural/accessibility formatting;
- establish missing-key and fallback policy;
- prohibit new significant hard-coded user-facing strings.

Acceptance:

- complete primary parent flow is usable in Turkish and English;
- complete primary child/story-reader flow is usable in Turkish and English;
- automated test detects missing critical locale keys.

## Phase 7 — Locale-aware domain/content model

Deliverables:

- distinguish UI locale from content/story locale;
- use BCP 47 locale values;
- add effective locale fields/config where persistence is required;
- introduce localized display-name/content structures without changing canonical entity identity;
- audit seed/demo data for language-neutral IDs;
- ensure simulation/domain events reference canonical IDs rather than localized names.

Acceptance:

- one canonical universe can be presented with Turkish or English localized names/content;
- switching presentation locale does not duplicate or mutate canonical world identity.

## Phase 8 — Native multilingual AI generation

Deliverables:

- add target locale to generation context;
- provide locale-specific linguistic/cultural generation guidance;
- generate `tr-TR` and `en-US` stories natively rather than translating a canonical Turkish story;
- add locale-aware model routing capability;
- add Turkish and English story quality/safety/age-appropriateness evaluation sets;
- include cost per accepted generation by locale in model evaluation.

Acceptance:

- same story intent/world context can generate valid native Turkish and native English experiences;
- both locales pass safety and age-appropriateness gates;
- model router can select different models per locale without application changes.

## Phase 9 — Voice/audio localization

Deliverables:

- locale-aware `VoiceProfile`/TTS provider abstraction;
- Turkish and English narration configuration;
- ensure unsupported locale/voice combinations fail safely;
- store audio in object storage using locale-aware metadata/keys when necessary.

Acceptance:

- Turkish story selects eligible Turkish narration;
- English story selects eligible English narration;
- TTS provider can be changed behind its adapter.

## Phase 10 — Portability proof

This phase proves the architecture rather than trusting documentation.

Deliverables:

- run DB migration/repository smoke test against a second PostgreSQL provider or local PostgreSQL from the same canonical migrations;
- run object-storage contract suite against R2 and MinIO; optionally a second cloud S3 provider;
- produce a provider-switch runbook;
- add backup/export/import rehearsal;
- document RPO/RTO expectations before production launch.

Acceptance:

- database provider can change without domain/application rewrite;
- object-storage provider can change without Asset Management rewrite;
- all provider-dependent configuration is discoverable and isolated.

## Recommended execution order

Do not implement every phase as one large sprint. The safe order is:

1. Phase 0–2: audit + DB abstraction cleanup + Neon spike.
2. Phase 3: shared development DB.
3. Phase 4–5: storage abstraction + R2/MinIO + Asset Management.
4. Phase 6–7: UI/domain localization foundation.
5. Phase 8–9: multilingual generation and voice.
6. Phase 10: portability proof before production hardening.

## Non-goals for the first implementation wave

- supporting many languages beyond `tr-TR` and `en-US`;
- replacing Redis as part of the DB migration;
- moving deterministic CI database tests entirely to Neon;
- using provider-specific database/storage features inside core domain logic;
- migrating binary assets into PostgreSQL;
- forcing production infrastructure decisions before measured load exists.

## Definition of Done

The SaaS foundation is complete when:

- shared development can use Neon without losing local PostgreSQL fallback;
- application/domain code is provider-independent;
- assets use the S3-compatible storage port with R2 and MinIO proven;
- primary UI flows work in `tr-TR` and `en-US`;
- story generation natively supports both locales;
- canonical world identity is language-neutral;
- portability contract/integration tests are automated;
- provider switch and backup/restore runbooks exist.
