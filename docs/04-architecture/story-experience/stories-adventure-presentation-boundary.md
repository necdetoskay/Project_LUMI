# Stories Adventure Presentation Boundary

Status: IMPLEMENTATION CONTRACT
Date: 2026-08-14
Parent epic: #159
Implementation issue: #161
Audit: `docs/02-product-design/ui-ux-discovery/stories-ux-v2-current-state-audit.md`

## Purpose

The Stories Adventure Hub must not render story/session/world/NPC/inventory records directly. The child-facing surface consumes a presentation projection whose only job is to expose narrative-ready facts and action references.

Canonical flow:

`domain/application state -> adventure presentation projection -> localized child UI`

The presentation projection is not a new domain model and does not own story truth.

## Core contracts

The first implementation lives in:

`apps/web/lib/stories/adventure-presentation.ts`

### `AdventureSummary`

Represents one story session in child-facing form.

It may expose:

- session action target (`sessionId`);
- story title;
- semantic state: `ongoing`, `completed`, `archived`;
- `playerRecap`;
- current scene title;
- at most a small number of meaningful highlights (location/item/companion/clue);
- presentation image reference.

It must not expose/render:

- raw `sessionStatus`;
- `playbackMode`;
- version number;
- checkpoint;
- world lifecycle state;
- ranking score;
- raw slug/internal display fallback.

### `AdventureHookCandidate`

Represents a read-only possible start point for a new adventure.

Source families are deliberately child-product concepts rather than backend enums:

- `world_event`
- `rumor`
- `inventory_item`
- `npc_call`

The contract contains an opaque candidate id, title, teaser, CTA key and optional presentation image. Internal opportunity evidence, rank and domain metadata remain behind the boundary.

## Source mapping

### Opportunity inbox

Current opportunity types map to presentation families as follows for the initial contract:

- `rumor` -> `rumor`
- `invitation` -> `npc_call`
- `social_visit` -> `npc_call`
- `gift` -> `npc_call`
- other current opportunity types (`warning`, `quest_seed`, `information_share`, future compatible types) -> `world_event` by default until a more specific product policy is defined.

This mapping is presentation policy only. It does not change opportunity domain type or meaning.

Opportunity `score`, expiry mechanics and raw evidence may affect eligibility/ranking upstream but are not rendered.

### Inventory

Only story-selectable inventory from the bounded character-continuity read model is eligible for item candidates. Candidate presentation uses item display name and item visual reference. Rarity/category/definition ids are not child-facing metadata.

### World state

World lifecycle/debug state is not a hook card. A world candidate must be expressed as an actual narrative event/opportunity/meaningful change or a deliberately authored safe fallback. `World <id>`, lifecycle status and checkpoint numbers are forbidden presentation fallbacks.

## Player Recap policy

Machine/session state and player recap are separate concerns.

Initial recap source priority:

1. current/relevant scene `narrativeText`;
2. story-version summary;
3. current scene title;
4. story display title as last-resort fallback.

Narrative text is whitespace-normalized and bounded for card rendering.

This first step is deterministic and cost-free. It does not add a persisted recap column or LLM call.

If product testing shows that a current-scene excerpt does not sufficiently answer “what happened so far?”, a later phase may add a canonical story-commit recap artifact. That decision must preserve provenance and must not make page rendering depend on a live LLM call.

## Semantic session state

Raw session enum is mapped before UI:

- `active`, `paused` and non-terminal compatible states -> `ongoing`
- `completed` -> `completed`
- `abandoned` -> `archived`

The UI chooses localized phrasing and visual treatment. It never renders raw enum values.

## Start intent contract

`AdventureStartIntent` defines the desired application boundary for starting from an optional selected candidate:

- household scope;
- child profile;
- character;
- world;
- story definition/version;
- optional `candidateId`;
- idempotency key.

`AdventureStartResult` returns:

- the created/existing idempotent session id;
- the candidate id actually attached, when applicable.

This contract intentionally does not say that candidate discovery equals acceptance.

## Mutation rule

Candidate discovery is read-only.

The following actions must not mutate opportunity/world/story state:

- opening the New Adventure sheet;
- viewing a candidate;
- switching candidate;
- requesting another candidate set;
- closing/canceling the sheet.

Only an explicit adventure start may cross the mutation boundary.

## Existing opportunity-hook gap

The current opportunity-response endpoint accepts the opportunity before resolving a hook and requires an already-active session. That endpoint is valid for injecting an opportunity into an existing story, but it cannot be used directly as the new-adventure start command.

Phase 3 must implement/extend a canonical orchestration flow equivalent to:

1. validate selected candidate within household/child/character scope;
2. start/reuse the story session idempotently through the existing story session service;
3. attach/materialize the selected candidate/hook after a session identity exists;
4. only then finalize candidate acceptance if required by candidate type/policy;
5. return the session id.

Failure handling must avoid a state where an opportunity is consumed but no new story can be entered. Transactional or compensating semantics must be explicit when the participating stores cannot share one transaction.

## Image boundary

Presentation image references are semantic hints, not storage URLs.

Allowed initial kinds:

- story scene;
- environment;
- item;
- NPC;
- character.

A separate resolver should translate that reference to the existing managed media/Story Visual Workspace asset path and fallback chain. UI components should not know storage/provenance internals.

## Localization boundary

Presentation content has two categories:

1. **story content** such as scene narrative, opportunity message and entity display names — already natural-language content;
2. **UI copy** such as source-family labels, CTA labels, empty states — resolved from `next-intl` message catalogs.

The contract uses CTA keys rather than hard-coded Turkish button labels so Phase 4 can enforce TR/EN parity cleanly.

No transliteration helper is allowed for display copy. Slugs can remain ASCII internally but never become presentation labels.

## Tests / hard gates

`apps/web/tests/adventure-presentation.test.ts` covers:

- raw session status -> semantic state;
- narrative-first recap fallback;
- no status/playback/version/checkpoint fields in `AdventureSummary`;
- rumor/NPC opportunity mapping;
- no opportunity score/evidence leakage;
- inventory candidate without rarity/category leakage;
- technical presentation leak guard.

Later integration/E2E phases must additionally prove that the live API/UI consumes this boundary rather than recreating raw mapping inside components.

## Follow-up

- #162 consumes `AdventureSummary` for the main Adventure Hub.
- #163 consumes `AdventureHookCandidate` and implements the start orchestration.
- #164 supplies localized source/CTA labels and removes legacy transliterated copy.
- #166 locks the live API/UI behavior with integration/E2E coverage.
