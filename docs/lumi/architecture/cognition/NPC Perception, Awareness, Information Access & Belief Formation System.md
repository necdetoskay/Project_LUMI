# NPC Perception, Awareness, Information Access & Belief Formation System

Bu sistem, NPC’lerin dünya hakkındaki bilgiyi doğrudan ve eksiksiz biçimde bilmesini engeller.

NPC yalnızca:

* gördüğü,
* duyduğu,
* hissettiği,
* hatırladığı,
* kendisine anlatılan,
* kayıtlardan öğrendiği,
* çıkarım yaptığı

bilgiler üzerinden karar verir.

Temel ilke şudur:

> Dünya state’i gerçektir; NPC belief state’i ise o gerçeğin sınırlı, gecikmiş, eksik veya yanlış bir yorumudur.

Bu ayrım, NPC’lerin gerçekten yaşayan karakterler gibi davranabilmesi için kritik önemdedir.

---

# 1. World State ile Belief State ayrımı

## World State

Evrenin sistem tarafından bilinen gerçek durumudur.

```text
Kayıp keçi güney vadisindedir.
Köprü kuzey tarafında hasarlıdır.
Yaşlı denizci limandaki depoda beklemektedir.
Gizemli ışık eski gözlemevinden gelmektedir.
```

## Belief State

NPC’nin doğru olduğuna inandığı durumdur.

```text
Çoban:
Keçinin kuzey ormanına gittiğini düşünüyor.

Bekçi:
Köprünün hâlâ güvenli olduğunu sanıyor.

Haritacı:
Işığın dağın arkasından geldiğine inanıyor.

Tüccar:
Yaşlı denizcinin köyü terk ettiğini duymuş.
```

NPC davranışı doğrudan World State üzerinden değil, kendi Belief State’i üzerinden üretilmelidir.

```text
Gerçeklik
→ Algı
→ Yorum
→ İnanç
→ Karar
```

---

# 2. Sistem akışı

```text
World Signal
→ Sensory Detection
→ Attention Filter
→ Perception Record
→ Interpretation
→ Knowledge or Belief Update
→ Confidence Evaluation
→ Memory Storage
→ Decision Influence
```

Bir olayın dünyada gerçekleşmesi, her NPC’nin onu bildiği anlamına gelmez.

Örneğin meydanda bir çan çalarsa:

* meydandaki NPC doğrudan duyar,
* yakındaki evdeki NPC zayıf biçimde duyar,
* ormandaki NPC duymaz,
* işitme sorunu olan NPC yanlış anlayabilir,
* daha önce aynı çanı tehlike işareti olarak bilen NPC farklı tepki verir.

---

# 3. Algı kanalları

```ts
type PerceptionChannel =
  | "vision"
  | "hearing"
  | "smell"
  | "touch"
  | "taste"
  | "temperature"
  | "pain"
  | "balance"
  | "magical"
  | "social"
  | "written"
  | "reported";
```

Her kanal farklı bilgi türleri ve belirsizlikler üretir.

---

## 3.1 Görsel algı

NPC’nin doğrudan görebildiği durumları kapsar.

```text
Bir NPC’nin konumu
Bir kapının açık olup olmadığı
Bir nesnenin rengi
Yaklaşan duman
Birinin yüz ifadesi
Yerdeki ayak izleri
```

Görsel algıyı etkileyen unsurlar:

```text
Mesafe
Işık
Hava
Görüş engelleri
Hareket
Nesnenin büyüklüğü
NPC’nin görüş yeteneği
Dikkat seviyesi
```

```ts
type VisualPerceptionContext = {
  distance: number;
  lightLevel: number;
  visibility: number;
  occlusion: number;
  targetMotion: number;
  observerVision: number;
  attention: number;
};
```

---

## 3.2 İşitsel algı

NPC’nin seslerden bilgi çıkarmasını sağlar.

```text
Ayak sesi
Çığlık
Kapı kapanması
Uzak konuşma
Hayvan sesi
Fırtına
Müzik
```

İşitsel bilgi çoğu zaman görsel bilgiden daha belirsizdir.

```text
NPC bir çığlık duyabilir
ama:
- kimin bağırdığını,
- neden bağırdığını,
- tam olarak nerede olduğunu

bilmeyebilir.
```

```ts
type AuditoryPerception = {
  perceivedSoundType: string;
  estimatedDirection?: number;
  estimatedDistance?: number;
  recognizedSourceId?: string;
  clarity: number;
  confidence: number;
};
```

---

## 3.3 Koku algısı

Özellikle hayvan NPC’ler ve bazı fantastik karakterler için önemlidir.

```text
Duman
Yemek
Yağmur
Tanıdık kişi
Yaralı hayvan
Tehlikeli bitki
```

Koku:

* doğrudan hedefi tanımlamayabilir,
* yön ve yakınlık hissi verebilir,
* geçmiş hafızaları tetikleyebilir,
* türlere göre farklı hassasiyet taşıyabilir.

Örneğin tilki NPC:

```text
Çocuğun kokusunu tanıyabilir.
Ancak çocuğu henüz görmemiş olabilir.
```

---

## 3.4 Dokunma, sıcaklık ve ağrı

NPC kendi fiziksel durumunu algılar.

```text
Üşüme
Yorgunluk
Yara ağrısı
Zeminin kayganlığı
Bir nesnenin sıcaklığı
```

Bu bilgiler dış dünya kadar önemlidir.

Çünkü NPC kendi state’ini de kusursuz bilmez.

Örneğin:

```text
NPC yaralandığını bilir
ama yaranın ne kadar ciddi olduğunu yanlış değerlendirebilir.
```

---

## 3.5 Sosyal algı

NPC yalnızca kelimeleri değil, sosyal işaretleri de algılar.

```text
Ses tonu
Yüz ifadesi
Bakıştan kaçınma
Konuşma hızı
Sessizlik
Yakınlık
Grup davranışı
```

Sosyal algı kesin gerçek üretmez.

```text
“Benden bir şey saklıyor gibi görünüyor.”
```

bir belief olabilir, bilgi değildir.

```ts
type SocialPerception = {
  perceivedEmotion?: string;
  perceivedIntent?: string;
  confidence: number;
  evidenceIds: string[];
  interpretationBiases: string[];
};
```

---

# 4. Sensory capability profile

Her NPC aynı algı kapasitesine sahip değildir.

```ts
type SensoryCapabilityVector = {
  visionRange: number;
  lowLightVision: number;
  hearingRange: number;
  soundDiscrimination: number;
  smellSensitivity: number;
  touchSensitivity: number;
  socialCueSensitivity: number;
  magicalSensitivity: number;
};
```

Örnek:

```text
Baykuş:
Gece görüşü yüksek
Uzak ses algısı yüksek

İnsan çocuk:
Sosyal işaret algısı orta
Gece görüşü düşük

Tilki:
Koku hassasiyeti çok yüksek

Yaşlı bilgin:
Görüş düşük
Yazılı sembol tanıma yüksek
```

---

# 5. Perception range

NPC yalnızca fiziksel mesafeye göre bilgi almaz.

Algı menzili kanal bazlıdır.

```text
Vision Range
Hearing Range
Smell Range
Social Awareness Range
Magical Detection Range
```

Bir olayın algılanması için:

```text
Signal Strength
× Channel Suitability
× NPC Sensitivity
× Attention
× Environmental Clarity
```

değerlendirilir.

```text
Perception Score
=
Signal Strength
+ Sensory Capability
+ Attention
+ Familiarity
- Distance Penalty
- Obstruction
- Noise
- Weather Interference
```

---

# 6. Line of sight

Görsel algıda yalnızca mesafe yeterli değildir.

NPC ile hedef arasında görüş hattı bulunmalıdır.

Engeller:

```text
Duvar
Kapalı kapı
Ağaç
Kalabalık
Sis
Karanlık
Yükseklik farkı
```

Bir NPC duvarın arkasındaki eşyayı bilmez.

Ancak daha önce orada olduğunu gördüyse, hâlâ orada olduğuna inanabilir.

Bu durumda:

```text
Direct knowledge:
Eşya oradaydı.

Current belief:
Muhtemelen hâlâ orada.

Current certainty:
Orta.
```

---

# 7. Occlusion memory

Bir nesne görüşten çıktığında NPC onu anında unutmaz.

```text
Çocuk sandığın arkasına geçti.
NPC çocuğun hâlâ sandığın arkasında olduğunu düşünebilir.
```

Fakat zaman geçtikçe konum güveni azalır.

```ts
type TrackedEntityBelief = {
  entityId: string;
  lastSeenLocationId: string;
  lastSeenAt: WorldTime;
  predictedLocationId?: string;
  locationConfidence: number;
  movementExpectation: number;
};
```

---

# 8. Attention System

NPC çevresindeki her şeyi aynı anda algılamamalıdır.

Dikkat sınırlıdır.

```ts
type AttentionState = {
  focusTargetId?: string;
  focusedTaskId?: string;
  alertness: number;
  distractionLevel: number;
  activeAttentionSlots: number;
  backgroundAwareness: number;
};
```

NPC’nin dikkati şu unsurlardan etkilenir:

```text
Mevcut görev
Tehlike
Duygusal yoğunluk
Yorgunluk
Merak
Tanıdık sesler
Ani hareket
Kişisel önem
```

---

# 9. Focused ve peripheral perception

## Focused perception

NPC özellikle dikkat ettiği hedefi ayrıntılı algılar.

```text
Şifacı yarayı inceliyor.
Haritacı sembolü çözüyor.
Bekçi kapıyı gözlüyor.
```

## Peripheral perception

NPC doğrudan bakmadığı çevresel değişiklikleri sınırlı biçimde algılar.

```text
Yan tarafta bir gölge geçti.
Uzakta bir kapı kapandı.
Birisi odaya girdi.
```

Peripheral algı genellikle:

* daha düşük ayrıntı,
* daha düşük güven,
* yanlış tanımlama riski

taşır.

---

# 10. Salience

Bazı sinyaller dikkati otomatik olarak çeker.

```text
Yüksek ses
Ani hareket
Tehlike işareti
NPC’nin adı
Tanıdık ses
Parlak ışık
Duygusal olarak önemli kişi
```

```ts
type PerceptionSalience = {
  novelty: number;
  threat: number;
  emotionalRelevance: number;
  goalRelevance: number;
  sensoryIntensity: number;
};
```

Yüksek salience, NPC’nin mevcut odağını kesebilir.

Fakat bu, her yeni olayın davranışı kesmesi anlamına gelmez.

Algı sistemi olayı fark eder; Interrupt System müdahale gerekip gerekmediğini ayrıca değerlendirir.

---

# 11. Perception record

Her anlamlı algı bir kayıt oluşturabilir.

```ts
type PerceptionRecord = {
  perceptionId: string;
  observerId: string;

  channel: PerceptionChannel;
  sourceEntityId?: string;
  sourceEventId?: string;

  perceivedAttributes: Record<string, unknown>;

  locationId: string;
  perceivedAt: WorldTime;

  clarity: number;
  confidence: number;
  attentionLevel: number;

  direct: boolean;
  ambiguous: boolean;

  possibleInterpretations?: string[];
};
```

Örnek:

```json
{
  "observerId": "npc_arin",
  "channel": "hearing",
  "sourceEventId": "sound_wood_crack",
  "perceivedAttributes": {
    "soundType": "wood_breaking",
    "direction": "north",
    "distance": "medium"
  },
  "clarity": 0.65,
  "confidence": 0.55,
  "direct": true,
  "ambiguous": true,
  "possibleInterpretations": [
    "tree_branch_breaking",
    "bridge_damage",
    "heavy_animal_movement"
  ]
}
```

---

# 12. Perception ile knowledge ayrımı

Her algı doğrudan bilgiye dönüşmemelidir.

```text
Algı:
Ormanda büyük bir gölge görüldü.

Bilgi:
Ormanda bir şey hareket etti.

Belief:
Bu bir ayı olabilir.

Kesin olmayan varsayım:
Ayı köye yaklaşıyor.
```

Bu katmanlar ayrılmalıdır.

```text
Observation
→ Fact Candidate
→ Interpretation
→ Belief
```

---

# 13. Knowledge types

```ts
type KnowledgeType =
  | "observed_fact"
  | "reported_fact"
  | "learned_rule"
  | "historical_record"
  | "personal_experience"
  | "inference"
  | "rumor"
  | "hypothesis"
  | "prediction";
```

---

## 13.1 Observed fact

NPC’nin doğrudan algıladığı bilgidir.

```text
Kapının açık olduğunu gördüm.
```

Yine de algı kalitesi düşükse yanlış olabilir.

---

## 13.2 Reported fact

Başka birinin söylediği bilgidir.

```text
Bekçi, köprünün kapalı olduğunu söyledi.
```

Doğruluk kaynak güvenine bağlıdır.

---

## 13.3 Learned rule

NPC’nin dünya hakkında öğrendiği genel bilgidir.

```text
Bu bitki gece ışık verir.
Kuzey yolu yağmurda çamurlanır.
Ejderhalar yüksek sesten hoşlanmaz.
```

Kurallar zamanla güncelliğini kaybedebilir veya istisnalara sahip olabilir.

---

## 13.4 Historical record

Kitap, harita, yazıt veya kayıttan öğrenilen bilgidir.

```text
Eski gözlemevi yüz yıl önce kapatılmış.
```

Kaydın doğru, eksik veya eski olması mümkündür.

---

## 13.5 Personal experience

NPC’nin geçmişte yaşadığı olaylardan çıkardığı bilgidir.

```text
Bu tüccar daha önce sözünü tuttu.
Bu mağaranın girişi yağmurda kapanıyor.
```

---

## 13.6 Inference

Birden fazla bilgiden çıkarılan sonuçtur.

```text
Yerde ıslak ayak izleri var.
Kapı açık.
İçeride kimse görünmüyor.

Inference:
Birisi kısa süre önce içeri girmiş olabilir.
```

Inference kesin gerçek değildir.

---

## 13.7 Rumor

Kaynağı belirsiz veya dolaylı bilgidir.

```text
İnsanlar kuzey dağında bir dev yaşadığını söylüyor.
```

---

## 13.8 Hypothesis

NPC’nin test etmeye çalıştığı açıklamadır.

```text
Gizemli ışığın gözlemevinden geldiğini düşünüyorum.
```

---

## 13.9 Prediction

Geleceğe yönelik beklentidir.

```text
Bu bulutlara bakılırsa akşam yağmur yağabilir.
```

---

# 14. Knowledge entry

```ts
type KnowledgeEntry = {
  knowledgeId: string;
  holderId: string;

  subjectId?: string;
  predicate: string;
  value: unknown;

  type: KnowledgeType;

  sourceIds: string[];
  acquiredAt: WorldTime;
  lastConfirmedAt?: WorldTime;

  confidence: number;
  freshness: number;
  relevance: number;

  verificationStatus:
    | "unverified"
    | "partially_verified"
    | "verified"
    | "disputed"
    | "disproven"
    | "outdated";

  visibility:
    | "private"
    | "shareable"
    | "secret"
    | "restricted";
};
```

---

# 15. Belief model

Bir belief, NPC’nin doğru olduğunu düşündüğü bir iddiadır.

```ts
type NPCBelief = {
  beliefId: string;
  holderId: string;

  proposition: string;
  subjectId?: string;
  value?: unknown;

  supportingKnowledgeIds: string[];
  contradictingKnowledgeIds: string[];

  confidence: number;
  emotionalInvestment: number;
  identityInvestment: number;

  status:
    | "tentative"
    | "accepted"
    | "strong"
    | "doubted"
    | "rejected"
    | "revised";

  createdAt: WorldTime;
  lastEvaluatedAt: WorldTime;
};
```

Belief’ler yalnızca bilgi miktarından etkilenmez.

NPC’nin:

* duyguları,
* değerleri,
* geçmişi,
* korkuları,
* ilişkileri

de belief oluşumuna etki eder.

---

# 16. Belief confidence

```text
Belief Confidence
=
Evidence Quality
+ Source Reliability
+ Repetition
+ Direct Observation
+ Existing Knowledge Compatibility
+ Emotional Confirmation
- Contradictions
- Information Age
- Ambiguity
- Known Bias
```

Duygusal doğrulama belief güvenini artırabilir fakat gerçek doğruluğu artırmaz.

Örneğin korkan NPC:

```text
Ormandaki her sesi tehlike kanıtı olarak yorumlayabilir.
```

---

# 17. Evidence yapısı

```ts
type BeliefEvidence = {
  evidenceId: string;
  beliefId: string;

  sourceType:
    | "perception"
    | "testimony"
    | "memory"
    | "record"
    | "inference"
    | "behavior";

  sourceId: string;

  supportDirection:
    | "supports"
    | "contradicts"
    | "neutral";

  strength: number;
  reliability: number;
  independence: number;
};
```

Aynı söylentiyi beş kişinin tekrar etmesi her zaman beş bağımsız kanıt değildir.

Hepsi aynı kişiden duymuş olabilir.

Bu nedenle `independence` önemlidir.

---

# 18. Source tracking

NPC bir bilgiyi kimden öğrendiğini mümkün olduğunca hatırlamalıdır.

```text
“Bunu liman bekçisinden duydum.”
“Kitapta okudum.”
“Kendi gözlerimle gördüm.”
“Çocuğun söylediğini hatırlıyorum.”
```

Kaynak takibi sayesinde NPC:

* bilgiyi doğrulayabilir,
* güven seviyesini ayarlayabilir,
* yanlış bilgi yayılımını takip edebilir,
* kişilere göre bilgiye farklı değer verebilir.

---

# 19. Source reliability

Her NPC diğer kaynaklara güven düzeyi taşır.

```ts
type SourceReliabilityProfile = {
  holderId: string;
  sourceId: string;

  honestyEstimate: number;
  competenceEstimate: number;
  memoryAccuracyEstimate: number;
  biasEstimate: number;
  contextExpertise: Record<string, number>;

  lastUpdatedAt: WorldTime;
};
```

Bir kaynak dürüst olabilir fakat konu hakkında bilgisiz olabilir.

```text
Çocuk doğru söylediğine inanıyor
ama uzaktan gördüğü hayvanı yanlış tanımış olabilir.
```

Bu nedenle:

```text
Honesty
≠
Accuracy
```

---

# 20. Trust-context relation

Kaynak güveni bağlama göre değişmelidir.

Örneğin aynı NPC:

```text
Hava tahmininde güvenilir olabilir.
Eski efsanelerde abartılı olabilir.
Para hesabında dikkatsiz olabilir.
Bitkiler konusunda uzman olabilir.
```

Dolayısıyla güven tek sayı olmamalıdır.

```ts
type ContextualTrustVector = {
  generalHonesty: number;
  practicalKnowledge: number;
  localKnowledge: number;
  emotionalObjectivity: number;
  secrecyRisk: number;
  domainTrust: Record<string, number>;
};
```

---

# 21. Testimony System

NPC’ler birbirlerine bilgi aktarabilir.

```ts
type Testimony = {
  testimonyId: string;
  speakerId: string;
  listenerId: string;

  proposition: string;
  originalSourceId?: string;

  speakerConfidence: number;
  speakerIntent:
    | "inform"
    | "warn"
    | "persuade"
    | "comfort"
    | "mislead"
    | "speculate";

  distortionLevel: number;
  sharedAt: WorldTime;
};
```

Bilgi aktarımı sırasında içerik değişebilir.

```text
Orijinal:
“Ormanda büyük bir gölge gördüm.”

İkinci anlatım:
“Ormanda büyük bir hayvan varmış.”

Üçüncü anlatım:
“Ormanda dev bir yaratık dolaşıyormuş.”
```

---

# 22. Rumor propagation

Söylenti sistemi kontrollü çalışmalıdır.

```text
Observation
→ Testimony
→ Retelling
→ Distortion
→ Rumor
```

Her aktarımda değişebilecek unsurlar:

```text
Boyut
Tehlike
Kesinlik
Yer
Zaman
Aktör
Sebep
```

```ts
type RumorState = {
  rumorId: string;
  coreClaim: string;
  originId?: string;

  spreadCount: number;
  distortion: number;
  confidenceAverage: number;

  knownByNpcIds: string[];
  variants: RumorVariant[];
};
```

---

# 23. Rumor mutation

Söylenti değişimi tamamen rastgele olmamalıdır.

NPC’nin:

* korkuları,
* beklentileri,
* anlatım tarzı,
* hafıza doğruluğu,
* dikkat seviyesi

aktarımı etkiler.

Örneğin korkak NPC:

```text
Belirsiz sesi daha tehlikeli anlatabilir.
```

Gösterişi seven NPC:

```text
Kendi rolünü büyütebilir.
```

Dikkatli NPC:

```text
“Emin değilim ama...” diyerek güven seviyesini korur.
```

---

# 24. Misinformation

Yanlış bilgi iki şekilde oluşabilir.

## Unintentional misinformation

NPC yanlış görmüş, yanlış hatırlamış veya yanlış yorumlamıştır.

## Intentional misinformation

NPC bilerek yanlış bilgi vermiştir.

```ts
type MisinformationIntent =
  | "protect"
  | "hide_secret"
  | "avoid_blame"
  | "manipulate"
  | "joke"
  | "gain_advantage";
```

Çocuk dostu anlatıda kasıtlı yanıltma kullanılabilir fakat:

* aşırı karanlık olmamalı,
* anlaşılabilir motivasyona dayanmalı,
* düzeltme ve öğrenme fırsatı sunmalı,
* tüm NPC’leri güvensiz hâle getirmemelidir.

---

# 25. Secrets ve restricted knowledge

Bazı bilgiler doğru olsa bile herkesle paylaşılmaz.

```ts
type KnowledgeAccessRule = {
  knowledgeId: string;

  accessLevel:
    | "public"
    | "community"
    | "role_restricted"
    | "relationship_restricted"
    | "secret"
    | "personal";

  requiredRoleIds?: string[];
  minimumTrust?: number;
  allowedNpcIds?: string[];

  disclosureRisk: number;
};
```

Örnek:

```text
Herkese açık:
Pazar yarın kapalı.

Rol kısıtlı:
Bekçi nöbet rotası.

İlişki kısıtlı:
NPC’nin geçmişte yaptığı hata.

Gizli:
Gözlemevinin gerçek anahtarı.
```

---

# 26. Knowledge access

NPC’nin bir bilgiyi öğrenebilmesi için yalnızca fiziksel olarak yakın olması yeterli değildir.

Bilgi kaynakları:

```text
Doğrudan gözlem
Konuşma
Kitap
Harita
Mektup
Duyuru
Meslek bilgisi
Rol yetkisi
Özel ilişki
Gizli alan
```

NPC tüm kitapları okuyamaz, tüm kayıtları açamaz ve tüm konuşmaları otomatik duyamaz.

---

# 27. Written information

Yazılı bilgi için ek şartlar gerekebilir.

```text
Okuma becerisi
Dil bilgisi
Sembol bilgisi
Işık
Belgeye erişim
Belgenin fiziksel durumu
```

```ts
type WrittenKnowledgeAccess = {
  documentId: string;
  readerId: string;

  languageFit: number;
  literacyFit: number;
  symbolKnowledgeFit: number;
  documentCondition: number;

  extractionConfidence: number;
};
```

Bir NPC belgeyi okuyabilir fakat yanlış yorumlayabilir.

---

# 28. Domain knowledge

Algı ve bilgi yorumlama, uzmanlıktan etkilenir.

Örneğin aynı ayak izine bakan iki NPC:

```text
Çocuk:
“Bir hayvan geçmiş.”

Avcı:
“Genç bir tilki, birkaç saat önce kuzeye gitmiş.”

Şifacı:
“Hayvanın bir ayağında yaralanma olabilir.”
```

Dünya sinyali aynıdır.

Çıkarılan bilgi farklıdır.

```ts
type DomainKnowledgeVector = {
  tracking: number;
  medicine: number;
  navigation: number;
  history: number;
  nature: number;
  socialInsight: number;
  mechanics: number;
  magic: number;
};
```

---

# 29. Perception interpretation

Algılanan verinin anlamlandırılması şu unsurlara bağlıdır:

```text
Geçmiş bilgi
Uzmanlık
Duygu
Kişilik
Beklenti
Önyargı
Bağlam
```

```text
Interpretation Score
=
Evidence Fit
+ Domain Knowledge
+ Prior Belief Fit
+ Context Fit
+ Emotional Bias
```

Burada yüksek skor her zaman doğru yorum anlamına gelmez.

Önceden güçlü bir yanlış inanç, yeni algıyı yanlış yorumlatabilir.

---

# 30. Cognitive biases

NPC’lerin sınırlı bilişsel eğilimleri olabilir.

```ts
type CognitiveBiasVector = {
  confirmationBias: number;
  authorityBias: number;
  familiarityBias: number;
  optimismBias: number;
  threatBias: number;
  loyaltyBias: number;
  recencyBias: number;
  conformityBias: number;
};
```

---

## 30.1 Confirmation bias

NPC mevcut inancını destekleyen bilgiyi daha kolay kabul eder.

```text
NPC ormanın tehlikeli olduğuna inanıyor.
Her kırık dalı tehlike kanıtı sayabilir.
```

---

## 30.2 Authority bias

NPC otorite figürlerinin bilgisine daha çok inanır.

```text
Köy lideri söylediği için doğru kabul eder.
```

---

## 30.3 Familiarity bias

Tanıdık açıklamalar daha güvenilir görünür.

```text
Yeni bir büyü açıklaması yerine
bildiği hayvan davranışını tercih eder.
```

---

## 30.4 Threat bias

Korkan NPC belirsiz bilgiyi tehlike yönünde yorumlar.

---

## 30.5 Loyalty bias

NPC sevdiği kişinin hatalı olabileceğini kabul etmekte zorlanabilir.

---

# 31. Bias safety

NPC önyargıları:

* karaktere derinlik katmalı,
* aşağılayıcı stereotiplere dönüşmemeli,
* gerçek dünyadaki hassas grupları hedef almamalı,
* öğrenme ve düzeltme imkânı taşımalıdır.

LUMI’de bilişsel hata, karakter davranışı içindir; ayrımcı etiketleme sistemi değildir.

---

# 32. Belief consistency

NPC aynı anda çelişkili belief’ler taşıyabilir.

```text
“Denizciye güveniyorum.”
“Denizcinin bu konuda bir şey sakladığını düşünüyorum.”
```

Bu iki belief tamamen uyumsuz değildir.

Ancak açık çelişkiler gerilim oluşturur.

```ts
type BeliefConflict = {
  beliefIdA: string;
  beliefIdB: string;
  conflictStrength: number;

  resolutionState:
    | "unnoticed"
    | "noticed"
    | "investigating"
    | "resolved"
    | "tolerated";
};
```

---

# 33. Cognitive dissonance

NPC’nin değerleri ile bilgileri çatışabilir.

```text
NPC öğretmeninin her zaman doğru söylediğine inanıyor.
Ancak öğretmenin yanlış bir harita verdiğini görüyor.
```

NPC şu tepkilerden birini gösterebilir:

```text
Bilgiyi reddet
Alternatif açıklama ara
Sessizce şüphelen
Öğretmene sor
İnancını güncelle
```

Bu seçim NPC’nin:

* güvenine,
* cesaretine,
* bağlılığına,
* yeni kanıtın gücüne

bağlıdır.

---

# 34. Belief revision

Yeni bilgi geldiğinde belief güncellenir.

```text
New Evidence
→ Compatibility Check
→ Source Evaluation
→ Confidence Update
→ Belief Revision
```

Olası sonuçlar:

```text
Güçlenir
Zayıflar
Şüpheli hâle gelir
Başka belief’e dönüşür
Reddedilir
```

```ts
type BeliefRevision = {
  beliefId: string;
  previousConfidence: number;
  newConfidence: number;

  revisionType:
    | "reinforced"
    | "weakened"
    | "corrected"
    | "reversed"
    | "suspended";

  triggerEvidenceIds: string[];
};
```

---

# 35. Strong belief resistance

Kimlikle bağlantılı güçlü belief’ler tek kanıtla değişmemelidir.

```text
“Ben iyi bir iz sürücüyüm.”
“Bu köy güvenlidir.”
“Arkadaşım bana asla yalan söylemez.”
```

Yeni kanıt belief’i hemen silmek yerine:

```text
Güveni düşürür
Şüphe oluşturur
Doğrulama hedefi üretir
Duygusal tepki oluşturur
```

Bu, karakter dönüşümünü daha doğal kılar.

---

# 36. Falsification ve verification

NPC bir belief’i doğrulamak için hedef oluşturabilir.

```text
Belief:
Gizemli ışık gözlemevinden geliyor.

Verification goals:
- Işığı farklı bir noktadan gözlemle
- Haritayı kontrol et
- Gözlemevine yaklaş
- Başka tanıklarla konuş
```

```ts
type VerificationTask = {
  beliefId: string;
  method:
    | "observe"
    | "ask"
    | "test"
    | "compare"
    | "inspect_record"
    | "repeat_event";

  expectedInformationGain: number;
  cost: number;
  risk: number;
};
```

---

# 37. Information gain

NPC her zaman hedefi çözmek için değil, belirsizliği azaltmak için eylem yapabilir.

```text
Bu sesi kimin çıkardığını öğren
Kapının neden açılmadığını kontrol et
Haritanın güncel olup olmadığını doğrula
```

```text
Information Utility
=
Expected Uncertainty Reduction
+ Goal Relevance
+ Safety Benefit
+ Planning Benefit
- Cost
- Risk
```

Bu, NPC’lerin sebepsiz risk almak yerine önce bilgi toplamasını sağlar.

---

# 38. Unknown, uncertain ve false ayrımı

Sistem şu durumları ayırmalıdır:

```text
Unknown:
NPC bu konu hakkında hiçbir şey bilmiyor.

Uncertain:
NPC’nin bir tahmini var fakat güveni düşük.

False belief:
NPC yanlış bir şeye inanıyor.

Outdated knowledge:
Bilgi eskiden doğruydu fakat artık değişti.
```

Örnek:

```text
Unknown:
Şifacının nerede olduğunu bilmiyor.

Uncertain:
Şifacının pazarda olabileceğini düşünüyor.

False belief:
Şifacının evde olduğuna inanıyor fakat değil.

Outdated:
Şifacı normalde evde olurdu, bugün taşındı.
```

---

# 39. Knowledge freshness

Bilgiler zamanla eskir.

```ts
type KnowledgeFreshnessProfile = {
  decayRate: number;
  volatility:
    | "static"
    | "slow"
    | "moderate"
    | "fast";

  revalidationInterval?: number;
};
```

Örnek:

```text
Dağın konumu:
Statik

Köprünün durumu:
Orta değişken

NPC’nin mevcut konumu:
Hızlı değişken

Bir ilişkinin durumu:
Orta değişken
```

NPC eski bilgiyi kullanabilir ancak güveni azalmalıdır.

---

# 40. Location belief

NPC başkalarının konumunu kesin olarak bilmemelidir.

```ts
type LocationBelief = {
  entityId: string;
  believedLocationId?: string;
  lastConfirmedLocationId?: string;

  lastConfirmedAt?: WorldTime;
  confidence: number;

  predictionSource:
    | "last_seen"
    | "routine"
    | "reported"
    | "inferred"
    | "tracked";
};
```

Örnek:

```text
NPC fırıncının sabahları fırında olduğunu bilir.
Onu bugün görmedi.
Yine de fırında olabileceğini düşünür.
```

Bu, rutin bilgisine dayalı tahmindir.

---

# 41. Routine-based inference

NPC’ler birbirlerinin alışkanlıklarını öğrenebilir.

```text
“Arin bu saatte genellikle limanda olur.”
“Mira yağmur başlayınca kliniğe döner.”
```

Bu bilgi:

* arama planını hızlandırır,
* sosyal buluşmaları etkiler,
* yanlış beklenti oluşturabilir.

NPC rutinden sapmışsa diğer NPC’lerin belief’leri hemen güncellenmez.

---

# 42. Knowledge of absence

Bir NPC’nin bir yerde görülmemesi, orada olmadığını kesin göstermez.

```text
“Onu pazarda görmedim.”
```

Bu bilgi:

```text
Pazarda değil
```

şeklinde kesin belief üretmemelidir.

Daha doğru:

```text
Onu pazarda görmedim.
Orada olup olmadığından emin değilim.
```

Algı sistemi negatif bilgiyi dikkatle işlemelidir.

---

# 43. Object permanence ve inventory belief

NPC, başka NPC’lerin envanterini doğrudan bilmez.

```text
Çocuğun yıldız anahtarını aldığını gördü.
Daha sonra anahtarın hâlâ çocukta olduğuna inanabilir.
```

Ancak:

* çocuk anahtarı bırakmış olabilir,
* başka birine vermiş olabilir,
* kaybetmiş olabilir.

```ts
type PossessionBelief = {
  itemId: string;
  believedOwnerId?: string;
  lastObservedAt?: WorldTime;
  confidence: number;
};
```

---

# 44. Self-knowledge

NPC kendi durumunu da tamamen doğru bilmemelidir.

```text
Kendisini daha cesur sanabilir.
Yorgunluğunu küçümseyebilir.
Bir konuda yeteneğini abartabilir.
Birinin kendisine kızdığını fark etmeyebilir.
```

```ts
type SelfBeliefVector = {
  perceivedCourage: number;
  perceivedCompetence: Record<string, number>;
  perceivedHealth: number;
  perceivedRelationships: Record<string, number>;
};
```

Gerçek state ile self-belief arasındaki fark karakter gelişimi üretebilir.

---

# 45. Theory of Mind

NPC’ler başkalarının ne bildiği, ne istediği ve neye inandığı hakkında tahmin taşıyabilir.

```ts
type TheoryOfMindModel = {
  observerId: string;
  targetId: string;

  believedTargetKnowledgeIds: string[];
  believedTargetIntentIds: string[];
  believedTargetEmotion?: EmotionVector;
  confidence: number;
};
```

Örnek:

```text
Mira, çocuğun tilkinin yaralı olduğunu bildiğini düşünüyor.
Ancak çocuk bunu henüz bilmiyor olabilir.
```

Bu durumda iletişim hatası oluşabilir.

---

# 46. False-belief scenarios

Theory of Mind sayesinde klasik yanlış inanç durumları üretilebilir.

```text
Arin anahtarı masada gördü.
Odadan çıktı.
Mira anahtarı sandığa koydu.
Arin geri döndüğünde anahtarı masada arar.
```

Arin dünya gerçeğini değil, kendi belief state’ini takip eder.

Bu, yaşayan dünya hissini ciddi biçimde güçlendirir.

---

# 47. Knowledge sharing decision

NPC bir bilgiyi biliyor olsa bile paylaşmak zorunda değildir.

```text
Share Utility
=
Helpfulness
+ Relationship Trust
+ Role Duty
+ Urgency
+ Moral Value
- Secrecy
- Social Risk
- Personal Cost
- Harm Risk
```

NPC şunlardan birini seçebilir:

```text
Tam paylaş
Kısmi paylaş
İpucu ver
Daha sonra paylaş
Başka birine yönlendir
Gizli tut
```

---

# 48. Partial disclosure

NPC bazen bilginin yalnızca bir bölümünü açıklar.

```text
Tam bilgi:
Eski gözlemevinin kapısı yer altındaki tünelden açılıyor.

Kısmi bilgi:
Gözlemevinin başka bir girişi olabilir.
```

Kısmi paylaşımın nedeni:

```text
Güven yetersiz
Tehlike riski
Verilen söz
Utanç
Bilginin tam doğrulanmamış olması
```

---

# 49. Secret burden

Gizli bilgi NPC üzerinde duygusal yük oluşturabilir.

```ts
type SecretBurden = {
  knowledgeId: string;
  holderId: string;

  emotionalWeight: number;
  conflictWithValues: number;
  pressureToReveal: number;
  fearOfConsequences: number;
};
```

Uzun süre saklanan bilgi:

* suçluluk,
* kaçınma,
* gergin konuşma,
* güven testi,
* itiraf niyeti

oluşturabilir.

---

# 50. Conversation knowledge boundaries

Diyalog sistemi NPC’nin sahip olmadığı bilgiyi konuşturamaz.

Her diyalog öncesinde:

```text
NPC bu bilgiyi biliyor mu?
Bilginin kaynağı nedir?
Bilgi güncel mi?
Paylaşmaya yetkili mi?
Paylaşmak istiyor mu?
```

kontrol edilmelidir.

LLM’ye gönderilen karakter bağlamı yalnızca NPC’nin erişebildiği belief ve knowledge kayıtlarından oluşturulmalıdır.

---

# 51. Anti-omniscience gate

LLM tabanlı NPC’lerde en büyük risklerden biri her şeyi bilen karakterlerdir.

Bu nedenle ayrı bir kontrol kapısı gerekir.

```ts
type KnowledgePermissionCheck = {
  npcId: string;
  requestedFactId: string;

  hasKnowledge: boolean;
  hasBelief: boolean;
  beliefConfidence?: number;
  allowedToDisclose: boolean;

  responseMode:
    | "state_fact"
    | "state_belief"
    | "express_uncertainty"
    | "deny_knowledge"
    | "redirect";
};
```

Örnek:

```text
NPC doğru bilgiyi bilmiyorsa:

Yanlış:
“Keçi güney vadisinde.”

Doğru:
“Onu kuzey yolunda aradım ama bulamadım.
Belki başka tarafa gitmiştir.”
```

---

# 52. Uncertainty expression

NPC güven seviyesini doğal dilde yansıtmalıdır.

```text
Yüksek güven:
“Kapı kilitli.”

Orta güven:
“Sanırım kapı kilitli.”

Düşük güven:
“Uzaktan öyle göründü ama emin değilim.”

Söylenti:
“İnsanlar kapının geceleri kendiliğinden açıldığını söylüyor.”
```

Bu ifadeler karakter stiline göre değişebilir.

---

# 53. Information privacy

NPC’ler kişisel bilgileri gereksiz yere yaymamalıdır.

```text
Bir NPC’nin korkusu
Geçmiş hatası
Gizli hediyesi
Sağlık durumu
Özel mektubu
```

Bilgi erişim seviyesi ile paylaşım niyeti birlikte değerlendirilmelidir.

Bu, çocuklara güven ve mahremiyet kavramlarını sağlıklı biçimde gösterebilir.

---

# 54. Perception event aggregation

Her küçük algı ayrı kayıt hâline gelmemelidir.

Örneğin NPC yürürken:

```text
Her ağaç
Her taş
Her kuş sesi
```

saklanmaz.

Yalnızca:

* hedefle ilgili,
* yeni,
* duygusal,
* tehlikeli,
* şaşırtıcı,
* anlatısal olarak anlamlı

algılar kaydedilir.

```text
Perception Relevance
=
Goal Relevance
+ Novelty
+ Emotional Weight
+ Threat
+ Social Importance
```

---

# 55. Ambient awareness

Önemsiz çevresel bilgiler toplu olarak tutulabilir.

```text
Pazar kalabalık.
Hava serin.
Meydanda normalden fazla bekçi var.
Ormanda kuş sesleri azalmış.
```

Bu bilgiler tam nesne listesi yerine ortam özeti olarak saklanabilir.

```ts
type AmbientAwareness = {
  locationId: string;
  crowdLevel: number;
  dangerTone: number;
  weatherFeel: string;
  unusualSignals: string[];
  observedAt: WorldTime;
};
```

---

# 56. Group knowledge

Bazı bilgiler topluluk düzeyinde yaygın olabilir.

```text
Köyde herkes yarın festival olduğunu biliyor.
```

Ancak group knowledge:

```text
Her NPC kesin biliyor
```

anlamına gelmemelidir.

Bazı NPC’ler:

* duymamış,
* unutmuş,
* yanlış tarih hatırlıyor,
* ilgilenmemiş

olabilir.

```ts
type CommunityKnowledge = {
  communityId: string;
  knowledgeId: string;
  disseminationLevel: number;
  expectedAwareness: number;
  exceptions: string[];
};
```

---

# 57. Role-based awareness

Bazı roller belirli bilgileri varsayılan olarak takip eder.

```text
Bekçi:
Giriş-çıkışlar ve tehlikeler

Şifacı:
Yaralılar ve ilaç stokları

Tüccar:
Pazar fiyatları ve yollar

Haritacı:
Rotalar ve coğrafi değişiklikler
```

Bu otomatik bilgi değil, yüksek fark etme ve öğrenme ihtimalidir.

---

# 58. Event awareness propagation

Büyük olaylar NPC’lere aşamalı yayılır.

```text
Olay gerçekleşir
→ Yakındaki NPC’ler doğrudan algılar
→ Rol sahipleri bilgilendirilir
→ Duyuru yapılır
→ Sosyal ağlarda yayılır
→ Uzak NPC’lere gecikmeli ulaşır
```

Örnek:

```text
Köprü yıkıldı.

Dakika 0:
Yakındaki NPC’ler biliyor.

Saat 1:
Bekçiler ve tüccarlar biliyor.

Saat 3:
Köyün çoğu biliyor.

Ertesi gün:
Uzak yerleşimlere haber ulaşabilir.
```

---

# 59. Knowledge network

Bilgi yayılımı NPC ilişkileri üzerinden modellenebilir.

```ts
type InformationNetworkEdge = {
  sourceNpcId: string;
  targetNpcId: string;

  contactFrequency: number;
  trust: number;
  communicationSpeed: number;
  topicAffinity: Record<string, number>;
};
```

Sık görüşen NPC’ler daha hızlı bilgi paylaşır.

Ancak:

* gizli bilgi,
* düşük güven,
* konu ilgisizliği,
* mesafe

yayılımı sınırlar.

---

# 60. Delayed awareness

NPC bir olayın sonucunu yaşayıp sebebini bilmeyebilir.

```text
Pazar yolu kapalı.
NPC bunun sel nedeniyle olduğunu henüz bilmiyor.
```

Bu durumda belief:

```text
Yol kapalı.
Sebebi bilinmiyor.
```

olmalıdır.

Sistem sebep ile sonucu otomatik bağlamamalıdır.

---

# 61. Information contradiction

NPC çelişkili bilgiler alabilir.

```text
Bekçi:
“Köprü kapalı.”

Tüccar:
“Ben sabah geçtim.”

Haritacı:
“Haritada alternatif yol var.”
```

NPC şu seçenekleri değerlendirebilir:

```text
Daha güvenilir kaynağa inan
Bilginin zamanını karşılaştır
İkisini de geçici olarak tut
Doğrulama görevi oluştur
Konuyu ertele
```

---

# 62. Timestamp reasoning

Bir bilginin zamanı kritik olabilir.

```text
Tüccar sabah köprüden geçmiş olabilir.
Köprü öğleden sonra yıkılmış olabilir.
```

Bilgiler görünüşte çelişse bile zamanları farklıysa ikisi de doğru olabilir.

Her bilgi kaydı:

```text
Ne zaman doğruydu?
Ne zaman öğrenildi?
Ne zaman doğrulandı?
```

alanlarını taşımalıdır.

---

# 63. Belief-based planning

Planlama motoru NPC’nin belief state’ini kullanır.

```text
NPC köprünün açık olduğuna inanıyorsa
rotasını köprü üzerinden planlayabilir.
```

Köprüye vardığında gerçek durumla karşılaşır:

```text
Plan assumption invalid
→ Belief update
→ Replan
```

Bu bağlantı önceki planlama sistemiyle doğrudan ilişkilidir.

---

# 64. Belief-based emotion

Duygular da gerçeklikten çok belief’e tepki verir.

```text
NPC arkadaşının kaybolduğuna inanıyor.
Gerçekte arkadaş güvende.
```

NPC yine de endişelenebilir.

Gerçeği öğrendiğinde:

```text
Endişe azalır
Rahatlama oluşur
Yanlış bilgi kaynağı değerlendirilir
```

---

# 65. Belief-based relationships

İlişki değişimi de algılanan niyete göre olabilir.

```text
NPC çocuğun sözünü bilerek bozduğunu düşünüyor.
Gerçekte çocuk engellenmişti.
```

Belief sonucu:

```text
Güven azalabilir.
Kırgınlık oluşabilir.
Açıklama talebi doğabilir.
```

Gerçek öğrenildiğinde ilişki düzeltilebilir.

Bu, yanlış anlaşılma temelli çocuk dostu hikâyeler için güçlüdür.

---

# 66. Memory interaction

Perception ve belief kayıtlarının hepsi kalıcı hafızaya dönüşmez.

Kalıcılaşma faktörleri:

```text
Duygusal yoğunluk
Tekrar
Hedef ilişkisi
Şaşırtıcılık
Kişisel önem
Tehlike
Sosyal sonuç
```

Düşük önemli bilgiler zamanla unutulabilir.

Ancak bilgi unutulsa bile genel iz kalabilir.

```text
Detayı unutmuş olabilir
ama:
“Bu bölge güvenli değildi.” hissini korur.
```

---

# 67. Memory distortion

NPC geçmiş algıları zamanla değiştirebilir.

```text
Bir olayın ayrıntılarını karıştırabilir.
Sonradan öğrendiği bilgiyi eski anısına ekleyebilir.
Duygusal tonu olduğundan güçlü hatırlayabilir.
```

Bu kontrollü olmalıdır.

Ana hikâye için kritik gerçekler rastgele bozulmamalıdır.

---

# 68. Player perception asymmetry

Çocuk ile NPC aynı olayı farklı algılayabilir.

```text
Çocuk:
Gökyüzünde güzel bir ışık gördü.

Karanlıktan korkan NPC:
Tehlikeli bir işaret gördüğünü düşündü.

Haritacı:
Gözlemevi sinyali olabileceğini düşündü.
```

Bu farklı yorumlar hikâyeyi zenginleştirir.

Oyuncuya tek bir zorunlu yorum dayatılmamalıdır.

---

# 69. Perception-driven story hooks

Algı sistemi doğal hikâye kancaları üretebilir.

```text
NPC uzakta bir ışık gördü.
Bir ses duydu ama kaynağını bulamadı.
Bir arkadaşın davranışında değişiklik fark etti.
Haritadaki işaretin yer değiştirdiğini düşündü.
```

Bunlar kesin olay yerine araştırılabilir belirsizlikler oluşturur.

---

# 70. Controlled ambiguity

Her algı anında açıklanmamalıdır.

```text
Belirsiz ses
Yarım görülmüş gölge
Eksik mektup
Çelişkili tanıklık
```

Ancak belirsizlik:

* anlamsız olmamalı,
* çözülebilir izler taşımalı,
* sürekli uzatılmamalı,
* çocuğu haksız biçimde yanıltmamalıdır.

---

# 71. Child-friendly misinformation rules

Yanlış bilgi ve sırlar için temel kurallar:

1. Çocuk yaptığı doğru çıkarım nedeniyle cezalandırılmamalıdır.
2. Yanlış anlaşılmalar düzeltilebilir olmalıdır.
3. Güven tamamen anlamsız hâle getirilmemelidir.
4. Bilgi kaynaklarının neden yanıldığı anlaşılabilir olmalıdır.
5. Kasıtlı yalanlar ölçülü kullanılmalıdır.
6. Bilgiyi doğrulama olumlu bir beceri olarak gösterilmelidir.
7. NPC’lerin “emin değilim” diyebilmesi desteklenmelidir.
8. Hatalı belief, karakterin aptal olduğu anlamına gelmemelidir.

---

# 72. Perception simulation detail

Her NPC için algı sistemi aynı ayrıntıda çalıştırılmamalıdır.

## Yüksek önemli NPC

```text
Kanal bazlı algı
Dikkat modeli
Belief güncelleme
Kaynak güveni
Bilgi çelişkileri
```

## Orta önemli NPC

```text
Anlamlı olay algısı
Basitleştirilmiş belief
Önemli söylentiler
```

## Düşük önemli NPC

```text
Topluluk farkındalığı
Rol temelli bilgi
Büyük olay güncellemesi
```

---

# 73. Offline perception

Oyuncu yokken tüm algılar tek tek simüle edilmez.

```text
Kısa yokluk:
Önemli yakın olaylar NPC bazında işlenebilir.

Orta yokluk:
Bilgi yayılımı ve ana belief değişimleri özetlenir.

Uzun yokluk:
Topluluk bilgisi ve kritik yanlış belief’ler seçilerek ilerletilir.
```

Örneğin on günlük yoklukta her konuşma simüle edilmez.

Sistem sonuç odaklı çalışır:

```text
Köprü hasarı köyde yaygın olarak biliniyor.
Ancak uzak çiftlikteki NPC hâlâ eski yolu güvenli sanıyor.
```

---

# 74. Story session integration

Aktif hikâye sırasında algılar sahne düzeyinde işlenir.

```text
Kim sahnede?
Kim neyi görebiliyor?
Kim konuşmayı duyuyor?
Kim dikkat ediyor?
Kim hangi dili biliyor?
```

Sahne bitiminde yalnızca ilgili belief ve knowledge değişimleri kalıcı state’e yazılır.

---

# 75. LLM context construction

NPC diyaloğu veya kararı için LLM bağlamı şu şekilde oluşturulmalıdır:

```text
NPC identity
Current perception
Relevant beliefs
Known facts
Uncertainties
Secrets allowed for internal reasoning
Disclosure restrictions
Current emotion
Current intent
Relevant memories
```

LLM’ye tam World State verilmemelidir.

Verilmesi gerekenler:

```text
NPC’nin bildiği dünya
```

olmalıdır.

---

# 76. Internal secret ve spoken knowledge ayrımı

LLM’nin karakteri doğru oynayabilmesi için gizli bilgiyi bilmesi gerekebilir.

Ancak gizli bilgi iki ayrı alanda tutulmalıdır:

```text
Internal Knowledge:
NPC bilir.

Speak Permission:
NPC bunu açıklayabilir mi?
```

Bir bilgiyi iç bağlama vermek, NPC’nin bunu doğrudan söylemesine izin vermemelidir.

---

# 77. Response validation

NPC’nin ürettiği her önemli ifade doğrulanmalıdır.

```text
Bu iddia NPC’nin belief veya knowledge kayıtlarında var mı?
İfade güven seviyesine uygun mu?
Bilgi paylaşım izni var mı?
NPC kaynağı doğru temsil ediyor mu?
Zaman bilgisi güncel mi?
```

Geçersiz ifade:

* yeniden yazılır,
* belirsizleştirilir,
* bilgi yokluğu cevabına dönüştürülür.

---

# 78. Explainable belief formation

Geliştirici araçlarında belief’in neden oluştuğu görülebilmelidir.

```json
{
  "belief": "mysterious_light_from_observatory",
  "confidence": 0.67,
  "supports": [
    "Işık kuzey tepesinden görüldü",
    "Eski harita gözlemevini aynı bölgede gösteriyor",
    "Kütüphaneci eski lambalardan söz etti"
  ],
  "contradictions": [
    "Bekçi ışığın daha doğuda olduğunu düşünüyor"
  ],
  "biases": [
    "Mina eski yapıları keşfetmeye meraklı"
  ]
}
```

Bu sistem hatalarını anlamayı kolaylaştırır.

---

# 79. Uçtan uca örnek

## Dünya gerçeği

```text
Yaralı tilki güney ormanındaki küçük mağaradadır.
```

## NPC 1 — Mira

Mira tilkiyi daha önce dere kenarında gördü.

```text
Knowledge:
Tilki yaralıydı.

Last location:
Dere kenarı.

Belief:
Tilki muhtemelen dere boyunca ilerledi.

Confidence:
Orta.
```

## NPC 2 — Arin

Arin gece güneyden bir hayvan sesi duydu.

```text
Knowledge:
Güney yönünden hayvan sesi geldi.

Belief:
Bu ses yaralı tilkiye ait olabilir.

Confidence:
Düşük.
```

## NPC 3 — Çoban

Çoban kuzeyde küçük ayak izleri gördü fakat izler başka bir hayvana aitti.

```text
Belief:
Tilki kuzeye gitmiş olabilir.

Confidence:
Orta.
```

## Bilgi paylaşımı

Mira, Arin ve çoban konuşur.

Çelişkili bilgiler:

```text
Dere yönü
Güneyden gelen ses
Kuzeydeki ayak izleri
```

## Belief değerlendirmesi

Mira:

```text
Arin’in işitmesine güveniyor.
Çobanın iz sürme becerisini orta görüyor.
Kendi eski gözleminin artık bayatladığını biliyor.
```

Yeni belief:

```text
Tilki güney tarafında olabilir.
Ancak kuzey izleri doğrulanmalı.
```

## Yeni hedefler

```text
1. Kuzeydeki izlerin türünü doğrula
2. Güney yönündeki sesi tekrar dinle
3. Dere ile güney mağarası arasındaki yolu kontrol et
```

## Oyuncu katılımı

Çocuk daha önce tilkiye yardım ettiği için Mira şöyle der:

```text
“Onun güney tarafında olabileceğini düşünüyoruz ama emin değiliz.
Çoban kuzeyde izler buldu. Önce hangi izin ona ait olduğunu
birlikte anlamamız gerekebilir.”
```

NPC gerçek konumu bilmemektedir.

Fakat sahip olduğu bilgiye göre mantıklı ve açıklanabilir davranmaktadır.

---

# 80. Teknik servis ayrımı

```text
Sensory Resolver
→ Dünya sinyallerinin NPC tarafından algılanıp algılanmadığını belirler

Attention Manager
→ NPC’nin hangi sinyallere odaklandığını yönetir

Perception Interpreter
→ Ham algıyı anlamlı gözleme dönüştürür

Knowledge Store
→ NPC’nin bildiği bilgileri saklar

Belief Engine
→ Kanıtlardan belief üretir ve günceller

Source Reliability Evaluator
→ Bilgi kaynaklarının bağlamsal güvenilirliğini hesaplar

Rumor Engine
→ Dolaylı bilgilerin yayılımını ve bozulmasını yönetir

Theory of Mind Engine
→ NPC’nin başkalarının belief ve bilgileri hakkındaki tahminlerini tutar

Knowledge Access Controller
→ Gizli ve sınırlı bilgi erişimini yönetir

Anti-Omniscience Validator
→ NPC’nin bilmediği bilgiyi kullanmasını engeller
```

---

# 81. Temel sistem ilkeleri

1. NPC’ler World State’i doğrudan kullanmaz; kendi belief state’lerine göre davranır.
2. Bir olayın gerçekleşmesi tüm NPC’lerin onu bildiği anlamına gelmez.
3. Algı; menzil, görüş, dikkat, çevre ve duyusal yeterlilikten etkilenir.
4. Algı, bilgi ve belief ayrı varlıklar olarak tutulur.
5. NPC doğru olmayan belief’ler taşıyabilir.
6. Her bilgi kaynağı ve edinme zamanı mümkün olduğunca saklanır.
7. Kaynak güveni konuya göre değişebilir.
8. Söylentiler aktarım sırasında kontrollü biçimde değişebilir.
9. NPC’nin bilmiyor olması, sistem hatası değil doğal bir durumdur.
10. Belirsizlik doğal dilde görünür olmalıdır.
11. Bilginin güncelliği kullanım sırasında değerlendirilmelidir.
12. NPC’ler başkalarının bilgi ve niyetleri hakkında tahminde bulunabilir.
13. NPC diyaloğu yalnızca erişilebilir knowledge ve belief bağlamından üretilir.
14. Gizli bilgiye sahip olmak, onu paylaşma izni anlamına gelmez.
15. Yanlış bilgi ve yanlış anlaşılmalar çocuk dostu biçimde çözülebilir olmalıdır.
16. LLM hiçbir NPC’ye otomatik olarak tam dünya bilgisi vermemelidir.
17. Belief değişimleri kanıtlarla açıklanabilir olmalıdır.
18. Uzak ve düşük önemli NPC’lerde algı toplu ve özet biçimde çalıştırılmalıdır.

---

# 82. Backlog kararları

### PRC-01 — World State ve Belief State ayrımı

NPC kararları sistem gerçeği yerine karakterin belief state’i üzerinden üretilecek.

### PRC-02 — Kanal bazlı algı

Görme, işitme, koku, sosyal algı ve özel algı kanalları ayrı değerlendirilecek.

### PRC-03 — Sensory capability vectors

Her NPC duyusal yetenek vektörlerine sahip olacak.

### PRC-04 — Attention limits

NPC’ler çevredeki bütün olayları otomatik algılamayacak; odak ve çevresel farkındalık ayrılacak.

### PRC-05 — Perception records

Anlamlı algılar kaynak, kanal, açıklık ve güven bilgileriyle kaydedilecek.

### PRC-06 — Knowledge type system

Gözlem, söylenti, çıkarım, hipotez, kayıt ve deneyim bilgileri ayrılacak.

### PRC-07 — Source provenance

Bilginin kimden, nereden ve ne zaman öğrenildiği saklanacak.

### PRC-08 — Contextual source reliability

Bir kaynağın güvenilirliği tek sayı yerine konu bazlı değerlendirilecek.

### PRC-09 — Belief confidence

Belief güveni kanıt kalitesi, çelişkiler, bilgi yaşı ve bilişsel eğilimlere göre hesaplanacak.

### PRC-10 — Rumor propagation

Söylentiler sosyal ağlarda gecikmeli ve kontrollü bozulmayla yayılabilecek.

### PRC-11 — Knowledge freshness

Hızlı değişen bilgiler zamanla güven kaybedecek ve doğrulama gerektirecek.

### PRC-12 — False belief support

NPC’ler gerçek dünya durumundan farklı belief’lerle hareket edebilecek.

### PRC-13 — Theory of Mind

NPC’ler diğer karakterlerin ne bildiği ve istediği hakkında sınırlı modeller taşıyabilecek.

### PRC-14 — Disclosure permissions

Bilgiyi bilmek ile paylaşmaya izinli olmak ayrı durumlar olacak.

### PRC-15 — Anti-omniscience gate

NPC’nin bilmediği dünya bilgisini kullanması teknik doğrulama katmanıyla engellenecek.

### PRC-16 — Belief revision

Yeni kanıtlar belief’i güçlendirebilecek, zayıflatabilecek, düzeltebilecek veya askıya alabilecek.

### PRC-17 — Information-driven goals

Belirsizliği azaltmak için gözlem, soru sorma ve doğrulama hedefleri üretilebilecek.

### PRC-18 — Group awareness propagation

Büyük olay bilgileri NPC’lere sosyal, mekânsal ve rol ağları üzerinden kademeli yayılacak.

### PRC-19 — Dialogue knowledge validation

NPC’nin söylediği önemli iddialar knowledge erişimi, güven seviyesi ve paylaşım izniyle doğrulanacak.

### PRC-20 — Explainable beliefs

Önemli belief’lerin destekleyen ve çelişen kanıtları geliştirici araçlarında görüntülenebilecek.

### PRC-21 — Relevance-scaled perception

Algı ayrıntısı NPC’nin sahne, mekân ve anlatı önemine göre ölçeklenecek.

### PRC-22 — Child-friendly uncertainty

NPC’ler emin olmadıkları bilgileri kesin gerçek gibi sunmayacak; belirsizlik iletişimde görünür olacak.
