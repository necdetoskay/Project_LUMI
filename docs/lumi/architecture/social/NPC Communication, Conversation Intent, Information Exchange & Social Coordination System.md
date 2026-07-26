# NPC Communication, Conversation Intent, Information Exchange & Social Coordination System

Bu sistem, NPC’lerin yalnızca cümle üretmesini değil, **neden konuştuğunu, neyi söylemeyi seçtiğini, neyi sakladığını, kimi dinlediğini, konuşmayı ne zaman başlattığını ve konuşmanın dünyada hangi sonuçları oluşturduğunu** yönetir.

Temel ilke şudur:

> Diyalog, bağımsız bir metin üretim özelliği değil; algı, belief, niyet, duygu, ilişki, rol ve dünya durumunun sosyal bir eyleme dönüşmüş hâlidir.

Bu nedenle LUMI’de konuşma şu şekilde ele alınmalıdır:

```text
Social Trigger
→ Conversation Intent
→ Participant Selection
→ Knowledge & Permission Check
→ Message Planning
→ Dialogue Act
→ Listener Interpretation
→ Social Result
→ Memory, Belief and Relationship Update
```

---

# 1. Konuşma ile diyalog metni ayrımı

NPC iletişimi iki katmanda ele alınmalıdır.

## Communication State

Konuşmanın sistemsel anlamıdır.

```text
NPC neden konuşuyor?
Kime konuşuyor?
Ne elde etmek istiyor?
Hangi bilgiyi aktarıyor?
Ne kadar açık davranıyor?
Dinleyiciden nasıl bir tepki bekliyor?
```

## Dialogue Surface

Bu niyetin doğal dilde nasıl ifade edildiğidir.

```text
“Sanırım kuzey yolunda bir sorun var.”

“Oraya gitmeden önce bekçiyle konuşsak daha iyi olabilir.”

“Bunu herkese söylemeni istemiyorum.”
```

LLM esas olarak ikinci katmanda kullanılmalıdır.

Birinci katman kurallı ve yapılandırılmış olmalıdır.

---

# 2. Communication Intent

Her konuşma bir iletişim niyetine dayanmalıdır.

```ts
type CommunicationIntent =
  | "inform"
  | "ask"
  | "request"
  | "warn"
  | "advise"
  | "persuade"
  | "coordinate"
  | "negotiate"
  | "clarify"
  | "verify"
  | "comfort"
  | "apologize"
  | "thank"
  | "praise"
  | "encourage"
  | "refuse"
  | "set_boundary"
  | "reveal"
  | "conceal"
  | "misdirect"
  | "greet"
  | "say_goodbye"
  | "socialize"
  | "teach"
  | "reflect";
```

Bir konuşma birden fazla niyet taşıyabilir.

Örnek:

```text
“Bu gece ormana gitmeni istemiyorum.
Kuzey yolunda tuhaf sesler duyuldu.”

Primary intent:
Warn

Secondary intent:
Protect

Hidden intent:
Keep child nearby
```

---

# 3. Conversation Goal

Conversation intent kısa vadeli konuşma amacıdır.

Conversation goal ise sosyal olarak ulaşılmak istenen sonuçtur.

```ts
type ConversationGoal = {
  goalId: string;
  speakerId: string;
  targetIds: string[];

  desiredOutcome:
    | "transfer_information"
    | "obtain_information"
    | "change_belief"
    | "change_action"
    | "gain_agreement"
    | "repair_relationship"
    | "reduce_emotion"
    | "establish_boundary"
    | "coordinate_plan"
    | "build_trust"
    | "protect_secret"
    | "end_interaction";

  importance: number;
  urgency: number;
  acceptableAlternatives: string[];
};
```

Örnek:

```text
Intent:
Apologize

Conversation goal:
Kırılan güveni kısmen onarmak

Başarı yalnızca:
“Özür dilerim” demek değildir.

Dinleyicinin:
- özrü anlaması,
- açıklamayı kabul etmesi,
- ilerideki davranış için güvence alması

gerekebilir.
```

---

# 4. Conversation trigger

NPC her düşündüğü şeyi anında söylememelidir.

Konuşma başlatma tetikleyicileri:

```text
Yeni bilgi
Acil uyarı
Soru ihtiyacı
Görev koordinasyonu
Oyuncunun yaklaşması
İlişkisel gerilim
Verilmiş söz
Sessizliğin sosyal olarak uygunsuz hâle gelmesi
Bir yanlış anlaşılmanın fark edilmesi
Bir fırsat penceresi
```

```ts
type ConversationTrigger = {
  triggerType:
    | "new_information"
    | "urgent_event"
    | "task_dependency"
    | "player_presence"
    | "relationship_change"
    | "promise"
    | "misunderstanding"
    | "social_opportunity"
    | "scheduled_meeting";

  sourceId?: string;
  urgency: number;
  expiryTime?: WorldTime;
};
```

---

# 5. Konuşma başlatma kararı

NPC, konuşmaya başlamadan önce şu değerlendirmeyi yapar:

```text
Speak Utility
=
Goal Relevance
+ Urgency
+ Relationship Value
+ Role Responsibility
+ Information Value
+ Emotional Pressure
+ Social Opportunity
- Interruption Cost
- Privacy Risk
- Social Risk
- Disclosure Risk
- Listener Unavailability
```

Örnek:

```text
NPC önemli bir sırrı açıklamak istiyor.

Ancak:
- ortam kalabalık,
- dinleyici meşgul,
- başka biri duyabilir.

Sonuç:
Konuşma ertelenir veya özel görüşme talep edilir.
```

---

# 6. Participant selection

NPC ne söyleyeceği kadar kime söyleyeceğini de seçmelidir.

```ts
type ConversationParticipantCandidate = {
  actorId: string;
  relationshipFit: number;
  trustFit: number;
  knowledgeNeed: number;
  authorityFit: number;
  availability: number;
  privacyRisk: number;
  socialCost: number;
};
```

Örnek:

```text
Köprü hasarı hakkında bilgi var.

Bekçiye söylemek:
Yüksek rol uygunluğu

Arkadaşa söylemek:
Yüksek ilişki uygunluğu fakat düşük görev etkisi

Kalabalığa bağırmak:
Hızlı fakat paniğe yol açabilir
```

---

# 7. Direct, group ve mediated communication

## Direct communication

İki veya birkaç karakter doğrudan konuşur.

## Group communication

Bilgi bir topluluğa aktarılır.

```text
Toplantı
Duyuru
Kutlama konuşması
Acil uyarı
```

## Mediated communication

Mesaj dolaylı yolla iletilir.

```text
Mektup
Not
İşaret
Haberci
Duyuru panosu
Sihirli mesaj
```

```ts
type CommunicationMedium =
  | "face_to_face"
  | "group_speech"
  | "letter"
  | "note"
  | "messenger"
  | "signal"
  | "public_notice"
  | "magical_message";
```

Her medium farklı gecikme, mahremiyet ve bozulma riski taşır.

---

# 8. Communication channel properties

```ts
type CommunicationChannelProfile = {
  medium: CommunicationMedium;
  speed: number;
  privacy: number;
  persistence: number;
  emotionalRichness: number;
  distortionRisk: number;
  audienceReach: number;
};
```

Örnek:

```text
Yüz yüze konuşma:
Yüksek duygusal zenginlik
Hızlı geri bildirim
Düşük kalıcılık

Mektup:
Yüksek kalıcılık
Gecikmeli yanıt
Yanlış kişiye ulaşma riski

Duyuru:
Yüksek erişim
Düşük kişiselleştirme
Düşük mahremiyet
```

---

# 9. Dialogue Act System

Konuşma, cümle cümle sosyal eylemlere ayrılabilir.

```ts
type DialogueAct =
  | "statement"
  | "question"
  | "answer"
  | "request"
  | "offer"
  | "promise"
  | "warning"
  | "suggestion"
  | "agreement"
  | "disagreement"
  | "correction"
  | "acknowledgment"
  | "apology"
  | "gratitude"
  | "praise"
  | "comfort"
  | "refusal"
  | "boundary"
  | "challenge"
  | "invitation"
  | "farewell";
```

Bir konuşma şu şekilde modellenebilir:

```text
Greeting
→ Context statement
→ Warning
→ Request
→ Listener question
→ Clarification
→ Agreement
→ Closing
```

---

# 10. Speech plan

NPC doğrudan serbest metin üretmeden önce konuşma planı oluşturmalıdır.

```ts
type SpeechPlan = {
  speakerId: string;
  listenerIds: string[];

  conversationIntent: CommunicationIntent;
  conversationGoalId: string;

  mainProposition?: string;
  supportingPoints: string[];
  requestedResponse?: string;

  tone:
    | "warm"
    | "neutral"
    | "formal"
    | "urgent"
    | "careful"
    | "hesitant"
    | "playful"
    | "firm"
    | "sad"
    | "encouraging";

  disclosureLevel:
    | "full"
    | "partial"
    | "hint"
    | "withhold";

  certaintyMode:
    | "certain"
    | "probable"
    | "uncertain"
    | "speculative"
    | "reported";

  prohibitedClaims: string[];
};
```

LLM bu planı doğal diyaloğa dönüştürür.

---

# 11. Knowledge-grounded speech

NPC yalnızca erişebildiği knowledge ve belief’leri kullanmalıdır.

Bir konuşma öncesi:

```text
Söylenmek istenen bilgi NPC’de var mı?
Bilgi fact mi belief mi?
Güven seviyesi nedir?
Kaynağı biliyor mu?
Bilgi güncel mi?
Paylaşım izni var mı?
```

Örnek:

```text
Belief confidence:
0.35
```

Yanlış ifade:

```text
“Tilki güney mağarasında.”
```

Doğru ifade:

```text
“Güneyden bir hayvan sesi duyulduğunu söylediler.
Tilki orada olabilir ama emin değiliz.”
```

---

# 12. Certainty alignment

Cümle tonu belief güveniyle uyumlu olmalıdır.

```text
0.85–1.00:
“Kapı kilitli.”

0.60–0.84:
“Kapının kilitli olduğundan oldukça eminim.”

0.35–0.59:
“Sanırım kapı kilitli olabilir.”

0.10–0.34:
“Uzaktan öyle göründü ama yanılıyor olabilirim.”

Rumor:
“İnsanlar kapının geceleri açıldığını söylüyor.”
```

Kesinlik karakterin konuşma tarzıyla değişebilir, ancak bilgi seviyesi değişmez.

Kendinden emin bir NPC düşük güvenli belief’i kesin söylemeye eğilimli olabilir. Sistem bunu karakter özelliği olarak izinli kılabilir fakat gerçek certainty kaydı korunur.

---

# 13. Disclosure decision

NPC sahip olduğu her bilgiyi paylaşmaz.

```text
Disclosure Utility
=
Helpfulness
+ Trust
+ Role Duty
+ Urgency
+ Moral Pressure
+ Relationship Benefit
- Secret Weight
- Harm Risk
- Promise Constraint
- Personal Shame
- Social Consequence
```

Olası sonuçlar:

```text
Tam açıklama
Kısmi açıklama
İpucu
Şimdilik erteleme
Kaynağa yönlendirme
Paylaşmayı reddetme
Yanlış yönlendirme
```

---

# 14. Partial disclosure

Kısmi açıklama, yalnızca gizem üretmek için kullanılmamalıdır.

Geçerli nedenler:

```text
Bilginin tamamından emin değil
Dinleyiciye henüz yeterince güvenmiyor
Verilmiş söz var
Bilgi tehlikeli
Dinleyiciyi korumak istiyor
Konuşma için zaman uygun değil
```

Örnek:

```text
Tam knowledge:
Eski tünelin girişini biliyor.

Söylediği:
“Gözlemevine ulaşmanın yalnızca ana yoldan olmadığını duymuştum.”
```

---

# 15. Concealment ve deception ayrımı

## Concealment

NPC gerçeği söylemez fakat doğrudan yanlış bilgi vermeyebilir.

```text
Konuyu değiştirir
Sessiz kalır
Eksik cevap verir
“Bunu konuşmak istemiyorum.” der
```

## Deception

NPC dinleyicinin yanlış belief oluşturmasını amaçlar.

```text
Yanlış bilgi verir
Yanlış izlenim yaratır
Gerçek kaynağı saklar
```

Bu ikisi ayrı değerlendirilmelidir.

---

# 16. Deception model

```ts
type DeceptionPlan = {
  speakerId: string;
  targetId: string;

  trueBeliefId?: string;
  intendedFalseBelief: string;

  motivation:
    | "protect"
    | "avoid_blame"
    | "hide_secret"
    | "gain_advantage"
    | "prevent_panic"
    | "playful";

  moralConflict: number;
  detectionRisk: number;
  relationshipRisk: number;
};
```

Çocuk dostu tasarımda kasıtlı yanıltma:

* seyrek,
* anlaşılabilir,
* geri döndürülebilir,
* öğrenme fırsatı taşıyan

bir araç olmalıdır.

---

# 17. Listener model

Konuşma yalnızca konuşmacıya göre planlanmaz.

NPC, dinleyicinin:

```text
Ne bildiğini
Neye inandığını
Ne hissettiğini
Ne kadar dikkat ettiğini
Hangi dili ve kavramları anladığını
Konuşmacıya ne kadar güvendiğini
```

tahmin eder.

```ts
type ListenerModel = {
  listenerId: string;
  assumedKnowledgeIds: string[];
  assumedBeliefIds: string[];
  assumedEmotion?: EmotionVector;

  trustInSpeaker: number;
  attention: number;
  comprehensionEstimate: number;
  resistanceEstimate: number;
};
```

Bu model Theory of Mind sisteminden beslenir.

---

# 18. Audience adaptation

Aynı bilgi farklı kişilere farklı biçimde anlatılabilir.

Örnek konu:

```text
Köprü güvenli değil.
```

Çocuğa:

```text
“Köprüde birkaç tahta gevşemiş. Şimdilik başka yolu kullanalım.”
```

Bekçiye:

```text
“Kuzey köprüsünün orta desteğinde çatlak gördüm. Geçişi kapatmamız gerekebilir.”
```

Marangoza:

```text
“Orta kirişte eğilme var. İki destek tahtası ve kalın halat gerekebilir.”
```

Bilgi aynı, sunum farklıdır.

---

# 19. Age-aware communication

LUMI’de konuşma, çocuk profilinin yaşına ve anlama düzeyine uyarlanmalıdır.

```ts
type ChildCommunicationProfile = {
  ageBand: string;
  vocabularyLevel: number;
  sentenceComplexity: number;
  abstractConceptTolerance: number;
  fearSensitivity: number;
  explanationPreference:
    | "simple"
    | "example_based"
    | "question_based"
    | "story_based";
};
```

Uyarlamalar:

```text
Kısa cümleler
Somut örnekler
Aşırı soyut açıklamalardan kaçınma
Korkutucu ayrıntıları yumuşatma
Seçenekleri net ifade etme
Belirsizliği anlaşılır sunma
```

Bu uyarlama karakteri çocuklaştırmamalıdır; sadece anlaşılabilir kılmalıdır.

---

# 20. Language and vocabulary boundaries

Bir NPC bildiği kavramlara göre konuşmalıdır.

Örneğin köy çocuğu:

```text
“Gökyüzündeki ışık garip biçimde titriyordu.”
```

Bilgin:

```text
“Işığın düzenli aralıklarla tekrar ettiğini fark ettim.”
```

Haritacı:

```text
“Sinyal kuzeydoğu yönünden geliyor gibi görünüyor.”
```

NPC’nin rolü ve eğitim düzeyi kelime seçimini etkiler.

---

# 21. Conversational style vector

```ts
type ConversationStyleVector = {
  verbosity: number;
  directness: number;
  warmth: number;
  formality: number;
  humor: number;
  caution: number;
  emotionalExpressiveness: number;
  questionFrequency: number;
  metaphorUsage: number;
};
```

Örnekler:

## Doğrudan NPC

```text
“Köprü kapalı. Güney yolunu kullan.”
```

## Temkinli NPC

```text
“Kuzey köprüsünün güvenli olduğundan emin değilim. Güney yolu daha iyi olabilir.”
```

## Neşeli NPC

```text
“Kuzey köprüsü bugün biraz huysuz görünüyor. Gel, daha sakin olan güney yolunu seçelim.”
```

---

# 22. Emotion-to-speech influence

Duygular konuşmanın:

* hızını,
* açıklığını,
* kelime seçimini,
* sabrını,
* açıklama miktarını

etkileyebilir.

```text
Korku:
Kısa ve hızlı uyarılar

Üzüntü:
Daha yavaş ve düşük enerjili anlatım

Öfke:
Daha doğrudan veya sert ifade

Sevinç:
Daha açık ve paylaşımcı konuşma

Utanç:
Dolaylılık, duraksama, konu değiştirme
```

Ancak duygular NPC’ye kontrolsüz veya zararlı dil kullandırmamalıdır.

---

# 23. Relationship-to-speech influence

Aynı NPC farklı kişilerle farklı konuşur.

```text
Yüksek güven:
Daha açık, kişisel ve samimi

Düşük güven:
Kısa, dikkatli ve sınırlı

Yüksek saygı:
Daha resmi

Kırgınlık:
Soğuk veya temkinli

Koruma bağı:
Daha açıklayıcı ve güven verici
```

```ts
type RelationalSpeechContext = {
  trust: number;
  affection: number;
  respect: number;
  fear: number;
  resentment: number;
  familiarity: number;
};
```

---

# 24. Conversation availability

NPC her zaman konuşmaya hazır olmamalıdır.

Konuşma uygunluğunu etkileyenler:

```text
Mevcut görev
Kesilebilirlik
Tehlike
Enerji
Duygu
Mahremiyet
Konuşmanın tahmini süresi
Dinleyicinin uygunluğu
```

Olası tepkiler:

```text
Hemen konuş
Kısa cevap ver
Çalışırken konuş
Daha sonra görüşmeyi öner
Konuşmayı reddet
Yalnız bir yere geçmeyi iste
```

Örnek:

```text
NPC hassas bir ilaç hazırlıyor.

“Şu şişeyi kapatmam gerek. Sonra seni dikkatlice dinleyeceğim.”
```

Bu, takvim ve kesinti sistemiyle entegredir.

---

# 25. Conversation reservation

Önemli ve uzun konuşmalar takvime alınabilir.

```ts
type ConversationReservation = {
  conversationGoalId: string;
  participantIds: string[];
  preferredWindow: TimeWindow;
  requiredPrivacy: number;
  estimatedDuration: number;
  locationPreference?: string;
};
```

Örnek:

```text
Özür konuşması
Gizli bilgi paylaşımı
Ortak plan toplantısı
İlişki anlaşmazlığı çözümü
```

---

# 26. Turn-taking

Konuşmada katılımcılar sırayla söz almalıdır.

```ts
type ConversationTurnState = {
  currentSpeakerId: string;
  nextCandidateIds: string[];
  interruptionAllowed: boolean;
  openQuestionTargetId?: string;
  topicId: string;
};
```

Söz alma şu nedenlerle gerçekleşir:

```text
Doğrudan soru
Yanlış bilgiyi düzeltme
Acil uyarı
Duygusal tepki
Konuşma boşluğu
Rol yetkisi
```

NPC’ler sebepsiz biçimde birbirinin sözünü sürekli kesmemelidir.

---

# 27. Interruption in dialogue

Diyalog kesintileri ayrı değerlendirilmelidir.

```text
Conversation Interruption Score
=
Urgency
+ Correction Importance
+ Emotional Pressure
+ Role Authority
- Politeness Constraint
- Relationship Risk
- Current Speaker Importance
```

Örnek:

```text
Bir NPC yanlış rota anlatıyor.
Bekçi tehlikeli sonucu önlemek için araya girebilir.
```

---

# 28. Active listening

NPC dinlerken yalnızca konuşma sırasını beklememelidir.

Dinleme eylemleri:

```text
Onaylama
Anladığını tekrar etme
Soru sorma
Duyguyu fark etme
Belirsizliği netleştirme
Konuyu hatırlama
```

```ts
type ListeningResponse =
  | "acknowledge"
  | "clarify"
  | "reflect"
  | "question"
  | "challenge"
  | "comfort"
  | "silence";
```

Örnek:

```text
“Yani ışığı gözlemevinin üstünde değil, arkasında gördün. Doğru mu?”
```

Bu, bilgi doğruluğunu artırır.

---

# 29. Comprehension check

Konuşmacı kritik bilgi aktarırken dinleyicinin anlayıp anlamadığını değerlendirebilir.

```text
“Güney yolunu kullanacağını hatırlıyor musun?”
“Haritayı yalnızca gündüz açmamız gerektiğini anladın mı?”
```

Bu özellikle:

* görev koordinasyonu,
* güvenlik uyarıları,
* karmaşık planlar

için önemlidir.

NPC bunu aşırı tekrar ederek rahatsız edici hâle getirmemelidir.

---

# 30. Misunderstanding generation

Yanlış anlaşılmalar şu nedenlerle oluşabilir:

```text
Belirsiz ifade
Eksik bilgi
Farklı kelime anlamı
Düşük dikkat
Yanlış listener model
Duygusal yorum
Gürültü
Söylenti bozulması
```

```ts
type Misunderstanding = {
  speakerIntendedMeaning: string;
  listenerInterpretedMeaning: string;
  divergence: number;
  cause: string;
  detected: boolean;
};
```

---

# 31. Misunderstanding detection

Yanlış anlaşılma şu işaretlerle fark edilebilir:

```text
Uyumsuz cevap
Beklenmeyen eylem
Tekrarlanan soru
Duygusal tepki
Başka NPC’nin düzeltmesi
```

Fark edilirse yeni conversation intent oluşur:

```text
Clarify
Correct
Apologize
Verify
```

---

# 32. Clarification system

NPC belirsizliği gidermek için:

```text
Daha basit söyler
Örnek verir
Haritada gösterir
Aynı bilgiyi başka kelimelerle tekrarlar
Soru sorar
Kaynağı belirtir
```

Örnek:

```text
“‘Eski yol’ derken nehir yolunu değil, değirmenin arkasındaki dar patikayı kastediyorum.”
```

---

# 33. Topic management

Konuşmalar konu durumuna sahip olmalıdır.

```ts
type ConversationTopic = {
  topicId: string;
  subjectId?: string;
  status:
    | "introduced"
    | "active"
    | "resolved"
    | "paused"
    | "avoided"
    | "closed";

  importance: number;
  emotionalWeight: number;
  privacyLevel: number;
};
```

NPC:

* yeni konu açabilir,
* eski konuya dönebilir,
* konuyu erteleyebilir,
* hassas konudan kaçınabilir,
* konuşmayı kapatabilir.

---

# 34. Topic transitions

Konu değişimi doğal gerekçeye sahip olmalıdır.

```text
İlgili bilgi bağlantısı
Yeni olay
Dinleyicinin sorusu
Duygusal kaçınma
Zaman baskısı
Görev koordinasyonu
```

Ani ve anlamsız konu sıçramaları engellenmelidir.

---

# 35. Conversation persistence

Önemli konuşmalar oturumlar arasında hatırlanmalıdır.

```ts
type ConversationMemory = {
  conversationId: string;
  participantIds: string[];
  topicIds: string[];

  keyStatements: string[];
  promises: string[];
  questionsLeftOpen: string[];
  informationSharedIds: string[];

  emotionalOutcome: EmotionVector;
  relationshipChanges: RelationshipDelta[];

  occurredAt: WorldTime;
};
```

Tam konuşma metnini sonsuza kadar saklamak gerekmez.

Önemli anlamsal sonuçlar saklanır.

---

# 36. Promise generation

Bir NPC konuşma sırasında söz verebilir.

```text
“Yarın seni limanda bekleyeceğim.”
“Bu bilgiyi kimseyle paylaşmayacağım.”
“Haritayı bulursam sana haber vereceğim.”
```

```ts
type SpokenPromise = {
  promiseId: string;
  speakerId: string;
  listenerId: string;

  promisedAction: string;
  dueWindow?: TimeWindow;

  sincerity: number;
  commitment: number;
  expectedRelationshipImpact: number;

  status:
    | "active"
    | "fulfilled"
    | "late"
    | "broken"
    | "renegotiated"
    | "released";
};
```

Promise, scheduling ve social commitment sistemine aktarılır.

---

# 37. Promise acceptance

Dinleyici verilen sözü otomatik olarak güvenilir kabul etmemelidir.

Değerlendirme:

```text
Geçmiş söz tutma oranı
Mevcut ilişki güveni
Sözün gerçekçiliği
Konuşmacının kapasitesi
Sözün koşulları
```

Örnek:

```text
“Yarın bütün köprüyü tek başıma onaracağım.”
```

İyi niyetli olsa bile gerçekçi değildir.

Dinleyici:

```text
“Bunu tek başına yapabileceğinden emin misin?”
```

diye sorabilir.

---

# 38. Requests

NPC birinden yardım isterken talebini yapılandırmalıdır.

```ts
type SocialRequest = {
  requesterId: string;
  targetId: string;

  requestedAction: string;
  urgency: number;
  costToTarget: number;
  relationshipExpectation: number;
  optional: boolean;

  rewardOffer?: Reward;
  explanationLevel: number;
};
```

İyi bir talep:

```text
Ne istendiğini açıklar
Neden istendiğini belirtir
Aciliyeti gösterir
Reddetme alanı bırakabilir
```

---

# 39. Request acceptance

Dinleyici talebi şu şekilde değerlendirir:

```text
Request Utility
=
Relationship Value
+ Moral Value
+ Role Duty
+ Shared Goal
+ Reward
+ Urgency
- Cost
- Risk
- Schedule Conflict
- Trust Concern
```

Olası cevaplar:

```text
Kabul et
Şartlı kabul et
Daha sonra yap
Alternatif öner
Başkasına yönlendir
Reddet
Açıklama iste
```

---

# 40. Refusal system

NPC her talebi kabul etmemelidir.

Sağlıklı reddetme nedenleri:

```text
Tehlike
Yetersiz beceri
Zaman çatışması
Ahlaki uyuşmazlık
Düşük güven
Başka sorumluluk
Yetersiz bilgi
```

Örnek:

```text
“Seninle gelmek isterdim ama klinikte yaralıları yalnız bırakamam. Bekçiden yardım istemeyi deneyebiliriz.”
```

Reddetme yeni seçenek üretebilir.

---

# 41. Boundary setting

NPC kişisel ve sosyal sınırlar koyabilir.

```text
“Bu konuyu konuşmaya hazır değilim.”
“Bu mektup özel.”
“Mağaraya yalnız gitmene izin veremem.”
“Bana bağırdığında konuşmayı sürdüremiyorum.”
```

```ts
type SocialBoundary = {
  ownerId: string;
  targetId?: string;
  boundaryType:
    | "privacy"
    | "safety"
    | "emotional"
    | "physical"
    | "role"
    | "time";

  condition: string;
  firmness: number;
};
```

Sınırlar çocuk dostu ve açıklayıcı biçimde sunulmalıdır.

---

# 42. Negotiation

NPC’ler farklı tercihleri uzlaştırmak için pazarlık yapabilir.

```text
Birlikte ne zaman gidilecek?
Kim hangi görevi yapacak?
Hangi rota seçilecek?
Hangi bilginin paylaşılacağı?
```

```ts
type NegotiationState = {
  participantIds: string[];
  issue: string;

  proposals: NegotiationProposal[];
  acceptedTerms: string[];
  unresolvedTerms: string[];

  status:
    | "opening"
    | "exploring"
    | "bargaining"
    | "agreement"
    | "deadlock"
    | "withdrawn";
};
```

---

# 43. Proposal model

```ts
type NegotiationProposal = {
  proposerId: string;
  terms: string[];
  benefitVector: Record<string, number>;
  costVector: Record<string, number>;
  flexibility: number;
};
```

Örnek:

```text
Mira:
“Ben tilkiyi tedavi ederim. Sen de mağaranın girişinde bekleyip beni uyar.”

Çocuk:
“Ben yiyecek götürsem daha sakin olmaz mı?”

Yeni ortak plan:
Çocuk yiyeceği bırakır.
Mira güvenli mesafeden yaklaşır.
```

---

# 44. Persuasion

NPC başka birinin belief veya kararını değiştirmeye çalışabilir.

```text
Kanıt sunma
Duygusal çağrı
Rol otoritesi
Geçmiş deneyim
Ortak değer
Risk açıklaması
```

```ts
type PersuasionAttempt = {
  speakerId: string;
  listenerId: string;

  targetBeliefId?: string;
  desiredAction?: string;

  argumentTypes:
    | "evidence"
    | "authority"
    | "relationship"
    | "moral"
    | "practical"
    | "emotional";

  pressureLevel: number;
};
```

---

# 45. Persuasion resistance

Dinleyici şu faktörlerle direnebilir:

```text
Güçlü karşı belief
Düşük güven
Kimlik yatırımı
Kötü geçmiş deneyim
Yüksek risk
Baskıcı ton
```

İkna başarısı tek cümlede gerçekleşmemelidir.

Özellikle güçlü belief’ler:

* kanıt,
* zaman,
* deneyim,
* tekrar

gerektirebilir.

---

# 46. Manipulation safety

İletişim sistemi duygusal manipülasyonu ödüllendiren bir yapıya dönüşmemelidir.

Sınırlar:

1. Suçlulukla kontrol etme normalleştirilmemeli.
2. Korkutma çocuk üzerinde baskı aracı olmamalı.
3. Israrlı talep reddedilmeyi geçersiz kılmamalı.
4. “Hayır” cevabı anlamlı olmalı.
5. İkna ile zorlayıcılık ayrılmalı.
6. Zararlı davranışlar karakter kusuru olarak gösterilse bile sistem tarafından ideal yöntem gibi sunulmamalı.

---

# 47. Social coordination

Konuşma, ortak planları yürütmek için kullanılır.

```text
Görev dağıtımı
Durum güncellemesi
Yardım çağrısı
Tehlike uyarısı
Kaynak isteği
Buluşma düzenleme
Plan değişikliği
```

```ts
type CoordinationMessage = {
  senderId: string;
  recipientIds: string[];

  planId?: string;
  taskId?: string;

  messageType:
    | "assignment"
    | "status_update"
    | "warning"
    | "resource_request"
    | "schedule_change"
    | "completion_notice"
    | "failure_notice";

  requiresAcknowledgment: boolean;
};
```

---

# 48. Task assignment communication

Bir görev yalnızca sistemsel olarak atanmaz.

NPC’nin görevi kabul ettiğini anlaması gerekir.

```text
Atayan NPC:
Görevi açıklar.

Hedef NPC:
Anlar, soru sorar, kabul eder veya reddeder.

Sistem:
Görevi ilgili plana bağlar.
```

Aksi hâlde sistem bir NPC’ye haberi olmadan görev yüklemiş olur.

---

# 49. Acknowledgment

Kritik koordinasyon mesajları onay gerektirebilir.

```text
“Güney kapısını sen kapatacaksın, doğru mu?”
“Evet, gün batmadan orada olacağım.”
```

```ts
type MessageAcknowledgment = {
  messageId: string;
  recipientId: string;

  understood: boolean;
  accepted: boolean;
  confidence: number;
  clarificationNeeded: boolean;
};
```

---

# 50. Communication failure

İletişim başarısızlıkları:

```text
Mesaj ulaşmadı
Yanlış kişi aldı
Eksik anlaşıldı
Geç ulaştı
Dinleyici unuttu
Dinleyici kabul etmedi
Konuşmacı yanlış bilgi verdi
```

```ts
type CommunicationFailure =
  | "not_delivered"
  | "misdelivered"
  | "misunderstood"
  | "delayed"
  | "forgotten"
  | "rejected"
  | "distorted"
  | "contradicted";
```

Her başarısızlık uygun dünya sonucu üretir.

---

# 51. Delayed message handling

Mektup ve haberci gibi kanallar gecikmeli çalışır.

```text
Gönderildi
→ Taşınıyor
→ Gecikti
→ Teslim edildi
→ Okundu
→ Yanıtlandı
```

```ts
type MessageLifecycle = {
  messageId: string;
  sentAt: WorldTime;
  expectedDeliveryAt?: WorldTime;
  deliveredAt?: WorldTime;
  readAt?: WorldTime;
  repliedAt?: WorldTime;

  status:
    | "drafted"
    | "sent"
    | "in_transit"
    | "delayed"
    | "delivered"
    | "read"
    | "lost"
    | "returned";
};
```

---

# 52. Message persistence

Yazılı mesajlar kalıcı nesne olabilir.

```text
Mektup envanterde bulunabilir
Başka NPC tarafından okunabilir
Kaybolabilir
Saklanabilir
Daha sonra kanıt olarak kullanılabilir
```

Bu nedenle mesaj içeriği:

* knowledge,
* ownership,
* access permission,
* physical object state

ile ilişkilendirilmelidir.

---

# 53. Public announcements

Topluluk bilgisi için duyuru yapılabilir.

```ts
type PublicAnnouncement = {
  announcementId: string;
  speakerId?: string;
  authorityId?: string;

  contentPropositions: string[];
  locationId: string;
  audienceScope: string;

  repetitionCount: number;
  credibility: number;
  activeUntil?: WorldTime;
};
```

Duyuru yapıldı diye herkesin bildiği varsayılmaz.

Algı ve farkındalık sistemi yine uygulanır.

---

# 54. Greetings and social maintenance

Her konuşma görev veya gizemle ilgili olmamalıdır.

NPC’ler ilişkileri sürdürmek için küçük sosyal iletişimler yapabilir.

```text
Selam verme
Hâl hatır sorma
Teşekkür etme
Küçük haber paylaşma
Vedalaşma
Kutlama
```

Bu etkileşimler:

* dünya canlılığını artırır,
* ilişki bakımını sağlar,
* karakter stilini gösterir.

Fakat her karşılaşmada uzun konuşma üretilmemelidir.

---

# 55. Small talk budget

Küçük konuşmalar simülasyon bütçesiyle sınırlandırılmalıdır.

```text
Yüksek önemli sahne:
Kısa doğal sohbet olabilir.

Arka plan:
“Pazarda kısa süre konuştular.”

Düşük önemli NPC:
Ayrıntılı diyalog üretme.
```

---

# 56. Relationship maintenance communication

İlişkiler yalnızca büyük olaylarla değişmemelidir.

Küçük iletişimler:

```text
Sözünü hatırlamak
Birini dinlemek
Yardım teklif etmek
Teşekkür etmek
Ortak anıyı anmak
```

ilişkiyi yavaşça güçlendirebilir.

İhmal:

```text
Sürekli cevap vermemek
Sözleri unutmak
Dinlememek
```

ilişkiyi yavaşça zayıflatabilir.

---

# 57. Apology system

Özür yalnızca tek bir kelime olmamalıdır.

İyi bir özür bileşenleri:

```text
Ne olduğunu kabul etme
Etkisini anlama
Sorumluluk alma
Bahane üretmeden açıklama
Telafi önerme
Tekrarını önleme niyeti
```

```ts
type ApologyPlan = {
  offenderId: string;
  harmedActorId: string;

  acknowledgedAction: string;
  understoodImpact: string;
  responsibilityLevel: number;
  explanation?: string;
  repairOffer?: string;
  futureCommitment?: string;
};
```

---

# 58. Apology acceptance

Dinleyici özrü otomatik kabul etmek zorunda değildir.

Olası sonuçlar:

```text
Tam kabul
Kısmi kabul
Daha fazla zamana ihtiyaç
Telafi bekleme
Özrü samimiyetsiz bulma
Affetme fakat güveni hemen yenilememe
```

Bu, ilişkileri daha doğal kılar.

---

# 59. Comfort system

NPC üzgün veya korkmuş birine destek olabilir.

```text
Dinleme
Duyguyu kabul etme
Güven verme
Yardım teklif etme
Yakında kalma
Sessiz destek
```

Yanlış yaklaşım:

```text
“Üzülme.”
“Korkacak bir şey yok.”
```

Daha iyi:

```text
“Korktuğunu anlıyorum. İstersen bir süre burada birlikte bekleyebiliriz.”
```

Sistem tek bir doğru tepki dayatmamalıdır.

---

# 60. Teaching and explanation

Bazı NPC’ler bilgi öğretir.

Öğretim akışı:

```text
Ön bilgiyi değerlendir
Basit açıklama yap
Örnek ver
Soru sor
Yanlış anlamayı düzelt
Küçük uygulama sun
```

```ts
type TeachingInteraction = {
  teacherId: string;
  learnerId: string;
  knowledgeId: string;

  learnerBaseline: number;
  explanationLevel: number;
  practiceRequired: boolean;
  comprehensionResult?: number;
};
```

Bilginin aktarılması, dinleyicinin tamamen öğrendiği anlamına gelmez.

---

# 61. Question system

Sorular farklı amaçlara sahip olabilir.

```ts
type QuestionIntent =
  | "seek_fact"
  | "confirm"
  | "clarify"
  | "explore_feeling"
  | "challenge"
  | "invite_choice"
  | "test_knowledge"
  | "social_interest";
```

Örnek:

```text
“Tilkiyi nerede gördün?”
→ Fact

“Güney tarafı olduğundan emin misin?”
→ Confirm

“Bu olay seni korkuttu mu?”
→ Explore feeling

“Önce mağarayı mı, dereyi mi kontrol edelim?”
→ Invite choice
```

---

# 62. Answer planning

Dinleyici cevabı şu faktörlerle belirler:

```text
Bilgiyi biliyor mu?
Hatırlıyor mu?
Paylaşmak istiyor mu?
Soruyu anladı mı?
Konuşmacıya güveniyor mu?
Cevap zarar oluşturur mu?
```

Olası cevaplar:

```text
Doğrudan cevap
Belirsiz cevap
Kısmi cevap
Kaynak belirtme
Bilmediğini söyleme
Hatırlamadığını söyleme
Reddetme
Karşı soru
```

---

# 63. “Bilmiyorum” yeteneği

NPC’nin bilmediğini kabul etmesi temel tasarım kuralı olmalıdır.

```text
“Bilmiyorum.”
“Bundan emin değilim.”
“Bunu Mira’ya sormamız daha doğru olur.”
“Daha önce duymuştum ama ayrıntısını hatırlamıyorum.”
```

Bu, anti-omniscience sisteminin görünür davranışıdır.

---

# 64. Memory recall in conversation

NPC konuşma sırasında ilgili anıları çağırabilir.

```text
Konu
→ Hafıza araması
→ İlgili anı
→ Güven ve duygusal filtre
→ Konuşmaya ekleme
```

Örnek:

```text
“Bu sembolü daha önce görmüştüm. Geçen kış eski liman taşında da vardı.”
```

Yanlış veya eksik hatırlama mümkün olabilir.

---

# 65. Shared references

NPC’ler ortak geçmiş olaylara gönderme yapabilir.

```text
“Geçen sefer nehir yükseldiğinde yaptığımız gibi...”
“Tilkiye ilk yardım ettiğimiz günü hatırlıyor musun?”
```

Bu, süreklilik hissini güçlendirir.

Ancak ortak olmayan anılar kullanılmamalıdır.

---

# 66. Conversation and belief updates

Konuşma sonrası dinleyicide şu değişiklikler oluşabilir:

```text
Yeni knowledge
Yeni belief
Belief confidence değişimi
Yeni soru
Yeni şüphe
Yeni hedef
Duygusal değişim
İlişki değişimi
```

```ts
type ConversationOutcome = {
  conversationId: string;

  transferredKnowledgeIds: string[];
  beliefRevisions: BeliefRevision[];
  generatedIntentIds: string[];
  generatedTaskIds: string[];

  emotionalChanges: EmotionDelta[];
  relationshipChanges: RelationshipDelta[];

  promisesCreated: string[];
  commitmentsCreated: string[];
  misunderstandingsCreated: string[];
};
```

---

# 67. Conversation success

Konuşmanın başarısı sadece mesajın söylenmesi değildir.

```text
Delivery success:
Mesaj ifade edildi.

Comprehension success:
Dinleyici anladı.

Acceptance success:
Dinleyici bilgiyi veya talebi kabul etti.

Behavior success:
Beklenen eylem oluştu.

Relationship success:
Sosyal amaç gerçekleşti.
```

Bu katmanlar ayrı tutulmalıdır.

---

# 68. Conversation failure

Örnek:

```text
NPC özür diledi.

Delivery:
Başarılı

Comprehension:
Başarılı

Acceptance:
Başarısız

Relationship repair:
Kısmi
```

Bu, konuşmanın tamamen boşa gittiği anlamına gelmez.

---

# 69. Conversation loop prevention

LLM tabanlı diyaloglarda tekrar riski yüksektir.

Sistem şunları takip etmelidir:

```text
Son söylenen ana fikirler
Cevaplanmış sorular
Tekrarlanan ifadeler
Konuşma hedefinin durumu
Konu ilerlemesi
```

Tekrar eşiği aşılırsa:

```text
Konuyu ilerlet
Yeni soru sor
Özetle
Konuşmayı kapat
Daha sonra devam etmeyi öner
```

---

# 70. Conversation stopping conditions

Konuşma şu durumlarda sona erebilir:

```text
Amaç tamamlandı
Zaman doldu
Katılımcı ayrılmalı
Konu çözüldü
Anlaşmazlık kilitlendi
Mahremiyet bozuldu
Acil olay başladı
Taraflardan biri sınır koydu
Konuşma verimsizleşti
```

```ts
type ConversationEndReason =
  | "goal_achieved"
  | "time_limit"
  | "task_priority"
  | "topic_resolved"
  | "deadlock"
  | "interruption"
  | "boundary"
  | "participant_exit"
  | "low_progress";
```

---

# 71. Graceful conversation ending

NPC’ler konuşmayı doğal biçimde kapatmalıdır.

```text
“Şimdi kliniğe dönmem gerek. Akşam devam edebiliriz.”
“Sanırım önce haritayı bulmalıyız.”
“Bunu düşünmek için biraz zamana ihtiyacım var.”
“Yardımın için teşekkür ederim.”
```

Konuşma bir anda kesilmemelidir; acil kesinti yoksa sosyal kapanış yapılmalıdır.

---

# 72. Multi-party conversation

Birden fazla NPC’nin olduğu konuşmalarda:

```text
Kim konuşuyor?
Kim dinliyor?
Kim konu hakkında bilgi sahibi?
Kim doğrudan hedef?
Kim söz almak istiyor?
Kim sessiz kalıyor?
```

izlenmelidir.

```ts
type GroupConversationState = {
  participantIds: string[];
  activeSpeakerId: string;
  addressedParticipantIds: string[];
  observers: string[];
  topicId: string;
  participationBalance: Record<string, number>;
};
```

---

# 73. Participation balance

Grup konuşmalarında tek NPC tüm diyaloğu tüketmemelidir.

Ancak herkes eşit konuşmak zorunda değildir.

Etkileyenler:

```text
Rol
Bilgi
Kişilik
Duygu
Statü
Konu ilgisi
```

Sessiz NPC de:

* dinleyebilir,
* belief güncelleyebilir,
* duygusal tepki verebilir,
* daha sonra başka biriyle konuşabilir.

---

# 74. Side conversations

Kalabalık ortamda küçük yan konuşmalar olabilir.

```text
İki NPC sessizce konuşur
Bir NPC diğerine kısa soru sorar
Çocuk yakındaki konuşmayı kısmen duyar
```

Yan konuşmalar algı ve mahremiyet sistemiyle sınırlandırılmalıdır.

---

# 75. Eavesdropping

Bir NPC konuşmayı istemeden veya bilinçli olarak duyabilir.

```ts
type OverheardConversation = {
  listenerId: string;
  conversationId: string;

  heardFraction: number;
  clarity: number;
  contextAvailable: number;
  detectedBySpeakers: boolean;
};
```

Kısmi duyma yanlış belief üretebilir.

Örnek:

```text
Tam cümle:
“Ejderhanın tehlikeli olmadığını kanıtlamamız gerek.”

Duyulan bölüm:
“Ejderhanın tehlikeli...”
```

Bu mekanizma ölçülü kullanılmalıdır.

---

# 76. Private conversation

Özel konuşma için:

```text
Uygun konum
Yakındaki dinleyiciler
Ses seviyesi
Kapılar
Güven
```

kontrol edilir.

NPC özel bilgi paylaşmadan önce ortamı gözlemleyebilir.

```text
“Burada konuşmayalım. Bizi biri duyabilir.”
```

---

# 77. Social status and authority

Rol ve otorite konuşmayı etkileyebilir.

```text
Bekçi acil durumda talimat verebilir.
Şifacı sağlık konusunda daha fazla söz sahibi olabilir.
Çocuk yine de soru sorabilir veya itiraz edebilir.
```

Otorite:

* otomatik doğruluk,
* sınırsız kontrol,
* sorgulanamazlık

anlamına gelmemelidir.

---

# 78. Politeness strategy

NPC’ler taleplerini ilişki ve bağlama göre farklı sunabilir.

```text
Doğrudan:
“Kapıyı kapat.”

Kibar:
“Kapıyı kapatabilir misin?”

Açıklayıcı:
“Rüzgâr çok güçlendi. Kapıyı kapatırsak içerisi daha güvenli olur.”

Acil:
“Hemen kapıyı kapat!”
```

Acil durum ile kaba davranış ayrılmalıdır.

---

# 79. Conflict conversation

Anlaşmazlık sırasında:

```text
Sorunu tanımla
Tarafların belief’lerini ayır
Duyguları tanı
Ortak hedef ara
Öneri üret
Sınırları koru
```

Konuşma her zaman anlaşmayla sonuçlanmak zorunda değildir.

Olası sonuçlar:

```text
Uzlaşma
Geçici anlaşma
Konuyu erteleme
Karşılıklı sınır
Devam eden anlaşmazlık
İlişki gerilimi
```

---

# 80. Conflict escalation control

Çocuk dostu tasarımda çatışma kademeli olmalıdır.

```text
Fikir ayrılığı
Yanlış anlaşılma
Kırgınlık
Daha sert anlaşmazlık
Geçici uzaklaşma
```

Her küçük farklılık büyük kavgaya dönüşmemelidir.

Sistem otomatik olarak:

* hakaret,
* aşağılama,
* tehdit,
* duygusal şantaj

üretmemelidir.

---

# 81. Repair conversation

Çatışma sonrası sosyal onarım konuşması olabilir.

```text
Ne olduğunu konuş
Yanlış anlaşılmayı düzelt
Duyguyu kabul et
Sorumluluğu paylaş
Yeni sınır veya söz oluştur
```

Bu konuşmalar ilişki motoruyla doğrudan bağlantılıdır.

---

# 82. Player choice in conversation

Çocuğa diyalog içinde seçenekler sunulabilir.

```text
Soru sor
Bilgiyi paylaş
Sırrı sakla
Özür dile
Yardım öner
Konuyu değiştir
Sessiz kal
```

Seçenekler:

* birbirinden anlamlı biçimde farklı,
* yaşa uygun,
* tuzak olmayan,
* karakterle uyumlu

olmalıdır.

---

# 83. Hidden conversational consequences

Her seçimin tüm sonuçları önceden açıklanmak zorunda değildir.

Ancak sonuçlar mantıklı olmalıdır.

Örnek:

```text
Çocuk özel bilgiyi kalabalıkta paylaşır.

Sonuç:
Bilgi daha hızlı yayılır.
NPC mahremiyet konusunda rahatsız olabilir.
```

Bu sonuç keyfî ceza olmamalıdır.

---

# 84. Silence as an action

Sessizlik de bir iletişim eylemi olabilir.

```text
Düşünme
Kararsızlık
Kırgınlık
Mahremiyet
Korku
Dinleme
Sınır koyma
```

Sistem sessizliği her zaman bilgi eksikliği saymamalıdır.

---

# 85. Nonverbal communication

NPC iletişimi yalnızca sözlü değildir.

```text
Gülümseme
Başını sallama
Geri çekilme
Bir nesneyi uzatma
Kapıyı gösterme
Sessizce yanında kalma
```

```ts
type NonverbalAct =
  | "nod"
  | "shake_head"
  | "smile"
  | "look_away"
  | "step_back"
  | "offer_object"
  | "point"
  | "remain_silent"
  | "comforting_presence";
```

Bu eylemler sosyal algı sistemi tarafından yorumlanır.

---

# 86. Nonverbal ambiguity

Sözsüz işaretler belirsiz olabilir.

```text
NPC başını çevirdi.

Olası anlamlar:
Utandı
Kızdı
Bir sesi duydu
Düşünmek istedi
```

Dinleyici kesin anlam çıkarmamalıdır.

---

# 87. Communication fatigue

Uzun konuşmalar NPC’nin:

```text
Dikkatini
Sosyal enerjisini
Sabrını
Duygusal kapasitesini
```

tüketebilir.

```ts
type ConversationFatigue = {
  participantId: string;
  socialEnergyCost: number;
  attentionCost: number;
  emotionalCost: number;
};
```

Yorgun NPC:

* kısa cevap verebilir,
* önemli konuşmayı erteleyebilir,
* yanlış anlayabilir.

---

# 88. Background communication simulation

Oyuncu yokken bütün konuşmalar yazılı diyalog olarak üretilmez.

## Yüksek önemli konuşma

```text
Anlamsal tur bazlı simülasyon
Knowledge ve ilişki sonuçları ayrıntılı
```

## Orta önemli konuşma

```text
Amaç ve sonuç bazlı özet
```

## Düşük önemli konuşma

```text
“Bekçi köprü hasarını marangozlara bildirdi.”
```

Bu, maliyeti azaltır.

---

# 89. Offline communication

Kısa yoklukta:

```text
Yakın ve önemli NPC iletişimleri işlenebilir.
```

Orta yoklukta:

```text
Bilgi aktarımı ve görev koordinasyonu sonuç bazlı hesaplanır.
```

Uzun yoklukta:

```text
Yalnızca kritik bilgi yayılımı, sözler ve ilişki sonuçları saklanır.
```

Ana hikâye açıklamaları oyuncu yokken tüketilmez.

---

# 90. Narrative communication gates

Bazı bilgiler oyuncuya yalnızca uygun hikâye anında açıklanmalıdır.

```ts
type DisclosureNarrativeGate = {
  knowledgeId: string;

  requirements:
    | "player_presence"
    | "relationship_threshold"
    | "story_event"
    | "location"
    | "prior_clue"
    | "explicit_question";

  fallbackBehavior:
    | "hint"
    | "delay"
    | "refuse"
    | "redirect";
};
```

NPC bu bilgiyi arka planda başka NPC’ye de açıklayacaksa ayrı erişim kuralı gerekir.

---

# 91. LLM dialogue pipeline

Önerilen süreç:

```text
1. Conversation trigger belirle
2. Conversation intent seç
3. Katılımcıları doğrula
4. Speaker knowledge slice oluştur
5. Listener model oluştur
6. Disclosure izinlerini uygula
7. Speech plan üret
8. LLM ile yüzey metni oluştur
9. Knowledge ve safety doğrulaması yap
10. Diyalog act sonucunu uygula
11. Dinleyici yorumunu hesapla
12. Memory ve relationship state güncelle
```

---

# 92. LLM input boundaries

LLM’ye şu bilgiler verilebilir:

```text
Karakter kimliği
Konuşma tarzı
Mevcut emotion
Conversation intent
Konuşma hedefi
İzinli knowledge ve belief’ler
Belirsizlik seviyeleri
Dinleyici ilişkisi
Söylenmemesi gereken bilgiler
Sahne bağlamı
```

Verilmemesi gerekenler:

```text
NPC’nin bilmediği world truth
Gereksiz tüm evren state’i
Oyuncunun gizli sistem verileri
Başka NPC’nin özel iç state’i
```

---

# 93. Dialogue output schema

LLM serbest metin yerine yapılandırılmış çıktı vermelidir.

```ts
type GeneratedDialogueTurn = {
  speakerId: string;
  dialogueAct: DialogueAct;
  text: string;

  referencedKnowledgeIds: string[];
  expressedBeliefIds: string[];

  certaintyMode: string;
  emotionalTone: string;

  requestedResponseType?: string;
  disclosureLevel: string;
};
```

---

# 94. Dialogue validation

Her tur şu kontrollerden geçmelidir:

```text
NPC bu bilgiyi biliyor mu?
Belief güvenine uygun konuşuyor mu?
Gizli bilgiyi izinsiz açıkladı mı?
Karakter stiline uygun mu?
Yaşa uygun mu?
Tekrar ediyor mu?
Conversation goal ile ilgili mi?
Dünya kurallarına aykırı mı?
```

Geçersiz tur:

```text
Yeniden üretilir
Düzeltilir
Belirsizleştirilir
Kısaltılır
```

---

# 95. Conversation telemetry

Geliştirici araçları şu bilgileri gösterebilir:

```text
Konuşma neden başladı?
Konuşmacının amacı neydi?
Hangi knowledge kullanıldı?
Hangi bilgi saklandı?
Dinleyici ne anladı?
Hangi belief değişti?
İlişki neden değişti?
Konuşma neden sona erdi?
```

Bu, LLM hatalarını anlamayı kolaylaştırır.

---

# 96. Uçtan uca örnek

## Durum

Mira, yaralı tilkinin güney mağarasına yakın olabileceğine inanıyor.

Güven:

```text
0.58
```

Mira’nın knowledge’i:

```text
Arin güneyden hayvan sesi duydu.
Dere kenarında eski ayak izleri bulundu.
Kuzeydeki izler başka hayvana ait olabilir.
```

Mira’nın goal’ü:

```text
Tilkinin yerini güvenli biçimde doğrulamak.
```

Çocuk Mira’ya yaklaşıyor.

---

## Conversation trigger

```text
Player presence
+
Relevant relationship
+
Need for help
```

---

## Conversation intent

```text
Primary:
Inform

Secondary:
Request help

Tertiary:
Protect
```

---

## Speech plan

```text
Ana bilgi:
Tilki güney tarafında olabilir.

Kesinlik:
Uncertain

Paylaşılmaması gereken:
Mağaranın içindeki olası tehlike hakkında doğrulanmamış söylenti

Talep:
Güney patikasındaki izleri birlikte kontrol etmek

Ton:
Sıcak, dikkatli
```

---

## Üretilen konuşma

```text
“Arin dün gece güney tarafından bir hayvan sesi duymuş.
Bunun bizim tilki olduğundan emin değilim ama izleri kontrol etmek
iyi olabilir. Tek başına mağaraya girmeyelim; önce patikaya bakalım.”
```

---

## Çocuğun sorusu

```text
“Tilki kesin mağarada mı?”
```

---

## Mira’nın cevabı

Knowledge validation sonucu:

```text
Kesin konum bilinmiyor.
```

Doğru cevap:

```text
“Hayır, henüz kesin bilmiyoruz. Yalnızca birkaç işaret o tarafı gösteriyor.”
```

---

## Görev koordinasyonu

Mira:

```text
“Sen yerdeki küçük izlere bakabilirsin. Ben de çevrede yaralı bir hayvan sesi var mı dinlerim.”
```

Çocuk kabul eder.

Sistem sonucu:

```text
Shared plan oluştu.
Child task:
Inspect tracks

Mira task:
Listen and observe

Acknowledgment:
Successful
```

---

## Yeni algı

Çocuk eski bir bez parçası bulur.

Mira bunun daha önce tilkinin yarasına sarılan bez olduğunu tanır.

Belief confidence:

```text
0.58 → 0.82
```

---

## Yeni konuşma

```text
“Bu bez ona ait olabilir. Şimdi güney mağarasına yakın olduğundan çok daha eminim.”
```

Konuşma, belief değişimini doğru certainty seviyesiyle yansıtır.

---

# 97. Teknik servis ayrımı

```text
Conversation Trigger Manager
→ Konuşmanın ne zaman başlaması gerektiğini belirler

Conversation Intent Planner
→ Konuşmanın sosyal amacını seçer

Participant Selector
→ Uygun konuşmacı ve dinleyicileri belirler

Disclosure Controller
→ Hangi bilginin ne ölçüde paylaşılabileceğini yönetir

Speech Planner
→ Diyalog act ve ana noktaları oluşturur

Listener Modeler
→ Dinleyicinin knowledge, belief ve emotion durumunu tahmin eder

Dialogue Generator
→ Yapılandırılmış planı doğal dile dönüştürür

Dialogue Validator
→ Knowledge, certainty, güvenlik ve karakter uyumunu kontrol eder

Conversation State Manager
→ Tur sırası, konu ve konuşma ilerlemesini yönetir

Social Outcome Resolver
→ Belief, ilişki, emotion ve görev sonuçlarını uygular

Conversation Memory Store
→ Önemli konuşma sonuçlarını saklar
```

---

# 98. Sistem ilkeleri

1. Her konuşma bir sosyal veya bilgi amaçlı niyete dayanmalıdır.
2. Konuşma state’i ile üretilen metin ayrı katmanlar olmalıdır.
3. NPC yalnızca bildiği veya inandığı bilgileri kullanmalıdır.
4. Belief güveni konuşmanın kesinlik seviyesine yansıtılmalıdır.
5. Bilgiyi bilmek, onu paylaşmak zorunda olmak anlamına gelmez.
6. NPC neyi, kime ve hangi ortamda söyleyeceğini değerlendirmelidir.
7. Dinleyici konuşmayı otomatik olarak doğru anlamamalıdır.
8. Yanlış anlaşılmalar nedenleriyle birlikte modellenmelidir.
9. Kritik görev mesajları acknowledgment gerektirebilmelidir.
10. Sözler takvim ve ilişki sistemine aktarılmalıdır.
11. NPC her talebi kabul etmemelidir.
12. Reddetme yeni seçenekler üretebilmelidir.
13. Mahremiyet ve sınır koyma sağlıklı sosyal davranış olarak desteklenmelidir.
14. İkna ile baskı ayrılmalıdır.
15. Çatışmalar kademeli ve çocuk dostu olmalıdır.
16. NPC’ler bilmiyorum ve emin değilim diyebilmelidir.
17. Grup konuşmalarında tüm karakterler aynı bilgiye ve role sahip varsayılmamalıdır.
18. Konuşma sonuçları belief, emotion, memory, plan ve ilişkilerde iz bırakmalıdır.
19. Arka plan konuşmaları her zaman tam metin olarak üretilmemelidir.
20. Ana anlatı açıklamaları oyuncu yokken tüketilmemelidir.
21. LLM yalnızca izinli karakter bağlamını görmelidir.
22. Her üretilen tur knowledge ve disclosure doğrulamasından geçmelidir.

---

# 99. Backlog kararları

### COM-01 — Conversation intent

Her önemli konuşma açık bir iletişim niyeti ve hedefi taşıyacak.

### COM-02 — Speech plan

LLM çağrısından önce yapılandırılmış konuşma planı oluşturulacak.

### COM-03 — Knowledge-grounded dialogue

NPC konuşması yalnızca erişilebilir knowledge ve belief kayıtlarına dayanacak.

### COM-04 — Certainty alignment

Konuşma kesinliği belief confidence ile uyumlu olacak.

### COM-05 — Disclosure controller

Bilgiyi bilmek ve paylaşabilmek ayrı izinler olarak değerlendirilecek.

### COM-06 — Listener modeling

Konuşmacı, dinleyicinin knowledge, belief, emotion ve anlama düzeyi hakkında sınırlı bir model kullanacak.

### COM-07 — Audience adaptation

Aynı bilgi rol, yaş, ilişki ve bilgi düzeyine göre farklı biçimde anlatılabilecek.

### COM-08 — Conversation availability

NPC’nin mevcut görev, enerji ve ortam durumuna göre konuşma uygunluğu değerlendirilecek.

### COM-09 — Dialogue acts

Konuşmalar statement, request, apology, warning ve benzeri sosyal eylemlerle modellenebilecek.

### COM-10 — Misunderstanding support

Dinleyici yanlış anlayabilecek; konuşmacı bunu tespit edip açıklama yapabilecek.

### COM-11 — Social request resolution

Talepler maliyet, risk, ilişki, rol ve takvim uygunluğuna göre kabul veya reddedilecek.

### COM-12 — Promise integration

Konuşmada verilen sözler schedule ve relationship sistemlerine aktarılacak.

### COM-13 — Boundary setting

NPC’ler mahremiyet, güvenlik, zaman ve duygusal sınırlar koyabilecek.

### COM-14 — Negotiation state

Ortak plan ve anlaşmazlıklar yapılandırılmış müzakere süreciyle yönetilebilecek.

### COM-15 — Coordination acknowledgment

Kritik görev atamaları dinleyicinin anladığı ve kabul ettiği doğrulanmadan aktifleşmeyecek.

### COM-16 — Message lifecycle

Mektup, not ve haberci mesajları gönderim, teslim, okuma ve kaybolma durumlarına sahip olacak.

### COM-17 — Conversation memory

Tam metin yerine önemli ifadeler, sözler, açık sorular ve sonuçlar kalıcılaştırılacak.

### COM-18 — Nonverbal acts

Sessizlik, işaret ve beden dili sosyal eylem olarak desteklenecek.

### COM-19 — Conversation loop prevention

Tekrar eden ve ilerlemeyen konuşmalar otomatik olarak özetlenecek, ilerletilecek veya sonlandırılacak.

### COM-20 — Narrative disclosure gates

Ana hikâye bilgileri ilişki, sahne, konum ve oyuncu varlığı koşullarına bağlanabilecek.

### COM-21 — Structured LLM output

Diyalog üretimi yapılandırılmış şema üzerinden yapılacak.

### COM-22 — Dialogue validation

Her konuşma turu knowledge, certainty, disclosure, yaş uygunluğu ve tekrar açısından doğrulanacak.

### COM-23 — Relevance-scaled communication

Diyalog ayrıntısı sahne ve NPC önemine göre ölçeklenecek.

### COM-24 — Explainable conversation outcomes

Konuşmanın neden başladığı, neyi değiştirdiği ve neden sona erdiği geliştirici araçlarında görülebilecek.
