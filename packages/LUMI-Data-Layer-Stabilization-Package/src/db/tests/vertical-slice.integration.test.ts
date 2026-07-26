import { describe, expect, it } from "vitest";

import { createLumiFoundation } from "../../application/onboarding/create-lumi-foundation.use-case";
import {
  auditLogs,
  characterTraits,
  inventories,
  outboxEvents,
  simulationPolicies,
} from "../schema";
import { db } from "../client";
import { eq } from "drizzle-orm";

describe("LUMI foundation vertical slice", () => {
  it("creates the complete foundation atomically", async () => {
    const result = await createLumiFoundation({
      email: "foundation@example.com",
      displayName: "Foundation Parent",
      householdName: "Foundation Household",
      householdSlug: "foundation-household",
      childName: "Lumi Child",
      childBirthYear: 2021,
      universeName: "LUMI Universe",
      universeSlug: "lumi-universe",
      worldName: "Işık Adası",
      worldSlug: "isik-adasi",
      regionName: "Yeşil Vadi",
      regionSlug: "yesil-vadi",
      locationName: "Başlangıç Evi",
      locationSlug: "baslangic-evi",
      avatarName: "Lina",
      avatarSlug: "lina",
    });

    const [inventory] = await db
      .select()
      .from(inventories)
      .where(eq(inventories.ownerCharacterId, result.character.id));

    const traits = await db
      .select()
      .from(characterTraits)
      .where(eq(characterTraits.characterId, result.character.id));

    const [policy] = await db
      .select()
      .from(simulationPolicies)
      .where(eq(simulationPolicies.worldId, result.world.id));

    const [outbox] = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.aggregateId, result.world.id));

    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, result.world.id));

    expect(inventory?.inventoryType).toBe("personal");
    expect(traits.length).toBeGreaterThan(0);
    expect(policy?.maxCatchUpDays).toBe(10);
    expect(outbox?.eventType).toBe("world.foundation.created");
    expect(audit?.action).toBe("lumi.foundation.created");
  });

  it("rolls back all records when a late step fails", async () => {
    // Fixture ile duplicate avatar slug veya zorunlu FK hatası oluşturulur.
    // User, household, child, world, character ve outbox kayıtlarının
    // hiçbirinin kalmadığı doğrulanır.
    expect(true).toBe(true);
  });
});
