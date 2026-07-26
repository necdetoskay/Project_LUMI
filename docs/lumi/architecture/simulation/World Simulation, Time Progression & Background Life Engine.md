1. Motorun sorumluluk sınırı

Bu motor doğrudan hikâye yazmaz. Şunları hesaplar:

Dünyada ne kadar zaman geçti?
Hangi varlıklar geçen zamandan etkilenebilir?
Hangi olaylar arka planda ilerleyebilir?
Hangi değişimler gerçekten uygulanmalıdır?
Hangi değişimler yalnızca olasılık veya hazırlık olarak tutulmalıdır?
Çocuk geri döndüğünde neler anlatılmalıdır?
Dünya ne zaman dondurulmalıdır?

Motorun çıktısı, Story Session Orchestrator ve Narrative Engine tarafından kullanılacak bir World Progression Report olur.

2. Temel zaman türleri

LUMI’de tek bir zaman kavramı kullanmak yeterli değildir. En az dört farklı zaman bulunmalıdır.

2.1 Gerçek zaman

Çocuğun uygulamaya en son girdiği an ile şimdiki zaman arasındaki süredir.

last_session_at → current_time

Örneğin:

Son giriş: 14 Temmuz 19.00
Yeni giriş: 17 Temmuz 20.00
Gerçek geçen süre: yaklaşık 3 gün

Bu süre doğrudan hikâye dünyasına aktarılmaz.

2.2 Dünya zamanı

Hikâye evreninde geçen süredir.

Gerçek dünyada üç gün geçmiş olsa bile hikâye dünyasında:

birkaç saat,
bir gece,
iki gün,
bir mevsimsel adım

geçmiş olabilir.

Dönüşüm sabit olmamalıdır:

world_elapsed_time =
real_elapsed_time
× world_time_scale
× narrative_context_modifier
× pause_policy_modifier

Örneğin çocuk karakteri güvenli bir köyde bıraktıysa zaman daha rahat ilerleyebilir. Fakat karakter uçurum kenarında tehlikeli bir seçim noktasında bırakıldıysa dünya zamanı dondurulmalıdır.

2.3 Anlatısal zaman

Hikâye açısından anlam taşıyan zaman birimidir.

Örnekler:

Şafak yaklaştı.
Fırtına iki gündür sürüyor.
Tilkinin yarası biraz iyileşti.
Pazar günü geldi.
Ay festivali için hazırlıklar başladı.

Anlatısal zaman saniye veya saat hassasiyetinde hesaplanmak zorunda değildir. Çoğu olay için şu tür soyut birimler daha uygundur:

moment
scene
watch
day
night
cycle
season_step
2.4 Varlık zamanı

Her NPC, bölge, görev, eşya veya olay geçen zamandan aynı derecede etkilenmez.

Örneğin:

Yaralı tilki zamandan güçlü biçimde etkilenir.
Dağın üzerindeki eski kale çok az etkilenir.
Köyde yapılmakta olan köprü orta düzeyde etkilenir.
Çantadaki sihirli taş ancak ay ışığı varsa etkilenir.
Çocuğun seçimini bekleyen mağara kapısı hiç ilerlemez.

Bu nedenle her varlığın kendi zaman duyarlılığı bulunmalıdır.

interface TemporalProfile {
  sensitivity: number;
  progressionDomains: string[];
  requiresObservation: boolean;
  maxUnobservedProgress: number;
  canResolveOffscreen: boolean;
  canCauseIrreversibleChange: boolean;
}
3. Zaman ilerleme katmanları

Daha önce konuştuğumuz “10 gün boyunca aynı yoğunlukta simülasyon yapmayalım” yaklaşımını resmi modele dönüştürelim.

Katman A — Yakın zaman: yoğun simülasyon

Önerilen süre:

0–24 saat

Bu aralıkta:

aktif NPC ihtiyaçları,
devam eden görevler,
hava koşulları,
yaralanmalar,
küçük ilişkisel değişimler,
bölgesel aktiviteler

daha ayrıntılı hesaplanabilir.

Ancak yine de her varlık hesaplanmaz; sadece çocuğun mevcut hikâye bağlamıyla ilişkili olanlar değerlendirilir.

Katman B — Orta zaman: örneklenmiş simülasyon

Önerilen süre:

1–3 gün

Saat saat ilerlemek yerine zaman blokları kullanılır:

sabah
öğle
akşam
gece

Bu aşamada:

tekrarlayan rutinler birleştirilir,
düşük etkili olaylar özetlenir,
yalnızca anlamlı durum değişimleri kaydedilir.

Örneğin arının her çiçeğe uçuşu hesaplanmaz. Bunun yerine:

Çayırdaki arı kolonisi yeterli polen topladı.

şeklinde tek bir sonuç üretilir.

Katman C — Uzak zaman: makro ilerleme

Önerilen süre:

3–10 gün

Burada ayrıntılı simülasyon yapılmaz. Varlıkların durumları makro kurallarla ilerletilir.

Örneğin:

Yaralı tilki:
- Güvenli bölgede
- Yiyeceğe erişimi var
- Yarası ölümcül değil
- Üç günden fazla zaman geçti

Sonuç:
- İyileşme seviyesi yükselir
- Hareket kabiliyeti kısmen geri gelir
- Çocuğa karşı minnet duygusu hafifçe güçlenir

Motor “Tilki salı günü üç adım attı, çarşamba günü uyudu” gibi gereksiz ayrıntılar üretmez.

Katman D — Statik evren

Önerilen eşik:

10 günden sonra

Bu noktadan sonra evren varsayılan olarak dondurulur.

Dünya tamamen sıfırlanmaz ve geçen süre yok sayılmaz. Bunun yerine:

simulation_status = suspended

olur.

Çocuk geri döndüğünde dünya mümkün olduğunca bıraktığı noktaya yakın kalır.

Bu tasarımın önemli sonucu:

Çocuğun yokluğunda büyük hikâye kararları, karakter kayıpları veya geri döndürülemez sonuçlar yaşanmaz.

Bazı çok yavaş arka plan değişimleri özel olarak izinli olabilir:

Mevsimsel görsel değişim,
Bir festival tarihinin yaklaşması,
Bitkilerin biraz büyümesi,
Gökyüzü döngüsü,
Güvenli bölgelerde iyileşme.

Fakat bunlar da anlatısal sürekliliği bozmamalıdır.

4. Simülasyon yoğunluğu eğrisi

Yoğunluk süreyle doğrusal azalmak zorunda değildir. Basamaklı veya eğrisel azaltma daha uygundur.

Örnek:

0–6 saat       → %100
6–24 saat      → %75
1–3 gün        → %40
3–7 gün        → %15
7–10 gün       → %5
10+ gün        → %0

Bu oran dünyanın yüzde kaçının simüle edileceğini değil, değerlendirme ayrıntısını ifade eder.

Örneğin yüzde 15 yoğunluk:

yalnızca yüksek öncelikli varlıklar,
yalnızca büyük durum değişimleri,
yalnızca çocuğun yakın bağ kurduğu NPC’ler

demektir.

5. Relevance Bubble — İlgililik balonu

Bütün dünya hiçbir zaman aynı anda simüle edilmemelidir.

Çocuğun mevcut macerasının çevresinde bir Relevance Bubble oluşturulur.

Bu balona şu varlıklar girer:

Oyuncu karakterleri,
Yanlarında bulunan NPC’ler,
Bulundukları bölge,
Aktif görevlerdeki karakterler,
Yakın zamanda etkileşime girilen önemli NPC’ler,
Aktif tehlikeler,
Çocuğun verdiği karardan doğrudan etkilenen varlıklar,
Duygusal bağı yüksek karakterler,
Çocuğun özellikle takip etmeyi seçtiği şeyler.

Balonun dışında kalan dünya yalnızca makro düzeyde yaşar.

Örnek:

Çocuk Orman Köyü’ndeyse:

Yüksek çözünürlük:
- Köy
- Yaralı tilki
- Kayıp değirmenci
- Yaklaşan fırtına

Düşük çözünürlük:
- Kuzey limanı
- Uzak çöl kabilesi
- Dağ ejderhası

Dondurulmuş:
- Henüz keşfedilmemiş bölgeler
- Hikâyeye hiç bağlanmamış NPC’ler

Bu yapı hem maliyeti düşürür hem de anlatısal kontrol sağlar.

6. Temporal Relevance Score

Her varlık için zaman ilerletme önceliği hesaplanabilir:

Temporal Relevance =
proximity
+ narrative_link
+ emotional_link
+ active_need
+ unresolved_dependency
+ player_attention
+ danger_pressure
- distance_penalty
- dormancy_penalty

Örnek puanlar:

Yaralı tilki           → 0.92
Köydeki fırıncı        → 0.36
Uzak şehirdeki kral    → 0.12
Bilinmeyen mağara ruhu → 0.00

Yalnızca eşik üzerindeki varlıklar simülasyona alınır.

0.75–1.00 → ayrıntılı
0.40–0.74 → özet
0.15–0.39 → makro kontrol
0.00–0.14 → dondur
7. Güvenli arka plan yaşamı

Arka plan yaşamı, oyuncunun iradesini çalmamalıdır.

Bu nedenle olaylar üç sınıfa ayrılmalıdır.

7.1 Kendiliğinden tamamlanabilir olaylar

Çocuk olmadan sonuçlanabilir:

Ekmek pişmesi,
Yağmurun dinmesi,
Küçük bir yaranın iyileşmesi,
Bir mektubun teslim edilmesi,
Hayvanın yuvasına dönmesi.
7.2 İlerleyebilir ama tamamlanamaz olaylar

Arka planda gelişebilir fakat son kararı çocuk vermelidir:

Köylüler köprüyü onarmaya başlar ama açılış yapılmaz.
Kayıp karakterin izleri bulunur ama karakter kurtarılmaz.
Festival hazırlıkları tamamlanır ama festival başlamaz.
Bir yumurta çatlamaya yaklaşır ama çocuk yokken açılmaz.

Bunlar:

ready_for_player_resolution

durumuna geçer.

7.3 Oyuncu olmadan ilerleyemeyen olaylar

Tamamen dondurulur:

Ahlaki seçimler,
Ana hikâye çatışmaları,
Yeni bölge keşfi,
Önemli karaktere güvenip güvenmeme,
Nadir eşya kullanımı,
Kalıcı dostluk veya düşmanlık kararı,
Büyük tehlikeyle yüzleşme.

Bu olaylar için:

requires_player_presence = true

olmalıdır.

8. Geri döndürülemez değişiklik koruması

Arka plan motoru şu sonuçları tek başına üretmemelidir:

Önemli NPC ölümü,
Oyuncu karakterinin ağır yaralanması,
Ana bölgenin yok olması,
Kritik eşyanın kaybolması,
Görevin başarısız olması,
Dostluğun tamamen sona ermesi,
Yeni ana düşman yaratılması,
Çocuğun yerine önemli seçim yapılması.

Bunlar yalnızca şu koşullardan biri varsa uygulanabilir:

Çocuk daha önce açıkça bu süreci başlatmıştır.
Sonuç açıkça tahmin edilebilir ve geri döndürülebilirdir.
Ebeveyn ayarlarında arka plan sonuçlarına izin verilmiştir.
Sistem sonucu kesinleştirmek yerine yalnızca yaklaşan durum olarak tutmaktadır.

Örneğin:

Yanlış:
Çocuk dönene kadar köy fırtınada tamamen yıkıldı.

Doğru:
Fırtına köye yaklaştı. Köylüler hazırlık yaptı ve çocuğun yardımını bekliyor.
9. Background Intent sistemi

NPC’lerin arka planda rastgele hareket etmesi yerine niyetleri olmalıdır.

interface BackgroundIntent {
  actorId: string;
  goal: string;
  urgency: number;
  persistence: number;
  allowedWithoutPlayer: boolean;
  maxProgressWithoutPlayer: number;
  dependencies: string[];
}

Örnek:

{
  "actorId": "npc_fox_01",
  "goal": "güvenli bir yerde iyileşmek",
  "urgency": 0.8,
  "persistence": 0.7,
  "allowedWithoutPlayer": true,
  "maxProgressWithoutPlayer": 0.6,
  "dependencies": ["shelter", "food", "wound_not_critical"]
}

Bu sayede tilki “rastgele” kaybolmaz. Mevcut durumuna, ihtiyacına ve çevreye göre ilerler.

10. Dünya nabızları

Her varlığı sürekli hesaplamak yerine farklı frekansta çalışan World Pulse katmanları kullanabiliriz.

Immediate Pulse
Local Pulse
Regional Pulse
World Pulse
Seasonal Pulse
Immediate Pulse

Sahne içi veya çok kısa süreli olaylar:

Ateşin sönmesi,
Kapının kapanması,
Bir NPC’nin beklemesi.
Local Pulse

Yakın bölgedeki yaşam:

Köy halkının rutinleri,
Hayvanların hareketleri,
Küçük hava değişimleri.
Regional Pulse

Bölgesel gelişmeler:

Ticaret yolunun açılması,
Fırtına cephesinin ilerlemesi,
Göç eden hayvan sürüsü.
World Pulse

Çok büyük ama nadir olaylar:

Ay döngüsü,
Krallıklar arası haberler,
Büyük doğa olayları.
Seasonal Pulse

Uzun vadeli değişimler:

Mevsim geçişleri,
Bitki örtüsü,
Göç,
Festival takvimi.

Her pulse yalnızca kendi kapsamındaki varlıkları uyandırır.

11. Catch-up Simulation Pipeline

Çocuk uygulamaya geri döndüğünde şu işlem zinciri çalışır:

1. Son güvenli dünya snapshot’ını yükle
2. Gerçek geçen süreyi hesapla
3. Sahnenin zaman ilerlemeye uygun olup olmadığını kontrol et
4. Simülasyon katmanını belirle
5. Relevance Bubble oluştur
6. Yüksek öncelikli varlıkları seç
7. Background Intent’leri değerlendir
8. Güvenli ilerleme kurallarını uygula
9. Geri döndürülemez sonuçları bloke et
10. Çelişki kontrolü yap
11. Yeni dünya snapshot’ı oluştur
12. Çocuğa gösterilecek dönüş özetini üret

Pseudo-code:

function progressWorld(
  snapshot: WorldSnapshot,
  now: Date
): ProgressionResult {
  const elapsed = calculateElapsed(snapshot.savedAt, now);

  if (!snapshot.scene.temporallySafe) {
    return freezeWorld(snapshot, elapsed);
  }

  const tier = resolveProgressionTier(elapsed);
  const relevantEntities = buildRelevanceBubble(snapshot, tier);

  const proposals = simulateRelevantEntities(
    relevantEntities,
    elapsed,
    tier
  );

  const safeProposals = applyNarrativeSafety(proposals);
  const resolvedChanges = resolveConflicts(safeProposals);

  return commitProgression(snapshot, resolvedChanges);
}
12. Dönüş özeti

Çocuk geri döndüğünde sistem teknik bir değişiklik listesi göstermemelidir.

Yanlış:

Fox health +12
Village readiness +0.2
Weather state changed

Doğru:

Sen uzaktayken Orman Köyü oldukça sakindi. Köylüler yaklaşan yağmur için çatıları güçlendirdi. Kurtardığın küçük tilki dinlendi ve artık biraz daha rahat yürüyebiliyor. Değirmencinin kayıp çantasına ait yeni bir iz bulundu ama kimse sen gelmeden ormana girmek istemedi.

Özet üç katmanlı olabilir:

Hatırlatma:
En son ne olmuştu?

Sen yokken:
Hangi güvenli değişiklikler yaşandı?

Şimdi:
Hangi olaylar çocuğun kararını bekliyor?

Uzun ara verilmişse motor özellikle daha açıklayıcı davranmalıdır:

Uzun zamandır bu dünyaya gelmemiştin. Merak etme, büyük olaylar seni bekledi ve önemli hiçbir karar sensiz verilmedi.

Bu cümle sistemin tasarım ilkesini çocuğa doğal biçimde hissettirir.

13. Önerilen temel veri modeli
interface WorldTimeState {
  realLastActiveAt: string;
  worldTimestamp: string;
  elapsedRealSeconds: number;
  elapsedWorldUnits: number;
  progressionTier:
    | "detailed"
    | "sampled"
    | "macro"
    | "minimal"
    | "frozen";
  simulationSuspended: boolean;
}

interface SimulatableEntity {
  id: string;
  type: string;
  temporalProfile: TemporalProfile;
  currentState: Record<string, unknown>;
  backgroundIntents: BackgroundIntent[];
  relevanceVector: number[];
  lastSimulatedAt: string;
}

interface ProgressionProposal {
  entityId: string;
  stateChanges: Record<string, unknown>;
  narrativeImportance: number;
  reversibility: number;
  playerAgencyRisk: number;
  confidence: number;
  explanation: string;
}

interface WorldProgressionReport {
  elapsedTime: WorldTimeState;
  appliedChanges: ProgressionProposal[];
  blockedChanges: ProgressionProposal[];
  waitingEvents: string[];
  returnSummary: string;
}
14. Ana tasarım kararı

Bu motor için temel ilkemiz şu olmalıdır:

Dünya çocuk yokken nefes alır; fakat çocuğun hikâyesini onun yerine yaşamaz.

Dolayısıyla sistem:

küçük olayları tamamlar,
doğal süreçleri ilerletir,
önemli olayları hazırlar,
büyük kararları bekletir,
uzun ayrılıklarda dünyayı koruyucu biçimde dondurur.