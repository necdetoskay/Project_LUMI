import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    setupFiles: ["./tests/integration/setup-env.ts"],
    fileParallelism: false,
    poolOptions: {
      threads: { singleThread: true },
    },
    testTimeout: 120_000,
  },
});
