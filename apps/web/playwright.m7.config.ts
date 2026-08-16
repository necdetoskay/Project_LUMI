import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3101";
const appUrl = new URL(baseURL);
const appPort = Number(appUrl.port || 3101);
const mockPort = Number(process.env.MOCK_OPENROUTER_PORT ?? 18998);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-onboarding-llm-v2-server-entry.mjs",
      port: mockPort,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { MOCK_OPENROUTER_PORT: String(mockPort) },
    },
    {
      command: `pnpm exec next dev --hostname ${appUrl.hostname} --port ${appPort}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        OPENROUTER_API_BASE_URL: `http://127.0.0.1:${mockPort}/api/v1`,
        LUMI_SETTINGS_ENCRYPTION_KEY:
          process.env.LUMI_SETTINGS_ENCRYPTION_KEY ??
          "lumi-m7-playwright-encryption-key",
        NEXT_DIST_DIR: ".next-m7-e2e",
      },
    },
  ],
});
