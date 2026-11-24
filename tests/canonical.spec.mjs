// One correct canonical per page (D-24): site url + the variant's baseurl + the page path.
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');
const SITE_URL = 'https://enjoysmiledent.ro';

for (const p of pages) {
  test(`page ${p} has one canonical, equal to og:url`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });
    const expected = `${SITE_URL}${baseurl}${p}`;

    const canonicals = await page.$$eval('link[rel="canonical"]', (ls) => ls.map((l) => l.getAttribute('href')));
    const ogUrls = await page.$$eval('meta[property="og:url"]', (ms) => ms.map((m) => m.getAttribute('content')));
    expect.soft(canonicals, 'link[rel=canonical] hrefs').toEqual([expected]);
    expect.soft(ogUrls, 'og:url').toEqual([expected]);
  });
}
