import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzleMediaAssetRepository } from "../../src/db/repositories/drizzle/drizzle-media-asset.repository";
import type { StoredAsset } from "../../src/domain/asset";
import { SCOPE } from "../fixtures/media.fixtures";

const enabled = process.env.MEDIA_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

describe("DrizzleMediaAssetRepository integration", () => {
  let pool: pg.Pool | undefined;
  let db: ReturnType<typeof createDatabase>;
  let repo: DrizzleMediaAssetRepository;
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
      "0001_media_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");

    await pool.query("DROP SCHEMA IF EXISTS media CASCADE");
    await pool.query(migrationSql);

    db = createDatabase(dbUrl);
    repo = new DrizzleMediaAssetRepository(db);
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS media CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("stores asset metadata without binary payload", async () => {
    if (!enabled || !connected) return;

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "image",
      assetType: "scene",
      mimeType: "image/png",
      storageProvider: "memory",
      storageKey: "media/household/child/image/scene/fp.png",
      checksum: "abc123",
      byteSize: 123,
      width: 1024,
      height: 1024,
      lifecycleStatus: "active",
      scope: SCOPE,
      fingerprint: "fp-scene-1",
      createdAt: new Date(),
    };

    const stored = await repo.createAsset(asset);
    expect(stored.id).toBe(asset.id);

    const found = await repo.getAssetInScope(asset.id, SCOPE);
    expect(found?.storageKey).toBe(asset.storageKey);
    expect(found?.width).toBe(1024);
  });

  it("is isolated by household scope", async () => {
    if (!enabled || !connected) return;

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "image",
      assetType: "icon",
      mimeType: "image/png",
      storageProvider: "memory",
      storageKey: "media/other/image/icon/fp.png",
      checksum: "def456",
      byteSize: 55,
      lifecycleStatus: "active",
      scope: SCOPE,
      fingerprint: "fp-scope-1",
      createdAt: new Date(),
    };
    await repo.createAsset(asset);

    const foreignScope = {
      ...SCOPE,
      householdId: "99999999-9999-4999-8999-999999999999",
    };
    const found = await repo.getAssetInScope(asset.id, foreignScope);
    expect(found).toBeNull();
  });

  it("is isolated by child profile scope", async () => {
    if (!enabled || !connected) return;

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "image",
      assetType: "icon",
      mimeType: "image/png",
      storageProvider: "memory",
      storageKey: "media/child/image/icon/fp.png",
      checksum: "scope789",
      byteSize: 89,
      lifecycleStatus: "active",
      scope: SCOPE,
      fingerprint: "fp-child-scope-1",
      createdAt: new Date(),
    };
    await repo.createAsset(asset);

    const foreignScope = {
      ...SCOPE,
      childProfileId: "88888888-8888-4888-8888-888888888888",
    };
    const found = await repo.getAssetInScope(asset.id, foreignScope);
    expect(found).toBeNull();

    const fingerprintHit = await repo.getAssetByFingerprint(
      asset.fingerprint,
      foreignScope,
    );
    expect(fingerprintHit).toBeNull();
  });

  it("finds asset by fingerprint within household", async () => {
    if (!enabled || !connected) return;

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "audio",
      assetType: "narration",
      mimeType: "audio/mpeg",
      storageProvider: "memory",
      storageKey: "media/household/audio/narration/fp2.mp3",
      checksum: "fff111",
      byteSize: 300,
      durationSeconds: 12,
      lifecycleStatus: "active",
      scope: SCOPE,
      fingerprint: "fp-narration-1",
      createdAt: new Date(),
    };
    await repo.createAsset(asset);

    const found = await repo.getAssetByFingerprint("fp-narration-1", SCOPE);
    expect(found?.assetType).toBe("narration");
  });

  it("updates lifecycle to archived", async () => {
    if (!enabled || !connected) return;

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "image",
      assetType: "thumbnail",
      mimeType: "image/png",
      storageProvider: "memory",
      storageKey: "media/household/image/thumb/fp3.png",
      checksum: "ggg222",
      byteSize: 20,
      lifecycleStatus: "active",
      scope: SCOPE,
      fingerprint: "fp-thumb-1",
      createdAt: new Date(),
    };
    await repo.createAsset(asset);

    const archived = await repo.updateLifecycle(asset.id, "archived");
    expect(archived?.lifecycleStatus).toBe("archived");
  });
});
