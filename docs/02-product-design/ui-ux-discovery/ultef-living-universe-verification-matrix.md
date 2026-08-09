# ULTEF — LUMI Living Universe Verification Matrix

Status: CANONICAL TEST BACKLOG
Date: 2026-08-09

> Önceki kanonik test aileleri korunur. Bu güncelleme Story Hook & Narrative Opportunity Selection doğrulama ailesini ekler.

## Story hook & narrative opportunity family

- HOOK-ELIGIBILITY-001: prerequisite eksik candidate child-facing opportunity pool'a alınmaz.
- HOOK-KNOWLEDGE-001: child/NPC'nin bilmediği clue/mystery hook olarak erken sızmaz.
- HOOK-LOCATION-001: absent NPC veya invalid location/world state ile contradiction taşıyan hook üretilmez.
- HOOK-TIME-001: time/season/offline-protection koşulları hook eligibility ile tutarlıdır.
- HOOK-ENV-001: environment/weather conditions candidate feasibility ve opportunity context'ine doğru yansır.
- HOOK-CAPABILITY-001: item/experience/NPC support capability prerequisite veya possibility olarak doğru değerlendirilir; olmayan capability uydurulmaz.
- HOOK-URGENCY-001: urgency canonical world/NPC state'e dayanır; Story Director yapay emergency uydurmaz.
- HOOK-DIVERSITY-001: recent-story similarity ve type history tekrarlayan motif/structure seçimlerini baskılar.
- HOOK-SAGA-BALANCE-001: main Saga yüksek relevance taşısa bile her story'yi domine etmez; pacing diversity korunur.
- HOOK-EVERYDAY-001: low-stakes/everyday opportunity yüksek-stakes candidates yanında da uygun zamanda seçilebilir.
- HOOK-RELATIONSHIP-001: relationship/memory callback hook'ları canonical shared history'ye dayanır.
- HOOK-CHILD-INTEREST-001: child interests selection'a bias verir fakat world canon ve diversity'yi override etmez.
- HOOK-DEVELOPMENT-GOAL-001: parent development goal opportunity selection'a hafif/controlled bias verir; didactic overuse oluşturmaz.
- HOOK-CHILD-INTENT-001: free intent canonical feasibility, actor/location availability, time, environment ve safety checks sonrası valid opportunity'ye dönüşebilir.
- HOOK-CHILD-INTENT-REJECT-001: infeasible/free intent sessizce canon dışı gerçekleştirilmez; narrative-safe alternative/reconciliation gerekir.
- HOOK-SURPRISE-001: 'Beni şaşırt' eligible opportunity pool'dan meaningful candidate seçer; random disconnected story üretmez.
- HOOK-LIFECYCLE-001: persistent/transient/child-presence-protected hook lifecycle doğru yaşlanır.
- HOOK-AUTONOMY-001: seçilmeyen hook gerektiğinde NPC/world autonomy ile ilerleyebilir, zayıflayabilir veya sona erebilir; failed-quest semantics oluşmaz.
- HOOK-STALE-001: artık invalid/stale candidate sonraki selection cycle'da yeniden sunulmaz.
- HOOK-CONTRACT-001: seçilen opportunity doğru Narrative Contract'a dönüştürülür ve source world state trace'i korunur.
- HOOK-CONTRACT-KNOWLEDGE-001: Narrative Contract forbidden/authorized knowledge boundaries'i açıkça taşır.
- HOOK-CONTRACT-CONSEQUENCE-001: Narrative Contract consequence boundaries authoritative world-state invariants ile uyumludur.
- HOOK-AGENCY-001: selection system child choice/free intent'i görünmez biçimde overwrite etmez.
- HOOK-TENANT-001: opportunity pool, hook lifecycle ve contract state başka universe/tenant/child'a sızmaz.

## Cross-system hook tests

- NARRATIVE-HOOK-001: Story Planner yalnız selected Narrative Contract içindeki canonical participants/location/state'i başlangıç kabul eder.
- MEM-HOOK-001: retrieved memories candidate relevance'i etkileyebilir fakat unrelated high-salience memory yanlış hook doğurmaz.
- SAGA-HOOK-001: Saga candidate pacing/eligibility kurallarını bypass edemez.
- NPC-HOOK-001: NPC initiative hook'u actor's current goal/location/knowledge ile uyumludur.
- INFO-HOOK-001: rumor/mystery candidate yalnız character knowledge düzeyinde ifade edilir; hidden truth leak olmaz.
- ITEM-HOOK-001: item-driven hook item ownership/location/known-properties ile uyumludur.
- WORLD-HOOK-001: world/environment-driven hook current canonical state'e dayanır; stale world mutation üzerinden candidate oluşmaz.
- FEEDBACK-HOOK-001: learned preferences opportunity weighting'i etkileyebilir fakat safety/canon/diversity constraints'i override etmez.

## L9-NARRATIVE-OPPORTUNITY-100

100+ story boyunca aynı universe içinde eşzamanlı çok sayıda candidate source üretilir: Saga, NPC goals, relationships, promises, rumors, mysteries, weather/environment events, settlement/culture/governance changes, item interactions, memory callbacks, exploration ve everyday life.

Her checkpoint'te ölçülür:

- story-type diversity ve repeated motif rate,
- Saga pacing ve over-selection oranı,
- prerequisite/knowledge leak violations,
- stale hook oranı,
- relationship/everyday/environment-driven story coverage,
- child-interest fit ile overfitting dengesi,
- development-goal overuse/didactic leakage,
- free-intent feasibility/reconciliation doğruluğu,
- 'Beni şaşırt' seçimlerinin canon relevance'i,
- hook lifecycle/autonomous resolution davranışı,
- Narrative Contract completeness ve forbidden-knowledge boundaries,
- tenant isolation ve context/cost growth.

Master acceptance principle: Narrative Director en yüksek tek skoru körlemesine seçmemeli; dünyanın geçmişi, mevcut state'i, child agency'si ve narrative rhythm birlikte korunarak anlatılmaya değer doğru opportunity seçilmelidir.
