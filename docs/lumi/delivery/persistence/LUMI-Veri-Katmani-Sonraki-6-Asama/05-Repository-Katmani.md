# LUMI — Repository Katmanı

## 1. Amaç

Repository katmanı, domain iş mantığını SQL ve Drizzle detaylarından ayırır.

---

## 2. Temel Kural

```text
Controller/API
  ↓
Use Case / Application Service
  ↓
Repository
  ↓
Drizzle ORM
  ↓
PostgreSQL
```

Controller doğrudan tabloya erişmez.

---

## 3. Repository Sorumlulukları

- Veri okuma
- Veri yazma
- Transaction executor kullanma
- Query composition
- Persistence mapping
- Veri erişim hatalarını normalize etme

Repository iş kuralı üretmez.

---

## 4. Repository Örnekleri

```text
UserRepository
HouseholdRepository
ChildProfileRepository
WorldRepository
CharacterRepository
StoryRepository
SimulationRepository
MemoryRepository
InventoryRepository
MediaRepository
AIUsageRepository
AuditRepository
OutboxRepository
```

---

## 5. Interface Örneği

```ts
export interface WorldRepository {
  findById(id: string): Promise<World | null>;
  create(input: CreateWorldRecord): Promise<World>;
  updateState(input: UpdateWorldStateRecord): Promise<void>;
  listSimulationCandidates(limit: number): Promise<World[]>;
}
```

---

## 6. Drizzle Implementasyonu

```ts
export class DrizzleWorldRepository implements WorldRepository {
  constructor(
    private readonly executor: DatabaseExecutor,
  ) {}

  async findById(id: string) {
    const [world] = await this.executor
      .select()
      .from(worlds)
      .where(eq(worlds.id, id))
      .limit(1);

    return world ?? null;
  }
}
```

---

## 7. Transaction Executor

Repository hem ana DB client hem transaction context ile çalışmalıdır.

```ts
export type DatabaseExecutor =
  | typeof db
  | TransactionExecutor;
```

---

## 8. Use Case Örneği

```ts
await db.transaction(async (tx) => {
  const worldRepo = new DrizzleWorldRepository(tx);
  const characterRepo = new DrizzleCharacterRepository(tx);
  const inventoryRepo = new DrizzleInventoryRepository(tx);
  const outboxRepo = new DrizzleOutboxRepository(tx);

  const world = await worldRepo.create(input.world);

  const avatar = await characterRepo.createChildAvatar({
    worldId: world.id,
    childProfileId: input.childProfileId,
  });

  await inventoryRepo.createDefaultInventory({
    characterId: avatar.id,
  });

  await outboxRepo.enqueue({
    eventType: "world.created",
    aggregateId: world.id,
  });
});
```

---

## 9. Query Repository Ayrımı

Karmaşık read model sorguları normal repository’den ayrılabilir:

```text
WorldContextQuery
StoryContextQuery
CharacterStateQuery
SimulationContextQuery
```

Bu sınıflar yalnızca okuma yapar.

---

## 10. Hata Yönetimi

DB’ye özgü hata kodları domain katmanına sızmamalıdır.

Örnek dönüşüm:

```text
unique violation → DuplicateEntityError
foreign key violation → ReferencedEntityNotFoundError
serialization failure → RetryableTransactionError
```

---

## 11. Repository Testleri

Her repository için:

- CRUD testleri
- Unique constraint testi
- Soft delete testi
- Transaction rollback testi
- Concurrent update testi
- Query result mapping testi

yazılır.

---

## 12. Yasaklar

- Repository içinde HTTP çağrısı
- Repository içinde prompt oluşturma
- Repository içinde business decision
- Controller’dan doğrudan Drizzle kullanımı
- Başka domain tablosuna yetkisiz write
