# Visual Theme & Asset Management System

Status: **BACKLOG / DESIGN PREPARED — implementation intentionally deferred**  
Parent epic: **#356**

## 1. Purpose

LUMI will use generated and curated visual assets across landing, onboarding, stories, settings and future frontend surfaces. This document defines a future architecture that separates those visual assets and their style rules from page/component code.

The system is intended to let an authorized admin replace one image, regenerate a group of images, or create a complete application-wide visual theme without hard-coded asset replacement and without turning LUMI into a general website/page builder.

## 2. Product decision

Build the capability in two layers:

1. **Visual Asset Management** — semantic asset slots, revisions, generation provenance, preview/approval and publication.
2. **Theme System** — global style template, design tokens, theme versions, full-theme regeneration and rollback.

User-facing customization is a later optional capability and must remain constrained to approved presets or safe generated variants.

## 3. Core invariants

### 3.1 Semantic slots, not URLs

Frontend components must eventually reference stable semantic keys:

```tsx
<ThemeImage slot="landing.hero" />
```

They must not depend on a storage URL as identity.

Example slots:

- `landing.hero`
- `landing.character_scene`
- `landing.world_scene`
- `landing.cta_background`
- `landing.footer_illustration`
- `stories.header`
- `stories.empty_state`
- `onboarding.world_background`

A physical R2/S3/local-storage path is only a revision payload resolved by the active theme.

### 3.2 Theme Assets != Universe Assets

Theme changes must never silently alter canonical narrative assets.

**Theme Assets**
- landing illustrations
- generic UI backgrounds
- decorative artwork
- empty states
- generic onboarding artwork

**Universe Assets**
- canonical characters
- worlds/regions
- NPCs
- items/inventory
- story scene illustrations

Both domains may reuse common generation/storage/provenance infrastructure, but their registries and mutation rules remain separate.

### 3.3 No direct generate-to-production path

Required lifecycle:

`Generate -> Preview -> Approve -> Publish`

AI generation creates a candidate revision only. It must never replace the active production asset as a side effect.

### 3.4 Version and rollback everything user-visible

Published theme versions remain recoverable.

Suggested lifecycle:

`draft -> preview -> active -> archived`

A new publication archives the previous active version but keeps it available for rollback.

### 3.5 Theme changes do not own page structure

The theme system may control approved visual tokens and registered assets. It must not become an arbitrary layout/page builder.

Canonical UI contracts and page structure remain owned by the frontend/design contract.

## 4. Prompt architecture

A single master prompt is insufficient because each asset slot has different composition requirements.

Use a layered prompt model:

```text
Effective Asset Prompt
  = Global Theme Style Template
  + Slot Prompt Template
  + Runtime Generation Constraints
```

Example global style:

```text
Whimsical children's storybook illustration,
soft watercolor textures,
warm magical lighting,
cohesive visual language.
```

Example slot prompt for `landing.hero`:

```text
Wide composition.
Keep open negative space on the left for headline and CTA.
Place the primary scene on the right.
No text inside the illustration.
```

Changing the global style may change the art direction of the whole application while preserving slot-specific composition requirements.

Store, at minimum:

- global style template/version;
- slot prompt template/version;
- effective prompt fingerprint;
- model/provider;
- model/provider parameters;
- aspect ratio/resolution;
- seed where supported;
- generation timestamp;
- output asset reference;
- approval/publication provenance.

## 5. Proposed domain model

### ThemeRegistry
Logical theme identity, for example `enchanted-storybook`.

### ThemeVersion
Immutable/versioned theme snapshot with lifecycle state.

### ThemeDesignTokens
Approved visual token set such as colors, typography, radius and shadows. Structural layout rules remain outside unrestricted theme editing.

### ThemeStyleTemplate
Global theme art direction and generation defaults.

### ThemeAssetSlot
Stable semantic placement contract. Suggested metadata:

- key;
- page/surface;
- purpose;
- type;
- aspect ratio;
- recommended dimensions;
- responsive/crop behavior;
- composition rules;
- negative/safe area requirements;
- fallback slot/asset;
- whether generation is allowed.

### ThemeAssetRevision
One physical/generated candidate for a slot in a theme version.

### ThemeGenerationJob
Single or batch generation operation, status, cost and provenance.

### ThemePublication
Auditable activation/rollback event.

## 6. Initial Theme Manager UX

The admin surface should support:

- theme/version list;
- active/draft status;
- assets grouped by page/surface;
- thumbnail + semantic slot name;
- current active revision;
- prompt/style source;
- generation model/settings;
- regenerate one slot;
- generate selected slots;
- preview candidate;
- approve/reject candidate;
- full-theme preview;
- publish;
- rollback.

Suggested conceptual flow:

```text
Theme Manager

Enchanted Storybook v3       ACTIVE

Global Style
[ style template ... ]

Landing
  landing.hero               approved
  landing.character_scene    approved
  landing.world_scene        approved
  landing.cta_background     approved
  landing.footer_illustration approved

Stories
  stories.header             approved
  stories.empty_state        approved

[Generate selected] [Create new theme version]
[Preview theme]      [Publish]
```

## 7. Full-theme regeneration

When the global style/template changes:

1. clone the active theme into a draft version;
2. apply the new global style template;
3. regenerate selected/all registered slots using each slot's own prompt contract;
4. preserve successful candidates if some jobs fail;
5. inspect the complete draft theme;
6. run visual/performance/accessibility gates;
7. explicitly publish;
8. keep the previous active theme available for rollback.

A partial batch must never silently become the active theme.

## 8. Design tokens

A ThemeVersion may eventually include approved design tokens:

- colors;
- typography;
- radius;
- shadows;
- selected spacing/decorative values.

Do not expose unrestricted structural CSS/layout modification through this module.

Token changes must be previewable, versioned and rollback-safe.

## 9. Quality gates before publication

Future publication should consider:

- canonical visual regression screenshots;
- responsive behavior;
- required crop/safe areas;
- accessibility and contrast;
- image format/dimensions;
- file-size budgets;
- lazy-loading behavior;
- cache/CDN invalidation;
- missing/fallback slot handling.

For canonical mockup-locked surfaces, existing canonical UI contracts remain authoritative.

## 10. Shared Asset Generation Platform

Theme Manager and Universe Asset systems should reuse infrastructure where appropriate:

```text
                 Shared Asset Generation Platform
                 /                          \
          Theme Assets                 Universe Assets
          UI artwork                   Characters
          backgrounds                  Worlds/regions
          decorations                  NPCs/items
          empty states                 Story scenes
```

Reusable concerns may include:

- provider/model adapters;
- generation requests;
- cost/usage tracing;
- prompt provenance;
- object storage;
- candidate/revision storage;
- preview and approval primitives.

Domain-specific registries and publication/canonicalization rules remain separate.

## 11. User customization decision

Do **not** build a general end-user frontend editor in the first implementation.

Possible later experience:

- choose from approved theme presets;
- optionally create a constrained personalized theme from user preferences;
- keep layout/components fixed;
- enforce prompt safety, cost quotas and storage limits;
- fall back to the platform default theme on failure.

This is tracked separately as **#363** and is not required for the initial admin Theme Manager.

## 12. Delivery plan

### Phase 1 — #357
Architecture contracts and complete visual asset slot inventory.

### Phase 2 — #358
Theme Registry, versioning and semantic asset resolver.

### Phase 3 — #359
Style templates, per-slot prompts and generation provenance.

### Phase 4 — #360
Admin Theme Manager: inspect, regenerate, preview and approve.

### Phase 5 — #361
Full-theme regeneration, publication and rollback.

### Phase 6 — #362
Design tokens, visual regression, performance and accessibility gates.

### Later / Optional — #363
User-selectable and AI-personalized theme presets.

Primary dependency direction:

`#357 -> #358 -> #359 -> #360 -> #361 -> #362 -> optional #363`

## 13. Migration strategy

Do not migrate the whole application at once.

Recommended first vertical slice when implementation begins:

1. register the current landing-page visual assets as semantic slots;
2. preserve the current approved landing design exactly;
3. replace direct asset references with the semantic resolver;
4. prove regenerate -> preview -> approve for one slot;
5. prove theme version publication and rollback;
6. only then expand registration to other pages.

This keeps the future Theme System from destabilizing the current frontend.

## 14. Explicit non-goals

For the first implementation:

- no drag-and-drop page builder;
- no arbitrary HTML/CSS editing;
- no arbitrary component rearrangement;
- no automatic production publication after generation;
- no coupling of theme changes to canonical character/world/story mutations;
- no requirement for user-personalized themes;
- no replacement of canonical UI contracts with generated layouts.

## 15. Activation gate

Do not start implementation merely because this document and issues exist.

Activate #356 only when:

- current higher-priority LUMI work allows it;
- the current landing/frontend visual direction is sufficiently stable to inventory;
- the first migration surface is explicitly chosen;
- implementation can preserve existing canonical UI behavior while introducing the resolver beneath it.

Until then, this document and #356–#363 are the prepared source of truth for the future work.