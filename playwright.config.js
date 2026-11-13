import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4173", viewport: { width: 1100, height: 850 }, headless: true },
  webServer: { command: "node tests/browser/server.mjs", url: "http://127.0.0.1:4173", reuseExistingServer: false },
  reporter: "list"
});
