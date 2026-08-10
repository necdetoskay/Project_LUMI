import { execFile } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEMO_CONFIRMATION = "lumi-demo-v1";

export type DemoControlAction = "prepare" | "status" | "reset";

export function isDemoWebControlEnabled(): boolean {
  return process.env.LUMI_DEMO_WEB_CONTROL_ENABLED === "true";
}

export function assertDemoControlToken(candidate: string): void {
  const expected = process.env.LUMI_DEMO_WEB_CONTROL_TOKEN;
  if (!expected || expected.length < 12) {
    throw new Error("DEMO_CONTROL_TOKEN_NOT_CONFIGURED");
  }

  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("DEMO_CONTROL_FORBIDDEN");
  }
}

async function runNode(
  script: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
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
  const password = process.env.LUMI_DEMO_PARENT_PASSWORD;
  if (!password) throw new Error("LUMI_DEMO_PARENT_PASSWORD_NOT_CONFIGURED");

  return {
    // The web runtime is production-shaped, but the demo runner intentionally
    // refuses NODE_ENV=production. This override is allowed only behind the
    // explicitly enabled + token-protected demo control endpoint.
    NODE_ENV: "development",
    LUMI_DEMO_CONFIRM: DEMO_CONFIRMATION,
    LUMI_DEMO_PARENT_PASSWORD: password,
  };
}

export async function runDemoControl(
  action: DemoControlAction,
): Promise<string> {
  if (!isDemoWebControlEnabled()) throw new Error("DEMO_CONTROL_DISABLED");

  if (action === "prepare") {
    await runMigrations();
    return runNode("apps/web/scripts/lumi-demo-cli.mjs", ["seed"], demoEnv());
  }

  if (action === "reset") {
    return runNode("apps/web/scripts/lumi-demo-cli.mjs", ["reset"], demoEnv());
  }

  return runNode("apps/web/scripts/lumi-demo-cli.mjs", ["status"], demoEnv());
}
