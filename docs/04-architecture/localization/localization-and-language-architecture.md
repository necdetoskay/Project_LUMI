# Localization and Language Architecture

Status: Canonical foundation
Scope: Project LUMI web UI, future mobile UI, and AI-generated story/content language
Initial locales: `tr`, `en`
Tracking: Issue #84

## 1. Decision summary

Project LUMI treats interface localization and generated-content language as two separate concerns.

- `uiLocale` controls application chrome, navigation, forms, labels, validation copy, metadata, dates and numbers.
- `contentLocale` controls stories, generated descriptions, dialogue, world-facing narrative text and other AI-generated child content.
- Changing `uiLocale` must not silently change existing story language.
- Changing `contentLocale` must not require changing the application UI language.
- Turkish is the migration/default locale while English is the first additional locale.
- The architecture must allow additional locales without changing core application flows.

## 2. UI localization

The web application uses `next-intl` with Next.js App Router.

Phase 1 deliberately keeps existing URLs stable. Locale selection is resolved from a first-party locale cookie and falls back deterministically to Turkish. This avoids moving the entire route tree under a locale segment while the application is still evolving.

A later public-web/SEO phase may introduce locale-prefixed or domain-based routing for public pages without changing the translation catalogs or content-language model.

### Locale resolution order

1. Explicit current request locale cookie.
2. Persisted parent/account UI preference when that capability is added.
3. Optional browser negotiation in a later phase.
4. Default locale: `tr`.

Unsupported locale values always fall back to `tr`.

## 3. Story and generated-content language

Generated content uses an explicit domain-level locale value. Recommended canonical name: `contentLocale`.

The value must ultimately be present in generation requests and durable story/session metadata so that continuation, replay and regeneration preserve language deterministically.

The generation pipeline must not infer story language only from UI locale. UI locale may be used as a default when a new profile/story has no explicit content preference, but the resolved value must then become explicit.

### Example

A parent can use the LUMI interface in English while a child profile continues receiving Turkish stories:

- `uiLocale = "en"`
- `contentLocale = "tr"`

The reverse is equally valid.

## 4. Persistence model

Phase 1 requires no database migration.

- UI locale: first-party cookie.
- Content locale: existing behavior remains unchanged until the generation contract phase.

Future persistence should prefer:

- account/parent preference for default `uiLocale`;
- child-profile preference for default `contentLocale`;
- story/session-level resolved locale for historical continuity.

A stored story/session locale is immutable historical metadata. Changing a profile preference affects new generation unless an explicit migration/regeneration action is requested.

## 5. Translation catalog rules

Translation catalogs live under the web application and use stable semantic keys rather than copying source strings as keys.

Initial catalogs:

- `messages/tr.json`
- `messages/en.json`

Rules:

- Both catalogs must maintain key parity.
- Product copy belongs in catalogs, not component literals.
- Domain values and database identifiers are not translated at persistence boundaries.
- User-entered names and generated narrative are not UI translation messages.
- ICU syntax is preferred for pluralization and parameterized text.
- Accessibility labels are translated alongside visible UI copy.

## 6. Fallback and failure policy

Missing or invalid locale selection falls back to `tr`.

Missing translation keys are development defects and should be detected by tests/CI rather than silently becoming mixed-language production UI.

Generated-content fallback is separate: model/provider failure must never be solved by silently generating in a different language. A generation request either honors its resolved `contentLocale` or fails/retries according to provider policy.

## 7. Mobile compatibility

The domain locale model is framework-independent. Web may use `next-intl`, while a future native client may use another presentation library. Both consume the same canonical locale identifiers and preserve the distinction between `uiLocale` and `contentLocale`.

## 8. Rollout roadmap

### Phase 0 — foundation

- Canonical architecture.
- Hard-coded UI inventory.
- `tr` and `en` locale definitions.

### Phase 1 — global web shell

- Add `next-intl`.
- Cookie-based locale resolution.
- Localize metadata, root accessibility copy, header and footer.
- Add language switcher.
- Add message parity and locale-resolution tests.

### Phase 2 — application surfaces

- Public/auth pages.
- Parent home and profile management.
- Character creation.
- Asset management.
- Settings and safety.
- Story/session UI.

### Phase 3 — generated content

- Add explicit `contentLocale` to generation contracts.
- Persist resolved locale on story/session artifacts.
- Propagate language through prompt construction and provider routing.
- Add Turkish and English generation acceptance tests.

### Phase 4 — international product maturity

- Optional public locale-prefixed routing and SEO metadata.
- Additional locales.
- Translation workflow and review tooling.
- Locale-aware analytics and quality metrics.

## 9. Acceptance principles

Localization is complete only when:

- Turkish and English UI can render without duplicated page implementations;
- UI and story language can differ;
- locale fallback is deterministic;
- Turkish existing flows remain functional;
- adding a third locale is mostly catalog/configuration work;
- generated story continuity does not unexpectedly change language.