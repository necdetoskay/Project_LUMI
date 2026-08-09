# ULTEF — LUMI Living Universe Verification Matrix

Status: CANONICAL TEST BACKLOG
Date: 2026-08-09

> Önceki kanonik test aileleri korunur. Bu güncelleme Politics, Governance & Community Decision-Making doğrulama ailesini ekler.

## Governance & community decision family

- GOV-IDENTITY-001: settlement governance norms/structure long horizon'da random drift etmez; değişim canonical history/evidence ile açıklanır.
- GOV-AUTHORITY-001: formal authority, popularity ve social influence birbirine yanlışlıkla eşitlenmez.
- GOV-ISSUE-INFLUENCE-001: expertise/issue-specific influence yalnız ilgili decision context'inde ağırlık oluşturur.
- GOV-DECISION-001: community decision participating actors'ın goals, roles, knowledge, relationships, expertise ve culture context'iyle açıklanabilir.
- GOV-CHILD-AGENCY-001: child öneri/kanıt/ikna ile decision'ı etkileyebilir fakat settlement child option'ına otomatik itaat etmez.
- GOV-CHILD-IMPACT-001: child contribution tamamen anlamsız da değildir; uygun evidence/support ile outcome veya solution set'i değiştirebilir.
- GOV-DISSENT-001: farklı makul görüşler antagonist/düşman üretmeden coexist edebilir.
- GOV-MEMORY-001: geçmiş community decisions ve sonuçları sonraki ilgili decision context'ini etkileyebilir; source history korunur.
- GOV-COMMIT-001: accepted decision world mutation gerektiriyorsa Approved Community Action -> authoritative World Commit üzerinden gerçekleşir.
- GOV-NO-LLM-MUTATION-001: Story Generator kendi başına governance result veya world-state mutation commit edemez.
- GOV-ROLE-CHANGE-001: leadership/responsibility role change canonical cause/history gerektirir ve chronology ile tutarlıdır.
- GOV-CULTURE-001: farklı communities farklı decision norms taşıyabilir; governance behavior ilgili cultural canon ile uyumludur.
- GOV-KNOWLEDGE-001: decision actor bilmediği canonical fact'i reasoning sırasında kullanmaz.
- GOV-RUMOR-001: rumor/belief decision'ı etkileyebilir fakat canonical fact olarak değerlendirilmez; provenance/confidence korunur.
- GOV-CONSEQUENCE-001: committed community decision sonraki world/story state'te gerçek, traceable consequence oluşturur.
- GOV-TRADEOFF-001: bir community priority seçimi başka non-critical action'ın gecikmesi gibi makul trade-off üretebilir; aşırı economy simülasyonu gerekmez.
- GOV-GAME-LEAK-001: authority/influence/faction/reputation değerleri child UI/story'de strategy-game score olarak sızmaz.
- GOV-AGE-001: disagreement, fairness, favoritism ve power temaları child age/safety policy'ye uygun anlatılır.
- GOV-TENANT-001: governance state, decision history, influence graph ve community actions başka universe/tenant'a sızmaz.

## Cross-system governance tests

- MEM-GOV-001: governance memory collective history ile actor-specific memory'yi yanlış merge etmez.
- NPC-GOV-001: NPC governance preference personality/role/knowledge/culture ile uyumludur fakat deterministic faction script'e dönüşmez.
- CULTURE-GOV-001: cultural norms governance behavior'ı etkileyebilir fakat individual dissent'i imkânsız hale getirmez.
- WORLD-GOV-COMMIT-001: community action world topology/location/settlement state mutation yapıyorsa existing world invariants ve transaction boundary korunur.
- TIME-GOV-001: proposal, discussion, decision ve consequence temporal causality sırasını ihlal etmez.
- KNOWLEDGE-GOV-001: private/unknown information meeting/dialogue sırasında magical broadcast olmaz.
- NARRATIVE-GOV-001: governance conflict exposition/politics lecture yerine age-appropriate character/community narrative olarak ifade edilir.
- NARRATIVE-GOV-AGENCY-001: story child'a anlamlı participation verir fakat 'chosen ruler/savior' zorunluluğu yaratmaz.

## L9-COMMUNITY-GOVERNANCE

Yaklaşık bir world-year boyunca bir veya daha fazla settlement'ta şu journey çalıştırılır:

community need -> multiple actor priorities -> incomplete/rumored knowledge -> discussion -> child suggestion/evidence -> support/disagreement -> decision -> approved community action -> authoritative world consequence -> collective/personal memories -> later recurring problem -> changed actors/knowledge -> possible leadership/responsibility change -> second decision with historical context.

Final assertions:

- decisions actor/context/history üzerinden açıklanabilir olmalı,
- authority/social influence/expertise birbirine collapse olmamalı,
- child agency meaningful fakat automatic obedience üretmemeli,
- dissent yaşa uygun ve çok-perspektifli kalmalı,
- committed consequences authoritative world state'te görünmeli,
- Story Generator direct mutation yapmamalı,
- past decisions relevant future reasoning'e taşınmalı,
- leadership changes canonical cause taşımalı,
- knowledge/rumor provenance korunmalı,
- governance culture ile uyumlu fakat NPC individuality'yi ezmemeli,
- game-mechanic leakage, tenant leakage, replay duplication ve temporal causality ihlali olmamalı.

Master acceptance principle: community decisions rastgele LLM improvizasyonu değil, yaşayan topluluğun geçmişi, bilgisi, rolleri, ilişkileri ve değerlerinden doğan açıklanabilir sonuçlar olmalıdır.
