# Project LUMI — UI/UX Discovery Canonical Record

Status: CANONICAL DISCOVERY BASELINE
Date: 2026-08-09
Scope: UI/UX Discovery konuşmasının başlangıcından Relationships & Social Life bölümüne kadar alınan ürün, deneyim, living-universe ve doğrulama kararları.

## Source-of-truth rule

Bu belge ve aynı klasördeki ayrıntılı belgeler, sohbet notlarının yerine repository source of truth olarak kullanılacaktır. Discovery sırasında kabul edilen bir davranış ilgili canonical dokümana ve ULTEF matriksine eklenmeden tamamlanmış sayılmaz.

## Product identity

LUMI kurumsal dashboard, yönetim paneli, oyun arayüzü, chatbot veya statik e-kitap gibi görünmemelidir. Deneyim çocuğun ve ebeveynin yaşayan bir hikâye evrenine girdiği hissini vermelidir. UI teknik motorları görünmez kılar; simulation computes, narrative expresses.

Web ilk üretim yüzeyidir. Responsive web başlangıçtan itibaren desteklenir; mobil uygulama ürün kalitesi kanıtlandıktan sonra ayrı UX olarak değerlendirilecektir.

Görsel yön: 2D illustration + cartoon karışımı; zengin fakat sakin, çocuk dostu, premium hikâye dünyası. Her ekranda bağlama uygun illüstrasyon, arka plan, kart, buton ve mikro durumlar kullanılabilir. Medya maliyet ve kalite nedeniyle zorunlu değildir; her sayfada görsel, ses, hotspot vb. özellikler policy/config ile seçimlik olabilir. İlk öncelik hikâye kalitesidir.

## Canonical experience flow

1. Auth / landing
2. Parent home/dashboard
3. Child profile creation and personalization
4. Universe bootstrap/creation when absent
5. Character creation + origin + visual identity
6. Character home/current-life view
7. Living Saga and episodic stories
8. Progressive world/map discovery
9. Story Reader
10. Story/image feedback
11. Persistent memory, growth, world/NPC evolution, time/environment, item continuity and social-life continuity

## Auth experience

Login, register ve forgot-password aynı düz formun varyasyonları olmayacaktır. Her birinin kendi kompozisyonu, illüstrasyonu ve duygusal tonu bulunur. Landing/auth yüzeyi uygulamanın ne olduğunu ilgi çekici biçimde anlatır; SaaS olasılığı ileride değerlendirilebilir ancak mevcut UX aile/çocuk hikâye deneyimini önceler.

## Parent home

Ebeveyn girişinden sonra kendi ana sayfasına gelir. Daha önce oluşturduğu çocuk profilleri zengin görsel kartlarla gösterilir; yeni profil eklenebilir. Her kart bir çocuğu temsil eder. Evren yoksa kullanıcı burada doğal biçimde bilgilendirilir ve evren bootstrap başlatılabilir. 'Dünyalardan Haberler' benzeri alan, yaşayan evrenden ebeveyne anlamlı gelişmeleri sunabilir.

## Child personalization

İlgi alanları zorunlu/temel kişiselleştirme girdilerindendir ve hikâye üretimini etkiler. Ebeveyn ayrıca geliştirilmesini istediği sosyal/duygusal özellikleri tanımlayabilir (ör. sosyallik, paylaşma). Bunlar gizli pedagogik hedefler gibi davranmalı; hikâye didaktik egzersize veya puan oyununa dönüşmemelidir. İlgi alanları ve gelişim hedefleri sonradan profil ekranından değiştirilebilir.

## Character creation

Karakter türü/cinsi, temel özellikleri, yaşadığı yer, aile bağları ve geçmişine ilişkin seçimler bulunabilir; kullanıcı seçenek bombardımanına tutulmaz. Karakterin bugünkü haline gelmeden önce yaşamış olduğu geçmiş vardır ve origin/background story bunun doğal kaydıdır.

Karakter görseli seçimlerden sonra üretilebilir. Tercih edilen yaklaşım tek üretim kompozisyonunda aynı karakter için dört aday/görünüm üretip kullanıcıya seçim yaptırmaktır. Seçilen tasarım visual canon olur. Sonraki tüm görsellerde karakter benzerliği zorunludur; reference image/identity descriptor/seed veya sağlayıcının izin verdiği conditioning mekanizmaları kullanılır. Görsel model veya sağlayıcı değişse bile identity canon korunmalıdır.

## Character life view

'Karakter Odası' sabit bir oda değildir; karakterin hayatının ve mevcut durumunun yüzeyidir. Son hikâyede mağarada, ormanda veya başka bir yerde kaldıysa ekran bunu göstermelidir. Inventory, arkadaşlar/ilişkiler, geçmiş hikâyeler ve tekrar okuma ayrı doğal bölümler/tablar olabilir. Replay state mutation üretmez.

## Living Saga

Karakter oluşturulurken 10–12 kitap/bölüm potansiyeli taşıyan bir ana hedef/saga seed'i oluşabilir; fakat bütün hikâyeler baştan yazılmaz. Her bölüm mevcut world state, NPC davranışları, events, inventory, memories ve önceki sonuçlara göre zamanında üretilir. Model Stargate benzeri episodic adventure + persistent long arc yapısıdır: her hikâye kendi macerasını yaşayabilir, ana gizem/hedef arka planda ilerler. Hikâyede bulunan bir item ana Saga'yı etkileyebilir veya beklenmedik yeni bir seri/saga doğurabilir.

## Story Reader and narrative-first rule

LUMI oyun hissine dönüşmemelidir. Environment, inventory, vectors, relationships ve growth hesaplanır ancak kullanıcıya stat/bonus/quest UI olarak gösterilmez. Hazırlık ve seçimler anlatıya yedirilir. Ses, hotspot ve sayfa görselleri seçimliktir. Hikâye kalitesi, continuity ve doğal anlatı tüm medya özelliklerinden önce gelir.

## Feedback intelligence

Her üretilen hikâye ve görsel kullanıcı tarafından puanlanabilir; isteğe bağlı sebep/yorum alınabilir. Feedback yalnız analitik değildir: kontrollü bir preference-learning katmanına dönüşebilir. 'Çok çocuksu', 'çok basit bağlantılar', görsel stil beğenisi vb. sinyaller gelecekteki generation policy/prompt context'i etkileyebilir. Tek rating aşırı drift yaratamaz; child safety, canon ve kalite kuralları feedback tarafından override edilemez.

## Environment as narrative system

Her yer (mağara, orman, dağ vb.) kendi state/capability sistemine sahiptir. Örneğin dağa gitmeden halat alınması veya alınmaması hikâyeyi farklılaştırır. Etki tek sayı yerine vektörel olabilir. Item başarı garantisi değildir; possibility/capability açar. Aynı problem birden fazla doğal çözüm taşıyabilir. Sonuçlar oyun bonusu olarak değil hikâyede hissedilir.

## Memory

Tüm hikâye prompt'a taşınmaz. Hikâye sonunda anlamlı Memory Events çıkarılır. Hafıza episodic, semantic ve working/active/deep katmanlarına ayrılabilir. Memory importance tek sayı değil emotional salience, identity impact, relationship impact, saga relevance, novelty, recency, repetition, unresolvedness ve retrieval strength gibi boyutlar taşıyabilir. Core memories düşük/sıfır decay ile korunur; sıradan anılar zayıflar/arsivlenir; yeniden hatırlanan anı pekişebilir.

Aynı olay farklı aktörlerce farklı hatırlanabilir. Event, interpretation ve effects ayrılır. World truth, character knowledge, NPC knowledge ve memory aynı şey değildir. Character yaşamadığı/bilmediği canonical fact'i hatırlayamaz. Episodic memories zamanla semantic knowledge'a özetlenebilir ve source linkage korunur. Memory retrieval relevance + importance + knowledge authorization ile yapılır ve context token budget ile sınırlandırılır.

## Character growth

Growth doğrudan story generator'ın trait değiştirmesi değildir. Story -> memory/evidence -> repeated pattern -> gradual growth zinciri kullanılır. Tek olay karakteri aniden dönüştürmez. Gelişim ebeveyn hedefleriyle yönlenebilir ancak çocukta görev/puan hissi oluşturmaz. Growth state narrative context'i etkiler; görünür UI'da stat ekranına dönüşmez.

## NPC and world long-term evolution

Dünya çocuğu bekleyen dekor değildir; çocuk yokken de kontrollü biçimde yaşar. NPC kimliği yavaş, hayat durumu orta, anlık state hızlı değişebilir. NPC hedefleri çocuk yardım etmese bile makul ölçüde ilerleyebilir. NPC-NPC ilişkileri ve background events mümkündür. Simulation relevance/influence çözünürlüğü kullanır: yakın/önemli aktörler detaylı, uzak/alakasız aktörler düşük çözünürlükte veya hiç simüle edilmez.

Offline progression çocuğu cezalandırmaz. Kısa yokluk normal, orta yokluk attenuated, uzun yokluk narrative-safe/freeze davranışı kullanır. Child-presence-required kritik Saga finalleri veya geri dönülmez büyük olaylar çocuk yokken tamamlanmaz.

## Relationships & social life

Relationship tek friend/enemy puanı değildir; trust, affection, respect, comfort, resentment, dependence, shared history gibi çok boyutlu internal state taşıyabilir. Bu değerler child UI veya story içinde sayısal stat olarak görünmez. Çocuk ilişkiyi NPC'nin davranışından, hatırladığı ortak olaylardan, yakınlık/mesafe değişimlerinden ve doğal diyalogdan hisseder.

Relationship değişikliği doğrudan Story Generator tarafından yazılmaz. Canonical zincir Story -> Outcome -> actor-specific/shared Memory -> Relationship Evidence -> küçük ve kontrollü state değişimidir. Aynı olay child ile NPC tarafından farklı yorumlanabilir; child intention NPC interpretation ile eşit kabul edilmez. Yanlış anlaşılma, kırgınlık, rekabet veya hayal kırıklığı yaşa uygun biçimde mümkün olmalıdır; ilişki her zaman monoton pozitif progression izlemez.

NPC-NPC ilişkileri child dışında da yaşayabilir. Family actors daha zengin başlangıç shared-history/memory/routine context'i taşır. Promise, gift ve shared memories relationship evidence üretir fakat quest/reward puanına dönüşmez. 'Hayatımdakiler' gibi UI yüzeyleri social graph'ı CRM/stat ekranına çevirmeden kişiler, ortak geçmiş, son bilinen durum ve doğal bağlar üzerinden gösterir. Relationship state future NPC arc, story hook veya Saga seed üretebilir fakat child agency'yi zorlamaz.

## Time

Real Time, World Time ve Story Time ayrıdır. Hikâyede geçen süre world clock'u ilerletebilir. Time of day, season ve world events effective environment state'i etkiler. NPC rutinleri script değil tendency'dir. Yaklaşık 10 günlük eski karar hard cutoff yerine attenuation curve olarak yorumlanır: ilk günler daha yüksek progression, sonra azalan çözünürlük, uzun yoklukta yalnız güvenli continuity.

Memory decay yalnız real-time'a bağlanmaz; world experience, araya giren memories ve importance daha önemlidir. Temporal causality zorunludur: sonuç nedeninden önce gerçekleşemez. FOMO/deadline tasarımı çocuk deneyimini cezalandırmaz.

## Weather and ecology

Weather canonical world state'tir; Story Generator dramatik ihtiyaç için rastgele hava uydurmaz. Weather -> Environment State -> Possibilities -> Narrative zinciri kullanılır. Kötü hava yalnız ceza değil opportunity de üretir. Ecology çoğunlukla aggregate state'tir; narrative significance kazanan background wildlife persistent entity'ye terfi edebilir. Environment mutation yalnız authoritative world/outcome commit sınırından geçer. Doğal değişimler kalıcı olabilir ama recovery de mümkündür.

## Progressive world generation

Dünya ilk gün tamamen üretilmez; çocuk keşfettikçe canon derinleşir ve genişler. Knowledge states: UNKNOWN, RUMORED, REVEALED, DISCOVERED. UI fog/unknown alanları gizler; rumor bölgeleri soru işareti/işaret gibi belirsiz gösterilebilir.

Map image source of truth değildir. Önce topology/canonical structure, sonra visual rendering gelir. Yeni chunk mevcut sınırlarla Boundary Contract üzerinden uyumlu olmak zorundadır: river, coast, mountain/elevation, road, biome continuity korunur. Expansion narrative reason ile tetiklenir (harita, rumor, Saga, exploration, world event). Eski harita yanlış/outdated olabilir; map knowledge world truth'tan ayrılır. Saga gelecekte gerekli alanlar için narrative reservation bırakabilir.

Expansion horizontal (yeni bölge) ve vertical (mevcut location'ın yeni ayrıntılar kazanması) olabilir. Visual canon biome/style/reference/neighbor context ile korunur. Generation transaction: generate -> validate -> canon/topology/reservation/knowledge checks -> commit. Validation başarısızsa yarım dünya canon'a girmez.

## Item & object life cycle

Item inventory slot değil, dünyanın kimliği ve geçmişi olan objesidir. Identity, origin, current owner, current location, condition, capabilities, known/hidden properties, history, relationships ve narrative significance taşıyabilir. Ownership ile location ayrıdır; evde bırakılan item hikâyede eldeymiş gibi kullanılamaz.

Problem->required item yerine Situation->capability possibilities kullanılır. Item condition/repair/transformation lineage'i korur. Item truth ile character belief/knowledge ayrıdır. Emotional significance capability olmadan da yüksek olabilir. Gift gerçek ownership transferidir; NPC aylar sonra item'ı ve ilişkili memory'yi hatırlayabilir. Protected Saga/core items random simulation ile yok edilemez. Sıradan görünen item sonradan canonical bağlantılarla Saga seed olabilir.

## Explicit backlog retained

- What-if mode: ilginç bulundu; ayrı backlog konusu, mevcut canonical flow'a dahil edilmedi.
- Native mobile: web kalite/doğrulama sonrası ayrı UX çalışması.
- SaaS commercialization: gelecekte ayrıca değerlendirme.

## Documentation discipline

Bundan sonraki her discovery bölümü için:

Design decision -> domain behavior -> invariants -> failure modes -> ULTEF scenarios -> implementation mapping

zinciri repository içinde tutulacaktır. Ayrıntılı ULTEF matriksi `ultef-living-universe-verification-matrix.md` belgesindedir.
