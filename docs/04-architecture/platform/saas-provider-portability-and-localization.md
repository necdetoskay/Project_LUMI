# Project LUMI — SaaS Provider Portability & Localization Architecture

Status: **Canonical**
Date: 2026-08-10
Scope: database, object storage, provider independence, localization, AI generation, assets, voice

## 1. Decision

Project LUMI is designed as a multilingual SaaS product and MUST NOT couple its domain/application layers to a specific cloud vendor.

Initial development providers:

- Database: Neon PostgreSQL
- Object storage: Cloudflare R2
- UI locales at first SaaS release: `tr-TR`, `en-US`
- Story/content generation: native generation in the requested locale

These providers are implementations, not architectural dependencies.

## 2. Portability principles

### Database

The canonical database contract is PostgreSQL, not Neon.

LUMI domain/application code MUST depend on repository/database ports rather than Neon, Supabase, RDS, Railway or other provider SDKs.

The current Drizzle/PostgreSQL adapter may be used with:

- Neon PostgreSQL
- Supabase PostgreSQL
- AWS RDS PostgreSQL
- Railway PostgreSQL
- local/container PostgreSQL
- another sufficiently compatible managed PostgreSQL service

Provider-specific functionality such as Neon branching belongs in infrastructure/tooling/CI and MUST NOT leak into domain/application logic or canonical schema unless explicitly approved by architecture decision.

Canonical migrations SHOULD remain standard PostgreSQL plus an explicit allow-list of portable extensions. Provider-specific SQL is prohibited by default.

Runtime and administrative connections SHOULD be separated:

- `DATABASE_URL`: normal runtime connection; pooled endpoint where appropriate.
- `DATABASE_DIRECT_URL`: migrations, schema administration, backup/restore and session-sensitive operations.

### Object storage

The canonical object-storage contract is the common S3-compatible API subset, not Cloudflare R2.

The application MUST use an internal `ObjectStorage` port. The initial production/shared-development adapter is S3-compatible and targets Cloudflare R2.

Candidate interchangeable providers include:

- Cloudflare R2
- AWS S3
- Backblaze B2
- Supabase Storage S3 endpoint
- MinIO for local/integration environments
- other providers that satisfy the LUMI S3 contract tests

The abstraction MUST intentionally use only capabilities shared by supported providers. Provider-only features are infrastructure extensions, not assumptions of application code.

Minimum storage contract:

- put object
- get/read object
- delete object
- existence/head check
- signed read URL
- signed upload URL
- content type and basic object metadata

Database records MUST store provider-independent logical storage keys, not provider URLs as canonical identity.

Example:

`universes/{universeId}/characters/{characterId}/avatar/v1.webp`

Bucket names, endpoints and public delivery URLs are deployment configuration.

## 3. Asset architecture

Generated images, audio and other binary media MUST live in object storage, not PostgreSQL.

The database stores asset metadata such as:

- asset id
- owning entity/type
- logical storage key
- media/content type
- dimensions/duration where relevant
- byte size
- checksum
- generation provider/model
- prompt/prompt-version reference
- generation cost where available
- lifecycle/status metadata

Asset Management MUST consume storage through the `ObjectStorage` port. Image-generation providers are independently abstracted behind an `ImageGenerationProvider` port.

Images SHOULD be language-neutral whenever practical. Text embedded in generated images SHOULD be avoided. Locale-specific assets are permitted when necessary and MUST be explicitly tagged.

## 4. Environment model

Preferred shared development:

- PostgreSQL: Neon
- Object storage: Cloudflare R2
- Redis/cache: independently configured

Preferred local/offline/integration fallback:

- PostgreSQL: Docker PostgreSQL
- Object storage: MinIO
- Redis: Docker Redis

CI deterministic database tests SHOULD continue to use isolated PostgreSQL containers unless a test specifically targets managed-provider behavior.

## 5. Multilingual SaaS architecture

LUMI is multilingual by architecture even when only a small number of locales are enabled.

Initial enabled locales:

- `tr-TR`
- `en-US`

Additional locales require product/quality approval but MUST NOT require redesign of the core architecture.

BCP 47 locale identifiers SHOULD be used rather than ambiguous language-only flags.

UI locale and content locale are separate concepts.

Examples:

- Parent UI: `tr-TR`
- Child UI: `tr-TR`
- Story/content: `en-US`

A household/profile MAY define defaults, while a story/session MAY capture the effective content locale used for generation.

## 6. UI localization

User-facing strings MUST progressively move out of components and into localization resources.

No new feature SHOULD introduce significant hard-coded Turkish or English UI copy when a localization key is appropriate.

Translation resources MUST support at least `tr-TR` and `en-US`.

Localization covers more than strings: date/time, number formatting, pluralization, directionality readiness, error messages, accessibility labels and locale-sensitive presentation must use the localization layer.

## 7. Language-neutral world model

Canonical world/simulation entities are identified by stable IDs and machine/domain state, not localized display names.

Example:

- canonical id: `location_001`
- `tr-TR`: `Fısıldayan Orman`
- `en-US`: `Whispering Forest`

Simulation, relationships, memory references, world-state commits and domain events SHOULD operate on canonical IDs/state. Localization belongs to presentation/content-generation boundaries.

This prevents a translated name from becoming an entity identity and allows the same universe to be presented in multiple languages.

## 8. AI content generation

LUMI MUST prefer native generation in the target locale over generating in one language and translating the final story.

Generation context SHOULD include at minimum:

- target content locale
- age band / reading level
- safety policy
- character context
- world context
- story intent/context
- cultural/linguistic guidance where approved

Model selection and evaluation MAY differ by locale. The model router MUST be capable of selecting different providers/models for `tr-TR` and `en-US` when quality, safety or cost evidence justifies it.

Locale-specific quality evaluation MUST include story quality, age appropriateness, safety, natural language quality and cost.

## 9. Voice/audio

TTS/voice configuration is locale-aware and provider-independent.

Voice profiles SHOULD model locale, provider, voice identifier, narration style and relevant speaking parameters.

Text/content locale determines eligible voices; the domain must not hard-code a single TTS provider.

## 10. Provider boundary rule

The following is prohibited in core domain/application code unless explicitly approved:

- direct Neon SDK dependencies
- direct Supabase data/storage calls
- direct R2-specific calls
- provider URLs as asset identity
- provider-specific database functions in canonical domain schema

Provider SDK usage belongs behind adapters/composition roots or infrastructure tooling.

## 11. Contract testing

Provider portability is an executable requirement, not only documentation.

Object-storage adapters MUST pass a common contract suite covering at least put/read/head/delete, signed URLs, content type, overwrite semantics and representative object keys.

Database integration tests MUST verify canonical migrations and representative repository/transaction behavior against standard PostgreSQL. Managed-provider smoke tests MAY additionally verify Neon/Supabase compatibility.

## 12. Exit strategy

Changing providers SHOULD primarily require:

1. provisioning the replacement provider,
2. migrating/copying data or objects,
3. changing deployment secrets/configuration,
4. passing contract and integration tests,
5. switching traffic.

A provider change SHOULD NOT require rewriting LUMI domain/application logic.

## 13. Canonical rule summary

- Database contract: PostgreSQL.
- Initial DB provider: Neon.
- Object-storage contract: portable S3-compatible subset.
- Initial object-storage provider: Cloudflare R2.
- Local storage adapter: MinIO.
- Domain/application layers depend on ports, not vendors.
- Provider-specific capabilities remain infrastructure concerns.
- LUMI is multilingual by architecture.
- Initial SaaS locales are `tr-TR` and `en-US`.
- UI locale and story/content locale are independent.
- World state is language-neutral; presentation is localized.
- AI stories are generated natively in the requested locale.
- Binary assets live in object storage; DB stores metadata and logical keys.
