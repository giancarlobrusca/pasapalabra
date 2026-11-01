import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Siempre contra el build de producción.
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /screenshots/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'mobile',
      testIgnore: /screenshots/,
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: devices['iPhone 13'].userAgent,
      },
    },
    { name: 'screenshots', testMatch: /screenshots/, use: { browserName: 'chromium' } },
  ],
});
