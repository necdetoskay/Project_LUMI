import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleConsentRepository } from "../../src/db/repositories/drizzle/drizzle-consent.repository";
import { DrizzleDataLifecycleAuditRepository } from "../../src/db/repositories/drizzle/drizzle-data-lifecycle-audit.repository";
import { DrizzleDataExportRepository } from "../../src/db/repositories/drizzle/drizzle-data-export.repository";
import type { QueryExecutor } from "../../src/db/client";

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
const databaseUrl = process.env.PRIVACY_TEST_DATABASE_URL;
const destructiveTestsEnabled =
  Boolean(databaseUrl) &&
  process.env.PRIVACY_TEST_ENABLE_DESTRUCTIVE === "true";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000101";
const TEST_HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000201";
const TEST_CHILD_ID = "00000000-0000-0000-0000-000000000301";

beforeAll(async () => {
  if (!destructiveTestsEnabled) {
    console.warn(
      "Skipping privacy integration tests because PRIVACY_TEST_DATABASE_URL and PRIVACY_TEST_ENABLE_DESTRUCTIVE=true are required.",
    );
    return;
  }

  try {
    queryClient = postgres(databaseUrl!, { max: 1 });
    db = drizzle(queryClient);

    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS privacy`);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationPath = resolve(
      __dirname,
      "..",
      "..",
      "migrations",
      "0001_privacy_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");
    await db.execute(sql.raw(migrationSql));
  } catch (error) {
    console.error("Privacy integration database setup failed");
    throw error;
  }
});

afterAll(async () => {
  if (queryClient && destructiveTestsEnabled) {
    await db!.execute(sql`DROP SCHEMA IF EXISTS privacy CASCADE`);
    await queryClient.end();
  }
});

function itIfDb(name: string, fn: () => void | Promise<void>) {
  const runner = destructiveTestsEnabled ? it : it.skip;
  return runner(name, fn);
}

describe("ConsentRepository Integration", () => {
  const repo = () =>
    new DrizzleConsentRepository(db as unknown as QueryExecutor);

  itIfDb("creates and retrieves a household consent", async () => {
    const record = await repo().create({
      id: crypto.randomUUID(),
      householdId: TEST_HOUSEHOLD_ID,
      childProfileId: null,
      consentType: "data_processing",
      status: "granted",
      grantedAt: new Date(),
      revokedAt: null,
      grantedBy: TEST_USER_ID,
    });

    const found = await repo().findById(record.id);
    expect(found).not.toBeNull();
    expect(found!.consentType).toBe("data_processing");
    expect(found!.status).toBe("granted");
  });

  itIfDb("filters consents by consent type", async () => {
    await repo().create({
      id: crypto.randomUUID(),
      householdId: TEST_HOUSEHOLD_ID,
      childProfileId: TEST_CHILD_ID,
      consentType: "media_generation",
      status: "granted",
      grantedAt: new Date(),
      revokedAt: null,
      grantedBy: TEST_USER_ID,
    });

    const filtered = await repo().findByChildProfile(
      TEST_CHILD_ID,
      "media_generation",
    );
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.consentType === "media_generation")).toBe(
      true,
    );
  });

  itIfDb("revokes a consent and prevents double revoke", async () => {
    const record = await repo().create({
      id: crypto.randomUUID(),
      householdId: TEST_HOUSEHOLD_ID,
      childProfileId: TEST_CHILD_ID,
      consentType: "voice_recording",
      status: "granted",
      grantedAt: new Date(),
      revokedAt: null,
      grantedBy: TEST_USER_ID,
    });

    const revoked = await repo().updateStatus(record.id, "revoked", new Date());
    expect(revoked).not.toBeNull();
    expect(revoked!.status).toBe("revoked");

    const double = await repo().updateStatus(record.id, "revoked", new Date());
    expect(double).toBeNull();
  });
});

describe("DataLifecycleAuditRepository Integration", () => {
  const repo = () =>
    new DrizzleDataLifecycleAuditRepository(db as unknown as QueryExecutor);

  itIfDb("appends and lists audit entries for a household", async () => {
    await repo().append({
      id: crypto.randomUUID(),
      householdId: TEST_HOUSEHOLD_ID,
      actorId: TEST_USER_ID,
      action: "consent.grant",
      subjectType: "child_profile",
      subjectId: TEST_CHILD_ID,
      beforeState: {},
      afterState: { consentType: "data_processing" },
    });

    const entries = await repo().listByHousehold(TEST_HOUSEHOLD_ID);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.action === "consent.grant")).toBe(true);
  });
});

describe("DataExportRepository Integration", () => {
  const repo = () =>
    new DrizzleDataExportRepository(db as unknown as QueryExecutor);

  itIfDb("creates and lists export records for a child", async () => {
    const payload = {
      exportFormat: "lumi-child-v1",
      childProfile: { id: TEST_CHILD_ID },
    };

    await repo().create({
      id: crypto.randomUUID(),
      householdId: TEST_HOUSEHOLD_ID,
      childProfileId: TEST_CHILD_ID,
      requestedBy: TEST_USER_ID,
      exportFormat: "lumi-child-v1",
      status: "generated",
      payload,
    });

    const records = await repo().listByChildProfile(
      TEST_CHILD_ID,
      TEST_HOUSEHOLD_ID,
    );
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]!.payload).toEqual(payload);
  });
});
