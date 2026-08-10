import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// These S51 runtime modules are JavaScript by design; importing them here keeps
// their runtime dependencies inside Next.js standalone tracing instead of
// spawning untraced CLI processes from the production image.
// @ts-expect-error S51 runtime JS module
import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";
// @ts-expect-error S51 runtime JS module
import { createLumiDemoAuthPostgresAdapter } from "../scripts/lumi-demo-auth-db.mjs";
// @ts-expect-error S51 runtime JS module
import { createLumiDemoPostgresAdapter } from "../scripts/lumi-demo-db.mjs";
// @ts-expect-error S51 runtime JS module
import { createLumiDemoStoryPostgresAdapter } from "../scripts/lumi-demo-story-db.mjs";

const DEFAULT_DEMO_PARENT_PASSWORD = "LumiDemo2026!";

export type DemoControlAction = "prepare" | "status" | "reset";

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL_REQUIRED");
  return value;
}

function repositoryRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith("/apps/web") || cwd.endsWith("\\apps\\web")
    ? resolve(cwd, "../..")
    : cwd;
}

async function ensureNpcSchemaReady(url: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const existing = await pool.query(
      "SELECT to_regclass('npc_intelligence.npc_snapshots') AS relation",
    );
    if (existing.rows[0]?.relation) return;

    await pool.query("CREATE SCHEMA IF NOT EXISTS npc_intelligence");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS npc_intelligence._npc_intelligence_migration_ledger (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await pool.query(
      "SELECT filename FROM npc_intelligence._npc_intelligence_migration_ledger ORDER BY id",
    );
    const applied = new Set<string>(
      appliedResult.rows.map((row: { filename: string }) => row.filename),
    );
    const migrationDir = resolve(
      repositoryRoot(),
      "packages/npc-intelligence/migrations",
    );
    const files = readdirSync(migrationDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(resolve(migrationDir, file), "utf8");
      await pool.query(sql);
      await pool.query(
        "INSERT INTO npc_intelligence._npc_intelligence_migration_ledger (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
        [file],
      );
    }

    const after = await pool.query(
      "SELECT to_regclass('npc_intelligence.npc_snapshots') AS relation",
    );
    if (!after.rows[0]?.relation) {
      throw new Error("NPC_SCHEMA_UPGRADE_INCOMPLETE:npc_snapshots");
    }
  } finally {
    await pool.end();
  }
}

function assertCanonicalStatus(status: {
  exists?: boolean;
  householdId?: string;
  householdKey?: string;
  manifestVersion?: string | null;
}): void {
  if (!status.exists) return;
  if (status.householdId !== LUMI_DEMO_MANIFEST.household.id) {
    throw new Error("DEMO_SCOPE_IDENTITY_MISMATCH");
  }
  if (status.householdKey !== LUMI_DEMO_MANIFEST.household.key) {
    throw new Error("DEMO_SCOPE_KEY_MISMATCH");
  }
}

async function executeDemoAction(action: DemoControlAction) {
  const url = databaseUrl();
  if (action === "prepare") {
    await ensureNpcSchemaReady(url);
  }

  const adapter = createLumiDemoPostgresAdapter(url);
  const authAdapter = createLumiDemoAuthPostgresAdapter(url);
  const storyAdapter = createLumiDemoStoryPostgresAdapter(url);

  try {
    if (action === "status") {
      const core = await adapter.inspect(LUMI_DEMO_MANIFEST);
      assertCanonicalStatus(core);
      const auth = core.exists
        ? await authAdapter.inspect(LUMI_DEMO_MANIFEST)
        : { ready: false };
      const story = core.exists
        ? await storyAdapter.inspect(LUMI_DEMO_MANIFEST)
        : { ready: false };
      return { core, auth, story };
    }

    if (action === "prepare") {
      const before = await adapter.inspect(LUMI_DEMO_MANIFEST);
      assertCanonicalStatus(before);

      let core;
      if (before.exists) {
        if (before.manifestVersion !== LUMI_DEMO_MANIFEST.manifestVersion) {
          throw new Error("DEMO_RESET_REQUIRED_FOR_VERSION_CHANGE");
        }
        core = { outcome: "already_seeded", status: before };
      } else {
        const result = await adapter.seed(LUMI_DEMO_MANIFEST);
        const after = await adapter.inspect(LUMI_DEMO_MANIFEST);
        assertCanonicalStatus(after);
        if (
          !after.exists ||
          after.manifestVersion !== LUMI_DEMO_MANIFEST.manifestVersion
        ) {
          throw new Error("DEMO_SEED_POSTCONDITION_FAILED");
        }
        core = { outcome: "seeded", result, status: after };
      }

      const auth = await authAdapter.ensure({
        manifest: LUMI_DEMO_MANIFEST,
        password:
          process.env.LUMI_DEMO_PARENT_PASSWORD ?? DEFAULT_DEMO_PARENT_PASSWORD,
      });
      const story = await storyAdapter.ensure(LUMI_DEMO_MANIFEST);
      return { core, auth, story };
    }

    await storyAdapter.reset(LUMI_DEMO_MANIFEST);
    const before = await adapter.inspect(LUMI_DEMO_MANIFEST);
    assertCanonicalStatus(before);
    const core = before.exists
      ? {
          outcome: "reset",
          result: await adapter.reset(LUMI_DEMO_MANIFEST),
          status: await adapter.inspect(LUMI_DEMO_MANIFEST),
        }
      : { outcome: "already_absent", status: before };
    const auth = await authAdapter.reset(LUMI_DEMO_MANIFEST);
    return { core, auth };
  } finally {
    await storyAdapter.close();
    await authAdapter.close();
    await adapter.close();
  }
}

export async function runDemoControl(
  action: DemoControlAction,
): Promise<string> {
  const result = await executeDemoAction(action);
  return JSON.stringify(result, null, 2);
}
