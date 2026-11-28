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

// Brief §4.4: the named doctors in the customer's order, then "Medic N" placeholder cards up to four.
const BUCKET = 'https://storage.googleapis.com/enjoysmiledent/';
const DOCTORS = {
  julieta: ['Dr. Julieta Răvnic', 'Stomatologie Generală - Estetică Dentară - Protetică', '256_squared.jpg'],
  cosmin: ['Dr. Cosmin Răvnic', 'Stomatologie generală - Protetică', '288_squared.jpg'],
  ancuta: ['Dr. Ancuța Marcu', 'Medic Specialist Ortodonție și Ortopedie Dento Facială', '273_squared_1.jpg'],
  maria: ['Dr. Maria Cristescu', 'Medic specialist pedodonție', '265_squared.jpg'],
  mihai: ['Dr. Mihai Sigartău', 'Medic specialist chirurgie dento-alveolară', 'male_medic.jpg'],
};
const CARDS = {
  odontologie: ['julieta', 'cosmin', 'Medic 3', 'Medic 4'],
  endodontie: ['julieta', 'cosmin', 'Medic 3', 'Medic 4'],
  parodontologie: ['julieta', 'cosmin', 'Medic 3', 'Medic 4'],
  'chirurgie-dentara': ['mihai', 'cosmin'],
  'protetica-dentara': ['julieta', 'cosmin', 'Medic 3', 'Medic 4'],
  pedodontie: ['maria', 'julieta', 'cosmin', 'Medic 4'],
  ortodontie: ['ancuta', 'julieta', 'cosmin', 'Medic 4'],
};

for (const width of [1280, 400]) {
  test.describe(`doctors at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [slug, expected] of Object.entries(CARDS)) {
      const path = `/servicii/${slug}/`;

      test(`page ${path}: doctor cards, then placeholders`, async ({ page }, testInfo) => {
        const { baseurl } = variantOf(testInfo);
        await page.goto(`${baseurl}${path}`, { waitUntil: 'load' });

        const cards = page.locator('ul.svc-doctors > li.svc-doctor');
        const names = await cards.evaluateAll((ls) => ls.map((l) => l.querySelector('h3')?.textContent.trim()));
        expect(names, 'card names in order').toEqual(expected.map((k) => (DOCTORS[k] ? DOCTORS[k][0] : k)));

        for (let i = 0; i < expected.length; i++) {
          const card = cards.nth(i);
          const photo = card.locator('.svc-photo');
          await expect(photo, `card ${i} photo`).toHaveCount(1);
          const doctor = DOCTORS[expected[i]];
          if (doctor) {
            const [name, line, file] = doctor;
            expect((await card.locator('p').textContent()).trim(), `${name} line`).toBe(line);
            expect(await photo.evaluate((e) => e.tagName), `${name} photo tag`).toBe('IMG');
            expect(await photo.getAttribute('src'), `${name} photo src`).toBe(`${BUCKET}${file}`);
          } else {
            expect((await photo.textContent()).trim(), `${expected[i]} disc text`).toBe('Poza');
            expect(await styleOf(photo, 'background-color'), `${expected[i]} disc colour`).toBe('rgb(35, 31, 32)');
            await expect(card.locator('p'), `${expected[i]} line`).toHaveCount(0);
          }
          expect(await styleOf(photo, 'border-top-color'), `card ${i} ring colour`).toBe(TURQUOISE);
          expect(await styleOf(photo, 'border-top-style'), `card ${i} ring style`).toBe('solid');
          expect(await styleOf(photo, 'border-top-left-radius'), `card ${i} radius`).toBe('50%');
          const b = await box(photo);
          expect(b.width, `card ${i} photo width`).toBeGreaterThan(0);
          expect(b.width, `card ${i} photo square`).toBe(b.height);
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
