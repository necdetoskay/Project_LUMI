# LUMI UI/UX Discovery — Decision Register

Status: CANONICAL
Date: 2026-08-09

Bu register, UI/UX Discovery başlangıcından itibaren kabul edilen kararların hızlı indeksidir. Ayrıntılar README ve ULTEF matrix'tedir.

| ID | Decision | Status |
|---|---|---|
| UXD-001..161 | Önceki kanonik UI/UX, living-universe, social, world, information-flow ve narrative-opportunity decisions | ACCEPTED |
| UXD-162 | Selected Opportunity doğrudan prose üretimine gitmez; Narrative Contract -> Story Planner -> Story Generator -> Validation -> Session -> Outcome zinciri kullanılır | ACCEPTED |
| UXD-163 | Narrative Contract canonical participants, location, starting state, actor knowledge boundaries, inventory/capabilities, memories, Saga constraints, tone, age, preferences, story length ve consequence boundaries taşır | ACCEPTED |
| UXD-164 | Story Planner prose yazmaz; opening, beats, decision points, callbacks, clue opportunities, NPC beats ve valid ending ranges gibi yapısal plan üretir | ACCEPTED |
| UXD-165 | Aynı contract birden fazla valid plan üretebilir; diversity kabul edilir fakat bütün planlar canon/safety/quality sınırında kalır | ACCEPTED |
| UXD-166 | Story structures tek problem-combat-reward kalıbına sıkışmaz; exploration, everyday, relationship, mystery, journey, preparation, festival ve Saga gibi farklı arc tendencies desteklenir | ACCEPTED |
| UXD-167 | Choices canonical state'ten doğar; olmayan item, absent NPC, undiscovered route veya unauthorized knowledge seçenek olarak sunulamaz | ACCEPTED |
| UXD-168 | Choices hidden correct-answer pedagogy'ye indirgenmez; parent development goals agency'yi ve meaningful alternatives'i bozmaz | ACCEPTED |
| UXD-169 | Free-text child choice/intent mevcut contract ve canonical feasibility ile reconcile edilerek ilerletilebilir; infeasible intent canon dışı gerçekleştirilemez | ACCEPTED |
| UXD-170 | Story Generator'ın authority'si prose, dialogue, sensory detail ve pacing ile sınırlıdır; core item creation, topology mutation, hidden truth rewrite, relationship/world commit gibi authoritative değişiklikleri yapamaz | ACCEPTED |
| UXD-171 | Generated content Ephemeral Narrative Detail ile Canonical Claim/Proposed Mutation olarak ayrılır; her dekoratif ayrıntı canon'a yazılmaz | ACCEPTED |
| UXD-172 | Generation sonrası deterministic validators item/location/knowledge/timeline/forbidden mutation gibi machine-checkable violations'ı LLM evaluator'dan önce kontrol eder | ACCEPTED |
| UXD-173 | Narrative evaluator coherence, age fit, repetition, childishness/maturity fit, emotional tone, dialogue, choice quality, gamification leakage ve forced moralizing gibi semantik kaliteyi değerlendirir | ACCEPTED |
| UXD-174 | Validation failure'da targeted repair tercih edilebilir; structural/canonical hata büyükse full regeneration uygulanabilir; repair yeni canon violation üretemez | ACCEPTED |
| UXD-175 | Feedback Intelligence ham review'u doğrudan prompt'a yığmaz; structured story-quality preferences Contract/Planner/Generator'a kontrollü bias verir | ACCEPTED |
| UXD-176 | Generated story contract/planner/prompt/model/provider/evaluator/seed/config/repair provenance metadata ile versionlanır ve geriye dönük kalite analizi yapılabilir | ACCEPTED |
| UXD-177 | Story tamamlanmadan authoritative world outcome commit edilmez; active session state ile committed world state ayrıdır | ACCEPTED |
| UXD-178 | Yarım bırakılan story resumable'dır; child doğru session position/state'ten devam eder | ACCEPTED |
| UXD-179 | Active Story Session kullandığı kritik actors/state için bounded reservation/consistency protection taşır; background simulation aynı actor/state'i contradiction'a sürükleyemez | ACCEPTED |
| UXD-180 | Story completion sonrası Outcome Extraction -> Validation -> Authoritative Commit zinciri çalışır; generator prose tek başına world truth değiştirmez | ACCEPTED |
| UXD-181 | Narrative generation pipeline tenant/universe/child isolation, replay/idempotency ve traceability sınırlarını korur | ACCEPTED |

## Change control

Yeni kararlar bu register'a yeni ID ile eklenir; geçmiş karar sessizce değiştirilmez. Değişiklik gerekiyorsa superseding decision kaydı ve ilgili canonical spec/ULTEF test güncellemesi yapılır.
