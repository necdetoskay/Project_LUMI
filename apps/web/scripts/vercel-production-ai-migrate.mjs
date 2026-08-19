import { spawnSync } from "node:child_process";

const isProductionVercelBuild = process.env.VERCEL_ENV === "production";

if (!isProductionVercelBuild) {
  console.warn(
    `Skipping AI migrations before web build (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`,
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "Production Vercel build requires DATABASE_URL before AI migrations can run.",
  );
  process.exit(1);
}

console.warn("Applying AI migrations before production Vercel build...");

const result = spawnSync("pnpm", ["--filter", "@lumi/ai", "ai:migrate"], {
  cwd: new URL("../../..", import.meta.url),
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("Unable to start AI migration runner:", result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`AI migration runner failed with exit code ${result.status}.`);
  process.exit(result.status ?? 1);
}

console.warn("AI migrations are up to date.");
