import fs from 'node:fs';
import path from 'node:path';
import { test, expect, variantOf, buildDirOf } from './lib/site.mjs';

test('the variant root answers 200 with the site title', async ({ page }, testInfo) => {
  const response = await page.goto(`${variantOf(testInfo).baseurl}/`);
  expect(response.status()).toBe(200);
  expect(await page.title()).toContain('Enjoy Smile Dent');
});

test('the prod build publishes no harness file', () => {
  for (const name of ['package.json', 'tests', 'playwright.config.mjs', 'node_modules', 'scripts']) {
    expect.soft(fs.existsSync(path.join(buildDirOf('prod'), name)), `_build/prod/${name} is published`).toBe(false);
  }
});
