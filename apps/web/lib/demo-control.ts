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

const AUTH_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS parent_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  session_family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  remember_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_session_id uuid
);

CREATE TABLE IF NOT EXISTS parent_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS session_family_id uuid;
ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS remember_me boolean;
ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;
ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS replaced_by_session_id uuid;

UPDATE parent_sessions
SET
  session_family_id = COALESCE(session_family_id, gen_random_uuid()),
  remember_me = COALESCE(remember_me, false),
  last_refreshed_at = COALESCE(last_refreshed_at, created_at);

ALTER TABLE parent_sessions ALTER COLUMN session_family_id SET DEFAULT gen_random_uuid();
ALTER TABLE parent_sessions ALTER COLUMN session_family_id SET NOT NULL;
ALTER TABLE parent_sessions ALTER COLUMN remember_me SET DEFAULT false;
ALTER TABLE parent_sessions ALTER COLUMN remember_me SET NOT NULL;
ALTER TABLE parent_sessions ALTER COLUMN last_refreshed_at SET DEFAULT now();
ALTER TABLE parent_sessions ALTER COLUMN last_refreshed_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_sessions_replaced_by_session_id_fkey'
  ) THEN
    ALTER TABLE parent_sessions
      ADD CONSTRAINT parent_sessions_replaced_by_session_id_fkey
      FOREIGN KEY (replaced_by_session_id)
      REFERENCES parent_sessions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS parent_sessions_parent_id_idx ON parent_sessions(parent_id);
CREATE INDEX IF NOT EXISTS parent_sessions_active_idx ON parent_sessions(refresh_token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS parent_sessions_family_id_idx ON parent_sessions(session_family_id);
CREATE INDEX IF NOT EXISTS parent_password_reset_tokens_parent_id_idx ON parent_password_reset_tokens(parent_id);
`;

export type DemoControlAction = "prepare" | "status" | "reset";

type LedgerSpec = {
  migrationDir: string;
  ensureLedgerSql: string;
  ledgerTable: string;
};

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

function migrationFiles(relativeDir: string): string[] {
  const migrationDir = resolve(repositoryRoot(), relativeDir);
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => resolve(migrationDir, file));
}

async function applyProfileMigrations(pool: pg.Pool): Promise<void> {
  for (const filePath of migrationFiles("packages/profiles/migrations")) {
    await pool.query(readFileSync(filePath, "utf8"));
  }
}

async function applyLedgeredMigrations(
  pool: pg.Pool,
  spec: LedgerSpec,
): Promise<void> {
  await pool.query(spec.ensureLedgerSql);
  const appliedResult = await pool.query(
    `SELECT filename FROM ${spec.ledgerTable} ORDER BY id`,
  );
  const applied = new Set<string>(
    appliedResult.rows.map((row: { filename: string }) => row.filename),
  );

  const dir = resolve(repositoryRoot(), spec.migrationDir);
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(resolve(dir, file), "utf8");
    await pool.query(sql);
    await pool.query(
      `INSERT INTO ${spec.ledgerTable} (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
      [file],
    );
  }
}

async function ensureFullSchemaReady(url: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    // Canonical order matters because later domains hold foreign keys to profile.*.
    await pool.query(AUTH_SCHEMA_SQL);
    await applyProfileMigrations(pool);

    await applyLedgeredMigrations(pool, {
      migrationDir: "packages/world/migrations",
      ensureLedgerSql: `
        CREATE SCHEMA IF NOT EXISTS profile;
        CREATE TABLE IF NOT EXISTS profile._world_migration_ledger (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      ledgerTable: "profile._world_migration_ledger",
    });

    await applyLedgeredMigrations(pool, {
      migrationDir: "packages/npc-intelligence/migrations",
      ensureLedgerSql: `
        CREATE SCHEMA IF NOT EXISTS npc_intelligence;
        CREATE TABLE IF NOT EXISTS npc_intelligence._npc_intelligence_migration_ledger (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      ledgerTable: "npc_intelligence._npc_intelligence_migration_ledger",
    });

    await applyLedgeredMigrations(pool, {
      migrationDir: "packages/story/migrations",
      ensureLedgerSql: `
        CREATE SCHEMA IF NOT EXISTS story;
        CREATE TABLE IF NOT EXISTS story._story_migration_ledger (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      ledgerTable: "story._story_migration_ledger",
    });

    const requiredRelations = [
      "parent_accounts",
      "profile.households",
      "profile.child_profiles",
      "profile.worlds",
      "profile.quests",
      "npc_intelligence.npc_snapshots",
      "story.story_sessions",
    ];

    for (const relation of requiredRelations) {
      const result = await pool.query("SELECT to_regclass($1) AS relation", [
        relation,
      ]);
      if (!result.rows[0]?.relation) {
        throw new Error(`SCHEMA_READINESS_INCOMPLETE:${relation}`);
      }
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
    await ensureFullSchemaReady(url);
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
