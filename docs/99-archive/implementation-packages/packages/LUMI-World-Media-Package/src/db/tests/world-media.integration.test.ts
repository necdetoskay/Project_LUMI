import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { createWorldFoundation } from "../../application/world/create-world-foundation.use-case";
import { createHouseholdWithOwner } from "../../application/profile/create-household-with-owner.use-case";
import { closeDatabase, db } from "../client";
import {
  assetVariants,
  assets,
  childProfiles,
  householdMembers,
  households,
  locations,
  parentalSettings,
  regions,
  universes,
  users,
  worldCalendars,
  worlds,
  worldStates,
} from "../schema";

describe("world + media integration", () => {
  beforeEach(async () => {
    await db.delete(worldStates);
    await db.delete(worldCalendars);
    await db.delete(locations);
    await db.delete(regions);
    await db.delete(worlds);
    await db.delete(universes);
    await db.delete(assetVariants);
    await db.delete(assets);
    await db.delete(childProfiles);
    await db.delete(parentalSettings);
    await db.delete(householdMembers);
    await db.delete(households);
    await db.delete(users);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates an asset and a variant", async () => {
    const [asset] = await db
      .insert(assets)
      .values({
        storageProvider: "s3",
        bucket: "lumi-media",
        storageKey: "worlds/demo/cover.webp",
        mimeType: "image/webp",
        assetType: "world_cover",
      })
      .returning();

    if (!asset) {
      throw new Error("Asset not created");
    }

    await db.insert(assetVariants).values({
      assetId: asset.id,
      variantCode: "thumbnail",
      storageKey: "worlds/demo/cover-thumb.webp",
      mimeType: "image/webp",
    });

    const [variant] = await db
      .select()
      .from(assetVariants)
      .where(eq(assetVariants.assetId, asset.id));

    expect(variant?.variantCode).toBe("thumbnail");
  });

  it("creates universe, world, region, location, calendar and state atomically", async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: "world-owner@example.com",
        displayName: "World Owner",
      })
      .returning();

    if (!user) {
      throw new Error("User not created");
    }

    const household = await createHouseholdWithOwner({
      userId: user.id,
      householdName: "World Household",
      slug: "world-household",
    });

    const result = await createWorldFoundation({
      householdId: household.id,
      universeName: "LUMI Universe",
      universeSlug: "lumi-universe",
      worldName: "Işık Adası",
      worldSlug: "isik-adasi",
      startingRegionName: "Yeşil Vadi",
      startingRegionSlug: "yesil-vadi",
      startingLocationName: "Başlangıç Evi",
      startingLocationSlug: "baslangic-evi",
    });

    const [calendar] = await db
      .select()
      .from(worldCalendars)
      .where(eq(worldCalendars.worldId, result.world.id));

    const [state] = await db
      .select()
      .from(worldStates)
      .where(eq(worldStates.worldId, result.world.id));

    expect(result.location.locationType).toBe("starting_point");
    expect(calendar?.daysPerYear).toBe(360);
    expect(state?.payload).toMatchObject({
      season: "spring",
      weather: "clear",
    });
  });
});
