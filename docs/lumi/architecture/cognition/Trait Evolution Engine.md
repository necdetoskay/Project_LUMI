Trait Evolution Engine

Trait Evolution Engine’in görevi:

NPC’nin aldığı kararları, bu kararların arkasındaki niyeti, taşıdığı bedeli ve sonradan yaşanan sonuçları değerlendirerek karakter özelliklerini küçük ve kontrollü adımlarla güncellemek.

Akış:

Decision Result
      ↓
Trait Evidence Extraction
      ↓
Impact Calculation
      ↓
Conflict and Context Check
      ↓
Trait Update
      ↓
Identity and Habit Update
      ↓
Character Development Record
1. Karar sonrası doğrudan güncelleme yapılmamalı

Decision Selector bir eylem seçtiğinde hemen:

cesaret +0.01

demek doğru olmaz.

Önce kararın karakter özelliği açısından ne ifade ettiği analiz edilmelidir.

Örneğin:

NPC ateşe girdi.

Bu tek başına cesaret göstergesi değildir.

Muhtemel nedenler:

Birini kurtarmak için girdi.
Tehlikeyi fark etmedi.
Büyü etkisi altındaydı.
Kaçacak başka yolu yoktu.
Gösteriş yapmak istedi.
Panikle yanlış yöne koştu.

Aynı eylem farklı trait etkileri üretir.

Bu yüzden önce Trait Evidence oluşturulur.

2. Trait Evidence
type TraitEvidence = {
  traitId: string;
  direction: "increase" | "decrease";

  strength: number;
  confidence: number;

  source:
    | "decision"
    | "action"
    | "omission"
    | "outcome_response"
    | "reflection"
    | "social_feedback";

  interpretation: string;

  conditions: {
    intentionality: number;
    awareness: number;
    freedomOfChoice: number;
    personalCost: number;
    emotionalIntensity: number;
    alternativeAvailability: number;
  };
};

Örnek:

{
  "traitId": "courage",
  "direction": "increase",
  "strength": 0.72,
  "confidence": 0.88,
  "source": "decision",
  "interpretation": "Mira korkmasına ve güvenli biçimde uzaklaşabilmesine rağmen tilkiye yardım etmeyi seçti.",
  "conditions": {
    "intentionality": 0.94,
    "awareness": 0.82,
    "freedomOfChoice": 0.90,
    "personalCost": 0.58,
    "emotionalIntensity": 0.76,
    "alternativeAvailability": 0.85
  }
}

Bu kayıt, henüz trait değerini değiştirmez. Sadece değişim için kanıt oluşturur.

3. Seçim özgürlüğü önemli olmalı

NPC’nin gerçek bir alternatifi yoksa aldığı karar kişiliği hakkında zayıf kanıt üretir.

Örnek:

Kapı kapanmış ve tek çıkış ateşin içinden geçmek.

NPC ateşin içinden geçerse:

freedomOfChoice düşük

olduğu için cesaret artışı küçük olmalıdır.

Buna karşılık:

Kaçabilirken arkadaşını kurtarmak için geri dönüyor.

ise güçlü cesaret kanıtıdır.

traitEvidenceStrength *= freedomOfChoice;
4. Niyet, eylem ve sonuç ayrımı

Her anlamlı olay üç ayrı trait değerlendirmesi üretmelidir.

Niyet

NPC ne yapmaya çalıştı?

Yardım etmek
Zarar vermek
Korunmak
İntikam almak
Takdir kazanmak
Gerçeği öğrenmek
Uygulanan eylem

NPC gerçekten ne yaptı?

Yaklaştı
Kaçtı
Yalan söyledi
Kaynağı paylaştı
Yardım istedi
Sonuç sonrası tepki

Sonuç ortaya çıkınca nasıl davrandı?

Sorumluluk aldı
Suçu başkasına attı
Hatasını düzeltti
Pişman oldu
Aldırmadı
Aynı davranışı savundu

Örneğin:

Niyet: Yardım etmek
Eylem: Yanlış şifalı otu kullanmak
Sonuç: Tilkinin durumu kötüleşti
Tepki: Hatasını kabul edip şifacı aramak

Trait etkisi:

{
  "compassion": 0.005,
  "responsibility": 0.006,
  "honesty": 0.003,
  "confidence": -0.002
}
5. Yapmamak da bir eylemdir

Trait Evolution Engine yalnızca yapılan eylemleri değil, bilinçli biçimde yapılmayan eylemleri de değerlendirmelidir.

type OmissionEvidence = {
  possibleActionId: string;
  actorWasAware: boolean;
  actorWasCapable: boolean;
  expectedCost: number;
  targetNeed: number;
  omissionReason: string;
};

Örnek:

NPC yardım ihtiyacını gördü.
Yardım edebilecek durumdaydı.
Risk düşüktü.
Sadece zaman kaybetmek istemedi.

Bu güçlü compassion azalması kanıtıdır.

Fakat:

NPC yardım ihtiyacını fark etmedi.

ise trait etkisi olmamalıdır.

6. Trait etkileri bağlama bağlı olmalı

Her eylem için sabit trait etkisi tanımlamak doğru değildir.

Yanlış yaklaşım:

{
  "action": "help",
  "compassionDelta": 0.01
}

Doğru yaklaşım:

Yardımın değeri =
hedefin ihtiyacı
× NPC’nin kişisel maliyeti
× yardımın bilinçliliği
× alternatiflerin varlığı
× motivasyonun niteliği

Kolay ve maliyetsiz bir yardım:

compassion +0.001

NPC’nin ciddi bir fedakârlık yaptığı yardım:

compassion +0.008
7. Trait çiftleri ve eksenleri

Bazı özellikleri birbirinden bağımsız tutmak yerine ilişkili eksenler olarak modellemek daha doğru olabilir.

Örnek:

courage ↔ avoidance
compassion ↔ indifference
honesty ↔ deception
patience ↔ impulsiveness
generosity ↔ possessiveness
trust ↔ suspicion
humility ↔ pride

Ancak bunların her zaman tam zıt olması gerekmez.

Bir karakter:

hem cesur
hem de bazı konularda kaçınan

olabilir.

Bu nedenle iki farklı model seçeneğimiz var.

Tek eksen modeli
courage: 0.7

Düşük değer korkaklığa yakınlığı ifade eder.

Çift boyut modeli
courage: 0.7
avoidance: 0.4

Bu daha zengin sonuç üretir.

LUMI için çift boyut modeli daha uygundur. Çünkü karakterler çelişkili özelliklere sahip olabilir.

Örneğin:

{
  "compassion": 0.82,
  "avoidance": 0.66
}

Karakter yardım etmek ister ama zor durumlarla yüzleşmekten kaçınır.

Bu iç çatışma hikâye üretiminde değerlidir.

8. Trait kategorileri

Trait’leri tek listede tutmak yerine gruplandırabiliriz.

type TraitProfile = {
  moral: MoralTraits;
  emotional: EmotionalTraits;
  social: SocialTraits;
  cognitive: CognitiveTraits;
  behavioral: BehavioralTraits;
};
Moral
compassion
honesty
fairness
responsibility
loyalty
forgiveness
Duygusal
courage
emotionalResilience
empathy
jealousy
shameSensitivity
angerControl
Sosyal
trust
cooperation
dominance
obedience
approvalSeeking
protectiveness
Bilişsel
curiosity
skepticism
creativity
planning
flexibility
attention
Davranışsal
patience
impulsiveness
persistence
avoidance
riskTaking
selfDiscipline

İlk sürümde daha küçük bir çekirdek set kullanılabilir.

9. Trait değişimi alan bağımlı olabilir

Bir karakter genel olarak cesur olabilir ama belirli alanlarda korkabilir.

Örneğin:

Sosyal cesaret
Fiziksel cesaret
Ahlaki cesaret
Bilinmeyene karşı cesaret

Bu nedenle trait’lerde isteğe bağlı bağlam alt boyutu olmalıdır.

type ContextualTraitValue = {
  general: number;
  contexts?: Record<string, number>;
};

Örnek:

{
  "courage": {
    "general": 0.60,
    "contexts": {
      "physical_danger": 0.72,
      "social_confrontation": 0.30,
      "darkness": 0.25,
      "protecting_friends": 0.85
    }
  }
}

Mira karanlıkta korkmasına rağmen tilkiye yardım ederse:

general courage küçük artar
darkness courage daha fazla artar
protecting creatures courage artar

Böylece gelişim daha anlamlı olur.

10. Genelleme mekanizması

Bir bağlamdaki deneyim ne kadar genel trait’e aktarılmalıdır?

Örneğin karanlık mağarada cesur davranmak:

darkness courage +0.010
general courage +0.002

Birçok farklı bağlamda cesur davranırsa genel cesaret daha fazla artar.

generalizationFactor =
  contextSimilarity
  * traitTransferability
  * evidenceDiversity;

Aynı tür olayın on kez tekrarlanması genel cesareti sınırlı etkiler.

Farklı durumlarda cesaret göstermek ise genel trait’i daha güçlü destekler.

11. Evidence Diversity

NPC sadece tilkilere yardım ediyorsa:

compassion genel olarak mı yüksek?

yoksa:

yalnızca tilkilere mi bağlı?

ayırt edilmelidir.

type TraitEvidenceSummary = {
  totalEvidence: number;
  uniqueContexts: number;
  uniqueTargets: number;
  consistency: number;
  diversity: number;
};

Örnek:

{
  "traitId": "compassion",
  "totalEvidence": 18,
  "uniqueContexts": 3,
  "uniqueTargets": 1,
  "consistency": 0.92,
  "diversity": 0.24
}

Bu durumda genel compassion yerine:

compassion_toward_foxes

veya:

attachment_to_foxes

daha doğru olabilir.

12. Trait değişimi kesin gerçek değil, çıkarım olabilir

Karakter özellikleri doğrudan gözlemlenen nesneler değildir. Kararlardan çıkarılır.

Bu nedenle her trait değerinin güven düzeyi olmalıdır.

type TraitValue = {
  value: number;
  confidence: number;
  evidenceCount: number;
  lastUpdatedAt: string;
};

Başlangıçta:

{
  "courage": {
    "value": 0.60,
    "confidence": 0.30,
    "evidenceCount": 0
  }
}

Kararlar geldikçe:

{
  "courage": {
    "value": 0.63,
    "confidence": 0.68,
    "evidenceCount": 9
  }
}

Bu sayede sistem erken aşamada karakter hakkında aşırı kesin davranmaz.

13. Baseline ve learned trait ayrımı

Başlangıç profili ile deneyim sonucu oluşan profil ayrı tutulmalıdır.

type TraitState = {
  baseline: number;
  learnedOffset: number;
  currentEffective: number;
};

Örnek:

{
  "courage": {
    "baseline": 0.40,
    "learnedOffset": 0.08,
    "currentEffective": 0.48
  }
}

Formül:

currentEffective =
  clamp(baseline + learnedOffset + temporaryModifiers, 0, 1);

Böylece:

Doğuştan veya başlangıçtan gelen eğilim,
Deneyimle öğrenilen değişim,
Geçici duygusal durum

birbirine karışmaz.

14. Geçici ve kalıcı değişim ayrımı

Bazı olaylar trait’i kalıcı değiştirmez, geçici davranış eğilimi oluşturur.

Örneğin:

Arkadaşının ihanetinden sonra güveni azaldı.

Bu ilk aşamada:

temporary trust modifier

olabilir.

Eğer uzun süre boyunca devam eder ve birçok kararı etkilerse kalıcı trait değişimine dönüşebilir.

type TemporaryTraitModifier = {
  traitId: string;
  delta: number;
  decayRate: number;
  sourceEventId: string;
};

Örnek:

{
  "traitId": "trust",
  "delta": -0.25,
  "decayRate": 0.02,
  "sourceEventId": "betrayal_104"
}

Zamanla:

-0.25
-0.23
-0.20
-0.16

şeklinde azalabilir.

Ancak tekrar eden ihanetler, bu etkinin bir kısmını kalıcı learned offset’e dönüştürebilir.

15. Consolidation: geçici deneyimin karaktere yerleşmesi

Karakter gelişimi için bir Consolidation Process kullanabiliriz.

Geçici davranış değişimi
      ↓
Tekrarlanan benzer deneyimler
      ↓
Reflection veya güçlü duygusal olay
      ↓
Kalıcı trait değişimi
type TraitConsolidationRule = {
  minimumEvidence: number;
  minimumConsistency: number;
  minimumDuration: number;
  conversionRate: number;
};

Örnek:

Mira birkaç gün cesur davranıyor.

Bu hemen temel cesaretini büyük ölçüde değiştirmez.

Fakat:

Farklı tehlikelerde cesur davranıyor.
Korkusunun üzerine düşünüyor.
Başarılı olduğunu görüyor.

Bunun sonucunda geçici güven kalıcı cesaret gelişimine dönüşebilir.

16. Başarı ve başarısızlığın etkisi

Karar trait’i, sonuç ise daha çok:

confidence
self-efficacy
learned expectations

gibi değerleri etkilemelidir.

Örneğin cesur davranış başarılı oldu:

{
  "courage": 0.005,
  "confidence": 0.008,
  "selfEfficacy": 0.010
}

Cesur davranış başarısız oldu:

{
  "courage": 0.004,
  "confidence": -0.006,
  "riskExpectation": 0.005
}

NPC cesur davranmış olabilir fakat başarısızlık nedeniyle bir sonraki sefer daha az özgüvenli olabilir.

Cesaret ile özgüven aynı şey değildir.

17. Başkalarının geri bildirimi

NPC’nin davranışına verilen sosyal tepki de gelişimi etkileyebilir.

Örneğin Mira tilkiye yardım etti.

Şifacı:

“Çok cesur davrandın.”

dedi.

Bu durumda:

courage identity
self-image
approval association

güçlenebilir.

Fakat biri:

“Çok düşüncesiz davrandın.”

derse:

caution
self-doubt
shame

etkilenebilir.

type SocialFeedbackImpact = {
  sourceTrust: number;
  sourceAuthority: number;
  relationshipStrength: number;
  feedbackValence: number;
  identityRelevance: number;
};

Her geri bildirim aynı ağırlıkta olmamalıdır.

Yakın bir ebeveynin görüşüyle yabancı bir NPC’nin görüşü farklı etki üretir.

18. Self-concept

NPC’nin gerçek trait değerleriyle kendisi hakkındaki inancı aynı olmayabilir.

type SelfConceptVector = {
  perceivedCourage: number;
  perceivedCompassion: number;
  perceivedHonesty: number;
};

Örneğin:

{
  "actualCourage": 0.65,
  "perceivedCourage": 0.35
}

Mira aslında cesur davranıyor olabilir fakat kendisini hâlâ korkak görüyor olabilir.

Tekrarlanan deneyimler ve sosyal geri bildirim self-concept’i değiştirir.

Bu ayrım hikâyede güçlü gelişim fırsatları yaratır:

Karakter başından beri düşündüğünden daha cesur olduğunu fark eder.
19. Identity Formation

Trait değerleri yeterli değildir. Zamanla karakter bunlardan kimlik cümleleri oluşturabilir.

type IdentityBelief = {
  id: string;
  statement: string;
  strength: number;
  confidence: number;
  supportingEvidenceIds: string[];
  contradictoryEvidenceIds: string[];
};

Örnek:

{
  "id": "i_help_those_in_need",
  "statement": "Yardıma ihtiyacı olanları yalnız bırakmam.",
  "strength": 0.74,
  "confidence": 0.69
}

Bu kimlik sonraki kararlarda ayrı bir utility katkısı oluşturur.

Bu eylem benim kim olduğumla uyumlu mu?
20. Kimlikle çelişen kararlar

Karakter bazen kendi kimliğiyle çelişen bir karar alabilir.

Örneğin kendisini yardımsever gören Mira, korkudan tilkiyi bırakıp gider.

Bu durumda:

type IdentityConflict = {
  identityId: string;
  actionId: string;
  conflictStrength: number;
  emotionalResponse: {
    guilt: number;
    shame: number;
    confusion: number;
  };
};

Bu olay:

Kimliği zayıflatabilir,
Suçluluk oluşturabilir,
Reflection başlatabilir,
Sonraki telafi eylemine neden olabilir.

Bir çelişki kimliği hemen silmemelidir.

“Ben artık yardımsever değilim.”

yerine:

“Bu sefer korkuma yenildim.”

şeklinde yorumlanabilir.

Tekrarlanan çelişkiler kimliği gerçekten zayıflatır.

21. Trait update pipeline

Tam süreç şöyle olabilir:

1. DecisionResult alınır
2. Aktörün belief state’i okunur
3. Gerçek alternatifler değil, algılanan alternatifler belirlenir
4. Niyet analiz edilir
5. Seçim özgürlüğü hesaplanır
6. Kişisel bedel hesaplanır
7. Trait evidence üretilir
8. Bağlamsal ve genel etkiler ayrılır
9. Stability ve saturation uygulanır
10. Tek karar sınırı uygulanır
11. Geçici veya kalıcı güncelleme seçilir
12. Trait history kaydedilir
13. Habit momentum güncellenir
14. Self-concept değerlendirilir
15. Identity evidence güncellenir
16. Gerekirse reflection olayı planlanır
22. Trait Evolution sonucu
type TraitEvolutionResult = {
  actorId: string;
  decisionId: string;

  evidence: TraitEvidence[];

  appliedChanges: TraitChangeEvent[];
  temporaryModifiers: TemporaryTraitModifier[];

  identityImpacts: {
    identityId: string;
    delta: number;
    reason: string;
  }[];

  selfConceptImpacts: {
    traitId: string;
    delta: number;
  }[];

  habitImpacts: {
    habitId: string;
    delta: number;
  }[];

  reflectionRecommended: boolean;
  reflectionTopics: string[];

  summary: string;
};
23. Örnek: Yardım etti

Mira:

{
  "courage": 0.42,
  "compassion": 0.78,
  "selfConcept": {
    "perceivedCourage": 0.30
  }
}

Karar:

Korkmasına rağmen tilkiye yardım etti.

Sonuç:

{
  "appliedChanges": [
    {
      "traitId": "courage",
      "delta": 0.006
    },
    {
      "traitId": "compassion",
      "delta": 0.003
    },
    {
      "traitId": "responsibility",
      "delta": 0.002
    }
  ],
  "selfConceptImpacts": [
    {
      "traitId": "perceivedCourage",
      "delta": 0.012
    }
  ],
  "identityImpacts": [
    {
      "identityId": "protector_of_small_creatures",
      "delta": 0.018,
      "reason": "Mira kişisel risk taşımasına rağmen yaralı tilkiyi korudu."
    }
  ]
}

Self-concept, gerçek trait’ten daha hızlı değişebilir. Çünkü tek bir güçlü olay karakterin kendisine bakışını etkileyebilir.

24. Örnek: Yardım etmedi

Mira tilkiye yardım edebilecekken yalnızca yolculuğunun gecikmesini istemediği için uzaklaşıyor.

{
  "appliedChanges": [
    {
      "traitId": "compassion",
      "delta": -0.004
    },
    {
      "traitId": "responsibility",
      "delta": -0.002
    },
    {
      "traitId": "avoidance",
      "delta": 0.003
    }
  ],
  "identityImpacts": [
    {
      "identityId": "i_help_those_in_need",
      "delta": -0.012,
      "reason": "Mira yardım edebileceğini bilmesine rağmen ilgilenmemeyi seçti."
    }
  ],
  "reflectionRecommended": true,
  "reflectionTopics": [
    "Neden yardım etmedi?",
    "Kararından sonra ne hissediyor?",
    "Bir dahaki sefere farklı davranmak ister mi?"
  ]
}
25. Karakter gelişim grafiği

Trait değişimleri zaman çizelgesinde tutulursa karakter gelişimi gözlemlenebilir.

Cesaret

0.42 ── başlangıç
0.427 ─ tilkiye yardım
0.431 ─ mağaraya yalnız girdi
0.429 ─ fırtınada geri çekildi
0.438 ─ arkadaşını savundu
0.451 ─ karanlık korkusuyla yüzleşti

Bu veriler:

Hikâye özetinde,
Ebeveyn görünümünde,
Karakter sayfasında,
Dünya simülasyonunda,
Geliştirici debug ekranında

kullanılabilir.

Ancak çocuk arayüzünde ham sayılar yerine anlatısal ifadeler daha uygun olabilir:

“Mira son maceralarda korkularıyla daha sık yüzleşiyor.”
26. İlk sürüm için sade Trait Evolution

İlk sürümde şu trait’lerle başlayabiliriz:

courage
compassion
honesty
curiosity
responsibility
patience
loyalty
avoidance
impulsiveness

Her trait için:

type SimpleTraitState = {
  baseline: number;
  learnedOffset: number;
  stability: number;
  confidence: number;
};

Her anlamlı karardan sonra:

1. Trait evidence üret
2. En fazla üç trait’i etkilet
3. Değişimi ±0.001 ile ±0.01 arasında tut
4. Çok büyük olaylarda ±0.03 sınırı kullan
5. Seçim özgürlüğü düşükse değişimi azalt
6. Bağlam kaynaklı kararlarda trait değişimi yapma
7. Karar izini sakla

Bu ilk sürüm için yeterince güçlü ve kontrol edilebilir olur.

27. Decision Engine’e geri bağlantı

Güncellenmiş trait’ler bir sonraki kararda tekrar kullanılır.

Decision
   ↓
Trait Evolution
   ↓
Updated Actor Profile
   ↓
Next Utility Evaluation

Örneğin cesaret yükseldiğinde doğrudan güvenlik değeri düşürülmez.

Bunun yerine:

fear karşısında hareket edebilme ağırlığı artar
avoidance bias azalır
yüksek riskli fakat anlamlı eylemler daha erken viable hale gelir

Compassion azaldığında:

yardım eylemlerinin social/moral utility ağırlığı biraz azalır
omission regret azalabilir
başkalarının aciliyetine verilen önem düşebilir

Böylece trait değişimleri gerçekten davranışa yansır.