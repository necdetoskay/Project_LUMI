import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { closeDatabase, db } from "../client";
import {
  childPreferences,
  childProfiles,
  householdMembers,
  households,
  parentalSettings,
  users,
} from "../schema";
import { createHouseholdWithOwner } from "../../application/profile/create-household-with-owner.use-case";

describe("identity + profile integration", () => {
  beforeEach(async () => {
    await db.delete(childPreferences);
    await db.delete(childProfiles);
    await db.delete(parentalSettings);
    await db.delete(householdMembers);
    await db.delete(households);
    await db.delete(users);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates a user", async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: "parent@example.com",
        displayName: "Demo Parent",
      })
      .returning();

    expect(user?.email).toBe("parent@example.com");
  });

  it("prevents duplicate active email", async () => {
    await db.insert(users).values({
      email: "same@example.com",
      displayName: "First",
    });

    await expect(
      db.insert(users).values({
        email: "same@example.com",
        displayName: "Second",
      }),
    ).rejects.toBeDefined();
  });

  it("creates household owner and parental settings atomically", async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: "owner@example.com",
        displayName: "Owner",
      })
      .returning();

    if (!user) {
      throw new Error("User not created");
    }

    const household = await createHouseholdWithOwner({
      userId: user.id,
      householdName: "Demo Household",
      slug: "demo-household",
    });

    const [membership] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, household.id));

    const [settings] = await db
      .select()
      .from(parentalSettings)
      .where(eq(parentalSettings.householdId, household.id));

    expect(membership?.membershipRole).toBe("owner");
    expect(settings?.maxDailyStories).toBe(3);
  });

  it("creates child profile and preferences", async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: "child-parent@example.com",
        displayName: "Parent",
      })
      .returning();

    if (!user) {
      throw new Error("User not created");
    }

    const household = await createHouseholdWithOwner({
      userId: user.id,
      householdName: "Child Household",
      slug: "child-household",
    });

    const [child] = await db
      .insert(childProfiles)
      .values({
        householdId: household.id,
        displayName: "Lumi",
        ageBand: "6-8",
      })
      .returning();

    if (!child) {
      throw new Error("Child profile not created");
    }

    await db.insert(childPreferences).values({
      childProfileId: child.id,
      storyLength: "medium",
      interactionLevel: 3,
    });

    const [preferences] = await db
      .select()
      .from(childPreferences)
      .where(eq(childPreferences.childProfileId, child.id));

    expect(preferences?.interactionLevel).toBe(3);
  });
});
