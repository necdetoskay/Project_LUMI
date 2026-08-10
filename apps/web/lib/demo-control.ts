import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEMO_CONFIRMATION = "lumi-demo-v1";
const DEFAULT_DEMO_PARENT_PASSWORD = "LumiDemo2026!";

export type DemoControlAction = "prepare" | "status" | "reset";

async function runNode(
  script: string,
  args: string[] = [],
  env: Partial<NodeJS.ProcessEnv> = {},
) {
  const result = await execFileAsync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    maxBuffer: 1024 * 1024,
  });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

async function runMigrations(): Promise<void> {
  const scripts = [
    "apps/web/scripts/auth-migrate.mjs",
    "packages/profiles/scripts/profile-migrate.mjs",
    "packages/world/scripts/world-migrate.mjs",
    "packages/npc-intelligence/scripts/npc-migrate.mjs",
    "packages/story/scripts/story-migrate.mjs",
  ];

  for (const script of scripts) {
    await runNode(script);
  }
}

function demoEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    LUMI_DEMO_CONFIRM: DEMO_CONFIRMATION,
    LUMI_DEMO_PARENT_PASSWORD:
      process.env.LUMI_DEMO_PARENT_PASSWORD ?? DEFAULT_DEMO_PARENT_PASSWORD,
  };
}

export async function runDemoControl(
  action: DemoControlAction,
): Promise<string> {
  if (action === "prepare") {
    await runMigrations();
    return runNode("apps/web/scripts/lumi-demo-cli.mjs", ["seed"], demoEnv());
  }

  if (action === "reset") {
    return runNode("apps/web/scripts/lumi-demo-cli.mjs", ["reset"], demoEnv());
  }

  return runNode("apps/web/scripts/lumi-demo-cli.mjs", ["status"], demoEnv());
}
