import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // CI renders WebGL in software and the first test also pays for Vite's cold start.
  timeout: process.env.CI ? 120_000 : 30_000,
  use: { baseURL: 'http://localhost:5183', viewport: { width: 1280, height: 800 } },
  webServer: {
    command: 'pnpm --filter thousand-paws dev',
    url: 'http://localhost:5183',
    reuseExistingServer: true,
  },
});
