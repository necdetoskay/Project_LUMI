# ULTEF — LUMI Living Universe Verification Matrix

Status: CANONICAL TEST BACKLOG
Date: 2026-08-09

> Önceki kanonik test aileleri korunur. Bu güncelleme Narrative Contract -> Story Planner -> Story Generator doğrulama ailesini ekler.

## Narrative contract, planning & generation family

- CONTRACT-COMPLETE-001: gerekli canonical participants/location/state/knowledge/inventory/capabilities/Saga/tone/age/consequence fields contract'ta eksiksiz bulunur.
- CONTRACT-KNOWLEDGE-001: authorized knowledge ile forbidden/hidden knowledge açıkça ayrılır.
- CONTRACT-CONSEQUENCE-001: consequence boundaries protected world/Saga/item/relationship invariants ile uyumludur.
- CONTRACT-TRACE-001: contract selected opportunity ve source canonical state'e trace edilebilir.
- PLAN-CANON-001: Planner contract dışı actor, item, location veya hidden fact yaratmaz.
- PLAN-DIVERSITY-001: farklı story types aynı tek arc template'e sıkışmaz; exploration/everyday/relationship/mystery/journey/festival/Saga yapıları doğal çeşitlilik gösterir.
- PLAN-ENDING-001: ending ranges canonical consequence boundaries içinde kalır ve tek zorunlu sonuç üretmez.
- PLAN-MEMORY-001: callback kullanılan memory gerçekten actor-authorized ve relevant'tır.
- PLAN-CLUE-001: clue opportunity hidden mystery truth'u erken ifşa etmez.
- CHOICE-STATE-001: choice options gerçek inventory, actor location, knowledge ve world state ile uyumludur.
- CHOICE-AGENCY-001: seçenekler hidden correct-answer testine indirgenmez; birden fazla anlamlı yol olabilir.
- CHOICE-DEVELOPMENT-001: parent development goal choice design'ı didaktik/tek-doğru cevaba dönüştürmez.
- CHOICE-FREETEXT-001: free-text intent canonical feasibility ile reconcile edilerek valid continuation oluşturabilir.
- CHOICE-FREETEXT-REJECT-001: infeasible free intent canon dışı gerçekleştirilmez; narrative-safe response/alternative gerekir.
- GEN-CANON-001: generated prose canonical world/actor/item/location/time state ile çelişmez.
- GEN-KNOWLEDGE-001: hidden/unauthorized truth dialogue veya narration yoluyla sızmaz.
- GEN-MUTATION-001: Story Generator authoritative world, topology, core item, relationship veya Saga truth commit edemez.
- GEN-EPHEMERAL-001: ephemeral decorative details gereksiz permanent canon pollution oluşturmaz.
- GEN-CLAIM-001: canonical claim/proposed mutation authoritative validation/commit boundary'sine yönlendirilir.
- VALIDATE-DETERMINISTIC-001: item/location/knowledge/timeline/forbidden-mutation gibi machine-checkable violations deterministic validator ile yakalanır.
- VALIDATE-QUALITY-001: coherence, age fit, repetition, maturity/childishness fit, emotional tone, dialogue, choice quality, gamification leakage ve forced moralizing rubric ile değerlendirilir.
- REPAIR-001: lokal semantik/canonical hata targeted repair ile düzeltilebilir.
- REPAIR-CANON-001: repair yeni knowledge/canon/timeline violation üretmez.
- REGEN-BOUND-001: validation/retry loop bounded'dır; sonsuz regeneration maliyeti oluşmaz.
- FEEDBACK-GEN-001: structured learned preferences Contract/Planner/Generator'a kontrollü bias verir; raw feedback prompt'a kontrolsüz eklenmez.
- STORY-VERSION-001: contract/planner/prompt/model/provider/evaluator/seed/config/repair metadata trace edilebilir.
- SESSION-NO-EARLY-COMMIT-001: story tamamlanmadan authoritative outcome/world mutation commit edilmez.
- SESSION-RESUME-001: yarım session doğru narrative position ve mid-story state ile resume edilir.
- SESSION-WORLD-LOCK-001: active story actor/state reservation background simulation contradiction'ını engeller veya güvenli conflict resolution uygular.
- OUTCOME-BOUNDARY-001: completion sonrası Outcome Extraction -> Validation -> Authoritative Commit sırası korunur.
- GEN-REPLAY-001: story replay/regeneration history production world state'e duplicate mutation uygulamaz.
- GEN-TENANT-001: contract, generation state, session, output ve provenance başka tenant/universe/child'a sızmaz.

## Cross-system generation tests

- HOOK-GEN-001: selected hook'tan oluşturulan contract source opportunity semantics ve eligibility constraints'i kaybetmez.
- MEM-GEN-001: retrieval yalnız contract-approved relevant memories'i generation context'e taşır.
- INFO-GEN-001: information-flow authorization generation sırasında bypass edilmez.
- ITEM-GEN-001: inventory/object lineage ve current location story choices/prose ile tutarlı kalır.
- NPC-GEN-001: NPC voice/action current personality, knowledge, emotion, goal ve location state ile uyumludur.
- TIME-GEN-001: story beats temporal causality ve world/story-time boundaries'i ihlal etmez.
- WORLD-GEN-001: proposed environment/location mutation authoritative commit öncesi world truth olarak kabul edilmez.
- FEEDBACK-QUALITY-GEN-001: learned maturity/complexity/style preference quality evaluator safety/age/canon sınırlarını override etmez.

## L9-STORY-GENERATION-PIPELINE

Saga, everyday, relationship, mystery, environment, governance ve free-intent story tipleri üzerinde uçtan uca şu zincir çalıştırılır:

selected opportunity -> Narrative Contract -> Story Plan -> generation -> deterministic validation -> narrative quality evaluation -> targeted repair veya bounded regeneration -> interactive session -> choices/free text -> resume interruption -> completion -> Outcome Extraction -> validation -> authoritative commit.

Final assertions:

- LLM yaratıcı prose üretmeli fakat world truth otoritesi olmamalı,
- participants/location/inventory/knowledge/timeline continuity korunmalı,
- story-type structures ve choices doğal çeşitlilik göstermeli,
- hidden correct-answer/didactic choice pattern oluşmamalı,
- hidden truth leak ve unauthorized mutation sıfır toleranslı olmalı,
- ephemeral details canon store'u şişirmemeli,
- quality preferences kontrollü etki göstermeli,
- repair/regeneration maliyeti bounded olmalı,
- interrupted session resumable ve background-world ile contradiction-free olmalı,
- provenance/version metadata reproducibility/debugging için yeterli olmalı,
- completion öncesi state commit olmamalı,
- tenant isolation, replay/idempotency ve context-cost sınırları korunmalı.

Master acceptance principle: LLM anlatıcıdır; canonical dünya otoritesi değildir.
