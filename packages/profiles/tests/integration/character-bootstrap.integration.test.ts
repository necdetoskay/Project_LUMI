import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleHouseholdRepository } from "../../src/db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../../src/db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleParentPolicyRepository } from "../../src/db/repositories/drizzle/drizzle-parent-policy.repository";

import { lumiCharacters } from "../../src/db/schema/profile/lumi-characters";
import { DomainError, NotFoundError, ValidationError, AuthorizationError } from "../../src/domain";
import {
  createOrReplaceFirstRunHandoff,
  consumeHandoffAndCreateCharacter,
  generateAndPersistOriginPackages,
  getCharacterBootstrapStatus,
} from "../../src/application";

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
let destructiveTestsEnabled = false;

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATION_DIR = resolve(__dirname, "..", "..", "migrations");

beforeAll(async () => {
  const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
  const allowDestructive = process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";

  if (!databaseUrl || !allowDestructive) {
    console.warn(
      "Skipping character bootstrap integration tests: PROFILE_TEST_DATABASE_URL + PROFILE_TEST_ENABLE_DESTRUCTIVE=true required.",
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
    console.warn("Character integration database unavailable - skipping tests");
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
  const runner = destructiveTestsEnabled ? it : it.skip;
  return runner(name, fn);
}

async function setupHouseholdAndProfileWithPolicy(
  householdSuffix: string,
  ageBand: "3-5" | "6-8" | "9-12" | "13+",
  userId: string = TEST_USER_ID,
) {
  const d = db!;
  const householdRepo = new DrizzleHouseholdRepository(d as never);
  const childRepo = new DrizzleChildProfileRepository(d as never);
  const policyRepo = new DrizzleParentPolicyRepository(d as never);

  const household = await householdRepo.create({
    id: crypto.randomUUID(),
    name: `Sprint 04 Test Family ${householdSuffix}`,
    slug: `s04-test-${householdSuffix.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
  });
  await householdRepo.addMember({
    householdId: household.id,
    userId,
    membershipRole: "owner",
  });

  const profile = await childRepo.create({
    id: crypto.randomUUID(),
    householdId: household.id,
    displayName: `Child ${householdSuffix}`,
    ageBand,
  });
  const policy = await policyRepo.upsert(
    {
      householdId: household.id,
      maxDailyStories: 3,
      contentBoundary: "moderate",
      timeLimitMinutes: 60,
      requireParentApprovalForAi: false,
      allowImageGeneration: true,
      allowTts: true,
    },
    userId,
  );
  return { household, profile, policy };
}

async function setupHouseholdAndProfileWithoutPolicy(
  householdSuffix: string,
  ageBand: "3-5" | "6-8" | "9-12" | "13+",
  userId: string = TEST_USER_ID,
) {
  const d = db!;
  const householdRepo = new DrizzleHouseholdRepository(d as never);
  const childRepo = new DrizzleChildProfileRepository(d as never);

  const household = await householdRepo.create({
    id: crypto.randomUUID(),
    name: `Sprint 04 Test Family ${householdSuffix}`,
    slug: `s04-test-${householdSuffix.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
  });
  await householdRepo.addMember({
    householdId: household.id,
    userId,
    membershipRole: "owner",
  });

  const profile = await childRepo.create({
    id: crypto.randomUUID(),
    householdId: household.id,
    displayName: `Child ${householdSuffix}`,
    ageBand,
  });

  return { household, profile };
}
describe("Character Bootstrap Application Service + DB Integration", () => {
  itIfDb(
    "happy path: create handoff → origin packages → consume → character + consumption records created",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Happy",
        "6-8",
      );

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "auto",
      });
      expect(handoff.characterType).toBe("explorer");
      expect(handoff.originMode).toBe("auto");

      const beforePackages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(beforePackages).toHaveLength(4);
      const firstPkg = beforePackages[0]!;
      expect(firstPkg.broadKind).toBeTruthy();
      expect(firstPkg.toneVector.length).toBeGreaterThanOrEqual(1);
      expect(firstPkg.noveltyMarkers.length).toBeGreaterThanOrEqual(1);

      const statusBefore = await getCharacterBootstrapStatus(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(statusBefore.latestHandoff?.id).toBe(handoff.id);
      expect(statusBefore.handoffConsumed).toBe(false);
      expect(statusBefore.character).toBeNull();
      expect(statusBefore.profileArchived).toBe(false);
      expect(statusBefore.originPackageCount).toBe(4);

      const result = await consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: firstPkg.id,
        manualOverrides: {
          name: "Mutlu Lumi",
        },
      });

      expect(result.character.name).toBe("Mutlu Lumi");
      expect(result.character.householdId).toBe(household.id);
      expect(result.handoffConsumptionId).toBeTruthy();

      const statusAfter = await getCharacterBootstrapStatus(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(statusAfter.handoffConsumed).toBe(true);
      expect(statusAfter.consumedByUserId).toBe(TEST_USER_ID);
      expect(statusAfter.character?.id).toBe(result.character.id);
      expect(statusAfter.character?.name).toBe("Mutlu Lumi");

      const characterRecord = await db!.select({ id: lumiCharacters.id, softDeleted: lumiCharacters.deletedAt })
        .from(lumiCharacters)
        .where(eq(lumiCharacters.id, result.character.id))
        .limit(1);
      expect(characterRecord).toHaveLength(1);
      expect(characterRecord[0]!.softDeleted).toBeNull();
    },
  );

  itIfDb(
    "cannot start bootstrap using an archived child profile",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Archived",
        "9-12",
      );
      const childRepo = new DrizzleChildProfileRepository(db as never);
      await childRepo.softDelete(profile.id, household.id);

      const promise = createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "auto",
      });
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toHaveProperty("code", "PROFILE_ARCHIVED");
    },
  );

  itIfDb(
    "prevents cross-household origin package spoofing on consume",
    async () => {
      const setup1 = await setupHouseholdAndProfileWithPolicy("HouseA", "6-8", TEST_USER_ID);
      const setup2 = await setupHouseholdAndProfileWithPolicy("HouseB", "6-8", OTHER_USER_ID);
      const householdRepo = new DrizzleHouseholdRepository(db as never);
      await householdRepo.addMember({
        householdId: setup1.household.id,
        userId: OTHER_USER_ID,
        membershipRole: "guardian",
      });

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: setup1.household.id,
        childProfileId: setup1.profile.id,
        characterType: "dreamer",
        originMode: "auto",
      });
      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        setup1.household.id,
        setup1.profile.id,
      );
      const first = packages[0]!;

      const crossAttempt = consumeHandoffAndCreateCharacter(OTHER_USER_ID, {
        householdId: setup2.household.id,
        childProfileId: setup2.profile.id,
        handoffId: handoff.id,
        originPackageId: first.id,
      });
      await expect(crossAttempt).rejects.toThrow();
    },
  );

  itIfDb(
    "cannot consume the same handoff twice (idempotency + unique consumption DB guard)",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Duplicate",
        "3-5",
      );

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "helper",
        originMode: "manual",
      });
      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(packages).toHaveLength(1);

      const first = packages[0]!;
      await consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: first.id,
      });

      const secondConsumeAttempt = consumeHandoffAndCreateCharacter(
        TEST_USER_ID,
        {
          householdId: household.id,
          childProfileId: profile.id,
          handoffId: handoff.id,
          originPackageId: first.id,
        },
      );
      await expect(secondConsumeAttempt).rejects.toThrow(DomainError);
      await expect(secondConsumeAttempt).rejects.toHaveProperty(
        "code",
        "HANDOFF_ALREADY_CONSUMED",
      );
    },
  );

  itIfDb(
    "does not allow regenerating origin packages after consume",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "PostConsume",
        "13+",
      );

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "storyteller",
        originMode: "auto",
      });
      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );

      await consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: packages[0]!.id,
      });

      const regenAttempt = generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      await expect(regenAttempt).rejects.toThrow(DomainError);
      await expect(regenAttempt).rejects.toHaveProperty(
        "code",
        "HANDOFF_ALREADY_CONSUMED",
      );
    },
  );


  itIfDb(
    "returns MISSING_PARENT_POLICY when consuming without parent policy",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithoutPolicy(
        "NoPolicy",
        "6-8",
      );

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "manual",
      });

      const consumeAttempt = consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      });

      await expect(consumeAttempt).rejects.toThrow(ValidationError);
      await expect(consumeAttempt).rejects.toHaveProperty(
        "code",
        "MISSING_PARENT_POLICY",
      );
    },
  );

  itIfDb(
    "rejects invalid character type or origin mode on handoff create",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Invalid",
        "6-8",
      );

      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "unknown-type",
          originMode: "auto",
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "other-mode",
        }),
      ).rejects.toThrow(ValidationError);
    },
  );

  itIfDb(
    "unknown profile returns NotFoundError when querying bootstrap status for foreign household",
    async () => {
      const { household } = await setupHouseholdAndProfileWithPolicy(
        "Missing",
        "6-8",
      );
      const fake = "ffffffff-ffff-ffff-ffff-ffffffffffff";
      await expect(
        getCharacterBootstrapStatus(TEST_USER_ID, household.id, fake),
      ).rejects.toThrow(NotFoundError);
    },
  );

  itIfDb(
    "cross-scope user cannot query or mutate bootstrap state",
    async () => {
      const ownerSetup = await setupHouseholdAndProfileWithPolicy(
        "OwnerOnly",
        "9-12",
        TEST_USER_ID,
      );

      const createAttempt = createOrReplaceFirstRunHandoff(OTHER_USER_ID, {
        householdId: ownerSetup.household.id,
        childProfileId: ownerSetup.profile.id,
        characterType: "inventor",
        originMode: "auto",
      });
      await expect(createAttempt).rejects.toThrow(AuthorizationError);

      const statusAttempt = getCharacterBootstrapStatus(
        OTHER_USER_ID,
        ownerSetup.household.id,
        ownerSetup.profile.id,
      );
      await expect(statusAttempt).rejects.toThrow(AuthorizationError);
    },
  );
});
