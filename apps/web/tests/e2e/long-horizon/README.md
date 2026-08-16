# LUMI Live Long-Horizon Playwright Acceptance Pack

This directory contains the persistent, browser-only long-horizon acceptance suite tracked by Issue #233.

## Non-negotiable execution contract

The test is a real user journey. Application state may only be created, changed, or inspected through UI controls that a real user can reach in the product.

Forbidden inside this pack:

- Playwright `request` / `context.request` / `APIRequestContext`
- direct REST or server-action calls from test code
- direct database queries, seeds, fixtures, mutations, or cleanup
- mock LLMs, mock OpenRouter servers, fake story hooks, or test-only mutation routes
- direct provider/OpenRouter calls
- fabricating missing item/rumor candidates in the test
- shortening, padding, or otherwise rewriting generated story prose to satisfy assertions

Allowed:

- Playwright `Page`, browser-visible navigation, forms, buttons, dialogs, sheets, and product/admin UI
- browser-observed text/state as assertions and evidence
- test-runner filesystem writes for Markdown/JSON evidence derived from browser-observed values
- screenshots, traces, and videos

If a required action or inspection surface is missing, the acceptance run stops with a prerequisite finding. The missing production UI/flow must be implemented and verified before the run resumes.

## Persistent live data

This suite intentionally leaves created children, characters, worlds, stories, items, NPC state, and relationships in the configured live database. There is no teardown. Every run must have a unique run ID and recorded RNG seed.

## Repeatability

Default child age is 6, but the same scenario must support other ages. Random visible onboarding choices use a recorded seeded RNG so a later comparison run can reproduce the same choice strategy.

After the first baseline run succeeds, the same age/seed/scenario will be repeated with a stronger LLM selected through the product's normal settings UI. The two evidence sets will then be compared for generation quality, continuity, retries, latency, token/cost data where visible, and emergent world/NPC behavior.
