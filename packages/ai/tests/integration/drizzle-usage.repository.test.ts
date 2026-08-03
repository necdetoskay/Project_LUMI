import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzleUsageRepository } from "../../src/db/repositories/drizzle/drizzle-usage.repository";
import { DrizzleUsageRecorder } from "../../src/usage/drizzle-usage-recorder";

const enabled = process.env.AI_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

describe("DrizzleUsageRecorder integration", () => {
  let pool: pg.Pool | undefined;
  let db: ReturnType<typeof createDatabase>;
  let recorder: DrizzleUsageRecorder;
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
      "0001_ai_usage_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");

    await pool.query("DROP SCHEMA IF EXISTS ai CASCADE");
    await pool.query(migrationSql);

    db = createDatabase(dbUrl);
    recorder = new DrizzleUsageRecorder(db, new DrizzleUsageRepository());
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS ai CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("records usage without storing story text", async () => {
    if (!enabled || !connected) return;

    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + 250);
    await recorder.record(
      {
        promptTokens: 150,
        completionTokens: 60,
        totalTokens: 210,
        latencyMs: 250,
        costUsd: 0,
      },
      {
        requestId: "req:db-usage",
        providerId: "openrouter",
        modelId: "openrouter/test",
        task: "story_scene",
        startedAt,
        completedAt,
        attempt: 1,
        outcome: "success",
        childContent: true,
      },
    );

    const records = await recorder.recentForRequest("req:db-usage");
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record?.totalTokens).toBe(210);
    expect(record?.latencyMs).toBe(250);
    expect(record?.outcome).toBe("success");
    expect(record?.childContent).toBe(true);
    expect(Number(record?.costUsd)).toBeGreaterThan(0);
    expect(JSON.stringify(record)).not.toContain("Once upon a time");
  });

  it("stores failure state and findings for failed attempts", async () => {
    if (!enabled || !connected) return;

    const startedAt = new Date();
    await recorder.record(
      {
        promptTokens: 100,
        completionTokens: 0,
        totalTokens: 100,
        latencyMs: 30,
        costUsd: 0,
      },
      {
        requestId: "req:db-failed",
        providerId: "openrouter",
        modelId: "openrouter/test",
        task: "choice_proposal",
        startedAt,
        completedAt: new Date(),
        attempt: 1,
        outcome: "failed",
        failureState: "schema_invalid",
        validationFindings: [
          {
            kind: "schema",
            code: "SCHEMA-001",
            message: "bad",
            severity: "error",
          },
        ],
        childContent: true,
      },
    );

    const records = await recorder.recentForRequest("req:db-failed");
    expect(records).toHaveLength(1);
    expect(records[0]?.outcome).toBe("failed");
    expect(records[0]?.failureState).toBe("schema_invalid");
    expect(records[0]?.validationFindings).toHaveLength(1);
  });

  it("lists records in attempt order", async () => {
    if (!enabled || !connected) return;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await recorder.record(
        {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
          latencyMs: 10,
          costUsd: 0,
        },
        {
          requestId: "req:db-order",
          providerId: "openrouter",
          modelId: "openrouter/test",
          task: "reflection_qa",
          startedAt: new Date(),
          completedAt: new Date(),
          attempt,
          outcome: attempt === 1 ? "failed" : "success",
          ...(attempt === 1 ? { failureState: "provider_timeout" } : {}),
          childContent: false,
        },
      );
    }

    const records = await recorder.recentForRequest("req:db-order");
    expect(records).toHaveLength(2);
    expect(records[0]?.attempt).toBe(1);
    expect(records[1]?.attempt).toBe(2);
  });
});
