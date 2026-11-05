import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5183', viewport: { width: 1280, height: 800 } },
  webServer: {
    command: 'pnpm --filter thousand-paws dev',
    url: 'http://localhost:5183',
    reuseExistingServer: true,
  },
});
