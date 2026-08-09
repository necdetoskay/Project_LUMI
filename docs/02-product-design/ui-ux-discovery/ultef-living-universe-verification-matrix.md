# ULTEF — LUMI Living Universe Verification Matrix

Status: CANONICAL TEST BACKLOG
Date: 2026-08-09

> Önceki kanonik test aileleri korunur. Bu güncelleme Rumors, Secrets, Mysteries & Information Flow doğrulama ailesini ekler.

## Information flow, rumors, secrets & mysteries family

- INFO-TRUTH-001: world truth, actor knowledge, belief, rumor ve secret state'leri birbirine collapse olmaz.
- INFO-PROVENANCE-001: öğrenilen bilgi source/type/confidence/provenance ile trace edilebilir.
- INFO-PROPAGATE-001: information yalnız gerçek observation/report/reveal/transfer olduğunda recipient knowledge'a geçer.
- INFO-NO-BROADCAST-001: private/limited information magical broadcast ile tüm NPC/child knowledge'a yayılmaz.
- INFO-RUMOR-DRIFT-001: rumor propagation sırasında distortion olabilir fakat canonical truth overwrite edilmez.
- INFO-RUMOR-SOURCE-001: rumor'un kimden/kimin aracılığıyla geldiği gerektiğinde trace edilebilir.
- INFO-SECRET-001: NPC secret reveal basit numeric trust threshold yerine relationship/context/promise/fear/uncertainty reasoning'ine bağlıdır.
- INFO-PROMISE-001: confidential promise memory ve sonraki disclosure decision'ında doğru aktör/context ile etkili olur.
- INFO-CONFLICT-001: conflicting claims evidence olmadan tek fact'e yanlış merge edilmez.
- INFO-MYSTERY-001: mystery answer ilgili clue/authorized reveal/discovery öncesinde child/NPC dialogue'a sızmaz.
- INFO-MYSTERY-CANON-001: emergent mystery resolution önceki canonical clues, topology, timeline ve world facts ile çelişmeden commit edilir.
- INFO-RED-HERRING-001: mistaken belief/observation kullanılabilir fakat false claim world truth'a terfi etmez; sistem deceptive noise spam üretmez.
- INFO-MAP-001: UNKNOWN/RUMORED/REVEALED/DISCOVERED map state gerçek character knowledge state ile eşleşir.
- INFO-MEMORY-001: eski mystery-critical clue gerektiğinde deep memory/archive üzerinden geri çağrılabilir.
- INFO-DECAY-001: düşük-importance rumor/claim retrieval priority kaybedebilir fakat protected critical clue yanlışlıkla kaybolmaz.
- INFO-SAFETY-SECRET-001: child safety açısından uygunsuz 'ebeveynden/trusted adult'tan sakla' secrecy scenario üretilemez veya commit edilemez.
- INFO-AUTHORIZED-TRUTH-001: backend/system truth yalnız authorized actors'a doğru zamanda context builder üzerinden açılır.
- INFO-TENANT-001: knowledge graph, rumor, secret, mystery truth ve provenance başka tenant/universe/child boundary'sine sızmaz.

## Cross-system information tests

- MEM-INFO-001: memory recall actor knowledge authorization'ını bypass etmez.
- NPC-INFO-001: NPC decisions/dialogue yalnız actor knowledge + beliefs + memories üzerinden yapılır; hidden system truth kullanılmaz.
- REL-SECRET-001: secret disclosure relationship evidence üretebilir fakat hard-coded friendship gate'e dönüşmez.
- MAP-INFO-001: rumor öğrenme/silme/doğrulama map fog/marker state'ine doğru yansır.
- ITEM-INFO-001: item inscription/property yalnız discover edilen/authorized knowledge kadar reveal edilir.
- CULTURE-INFO-001: cultural belief/legend canonical fact yerine geçmez; aynı claim farklı cultures'ta farklı interpretation taşıyabilir.
- GOV-INFO-001: governance reasoning incomplete/rumored knowledge ile çalışabilir fakat fact certainty uydurmaz.
- NARRATIVE-INFO-001: Story Generator hidden mystery truth'u exposition/spoiler yoluyla sızdırmaz.
- NARRATIVE-CONFLICT-001: conflicting accounts story opportunity olarak korunabilir; evaluator tek görüşü evidence olmadan doğrulamaz.

## L9-MYSTERY-INFORMATION-JOURNEY

50-100 story/world-time boyunca şu journey çalıştırılır:

hidden world truth -> witness observation -> private knowledge -> report -> rumor -> multi-hop propagation -> distortion -> conflicting account -> map rumor marker -> item/map clue discovery -> NPC-held secret -> promise/confidentiality -> investigation -> old clue recall -> additional evidence -> truth discovery -> authoritative resolution -> collective knowledge propagation.

Final assertions:

- final truth yalnız doğru aktörler tarafından doğru zamanda bilinmeli,
- rumor distortion canonical truth'u değiştirmemeli,
- knowledge provenance korunmalı,
- conflicting claims evidence olmadan collapse olmamalı,
- map fog/rumor/discovery states actor knowledge ile eşleşmeli,
- mystery answer early leak olmamalı,
- old critical clue retrievable olmalı,
- secret/promise logic relationship/context ile doğal çalışmalı,
- unsafe secrecy hard invariant ile engellenmeli,
- tenant isolation, chronology, replay/idempotency ve context-cost sınırları korunmalı.

Master acceptance principle: sistemin bir gerçeği bilmesi, karakterlerin de onu bildiği anlamına gelmez; information flow yaşayan dünyanın canonical parçasıdır.
