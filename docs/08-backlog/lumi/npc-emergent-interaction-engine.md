# NPC Emergent Interaction Engine

**Version:** 1.0.0  
**Status:** Backlog  
**Last Updated:** 2026-07-26  
**Owner:** Project LUMI

## Purpose

NPC'lerin yalnızca çocuk kendileriyle konuştuğunda tepki veren veya statik
rutinleri tekrarlayan karakterler olmamasını sağlamak. Sistem, NPC hedefleri ve
dünya durumundan güvenli, anlamlı ve kendiliğinden etkileşim fırsatları
üretecektir.

Bu belge bir uygulama talimatı değildir. İnsan onayıyla aktif bir
specification'a ve sprint kapsamına dönüştürülene kadar backlog statüsündedir.

## Product Intent

Çocuğun dedesi, komşusu, esnafı, arkadaşı veya başka bir NPC:

- duyduğu bir söylentiyi paylaşabilir;
- anlamlı veya yararlı bir eşya verebilir;
- yaklaşan güvenli bir sorun hakkında uyarabilir;
- bir yere davet edebilir;
- küçük bir yardım isteyebilir;
- devam eden kişisel projesini gösterebilir;
- dünya olayından doğal bir hikâye tohumu oluşturabilir.

Bu davranışlar rastgele içerik üretimi değildir. Her fırsat mevcut world state,
NPC bilgisi, kişilik vektörü, hedef, ilişki, yakınlık ve zaman bağlamıyla
kanıtlanmalıdır.

## Candidate Interaction Types

| Tür | Amaç | Örnek |
| --- | --- | --- |
| `rumor` | Kısmen doğrulanmış bilgi paylaşmak | Esnafın uzak yoldan gelen haberi aktarması |
| `gift` | İlişki ve bağlama uygun eşya vermek | Dedenin eski bir harita vermesi |
| `warning` | Güvenli ve yaşa uygun uyarı oluşturmak | Köprüdeki hasarın bildirilmesi |
| `invitation` | Sosyal veya keşif fırsatı sunmak | Komşunun festivale davet etmesi |
| `quest_seed` | Zorunlu olmayan hikâye tohumu üretmek | Kayıp bir mektubun sahibini aramak |
| `social_visit` | Gündelik bağı güçlendirmek | Bir arkadaşın ziyarete gelmesi |
| `information_share` | NPC'ler arası bilginin aktarılması | Bir gezginin haberinin köye yayılması |

## Required Inputs

- NPC'nin aktif hedefleri ve ihtiyaçları;
- kişilik ve influence vektörleri;
- yönlü ilişki boyutları;
- fiziksel ve sosyal yakınlık;
- NPC'nin gerçekten bildiği bilgiler;
- paylaşılabilir eşya sahipliği;
- çözülmemiş veya yaklaşan dünya olayları;
- household ve gündelik yaşam bağlamı;
- son etkileşimler ve cooldown kayıtları;
- novelty skoru;
- zaman hassasiyeti ve expiry sınırı;
- çocuk yaşı, güvenlik politikaları ve ebeveyn tercihleri.

NPC bilmediği bir olayı aktaramaz, sahip olmadığı bir eşyayı veremez ve
erişemediği bir karakterle fiziksel etkileşim kuramaz.

## Candidate Flow

1. Uygun ve ilgili NPC'leri seç.
2. Hedef, ihtiyaç, bilgi ve dünya olaylarından intent adayları üret.
3. İlişki, rol ve yakınlığa göre hedef karakteri belirle.
4. Kaynak, hedef ve NPC çifti cooldown kontrollerini uygula.
5. Novelty ve tekrar kontrolü yap.
6. Bilgi erişimi ve söylenti güvenilirliğini doğrula.
7. Çocuk güvenliği ve ebeveyn politikalarını uygula.
8. Süreli bir interaction opportunity oluştur.
9. Gerekliyse bilgiyi sınırlı biçimde NPC'ler arasında yay.
10. Uygun fırsatı World News veya interaction inbox'a teslim et.
11. Yalnızca çocuk kabul ederse story hook'a dönüştür.

## Scoring Dimensions

Tek bir rastgele sayı yerine çok boyutlu değerlendirme kullanılır:

- relationship relevance;
- spatial proximity;
- goal alignment;
- information confidence;
- urgency;
- emotional appropriateness;
- novelty;
- expected child value;
- world consequence;
- repetition penalty;
- safety risk.

Skorlama deterministik girdiler ve izlenebilir kurallar kullanmalıdır. LLM aday
ifade önerebilir; uygunluk ve teslim kararı kural motoruna aittir.

## Rumor Propagation

Söylentiler immutable gerçeğin yerine geçmez. Her rumor:

- kaynak NPC'yi;
- bilginin dayandığı event'i veya ilk kaynağı;
- confidence/reliability değerini;
- aktarım zincirini;
- oluşma ve son kullanma zamanını;
- aktarım sırasında meydana gelen anlam kaymasını

taşır. Güvenilirlik zamanla ve her aktarımda azalabilir. Kritik bilgi yalnızca
söylentiye dayanarak world state'i değiştiremez.

## Gifts and Item Sharing

- NPC yalnızca sahip olduğu ve paylaşılabilir işaretlenmiş eşyayı verebilir.
- Devir, inventory transaction ve ownership history üretir.
- Aynı eşya iki karakterde birden görünemez.
- Hediye ilişkiyi etkileyebilir fakat otomatik olarak güven veya sevgi satın
  alamaz.
- Hikâye açısından kritik eşya ebeveyn veya safety policy gerektiriyorsa fırsat
  teslim edilmeden önce bloke edilir.

## Cooldown, Novelty and Expiry

Sistem aşağıdaki tekrar kontrollerini ayrı ayrı uygular:

- aynı kaynak NPC'nin etkileşim sıklığı;
- aynı hedefe gönderilen fırsat sıklığı;
- aynı NPC çiftinin tekrar sıklığı;
- aynı interaction type veya konu tekrarı;
- aynı story hook'un yeniden üretilmesi.

Süresi dolan fırsat sessizce aktif göreve dönüşmez. Expiry sonucu kapanır veya
world state hâlâ uygunsa yeniden değerlendirilir.

## Child Choice and Delivery

Interaction opportunity önce bir teklif olarak sunulur. Çocuk:

- kabul edebilir;
- reddedebilir;
- daha sonra bakmak üzere erteleyebilir;
- başka bir macera seçebilir.

Reddetme cezalandırılmaz. NPC, çocuğu suçlu hissettiren veya acil korku yaratan
ifadeler kullanamaz. Kritik olaylar arka planda sonuçlandırılmak yerine kullanıcı
katılımını bekler.

## Safety and Privacy

- Child Profile ve Family Space izolasyonu zorunludur.
- NPC sistem veya ebeveyn otoritesini taklit edemez.
- Gerçek kişisel veri NPC söylentisine veya world news'e dönüştürülemez.
- Tehdit, manipülasyon, duygusal şantaj ve uygunsuz hediye davranışı engellenir.
- Yaş, ebeveyn politikası ve mevcut duygusal bağlam her teslimde yeniden
  değerlendirilir.

## Observability

Her fırsat en az şu açıklanabilirliği sağlamalıdır:

- neden bu NPC seçildi;
- neden bu interaction type üretildi;
- hedef neden seçildi;
- hangi event, bilgi, ilişki ve eşyanın kullanıldığı;
- hangi cooldown, novelty ve safety kontrollerinin geçtiği;
- fırsatın neden teslim edildiği, engellendiği veya sona erdiği.

## Activation Criteria

Bu backlog maddesi ancak aşağıdakiler tamamlandığında aktif specification'a
dönüştürülebilir:

- World State, Event, Character, Relationship ve Inventory sözleşmeleri
  kesinleşmiş olmalı;
- NPC'nin bilgi erişim modeli uygulanmış olmalı;
- World Simulation ve Background Life güvenli şekilde çalışmalı;
- child safety ve parent policy kontrolleri kullanılabilir olmalı;
- interaction opportunity için persistence ve idempotency yaklaşımı
  belirlenmiş olmalı;
- ürün sahibi kapsamı ve sprinti açıkça onaylamalı.

## Required Validation When Activated

- ilişki ve yakınlığa göre hedef seçimi;
- sahip olunmayan eşyanın verilememesi;
- NPC'nin bilmediği söylentiyi aktaramaması;
- rumor confidence ve decay;
- source/target/pair cooldown;
- novelty ve duplicate engelleme;
- expiry;
- kabul, ret ve erteleme;
- child safety ve parent policy filtreleri;
- NPC-to-NPC aktarım zinciri;
- accepted opportunity'nin story hook'a tek kez dönüşmesi.

## Non-Goals

- Her NPC'yi her simulation tick içinde değerlendirmek;
- çocuğu sürekli bildirim ve görevle doldurmak;
- rastgele olay üretimini yaşayan dünya simülasyonu sanmak;
- LLM'nin world state veya inventory'yi doğrudan değiştirmesine izin vermek;
- bu backlog belgesini aktif sprint gereksinimi olarak yorumlamak.

## References

- [NPC Autonomy and Independent Life](../../03-domain-design/characters/013-NPC-Autonomy-and-Independent-Life.md)
- [Influence Vector System](../../03-domain-design/characters/015-Influence-Vector-System.md)
- [Home, Household and Daily Life System](../../03-domain-design/relationships/home-household-and-daily-life-system.md)
- [World Simulation Engine](../../03-domain-design/world/004-World-Simulation-Engine.md)
- [Story Seeds and Narrative Opportunities](../../03-domain-design/story/037-Story-Seeds-and-Narrative-Opportunities.md)
- [Archived implementation package](../../99-archive/implementation-packages/packages/LUMI-NPC-Emergent-Interaction-Engine-Package/README.md)

Arşiv paketi tarihsel ve teknik referanstır; bu backlog belgesinin statüsünü
değiştirmez ve tek başına uygulama otoritesi değildir.

