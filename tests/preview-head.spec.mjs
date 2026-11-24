// A preview build is not indexed and loads no consent, analytics or ads script; prod keeps them.
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');
const ROBOTS = 'meta[name="robots"][content="noindex, nofollow"]';
const OSANO = 'script[src*="osano.com"]';
const GTAG = 'script[src*="googletagmanager.com"]';
const TRACKERS = ['osano.com', 'googletagmanager.com', 'google-analytics.com', 'googleadservices.com', 'doubleclick.net'];
const isTracker = (url) => {
  let host = '';
  try { host = new URL(url).hostname; } catch {}
  return TRACKERS.some((d) => host === d || host.endsWith(`.${d}`));
};

for (const p of pages) {
  test(`page ${p} head matches the variant`, async ({ page, siteLog }, testInfo) => {
    const { name, baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });

    if (name === 'preview') {
      await expect.soft(page.locator(ROBOTS), 'robots noindex meta').toHaveCount(1);
      await expect.soft(page.locator(OSANO), 'Osano script').toHaveCount(0);
      await expect.soft(page.locator(GTAG), 'gtag.js script').toHaveCount(0);

      await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()));
      const callers = page.locator('[onclick*="gtag_report_conversion"]');
      for (let i = 0, n = await callers.count(); i < n; i++) await callers.nth(i).dispatchEvent('click');

      expect.soft(siteLog.external.filter(isTracker), 'attempted tracker requests').toEqual([]);
      expect.soft(siteLog.pageErrors, 'page errors after clicking conversion links').toEqual([]);
    } else {
      await expect.soft(page.locator('meta[name="robots"]'), 'robots meta').toHaveCount(0);
      await expect.soft(page.locator(OSANO), 'Osano script').toHaveCount(1);
      await expect.soft(page.locator(GTAG), 'gtag.js script').toHaveCount(1);
    }
  });
}
