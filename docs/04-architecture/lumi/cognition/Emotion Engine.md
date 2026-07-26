Emotion Engine’e geçelim.

LUMI’de Emotion Engine’in görevi, NPC’nin sadece “şu an üzgün / mutlu” olmasını belirlemek değil; yaşanan olayların NPC üzerinde nasıl bir duygusal iz bıraktığını, bu izin zamanla nasıl değiştiğini ve kararları nasıl etkilediğini hesaplamak olacak.

1. Duygular tek değer değil, vektör olmalı

Her NPC için temel duygu durumu şöyle tutulabilir:

type EmotionVector = {
  joy: number
  sadness: number
  fear: number
  anger: number
  trust: number
  disgust: number
  surprise: number
  curiosity: number
  hope: number
  guilt: number
  shame: number
  loneliness: number
  affection: number
}

Değerler örneğin 0.0–1.0 aralığında olabilir.

Bir NPC aynı anda:

mutlu,
tedirgin,
meraklı,
umutlu

olabilir.

Bu nedenle tek bir “mood” alanı yeterli değildir.

2. Duygu üç farklı katmanda tutulmalı
Anlık duygu

Saniyeler, dakikalar veya sahne süresince etkili olur.

currentEmotion

Örnek:

Aniden bir kurt sesi duydu.
fear +0.55
surprise +0.40
Süregelen ruh hâli

Saatler veya günler boyunca devam eden genel duygu eğilimidir.

moodState

Örnek:

Bir NPC birkaç gündür yalnız bırakılıyorsa:

loneliness giderek artar.
trust yavaşça azalabilir.
sadness temel seviyesinin üzerine çıkabilir.
Uzun vadeli duygusal iz

Önemli olayların kişilik ve ilişkiler üzerinde bıraktığı kalıcı etkidir.

emotionalImprints

Örnek:

{
  sourceEventId: "forest_rescue_014",
  targetId: "lumi",
  emotions: {
    trust: 0.42,
    affection: 0.31,
    fear: -0.12
  },
  significance: 0.78,
  decayRate: 0.002
}

Lumi, yaralı tilkiyi kurtardıysa tilkinin Lumi’ye karşı güveni ve sevgisi uzun süre devam edebilir.

3. Duygu olaydan doğrudan çıkmamalı

Aynı olay herkeste aynı duyguyu oluşturmamalı.

Temel hesap:

Emotion Response =
Event Emotional Signals
× NPC Personality
× Current Needs
× Memories
× Relationship
× Context

Örneğin güneş tutulması:

Karanlıktan korkan NPC
fear +0.70
surprise +0.35
curiosity +0.05
Uzayı seven NPC
curiosity +0.75
joy +0.35
surprise +0.45
Tutulmayı kötü alamet sayan yaşlı köylü
fear +0.45
sadness +0.20
hope -0.25

Olay aynı, duygusal yorum farklıdır.

4. Event Emotional Signal

Her olay, duygusal anlam taşıyan bir vektör üretmeli.

type EmotionalEventSignal = {
  joy?: number
  sadness?: number
  fear?: number
  anger?: number
  trust?: number
  surprise?: number
  curiosity?: number
  guilt?: number
  hope?: number

  threat?: number
  loss?: number
  reward?: number
  betrayal?: number
  kindness?: number
  uncertainty?: number
  novelty?: number
}

İkinci gruptaki değerler doğrudan duygu değildir. Emotion Engine bunları NPC’ye göre duygulara dönüştürür.

Örneğin:

const abandonedByFriend = {
  loss: 0.45,
  betrayal: 0.80,
  uncertainty: 0.30
}

Bunun sonucu NPC’ye göre değişir:

hassas NPC’de üzüntü,
gururlu NPC’de öfke,
bağımlı NPC’de yalnızlık,
şüpheci NPC’de “zaten biliyordum” hissi oluşabilir.
5. Duygusal hassasiyet profili

Her NPC’nin belirli duygulara karşı hassasiyeti olmalı.

type EmotionalSensitivity = {
  threatSensitivity: number
  rejectionSensitivity: number
  injusticeSensitivity: number
  lossSensitivity: number
  noveltySensitivity: number
  praiseSensitivity: number
  kindnessSensitivity: number
  socialSensitivity: number
}

Örnek:

{
  threatSensitivity: 0.85,
  rejectionSensitivity: 0.30,
  injusticeSensitivity: 0.70,
  noveltySensitivity: 0.90
}

Bu NPC:

tehlikeye karşı çok hassastır,
reddedilmeyi daha kolay atlatır,
haksızlığa güçlü tepki verir,
yeni şeylerden çok etkilenir.
6. Duyguların hedefi olmalı

Duygular yalnızca genel tutulmamalı. Bir hedefe yönelik de olabilir.

type TargetedEmotion = {
  targetId: string
  targetType: "character" | "place" | "faction" | "object" | "event"

  emotions: EmotionVector
}

Örnek:

{
  targetId: "old_miller",
  targetType: "character",
  emotions: {
    trust: 0.10,
    anger: 0.65,
    fear: 0.20
  }
}

NPC genel olarak sakin olabilir ama değirmenciyi gördüğünde öfkelenebilir.

Benzer şekilde:

mağaradan korkabilir,
eski evine özlem duyabilir,
belirli bir köye güvenmeyebilir,
çocuğun verdiği oyuncağa sevgi duyabilir.
7. Duygular birbirlerini etkilemeli

Duygular bağımsız sayaçlar gibi davranmamalı.

Örneğin:

yüksek fear → curiosity etkisini azaltabilir
yüksek trust → fear etkisini azaltabilir
yüksek hope → sadness etkisini yavaşlatabilir
yüksek guilt → yardım etme isteğini artırabilir
yüksek anger + düşük fear → yüzleşme ihtimalini artırabilir
yüksek anger + yüksek fear → kaçınma veya gizli intikam doğurabilir

Basit bir örnek:

effectiveFear =
  rawFear
  * (1 - trust * 0.35)
  * (1 - courage * 0.30)

Ancak cesaret korkuyu tamamen yok etmemeli.

Cesur karakter korkar ama korkmasına rağmen hareket eder.

Bu ayrım önemli:

Emotion Engine: “Ne hissediyorum?”
Decision Engine: “Buna rağmen ne yapacağım?”
8. Emotion Engine ile Utility Evaluator bağlantısı

Emotion Engine doğrudan karar vermemeli.

Utility Evaluator’a kararları etkileyen katsayılar sağlamalı.

Örnek kararlar:

yaralı yabancıya yardım et,
kaç,
saldır,
saklan,
arkadaşını çağır.

Emotion Engine çıktısı:

{
  actionBiases: {
    help: 0.32,
    flee: 0.48,
    confront: -0.12,
    seekSupport: 0.41
  }
}

Utility Evaluator bunu diğer değerlerle birleştirir:

Final Utility =
Need Utility
+ Goal Utility
+ Emotion Bias
+ Relationship Bias
+ Personality Bias
+ Risk Evaluation
+ Narrative Constraints

Böylece yüksek korku otomatik olarak “kaç” kararı oluşturmaz. Sadece kaçma seçeneğinin değerini artırır.

9. Duygular davranıştan sonra tekrar güncellenmeli

NPC’nin verdiği karar da kendi duygularını değiştirmeli.

Örneğin korkmasına rağmen çocuğu kurtardı:

fear -0.10
joy +0.20
hope +0.15
selfTrust +0.25

Kaçtı ve arkadaşını yalnız bıraktı:

fear -0.25
guilt +0.50
shame +0.30
selfTrust -0.20

Bu nokta Decision History ile birleşir.

Karakterin kendi davranışları zamanla onun duygusal yapısını ve kendisine dair algısını değiştirir.

“Ben korkağım.”
“Ben insanlara yardım ederim.”
“Kimseye güvenmemeliyim.”
“Tehlike anında sakin kalabilirim.”

Bunlar yalnızca kişilik özelliği değil, deneyimlerden oluşan öz-inançlar hâline gelir.

Bir sonraki adımda Emotion Dynamics — duyguların zamanla azalması, bastırılması, birikmesi, taşması ve başka duygulara dönüşmesi bölümüne geçmeliyiz.