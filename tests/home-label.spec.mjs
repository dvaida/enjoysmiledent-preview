// The menu entry "POVESTEA NOASTRĂ" opens the story page (D-34); the home link is labelled "Povestea Noastră" in
// every breadcrumb (D-6). The story page and the service pages have no breadcrumb block (D-39).
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');
const NO_CRUMB = [
  '/povestea-noastra/',
  '/servicii/odontologie/',
  '/servicii/endodontie/',
  '/servicii/parodontologie/',
  '/servicii/chirurgie-dentara/',
  '/servicii/protetica-dentara/',
  '/servicii/pedodontie/',
  '/servicii/ortodontie/',
];

for (const p of pages) {
  test(`page ${p} labels the home link "Povestea Noastră"`, async ({ page, baseURL }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const root = new URL(`${baseurl}/`, baseURL).href;
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });

    const nav = page.locator('.nav-menu > li > a').first();
    expect.soft(await nav.textContent(), 'nav label').toBe('POVESTEA NOASTRĂ');
    expect.soft(await nav.evaluate((a) => a.href), 'nav target').toBe(`${root}povestea-noastra/`);

    if (p === '/') return;
    if (NO_CRUMB.includes(p)) {
      expect.soft(await page.locator('.pages-title').count(), 'breadcrumb blocks').toBe(0);
      return;
    }
    const crumb = page.locator('.pages-title p a').first();
    expect.soft(await crumb.textContent(), 'breadcrumb label').toBe('Povestea Noastră');
    expect.soft(await crumb.evaluate((a) => a.href), 'breadcrumb target').toBe(root);
  });
}
