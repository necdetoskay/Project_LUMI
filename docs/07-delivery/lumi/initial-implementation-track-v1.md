# Project LUMI — Initial Implementation Track v1

**Status:** Active planning for execution
**Created:** 2026-07-26
**Applies to:** Sprint 01 stabilization and the first working LUMI vertical slice

## Purpose

This track turns the large LUMI plan into a small sequence of testable
implementation checkpoints. It does not replace the canonical Sprint 01-20
plan. It defines the order in which the first setup and early product core
should be implemented and verified.

The goal is to avoid building many isolated systems before the product becomes
visible. The first success target is:

> A parent can run LUMI locally, create or select a child profile, generate a
> seeded character/world origin, start a short interactive story, choose an
> option, and see the result saved.

## Execution Rule

Every checkpoint must leave the repository in a runnable state.

No checkpoint may depend on hidden manual state, uncommitted local changes, or a
future model behaving correctly without validation. If a checkpoint fails, the
next checkpoint does not start.

## Checkpoint Map

| Checkpoint | Source sprint | Working outcome | Required test before moving on |
|---|---|---|---|
| C01 | Sprint 01 | Local repo, web app, PostgreSQL and Redis run cleanly | install, format, lint, typecheck, test, build, health check |
| C02 | Sprint 02 | Parent account and protected app boundary | register, login, logout, `/me`, unauthorized access tests |
| C03 | Sprint 03 | Household and child profile onboarding | create/select/archive child profile, cross-family isolation tests |
| C04 | Sprint 04 | Minimal PostgreSQL domain core | migrations, repositories, transaction and rollback tests |
| C05 | Sprint 06 + Sprint 08 | Character origin and first world/home bootstrap | seed replay test, vector bounds test, ownership/scope tests |
| C06 | Sprint 11 | Prompt registry and Context Builder | deterministic context manifest, token budget, safety precedence tests |
| C07 | Sprint 12 | OpenRouter model routing and first story generation | test provider, one real provider smoke test, schema/safety validation |
| C08 | Sprint 09 + Sprint 10 | Story session, choice and saved consequence | start scene, make choice, save session state, idempotency tests |
| C09 | Sprint 12 + AI docs | AI Generation Harness and quality evaluation lab | eval fixture run, motif repetition check, judge report, release gate |
| C10 | Sprint 15 + Sprint 16 | First interactive story image hotspot layer | render 2-5 hotspots, play approved SFX, mute fallback, responsive tap tests |
| C11 | Sprint 09 + Sprint 10 + Sprint 16 | First story challenge and puzzle encounter layer | render one observation/inventory/empathy challenge, hint fallback, no-lock continuation |

## Recommended First Installation Flow

Start with C01 only. Do not install extra services, create AI provider secrets,
or run migrations beyond the current Sprint 01 runbook until C01 is green.

1. Follow `sprint-01/TOMORROW_INSTALLATION_READINESS_RUNBOOK.md`.
2. Record environment and command results.
3. Fix only setup blockers inside Sprint 01 scope.
4. Commit the verified foundation.
5. Start C02 only after the foundation is stable.

## Early Product Slice

The first visible product slice is deliberately small:

1. Parent auth exists.
2. Child profile exists.
3. The system creates a deterministic `universeSeed`.
4. Seeded vectors create an origin brief.
5. LLM generates candidate origin text.
6. Schema, safety, novelty and coherence validation run.
7. Accepted origin creates the first character and starting world/home record.
8. A first short story scene is generated.
9. The child chooses one option.
10. The selected outcome is saved as session state.
11. A story image can show a small number of validated interactive hotspots.
12. Tapping a hotspot can play a safe local SFX or reveal a short discovery
    detail without changing canonical world state directly.
13. A story node can include one short validated challenge encounter with a
    success, assisted and alternate continuation path.

This slice is enough to test whether LUMI feels alive before NPC autonomy,
economy, culture, politics, advanced memory, media, or background simulation are
implemented.

## AI Harness Position

The AI system is not a direct "call model and show result" layer.

The implementation order must preserve this boundary:

```text
Child Profile
Parent Policy
World State
Universe Seed
    |
Seeded Vector Bootstrap
    |
Prompt Registry + Context Builder
    |
LLM Candidate Generation
    |
Schema, Safety, Canon and Novelty Validation
    |
Quality Evaluation Harness
    |
Accepted Story or Controlled Retry
```

A strong reviewer model may evaluate outputs and propose prompt, model routing
or scoring improvements. It may not silently change production prompts, safety
policy, schemas or canonical world state. Those changes require an explicit
human approval gate.

## Model Strategy for the First Slice

The first implementation should support provider-neutral routing even if only
one provider is configured locally.

Initial model roles:

| Role | Candidate model |
|---|---|
| Low-cost draft and variation generation | `deepseek/deepseek-v4-flash` |
| Higher quality origin/world planning | `deepseek/deepseek-v4-pro` or `google/gemini-2.5-flash` |
| Schema-critical validation and repair | `openai/gpt-4.1-mini` |
| Warm story tone comparison | `anthropic/claude-haiku-4.5` |

Production defaults must be selected by evaluation results, not price alone.

## Quality Gates

Before any model becomes the default for children, it must pass:

- schema-valid output rate;
- safety pass rate;
- originality score;
- richness score;
- coherence score;
- story continuation score;
- motif repetition threshold;
- cost and latency ceiling;
- human review sample.

Cheap output is not accepted if it repeatedly produces generic, forced or thin
stories.

## Stop Conditions

Stop implementation and update the active delivery notes if any of these occur:

- the app cannot be started from a clean checkout;
- database migrations require destructive local changes;
- auth or profile isolation fails;
- model output cannot be parsed or validated reliably;
- generated origins repeat the same motifs above the accepted threshold;
- story choice persistence creates duplicate or conflicting state;
- safety policy requires a product decision not already documented.

## Deferred Until After the First Slice

The following systems remain important but must not block the first visible
product slice:

- NPC Emergent Interaction Engine;
- Story Outcome and World State Commit System;
- civilization, economy, politics and culture simulation;
- long offline world simulation;
- image, TTS and ambient audio generation;
- advanced interactive image hotspots beyond the first simple SFX/discovery
  layer;
- advanced story challenge and puzzle encounters beyond observation, inventory
  and empathy;
- advanced parent analytics;
- multi-story long-term arc planning.
