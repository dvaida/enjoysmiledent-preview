// The header social icons are 22 px and still fit the 50 px top bar (1280x800).
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');

for (const p of pages) {
  test(`page ${p}: header social icons are 22px inside the top bar`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
    const { bar, icons } = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      return {
        bar: box(document.querySelector('.top-header')),
        icons: [...document.querySelectorAll('.ht-right-social i')]
          .map((i) => ({ cls: i.className, fontSize: getComputedStyle(i).fontSize, ...box(i) })),
      };
    });
    expect(bar.bottom - bar.top).toBe(50);
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect.soft(icon.fontSize, `${icon.cls} font-size`).toBe('22px');
      const inside = icon.top >= bar.top && icon.bottom <= bar.bottom && icon.left >= bar.left && icon.right <= bar.right;
      expect.soft(inside, `${icon.cls} box ${JSON.stringify(icon)} inside the top bar ${JSON.stringify(bar)}`).toBe(true);
    }
  });
}
