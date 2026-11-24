// Each doctor keeps only the LinkedIn icon (D-20). Slick clones slides, so assert per portrait.
import { test, expect, variantOf } from './lib/site.mjs';

const GONE = ['.fa-facebook-f', '.fa-twitter', '.fa-skype', '.fa-instagram'];

for (const p of ['/', '/medici/']) {
  test(`page ${p}: no doctor shows a Facebook, Twitter, Skype or Instagram icon`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
    const portraits = page.locator('.team-portrait');
    const n = await portraits.count();
    expect(n, 'doctor portraits').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      for (const sel of GONE) {
        expect.soft(await portraits.nth(i).locator(sel).count(), `portrait ${i} ${sel}`).toBe(0);
      }
    }
  });
}

test('page /: every doctor shows exactly one icon, LinkedIn', async ({ page }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'load' });
  const socials = page.locator('.team-portrait .span-social');
  const n = await socials.count();
  expect(n, 'doctor icon rows').toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const icons = await socials.nth(i).locator('i').evaluateAll((is) => is.map((x) => x.className));
    expect.soft(icons, `icon row ${i}`).toEqual(['fab fa-linkedin-in']);
  }
});

test('the header still shows Facebook and Instagram', async ({ page }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.top-header .fa-facebook-f')).toHaveCount(1);
  await expect(page.locator('.top-header .fa-instagram')).toHaveCount(1);
});
