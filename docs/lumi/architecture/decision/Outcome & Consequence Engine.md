Outcome & Consequence Engine

Execution Engine şunu üretir:

Mira tilkiye yiyecek bıraktı.
Tilkinin açlığı azaldı.
Tilkinin Mira’ya güveni biraz arttı.

Consequence Engine ise şunu hesaplar:

Tilki geceyi atlattı mı?
Yarası zamanla kötüleşti mi?
Mira’nın kokusunu ve davranışını hatırladı mı?
Tilki daha sonra Mira’ya yaklaşır mı?
Başka hayvanlar yiyeceğin kokusunu aldı mı?
Mira’nın gecikmesi köyde başka bir olayı etkiledi mi?
Bu karar birkaç gün sonra yeni bir hikâye oluşturur mu?

Temel ayrım:

Execution Engine
→ Eylemin doğrudan ve anlık sonuçları

Outcome & Consequence Engine
→ Sonuçların zaman içinde yayılması

Tam akış:

Execution Result
      ↓
Immediate Outcome Classification
      ↓
Consequence Seed Generation
      ↓
Causal Propagation
      ↓
Time Scheduling
      ↓
Relevance Filtering
      ↓
World State Evolution
      ↓
New Events, Goals, Memories and Decisions
1. Outcome ile consequence ayrımı
Outcome

Eylemin hemen gözlenebilen sonucudur.

Elma yere bırakıldı.
Tilki elmayı yedi.
Mira bir elmasını kaybetti.
Consequence

Outcome’un daha sonra doğurduğu etkidir.

Tilki açlıktan ölmedi.
Tilki Mira’yı güvenli biri olarak hatırladı.
Elmanın kokusu başka bir hayvanı bölgeye çekti.
Mira köye geç ulaştı.

Her outcome consequence üretmek zorunda değildir.

Mira bir taşı kenara itti.

Bu davranışın daha sonraki dünya için anlamı olmayabilir.

Ancak taş:

Bir su kanalını kapatıyorsa
Bir böceğin yuvasını koruyorsa
Bir iz bırakıyorsa

sonuç zinciri oluşabilir.

2. Consequence Seed

Execution Engine doğrudan uzun vadeli sonucu hesaplamamalıdır.

Bunun yerine Consequence Engine’e işlenmek üzere Consequence Seed üretmelidir.

type ConsequenceSeed = {
  seedId: string;
  sourceExecutionId: string;
  sourceEventId: string;

  subjectIds: string[];
  affectedEntityIds: string[];

  consequenceType:
    | "physical"
    | "biological"
    | "emotional"
    | "social"
    | "relationship"
    | "economic"
    | "environmental"
    | "informational"
    | "goal"
    | "political"
    | "narrative";

  initialMagnitude: number;
  propagationPotential: number;
  uncertainty: number;

  activationConditions: Condition[];
  cancellationConditions: Condition[];

  earliestActivationTime?: number;
  latestRelevantTime?: number;

  decayRate: number;
  priority: number;

  causalExplanation: string;
};

Örnek:

{
  "seedId": "consequence_fox_survival_01",
  "sourceExecutionId": "execution_leave_apple",
  "subjectIds": ["fox_12"],
  "affectedEntityIds": ["fox_12"],
  "consequenceType": "biological",
  "initialMagnitude": 0.42,
  "propagationPotential": 0.55,
  "uncertainty": 0.20,
  "activationConditions": [
    "fox_remains_near_food",
    "no_predator_interruption"
  ],
  "earliestActivationTime": 3600,
  "latestRelevantTime": 43200,
  "decayRate": 0.08,
  "priority": 0.70,
  "causalExplanation": "Tilkinin yiyecek bulması gece boyunca enerji kaybını azaltabilir."
}
3. Consequence türleri
Fiziksel sonuçlar
Yara iyileşir veya kötüleşir.
Köprü zayıflar.
Kapı açık kaldığı için oda soğur.
Yol çamurlaşır.
Biyolojik sonuçlar
Açlık artar.
Enfeksiyon gelişir.
Bitki büyür.
Hayvan göç eder.
Yorgunluk iyileşir.
Duygusal sonuçlar
Suçluluk zamanla artar.
Korku azalır.
Güven gelişir.
Öfke birikir.
Sosyal sonuçlar
Bir davranış konuşulur.
İtibar değişir.
Grup ikiye ayrılır.
Bir kişi örnek alınır.
İlişkisel sonuçlar
Bağ kuvvetlenir.
Şüphe oluşur.
Borçluluk hissi doğar.
Sadakat sınanır.
Bilgisel sonuçlar
Söylenti yayılır.
Bir sır ortaya çıkar.
Yanlış bilgi güçlenir.
Bir karakter yeni bir gerçeği öğrenir.
Çevresel sonuçlar
Yiyecek kokusu başka hayvanları çeker.
Açık bırakılan su kanalı tarlayı etkiler.
Kesilen ağaç kuş yuvasını yok eder.
Hedef sonuçları
Yeni hedef oluşur.
Eski hedef anlamsız hale gelir.
Bir hedef acil hale gelir.
Anlatısal sonuçlar
Yeni hikâye kancası oluşur.
Bir karakter geri döner.
Yeni bölge açılır.
Geçmiş karar tekrar gündeme gelir.
4. Sonuçlar tek çizgide ilerlememeli

Basit sistem:

A oldu
→ B oldu
→ C oldu

LUMI’de daha doğru model:

              → B1
A → Consequence
              → B2
              → B3

B1 + B2 → C1
B2 + başka olay → C2

Örneğin:

Mira tilkiye elma bıraktı.

Olası zincir:

Tilki elmayı yedi
→ enerjisi arttı
→ gece bölgeden uzaklaşabildi
→ avcı tuzağına yakalanmadı
→ birkaç gün sonra Mira’yı yeniden gördü

Başka zincir:

Elmanın kokusu yayıldı
→ bir yaban domuzu bölgeye geldi
→ tilki uzaklaştı
→ domuz patikadaki işaretleri bozdu
→ köyden gelen şifacı yolu bulamadı

Aynı eylem hem olumlu hem olumsuz sonuçlar üretebilir.

5. Causal Graph

Sonuçlar bir nedensellik grafiğinde tutulabilir.

type CausalNode = {
  nodeId: string;
  eventType: string;
  timestamp: number;
  entityIds: string[];
  magnitude: number;
};

type CausalEdge = {
  fromNodeId: string;
  toNodeId: string;

  relation:
    | "caused"
    | "enabled"
    | "prevented"
    | "amplified"
    | "reduced"
    | "delayed"
    | "redirected";

  strength: number;
  confidence: number;
};

Örnek:

Mira elmayı bıraktı
   │
   ├──caused──> Tilki elmayı yedi
   │                 │
   │                 └──enabled──> Tilki geceyi atlattı
   │
   └──enabled──> Koku yayıldı
                     │
                     └──caused──> Başka hayvan bölgeye geldi

Bu grafik sayesinde sistem:

Bir olayın neden olduğunu açıklayabilir.
Geçmiş kararların etkisini bulabilir.
Hikâye özeti oluşturabilir.
“Bu neden oldu?” sorusuna cevap verebilir.
Karakterlerin sorumluluğunu daha doğru değerlendirebilir.
6. Doğrudan, dolaylı ve ortaya çıkan sonuçlar
Doğrudan sonuç

Eylemin hemen mantıksal devamıdır.

Elma bırakıldı → tilki elmayı yedi.
Dolaylı sonuç

Arada başka durumlar vardır.

Tilki beslendi → geceyi atlattı → yavrularına döndü.
Ortaya çıkan sonuç

Birden fazla bağımsız zincirin birleşmesinden doğar.

Mira’nın gecikmesi
+
fırtınanın başlaması
+
köy kapısının erken kapanması
=
Mira gece köy dışında kaldı
type ConsequenceOrigin =
  | "direct"
  | "indirect"
  | "emergent";

Emergent sonuçların tek bir sahibi veya tek bir nedeni olmayabilir.

7. Zaman ölçekleri

Her consequence aynı zaman ölçeğinde çalışmaz.

type ConsequenceTimeScale =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "seasons"
  | "years";

Örnek:

Saniyeler:
Tilki geri çekildi.

Dakikalar:
Tilki yiyeceğe yaklaştı.

Saatler:
Açlığı azaldı.

Günler:
Mira’ya güveni oluştu.

Haftalar:
Tilki Mira’nın yolculuklarında görünmeye başladı.

Aylar:
Tilki, Mira’nın dünyadaki kalıcı dostlarından biri oldu.

Bu sonuçların hepsinin aktif şekilde simüle edilmesi gerekmez.

8. Scheduled Consequence

Gelecekte kontrol edilmesi gereken sonuçlar zamanlayıcıya alınabilir.

type ScheduledConsequence = {
  consequenceId: string;
  seedId: string;

  scheduledAt: number;
  evaluationWindow?: {
    earliest: number;
    latest: number;
  };

  targetEntityIds: string[];

  requiredConditions: Condition[];
  cancellationConditions: Condition[];

  evaluationMode:
    | "exact"
    | "window"
    | "next_relevant_tick"
    | "on_entity_activation";

  status:
    | "scheduled"
    | "activated"
    | "cancelled"
    | "expired"
    | "resolved";
};

Örnek:

Tilkinin yarasını 6 saat sonra tekrar değerlendir.

Ancak dünya simülasyonu 10 gün atlıyorsa sistem her saati tek tek çalıştırmamalıdır.

9. Zaman sıçramalarında toplu hesaplama

Dünya Motoru 10 gün ilerletildiğinde:

Tilki her dakika ne yaptı?

hesaplanmamalıdır.

Bunun yerine ilgili durumlar üzerinden sonuç tahmini yapılmalıdır.

type ConsequenceProjectionRequest = {
  entityId: string;
  fromTime: number;
  toTime: number;

  activeSeeds: ConsequenceSeed[];
  environmentalContext: EnvironmentState;

  relevanceContext?: {
    observerIds: string[];
    activeStoryIds: string[];
  };
};

Toplu simülasyon:

Başlangıç durumu
+
Aktif consequence seed’leri
+
Doğal değişim oranları
+
Kritik olaylar
=
Hedef zamandaki tahmini durum
10. Relevant entity activation

Daha önce konuştuğumuz gibi dünyadaki her varlık her zaman ayrıntılı hesaplanmamalıdır.

Bir consequence şu durumlarda aktif çözülür:

Karakter tekrar görüldüğünde
Bölge yeniden ziyaret edildiğinde
Sonuç başka aktif varlığı etkilediğinde
Kritik eşik aşıldığında
Hikâye açısından önemli hale geldiğinde
Zamanlanmış kontrol tarihi geldiğinde

Örneğin tilki ormanda ve hiçbir aktif hikâyeye bağlı değilse:

Tam simülasyon yerine özet state projection

yapılır.

Mira tekrar ormana geldiğinde:

Tilkinin aradaki 10 günlük durumu çözülür.
11. Latent Consequence

Henüz gerçekleşmemiş fakat gerçekleşme potansiyeli taşıyan sonuçlar latent olarak tutulabilir.

type LatentConsequence = {
  consequenceId: string;
  triggerConditions: Condition[];

  probability: number;
  magnitude: number;
  decayRate: number;

  expiryTime?: number;

  possibleEffects: Effect[];
};

Örnek:

Tilki Mira’ya güvenmeye başladı.

Latent sonuç:

Mira tehlikedeyken tilkinin ona yardım etme ihtimali arttı.

Bu hemen gerçekleşmez. Gelecekte uygun koşul oluşursa aktif olur.

12. Sonuçların sönümlenmesi

Her consequence sonsuza kadar etkili kalmamalıdır.

Örneğin:

Mira bir yabancıya küçük bir iyilik yaptı.

Bu olayın sosyal etkisi zamanla kaybolabilir.

effectiveMagnitude =
  initialMagnitude
  * decayFunction(elapsedTime, decayRate);

Basit model:

effectiveMagnitude =
  initialMagnitude * Math.exp(-decayRate * elapsedTime);

Fakat farklı consequence türleri farklı sönüm modellerine sahip olabilir.

Küçük duygusal etki:
Hızlı söner.

Travmatik olay:
Yavaş söner.

Fiziksel yara:
İyileşme modeline göre değişir.

Söylenti:
Yayılabilir, sonra unutulabilir.

Kimlik değişimi:
Çok yavaş değişir.
13. Sonuçların güçlenmesi

Bazı sonuçlar zamanla azalmak yerine artabilir.

Örneğin:

Tedavi edilmeyen enfeksiyon
Biriken kıskançlık
Yayılmaya devam eden söylenti
Büyüyen bitki
Artan borç
type ConsequenceGrowthModel =
  | "decay"
  | "linear_growth"
  | "exponential_growth"
  | "threshold_growth"
  | "cyclic"
  | "state_dependent";

Enfeksiyon örneği:

İlk saatlerde düşük etki
Eşik aşıldığında hızlı kötüleşme
Tedavi edilirse süreç durur
14. Threshold Consequences

Bazı sonuçlar belirli bir eşik geçilene kadar görünür olay üretmez.

type ConsequenceThreshold = {
  dimension: string;
  threshold: number;

  comparison:
    | "greater_than"
    | "less_than"
    | "crosses";

  triggeredEffect: Effect;
};

Örnek:

Tilkinin enfeksiyon değeri > 0.70
→ kritik hastalık olayı oluştur

Sosyal örnek:

Köydeki söylenti yayılımı > 0.60
→ köy meclisi konuyu tartışmaya başlar

Duygusal örnek:

Biriken öfke > 0.80
→ yüzleşme adayı üret
15. Consequence cancellation

Bir consequence başladıktan sonra durdurulabilir.

Örnek:

Yara kötüleşiyor.

Sonra:

Şifacı tedavi ediyor.

Bu durumda:

wound_deterioration consequence

iptal edilir veya tersine çevrilir.

type ConsequenceIntervention = {
  consequenceId: string;

  interventionType:
    | "cancel"
    | "reduce"
    | "delay"
    | "redirect"
    | "reverse";

  magnitude: number;
  sourceEventId: string;
};
16. Bir consequence başka consequence’ı değiştirebilir

Örneğin:

Yaralı tilki aç.

İki consequence:

Açlık artışı
Yara kötüleşmesi

Birlikte:

İyileşme hızının daha da azalması

oluşturabilir.

type ConsequenceInteractionRule = {
  requiredTypes: string[];
  condition: string;

  interactionEffect:
    | "amplify"
    | "reduce"
    | "transform"
    | "spawn_new";

  factor: number;
};

Örnek:

{
  "requiredTypes": [
    "hunger_growth",
    "wound_deterioration"
  ],
  "interactionEffect": "amplify",
  "factor": 1.35
}
17. Sosyal sonuç yayılımı

Bir olayı gören veya duyan NPC’ler farklı yorumlayabilir.

Mira tilkiye yardım etti.

Şifacı:

Mira merhametli davrandı.

Avcı:

Mira tehlikeli bir hayvana gereksiz yere yaklaştı.

Kardeşi:

Mira çok cesurdu.

Aynı olay farklı belief ve relationship değişimleri üretir.

type SocialInterpretation = {
  observerId: string;
  sourceEventId: string;

  perceivedFacts: ObservedFact[];
  interpretation: string;

  valueAlignment: number;
  relationshipBias: number;
  culturalBias: number;
  confidence: number;

  generatedEffects: Effect[];
};
18. Gözlemleyen ve sonradan öğrenen ayrımı
Doğrudan gözlem

NPC olayı kendisi görür.

Yüksek algı doğruluğu
Düşük aktarım bozulması
Dolaylı bilgi

NPC olayı başka birinden duyar.

Kaynak güveni
Aktarıcının yorumu
Bilgi kaybı
Abartı
Söylenti bozulması
type InformationTransmission = {
  senderId: string;
  receiverId: string;
  eventId: string;

  senderBeliefConfidence: number;
  senderHonesty: number;
  senderBias: number;

  transmissionAccuracy: number;
  emotionalFraming: number;

  receiverTrust: number;
};

Bu sistem sonuçların yalnızca fiziksel değil, bilgi ağı üzerinden de yayılmasını sağlar.

19. Söylenti zinciri

Örnek gerçek olay:

Mira yaralı bir tilkiye yiyecek bıraktı.

Birinci aktarım:

Mira ormanda bir tilkiye yaklaştı.

İkinci aktarım:

Mira vahşi tilkilerle arkadaşlık ediyor.

Üçüncü aktarım:

Mira hayvanlarla konuşabiliyor.

Bu süreç yeni bir sosyal consequence doğurabilir:

Köy çocukları Mira’yı takip etmek ister.
Bazı yetişkinler ondan şüphelenir.
Bir şifacı Mira’nın özel yeteneği olduğunu düşünür.
20. Sorumluluk ve nedensellik ayrımı

Bir karakter bir sonuca neden olmuş olabilir ama bundan ahlaken sorumlu olmayabilir.

Örnek:

Mira elmayı bıraktı.
Yaban domuzu kokuyu aldı.
Domuz köy yoluna zarar verdi.

Mira nedensel zincirin başlangıcındadır.

Fakat:

Bunu öngöremezdi.
Niyeti zarar vermek değildi.
Alternatif sonucu bilmiyordu.

Bu nedenle sorumluluk düşük olmalıdır.

type ResponsibilityAssessment = {
  actorId: string;
  consequenceId: string;

  causalContribution: number;
  foreseeability: number;
  intentionality: number;
  control: number;
  knowledge: number;
  negligence: number;

  responsibilityScore: number;
};

Bu sistem trait evolution için önemlidir.

NPC öngöremeyeceği sonuçlar nedeniyle doğrudan compassion veya responsibility kaybetmemelidir.

21. Karakterin sonucu öğrenmesi

Bir consequence gerçekleşmiş olabilir fakat NPC bunu bilmiyor olabilir.

Tilki Mira’nın bıraktığı elma sayesinde hayatta kaldı.

Mira bunu görmediyse belief state’i değişmez.

Daha sonra tilki geri dönerse Mira sonucu çıkarabilir.

type ConsequenceKnowledgeState = {
  consequenceId: string;
  actorId: string;

  awareness:
    | "unknown"
    | "suspected"
    | "inferred"
    | "observed"
    | "confirmed";

  confidence: number;
};

Trait ve emotion etkisi karakter sonucu öğrendiğinde ayrıca oluşabilir.

22. Gecikmiş duygusal sonuç

Örnek:

Mira tilkiye yardım etmeden ayrıldı.

Karar anında:

Hafif suçluluk

Bir gün sonra tilkinin öldüğünü öğrenirse:

Suçluluk artışı
Pişmanlık
Kendine kızgınlık
Telafi hedefi
Reflection
type DelayedEmotionalConsequence = {
  actorId: string;
  triggerKnowledgeId: string;

  emotionDeltas: Record<string, number>;
  reflectionTopics: string[];
  possibleGoalSeeds: string[];
};

Sonuç gerçekleştiği anda değil, karakter tarafından anlamlandırıldığı anda psikolojik etki üretir.

23. Consequence’ın yeni hedef üretmesi

Sonuçlar yeni hedefler oluşturabilir.

Tilki geçici olarak iyileşti ama hâlâ yaralı.

Yeni hedef:

Tilki için kalıcı tedavi bul.

Başka örnek:

Mira’nın bıraktığı yiyecek başka hayvanları bölgeye çekti.

Yeni hedef:

Köy yolunu hayvanlardan koru.
type GoalSeed = {
  targetActorIds: string[];

  goalType: string;
  motivationSources: string[];

  urgency: number;
  importance: number;

  activationConditions: Condition[];
  expiryConditions: Condition[];
};
24. Consequence’ın aday eylem üretmesi

Bazı sonuçlar bir sonraki Decision Engine döngüsünü doğrudan tetikler.

Tilkinin yarası kötüleşti.

Adaylar:

Şifacı getir
Tilkiyi taşı
Yeni bitki ara
Tilkinin yanında kal
Başkasından yardım iste

Akış:

Consequence Activated
      ↓
Perception / Belief Update
      ↓
Goal or Need Change
      ↓
Action Generator
      ↓
Decision Engine
25. Consequence significance

Her sonuç hikâye haline gelmemelidir.

Bir significance puanı gerekir.

type ConsequenceSignificance = {
  personalImpact: number;
  worldImpact: number;
  emotionalImpact: number;
  relationshipImpact: number;
  goalImpact: number;
  novelty: number;
  irreversibility: number;
  futurePotential: number;
};

Birleşik önem:

significance =
  personalImpact * 0.20 +
  emotionalImpact * 0.15 +
  relationshipImpact * 0.15 +
  goalImpact * 0.15 +
  worldImpact * 0.10 +
  novelty * 0.10 +
  irreversibility * 0.05 +
  futurePotential * 0.10;

Bu yalnızca önceliklendirme içindir.

26. Narrative hook üretimi

Yüksek gelecek potansiyeli taşıyan consequences bir hikâye kancasına dönüşebilir.

type NarrativeHook = {
  hookId: string;
  sourceConsequenceIds: string[];

  involvedEntities: string[];

  hookType:
    | "returning_character"
    | "unresolved_problem"
    | "mystery"
    | "relationship_change"
    | "world_change"
    | "moral_consequence"
    | "new_opportunity";

  strength: number;
  expiryTime?: number;

  activationConditions: Condition[];

  summary: string;
};

Örnek:

{
  "hookType": "returning_character",
  "involvedEntities": [
    "mira",
    "fox_12"
  ],
  "strength": 0.78,
  "summary": "Mira’nın yardım ettiği tilki ileride ona yeniden yaklaşabilir."
}

Bu, kesin olarak tilkinin dönmesi anlamına gelmez.

Uygun koşul oluştuğunda kullanılabilir bir potansiyeldir.

27. Anlatısal önem ile dünya mantığı ayrılmalı

Bir olay hikâye açısından ilginç olabilir fakat dünya mantığına aykırıysa gerçekleşmemelidir.

Yanlış yaklaşım:

Tilki geri dönsün çünkü hikâye için güzel.

Doğru yaklaşım:

Tilki hayatta kaldı.
Mira’nın kokusunu hatırlıyor.
Bölgeden çok uzaklaşmadı.
Mira yeniden yakınından geçti.
Tilkinin güven seviyesi yeterince yüksek.

Bu koşullar sağlanırsa geri dönüş gerçekleşebilir.

Narrative Value

dünya kurallarını geçersiz kılmamalıdır.

Yalnızca mümkün sonuçlar arasında önceliklendirme yapmalıdır.

28. Consequence budget

Bir eylem teorik olarak yüzlerce sonuç doğurabilir.

Bunların hepsini saklamak ve simüle etmek pahalıdır.

Bu nedenle her event için bir consequence budget uygulanabilir.

Örnek:

Yüksek önem olay:
12 aktif consequence seed

Orta önem olay:
5 aktif consequence seed

Düşük önem olay:
1–2 consequence seed

Önemsiz olay:
yalnızca aggregate state değişimi
type ConsequenceBudget = {
  maxDirectConsequences: number;
  maxIndirectDepth: number;
  maxActiveSeeds: number;
  maxNarrativeHooks: number;
};
29. Causal depth sınırı

Sonuç zinciri sonsuza kadar izlenmemelidir.

Mira elmayı bıraktı
→ tilki yedi
→ yürüdü
→ bir dala bastı
→ kuş uçtu
→ başka bir NPC kuşu gördü

Bu zincirin her halkası anlamlı değildir.

Causal propagation şu durumda durdurulabilir:

Etki büyüklüğü eşik altına düştüğünde
Aktif hedefleri etkilemediğinde
Önemli varlıklarla bağlantısı kalmadığında
Nedensellik güveni çok düştüğünde
Causal depth sınırına ulaşıldığında
30. Relevance score
type ConsequenceRelevanceContext = {
  activeActorIds: string[];
  activeGoalIds: string[];
  activeRegionIds: string[];
  activeStoryThreads: string[];
};

relevance =
  entityOverlap
  * goalConnection
  * spatialProximity
  * temporalProximity
  * narrativePotential;

Düşük relevance sonucu silmek yerine özetlenmiş latent state’e dönüştürülebilir.

31. Aggregate consequences

Birçok küçük benzer consequence tek kayıt altında toplanabilir.

Örnek:

Mira köy halkına defalarca yardım etti.

Her olay ayrı sosyal sonucu sonsuza kadar aktif tutmamalıdır.

Aggregate:

type AggregateConsequence = {
  aggregateId: string;
  category: string;
  subjectId: string;
  targetGroupId?: string;

  accumulatedMagnitude: number;
  supportingEventCount: number;
  trend: number;

  lastUpdatedAt: number;
};

Örnek:

{
  "category": "village_reputation_helpfulness",
  "subjectId": "mira",
  "targetGroupId": "village_population",
  "accumulatedMagnitude": 0.68,
  "supportingEventCount": 7,
  "trend": 0.12
}
32. Dünya değişimlerinin kalıcılığı

Consequences farklı kalıcılık düzeylerine sahip olabilir.

type PersistenceClass =
  | "ephemeral"
  | "temporary"
  | "persistent"
  | "permanent";
Ephemeral
Bir sesin yankısı
Kısa korku
Geçici dikkat değişimi
Temporary
Açlık
Yorgunluk
Küçük kırgınlık
Persistent
İlişki güveni
Alışkanlık
Sosyal itibar
Bir bölgenin zarar görmesi
Permanent
Bir varlığın ölümü
Bir sırrın açıklanması
Bir yapının yıkılması
Bir karakterin dünyadan ayrılması

Kalıcı sonuçlar daha yüksek doğrulama ve açıklama gerektirir.

33. Counterfactual kayıt

Önemli kararlar için sistem basit bir karşı-olgusal kayıt tutabilir.

Mira yardım etmeseydi muhtemel sonuç ne olurdu?

Bu gerçek dünya state’i değildir; analiz verisidir.

type CounterfactualSummary = {
  sourceDecisionId: string;
  alternativeActionId: string;

  likelyDifferences: {
    dimension: string;
    estimatedDelta: number;
    confidence: number;
  }[];

  explanation: string;
};

Bu şu amaçlarla kullanılabilir:

Karar kalitesini analiz etmek
Pişmanlık hesaplamak
Ebeveyn görünümünde seçimlerin etkisini açıklamak
Decision Engine testleri yapmak

Counterfactual sonuç dünya durumuna uygulanmaz.

34. Beklenmeyen sonuçlar

Sistem tüm sonuçları NPC’nin veya oyuncunun tahmin ettiği şekilde üretmemelidir.

Ancak beklenmeyen sonuçlar nedensiz olmamalıdır.

Beklenmedik consequence üç kaynaktan gelebilir:

Gizli dünya durumu
Eksik belief state
Birden fazla sistemin etkileşimi

Örnek:

Mira elma bıraktı.
Bilmediği şey: Bölgede aç bir yaban domuzu vardı.

Sonuç beklenmediktir ama dünya state’inde temeli vardır.

35. Rastlantısal consequence

Bazı sonuçlar olasılıksal olabilir.

type ProbabilisticConsequence = {
  probability: number;
  probabilityFactors: {
    source: string;
    contribution: number;
  }[];

  seed: string;
};

Örnek:

Tilkinin aynı bölgede kalma ihtimali: %65

Ancak seed kullanılmalıdır ki dünya yeniden oynatılabilsin.

36. Outcome & Consequence Engine veri çıktısı
type ConsequenceEvaluationResult = {
  sourceExecutionId: string;

  immediateOutcomes: Effect[];

  generatedSeeds: ConsequenceSeed[];
  scheduledConsequences: ScheduledConsequence[];
  latentConsequences: LatentConsequence[];

  activatedConsequences: {
    consequenceId: string;
    outcomeEffects: Effect[];
  }[];

  cancelledConsequences: {
    consequenceId: string;
    reason: string;
  }[];

  generatedGoalSeeds: GoalSeed[];
  generatedNarrativeHooks: NarrativeHook[];

  causalNodes: CausalNode[];
  causalEdges: CausalEdge[];

  responsibilityAssessments: ResponsibilityAssessment[];

  summary: {
    immediate: string;
    projected: string;
    narrative: string;
    debug: string;
  };
};
37. Örnek: Mira tilkiye elma bıraktı
Immediate outcomes
{
  "mira.appleCount": -1,
  "fox.hunger": -0.18,
  "fox.trustTowardMira": 0.10
}
Consequence seed’leri
Tilkinin geceyi atlatma ihtimali arttı.
Tilki Mira’nın kokusunu güvenli deneyimle ilişkilendirdi.
Yiyecek kokusu başka hayvanları çekebilir.
Tilkinin yarası tedavi edilmediği için kötüleşebilir.
Mira köye birkaç dakika geç ulaşacak.
Zamanlanmış değerlendirmeler
2 saat sonra:
Tilkinin yiyeceği tüketip tüketmediğini değerlendir.

6 saat sonra:
Yara ve enerji durumunu değerlendir.

1 gün sonra:
Tilkinin hayatta kalma ve hareket durumunu projekte et.

Mira köye ulaştığında:
Gecikmenin hedef üzerindeki etkisini değerlendir.
Latent sonuçlar
Tilki ileride Mira’yı tanıyabilir.
Tilki gelecekte yardım edebilir.
Mira hayvanlara yardım eden biri olarak anılabilir.
38. On gün sonra tilki tekrar görülürse

Sistem 10 günü dakika dakika hesaplamaz.

Projection girdileri:

Başlangıç sağlık değeri
Yara seviyesi
Yiyecek tüketimi
Hava durumu
Bölgedeki avcı riski
Tilkinin doğal iyileşme kapasitesi
Aktif consequence seed’leri

Olası sonuç:

{
  "foxHealth": 0.51,
  "foxInjury": 0.38,
  "foxTrustTowardMira": 0.36,
  "foxLocation": "forest_stream",
  "status": "alive_but_limping"
}

Tilki Mira’yı görünce:

Hemen kaçmaz.
Mesafeyi korur.
Mira’yı kokusundan tanır.

Bu önceki kararın doğal ve görünür sonucu olur.

39. Örnek: Yardım etmeme zinciri

Mira yardım edebilecekken tilkiyi bırakıp gitti.

Immediate
Tilki yalnız kaldı.
Mira yolculuğuna devam etti.
Mira zaman kaybetmedi.
Sonraki saatler
Tilkinin açlığı arttı.
Yarası kötüleşti.
Bir gün sonra

Olasılık A:

Tilki başka bir yiyecek buldu ve hayatta kaldı.

Olasılık B:

Tilki hareket edemedi ve avcı tarafından bulundu.

Olasılık C:

Köy şifacısı tesadüfen tilkiyi buldu.

Mira sonucu bilmiyorsa trait değeri doğrudan sonuç üzerinden değişmez.

Daha sonra B sonucunu öğrenirse:

Suçluluk
Reflection
Compassion evidence
Telafi hedefi

oluşabilir.

40. Consequence Engine’in Trait Evolution ile bağlantısı

Trait Evolution üç farklı zamanda kanıt alabilir:

Karar anı
Execution anı
Consequence öğrenildiği an

Örnek:

Karar:
Yardım etmedi.

Execution:
Bilinçli olarak uzaklaştı.

Consequence:
Tilkinin durumunun kötüleştiğini öğrendi.

Reflection:
Bir dahaki sefere yardım istemeye karar verdi.

Trait değişimleri:

İlk karar:
compassion küçük düşüş

Sonucu öğrenme:
responsibility farkındalığı

Reflection:
compassion ve responsibility toparlanması
self-awareness artışı

Bu sayede karakter bir hata yüzünden yalnızca kötüleşmez; hatadan öğrenebilir.

41. Consequence Engine’in Memory Engine ile bağlantısı

Bir consequence memory candidate üretir.

Örnek:

Tilki haftalar sonra geri geldi.

Bu olayın hafıza önemi yüksektir çünkü:

Geçmiş kararın sonucu
Beklenmedik geri dönüş
Duygusal bağ
Karakter gelişimi

Memory candidate:

{
  "summary": "Mira’nın haftalar önce yardım ettiği tilki onu yeniden buldu.",
  "significance": 0.88,
  "emotionalIntensity": 0.74,
  "identityRelevance": 0.81
}
42. İlk sürüm için sade Consequence Engine

İlk sürümde şu consequence türleri yeterlidir:

physical
biological
emotional
relationship
social
goal
informational
environmental

Zaman ölçekleri:

immediate
hours
days
long_term

Her execution için:

En fazla 5 direct seed
En fazla 3 scheduled consequence
En fazla 2 latent consequence
En fazla 1 narrative hook

İlk growth modelleri:

decay
linear growth
threshold
state-dependent

İlk aktivasyon türleri:

scheduled time
entity observed
region activated
condition threshold
related event
43. Önerilen modüller
OutcomeConsequenceEngine
├── ImmediateOutcomeClassifier
├── ConsequenceSeedBuilder
├── CausalGraphManager
├── ConsequenceScheduler
├── ConsequenceProjectionEngine
├── ConsequenceInteractionResolver
├── ThresholdMonitor
├── SocialPropagationEngine
├── ResponsibilityEvaluator
├── GoalSeedBuilder
├── NarrativeHookBuilder
├── RelevancePruner
├── AggregateConsequenceManager
└── ConsequenceExplanationBuilder

İlk sürümde bunların hepsi ayrı servis olmak zorunda değildir.

Tek domain modülü içinde alt bileşenler olarak başlayabilir.

44. Temel prensipler

Execution sonucu eylemin bittiğini gösterir; eylemin etkilerinin bittiğini göstermez.

Her sonuç, zaman içinde yayılabilecek bir nedensel potansiyel taşıyabilir.

Dünya her varlığı sürekli ayrıntılı simüle etmemeli; yalnızca ilgili consequences gerektiğinde çözülmelidir.

Uzun vadeli sonuçlar geçmiş world state, aktif consequence seed’leri ve çevresel koşullardan türetilmelidir.

Bir karakter yalnızca bildiği sonuçlardan psikolojik olarak etkilenmelidir.

Nedensel katkı ile ahlaki sorumluluk aynı şey değildir.

Anlatısal değer, dünya mantığını geçersiz kılmamalıdır.

Beklenmeyen sonuçların dünya state’inde anlaşılabilir bir nedeni bulunmalıdır.

Consequences yalnızca sorun üretmemeli; yeni fırsatlar, ilişkiler, hedefler ve karakter gelişimleri de oluşturmalıdır.

Bir kararın gerçek anlamı bazen karar anında değil, günler veya hikâyeler sonra ortaya çıkmalıdır.