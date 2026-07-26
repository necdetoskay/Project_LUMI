Action Generator ve Candidate Action Pipeline

Bu bileşenin görevi şudur:

NPC’nin mevcut durumda düşünebileceği, uygulayabileceği ve anlamlı olabilecek aday eylemleri üretmek.

Decision Engine’in kalitesi yalnızca değerlendirme sistemine bağlı değildir. Sistemin önüne kötü adaylar gelirse, en iyi değerlendirme motoru bile kötü karar verir.

Bu nedenle temel akış şöyle olmalıdır:

World State
   ↓
NPC Belief State
   ↓
Goals, Needs, Emotions, Relationships
   ↓
Action Generator
   ↓
Candidate Action Pool
   ↓
Constraint Filter
   ↓
Action Expansion / Refinement
   ↓
Utility Evaluator
1. Action Generator gerçek dünya durumunu doğrudan kullanmamalı

NPC yalnızca bildiği, algıladığı veya tahmin ettiği eylemleri düşünebilmelidir.

Gerçekte yakınlarda bir şifacı olabilir. Ancak NPC bunu bilmiyorsa:

Şifacıyı çağır

eylemi aday olarak oluşmamalıdır.

Bu nedenle giriş verisi:

type ActionGenerationContext = {
  actorId: string;
  beliefState: BeliefState;
  perceivedEnvironment: PerceivedEnvironment;
  activeGoals: Goal[];
  needs: NeedVector;
  emotions: EmotionVector;
  relationships: RelationshipState[];
  memories: ActiveMemory[];
  inventory: InventoryState;
  capabilities: CapabilityState;
  currentPlan?: ActionPlan;
};

olmalıdır.

2. Aday eylem kaynakları

Aday eylemler tek bir kaynaktan üretilmemelidir.

Candidate Action Sources
├── Affordances
├── Goals
├── Needs
├── Emotions
├── Social Relations
├── Memories
├── Habits
├── Roles and Duties
├── Current Plan
├── Environmental Events
├── Curiosity
└── Conflict Resolution

Her kaynak farklı türde eylemler üretir.

3. Affordance tabanlı eylemler

Affordance, çevredeki bir nesnenin veya varlığın mümkün kıldığı eylemdir.

Örneğin NPC şunları algılıyor:

{
  "fox": {
    "injured": true,
    "distance": 4
  },
  "tree": {
    "climbable": true
  },
  "herb": {
    "collectable": true
  },
  "path": {
    "traversable": true
  }
}

Bunlardan şu eylemler üretilebilir:

Tilkiye yaklaş
Tilkiyi incele
Tilkiye yiyecek ver
Ağaca tırman
Şifalı otu topla
Yolda ilerle

Affordance tanımı:

type AffordanceDefinition = {
  id: string;
  requiredTargetTags: string[];
  requiredCapabilities?: string[];
  requiredItems?: string[];
  generatedActionType: string;
};

Örnek:

{
  "id": "inspect_injured_creature",
  "requiredTargetTags": [
    "creature",
    "injured"
  ],
  "requiredCapabilities": [
    "vision"
  ],
  "generatedActionType": "inspect"
}
4. Goal tabanlı eylemler

NPC’nin aktif hedefleri aday üretmelidir.

Örnek hedef:

{
  "goal": "reach_village_before_night",
  "priority": 0.75
}

Üretilen eylemler:

Yolda ilerle
Kısa yolu araştır
Koş
Yardım iste
Dinlenmeden devam et

Başka hedef:

Yaralı tilkiyi koru

Üretilen eylemler:

Yarasını incele
Tehlikeyi uzaklaştır
Barınak hazırla
Yiyecek getir
Şifacı bul

Goal Generator yalnızca bir sonraki fiziksel hareketi değil, hedefe götüren alt eylemleri üretmelidir.

5. Need tabanlı eylemler

İhtiyaçlar yükseldiğinde ilgili eylemler aday havuzuna girer.

Hunger → yemek ara, yemek ye, yiyecek iste
Fatigue → dinlen, kamp kur, güvenli yer bul
Safety → kaç, saklan, yardım çağır
Belonging → gruba yaklaş, konuş, barış
Curiosity → incele, soru sor, keşfet

Örnek:

{
  "hunger": 0.82,
  "fatigue": 0.65
}

Adaylar:

Çantadaki elmayı ye
Yenebilir bitki ara
Dinlenmek için güvenli yer bul
Köye ulaşmayı hızlandır

Need tabanlı eylemler NPC’nin amaçlarıyla çatışabilir.

Bu çatışmayı Action Generator çözmez; Utility Evaluator değerlendirir.

6. Emotion tabanlı eylemler

Duygular yalnızca puanları değiştirmemeli, farklı eylemler de üretebilmelidir.

Korku
Kaç
Saklan
Donakal
Yardım çağır
Tehdidi gözlemle
Mesafeyi artır
Öfke
Yüzleş
Bağır
Suçla
Uzaklaş
Bir eşyaya zarar ver
İntikam planla
Suçluluk
Özür dile
Hatayı telafi et
Gerçeği itiraf et
Yardım teklif et
Kaçın
Merak
İncele
Takip et
Soru sor
Dokun
Deney yap

Burada negatif veya uygunsuz eylemler de aday olabilir. Ancak çocuk güvenliği, dünya kuralları ve guardrail’ler bunları filtreler veya güvenli alternatiflere dönüştürür.

7. Relationship tabanlı eylemler

Yakındaki kişilerle olan ilişkiler yeni eylemler üretir.

Örneğin:

{
  "target": "younger_sister",
  "protectiveness": 0.90,
  "trust": 0.80
}

Adaylar:

Kardeşini koru
Onu yanında tut
Tehlikeyi ondan gizle
Ona durumu açıkla
Onu köye gönder

Başka ilişki:

{
  "target": "village_hunter",
  "trust": 0.20,
  "fear": 0.65,
  "resentment": 0.40
}

Adaylar:

Mesafeyi koru
Şüpheyle soru sor
Bilgiyi doğrula
Onu takip et
Yüzleşmekten kaçın
8. Memory tabanlı eylemler

Geçmiş deneyimler aday eylem havuzuna seçenek ekleyebilir.

Örneğin NPC geçmişte yaralı bir kuşa yardım etmek için şifalı ot kullanmış olsun.

Aktif hafıza:

{
  "memory": "healing_herb_helped_injured_bird",
  "relevance": 0.82,
  "confidence": 0.70
}

Üretilen eylem:

Şifalı otu tilki üzerinde kullanmayı dene

Ancak hafıza yanlış veya eksik olabilir.

Bu nedenle eylem kaydı:

type CandidateActionOrigin = {
  sourceType: string;
  sourceId?: string;
  confidence: number;
};

içermelidir.

9. Habit tabanlı eylemler

Alışkanlıklar aday üretiminde güçlü olabilir.

Örneğin NPC tehlikede her zaman yetişkin arıyorsa:

Yardım çağır
Köye dön
Yakındaki yetişkini bul

eylemleri otomatik olarak üretilir.

Alışkanlık aday üretim avantajı sağlar ama seçimi garanti etmez.

type HabitActionCandidate = {
  actionId: string;
  habitStrength: number;
  contextSimilarity: number;
};
10. Role ve duty tabanlı eylemler

NPC’nin dünyadaki rolü sorumluluklar üretir.

Örneğin bir köy muhafızı:

Tehdidi araştır
Köylüleri uyar
Yolu kapat
Rapor ver
Yaralıyı güvenli yere taşı

Bir şifacı:

Yarayı incele
Tedavi uygula
Hastayı dinlendir
Malzeme topla

Bir çocuk:

Bir yetişkinden yardım iste
Tehlikeden uzak dur
Arkadaşını yalnız bırakma

Rol, yalnızca utility ağırlığı değil, düşünülebilir eylem repertuarını da değiştirmelidir.

11. Current plan tabanlı eylemler

NPC’nin aktif bir planı varsa bir sonraki adım aday havuzuna yüksek öncelikle eklenmelidir.

{
  "plan": [
    "leave_food_for_fox",
    "mark_location",
    "go_to_village",
    "bring_healer"
  ],
  "currentStep": 1
}

Üretilen aday:

Tilkinin bulunduğu yeri işaretle

Ancak yeni bir tehdit ortaya çıkarsa plan dışı eylemler de oluşturulmalıdır.

Plan sistemi NPC’yi körleştirmemelidir.

12. Reactive actions

Bazı eylemler anlık olaylara tepki olarak oluşmalıdır.

Örnek olaylar:

Dal kırıldı
Tilki hırladı
Kardeşi düştü
Yangın başladı
Biri bağırdı
Kapı kapandı

Üretilen tepkiler:

Sese dön
Geri çekil
Kardeşine koş
Yangından uzaklaş
Kaynağı araştır
Kapıyı açmaya çalış

Reactive Action Generator yüksek zaman baskısında normal aday üretim sürecinin önüne geçebilir.

13. Eylem biçimi

Aday eylemler yalnızca string olmamalıdır.

type CandidateAction = {
  id: string;
  actionType: string;

  actorId: string;
  targetIds: string[];

  parameters: Record<string, unknown>;

  origins: CandidateActionOrigin[];

  preconditions: ActionCondition[];
  expectedEffects: ExpectedEffect[];

  estimatedDuration: number;
  estimatedEffort: number;

  requiredCapabilities: string[];
  requiredItems: string[];

  informationRequirements: string[];

  reversibility: number;
  interruptibility: number;

  abstractionLevel:
    | "primitive"
    | "tactical"
    | "strategic"
    | "meta";

  generationConfidence: number;
};

Örnek:

{
  "id": "action_help_fox_01",
  "actionType": "apply_healing_herb",
  "actorId": "mira",
  "targetIds": [
    "fox_12"
  ],
  "parameters": {
    "itemId": "healing_herb_04"
  },
  "origins": [
    {
      "sourceType": "memory",
      "sourceId": "memory_71",
      "confidence": 0.68
    },
    {
      "sourceType": "compassion_goal",
      "confidence": 0.91
    }
  ],
  "estimatedDuration": 180,
  "estimatedEffort": 0.45,
  "requiredCapabilities": [
    "approach_creature",
    "basic_first_aid"
  ],
  "requiredItems": [
    "healing_herb_04"
  ],
  "reversibility": 0.30,
  "interruptibility": 0.60,
  "abstractionLevel": "tactical",
  "generationConfidence": 0.73
}
14. Primitive, tactical ve strategic eylemler

Eylemler farklı soyutlama seviyelerinde olabilir.

Primitive

Tek motor hareketidir.

Bir adım ilerle
Elmayı bırak
Tilkiye bak
Kapıyı aç
Tactical

Kısa amaçlı eylemdir.

Tilkiyi güvenli biçimde besle
Yarayı incele
Kardeşini güvenli yere götür
Strategic

Daha büyük niyettir.

Tilki için yardım getir
Köye zamanında ulaş
Avcıdan gerçeği öğren
Meta

Karar verme sürecini iyileştiren eylemdir.

Daha fazla bilgi topla
Birine danış
Bekle
Planı değiştir

Decision Engine çoğunlukla tactical seviyede seçim yapmalı, Execution Engine bunu primitive adımlara çevirmelidir.

15. Aday sayısının kontrolü

Her nesne ve her hedef için tüm eylemler üretilirse aday sayısı patlar.

Örneğin 20 nesne ve 15 eylem türü:

300+ aday

üretebilir.

Bu nedenle Candidate Pipeline erken aşamada adayları daraltmalıdır.

Generate broadly
      ↓
Merge duplicates
      ↓
Remove impossible actions
      ↓
Relevance pruning
      ↓
Diversity preservation
      ↓
Utility evaluation
16. Relevance pruning

Her adaya bir başlangıç alaka skoru verilebilir.

type CandidateRelevance = {
  goalRelevance: number;
  needRelevance: number;
  emotionalRelevance: number;
  environmentalRelevance: number;
  socialRelevance: number;
  urgency: number;
};

Başlangıç skoru:

preUtilityScore =
  goalRelevance * 0.25 +
  needRelevance * 0.20 +
  emotionalRelevance * 0.15 +
  environmentalRelevance * 0.15 +
  socialRelevance * 0.10 +
  urgency * 0.15;

Bu skor nihai utility değildir. Yalnızca hangi adayların detaylı değerlendirilmeye değer olduğunu belirler.

17. Diversity preservation

Sadece en yüksek pre-score adaylarını alırsak tüm adaylar aynı türden olabilir.

Örneğin:

Tilkiye yaklaş
Tilkiye biraz yaklaş
Tilkiye dikkatlice yaklaş
Tilkiye sessizce yaklaş

Bunlar çeşitlilik değildir.

Aday havuzunda farklı yaklaşım kategorileri korunmalıdır.

Direct action
Safe alternative
Information gathering
Social action
Delay
Withdrawal
Creative compromise
Plan continuation

Örnek seçim havuzu:

Tilkiye doğrudan yardım et
Uzaktan gözlemle
Yiyecek bırak
Köyden yardım getir
Geri çekil

Bu çok daha kaliteli bir karar uzayı oluşturur.

18. Duplicate ve semantic merge

Aynı anlamdaki eylemler birleştirilmelidir.

Tilkiye yaklaş
Tilkinin yanına git
Tilkiye doğru ilerle

tek aday haline getirilebilir.

type ActionMergeResult = {
  canonicalAction: CandidateAction;
  mergedOrigins: CandidateActionOrigin[];
  mergedVariants: string[];
};

Kaynaklar birleştirilir:

{
  "origins": [
    {
      "sourceType": "compassion"
    },
    {
      "sourceType": "curiosity"
    },
    {
      "sourceType": "goal"
    }
  ]
}

Bir eylemin farklı motivasyonlardan üretilmesi önemlidir.

19. Impossible ve unknown ayrımı

Bir eylemin yapılamamasıyla, yapılıp yapılamadığının bilinmemesi farklıdır.

Impossible
Gerekli eşya yok
Fiziksel kapasite yok
Hedef erişilemez
Dünya kuralı izin vermiyor
Unknown
NPC kapının kilitli olup olmadığını bilmiyor
Bitkinin şifalı olduğundan emin değil
Tilkinin yaklaşmaya izin verip vermeyeceğini bilmiyor

Unknown eylemler elenmemeli; belirsizlikle Utility Evaluator’a gönderilmelidir.

20. Bilgi gereksinimi

Bazı eylemler doğrudan uygulanmak yerine önce bilgi toplamayı gerektirebilir.

Örnek:

Şifalı otu kullan

ama NPC bitkinin doğru bitki olduğundan emin değil.

Bu durumda pipeline yeni meta eylem üretebilir:

Bitkiyi incele
Geçmiş bilgisini hatırla
Birine sor
Önce küçük miktarda test et
type MissingInformation = {
  key: string;
  importance: number;
  currentConfidence: number;
  possibleAcquisitionActions: string[];
};
21. Action refinement

Utility Evaluator bir eylemde yüksek fayda ama yüksek risk tespit ettiğinde refinement isteği üretmişti.

Örnek:

Tilkiye yaklaş ve yardım et

Çatışma:

compassion yüksek
safety çok düşük

Refinement hedefi:

Yardım faydasını koru
Yaklaşma riskini azalt

Üretilen yeni eylemler:

Uzaktan yiyecek bırak
Tilkiyi sakinleştirmeye çalış
Bir arkadaşla birlikte yaklaş
Uzun bir dal kullanarak malzemeyi yaklaştır
Yardım çağır

Bu mekanizma LUMI’nin önemli farklarından biri olabilir.

Sistem yalnızca hazır seçenekler arasından seçim yapmaz; çatışmalara göre daha iyi seçenekler oluşturur.

22. Creative action generation

Her yaratıcı eylem serbest biçimde LLM tarafından üretilmemelidir.

Aksi halde:

Dünya kuralları bozulabilir.
NPC bilmediği bilgileri kullanabilir.
İmkânsız eylemler oluşabilir.
Karakter kapasitesi aşılabilir.

Daha güvenli yaklaşım:

Known Action Templates
      +
Available Objects
      +
Goals
      +
Conflict Resolution Pattern
      =
Novel Candidate

Örnek template:

type ActionCompositionTemplate = {
  purpose: "reduce_distance_risk";
  structure: [
    "use_tool",
    "maintain_distance",
    "deliver_resource"
  ];
};

Bu template ile:

Uzun dal kullanarak yiyeceği tilkiye yaklaştır

üretilir.

Yaratıcılık serbest metin değil, kural kontrollü bileşim olmalıdır.

23. Eylem maliyetleri generation aşamasında kesin hesaplanmamalı

Action Generator yalnızca kaba tahminler üretmelidir.

{
  "estimatedDuration": 120,
  "estimatedEffort": 0.4,
  "estimatedRisk": 0.5
}

Kesin değerlendirme Utility Evaluator’da yapılmalıdır.

Aksi halde aynı mantık iki farklı yerde tekrar edilir.

Sorumluluk ayrımı:

Action Generator:
Ne yapılabilir?

Utility Evaluator:
Bu eylem ne kadar iyi veya kötü?

Decision Selector:
Hangisi seçilmeli?
24. Action source trace

Her aday neden üretildiğini açıklamalıdır.

{
  "action": "seek_help",
  "origins": [
    {
      "sourceType": "goal",
      "sourceId": "protect_fox",
      "contribution": 0.70
    },
    {
      "sourceType": "fear",
      "contribution": 0.55
    },
    {
      "sourceType": "habit",
      "sourceId": "seek_adult_when_uncertain",
      "contribution": 0.62
    }
  ]
}

Bu sayede şu açıklama üretilebilir:

Mira hem tilkiye yardım etmek istediği hem de tek başına yaklaşmaktan korktuğu için köyden yardım getirmeyi düşündü.
25. Aday havuzu sınıfları

Üretilen adaylar kaynaklarına veya işlevlerine göre sınıflandırılabilir.

type CandidateCategory =
  | "goal_advancing"
  | "need_satisfying"
  | "threat_response"
  | "social"
  | "information_gathering"
  | "compromise"
  | "habitual"
  | "plan_step"
  | "exploratory"
  | "withdrawal";

Bir aday birden fazla kategoriye sahip olabilir.

{
  "action": "ask_healer_for_help",
  "categories": [
    "goal_advancing",
    "social",
    "information_gathering"
  ]
}
26. Candidate Action Pipeline

Önerilen tam akış:

1. Belief State alınır
2. Çevresel affordance’lar çıkarılır
3. Aktif hedeflerden adaylar üretilir
4. İhtiyaçlardan adaylar üretilir
5. Duygulardan tepkisel adaylar üretilir
6. İlişkilerden sosyal adaylar üretilir
7. İlgili hafızalardan adaylar üretilir
8. Alışkanlık ve rol adayları eklenir
9. Mevcut plan adımları eklenir
10. Meta eylemler eklenir
11. Kopya adaylar birleştirilir
12. Hard-impossible adaylar elenir
13. Bilgi eksikleri işaretlenir
14. Relevance pruning uygulanır
15. Kategori çeşitliliği korunur
16. Utility Evaluator’a gönderilir
17. Çatışmalı adaylar refine edilir
18. Refined adaylar tekrar değerlendirilir
27. Örnek senaryo

Mira gece ormanda yaralı bir tilki görüyor.

Girdiler
{
  "goals": [
    "reach_village",
    "avoid_unnecessary_harm"
  ],
  "needs": {
    "safety": 0.55,
    "hunger": 0.30
  },
  "emotions": {
    "fear": 0.62,
    "compassion": 0.80,
    "curiosity": 0.55
  },
  "inventory": [
    "apple",
    "healing_herb",
    "rope"
  ],
  "memories": [
    "healing_herb_helped_bird",
    "fox_once_bit_mira"
  ]
}
Üretilen ham adaylar
Tilkiye yaklaş
Tilkiyi incele
Tilkiye elma ver
Şifalı otu kullan
Tilkinin yanından uzaklaş
Köye devam et
Köyden yardım getir
Ağaca çıkıp gözlemle
Tilkiyi iple bağla
Bekle
Seslen
Hard filter sonrası
Tilkiye yaklaş
Tilkiyi incele
Tilkiye elma ver
Şifalı otu kullan
Uzaklaş
Köye devam et
Köyden yardım getir
Ağaca çıkıp gözlemle
Bekle
Seslen

Tilkiyi iple bağla adayının elenme nedeni:

Gereksiz zarar riski
Uygun beceri yok
Çocuk güvenliği guardrail’i
Relevance ve diversity sonrası
Tilkiye yaklaş ve incele
Güvenli mesafeden elma bırak
Şifalı otu kullan
Köyden yardım getir
Ağaca çıkıp çevreyi gözlemle
Yoluna devam et
Refinement sonrası

Şifalı otu kullanmak yüksek riskli bulunursa:

Önce otu incele
Tilkiye doğrudan dokunmadan otu yakınına bırak
Bir yetişkin getir

adayları eklenebilir.

28. İlk sürüm için sade yapı

İlk sürümde şu action kaynakları yeterlidir:

affordance
active goal
need
emotion
relationship
memory
habit
current plan

Aday kategorileri:

direct
safe alternative
information gathering
social/help request
withdrawal
plan continuation

Aday sınırı:

Ham aday: en fazla 30
Filtre sonrası: en fazla 12
Utility değerlendirmesi sonrası: en fazla 6

Refinement turu:

En fazla 1 tur
En fazla 3 yeni aday

Bu sınırlamalar sistemi kontrol altında tutar.

29. Action Generator veri modeli
type ActionGenerationResult = {
  actorId: string;
  contextId: string;

  rawCandidates: CandidateAction[];
  mergedCandidates: CandidateAction[];
  rejectedCandidates: {
    action: CandidateAction;
    reason: string;
  }[];

  shortlistedCandidates: CandidateAction[];

  missingInformation: MissingInformation[];

  generationStats: {
    generatedCount: number;
    mergedCount: number;
    rejectedCount: number;
    shortlistedCount: number;
  };

  explanation: string;
};
30. Temel prensipler

NPC yalnızca dünya içinde bildiği, algıladığı veya makul biçimde çıkarabildiği eylemleri düşünebilir.

Aday eylemler yalnızca hedeflerden değil; ihtiyaçlardan, duygulardan, ilişkilerden, hafızalardan ve alışkanlıklardan da doğar.

Action Generator eylemin iyi olup olmadığına karar vermez; yalnızca anlamlı karar uzayını oluşturur.

Yaratıcı eylemler dünya kuralları ve mevcut yeteneklerle uyumlu bileşimlerden üretilmelidir.

İç çatışma, daha dengeli ara eylemler üretmek için kullanılmalıdır.

Bilgi toplama, bekleme, yardım isteme ve karar erteleme de geçerli eylemlerdir.

Aday sayısı sınırlanmalı, ancak farklı yaklaşım türleri mutlaka korunmalıdır.