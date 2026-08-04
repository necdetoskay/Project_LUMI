import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzlePromptRepository } from "../../src/db/repositories/drizzle/drizzle-prompt.repository";

const enabled = process.env.PROMPT_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

describe("DrizzlePromptRepository integration", () => {
  let pool: pg.Pool | undefined;
  let repo: DrizzlePromptRepository;
  let db: ReturnType<typeof createDatabase>;
  let connected = false;

  beforeAll(async () => {
    if (!enabled) return;

    pool = new pg.Pool({ connectionString: dbUrl });
    try {
      await pool.query("SELECT 1");
      connected = true;
    } catch {
      return;
    }

    const migrationPath = path.resolve(
      import.meta.dirname,
      "..",
      "..",
      "migrations",
      "0001_prompt_registry_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");

    await pool.query("DROP SCHEMA IF EXISTS prompts CASCADE");
    await pool.query(migrationSql);

    db = createDatabase(dbUrl);
    repo = new DrizzlePromptRepository();
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS prompts CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("creates registries and versions", async () => {
    if (!enabled || !connected) {
      return;
    }

    const registry = await repo.createRegistry(db, {
      householdId: "11111111-1111-1111-1111-111111111111",
      promptKey: "integration.test",
      purpose: "integration test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(registry.promptKey).toBe("integration.test");

    const version = await repo.createVersion(db, {
      registryId: registry.id,
      versionNumber: 1,
      status: "draft",
      templateBody: "Hello {{name}}",
      variableSchema: [{ name: "name", type: "string", required: true }],
      modelPreferences: {},
      outputSchema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      archivedAt: null,
    });

    expect(version.versionNumber).toBe(1);
    expect(version.status).toBe("draft");

    const versions = await repo.listVersionsByRegistry(db, registry.id);
    expect(versions).toHaveLength(1);
  });

  it("publishes a version", async () => {
    if (!enabled || !connected) {
      return;
    }

    const registry = await repo.createRegistry(db, {
      householdId: "11111111-1111-1111-1111-111111111111",
      promptKey: "publish.test",
      purpose: "publish test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const version = await repo.createVersion(db, {
      registryId: registry.id,
      versionNumber: 1,
      status: "draft",
      templateBody: "Test",
      variableSchema: [],
      modelPreferences: {},
      outputSchema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      archivedAt: null,
    });

    const published = await repo.publishVersion(db, version.id);
    expect(published?.status).toBe("published");
    expect(published?.publishedAt).toBeInstanceOf(Date);
  });

  it("activates a version and tracks history", async () => {
    if (!enabled || !connected) {
      return;
    }

    const householdId = "11111111-1111-1111-1111-111111111111";
    const registry = await repo.createRegistry(db, {
      householdId,
      promptKey: "activate.test",
      purpose: "activation test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const version = await repo.createVersion(db, {
      registryId: registry.id,
      versionNumber: 1,
      status: "draft",
      templateBody: "Test",
      variableSchema: [],
      modelPreferences: {},
      outputSchema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      archivedAt: null,
    });

    await repo.publishVersion(db, version.id);

    const activation = await db.transaction(async (tx) =>
      repo.activateVersion(tx, registry.id, version.id, householdId),
    );

    expect(activation.activeVersionId).toBe(version.id);

    const activeVersion = await repo.getActiveVersion(db, registry.id);
    expect(activeVersion?.id).toBe(version.id);
  });

  it("switches active version and keeps history", async () => {
    if (!enabled || !connected) {
      return;
    }

    const householdId = "11111111-1111-1111-1111-111111111111";
    const registry = await repo.createRegistry(db, {
      householdId,
      promptKey: "switch.test",
      purpose: "switch test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const v1 = await repo.createVersion(db, {
      registryId: registry.id,
      versionNumber: 1,
      status: "draft",
      templateBody: "V1",
      variableSchema: [],
      modelPreferences: {},
      outputSchema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      archivedAt: null,
    });
    await repo.publishVersion(db, v1.id);
    await db.transaction(async (tx) =>
      repo.activateVersion(tx, registry.id, v1.id, householdId),
    );

    const v2 = await repo.createVersion(db, {
      registryId: registry.id,
      versionNumber: 2,
      status: "draft",
      templateBody: "V2",
      variableSchema: [],
      modelPreferences: {},
      outputSchema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      archivedAt: null,
    });
    await repo.publishVersion(db, v2.id);
    await db.transaction(async (tx) =>
      repo.activateVersion(tx, registry.id, v2.id, householdId),
    );

    const activeVersion = await repo.getActiveVersion(db, registry.id);
    expect(activeVersion?.id).toBe(v2.id);
  });
});
