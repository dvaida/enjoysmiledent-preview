// Titles and the home description (D-7, D-14, D-22): the same on every variant.
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');
const SITE = 'Enjoy Smile Dent Florești - Cabinet Stomatologie Generală';
const HOME_DESCRIPTION = 'Consultație stomatologică, Control stomatologic, Sănătate orală, Albirea dinților, '
  + 'Odontoterapie, Endodonție, Protetică dentară, Implant dentar, Chirurgie dentară, Pedodonție, Ortodonție';
const SUB_PAGES = {
  '/servicii/': 'Servicii',
  '/medici/': 'Medici',
  '/foto/': 'Galerie Foto',
  '/blog/': 'Blog',
  '/contact/': 'Contact',
};
const isPost = (p) => p.startsWith('/blog/') && p !== '/blog/';

test('the plan names pages that exist', () => {
  for (const p of ['/', ...Object.keys(SUB_PAGES), '/blog/mentinerea-sanatatii-cavitatii-orale/']) {
    expect(pages, p).toContain(p);
  }
});

for (const p of pages) {
  test(`page ${p} has the agreed title`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });
    const titles = await page.$$eval('title', (ts) => ts.map((t) => t.textContent));
    const meta = (sel) => page.$eval(sel, (m) => m.getAttribute('content')).catch(() => null);
    const ogTitle = await meta('meta[property="og:title"]');

    expect.soft(titles.length, 'number of <title>').toBe(1);
    expect.soft(await meta('meta[property="og:site_name"]'), 'og:site_name').toBe('enjoysmiledent.ro');

    if (p === '/') {
      expect.soft(titles[0], 'title').toBe(SITE);
      expect.soft(ogTitle, 'og:title').toBe(SITE);
      expect.soft(await meta('meta[name="description"]'), 'description').toBe(HOME_DESCRIPTION);
      expect.soft(await meta('meta[property="og:description"]'), 'og:description').toBe(HOME_DESCRIPTION);
    } else if (SUB_PAGES[p]) {
      expect.soft(titles[0], 'title').toBe(`${SUB_PAGES[p]} / ${SITE}`);
    } else if (isPost(p)) {
      expect.soft(ogTitle, 'og:title').toBeTruthy();
      expect.soft(titles[0], 'title').toBe(`${ogTitle} | enjoysmiledent.ro`);
      if (p === '/blog/mentinerea-sanatatii-cavitatii-orale/') {
        expect.soft(titles[0], 'title').toBe('Mentinerea Sanatatii Cavitatii Orale | enjoysmiledent.ro');
      }
    } else {
      throw new Error(`page ${p} is not covered by the title rules`);
    }
  });
}
