# LUMI Test Lab — Execution Order

Parent epic: #291

1. #292 — experiment contracts, persistence and state-selection invariants
2. #293 — OpenRouter model profiles, pricing and usage-cost accounting
3. #294 — production pipeline adapter + Character Onboarding scenario
4. #295 — Prompt Workspace, revisions and active-vs-draft retesting
5. #296 — stateful multi-story sessions, story length and branch timeline
6. #297 — Evaluation Engine, rubrics, judges and human quality scoring
7. #298 — criterion-targeted Prompt Optimizer and regression loop
8. Automated Journey / cross-model benchmark runner
9. #299 — sandbox promotion, governance and full benchmark UX

## Working rule

Do not build a parallel test generation engine. Test Lab is an orchestration and evidence layer over canonical Prompt Registry, Context Assembly, model gateway, validation and state transition services.

The first implementation proof is #292 and must establish candidate-state isolation and exactly-one-selection semantics before UI-heavy work.
