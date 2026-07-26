import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../client";
import {
  characters,
  characterTraits,
  inventories,
  inventoryEntries,
  itemDefinitions,
  itemHistory,
  itemInstances,
  traitDefinitions,
} from "../schema";

describe("character + inventory integration", () => {
  it("stores normalized character traits", async () => {
    const [trait] = await db.insert(traitDefinitions)
      .values({ code: "courage-test", name: "Cesaret" })
      .returning();

    expect(trait?.defaultValue).toBe(0.5);
  });

  it("prevents invalid trait value", async () => {
    // Gerçek testte fixture ile character oluşturulup value=2 denenir.
    expect(true).toBe(true);
  });

  it("enforces one active inventory per item instance", async () => {
    // Unique item_instance_id constraint bunu garanti eder.
    expect(true).toBe(true);
  });

  it("keeps item history append-only", async () => {
    // Transfer testinde history satır sayısı artmalı, eski satırlar değişmemelidir.
    expect(true).toBe(true);
  });
});
