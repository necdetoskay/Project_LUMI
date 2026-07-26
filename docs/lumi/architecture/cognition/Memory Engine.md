Memory Engine

Memory Engine’in görevi:

NPC’nin yaşadığı olayları, öğrendiği bilgileri, ilişkisel deneyimleri, sözleri, başarısızlıkları ve duygusal izleri seçerek saklamak; gerektiğinde geri çağırmak ve gelecekteki kararları etkilemek.

Memory Engine bir kayıt arşivi değildir.

Her olay eksiksiz biçimde saklanırsa:

Hafıza büyür
Arama pahalılaşır
Önemli deneyimler görünmez hale gelir
NPC her şeyi hatırlayan yapay bir varlığa dönüşür

LUMI için hafıza:

seçici
öznel
bağlama bağlı
zamanla değişen
kısmen hatalı

olmalıdır.

Temel akış:

Perception / Execution / Consequence / Social Information
                         ↓
                  Memory Candidate
                         ↓
                 Significance Filter
                         ↓
                     Encoding
                         ↓
               Short-Term / Episodic
                         ↓
                   Consolidation
                         ↓
Semantic / Emotional / Relational / Procedural Memory
                         ↓
                Retrieval and Recall
                         ↓
Belief / Goal / Plan / Utility / Identity Updates
1. Memory ile event log ayrımı

Event log:

Dünyada gerçekte ne oldu?

Memory:

NPC neyi algıladı, nasıl yorumladı ve neyi hatırlıyor?

Örnek gerçek olay:

Tilki korktuğu için Mira’dan geri çekildi.

Mira’nın hafızası:

Tilki bana saldırmak üzereydi.

Başka bir gözlemcinin hafızası:

Mira çok hızlı yaklaştığı için tilki korktu.

Aynı event birden fazla farklı memory üretebilir.

Bu nedenle hafıza, dünya gerçeğinin kopyası değildir.

2. Memory türleri

LUMI’de tek memory yapısı yerine birbirine bağlı birkaç hafıza türü kullanılmalıdır.

type MemoryType =
  | "sensory"
  | "working"
  | "episodic"
  | "semantic"
  | "emotional"
  | "relational"
  | "procedural"
  | "prospective"
  | "identity";
3. Sensory memory

Çok kısa süreli algısal izdir.

Bir dal kırılma sesi
Tilkinin hırlaması
Kısa bir ışık
Bir kokunun fark edilmesi
type SensoryMemory = {
  memoryId: string;
  actorId: string;

  modality:
    | "visual"
    | "auditory"
    | "smell"
    | "touch"
    | "taste"
    | "internal";

  rawSignal: unknown;
  intensity: number;
  clarity: number;

  createdAt: number;
  expiresAt: number;
};

Sensory memory çoğu zaman birkaç saniye veya dakika içinde silinir.

Ancak önemli bulunursa working veya episodic memory’ye aktarılır.

4. Working memory

NPC’nin o anda zihninde aktif tuttuğu bilgidir.

Örnek:

Tilki yaralı.
Kardeşim arkamda.
Köye ulaşmak için 30 dakika var.
Çantamda bir elma var.
type WorkingMemoryItem = {
  itemId: string;
  actorId: string;

  contentType:
    | "fact"
    | "goal"
    | "plan_step"
    | "threat"
    | "question"
    | "social_context";

  referenceIds: string[];

  salience: number;
  cognitiveLoad: number;

  createdAt: number;
  lastRefreshedAt: number;
};

Working memory kapasitesi sınırlı olmalıdır.

Yorgunluk, korku ve dikkat dağınıklığı bu kapasiteyi azaltabilir.

5. Episodic memory

Belirli bir zamanda ve yerde yaşanan olayın hatırasıdır.

Geçen sonbaharda yaralı kuşa şifalı otla yardım etmiştim.
type EpisodicMemory = {
  memoryId: string;
  actorId: string;

  eventId?: string;

  occurredAt: number;
  encodedAt: number;

  locationId?: string;
  participantIds: string[];

  perceivedFacts: MemoryFact[];
  interpretations: MemoryInterpretation[];

  actorRole: string;
  actionIds: string[];
  outcomeIds: string[];

  emotionalSnapshot: EmotionVector;

  significance: number;
  vividness: number;
  confidence: number;

  accessibility: number;
  stability: number;

  tags: string[];

  source:
    | "direct_experience"
    | "observation"
    | "reported"
    | "inferred"
    | "imagined";
};
6. Semantic memory

Genelleştirilmiş bilgi ve inançlardır.

Şifalı otlar bazı yaralarda işe yarar.
Tilkiler korktuklarında hırlayabilir.
Köy kapısı gün batımında kapanır.

Semantic memory genellikle birden fazla episodic memory’den oluşur.

type SemanticMemory = {
  memoryId: string;
  actorId: string;

  proposition: string;
  subjectIds: string[];

  confidence: number;
  generality: number;

  supportingMemoryIds: string[];
  contradictingMemoryIds: string[];

  learnedAt: number;
  lastValidatedAt?: number;

  contextLimits: string[];
};

Semantic memory mutlaka doğru olmak zorunda değildir.

“Tüm tilkiler tehlikelidir.”

yanlış ama güçlü bir semantic memory olabilir.

7. Emotional memory

Bir olayın ayrıntılarından çok bıraktığı duygusal izdir.

Bu mağara bana korku veriyor.
Şifacının yanında kendimi güvende hissediyorum.
type EmotionalMemory = {
  memoryId: string;
  actorId: string;

  triggerPattern: MemoryTriggerPattern;

  emotionVector: EmotionVector;

  intensity: number;
  persistence: number;
  generalization: number;

  supportingEpisodeIds: string[];

  lastActivatedAt?: number;
};

Karakter olayın ayrıntılarını unutsa bile duygusal izi taşıyabilir.

Nedenini tam hatırlamıyorum ama bu patikayı sevmiyorum.

Bu LUMI için çok değerli bir davranış üretir.

8. Relational memory

Bir karakterle ilgili yaşanmış sosyal deneyimleri taşır.

Arda zor durumda bana yardım etmişti.
Şifacı verdiği sözü tutmadı.
Avcı gerçeği benden sakladı.
type RelationalMemory = {
  memoryId: string;
  actorId: string;
  targetActorId: string;

  interactionType: string;

  perceivedIntent: string;
  outcomeValence: number;

  trustEvidence: number;
  loyaltyEvidence: number;
  careEvidence: number;
  threatEvidence: number;

  importance: number;
  confidence: number;

  sourceEpisodeIds: string[];
};

Relationship State yalnızca toplam trust değeri tutmamalıdır.

Bu toplamın altında hangi deneyimlerin bulunduğu da açıklanabilmelidir.

9. Procedural memory

Bir şeyin nasıl yapılacağını temsil eder.

Yaralı hayvana doğrudan yaklaşmadan önce yiyecek bırak.
Köyün kuzey yolundan geçerken bataklıktan uzak dur.
Şifacıyı ikna etmek için yaralanmanın ayrıntılarını anlat.
type ProceduralMemory = {
  memoryId: string;
  actorId: string;

  skillId?: string;
  planPatternId?: string;

  situationPattern: string;
  procedureSteps: string[];

  confidence: number;
  proficiency: number;

  successCount: number;
  failureCount: number;

  contextConstraints: string[];
};

Plan Engine ve Action Generator bu hafızadan yararlanır.

10. Prospective memory

Gelecekte yapılması gereken şeyi hatırlamaktır.

Köye ulaşınca şifacıya tilkiden bahset.
Gün batımından önce eve dön.
Üç gün sonra yarayı tekrar kontrol et.
type ProspectiveMemory = {
  memoryId: string;
  actorId: string;

  intentionId?: string;
  linkedGoalId?: string;
  linkedCommitmentId?: string;

  trigger:
    | TimeTrigger
    | LocationTrigger
    | PersonTrigger
    | EventTrigger
    | ConditionTrigger;

  intendedAction: string;

  importance: number;
  urgency: number;

  status:
    | "pending"
    | "triggered"
    | "completed"
    | "missed"
    | "cancelled";
};

Prospective memory unutulabilir.

Bu durumda karakter verdiği sözü tutmayı istemesine rağmen hatırlamayabilir.

11. Identity memory

Karakterin kendisi hakkında taşıdığı anlatısal hafızadır.

Ben küçük canlıları korurum.
Ben zor durumda kaçmam.
İnsanlara kolay güvenmemeliyim.
type IdentityMemory = {
  memoryId: string;
  actorId: string;

  identityBeliefId: string;
  narrativeStatement: string;

  supportingEpisodes: string[];
  contradictingEpisodes: string[];

  strength: number;
  confidence: number;

  emotionalImportance: number;
};

Identity memory, Trait Evolution ve SelfConcept ile bağlantılıdır.

12. Memory Candidate

Her event doğrudan memory’ye dönüşmemelidir.

Önce aday oluşturulur.

type MemoryCandidate = {
  candidateId: string;
  actorId: string;

  sourceEventIds: string[];

  perceivedFacts: MemoryFact[];
  interpretations: MemoryInterpretation[];

  participantIds: string[];
  locationId?: string;

  emotionalIntensity: number;
  novelty: number;
  goalRelevance: number;
  identityRelevance: number;
  relationshipRelevance: number;
  consequenceMagnitude: number;

  surprise: number;
  personalAgency: number;

  suggestedMemoryTypes: MemoryType[];
};
13. Memory significance

Bir olayın hafızaya dönüşmesi için önem puanı hesaplanabilir.

memorySignificance =
  emotionalIntensity * 0.20 +
  novelty * 0.15 +
  goalRelevance * 0.15 +
  identityRelevance * 0.15 +
  relationshipRelevance * 0.10 +
  consequenceMagnitude * 0.10 +
  surprise * 0.10 +
  personalAgency * 0.05;

Ancak bazı olaylar hard-rule ile hafızaya alınabilir:

Verilen söz
Önemli kayıp
Büyük başarı
İhanet
Ciddi tehlike
Yeni bir kişiyle ilk karşılaşma
Kimlik açısından kritik karar
14. Aynı olay farklı NPC’lerde farklı önem taşır

Örnek:

Mira tilkiye yiyecek bıraktı.

Mira için:

Şefkat ve korku arasında verdiği bir karar.

Kardeşi için:

Mira’nın tehlikeli bir hayvana yaklaştığı korkutucu bir olay.

Avcı için:

Önemsiz veya yanlış bir davranış.

Tilki için:

Açlık ve güvenlikle ilgili kritik deneyim.

Memory significance aktöre göre hesaplanmalıdır.

15. Encoding

Memory encoding, olayın zihinsel temsile dönüştürülmesidir.

Encoding sırasında:

Algılanan gerçekler seçilir
Bazı ayrıntılar kaybolur
Yorumlar eklenir
Duygular güçlü alanları büyütür
Mevcut inançlar olayı çerçeveler
type MemoryEncodingResult = {
  encodedFacts: MemoryFact[];
  encodedInterpretations: MemoryInterpretation[];

  omittedFacts: string[];
  distortedFacts: MemoryDistortion[];

  emotionalBias: EmotionVector;
  encodingConfidence: number;
};
16. Fact ile interpretation ayrımı

Örnek:

Fact:
Tilki dişlerini gösterdi.

Interpretation:
Tilki Mira’ya saldırmak istedi.
type MemoryFact = {
  factId: string;
  proposition: string;

  confidence: number;
  sourcePerceptionId?: string;
};

type MemoryInterpretation = {
  interpretationId: string;
  proposition: string;

  confidence: number;
  supportingFactIds: string[];

  biasSources: string[];
};

Bu ayrım olmazsa yanlış yorumlar dünya gerçeği gibi davranır.

17. Memory source

Hafızanın kaynağı güvenilirlik açısından önemlidir.

type MemorySourceProfile = {
  sourceType:
    | "direct"
    | "heard_from_other"
    | "inferred"
    | "dream"
    | "imagination"
    | "reconstructed";

  sourceActorId?: string;

  sourceTrust: number;
  perceptionQuality: number;
  transmissionAccuracy: number;
};

NPC doğrudan gördüğü bir olaya, söylentiden daha fazla güvenebilir.

Ancak güvenilen kişiden gelen bilgi bazen doğrudan zayıf gözlemden daha etkili olabilir.

18. Consolidation

Kısa süreli memory’lerin uzun süreli hafızaya dönüşmesidir.

Konsolidasyon faktörleri:

Tekrar düşünme
Duygusal yoğunluk
Uyku veya dinlenme
Başkalarına anlatma
Benzer olayların tekrarı
Kimlik bağlantısı
Sonucun sonradan öğrenilmesi
type MemoryConsolidationResult = {
  sourceMemoryIds: string[];

  consolidatedMemoryIds: string[];

  semanticKnowledgeCreated: string[];
  relationalUpdatesCreated: string[];
  proceduralPatternsCreated: string[];
  identityEvidenceCreated: string[];

  stabilityGain: number;
};
19. Tek episodic memory doğrudan genel kurala dönüşmemeli

Örnek:

Bir tilki Mira’yı ısırdı.

Yanlış konsolidasyon:

Tüm tilkiler saldırgandır.

Daha doğru:

Bazı yaralı veya korkmuş tilkiler yaklaşılınca saldırabilir.

Genelleştirme için:

deneyim sayısı
bağlam çeşitliliği
gözlem güveni
karşıt kanıt

değerlendirilmelidir.

type GeneralizationAssessment = {
  supportingEpisodeCount: number;
  contextDiversity: number;
  targetDiversity: number;

  contradictionCount: number;
  confidence: number;
};
20. Memory reinforcement

Bir hafıza tekrar çağrıldığında güçlenebilir.

Mira her benzer olayda yaralı kuşu hatırlıyor.

Bu memory’nin:

accessibility
stability
salience

değerleri artabilir.

Ancak her çağırma memory’yi yalnızca güçlendirmez; yeniden şekillendirebilir.

21. Reconsolidation

Bir memory hatırlandığında mevcut inanç ve duygularla yeniden kaydedilebilir.

Örnek:

İlk memory:

Tilki bana saldırdı.

Daha sonra yeni bilgi:

Tilki yavrularını koruyormuş.

Yeniden yapılandırılmış memory:

Tilkinin saldırgan olduğunu düşünmüştüm ama aslında yavrularını koruyordu.
type ReconsolidationResult = {
  memoryId: string;

  previousInterpretations: MemoryInterpretation[];
  updatedInterpretations: MemoryInterpretation[];

  confidenceChanges: Record<string, number>;

  emotionalToneBefore: EmotionVector;
  emotionalToneAfter: EmotionVector;
};

Bu, karakter gelişimi için güçlü bir mekanizmadır.

22. Memory decay

Tüm memory’ler aynı hızda unutulmamalıdır.

type MemoryDecayProfile = {
  accessibilityDecay: number;
  detailDecay: number;
  emotionalDecay: number;
  confidenceDecay: number;

  stability: number;
};

Zamanla:

Ayrıntılar kaybolabilir
Ana anlam kalabilir
Duygu kalabilir
Kaynak unutulabilir
Zaman bilgisi karışabilir

Örnek:

İlk gün:
Tilki kayanın yanında, sol arka bacağından yaralıydı.

Bir ay sonra:
Ormanda yaralı bir tilkiye rastlamıştım.

Bir yıl sonra:
Bir hayvana yardım etmem gerektiğini hatırlıyorum.
23. Forgetting tamamen silmek değildir

Unutma birkaç biçimde olabilir:

type ForgettingMode =
  | "inaccessible"
  | "detail_loss"
  | "source_loss"
  | "temporal_blur"
  | "semantic_compression"
  | "emotional_residue"
  | "complete_loss";
Inaccessible

Memory vardır ama o anda çağrılamaz.

Detail loss

Ana olay hatırlanır, ayrıntılar kaybolur.

Source loss

Bilgi hatırlanır ama nereden öğrenildiği unutulur.

Temporal blur

Ne zaman yaşandığı karışır.

Semantic compression

Olay genel bir kurala dönüşür.

Emotional residue

Ayrıntı unutulur, duygu kalır.

24. Memory interference

Benzer memory’ler birbirini karıştırabilir.

Mira farklı zamanlarda iki yaralı hayvan gördü.

Sonra:

Hangi hayvanda hangi otu kullandığını karıştırabilir.
type MemoryInterference = {
  memoryAId: string;
  memoryBId: string;

  similarity: number;
  competitionStrength: number;

  distortionRisk: number;
};

Interference türleri:

Eski memory yeni öğrenmeyi bozar
Yeni memory eski memory’yi bozar
Benzer kişiler birbirine karışır
Mekân ve zaman ayrıntıları birleşir
25. False memory

Yanlış memory tamamen rastgele üretilmemelidir.

Şu kaynaklardan doğabilir:

Yanlış algı
Söylenti
Duygusal çarpıtma
Memory interference
Tekrarlanan yanlış anlatım
Kişisel beklenti
Başkalarının yönlendirmesi
type FalseMemoryIndicator = {
  memoryId: string;

  contradictionScore: number;
  sourceWeakness: number;
  reconstructionLevel: number;

  confidenceMismatch: number;
};

Sistem gerçek ile memory arasındaki farkı debug katmanında bilmeli, fakat NPC bilmeyebilir.

26. Trauma-like memory

Çocuk odaklı LUMI’de ağır psikolojik içerikler kontrollü kullanılmalıdır. Ancak güçlü korku deneyimlerinin uzun süreli etkisi modellenebilir.

type HighImpactMemory = {
  memoryId: string;

  involuntaryRecallProbability: number;
  avoidanceTriggerStrength: number;
  emotionalPersistence: number;

  integrationLevel: number;
  recoveryProgress: number;
};

Bu hafızalar:

belirli yerlerde korku
kaçınma
dikkat artışı
yardım arama

üretebilir.

Anlatım çocuk yaşına uygun, güvenli ve umut odaklı tutulmalıdır.

27. Positive emotional memory

Hafıza sistemi yalnızca korku ve zarar üretmemelidir.

Örnek:

Tilki Mira’nın yanına yeniden geldi.

Bu memory:

güven
başarı hissi
şefkat kimliği
gelecekte yardım etme motivasyonu

oluşturabilir.

type PositiveMemoryEffect = {
  confidenceGain: number;
  attachmentGain: number;
  hopeGain: number;
  identityReinforcement: number;
};
28. Memory retrieval

Bir karar sırasında tüm memory’ler aranmaz.

Retrieval cue’lar üzerinden ilgili memory’ler bulunur.

type MemoryRetrievalCue = {
  actorId: string;

  entityIds: string[];
  locationIds: string[];
  eventTypes: string[];

  activeGoalIds: string[];
  emotionVector?: EmotionVector;

  situationTags: string[];
  question?: string;

  timeRange?: {
    from?: number;
    to?: number;
  };
};
29. Retrieval score

Memory çağrılma puanı:

retrievalScore =
  semanticSimilarity * 0.20 +
  entityOverlap * 0.15 +
  locationSimilarity * 0.10 +
  emotionalCongruence * 0.15 +
  goalRelevance * 0.15 +
  recency * 0.10 +
  accessibility * 0.10 +
  identityRelevance * 0.05;

Buna ek olarak:

salience
habitual recall
trigger strength

modifier olarak uygulanabilir.

30. Emotional congruence

Karakterin mevcut duygusu, benzer duygulu memory’leri çağırmayı kolaylaştırabilir.

Korkmuş NPC:

Geçmişteki tehlikeleri daha kolay hatırlayabilir.

Mutlu NPC:

Olumlu ilişkisel memory’leri daha kolay çağırabilir.

Bu şu riski oluşturur:

Korku
→ korkutucu memory
→ tehdit algısının artması
→ daha fazla korku

Runaway loop önlenmelidir.

type RetrievalBiasLimit = {
  maxEmotionBoost: number;
  diversityRequirement: number;
  contradictoryMemoryQuota: number;
};
31. Retrieval diversity

Yalnızca en güçlü benzer memory’ler seçilirse karakter önyargı döngüsüne girer.

Örneğin tilkiler hakkında:

Bir saldırı memory’si
Üç güvenli karşılaşma memory’si

varsa sistem yalnızca saldırı memory’sini getirmemelidir.

Retrieval set’inde:

destekleyen memory
karşıt memory
son deneyim
yüksek önemde memory

çeşitliliği korunabilir.

32. Memory retrieval result
type MemoryRetrievalResult = {
  cue: MemoryRetrievalCue;

  retrievedMemories: {
    memoryId: string;
    score: number;
    retrievalReason: string[];
  }[];

  competingMemories: string[];
  contradictoryMemories: string[];

  retrievalConfidence: number;
  cognitiveCost: number;
};
33. Spontaneous recall

Bazı memory’ler bilinçli arama olmadan tetiklenebilir.

Bir koku
Bir melodi
Bir yer
Bir cümle
Bir yüz ifadesi
type MemoryTriggerPattern = {
  entityTags?: string[];
  sensoryPatterns?: string[];
  locations?: string[];
  phrases?: string[];
  emotionalStates?: string[];
};

Örnek:

Şifalı ot kokusu
→ yaralı kuş memory’si
34. Prospective trigger

Prospective memory uygun bağlam oluşunca working memory’ye taşınır.

Köye giriş
→ Şifacıya tilkiden bahsetmeyi hatırla

Fakat trigger kaçırılabilir.

Faktörler:

Dikkat seviyesi
Yorgunluk
Trigger görünürlüğü
Memory importance
Duygusal yük
Aynı andaki görev sayısı
35. Memory and belief

Memory doğrudan world fact değildir.

Belief Engine memory’leri kanıt olarak kullanır.

Memory
↓
Evidence Weight
↓
Belief Update

Evidence weight:

memoryEvidenceWeight =
  memoryConfidence
  * sourceReliability
  * recallAccuracy
  * contextualSimilarity;

Eski ve çarpıtılmış memory zayıf kanıt olabilir.

36. Memory and Utility Evaluator

Memory, Utility Evaluator’a doğrudan puan vermemelidir.

Bunun yerine şu ara durumları etkiler:

Beklenen sonuç
Risk tahmini
Hedefe güven
İlişki algısı
Duygusal tepki

Örnek:

Geçmişte tilki tarafından ısırılma memory’si

şunları etkiler:

fox threat belief ↑
approach risk ↑
fear ↑
confidence ↓

Sonra Utility Evaluator bunları kullanır.

37. Memory and Goal Engine

Memory yeni hedefleri tetikleyebilir.

Verilmiş söz hatırlandı
→ Sözü tamamlama hedefi aktifleşti

Eski bir haksızlık hatırlandı
→ Telafi veya yüzleşme hedefi oluştu

Kayıp harita işareti hatırlandı
→ Araştırma hedefi yeniden aktifleşti

Memory hedefi doğrudan aktif etmek yerine Goal Seed üretebilir.

38. Memory and Plan Engine

Geçmiş deneyimler plan yöntemlerini etkiler.

Bu köprü geçen yağmurda kapanmıştı.

Plan:

Köprüye güvenme
Alternatif yol hazırla

Procedural memory:

Şifacı yardım istemeden önce yaralanmanın yerini ve ciddiyetini sorar.

Plan:

Önce bilgileri topla
Sonra şifacıya git
39. Memory and Trait Evolution

Tek bir memory trait’i değiştirmez.

Ancak memory’nin:

tekrar çağrılması
reflection sırasında yorumlanması
kimlik anlatısına bağlanması

trait değişimini destekleyebilir.

Örnek:

Mira korkmasına rağmen yardım ettiği anı sık sık hatırlıyor.

Bu memory:

SelfConcept courage ↑
Identity “Ben korksam da yardım ederim.” ↑

etkisi oluşturabilir.

40. Memory and relationship

Relationship State, episodic ve relational memory’lerden türetilmelidir.

relationshipTrust =
  weightedRecentEvidence
  + stableHistoricalEvidence
  + identityExpectations
  + currentEmotionModifiers;

Örnek:

Arda 5 kez yardım etti.
1 kez sözünü tutmadı.

Trust tek olayla tamamen sıfırlanmamalıdır.

Ancak ihanetin önemi çok yüksekse büyük değişim olabilir.

41. Memory attribution

Bir outcome’un kimin davranışından kaynaklandığı yanlış hatırlanabilir.

Örnek:

Köprü aslında fırtına nedeniyle çöktü.

NPC hafızası:

Avcının ağır arabası köprüyü yıktı.

Bu yanlış attribution:

relationship
anger
goal
social rumor

sistemlerini etkileyebilir.

Causal Graph gerçeği bilir, NPC memory bilmeyebilir.

42. Shared memory

Bir grup aynı olayı birlikte yaşamış olabilir.

Ancak bireysel memory’ler farklıdır.

type SharedEventMemoryCluster = {
  eventId: string;
  participantMemoryIds: string[];

  commonFacts: string[];
  disputedFacts: string[];
  interpretationDifferences: Record<string, string[]>;
};

Bu yapı sosyal konuşmalar için değerlidir.

“Ben öyle hatırlamıyorum.”

gibi doğal çatışmalar oluşabilir.

43. Collective memory

Bir topluluk geçmiş olayları ortak anlatıya dönüştürebilir.

Köyü büyük fırtınada Mira kurtardı.

Gerçekte birçok kişinin katkısı olabilir.

type CollectiveMemory = {
  collectiveMemoryId: string;
  groupId: string;

  narrative: string;

  supportingEvents: string[];
  omittedEvents: string[];

  culturalImportance: number;
  accuracy: number;
  stability: number;

  symbolicMeaning: string[];
};

Collective memory:

itibar
kültürel değer
rol beklentileri
sosyal kimlik

üretebilir.

44. Story retelling

Bir memory başkasına anlatıldığında yeni memory’ler oluşur.

Mira olayı anlatır.
Kardeşi dinler.

Kardeş doğrudan event memory’si değil:

reported memory

oluşturur.

Anlatım sırasında:

bazı ayrıntılar atlanabilir
bazıları abartılabilir
anlatıcının duygusu aktarılabilir
type MemoryTransmission = {
  sourceMemoryId: string;

  narratorId: string;
  listenerId: string;

  honesty: number;
  narrativeSkill: number;
  emotionalFraming: number;

  omittedFactIds: string[];
  emphasizedFactIds: string[];

  resultingMemoryCandidateId: string;
};
45. Secret memory

Bazı bilgiler paylaşılmaması gereken memory’lerdir.

type MemorySecrecy = {
  memoryId: string;

  secrecyLevel: number;
  ownerIds: string[];

  disclosureRisks: string[];
  allowedRecipientIds: string[];

  commitmentId?: string;
};

Bir secret memory çağrıldığında Action Generator:

Sırrı söyle
Sakla
Kısmen anlat
Konuyu değiştir

adayları üretebilir.

46. Memory contradiction

Memory’ler birbiriyle çelişebilir.

Memory A:
Şifacı o gün köydeydi.

Memory B:
Şifacı o gün dağdaydı.
type MemoryContradiction = {
  contradictionId: string;

  memoryIds: string[];
  proposition: string;

  severity: number;
  resolvability: number;

  suggestedResolutionActions: string[];
};

NPC şu eylemleri düşünebilir:

Birine sor
Olay tarihini kontrol et
İki memory’nin farklı günlere ait olabileceğini düşün
Belirsizliği kabul et
47. Source monitoring

NPC hatırladığı bilginin kaynağını değerlendirebilir.

Bunu kendim mi gördüm?
Birinden mi duydum?
Sadece tahmin mi ettim?
Rüyada mı gördüm?

Kaynak bilgisi zamanla kaybolabilir.

Bu durumda semantic memory confidence yanlış biçimde yüksek kalabilir.

“Bunu bir yerde duymuştum.”
48. Reflection and memory

Reflection Engine belirli memory’leri birlikte inceleyebilir.

Örnek:

Yardım etmeme kararı
Tilkinin sonradan kötüleşmesi
Suçluluk
Başka bir olayda yardım etme kararı

Reflection sonucu:

“Beklemek bazen zararı büyütüyor.”

semantic memory’si oluşabilir.

Ayrıca:

“Bir dahaki sefere tek başıma yapamıyorsam yardım isteyeceğim.”

procedural memory’si doğabilir.

49. Memory compression

Uzun süreli dünya için milyonlarca episodic memory saklanamaz.

Benzer düşük önem memory’ler özetlenebilir.

Örnek:

Mira son ay boyunca köyde birçok küçük işe yardım etti.
type MemorySummary = {
  summaryId: string;
  actorId: string;

  sourceMemoryIds: string[];

  timeRange: {
    from: number;
    to: number;
  };

  pattern: string;
  dominantThemes: string[];

  emotionalTrend: EmotionVector;
  relationshipTrends: Record<string, number>;

  retainedExceptions: string[];
};

Önemli episodic memory’ler ayrı kalır.

Rutin olaylar summary’ye sıkıştırılır.

50. Memory hierarchy

Önerilen saklama yapısı:

Raw event log
    ↓
Per-actor encoded memories
    ↓
Episodic memory
    ↓
Memory clusters
    ↓
Semantic / relational / procedural summaries
    ↓
Identity narrative

Bu yapı sayesinde:

ayrıntı gerektiğinde episodic memory
hızlı karar için semantic memory
karakter gelişimi için identity memory

kullanılabilir.

51. Salience budget

Her NPC’nin her zaman aktif memory sayısı sınırlı olmalıdır.

Örnek:

Working memory: 5–9 öğe
Active retrieved episodic memory: 3–8
Decision context memory: en fazla 6
Reflection context memory: en fazla 12

Karakter kapasitesine göre değişebilir.

52. Retrieval budget

Her karar döngüsünde tam memory araması yapılmamalıdır.

Önerilen katmanlı retrieval:

1. Working memory
2. Active emotional and relational summaries
3. Semantic memory
4. Yüksek alakalı episodic memory
5. Gerekiyorsa derin retrieval

Bu performansı korur.

53. Memory indexleri

Memory Engine için mantıksal indexler:

actor
entity
location
event type
goal
emotion
relationship
time
identity theme
plan method
semantic concept

Teknik implementasyon daha sonra belirlenebilir.

RAG kullanılmasa bile domain içi yapılandırılmış retrieval yapılabilir.

Bu retrieval:

vektör veritabanı zorunlu değildir

Kural, tag, graph ve ağırlıklı benzerlik üzerinden çalışabilir.

54. Hafıza vektörleri

Kullanıcının “her şey vektör olsun” yaklaşımına uygun olarak memory tek importance sayısına indirgenmemelidir.

type MemorySignificanceVector = {
  emotional: number;
  survival: number;
  social: number;
  relationship: number;
  identity: number;
  goal: number;
  novelty: number;
  learning: number;
  narrative: number;
};

Retrieval context bu vektöre göre farklı memory’leri öne çıkarabilir.

Örneğin:

Tehlike kararı:
survival ve emotional yüksek memory’ler

Sosyal karar:
relationship ve social yüksek memory’ler

Planlama:
learning ve goal yüksek memory’ler
55. Memory emotional vector

Memory yalnızca “pozitif veya negatif” olmamalıdır.

type MemoryEmotionVector = {
  fear: number;
  joy: number;
  sadness: number;
  anger: number;
  guilt: number;
  pride: number;
  trust: number;
  affection: number;
  relief: number;
  surprise: number;
};

Aynı memory birden çok duygu taşıyabilir.

Mira tilkiyi kurtardı:
korku + şefkat + rahatlama + gurur
56. Memory certainty vector

Tek confidence değeri yerine:

type MemoryCertaintyVector = {
  factConfidence: number;
  interpretationConfidence: number;
  sourceConfidence: number;
  temporalConfidence: number;
  identityConfidence: number;
};

kullanılabilir.

NPC:

Olayın olduğunu kesin hatırlıyor
ama neden olduğunu yanlış yorumluyor

olabilir.

57. Contextual recall

Bir memory her bağlamda aynı şekilde yorumlanmamalıdır.

Örnek:

Mira bir kez tehlikede kaçtı.

Korku bağlamında:

“Kaçmak beni korudu.”

Kimlik reflection bağlamında:

“Arkadaşımı yalnız bıraktım.”

Planlama bağlamında:

“Bu bölgede saklanacak yer var.”

Aynı memory farklı sistemlere farklı projection sunabilir.

type MemoryProjection = {
  memoryId: string;
  targetSystem:
    | "belief"
    | "goal"
    | "plan"
    | "utility"
    | "trait"
    | "relationship"
    | "narrative";

  extractedSignals: Record<string, number>;
  summary: string;
};
58. Memory privacy between NPCs

Bir NPC’nin memory’si diğer NPC tarafından erişilemez.

Bilgi yalnızca:

konuşma
gözlem
yazılı kayıt
sosyal aktarım
çıkarım

yoluyla paylaşılır.

Bu önemli bir sınırdır.

NPC’ler birbirlerinin:

niyetlerini
duygularını
hatıralarını
gizli bilgilerini

doğrudan bilemez.

59. Memory consistency with beliefs

Memory ve Belief State çelişebilir.

Örnek:

Memory:
Avcı bana yardım etmişti.

Current belief:
Avcı artık güvenilmez.

Bu mümkündür.

Çünkü:

Yeni olaylar olmuş olabilir
Memory’nin yorumu değişmiş olabilir
İlişki zamanla bozulmuş olabilir

Memory geçmiş kanıttır; belief güncel çıkarımdır.

60. Memory deletion

Narrative dünyada memory’nin teknik olarak tamamen silinmesi nadir olmalıdır.

Ancak şu durumlar olabilir:

Kalıcı unutma
Büyü veya fantastik dünya etkisi
Travmatik bastırma benzeri kurgu mekanizması
Dünya kuralına bağlı hafıza kaybı

Normal unutma çoğunlukla:

erişim düşüşü
ayrıntı kaybı
özetleme

şeklinde modellenmelidir.

61. Memory integrity

Teknik sistemde memory event zinciri bozulmamalıdır.

Önerilen eventler:

MemoryCandidateCreated
MemoryEncoded
MemoryConsolidated
MemoryRetrieved
MemoryReinforced
MemoryDistorted
MemoryReconsolidated
MemorySummarized
MemoryForgotten
ProspectiveMemoryTriggered

Bu sayede memory’nin nasıl değiştiği izlenebilir.

62. Memory explanation

Her recall açıklanabilir olmalıdır.

type MemoryExplanation = {
  internal: string;
  narrative: string;
  debug: string;

  retrievalCues: string[];
  relevanceFactors: string[];
  distortions: string[];
  confidenceNotes: string[];
};

Örnek:

Internal:
Mira, yaralı tilkiyi görünce geçmişte yaralı bir kuşa yardım ettiği anıyı hatırladı.

Narrative:
Tilkinin yarasını görünce Mira’nın aklına daha önce yardım ettiği küçük kuş geldi.

Debug:
Retrieved due to injured_animal similarity=0.88,
healing_goal relevance=0.79,
compassion emotion congruence=0.66.
63. Memory Engine çıktısı
type MemoryEngineResult = {
  actorId: string;
  timestamp: number;

  createdCandidates: MemoryCandidate[];

  encodedMemories: string[];
  consolidatedMemories: string[];

  semanticUpdates: string[];
  relationalUpdates: string[];
  proceduralUpdates: string[];
  identityUpdates: string[];

  decayedMemories: {
    memoryId: string;
    changes: Record<string, number>;
  }[];

  retrievedMemories?: MemoryRetrievalResult;

  prospectiveTriggers: {
    memoryId: string;
    triggerReason: string;
  }[];

  contradictions: MemoryContradiction[];

  explanation: {
    internal: string;
    narrative: string;
    debug: string;
  };
};
64. Örnek: Yaralı tilki olayı

Gerçek olay:

Mira yaralı tilkiye güvenli mesafeden elma bıraktı.
Tilki önce hırladı, sonra elmayı yedi.

Mira’nın episodic memory’si:

{
  "participantIds": ["mira", "fox_12"],
  "perceivedFacts": [
    "Tilki yaralıydı.",
    "Tilki önce hırladı.",
    "Tilki daha sonra elmayı yedi."
  ],
  "interpretations": [
    "Tilki korkmuştu.",
    "Güvenli mesafe korumak işe yaradı."
  ],
  "emotionalSnapshot": {
    "fear": 0.55,
    "compassion": 0.82,
    "relief": 0.66,
    "pride": 0.31
  },
  "significance": 0.78,
  "confidence": 0.86
}

Procedural memory adayı:

Yaralı vahşi hayvana yardım ederken önce mesafeyi koru ve güven oluştur.

Identity memory adayı:

Korksam bile ihtiyacı olan bir canlıya yardım edebilirim.
65. Tilkinin memory’si

Tilki insan benzeri anlatısal hafıza taşımak zorunda değildir.

Daha basit associative memory kullanılabilir.

type AssociativeAnimalMemory = {
  memoryId: string;
  actorId: string;

  stimulusPattern: {
    scent?: string;
    appearance?: string;
    sound?: string;
    location?: string;
  };

  associationVector: {
    safety: number;
    food: number;
    threat: number;
    pain: number;
    trust: number;
  };

  strength: number;
  decayRate: number;
};

Tilki için:

Mira’nın kokusu
→ yiyecek + düşük tehdit + orta güven

olarak saklanabilir.

Bu, bütün NPC’lerin aynı bilişsel memory modeline sahip olmaması gerektiğini gösterir.

66. Yaşa ve türe göre memory modeli

Memory kapasitesi aktör tipine göre değişebilir.

type MemoryCognitiveProfile = {
  episodicCapacity: number;
  semanticGeneralization: number;
  proceduralLearning: number;
  prospectiveMemory: number;
  sourceMonitoring: number;
  temporalPrecision: number;
  narrativeSelfMemory: number;
};
Küçük çocuk karakter
Duygusal ve somut ayrıntılar güçlü
Zaman sırası daha zayıf
Prospective memory daha kırılgan
Yetişkin
Daha güçlü semantic ve prospective memory
Daha iyi kaynak ayrımı
Hayvan
Associative
Mekân
Koku
Tehdit
Yiyecek
Sosyal bağ
Fantastik varlık

Dünya kurallarına göre farklı hafıza modeli taşıyabilir.

67. Memory Engine MVP

İlk sürümde şu memory türleri yeterlidir:

working
episodic
semantic
relational
procedural
prospective
emotional

İlk MVP akışı:

1. Execution ve consequence memory candidate üretir
2. Significance vector hesaplanır
3. Önemli adaylar episodic memory’ye dönüşür
4. Düşük önemli rutinler aggregate edilir
5. Benzer episodic memory’lerden semantic veya procedural memory üretilir
6. Retrieval cue ile en ilgili memory’ler bulunur
7. Memory’ler Belief, Goal ve Plan sistemlerine kanıt olarak aktarılır
8. Zamanla accessibility ve detail azalır
9. Reflection reconsolidation tetikleyebilir
68. MVP veri sınırları
Working memory: 7 öğe
Karar başına episodic retrieval: en fazla 5
Semantic retrieval: en fazla 5
Relational retrieval: hedef NPC başına en fazla 3
Prospective trigger: aktif en fazla 10
Bir olaydan memory candidate: en fazla 4
Bir memory consolidation turu: en fazla 3 yeni özet
69. Önerilen modüller
MemoryEngine
├── MemoryCandidateCollector
├── MemorySignificanceEvaluator
├── MemoryEncoder
├── WorkingMemoryManager
├── EpisodicMemoryStore
├── SemanticMemoryBuilder
├── EmotionalMemoryManager
├── RelationalMemoryManager
├── ProceduralMemoryBuilder
├── ProspectiveMemoryManager
├── MemoryConsolidationEngine
├── MemoryDecayEngine
├── MemoryRetrievalEngine
├── MemoryInterferenceResolver
├── MemoryReconsolidationEngine
├── MemorySummaryBuilder
└── MemoryExplanationBuilder

İlk sürümde bunlar ayrı servisler olmak zorunda değildir.

Tek bir Memory domain modülü altında alt bileşenler halinde başlayabilir.

70. Temel prensipler

Event log dünyada ne olduğunu, memory ise karakterin ne yaşadığını ve ne hatırladığını temsil eder.

Hafıza nesnel değil; algı, duygu, inanç ve dikkat tarafından şekillenen öznel bir modeldir.

Her olay hafızaya dönüşmemeli; önem, yenilik, duygu, hedef ve kimlik bağlantısına göre seçilmelidir.

Fact ile interpretation ayrı tutulmalıdır.

Karakter bir olayın ayrıntılarını unutabilir ama duygusal izini koruyabilir.

Memory zamanla yalnızca zayıflamaz; özetlenebilir, çarpıtılabilir ve yeni bilgilerle yeniden yorumlanabilir.

Bir memory çağrıldığında mevcut duygu ve kimlik tarafından yeniden şekillendirilebilir.

NPC yalnızca kendi hafızalarına erişebilir; başkalarının deneyimleri ancak iletişim veya gözlem yoluyla öğrenilir.

Semantic bilgi tek bir olaydan değil, yeterli ve çeşitli deneyimlerden oluşturulmalıdır.

Hafıza doğrudan utility puanı vermemeli; belief, risk, ilişki, duygu, hedef ve plan tahminlerini etkilemelidir.

Aynı olay farklı karakterlerde farklı memory’ler üretmelidir.

Unutma, karakter kusuru değil; yaşayan ve sınırlı bir bilişsel sistemin doğal parçasıdır.