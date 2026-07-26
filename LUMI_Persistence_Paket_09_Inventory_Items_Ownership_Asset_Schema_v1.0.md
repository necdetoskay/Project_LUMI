# Project LUMI — Persistence Implementation
# Paket 09 — Inventory, Items, Ownership & Asset Persistence Schema v1.0

- **Durum:** Accepted
- **Aşama:** Persistence Implementation
- **Teknoloji:** PostgreSQL + Drizzle ORM
- **Bağımlılıklar:** Paket 01–08
- **Ana Aggregate'ler:** ItemDefinition, ItemInstance, Inventory, Asset
- **Kapsam:** Eşya tanımları, örnekleri, sahiplik, envanter, kullanım, transfer, rezervasyon, keşif ve medya varlıkları

---

## 1. Paket Amacı

Bu paket, Project LUMI’de hikâyeler arasında devam eden eşyaların, envanterlerin, sahiplik ilişkilerinin ve üretilmiş medya varlıklarının kalıcı veri modelini tanımlar.

Model aşağıdaki ihtiyaçları karşılar:

- tekrar kullanılabilir eşya tanımları;
- her fiziksel veya anlatısal eşya için benzersiz item instance;
- karakter, çocuk profili, dünya, konum ve hikâye oturumu bazlı sahiplik;
- birden fazla envanter türü;
- ekipman ve aktif kullanım;
- eşya durumu ve dayanıklılık;
- hikâye öncesi eşya seçimi;
- hikâye içi eşya kazanımı ve kaybı;
- güvenli transfer ve rezervasyon;
- keşif ve görünürlük;
- eşyaya bağlı hafıza ve hikâye devamlılığı;
- tek kullanımlık ve kalıcı eşyalar;
- görsel, ikon, ses ve diğer medya varlıkları;
- asset yeniden kullanım;
- üretim modeli, maliyet ve kalite metadata’sı;
- Story Outcome & World State Commit entegrasyonu.

---

## 2. Temel Tasarım Kararları

1. `ItemDefinition`, eşyanın türünü ve ortak özelliklerini tanımlar.
2. `ItemInstance`, dünyadaki veya hikâyedeki gerçek eşya örneğidir.
3. Aynı tanımdan birden çok instance üretilebilir.
4. Sahiplik yalnızca `owner_id` alanıyla çözülmez; sahiplik geçmişi ayrıca tutulur.
5. Her item instance aynı anda en fazla bir aktif sahiplik kaydına sahip olabilir.
6. Envanter, sahipten ayrı bir container aggregate olarak modellenir.
7. Eşya transferleri append-only kayıtlarla izlenir.
8. Hikâyeye seçilen eşyalar doğrudan transfer edilmez; önce reservation oluşturulur.
9. Story session tamamlanınca reservation sonucu commit veya release edilir.
10. Eşya durumu ile eşya tanımı birbirinden ayrıdır.
11. Eşya özellikleri değişebilir; ancak item identity değişmez.
12. Görsel ve medya dosyaları item tablolarında binary olarak tutulmaz.
13. Asset metadata PostgreSQL’de, dosyanın kendisi object storage’da tutulur.
14. Aynı asset birden çok item, karakter veya hikâye tarafından kullanılabilir.
15. Üretim maliyeti, model, çözünürlük ve tekrar kullanım bilgisi saklanır.
16. Story outcome manifest doğrudan eşya update komutu değil, domain effect üretir.
17. Tüm transfer ve ownership işlemleri idempotent ve transaction-safe olmalıdır.
18. Kritik envanter işlemleri optimistic veya pessimistic locking kullanabilir.

---

## 3. Aggregate Sınırları

### `ItemDefinition` Aggregate

Şunları yönetir:

- eşya türü;
- kategori;
- ortak özellikler;
- kullanım kuralları;
- stack davranışı;
- nadirlik;
- görsel ve ikon referansları;
- üretim şablonu;
- yaşam döngüsü.

### `ItemInstance` Aggregate

Şunları yönetir:

- benzersiz eşya kimliği;
- durum;
- dayanıklılık;
- özel özellikler;
- keşif durumu;
- aktif sahiplik;
- kullanım geçmişi;
- hikâye devamlılık marker’ları.

### `Inventory` Aggregate

Şunları yönetir:

- container kimliği;
- sahip;
- kapasite;
- item slotları;
- sıralama;
- eşya rezervasyonları;
- aktif kullanım ve ekipman.

### `Asset` Aggregate

Şunları yönetir:

- medya türü;
- storage konumu;
- checksum;
- üretim kaynağı;
- kalite;
- kullanım ilişkileri;
- maliyet metadata’sı;
- lifecycle.

---

## 4. Item Definition Tablosu

### `inventory.item_definitions`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| id | uuid | evet | Tanım kimliği |
| world_id | uuid | hayır | Dünyaya özel tanım |
| definition_key | text | evet | Sabit teknik anahtar |
| display_name | text | evet | Görünen ad |
| description | text | hayır | Açıklama |
| category | text | evet | tool, key, map, gift, wearable vb. |
| item_type | text | evet | persistent, consumable, quest, story, collectible |
| rarity | text | evet | common, uncommon, rare, unique, legendary |
| stack_mode | text | evet | non_stackable, stackable, virtual_quantity |
| max_stack_size | integer | hayır | Maksimum stack |
| durability_mode | text | evet | none, fixed, degradable, rechargeable |
| default_durability | numeric | hayır | Başlangıç dayanıklılık |
| is_transferable | boolean | evet | Transfer edilebilir mi |
| is_equippable | boolean | evet | Takılabilir mi |
| is_consumable | boolean | evet | Tüketilebilir mi |
| is_story_selectable | boolean | evet | Hikâye öncesi seçilebilir mi |
| allowed_owner_types | jsonb | evet | İzinli sahip türleri |
| usage_rules | jsonb | evet | Kullanım kuralları |
| effect_template | jsonb | evet | Olası domain etkileri |
| icon_asset_id | uuid | hayır | İkon |
| primary_asset_id | uuid | hayır | Ana görsel |
| lifecycle_status | text | evet | draft, active, retired, archived |
| metadata | jsonb | evet | Ek bilgiler |
| created_at | timestamptz | evet | Oluşturulma |
| updated_at | timestamptz | evet | Güncelleme |
| version | integer | evet | Concurrency |

```text
UNIQUE (world_id, definition_key)
```

---

## 5. Eşya Kategorileri

Önerilen kategoriler:

```text
tool
key
map
gift
wearable
book
companion_token
food
medicine
artifact
toy
letter
memory_object
quest_object
collectible
currency_like
```

`currency_like`, gerçek para sistemi anlamına gelmek zorunda değildir; örneğin festival jetonu veya yıldız taşı olabilir.

---

## 6. Item Instance Tablosu

### `inventory.item_instances`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Benzersiz instance |
| world_id | uuid | Dünya |
| item_definition_id | uuid | Tanım |
| instance_name | text | Özel ad |
| serial_key | text | İsteğe bağlı sabit anahtar |
| lifecycle_status | text | active, consumed, destroyed, lost, archived |
| condition_status | text | pristine, good, worn, damaged, broken |
| durability_current | numeric | Güncel dayanıklılık |
| durability_max | numeric | Maksimum dayanıklılık |
| quantity | integer | Miktar |
| custom_properties | jsonb | Instance’a özel özellikler |
| origin_type | text | generated, discovered, gifted, crafted, story |
| origin_id | uuid | Kaynak |
| discovered_at | timestamptz | Keşif zamanı |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| archived_at | timestamptz | Arşiv |
| version | integer | Concurrency |

```text
UNIQUE (world_id, serial_key)
```

`serial_key` yalnızca gerçekten benzersiz hikâye eşyalarında zorunlu olabilir.

---

## 7. Sahiplik Modeli

### `inventory.item_ownerships`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Sahiplik kaydı |
| item_instance_id | uuid | Eşya |
| owner_type | text | character, child_profile, world, location, session, system |
| owner_id | uuid | Sahip |
| ownership_type | text | owned, borrowed, entrusted, discovered, reserved |
| status | text | active, transferred, released, expired |
| acquired_at | timestamptz | Edinme zamanı |
| released_at | timestamptz | Sahiplik bitişi |
| source_type | text | story, gift, transfer, admin, simulation |
| source_id | uuid | Kaynak |
| metadata | jsonb | Ek bilgiler |
| created_at | timestamptz | Oluşturulma |

Kural:

```text
Bir item instance için yalnızca bir active ownership olabilir.
```

Bu kural partial unique index ile uygulanabilir.

---

## 8. Sahiplik Geçmişi

`item_ownerships` append-only mantıkta çalışır.

Transfer sırasında:

```text
old ownership -> transferred
new ownership -> active
transfer record -> committed
```

Eski sahiplik kaydı silinmez.

---

## 9. Inventory Container Modeli

### `inventory.inventories`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Envanter kimliği |
| world_id | uuid | Dünya |
| owner_type | text | character, child_profile, location, session |
| owner_id | uuid | Sahip |
| inventory_type | text | personal, shared, equipped, storage, session, quest |
| display_name | text | Görünen ad |
| capacity_mode | text | unlimited, slot, weight, custom |
| capacity_value | numeric | Kapasite |
| is_locked | boolean | Kilit durumu |
| lifecycle_status | text | active, inactive, archived |
| metadata | jsonb | Ek bilgiler |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (owner_type, owner_id, inventory_type)
```

---

## 10. Inventory Entry Modeli

### `inventory.inventory_entries`

```text
id
inventory_id
item_instance_id
slot_key
sort_order
quantity
entry_status
added_at
removed_at
metadata
created_at
updated_at
```

```text
UNIQUE (inventory_id, item_instance_id)
```

`entry_status`:

```text
active
reserved
equipped
hidden
removed
```

---

## 11. Stack Davranışı

İki yaklaşım desteklenir:

### Instance-based

Her eşya ayrı instance:

```text
harita
anahtar
mektup
ejderha madalyonu
```

### Quantity-based

Aynı instance altında miktar:

```text
3 elma
5 festival jetonu
2 iyileştirici ot
```

Unique veya hikâye devamlılığı olan eşyalar stack edilmemelidir.

---

## 12. Ekipman Modeli

### `inventory.item_equipment`

```text
id
character_id
item_instance_id
equipment_slot
status
equipped_at
unequipped_at
source_story_session_id
created_at
```

Slot örnekleri:

```text
hand
neck
head
back
pocket
companion
special
```

Kurallar:

- Eşya `is_equippable = true` olmalıdır.
- Aynı slotta tek aktif eşya olabilir.
- Karakter eşyanın aktif sahibi veya izinli kullanıcısı olmalıdır.

---

## 13. Eşya Durumu

### `inventory.item_state_changes`

Append-only tablo:

```text
id
item_instance_id
change_type
previous_state
resulting_state
reason_code
source_type
source_id
correlation_id
effective_at
created_at
```

Değişim türleri:

```text
durability_changed
condition_changed
property_added
property_removed
activated
deactivated
charged
broken
repaired
consumed
destroyed
lost
found
```

---

## 14. Dayanıklılık

Dayanıklılık kuralları:

- `durability_mode = none` ise değer tutulmaz.
- `degradable` eşya kullanım veya olayla azalabilir.
- `rechargeable` eşya yeniden yüklenebilir.
- `broken` eşya otomatik olarak yok edilmez.
- Tamir edilebilirlik `usage_rules` içinde tanımlanır.

---

## 15. Eşya Kullanımı

### `inventory.item_usages`

```text
id
item_instance_id
used_by_character_id
story_session_id
scene_id
usage_type
usage_context
requested_effect
resolved_effect
validation_status
application_status
used_at
idempotency_key
created_at
```

Kullanım örnekleri:

- haritayı incelemek;
- anahtarı kapıda kullanmak;
- mektubu NPC’ye vermek;
- iksiri tüketmek;
- feneri mağarada yakmak;
- özel taşı etkinleştirmek.

---

## 16. Story Öncesi Eşya Seçimi

### `inventory.story_item_selections`

```text
id
story_session_id
child_profile_id
character_id
item_instance_id
selection_status
selected_at
confirmed_at
released_at
metadata
```

Durumlar:

```text
selected
confirmed
rejected
released
committed
```

Seçim sırasında eşya doğrudan session’a transfer edilmez.

---

## 17. Eşya Rezervasyonu

### `inventory.item_reservations`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Rezervasyon |
| item_instance_id | uuid | Eşya |
| reservation_type | text | story, transfer, crafting, system |
| reserved_for_type | text | session, character, child_profile |
| reserved_for_id | uuid | Hedef |
| status | text | active, committed, released, expired |
| reserved_at | timestamptz | Başlangıç |
| expires_at | timestamptz | Süre sonu |
| committed_at | timestamptz | Commit |
| released_at | timestamptz | Release |
| idempotency_key | text | Tekrarlı işlem koruması |
| created_at | timestamptz | Oluşturulma |

Kural:

```text
Bir item instance için aynı anda yalnızca bir exclusive active reservation olabilir.
```

---

## 18. Transfer Modeli

### `inventory.item_transfers`

```text
id
item_instance_id
from_owner_type
from_owner_id
to_owner_type
to_owner_id
transfer_type
status
reason
source_type
source_id
idempotency_key
requested_at
validated_at
committed_at
failed_at
failure_reason
created_at
```

Transfer türleri:

```text
gift
loan
return
story_reward
story_loss
found
drop
pickup
system_move
```

---

## 19. Transfer Transaction Akışı

```text
lock item instance
validate lifecycle
validate source ownership
validate reservation
validate target owner
create transfer request
close old ownership
create new ownership
move inventory entry
append item state change
create domain event
create outbox message
commit
```

---

## 20. Loan ve Entrustment

Ödünç veya emanet eşya için:

```text
ownership_type = borrowed / entrusted
```

Ek alanlar:

```text
expected_return_at
original_owner_type
original_owner_id
return_condition
```

Bunlar ownership metadata veya ayrı contract tablosunda tutulabilir.

---

## 21. Keşif Modeli

### `inventory.item_discoveries`

```text
id
item_instance_id
discovered_by_type
discovered_by_id
story_session_id
location_id
discovery_type
visibility
discovered_at
metadata
```

Discovery türleri:

```text
found
revealed
gifted
decoded
remembered
rumored
```

Keşfedilmemiş eşya dünyada var olabilir ancak çocuk arayüzünde görünmez.

---

## 22. Eşya Hafızası

### `inventory.item_memories`

```text
id
item_instance_id
character_id
story_session_id
memory_type
summary
importance
emotional_vector
source_event_id
occurred_at
created_at
```

Örnekler:

- anahtarı dedesi verdi;
- harita ilk kez mağarada kullanıldı;
- taş ejderhayı kurtarmaya yardım etti;
- mektup henüz sahibine ulaştırılmadı.

---

## 23. Eşya Devamlılık Marker'ları

### `inventory.item_continuity_markers`

```text
id
item_instance_id
marker_key
marker_type
value_payload
importance
source_story_session_id
created_at
resolved_at
```

Örnek marker’lar:

```text
map_unread
key_unused
promise_attached
belongs_to_npc
needed_for_future_story
damaged_but_repairable
hidden_power_unknown
```

---

## 24. Quest ve Story Item Kuralları

Quest veya story item:

- yanlışlıkla silinemez;
- normal transfer kurallarından farklı olabilir;
- story session tamamlanmadan tüketilemeyebilir;
- world commit ile sahiplik değiştirebilir;
- arayüzde özel işaret taşıyabilir.

Bu kurallar `usage_rules` ve `effect_template` içinde sürümlenir.

---

## 25. Asset Modeli

### `asset.assets`

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | Asset kimliği |
| asset_type | text | image, icon, audio, music, voice, document |
| storage_provider | text | s3, r2, local, cdn |
| storage_key | text | Object storage anahtarı |
| public_url | text | Doğrudan public ise |
| mime_type | text | MIME |
| file_size_bytes | bigint | Boyut |
| checksum | text | İçerik checksum |
| width | integer | Görsel genişliği |
| height | integer | Görsel yüksekliği |
| duration_ms | integer | Ses/video süresi |
| lifecycle_status | text | pending, active, rejected, archived, deleted |
| safety_status | text | pending, approved, rejected |
| quality_status | text | pending, approved, low_quality, failed |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncelleme |
| version | integer | Concurrency |

```text
UNIQUE (storage_provider, storage_key)
UNIQUE (checksum, asset_type)
```

Checksum deduplication için kullanılabilir.

---

## 26. Asset Üretim Metadata'sı

### `asset.asset_generations`

```text
id
asset_id
generation_type
provider_name
model_name
model_version
prompt_hash
negative_prompt_hash
input_asset_ids
seed
width
height
megapixels
quality_setting
generation_time_ms
usage_metadata
cost_currency
cost_amount
request_id
idempotency_key
created_at
```

Maliyet alanları örneğin Türk lirası veya sağlayıcının faturalandırdığı para birimiyle tutulabilir; dönüşüm yapılacaksa kullanılan kur ayrıca ayrı kaydedilmelidir.

---

## 27. Asset Kullanım İlişkileri

### `asset.asset_links`

```text
id
asset_id
linked_type
linked_id
usage_role
sort_order
is_primary
created_at
```

Bağlanabilecek nesneler:

```text
item_definition
item_instance
character
story_definition
story_version
story_scene
world
region
location
reflection
parent_note
```

Usage role:

```text
icon
thumbnail
primary
background
portrait
illustration
ambient_audio
voice
sound_effect
document
```

---

## 28. Asset Yeniden Kullanım

Aynı asset şu durumlarda yeniden kullanılabilir:

- aynı item definition;
- aynı karakter portresi;
- aynı mekân;
- aynı ikon;
- aynı ambience;
- aynı hikâye continuation;
- benzer sahne.

### `asset.asset_reuse_records`

```text
id
asset_id
source_link_type
source_link_id
target_link_type
target_link_id
reuse_reason
quality_score
estimated_cost_saved
created_at
```

Bu yapı görsel üretim maliyetini azaltmak için kullanılabilir.

---

## 29. Asset Varyantları

### `asset.asset_variants`

```text
id
source_asset_id
variant_asset_id
variant_type
transformation_profile
created_at
```

Varyant türleri:

```text
thumbnail
compressed
cropped
transparent_icon
mobile
web
print
low_bandwidth
```

---

## 30. Asset Moderation ve Kalite

### `asset.asset_reviews`

```text
id
asset_id
review_type
reviewer_type
reviewer_id
status
score
notes
created_at
```

Review türleri:

```text
safety
quality
consistency
character_identity
age_appropriateness
copyright_risk
```

---

## 31. Story Outcome Entegrasyonu

Story outcome item effect örnekleri:

```text
create_item
transfer_item
reserve_item
release_item
consume_item
damage_item
repair_item
discover_item
equip_item
unequip_item
attach_continuity_marker
```

Outcome effect doğrudan SQL komutu içermez.

Örnek manifest:

```json
{
  "effect_type": "transfer_item",
  "item_instance_id": "uuid",
  "from_owner": {"type": "location", "id": "uuid"},
  "to_owner": {"type": "character", "id": "uuid"},
  "reason": "story_reward",
  "conflict_policy": "reject"
}
```

---

## 32. World Simulation Entegrasyonu

Simülasyon eşya üzerinde şu etkileri oluşturabilir:

- açıkta kalan eşyanın kaybolması;
- bozulabilir eşyanın dayanıklılığının azalması;
- NPC’nin eşyayı başka konuma taşıması;
- rezervasyon süresinin dolması;
- tamir sürecinin ilerlemesi;
- gizli eşyanın söylentiye dönüşmesi.

Kritik ve hikâye bağlı eşyalar düşük öncelikli simülasyonla yok edilemez.

---

## 33. İndeks Stratejisi

### `item_definitions`

```text
(world_id, lifecycle_status)
(category, item_type)
(is_story_selectable, lifecycle_status)
```

### `item_instances`

```text
(world_id, lifecycle_status)
(item_definition_id, lifecycle_status)
(origin_type, origin_id)
(discovered_at)
```

### `item_ownerships`

```text
(item_instance_id, status)
(owner_type, owner_id, status)
(source_type, source_id)
```

### `inventories`

```text
(owner_type, owner_id, inventory_type)
(world_id, lifecycle_status)
```

### `inventory_entries`

```text
(inventory_id, entry_status, sort_order)
(item_instance_id, entry_status)
```

### `item_reservations`

```text
(item_instance_id, status)
(reserved_for_type, reserved_for_id, status)
(expires_at, status)
```

### `item_transfers`

```text
(item_instance_id, requested_at DESC)
(from_owner_type, from_owner_id)
(to_owner_type, to_owner_id)
(idempotency_key)
```

### `assets`

```text
(checksum, asset_type)
(lifecycle_status, safety_status)
(created_at DESC)
```

### `asset_links`

```text
(linked_type, linked_id, usage_role)
(asset_id)
```

---

## 34. Partitioning Adayları

Yüksek hacimli olabilecek tablolar:

```text
item_usages
item_state_changes
item_transfers
asset_generations
asset_reviews
asset_reuse_records
```

İlk sürümde partition zorunlu değildir.

---

## 35. Transaction Sınırları

### Item Oluşturma

```text
validate definition
insert item instance
create initial ownership
insert inventory entry
create state event
create domain event
create outbox message
commit
```

### Story için Rezervasyon

```text
lock item instance
validate active ownership
validate no exclusive reservation
create reservation
mark inventory entry reserved
create domain event
commit
```

### Transfer

```text
lock item and inventory
validate source owner
validate target
close old ownership
create new ownership
move inventory entry
commit reservation if present
append state change
create domain event
create outbox
commit
```

### Consume

```text
lock item
validate consumable
validate ownership
create usage
decrease quantity or set consumed
remove inventory entry if necessary
append state change
create domain event
commit
```

---

## 36. Idempotency

İdempotency gerektiren işlemler:

- item instance creation;
- reservation;
- transfer;
- usage;
- consume;
- story reward;
- asset generation;
- asset linking;
- asset transformation.

Anahtar örnekleri:

```text
story_session_id + outcome_effect_id
transfer_request_id
generation_request_id
item_usage_command_id
```

---

## 37. Locking Stratejisi

Aşağıdaki işlemlerde row-level lock önerilir:

```text
transfer
consume
exclusive reservation
equip
ownership change
unique story reward
```

Salt okunur envanter listelemelerinde lock gerekmez.

---

## 38. Repository Tasarımı

### `ItemDefinitionRepository`

```text
createDefinition
findById
findByKey
listSelectable
activate
retire
archive
```

### `ItemInstanceRepository`

```text
createInstance
findById
updateWithExpectedVersion
changeCondition
changeDurability
consume
archive
```

### `InventoryRepository`

```text
findForOwner
addItem
removeItem
reserveItem
releaseItem
equipItem
unequipItem
```

### `ItemTransferRepository`

```text
createTransfer
validateTransfer
commitTransfer
failTransfer
findByIdempotencyKey
```

### `AssetRepository`

```text
createAsset
findById
findByChecksum
linkAsset
createVariant
markApproved
archive
```

---

## 39. Domain Events

Önerilen olaylar:

```text
ItemDefinitionCreated
ItemDefinitionActivated
ItemInstanceCreated
ItemDiscovered
ItemLost
ItemFound
ItemConsumed
ItemDestroyed
ItemDamaged
ItemRepaired

ItemOwnershipCreated
ItemOwnershipReleased
ItemTransferRequested
ItemTransferred
ItemTransferFailed

InventoryCreated
ItemAddedToInventory
ItemRemovedFromInventory
ItemReserved
ItemReservationReleased
ItemEquipped
ItemUnequipped
ItemUsed

ItemContinuityMarkerCreated
ItemContinuityMarkerResolved

AssetCreated
AssetGenerated
AssetApproved
AssetRejected
AssetLinked
AssetReused
AssetVariantCreated
AssetArchived
```

---

## 40. Outbox Kullanımları

Transaction sonrasında:

- item görseli üretme;
- ikon üretme;
- thumbnail oluşturma;
- asset moderation;
- asset kalite kontrolü;
- item embedding üretme;
- continuation önerisi üretme;
- parent notification hazırlama;
- analytics gönderme;
- maliyet raporu güncelleme.

---

## 41. Güvenlik ve Tutarlılık

- Sahiplik dünya kapsamıyla doğrulanır.
- Başka dünyadaki karaktere doğrudan transfer yapılamaz.
- Story session yalnızca izinli eşyaları reserve edebilir.
- Child profile envanteri parent authorization ile erişilir.
- Asset dosya yolları doğrudan kullanıcı girdisiyle oluşturulmaz.
- Storage key ve MIME doğrulanır.
- Zararlı veya uygunsuz asset active olamaz.
- Story item normal silme işlemine kapalı olabilir.
- Duplicate reward idempotency ile engellenir.
- Ham maliyet ve provider metadata çocuk ekranında gösterilmez.

---

## 42. Migration Planı

Migration adı:

```text
0008_inventory_asset.sql
```

Aşamalar:

1. `inventory` ve `asset` şemalarını oluştur.
2. item definitions oluştur.
3. item instances oluştur.
4. ownership ve inventories oluştur.
5. inventory entries ve equipment oluştur.
6. state changes ve usages oluştur.
7. story selections ve reservations oluştur.
8. transfers ve discoveries oluştur.
9. item memories ve continuity markers oluştur.
10. assets ve generation metadata oluştur.
11. links, variants, reviews ve reuse records oluştur.
12. constraint ve partial unique index’leri ekle.
13. seed data ekle.
14. integration ve concurrency testlerini çalıştır.

---

## 43. Drizzle ORM Dosya Yapısı

```text
src/infrastructure/database/schema/inventory/
├── item-definitions.table.ts
├── item-instances.table.ts
├── item-ownerships.table.ts
├── inventories.table.ts
├── inventory-entries.table.ts
├── item-equipment.table.ts
├── item-state-changes.table.ts
├── item-usages.table.ts
├── story-item-selections.table.ts
├── item-reservations.table.ts
├── item-transfers.table.ts
├── item-discoveries.table.ts
├── item-memories.table.ts
├── item-continuity-markers.table.ts
├── inventory.relations.ts
└── index.ts
```

```text
src/infrastructure/database/schema/asset/
├── assets.table.ts
├── asset-generations.table.ts
├── asset-links.table.ts
├── asset-reuse-records.table.ts
├── asset-variants.table.ts
├── asset-reviews.table.ts
├── asset.relations.ts
└── index.ts
```

---

## 44. Test Gereksinimleri

Zorunlu testler:

- item definition oluşturma;
- world içinde benzersiz definition key;
- item instance oluşturma;
- tek aktif ownership;
- inventory oluşturma;
- item ekleme ve çıkarma;
- stack quantity validation;
- unique item stack engeli;
- ekipman slot tekilliği;
- dayanıklılık azalması;
- broken state;
- item consume;
- story selection;
- exclusive reservation;
- reservation expiry;
- transfer transaction;
- invalid source owner reddi;
- cross-world transfer reddi;
- duplicate reward idempotency;
- item discovery;
- continuity marker;
- asset checksum deduplication;
- asset link;
- asset variant;
- rejected asset’in kullanılamaması;
- optimistic concurrency conflict;
- row lock altında eşzamanlı transfer;
- domain event ve outbox atomikliği.

---

## 45. Acceptance Criteria

Paket 09 şu koşullarda tamamlanmış kabul edilir:

1. Item definition ve item instance ayrılmıştır.
2. Her item instance benzersiz kimliğe sahiptir.
3. Tek aktif ownership kuralı uygulanır.
4. Ownership history korunur.
5. Inventory container modeli desteklenir.
6. Stackable ve non-stackable eşyalar ayrılır.
7. Equipment desteği vardır.
8. Durability ve condition kalıcıdır.
9. Story öncesi item selection desteklenir.
10. Reservation ile double-use engellenir.
11. Transferler transaction-safe ve idempotent’tir.
12. Item discovery ve visibility desteklenir.
13. Item memory ve continuity marker desteklenir.
14. Story outcome item effect’leri modellenmiştir.
15. Simulation item effect’leri desteklenir.
16. Asset binary verisi DB dışında tutulur.
17. Asset generation metadata ve maliyet kaydı vardır.
18. Asset reuse ve variant sistemi desteklenir.
19. Güvenlik ve kalite review süreci vardır.
20. Migration ve Drizzle dosya yapısı tanımlıdır.
21. Integration ve concurrency test kapsamı tanımlıdır.
22. World ve child authorization boundary korunur.

---

## 46. Paket 09 Özeti

Paket 09 ile LUMI’nin eşya, envanter ve medya varlığı altyapısı kesinleşmiştir.

Bu tasarım sayesinde:

- çocuk bir hikâyede bulduğu eşyayı sonraki hikâyede kullanabilir;
- eşyalar tekil kimlik ve geçmiş taşır;
- harita, anahtar, mektup veya özel taş gibi anlatısal eşyalar kaybolmaz;
- hikâye öncesi seçimler reservation ile güvenli hale gelir;
- sahiplik ve transfer geçmişi denetlenebilir;
- eşyalar yıpranabilir, tamir edilebilir, tüketilebilir veya ekipman olarak kullanılabilir;
- story outcome ve world simulation etkileri güvenli biçimde uygulanabilir;
- görsel, ikon ve ses asset’leri tekrar kullanılabilir;
- üretim maliyeti ve kalite kontrolü izlenebilir;
- aynı varlığın gereksiz yere tekrar üretilmesi azaltılabilir.

---

## 47. Sonraki Paket

**Paket 10 — Event, Memory, Knowledge & Embedding Persistence Schema**

Kapsam:

- domain events;
- world events;
- knowledge records;
- facts and claims;
- memories;
- rumors;
- embeddings;
- semantic retrieval;
- relevance scoring;
- provenance;
- contradiction handling;
- context builder projections;
- retention and archival.
