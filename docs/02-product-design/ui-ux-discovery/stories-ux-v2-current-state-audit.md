# Stories UX v2 — Current-State Repository & Data-Flow Audit

Status: IMPLEMENTATION AUDIT
Date: 2026-08-14
Parent epic: #159
Phase: #160

## Purpose

This audit records the active Stories implementation and the data boundaries available for the child-first Adventure Hub redesign. It exists so implementation can proceed from repository facts instead of conversation history or guessed contracts.

The canonical product rule from the UI/UX discovery baseline still applies: **simulation computes, narrative expresses**. Internal state, enum values, identifiers, checkpoints, ranks and lifecycle details may drive behavior but must not leak into the child-facing Stories surface.

## 1. Canonical active UI path

The current child-profile Stories tab is rendered by:

- `apps/web/app/app/profiles/[childProfileId]/profile-detail-client-page.tsx`
- `apps/web/components/story/profile-stories-section.tsx`
- `apps/web/components/story/story-session-list.tsx`

`ProfileDetailClientPage` selects the `stories` tab and renders exactly one `ProfileStoriesSection`. The character current-life view links to the same route using `?tab=stories`.

For Stories UX v2, this path should remain canonical unless Phase 2 deliberately moves the experience to a new canonical route and removes/replaces the old route in the same change. Do not add `stories-v2`, `legacy-stories`, or parallel route-level implementations.

## 2. Current page behavior and why it feels technical

### Main Stories surface

`ProfileStoriesSection` currently:

- fetches onboarding solely to resolve `householdId`;
- fetches `/api/child-profiles/{id}/stories`;
- renders a generic `Hikayeler` panel;
- renders session cards through `StorySessionList`;
- toggles an inline new-story form instead of a dedicated adventure sheet;
- exposes character selection, playback mode, source selection, recommendation details and story catalog selection in one technical flow.

### Technical metadata leaked to the child UI

`StorySessionList` currently renders:

- raw `sessionStatus`;
- raw `playbackMode`;
- story version number/title;
- exact update timestamp;
- checkpoint timestamp/presence.

These are valid orchestration/debug values but are not child-facing information. Stories UX v2 must replace them with narrative recap, current meaningful place/context and a clear continuation action.

### Technical source fields leaked to the child UI

`/api/child-profiles/{id}/stories` currently constructs presentation copy inside the API route from raw domain values. Examples include:

- world lifecycle status;
- world id fallback (`World <id prefix>`);
- world checkpoint sequence;
- character `homeArchetype`, `characterType`, `subtype`;
- inventory `category`, `rarity`, `quantity`;
- technical source kinds such as `world_state`, `origin`, `inventory`.

This confirms the current route is mixing domain acquisition and user-facing presentation responsibilities.

## 3. Turkish-character root cause

The observed strings such as `Hikaye kaynagi sec`, `Dunya`, `Canta`, `Onerilen`, `esyasi`, `henuz` are not evidence of UTF-8 corruption in storage.

They are currently hard-coded as ASCII/transliterated strings in active source files, notably:

- `apps/web/components/story/profile-stories-section.tsx`
- `apps/web/components/story/story-session-list.tsx`
- `apps/web/app/api/child-profiles/[id]/stories/route.ts`
- surrounding profile-detail UI also contains legacy transliterated strings.

The repository already has `next-intl`, Turkish and English message catalogs, and canonical localized UI patterns. Therefore the Phase 4 fix should primarily:

1. move Stories v2 user-facing strings into the canonical locale catalogs;
2. remove API-generated display sentences;
3. enforce display-name vs slug/internal-id separation;
4. keep the existing mojibake checker as a secondary guard.

Do not treat transliterated source strings as a database migration problem unless later evidence shows persisted user-visible text is also damaged.

## 4. Existing story/session data

The story package already provides a mature session foundation.

### Available now

- story definitions and published versions;
- story scenes with `title` and `narrativeText`;
- active/paused/completed/abandoned session state;
- current scene;
- scene visits;
- session participants;
- checkpoints;
- playback mode;
- story event history;
- canonical session start/resume/advance/complete/abandon flows.

The canonical start boundary is `startSession` through `POST /api/stories/{storyId}/sessions`. Session start is idempotent and already prevents a second active/paused session for the same child/world.

### Implication for Stories UX v2

Do **not** replace the story/session domain. Build a child-facing read projection on top of it.

## 5. Current data -> Adventure Hub mapping

| UX need | Status | Current source | Phase-1 treatment |
| --- | --- | --- | --- |
| Character name | AVAILABLE | character/profile application services | Use canonical display name |
| Active/continuable adventure | AVAILABLE | child-profile sessions / story session service | Filter session states into child-facing `ongoing` semantics |
| Story title | AVAILABLE | definition/version | Prefer canonical definition/version display title |
| Current scene title | AVAILABLE | session playback/current scene | Useful context, not sufficient alone as recap |
| Current scene narrative | AVAILABLE | `story_scenes.narrativeText` / reader graph | Candidate recap input |
| Recent scene history | AVAILABLE | scene visits | Candidate recap input; bounded/recent only |
| Player recap | DERIVABLE, NOT YET CANONICAL | current scene narrative + recent visits + story context | Add presentation projection/fallback; persistence decision deferred |
| Last meaningful location | DERIVABLE | canonical world current location + scene metadata/context | Prefer canonical display name; define precedence in Phase 1 |
| Important item/clue | AVAILABLE/PARTLY DERIVABLE | story-selectable inventory + scene/story context | Select only contextually meaningful item; never show rarity/category as UX metadata |
| Past adventures | AVAILABLE | sessions by child profile | Define child-friendly completed/archive grouping and recap fallback |
| Story/scene illustration | AVAILABLE WITH FALLBACK | Story Visual Workspace / managed assets / manifest | Resolve ready story scene first, then related environment/item/NPC, then fallback |
| World/context candidate | AVAILABLE | world/current location + opportunities | Present as adventure teaser, not lifecycle state |
| Rumor candidate | AVAILABLE | opportunity inbox / rumor flow | Map to child-facing rumor hook |
| NPC invitation/call | AVAILABLE | opportunity inbox types | Map invitation/social visit/information share/etc. to child-facing NPC hook |
| Inventory-item candidate | AVAILABLE | character continuity / inventory | Read-only candidate selection; bootstrap wiring still needed |
| New hook -> new session | GAP | existing opportunity response expects an active session | Add canonical bootstrap orchestration in Phase 1/3 |
| Alternate suggestions | PARTLY AVAILABLE | ranked opportunities + inventory/world candidates | Add read-only candidate paging/rotation; do not mutate world on refresh |

## 6. Inventory continuity is already story-safe

`getCharacterContinuitySnapshot(householdId, childProfileId, characterId)` already returns a bounded, scoped, prompt-safe read model. Its inventory list is limited to active item definitions explicitly marked `isStorySelectable`.

This is a better source for `Çantandaki Bir Eşya` adventure candidates than exposing arbitrary raw inventory rows.

Presentation rules:

- show `displayName` and relevant visual;
- teaser should explain what makes the item interesting **in story terms**;
- `rarity`, category, internal item definition id and quantity should not be prominent child-facing hook metadata;
- selection is read-only until the user explicitly starts the adventure.

## 7. Opportunity / rumor / NPC hook foundation

The repository already has a persistent opportunity inbox:

- `GET /api/interactions/opportunities` lists proposed opportunities for the child;
- opportunity records carry type, natural-language message, evidence, score, expiry and source NPC;
- supported opportunity-to-scene mapping includes `rumor`, `gift`, `warning`, `invitation`, `quest_seed`, `social_visit`, `information_share`.

This can supply several Stories UX v2 source families:

- `rumor` -> **Bir Söylenti Duydun**;
- `invitation`, `social_visit`, selected information/gift/warning cases -> **Birinden Gelen Çağrı**;
- `quest_seed`, selected warning/information cases -> **Dünyada Bir Şey Oldu** or another narrative category based on evidence/presentation policy.

The opportunity `score` can help rank candidates but must never be rendered.

## 8. Critical bootstrap gap: opportunity acceptance assumes an active story

The current `POST /api/interactions/opportunities/{opportunityId}/respond` flow performs the following on `accepted`:

1. marks the opportunity accepted;
2. resolves the child/character/world;
3. requires `getActiveSessionForChildAndWorld(...)`;
4. returns `404 Child has no active story session` if no active session exists;
5. only then creates a `StoryHook` attached to that session.

This is valid for injecting an opportunity into an **existing** story, but it cannot directly implement the new UX:

`choose event/rumor/NPC -> start a new adventure`.

### Required architectural correction

Stories UX v2 needs one canonical start-orchestration boundary that can:

1. load/validate the selected read-only adventure candidate;
2. choose/resolve the story definition/version or generation strategy;
3. start the new session using the existing `startSession` contract;
4. attach/materialize the selected hook/context after a session identity exists, preferably transactionally/idempotently where boundaries permit;
5. navigate to the new session.

Opening the sheet, refreshing candidates, closing it, or previewing a hook must **not** accept an opportunity or mutate world/session state.

Phase 1 must define this contract; Phase 3 will wire the UI to it.

## 9. Story visuals are reusable; new generation is not a prerequisite

The Story Visual Workspace already loads a visual manifest by session id with a fallback to story-definition id and tracks:

- character requirements;
- item requirements;
- environment requirements;
- story-scene illustrations;
- readiness/reused/generating/failed/missing states.

Therefore the Adventure Hub should consume a small presentation-oriented asset resolver rather than rendering the visual-management workspace or forcing new image generation.

Recommended presentation fallback order:

1. ready illustration for current/relevant story scene;
2. ready story environment/location visual;
3. relevant item or NPC visual for a hook card;
4. canonical character/world visual when semantically appropriate;
5. LUMI story fallback artwork.

Generation cost/policy remains outside the basic page-render path.

## 10. Canonical presentation boundary to add

The current API should not keep emitting user-facing sentences from lifecycle/category/rarity/internal fields.

Phase 1 should introduce or reuse a server-side projection/read-model boundary conceptually equivalent to:

```ts
type AdventureHubView = {
  character: AdventureCharacterSummary;
  ongoingAdventure: AdventureSummary | null;
  pastAdventures: AdventureSummary[];
  adventureCandidates: AdventureHookCandidate[];
};
```

The exact names must follow existing package conventions after implementation inspection; the important boundary is:

`domain/application state -> server presentation projection -> localized UI`.

The projection may retain internal refs required for actions, but components must not render them.

### AdventureSummary should contain only presentation-ready facts

Candidate fields:

- session id/action target;
- child-facing title;
- 2–4 sentence recap;
- meaningful location display name when known;
- one meaningful clue/item/companion when known;
- resolved presentation image reference/fallback state;
- semantic continuation state (ongoing/completed/archive), not raw enum copy.

### AdventureHookCandidate

Candidate fields:

- opaque candidate/action id;
- presentation source family;
- title;
- teaser;
- localized CTA key/value;
- resolved image;
- internal source reference kept server/action-side;
- optional rank used only before presentation.

## 11. Player recap recommendation

There is no confirmed canonical persisted `playerRecap` field in the current session read model.

A safe Phase-1 first step is a deterministic bounded fallback built from repository facts, for example:

1. story title/current scene title;
2. current scene `narrativeText` or a bounded recent-scene summary source;
3. recent visit context;
4. canonical current location when it is semantically consistent;
5. unresolved hook/choice context when available.

Do not add a database column merely to make the UI possible. Persisted/generated recap can be added later if deterministic recap quality is insufficient or if recap generation becomes part of story commit semantics.

## 12. Past-adventure semantics

Current `listSessionsForChildProfile` returns session-oriented records; the current UI treats every session similarly.

Stories UX v2 should present:

- one active/paused adventure as the featured continuation when present;
- completed/abandoned historical sessions under `Geçmiş Maceralar` according to a child-friendly policy;
- no raw status label.

If abandoned sessions should be hidden, renamed or separately archived, that product rule must be explicit in Phase 1 rather than inferred from enum values inside a component.

## 13. Authorization and mutation boundaries to preserve

Existing routes already enforce parent/household/child ownership. The redesign must preserve these boundaries.

Hard rules:

- no raw household/child/session query may widen scope;
- candidate discovery is read-only;
- only explicit adventure start performs session/hook mutation;
- idempotency remains mandatory on session start;
- UI ranking never becomes authorization;
- internal ids may be carried as action references but never displayed.

## 14. Canonical files/services likely to change

### Phase 1 — presentation/data boundary

- `apps/web/app/api/child-profiles/[id]/stories/route.ts` — likely replace/refactor mixed raw/presentation response;
- story/profile/world/NPC application read services as needed;
- a new canonical presentation module only if no existing read-model location fits;
- tests for the projection contract.

### Phase 2 — main Adventure Hub

- `apps/web/components/story/profile-stories-section.tsx` — canonical replacement/redesign;
- `apps/web/components/story/story-session-list.tsx` — remove or reduce to a child-facing presentation component; do not retain competing old cards;
- `apps/web/app/app/profiles/[childProfileId]/profile-detail-client-page.tsx` only as needed for integration/shell/localization.

### Phase 3 — New Adventure sheet

- canonical Stories component/sheet;
- a new start-orchestration API/application boundary or carefully extended existing story-start route;
- opportunity/inventory candidate adapters without mutating during discovery.

### Phase 4 — localization

- `apps/web/messages/tr.json`;
- `apps/web/messages/en.json`;
- removal of active hard-coded/transliterated Stories copy.

### Visual resolver

Reuse existing media/Story Visual Workspace application services. Do not make the child page depend on the admin/visual-management UI itself.

## 15. Known legacy/adjacent surface risk

`profile-detail-client-page.tsx` itself still contains numerous pre-localization transliterated Turkish strings outside Stories. That is broader than #159.

For #159:

- all Stories v2 copy and any shell copy directly touched by the new experience must use canonical localization;
- unrelated profile-page localization debt should not silently expand this epic unless it blocks the experience;
- if needed, create a separate follow-up issue instead of hiding unrelated scope inside Stories UX v2.

## 16. Phase 0 decision summary

### Available and reusable

- canonical story sessions and Story Reader;
- current scene + narrative text + visits;
- canonical world/current-location display names;
- bounded story-selectable inventory continuity;
- persistent opportunity inbox for rumor/NPC/world-like hooks;
- StoryHook system;
- Story Visual Manifest/Workspace and managed assets;
- next-intl TR/EN infrastructure;
- ownership/idempotency guards.

### Must be built/refactored

- one child-facing Adventure Hub read projection;
- deterministic Player Recap fallback;
- story-relative meaningful location/item selection policy;
- read-only adventure candidate projection/ranking;
- start-new-session + selected-hook orchestration;
- new Adventure Hub UI and sheet;
- canonical Stories localization.

### Must not be carried forward

- technical session metadata cards;
- raw playback/status/version/checkpoint UI;
- `World <id>` display fallback;
- lifecycle/checkpoint/source-matching explanations;
- category/rarity/subtype/home-archetype debug-style copy;
- API-side transliterated presentation sentences;
- parallel legacy/v2 route implementations.

## 17. Handoff to Phase 1 (#161)

Phase 1 can now proceed without rediscovering repository structure.

Recommended first implementation slice:

1. define a tested child-facing `AdventureSummary` projection from existing session/playback data;
2. define a tested read-only `AdventureHookCandidate` projection from opportunities + story-selectable inventory + world context;
3. specify the start-orchestration input/output contract without changing UI yet;
4. prove technical fields/slugs cannot appear in presentation output;
5. add TR/EN message keys consumed later by the UI only after the presentation contract is stable.

## Tracking

- Parent epic: #159
- Phase 0: #160
- Next: #161
- Main UI: #162
- New adventure sheet: #163
- Localization: #164
- States/a11y: #165
- Tests: #166
- Canonical docs: #167
- Stabilization: #168
