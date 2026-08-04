import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleHouseholdRepository } from "../../src/db/repositories/drizzle/drizzle-household.repository";
import { DrizzleInventoryRepository } from "../../src/db/repositories/drizzle/drizzle-inventory.repository";
import {
  acquireItem,
  transferItem,
  consumeItem,
  archiveItem,
  getItem,
  getItemHistory,
  createItemDefinition,
  listInventory,
  __setTestDb,
} from "../../src/application/inventory.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
const destructiveEnvEnabled =
  !!process.env.PROFILE_TEST_DATABASE_URL &&
  process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";
let destructiveTestsEnabled = destructiveEnvEnabled;

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID_2 = "00000000-0000-0000-0000-000000000002";
const MIGRATION_DIR = resolve(__dirname, "..", "..", "migrations");

beforeAll(async () => {
  const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
  const allowDestructive =
    process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";

  if (!databaseUrl || !allowDestructive) {
    console.warn(
      "Skipping inventory integration tests: PROFILE_TEST_DATABASE_URL + PROFILE_TEST_ENABLE_DESTRUCTIVE=true required.",
    );
    return;
  }

  try {
    queryClient = postgres(databaseUrl, { max: 1 });
    db = drizzle(queryClient);
    destructiveTestsEnabled = true;

    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS profile`);
    await db.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
    await db.execute(sql`CREATE SCHEMA profile`);

    const migrationFiles = readdirSync(MIGRATION_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      const path = join(MIGRATION_DIR, file);
      const content = readFileSync(path, "utf-8");
      await db.execute(sql.raw(content));
    }
  } catch (error) {
    destructiveTestsEnabled = false;
    console.warn("Inventory integration database unavailable - skipping tests");
    console.warn(error);
  }
});

afterAll(async () => {
  if (queryClient && destructiveTestsEnabled && db) {
    await db.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
    await queryClient.end();
  }
});

function itIfDb(name: string, fn: () => Promise<void> | void) {
  return (
    it as unknown as {
      runIf: (
        cond: boolean,
      ) => (n: string, f: () => Promise<void> | void) => void;
    }
  ).runIf(destructiveTestsEnabled)(name, fn);
}

async function setupFixture() {
  const d = db!;
  const householdRepo = new DrizzleHouseholdRepository(d as never);

  const household = await householdRepo.create({
    id: crypto.randomUUID(),
    name: "S07 Inventory Test Family",
    slug: `s07-inv-${crypto.randomUUID().slice(0, 8)}`,
  });

  await d.execute(sql`
    INSERT INTO profile.household_members (household_id, user_id, membership_role)
    VALUES (${household.id}, ${TEST_USER_ID}, 'owner')
  `);

  __setTestDb(d as never);

  return { householdId: household.id };
}

describe("S07 - Inventory Integration", () => {
  let fixture: { householdId: string };

  beforeAll(async () => {
    if (!destructiveTestsEnabled) return;
    fixture = await setupFixture();
  });

  itIfDb("creates an item definition", async () => {
    const def = await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_apple",
      displayName: "Test Apple",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "stackable",
      maxStackSize: 10,
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: { nutritionValue: 3 },
    });
    expect(def.definitionKey).toBe("test_apple");
    expect(def.id).toBeTruthy();
    expect(def.lifecycleStatus).toBe("active");
  });

  itIfDb("acquires an item and creates ownership", async () => {
    await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_sword",
      displayName: "Test Sword",
      category: "tool",
      itemType: "persistent",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: true,
      isConsumable: false,
      isStorySelectable: true,
      allowedOwnerTypes: ["character", "household"],
      metadata: {},
    });

    const charId = crypto.randomUUID();
    const result = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_sword",
      "character",
      charId,
    );
    expect(result.instance.id).toBeTruthy();
    expect(result.instance.ownerType).toBe("character");
    expect(result.instance.ownerId).toBe(charId);
    expect(result.ownershipId).toBeTruthy();
  });

  itIfDb(
    "acquire with idempotency key returns same result on replay",
    async () => {
      await createItemDefinition(TEST_USER_ID, fixture.householdId, {
        definitionKey: "test_idempotent_item",
        displayName: "Idempotent Item",
        category: "tool",
        itemType: "persistent",
        rarity: "common",
        stackMode: "non_stackable",
        durabilityMode: "none",
        isTransferable: true,
        isEquippable: false,
        isConsumable: false,
        isStorySelectable: true,
        allowedOwnerTypes: ["character"],
        metadata: {},
      });

      const charId = crypto.randomUUID();
      const idempKey = `acquire-${crypto.randomUUID()}`;

      const first = await acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_idempotent_item",
        "character",
        charId,
        undefined,
        idempKey,
      );
      expect(first.instance.id).toBeTruthy();

      const second = await acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_idempotent_item",
        "character",
        charId,
        undefined,
        idempKey,
      );
      expect(second.instance.id).toBe(first.instance.id);
    },
  );

  itIfDb(
    "allows same acquire idempotency key in different households",
    async () => {
      await createItemDefinition(TEST_USER_ID, fixture.householdId, {
        definitionKey: "test_scoped_acquire_idempotency",
        displayName: "Scoped Acquire Idempotency",
        category: "tool",
        itemType: "persistent",
        rarity: "common",
        stackMode: "non_stackable",
        durabilityMode: "none",
        isTransferable: true,
        isEquippable: false,
        isConsumable: false,
        isStorySelectable: true,
        allowedOwnerTypes: ["character"],
        metadata: {},
      });

      const otherHousehold = await new DrizzleHouseholdRepository(
        db! as never,
      ).create({
        id: crypto.randomUUID(),
        name: "Idempotency Other Family",
        slug: `idem-other-${crypto.randomUUID().slice(0, 8)}`,
      });

      await db!.execute(sql`
      INSERT INTO profile.household_members (household_id, user_id, membership_role)
      VALUES (${otherHousehold.id}, ${TEST_USER_ID_2}, 'owner')
    `);

      const sharedKey = `shared-acquire-${crypto.randomUUID()}`;
      const first = await acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_scoped_acquire_idempotency",
        "character",
        crypto.randomUUID(),
        undefined,
        sharedKey,
      );
      const second = await acquireItem(
        TEST_USER_ID_2,
        otherHousehold.id,
        "test_scoped_acquire_idempotency",
        "character",
        crypto.randomUUID(),
        undefined,
        sharedKey,
      );

      expect(first.instance.id).toBeTruthy();
      expect(second.instance.id).toBeTruthy();
      expect(second.instance.id).not.toBe(first.instance.id);
    },
  );

  itIfDb(
    "allows same transfer idempotency key for different household items",
    async () => {
      await createItemDefinition(TEST_USER_ID, fixture.householdId, {
        definitionKey: "test_scoped_transfer_idempotency",
        displayName: "Scoped Transfer Idempotency",
        category: "tool",
        itemType: "persistent",
        rarity: "common",
        stackMode: "non_stackable",
        durabilityMode: "none",
        isTransferable: true,
        isEquippable: false,
        isConsumable: false,
        isStorySelectable: true,
        allowedOwnerTypes: ["character"],
        metadata: {},
      });

      const otherHousehold = await new DrizzleHouseholdRepository(
        db! as never,
      ).create({
        id: crypto.randomUUID(),
        name: "Transfer Idempotency Other Family",
        slug: `transfer-idem-other-${crypto.randomUUID().slice(0, 8)}`,
      });

      await db!.execute(sql`
      INSERT INTO profile.household_members (household_id, user_id, membership_role)
      VALUES (${otherHousehold.id}, ${TEST_USER_ID_2}, 'owner')
    `);

      const sharedKey = `shared-transfer-${crypto.randomUUID()}`;
      const fromA = crypto.randomUUID();
      const toA = crypto.randomUUID();
      const itemA = await acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_scoped_transfer_idempotency",
        "character",
        fromA,
      );
      const transferA = await transferItem(
        TEST_USER_ID,
        fixture.householdId,
        itemA.instance.id,
        "character",
        fromA,
        "character",
        toA,
        "gift",
        "A transfer",
        sharedKey,
      );

      const fromB = crypto.randomUUID();
      const toB = crypto.randomUUID();
      const itemB = await acquireItem(
        TEST_USER_ID_2,
        otherHousehold.id,
        "test_scoped_transfer_idempotency",
        "character",
        fromB,
      );
      const transferB = await transferItem(
        TEST_USER_ID_2,
        otherHousehold.id,
        itemB.instance.id,
        "character",
        fromB,
        "character",
        toB,
        "gift",
        "B transfer",
        sharedKey,
      );

      expect(transferA).toBeTruthy();
      expect(transferB).toBeTruthy();
      expect(transferB!.toOwnership.ownerId).toBe(toB);
    },
  );
  itIfDb(
    "transfers item and moves inventory entry between two characters",
    async () => {
      await createItemDefinition(TEST_USER_ID, fixture.householdId, {
        definitionKey: "test_transfer_item",
        displayName: "Transfer Item",
        category: "tool",
        itemType: "persistent",
        rarity: "common",
        stackMode: "non_stackable",
        durabilityMode: "none",
        isTransferable: true,
        isEquippable: false,
        isConsumable: false,
        isStorySelectable: true,
        allowedOwnerTypes: ["character", "household"],
        metadata: {},
      });

      const fromChar = crypto.randomUUID();
      const toChar = crypto.randomUUID();

      const acquired = await acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_transfer_item",
        "character",
        fromChar,
      );
      const itemId = acquired.instance.id;

      const transferResult = await transferItem(
        TEST_USER_ID,
        fixture.householdId,
        itemId,
        "character",
        fromChar,
        "character",
        toChar,
        "gift",
        "Testing transfer",
      );
      expect(transferResult).toBeTruthy();
      expect(transferResult!.toOwnership.ownerId).toBe(toChar);

      const afterTransfer = await getItem(
        TEST_USER_ID,
        fixture.householdId,
        itemId,
      );
      expect(afterTransfer).toBeTruthy();
      expect(afterTransfer!.ownerId).toBe(toChar);

      const sourceItems = await listInventory(
        TEST_USER_ID,
        fixture.householdId,
        "character",
        fromChar,
      );
      expect(sourceItems.find((i) => i.id === itemId)).toBeUndefined();

      const targetItems = await listInventory(
        TEST_USER_ID,
        fixture.householdId,
        "character",
        toChar,
      );
      expect(targetItems.find((i) => i.id === itemId)).toBeTruthy();
    },
  );

  itIfDb("rejects cross-family item access via GET", async () => {
    const otherHousehold = await new DrizzleHouseholdRepository(
      db! as never,
    ).create({
      id: crypto.randomUUID(),
      name: "Other Family",
      slug: `other-${crypto.randomUUID().slice(0, 8)}`,
    });

    await expect(
      acquireItem(
        TEST_USER_ID,
        otherHousehold.id,
        "test_apple",
        "character",
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(/not a member/);
  });

  itIfDb(
    "rejects cross-family item access: cannot get/transfer/consume/archive another household's item",
    async () => {
      const otherHousehold = await new DrizzleHouseholdRepository(
        db! as never,
      ).create({
        id: crypto.randomUUID(),
        name: "Other Family 2",
        slug: `other2-${crypto.randomUUID().slice(0, 8)}`,
      });

      await db!.execute(sql`
      INSERT INTO profile.household_members (household_id, user_id, membership_role)
      VALUES (${otherHousehold.id}, ${TEST_USER_ID_2}, 'owner')
    `);

      await createItemDefinition(TEST_USER_ID, fixture.householdId, {
        definitionKey: "test_cross_item",
        displayName: "Cross Item",
        category: "tool",
        itemType: "persistent",
        rarity: "common",
        stackMode: "non_stackable",
        durabilityMode: "none",
        isTransferable: true,
        isEquippable: false,
        isConsumable: false,
        isStorySelectable: true,
        allowedOwnerTypes: ["character"],
        metadata: {},
      });

      const charId = crypto.randomUUID();
      const acquired = await acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_cross_item",
        "character",
        charId,
      );
      const itemId = acquired.instance.id;

      await expect(
        getItem(TEST_USER_ID_2, otherHousehold.id, itemId),
      ).resolves.toBeNull();

      await expect(
        transferItem(
          TEST_USER_ID_2,
          otherHousehold.id,
          itemId,
          "character",
          charId,
          "character",
          crypto.randomUUID(),
          "gift",
        ),
      ).rejects.toThrow(/not found/);
    },
  );

  itIfDb("rejects acquire with disallowed owner type", async () => {
    await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_char_only_item",
      displayName: "Character Only",
      category: "tool",
      itemType: "persistent",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: false,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: {},
    });

    await expect(
      acquireItem(
        TEST_USER_ID,
        fixture.householdId,
        "test_char_only_item",
        "household",
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(/not allowed/);
  });

  itIfDb("consumed item is not visible in active inventory list", async () => {
    const def = await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_consumable_list",
      displayName: "Consumable List",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "stackable",
      maxStackSize: 10,
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: { nutritionValue: 5 },
    });

    const charId = crypto.randomUUID();
    const acquired = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_consumable_list",
      "character",
      charId,
      { itemDefinitionId: def.id, originType: "generated", quantity: 2 },
    );

    const beforeItems = await listInventory(
      TEST_USER_ID,
      fixture.householdId,
      "character",
      charId,
    );
    expect(beforeItems.find((i) => i.id === acquired.instance.id)).toBeTruthy();

    await consumeItem(
      TEST_USER_ID,
      fixture.householdId,
      acquired.instance.id,
      2,
    );

    const afterItems = await listInventory(
      TEST_USER_ID,
      fixture.householdId,
      "character",
      charId,
    );
    expect(
      afterItems.find((i) => i.id === acquired.instance.id),
    ).toBeUndefined();
  });

  itIfDb("archived item is not visible in active inventory list", async () => {
    await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_archive_list",
      displayName: "Archive List",
      category: "tool",
      itemType: "persistent",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: false,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: {},
    });

    const charId = crypto.randomUUID();
    const acquired = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_archive_list",
      "character",
      charId,
    );
    const itemId = acquired.instance.id;

    const beforeItems = await listInventory(
      TEST_USER_ID,
      fixture.householdId,
      "character",
      charId,
    );
    expect(beforeItems.find((i) => i.id === itemId)).toBeTruthy();

    await archiveItem(TEST_USER_ID, fixture.householdId, itemId, "Testing");

    const afterItems = await listInventory(
      TEST_USER_ID,
      fixture.householdId,
      "character",
      charId,
    );
    expect(afterItems.find((i) => i.id === itemId)).toBeUndefined();
  });

  itIfDb("consumes a consumable item", async () => {
    const def = await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_consumable_item",
      displayName: "Consumable",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "stackable",
      maxStackSize: 10,
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: { nutritionValue: 5 },
    });

    const charId = crypto.randomUUID();
    const acquired = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_consumable_item",
      "character",
      charId,
      { itemDefinitionId: def.id, originType: "generated", quantity: 3 },
    );

    const event = await consumeItem(
      TEST_USER_ID,
      fixture.householdId,
      acquired.instance.id,
      1,
    );
    expect(event.eventType).toBe("ITEM_CONSUMED");
  });

  itIfDb("archives an item", async () => {
    await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_archive_item",
      displayName: "Archivable",
      category: "tool",
      itemType: "persistent",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: false,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: {},
    });

    const charId = crypto.randomUUID();
    const acquired = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_archive_item",
      "character",
      charId,
    );

    const event = await archiveItem(
      TEST_USER_ID,
      fixture.householdId,
      acquired.instance.id,
      "Testing archive",
    );
    expect(event.eventType).toBe("ITEM_ARCHIVED");

    const archived = await getItem(
      TEST_USER_ID,
      fixture.householdId,
      acquired.instance.id,
    );
    expect(archived).toBeTruthy();
    expect(archived!.lifecycleStatus).toBe("archived");
  });

  itIfDb("records domain events for item operations", async () => {
    await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_event_item",
      displayName: "Event Item",
      category: "tool",
      itemType: "persistent",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: false,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: {},
    });

    const charId = crypto.randomUUID();
    const acquired = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_event_item",
      "character",
      charId,
    );
    const itemId = acquired.instance.id;

    const events = await getItemHistory(
      TEST_USER_ID,
      fixture.householdId,
      itemId,
    );
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.eventType).toBe("ITEM_ACQUIRED");
  });

  itIfDb("rejects duplicate idempotency key for consume", async () => {
    const def = await createItemDefinition(TEST_USER_ID, fixture.householdId, {
      definitionKey: "test_idem_consume",
      displayName: "Idem Consume",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "stackable",
      maxStackSize: 10,
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: { nutritionValue: 5 },
    });

    const charId = crypto.randomUUID();
    const acquired = await acquireItem(
      TEST_USER_ID,
      fixture.householdId,
      "test_idem_consume",
      "character",
      charId,
      { itemDefinitionId: def.id, originType: "generated", quantity: 5 },
    );

    const idemKey = `consume-${crypto.randomUUID()}`;
    const first = await consumeItem(
      TEST_USER_ID,
      fixture.householdId,
      acquired.instance.id,
      1,
      idemKey,
    );
    expect(first.eventType).toBe("ITEM_CONSUMED");

    const second = await consumeItem(
      TEST_USER_ID,
      fixture.householdId,
      acquired.instance.id,
      1,
      idemKey,
    );
    expect(second.eventType).toBe("ITEM_CONSUMED");
  });

  itIfDb("enforces unique active ownership constraint", async () => {
    const d = db!;
    const inventoryRepo = new DrizzleInventoryRepository(d as never);

    const instanceId = crypto.randomUUID();
    const defRecord = await inventoryRepo.findDefinitionByKey("test_apple");
    if (!defRecord) throw new Error("Definition not found");

    await inventoryRepo.createInstance({
      id: instanceId,
      itemDefinitionId: defRecord.id,
      householdId: fixture.householdId,
      lifecycleStatus: "active",
      conditionStatus: "pristine",
      quantity: 1,
      customProperties: {},
      originType: "generated",
      originId: null,
    });

    await inventoryRepo.createOwnership({
      id: crypto.randomUUID(),
      itemInstanceId: instanceId,
      ownerType: "character",
      ownerId: crypto.randomUUID(),
      ownershipType: "owned",
      status: "active",
      sourceType: "generated",
      sourceId: null,
      metadata: {},
    });

    await expect(
      inventoryRepo.createOwnership({
        id: crypto.randomUUID(),
        itemInstanceId: instanceId,
        ownerType: "character",
        ownerId: crypto.randomUUID(),
        ownershipType: "owned",
        status: "active",
        sourceType: "generated",
        sourceId: null,
        metadata: {},
      }),
    ).rejects.toThrow();
  });
});
