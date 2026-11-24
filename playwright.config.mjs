import { defineConfig } from '@playwright/test';

const port = Number(process.env.TEST_PORT);
if (!port) throw new Error('TEST_PORT is required (base 4100, brand 4110, content 4120, reviews 4130, preview 4140)');
const origin = `http://127.0.0.1:${port}`;
const browserIgnore = [/identity\.spec\.mjs$/, /\.node\.spec\.mjs$/];

export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: { viewport: { width: 1280, height: 800 } },
  webServer: {
    command: 'node tests/serve.mjs',
    url: `${origin}/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'prod', testIgnore: browserIgnore, use: { baseURL: `${origin}/` } },
    { name: 'preview', testIgnore: browserIgnore, use: { baseURL: `${origin}/enjoysmiledent-preview/` } },
    { name: 'node', testMatch: /\.node\.spec\.mjs$/ },
    ...(process.env.BASELINE_REF ? [{ name: 'identity', testMatch: /identity\.spec\.mjs$/ }] : []),
  ],
});
