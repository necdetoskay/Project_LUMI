# Discovery → Implementation → ULTEF Traceability Contract

Status: CANONICAL PROCESS RULE
Date: 2026-08-09

## Purpose

LUMI discovery kararlarının sohbet geçmişinde kaybolmasını engellemek ve implementation sırasında tasarım niyetinin bozulmadığını kanıtlamak.

## Required chain

Her yeni davranış aşağıdaki zincire sahip olmalıdır:

1. Product/UX decision ID
2. Canonical domain behavior
3. Hard invariants
4. Known failure modes
5. ULTEF scenario IDs
6. Implementation owner/module/sprint
7. Production wiring evidence
8. Regression/long-horizon coverage when relevant

Bir halkası eksikse davranış 'fully complete' değildir.

## Evidence classes

### Deterministic evidence
Schema, ownership, authorization, topology, chronology, idempotency, replay, tenant isolation gibi kesin kurallar mümkün olduğunca deterministic assertions ile doğrulanır.

### DB-backed integration evidence
Outbox/worker/state commit/retrieval/grant gibi gerçek production zincirleri gerçek persistence boundary üzerinden test edilir. Fake in-memory başarı production proof sayılmaz.

### Narrative evaluator evidence
Coherence, age fit, naturalness, gamification leakage, didactic tone, memory misuse, character voice, Saga continuity gibi semantik kalite rubric/evaluator ile ölçülür.

### Adversarial/fault evidence
Duplicate events, stale/replay requests, unauthorized grants, wrong-tenant data, conflicting memories, impossible topology, hidden knowledge injection ve partial generation failures özellikle enjekte edilir.

### Long-horizon evidence
Bir özelliğin tek story'de doğru olması yeterli değilse 10/25/50/100+ story checkpoints kullanılır. Drift, context growth, continuity ve cross-engine interactions izlenir.

## Current discovery coverage map

| Area | Decision IDs | ULTEF family |
|---|---|---|
| Auth / Parent UX | UXD-001..010 | UX-* |
| Character / Origin / Visual | UXD-011..016 | UX-CHARACTER, visual consistency future family |
| Replay | UXD-017 | UX-REPLAY, ITEM-REPLAY, idempotency |
| Living Saga | UXD-018..021 | NARRATIVE-SAGA, MEM-SAGA, TIME-SAGA, WORLD-SAGA |
| Story Reader / Media | UXD-022..024 | NARRATIVE-*, UX-MEDIA-OPTIONAL |
| Feedback | UXD-025..026 | FEEDBACK-* |
| Environment | UXD-027..028 | WEATHER-*, ECO-*, ITEM-CAP/ALT |
| Memory | UXD-029..033 | MEM-* |
| Growth | UXD-034 | GROWTH-* |
| NPC/World Evolution | UXD-035..036 | NPC-*, WORLD-PERSIST/OFFLINE/CAUSALITY, SIM-* |
| Time | UXD-037..039 | TIME-* |
| Weather/Ecology | UXD-040..042 | WEATHER-*, ECO-* |
| Progressive World | UXD-043..050 | WORLD-* |
| Item Lifecycle | UXD-051..056 | ITEM-* |
| Test governance | UXD-059..060 | L9 master program |

## Sprint completion gate

Design -> implement -> run ULTEF -> fix -> rerun -> CI/Security/Integration/PX/required L9 green -> document evidence -> COMPLETE -> merge.

Bu süreç, yalnız kodun varlığını değil tasarlanan davranışın production zincirinde gerçekleştiğini kanıtlamayı hedefler.

## Discovery update rule

Yeni bölüm konuşulurken kararlar geçici olarak discovery notes olabilir. Bölüm üzerinde mutabakat oluştuğunda:

- decision-register güncellenir,
- ilgili canonical spec genişletilir,
- ULTEF matrix'e testler eklenir,
- mevcut implementation ile gap varsa backlog/sprint trace eklenir.

Böylece chat hiçbir zaman tek source of truth olmaz.
