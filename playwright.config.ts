import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  use: {
    headless: true,
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/fixtures/server.mjs",
    port: 4173,
    reuseExistingServer: false,
    timeout: 10_000
  }
});
