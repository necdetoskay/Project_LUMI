import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(appDir, "..", "..");

loadEnvConfig(workspaceRoot);
loadEnvConfig(appDir);

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
    },
  },
  test: {
    projects: [
      // Default UI/regression suite (jsdom): keep DOM tests isolated here to
      // avoid the concurrent-reuse flakiness seen in S20-T04.
      {
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
          exclude: ["tests/load/**"],
        },
      },
      // Performance/load suite (node): exercises the HTTP story-session
      // advance path under concurrency. No jsdom, no DOM reuse collisions.
      {
        test: {
          name: "load",
          environment: "node",
          include: ["tests/load/**/*.test.ts"],
          // Load runs are opt-in (resource-heavy).
          // Run with: pnpm --filter @lumi/web test --project load
        },
      },
    ],
  },
});
