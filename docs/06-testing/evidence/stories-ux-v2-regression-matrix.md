# Stories UX v2 Regression Matrix

Status: CANONICAL TEST CONTRACT
Date: 2026-08-17
Parent epic: #159
Documentation phase: #167

## Purpose

This document maps the Stories UX v2 product/architecture contracts to deterministic repository tests and existing gates. It does not introduce a parallel test framework.

Product contract: `docs/02-product/experience/stories-adventure-hub-ux.md`
Architecture contract: `docs/04-architecture/story-experience/stories-adventure-presentation-boundary.md`

## Unit / presentation coverage

`apps/web/tests/adventure-presentation.test.ts` protects the server/presentation boundary, including:

- raw session state -> child-facing semantic state;
- narrative-first player recap fallback;
- technical metadata omission;
- source-family presentation mapping;
- opportunity score/evidence non-leakage;
- inventory candidate technical-field non-leakage;
- technical presentation leak guards.

These tests must fail if raw status/playback/version/checkpoint-like metadata, technical source labels or internal presentation fallbacks reappear.

## Integration contract

The Stories application/API path must preserve these behaviors:

- active/paused story can be resumed using the canonical session target;
- opening/closing New Adventure is read-only;
- refreshing candidates is read-only;
- explicit candidate selection sends the scoped start-adventure payload;
- start includes an idempotency key;
- selected candidate is attached to the canonical start flow;
- cancel/close does not create a session.

Integration coverage remains attached to the repository’s existing application/package test suites. New Stories work should extend those suites rather than create a second integration harness.

## Governed browser E2E

`apps/web/tests/e2e/stories-ux-v2.spec.ts` is the canonical browser closeout coverage introduced by PR #277.

It uses deterministic API fixtures plus the real browser/application shell and verifies:

### Turkish desktop

- child reaches the canonical Stories tab;
- empty/no-active-adventure state is child-facing;
- New Adventure opens as a dialog;
- close control receives focus;
- TR source-family labels are presented through candidate cards;
- candidate refresh returns the next deterministic set;
- Escape closes the dialog;
- focus returns to the trigger.

### English 360px mobile

- EN Adventure Hub copy is rendered;
- the 360px page has no horizontal overflow;
- New Adventure remains usable at 360px;
- world-event, inventory and NPC source-family presentation is visible;
- the dialog focus trap wraps correctly with Shift+Tab/Tab;
- explicit world-event selection sends the expected candidate id and scoped start payload;
- successful start navigates to the returned story session.

The test intentionally checks both `document.documentElement.scrollWidth` and `document.body.scrollWidth` against `window.innerWidth` so shell-level regressions cannot be hidden by clipping an inner Stories component.

## Browser gate

The governed workflow is `.github/workflows/stories-ux-v2-browser-e2e.yml`.

The gate uses:

- disposable PostgreSQL;
- auth migrations;
- profile migrations;
- Stories-path typecheck;
- Playwright Chromium;
- the canonical Stories UX v2 browser spec.

The workflow must remain a PR gate using the existing Playwright stack. Do not replace it with a separate browser framework for Stories.

## General repository gates

Stories changes are also subject to the existing repository gates:

- CI: format, lint, typecheck, tests, load smoke and production build/artifact build;
- ULTEF PR Fast Gate;
- ULTEF Merge Gate;
- Security Scan, including secret scanning and container scanning.

Security reporting endpoints are not themselves product-security evidence. A transient GitHub comment/SARIF ingestion outage must not invalidate a completed local scan; the security workflow therefore retries/tolerates reporting-only failures while preserving the actual scanning steps.

## Required regression expectations

A Stories UX change must not be merged when it causes any of the following:

- technical metadata or slug/internal-id labels become child-visible;
- Turkish Unicode display copy is transliterated;
- New Adventure candidate discovery mutates story/world/opportunity state;
- close/focus/Escape behavior regresses;
- primary desktop flow loses keyboard operability;
- 360px horizontal overflow returns;
- start-adventure loses scoped candidate/idempotency payload behavior;
- relevant package/app suites fail.

## Phase closure evidence

PR #277 closed the remaining Phase 5/6 browser and responsive gaps. Its final head passed:

- Stories UX v2 Browser E2E;
- ULTEF PR Fast Gate;
- ULTEF Merge Gate;
- Security Scan;
- CI validate and artifact build.

Issues #165 and #166 were closed as completed after that acceptance audit.
