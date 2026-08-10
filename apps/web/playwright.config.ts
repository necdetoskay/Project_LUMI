import { defineConfig, devices } from "@playwright/test";

const appDir = __dirname;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const appUrl = new URL(baseURL);
const appPort = Number(
  appUrl.port || (appUrl.protocol === "https:" ? 443 : 80),
);
const mockPort = Number(process.env.MOCK_OPENROUTER_PORT ?? 18999);
const mockBaseUrl = `http://127.0.0.1:${mockPort}/api/v1`;
const reuseExistingServer =
  process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
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
      command: "node tests/e2e/mock-llm-server-entry.mjs",
      port: mockPort,
      reuseExistingServer: false,
      timeout: 30_000,
      cwd: appDir,
      env: { MOCK_OPENROUTER_PORT: String(mockPort) },
    },
    {
      command: `pnpm exec next dev --hostname ${appUrl.hostname} --port ${appPort}`,
      url: baseURL,
      reuseExistingServer,
      timeout: 120_000,
      cwd: appDir,
      env: {
        OPENROUTER_API_BASE_URL: mockBaseUrl,
        LUMI_SETTINGS_ENCRYPTION_KEY:
          process.env.LUMI_SETTINGS_ENCRYPTION_KEY ??
          "lumi-playwright-encryption-key",
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
