// Each doctor keeps only the LinkedIn icon (D-48). Slick clones slides, so assert per portrait.
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

test('page /: every doctor icon row holds only the LinkedIn icon', async ({ page }, testInfo) => {
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

// Brief §4.11: Dr. Cristescu's line is the same everywhere. Per portrait, slick clones included.
for (const p of ['/', '/medici/']) {
  test(`page ${p}: Dr. Maria Cristescu is Medic specialist pedodonție`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
    const portraits = page.locator('.team-portrait').filter({
      has: page.locator('h3', { hasText: /^Dr\. Maria Cristescu$/ }),
    });
    const n = await portraits.count();
    expect(n, 'Dr. Maria Cristescu portraits').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      expect.soft((await portraits.nth(i).locator('h4').textContent()).trim(), `portrait ${i}`)
        .toBe('Medic specialist pedodonție');
    }
  });
}

// Brief §4.5 (D-48): only the two doctors with a profile show a LinkedIn icon, linking to it in a new tab.
const LINKEDIN = {
  'Dr. Ancuța Marcu': 'https://www.linkedin.com/in/ancuta-marcu-a15189378',
  'Dr. Maria Cristescu': 'https://www.linkedin.com/in/maria-cristescu-715160447',
};
const NO_LINKEDIN = ['Dr. Julieta Răvnic', 'Dr. Cosmin Răvnic', 'Dr. Mihai Sigartău'];

test('page /: only Dr. Marcu and Dr. Cristescu show a LinkedIn icon, linking to their profiles', async ({ page }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'load' });
  await expect(page.locator('.slick-slide').first()).toBeAttached();
  const real = page.locator('.slick-slide:not(.slick-cloned) .team-portrait');
  await expect(real.locator('i.fa-linkedin-in'), 'LinkedIn icons on the real slides').toHaveCount(2);
  const portraitOf = (name) => real.filter({ has: page.locator('h3', { hasText: new RegExp(`^${name}$`) }) });

  for (const [name, href] of Object.entries(LINKEDIN)) {
    const portrait = portraitOf(name);
    await expect(portrait, name).toHaveCount(1);
    await expect(portrait.locator('i.fa-linkedin-in'), `${name} icon`).toHaveCount(1);
    const a = portrait.locator('a', { has: page.locator('i.fa-linkedin-in') });
    await expect(a, `${name} link`).toHaveCount(1);
    await expect(a).toHaveAttribute('href', href);
    await expect(a).toHaveAttribute('target', '_blank');
    expect((await a.getAttribute('rel')) || '', `${name} rel`).toMatch(/(^|\s)noopener(\s|$)/);
  }
  for (const name of NO_LINKEDIN) {
    const portrait = portraitOf(name);
    await expect(portrait, name).toHaveCount(1);
    await expect(portrait.locator('.span-social'), `${name} icon row`).toHaveCount(0);
    await expect(portrait.locator('.fa-linkedin-in'), `${name} icon`).toHaveCount(0);
    await expect(portrait.locator('a[href="#"]'), `${name} empty link`).toHaveCount(0);
  }
});

test('page /: every LinkedIn link, on every slide (clones included), goes to one of the two profiles', async ({ page }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'load' });
  await expect(page.locator('.slick-slide').first()).toBeAttached();
  const hrefs = await page.locator('.team-portrait a').evaluateAll((as) =>
    as.filter((a) => a.querySelector('.fa-linkedin-in') || /linkedin/i.test(a.getAttribute('href') || ''))
      .map((a) => a.getAttribute('href')));
  expect(hrefs.length, 'LinkedIn links').toBeGreaterThan(0);
  for (const h of hrefs) expect.soft(Object.values(LINKEDIN), `href ${h}`).toContain(h);
});
