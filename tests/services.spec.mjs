// The seven service pages laid out as mockup-2.png inside the site's header and footer (brief §4.6, §4.8).
import { test, expect, variantOf } from './lib/site.mjs';

const SERVICES = [
  ['odontologie', 'Odontologie'],
  ['endodontie', 'Endodonție'],
  ['parodontologie', 'Parodontologie'],
  ['chirurgie-dentara', 'Chirurgie dentară și implantologie'],
  ['protetica-dentara', 'Protetică dentară'],
  ['pedodontie', 'Pedodonție'],
  ['ortodontie', 'Ortodonție'],
];
const QUOTE = '„Ai grijă de zâmbetul tău, indiferent de nevoile dentare. Echipa noastră îți oferă soluții '
  + 'personalizate, de la prevenție și tratamente dentare până la reabilitări complexe.”';
const TURQUOISE = 'rgb(2, 181, 160)';
const TEXT = 'rgb(50, 59, 60)';

const box = (loc) => loc.evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
});
const styleOf = (loc, prop) => loc.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

for (const width of [1280, 400]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [slug, heading] of SERVICES) {
      const path = `/servicii/${slug}/`;

      test(`page ${path}: title, quotation and bold text`, async ({ page }, testInfo) => {
        const { baseurl } = variantOf(testInfo);
        await page.goto(`${baseurl}${path}`, { waitUntil: 'load' });

        const h1 = page.locator('h1.svc-title');
        await expect(h1).toHaveCount(1);
        expect((await h1.textContent()).trim(), 'title').toBe(heading);
        expect(await styleOf(h1, 'color'), 'title colour').toBe(TURQUOISE);
        const navBottom = (await box(page.locator('#navbar'))).bottom;
        expect((await box(h1)).top, 'title top vs fixed header bottom').toBeGreaterThanOrEqual(navBottom);

        const quote = page.locator('p.svc-quote');
        await expect(quote).toHaveCount(1);
        expect((await quote.textContent()).trim(), 'quotation').toBe(QUOTE);
        expect(await styleOf(quote, 'color'), 'quotation colour').toBe(TURQUOISE);
        expect(await styleOf(quote, 'font-style'), 'quotation style').toBe('italic');
        expect(Number(await styleOf(quote, 'font-weight')), 'quotation weight').toBeGreaterThanOrEqual(600);
        expect(await styleOf(quote, 'text-align'), 'quotation alignment').toBe('center');

        const strong = page.locator('.svc-text strong');
        await expect(strong).toHaveCount(1);
        expect(Number(await styleOf(strong, 'font-weight')), 'bold part weight').toBeGreaterThanOrEqual(600);
      });

      test(`page ${path}: call band, phone and e-mail`, async ({ page }, testInfo) => {
        const { baseurl } = variantOf(testInfo);
        await page.goto(`${baseurl}${path}`, { waitUntil: 'load' });

        const band = page.locator('.svc-cta');
        await expect(band).toHaveCount(1);
        expect((await band.locator('p').textContent()).trim(), 'band text').toBe('Programează o consultație!');
        expect(await styleOf(band, 'background-color'), 'band background').toBe(TURQUOISE);
        expect(await styleOf(band.locator('p'), 'color'), 'band text colour').toBe('rgb(255, 255, 255)');
        const b = await box(band);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(b.left, 'band left').toBe(0);
        expect(b.width, 'band width').toBe(clientWidth);

        const contact = page.locator('p.svc-contact');
        const phone = contact.locator('a[href^="tel:"]');
        const mail = contact.locator('a[href^="mailto:"]');
        await expect(phone).toHaveCount(1);
        await expect(mail).toHaveCount(1);
        expect((await phone.textContent()).trim(), 'phone text').toBe('0770 139 255');
        expect(await phone.getAttribute('href'), 'phone href').toBe('tel: +40770139255');
        expect(await phone.getAttribute('onclick') || '', 'phone onclick').toContain('gtag_report_conversion');
        expect((await mail.textContent()).trim(), 'e-mail text').toBe('contact@enjoysmiledent.ro');
        expect(await mail.getAttribute('href'), 'e-mail href').toBe('mailto:contact@enjoysmiledent.ro');

        for (const [name, a] of [['phone', phone], ['e-mail', mail]]) {
          expect(await styleOf(a, 'color'), `${name} colour`).toBe(TEXT);
          expect(await styleOf(a, 'text-decoration-line'), `${name} underline`).toBe('none');
          expect(Number(await styleOf(a, 'font-weight')), `${name} weight`).toBeGreaterThanOrEqual(600);
          await a.hover();
          await expect.poll(() => styleOf(a, 'color'), `${name} colour on hover`).toBe(TEXT);
          expect(await styleOf(a, 'text-decoration-line'), `${name} underline on hover`).toBe('none');
        }
      });

      test(`page ${path}: text beside the picture, nothing outside the page`, async ({ page }, testInfo) => {
        const { baseurl } = variantOf(testInfo);
        await page.goto(`${baseurl}${path}`, { waitUntil: 'load' });

        const pic = page.locator('img.svc-picture');
        await expect(pic).toHaveCount(1);
        expect(await pic.getAttribute('alt'), 'picture alt').toBe('Tratamente stomatologice');
        expect(await pic.evaluate((i) => i.src), 'picture src')
          .toBe(new URL(`${baseurl}/img/servicii/colaj.jpg`, page.url()).href);
        expect(await pic.evaluate((i) => i.naturalWidth), 'picture naturalWidth').toBe(352);

        const text = await box(page.locator('.svc-text'));
        const p = await box(pic);
        if (width === 1280) {
          expect(text.right, 'text right vs picture left').toBeLessThanOrEqual(p.left);
          expect(Math.abs(text.top - p.top), 'text and picture tops').toBeLessThanOrEqual(40);
        } else {
          expect(p.top, 'picture top vs text bottom').toBeGreaterThanOrEqual(text.bottom);
          const outside = await page.locator('.svc').evaluate((svc, w) => [svc, ...svc.querySelectorAll('*')]
            .map((e) => [e, e.getBoundingClientRect()])
            .filter(([, r]) => r.width > 0 && r.height > 0 && (r.left < 0 || r.right > w))
            .map(([e, r]) => `${e.tagName}.${e.className} ${r.left}-${r.right}`), width);
          expect(outside, 'elements of .svc outside [0, 400]').toEqual([]);
          const { scrollWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
          expect(scrollWidth, 'horizontal scroll').toBeLessThanOrEqual(innerWidth);
        }
      });
    }
  });
}
