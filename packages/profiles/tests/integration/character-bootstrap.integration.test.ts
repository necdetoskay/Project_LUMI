import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const mockCallOpenRouter = vi.hoisted(() => vi.fn());
const mockDecryptApiKey = vi.hoisted(() => vi.fn(() => "sk-or-v1-test-decrypted-key"));

vi.mock("../../src/application/llm-settings/openrouter-client", () => ({
  callOpenRouter: mockCallOpenRouter,
}));

vi.mock("../../src/application/llm-settings/encryption", () => ({
  decryptApiKey: mockDecryptApiKey,
  encryptApiKey: vi.fn(() => "mock-encrypted"),
  maskApiKey: vi.fn(() => "sk-or-v1...key"),
}));

import { DrizzleHouseholdRepository } from "../../src/db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../../src/db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleParentPolicyRepository } from "../../src/db/repositories/drizzle/drizzle-parent-policy.repository";
import { DrizzleArchetypeSuggestionBatchRepository } from "../../src/db/repositories/drizzle/drizzle-archetype-suggestion-batch.repository";
import { DrizzleLlmProviderSettingsRepository } from "../../src/db/repositories/drizzle/drizzle-llm-provider-settings.repository";
import { DrizzleLlmTaskModelSettingsRepository } from "../../src/db/repositories/drizzle/drizzle-llm-task-model-settings.repository";

import { lumiCharacters } from "../../src/db/schema/profile/lumi-characters";
import { archetypeSuggestionBatches } from "../../src/db/schema/profile/archetype-suggestion-batches";
import { DomainError, NotFoundError, ValidationError, AuthorizationError } from "../../src/domain";
import {
  createOrReplaceFirstRunHandoff,
  consumeHandoffAndCreateCharacter,
  generateAndPersistOriginPackages,
  getCharacterBootstrapStatus,
  generateArchetypes,
} from "../../src/application";

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
const destructiveTestsEnabled =
  Boolean(databaseUrl) && process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATION_DIR = resolve(__dirname, "..", "..", "migrations");

beforeAll(async () => {
  if (!destructiveTestsEnabled) {
    console.warn(
      "Skipping character bootstrap integration tests: PROFILE_TEST_DATABASE_URL + PROFILE_TEST_ENABLE_DESTRUCTIVE=true required.",
    );
    return;
  }

  try {
    queryClient = postgres(databaseUrl!, { max: 1 });
    db = drizzle(queryClient);

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
    console.error("Character integration database setup failed");
    throw error;
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
    name: `Sprint 07 Test Family ${householdSuffix}`,
    slug: `s07-test-${householdSuffix.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
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

async function setupArchetypeBatch(
  householdId: string,
  childProfileId: string,
  userId: string = TEST_USER_ID,
) {
  const d = db!;
  const batchRepo = new DrizzleArchetypeSuggestionBatchRepository(d as never);
  const batchId = crypto.randomUUID();
  const archetypeId = crypto.randomUUID();
  const archetypes = [
    {
      id: archetypeId,
      canonicalType: "explorer" as const,
      title: "Yıldız Haritacısı",
      description: "Yıldız haritalarını takip eden küçük bir kaşif çocuk karakteri",
      personalityHook: "Meraklı, sabırlı ve pusulasına güvenen",
      storyPromise: "Gökyüzündeki yıldızları birleştirip yeni yollar keşfeder",
      themeTags: ["keşif", "merak"],
    },
    {
      id: crypto.randomUUID(),
      canonicalType: "inventor" as const,
      title: "Çılgın Mucit",
      description: "Atölyesinde icatlar yapan bir mucit çocuk",
      personalityHook: "Yaratıcı, hata yapmaktan korkmayan",
      storyPromise: "Atık malzemeleri işe yarar araçlara dönüştürür",
      themeTags: ["icat", "yaratıcılık"],
    },
    {
      id: crypto.randomUUID(),
      canonicalType: "storyteller" as const,
      title: "Masalcı Dede",
      description: "Hikayeleriyle büyüleyen genç bir anlatıcı",
      personalityHook: "Hayalperest, dinlemeyi seven",
      storyPromise: "Masalları gerçeğe dönüştürür",
      themeTags: ["masal", "hayal"],
    },
    {
      id: crypto.randomUUID(),
      canonicalType: "helper" as const,
      title: "Yardımsever Çocuk",
      description: "Çevresine destek olan bir yardımcı karakter",
      personalityHook: "Empatik, çözüm odaklı",
      storyPromise: "Küçük yardımlarla büyük sorunları çözer",
      themeTags: ["yardım", "empati"],
    },
    {
      id: crypto.randomUUID(),
      canonicalType: "dreamer" as const,
      title: "Rüya Gezgini",
      description: "Rüya dünyasında yolculuk eden bir hayalperest",
      personalityHook: "Hayalperest, yaratıcı",
      storyPromise: "Rüyaları paylaşılabilir hikayelere dönüştürür",
      themeTags: ["rüya", "hayal"],
    },
  ];
  await batchRepo.create({
    id: batchId,
    userId,
    householdId,
    childProfileId,
    archetypes,
    modelId: "aion-labs/aion-3.0-mini",
    generationNonce: crypto.randomUUID(),
    excludedConcepts: [],
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { batchId, archetypeId, archetypes };
}

async function setupLlmConfig(householdId: string, userId: string = TEST_USER_ID) {
  const d = db!;
  const providerRepo = new DrizzleLlmProviderSettingsRepository(d as never);
  const taskRepo = new DrizzleLlmTaskModelSettingsRepository(d as never);
  await providerRepo.upsert({
    id: crypto.randomUUID(),
    userId,
    householdId,
    provider: "openrouter",
    encryptedApiKey: "test-encrypted",
    enabled: true,
  });
  await taskRepo.upsert({
    id: crypto.randomUUID(),
    userId,
    householdId,
    provider: "openrouter",
    taskType: "character_origin_generation",
    modelId: "aion-labs/aion-3.0-mini",
    reasoningLevel: "medium",
    temperature: 0.85,
    maxOutputTokens: 1800,
    enabled: true,
  });
}

function makeOriginPackageResponse(nonce: string, count: number) {
  const packages = [];
  const broadKinds = ["human", "fantasy", "robot", "animal", "sea_creature"];
  for (let i = 0; i < count; i++) {
    const concept = `Bu benzersiz bir origin konsepti #${i + 1} nonce ${nonce.slice(0, 8)}`;
    packages.push({
      broadKind: broadKinds[i % broadKinds.length],
      characterType: "explorer",
      subtype: `Origin Paket #${i + 1}-${nonce.slice(0, 4)}`,
      originConcept: concept,
      startingRegionArchetype: `region-${i}`,
      startingLocation: `safe place ${i}`,
      homeArchetype: `home ${i}`,
      nearbyNpcSeed: `npc ${i}`,
      firstMysterySeed: `mystery ${i}`,
      toneVector: ["wonder", "curiosity"],
      noveltyMarkers: [`marker a ${i}`, `marker b ${i}`],
    });
  }
  return JSON.stringify({ packages });
}

beforeEach(() => {
  mockCallOpenRouter.mockReset();
  mockCallOpenRouter.mockResolvedValue({
    content: makeOriginPackageResponse(crypto.randomUUID(), 4),
    model: "aion-labs/aion-3.0-mini",
    usage: null,
  });
});

describe("Character Bootstrap Application Service + DB Integration", () => {
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
          archetypeBatchId: crypto.randomUUID(),
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "other-mode",
          archetypeBatchId: crypto.randomUUID(),
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    },
  );

  itIfDb(
    "rejects handoff without archetypeBatchId",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "NoBatch",
        "6-8",
      );
      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: "",
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    },
  );

  itIfDb(
    "rejects handoff with non-existent archetypeBatchId",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "BadBatch",
        "6-8",
      );
      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: crypto.randomUUID(),
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    },
  );

  itIfDb(
    "rejects handoff with archetypeId not in the batch",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "NotInBatch",
        "6-8",
      );
      const { batchId } = await setupArchetypeBatch(household.id, profile.id);
      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: batchId,
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    },
  );

  itIfDb(
    "rejects handoff with archetypeId from a different household",
    async () => {
      const setup1 = await setupHouseholdAndProfileWithPolicy("A", "6-8", TEST_USER_ID);
      const setup2 = await setupHouseholdAndProfileWithPolicy("B", "6-8", OTHER_USER_ID);
      const { batchId, archetypeId } = await setupArchetypeBatch(
        setup1.household.id,
        setup1.profile.id,
      );
      await expect(
        createOrReplaceFirstRunHandoff(OTHER_USER_ID, {
          householdId: setup2.household.id,
          childProfileId: setup2.profile.id,
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: batchId,
          archetypeId,
        }),
      ).rejects.toMatchObject({ code: "ARCHETYPE_BATCH_NOT_FOUND" });
    },
  );

  itIfDb(
    "rejects expired archetype batch",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Expired",
        "6-8",
      );
      const d = db!;
      const batchRepo = new DrizzleArchetypeSuggestionBatchRepository(d as never);
      const batchId = crypto.randomUUID();
      const archetypeId = crypto.randomUUID();
      await batchRepo.create({
        id: batchId,
        userId: TEST_USER_ID,
        householdId: household.id,
        childProfileId: profile.id,
        archetypes: [
          {
            id: archetypeId,
            canonicalType: "explorer",
            title: "Valid Title Here",
            description: "A sufficiently long description text",
            personalityHook: "Personality hook content",
            storyPromise: "Story promise text",
            themeTags: ["keşif", "merak"],
          },
          { id: crypto.randomUUID(), canonicalType: "inventor", title: "Mucit Test", description: "Mucit description long text here", personalityHook: "Creative hook", storyPromise: "Promise text", themeTags: ["icat", "yaratıcılık"] },
          { id: crypto.randomUUID(), canonicalType: "storyteller", title: "Hikayeci Test", description: "Hikayeci description long text here", personalityHook: "Storyteller hook", storyPromise: "Promise text", themeTags: ["masal", "hayal"] },
          { id: crypto.randomUUID(), canonicalType: "helper", title: "Yardimci Test", description: "Yardimci description long text here", personalityHook: "Helper hook", storyPromise: "Promise text", themeTags: ["yardım", "empati"] },
          { id: crypto.randomUUID(), canonicalType: "dreamer", title: "Rüya Test", description: "Rüya description long text here", personalityHook: "Dreamer hook", storyPromise: "Promise text", themeTags: ["rüya", "hayal"] },
        ],
        modelId: "aion-labs/aion-3.0-mini",
        generationNonce: crypto.randomUUID(),
        excludedConcepts: [],
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: batchId,
          archetypeId,
        }),
      ).rejects.toThrow(ValidationError);
    },
  );

  itIfDb(
    "creates handoff with valid archetype batch and stores verified archetype in payload",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "ValidBatch",
        "6-8",
      );
      const { batchId, archetypeId, archetypes } = await setupArchetypeBatch(household.id, profile.id);
      const expected = archetypes[0]!;
      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: expected.canonicalType,
        originMode: "auto",
        archetypeBatchId: batchId,
        archetypeId,
      });
      expect(handoff.characterType).toBe("explorer");
      expect(handoff.originMode).toBe("auto");

      const status = await getCharacterBootstrapStatus(TEST_USER_ID, household.id, profile.id);
      expect(status.latestHandoff?.id).toBe(handoff.id);
    },
  );

  itIfDb(
    "archetype batch creation persists all 5 archetypes with server-generated ids",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "BatchCheck",
        "6-8",
      );
      mockCallOpenRouter.mockResolvedValueOnce({
        content: JSON.stringify({
          archetypes: [
            { canonicalType: "explorer", title: "E1 title here", description: "E1 desc text long enough", personalityHook: "E1 hook", storyPromise: "E1 promise", themeTags: ["t1", "t2"] },
            { canonicalType: "inventor", title: "I1 title here", description: "I1 desc text long enough", personalityHook: "I1 hook", storyPromise: "I1 promise", themeTags: ["t1", "t2"] },
            { canonicalType: "storyteller", title: "S1 title here", description: "S1 desc text long enough", personalityHook: "S1 hook", storyPromise: "S1 promise", themeTags: ["t1", "t2"] },
            { canonicalType: "helper", title: "H1 title here", description: "H1 desc text long enough", personalityHook: "H1 hook", storyPromise: "H1 promise", themeTags: ["t1", "t2"] },
            { canonicalType: "dreamer", title: "D1 title here", description: "D1 desc text long enough", personalityHook: "D1 hook", storyPromise: "D1 promise", themeTags: ["t1", "t2"] },
          ],
        }),
        model: "aion-labs/aion-3.0-mini",
        usage: null,
      });

      await setupLlmConfig(household.id);
      const result = await generateArchetypes(TEST_USER_ID, household.id, profile.id);
      expect(result.archetypes).toHaveLength(5);
      expect(result.batchId).toBeTruthy();
      for (const a of result.archetypes) {
        expect(a.id).toBeTruthy();
      }
      const uniqueIds = new Set(result.archetypes.map((a) => a.id));
      expect(uniqueIds.size).toBe(5);

      const d = db!;
      const stored = await d.select().from(archetypeSuggestionBatches).where(eq(archetypeSuggestionBatches.id, result.batchId)).limit(1);
      expect(stored).toHaveLength(1);
      expect((stored[0] as unknown as { archetypes: unknown[] }).archetypes).toHaveLength(5);
    },
  );

  itIfDb(
    "throws LlmConfigError when no LLM config exists",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "NoLLM",
        "6-8",
      );
      await expect(
        generateArchetypes(TEST_USER_ID, household.id, profile.id),
      ).rejects.toThrow();
    },
  );

  itIfDb(
    "happy path with mock OpenRouter: handoff + packages + consume",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Happy",
        "6-8",
      );
      await setupLlmConfig(household.id);
      const { batchId, archetypeId } = await setupArchetypeBatch(household.id, profile.id);

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "auto",
        archetypeBatchId: batchId,
        archetypeId,
      });
      expect(handoff.characterType).toBe("explorer");

      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(packages.source).toBe("llm");
      expect(packages.packages).toHaveLength(4);
      expect(packages.modelId).toBe("aion-labs/aion-3.0-mini");
      expect(packages.generationBatchId).toBeTruthy();
      const firstPkg = packages.packages[0]!;
      expect(firstPkg.broadKind).toBeTruthy();

      const status = await getCharacterBootstrapStatus(TEST_USER_ID, household.id, profile.id);
      expect(status.latestHandoff?.id).toBe(handoff.id);
      expect(status.handoffConsumed).toBe(false);
      expect(status.character).toBeNull();
      expect(status.originPackageCount).toBe(4);

      const result = await consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: firstPkg.id,
        manualOverrides: { name: "Mutlu Lumi" },
      });

      expect(result.character.name).toBe("Mutlu Lumi");
      expect(result.character.householdId).toBe(household.id);
      expect(result.handoffConsumptionId).toBeTruthy();

      const statusAfter = await getCharacterBootstrapStatus(TEST_USER_ID, household.id, profile.id);
      expect(statusAfter.handoffConsumed).toBe(true);
      expect(statusAfter.consumedByUserId).toBe(TEST_USER_ID);
      expect(statusAfter.character?.id).toBe(result.character.id);

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

      await expect(
        createOrReplaceFirstRunHandoff(TEST_USER_ID, {
          householdId: household.id,
          childProfileId: profile.id,
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: crypto.randomUUID(),
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "PROFILE_ARCHIVED" });
    },
  );

  itIfDb(
    "prevents cross-household origin package spoofing on consume",
    async () => {
      const setup1 = await setupHouseholdAndProfileWithPolicy("HouseA", "6-8", TEST_USER_ID);
      const setup2 = await setupHouseholdAndProfileWithPolicy("HouseB", "6-8", OTHER_USER_ID);
      await setupLlmConfig(setup1.household.id);
      const { batchId, archetypeId } = await setupArchetypeBatch(setup1.household.id, setup1.profile.id);

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: setup1.household.id,
        childProfileId: setup1.profile.id,
        characterType: "explorer",
        originMode: "auto",
        archetypeBatchId: batchId,
        archetypeId,
      });
      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        setup1.household.id,
        setup1.profile.id,
      );
      const first = packages.packages[0]!;

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
    "cannot consume the same handoff twice",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Duplicate",
        "3-5",
      );
      await setupLlmConfig(household.id);
      const { batchId, archetypeId } = await setupArchetypeBatch(household.id, profile.id);

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "auto",
        archetypeBatchId: batchId,
        archetypeId,
      });
      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(packages.packages).toHaveLength(4);

      const first = packages.packages[0]!;
      await consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: first.id,
      });

      const secondConsumeAttempt = consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: first.id,
      });
      await expect(secondConsumeAttempt).rejects.toThrow(DomainError);
      await expect(secondConsumeAttempt).rejects.toHaveProperty("code", "HANDOFF_ALREADY_CONSUMED");
    },
  );

  itIfDb(
    "batch inserts happen in a transaction (partial write rollback on duplicate id)",
    async () => {
      const { household, profile } = await setupHouseholdAndProfileWithPolicy(
        "Tx",
        "6-8",
      );
      await setupLlmConfig(household.id);
      const { batchId, archetypeId } = await setupArchetypeBatch(household.id, profile.id);

      await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "auto",
        archetypeBatchId: batchId,
        archetypeId,
      });

      mockCallOpenRouter.mockResolvedValueOnce({
        content: makeOriginPackageResponse(crypto.randomUUID(), 4),
        model: "aion-labs/aion-3.0-mini",
        usage: null,
      });

      const packages = await generateAndPersistOriginPackages(
        TEST_USER_ID,
        household.id,
        profile.id,
      );
      expect(packages.packages).toHaveLength(4);
      const firstBatch = packages.generationBatchId;
      expect(firstBatch).toBeTruthy();

      // Count packages in this batch
      const d = db!;
      const { characterOriginPackages } = await import("../../src/db/schema/profile/character-origin-packages");
      const before = await d.select({ id: characterOriginPackages.id, batchId: characterOriginPackages.generationBatchId })
        .from(characterOriginPackages)
        .where(eq(characterOriginPackages.generationBatchId, firstBatch!));
      expect(before).toHaveLength(4);
    },
  );

  itIfDb(
    "backfill task: provider key + existing task absent → task created with defaults",
    async () => {
      const d = db!;
      const providerRepo = new DrizzleLlmProviderSettingsRepository(d as never);
      const taskRepo = new DrizzleLlmTaskModelSettingsRepository(d as never);
      const householdId = crypto.randomUUID();
      await d.execute(sql`INSERT INTO profile.households (id, name, slug) VALUES (${householdId}, ${"backfill-h-" + crypto.randomUUID().slice(0,8)}, ${"bf-" + crypto.randomUUID().slice(0,8)})`);
      await d.execute(sql`INSERT INTO profile.household_members (household_id, user_id, membership_role) VALUES (${householdId}, ${TEST_USER_ID}, ${"owner"})`);

      await providerRepo.upsert({
        id: crypto.randomUUID(),
        userId: TEST_USER_ID,
        householdId,
        provider: "openrouter",
        encryptedApiKey: "test-encrypted-key",
        enabled: true,
      });
      const taskBefore = await taskRepo.findByTaskType(TEST_USER_ID, householdId, "character_origin_generation");
      expect(taskBefore).toBeNull();

      // Simulate the migration backfill
      const d2 = d;
      await d2.execute(sql`
        INSERT INTO profile.llm_task_model_settings (id, user_id, household_id, provider, task_type, model_id, reasoning_level, temperature, max_output_tokens, enabled, created_at, updated_at)
        SELECT gen_random_uuid(), user_id, household_id, 'openrouter', 'character_origin_generation', 'aion-labs/aion-3.0-mini', 'medium', 0.85, 1800, true, NOW(), NOW()
        FROM profile.llm_provider_settings
        WHERE provider = 'openrouter' AND encrypted_api_key IS NOT NULL AND LENGTH(encrypted_api_key) > 0
          AND NOT EXISTS (SELECT 1 FROM profile.llm_task_model_settings t WHERE t.user_id = profile.llm_provider_settings.user_id AND t.household_id = profile.llm_provider_settings.household_id AND t.task_type = 'character_origin_generation')
      `);

      const taskAfter = await taskRepo.findByTaskType(TEST_USER_ID, householdId, "character_origin_generation");
      expect(taskAfter).toBeTruthy();
      expect(taskAfter!.modelId).toBe("aion-labs/aion-3.0-mini");
      expect(taskAfter!.enabled).toBe(true);
    },
  );

  itIfDb(
    "returns MISSING_PARENT_POLICY when consuming without parent policy",
    async () => {
      const d = db!;
      const householdRepo = new DrizzleHouseholdRepository(d as never);
      const childRepo = new DrizzleChildProfileRepository(d as never);
      const household = await householdRepo.create({
        id: crypto.randomUUID(),
        name: "Sprint 07 Test Family NoPolicy",
        slug: `s07-nopolicy-${crypto.randomUUID().slice(0, 8)}`,
      });
      await householdRepo.addMember({
        householdId: household.id, userId: TEST_USER_ID, membershipRole: "owner",
      });
      const profile = await childRepo.create({
        id: crypto.randomUUID(),
        householdId: household.id,
        displayName: "NoPolicy Child",
        ageBand: "6-8",
      });
      const { batchId, archetypeId } = await setupArchetypeBatch(household.id, profile.id);

      const handoff = await createOrReplaceFirstRunHandoff(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        characterType: "explorer",
        originMode: "manual",
        archetypeBatchId: batchId,
        archetypeId,
      });

      const consumeAttempt = consumeHandoffAndCreateCharacter(TEST_USER_ID, {
        householdId: household.id,
        childProfileId: profile.id,
        handoffId: handoff.id,
        originPackageId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      });
      await expect(consumeAttempt).rejects.toThrow(ValidationError);
      await expect(consumeAttempt).rejects.toHaveProperty("code", "MISSING_PARENT_POLICY");
    },
  );

  itIfDb(
    "unknown profile returns NotFoundError when querying bootstrap status for foreign household",
    async () => {
      const { household } = await setupHouseholdAndProfileWithPolicy("Missing", "6-8");
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

      await expect(
        createOrReplaceFirstRunHandoff(OTHER_USER_ID, {
          householdId: ownerSetup.household.id,
          childProfileId: ownerSetup.profile.id,
          characterType: "inventor",
          originMode: "auto",
          archetypeBatchId: crypto.randomUUID(),
          archetypeId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(AuthorizationError);

      await expect(
        getCharacterBootstrapStatus(OTHER_USER_ID, ownerSetup.household.id, ownerSetup.profile.id),
      ).rejects.toThrow(AuthorizationError);
    },
  );
});
