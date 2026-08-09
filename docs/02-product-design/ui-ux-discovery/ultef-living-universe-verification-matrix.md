# ULTEF — LUMI Living Universe Verification Matrix

Status: CANONICAL TEST BACKLOG
Date: 2026-08-09

> Önceki kanonik test aileleri (Memory, Growth, Relationships, World Evolution, Time, Weather/Ecology, Progressive World, Item, Feedback, Narrative ve UI/UX) korunur. Bu güncelleme autonomous NPC life test ailesini genişletir.

## Autonomous NPC goals, routines & social events family

- NPC-GOAL-001: aynı long-term goal farklı canonical koşullarda farklı geçerli yollarla ilerleyebilir; scripted quest chain'e kilitlenmez.
- NPC-GOAL-CANON-001: NPC goal ilerlemek için topology, time, ownership, world state veya protected narrative invariant'ı ihlal edemez.
- NPC-GOAL-OFFLINE-001: child yokken uygun non-critical goal kontrollü ilerleyebilir; child-presence-required kritik arc tamamlanamaz.
- NPC-ROUTINE-001: routine bir tendency'dir; weather, event, need, relationship veya active goal tarafından doğal biçimde değişebilir.
- NPC-LOCATION-001: NPC'nin current canonical location'ı child-facing encounter ile tutarlıdır; NPC sırf story istedi diye teleport olmaz.
- NPC-KNOWLEDGE-001: NPC decision sırasında bilmediği canonical world fact'i kullanmaz.
- NPC-BELIEF-001: yanlış belief/rumor NPC davranışını etkileyebilir fakat world truth'u mutate etmez.
- NPC-PERSONALITY-001: personality karar distribution/eğilimini etkiler fakat aynı trait her durumda aynı eylemi zorlamaz.
- NPC-EMOTION-001: emotion/stakes/context personality tendency'yi makul biçimde değiştirebilir.
- NPC-INITIATIVE-001: urgency + relationship + relevance yeterliyse NPC child'a kendisi ulaşabilir.
- NPC-PACING-001: autonomous initiative/events child-facing notification/story-hook spam oluşturmaz.
- NPC-SOCIAL-001: child olmadan meaningful NPC-NPC social event oluşabilir ve significance policy'ye göre persist edilir.
- NPC-SOCIAL-FILTER-001: önemsiz günlük etkileşimler gereksiz canonical event/memory büyümesi oluşturmaz.
- NPC-SOCIAL-KNOWLEDGE-001: child bulunmadığı private NPC-NPC event'i otomatik öğrenmez.
- NPC-RUMOR-001: event bilgisi NPC'ler arasında yayılırken fact/observation/report/rumor ayrımı ve provenance korunur.
- NPC-RUMOR-DRIFT-001: rumor değişebilir/bozulabilir fakat değişmiş rumor canonical fact olarak overwrite edilmez.
- NPC-FAILURE-001: NPC goal başarısız olabilir; failure valid state transition ve future narrative consequence üretir.
- NPC-FAILURE-GAME-LEAK-001: NPC failure child UI/story'de quest failed/stat loss dili olarak sızmaz.
- NPC-RESOLUTION-001: düşük relevance/influence NPC'ler gereksiz yüksek simulation resolution/cost tüketmez.
- NPC-TENANT-001: autonomous event, goal, routine, rumor ve knowledge başka household/universe/child boundary'sine sızmaz.
- L9-NPC-AUTONOMOUS-LIFE: 100+ story/world-time boyunca çoklu NPC goals, routine deviations, NPC-NPC events, rumors, failures, initiative ve offline progression çalıştırılır; identity, location, chronology, knowledge provenance, relationship continuity, tenant isolation, pacing ve simulation cost doğrulanır.

## Cross-system additions

- NARRATIVE-NPC-LOCATION-001: Story Generator canonical NPC location ile çelişen encounter uydurmaz.
- NARRATIVE-NPC-KNOWLEDGE-001: NPC dialogue yalnız NPC-authorized knowledge/beliefs/memories üzerinden bilgi verebilir.
- REL-AUTONOMOUS-001: autonomous NPC-NPC event relationship evidence oluşturduğunda source event trace korunur.
- MEM-NPC-AUTONOMOUS-001: autonomous event yalnız olaya katılan/öğrenen aktörlerde uygun memory/knowledge üretir.
- TIME-NPC-CAUSAL-001: routine, travel, rumor propagation ve social events temporal causality'yi ihlal etmez.
- WORLD-NPC-TRAVEL-001: NPC movement world topology/travel constraints ile uyumludur.

## Long-horizon master program additions

10 -> 25 -> 50 -> 100+ story/world-time checkpoints artık ayrıca şunları ölçer:

- NPC goal progress without scripted convergence
- routine diversity without identity drift
- canonical NPC location continuity
- autonomous social-event significance filtering
- private-event knowledge isolation
- rumor provenance and distortion safety
- initiative frequency/pacing
- NPC failure and recovery consequences
- simulation-resolution/cost growth

Master acceptance principle değişmez: ayrı motorların PASS olması yeterli değildir; birleşik yolculukta sistemlerin birbirini bozmadığı kanıtlanmalıdır.
