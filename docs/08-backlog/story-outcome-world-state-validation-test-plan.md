# Story Outcome and World State Validation Test Plan

**Project or Release:** Project LUMI — Future Story Outcome Commit Integration  
**Owner:** Project LUMI  
**Version:** 1.0.0  
**Status:** Backlog Test Plan  
**Last Updated:** 2026-07-26

## Objectives

Story Outcome & World State Commit System etkinleştirildiğinde hikâyede
gerçekleşen olayların PostgreSQL tabanlı canonical world state'e doğru, güvenli,
deterministik ve yalnızca bir kez işlendiğini kanıtlamak.

Testler yalnızca API yanıtını değil; hikâye öncesi ve sonrası snapshot'ları,
üretilen event'leri, transaction sonucunu ve kullanıcıya gösterilen hikâyeyle
veritabanı arasındaki uyumu birlikte doğrular.

## Authoritative Rule

Hikâye metni ve LLM veritabanını doğrudan güncelleyemez. Story Engine:

1. kullanıcıya gösterilecek hikâyeyi;
2. yapılandırılmış ve kanıt içeren outcome manifest'i

üretir. Ayrı Commit System; manifest'i doğrular, kuralları uygular, conflict
çözer ve kabul edilen değişiklikleri tek transaction içinde yazar.

## Scope

### In Scope

- story context ve pre-story snapshot;
- outcome manifest şeması;
- `evidenceSceneId` ve story evidence doğrulaması;
- World State Diff;
- NPC state, memory ve relationship değişikliklerinin ayrılması;
- inventory transaction ve sahiplik geçmişi;
- quest ve world event güncellemeleri;
- doğrudan ve dolaylı effect propagation;
- state version ve optimistic conflict kontrolü;
- transactional commit;
- idempotency ve duplicate apply;
- rollback ve compensation;
- audit log, outbox ve trace kayıtları;
- hikâye, manifest, event ve DB state tutarlılığı.

### Out of Scope

- LLM metin kalitesinin genel değerlendirmesi;
- görüntü ve TTS üretim kalitesi;
- World Simulation'ın on günlük offline ilerleme algoritması;
- NPC Emergent Interaction Engine davranışları;
- sistem backlog'dan çıkarılmadan production implementasyonu.

## Test Types

- Unit: validator, rule, diff ve conflict fonksiyonları.
- Integration: PostgreSQL transaction, constraint, outbox ve repository akışı.
- End-to-End: gerçek story session'dan post-story state'e tam akış.
- Property-based: tekrar, sıra ve beklenmeyen manifest birleşimleri.
- Regression: daha önce kabul edilen story outcome örnekleri.
- Security: yetkisiz world/child/household erişimi ve cross-family izolasyonu.
- Failure injection: transaction ortasında hata, timeout ve outbox arızası.
- Manual narrative review: hikâye ile state değişiminin anlam uyumu.

## Environments

En az iki ortam kullanılır:

- CI PostgreSQL: izole veritabanı ve deterministik seed;
- staging: production'a yakın migration, queue/outbox ve observability
  yapılandırması.

In-memory veya mock repository tek başına çıkış kriterini karşılamaz.

## Test Data

Her senaryo aşağıdaki fixture'ları açıkça tanımlar:

- `worldId`, `worldStateVersion` ve world clock;
- `childProfileId` ve Family Space;
- story definition/version/session;
- katılımcı karakterler ve aktif Location;
- NPC state, emotion, goal ve condition değerleri;
- yönlü relationship vektörleri;
- inventory ve item ownership;
- aktif quest ve world event'ler;
- ilgili memory kayıtları;
- pre-story snapshot hash'i;
- beklenen outcome manifest ve izin verilen diff.

Gerçek çocuk verisi kullanılmaz. Fixture'lar sentetik ve yeniden üretilebilir
olmalıdır.

## Snapshot Comparison Contract

Her E2E senaryosu üç kanıt üretir:

1. **Before Snapshot:** Commit öncesindeki canonical durum.
2. **Commit Evidence:** Manifest, validator sonucu, rule decisions, generated
   events, transaction ve audit kayıtları.
3. **After Snapshot:** Commit sonrasındaki canonical durum.

Karşılaştırma en az şu alanları kapsar:

| Alan | Zorunlu doğrulama |
| --- | --- |
| World | version yalnızca başarılı committe artar |
| NPC state | yalnızca kanıtlanan condition/state alanları değişir |
| NPC memory | doğru subject, source event ve importance ile eklenir |
| Relationship | doğru yön ve boyut kontrollü delta ile değişir |
| Inventory | ownership, quantity ve history atomik kalır |
| Quest | yalnızca kanıtlanan hedef veya durum ilerler |
| World event | geçerli lifecycle transition uygulanır |
| Indirect effects | ayrı, izlenebilir ve kontrollü event/queue kaydı oluşur |
| Audit/outbox | commit kimliği ve correlation zinciri korunur |
| Unrelated state | değişmeden kalır |

Snapshot karşılaştırması yalnızca genel JSON eşitliği değildir. İzin verilen
alanlar için beklenen delta; diğer tüm alanlar için değişmezlik kontrolü yapılır.

## Entry Criteria

- Outcome Manifest şeması sürümlenmiş olmalı.
- World State ve Story Session version kuralları kesinleşmiş olmalı.
- Validator, Rule Engine, Conflict Resolver ve transaction sınırı tanımlanmış
  olmalı.
- Test fixture factory ve snapshot serializer hazır olmalı.
- PostgreSQL migration'ları izole ortamda uygulanabilmeli.
- Audit ve outbox kayıtları testten okunabilir olmalı.
- Sistem insan onayıyla backlog'dan aktif specification'a alınmış olmalı.

## Exit Criteria

- P0 ve P1 testlerinin tamamı geçer.
- Duplicate apply hiçbir state'i ikinci kez değiştirmez.
- Hata enjeksiyonunda kısmi commit oluşmaz.
- Stale version sessizce ezilmez.
- Kanıtsız manifest değişikliği reddedilir.
- Cross-family veya yanlış child/world erişimi engellenir.
- After Snapshot hikâye, manifest ve domain kurallarıyla uyumludur.
- İlgisiz state alanlarında beklenmeyen değişiklik yoktur.
- Audit/outbox kayıtları her kabul veya ret sonucunu açıklayabilir.
- Gerçek senaryo sonuçları ürün sahibi tarafından incelenir ve onaylanır.

## Test Cases

| ID | Scenario | Type | Priority | Expected Result |
| --- | --- | --- | --- | --- |
| SOWS-001 | Yaralı tilkiye yardım | E2E | P0 | NPC condition kontrollü değişir; yardım hafızası ve yönlü ilişki deltası oluşur |
| SOWS-002 | Dedenin eski haritayı vermesi | E2E | P0 | Eşya tek transaction ile sahip değiştirir; item history ve story evidence korunur |
| SOWS-003 | Köprünün onarılması | E2E | P0 | Location/world event geçerli transition yapar; ilgili quest güncellenir |
| SOWS-004 | Yardım teklifinin reddedilmesi | E2E | P1 | Hikâyede olmayan başarı, ödül veya ilişki artışı yazılmaz |
| SOWS-005 | Doğrudan ve dolaylı etkiler | Integration | P0 | Doğrudan etkiler commit edilir; dolaylı etkiler ayrı izlenebilir kuyruğa alınır |
| SOWS-006 | Aynı manifestin ikinci kez uygulanması | Integration | P0 | İkinci çağrı idempotent sonuç döndürür; version ve state tekrar değişmez |
| SOWS-007 | Eski world-state version | Integration | P0 | Commit durur; conflict sonucu üretir; güncel state ezilmez |
| SOWS-008 | Transaction ortasında hata | Failure injection | P0 | NPC, inventory, quest ve event değişikliklerinin tamamı rollback olur |
| SOWS-009 | Kanıtsız outcome | Unit/Integration | P0 | Geçersiz veya bulunmayan `evidenceSceneId` nedeniyle manifest reddedilir |
| SOWS-010 | Hikâye-manifest çelişkisi | E2E/Manual | P0 | Hikâyede gerçekleşmeyen değişiklik DB'ye yazılmaz ve finding kaydedilir |
| SOWS-011 | Yanlış eşya sahipliği | Integration | P0 | Sahip olunmayan veya devredilemeyen eşya transferi reddedilir |
| SOWS-012 | NPC state/memory/relationship ayrımı | Integration | P0 | Her değişiklik doğru aggregate ve event türüne yazılır |
| SOWS-013 | Cross-family erişim denemesi | Security | P0 | Yetkisiz world/child/household commit'i reddedilir ve audit edilir |
| SOWS-014 | Outbox yayın hatası | Failure injection | P1 | Canonical commit ile outbox atomik kalır; event kaybolmaz veya çift yayınlanmaz |
| SOWS-015 | Dolaylı etkinin tekrar işlenmesi | Integration | P1 | Aynı propagation effect yalnızca bir kez uygulanır |
| SOWS-016 | İlgisiz NPC ve bölgeler | Regression | P1 | Outcome kapsamı dışındaki entity snapshot'ları değişmez |
| SOWS-017 | Aynı senaryonun deterministik tekrarı | Regression | P1 | Aynı başlangıç state'i ve manifest aynı izinli diff'i üretir |
| SOWS-018 | Rollback sonrası yeniden deneme | Integration | P1 | Temiz başlangıçtan tek başarılı commit oluşur; eski kısmi iz kalmaz |

## Detailed Scenario: Injured Fox

### Given

- Tilki son görüldüğünde `injured` condition taşır.
- Çocuk ve tilki aynı erişilebilir Location içindedir.
- Pre-story snapshot NPC condition, relationship ve memory değerlerini içerir.
- Story scene çocuğun tilkiye gerçekten yardım ettiğini gösterir.

### When

- Story Engine `evidenceSceneId` içeren yardım outcome'u üretir.
- Commit System manifest'i doğrular ve transaction'ı uygular.

### Then

- tilkinin condition değeri izin verilen delta ile `recovering` olur;
- yardım olayı immutable event olarak kaydedilir;
- tilkinin çocuğa yönelik memory kaydı oluşur;
- güven/şükran gibi yalnızca tanımlı relationship boyutları küçük delta alır;
- ilgisiz trait, inventory, NPC ve region state'i değişmez;
- world-state version tam bir artar;
- audit ve outbox aynı commit kimliğini taşır.

## Detailed Scenario: Meaningful Item Transfer

### Given

- Eski harita dedenin inventory'sindedir ve `transferable` işaretlidir.
- Harita geçmiş bir olaya ve aile hafızasına bağlıdır.
- Çocuğun inventory kapasitesi uygundur.

### When

- Hikâyede dede haritayı çocuğa verir.
- Manifest item, kaynak, hedef ve `evidenceSceneId` içerir.

### Then

- harita aynı anda iki inventory'de görünmez;
- ownership history append-only olarak güncellenir;
- kaynak ve hedef inventory değişiklikleri atomiktir;
- gerekli relationship/memory etkileri ayrı kurallarla hesaplanır;
- aynı manifest yeniden gönderildiğinde ikinci harita veya ikinci ilişki deltası
  oluşmaz.

## Detailed Scenario: Conflict and Rollback

### Given

- Hikâye `worldStateVersion = 42` snapshot'ı ile başlamıştır.
- Committen önce başka geçerli işlem state'i `43` yapmıştır.

### When

- Version `42` tabanlı outcome uygulanmaya çalışılır.

### Then

- stale commit canonical state'i ezmez;
- Conflict Resolver çelişen entity ve alanları raporlar;
- güvenli otomatik çözüm yoksa insan/yeniden değerlendirme akışı gerekir;
- hiçbir kısmi NPC, inventory, memory veya quest güncellemesi kalmaz;
- ret sonucu audit edilir.

## Required Assertions

Her otomatik test mümkün olduğunda aşağıdakileri doğrular:

- manifest schema ve version;
- story/session/world kimlik eşleşmesi;
- `evidenceSceneId` varlığı ve anlam uyumu;
- expected domain event listesi;
- before/after state version;
- izin verilen field-level diff;
- ilgisiz alanların değişmezliği;
- transaction atomicity;
- idempotency key;
- audit correlation ID;
- outbox event kimlikleri;
- queue edilen dolaylı etkiler;
- ret veya conflict reason code.

## Risks

- LLM metni ile manifest arasında anlam farkı;
- aşırı geniş outcome'un ilgisiz state'i değiştirmesi;
- aynı event'in retry sırasında iki kez uygulanması;
- dolaylı etkilerin kontrolsüz yayılması;
- stale snapshot'ın yeni değişiklikleri ezmesi;
- mock testlerin PostgreSQL constraint ve transaction hatalarını gizlemesi;
- snapshot'ların kişisel veri sızdırması.

## Defect Process

- P0: veri kaybı, cross-family erişim, duplicate commit veya kısmi transaction;
  release blocker.
- P1: yanlış NPC/relationship/inventory/world sonucu; etkinleştirme blocker.
- P2: audit, raporlama veya kullanıcı özeti uyumsuzluğu; düzeltme ve regression
  testi zorunlu.

Her defect; story fixture, before snapshot hash, manifest, validator findings,
transaction/audit kimliği ve minimal after diff ile raporlanır.

## Reporting

Test raporu en az şunları içerir:

- senaryo ve seed sürümü;
- geçen/kalan/bloke test sayıları;
- before/after snapshot diff özeti;
- kabul edilen, reddedilen ve conflict olan manifestler;
- duplicate/rollback/failure injection sonuçları;
- açık P0/P1 kusurları;
- ürün sahibi gerçek senaryo onayı.

## References

- [Story Outcome & World State Commit System Backlog](LUMI_Backlog_Story_Outcome_Commit_System.md)
- [Story Outcome and World State Commit Engine](../03-domain-design/story/outcomes/Story%20Outcome%20%26%20World%20State%20Commit%20Engine.txt)
- [Story Outcome World State Commit reference package](../04-architecture/security/reference-packages/LUMI_Paket_16.3_Story_Outcome_World_State_Commit_System.md)
- [Story State Validation reference package](../04-architecture/security/reference-packages/LUMI_Paket_16.4_Story_State_Validation_Framework.md)
- [Story Event Propagation and Snapshot reference package](../04-architecture/security/reference-packages/LUMI_Paket_16.5_Story_Event_Propagation_Snapshot_Management.md)

