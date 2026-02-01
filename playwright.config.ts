import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: 'npm run dev -- -p 3001',
        url: 'http://localhost:3001',
        reuseExistingServer: true,
        timeout: 120_000
      }
});
