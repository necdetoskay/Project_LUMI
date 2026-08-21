import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleCharacterRepository } from "../../src/db/repositories/drizzle/drizzle-character.repository";

const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
const destructiveTestsEnabled =
  Boolean(databaseUrl) &&
  process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATION_DIR = resolve(__dirname, "..", "..", "migrations");

beforeAll(async () => {
  if (!destructiveTestsEnabled) return;

  queryClient = postgres(databaseUrl!, { max: 1 });
  db = drizzle(queryClient);

  await db.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
  await db.execute(sql`CREATE SCHEMA profile`);

  const migrationFiles = readdirSync(MIGRATION_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    await db.execute(sql.raw(readFileSync(join(MIGRATION_DIR, file), "utf-8")));
  }
});

afterAll(async () => {
  if (db && destructiveTestsEnabled) {
    await db.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
  }
  if (queryClient) await queryClient.end();
});

const itIfDb = destructiveTestsEnabled ? it : it.skip;

describe("DrizzleCharacterRepository child-avatar read contract", () => {
  itIfDb("keeps primary-avatar reads isolated while preserving polymorphic NPC reads", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const npcId = crypto.randomUUID();
    const avatarId = crypto.randomUUID();
    const oldCreatedAt = new Date(Date.now() - 60_000).toISOString();
    const freshCreatedAt = new Date().toISOString();

    await db!.execute(sql`
      INSERT INTO profile.households (id, name, slug)
      VALUES (${householdId}, 'Avatar Selection Family', ${`avatar-selection-${householdId}`})
    `);

    await db!.execute(sql`
      INSERT INTO profile.child_profiles
        (id, household_id, display_name, age_band, age_years, locale, metadata)
      VALUES
        (${childProfileId}, ${householdId}, 'D Child', '6-8', 6, 'tr-TR', '{}'::jsonb)
    `);

    const insertCharacter = async (
      id: string,
      name: string,
      characterSubtype: "npc" | "child_avatar",
      createdAt: string,
    ) => {
      await db!.execute(sql`
        INSERT INTO profile.lumi_characters (
          id,
          child_profile_id,
          household_id,
          name,
          broad_kind,
          character_type,
          subtype,
          origin_mode,
          first_origin_package_id,
          origin_concept,
          starting_region_archetype,
          starting_location,
          home_archetype,
          nearby_npc_seed,
          first_mystery_seed,
          universe_seed,
          safety_bounds,
          character_subtype,
          lifecycle_stage,
          version,
          created_at,
          updated_at
        ) VALUES (
          ${id},
          ${childProfileId},
          ${householdId},
          ${name},
          'human',
          'explorer',
          'Test subtype',
          'auto',
          ${crypto.randomUUID()},
          'Test origin concept',
          'test-region',
          'test-location',
          'test-home',
          'test-npc-seed',
          'test-mystery-seed',
          'test-universe-seed',
          '{"ageBand":"6-8","contentBoundary":"moderate","requireParentApprovalForAi":false}'::jsonb,
          ${characterSubtype},
          'childhood',
          1,
          ${createdAt},
          ${createdAt}
        )
      `);
    };

    await insertCharacter(npcId, "Older Bootstrap NPC", "npc", oldCreatedAt);
    await insertCharacter(
      avatarId,
      "Fresh Child Avatar",
      "child_avatar",
      freshCreatedAt,
    );

    const repository = new DrizzleCharacterRepository(db! as never);

    const explicitPrimary = await repository.findPrimaryChildAvatarByChildProfile(
      childProfileId,
      householdId,
    );
    expect(explicitPrimary?.id).toBe(avatarId);
    expect(explicitPrimary?.characterSubtype).toBe("child_avatar");

    const compatibilityPrimary = await repository.findByChildProfile(
      childProfileId,
      householdId,
    );
    expect(compatibilityPrimary?.id).toBe(avatarId);
    expect(compatibilityPrimary?.characterSubtype).toBe("child_avatar");

    const genericNpc = await repository.findById(npcId, householdId);
    expect(genericNpc?.id).toBe(npcId);
    expect(genericNpc?.characterSubtype).toBe("npc");

    const avatarOnlyNpc = await repository.findChildAvatarById(
      npcId,
      householdId,
    );
    expect(avatarOnlyNpc).toBeNull();

    const avatarById = await repository.findChildAvatarById(
      avatarId,
      householdId,
    );
    expect(avatarById?.id).toBe(avatarId);
    expect(avatarById?.characterSubtype).toBe("child_avatar");

    const allCharacters = await repository.listByHousehold(householdId);
    expect(allCharacters.map((record) => record.id)).toEqual([
      npcId,
      avatarId,
    ]);

    const childAvatars = await repository.listChildAvatarsByHousehold(
      householdId,
    );
    expect(childAvatars.map((record) => record.id)).toEqual([avatarId]);
    expect(childAvatars.every((record) => record.characterSubtype === "child_avatar")).toBe(true);
  });
});
