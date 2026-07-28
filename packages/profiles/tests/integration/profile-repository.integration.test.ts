import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleHouseholdRepository } from "../../src/db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../../src/db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleParentPolicyRepository } from "../../src/db/repositories/drizzle/drizzle-parent-policy.repository";

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
let destructiveTestsEnabled = false;

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID_2 = "00000000-0000-0000-0000-000000000002";

beforeAll(async () => {
  const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
  const allowDestructive = process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";

  if (!databaseUrl || !allowDestructive) {
    console.warn(
      "Skipping profile integration tests because PROFILE_TEST_DATABASE_URL and PROFILE_TEST_ENABLE_DESTRUCTIVE=true are required.",
    );
    return;
  }

  try {
    queryClient = postgres(databaseUrl, { max: 1 });
    db = drizzle(queryClient);
    destructiveTestsEnabled = true;

    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS profile`);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationPath = resolve(
      __dirname,
      "..",
      "..",
      "migrations",
      "0001_profile_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");
    await db.execute(sql.raw(migrationSql));
  } catch (error) {
    destructiveTestsEnabled = false;
    console.warn("Profile integration database unavailable - skipping integration tests");
    console.warn(error);
  }
});

afterAll(async () => {
  if (queryClient && destructiveTestsEnabled) {
    await db!.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
    await queryClient.end();
  }
});

function itIfDb(name: string, fn: () => void | Promise<void>) {
  const runner = destructiveTestsEnabled ? it : it.skip;
  return runner(name, fn);
}

describe("HouseholdRepository Integration", () => {
  const repo = () => new DrizzleHouseholdRepository(db as any);

  itIfDb("creates and retrieves a household for a member", async () => {
    const household = await repo().create({
      id: crypto.randomUUID(),
      name: "Test Family",
      slug: `test-family-${crypto.randomUUID()}`,
    });

    await repo().addMember({
      householdId: household.id,
      userId: TEST_USER_ID,
      membershipRole: "owner",
      isActive: true,
      joinedAt: new Date(),
    });

    const found = await repo().findByIdForUser(household.id, TEST_USER_ID);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Test Family");
  });

  itIfDb("returns null for non-member household access", async () => {
    const household = await repo().create({
      id: crypto.randomUUID(),
      name: "Hidden Family",
      slug: `hidden-family-${crypto.randomUUID()}`,
    });

    const found = await repo().findByIdForUser(household.id, TEST_USER_ID);
    expect(found).toBeNull();
  });

  itIfDb("soft deletes household only for an owner", async () => {
    const household = await repo().create({
      id: crypto.randomUUID(),
      name: "To Delete",
      slug: `to-delete-${crypto.randomUUID()}`,
    });

    await repo().addMember({
      householdId: household.id,
      userId: TEST_USER_ID,
      membershipRole: "owner",
      isActive: true,
      joinedAt: new Date(),
    });

    await repo().softDelete(household.id, TEST_USER_ID);
    const found = await repo().findById(household.id);
    expect(found).toBeNull();
  });
});

describe("ChildProfileRepository Integration", () => {
  const hRepo = () => new DrizzleHouseholdRepository(db as any);
  const cRepo = () => new DrizzleChildProfileRepository(db as any);

  itIfDb("creates and retrieves child profile within household scope", async () => {
    const household = await hRepo().create({
      id: crypto.randomUUID(),
      name: "Child Test",
      slug: `child-test-${crypto.randomUUID()}`,
    });

    const profile = await cRepo().create({
      id: crypto.randomUUID(),
      householdId: household.id,
      displayName: "Test Child",
      ageBand: "6-8",
      locale: "tr-TR",
    });

    const found = await cRepo().findById(profile.id, household.id);
    expect(found).not.toBeNull();
    expect(found!.displayName).toBe("Test Child");
  });

  itIfDb("does not expose profile across households", async () => {
    const h1 = await hRepo().create({
      id: crypto.randomUUID(),
      name: "Isolation A",
      slug: `isolation-a-${crypto.randomUUID()}`,
    });
    const h2 = await hRepo().create({
      id: crypto.randomUUID(),
      name: "Isolation B",
      slug: `isolation-b-${crypto.randomUUID()}`,
    });

    const profile = await cRepo().create({
      id: crypto.randomUUID(),
      householdId: h1.id,
      displayName: "Child H1",
      ageBand: "6-8",
    });

    const hidden = await cRepo().findById(profile.id, h2.id);
    expect(hidden).toBeNull();
  });

  itIfDb("upserts preferences only for the matching household", async () => {
    const household = await hRepo().create({
      id: crypto.randomUUID(),
      name: "Pref Test",
      slug: `pref-test-${crypto.randomUUID()}`,
    });

    const profile = await cRepo().create({
      id: crypto.randomUUID(),
      householdId: household.id,
      displayName: "Pref Child",
      ageBand: "9-12",
    });

    const prefs = await cRepo().upsertPreferences(household.id, {
      childProfileId: profile.id,
      storyLength: "long",
      interactionLevel: 4,
      imageEnabled: true,
      audioEnabled: false,
    });

    expect(prefs.storyLength).toBe("long");
    await expect(cRepo().findPreferences(profile.id, household.id)).resolves.not.toBeNull();
  });
});

describe("ParentPolicyRepository Integration", () => {
  const hRepo = () => new DrizzleHouseholdRepository(db as any);
  const pRepo = () => new DrizzleParentPolicyRepository(db as any);

  itIfDb("creates and retrieves parent policy for an owner", async () => {
    const household = await hRepo().create({
      id: crypto.randomUUID(),
      name: "Policy Test",
      slug: `policy-test-${crypto.randomUUID()}`,
    });

    await hRepo().addMember({
      householdId: household.id,
      userId: TEST_USER_ID,
      membershipRole: "owner",
      isActive: true,
      joinedAt: new Date(),
    });

    const policy = await pRepo().upsert(
      {
        householdId: household.id,
        maxDailyStories: 5,
        contentBoundary: "moderate",
        requireParentApprovalForAi: true,
        allowImageGeneration: false,
        allowTts: true,
      },
      TEST_USER_ID,
    );

    expect(policy.maxDailyStories).toBe(5);

    const found = await pRepo().findByHousehold(household.id, TEST_USER_ID);
    expect(found).not.toBeNull();
  });

  itIfDb("rejects policy writes from non-owners", async () => {
    const household = await hRepo().create({
      id: crypto.randomUUID(),
      name: "Policy Guard",
      slug: `policy-guard-${crypto.randomUUID()}`,
    });

    await hRepo().addMember({
      householdId: household.id,
      userId: TEST_USER_ID_2,
      membershipRole: "member",
      isActive: true,
      joinedAt: new Date(),
    });

    await expect(
      pRepo().upsert(
        {
          householdId: household.id,
          maxDailyStories: 2,
          contentBoundary: "strict",
          requireParentApprovalForAi: false,
          allowImageGeneration: true,
          allowTts: false,
        },
        TEST_USER_ID_2,
      ),
    ).rejects.toThrow("UNAUTHORIZED_HOUSEHOLD_POLICY_ACCESS");
  });
});
