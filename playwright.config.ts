import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
// PW_BASE_URL=https://... corre los e2e contra un deploy ya publicado (sin levantar preview).
const REMOTE = process.env.PW_BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Por defecto, contra el build de producción local (vite build + vite preview).
  webServer: REMOTE
    ? undefined
    : {
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
