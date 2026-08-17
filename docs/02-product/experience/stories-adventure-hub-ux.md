# Stories Adventure Hub UX

Status: CANONICAL PRODUCT CONTRACT
Date: 2026-08-17
Parent epic: #159
Documentation phase: #167

## Purpose

Stories is the child-facing Adventure Hub. It must translate story/session/world context into an understandable narrative surface rather than expose orchestration metadata.

The canonical child journey is:

`open Stories -> continue an ongoing adventure OR open New Adventure -> choose a narrative hook -> explicitly start -> enter the story session`

This document defines the product/UX contract. The domain and presentation boundary is defined separately in `docs/04-architecture/story-experience/stories-adventure-presentation-boundary.md`.

## Information architecture

The Stories surface has three conceptual areas:

1. **Adventure header** — `<Character>'s Adventures`, short guidance and a prominent New Adventure action.
2. **Ongoing adventure** — one featured continuation card when an active/paused story exists.
3. **Past adventures** — child-friendly historical cards when there is meaningful history.

Technical session metadata is never a fourth information area. Status enums, playback mode, version, checkpoint, ids, slugs, ranking scores and internal timestamps are orchestration facts, not child UI.

## Ongoing adventure

The featured card should answer four child-facing questions:

- What adventure am I in?
- What happened recently?
- What meaningful place/person/item/clue matters now?
- How do I continue?

Use the canonical `AdventureSummary` projection. Prefer an existing ready story/scene image and the managed fallback chain. The recap is player-facing narrative, not a rendering of machine/session state.

The primary action is a semantic button/link that resumes the canonical story session.

## Past adventures

Past adventures use the same presentation boundary and child-facing naming rules. Completed/archived semantics may influence grouping, but raw status labels are not rendered.

If no meaningful past adventures exist, hide the section or use a light first-adventure encouragement. Do not render empty technical containers.

## New Adventure sheet

Opening New Adventure is read-only. It does not consume opportunities, mutate the world or create a session.

Desktop/tablet uses a right-side sheet while the Adventure Hub remains visible behind it. Mobile uses a full or near-full-screen sheet.

The sheet presents narrative candidates from four initial source families:

- **world_event** — “Something Happened in the World” / “Dünyada Bir Şey Oldu”
- **rumor** — “You Heard a Rumor” / “Bir Söylenti Duydun”
- **inventory_item** — “An Item in Your Bag” / “Çantandaki Bir Eşya”
- **npc_call** — “A Call from Someone” / “Birinden Gelen Çağrı”

Each candidate contains a natural title, short teaser, localized CTA and optional managed image. Backend source enums, evidence, ranking and technical identifiers remain behind the presentation boundary.

“Show other adventures” refreshes/rotates the read-only candidate set. Refreshing or closing the sheet does not create a session.

Only an explicit candidate CTA crosses the mutation boundary and calls the canonical start-adventure orchestration with an idempotency key.

## Player recap contract

Player recap and machine/session state are separate concerns.

The current deterministic fallback order is:

1. relevant/current scene narrative text;
2. story-version summary;
3. current scene title;
4. story display title.

Card text is whitespace-normalized and bounded. Rendering the page must not require a live LLM call. A persisted recap artifact can be introduced later only through a separate provenance-aware design if deterministic quality becomes insufficient.

## Visual language

Stories remains inside the established LUMI shell and uses the approved warm child-book language:

- warm cream surface;
- teal/mint primary accents;
- warm gold/orange emphasis for the principal New Adventure action;
- rounded cards, restrained borders and soft shadow;
- illustrations support comprehension and atmosphere rather than dominate copy.

The surface must feel like part of LUMI, not a parallel theme.

## Loading, empty and error states

Loading uses stable skeleton/card geometry to minimize layout shift.

When there is no ongoing adventure, the primary empty state invites the child to begin a new adventure. When there are no past adventures, the history section may remain hidden.

When no hook candidates are available, show friendly narrative copy and a retry/refresh action. Internal error messages, stack traces, database text or technical source names must never reach the child UI.

## Accessibility

Primary Stories flows must be keyboard operable on desktop.

The New Adventure sheet must:

- expose a dialog semantic;
- have an accessible close button name;
- place focus predictably when opened;
- trap Tab/Shift+Tab within the dialog;
- close on Escape on desktop;
- restore focus to the opening trigger after close.

Interactive cards use semantic controls. Decorative images/icons are hidden from accessibility APIs; meaningful images receive appropriate alternative semantics.

## Responsive contract

Desktop may use wide featured cards and multi-column historical cards. Tablet reduces ratios and allows the sheet to occupy most of the viewport.

At mobile width:

- content reflows to one column where needed;
- the sheet is full/near-full screen;
- actions remain reachable without horizontal scrolling;
- touch targets remain usable;
- the existing LUMI mobile shell/nav behavior is preserved.

**360px is a governed acceptance viewport.** `documentElement.scrollWidth` and `body.scrollWidth` must not exceed the viewport for the tested Stories path.

## Localization and display-name rules

UI copy comes from canonical `next-intl` TR/EN catalogs. Story/entity content keeps its natural Unicode text.

Hard rules:

- do not transliterate Turkish display copy;
- preserve `ğ, ı, ş, ç, ö, ü` and other Unicode characters;
- slugs/internal ids may remain ASCII internally but must never be used as display labels;
- source-family labels and CTAs are localized presentation copy, not backend enum rendering.

## Implementation references

The final implementation is represented by the phase issues under #159, including #160–#166. The browser closeout and responsive acceptance landed through PR #277, including the explicit 360px overflow regression and governed Stories browser gate.

## Test contract

The canonical regression/gate mapping is documented in `docs/06-testing/evidence/stories-ux-v2-regression-matrix.md`.

A change to Stories is incomplete when it changes these UX contracts without updating the corresponding deterministic tests and documentation.
