import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.LUMI_LONG_HORIZON_BASE_URL;

if (!baseURL) {
  throw new Error(
    "LUMI_LONG_HORIZON_BASE_URL is required for production smoke tests.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e/production-smoke",
  testMatch: /.*\.live\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 5 * 60 * 1000,
  expect: { timeout: 60_000 },
  use: {
    baseURL,
    actionTimeout: 60_000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium-production-smoke",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
