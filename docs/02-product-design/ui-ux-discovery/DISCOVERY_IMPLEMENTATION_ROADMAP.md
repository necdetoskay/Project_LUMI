# LUMI Discovery -> Implementation Roadmap

Status: CANONICAL
Date: 2026-08-09

## Rule

Her sprint: implementation + ilgili ULTEF family + production evidence + regression. Master ULTEF ayrı bir final entegrasyon sprintinde bütün motorları birlikte doğrular.

## Sprint sequence

| Sprint | Scope | Primary ULTEF |
|---|---|---|
| S39 | Canonical Recovery & Discovery Consolidation | documentation coverage audit |
| S40 | Visual UX Foundation & Auth/Public Experience | UX-AUTH, UX-RESPONSIVE, accessibility baseline |
| S41 | Parent Home & Child Profile Experience | UX-PARENT, UX-PROFILE, development-goal persistence |
| S42 | Character Creation, Origin & Visual Canon | UX-CHARACTER, visual identity consistency, origin continuity |
| S43 | Current-Life / Şimdi / Child Navigation Shell | UX-CURRENT-LIFE, canonical location projection, replay read-only |
| S44 | Memory Production Model | MEM-* + L9-MEMORY-JOURNEY |
| S45 | Character Growth & Relationship Evidence | GROWTH-*, REL-* + L9-GROWTH/JOURNEY social |
| S46 | NPC Autonomous Life & Social Events | NPC-* + L9-NPC-AUTONOMOUS-LIFE |
| S47 | Environment, Time, Weather & Ecology | TIME-*, WEATHER-*, ECO-* + mountain storm L9 |
| S48 | Progressive World & Living Map | WORLD-EXPAND/RIVER/COAST/MAP/TXN + L9-PROGRESSIVE-WORLD-100 |
| S49 | Object Lifecycle & Narrative Inventory | ITEM-* + L9-OBJECT-LIFECYCLE-JOURNEY |
| S50 | Settlement, Culture & Governance | SETTLEMENT-*, CULTURE-*, GOV-* + related L9 journeys |
| S51 | Information Flow & Mystery System | INFO-* + L9-MYSTERY-INFORMATION-JOURNEY |
| S52 | Narrative Opportunity Director | HOOK-* + L9-NARRATIVE-OPPORTUNITY-100 |
| S53 | Narrative Contract / Planner / Generator Hardening | CONTRACT/PLAN/CHOICE/GEN/VALIDATE/REPAIR + L9-STORY-GENERATION-PIPELINE |
| S54 | Interactive Session & Choice Resolution | SESSION-* + L9-INTERACTIVE-STORY-SESSION |
| S55 | Outcome / World Commit Integration Expansion | OUTCOME boundary + memory/relationship/knowledge/item/world/Saga commit integration |
| S56 | Feedback Intelligence Production Loop | FEEDBACK-* generation effect/drift/safety |
| S57 | Story Reader / Map / Inventory / Relationships UI | UX reader/map/social/object projections + narrative-first leakage gates |
| S58 | ULTEF Living Universe Long-Horizon Program | 10/25/50/100+ combined master journey |
| S59 | Visual / UX / Accessibility / Responsive Quality Gate | E2E/a11y/responsive/optional-media/no-game-leak final gate |

## Existing implementation overlap

S37 generated-hook -> Story Reader production wiring ve S38 story-template authoring/versioning COMPLETE durumundadır. S53 ve S54 başlamadan önce mevcut story/session implementation ile gap analysis yapılmalıdır; mevcut doğru production wiring yeniden yazılmamalı, yalnız discovery contracts'e göre harden edilmelidir.

## Sprint completion policy

Design/contract -> implementation -> unit/integration -> DB-backed ULTEF where required -> adversarial/fault -> narrative evaluator where required -> CI/Security/Integration/PX green -> sprint closeout evidence -> COMPLETE.

## Long-horizon policy

L9 testleri yalnız S58'e bırakılmaz. İlgili domain sprintinde kendi L9 senaryosu eklenir. S58 bu L9 senaryolarını tek living-universe journey içinde birleştirir.
