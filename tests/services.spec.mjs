// The seven service pages: the site's own photo banner with title and breadcrumb (owner, 2026-11-28, D-63),
// then the customer's content from mockup-2.png (brief §4.6, §4.8).
import { test, expect, variantOf } from './lib/site.mjs';

const SERVICES = [
  ['odontologie', 'Odontologie', '118_h1080.jpg'],
  ['endodontie', 'Endodonție', '103_h1080.jpg'],
  ['parodontologie', 'Parodontologie', '165_h1080.jpg'],
  ['chirurgie-dentara', 'Chirurgie dentară și implantologie', '200_h1080.jpg'],
  ['protetica-dentara', 'Protetică dentară', '221_h1080.jpg'],
  ['pedodontie', 'Pedodonție', '149_h1080.jpg'],
  ['ortodontie', 'Ortodonție', '189_h1080.jpg'],
];
const BUCKET = 'https://storage.googleapis.com/enjoysmiledent/';
const words = (t) => t.replace(/\s+/g, ' ').trim();
const QUOTE = '„Ai grijă de zâmbetul tău, indiferent de nevoile dentare. Echipa noastră îți oferă soluții '
  + 'personalizate, de la prevenție și tratamente dentare până la reabilitări complexe.”';
const TURQUOISE = 'rgb(2, 181, 160)';
const RING = 'rgb(168, 218, 220)';
const TEXT = 'rgb(50, 59, 60)';

const box = (loc) => loc.evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
});
const styleOf = (loc, prop) => loc.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

for (const width of [1280, 400]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [slug, heading, banner] of SERVICES) {
      const path = `/servicii/${slug}/`;

      test(`page ${path}: banner with title and breadcrumb, quotation and bold text`, async ({ page, baseURL }, testInfo) => {
        const { baseurl } = variantOf(testInfo);
        await page.goto(`${baseurl}${path}`, { waitUntil: 'load' });

        // The same banner block as Medici, Tarife, Foto, Contact: photo, 550 px, title bottom left.
        const band = page.locator('div.sections');
        await expect(band).toHaveCount(1);
        expect(await styleOf(band, 'background-image'), 'banner photo').toBe(`url("${BUCKET}${banner}")`);
        expect(await styleOf(band, 'background-position'), 'banner photo anchored at its top').toMatch(/ 0%$/);
        const bandBox = await box(band);
        expect(bandBox.top, 'banner top').toBe(0);
        expect(bandBox.height, 'banner height').toBe(550);

        const h1 = page.locator('h1');
        await expect(h1).toHaveCount(1);
        expect(words(await h1.textContent()), 'h1').toBe(`Enjoy Smile Dent ${heading}`);
        expect(words(await page.locator('.sections .pages-title h1 span').textContent()), 'title').toBe(heading);
        const navBottom = (await box(page.locator('#navbar'))).bottom;
        const title = await box(page.locator('.pages-title'));
        expect(title.top, 'title block top vs fixed header bottom').toBeGreaterThanOrEqual(navBottom);
        expect(title.bottom, 'title block bottom vs banner bottom').toBeLessThanOrEqual(bandBox.bottom);
        expect(title.right, 'title block inside the page').toBeLessThanOrEqual(width);

        const crumbs = page.locator('.pages-title p');
        expect(words(await crumbs.textContent()), 'breadcrumb').toBe(`Acasă > Servicii > ${heading}`);
        const links = crumbs.locator('a');
        await expect(links).toHaveCount(2);
        expect(await links.nth(0).evaluate((a) => a.href), 'Acasă target').toBe(new URL(`${baseurl}/`, baseURL).href);
        expect(await links.nth(1).evaluate((a) => a.href), 'own crumb target').toBe(new URL(`${baseurl}${path}`, baseURL).href);

        expect((await box(page.locator('.svc-text'))).top, 'text top vs banner bottom').toBeGreaterThanOrEqual(bandBox.bottom);

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

// Brief §4.4: exactly the doctors the customer named, in their order. "etc" adds nobody.
// The cards are the site's own team cards, as on Medici and the home page (D-63).
const DOCTORS = {
  julieta: ['Dr. Julieta Răvnic', 'Stomatologie Generală - Estetică Dentară - Protetică', '256_squared.jpg'],
  cosmin: ['Dr. Cosmin Răvnic', 'Stomatologie generală - Protetică', '288_squared.jpg'],
  ancuta: ['Dr. Ancuța Marcu', 'Medic Specialist Ortodonție și Ortopedie Dento Facială', '273_squared_1.jpg'],
  maria: ['Dr. Maria Cristescu', 'Medic specialist pedodonție', '265_squared.jpg'],
  mihai: ['Dr. Mihai Sigartău', 'Medic specialist chirurgie dento-alveolară', 'male_medic.jpg'],
};
const CARDS = {
  odontologie: ['julieta', 'cosmin'],
  endodontie: ['julieta', 'cosmin'],
  parodontologie: ['julieta', 'cosmin'],
  'chirurgie-dentara': ['mihai', 'cosmin'],
  'protetica-dentara': ['julieta', 'cosmin'],
  pedodontie: ['maria', 'julieta', 'cosmin'],
  ortodontie: ['ancuta', 'julieta', 'cosmin'],
};

for (const width of [1280, 400]) {
  test.describe(`doctors at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [slug, expected] of Object.entries(CARDS)) {
      const path = `/servicii/${slug}/`;

      test(`page ${path}: only the named doctors' cards`, async ({ page }, testInfo) => {
        const { baseurl } = variantOf(testInfo);
        await page.goto(`${baseurl}${path}`, { waitUntil: 'load' });

        const cards = page.locator('.svc-doctors .team-portrait');
        const names = await cards.evaluateAll((ls) => ls.map((l) => l.querySelector('h3')?.textContent.trim()));
        expect(names, 'card names in order').toEqual(expected.map((k) => DOCTORS[k][0]));

        for (let i = 0; i < expected.length; i++) {
          const card = cards.nth(i);
          const photo = card.locator('.tp-avatar img');
          await expect(photo, `card ${i} photo`).toHaveCount(1);
          const [name, line, file] = DOCTORS[expected[i]];
          expect((await card.locator('h4').textContent()).trim(), `${name} line`).toBe(line);
          expect(await photo.getAttribute('src'), `${name} photo src`).toBe(`${BUCKET}${file}`);
          expect(await styleOf(photo, 'border-top-color'), `card ${i} ring colour`).toBe(RING);
          expect(await styleOf(photo, 'border-top-style'), `card ${i} ring style`).toBe('solid');
          expect(await styleOf(photo, 'border-top-left-radius'), `card ${i} radius`).toBe('50%');
          const b = await box(photo);
          expect(b.width, `card ${i} photo width`).toBeGreaterThan(0);
          expect(Math.abs(b.width - b.height), `card ${i} photo square`).toBeLessThanOrEqual(1);
        }

        const boxes = [];
        for (let i = 0; i < expected.length; i++) boxes.push(await box(cards.nth(i)));
        if (width === 1280) {
          for (const [i, c] of boxes.entries()) expect(c.top, `card ${i} top`).toBe(boxes[0].top);
        } else {
          for (const [i, c] of boxes.entries()) {
            if (i > 0) expect(c.top, `card ${i} top vs card ${i - 1} bottom`).toBeGreaterThan(boxes[i - 1].bottom);
            expect(c.left, `card ${i} left`).toBeGreaterThanOrEqual(0);
            expect(c.right, `card ${i} right`).toBeLessThanOrEqual(width);
          }
        }
      });
    }
  });
}
