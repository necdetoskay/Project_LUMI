import { spawnSync } from "node:child_process";

const isProductionVercelBuild = process.env.VERCEL_ENV === "production";

if (!isProductionVercelBuild) {
  console.warn(
    `Skipping privacy/media/prompt migrations before web build (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`,
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "Production Vercel build requires DATABASE_URL before privacy/media/prompt migrations can run.",
  );
  process.exit(1);
}

const runners = [
  {
    label: "privacy",
    packageName: "@lumi/privacy",
    script: "privacy:migrate",
  },
  {
    label: "media",
    packageName: "@lumi/media",
    script: "media:migrate",
  },
  {
    label: "prompt",
    packageName: "@lumi/prompts",
    script: "prompt:migrate",
  },
];

for (const runner of runners) {
  console.warn(
    `Applying ${runner.label} migrations before production Vercel build...`,
  );

  const result = spawnSync(
    "pnpm",
    ["--filter", runner.packageName, runner.script],
    {
      cwd: new URL("../../..", import.meta.url),
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );

  if (result.error) {
    console.error(
      `Unable to start ${runner.label} migration runner:`,
      result.error,
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(
      `${runner.label} migration runner failed with exit code ${result.status}.`,
    );
    process.exit(result.status ?? 1);
  }
}

console.warn("Privacy, media, and prompt migrations are up to date.");
