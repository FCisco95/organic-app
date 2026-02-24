import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.CI
    ? {
        command: 'npm run build && npm run start',
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: false,
      }
    : undefined,
});
