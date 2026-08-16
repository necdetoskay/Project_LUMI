import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(appDir, "..", "..");

loadEnvConfig(workspaceRoot);
loadEnvConfig(appDir);

const alias = {
  "@": new URL(".", import.meta.url).pathname,
  "server-only": resolve(appDir, "tests/mocks/server-only.ts"),
};

export default defineConfig({
  test: {
    projects: [
      // Default UI/regression suite (jsdom): keep DOM tests isolated here to
      // avoid the concurrent-reuse flakiness seen in S20-T04.
      {
        resolve: { alias },
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
        resolve: { alias },
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
