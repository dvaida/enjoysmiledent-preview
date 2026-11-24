// The home link is labelled "Povestea Noastră" in the nav and in every breadcrumb (D-6).
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');

for (const p of pages) {
  test(`page ${p} labels the home link "Povestea Noastră"`, async ({ page, baseURL }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const root = new URL(`${baseurl}/`, baseURL).href;
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });

    const nav = page.locator('.nav-menu > li > a').first();
    expect.soft(await nav.textContent(), 'nav label').toBe('POVESTEA NOASTRĂ');
    expect.soft(await nav.evaluate((a) => a.href), 'nav target').toBe(root);

    if (p === '/') return;
    const crumb = page.locator('.pages-title p a').first();
    expect.soft(await crumb.textContent(), 'breadcrumb label').toBe('Povestea Noastră');
    expect.soft(await crumb.evaluate((a) => a.href), 'breadcrumb target').toBe(root);
  });
}
