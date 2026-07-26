Story Session, Playback & Interaction Orchestration Engine

Bu motor, LUMI’de çocuğun gördüğü hikâye deneyimini yöneten üst seviye orkestrasyon katmanıdır.

Alt motorlar ayrı ayrı şunları bilir:

World Engine: Dünyada ne var?
Character Engine: Karakterler ne durumda?
Emotion Engine: Ne hissediyorlar?
Decision Engine: Ne yapmayı seçebilirler?
Narrative Engine: Olanları nasıl anlatacağız?
Memory Engine: Neler hatırlanmalı?

Story Session Engine ise şu soruyu cevaplar:

“Bütün bunları çocuğa hangi sırayla, hangi hızda, hangi etkileşimlerle ve hangi oturum yapısı içinde sunacağız?”

1. Temel ayrım: Story ≠ Session

Bir hikâye, evrende gerçekleşen olayların anlatısal bütünüdür.

Bir story session ise kullanıcının bu hikâyeyi deneyimlediği çalışma oturumudur.

Örneğin:

Hikâye: Lila’nın Kayıp Fener Ormanı macerası
Oturum 1: Ormana giriş ve tilkiyle karşılaşma
Oturum 2: Ertesi gün devam etme
Oturum 3: Son seçim ve eve dönüş
Playback: Daha önce yaşananları tekrar dinleme
Replay: Aynı hikâyeyi farklı seçimlerle yeniden oynama

Bu ayrım çok önemli. Çünkü kullanıcı uygulamayı kapattığında hikâye kaybolmaz; yalnızca aktif oturum durur.

2. Story Session’ın temel görevleri

Story Session Engine şu alanları yönetir:

Oturum açılışı
Devam edilecek hikâyenin belirlenmesi
Sahne sıralaması
Metin, görsel, ses ve etkileşimlerin sunumu
Kullanıcı seçimlerinin alınması
Seçimlerin doğrulanması
Alt motorlara kararların iletilmesi
Oturumun duraklatılması
Güvenli kayıt noktaları
Uygulama kapatıldığında devam edebilme
Hikâye özeti
Tekrar oynatma
Alternatif seçim akışları
Ebeveyn müdahalesi
Çocuğun yaşına göre tempo ayarlama
3. Üç katmanlı yapı

Bu motoru üç ana katmana ayırabiliriz.

3.1 Session Controller

Oturumun yaşam döngüsünü yönetir.

Durumlar:

CREATED
INITIALIZING
READY
PLAYING
WAITING_FOR_INTERACTION
PAUSED
RESUMING
COMPLETING
COMPLETED
ABANDONED
RECOVERING
ERROR

Örnek geçiş:

CREATED
→ INITIALIZING
→ READY
→ PLAYING
→ WAITING_FOR_INTERACTION
→ PLAYING
→ PAUSED
→ RESUMING
→ COMPLETED

Burada WAITING_FOR_INTERACTION önemli bir durumdur. Çünkü sistem hikâyeye devam etmeden önce çocuktan:

seçim,
cevap,
dokunma,
nesne seçimi,
mini oyun sonucu,
ebeveyn onayı

bekliyor olabilir.

3.2 Playback Controller

İçeriğin nasıl oynatılacağını yönetir.

Playback yalnızca ses oynatmak değildir. Aşağıdaki parçaların zamanlamasını düzenler:

Narration
Character Dialogue
Illustration
Animation
Ambient Sound
Sound Effect
Music
Subtitle
Interaction Prompt
Reflection Question
Parent Guidance

Örnek bir sahne akışı:

1. Orman görselini göster
2. Yağmur ambiyansını başlat
3. Anlatıcı metnini göster
4. İstenirse TTS ile oku
5. Tilki karakterini görünür yap
6. Tilkinin konuşmasını oynat
7. Seçim ekranına geç
8. Playback’i beklemeye al

Bu akışın kontrolsüz biçimde aynı anda başlamaması gerekir. Orkestrasyon motoru zamanlama ve öncelik sağlar.

3.3 Interaction Controller

Kullanıcının hikâyeye müdahale ettiği tüm noktaları yönetir.

Etkileşim türleri:

CHOICE
ITEM_SELECTION
CHARACTER_SELECTION
MAP_SELECTION
DIALOGUE_RESPONSE
EMOTION_RESPONSE
REFLECTION_QUESTION
COMPREHENSION_QUESTION
MINI_GAME
GESTURE
PARENT_CONFIRMATION
FREE_TEXT
VOICE_INPUT

Her etkileşimin kendi kuralları olabilir.

Örneğin:

{
  "interactionType": "CHOICE",
  "prompt": "Lila tilkiye yardım etmeli mi?",
  "options": [
    {
      "id": "help_fox",
      "label": "Tilkiye yardım et",
      "availability": true
    },
    {
      "id": "continue_alone",
      "label": "Yoluna devam et",
      "availability": true
    }
  ],
  "timeoutPolicy": "NO_TIMEOUT",
  "allowParentOverride": true
}
4. Story Session veri modeli

Önerilen temel model:

interface StorySession {
  id: string;

  childProfileId: string;
  worldId: string;
  storyId: string;
  storyRunId: string;

  status: StorySessionStatus;

  currentChapterId?: string;
  currentSceneId?: string;
  currentBeatId?: string;
  currentInteractionId?: string;

  startedAt: string;
  lastActiveAt: string;
  pausedAt?: string;
  completedAt?: string;

  playbackState: PlaybackState;
  sessionPreferences: SessionPreferences;

  checkpointId?: string;

  selectedCharacters: string[];
  temporaryParticipants: string[];

  pendingEffects: PendingEffect[];
  committedEffects: CommittedEffect[];

  interactionHistory: InteractionRecord[];
  playbackHistory: PlaybackRecord[];

  recoveryState?: RecoveryState;

  version: number;
}

Buradaki storyRunId, aynı hikâyenin farklı oynanışlarını birbirinden ayırır.

Örneğin:

storyId: lost-lantern
storyRunId: lost-lantern-run-001

Çocuk aynı hikâyeyi tekrar oynarsa:

storyRunId: lost-lantern-run-002

Bu sayede alternatif seçim geçmişleri birbirine karışmaz.

5. Story yapısının oynatılabilir parçalara ayrılması

Hikâyeyi yalnızca sayfalardan oluşturmamalıyız.

Önerilen hiyerarşi:

Story
 └── Chapter
      └── Scene
           └── Beat
                └── Playback Unit
Chapter

Hikâyenin büyük bölümü.

Örnek:

Ormana Yolculuk
Kayıp Fener
Sisli Geçit
Eve Dönüş
Scene

Belirli bir zaman ve mekânda gerçekleşen olay grubu.

Örnek:

Orman girişindeki taş köprü
Tilkinin saklandığı çalılık
Gece kampı
Beat

Sahne içindeki küçük dramatik an.

Örnek:

Bir ses duyulur
Lila korkar
Çalı hareket eder
Tilki ortaya çıkar
Çocuğa seçim sunulur
Playback Unit

Kullanıcıya gösterilecek veya oynatılacak atomik içerik.

Örnek:

{
  "type": "NARRATION",
  "text": "Lila, çalıların arasından gelen hafif sesi duydu.",
  "autoAdvance": true
}

Başka bir örnek:

{
  "type": "INTERACTION",
  "interactionId": "inspect_bush"
}
6. Oturum başlatma akışı

Bir hikâye oturumu başlatılırken doğrudan ilk cümle gösterilmemeli.

Motor önce bir hazırlık aşaması çalıştırmalı.

1. Çocuk profili yüklenir
2. Dünya durumu yüklenir
3. Son hikâye durumu kontrol edilir
4. Devam eden session var mı bakılır
5. Karakterlerin uygunluğu kontrol edilir
6. Seçili envanter nesneleri hazırlanır
7. Yaş ve içerik ayarları alınır
8. Gerekli sahne ve medya kaynakları hazırlanır
9. Güvenli başlangıç checkpoint’i oluşturulur
10. Playback başlatılır

Başlangıç sonucu şu seçeneklerden biri olabilir:

NEW_STORY
RESUME_SESSION
CONTINUE_STORY
REPLAY_STORY
RECOVER_INTERRUPTED_SESSION
7. Devam etme ile yeniden oynama ayrımı

Bu ikisi kesinlikle aynı şey değildir.

Resume

Aynı oturum kaldığı yerden sürdürülür.

Aynı storyRunId
Aynı seçim geçmişi
Aynı dünya etkileri
Aynı checkpoint
Replay

Hikâye yeni bir oynanış olarak başlatılır.

Yeni storyRunId
Yeni seçim geçmişi
Eski dünya etkileri korunabilir veya izole edilebilir

Replay için üç mod olabilir:

Canonical Replay

Dünya geçmişi değişmez. Sadece hikâye yeniden deneyimlenir.

Branch Replay

Seçilen bir karar noktasından alternatif yol denenir.

New Timeline Replay

Aynı başlangıçtan yeni ve bağımsız bir zaman çizgisi oluşturulur.

Çocuk uygulaması için varsayılan seçenek büyük ihtimalle Canonical Replay olmalıdır. Böylece çocuk hikâyeyi tekrar oynarken yanlışlıkla dünyanın ana geçmişini bozmaz.

8. Checkpoint sistemi

Her cümleden sonra veritabanına yazmak pahalı ve gereksiz olabilir. Fakat yalnızca hikâye sonunda kayıt yapmak da risklidir.

Bu nedenle anlamlı checkpoint noktaları gerekir.

Checkpoint oluşturulabilecek durumlar:

Sahne başlangıcı
Sahne sonu
Önemli seçimden önce
Önemli seçimden sonra
Envanter değişikliğinde
Karakter durumu kalıcı değiştiğinde
Mini oyun tamamlandığında
Oturum duraklatıldığında
Uygulama arka plana geçtiğinde
Hikâye tamamlandığında

Checkpoint örneği:

interface StoryCheckpoint {
  id: string;
  sessionId: string;

  chapterId: string;
  sceneId: string;
  beatId: string;
  playbackUnitIndex: number;

  worldSnapshotRef: string;
  characterSnapshotRefs: string[];

  interactionHistoryCursor: number;

  pendingEffectIds: string[];
  committedEffectIds: string[];

  createdAt: string;
  reason: CheckpointReason;

  checksum: string;
}
9. Pending Effect ve Committed Effect

Çocuk bir seçim yaptığında etkisini hemen kalıcı hale getirmek her zaman doğru değildir.

Örneğin çocuk yanlışlıkla bir seçeneğe dokunmuş olabilir.

Bu nedenle iki aşamalı etki modeli öneriyorum.

Pending Effect

Henüz geçici olan etkidir.

Örnek:

Tilkiye yardım et seçildi.
+ yardımseverlik eğilimi
+ tilki güveni
- zaman kaybı

Ancak bunlar seçim doğrulanana veya sahne tamamlanana kadar geçici tutulabilir.

Committed Effect

Artık kalıcı hale gelmiş etkidir.

Commit noktaları:

Seçim onaylandı
Sonraki anlatım başladı
Sahne tamamlandı
Geri alma süresi geçti
Mini oyun sonucu kesinleşti

Bu yöntem, yanlış dokunma ve bağlantı kesilmesi gibi sorunları daha güvenli yönetir.

10. Geri alma sistemi

Her etkileşim geri alınabilir olmamalıdır.

Üç seviye öneriyorum:

REVERSIBLE
REVERSIBLE_UNTIL_COMMIT
IRREVERSIBLE

Örnekler:

REVERSIBLE
Ses açıp kapatma
Metni yeniden oynatma
Haritaya bakma
Karakter bilgi kartını açma
REVERSIBLE_UNTIL_COMMIT
Hikâye seçimi
Envanter nesnesi seçimi
Diyalog cevabı
IRREVERSIBLE
Ebeveyn tarafından onaylanan kalıcı dünya değişimi
Hikâye sonu ödülünün alınması
Ana zaman çizgisinin tamamlanması

Çocuk deneyiminde karar seçiminden sonra kısa süreli bir:

“Seçimini değiştirmek ister misin?”

alanı faydalı olabilir.

Ancak bunu her seçimde göstermek hikâyenin akışını yavaşlatır. Yalnızca yüksek etkili kararlarda gösterilmelidir.

11. Playback State

Playback durumu session durumundan ayrı tutulmalı.

interface PlaybackState {
  status:
    | "IDLE"
    | "PREPARING"
    | "PLAYING"
    | "PAUSED"
    | "BUFFERING"
    | "WAITING"
    | "SKIPPING"
    | "COMPLETED"
    | "ERROR";

  currentUnitId?: string;
  currentPositionMs?: number;

  narrationEnabled: boolean;
  subtitlesEnabled: boolean;
  autoAdvanceEnabled: boolean;

  playbackSpeed: number;

  activeAudioLayers: AudioLayerState[];
  visibleVisualLayers: VisualLayerState[];

  replayCount: number;
}

Önemli nokta:

Session PAUSED olabilirken playback IDLE olabilir.

Ya da:

Session PLAYING iken playback WAITING olabilir, çünkü çocuk seçim yapmaktadır.

12. Çok katmanlı ses yönetimi

Aynı anda birkaç ses türü çalışabilir:

Narration
Character Voice
Ambient
Music
Sound Effect
UI Sound

Öncelik kuralları gerekir.

Örneğin:

Karakter konuşunca müzik sesi azalır.
Anlatıcı başladığında ambiyans devam eder.
Önemli ses efekti sırasında anlatıcı kısa süre durabilir.
Ebeveyn konuşma modu açıldığında tüm sesler azalır.

Audio priority örneği:

PARENT_GUIDANCE      100
SAFETY_MESSAGE        95
CHARACTER_DIALOGUE    80
NARRATION             70
SOUND_EFFECT          60
MUSIC                 30
AMBIENCE              20

Bu sadece ses yüksekliği değil; kesme, bekletme ve ducking davranışını da belirler.

13. Auto-advance politikası

Her içerik otomatik ilerlememeli.

type AutoAdvancePolicy =
  | "IMMEDIATE"
  | "AFTER_AUDIO"
  | "AFTER_DELAY"
  | "AFTER_ANIMATION"
  | "USER_TAP"
  | "INTERACTION_REQUIRED"
  | "PARENT_CONFIRMATION";

Örnek:

Anlatıcı metni → AFTER_AUDIO
Görsel geçiş → AFTER_ANIMATION
Duygusal sahne → USER_TAP
Seçim noktası → INTERACTION_REQUIRED
Ebeveyn rehberi → PARENT_CONFIRMATION

Yaşa göre varsayılanlar değişebilir.

Küçük çocuklarda:

daha yavaş geçiş,
daha büyük dokunma alanları,
daha az seçenek,
daha uzun bekleme süresi,
tekrar oynatma kolaylığı

olmalıdır.

14. Etkileşim kilitleri

Bazen kullanıcı ekran üzerinde bir seçenek görse bile henüz seçememelidir.

Örneğin anlatıcı cümlesini tamamlamadan seçimlere dokunulmasını istemeyebiliriz.

interface InteractionLock {
  interactionId: string;
  locked: boolean;

  unlockCondition:
    | "NARRATION_COMPLETED"
    | "ANIMATION_COMPLETED"
    | "DELAY_COMPLETED"
    | "REQUIRED_CONTENT_VIEWED"
    | "PARENT_APPROVED";

  unlockAt?: string;
}

Ancak çocuk için gereksiz bekleme hissi oluşturmamalıyız. Bu kilitler yalnızca anlatısal veya teknik olarak gerektiğinde kullanılmalı.

15. Story Orchestration Plan

Her sahne için motorun çalıştırabileceği bir orchestration plan üretilebilir.

{
  "sceneId": "forest-fox-encounter",
  "steps": [
    {
      "id": "step-1",
      "action": "SHOW_BACKGROUND",
      "resource": "forest_evening"
    },
    {
      "id": "step-2",
      "action": "START_AMBIENCE",
      "resource": "forest_rain"
    },
    {
      "id": "step-3",
      "action": "PLAY_NARRATION",
      "textRef": "narration_104",
      "waitForCompletion": true
    },
    {
      "id": "step-4",
      "action": "SHOW_CHARACTER",
      "characterId": "injured_fox"
    },
    {
      "id": "step-5",
      "action": "OPEN_INTERACTION",
      "interactionId": "help_fox_choice"
    }
  ]
}

Bu yapı, Narrative Engine’in ürettiği içeriği uygulamanın oynatabileceği teknik plana dönüştürür.

16. Orkestrasyon adımlarının çalışma biçimi

Adımlar yalnızca sıralı olmak zorunda değildir.

Üç çalışma biçimi olabilir:

SEQUENTIAL
PARALLEL
CONDITIONAL

Örnek:

PARALLEL:
- Orman görselini göster
- Yağmur sesini başlat
- Hafif müziği başlat

Sonra:

SEQUENTIAL:
- Anlatımı oynat
- Tilkiyi göster
- Etkileşimi aç

Koşullu örnek:

IF child_fears_darkness > threshold
THEN show_reassurance_line
ELSE continue_normally
17. Çocuğun pasif kalması

Çocuk seçim ekranında uzun süre hiçbir şey yapmazsa sistem bunu hata olarak görmemeli.

Seçenekler:

NO_ACTION
GENTLE_REMINDER
REPEAT_PROMPT
SIMPLIFY_OPTIONS
ASK_PARENT
PAUSE_SESSION

Önerilen davranış:

Bir süre bekle
Seçenekleri hafifçe vurgula
Soruyu tekrar oku
Gerekirse seçenekleri sadeleştir
Çok uzun sürerse oturumu duraklat

Sistem asla çocuğu acele ettiren bir dil kullanmamalı.

Yanlış:

“Hadi, çabuk seçim yap!”

Doğru:

“Lila biraz bekliyor. Hazır olduğunda ona yardım edebilirsin.”

18. Session Tempo Profile

Her çocuğun hikâye deneyimleme hızı farklı olabilir.

interface SessionTempoProfile {
  narrationSpeed: number;
  textRevealSpeed: number;
  defaultPauseBetweenUnitsMs: number;

  interactionPromptRepeatDelayMs: number;

  visualTransitionDurationMs: number;

  allowFastForward: boolean;
  allowSkipPreviouslySeen: boolean;

  emotionalSceneSlowdownFactor: number;
}

Bu profil:

yaş,
önceki kullanım davranışı,
ebeveyn tercihi,
hikâye türü,
sahnenin duygusal yoğunluğu

ile ayarlanabilir.

Ancak sistem çocuğu kalıcı olarak “yavaş” veya “hızlı” diye etiketlememelidir. Bu değerler yardımcı ve değişebilir tercihler olarak tutulmalıdır.

19. Uygulama kapanırsa ne olur?

Oturum kapanış senaryoları ayrı ayrı ele alınmalıdır.

Kontrollü çıkış

Kullanıcı “Hikâyeden çık” butonuna basar.

Playback durdurulur
Pending etkiler değerlendirilir
Checkpoint oluşturulur
Session PAUSED yapılır
Devam özeti hazırlanır
Uygulama arka plana geçer
Kısa süreliğine playback duraklar
Session hemen kapatılmaz
Arka plan süresi takip edilir
Uygulama çöker veya bağlantı kesilir
Son checkpoint yüklenir
Tamamlanmamış playback unit yeniden başlatılır
Commit edilmemiş etkiler iptal edilir veya yeniden doğrulanır

Burada prensip:

Aynı anlatım cümlesinin tekrar oynatılması, dünya durumunun yanlışlıkla iki kez değiştirilmesinden daha güvenlidir.

20. Idempotency

Çok kritik teknik bir prensiptir.

Bir seçim sonucu ağ problemi nedeniyle iki kez gönderilirse aynı etki iki kez uygulanmamalıdır.

Örneğin:

Tilkiye yardım et
+10 güven

İstek iki kere çalışırsa:

+20 güven

olmamalı.

Her etkileşim sonucu için benzersiz işlem kimliği gerekir:

interface InteractionSubmission {
  submissionId: string;
  sessionId: string;
  interactionId: string;
  optionId: string;
  submittedAt: string;
}

Aynı submissionId tekrar gelirse motor önceki sonucu döndürür, işlemi yeniden uygulamaz.

21. Session Event Log

Oturumda gerçekleşen her önemli olay event olarak kaydedilmelidir.

SESSION_CREATED
SESSION_STARTED
SCENE_ENTERED
PLAYBACK_UNIT_STARTED
PLAYBACK_UNIT_COMPLETED
INTERACTION_OPENED
OPTION_SELECTED
OPTION_CONFIRMED
EFFECT_COMMITTED
CHECKPOINT_CREATED
SESSION_PAUSED
SESSION_RESUMED
SESSION_COMPLETED

Örnek:

{
  "eventId": "evt-18271",
  "sessionId": "session-401",
  "type": "OPTION_SELECTED",
  "timestamp": "2026-07-24T17:45:00Z",
  "payload": {
    "interactionId": "help_fox_choice",
    "optionId": "help_fox"
  }
}

Bu kayıtlar:

hata ayıklama,
oturum kurtarma,
hikâye özeti,
ebeveyn raporu,
tutarlılık kontrolü

için kullanılabilir.

22. Çocuğun seçim geçmişini nasıl göstermeliyiz?

Kullanıcıya teknik event log gösterilmez.

Bunun yerine anlamlı bir “macera günlüğü” sunulur.

Örnek:

Lila ormana girdi.
Yaralı bir tilki buldu.
Tilkiye yardım etmeyi seçtin.
Tilki sana güvenmeye başladı.
Gümüş yaprağı envanterine ekledin.

Bu günlük:

hikâyeye devam etmeden önce,
uzun süre sonra geri dönüldüğünde,
hikâye sonunda,
ebeveyn ekranında

kullanılabilir.

23. Uzun süre sonra devam etme

Daha önce konuştuğumuz “uzun süre çevrimdışı kaldığında dünyanın yoğun simülasyon yapmaması” kuralı burada da kullanılmalı.

Örneğin kullanıcı 10 gün sonra geri döndü.

Story Session Engine şunları yapmalı:

1. Eski session bulunur
2. Son anlamlı checkpoint yüklenir
3. Kısa bir hatırlatma gösterilir
4. Dünya değişimlerinin hangilerinin işlendiği açıklanır
5. Çocuk kaldığı sahneye geri alınır

Örnek hatırlatma:

“Geçen sefer Lila, yaralı tilkiye yardım etmiş ve Sisli Geçit’e doğru yola çıkmıştı.”

Çocuğu doğrudan yarım kalmış bir diyaloğun ortasına bırakmamalıyız.

Gerekirse sahnenin birkaç beat öncesinden yeniden başlatabiliriz.

24. Resume Anchor

Checkpoint teknik konumu gösterir. Resume Anchor ise anlatısal olarak en uygun dönüş noktasını gösterir.

Örneğin oturum şu cümlede kapanmış olabilir:

“Tam o sırada mağaranın içinden…”

Teknik checkpoint burada olabilir. Fakat 10 gün sonra buradan başlatmak kafa karıştırıcıdır.

Resume Anchor daha önceki bir noktayı seçebilir:

“Lila ve tilki mağaranın girişine ulaşmıştı.”

interface ResumeAnchor {
  sceneId: string;
  beatId: string;

  recapText: string;
  replayFromUnitIndex: number;

  reason:
    | "SCENE_START"
    | "BEFORE_MAJOR_REVEAL"
    | "BEFORE_INTERACTION"
    | "AFTER_LONG_ABSENCE";
}

Bu ayrım LUMI için çok değerli olacaktır.

25. Ebeveyn kontrollü oturum seçenekleri

Ebeveynler için session bazında şu ayarlar olabilir:

Maksimum hikâye süresi
Uyku öncesi modu
Sesli anlatım açık/kapalı
Mini oyunlar açık/kapalı
Serbest metin girişi açık/kapalı
Korkutucu sahneleri azalt
Duygusal yoğunluğu sınırla
Seçenek sayısını azalt
Oturum sonunda soru sor
Otomatik devam kapalı

Uyku öncesi modu örneğin:

yüksek tempolu mini oyunları kapatır,
müziği sakinleştirir,
seçim sayısını azaltır,
daha yumuşak bir bitiş noktası seçer.
26. Doğal oturum sonlandırma

Hikâye henüz tamamlanmamış olsa bile oturum uygun bir noktada bitirilebilir.

Story Session Engine “soft ending point” bulmalıdır.

Uygun noktalar:

karakterler kamp kurdu,
yeni bir yere ulaşıldı,
gün sona erdi,
küçük görev tamamlandı,
bir sonraki hedef belirlendi.

Uygun olmayan noktalar:

tehlikenin ortası,
cevapsız bir seçim,
karakterin yaralandığı an,
duygusal çatışmanın zirvesi,
korkutucu bir cliffhanger.

Çocuk uygulamasında bölüm sonu merakı olabilir ama yoğun kaygı yaratacak yarım bırakmalar kullanılmamalıdır.

27. Session Duration Budget

Oturum başlamadan yaklaşık içerik bütçesi belirlenebilir.

interface SessionDurationBudget {
  targetMinutes: number;
  minimumMinutes: number;
  maximumMinutes: number;

  allowSceneCompression: boolean;
  allowMiniGameSkipping: boolean;
  preferNaturalEnding: boolean;
}

Örneğin ebeveyn 10 dakika seçtiyse motor:

25 dakikalık bölümü başlatmamalı,
uygun sahne sınırında bitirmeli,
ikincil diyalogları azaltabilmeli,
ana olay örgüsünü bozmamalı.
28. Hikâye üretimi ile playback ayrımı

Narrative Engine uzun bir hikâye üretip sonra Story Session Engine’e vermemeli.

Daha sağlıklı model:

Narrative Engine
→ Bir sonraki sahne/beat paketini üretir

Story Session Engine
→ Bu paketi oynatır

Interaction alınır
→ Dünya ve karakter durumu güncellenir

Narrative Engine
→ Yeni duruma göre sonraki paketi üretir

Yani akış tamamen önceden yazılmış dev bir metin olmak zorunda değildir.

Ancak her küçük cümlede de yeni LLM çağrısı yapılmamalıdır.

Önerilen üretim birimi:

1 sahne
veya
3–8 beat

Bu hem maliyet hem tutarlılık açısından dengeli olur.

29. Pre-generated Buffer

Kesintisiz deneyim için bir sonraki içerik önceden hazırlanabilir.

Şu an oynatılan beat: 5
Hazır beat’ler: 6, 7, 8
Henüz üretilmeyen: 9+

Ancak seçim noktasından sonraki içerik fazla erken üretilmemelidir; çünkü çocuğun seçimi yönü değiştirebilir.

Bu nedenle:

Seçim öncesine kadar buffer oluştur.
Seçim sonrasını kesin seçim gelmeden üretme.

Bazı düşük etkili dallar için iki seçenek de önceden hazırlanabilir, fakat bu maliyet değerlendirmesine bağlıdır.

30. Interaction Resolution Pipeline

Bir kullanıcı seçimi geldiğinde doğrudan sonraki sayfaya geçilmemelidir.

Önerilen boru hattı:

1. Interaction submission alınır
2. Session ve interaction doğrulanır
3. Seçenek hâlâ geçerli mi kontrol edilir
4. Idempotency kontrol edilir
5. Utility Evaluator çalışır
6. Decision Engine sonucu yorumlar
7. World/Character etkileri pending olarak hazırlanır
8. Narrative consequence oluşturulur
9. Etkiler commit edilir
10. Checkpoint oluşturulur
11. Sonraki playback planı açılır

Bazı düşük etkili seçimlerde süreç daha hafif çalışabilir.

31. Seçeneğin artık geçerli olmaması

Dağıtık veya uzun süren işlemlerde ekranda gösterilen bir seçenek sonradan geçersiz hale gelebilir.

Örneğin:

seçilen nesne artık envanterde yok,
karakter o sahnede değil,
ebeveyn içerik ayarını değiştirdi,
session başka cihazda ilerletildi.

Bu durumda sistem teknik hata göstermemeli.

Doğal açıklama:

“Lila çantasına baktı ama gümüş ipi yanında değildi. Başka bir yol seçebiliriz.”

Ardından seçenekler yeniden oluşturulur.

32. Çoklu cihaz ve session ownership

Aynı çocuk profili tablet ve telefonda açılabilir.

Risk:

Tablet eski sahnede
Telefon yeni sahnede
İki cihaz farklı seçim gönderiyor

Çözüm olarak session lease kullanılabilir.

interface SessionLease {
  sessionId: string;
  deviceId: string;

  acquiredAt: string;
  expiresAt: string;

  leaseVersion: number;
}

Bir cihaz aktif session’ı yönetirken diğer cihaz:

salt okunur izleyebilir,
“Burada devam et” diyerek kontrolü alabilir,
önceki cihazın session’ını duraklatabilir.
33. Playback geçmişi

Çocuk aynı anlatımı tekrar dinlemek isteyebilir.

Playback history şu bilgileri tutabilir:

interface PlaybackRecord {
  unitId: string;
  startedAt: string;
  completedAt?: string;

  replayedCount: number;
  skipped: boolean;

  playbackSpeed: number;
  narrationUsed: boolean;
}

Bu veriler deneyimi uyarlamak için kullanılabilir.

Örneğin çocuk belirli bir sahneyi birkaç kez dinlediyse bu:

sahneyi sevdiği,
anlamakta zorlandığı,
sesi tekrar duymak istediği

anlamına gelebilir.

Sistem tek başına kesin yorum yapmamalıdır.

34. Session Summary

Her oturum sonunda üç farklı özet üretilebilir.

Çocuk özeti

Kısa, sıcak ve anlatısal.

“Bugün Lila’yla ormana gittin, yaralı tilkiye yardım ettin ve eski taş köprüyü buldun.”

Ebeveyn özeti

Daha açıklayıcı.

Oturum süresi: 12 dakika
Tamamlanan sahne: 3
Yapılan önemli seçim: Tilkiye yardım etmek
Kullanılan eşya: Mavi fener
Yanıtlanan soru: 2
Sistem özeti

Teknik devam bilgisi.

Current scene
Committed effects
Pending hooks
Resume anchor
Unresolved narrative threads
35. Önerilen ana modüller
StorySessionService
SessionLifecycleManager
PlaybackOrchestrator
InteractionOrchestrator
CheckpointManager
ResumeManager
ReplayManager
SessionRecoveryManager
DurationBudgetManager
PlaybackBufferManager
SessionSummaryBuilder
SessionEventLogger
SessionLeaseManager
36. Engine’in temel prensipleri

Bu motor için şu prensipleri sabitlemeyi öneriyorum:

1. Dünya durumu ile sunum durumu ayrıdır

Bir sesin yarıda kalması, dünyadaki olayın yarım iki kez uygulanmasına yol açmamalı.

2. Her önemli etki checkpoint ile korunmalıdır

Fakat her görsel geçiş kalıcı kayıt gerektirmez.

3. Çocuk asla teknik kurtarma ekranıyla karşılaşmamalıdır

Kurtarma doğal bir anlatım üzerinden yapılmalıdır.

4. Uzun aradan sonra kaldığı kelimeden değil, anlamlı anlatı noktasından devam edilmelidir
5. Tekrar oynatma ana zaman çizgisini yanlışlıkla değiştirmemelidir
6. Seçimler iki kere uygulanmamalıdır
7. Oturum süresi hikâyenin kalitesini bozmadan uyarlanmalıdır
8. Etkileşimler hikâyeyi durduran form ekranları gibi hissettirmemelidir
9. Playback, anlatı ve dünya motorlarından bağımsız ama senkronize çalışmalıdır
10. Oturum her zaman güvenli ve doğal bir noktada durdurulabilmelidir
İlk karar setimiz

Story Session, Playback & Interaction Orchestration Engine için şu kararları şimdilik kabul edilmiş tasarım olarak alabiliriz:

Session ile Story ayrı kavramlardır.
Hikâye Chapter → Scene → Beat → Playback Unit olarak ayrılır.
Session ve Playback ayrı state machine kullanır.
Seçim etkileri pending ve committed olarak iki aşamalıdır.
Checkpoint ve Resume Anchor ayrı kavramlardır.
Uzun aradan sonra anlatısal olarak uygun noktadan devam edilir.
Replay ana zaman çizgisini varsayılan olarak değiştirmez.
Her kullanıcı işlemi idempotent olmalıdır.
Playback çoklu ses ve görsel katmanlarını orkestre eder.
Etkileşimler kilit, doğrulama ve çözümleme aşamalarına sahiptir.