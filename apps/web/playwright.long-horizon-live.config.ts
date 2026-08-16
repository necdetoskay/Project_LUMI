import { defineConfig, devices } from "@playwright/test";

const liveEnabled = process.env.LUMI_LONG_HORIZON_LIVE === "1";
const baseURL = process.env.LUMI_LONG_HORIZON_BASE_URL;

if (!liveEnabled) {
  throw new Error(
    "LUMI_LONG_HORIZON_LIVE=1 is required because this suite writes persistent live data and incurs real model cost.",
  );
}

if (!baseURL) {
  throw new Error("LUMI_LONG_HORIZON_BASE_URL is required for the live suite.");
}

export default defineConfig({
  testDir: "./tests/e2e/long-horizon",
  testMatch: /.*\.live\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30 * 60 * 1000,
  expect: { timeout: 60_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-live",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
