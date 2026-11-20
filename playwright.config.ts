import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: '.local/v1/playwright',
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8787', ...devices['Desktop Chrome'] },
  projects: [{ name: 'chromium', use: { channel: process.env.PLAYWRIGHT_CHANNEL || undefined } }],
  webServer: {
    command: 'pnpm preview',
    port: 8787,
    timeout: 60_000,
    reuseExistingServer: false,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
})
