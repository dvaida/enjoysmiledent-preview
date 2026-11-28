// The menu entry "POVESTEA NOASTRĂ" opens the story page (D-34); every breadcrumb starts with "Acasă", the home
// link (D-34), the story page and the service pages included (D-63).
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');
for (const p of pages) {
  test(`page ${p} labels the home link "Acasă"`, async ({ page, baseURL }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const root = new URL(`${baseurl}/`, baseURL).href;
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });

    const nav = page.locator('.nav-menu > li > a').first();
    expect.soft(await nav.textContent(), 'nav label').toBe('POVESTEA NOASTRĂ');
    expect.soft(await nav.evaluate((a) => a.href), 'nav target').toBe(`${root}povestea-noastra/`);

    if (p === '/') return;
    const crumb = page.locator('.pages-title p a').first();
    expect.soft(await crumb.textContent(), 'breadcrumb label').toBe('Acasă');
    expect.soft(await crumb.evaluate((a) => a.href), 'breadcrumb target').toBe(root);
  });
}
