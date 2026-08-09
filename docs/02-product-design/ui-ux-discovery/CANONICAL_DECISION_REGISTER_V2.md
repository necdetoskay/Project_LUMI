# LUMI Discovery — Canonical Decision Register V2

Status: CANONICAL
Date: 2026-08-09
Supersedes for indexing purposes: `decision-register.md`

Bu dosya S39 recovery sonrasında UI/UX Discovery başlangıcından Interactive Story Session tasarımına kadar kabul edilmiş kararların eksiksiz ID indeksidir. Eski commit history recovery source olarak korunur; yeni kararlar bu dosyaya append edilmelidir.

## UX / product foundation

| ID | Decision |
|---|---|
| UXD-001 | Kurumsal dashboard görünümü reddedildi; story-universe-first visual language kullanılır. |
| UXD-002 | Web-first + responsive; native mobile daha sonra ayrı UX olarak değerlendirilir. |
| UXD-003 | 2D illustration + cartoon mixed art direction kullanılır. |
| UXD-004 | Login, register ve forgot-password ayrı tasarımlı deneyimlerdir. |
| UXD-005 | Auth/landing ürünün hikâye değerini anlatır; düz form değildir. |
| UXD-006 | Parent home zengin child profile cards + add-profile yüzeyidir. |
| UXD-007 | Universe yoksa parent home doğal bootstrap guidance sunar. |
| UXD-008 | `Dünyalardan Haberler` living-world summary konsepti kabul edildi. |
| UXD-009 | Child interests generation'a etki eder ve sonradan edit edilebilir. |
| UXD-010 | Parent development goals kontrollü story bias üretir, didaktikleşmez. |
| UXD-011 | Character creation type/traits/home/family/history içerir fakat choice overload yapmaz. |
| UXD-012 | Character origin geçmiş yaşantıyı canon'a bağlar. |
| UXD-013 | Character visual candidates tek kompozisyonda üretilebilir; seçilen identity visual canon olur. |
| UXD-014 | Sonraki character imagery yüksek identity consistency taşır. |
| UXD-015 | Character room sabit oda değil current-life/current-location surface'tir. |
| UXD-016 | Story archive/replay, inventory ve friends/relationships doğal alt yüzeylerdir. |
| UXD-017 | Replay read-only/idempotent; reward/world/memory duplication yasaktır. |

## Living Saga / narrative-first / feedback

| ID | Decision |
|---|---|
| UXD-018 | Living Saga episodic adventures + persistent long arc modelidir. |
| UXD-019 | 10–12 bölüm potansiyeli olabilir ama stories upfront generate edilmez. |
| UXD-020 | NPC/world/events/items future episodes'i mevcut canonical state üzerinden etkiler. |
| UXD-021 | Item veya emergent event yeni Saga seed oluşturabilir. |
| UXD-022 | Story quality media özelliklerinden önce gelir. |
| UXD-023 | Page image/audio/hotspot policy ile optional olabilir. |
| UXD-024 | LUMI oyun hissi vermemeli; simulation görünmez, narrative görünür. |
| UXD-025 | Story/image rating + optional reason feedback intelligence'a beslenir. |
| UXD-026 | Feedback safety/canon'u override edemez; tek feedback aşırı drift yaratmaz. |

## Environment / memory / growth / time / world / item foundation

| ID | Decision |
|---|---|
| UXD-027 | Location/environment narrative-relevant internal state/capabilities taşır. |
| UXD-028 | Item etkileri vektörel/contextual olabilir; item success guarantee değildir. |
| UXD-029 | Memory full transcript değil distilled meaningful memories kullanır. |
| UXD-030 | Working/active/deep + episodic/semantic memory separation uygulanır. |
| UXD-031 | World truth, character knowledge, NPC knowledge, beliefs ve memories ayrıdır. |
| UXD-032 | Aynı event actor-perspective memories üretebilir. |
| UXD-033 | Memory retrieval relevance/importance/auth + token budget ile sınırlıdır. |
| UXD-034 | Growth: Story -> evidence/memory -> pattern -> gradual change zinciridir. |
| UXD-035 | NPC/world child yokken kontrollü yaşar; critical story child olmadan bitmez. |
| UXD-036 | Simulation relevance/influence resolution ile maliyet kontrollüdür. |
| UXD-037 | Real Time / World Time / Story Time ayrıdır. |
| UXD-038 | Yaklaşık 10 günlük offline rule hard cutoff değil attenuation curve olarak yorumlanır. |
| UXD-039 | Temporal causality hard invariant'tır. |
| UXD-040 | Weather canonical state'tir; narrative dramatik ihtiyaç için hava uydurmaz. |
| UXD-041 | Ecology çoğunlukla aggregate state'tir; significance kazanan entity persistent olabilir. |
| UXD-042 | Environment mutation authoritative outcome/world commit gerektirir. |
| UXD-043 | Map knowledge states UNKNOWN/RUMORED/REVEALED/DISCOVERED olarak ayrılır. |
| UXD-044 | Unknown map fog; rumor belirsiz marker/question concept ile gösterilebilir. |
| UXD-045 | Progressive world horizontal + vertical expansion destekler. |
| UXD-046 | Map image source of truth değildir; topology canon source of truth'tur. |
| UXD-047 | Boundary contracts river/coast/mountain/road continuity sağlar. |
| UXD-048 | Old maps/rumors world truth'tan ayrılabilir ve yanlış olabilir. |
| UXD-049 | Saga narrative reservations future generation'ı constrain edebilir. |
| UXD-050 | World expansion transactional validation sonrası commit edilir. |
| UXD-051 | Item inventory slot değil persistent canonical object'tir. |
| UXD-052 | Ownership ile location ayrı state'lerdir. |
| UXD-053 | Situation -> capability possibilities kullanılır; single-required-item puzzle yaklaşımı reddedildi. |
| UXD-054 | Item lineage repair/transformation/transfer boyunca korunur. |
| UXD-055 | Protected narrative/core items random simulation ile yok olmaz. |
| UXD-056 | Item history/emotional significance future narrative'i etkileyebilir. |
| UXD-057 | What-if mode ayrı backlog konusudur. |
| UXD-058 | SaaS commercialization ayrı gelecek değerlendirmesidir. |
| UXD-059 | Her accepted behavior ULTEF scenario/invariant ile eşleştirilir. |
| UXD-060 | 10/25/50/100+ story Living Universe long-horizon verification programı kabul edildi. |

## Relationships & social life

| ID | Decision |
|---|---|
| UXD-061 | Relationship bir puan değil shared history/evidence ile oluşan living social bond'dur. |
| UXD-062 | Relationship state çok boyutlu olabilir; trust/affection/respect/comfort/resentment vb. child UI'a sayısal sızmaz. |
| UXD-063 | Relationship changes Story -> Outcome -> Shared Memory -> Relationship Evidence zincirinden doğar. |
| UXD-064 | Aynı olay aktörlerce farklı yorumlanabilir; intention ile NPC interpretation ayrıdır. |
| UXD-065 | NPC-NPC relationships child dışında da değişebilir ve emergent narrative source olabilir. |
| UXD-066 | Family relationships richer initial shared-history/memory/routine context ile başlar. |
| UXD-067 | İlişkiler monoton pozitif ilerlemek zorunda değildir; yaşa uygun kırgınlık/yanlış anlaşılma/rekabet mümkündür. |
| UXD-068 | Promise, gift ve shared memories relationship evidence üretir; quest/reward metriği olarak gösterilmez. |
| UXD-069 | Social UI social graph'ı CRM/stat ekranına dönüştürmeden yakınlık ve ortak geçmişi anlatır. |
| UXD-070 | Relationship state future NPC arc/Saga/story hook doğurabilir fakat child agency'yi zorlamaz. |

## Autonomous NPC life

| ID | Decision |
|---|---|
| UXD-071 | NPC'ler child story başladığında aktive olan props değildir; kendi goals/routines/social life state'leri vardır. |
| UXD-072 | NPC goals long/medium/short/immediate katmanlarında olabilir; goal yön verir, scripted quest chain belirlemez. |
| UXD-073 | NPC Decision Engine personality + memory + emotion + relationships + environment + authorized knowledge + goals üzerinden karar verir. |
| UXD-074 | NPC routines sabit timetable değil context-sensitive tendencies'dir. |
| UXD-075 | NPC canonical konum/state nedeniyle child onu aradığında beklenen yerde olmayabilir; bu her zaman quest'e dönüşmez. |
| UXD-076 | Meaningful NPC-NPC autonomous social events child yokken oluşabilir; önemsiz etkileşimler canonical persistence gerektirmez. |
| UXD-077 | Child bulunmadığı private social event'i otomatik bilmez; observation/report/rumor/discovery gerekir. |
| UXD-078 | Rumor propagation fact -> observation -> report/rumor zincirinde provenance/confidence korur. |
| UXD-079 | NPC initiative mümkündür; urgency/relationship/novelty/pacing ile child'a ulaşabilir, spam engellenir. |
| UXD-080 | NPC kendi goal'ünde başarısız olabilir; failure doğal world/narrative consequence üretir. |
| UXD-081 | NPC world truth'un tamamını kullanamaz; kendi knowledge/beliefs/memories sınırında karar verir. |
| UXD-082 | Personality karar eğilimini etkiler fakat deterministik script değildir. |
| UXD-083 | Autonomous NPC simulation relevance/influence çözünürlüğüne tabidir. |
| UXD-084 | Child-facing NPC state schedule/utility score değil narrative observation olarak ifade edilir. |

## Settlement / community / everyday life

| ID | Decision |
|---|---|
| UXD-085 | Settlement yalnız bina koleksiyonu değildir; narrative-relevant identity, state ve community life taşır. |
| UXD-086 | Settlement vectors child UI/story'ye city-sim stat/score olarak sızmaz. |
| UXD-087 | Functional NPC roles availability/story possibilities'i etkiler; full supply-chain simülasyonu yapılmaz. |
| UXD-088 | Environment/world events settlement needs oluşturabilir; community child olmadan makul recovery gösterebilir. |
| UXD-089 | World continues without child; child contribution outcome'u yine anlamlı biçimde değiştirebilir. |
| UXD-090 | Collective/community memory actor-specific memories'ten ayrıdır. |
| UXD-091 | Festivals/traditions world time, culture, NPC routines, relationships ve memory ile bağlanabilir. |
| UXD-092 | Her community event Saga olmaz; everyday/low-stakes stories first-class narrative type'tır. |
| UXD-093 | Narrative pacing Saga/adventure/everyday/relationship/exploration arasında çeşitlilik gözetir. |
| UXD-094 | Community events farklı significance seviyeleri taşır; her olay permanent memory/story üretmez. |
| UXD-095 | Background community NPC significance kazandıkça persistent NPC'ye terfi edebilir. |
| UXD-096 | Settlement growth/change canonical reason gerektirir. |
| UXD-097 | Economy lightweight: availability, scarcity, local specialty, trade connection, major disruption kadar modellenir. |
| UXD-098 | RPG gold/wealth loop LUMI'nin ana modeli değildir. |
| UXD-099 | Community knowledge magical global broadcast değildir; propagation/provenance gerekir. |
| UXD-100 | Reputation tek puan değildir; known-for, collective impressions ve actor-specific perceptions semantiktir. |

## Culture / traditions / collective identity

| ID | Decision |
|---|---|
| UXD-101 | Culture dekor değil shared norms, traditions, stories, symbols ve meaning-making katmanıdır. |
| UXD-102 | Cultural detail progressive olabilir; bootstrap'ta yalnız temel anchors gerekir. |
| UXD-103 | Recurring traditions world-time ile geri gelir fakat her tekrar aynı story değildir. |
| UXD-104 | Collective/cultural memory historical world truth'tan ayrıdır. |
| UXD-105 | Legend, belief ve cultural interpretation canonical fact değildir. |
| UXD-106 | Culture shared tendency üretir fakat NPC individuality'yi ezmez. |
| UXD-107 | Cultural identity yavaş/evidence-based değişir. |
| UXD-108 | Child küçük ve anlamlı cultural contribution bırakabilir; instant global rewrite yapamaz. |
| UXD-109 | Farklı regions/settlements ayırt edilebilir cultural identities taşır. |
| UXD-110 | Aynı item/event farklı cultures tarafından farklı yorumlanabilir; truth değişmez. |
| UXD-111 | Character origin başlangıç cultural knowledge'ı etkiler; yabancı kültür otomatik bilinmez. |
| UXD-112 | Cultural voice küçük hitap/deyim/sözcük farklarıyla aktarılır; okunabilirlik korunur. |
| UXD-113 | Cultural symbols/food/music/architecture/clothing/local stories narrative/visual identity'yi destekler. |
| UXD-114 | Cultural conflict/generational difference age-appropriate story source olabilir; faction mechanic'e dönüşmez. |

## Governance / community decision-making

| ID | Decision |
|---|---|
| UXD-115 | Governance devlet/politika simülatörü değil community decisions/responsibility/disagreement/consequences katmanıdır. |
| UXD-116 | Farklı communities farklı canonical decision norms/structures taşıyabilir. |
| UXD-117 | Formal authority, social influence, popularity, expertise ve issue-specific influence farklı kavramlardır. |
| UXD-118 | Community decisions actor goals/roles/knowledge/relationships/expertise/culture üzerinden açıklanabilir doğar. |
| UXD-119 | Child decision'ı etkileyebilir fakat settlement otomatik itaat etmez. |
| UXD-120 | Yaşa uygun dissent antagonist gerektirmeden mümkündür. |
| UXD-121 | Accepted decision gerçek consequence üretecekse Approved Community Action -> authoritative World Commit kullanılır. |
| UXD-122 | Story Generator governance decision/world mutation commit edemez. |
| UXD-123 | Governance memory geçmiş decisions/results/evidence'i sonraki context'e taşır. |
| UXD-124 | Leadership/responsibility role change canonical cause/history gerektirir. |
| UXD-125 | Governance norms farklılaşabilir; sistem üstün/aşağı siyasi model öğretmez. |
| UXD-126 | Governance disagreement Saga/everyday hook doğurabilir; child tüm structure'ı tek başına rewrite edemez. |
| UXD-127 | Ağır power/corruption temaları age-appropriateness ve child-safety sınırlarına tabidir. |
| UXD-128 | Child-facing governance technical graph/score değil narrative community life olarak ifade edilir. |
| UXD-129 | Decision actor bilmediği fact'i kullanamaz; rumor/belief truth yerine geçmez. |
| UXD-130 | Governance state/history/influence tenant/universe isolation'ı korur. |

## Information flow / rumors / secrets / mysteries

| ID | Decision |
|---|---|
| UXD-131 | World truth, actor knowledge, belief, rumor ve secret ayrı state/provenance taşır. |
| UXD-132 | Knowledge transfer provenance/source/confidence ile izlenir. |
| UXD-133 | Rumor distortion yaşayabilir fakat canonical world truth'u overwrite edemez. |
| UXD-134 | Secrets context/relationship/promise/fear/uncertainty ile paylaşımı sınırlı information state'idir; numeric unlock değildir. |
| UXD-135 | Confidential info paylaşma/saklama consequences relationship/memory/world üzerinden doğal anlatılır. |
| UXD-136 | Mystery quest log değil clues/memories/items/maps/observations/conflicting claims üzerinden knowledge construction'dır. |
| UXD-137 | Mystery hidden truth veya constraints+unresolved slots ile başlayabilir; resolve anında geçmiş clues ile uyumlu canon olur. |
| UXD-138 | Misbelief/mistaken witness red herring olabilir; deceptive fake-clue spam yapılmaz. |
| UXD-139 | Map states Information System tarafından beslenir; rumor marker gerçek knowledge state'e dayanır. |
| UXD-140 | Information propagation automatic broadcast değildir; recipient context aktarımı etkileyebilir. |
| UXD-141 | Önemsiz rumor retrieval priority kaybedebilir; mystery-critical clues deep memory'den geri çağrılabilir. |
| UXD-142 | Conflicting claims coexist edebilir; evidence olmadan tek fact'e merge edilmez. |
| UXD-143 | Unsafe `trusted adult/parent'tan sakla` secrecy pattern hard invariant ile engellenir. |
| UXD-144 | Information child UI'da technical graph değil dialogue/map/memory/discovery olarak anlatılır. |
| UXD-145 | Backend truth'u bilmek actorların da bildiği anlamına gelmez; authorized reveal gerekir. |

## Story hook / narrative opportunity selection

| ID | Decision |
|---|---|
| UXD-146 | Story Hook quest değil world state içinden doğan narrative opportunity'dir. |
| UXD-147 | Hook sources Saga, NPC goal, relationship, promise, info, environment, settlement, culture, governance, item, growth, memory, exploration ve everyday life olabilir. |
| UXD-148 | Narrative Director tek skor değil çok boyutlu relevance/urgency/novelty/fit/value/penalty/prerequisite sinyalleri kullanır. |
| UXD-149 | Recent-story similarity ve story-type history tekrar motiflerini baskılar. |
| UXD-150 | Main Saga her story'yi domine etmez; pacing diversity korunur. |
| UXD-151 | Urgency yalnız canonical world/NPC state'ten gelir. |
| UXD-152 | Hook eligibility prerequisite/knowledge/actor/location/time/environment/capability checks'ten geçer. |
| UXD-153 | Child-facing hook quest card değil current-world observation şeklinde ifade edilir. |
| UXD-154 | `Beni şaşırt` eligible opportunity pool içinden seçim yapar. |
| UXD-155 | Free intent canonical feasibility ile reconcile edilerek opportunity oluşturabilir. |
| UXD-156 | Hooks persistent/transient/child-presence-protected lifecycle taşıyabilir; seçilmemek failed quest değildir. |
| UXD-157 | Seçilmeyen opportunity autonomy ile ilerleyebilir/zayıflayabilir/sona erebilir. |
| UXD-158 | Selected opportunity doğrudan prose prompt'a gitmez; Narrative Contract'a dönüşür. |
| UXD-159 | Narrative Contract participants/location/state/knowledge/mystery/continuity/capability/tone/interests/goals/length/consequence boundaries taşır. |
| UXD-160 | Opportunity Selection child agency'yi görünmez biçimde overwrite etmez. |
| UXD-161 | Opportunity pool/hook lifecycle tenant/universe/child isolation'ı korur. |

## Narrative Contract / Story Planner / Story Generator

| ID | Decision |
|---|---|
| UXD-162 | Selected Opportunity -> Narrative Contract -> Planner -> Generator -> Validation -> Session -> Outcome zinciri kullanılır. |
| UXD-163 | Narrative Contract canonical state ve knowledge/consequence boundaries'i eksiksiz taşır. |
| UXD-164 | Story Planner prose yazmaz; structural beats/choices/callbacks/clues/end ranges üretir. |
| UXD-165 | Aynı contract birden fazla valid plan üretebilir; diversity canon/safety/quality sınırında kabul edilir. |
| UXD-166 | Story structures tek problem-combat-reward kalıbına sıkışmaz. |
| UXD-167 | Choices canonical state'ten doğar; olmayan item/actor/route/knowledge option olamaz. |
| UXD-168 | Choices hidden correct-answer pedagogy'ye indirgenmez. |
| UXD-169 | Free-text choice/intent canonical feasibility ile reconcile edilir. |
| UXD-170 | Story Generator authority prose/dialogue/sensory detail/pacing ile sınırlıdır; world truth otoritesi değildir. |
| UXD-171 | Ephemeral Narrative Detail ile Canonical Claim/Proposed Mutation ayrılır. |
| UXD-172 | Deterministic validators machine-checkable violations'ı LLM evaluator'dan önce kontrol eder. |
| UXD-173 | Narrative evaluator coherence, age fit, repetition, maturity, tone, dialogue, choice, gamification ve moralizing rubrics kullanır. |
| UXD-174 | Validation failure'da targeted repair veya bounded full regeneration uygulanabilir. |
| UXD-175 | Feedback structured quality preferences olarak kontrollü bias verir; raw review prompt'a yığılmaz. |
| UXD-176 | Story generation contract/planner/prompt/model/provider/evaluator/seed/config/repair provenance ile versionlanır. |
| UXD-177 | Story tamamlanmadan authoritative outcome/world mutation commit edilmez. |
| UXD-178 | Yarım bırakılan story resumable'dır. |
| UXD-179 | Active Story Session kritik actors/state için bounded reservation/consistency protection taşır. |
| UXD-180 | Completion sonrası Outcome Extraction -> Validation -> Authoritative Commit çalışır. |
| UXD-181 | Narrative pipeline tenant isolation, replay/idempotency ve traceability sınırlarını korur. |

## Interactive Story Session / Choice Resolution / Mid-Story State

| ID | Decision |
|---|---|
| UXD-182 | Committed World State ile Story Session State ayrıdır; mid-story değişiklikler completion öncesi world truth değildir. |
| UXD-183 | Choice Resolution doğrudan LLM kararı değildir; canonical/session state + capabilities + environment + knowledge üzerinden resolver çalışır. |
| UXD-184 | Choice outcomes binary success/failure'a indirgenmez; context'e bağlı farklı valid consequences mümkündür. |
| UXD-185 | Free-text literal action ile underlying child intent ayrılabilir ve Intent Interpreter tarafından reconcile edilebilir. |
| UXD-186 | Mid-story learned information önce Session Knowledge'a girer; persistent knowledge completion/outcome validation sonrası commit edilir. |
| UXD-187 | Temporary item state (damage/use/temporary transfer vb.) session içinde izlenir; object lifecycle completion boundary'de canonicalize edilir. |
| UXD-188 | Resumable session temporary state'i korur; explicit abort ayrı safe-abort policy kullanır. |
| UXD-189 | Meaningful choice/location/clue/item transitions sonrası session checkpoints alınabilir ve crash recovery buradan yapılır. |
| UXD-190 | Committed choice history append-only ve continuity-consistent'tır. |
| UXD-191 | Varsa kısa undo window yalnız uncommitted/reversible choice üzerinde çalışır; duplicate/branch corruption oluşturamaz. |
| UXD-192 | Choice consequences immediate ve deferred olarak ayrılabilir. |
| UXD-193 | Deferred consequences structured proposals/evidence olarak saklanır; LLM hafızasına bırakılmaz. |
| UXD-194 | NPC bir consequence'a ancak ilgili bilgi kendisine authorized information flow ile ulaştığında tepki verebilir. |
| UXD-195 | Active-story reservation yalnız gerekli actors/state'i korur; bütün background world gereksiz freeze olmaz. |
| UXD-196 | Uzun real-time aradan sonra resume öncesi contract/world consistency check veya controlled reconciliation yapılır. |
| UXD-197 | Session timeout ile child cezalandırılmaz; long-lived resumability desteklenir. |
| UXD-198 | Session/checkpoint/choice application tenant isolation, retry safety ve idempotency sınırlarını korur. |

## Change control

- Yeni accepted decision yeni UXD ID ile **append** edilir.
- Geçmiş decision sessizce değiştirilmez; superseding decision yeni ID alır ve eski ID'yi referanslar.
- ULTEF mapping `ULTEF_MASTER_CATALOG.md` üzerinden korunur.
- Implementation mapping `DISCOVERY_IMPLEMENTATION_ROADMAP.md` üzerinden korunur.
