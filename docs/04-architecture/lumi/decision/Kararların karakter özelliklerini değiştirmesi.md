Kararların karakter özelliklerini değiştirmesi

Örneğin NPC’nin başlangıç değerleri şöyle olsun:

{
  "courage": 0.42,
  "compassion": 0.78,
  "honesty": 0.65,
  "curiosity": 0.70,
  "selfishness": 0.20
}

NPC korkmasına rağmen yaralı tilkiye yardım ederse:

{
  "courage": 0.43,
  "compassion": 0.785
}

Yardım edebileceği halde bilinçli olarak yardım etmezse:

{
  "compassion": 0.77,
  "selfishness": 0.205
}

Değişimler küçük olmalıdır. Tek bir karar karakteri tamamen değiştirmemelidir.

1. Trait değerleri sabit değil, yavaş değişen değerler olmalı
type TraitVector = {
  courage: number;
  compassion: number;
  honesty: number;
  loyalty: number;
  curiosity: number;
  patience: number;
  responsibility: number;
  selfishness: number;
  caution: number;
};

Her değer:

0.0 – 1.0

arasında tutulabilir.

Ancak başlangıç değeri doğrudan kalıcı gerçek karakter anlamına gelmemeli.

Şu ayrımı yapmak daha doğru olur:

type EvolvingTrait = {
  baseline: number;
  current: number;
  momentum: number;
  stability: number;
  evidenceCount: number;
};

Örnek:

{
  "courage": {
    "baseline": 0.42,
    "current": 0.45,
    "momentum": 0.03,
    "stability": 0.70,
    "evidenceCount": 6
  }
}

Burada:

baseline: Karakterin temel eğilimi
current: Şu anda oluşmuş karakter değeri
momentum: Son kararların hangi yönde ilerlediği
stability: Özelliğin ne kadar zor değiştiği
evidenceCount: Bu değeri destekleyen kaç anlamlı karar bulunduğu
2. Her karar trait değişimi üretmemeli

Her küçük hareket karakter özelliğini değiştirmemelidir.

Örneğin:

Kapıyı açmak
Bir bardak su içmek
Yolda yürümek

karakter gelişimi üretmez.

Trait değişimi ancak karar:

Gerçek bir alternatif içeriyorsa,
Karakter açısından anlamlıysa,
Bir bedeli veya riski varsa,
Bilinçli verilmişse,
Mevcut özelliklerden biriyle ilişkiliyse

uygulanmalıdır.

type TraitImpactEligibility = {
  meaningfulChoice: boolean;
  hadAlternative: boolean;
  actorAwareOfConsequences: boolean;
  emotionalIntensity: number;
  personalCost: number;
};
3. Cesaret örneği

Cesaret yalnızca tehlikeli eylem yapmak değildir.

Bir kararın cesaret artışı oluşturması için:

Karakter tehlikeyi algılamalı
Karakter korku hissetmeli
Geri çekilme seçeneği bulunmalı
Buna rağmen anlamlı bir nedenle hareket etmeli

Örneğin:

{
  "fear": 0.75,
  "perceivedRisk": 0.60,
  "hadSafeAlternative": true,
  "selectedAction": "help_fox"
}

Bu karar cesaret artışı üretir.

courageGain =
  perceivedRisk
  * fear
  * meaningfulness
  * chosenDespiteFear
  * learningRate;

Basit örnek:

0.60 × 0.75 × 0.80 × 1.00 × 0.02
= 0.0072

Yani:

Cesaret: 0.420 → 0.427

Bu küçük fakat anlamlı bir değişimdir.

4. Risk almak her zaman cesaret değildir

NPC gereksiz yere tehlikeye atılırsa cesaret artmamalıdır.

Bu davranış:

Cesaret

yerine:

Dürtüsellik
Dikkatsizlik
Risk arama

değerlerini artırabilir.

Örnek:

Bir arkadaşını kurtarmak için ateşe yaklaşmak:
courage +0.008
responsibility +0.004

Sırf gösteriş yapmak için ateşe atlamak:
courage +0.001
impulsiveness +0.008
approvalSeeking +0.005
caution -0.006

Dolayısıyla sonuçtan çok motivasyon önemlidir.

5. Yardım etmeme örneği

NPC yardım etme imkânına sahipken yardım etmezse compassion değeri düşebilir.

Fakat her yardım etmeme davranışı merhametsizlik değildir.

Şunları ayırmalıyız:

Yardım edemedi
Gücü yetmedi
Tehlike çok büyüktü
Bilgisi yoktu
Başka birini koruması gerekiyordu

Bu durumda compassion düşmemelidir.

Yardım etmeyi seçmedi
Umursamadı
Kendi rahatını seçti
İntikam duygusuyla hareket etti
Bilinçli şekilde görmezden geldi

Bu durumda compassion düşebilir.

compassionLoss =
  targetNeed
  * actorAbilityToHelp
  * actorAwareness
  * omissionIntentionality
  * learningRate;

Örnek:

Tilkinin ihtiyacı: 0.90
Yardım edebilme kapasitesi: 0.80
Durumu anlama: 0.90
Bilinçli kaçınma: 0.70
Öğrenme oranı: 0.015

Toplam azalma ≈ 0.0068
6. Sonuca göre değil, karara göre öğrenme

NPC iyi niyetle yardım etmeye çalışabilir fakat sonuç kötü olabilir.

Bu durumda compassion düşmemelidir.

Örneğin:

NPC tilkiye yardım etmeye çalıştı.
Yanlış bitki kullandı.
Tilkinin durumu kötüleşti.

Trait etkisi:

{
  "compassion": 0.006,
  "responsibility": 0.002,
  "confidence": -0.004
}

Sonuç kötü olsa da niyet merhametlidir.

Fakat NPC sonucu öğrendikten sonra hatasını kabul etmezse:

{
  "honesty": -0.004,
  "responsibility": -0.006
}

oluşabilir.

Yani değerlendirme üç ayrı katmanda yapılmalıdır:

Niyet
Karar
Sonuç sonrası davranış
7. Tek karar yerine tekrar eden davranış daha güçlü olmalı

Tek bir yardım etmeme kararı compassion değerini çok az etkiler.

Fakat aynı davranış sürekli tekrar ederse değişim hızlanabilir.

type TraitMomentum = {
  direction: "increase" | "decrease" | "neutral";
  consistency: number;
  recentEvidence: number;
};

Örnek:

Bir kez yardım etmedi:
compassion -0.003

Üç benzer durumda yardım etmedi:
compassion -0.005

On benzer durumda yardım etmedi:
compassion -0.010

Ancak büyüme sınırsız olmamalıdır.

momentumMultiplier = clamp(
  1 + consistentDecisionCount * 0.08,
  1,
  1.8
);
8. Özellik değerleri uçlara yaklaştıkça zor değişmeli

Cesaret değeri 0.20 olan bir NPC’nin küçük cesur kararlarla gelişmesi kolay olabilir.

Ancak değeri 0.92 olan bir NPC’nin 0.93 olması daha zor olmalıdır.

function saturationFactor(current: number, direction: number): number {
  if (direction > 0) {
    return 1 - current;
  }

  return current;
}

Artış örneği:

current courage = 0.40
saturation factor = 0.60
current courage = 0.90
saturation factor = 0.10

Bu sayede özellikler doğal biçimde uçlara yaklaşır fakat kolayca 0 veya 1 olmaz.

9. Trait stabilitesi

Her özellik aynı hızda değişmemeli.

{
  "courage": {
    "stability": 0.55
  },
  "compassion": {
    "stability": 0.80
  },
  "moodOptimism": {
    "stability": 0.25
  }
}

Yüksek stabilite:

Özellik zor değişir.

Düşük stabilite:

Deneyimlerden daha hızlı etkilenir.

Formül:

finalDelta =
  rawDelta
  * (1 - stability)
  * saturationFactor;

Compassion karakterin köklü bir özelliğiyse tek kararla kolayca değişmez.

10. Trait ile state ayrımı

Önemli bir ayrım daha yapmalıyız.

Bir NPC’nin korkması, cesaretsiz olduğu anlamına gelmez.

Trait:
Uzun süreli kişilik eğilimi

State:
Şu anki geçici durum

Örneğin:

type ActorPsychology = {
  traits: {
    courage: number;
  };

  states: {
    fear: number;
    confidence: number;
    fatigue: number;
  };
};

Cesur bir NPC de korkabilir.

{
  "courage": 0.82,
  "fear": 0.76
}

Cesaret, korkunun yokluğu değil; korkuya rağmen davranabilme eğilimidir.

11. Kararın trait etkisi ayrı kaydedilmeli

Her anlamlı karar sonrasında bir kayıt oluşturabiliriz.

type TraitChangeEvent = {
  eventId: string;
  actorId: string;
  decisionId: string;

  traitId: string;
  previousValue: number;
  delta: number;
  newValue: number;

  reason: string;
  evidenceStrength: number;
  intentionality: number;
  personalCost: number;

  sourceActionId: string;
  timestamp: string;
};

Örnek:

{
  "traitId": "courage",
  "previousValue": 0.420,
  "delta": 0.007,
  "newValue": 0.427,
  "reason": "Mira korkmasına rağmen yaralı tilkiye yaklaşmayı seçti.",
  "evidenceStrength": 0.81,
  "intentionality": 0.92,
  "personalCost": 0.60
}

Bu kayıt ileride karakter gelişimini göstermek için kullanılabilir.

12. Aynı karar birden fazla trait’i etkileyebilir

Tilkiye yardım etmek:

{
  "courage": 0.006,
  "compassion": 0.005,
  "responsibility": 0.003,
  "caution": -0.001
}

Bir arkadaşını korumak için yalan söylemek:

{
  "loyalty": 0.006,
  "honesty": -0.005,
  "protectiveness": 0.004
}

Bu karar iyi veya kötü diye tek etiket almamalıdır.

Aynı karar farklı karakter özelliklerinde farklı yönlere etki edebilir.

13. Karar ile sonuç arasında gecikmeli trait değişimi

Bazı özellik etkileri karar anında belli olmaz.

Örneğin NPC yardım etmeyip uzaklaşır.

Karar anında:

{
  "compassion": -0.002
}

Daha sonra tilkinin öldüğünü öğrenir ve pişman olur:

{
  "compassion": 0.003,
  "responsibility": 0.004,
  "selfForgiveness": -0.005
}

Bu ilginç bir sonuçtur:

Yardım etmemesi compassion değerini düşürürken, yaşadığı pişmanlık ve bundan çıkardığı ders daha sonra compassion değerini yükseltebilir.

Bu nedenle trait değişimleri sadece eylemden değil:

Karar
Sonuç
Sonucun öğrenilmesi
Pişmanlık
Yansıma
Başkalarının tepkisi

aşamalarından gelebilir.

14. Reflection mekanizması

Bir karakter deneyim üzerine düşünürse daha fazla öğrenebilir.

type ReflectionEvent = {
  actorId: string;
  sourceDecisionId: string;
  insight: string;
  acceptedResponsibility: number;
  emotionalIntensity: number;
  traitImpacts: TraitDelta[];
};

Örneğin:

“Tilkiye yardım edebilirdim ama korktum. Bir dahaki sefere yardım istemeliyim.”

Trait etkisi:

{
  "responsibility": 0.006,
  "compassion": 0.003,
  "courage": 0.002,
  "selfAwareness": 0.008
}

Bu, çocuk hikâyeleri için de çok değerli olur. Çünkü karakter gelişimi yalnızca başarıyla değil, hatadan öğrenmeyle de gerçekleşir.

15. Trait değişimi karar sistemini geri besler

Karar sonrası trait değişimi bir sonraki Utility Aggregation aşamasını etkiler.

Karar
  ↓
Trait Change
  ↓
Yeni Preference Weights
  ↓
Sonraki Karar

Örneğin Mira birkaç kez korkusuna rağmen hareket ederse:

courage: 0.42 → 0.48

Sonraki tehlikeli durumda:

safety ağırlığı biraz azalabilir
confidence artabilir
uncertainty penalty düşebilir

Ama doğrudan:

Cesaret yükseldi, artık her riski alır

dememeliyiz.

Cesaret:

Korkuya rağmen eylem seçimini artırır.
Fakat güvenlik değerlendirmesini silmez.
Dikkatsizliğe dönüşmez.
16. Karakter kimliği oluşumu

Belirli trait değerleri ve tekrar eden kararlar zamanla daha üst düzey kimlik özellikleri oluşturabilir.

type IdentityPattern = {
  id: string;
  supportingTraits: string[];
  supportingDecisions: string[];
  strength: number;
};

Örnek:

{
  "id": "protector_of_small_creatures",
  "supportingTraits": [
    "compassion",
    "courage",
    "responsibility"
  ],
  "strength": 0.72
}

Bu kimlik oluştuktan sonra kararları ayrıca etkileyebilir.

“Ben yardıma ihtiyacı olan canlıları yalnız bırakmam.”

Artık yardım kararı yalnızca compassion değerinden değil, karakterin kendisi hakkındaki inancından da gelir.

17. Negatif döngü tehlikesi

Burada dikkat etmemiz gereken bir risk var.

NPC bir kez korkakça davranırsa:

courage azalır

Cesaret azaldığı için bir sonraki sefer yine geri çekilir:

courage daha da azalır

Bu durum karakteri hızla tek yönde kilitleyebilir.

Bunu engellemek için:

Değişimler küçük tutulmalı,
Tekrarlanan olaylarda azalan getiri uygulanmalı,
Reflection toparlanma sağlayabilmeli,
Sosyal destek trait değişimini etkileyebilmeli,
Karar sonucu ile kimlik tamamen eşitlenmemeli,
Durumsal nedenler trait değişiminden ayrılmalı.

Örneğin NPC yorgun olduğu için geri çekildiyse cesareti düşmemelidir.

18. Önerilen Trait Update formülü

Genel formül şöyle olabilir:

traitDelta =
  baseImpact
  * decisionMeaningfulness
  * intentionality
  * personalCost
  * emotionalIntensity
  * evidenceStrength
  * momentumMultiplier
  * saturationFactor
  * (1 - traitStability);

Ardından:

newTraitValue = clamp(
  currentTraitValue + traitDelta,
  minTraitValue,
  maxTraitValue
);

Ancak tek karar için sınır koymalıyız:

maxSingleDecisionChange = 0.01;

Çok önemli olaylarda:

maxMajorDecisionChange = 0.03;

Travmatik veya hayat değiştiren olaylarda daha yüksek değer olabilir, fakat bu istisna olmalıdır.

19. Örnek tam karar etkisi

Mira’nın durumu:

{
  "courage": 0.42,
  "compassion": 0.78,
  "responsibility": 0.60
}

Durum:

Gece ormanda yaralı tilki var.
Mira korkuyor.
Geri dönme seçeneği var.
Yardım edebilecek durumda.
Tilkiye yaklaşmayı seçiyor.

Trait güncellemesi:

{
  "traitChanges": [
    {
      "trait": "courage",
      "delta": 0.007
    },
    {
      "trait": "compassion",
      "delta": 0.004
    },
    {
      "trait": "responsibility",
      "delta": 0.002
    }
  ]
}

Yeni değerler:

{
  "courage": 0.427,
  "compassion": 0.784,
  "responsibility": 0.602
}

Mira yardım etmeden uzaklaşırsa:

{
  "traitChanges": [
    {
      "trait": "compassion",
      "delta": -0.004
    },
    {
      "trait": "courage",
      "delta": -0.002
    },
    {
      "trait": "avoidance",
      "delta": 0.005
    }
  ]
}

Fakat yardım edemeyecek kadar yaralıysa:

{
  "traitChanges": []
}

Çünkü bu bir kişilik seçimi değil, kapasite sınırıdır.

Temel ilke

Bu kısmı şu prensiple sabitleyebiliriz:

Karakter özellikleri yalnızca kararları üretmez; kararların sonuçları tarafından da yavaşça yeniden şekillendirilir.

Bir diğer önemli prensip:

Bir kararın karakter özelliğine etkisi, yalnızca yapılan eyleme değil; niyete, algılanan alternatiflere, kişisel bedele, duygusal yoğunluğa ve karakterin sonuçtan ne öğrendiğine bağlıdır.

Bu mekanizma sayesinde NPC’ler hikâye boyunca gerçekten gelişebilir, gerileyebilir, alışkanlık kazanabilir veya geçmiş kararlarının oluşturduğu yeni bir kimliğe dönüşebilir.